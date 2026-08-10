/* ============================================================
   FANESCA — editor.js
   EL EDITOR DE ESCENA — de escritorio, y solo de escritorio.

   La razón por la que Godot se veía tentador no era el motor: era
   el editor. Afinar una cámara escribiendo `pos: [0, 3.05, 2.98]`,
   recargar, mirar y volver a escribir es lentísimo. Esto es esa
   parte, y solo esa.

   POR QUÉ SOLO EN ESCRITORIO. Editar es un trabajo de autor: pide
   ratón, pantalla ancha y las dos manos. En un teléfono el panel
   tapaba justo lo que estás mirando —la cocina— y afinar a ciegas
   no afina nada. Además, en escritorio el juego se dibuja en una
   columna del ancho de un teléfono y sobran los dos costados: el
   editor se acuesta ahí, junto al juego y sin taparlo, que es la
   diferencia entre mirar y adivinar.

   En móvil el modo dev sigue existiendo, pero para lo único que
   ahí tiene sentido: saltar entre niveles para probar mecánicas.

   Dos reglas que lo mantienen honesto:

   1. NO INVENTA FORMATOS. Edita exactamente los campos que ya
      existen en el código: la `camara` de un nivel y el bloque de
      `luz` de un escenario. Al final te da la línea lista para
      pegar en `nivel-<id>.js` o en `escenarios.js`.

   2. NO ES PARTE DEL JUEGO. Vive detrás del modo dev y guarda sus
      retoques en localStorage, aparte del progreso. Un jugador no
      lo ve nunca, y borrarlo no rompe nada.
   ============================================================ */

const CLAVE = 'fanesca_editor_v1';

let Motor = null, panel = null, abierto = false;
let nivelId = null;
let ganchos = {};
let retoques = { camaras: {} };

/* ---------- ¿estamos en un sitio donde se pueda editar? ----------
   Ratón (pointer: fine) y ancho de sobra. Un iPad con teclado pasa,
   y un teléfono en horizontal no — que es justo lo que se quiere. */
export function esEscritorio() {
  try {
    return window.matchMedia('(min-width: 1000px) and (pointer: fine)').matches;
  } catch (e) { return false; }
}

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) retoques = Object.assign({ camaras: {}, recipientes: null }, JSON.parse(raw));
  } catch (e) {}
  /* Aplicar posiciones de recipientes guardadas si existen */
  if (retoques.recipientes && Motor.ponerBatea && Motor.ponerComposta) {
    const r = retoques.recipientes;
    if (r.bx !== undefined) Motor.ponerBatea(r.bx, r.by, r.bz);
    if (r.cx !== undefined) Motor.ponerComposta(r.cx, r.cy, r.cz);
  }
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(retoques)); } catch (e) {}
}

/* ---------- cámara ---------- */

const CAMPOS_CAM = [
  { k: 'px', et: 'cámara x', min: -4, max: 4, paso: 0.02 },
  { k: 'py', et: 'cámara alto', min: 0.5, max: 6, paso: 0.02 },
  { k: 'pz', et: 'cámara atrás', min: 0.5, max: 7, paso: 0.02 },
  { k: 'mx', et: 'mira x', min: -3, max: 3, paso: 0.02 },
  { k: 'my', et: 'mira alto', min: 0, max: 4, paso: 0.02 },
  { k: 'mz', et: 'mira fondo', min: -2, max: 3, paso: 0.02 },
  { k: 'fov', et: 'ángulo vertical', min: 35, max: 95, paso: 1 },
];

const CAMPOS_RECIPIENTES = [
  { nombre: 'batea', campos: [
    { k: 'bx', et: 'batea x', min: -2, max: 2, paso: 0.02 },
    { k: 'by', et: 'batea y', min: 0, max: 2, paso: 0.02 },
    { k: 'bz', et: 'batea z', min: 0, max: 3, paso: 0.02 },
  ]},
  { nombre: 'composta', campos: [
    { k: 'cx', et: 'composta x', min: -2, max: 2, paso: 0.02 },
    { k: 'cy', et: 'composta y', min: 0, max: 2, paso: 0.02 },
    { k: 'cz', et: 'composta z', min: 0, max: 3, paso: 0.02 },
  ]},
];

function camaraViva() {
  const c = Motor.camara;
  const m = Motor.miraActual ? Motor.miraActual() : { x: 0, y: 1, z: 0 };
  return { px: c.position.x, py: c.position.y, pz: c.position.z,
           mx: m.x, my: m.y, mz: m.z, fov: c.fov };
}

function recipientesVivos() {
  const b = Motor.obtenerBatea ? Motor.obtenerBatea() : { x: 0.84, y: 0, z: 1.92 };
  const c = Motor.obtenerComposta ? Motor.obtenerComposta() : { x: -0.86, y: 0, z: 1.94 };
  return { bx: b.x, by: b.y, bz: b.z, cx: c.x, cy: c.y, cz: c.z };
}

