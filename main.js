/* ============================================================
   FANESCA — main.js
   El juego alrededor de los niveles: pantallas, progreso, reloj,
   cucharas, guardado y el puente entre el motor 3D y el HUD.

   Aquí no hay ni un grano de maíz: cada ingrediente vive en su
   propio `nivel-<id>.js`. Este archivo solo sabe montarlos,
   cronometrarlos y celebrarlos.
   ============================================================ */

import Motor, { MESA_Y, BATEA, COMPOSTA, FRENTE_TABLA } from './motor3d.js';
import { NIVELES, POR_VENIR, OLLA, ORDEN_OLLA, porId, cucharasDe, cucharasConFallos, tiempoBonito } from './niveles.js';
import { ARRUINADO } from './arruinado.js';
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
  /* el arroz no va en la fanesca: ese mesón pasó a ser el mote (2.4),
     con la misma mecánica de lavar hasta el agua clara */
  'arroz-1-tres-aguas': 'mote-1-tres-aguas',
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
  /* el chapoteo de algo que cae a la olla: grave y corto, sube de
     tono con cada ingrediente */
  plop:  [{ f: 300, d: .09, g: .07 }, { f: 170, t: .03, d: .14, g: .06, w: 'triangle' }],
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
  const id = 'screen-' + pantalla;
  /* LA QUE SE VA se hunde y se apaga mientras la nueva sube: dos
     capas que se cruzan, como en cualquier consola. Un instante
     después deja de existir del todo (display:none), para que no
     capture ni un toque por debajo de la nueva. */
  const previa = $('.screen.active');
  if (previa && previa.id !== id) {
    previa.classList.add('saliendo');
    setTimeout(() => previa.classList.remove('saliendo'), 340);
  }
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
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
  /* el avance habla en el idioma del recetario: paradas y día */
  const paradas = RUTA.filter(n => estaListo(n.id)).length;
  const dia = DIAS.find(d => !diaCompleto(d));
  if (avance) {
    avance.textContent = hechos
      ? `${paradas} de ${RUTA.length} paradas · vas por el ${dia ? dia.nombre.toLowerCase() : 'final'}`
      : '';
    avance.classList.toggle('hidden', !hechos);
  }
  /* LA TARJETA DE AVANCE, sólo con partida: el anillo de la semana
     y el día en curso con su título. Es la ficha de "continuar" de
     cualquier juego — se ve de un vistazo cuánto hay y dónde ibas. */
  const tarjeta = $('#portada-tarjeta');
  if (tarjeta) {
    tarjeta.classList.toggle('hidden', !hechos);
    const pct = Math.round(paradas / RUTA.length * 100);
    const anillo = $('#portada-anillo'); if (anillo) anillo.style.setProperty('--p', pct);
    const cifra = $('#portada-anillo-n'); if (cifra) cifra.textContent = pct + '%';
    const d = $('#portada-dia');
    if (d) d.textContent = dia ? `${dia.nombre} · ${dia.titulo}` : 'La mesa, puesta y servida';
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

/* ============================================================
   EL RECETARIO COMO CONSOLA — un día por pantalla, sin desplazarse.

   La lista larga se leía como una página web: había que bajar con
   el pulgar para encontrar dónde seguir, y eso no es un juego. Una
   consola en vertical no desplaza nada: cada día es una PANTALLA
   con sus paradas en rejilla, se pasa de día con las pestañas, las
   flechas o deslizando, hay un CURSOR sobre la parada elegida y una
   barra de acción fija abajo que siempre dice qué toca. Entre el
   jueves por la noche y el viernes está la pantalla de LA OLLA, que
   es el destino de toda la semana.
   ============================================================ */

/* las pantallas del carrusel, en orden: cinco días, la olla, el viernes */
const PAGINAS = [];
let focoId = null;            /* la parada bajo el cursor, u 'olla' */
let mesaCarrusel = null;      /* se arma una sola vez, al primer render */

function armarPaginas() {
  PAGINAS.length = 0;
  DIAS.forEach(d => { if (!d.sirve) PAGINAS.push({ tipo: 'dia', dia: d }); });
  PAGINAS.push({ tipo: 'olla' });
  DIAS.forEach(d => { if (d.sirve) PAGINAS.push({ tipo: 'dia', dia: d }); });
}
const paginaDe = (id) => {
  if (id === 'olla') return PAGINAS.findIndex(p => p.tipo === 'olla');
  const n = rutaPorId(id);
  return n ? PAGINAS.findIndex(p => p.tipo === 'dia' && p.dia.id === n.dia) : -1;
};

/* ---------- el carrusel: flechas, pestañas y deslizar ----------
   Un solo mecanismo para el recetario y el cuaderno. La pista es un
   flex de páginas del ancho de la ventana y se mueve con transform;
   el dedo la arrastra en vivo y al soltar cae a la página más
   cercana. Un deslizamiento NO es un toque: el clic que el navegador
   dispara al soltar sobre una ficha se ignora si se acaba de
   deslizar, o cada cambio de día jugaría una parada sin querer. */
function nuevoCarrusel({ viewport, pista, izq, der, alCambiar }) {
  let i = 0, x0 = 0, y0 = 0, dx = 0, arrastrando = false, gesto = null, deslizadoEn = 0;
  const total = () => pista.children.length;
  const pintar = (anim = true) => {
    pista.style.transition = anim ? '' : 'none';
    pista.style.transform = `translateX(${-i * 100}%)`;
    if (!anim) void pista.offsetWidth;
    if (izq) izq.classList.toggle('hidden', i <= 0);
    if (der) der.classList.toggle('hidden', i >= total() - 1);
    if (alCambiar) alCambiar(i, total());
  };
  const irA = (n, anim = true) => { i = Math.max(0, Math.min(total() - 1, n)); pintar(anim); };
  if (izq) izq.addEventListener('click', () => { sfx('tab'); irA(i - 1); });
  if (der) der.addEventListener('click', () => { sfx('tab'); irA(i + 1); });
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    x0 = e.clientX; y0 = e.clientY; dx = 0; arrastrando = true; gesto = null;
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const mx = e.clientX - x0, my = e.clientY - y0;
    if (!gesto) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
      gesto = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
    }
    if (gesto !== 'h') return;
    dx = mx;
    /* en los extremos la pista se resiste: se nota que no hay más */
    const tope = ((i === 0 && dx > 0) || (i === total() - 1 && dx < 0)) ? 0.3 : 1;
    pista.style.transition = 'none';
    pista.style.transform = `translateX(calc(${-i * 100}% + ${Math.round(dx * tope)}px))`;
  });
  const soltar = () => {
    if (!arrastrando) return;
    arrastrando = false;
    if (gesto === 'h' && Math.abs(dx) > 44) { deslizadoEn = Date.now(); sfx('tab'); irA(i + (dx < 0 ? 1 : -1)); }
    else pintar(true);
    gesto = null; dx = 0;
  };
  viewport.addEventListener('pointerup', soltar);
  viewport.addEventListener('pointercancel', soltar);
  viewport.addEventListener('pointerleave', soltar);
  return { irA, get i() { return i; }, get total() { return total(); }, pintar,
    recienDeslizado: () => Date.now() - deslizadoEn < 350 };
}

