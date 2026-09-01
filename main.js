/* ============================================================
   FANESCA — main.js
   El juego alrededor de los niveles: pantallas, progreso, reloj,
   cucharas, guardado y el puente entre el motor 3D y el HUD.

   Aquí no hay ni un grano de maíz: cada ingrediente vive en su
   propio `nivel-<id>.js`. Este archivo solo sabe montarlos,
   cronometrarlos y celebrarlos.
   ============================================================ */

import Motor, { MESA_Y, BATEA, COMPOSTA, FRENTE_TABLA } from './motor3d.js';
import { NIVELES, POR_VENIR, OLLA, porId, cucharasDe, tiempoBonito } from './niveles.js';
import { HISTORIA, TARJETAS, CIERRE, CACUANGO_PARAMO, DIAS_RELATO, VIERNES } from './historia.js';
import { ESCENARIOS, POR_DEFECTO } from './escenarios.js';
import Editor, { esEscritorio } from './editor.js';
import { variantesDe, nivelPor as configPor, APURO, DIAS } from './niveles-config.js';
import Apuro from './modo-apuro.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const SAVE_KEY = 'fanesca_v1';
/* La fanesca vivió dentro de Pambamesa y se guardaba con otra clave.
   localStorage es del ORIGEN, no del directorio: las dos versiones
   comparten el mismo cajón en github.io. Se lee la vieja una sola vez
   —para no perderle el progreso a quien ya jugó— y desde ahí cada
   juego escribe en la suya. La vieja no se borra: es de la otra app. */
const SAVE_KEY_VIEJA = 'pambamesa_fanesca_v1';

/* ---------- estado ---------- */

function nuevoEstado() {
  return {
    mejores: {}, vistoPortada: false, intentos: 0, arruinadas: 0,
    leidos: [], cuadernoVisto: true, devMode: false,
    /* la racha de días: cocinar algo hoy la mantiene viva */
    dias: { ultima: null, seguidos: 0 },
    /* dónde se cocina: se elige en la mesa y se recuerda */
    escenario: POR_DEFECTO,
    /* el último nivel jugado: para scrollear a él cuando regresas a la mesa */
    ultimoNivel: null,
    /* qué cierres de día ya se celebraron: cada escena se lee una vez */
    diasVistos: [],
    /* la generación del guardado: 'semana' desde v1.18. Un guardado
       sin esta marca viene del mapa de actos y pasa por las
       inferencias de migración una sola vez. */
    mapa: 'semana',
  };
}
let estado = nuevoEstado();
function guardar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(estado)); } catch (e) {} }
function cargar() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_KEY_VIEJA);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    /* la marca de generación NO se hereda del default: un guardado
       viejo sin `mapa` debe llegar a migrar() sin ella, o las
       inferencias de migración no sabrían que es viejo */
    return migrar(Object.assign(nuevoEstado(), s, { mapa: s.mapa }));
  } catch (e) { return null; }
}

/* Los ingredientes que se abrieron en variantes cambiaron de id: el
   choclo era 'maiz' y ahora su primer nivel es 'maiz-1-introduccion'.
   Sin esto, a quien ya lo cocinó se le borraba el récord y se le
   volvía a cerrar el camino entero detrás. */
/* Paradas que cambiaron de nombre al reordenarse la temporada. El
   número del id dice en qué puesto va, así que meter una parada en
   medio corre los de abajo — y sin esta tabla, a quien ya las jugó se
   le borran los récords y se le vuelve a cerrar el camino. */
const RENOMBRADOS = {
  'maiz-3-dos': 'maiz-4-dos',
  'maiz-4-primer-duro': 'maiz-5-primer-duro',
  'maiz-5-duro': 'maiz-6-duro',
  'maiz-6-primer-danado': 'maiz-7-primer-danado',
  'maiz-7-danado-duro': 'maiz-8-danado-duro',
  'maiz-8-picada': 'maiz-9-picada',
  'maiz-12-seco-tierno': 'maiz-12-seco-duro',
};

function migrar(s) {
  /* PRIMERO, LOS TIPOS. Un guardado editado a mano o corrompido
     pasaba cargar() entero —`!s.mejores` no atrapa un string— y el
     juego reventaba después, justo al ganar, que es cuando se
     comparan récords. Aquí se endereza lo que no tenga la forma
     esperada en vez de dejar que explote lejos de su causa. */
  if (!s.mejores || typeof s.mejores !== 'object' || Array.isArray(s.mejores)) s.mejores = {};
  for (const k of Object.keys(s.mejores)) {
    const m = s.mejores[k];
    if (!m || typeof m !== 'object' || typeof m.ms !== 'number') delete s.mejores[k];
  }
  if (!Array.isArray(s.leidos)) s.leidos = [];
  if (!Array.isArray(s.diasVistos)) s.diasVistos = [];
  if (!s.dias || typeof s.dias !== 'object') s.dias = { ultima: null, seguidos: 0 };
  /* el ingrediente entero pasó a ser una temporada: su récord es el
     de la primera parada */
  CON_VARIANTES.forEach(base => {
    const viejo = s.mejores[base];
    if (!viejo) return;
    const primera = variantesDe(base)[0];
    if (primera && !s.mejores[primera.id]) s.mejores[primera.id] = viejo;
    delete s.mejores[base];
    if (s.ultimoNivel === base && primera) s.ultimoNivel = primera.id;
  });
  /* SOLO PARA GUARDADOS DEL MAPA VIEJO (sin la marca 'semana'): allí
     las variantes bravas únicamente se abrían tras cocinar la olla,
     así que tener una es prueba de haber visto el final — y eso no
     se le vuelve a cerrar a nadie. En el mapa de la semana esa
     deducción sería falsa: las variantes van ANTES de la olla. */
  if (!s.mapa && !s.ollaVista) {
    const primeras = new Set(NIVELES.map(n => (variantesDe(n.id)[0] || {}).id));
    if (Object.keys(s.mejores).some(id => !primeras.has(id))) s.ollaVista = true;
  }
  s.mapa = 'semana';
  for (const [viejo, nuevo] of Object.entries(RENOMBRADOS)) {
    if (!s.mejores[viejo]) continue;
    if (!s.mejores[nuevo]) s.mejores[nuevo] = s.mejores[viejo];
    delete s.mejores[viejo];
    if (s.ultimoNivel === viejo) s.ultimoNivel = nuevo;
  }
  /* un día que ya estaba completo al llegar la semana no estrena su
     escena: celebrarle cinco cierres de golpe a quien vuelve sería
     confeti a destiempo */
  DIAS.forEach(d => {
    if (!s.diasVistos.includes(d.id) && d.paradas.every(id => !!s.mejores[id])) s.diasVistos.push(d.id);
  });
  return s;
}

const estaListo = (id) => !!estado.mejores[id];
/* Un INGREDIENTE está listo cuando alguna de sus variantes ya fue a
   la olla: la olla se abre con los doce ingredientes, no con las
   treinta variantes. Las de más arriba son para bajarse el tiempo. */
const ingredienteListo = (base) => RUTA.some(n => n.base === base && estaListo(n.id));
const listos = () => NIVELES.filter(n => ingredienteListo(n.id)).length;

/* UN SOLO CANDADO: EL DE ADELANTE.

   El camino es una semana y la semana va en orden — la parada
   siguiente se abre al terminar la anterior, como en cualquier mapa
   de este género. Se puede porque el propio orden ya entrelaza los
   ingredientes: nunca hay que tragarse quince maíces para llegar a
   las habas, el reparto de la semana lo impide por construcción.
   Los peldaños de cada ingrediente caen en orden dentro de la
   semana, así que el candado de la fila viene gratis.

   Lo hecho no se re-cierra nunca: un guardado del mapa viejo trae
   paradas sueltas por toda la semana, y cada una de esas sigue
   abierta — y abre la que le sigue, así que quien vuelve tiene
   varios frentes en vez de un muro.

   En modo dev, todo abierto: probar una mecánica no debería costar
   jugarse la campaña. */
function desbloqueado(i) {
  if (estado.devMode || i === 0) return true;
  if (estaListo(RUTA[i].id)) return true;
  /* el viernes no mira la parada anterior: mira la OLLA. Lo de
     encima del plato no se prepara antes de que la fanesca exista. */
  if (RUTA[i].sirve && !estado.ollaVista) return false;
  return estaListo(RUTA[i - 1].id);
}

/* ============================================================
   LA RUTA — los nodos que se dibujan en la mesa.

   `niveles.js` tiene los INGREDIENTES (doce: su módulo, su icono,
   su gesto, su bicho). `niveles-config.js` tiene las VARIANTES de
   dificultad de cada uno. La mesa se dibuja de la mezcla de los
   dos, y esa mezcla es esta lista.

   Un ingrediente se abre en varios nodos solo si su módulo LEE la
   config: pintar tres nodos de arveja que juegan exactamente igual
   sería prometer una campaña que no existe.

   Ya están los doce. Que un id esté en esta lista es una PROMESA de
   que sus variantes se juegan distinto, y hay que comprobarla nivel
   a nivel antes de escribirlo aquí — el pecado no es que falte uno,
   es que sobre.
   ============================================================ */

const CON_VARIANTES = new Set([
  'maiz', 'arveja', 'habas', 'melloco', 'quinua', 'col',
  'mani', 'escoger', 'chochos', 'frejol', 'bacalao', 'zapallo',
]);

/* de `tiempoBase` (segundos para 3 cucharas) salen los tres cortes,
   con la misma proporción que traían los ingredientes a mano */
const cucharasDeTiempo = (base) => [base, Math.round(base * 1.5), Math.round(base * 2.2)];

/* LA RUTA ES LA SEMANA. El orden vive en DIAS (niveles-config): cinco
   días de ocho paradas que entrelazan las presentaciones con las
   variantes bravas, y la olla espera al final del camino. Aquí solo
   se viste cada parada con lo suyo: su ingrediente, su día, su
   número en la semana y si es la primera vez que ese ingrediente
   aparece — que es lo que decide cómo se llama en el mapa. */
function construirRuta() {
  const ruta = [];
  const presentados = new Set();
  DIAS.forEach((dia, d) => {
    dia.paradas.forEach(id => {
      const v = configPor(id);
      if (!v) return;
      const ing = NIVELES.find(n => n.id === v.base);
      if (!ing) return;
      const intro = !presentados.has(v.base);
      presentados.add(v.base);
      ruta.push(nodoDeVariante(ing, v.base, v, { dia: dia.id, diaIndex: d, intro, num: ruta.length + 1, sirve: !!dia.sirve }));
    });
  });
  return ruta;
}