const r2 = (n) => Math.round(n * 100) / 100;

function comoCodigo(v) {
  return `camara: { pos: [${r2(v.px)}, ${r2(v.py)}, ${r2(v.pz)}], `
       + `mira: [${r2(v.mx)}, ${r2(v.my)}, ${r2(v.mz)}], fov: ${Math.round(v.fov)} },`;
}

/* ---------- luces ----------
   No hace falta que el motor exponga nada: las luces están en la
   escena y se reconocen por su tipo. Así el editor sigue a la
   cocina aunque mañana cambie. */
function lucesVivas() {
  const out = { hemi: null, sol: null, foco: null };
  if (!Motor || !Motor.escena) return out;
  Motor.escena.traverse(o => {
    if (o.isHemisphereLight && !out.hemi) out.hemi = o;
    else if (o.isDirectionalLight && !out.sol) out.sol = o;
    else if (o.isPointLight && !out.foco) out.foco = o;
  });
  return out;
}

/* ---------- piezas de interfaz ---------- */

function fila(campo, v, alCambiar) {
  const f = document.createElement('label');
  f.className = 'ed-fila';
  f.innerHTML = `<span class="ed-et">${campo.et}</span>
    <input type="range" min="${campo.min}" max="${campo.max}" step="${campo.paso}" value="${v}">
    <output>${r2(v)}</output>`;
  const inp = f.querySelector('input'), out = f.querySelector('output');
  inp.addEventListener('input', () => {
    const n = parseFloat(inp.value);
    out.textContent = r2(n);
    alCambiar(n);
  });
  return f;
}

function seccion(titulo) {
  const s = document.createElement('section');
  s.className = 'ed-sec';
  s.innerHTML = `<h4 class="ed-sec-tit">${titulo}</h4>`;
  return s;
}

function construirPanel() {
  panel = document.createElement('aside');
  panel.id = 'editor';
  panel.className = 'editor';
  document.body.appendChild(panel);
  pintar();
}