const TAB_DE = { lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', noche: 'Noche', viernes: 'Vie' };

/* las pestañas de arriba: una por pantalla, con la activa en oro, un
   ✓ en las hechas y apagadas las que aún no se abren */
function pintarTabs() {
  const nav = $('#dias-tabs');
  if (!nav) return;
  const actual = mesaCarrusel ? mesaCarrusel.i : 0;
  const campana = RUTA.filter(n => !n.sirve);
  const todas = campana.every(n => estaListo(n.id));
  nav.innerHTML = '';
  PAGINAS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    let hecha, cerrada, txt;
    if (p.tipo === 'olla') {
      txt = '🍲'; hecha = !!estado.ollaVista; cerrada = !todas && !estado.ollaVista && !estado.devMode;
      b.setAttribute('aria-label', 'La olla');
    } else {
      const d = p.dia;
      txt = TAB_DE[d.id] || d.nombre;
      hecha = diaCompleto(d);
      const primera = RUTA.findIndex(n => n.id === d.paradas[0]);
      cerrada = !hecha && !d.paradas.some(id => estaListo(id)) && !desbloqueado(primera);
      b.setAttribute('aria-label', d.nombre);
    }
    b.className = 'tab' + (i === actual ? ' tab--activa' : '') + (hecha ? ' tab--hecha' : '') + (cerrada ? ' tab--cerrada' : '');
    b.textContent = txt;
    b.addEventListener('click', () => { sfx('tab'); if (mesaCarrusel) mesaCarrusel.irA(i); });
    nav.appendChild(b);
  });
}

/* la barra de acción: siempre dice qué toca con el cursor donde está */
function pintarDock() {
  const b = $('#btn-sigue');
  if (!b) return;
  if (focoId === 'olla') {
    b.classList.remove('hidden');
    b.innerHTML = '<b>🍲 ¡A la olla!</b><small>toda la semana, en una sola olla</small>';
    sigueAccion = () => mostrarFinal();
    return;
  }
  const n = focoId ? rutaPorId(focoId) : null;
  if (!n) { b.classList.add('hidden'); sigueAccion = null; return; }
  const hecho = estaListo(n.id);
  b.classList.remove('hidden');
  b.innerHTML = `<b>${hecho ? '↻ Otra vez' : '▶ Cocinar'}</b><small>${n.num} · ${n.intro ? n.corto : (n.corto || n.nombre)}</small>`;
  sigueAccion = () => jugar(n.id);
}

/* mover el cursor: la ficha elegida se marca y el dock la nombra */
function enfocar(id) {
  focoId = id;
  $$('#mesa-lista .renglon--foco').forEach(el => el.classList.remove('renglon--foco'));
  const el = document.querySelector(`#mesa-lista .renglon[data-id="${id}"]`);
  if (el) el.classList.add('renglon--foco');
  pintarDock();
}

/* una pantalla de día: cabecera con su gente y su anillo, y las
   paradas en rejilla de dos columnas — ocho fichas grandes que caben
   sin bajar */
