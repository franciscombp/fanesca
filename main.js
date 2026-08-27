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
import { HISTORIA, TARJETAS, CIERRE, CACUANGO_PARAMO } from './historia.js';
import { ESCENARIOS, POR_DEFECTO } from './escenarios.js';
import Editor, { esEscritorio } from './editor.js';
import { variantesDe, nivelPor as configPor, APURO } from './niveles-config.js';
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
    return migrar(Object.assign(nuevoEstado(), s));
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
  /* quien ya jugó paradas de la temporada cocinó la olla en el orden
     viejo: sin esta huella el mapa le pintaría hecho lo que el
     candado le niega */
  if (!s.ollaVista && RUTA.some(n => n.acto === 2 && s.mejores[n.id])) s.ollaVista = true;
  for (const [viejo, nuevo] of Object.entries(RENOMBRADOS)) {
    if (!s.mejores[viejo]) continue;
    if (!s.mejores[nuevo]) s.mejores[nuevo] = s.mejores[viejo];
    delete s.mejores[viejo];
    if (s.ultimoNivel === viejo) s.ultimoNivel = nuevo;
  }
  return s;
}

const estaListo = (id) => !!estado.mejores[id];
/* Un INGREDIENTE está listo cuando alguna de sus variantes ya fue a
   la olla: la olla se abre con los doce ingredientes, no con las
   treinta variantes. Las de más arriba son para bajarse el tiempo. */
const ingredienteListo = (base) => RUTA.some(n => n.base === base && estaListo(n.id));
const listos = () => NIVELES.filter(n => ingredienteListo(n.id)).length;

/* DOS CANDADOS, Y NO SON EL MISMO.

   Dentro de la temporada de un ingrediente se va EN FILA: el choclo
   duro se abre cuando pasaste el tierno, y así hasta la última tonga.
   Eso es lo que hace que quince paradas de maíz se sientan una
   temporada y no un menú.

   Pero al CAMBIAR de ingrediente basta con haber cocinado el anterior
   una vez. Si no, las habas quedarían detrás de las quince paradas del
   maíz, y la olla —que pide los doce— detrás de la campaña entera:
   quien quisiera ver la fanesca tendría que agotar el maíz primero.
   Así, terminado el primer choclo se abren a la vez el segundo choclo
   y la primera arveja, y cada quien elige si profundiza o avanza.

   En modo dev, todo abierto: probar una mecánica no debería costar
   jugarse la campaña. */