function pintar() {
  if (!panel) return;
  panel.innerHTML = `
    <header class="ed-head">
      <b>Editor de escena</b>
      <button type="button" class="ed-x" aria-label="cerrar">✕</button>
    </header>
    <div class="ed-cuerpo"></div>`;
  const cuerpo = panel.querySelector('.ed-cuerpo');
  panel.querySelector('.ed-x').addEventListener('click', () => alternar(false));

  /* --- qué nivel, para saltar sin salir del editor --- */
  const sNivel = seccion('Nivel');
  const sel = document.createElement('select');
  sel.className = 'ed-sel';
  sel.innerHTML = (ganchos.niveles ? ganchos.niveles() : [])
    .map(n => `<option value="${n.id}"${n.id === nivelId ? ' selected' : ''}>${n.nombre}</option>`).join('');
  sel.addEventListener('change', () => ganchos.jugar && ganchos.jugar(sel.value));
  sNivel.appendChild(sel);
  cuerpo.appendChild(sNivel);

  /* --- dónde se cocina --- */
  const sEsc = seccion('Escenario');
  const selE = document.createElement('select');
  selE.className = 'ed-sel';
  selE.innerHTML = (ganchos.escenarios ? ganchos.escenarios() : [])
    .map(e => `<option value="${e.id}"${e.id === (Motor.escenarioId) ? ' selected' : ''}>${e.emoji} ${e.nombre}</option>`).join('');
  selE.addEventListener('change', () => { ganchos.escenario && ganchos.escenario(selE.value); setTimeout(pintar, 60); });
  sEsc.appendChild(selE);
  cuerpo.appendChild(sEsc);

  /* --- la cámara: lo que más se afina --- */
  const sCam = seccion('Cámara');
  const estado = camaraViva();
  const codigo = document.createElement('pre');
  codigo.className = 'ed-codigo';
  const refrescar = () => {
    Motor.ponerCamara([estado.px, estado.py, estado.pz], [estado.mx, estado.my, estado.mz], estado.fov);
    codigo.textContent = comoCodigo(estado);
    retoques.camaras[nivelId || 'defecto'] = { ...estado };
    guardar();
  };
  CAMPOS_CAM.forEach(c => sCam.appendChild(fila(c, estado[c.k], n => { estado[c.k] = n; refrescar(); })));
  codigo.textContent = comoCodigo(estado);
  sCam.appendChild(codigo);

  const pie = document.createElement('div');
  pie.className = 'ed-pie';
  pie.innerHTML = `<button type="button" class="ed-btn" data-a="copiar">Copiar línea</button>
                   <button type="button" class="ed-btn ed-btn--flojo" data-a="reset">Volver al original</button>`;
  pie.querySelector('[data-a="copiar"]').addEventListener('click', (e) => {
    navigator.clipboard && navigator.clipboard.writeText(comoCodigo(estado));
    e.target.textContent = '¡copiada!';
    setTimeout(() => { e.target.textContent = 'Copiar línea'; }, 1400);
  });
  pie.querySelector('[data-a="reset"]').addEventListener('click', () => {
    delete retoques.camaras[nivelId || 'defecto'];
    guardar();
    if (ganchos.jugar && nivelId) ganchos.jugar(nivelId);
  });
  sCam.appendChild(pie);
  cuerpo.appendChild(sCam);

  /* --- la luz del escenario --- */
  const L = lucesVivas();
  if (L.hemi || L.sol || L.foco) {
    const sLuz = seccion('Luz');
    if (L.hemi) sLuz.appendChild(fila({ et: 'ambiente', min: 0, max: 3, paso: 0.05 }, L.hemi.intensity, n => { L.hemi.intensity = n; }));
    if (L.sol) sLuz.appendChild(fila({ et: 'sol', min: 0, max: 3, paso: 0.05 }, L.sol.intensity, n => { L.sol.intensity = n; }));
    if (L.foco) sLuz.appendChild(fila({ et: 'foco de mesa', min: 0, max: 3, paso: 0.05 }, L.foco.intensity, n => { L.foco.intensity = n; }));
    const nota = document.createElement('p');
    nota.className = 'ed-nota';
    nota.textContent = 'La luz se prueba aquí y se fija en escenarios.js (bloque «luz»).';
    sLuz.appendChild(nota);
    cuerpo.appendChild(sLuz);
  }

  /* --- los recipientes: batea y composta --- */
  if (Motor.ponerBatea && Motor.ponerComposta) {
    const sRecip = seccion('Recipientes');
    const estado = recipientesVivos();

    const refrescar = () => {
      if (Motor.ponerBatea) Motor.ponerBatea(estado.bx, estado.by, estado.bz);
      if (Motor.ponerComposta) Motor.ponerComposta(estado.cx, estado.cy, estado.cz);
      retoques.recipientes = { ...estado };
      guardar();
    };

    const subsecBatea = document.createElement('div');
    subsecBatea.className = 'ed-subsec';
    subsecBatea.innerHTML = '<p style="font-size:0.9em; margin:8px 0 4px; color:#888;">batea</p>';
    [
      { k: 'bx', et: 'x', min: -2, max: 2, paso: 0.02 },
      { k: 'by', et: 'y', min: 0, max: 2, paso: 0.02 },
      { k: 'bz', et: 'z', min: 0, max: 3, paso: 0.02 },
    ].forEach(c => subsecBatea.appendChild(fila(c, estado[c.k], n => { estado[c.k] = n; refrescar(); })));
    sRecip.appendChild(subsecBatea);

    const subsecComposta = document.createElement('div');
    subsecComposta.className = 'ed-subsec';
    subsecComposta.innerHTML = '<p style="font-size:0.9em; margin:8px 0 4px; color:#888;">composta</p>';
    [
      { k: 'cx', et: 'x', min: -2, max: 2, paso: 0.02 },
      { k: 'cy', et: 'y', min: 0, max: 2, paso: 0.02 },
      { k: 'cz', et: 'z', min: 0, max: 3, paso: 0.02 },
    ].forEach(c => subsecComposta.appendChild(fila(c, estado[c.k], n => { estado[c.k] = n; refrescar(); })));
    sRecip.appendChild(subsecComposta);

    cuerpo.appendChild(sRecip);
  }
}

function alternar(abrir) {
  if (!esEscritorio()) return;                  /* en móvil no existe */
  abierto = abrir === undefined ? !abierto : abrir;
  if (abierto && !panel) construirPanel();
  document.body.classList.toggle('con-editor', abierto);
  if (panel) panel.classList.toggle('abierto', abierto);
  if (abierto) pintar();
}

export const Editor = {
  /* `ganchos`: { niveles(), escenarios(), jugar(id), escenario(id) } */
  init(motor, g = {}) {
    Motor = motor;
    ganchos = g;
    cargar();
    /* Aplicar posiciones guardadas de recipientes al iniciar */
    if (retoques.recipientes && Motor.ponerBatea && Motor.ponerComposta) {
      const r = retoques.recipientes;
      if (r.bx !== undefined) Motor.ponerBatea(r.bx, r.by, r.bz);
      if (r.cx !== undefined) Motor.ponerComposta(r.cx, r.cy, r.cz);
    }
  },
  nivel(id) {
    nivelId = id;
    const guardado = retoques.camaras[id];
    if (guardado && Motor) {
      Motor.ponerCamara([guardado.px, guardado.py, guardado.pz],
                        [guardado.mx, guardado.my, guardado.mz], guardado.fov);
    }
    if (abierto) pintar();
  },
  alternar,
  esEscritorio,
  get abierto() { return abierto; },
};

export default Editor;