function paginaDia(dia) {
  const relato = DIAS_RELATO[dia.id] || {};
  const hechasDia = dia.paradas.filter(id => estaListo(id)).length;
  const completo = hechasDia === dia.paradas.length;
  const primeraIdx = RUTA.findIndex(n => n.id === dia.paradas[0]);
  const abiertoDia = hechasDia > 0 || desbloqueado(primeraIdx);
  const DECO = { lunes: '🧺', martes: '🥜', miercoles: '🌿', jueves: '🔥', noche: '🕯️', viernes: '🎉' };
  const pag = document.createElement('section');
  pag.className = 'pagina pagina--' + dia.id + (completo ? ' pagina--hecha' : (abiertoDia ? '' : ' pagina--porvenir'));
  const pctDia = Math.round(hechasDia / dia.paradas.length * 100);
  pag.innerHTML = `
    <header class="pagina-head">
      <div class="pagina-head-txt">
        <p class="pagina-dia">${dia.nombre}</p>
        <h3 class="pagina-titulo">${dia.titulo}</h3>
        <p class="pagina-quien">${relato.quien || ''}</p>
      </div>
      <span class="anillo pagina-anillo" style="--p:${pctDia}" aria-hidden="true"><span class="pagina-deco">${DECO[dia.id] || ''}</span></span>
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
    b.dataset.id = n.id;
    b.className = 'renglon ' + (mejor ? 'renglon--hecho' : (esSiguiente ? 'renglon--siguiente' : 'renglon--bloqueado'))
      + (focoId === n.id ? ' renglon--foco' : '');
    /* la ficha dice el gesto en la presentación ("El choclo · desgranar")
       y el nombre de la variante después, que ya trae al ingrediente */
    const nombre = n.intro ? `${n.corto} · ${n.tarea.toLowerCase()}` : n.nombre;
    const dif = n.dificultad ? `<span class="renglon-dif" aria-hidden="true">${'🌶️'.repeat(n.dificultad)}</span>` : '';
    b.innerHTML = `
      <span class="renglon-num">${n.num}</span>
      <span class="renglon-icono" aria-hidden="true">${icono(n.icono)}</span>
      <span class="renglon-txt"><span class="renglon-nombre">${nombre}</span>${dif}</span>
      <span class="renglon-estado">${mejor
        ? `<span class="renglon-cucharas">${cucharasHTML(mejor.cucharas)}</span>`
        : (esSiguiente ? '<span class="renglon-lapiz" aria-hidden="true">✎</span>' : '<span class="renglon-candado" aria-hidden="true">🔒</span>')}</span>`;
    b.setAttribute('aria-label', `Paso ${n.num}: ${n.nombre}` + (n.dificultad ? ` (dificultad ${n.dificultad} de 5)` : '') + (abierto ? '' : ' (bloqueado)'));
    b.addEventListener('click', () => {
      if (mesaCarrusel && mesaCarrusel.recienDeslizado()) return;
      sfx('tab');
      if (!abierto) {
        /* el viernes no está cerrado por la parada anterior sino por
           la olla, y el candado debe decir la verdad */
        toast(n.sirve && !estado.ollaVista
          ? 'Primero se cocina la olla 🍲'
          : 'Primero ' + RUTA[i - 1].nombre.toLowerCase() + ' 👆');
        return;
      }
      /* PRIMER TOQUE: el cursor se pone encima y el dock la nombra.
         SEGUNDO TOQUE (o el dock): se cocina. Como en una consola —
         y de paso ningún roce del pulgar abre un mesón sin querer. */
      if (focoId === n.id) { jugar(n.id); return; }
      enfocar(n.id);
    });
    li.appendChild(b);
    ol.appendChild(li);
  });
  return pag;
}

/* la pantalla de la olla: el destino de la semana, con la fanesca
   llenándose parada a parada */
function paginaOlla(ctx) {
  const { campana, campanaHecha, todas, hechos } = ctx;
  const ollaAbierta = todas || estado.ollaVista;
  const pctOlla = Math.round(campanaHecha / campana.length * 100);
  const pag = document.createElement('section');
  pag.className = 'pagina pagina--olla' + (estado.ollaVista ? ' pagina--hecha' : (ollaAbierta ? '' : ' pagina--porvenir'));
  pag.innerHTML = `
    <header class="pagina-head">
      <div class="pagina-head-txt">
        <p class="pagina-dia">jueves por la noche</p>
        <h3 class="pagina-titulo">La fanesca</h3>
        <p class="pagina-quien">toda la casa, alrededor de la olla</p>
      </div>
      <span class="anillo pagina-anillo" style="--p:${pctOlla}" aria-hidden="true"><span class="pagina-deco">🍲</span></span>
      ${estado.ollaVista ? '<span class="pagina-sello" aria-hidden="true">✓ servida</span>' : `<span class="pagina-cuenta">${campanaHecha} de ${campana.length} paradas</span>`}
    </header>
    <div class="olla-centro">
      <span class="anillo olla-anillo" style="--p:${pctOlla}" aria-hidden="true"><span class="olla-anillo-ic">${icono(OLLA.icono)}</span></span>
      <p id="olla-frase" class="mesa-frase">${FRASES_OLLA[Math.min(hechos, FRASES_OLLA.length - 1)]}</p>
    </div>`;
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
    if (mesaCarrusel && mesaCarrusel.recienDeslizado()) return;
    sfx('tab');
    if (!ollaAbierta) { toast(`La olla se cocina al final de la semana — faltan ${campana.length - campanaHecha} paradas`); return; }
    mostrarFinal();
  });
  pag.appendChild(receta);
  return pag;
}

function renderMesa() {
  renderEscenarios();
  /* la primera visita va al grano: el selector de cocinas es de
     quien ya cocina; hasta entonces ni el botón ni la hoja existen */
  const algunHecho = listos() > 0;
  const puedeCocina = algunHecho || !!estado.devMode;
  const esc = document.querySelector('.escenarios');
  if (esc) esc.classList.toggle('hidden', !puedeCocina);
  const btnCocina = $('#btn-cocina');
  if (btnCocina) btnCocina.classList.toggle('hidden', !puedeCocina);

  const hechos = listos();
  const paradasHechas = RUTA.filter(n => estaListo(n.id)).length;
  /* LA OLLA MIRA LA CAMPAÑA: los días de preparación, sin el
     viernes — lo de encima del plato viene DESPUÉS de la olla */
  const campana = RUTA.filter(n => !n.sirve);
  const campanaHecha = campana.filter(n => estaListo(n.id)).length;
  const todas = campanaHecha >= campana.length;
  const todo = paradasHechas >= RUTA.length;
  const racha = (estado.dias && estado.dias.seguidos > 1) ? ` · 🔥${estado.dias.seguidos} días` : '';
  const diaEnCurso = DIAS.find(d => !diaCompleto(d));
  $('#mesa-progreso').textContent = (todo && estado.ollaVista)
    ? `La mesa, puesta y servida${racha}`
    : (todas && !estado.ollaVista
      ? `${paradasHechas} / ${RUTA.length} — la olla espera${racha}`
      : `${paradasHechas} / ${RUTA.length} paradas · ${diaEnCurso.nombre.toLowerCase()}${racha}`);
  const pct = Math.round(paradasHechas / RUTA.length * 100);
  const anillo = $('#mesa-anillo'); if (anillo) anillo.style.setProperty('--p', pct);
  const cifra = $('#mesa-anillo-n'); if (cifra) cifra.textContent = pct + '%';

  /* EL CURSOR. Se queda donde estaba si esa parada sigue abierta;
     si no, va a la que toca: la siguiente parada abierta, o la olla
     cuando ya no queda semana por cocinar. */
  const siguiente = RUTA.find((x, i) => !estaListo(x.id) && desbloqueado(i));
  /* la olla sólo retiene el cursor mientras espera: servida, el
     cursor sigue al viernes */
  const focoVale = focoId === 'olla'
    ? (todas && !estado.ollaVista)
    : (() => { const i = RUTA.findIndex(n => n.id === focoId); return i >= 0 && desbloqueado(i); })();
  if (!focoVale) focoId = siguiente ? siguiente.id : ((todas && !estado.ollaVista) ? 'olla' : null);

  if (!PAGINAS.length) armarPaginas();
  const lista = $('#mesa-lista');
  lista.innerHTML = '';
  lista.className = 'mesa-lista pista-paginas';
  const ctx = { campana, campanaHecha, todas, hechos };
  PAGINAS.forEach(p => {
    const envoltura = document.createElement('div');
    envoltura.className = 'pag';
    envoltura.appendChild(p.tipo === 'olla' ? paginaOlla(ctx) : paginaDia(p.dia));
    lista.appendChild(envoltura);
  });

  /* EL VIERNES trae debajo de sus tres fichas a El Apuro: servir a una
     casa que no deja de llenarse es lo que el modo sin fin juega. El
     botón vive en el HTML con sus eventos puestos; aquí se muda. */
  const pagViernes = lista.querySelector('.pagina--viernes');
  if (pagViernes) {
    const promesa = document.createElement('p');
    promesa.className = 'viernes-promesa';
    promesa.textContent = VIERNES.promesa;
    pagViernes.appendChild(promesa);
    if (!btnApuroEl) btnApuroEl = document.getElementById('btn-apuro');
    if (btnApuroEl) {
      const lunesListo = diaCompleto(DIAS[0]) || estado.devMode;
      btnApuroEl.classList.remove('hidden');
      btnApuroEl.classList.toggle('btn-apuro--cerrado', !lunesListo);
      const pie = btnApuroEl.querySelector('#btn-apuro-pie');
      if (pie) pie.textContent = !lunesListo
        ? `Se abre terminando el lunes — llevas ${DIAS[0].paradas.filter(estaListo).length} de 8`
        : (estado.apuro ? `Tu récord: ${estado.apuro.raciones} raciones` : 'Raciones sin fin, contra el reloj');
      pagViernes.appendChild(btnApuroEl);
    }
  }

  /* el carrusel se arma una vez y se abre en la pantalla del cursor */
  if (!mesaCarrusel) {
    mesaCarrusel = nuevoCarrusel({
      viewport: document.querySelector('#screen-mesa .scroll'),
      pista: lista,
      izq: $('#mesa-izq'), der: $('#mesa-der'),
      alCambiar: () => pintarTabs(),
    });
  }
  const destino = paginaDe(focoId);
  mesaCarrusel.irA(destino >= 0 ? destino : 0, false);
  pintarTabs();
  pintarDock();

  /* EL CIERRE DE UN DÍA SE CELEBRA AQUÍ, al volver a la mesa. Una
     sola vez por día. */
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
  celebrar(30);
}

/* ---------- el confeti ----------
   Papelitos de la fiesta cuando algo sale bien: cada uno nace con
   su columna, su color, su giro y su demora en variables, y el CSS
   lo deja caer. Se quitan solos; con movimiento reducido no salen. */
const CONFETI_COLORES = ['#f4b942', '#ffd36a', '#e8508a', '#5db55a', '#5fa8d3', '#e08a45', '#fff6e8'];
function celebrar(cuantos = 28) {
  const caja = $('#confeti');
  if (!caja) return;
  try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  const piezas = [];
  for (let i = 0; i < cuantos; i++) {
    const p = document.createElement('i');
    p.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
    p.style.setProperty('--c', CONFETI_COLORES[i % CONFETI_COLORES.length]);
    p.style.setProperty('--w', (6 + Math.random() * 6).toFixed(1) + 'px');
    p.style.setProperty('--h', (10 + Math.random() * 8).toFixed(1) + 'px');
    p.style.setProperty('--d', (1.4 + Math.random() * .9).toFixed(2) + 's');
    p.style.setProperty('--t', (Math.random() * .35).toFixed(2) + 's');
    p.style.setProperty('--dx', ((Math.random() - .5) * 140).toFixed(0) + 'px');
    p.style.setProperty('--r', ((360 + Math.random() * 720) * (Math.random() < .5 ? -1 : 1)).toFixed(0) + 'deg');
    piezas.push(p);
    caja.appendChild(p);
  }
  setTimeout(() => piezas.forEach(p => p.remove()), 2800);
}

/* ---------- la olla se llena ----------
   La escena del final: encima del altar del jueves, los ingredientes
   caen a la olla uno a uno, en el orden en que entran de verdad
   (ORDEN_OLLA, en niveles.js). Todo es DOM: aquí se ponen las piezas
   y el ritmo, el CSS las deja caer. Cada uno deja un trozo en el
   caldo, que va pasando de agua a fanesca, y el vapor sube con la
   olla llena. Un toque la salta; con movimiento reducido no se lanza.
   Devuelve una promesa que se cumple cuando la escena se apagó —o se
   saltó—: la fiesta del altar espera a eso, para que el confeti caiga
   sobre la olla lista y no debajo de una cortina negra. */
const OLLA_TROZOS = {
  zapallo: '#f0a04b', sambo: '#dfe6b0', mote: '#f3e9c8', garbanzo: '#e8c98a',
  habas: '#8fae7e', frejol: '#b98aae', maiz: '#f4d35e', arveja: '#7fb069',
  escoger: '#c98a4b', chochos: '#fbf3e0', melloco: '#f0c352', quinua: '#efe6d2',
  mani: '#d9b48a', col: '#bcd39a', bacalao: '#fbf3e0', queso: '#fdfaf0',
};
const OLLA_AGUA = [0x8f, 0xbf, 0xd0], OLLA_FANESCA = [0xe0, 0xb4, 0x5c];
const ollaColor = (c) => `rgb(${c.map(Math.round).join(',')})`;
let ollaEscena = null;   /* la escena en curso: { timers, resolver } */

function escenaOlla() {
  const esc = $('#olla-escena');
  if (!esc) return Promise.resolve();
  try { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve(); } catch (e) {}
  if (ollaEscena) apagarEscenaOlla(true);
  return new Promise(resolver => {
    const ctx = { timers: [], resolver };
    ollaEscena = ctx;
    const luego = (fn, ms) => ctx.timers.push(setTimeout(fn, ms));
    const caida = $('#olla-escena-caida'), trozos = $('#olla-trozos'), burbujas = $('#olla-burbujas'), caldo = $('#olla-caldo');
    const nombre = $('#olla-escena-nombre'), titulo = $('#olla-escena-titulo'), eyebrow = $('#olla-escena-eyebrow'), olla = $('#olla-escena-olla');
    const reentra = (el) => { el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra'); };

    caida.innerHTML = ''; trozos.innerHTML = ''; burbujas.innerHTML = ''; nombre.textContent = '';
    titulo.textContent = 'A la olla'; titulo.classList.remove('entra');
    eyebrow.textContent = 'jueves santo, por la noche';
    caldo.setAttribute('fill', ollaColor(OLLA_AGUA));
    esc.className = 'olla-escena'; esc.hidden = false; esc.style.setProperty('--vapor', '0');
    requestAnimationFrame(() => esc.classList.add('olla-escena--abre'));

    const lista = ORDEN_OLLA.map(o => ({ ...o, icono: (porId(o.id) || {}).icono || 'granos_mixtos' }));
    const n = lista.length;
    let t = 900;
    lista.forEach((ing, i) => {
      luego(() => {
        /* cae, con su nombre arriba */
        const pieza = document.createElement('span');
        pieza.className = 'olla-cae';
        const x = (36 + Math.random() * 28).toFixed(0) + '%';
        pieza.style.setProperty('--x', x);
        pieza.style.setProperty('--gira', ((Math.random() - .5) * 60).toFixed(0) + 'deg');
        pieza.innerHTML = icono(ing.icono);
        caida.appendChild(pieza);
        nombre.textContent = ing.nombre;
        reentra(nombre);
        /* y aterriza: chapoteo, un trozo en el caldo, la olla que se
           sacude y el caldo un paso más cerca de la fanesca */
        luego(() => {
          pieza.remove();
          const s = document.createElement('span');
          s.className = 'olla-salpica'; s.style.setProperty('--x', x);
          s.innerHTML = '<i></i><b></b><b></b>';
          caida.appendChild(s);
          luego(() => s.remove(), 600);
          const tr = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          tr.setAttribute('cx', (48 + Math.random() * 144).toFixed(0));
          tr.setAttribute('cy', (84 + Math.random() * 16).toFixed(0));
          tr.setAttribute('rx', (5 + Math.random() * 4).toFixed(1));
          tr.setAttribute('ry', (2.4 + Math.random() * 1.6).toFixed(1));
          tr.setAttribute('fill', OLLA_TROZOS[ing.id] || '#e8d9b8');
          trozos.appendChild(tr);
          const k = (i + 1) / n;
          caldo.setAttribute('fill', ollaColor(OLLA_AGUA.map((a, j) => a + (OLLA_FANESCA[j] - a) * k)));
          esc.style.setProperty('--vapor', Math.min(1, k * 1.2).toFixed(2));
          olla.classList.remove('plop'); void olla.offsetWidth; olla.classList.add('plop');
          sfx('plop', 0.85 + i * 0.03); buzz(8);
        }, 600);
      }, t);
      /* los dos últimos —el bacalao y el queso— entran más despacio:
         son el cierre de la receta y se les da su momento */
      t += i >= n - 2 ? 780 : 470;
    });
    /* hierve */
    luego(() => {
      titulo.textContent = '¡La fanesca está lista!'; reentra(titulo);
      eyebrow.textContent = 'que hierva despacio · mañana se sirve';
      nombre.textContent = 'toda la semana, en una sola olla'; reentra(nombre);
      esc.classList.add('olla-escena--hierve');
      for (let i = 0; i < 7; i++) {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', 58 + i * 21); c.setAttribute('cy', 88 + (i % 2) * 7); c.setAttribute('r', 2 + (i % 3));
        burbujas.appendChild(c);
      }
      sfx('bien'); buzz([10, 20, 10]);
    }, t + 150);
    luego(() => apagarEscenaOlla(false), t + 2600);
  });
}

function apagarEscenaOlla(saltada) {
  const ctx = ollaEscena;
  if (!ctx) return;
  ollaEscena = null;
  ctx.timers.forEach(clearTimeout);
  const esc = $('#olla-escena');
  if (esc) {
    esc.classList.add('olla-escena--sale');
    setTimeout(() => { if (!ollaEscena) { esc.hidden = true; esc.className = 'olla-escena'; } }, saltada ? 320 : 560);
  }
  if (saltada) sfx('tab');
  ctx.resolver();
}

/* ---------- la tarjeta de parada ----------
   Al entrar al mesón la cortina baja un instante y presenta la
   escena: qué día es, qué parada, qué se hace. Tapa la carga del
   módulo y los modelos —que es cuando la pantalla estaba en blanco—
   y no captura el dedo: si el jugador ya está tocando, se va sola. */
let cortinaId = null, cortinaT0 = 0;
const CORTINA_MIN = 1000;         /* ms mínimos con la tarjeta a la vista */
const CORTINA_TRAS_LISTO = 600;   /* y nunca menos de esto con el mesón YA armado detrás */
function tarjetaDeParada(n) {
  const c = $('#cortina');
  if (!c || !n) return;
  const dia = DIAS[n.diaIndex];
  $('#cortina-dia').textContent = `${dia ? dia.nombre : 'la semana'} · parada ${n.num}`;
  $('#cortina-nombre').textContent = n.intro ? (n.corto || n.nombre) : n.nombre;
  $('#cortina-tarea').textContent = n.tarea;
  const ic = $('#cortina-icono .plate'); if (ic) ic.innerHTML = icono(n.icono);
  c.classList.remove('cierra');
  c.classList.add('abre');
  cortinaT0 = performance.now();
  /* red de seguridad: si el nivel nunca avisa que está listo, la
     cortina se va sola antes que dejar la pantalla a oscuras */
  clearTimeout(cortinaId);
  cortinaId = setTimeout(apagarCortina, 6000);
}
/* la cortina se va: fundido de medio segundo y fuera */
function apagarCortina() {
  const c = $('#cortina');
  clearTimeout(cortinaId);
  if (!c || !c.classList.contains('abre')) return;
  c.classList.remove('abre');
  c.classList.add('cierra');
  cortinaId = setTimeout(() => c.classList.remove('cierra'), 520);
}
/* SE CIERRA CUANDO EL NIVEL ESTÁ MONTADO, no a tiempo fijo: armar un
   mesón bloquea el hilo un buen rato y una animación de CSS con
   reloj propio se consumía entera debajo del bloqueo — la tarjeta
   desaparecía antes de que nadie la viera. Y se cuenta desde el
   PRIMER CUADRO PINTADO con el mesón detrás (dos rAF), no desde que
   el código terminó: en un teléfono lento el primer cuadro del
   WebGL tarda más que el respiro entero, y la tarjeta se iría en el
   mismo instante en que por fin podía verse. Nunca menos de un
   segundo en total, nunca menos del respiro con el mesón listo.
   Devuelve una promesa que se cumple cuando la cortina empieza a
   irse: las pistas de arranque esperan a eso, que hablar detrás de
   una cortina es hablarle a nadie. */
function cerrarCortina() {
  const c = $('#cortina');
  if (!c || !c.classList.contains('abre')) return Promise.resolve();
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!c.classList.contains('abre')) { resolve(); return; }
      const falta = Math.max(CORTINA_TRAS_LISTO, CORTINA_MIN - (performance.now() - cortinaT0));
      clearTimeout(cortinaId);
      cortinaId = setTimeout(() => { apagarCortina(); resolve(); }, falta);
    }));
  });
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

let cuadernoCarrusel = null;

/* los puntos bajo el cuaderno: uno por página, el activo en oro */
function pintarPuntosCuaderno(i, total) {
  const caja = $('#cuaderno-puntos');
  if (!caja) return;
  caja.innerHTML = '';
  for (let k = 0; k < total; k++) {
    const p = document.createElement('button');
    p.type = 'button';
    p.className = 'punto' + (k === i ? ' punto--activo' : '');
    p.setAttribute('aria-label', `Página ${k + 1} de ${total}`);
    p.addEventListener('click', () => { sfx('tab'); if (cuadernoCarrusel) cuadernoCarrusel.irA(k); });
    caja.appendChild(p);
  }
}

/* EL CUADERNO SE HOJEA, no se baja: una página por capítulo, la
   entradilla al frente y las fuentes al final. Un capítulo largo se
   lee dentro de su página — eso sí baja, porque es lectura — pero la
   pantalla entera nunca se mueve. */
function renderCuaderno() {
  const pista = $('#cuaderno-capitulos');
  pista.innerHTML = '';
  const pagina = (clase, html) => {
    const env = document.createElement('div');
    env.className = 'pag';
    const sec = document.createElement('article');
    sec.className = clase;
    sec.innerHTML = html;
    env.appendChild(sec);
    pista.appendChild(env);
    return sec;
  };

  pagina('pagina capitulo-portada', `
    <span class="capitulo-portada-ic" aria-hidden="true">${icono(OLLA.icono)}</span>
    <p class="pagina-dia">el cuaderno</p>
    <h3 class="pagina-titulo">De dónde sale esta olla</h3>
    <p id="cuaderno-entradilla" class="cuaderno-entradilla">${HISTORIA.entradilla}</p>
    <p class="capitulo-cerrojo">Pasa la página →</p>`);

  HISTORIA.capitulos.forEach(cap => {
    const abierto = capituloAbierto(cap.id);
    const cabeza = `<div class="capitulo-head">
        <span class="plate">${icono(cap.icono)}</span>
        <h3 class="capitulo-titulo">${cap.titulo}</h3>
      </div>`;
    if (!abierto) {
      pagina('pagina capitulo cerrado', cabeza + '<div class="capitulo-cuerpo"><p class="capitulo-cerrojo">Todavía no. Prepara ingredientes y esta página se abre sola.</p></div>');
      return;
    }
    let html = cap.cuerpo.map(p => `<p>${p}</p>`).join('');
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
    pagina('pagina capitulo', cabeza + `<div class="capitulo-cuerpo">${html}</div>`);
  });

  pagina('pagina capitulo-fuentes', `
    <p class="label">de dónde salió esto</p>
    <ul id="cuaderno-fuentes-lista" class="cuaderno-fuentes-lista">${HISTORIA.fuentes
      .map(f => `<li><a href="${f.u}" target="_blank" rel="noopener">${f.t}</a></li>`).join('')}</ul>`);

  if (!cuadernoCarrusel) {
    cuadernoCarrusel = nuevoCarrusel({
      viewport: document.querySelector('#screen-cuaderno .scroll'),
      pista,
      izq: $('#cuaderno-izq'), der: $('#cuaderno-der'),
      alCambiar: pintarPuntosCuaderno,
    });
  }
  /* se abre en el primer capítulo abierto que aún no se vio: el
     cuaderno avisa que hay algo nuevo y eso nuevo debe estar a mano */
  const nuevo = HISTORIA.capitulos.findIndex(c => capituloAbierto(c.id));
  cuadernoCarrusel.irA(estado.cuadernoVisto ? 0 : Math.max(0, nuevo + 1), false);
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
let fallosAhora = 0;         /* los descuidos de esta partida */

/* ---------- los fallos ----------
   El tiempo solo no califica. Cada nivel avisa sus descuidos con
   `api.fallo(tipo, mensaje)` —un grano reventado, uno perdido, una
   tajada quemada, un bicho perdonado— y aquí se cuentan una sola vez
   para todos: bajan cucharas al terminar (ver cucharasConFallos), se
   ven en el HUD, y de tres chiles en adelante tienen TOPE: pasarlo
   arruina la parada. Es el objetivo mínimo de calidad que le faltaba
   al juego — antes bastaba con llegar, y llegar de cualquier manera
   valía lo mismo que llegar bien. En El Apuro un descuido cuesta
   segundos, que allí es la única moneda. */
const TOPE_FALLOS = [Infinity, Infinity, Infinity, 6, 4, 3];   /* índice = dificultad */
const topeFallos = () => TOPE_FALLOS[Math.min(5, api.dificultad || 1)] ?? Infinity;
function pintarFallos() {
  const el = $('#hud-fallos');
  if (!el) return;
  /* en El Apuro no hay tope: cada descuido cuesta segundos y ya */
  const tope = Apuro.activo ? Infinity : topeFallos();
  el.classList.toggle('visible', fallosAhora > 0);
  el.textContent = Number.isFinite(tope) ? `✗ ${fallosAhora} / ${tope}` : `✗ ${fallosAhora}`;
  el.classList.toggle('hud-fallos--rojo', Number.isFinite(tope) && fallosAhora >= tope - 1);
}
function registrarFallo(tipo, msg) {
  if (!Apuro.activo && !corriendo && !relojEnEspera) return;
  fallosAhora++;
  sfx('mal', 1.5); buzz([18, 12, 18]);
  Motor.destello('rgba(230,57,70,.16)');
  pintarFallos();
  const el = $('#hud-fallos');
  if (el) { el.classList.remove('brinca'); void el.offsetWidth; el.classList.add('brinca'); }
  if (Apuro.activo) {
    const coste = APURO.fallo || 2;
    Apuro.descontar(coste);
    flotarTiempo('−' + coste + 's', 'pierde');
    return;
  }
  const tope = topeFallos();
  if (fallosAhora >= tope) { arruinarNivel(ARRUINADO.descuidos(fallosAhora)); return; }
  if (Number.isFinite(tope) && fallosAhora === tope - 1) alerta(`¡Cuidado! Un descuido más y se arruina · ${fallosAhora} de ${tope}`, 'peligro');
  else if (msg) alerta(msg, 'peligro');
}

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
  /* un descuido: lo cuenta el juego, no el nivel (ver registrarFallo) */
  fallo: (tipo, msg) => registrarFallo(tipo, msg),
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
  /* un nivel puede pedir los botones a los lados (el choclo de pie:
     abajo tapaban los cuencos); entonces el pie queda libre */
  const enLados = !!(mod && mod.controlesEn === 'lados');
  cont.classList.toggle('juego-controles--lados', enLados);
  /* la pista se sube si no hay botones que esquivar */
  $('#juego-pista').style.bottom = (ctrls.length && !enLados)
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
  tiempoMs = 0; hechosAhora = 0; totalAhora = 1; fallosAhora = 0;
  reiniciarRacha();
  pintarReloj();
  alerta(null);
  mostrar('juego');
  tarjetaDeParada(n);

  try {
    const m = await n.modulo();
    modActual = m.default || m;
  } catch (e) {
    console.error(e);
    toast('No se pudo abrir ese ingrediente 😔');
    apagarCortina();
    mostrar('mesa');
    return;
  }
  /* si hay modelos .glb esperando, que terminen de llegar antes de
     armar el nivel: si no, la primera partida saldría con los de
     código y la segunda con los de Blender */
  await Motor.modelosListos();
  const nivelConfig = obtenerConfigNivel(id);
  /* la dificultad de la parada viaja en la api: los bichos y las
     moscas la leen para saber cuánto perdonar */
  api.dificultad = n.dificultad || 1;
  pintarFallos();
  const capturadas = [];
  capturaPista = (msg, ms) => capturadas.push({ msg, ms });
  /* SI CONSTRUIR REVIENTA, SE VUELVE A LA MESA CON UN AVISO. Antes la
     excepción se escapaba de aquí y dejaba la cortina bajada para
     siempre —la parada "no abría" y no había cómo salir sin recargar. */
  try {
    Motor.cargar(modActual, api, nivelConfig);
  } catch (e) {
    console.error(e);
    capturaPista = null;
    toast(`No se pudo armar el mesón de ${n.nombre.toLowerCase()} 😔 (${(e && e.message) || 'error'})`, 5000);
    try { Motor.descargar(); } catch (e2) {}
    nivelActual = null; modActual = null;
    apagarCortina();
    mostrar('mesa');
    return;
  }
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
  /* el mesón ya está armado detrás: la cortina puede irse, y las
     pistas arrancan cuando empieza a irse — si para entonces el
     jugador ya se salió (o entró a otra parada), no hay nada que
     decir */
  cerrarCortina().then(() => { if (nivelActual === n && modActual) pistasEnFila(fila); });
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
  /* SIN FICHA O SIN MÓDULO NO SE ESPERA: se avisa y el modo pide otra
     ración. Antes esto hacía `return` a secas y la partida se quedaba
     con el mesón anterior en pantalla, muda, para siempre. */
  if (!ficha) {
    console.error('El Apuro pidió un ingrediente que no existe:', base);
    toast(`No encontré «${base}» en esta versión: sigo con otro 😔`, 3200);
    Apuro.saltar();
    return;
  }
  nivelActual = ficha;
  const ic = $('#hud-icono'); if (ic) ic.innerHTML = icono(ficha.icono);
  apuroHUD(ficha.nombre);
  try {
    const m = await ficha.modulo();
    modActual = m.default || m;
  } catch (e) {
    console.error(e);
    toast(`No se pudo abrir ${ficha.nombre.toLowerCase()}: sigo con otro 😔`, 3200);
    Apuro.saltar();
    return;
  }
  await Motor.modelosListos();
  /* LA PARTIDA PUDO ACABARSE MIENTRAS SE MONTABA: montar es
     asíncrono, y si el reloj llegó a cero en ese hueco el resumen ya
     está en pantalla — construir el nivel ahora lo pondría a vivir
     detrás del modal, encolando pistas para nadie */
  if (!Apuro.activo) return;
  hechosAhora = 0; totalAhora = 1; fallosAhora = 0;
  pintarFallos();
  /* justo antes de construir: a partir de aquí el progreso que llegue
     es de ESTE ingrediente y no del que se estaba jugando */
  Apuro.activar();
  /* en El Apuro la dificultad de los bichos sube con la tanda: la
     primera enseña, de la cuarta en adelante ya no perdonan */
  api.dificultad = Math.min(5, Apuro.tanda || 1);
  const capturadas = [];
  capturaPista = (msg, ms) => capturadas.push({ msg, ms });
  /* si construir revienta, la ración se salta en vez de dejar medio
     mesón montado y el modo esperando un progreso que no llega */
  try {
    Motor.cargar(modActual, api, config);
  } catch (e) {
    console.error(e);
    capturaPista = null;
    toast(`Se cayó el mesón de ${ficha.nombre.toLowerCase()}: sigo con otro 😔`, 3200);
    try { Motor.descargar(); } catch (e2) {}
    Apuro.saltar();
    return;
  }
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
    if (resumen.raciones > 0) celebrar(esRecord ? 44 : 22);
  }, 700);
}

function terminarNivel() {
  pararReloj();
  sfx('bien'); buzz([20, 40, 60]);
  Motor.destello('rgba(108,191,90,.45)');
  const n = nivelActual;
  /* el tiempo pone las cucharas y los descuidos las quitan */
  const cuch = cucharasConFallos(cucharasDe(n, tiempoMs), fallosAhora, n.dificultad || 1);
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
    const heroe = $('#listo-icono'); if (heroe) heroe.innerHTML = icono(n.icono);
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
    /* la ficha de "tu mejor" enseña el mejor DESPUÉS de esta partida:
       si fue récord, es este mismo tiempo */
    const mejorN = $('#listo-mejor-n'); if (mejorN) mejorN.textContent = tiempoBonito(estado.mejores[n.id].ms);
    const fallosN = $('#listo-fallos');
    if (fallosN) {
      fallosN.textContent = fallosAhora;
      fallosN.closest('.stat').classList.toggle('stat--mal', fallosAhora > 0);
    }
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
    /* tres cucharas merecen más papelitos que una */
    celebrar(cuch >= 3 ? 44 : (cuch === 2 ? 28 : 16));
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
  apagarCortina();
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
  /* la hoja de la cocina: dónde se cocina, fuera del recetario */
  const btnCocina = $('#btn-cocina');
  if (btnCocina) btnCocina.addEventListener('click', () => { sfx('tab'); $('#modal-cocina').classList.add('open'); });
  const cocinaCerrar = $('#cocina-cerrar');
  if (cocinaCerrar) cocinaCerrar.addEventListener('click', () => { sfx('tab'); cerrarModales(); });
  $('#cuaderno-volver').addEventListener('click', () => { sfx('tab'); mostrar('mesa'); });
  const volverArriba = $('#cuaderno-volver-arriba');
  if (volverArriba) volverArriba.addEventListener('click', () => { sfx('tab'); mostrar('mesa'); });
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
  /* un toque en la escena de la olla la salta: el altar ya está
     abierto debajo */
  const escOlla = $('#olla-escena');
  if (escOlla) escOlla.addEventListener('pointerdown', (e) => { e.preventDefault(); apagarEscenaOlla(true); });
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
    /* las flechas del teclado pasan de pantalla, como el mando */
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !$$('.modal.open').length) {
      const paso = e.key === 'ArrowLeft' ? -1 : 1;
      if ($('#screen-mesa').classList.contains('active') && mesaCarrusel) { sfx('tab'); mesaCarrusel.irA(mesaCarrusel.i + paso); }
      else if ($('#screen-cuaderno').classList.contains('active') && cuadernoCarrusel) { sfx('tab'); cuadernoCarrusel.irA(cuadernoCarrusel.i + paso); }
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
  /* la olla se llena ENCIMA del altar, y la fiesta cae cuando la
     escena se apaga: el confeti sobre la olla lista, no sobre negro */
  escenaOlla().then(() => { sfx('fiesta'); celebrar(64); });
}

/* ---------- arranque ---------- */

function init() {
  estado = cargar() || nuevoEstado();

  /* LOS ERRORES SE DICEN. Un error que sólo va a la consola, en un
     teléfono, es un juego que "no deja continuar" sin explicar por
     qué. Lo que se escape sin atrapar sale como aviso, con su texto,
     para que quien lo vea pueda contarlo. */
  const contarError = (msg) => {
    try { toast('⚠️ ' + String(msg || 'error').slice(0, 140), 6000); } catch (e) {}
  };
  window.addEventListener('error', (e) => contarError(e.message || (e.error && e.error.message)));
  window.addEventListener('unhandledrejection', (e) => contarError(e.reason && (e.reason.message || e.reason)));

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