function nodoDeVariante(ing, base, v, extra) {
  return {
    ...ing,
    id: v.id,
    base,
    nombre: v.nombre,
    /* La PRIMERA parada de un ingrediente lo presenta, así que se
       llama como él: "Las habas". Las siguientes al revés: cuatro
       ingredientes comparten icono, y un nodo que solo dice
       "Apretadas" no dice de quién — pero a esas alturas el nombre
       corto de la variante ya basta, el ingrediente se conoce. */
    corto: extra.intro
      ? ing.nombre
      : (v.corto || v.nombre.replace(/^(El|La|Los|Las)\s/, '').replace(/^\w/, c => c.toUpperCase())),
    dificultad: v.dificultad,
    config: v.config,
    cucharas: cucharasDeTiempo(v.tiempoBase),
    ...extra,
  };
}

const RUTA = construirRuta();
const rutaPorId = (id) => RUTA.find(n => n.id === id) || null;

/* La config de un nivel: del nodo de la ruta, que ya la trae. */
function obtenerConfigNivel(id) {
  const n = rutaPorId(id);
  if (n && n.config) return n.config;
  const c = configPor(id);
  return (c && c.config) || {};
}

/* ---------- sonido y vibración ---------- */

let audioCtx = null;
function initAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } }
  if (audioCtx && audioCtx.state === 'suspended') { try { audioCtx.resume(); } catch (e) {} }
}
const SFX = {
  pop:   [{ f: 720, d: .05, g: .07 }],
  pop2:  [{ f: 840, d: .05, g: .07 }],
  crack: [{ f: 260, d: .07, g: .06, w: 'square' }],
  resist:[{ f: 150, d: .08, g: .05, w: 'sawtooth' }],
  corte: [{ f: 950, d: .1, g: .06, w: 'triangle' }, { f: 520, t: .05, d: .12, g: .05, w: 'triangle' }],
  frotar:[{ f: 320, d: .06, g: .035, w: 'sawtooth' }],
  tab:   [{ f: 620, d: .05, g: .07 }],
  mal:   [{ f: 190, d: .3, g: .11, w: 'sawtooth' }, { f: 120, t: .12, d: .35, g: .1, w: 'sawtooth' }],
  bien:  [{ f: 523, d: .1, g: .1 }, { f: 659, t: .08, d: .1, g: .1 }, { f: 784, t: .16, d: .22, g: .12 }],
  fiesta:[{ f: 523, d: .12, g: .1 }, { f: 659, t: .1, d: .12, g: .1 }, { f: 784, t: .2, d: .12, g: .1 }, { f: 1046, t: .3, d: .3, g: .12 }],
};
function sfx(tipo, tono = 1) {
  initAudio(); if (!audioCtx) return;
  const now = audioCtx.currentTime;
  (SFX[tipo] || []).forEach(n => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = n.w || 'sine'; o.frequency.value = n.f * tono;
    const t0 = now + (n.t || 0), dur = n.d || .1;
    g.gain.setValueAtTime(.0001, t0);
    g.gain.exponentialRampToValueAtTime(n.g || .1, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + .03);
  });
}
function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

/* LA FECHA ES LA DEL RELOJ DE LA CASA, no la de Greenwich: con
   toISOString(), en Ecuador (UTC-5) cocinar después de las siete de
   la noche contaba como mañana y la racha de días se saltaba sola */
const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

let toastId = null;
/* `ms` opcional: un toast con oración entera (los chips de la
   despensa) no se lee en los 1.9 s del aviso corto */
function toast(msg, ms = 1900) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastId);
  toastId = setTimeout(() => t.classList.remove('visible'), ms);
}

/* ---------- piezas de interfaz ---------- */

const CUCHARA_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true">
  <ellipse cx="12" cy="7" rx="5.2" ry="6.4" fill="#f2b31f" stroke="#96622b" stroke-width="1.6"/>
  <ellipse cx="10.4" cy="5" rx="2" ry="2.6" fill="#ffd24d" opacity=".8"/>
  <path d="M12 13.2 V21" stroke="#96622b" stroke-width="3.4" stroke-linecap="round"/>