function desbloqueado(i) {
  if (estado.devMode || i === 0) return true;
  const n = RUTA[i], previo = RUTA[i - 1];
  /* EL ACTO II SE ABRE CON LA OLLA. Los doce ingredientes son el
     juego completo y la olla es su final: pasar de largo hacia las
     variantes bravas sin haberla cocinado se saltaría el único
     momento en que este juego cierra. */
  if (n.acto === 2 && previo.acto === 1) return estado.ollaVista || false;
  return estaListo(previo.id);
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

function construirRuta() {
  const ruta = [];

  /* ACTO I — LA PRIMERA OLLA. La variante más suave de cada uno de los
     doce, ordenada por lo difícil que es APRENDER su gesto, no por lo
     que cuesta ejecutarlo. Aquí la dificultad es descubrir qué te
     pide el ingrediente: el choclo se desgrana, la arveja hay que
     deshilarla primero, el zapallo son cuatro faenas seguidas.

     Doce paradas y la olla. Eso ya es un juego entero y con final —
     media hora larga— y es lo que ve alguien que lo abre por primera
     vez. */
  const ACTO_I = [
    'maiz', 'habas', 'chochos', 'frejol', 'arveja', 'melloco',
    'escoger', 'col', 'quinua', 'mani', 'bacalao', 'zapallo',
  ];
  const usados = new Set();
  ACTO_I.forEach(base => {
    const ing = NIVELES.find(n => n.id === base);
    if (!ing) return;
    const v = variantesDe(base)[0];
    if (!v) { ruta.push({ ...ing, base, acto: 1, config: {} }); return; }
    usados.add(v.id);
    ruta.push(nodoDeVariante(ing, base, v, 1));
  });

  /* ACTO II — LA TEMPORADA. Todo lo que queda, ordenado por
     DIFICULTAD y no por ingrediente.

     Agrupado por ingrediente, el camino ponía las quince paradas de
     maíz seguidas y luego bajaba de golpe a la arveja fácil: el juego
     hacía pico en la parada 15 y ya no volvía a subir en las
     veinticinco restantes. Medido, la dificultad bajaba once veces de
     treinta y nueve. Ordenado por dificultad sube de verdad, y de
     paso el maíz deja de ser un muro de quince y se reparte por toda
     la temporada.

     El orden dentro de un ingrediente se respeta solo: sus variantes
     ya vienen de suave a brava, y ordenar por dificultad de forma
     estable no las puede adelantar. */
  const porIngrediente = new Map();
  NIVELES.forEach(ing => {
    const suyas = variantesDe(ing.id).filter(v => !usados.has(v.id))
      .map(v => nodoDeVariante(ing, ing.id, v, 2));
    if (suyas.length) porIngrediente.set(ing.id, suyas);
  });

  /* Dentro de cada banda de dificultad se reparte PROPORCIONALMENTE:
     al j-ésimo de los k que un ingrediente trae en la banda le toca
     el hueco ideal (j+½)·N/k, y la banda se ordena por esos huecos.
     La rueda simple —un turno por ingrediente— repartía bien mientras
     todos tenían paradas, pero al agotarse los demás dejaba las siete
     del maíz en cola: las últimas seis paradas del juego eran todas
     choclo. Con huecos ideales, siete entre quince caen una de cada
     dos, de la primera a la última. */
  const bandas = [...new Set([...porIngrediente.values()].flat().map(n => n.dificultad))].sort((a, b) => a - b);
  bandas.forEach(dif => {
    const enBanda = [...porIngrediente.values()]
      .map(ns => ns.filter(n => n.dificultad === dif))
      .filter(ns => ns.length);
    const N = enBanda.reduce((a, ns) => a + ns.length, 0);
    const conHueco = [];
    enBanda.forEach(ns => ns.forEach((n, j) =>
      conHueco.push({ n, hueco: (j + 0.5) * N / ns.length })));
    conHueco.sort((a, b) => a.hueco - b.hueco);
    conHueco.forEach(({ n }) => ruta.push(n));
  });

  return ruta;
}

function nodoDeVariante(ing, base, v, acto) {
  return {
    ...ing,
    id: v.id,
    base,
    acto,
    nombre: v.nombre,
    /* En el Acto I la parada PRESENTA al ingrediente, así que se llama
       como él: "Las habas". En el Acto II pasa lo contrario: cuatro
       ingredientes comparten icono, y un nodo que sólo dice
       "Apretadas" no dice de quién — el nombre completo de la
       variante ya trae al ingrediente dentro. */
    corto: acto === 1
      ? ing.nombre
      : v.nombre.replace(/^(El|La|Los|Las)\s/, '').replace(/^\w/, c => c.toUpperCase()),
    dificultad: v.dificultad,
    config: v.config,
    cucharas: cucharasDeTiempo(v.tiempoBase),
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

let toastId = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visible');
  clearTimeout(toastId);
  toastId = setTimeout(() => t.classList.remove('visible'), 1900);
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
  if (btn) btn.textContent = hechos ? 'Seguir cocinando' : 'A la mesa de prep';
  if (avance) {
    avance.textContent = hechos ? `${hechos} de ${NIVELES.length} ingredientes listos` : '';
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

function renderMesa() {
  renderEscenarios();
  /* la primera visita va al grano: el selector de cocinas y El Apuro
     son de quien ya cocina, y empujaban el único nodo tocable fuera
     de la pantalla justo para quien más lo necesitaba ver */
  const algunHecho = listos() > 0;
  const esc = document.querySelector('.escenarios');
  if (esc) esc.classList.toggle('hidden', !algunHecho && !estado.devMode);
  const btnA = $('#btn-apuro');
  if (btnA) {
    btnA.classList.toggle('hidden', !algunHecho && !estado.devMode);
    btnA.classList.toggle('btn-apuro--cerrado', listos() < 4 && !estado.devMode);
    const pie = $('#btn-apuro-pie');
    if (pie) pie.textContent = listos() < 4 && !estado.devMode
      ? `Se abre con 4 ingredientes — llevas ${listos()}`
      : (estado.apuro ? `Tu récord: ${estado.apuro.raciones} raciones` : 'Contra reloj, todo junto');
  }
  const hechos = listos();
  const todos = hechos >= NIVELES.length;
  const dias = (estado.dias && estado.dias.seguidos > 1) ? ` · 🔥${estado.dias.seguidos} días` : '';
  /* EL MARCADOR CAMBIA DE VARA CON EL ACTO. Contar ingredientes tenía
     sentido mientras la meta era la olla; con la olla cocinada el
     jugador está en la temporada, y un "12 / 12" clavado durante las
     veintiocho paradas restantes decía que ya no había nada que
     hacer en el 70% del mapa. */
  const paradasHechas = RUTA.filter(n => estaListo(n.id)).length;
  $('#mesa-progreso').textContent = estado.ollaVista
    ? `${paradasHechas} / ${RUTA.length} paradas de la temporada${dias}`
    : `${hechos} / ${NIVELES.length} ingredientes listos${dias}`;
  $('#olla-frase').textContent = FRASES_OLLA[Math.min(hechos, FRASES_OLLA.length - 1)];

  /* ============================================================
     EL CAMINO — de la cocina a la olla.

     La mesa dejó de ser una lista de tarjetas y es un camino de
     nodos que serpentea hacia abajo, como el mapa de un juego de
     puzzles: el progreso se ve de un solo vistazo, el siguiente
     paso late para que no haya que buscarlo, y el destino —la
     olla— está literalmente al final del camino. Una lista dice
     "esto es un menú"; un camino dice "esto es un viaje", y la
     fanesca es un viaje.
     ============================================================ */

  const lista = $('#mesa-lista');
  lista.innerHTML = '';
  lista.className = 'camino';

  const PASO = 132;               /* alto entre nodos */
  const XS = [50, 22, 50, 78];    /* la serpiente, en % del ancho */
  /* el primer nodo baja para dejarle su hueco al rótulo del Acto I
     DENTRO del contenedor, como ya lo tiene el del Acto II: con la
     base vieja el rótulo caía en top negativo y se imprimía encima de
     lo que hubiera arriba de la mesa — la frase de la olla en la
     primera visita, el pie de El Apuro después. */
  const BASE = 176;
  const centros = [];

  const nodoDe = (n, i, estadoNodo) => {
    const b = document.createElement('button');
    b.type = 'button';
    const x = XS[i % XS.length];
    const y = i * PASO + BASE;
    centros.push({ x, y });
    b.className = 'nodo ' + estadoNodo;
    b.style.left = x + '%';
    b.style.top = y + 'px';
    b.style.animationDelay = Math.min(i * 0.045, 0.5) + 's';
    return b;
  };

  /* La olla ocupa un puesto en la serpiente, así que las paradas del
     Acto II van corridas una posición. `puesto` es dónde se DIBUJA;
     `i` sigue siendo el índice en RUTA, que es lo que manda para el
     candado y para el nombre de la anterior. */
  const ACTO_I_N = RUTA.filter(n => n.acto === 1).length;
  /* +2 y no +1: la olla ocupa un puesto y el siguiente se deja VACÍO
     para el rótulo del Acto II. Pegados, el nombre de la olla —que
     va a dos líneas cuando dice cuántos faltan— se metía debajo del
     rótulo y las dos cosas se leían mal. */
  const puestoDe = (i) => i < ACTO_I_N ? i : i + 2;

  /* Los rótulos de acto. Sin ellos, cuarenta nodos son una lista
     larga; con ellos son dos tramos con nombre, y el jugador sabe
     que los doce primeros se acaban en algún sitio. */
  const rotulo = (puesto, sobre, titulo, pie) => {
    const el = document.createElement('p');
    el.className = 'camino-acto';
    el.style.top = (puesto * PASO + BASE - sobre) + 'px';
    el.innerHTML = `<strong>${titulo}</strong><span>${pie}</span>`;
    lista.appendChild(el);
  };

  RUTA.forEach((n, i) => {
    const abierto = desbloqueado(i);
    const mejor = estado.mejores[n.id];
    const esSiguiente = abierto && !mejor;
    const b = nodoDe(n, puestoDe(i), mejor ? 'nodo--hecho' : (esSiguiente ? 'nodo--siguiente' : 'nodo--bloqueado'));
    /* las variantes llevan sus chiles de dificultad: de un vistazo se
       ve que el camino sube, que es lo que hace que se lea como
       campaña y no como doce paradas sueltas */
    const dif = n.dificultad ? `<span class="nodo-dif" aria-hidden="true">${'🌶️'.repeat(n.dificultad)}</span>` : '';
    b.innerHTML = `
      <span class="nodo-plato">${icono(n.icono)}</span>
      ${!abierto && !mejor ? '<span class="nodo-candado" aria-hidden="true">🔒</span>' : ''}
      ${mejor ? `<span class="nodo-cucharas">${cucharasHTML(mejor.cucharas)}</span>` : ''}
      <span class="nodo-nombre">${n.corto || n.nombre.replace(/^(El|La|Los|Las)\s/, '')}</span>
      ${dif}`;
    b.setAttribute('aria-label', n.nombre + (n.dificultad ? ` (dificultad ${n.dificultad} de 5)` : '') + (abierto ? '' : ' (bloqueado)'));
    b.addEventListener('click', () => {
      sfx('tab');
      if (!abierto) {
        /* el Acto II no está cerrado por la parada anterior sino por la
           olla, y decir "primero la última tonga" sería mandar al
           jugador a un sitio que tampoco puede abrir */
        toast(n.acto === 2 && RUTA[i - 1].acto === 1
          ? 'Primero cocina la olla 🍲'
          : 'Primero ' + RUTA[i - 1].nombre.toLowerCase() + ' 👆');
        return;
      }
      /* DIRECTO AL MESÓN, siempre. Había en medio una ficha con el
         gesto, la nota y el bicho, y quitarla es lo que más fluidez
         le devolvió al juego: eran dos toques y una pantalla de
         lectura entre querer jugar y estar jugando.

         No se pierde nada, porque el gesto YA se explica dentro, en
         la pista sobre el mesón —donde además se puede aplicar
         mientras se lee, que es cuando una instrucción sirve—. La
         nota de cultura se lee en la tarjeta del final y en el
         cuaderno, con calma y sin el reloj encima. */
      jugar(n.id);
    });
    lista.appendChild(b);
  });

  /* LA OLLA VA EN MEDIO, no al final. Se abre con los doce
     ingredientes —eso no cambió nunca— pero se dibujaba en la parada
     41, después de veintiocho variantes que no hacen falta para
     cocinarla. El jugador la veía a una distancia que no era la suya
     y el final del juego quedaba escondido detrás del contenido
     opcional. */
  const olla = nodoDe(OLLA, ACTO_I_N,
    estado.ollaVista ? 'nodo--olla nodo--hecho' : (todos ? 'nodo--olla' : 'nodo--olla nodo--bloqueado'));
  olla.innerHTML = `
    <span class="nodo-plato nodo-plato--olla">${icono(OLLA.icono)}</span>
    ${todos ? '' : '<span class="nodo-candado" aria-hidden="true">🔒</span>'}
    <span class="nodo-nombre">${estado.ollaVista ? 'La fanesca, servida' : (todos ? '¡A cocinar!' : `La olla · faltan ${NIVELES.length - hechos}`)}</span>`;
  olla.setAttribute('aria-label', todos ? 'Cocinar la olla' : `La olla, faltan ${NIVELES.length - hechos} ingredientes`);
  /* 146 y no menos: el nodo se dibuja CENTRADO en su (x,y) —su borde
     de arriba queda 72px por encima— y con menos margen el rótulo le
     pisaba el plato al primer choclo */
  rotulo(0, 146, 'Acto I · La primera olla', 'los doce ingredientes, uno por uno');
  if (RUTA.some(n => n.acto === 2)) {
    rotulo(ACTO_I_N + 1, 30, 'Acto II · La temporada', 'los mismos doce, cuando se ponen bravos');
  }

  olla.addEventListener('click', () => {
    sfx('tab');
    if (!todos) { toast(`La olla se abre con los doce — faltan ${NIVELES.length - hechos}`); return; }
    mostrarFinal();
  });
  lista.appendChild(olla);

  /* el sendero dibujado: un tramo por par de nodos, y los tramos ya
     recorridos van en dorado — el progreso se ve en el propio camino */
  /* el MÁS PROFUNDO, no el último empujado. La olla se dibuja en medio
     del camino pero se añade al final, así que tomar el último dejaba
     el contenedor a la altura de la olla y las veintiocho paradas del
     Acto II se salían por abajo, encima de la despensa. */
  const alto = Math.max(...centros.map(c => c.y)) + 140;
  lista.style.height = alto + 'px';
  /* EN ORDEN VISUAL, NO DE INSERCIÓN. Los centros se apilan según se
     añaden los nodos, y la olla se añade la última aunque se dibuje
     en medio: unir centros consecutivos hacía que el último tramo
     cruzara el mapa entero — del fondo de la temporada de vuelta a la
     olla. Y el dorado iba por "cuántos ingredientes van", que topa en
     doce: las veintiocho paradas de la temporada nunca doraban su
     tramo. Ahora cada tramo une vecinos DE PANTALLA y se dora cuando
     su parada de arriba está hecha. */
  const visual = RUTA.map((n, i) => ({ ...centros[i], hecho: !!estaListo(n.id) }));
  visual.push({ ...centros[RUTA.length], hecho: !!estado.ollaVista });
  visual.sort((a, b) => a.y - b.y);
  const tramos = visual.slice(1).map((c, i) => {
    const a = visual[i];
    const d = `M ${a.x} ${a.y} C ${a.x} ${a.y + 66}, ${c.x} ${c.y - 66}, ${c.x} ${c.y}`;
    /* dos trazos por tramo: la base ancha es la tierra del sendero,
       las rayas de encima son las baldosas — sobre el mantel a
       cuadros, un solo trazo punteado se perdía */
    return `<path class="tramo-base" d="${d}"/><path class="tramo ${a.hecho ? 'tramo--hecho' : ''}" d="${d}"/>`;
  }).join('');
  lista.insertAdjacentHTML('afterbegin',
    `<svg class="camino-svg" viewBox="0 0 100 ${alto}" preserveAspectRatio="none" aria-hidden="true">${tramos}</svg>`);

  /* la despensa: lo que aún no tiene minijuego, dicho sin disimulo */
  const desp = document.createElement('div');
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
      toast(n.nombre + ': ' + n.gesto.replace(/<[^>]+>/g, ''));
    });
    fila.appendChild(chip);
  });
  desp.appendChild(fila);
  lista.insertAdjacentElement('afterend', desp);

  /* el mapa abre MOSTRANDO el siguiente paso: nadie debería tener
     que hacer scroll para encontrar dónde seguir.
     O, si acabas de jugar un nivel, muestra ese nivel en el que estabas */
  const scrollMesa = document.querySelector('#screen-mesa .scroll');
  let nodoTarget = null;

  /* primero busca el último nivel que jugaste, si existe */
  if (estado.ultimoNivel) {
    const idx = RUTA.findIndex(n => n.id === estado.ultimoNivel);
    if (idx >= 0) nodoTarget = lista.querySelectorAll('.nodo')[idx];
  }

  /* si no hay último nivel, usa el siguiente paso */
  if (!nodoTarget) {
    nodoTarget = lista.querySelector('.nodo--siguiente') || lista.querySelector('.nodo--olla');
  }

  if (scrollMesa && nodoTarget) {
    requestAnimationFrame(() => {
      scrollMesa.scrollTop = Math.max(0, nodoTarget.offsetTop - scrollMesa.clientHeight * 0.45);
    });
  }
  /* si ya había una despensa de un render anterior, fuera */
  let sig = desp.nextElementSibling;
  while (sig && sig.classList.contains('despensa')) { const s = sig.nextElementSibling; sig.remove(); sig = s; }
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
  if (Apuro.activo) {
    /* contra reloj se lee el entero y nada más: las décimas a esta
       velocidad son ruido que parpadea, no información */
    el.textContent = Math.ceil(Apuro.reloj) + 's';
    el.classList.toggle('hud-tiempo--rojo', Apuro.enRojo);
    return;
  }
  el.classList.remove('hud-tiempo--rojo');
  el.textContent = tiempoBonito(tiempoMs);
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
const duracionDe = (msg) => {
  const palabras = String(msg).replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(2600, Math.min(12000, 1400 + palabras * 340));
};
function cortarFila() { pistaFila.forEach(clearTimeout); pistaFila = []; }
function pistaAhora(msg, dur) {
  const p = $('#juego-pista');
  p.innerHTML = msg;
  p.classList.add('visible');
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
  /* leer una cita no puede costar cucharas: el reloj se detiene
     mientras está en pantalla y sigue cuando se va */
  /* en El Apuro el reloj ES la partida: congelarlo por una cita lo
     convertía en 9,5 s de tiempo regalado (o robado al ritmo) */
  if (corriendo && !Apuro.activo) { pararReloj(); vozPauso = true; }
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
  $('#hud-tarea').textContent = `${n.tarea} · ${n.nombre.toLowerCase()}`;
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
  sfx('fiesta'); buzz([20, 40, 20, 60]);
  const mejor = estado.apuro || { raciones: 0 };
  const esRecord = resumen.raciones > mejor.raciones;
  if (esRecord) estado.apuro = { raciones: resumen.raciones, cadena: resumen.mejorCadena, fecha: new Date().toISOString().slice(0, 10) };
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
      : `Tu récord sigue siendo ${mejor.raciones}`;

    /* LOS LOGROS, y sólo los NUEVOS. Repetir "Primera ración" en cada
       partida los convertiría en decorado: un logro vale porque marca
       un día concreto en que pasó algo por primera vez. */
    const ya = estado.logrosApuro || (estado.logrosApuro = []);
    const nuevos = (resumen.logros || []).filter(l => !ya.includes(l.id));
    const cajaL = $('#apuro-logros');
    if (nuevos.length) {
      nuevos.forEach(l => ya.push(l.id));
      guardar();
      cajaL.classList.remove('hidden');
      cajaL.innerHTML = nuevos.map(l =>
        `<li class="logro"><strong>${l.titulo}</strong><span>${l.texto}</span></li>`).join('');
      /* uno por uno y con su campanita: seis logros apareciendo de
         golpe se leen como una lista; de uno en uno se sienten */
      nuevos.forEach((_, i) => setTimeout(() => sfx('bien', 1 + i * 0.12), 900 + i * 320));
    } else { cajaL.classList.add('hidden'); cajaL.innerHTML = ''; }

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
  const hoy = new Date().toISOString().slice(0, 10);
  const d = estado.dias || (estado.dias = { ultima: null, seguidos: 0 });
  if (d.ultima !== hoy) {
    const ayer = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    d.seguidos = d.ultima === ayer ? d.seguidos + 1 : 1;
    d.ultima = hoy;
    if (d.seguidos >= 2) setTimeout(() => toast(`🔥 ${d.seguidos} días cocinando seguidos`), 2600);
  }
  guardar();

  setTimeout(() => {
    Motor.setActive(false);
    /* en el Acto I la parada se llama como su ingrediente: "El choclo
       a la olla", no "El choclo · primeros granos a la olla" */
    $('#listo-nombre').textContent = (n.acto === 1 ? (n.corto || n.nombre) : n.nombre) + ' a la olla';
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

    const quedanIngredientes = NIVELES.some(x => !ingredienteListo(x.id));
    const quedanParadas = RUTA.some((x, i) => !estaListo(x.id) && desbloqueado(i));
    $('#listo-seguir').textContent = quedanIngredientes
      ? 'Siguiente ingrediente'
      : (!estado.ollaVista ? 'Servir la fanesca'
        : (quedanParadas ? 'Siguiente parada' : '¡La cosecha, completa!'));
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

  /* El Apuro: cerrado hasta conocer cuatro gestos. Soltar a alguien
     que no ha jugado nada en un contrarreloj de ingredientes al azar
     es soltarlo a perder sin saber por qué. */
  $('#btn-apuro').addEventListener('click', () => {
    sfx('tab');
    if (listos() < 4 && !estado.devMode) {
      toast(`El Apuro se abre con 4 ingredientes — llevas ${listos()}`);
      return;
    }
    arrancarApuro();
  });
  $('#apuro-otra').addEventListener('click', () => { sfx('tab'); cerrarModales(); arrancarApuro(); });
  $('#apuro-salir').addEventListener('click', () => { sfx('tab'); cerrarModales(); mostrar('mesa'); });


  $('#voz').addEventListener('click', () => voz(null));
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
    cerrarModales();
    Motor.descargar();
    nivelActual = null; modActual = null;
    /* CUANDO EL BOTÓN DICE "SERVIR LA FANESCA", SIRVE LA FANESCA.
       Antes buscaba la siguiente parada sin hacer en TODA la ruta, y
       con los doce listos esa era la primera variante del Acto II —
       todavía cerrada—: el único final del juego, después de media
       hora, desembocaba en otro choclo. */
    if (!NIVELES.some(x => !ingredienteListo(x.id)) && !estado.ollaVista) {
      mostrar('mesa');
      setTimeout(mostrarFinal, 350);
      return;
    }
    /* DIRECTO al siguiente, sin escala en la mesa — pero sólo a una
       parada que de verdad esté abierta: saltar a una cerrada era
       colarse por detrás del candado. */
    const sig = RUTA.find((x, i) => !estaListo(x.id) && desbloqueado(i));
    if (!sig) {
      mostrar('mesa');
      /* no queda parada abierta sin hacer: si es porque están TODAS,
         la temporada tiene su propio cierre — hora y media de juego
         no puede terminar en volver a la mesa sin que nadie diga nada */
      if (!RUTA.some(x => !estaListo(x.id))) setTimeout(() => mostrarFinal(true), 350);
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

function mostrarFinal(temporada = false) {
  /* cocinar la olla deja huella: es lo que abre el Acto II, y sin
     este registro el candado de la temporada decía "cocina la olla"
     mientras en realidad miraba otra cosa */
  if (!estado.ollaVista) { estado.ollaVista = true; guardar(); }
  /* DOS FINALES, EL MISMO ALTAR. El de la olla celebra los doce; el
     de la temporada, las cuarenta — hora y media de juego que antes
     terminaba devolviéndote a la mesa en silencio, sin un solo
     acuse de recibo. */
  $('#final-eyebrow').textContent = temporada ? 'la temporada entera' : 'jueves santo';
  $('#final-titulo').textContent = temporada ? '¡Se acabó la cosecha!' : '¡La fanesca está servida!';
  $('#final-cuerpo').textContent = temporada
    ? 'Las cuarenta paradas: el choclo tierno y el maíz de la tonga, la vaina suave y la apretada. Ya no queda grano en esta cocina que no conozca tu mano.'
    : 'Todo lo que va adentro pasó por tus manos: grano por grano, vaina por vaina. Ahora sí, que hierva despacio.';
  /* La cuenta del final es sobre el ACTO I: la olla es el cierre de
     los doce, y medirla contra las cuarenta paradas —veintiocho de
     ellas opcionales y aún cerradas— convertía la celebración en un
     "24 de 120" que suena a suspenso. La temporada lleva su propio
     marcador en cada parada. */
  const cuenta = temporada ? RUTA : RUTA.filter(n => n.acto === 1);
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
  get ruta() { return RUTA.map(n => ({ id: n.id, acto: n.acto, dif: n.dificultad, base: n.base })); },
  api,
  Apuro,
  sondear: (x, y) => Motor.sondear(x, y),
  puntos: () => ({ batea: Motor.proyectar(BATEA), composta: Motor.proyectar(COMPOSTA) }),
};

document.addEventListener('DOMContentLoaded', init);
