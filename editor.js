/* ============================================================
   FANESCA — editor.js
   EL EDITOR DE ESCENA, dentro del propio juego.

   La razón por la que Godot se veía tentador no era el motor: era
   el editor. Afinar una cámara escribiendo `pos: [0, 3.05, 2.98]`,
   recargar, mirar y volver a escribir es lentísimo — y peor cuando
   cada vuelta cuesta minutos. Esto es esa parte, y solo esa:
   mover deslizadores y ver la cocina cambiar debajo, en vivo.

   Dos reglas que lo mantienen honesto:

   1. NO INVENTA FORMATOS. Lo que edita son exactamente los mismos
      campos que ya existen en el código: la `camara` de un nivel y
      el bloque de `luz` de un escenario. Al final te da la línea
      lista para pegar en `nivel-<id>.js` o en `escenarios.js`.

   2. NO ES PARTE DEL JUEGO. Vive detrás del modo dev y guarda sus
      retoques en localStorage, aparte del progreso. Un jugador no
      lo ve nunca, y borrarlo no rompe nada.
   ============================================================ */

const CLAVE = 'fanesca_editor_v1';

let Motor = null, panel = null, abierto = false;
let nivelId = null;
let onEscenario = null;

/* lo retocado, por nivel y por escenario */
let retoques = { camaras: {}, luces: {} };

function cargar() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (raw) retoques = Object.assign({ camaras: {}, luces: {} }, JSON.parse(raw));
  } catch (e) {}
}
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(retoques)); } catch (e) {}
}

/* ---------- lo que el editor sabe tocar ----------
   Cada campo dice de dónde sale y a dónde vuelve. Añadir uno nuevo
   es una línea aquí, no código de interfaz. */
const CAMPOS_CAM = [
  { k: 'px', et: 'cámara x', min: -4, max: 4, paso: 0.02 },
  { k: 'py', et: 'cámara alto', min: 0.5, max: 6, paso: 0.02 },
  { k: 'pz', et: 'cámara atrás', min: 0.5, max: 7, paso: 0.02 },
  { k: 'mx', et: 'mira x', min: -3, max: 3, paso: 0.02 },
  { k: 'my', et: 'mira alto', min: 0, max: 4, paso: 0.02 },
  { k: 'mz', et: 'mira fondo', min: -2, max: 3, paso: 0.02 },
  { k: 'fov', et: 'ángulo vertical', min: 35, max: 95, paso: 1 },
];

function camaraViva() {
  const c = Motor.camara;
  const m = Motor.miraActual ? Motor.miraActual() : { x: 0, y: 1, z: 0 };
  return {
    px: c.position.x, py: c.position.y, pz: c.position.z,
    mx: m.x, my: m.y, mz: m.z, fov: c.fov,
  };
}

function aplicar(v) {
  Motor.ponerCamara(
    [v.px, v.py, v.pz],
    [v.mx, v.my, v.mz],
    v.fov
  );
}

/* la línea lista para pegar en el archivo del nivel */
function comoCodigo(v) {
  const r = (n) => Math.round(n * 100) / 100;
  return `camara: { pos: [${r(v.px)}, ${r(v.py)}, ${r(v.pz)}], mira: [${r(v.mx)}, ${r(v.my)}, ${r(v.mz)}], fov: ${Math.round(v.fov)} },`;
}

function fila(campo, v, alCambiar) {
  const f = document.createElement('label');
  f.className = 'ed-fila';
  f.innerHTML = `<span class="ed-et">${campo.et}</span>
    <input type="range" min="${campo.min}" max="${campo.max}" step="${campo.paso}" value="${v}">
    <output>${Math.round(v * 100) / 100}</output>`;
  const inp = f.querySelector('input'), out = f.querySelector('output');
  inp.addEventListener('input', () => {
    const n = parseFloat(inp.value);
    out.textContent = Math.round(n * 100) / 100;
    alCambiar(n);
  });
  return f;
}

function construirPanel() {
  panel = document.createElement('aside');
  panel.id = 'editor';
  panel.className = 'editor';
  document.getElementById('stage').appendChild(panel);
  pintar();
}

function pintar() {
  if (!panel) return;
  const v = camaraViva();
  panel.innerHTML = `
    <header class="ed-head">
      <b>Editor de escena</b>
      <span class="ed-nivel">${nivelId || '—'}</span>
      <button type="button" class="ed-x" aria-label="cerrar">✕</button>
    </header>
    <div class="ed-cuerpo"></div>
    <pre class="ed-codigo"></pre>
    <div class="ed-pie">
      <button type="button" class="ed-btn" data-a="copiar">Copiar línea</button>
      <button type="button" class="ed-btn" data-a="reset">Volver al original</button>
    </div>`;

  const cuerpo = panel.querySelector('.ed-cuerpo');
  const codigo = panel.querySelector('.ed-codigo');
  const estado = { ...v };
  const refrescar = () => {
    aplicar(estado);
    codigo.textContent = comoCodigo(estado);
    retoques.camaras[nivelId || 'defecto'] = { ...estado };
    guardar();
  };
  CAMPOS_CAM.forEach(c => cuerpo.appendChild(fila(c, estado[c.k], (n) => { estado[c.k] = n; refrescar(); })));
  codigo.textContent = comoCodigo(estado);

  panel.querySelector('.ed-x').addEventListener('click', () => alternar(false));
  panel.querySelector('[data-a="copiar"]').addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(comoCodigo(estado));
    panel.querySelector('[data-a="copiar"]').textContent = '¡copiada!';
    setTimeout(() => { const b = panel.querySelector('[data-a="copiar"]'); if (b) b.textContent = 'Copiar línea'; }, 1400);
  });
  panel.querySelector('[data-a="reset"]').addEventListener('click', () => {
    delete retoques.camaras[nivelId || 'defecto'];
    guardar();
    if (onEscenario) onEscenario();     /* que el juego rearme el nivel */
  });
}

function alternar(abrir) {
  abierto = abrir === undefined ? !abierto : abrir;
  if (abierto && !panel) construirPanel();
  if (panel) panel.classList.toggle('abierto', abierto);
  if (abierto) pintar();
}

export const Editor = {
  init(motor, opts = {}) {
    Motor = motor;
    onEscenario = opts.alRearmar || null;
    cargar();
  },
  /* el juego avisa qué nivel está montado, para guardar por nivel */
  nivel(id) {
    nivelId = id;
    /* si este nivel tiene un retoque guardado, se aplica */
    const g = retoques.camaras[id];
    if (g && Motor) aplicar(g);
    if (abierto) pintar();
  },
  alternar,
  get abierto() { return abierto; },
  /* para que el juego sepa si hay retoques que respetar */
  camaraDe(id) { return retoques.camaras[id] || null; },
};

export default Editor;