</svg>`;

function cucharasHTML(n) {
  return [0, 1, 2].map(i => `<span class="cuchara${i < n ? ' llena' : ''}">${CUCHARA_SVG}</span>`).join('');
}
function icono(id) { return (typeof iconOf === 'function') ? iconOf(id) : ''; }

function mostrar(pantalla) {
  /* salirse del mesón con El Apuro corriendo tiene que APAGARLO: si
     no, el reloj sigue bajando desde la mesa y la partida se pierde
     sola mientras nadie mira */
  if (pantalla !== 'juego' && Apuro.activo) { Apuro.parar(); pararReloj(); }
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + pantalla));
  Motor.setActive(pantalla === 'juego');
  if (pantalla === 'mesa') { renderMesa(); marcaCuaderno(); }
  if (pantalla === 'cuaderno') { renderCuaderno(); estado.cuadernoVisto = true; guardar(); }
}

/* ---------- modo dev: todos los niveles abiertos, para probar mecánicas ---------- */

function pintarPortada() {
  const hechos = listos();
  const btn = $('#btn-empezar');
  const avance = $('#portada-avance');
  const reiniciar = $('#btn-reiniciar');
  if (btn) btn.textContent = hechos ? 'Seguir cocinando' : 'Abrir el recetario';
  if (avance) {
    /* el avance habla en el idioma del recetario: paradas y día */
    const paradas = RUTA.filter(n => estaListo(n.id)).length;
    const dia = DIAS.find(d => !diaCompleto(d));
    avance.textContent = hechos
      ? `${paradas} de ${RUTA.length} paradas · vas por el ${dia ? dia.nombre.toLowerCase() : 'final'}`
      : '';
    avance.classList.toggle('hidden', !hechos);
  }
  /* reiniciar siempre está disponible, aunque no haya progreso */
  if (reiniciar) {
    reiniciar.classList.remove('hidden');
    if (!hechos) reiniciar.textContent = '↻ Empezar desde cero';
  }
}

function pintarDev() {
  const b = $('#btn-dev');
  if (!b) return;
  b.textContent = estado.devMode ? '🛠 modo dev: todo abierto' : '🛠 modo dev';
  b.classList.toggle('activo', !!estado.devMode);
}

/* ---------- la mesa de prep ---------- */

/* una frase por ingrediente que ya entró: doce granos, doce estados
   de la olla. El índice es cuántos van, así que la última es la de
   la olla completa y no se alcanza hasta el bacalao. */
const FRASES_OLLA = [
  'Todavía está el agua sola. Prepara un ingrediente.',
  'Ya hay algo adentro. Huele a que empieza.',
  'Dos. Todavía se distingue cada cosa.',
  'Va tomando cuerpo. Sigue con el siguiente.',
  'Cuatro. El agua ya no es agua: es caldo.',
  'Se está espesando. Ahora sí hay que revolver.',
  'Media fanesca. La cocina ya huele a jueves santo.',
  'Siete. De aquí para allá ya no se puede parar.',
  'Ocho. Se acabó el sitio para dudar de la receta.',
  'Falta poquito. No aflojes ahora.',
  'Diez. Ya nadie podría separar lo que hay adentro.',
  'Once. Falta el que cruzó el mar.',
  '¡Los doce granos completos! Que hierva despacio.',
];

/* ---------- dónde se cocina ----------
   Cambiar de sitio no cambia ni una regla: es puro gusto, y por eso
   vive en la mesa y no dentro del nivel. El motor rearma solo el
   decorado, así que se puede probar sin salir de aquí. */
function renderEscenarios() {
  const caja = $('#escenarios-lista');
  if (!caja) return;
  const actual = estado.escenario || POR_DEFECTO;
  caja.innerHTML = '';
  caja.className = 'escenarios-lista';

  ESCENARIOS.forEach(e => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `escenario${e.id === actual ? ' escenario--activo' : ''}`;
    btn.dataset.esc = e.id;
    btn.innerHTML = `
      <span class="escenario-emoji" aria-hidden="true">${e.emoji}</span>
      <span class="escenario-txt">
        <b>${e.nombre}</b>
        <i>${e.pie}</i>
      </span>
      ${e.id === actual ? '<span class="escenario-check" aria-hidden="true">✓</span>' : ''}`;

    btn.addEventListener('click', () => {
      if (estado.escenario === e.id) return;
      estado.escenario = e.id;
      guardar();
      Motor.escenario(estado.escenario);
      sfx('tab'); buzz(10);
      renderEscenarios();
    });
    caja.appendChild(btn);
  });
}

/* un día está completo cuando sus ocho paradas fueron a la olla */
const diaCompleto = (d) => d.paradas.every(id => estaListo(id));

/* EL BOTÓN DE EL APURO VIVE EN EL HTML pero se muda al fondo del
   mapa (la zona del viernes) en cada render. La referencia se guarda
   ANTES del primer `innerHTML = ''`: una vez dentro de la lista, ese
   borrado lo destruiría y con él sus eventos — guardado aquí, el
   elemento sobrevive detached y vuelve a montarse con todo puesto. */
let btnApuroEl = null;

/* lo que hace el botón «Sigue» ahora mismo: renderMesa lo decide en
   cada pintada (la parada abierta que toca, o la olla) */
let sigueAccion = null;

function renderMesa() {
  renderEscenarios();
  /* la primera visita va al grano: el selector de cocinas es de
     quien ya cocina, y empujaba el único nodo tocable fuera de la
     pantalla justo para quien más lo necesitaba ver */
  const algunHecho = listos() > 0;
  const esc = document.querySelector('.escenarios');
  if (esc) esc.classList.toggle('hidden', !algunHecho && !estado.devMode);

  const hechos = listos();
  const paradasHechas = RUTA.filter(n => estaListo(n.id)).length;
  /* LA OLLA MIRA LA CAMPAÑA: los días de preparación, sin el
     viernes — lo de encima del plato viene DESPUÉS de la olla, no
     antes */
  const campana = RUTA.filter(n => !n.sirve);
  const campanaHecha = campana.filter(n => estaListo(n.id)).length;
  const todas = campanaHecha >= campana.length;
  const todo = paradasHechas >= RUTA.length;
  const racha = (estado.dias && estado.dias.seguidos > 1) ? ` · 🔥${estado.dias.seguidos} días` : '';
  /* el marcador dice EN QUÉ DÍA de la semana vas: es el mismo número
     de siempre, pero con el capítulo puesto */
  const diaEnCurso = DIAS.find(d => !diaCompleto(d));
  $('#mesa-progreso').textContent = (todo && estado.ollaVista)
    ? `La mesa, puesta y servida${racha}`
    : (todas && !estado.ollaVista
      ? `${paradasHechas} / ${RUTA.length} — la olla espera${racha}`
      : `${paradasHechas} / ${RUTA.length} paradas · ${diaEnCurso.nombre.toLowerCase()}${racha}`);
  $('#olla-frase').textContent = FRASES_OLLA[Math.min(hechos, FRASES_OLLA.length - 1)];

  /* ============================================================
     EL RECETARIO — la semana en la libreta de la abuela.

     La progresión ya no es un mapa: es un cuaderno de recetas, que
     es lo que de verdad hay en la cocina donde pasa esta historia.
     Cada día es una PÁGINA con su título y su gente; cada parada,
     un PASO numerado de la receta — el hecho lleva sus cucharas, el
     siguiente lleva el lápiz, el cerrado su candado. Al final del
     cuaderno está la receta grande —la fanesca, que se va llenando
     parada a parada— y la última página es el Viernes Santo, donde
     vive El Apuro. Un mapa dice "viaja"; una libreta con pasos
     tachados dice "esto se está cocinando", y eso es lo que pasa.
     ============================================================ */

  const lista = $('#mesa-lista');
  lista.innerHTML = '';
  lista.className = 'recetario';

  /* el garabato de margen de cada página: utilería, no información */
  const DECO = { lunes: '🧺', martes: '🥜', miercoles: '🌿', jueves: '🔥', noche: '🕯️', viernes: '🎉' };

  /* las páginas del viernes van DESPUÉS de la receta grande: primero
     se cocina la olla, después lo de encima */
  const paginasSirve = [];

  DIAS.forEach((dia, d) => {
    const relato = DIAS_RELATO[dia.id] || {};
    const hechasDia = dia.paradas.filter(id => estaListo(id)).length;
    const completo = hechasDia === dia.paradas.length;
    const primeraIdx = RUTA.findIndex(n => n.id === dia.paradas[0]);
    const abiertoDia = hechasDia > 0 || desbloqueado(primeraIdx);
    const pag = document.createElement('section');
    pag.className = 'pagina pagina--' + dia.id + (completo ? ' pagina--hecha' : (abiertoDia ? '' : ' pagina--porvenir'));
    pag.style.animationDelay = Math.min(d * 0.07, 0.4) + 's';
    pag.innerHTML = `
      <header class="pagina-head">
        <span class="pagina-deco" aria-hidden="true">${DECO[dia.id] || ''}</span>
        <p class="pagina-dia">${dia.nombre}</p>
        <h3 class="pagina-titulo">${dia.titulo}</h3>
        <p class="pagina-quien">${relato.quien || ''}</p>
        ${completo
          ? '<span class="pagina-sello" aria-hidden="true">✓ hecho</span>'
          : `<span class="pagina-cuenta">${hechasDia} de ${dia.paradas.length}</span>`}
      </header>
      <ol class="pagina-pasos"></ol>`;
    const ol = pag.querySelector('.pagina-pasos');

    dia.paradas.forEach(id => {
      const i = RUTA.findIndex(n => n.id === id);
      const n = RUTA[i];
      const abierto = desbloqueado(i);
      const mejor = estado.mejores[n.id];
      const esSiguiente = abierto && !mejor;
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'renglon ' + (mejor ? 'renglon--hecho' : (esSiguiente ? 'renglon--siguiente' : 'renglon--bloqueado'));
      /* el renglón se escribe como paso de receta: la presentación
         dice el gesto ("El choclo · desgranar"); la variante ya trae
         al ingrediente en su nombre y no hace falta repetirlo */
      const renglon = n.intro ? `${n.corto} · ${n.tarea.toLowerCase()}` : n.nombre;
      /* los chiles de dificultad: una temperatura, no un dato */
      const dif = n.dificultad ? `<span class="renglon-dif" aria-hidden="true">${'🌶️'.repeat(n.dificultad)}</span>` : '';
      b.innerHTML = `
        <span class="renglon-num">${n.num}.</span>
        <span class="renglon-icono" aria-hidden="true">${icono(n.icono)}</span>
        <span class="renglon-txt"><span class="renglon-nombre">${renglon}</span>${dif}</span>
        <span class="renglon-estado">${mejor
          ? `<span class="renglon-cucharas">${cucharasHTML(mejor.cucharas)}</span>`
          : (esSiguiente ? '<span class="renglon-lapiz" aria-hidden="true">✎</span>' : '<span class="renglon-candado" aria-hidden="true">🔒</span>')}</span>`;
      b.setAttribute('aria-label', `Paso ${n.num}: ${n.nombre}` + (n.dificultad ? ` (dificultad ${n.dificultad} de 5)` : '') + (abierto ? '' : ' (bloqueado)'));
      b.addEventListener('click', () => {
        sfx('tab');
        if (!abierto) {
          /* el viernes no está cerrado por la parada anterior sino por
             la olla, y el candado debe decir la verdad */
          toast(n.sirve && !estado.ollaVista
            ? 'Primero se cocina la olla 🍲'
            : 'Primero ' + RUTA[i - 1].nombre.toLowerCase() + ' 👆');
          return;
        }
        /* DIRECTO AL MESÓN, siempre: el gesto se explica dentro, en
           la pista, donde se puede aplicar mientras se lee */
        jugar(n.id);
      });
      li.appendChild(b);
      ol.appendChild(li);
    });
    if (dia.sirve) paginasSirve.push(pag);
    else lista.appendChild(pag);
  });

  /* LA RECETA GRANDE, al final del cuaderno: la fanesca. Se va
     llenando parada a parada —la barra es la promesa de que todas
     las páginas terminan en una sola olla— y se cocina cuando no
     queda nada por pelar. */
  const ollaAbierta = todas || estado.ollaVista;
  const pctOlla = Math.round(campanaHecha / campana.length * 100);
  const receta = document.createElement('button');
  receta.type = 'button';
  receta.className = 'receta-final' + (estado.ollaVista ? ' receta-final--servida' : (ollaAbierta ? ' receta-final--lista' : ''));
  receta.innerHTML = `
    <span class="receta-plato" aria-hidden="true">${icono(OLLA.icono)}</span>
    <span class="receta-txt">
      <span class="pagina-dia">jueves por la noche</span>
      <strong>${estado.ollaVista ? 'La fanesca, servida' : (todas ? '¡A la olla!' : 'La fanesca')}</strong>
      ${ollaAbierta ? `<small>${estado.ollaVista ? 'La receta de siempre, con tus manos' : 'No queda nada por pelar: que hierva'}</small>`
        : `<small>La olla se llena · ${pctOlla}%</small><span class="olla-carga" aria-hidden="true"><i style="width:${pctOlla}%"></i></span>`}
    </span>
    ${ollaAbierta ? '' : '<span class="renglon-candado" aria-hidden="true">🔒</span>'}`;
  receta.setAttribute('aria-label', ollaAbierta ? 'Cocinar la olla' : `La olla, al final de la semana — vas ${pctOlla}%`);
  receta.addEventListener('click', () => {
    sfx('tab');
    if (!ollaAbierta) { toast(`La olla se cocina al final de la semana — faltan ${campana.length - campanaHecha} paradas`); return; }
    mostrarFinal();
  });
  lista.appendChild(receta);

  /* LA PÁGINA DEL VIERNES va después de la olla y AHORA SE JUEGA: el
     queso, el huevo y la guarnición son lo de encima del plato, y se
     abren con la fanesca servida. Debajo de sus tres renglones vive
     El Apuro — servir a una casa que no deja de llenarse es
     exactamente lo que el modo sin fin juega. El botón vive en el
     HTML con sus eventos puestos; aquí solo se muda a su página. */
  paginasSirve.forEach(pag => {
    const promesa = document.createElement('p');
    promesa.className = 'viernes-promesa';
    promesa.textContent = VIERNES.promesa;
    pag.appendChild(promesa);
    if (!btnApuroEl) btnApuroEl = document.getElementById('btn-apuro');
    if (btnApuroEl) {
      const lunesListo = diaCompleto(DIAS[0]) || estado.devMode;
      btnApuroEl.classList.remove('hidden');
      btnApuroEl.classList.toggle('btn-apuro--cerrado', !lunesListo);
      const pie = btnApuroEl.querySelector('#btn-apuro-pie');
      if (pie) pie.textContent = !lunesListo
        ? `Se abre terminando el lunes — llevas ${DIAS[0].paradas.filter(estaListo).length} de 8`
        : (estado.apuro ? `Tu récord: ${estado.apuro.raciones} raciones` : 'Raciones sin fin, contra el reloj');
      pag.appendChild(btnApuroEl);
    }
    lista.appendChild(pag);
  });

  /* la despensa: lo que aún no tiene minijuego, dicho sin disimulo.
     HOY ESTÁ VACÍA —los seis que esperaban ya cocinan— y vacía no se
     dibuja: una sección que anuncia que no falta nada es ruido. Si
     un día la receta crece, vuelve sola. */
  const desp = document.createElement('div');
  if (POR_VENIR.length) {
    desp.className = 'despensa';
    desp.innerHTML = '<p class="mesa-sep">todavía en la despensa <span>· su minijuego viene después</span></p>';
    const fila = document.createElement('div');
    fila.className = 'despensa-fila';
    POR_VENIR.forEach(n => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'despensa-chip';
      chip.innerHTML = `<span class="despensa-icono">${icono(n.icono)}</span><span>${n.nombre.replace(/^(El|La|Los|Las)\s/, '')}</span>`;
      chip.addEventListener('click', () => {
        sfx('tab');
        const texto = n.nombre + ': ' + n.gesto.replace(/<[^>]+>/g, '');
        toast(texto, Math.max(2600, 1200 + texto.split(/\s+/).length * 300));
      });
      fila.appendChild(chip);
    });
    desp.appendChild(fila);
    lista.insertAdjacentElement('afterend', desp);
  }

  /* el mapa abre MOSTRANDO el siguiente paso: nadie debería tener
     que hacer scroll para encontrar dónde seguir.
     O, si acabas de jugar un nivel, muestra ese nivel en el que estabas */
  const scrollMesa = document.querySelector('#screen-mesa .scroll');
  let nodoTarget = null;

  /* primero busca el último nivel que jugaste, si existe */
  if (estado.ultimoNivel) {
    const idx = RUTA.findIndex(n => n.id === estado.ultimoNivel);
    if (idx >= 0) nodoTarget = lista.querySelectorAll('.renglon')[idx];
  }

  /* si no hay último nivel, usa el siguiente paso */
  if (!nodoTarget) {
    nodoTarget = lista.querySelector('.renglon--siguiente') || lista.querySelector('.receta-final');
  }

  if (scrollMesa && nodoTarget) {
    requestAnimationFrame(() => {
      /* por rectángulos y no por offsetTop: los pasos viven anidados
         en su página y el offset ya no mide contra el contenedor */
      const d = nodoTarget.getBoundingClientRect().top - scrollMesa.getBoundingClientRect().top;
      scrollMesa.scrollTop = Math.max(0, scrollMesa.scrollTop + d - scrollMesa.clientHeight * 0.45);
    });
  }
  /* si ya había una despensa de un render anterior, fuera */
  let sig = desp.nextElementSibling;
  while (sig && sig.classList.contains('despensa')) { const s = sig.nextElementSibling; sig.remove(); sig = s; }

  /* EL BOTÓN «SIGUE»: desde cualquier punto del recetario, un toque
     va a lo que toca — la parada abierta que sigue, o la olla si ya
     no queda semana. Sin él, seguir jugando era buscar con el pulgar
     el renglón que late. */
  const btnSigue = $('#btn-sigue');
  if (btnSigue) {
    const sig = RUTA.find((x, i) => !estaListo(x.id) && desbloqueado(i));
    if (sig) {
      btnSigue.classList.remove('hidden');
      btnSigue.innerHTML = `✎ Sigue: <b>${sig.num} · ${sig.intro ? sig.corto : (sig.corto || sig.nombre)}</b>`;
      sigueAccion = () => jugar(sig.id);
    } else if (todas && !estado.ollaVista) {
      btnSigue.classList.remove('hidden');
      btnSigue.innerHTML = '🍲 <b>¡A la olla!</b>';
      sigueAccion = () => mostrarFinal();
    } else {
      /* todo cocinado y servido: no hay "siguiente" que prometer */
      btnSigue.classList.add('hidden');
      sigueAccion = null;
    }
  }

  /* EL CIERRE DE UN DÍA SE CELEBRA AQUÍ, al volver a la mesa: la
     escena se lee con el mapa detrás enseñando la banda nueva, que
     es justo lo que la escena está abriendo. Una sola vez por día. */
  const pendiente = DIAS.find(d => diaCompleto(d) && !estado.diasVistos.includes(d.id));
  if (pendiente) setTimeout(() => mostrarDia(pendiente), 450);
}

/* la escena de fin de día: dos o tres frases de la familia y el
   inventario que quedó en la refri. Capítulo cerrado, banda nueva. */
function mostrarDia(dia) {
  const relato = DIAS_RELATO[dia.id];
  if (!relato || estado.diasVistos.includes(dia.id)) return;
  estado.diasVistos.push(dia.id);
  guardar();
  $('#dia-eyebrow').textContent = dia.sirve ? '¡a la mesa!' : `se acabó el ${dia.nombre.toLowerCase()}`;
  $('#dia-titulo').textContent = dia.titulo;
  $('#dia-escena').textContent = relato.escena;
  $('#dia-refri').textContent = relato.refri;
  $('#modal-dia').classList.add('open');
  sfx('fiesta'); buzz([15, 30, 15]);
}

/* ---------- el cuaderno ---------- */

/* Un capítulo se abre cuando lo desbloqueó un ingrediente. La
   historia no se regala de entrada: se gana con las manos, igual
   que en la cocina. */
const capituloAbierto = (id) => (estado.leidos || []).includes(id);

function abrirCapitulo(id) {
  if (!id || capituloAbierto(id)) return false;
  estado.leidos = [...(estado.leidos || []), id];
  estado.cuadernoVisto = false;
  guardar();
  return true;
}

function renderCuaderno() {
  $('#cuaderno-entradilla').textContent = HISTORIA.entradilla;
  const cont = $('#cuaderno-capitulos');
  cont.innerHTML = '';

  HISTORIA.capitulos.forEach(cap => {
    const art = document.createElement('article');
    art.className = 'capitulo' + (capituloAbierto(cap.id) ? '' : ' cerrado');
    const cabeza = `<div class="capitulo-head">
        <span class="plate">${icono(cap.icono)}</span>
        <h3 class="capitulo-titulo">${cap.titulo}</h3>
      </div>`;
    if (!capituloAbierto(cap.id)) {
      art.innerHTML = cabeza + '<p class="capitulo-cerrojo">Todavía no. Prepara ingredientes y esta página se abre sola.</p>';
      cont.appendChild(art);
      return;
    }
    let html = cabeza + cap.cuerpo.map(p => `<p>${p}</p>`).join('');
    if (cap.granos) {
      html += `<div class="granos-mapa">${cap.granos.map(g =>
        `<span class="grano-chip ${g.de}">${g.n}</span>`).join('')}</div>
        <div class="granos-leyenda">
          <span class="grano-chip aca">de este lado del mar</span>
          <span class="grano-chip alla">del otro</span>
        </div>`;
    }
    const citas = cap.citas || (cap.cita ? [cap.cita] : []);
    citas.forEach(c => {
      html += `<blockquote class="cita"><p>«${c.texto}»</p>
        <footer>${c.quien}<span>${c.datos}</span></footer></blockquote>`;
    });
    art.innerHTML = html;
    cont.appendChild(art);
  });

  $('#cuaderno-fuentes-lista').innerHTML = HISTORIA.fuentes
    .map(f => `<li><a href="${f.u}" target="_blank" rel="noopener">${f.t}</a></li>`).join('');
}

function marcaCuaderno() {
  const hayNuevo = !estado.cuadernoVisto && (estado.leidos || []).length > 0;
  $('#cuaderno-nuevo').classList.toggle('hidden', !hayNuevo);
}

/* ---------- el nivel en curso ---------- */


let nivelActual = null;      /* datos de niveles.js */
let modActual = null;        /* el módulo cargado */
let motorListo = false;      /* si init() consiguió WebGL; sin él no se entra a ningún mesón */
let t0 = 0, tiempoMs = 0, corriendo = false, relojId = null;
let relojEnEspera = false;   /* montado y sin arrancar: espera el primer toque */
let hechosAhora = 0, totalAhora = 1;

/* El reloj se ve mientras se juega: de él salen las cucharas, así que
   esconderlo era pedirle al jugador que corriera contra un número
   secreto. Se detiene solo mientras se lee una cita —ahí la prisa sí
   sobra— y se vuelve a contar entero en el modal de listo. */
function pintarReloj() {
  const el = $('#hud-tiempo');
  /* SE ESCRIBE EN EL NÚMERO, no en la píldora entera: escribir sobre
     #hud-tiempo destruía a sus hijos —el ⏱ y el propio span— en el
     primer repintado, y el cronómetro se quedaba sin reloj dibujado */
  const n = $('#hud-tiempo-n') || el;
  if (Apuro.activo) {
    /* contra reloj se lee el entero y nada más: las décimas a esta
       velocidad son ruido que parpadea, no información */
    n.textContent = Math.ceil(Apuro.reloj) + 's';
    el.classList.toggle('hud-tiempo--rojo', Apuro.enRojo);
    return;
  }
  el.classList.remove('hud-tiempo--rojo');
  n.textContent = tiempoBonito(tiempoMs);
}

function arrancarReloj() {
  t0 = performance.now() - tiempoMs;
  corriendo = true;
  clearInterval(relojId);
  let ultimo = performance.now();
  relojId = setInterval(() => {
    if (!corriendo) return;
    const ahora = performance.now();
    const dt = (ahora - ultimo) / 1000;
    ultimo = ahora;
    if (Apuro.activo) Apuro.tick(dt);
    else tiempoMs = ahora - t0;
    pintarReloj();
  }, 83);
}
function pararReloj() { corriendo = false; relojEnEspera = false; clearInterval(relojId); relojId = null; }

/* ---------- las pistas ----------

   UNA PISTA QUE NO SE PUEDE LEER NO ENSEÑA. Desde que se quitó la
   ficha previa, la pista sobre el mesón es toda la enseñanza que
   existe — y estaba rota por dos lados: cada mensaje duraba un
   tiempo fijo sin mirar cuántas palabras traía (había pistas de 20
   palabras en 2,6 s: se van antes de la segunda línea), y la de un
   nivel PISABA a la anterior en el mismo tick, así que la pista que
   el propio nivel ponía en construir() no llegaba a dibujarse nunca.

   Ahora la duración sale del texto (~340 ms por palabra, con piso y
   techo), y las pistas de arranque van EN FILA: el gesto del
   ingrediente, luego la del nivel, luego el aviso del bicho. Una
   pista reactiva del juego (un "¡casi lo aplastas!") corta la fila
   entera: si el jugador ya está metiendo mano, el resto del tutorial
   llega tarde por definición. */
let pistaId = null;
let pistaFila = [];        /* timeouts de la secuencia de arranque */
/* LA ÚLTIMA PISTA SE GUARDA para poder releerla: la ventana de
   enseñanza duraba diez segundos irrepetibles, y quien parpadeaba se
   quedaba sin instrucción para siempre. El botón «?» del mesón la
   vuelve a poner — la última que se mostró, que es la que aplica al
   momento en que el jugador está. */
let ultimaPista = null;
const duracionDe = (msg) => {
  const palabras = String(msg).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(2600, Math.min(12000, 1400 + palabras * 340));
};
function cortarFila() { pistaFila.forEach(clearTimeout); pistaFila = []; }
function pistaAhora(msg, dur) {
  const p = $('#juego-pista');
  p.innerHTML = msg;
  p.classList.add('visible');
  ultimaPista = msg;
  clearTimeout(pistaId);
  pistaId = setTimeout(() => p.classList.remove('visible'), dur);
}
function pista(msg, ms) {
  cortarFila();
  if (!msg) { clearTimeout(pistaId); $('#juego-pista').classList.remove('visible'); return; }
  /* el ms explícito es un mínimo de urgencia, no una sentencia: nunca
     por debajo de lo que se tarda en leer el propio texto */
  pistaAhora(msg, Math.max(ms || 0, duracionDe(msg)));
}
/* la fila del arranque: cada una espera a que la anterior se lea */
function pistasEnFila(items) {
  cortarFila();
  let t = 0;
  items.filter(x => x && x.msg).forEach(x => {
    const dur = Math.max(x.ms || 0, duracionDe(x.msg));
    pistaFila.push(setTimeout(() => pistaAhora(x.msg, dur), t));
    t += dur + 260;
  });
}
/* mientras un nivel se construye, sus pistas se guardan para la fila
   en vez de pelearse con el gesto por el único cartel que hay */
let capturaPista = null;

let vozId = null;
let vozPauso = false;   /* la voz detuvo el reloj */
/* Una cita no es un toast: se queda el tiempo suficiente para leerla
   y no interrumpe el juego, porque llega justo cuando el jugador
   acaba de HACER lo que la cita dice. */
function voz(cita, ms = 9000, opts = {}) {
  const v = $('#voz');
  if (!cita) { v.classList.remove('visible'); if (vozPauso) { vozPauso = false; if (nivelActual) arrancarReloj(); } return; }
  /* EN EL APURO NO HAY CITAS. Una cita de nueve segundos en pleno
     contrarreloj no se lee: se sufre — tapa el mesón mientras el
     reloj come. La campaña es donde las citas tienen su silencio, y
     todas se releen en el cuaderno. */
  if (Apuro.activo) return;
  /* leer una cita no puede costar cucharas: el reloj se detiene
     mientras está en pantalla y sigue cuando se va */
  if (corriendo) { pararReloj(); vozPauso = true; }
  /* sobre la escena va la versión corta si la hay: la cita entera se
     lee en el cuaderno, con su contexto y su fuente */
  $('#voz-texto').textContent = '«' + ((opts.corta && cita.corta) || cita.texto) + '»';
  $('#voz-quien').textContent = cita.quien;
  v.classList.add('visible');
  clearTimeout(vozId);
  vozId = setTimeout(() => {
    v.classList.remove('visible');
    if (vozPauso) { vozPauso = false; if (nivelActual) arrancarReloj(); }
  }, ms);
}

let alertaId = null;
/* `tono`: 'peligro' (rojo, lo que puede arruinar la olla) o 'bien'
   (verde, lo que salió). Entra con un golpe de escala para que el ojo
   lo cace aunque esté mirando los dedos — un aviso que aparece con un
   fundido suave, sobre una escena en movimiento, no lo ve nadie. */
function alerta(msg, tono = 'peligro') {
  const a = $('#hud-alerta');
  clearTimeout(alertaId);
  if (!msg) { a.classList.remove('visible'); return; }
  a.textContent = msg;
  a.classList.remove('tono-bien', 'tono-peligro', 'entra');
  void a.offsetWidth;                       /* reinicia la animación */
  a.classList.add('visible', 'entra', 'tono-' + tono);
  alertaId = setTimeout(() => a.classList.remove('visible'), 4200);
}

/* lo que un nivel puede pedirle al juego */
const api = {
  MESA_Y, BATEA, COMPOSTA, FRENTE_TABLA,
  progreso(hechos, total) {
    /* TODO el jugo del juego cuelga de aquí, y esa es la gracia.

       Cada nivel llama a `progreso()` cuando algo salió bien —es la
       única cosa que los doce hacen igual— así que la racha, el
       latido de la barra y el aplauso salen solos, sin que ningún
       nivel tenga que acordarse de pedirlos. La alternativa era
       repetir el mismo bloque de celebración doce veces y que once
       quedaran desincronizados a la tercera semana. */
    const subio = hechos > hechosAhora;
    const cuanto = hechos - hechosAhora;
    hechosAhora = hechos; totalAhora = total || 1;
    /* En El Apuro la barra mide LA RACIÓN, no el ingrediente entero:
       marcar el 12% de un choclo del que sólo hay que hacer el 30%
       le miente al jugador sobre cuánto le falta para el siguiente
       bono, que es la única cifra que le importa mientras corre. */
    const meta = (Apuro.activo && Apuro.racion && Apuro.racion.cuota) || totalAhora;
    const k = Math.max(0, Math.min(1, hechos / meta));
    const barra = $('#hud-barra');
    barra.style.width = (k * 100) + '%';
    const pct = $('#hud-pct');
    if (pct) pct.textContent = Apuro.activo
      ? Apuro.raciones + (Apuro.raciones === 1 ? ' ración' : ' raciones')
      : Math.round(k * 100) + '%';
    Motor.llenarRecipiente('batea', k);
    if (subio) {
      racha(cuanto, k);
      puntosFlotantes(cuanto);
    }
    /* El Apuro escucha el mismo latido que la barra. No necesita que
       el nivel sepa nada de él: con saber cuánto lleva hecho de su
       propio total ya puede decidir si la ración está servida. */
    if (Apuro.activo) Apuro.progreso(hechos, total || 1);
  },
  composta(k) { Motor.llenarRecipiente('composta', Math.max(0, Math.min(1, k))); },
  completar() {
    if (Apuro.activo) { Apuro.completar(); return; }
    /* "en espera" también es una partida viva: el reloj arranca con
       el primer toque, y un nivel terminado de un toque no puede
       quedarse sin celebrar por un tecnicismo del cronómetro */
    if (corriendo || relojEnEspera) { relojEnEspera = false; terminarNivel(); }
  },
  arruinar(motivo) {
    /* en El Apuro un desastre cuesta segundos, no la partida: si el
       modo se lo queda, aquí no se abre nada */
    if (Apuro.activo && Apuro.arruinar(motivo)) return;
    if (corriendo || relojEnEspera) { relojEnEspera = false; arruinarNivel(motivo); }
  },
  aviso: alerta,
  pista: (msg, ms) => { if (capturaPista && msg) capturaPista(msg, ms); else pista(msg, ms); },
  /* los pops suben de tono con la racha: la escalerita sonora es la
     recompensa más barata y más efectiva que existe — el jugador la
     persigue sin darse cuenta, y se reinicia sola al parar */
  sfx: (tipo) => sfx(tipo, (tipo === 'pop' || tipo === 'pop2')
    ? 1 + Math.min(rachaN, 14) * 0.045 : 1),
  voz,
  /* un nivel con fases puede renombrar lo que se está haciendo */
  rotulo(txt) { if (txt) $('#hud-tarea').textContent = txt; },
  /* un nivel puede abrir una página del cuaderno desde adentro */
  abrirCapitulo,
  toast,
  buzz,
  chispas: (...a) => Motor.chispas(...a),
  destello: (...a) => Motor.destello(...a),
  sacudir: (...a) => Motor.sacudir(...a),
  tween: (...a) => Motor.tween(...a),
  volarA: (...a) => Motor.volarA(...a),
  raycast: (...a) => Motor.raycast(...a),
  puntoEnPlano: (...a) => Motor.puntoEnPlano(...a),
  puntoAnteCamara: (...a) => Motor.puntoAnteCamara(...a),
  proyectar: (...a) => Motor.proyectar(...a),
  sombraBlob: (...a) => Motor.sombraBlob(...a),
  ojitos: (...a) => Motor.ojitos(...a),
  /* el catálogo de modelos: un nivel pide sus piezas por id, sin
     saber si vienen de código o de un .glb esculpido en Blender */
  pieza: (...a) => Motor.pieza(...a),
  parte: (...a) => Motor.parte(...a),
  get reloj() { return Motor.reloj; },
};


/* ---------- la racha ----------
   Cuenta los aciertos seguidos y los celebra cada vez más fuerte.
   Es lo que convierte "voy sacando granos" en "no puedo parar": la
   recompensa no es el grano, es la seguidilla — y por eso se corta
   sola con un respiro de segundo y medio, para que valga algo. */

const RACHA_VENTANA = 1500;      /* ms sin acertar y se corta */
const RACHA_GRITOS = [
  { n: 5, txt: '¡Cinco seguidas!' },
  { n: 10, txt: '¡Diez! 🔥' },
  { n: 18, txt: '¡Qué mano! 🙌' },
  { n: 28, txt: '¡Imparable! ✨' },
];

let rachaN = 0, rachaT = 0, rachaGritado = 0, rachaTimer = null;

function racha(cuanto, k) {
  const ahora = performance.now();
  if (ahora - rachaT > RACHA_VENTANA) { rachaN = 0; rachaGritado = 0; }
  rachaT = ahora;
  rachaN += cuanto;

  /* la barra late cuando sube: sin esto el progreso es un rectángulo
     que crece y nadie mira */
  const barra = $('#hud-barra');
  barra.classList.remove('late');
  void barra.offsetWidth;
  barra.classList.add('late');

  /* el combo grande: el número es la recompensa, así que se ve como
     recompensa y no como un dato de esquina */
  const combo = $('#hud-combo');
  if (combo) {
    if (rachaN >= 2) {
      $('#hud-combo-x').textContent = 'x' + rachaN;
      $('#hud-combo-tit').textContent = rachaN >= 8 ? '¡IMPARABLE!' : rachaN >= 5 ? '¡PERFECTO!' : '¡BIEN!';
      combo.classList.add('visible');
      combo.classList.remove('brinca');
      void combo.offsetWidth;
      combo.classList.add('brinca');
    }
    clearTimeout(rachaTimer);
    rachaTimer = setTimeout(() => combo.classList.remove('visible'), RACHA_VENTANA + 400);
  }

  const grito = RACHA_GRITOS.filter(g => rachaN >= g.n).pop();
  if (grito && grito.n > rachaGritado) {
    rachaGritado = grito.n;
    toast(grito.txt);
    sfx('fiesta');
    buzz([12, 20, 12]);
    Motor.destello('rgba(255,222,140,.28)');
  }

  /* y a mitad y a tres cuartos, un empujón: son los dos momentos en
     que cualquiera se pregunta cuánto falta */
  if (k >= 0.5 && !api._medio) { api._medio = true; toast('¡Media faena! 💪'); }
  if (k >= 0.85 && !api._casi) { api._casi = true; toast('Ya casi 🎉'); }
}

/* ---------- los +N que suben desde la batea ----------
   El acierto ya sonaba y ya volaba; lo que faltaba era el número, que
   es lo que convierte "hice algo" en "gané algo". Sale donde cae el
   grano, no en una esquina. */
function puntosFlotantes(cuanto) {
  const caja = $('#hud-flotantes');
  if (!caja || !Motor.camara) return;
  let p;
  try { p = Motor.proyectar(BATEA.clone().setY(MESA_Y + 0.5)); } catch (e) { return; }
  const el = document.createElement('span');
  el.className = 'flota';
  el.textContent = '+' + (cuanto * (rachaN >= 5 ? 2 : 1) * 10);
  el.style.left = (p.x + (Math.random() - 0.5) * 26) + 'px';
  el.style.top = (p.y + (Math.random() - 0.5) * 14) + 'px';
  caja.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

function reiniciarRacha() {
  rachaN = 0; rachaT = 0; rachaGritado = 0;
  clearTimeout(rachaTimer);
  const c = $('#hud-combo');
  if (c) c.classList.remove('visible');
  api._medio = false; api._casi = false;
}

/* El acceso al editor. Solo en modo dev —es herramienta de autor, no
   una opción del juego— y solo en ESCRITORIO: editar pide ratón y
   ancho, y en un teléfono el panel taparía justo la cocina que
   estás mirando. En móvil el modo dev sigue sirviendo para lo que
   ahí tiene sentido: saltar entre niveles. */
function pintarBotonEditor() {
  let b = $('#btn-editor');
  if (!estado.devMode || !esEscritorio()) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement('button');
    b.id = 'btn-editor';
    b.type = 'button';
    b.className = 'btn-editor';
    b.textContent = '🎛';
    b.title = 'Editor de escena';
    b.addEventListener('click', () => Editor.alternar());
    $('#screen-juego').appendChild(b);
  }
}

function renderControles(mod) {
  const cont = $('#juego-controles');
  cont.innerHTML = '';
  const ctrls = (mod && mod.controles) || [];
  ctrls.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ctrl';
    b.innerHTML = `<span>${c.txt}</span>${c.tip ? `<span class="ctrl-tip">${c.tip}</span>` : ''}`;
    const abajo = (e) => { e.preventDefault(); b.classList.add('presionado'); if (mod.alControl) mod.alControl(c.id, 'abajo'); };
    const arriba = () => { b.classList.remove('presionado'); if (mod.alControl) mod.alControl(c.id, 'arriba'); };
    b.addEventListener('pointerdown', abajo);
    b.addEventListener('pointerup', arriba);
    b.addEventListener('pointerleave', arriba);
    b.addEventListener('pointercancel', arriba);
    cont.appendChild(b);
  });
  cont.classList.toggle('hidden', ctrls.length === 0);
  /* la pista se sube si no hay botones que esquivar */
  $('#juego-pista').style.bottom = ctrls.length
    ? '' : 'calc(env(safe-area-inset-bottom) + var(--sp-4))';
}

async function jugar(id) {
  const n = rutaPorId(id);
  if (!n) return;
  /* sin WebGL no hay mesón: entrar igual dejaba al jugador atrapado
     en una pantalla vacía. El aviso largo ya está puesto en la escena
     desde init(); aquí basta con no entrar. */
  if (!motorListo) { toast('Este minijuego necesita WebGL 😔'); return; }
  nivelActual = n;
  estado.ultimoNivel = id;
  guardar();
  initAudio();
  /* PARAR ANTES DE PONER EN CERO. Esta función es async: entre el
     `tiempoMs = 0` de aquí abajo y el `arrancarReloj()` del final hay
     dos await (el módulo y los modelos). Si el reloj del nivel
     anterior seguía corriendo —porque saliste a la mesa a medio
     jugar— su intervalo volvía a escribir `tiempoMs` durante esa
     espera, y el nivel nuevo empezaba con el tiempo del anterior
     encima. Con el reloj oculto no se notaba; las cucharas sí lo
     sufrían. */
  pararReloj();
  /* en la parada que presenta al ingrediente el nombre completo de la
     variante no cabe en el HUD ("Desvainar · las habas · apert…"):
     con el corto basta y se lee entero */
  $('#hud-tarea').textContent = `${n.tarea} · ${(n.intro ? (n.corto || n.nombre) : n.nombre).toLowerCase()}`;
  $('#hud-barra').style.width = '0%';
  const pct0 = $('#hud-pct'); if (pct0) pct0.textContent = '0%';
  const ic = $('#hud-icono'); if (ic) ic.innerHTML = icono(n.icono);
  tiempoMs = 0; hechosAhora = 0; totalAhora = 1;
  reiniciarRacha();
  pintarReloj();
  alerta(null);
  mostrar('juego');

  try {
    const m = await n.modulo();
    modActual = m.default || m;
  } catch (e) {
    console.error(e);
    toast('No se pudo abrir ese ingrediente 😔');
    mostrar('mesa');
    return;
  }
  /* si hay modelos .glb esperando, que terminen de llegar antes de
     armar el nivel: si no, la primera partida saldría con los de
     código y la segunda con los de Blender */
  await Motor.modelosListos();
  const nivelConfig = obtenerConfigNivel(id);
  const capturadas = [];
  capturaPista = (msg, ms) => capturadas.push({ msg, ms });
  Motor.cargar(modActual, api, nivelConfig);
  capturaPista = null;
  renderControles(modActual);
  /* La fila del arranque, con tres reglas aprendidas mirando jugar:

     · si el nivel puso SU pista al construirse, el gesto genérico
       sobra — cinco de los doce decían lo mismo dos veces seguidas, y
       la del nivel llega en la fase exacta en que sirve;
     · el aviso del bicho sólo si ESTA parada trae bichos: cuatro de
       las intro van limpias y avisar de un gusanito que no existe es
       enseñar a desconfiar de los avisos. Y con el texto de cada
       ingrediente, que la mosca no se pellizca — se espanta;
     · en una parada ya superada no se repite nada de esto: quien
       vuelve a bajarse el tiempo no necesita el tutorial de nuevo. */
  const yaJugada = !!estado.mejores[n.id];
  const cfgN = nivelConfig || {};
  const traeBichos = (Array.isArray(cfgN.gusanos) ? cfgN.gusanos.some(g => g > 0) : (cfgN.gusanos || 0) > 0)
    || (cfgN.moscas_frecuencia || 0) > 0;
  const fila = [];
  if (!yaJugada && !capturadas.length) fila.push({ msg: n.gesto });
  fila.push(...capturadas);
  if (!yaJugada && traeBichos) {
    fila.push({ msg: n.avisoBicho || `🪱 Si sale <b>${n.bicho}</b>: pellízcalo y llévalo a la composta. <b>No lo aplastes.</b>` });
  }
  /* el «?» arranca con el gesto del ingrediente: en una parada ya
     superada la fila viene vacía, y sin esto repetiría la pista del
     nivel anterior */
  ultimaPista = n.gesto;
  pistasEnFila(fila);
  Editor.nivel(n.id);
  pintarBotonEditor();
  /* EL RELOJ ARRANCA CON EL PRIMER TOQUE. Leer las pistas de
     arranque costaba entre un cuarto y la mitad del presupuesto de
     tres cucharas: el juego enseñaba y cobraba por escuchar la
     clase. El tiempo corre desde que la mano entra al mesón. */
  relojEnEspera = true;
  tiempoMs = 0;
  pintarReloj();
  estado.intentos++;
  guardar();
}


/* ============================================================
   EL APURO — el juego alrededor del modo

   `modo-apuro.js` lleva las reglas; esto es lo que el modo le pide
   al juego: montar el siguiente ingrediente, celebrar una ración,
   cobrar un castigo y cerrar la partida. Vive aquí y no allá porque
   todo son pantallas y sonidos, y el modo no tiene por qué saber
   que existe el DOM.
   ============================================================ */

function apuroHUD(nombre) {
  const t = $('#hud-tarea');
  if (t) t.textContent = nombre ? `${nombre} · tanda ${Apuro.tanda}` : `El Apuro · tanda ${Apuro.tanda}`;
  const pct = $('#hud-pct');
  if (pct) pct.textContent = Apuro.raciones + (Apuro.raciones === 1 ? ' ración' : ' raciones');
  const barra = $('#hud-barra');
  if (barra) barra.style.width = '0%';
}

/* Montar el ingrediente que toca. Es `jugar()` sin la campaña: sin
   récords, sin brief, sin modal de listo — y sobre todo sin volver a
   la mesa entre uno y otro, que es exactamente lo que le quitaba
   fluidez al juego. La mesa cambia y ya estás en el siguiente. */
async function montarRacion(base, config) {
  const ficha = porId(base);
  if (!ficha) return;
  nivelActual = ficha;
  const ic = $('#hud-icono'); if (ic) ic.innerHTML = icono(ficha.icono);
  apuroHUD(ficha.nombre);
  try {
    const m = await ficha.modulo();
    modActual = m.default || m;
  } catch (e) { console.error(e); return; }
  await Motor.modelosListos();
  /* LA PARTIDA PUDO ACABARSE MIENTRAS SE MONTABA: montar es
     asíncrono, y si el reloj llegó a cero en ese hueco el resumen ya
     está en pantalla — construir el nivel ahora lo pondría a vivir
     detrás del modal, encolando pistas para nadie */
  if (!Apuro.activo) return;
  hechosAhora = 0; totalAhora = 1;
  /* justo antes de construir: a partir de aquí el progreso que llegue
     es de ESTE ingrediente y no del que se estaba jugando */
  Apuro.activar();
  const capturadas = [];
  capturaPista = (msg, ms) => capturadas.push({ msg, ms });
  Motor.cargar(modActual, api, config);
  capturaPista = null;
  renderControles(modActual);
  Editor.nivel(ficha.id);
  /* EL APURO TAMBIÉN ENSEÑA. Seis de los doce llegaban mudos: sin la
     regla del modo (que la tapaba la pista del nivel) y sin el gesto
     del ingrediente. La regla va primero y sólo la primera partida de
     la vida; el gesto, siempre — un modo rápido no es excusa para
     soltar a alguien en las habas sin decirle qué se hace. */
  const fila = [];
  if (!estado.apuroJugado) {
    estado.apuroJugado = true; guardar();
    fila.push({ msg: '<b>El Apuro:</b> haz una parte de cada ingrediente y el reloj te <b>devuelve segundos</b>. Los bichos te los quitan.' });
  }
  fila.push({ msg: ficha.gesto }, ...capturadas);
  ultimaPista = ficha.gesto;
  pistasEnFila(fila);
}

const GANCHOS_APURO = {
  montar: (base, config) => montarRacion(base, config),

  racionServida({ base, bono, raciones, cadena }) {
    const ficha = porId(base);
    sfx('bien'); buzz([12, 20]);
    apuroHUD();
    flotarTiempo('+' + bono + 's', 'gana');
    /* la cadena se celebra aparte del bono: son dos cosas distintas
       y juntarlas en un solo mensaje las apagaba a las dos */
    if (cadena >= 3) toast(`¡${cadena} seguidas! 🔥`);
    else toast(`${ficha ? ficha.nombre : 'Listo'} · +${bono}s`);
  },

  castigo({ coste, motivo }) {
    sfx('mal'); buzz([50, 40, 60]);
    Motor.destello('rgba(230,57,70,.4)');
    Motor.sacudir(0.7);
    flotarTiempo('−' + coste + 's', 'pierde');
    /* con el qué, el cuánto y la consecuencia: perder la ración sin
       que nadie lo diga se sentía a fallo del juego, no del dedo */
    alerta(`${motivo && motivo.titulo ? motivo.titulo : 'Se dañó'} · −${coste}s · ración perdida`, 'peligro');
    setTimeout(() => alerta(null), 2800);
  },

  tanda(n, bono) {
    sfx('fiesta'); buzz([15, 25, 15]);
    toast(`¡Tanda ${n}! Ahora +${bono}s por ración`);
    Motor.destello('rgba(232,129,58,.25)');
  },

  finDePartida(resumen) { cerrarApuro(resumen); },
};

/* el ±Ns que salta del reloj: en un modo donde el tiempo ES la vida,
   verlo moverse importa más que cualquier marcador */
function flotarTiempo(txt, clase) {
  const caja = $('#hud-flotantes');
  if (!caja) return;
  const el = document.createElement('span');
  el.className = 'flota-tiempo flota-tiempo--' + clase;
  el.textContent = txt;
  caja.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

function arrancarApuro() {
  if (!motorListo) { toast('Este minijuego necesita WebGL 😔'); return; }
  initAudio();
  pararReloj();
  tiempoMs = 0;
  reiniciarRacha();
  alerta(null);
  pista(null);
  mostrar('juego');
  Apuro.arrancar(GANCHOS_APURO);
  arrancarReloj();
  estado.intentos++;
  guardar();
}

function cerrarApuro(resumen) {
  pararReloj();
  Apuro.parar();
  /* la fiesta es para quien sirvió algo: celebrarle el cero a alguien
     es burlarse sin querer */
  if (resumen.raciones > 0) { sfx('fiesta'); buzz([20, 40, 20, 60]); }
  else sfx('tab');
  const mejor = estado.apuro || { raciones: 0 };
  const esRecord = resumen.raciones > mejor.raciones;
  if (esRecord) estado.apuro = { raciones: resumen.raciones, cadena: resumen.mejorCadena, fecha: fechaLocal() };
  guardar();

  setTimeout(() => {
    Motor.setActive(false);
    const cabecera = document.querySelector('#modal-apuro .sheet-eyebrow');
    if (cabecera) cabecera.textContent = resumen.porque === 'salida' ? 'lo dejaste ahí' : 'se acabó el tiempo';
    $('#apuro-raciones').textContent = resumen.raciones;
    $('#apuro-detalle').textContent = resumen.raciones === 0
      /* felicitar "sin un solo desastre" a quien no sacó ni una
         ración es burlarse sin querer: mejor decirle cómo se empieza */
      ? 'Nadie sirve una ración a la primera. Termina una parte del ingrediente y el reloj sube.'
      : `${resumen.tandas} tanda${resumen.tandas > 1 ? 's' : ''} · mejor cadena ${resumen.mejorCadena}` +
        (resumen.castigos ? ` · ${resumen.castigos} desastre${resumen.castigos > 1 ? 's' : ''}` : ' · sin un solo desastre');
    $('#apuro-mejor').textContent = esRecord
      ? (mejor.raciones ? `¡Nuevo récord! antes: ${mejor.raciones}` : 'Tu primera vez en El Apuro')
      : (mejor.raciones
        ? `Tu récord sigue siendo ${mejor.raciones}`
        /* "tu récord sigue siendo 0" no es un récord, es una pulla */
        : 'Todavía sin récord — la primera ración es la que enseña');

    /* LA ESCALERA DE LOGROS, entera y siempre: los conseguidos en
       color y los pendientes en gris con su meta — sin la escalera a
       la vista no hay nada que perseguir, y un modo sin fin vive de
       que se vea el siguiente peldaño. Los NUEVOS de esta partida
       brillan y suenan uno a uno; los viejos no vuelven a cantarse,
       que un logro repetido a la segunda ya es ruido. */
    const ya = estado.logrosApuro || (estado.logrosApuro = []);
    const nuevos = (resumen.logros || []).filter(l => !ya.includes(l.id));
    nuevos.forEach(l => ya.push(l.id));
    if (nuevos.length) guardar();
    const cajaL = $('#apuro-logros');
    cajaL.classList.remove('hidden');
    cajaL.innerHTML = APURO.logros.map(l => {
      const esNuevo = nuevos.some(x => x.id === l.id);
      const hecho = ya.includes(l.id);
      return `<li class="logro${esNuevo ? ' logro--nuevo' : (hecho ? '' : ' logro--pendiente')}">
        <strong>${hecho ? l.titulo : '· ' + l.titulo}</strong>
        <span>${hecho ? l.texto : (l.meta || '')}</span></li>`;
    }).join('');
    nuevos.forEach((_, i) => setTimeout(() => sfx('bien', 1 + i * 0.12), 900 + i * 320));

    /* LA PARTE DIDÁCTICA. El Apuro va tan rápido que no da tiempo de
       leer nada mientras se juega — así que lo que se aprende se
       cobra al final, y de un ingrediente que ACABAS de tener en la
       mano. Una tarjeta al azar de la enciclopedia se leería como
       relleno; ésta habla de algo que tus dedos tocaron hace diez
       segundos, y eso es lo que hace que se lea. */
    const conTarjeta = resumen.ingredientes.filter(b => TARJETAS[b]);
    const caja = $('#apuro-tarjeta');
    if (conTarjeta.length) {
      const cual = conTarjeta[Math.floor(Math.random() * conTarjeta.length)];
      const t = TARJETAS[cual];
      caja.classList.remove('hidden');
      $('#apuro-tarjeta-titulo').textContent = t.titulo;
      $('#apuro-tarjeta-texto').textContent = t.texto;
      if (!estado.leidos.includes(cual)) { estado.leidos.push(cual); guardar(); }
    } else caja.classList.add('hidden');

    $('#modal-apuro').classList.add('open');
  }, 700);
}

function terminarNivel() {
  pararReloj();
  sfx('bien'); buzz([20, 40, 60]);
  Motor.destello('rgba(108,191,90,.45)');
  const n = nivelActual;
  const cuch = cucharasDe(n, tiempoMs);
  const previo = estado.mejores[n.id];
  const esRecord = !previo || tiempoMs < previo.ms;
  if (esRecord) estado.mejores[n.id] = { ms: Math.round(tiempoMs), cucharas: cuch };
  else estado.mejores[n.id].cucharas = Math.max(estado.mejores[n.id].cucharas, cuch);

  /* la racha de días se alimenta terminando CUALQUIER nivel hoy:
     no pide ganar más, pide volver — que es lo único que un juego
     de este tamaño puede pedirle a alguien */
  const hoy = fechaLocal();
  const d = estado.dias || (estado.dias = { ultima: null, seguidos: 0 });
  if (d.ultima !== hoy) {
    const ayer = fechaLocal(new Date(Date.now() - 864e5));
    d.seguidos = d.ultima === ayer ? d.seguidos + 1 : 1;
    d.ultima = hoy;
    if (d.seguidos >= 2) setTimeout(() => toast(`🔥 ${d.seguidos} días cocinando seguidos`), 2600);
  }
  guardar();

  setTimeout(() => {
    Motor.setActive(false);
    /* la parada que presenta un ingrediente se llama como él: "El
       choclo a la olla", no "El choclo · primeros granos a la olla" */
    $('#listo-nombre').textContent = (n.intro ? (n.corto || n.nombre) : n.nombre) + ' a la olla';
    /* las cucharas se revelan de a una, cada una más aguda: el
       redoble del final es la mitad de la celebración */
    $('#listo-cucharas').innerHTML = cucharasHTML(0);
    const huecos = $('#listo-cucharas').querySelectorAll('.cuchara');
    for (let i = 0; i < cuch; i++) {
      setTimeout(() => {
        huecos[i].classList.add('llena', 'cae');
        sfx('bien', 1 + i * 0.18);
        buzz(14);
      }, 500 + i * 330);
    }
    $('#listo-tiempo').textContent = tiempoBonito(tiempoMs);
    $('#listo-mejor').textContent = esRecord
      ? (previo ? '¡Nuevo récord! antes: ' + tiempoBonito(previo.ms) : 'Primera vez que lo preparas')
      : 'Tu mejor sigue siendo ' + tiempoBonito(previo.ms);
    /* por el INGREDIENTE, no por la variante: TARJETAS está indexado
       por base ('maiz'), y n.id es 'maiz-1-introduccion'. Buscar por
       el id dejaba las doce tarjetas mudas y —peor— el cuaderno
       cerrado para siempre, porque tarjeta.abre es el único
       desbloqueo de capítulos que tiene la campaña. */
    const tarjeta = TARJETAS[n.base || n.id];
    const caja = $('#listo-tarjeta');
    if (tarjeta) {
      caja.classList.remove('hidden');
      $('#tarjeta-titulo').textContent = tarjeta.titulo;
      $('#tarjeta-texto').textContent = tarjeta.texto;
      const cita = $('#tarjeta-cita');
      if (tarjeta.cita) {
        cita.classList.remove('hidden');
        $('#tarjeta-cita-texto').textContent = '«' + tarjeta.cita.texto + '»';
        $('#tarjeta-cita-quien').textContent = tarjeta.cita.quien;
      } else cita.classList.add('hidden');
      [].concat(tarjeta.abre || []).forEach(abrirCapitulo);
    } else caja.classList.add('hidden');

    /* el botón verde dice A DÓNDE va: a la parada que sigue, al
       cierre del día que acaba de completarse, o a la olla si ya no
       queda semana */
    const quedanParadas = RUTA.some((x, i) => !estaListo(x.id) && desbloqueado(i));
    const miDia = DIAS[n.diaIndex];
    const cierraDia = miDia && diaCompleto(miDia) && !estado.diasVistos.includes(miDia.id);
    $('#listo-seguir').textContent = !quedanParadas
      ? (estado.ollaVista ? '¡La mesa está puesta!' : '¡A la olla!')
      : (cierraDia ? (miDia.sirve ? '¡A la mesa!' : `Cerrar el ${miDia.nombre.toLowerCase()}`) : 'Siguiente parada');
    $('#modal-listo').classList.add('open');
    sfx('fiesta');
  }, 620);
}

function arruinarNivel(motivo) {
  pararReloj();
  sfx('mal'); buzz([60, 50, 120]);
  Motor.destello('rgba(230,57,70,.55)');
  Motor.sacudir(1.2);
  estado.arruinadas++;
  guardar();
  setTimeout(() => {
    Motor.setActive(false);
    $('#arruinado-titulo').textContent = motivo && motivo.titulo ? motivo.titulo : 'Se arruinó la olla';
    let texto = motivo && motivo.texto
      ? motivo.texto
      : 'Un bicho llegó a la comida. Toca botar todo y volver a empezar.';
    /* el near-miss: saber que ibas 17 de 20 es lo que hace apretar
       "Empezar de nuevo" en vez de cerrar la app */
    if (totalAhora > 1 && hechosAhora / totalAhora >= 0.45) {
      texto += ` Ibas ${hechosAhora} de ${totalAhora}… ¡ya casi era!`;
    }
    $('#arruinado-motivo').textContent = texto;
    $('#modal-arruinado').classList.add('open');
  }, 900);
}

function salirDelNivel() {
  pararReloj();
  Motor.descargar();
  Motor.setActive(false);
  nivelActual = null; modActual = null;
  alerta(null); pista(null); voz(null);
  mostrar('mesa');
}

/* ---------- eventos ---------- */

function cerrarModales() { $$('.modal').forEach(m => m.classList.remove('open')); }

function bindEventos() {
  /* Botón empezar: va a la mesa de prep */
  $('#btn-empezar').addEventListener('click', () => {
    initAudio(); sfx('tab');
    estado.vistoPortada = true; guardar();
    mostrar('mesa');
  });

  /* Empezar de nuevo: dos toques. Borrar doce ingredientes ganados
     por un dedo mal puesto sería imperdonable, y un confirm() del
     navegador rompe el tono del juego. El propio botón pregunta. */
  const btnReset = $('#btn-reiniciar');
  if (btnReset) {
    let armado = false, armadoId = null;
    const textoReset = () => listos() ? 'Empezar de nuevo' : '↻ Empezar desde cero';
    btnReset.addEventListener('click', () => {
      if (!armado) {
        armado = true;
        btnReset.textContent = '¿Seguro? Toca otra vez';
        clearTimeout(armadoId);
        armadoId = setTimeout(() => {
          armado = false;
          btnReset.textContent = textoReset();
        }, 3500);
        return;
      }
      clearTimeout(armadoId);
      /* se va el progreso, se queda el gusto: escenario y modo dev */
      const escenario = estado.escenario, dev = estado.devMode;
      estado = nuevoEstado();
      estado.escenario = escenario; estado.devMode = dev;
      guardar();
      armado = false;
      btnReset.textContent = textoReset();
      pintarPortada();
      toast('Olla vacía. A empezar de nuevo 🍲');
      sfx('tab');
    });
  }

  /* EL MODO DEV NO ES PARA JUGADORES. Estaba en la portada a un
     toque de cualquiera, y "todo abierto" le vacía la campaña a
     quien lo pulse por curiosidad. Ahora el botón nace oculto y lo
     revelan cinco toques en el número de versión — el gesto de
     autor de toda la vida. Si ya está activo se muestra, para poder
     apagarlo sin el ritual. */
  const btnDev = $('#btn-dev');
  if (btnDev) {
    btnDev.classList.toggle('hidden', !estado.devMode);
    let toquesVersion = 0, toquesId = null;
    const ver = document.querySelector('[data-version]');
    if (ver) ver.addEventListener('click', () => {
      clearTimeout(toquesId);
      toquesId = setTimeout(() => { toquesVersion = 0; }, 1600);
      if (++toquesVersion >= 5) {
        toquesVersion = 0;
        btnDev.classList.remove('hidden');
        toast('Modo dev a la vista 🛠');
      }
    });
    btnDev.addEventListener('click', () => {
      sfx('tab');
      estado.devMode = !estado.devMode;
      guardar();
      pintarDev();
      toast(estado.devMode ? 'Modo dev: todos los niveles abiertos 🛠' : 'Modo dev desactivado');
      if ($('#screen-mesa').classList.contains('active')) renderMesa();
    });
  }

  /* El Apuro: cerrado hasta terminar el lunes. Soltar a alguien que
     no ha jugado nada en un contrarreloj de ingredientes al azar es
     soltarlo a perder sin saber por qué; con el primer día hecho ya
     conoce seis gestos y el primer bicho. */
  $('#btn-apuro').addEventListener('click', () => {
    sfx('tab');
    if (!diaCompleto(DIAS[0]) && !estado.devMode) {
      toast(`El Apuro se abre terminando el lunes — llevas ${DIAS[0].paradas.filter(estaListo).length} de 8`);
      return;
    }
    arrancarApuro();
  });
  $('#apuro-otra').addEventListener('click', () => { sfx('tab'); cerrarModales(); arrancarApuro(); });
  $('#apuro-salir').addEventListener('click', () => { sfx('tab'); cerrarModales(); mostrar('mesa'); });


  $('#voz').addEventListener('click', () => voz(null));

  /* «Sigue»: lo que renderMesa haya decidido que toca */
  $('#btn-sigue').addEventListener('click', () => {
    sfx('tab');
    if (sigueAccion) sigueAccion();
  });

  /* «?»: la última pista, otra vez. No cuesta nada — el reloj corre
     igual, que releer no es trampa. */
  $('#btn-pista').addEventListener('click', () => {
    sfx('tab');
    if (ultimaPista) pistaAhora(ultimaPista, duracionDe(ultimaPista));
  });
  $('#btn-cuaderno').addEventListener('click', () => { sfx('tab'); mostrar('cuaderno'); });
  $('#cuaderno-volver').addEventListener('click', () => { sfx('tab'); mostrar('mesa'); });
  $('#final-cuaderno').addEventListener('click', () => { cerrarModales(); mostrar('cuaderno'); });

  let salirArmado = 0;
  $('#btn-salir').addEventListener('click', () => {
    sfx('tab');
    /* En El Apuro salir CIERRA la partida en vez de tirarla: llevas
       raciones ganadas y un récord posible, y perderlos por tocar el
       botón de pausa sería lo mismo que castigar por dejar de jugar.
       El resultado se enseña igual que si se hubiera acabado el
       reloj — que es lo que el jugador quiere ver. Pero con el mismo
       doble toque que la campaña: un roce del pulgar no debe terminar
       una partida que iba bien. */
    if (Apuro.activo) {
      if (Date.now() - salirArmado > 2600) {
        salirArmado = Date.now();
        toast('¿Terminar El Apuro? Toca otra vez — lo que llevas se guarda');
        return;
      }
      Apuro.terminar('salida');
      return;
    }
    /* con faena empezada, un toque solo no bota el trabajo: el botón
       está a 40px del filo y el pulgar izquierdo pasa rozando */
    if (corriendo && hechosAhora > 0 && Date.now() - salirArmado > 2600) {
      salirArmado = Date.now();
      toast('¿Dejar la faena a medias? Toca otra vez para salir');
      return;
    }
    salirDelNivel();
  });

  $('#listo-seguir').addEventListener('click', () => {
    const n = nivelActual;
    cerrarModales();
    Motor.descargar();
    nivelActual = null; modActual = null;
    /* SE ACABÓ UN DÍA → a la mesa: la escena del cierre se lee con
       la banda nueva del mapa detrás, y el capítulo respira. Es la
       única escala que el flujo se permite — entre parada y parada
       se sigue yendo directo al mesón. */
    const miDia = n && DIAS[n.diaIndex];
    if (miDia && diaCompleto(miDia) && !estado.diasVistos.includes(miDia.id)) {
      mostrar('mesa');
      return;
    }
    /* DIRECTO al siguiente, sin escala en la mesa — pero sólo a una
       parada que de verdad esté abierta: saltar a una cerrada era
       colarse por detrás del candado. */
    const sig = RUTA.find((x, i) => !estaListo(x.id) && desbloqueado(i));
    if (!sig) {
      /* no queda parada: la semana está cocinada. A la mesa — la olla
         late al final del camino, y si aún no se sirvió, se sirve. */
      mostrar('mesa');
      if (!estado.ollaVista) setTimeout(mostrarFinal, 420);
      return;
    }
    jugar(sig.id);
  });
  $('#listo-repetir').addEventListener('click', () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    if (id) jugar(id);
  });

  $('#arruinado-reintentar').addEventListener('click', () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    if (id) jugar(id);
  });
  $('#arruinado-salir').addEventListener('click', () => { cerrarModales(); salirDelNivel(); });

  $('#final-ok').addEventListener('click', () => { cerrarModales(); mostrar('mesa'); });
  $('#dia-seguir').addEventListener('click', () => { sfx('tab'); cerrarModales(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if ($$('.modal.open').length) { cerrarModales(); return; }
      /* también con Escape el Apuro se CIERRA guardando: la salida
         directa era la única ruta del juego que tiraba a la basura
         raciones ganadas, sin resumen ni récord */
      if (Apuro.activo) { Apuro.terminar('salida'); return; }
      if ($('#screen-juego').classList.contains('active')) salirDelNivel();
      else if ($('#screen-cuaderno').classList.contains('active')) mostrar('mesa');
    }
  });

  /* el primer dedo sobre el mesón arranca el reloj de la campaña */
  $('#escena').addEventListener('pointerdown', () => {
    if (relojEnEspera) { relojEnEspera = false; arrancarReloj(); }
  }, { capture: true });

  /* el navegador se fue a otra pestaña: no correr el reloj de gratis */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && corriendo) { corriendo = false; }
    else if (!document.hidden && relojId && !corriendo) { arrancarReloj(); }
  });
}

function mostrarFinal() {
  /* servir la olla deja huella: es lo que decide que el mapa la
     pinte servida y que este altar no vuelva a salir sin que se
     pida */
  if (!estado.ollaVista) { estado.ollaVista = true; guardar(); }
  /* UN SOLO FINAL, al final de la semana: el jueves por la noche la
     olla hierve y esa es la campaña completa. El viernes — servir —
     ya no es este altar: es El Apuro, y este texto lo deja
     invitado. */
  $('#final-eyebrow').textContent = 'jueves santo, por la noche';
  $('#final-titulo').textContent = '¡La fanesca está lista!';
  $('#final-cuerpo').textContent = 'Toda la semana pasó por tus manos: grano por grano, vaina por vaina, hasta la tonga de anoche. Que hierva despacio — mañana es Viernes Santo, y mañana se sirve.';
  /* la cuenta es de la CAMPAÑA: el viernes —lo de encima del plato—
     viene después de este altar, y medirlo aquí lo haría deuda */
  const cuenta = RUTA.filter(n => !n.sirve);
  const total = cuenta.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].ms : 0), 0);
  const cuch = cuenta.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].cucharas : 0), 0);
  $('#final-cierre').textContent = CIERRE;
  $('#final-voz').innerHTML = `«${CACUANGO_PARAMO.texto}»<span>${CACUANGO_PARAMO.quien}</span>`;
  $('#final-total').textContent = `${cuch} de ${cuenta.length * 3} cucharas · ${tiempoBonito(total)} en total`;
  HISTORIA.capitulos.forEach(c => abrirCapitulo(c.id));
  $('#modal-final').classList.add('open');
  sfx('fiesta');
}

/* ---------- arranque ---------- */

function init() {
  estado = cargar() || nuevoEstado();

  /* los gradientes de acuarela de los iconos */
  if (typeof ICON_DEFS === 'string') document.body.insertAdjacentHTML('beforeend', ICON_DEFS);
  $$('[data-icon]').forEach(n => { n.innerHTML = icono(n.dataset.icon); });

  const cont = $('#escena');
  let ok = false;
  try { ok = Motor.init(cont, $('#destello')); } catch (e) { ok = false; }
  motorListo = ok;
  if (ok) Motor.escenario(estado.escenario || POR_DEFECTO);
  /* el editor de escena: solo existe en modo dev, y guarda sus
     retoques aparte del progreso */
  if (ok) Editor.init(Motor, {
    niveles: () => RUTA,
    escenarios: () => ESCENARIOS,
    jugar: (id) => jugar(id),
    escenario: (id) => { estado.escenario = id; guardar(); Motor.escenario(id); },
  });
  if (!ok) {
    cont.innerHTML = `<div class="panel" style="margin:var(--sp-8) var(--sp-5)">
      <p><b>Este minijuego necesita WebGL.</b></p>
      <p class="muted">Tu navegador no lo tiene activado, así que la mesa de prep no puede armarse.
      Prueba en otro navegador, o activa la aceleración por hardware.</p></div>`;
  }

  /* el toque largo tampoco debe abrir el menú contextual: en el
     fréjol "mantener apretado" es EL gesto del nivel */
  document.getElementById('stage').addEventListener('contextmenu', (e) => e.preventDefault());

  bindEventos();
  pintarDev();
  /* LA PORTADA SIEMPRE, como cualquier juego: es la pantalla de
     casa. Saltarla en cuanto había partida guardada dejaba sin
     ninguna puerta a "empezar de nuevo" ni al modo dev — había que
     borrar el almacenamiento del navegador para reiniciar. Con
     progreso, el botón dice "Seguir cocinando" y debajo se ve por
     dónde vas; sin progreso, invita a empezar. */
  pintarPortada();
  mostrar('portada');
}

/* una ventanita al juego: sirve para depurar en la consola y para
   probarlo automatizado */
window.Fanesca = {
  Motor, NIVELES,
  get estado() { return estado; },
  get nivel() { return nivelActual; },
  /* El módulo que REALMENTE se montó. `nivel` es la ficha de la mesa y
     se fija antes de importar, así que sirve para saber a qué le diste
     clic — no para saber si abrió. Un nivel con un error de sintaxis
     dejaba `nivel` puesto y volvía a la mesa con un toast: para una
     prueba automática eso se veía idéntico a un nivel sano. */
  get modulo() { return modActual; },
  jugar,
  get ruta() { return RUTA.map(n => ({ id: n.id, dia: n.dia, num: n.num, dif: n.dificultad, base: n.base, intro: !!n.intro })); },
  api,
  Apuro,
  sondear: (x, y) => Motor.sondear(x, y),
  puntos: () => ({ batea: Motor.proyectar(BATEA), composta: Motor.proyectar(COMPOSTA) }),
};

document.addEventListener('DOMContentLoaded', init);
