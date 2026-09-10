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
import { HISTORIA, TARJETAS, CIERRE, CACUANGO_PARAMO } from './historia.js';
import { ESCENARIOS, POR_DEFECTO } from './escenarios.js';
import Editor, { esEscritorio } from './editor.js';
import { variantesDe, nivelesDeBolsa, nivelPor as configPor, APURO, OLLA_MODO, pasosOlla, actosOlla } from './niveles-config.js';
import { ORDEN_BOLSAS, PUESTO, PLATOS, platoDe, proximoPlato } from './bolsas.js';
import Apuro from './modo-apuro.js';
import Olla from './modo-olla.js';

/* LOS DOS MODOS SE MIRAN POR AQUÍ. El juego tiene tres formas de
   jugarse —la campaña, El Apuro y La Olla— y las dos últimas son
   módulos con el mismo contrato: se sientan encima de `api.progreso`,
   `api.completar` y `api.arruinar` y no saben nada del DOM.

   Casi todo lo que el juego necesita preguntarles es "¿hay un modo
   corriendo, y cuál?". Con un solo sitio donde se contesta, añadir el
   tercero no obligó a repasar quince `if (Apuro.activo)` repartidos
   por el archivo — que era exactamente lo que estaba pasando. */
const modoVivo = () => (Apuro.activo ? Apuro : (Olla.activo ? Olla : null));
const enModo = () => !!modoVivo();

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
    /* el altar de la despensa completa se abre una sola vez */
    despensaVista: false,
    /* LA OLLA — el modo de partida completa. `olla` es la mejor
       partida TERMINADA (ms, cucharas y las marcas por acto), que es
       contra lo que se corre en las siguientes. */
    /* `ollas` es el récord POR PLATO: la olla cocina lo que hay y una
       sopa de granos no compite con una fanesca. `olla` era el récord
       único de cuando la olla era el examen final. */
    ollas: {}, logrosOlla: [], ollaModoJugado: false,
    /* qué bichos ya se presentaron: su regla se cuenta una vez por
       bicho, no una vez por parada */
    bichosVistos: [],
    /* los ingredientes que se saben hacer sin tener jugado su primer
       nivel: sólo los pone la migración desde el mapa de la semana */
    sabidos: [],
    /* la generación del guardado: 'bolsas' desde v4.0. Un guardado
       con 'semana' viene del mapa de días y uno sin marca, del mapa
       de actos; cada uno pasa por sus inferencias una sola vez. */
    mapa: 'bolsas',
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
  if (!Array.isArray(s.logrosOlla)) s.logrosOlla = [];
  if (!s.ollas || typeof s.ollas !== 'object' || Array.isArray(s.ollas)) s.ollas = {};
  /* el récord único de antes era siempre la fanesca entera con lo de
     encima: ése es el peldaño 'servida' de la escalera */
  if (s.olla && typeof s.olla === 'object' && typeof s.olla.ms === 'number' && !s.ollas.servida) {
    s.ollas.servida = { ...s.olla, plato: 'servida' };
  }
  delete s.olla;
  if (!Array.isArray(s.bichosVistos)) s.bichosVistos = [];
  /* un récord de La Olla sin tiempo no es un récord: sin esto, un
     guardado tocado a mano dejaba el resumen comparando contra NaN */
  for (const k of Object.keys(s.ollas || {})) {
    const r = s.ollas[k];
    if (!r || typeof r !== 'object' || typeof r.ms !== 'number') delete s.ollas[k];
  }
  if (!s.dias || typeof s.dias !== 'object') s.dias = { ultima: null, seguidos: 0 };
  /* el ingrediente entero pasó a ser una temporada: su récord es el
     de la primera parada */
  NIVELES.forEach(ing => {
    const base = ing.id;
    const viejo = s.mejores[base];
    if (!viejo) return;
    const primera = variantesDe(base)[0];
    if (primera && !s.mejores[primera.id]) s.mejores[primera.id] = viejo;
    delete s.mejores[base];
    if (s.ultimoNivel === base && primera) s.ultimoNivel = primera.id;
  });
  /* `ollaVista` marcaba haber visto el altar del final de la semana.
     Ese altar ya no existe: el final es tener la despensa completa, y
     eso se deduce del progreso, no de una marca. */
  delete s.ollaVista;
  for (const [viejo, nuevo] of Object.entries(RENOMBRADOS)) {
    if (!s.mejores[viejo]) continue;
    if (!s.mejores[nuevo]) s.mejores[nuevo] = s.mejores[viejo];
    delete s.mejores[viejo];
    if (s.ultimoNivel === viejo) s.ultimoNivel = nuevo;
  }

  /* ============================================================
     DE LA SEMANA A LAS BOLSAS (guardados con mapa 'semana').

     El mapa viejo era una fila de cuarenta y seis paradas repartidas
     por días, y su candado abría la parada SIGUIENTE de la fila. El
     nuevo agrupa por ingrediente. Traducir de uno a otro tiene una
     sola trampa, y es fea si se pasa por alto:

     en la semana se podía tener hecha una variante brava de un
     ingrediente SIN tener su primera —el reparto entrelazaba, y una
     migración anterior ya movía récords de sitio— y en las bolsas la
     primera de cada bolsa es LO BÁSICO: lo que cuenta ingredientes,
     abre la bolsa siguiente y decide qué plato sale. Sin arreglarlo,
     a quien ya había desgranado la tonga se le decía que no sabe
     hacer el choclo y se le cerraba media despensa.

     La salida NO es escribirle un récord al básico que no jugó. Eso
     sería inventarle una partida —y en el choclo, cuya primera es
     ahora escoger en la feria, le tacharía un mesón que no ha visto
     nunca. Lo que se guarda es una lista aparte: `sabidos`, los
     ingredientes que ya sabe hacer aunque su primer nivel siga sin
     jugar. Cuenta para abrir bolsas y para el plato; el nivel sigue
     ahí, sin cucharas y con su ✎, para cuando quiera.

     Se hace una sola vez y se marca con `mapa: 'bolsas'`. */
  if (!Array.isArray(s.sabidos)) s.sabidos = [];
  if (s.mapa !== 'bolsas') {
    for (const bolsa of ORDEN_BOLSAS) {
      const ns = nivelesDeBolsa(bolsa);
      if (!ns.length || s.sabidos.includes(bolsa)) continue;
      if (ns.some(n => !!s.mejores[n.id])) s.sabidos.push(bolsa);
    }
    s.mapa = 'bolsas';
  }
  return s;
}

const estaListo = (id) => !!estado.mejores[id];

/* ============================================================
   LO BÁSICO DE UNA BOLSA: su primer nivel.

   Es la unidad de todo lo que el juego cuenta hacia afuera —cuántos
   ingredientes sabes, qué plato te sale, qué bolsa se abre— y es UNO
   por ingrediente a propósito: aprendiste el gesto y ya. Los niveles
   de más arriba de una bolsa son para quien le tomó gusto a ese
   ingrediente, no un peaje para llegar al siguiente.

   `sabeHacer` mira EL PRIMERO, no «alguno». Con «alguno» un guardado
   viejo con el choclo picado hecho y la introducción sin tocar
   contaba el choclo como sabido, y el jugador nunca veía el nivel
   que enseña el gesto. */
const nivelesBolsa = (bolsa) => RUTA.filter(n => n.bolsa === bolsa);
const basicoDe = (bolsa) => { const ns = nivelesBolsa(bolsa); return ns.length ? ns[0].id : null; };
/* `sabidos` son los que vienen del mapa de la semana con progreso
   real pero sin su primer nivel jugado — ver migrar(). Cuentan igual:
   quien desgranó la tonga sabe desgranar. */
const sabeHacer = (bolsa) => {
  /* en modo dev se sabe todo: probar la olla entera no debería costar
     jugarse los dieciocho básicos primero, y sin esto `arrancarOlla`
     se plantaba con «primero aprende a preparar algo» */
  if (estado.devMode) return true;
  const b = basicoDe(bolsa);
  if (b && estaListo(b)) return true;
  return Array.isArray(estado.sabidos) && estado.sabidos.includes(bolsa);
};
/* el conjunto de ingredientes que ya se saben preparar: es lo que
   mira la escalera de platos para decir qué se puede cocinar */
const loQueSabe = () => new Set(ORDEN_BOLSAS.filter(sabeHacer));
const listos = () => ORDEN_BOLSAS.filter(sabeHacer).length;

/* ============================================================
   DOS CANDADOS, Y NINGUNO ENCIERRA.

   DENTRO DE UNA BOLSA la fila manda: el nivel siguiente se abre al
   terminar el anterior, porque los peldaños de un ingrediente están
   escritos para enseñarse en ese orden — el gusanito después del
   desgrane limpio, el duro después del tierno.

   ENTRE BOLSAS se abre LA SIGUIENTE al saber la de antes. Una bolsa
   abierta no se cierra nunca, así que a las tres bolsas el jugador
   tiene tres frentes y elige: seguir bajando en el choclo o abrir la
   arveja. Eso es lo que pedía el cambio — «si quiero puedo elegir un
   minijuego en específico»— sin dejar la primera pantalla como un
   muro de dieciocho cosas.

   En modo dev, todo abierto: probar una mecánica no debería costar
   jugarse el juego entero. */
function bolsaAbierta(bolsa) {
  if (estado.devMode) return true;
  const i = PUESTO[bolsa];
  if (i === undefined) return false;
  if (i === 0) return true;
  /* lo empezado sigue abierto aunque la de antes no esté: un
     guardado del mapa de la semana trae niveles sueltos por todas
     partes y ninguno se le puede quitar */
  if (nivelesBolsa(bolsa).some(n => estaListo(n.id))) return true;
  return sabeHacer(ORDEN_BOLSAS[i - 1]);
}

function desbloqueado(i) {
  if (estado.devMode) return true;
  const n = RUTA[i];
  if (!n) return false;
  if (estaListo(n.id)) return true;
  if (!bolsaAbierta(n.bolsa)) return false;
  const antes = RUTA[i - 1];
  /* el primero de su bolsa no mira atrás: la bolsa ya es el candado */
  if (!antes || antes.bolsa !== n.bolsa) return true;
  return estaListo(antes.id);
}

/* EL SIGUIENTE ES EL DE LA MISMA BOLSA. Terminar un nivel encadena
   con el peldaño de al lado, no con «la parada 28 del juego»: quien
   está en el choclo se quedó en el choclo a propósito, y sacarlo de
   ahí para llevarlo al melloco es deshacer justo lo que este menú
   viene a permitir. Cuando la bolsa se acaba, a la despensa. */
function siguienteEnBolsa(bolsa) {
  return nivelesBolsa(bolsa).find(n => !estaListo(n.id) && desbloqueado(RUTA.indexOf(n))) || null;
}
/* LA BOLSA QUE ESTE NIVEL ACABA DE ABRIR, si abrió alguna. Sólo el
   básico de una bolsa abre la siguiente, y sólo es noticia si esa
   siguiente sigue sin tocar — repetir el básico para bajarse el
   tiempo no vuelve a estrenar nada. */
function bolsaQueAbre(n) {
  if (!n || n.id !== basicoDe(n.bolsa)) return null;
  const sig = ORDEN_BOLSAS[PUESTO[n.bolsa] + 1];
  if (!sig) return null;
  return nivelesBolsa(sig).some(x => estaListo(x.id)) ? null : sig;
}

/* ============================================================
   LA RUTA — todos los niveles del juego, agrupados por bolsa.

   `niveles.js` tiene los INGREDIENTES (su módulo, su icono, su
   gesto, su bicho). `niveles-config.js` tiene los NIVELES de cada
   uno. La mesa se dibuja de la mezcla de los dos, y esa mezcla es
   esta lista.

   ANTES ESTO ERA LA SEMANA: cuarenta y seis paradas repartidas de
   lunes a viernes, una sola fila. La fila obligaba a tragarse el
   choclo para llegar a las habas, y quien encontraba un gesto que le
   gustaba no podía quedarse en él. Ahora el orden es el de las
   BOLSAS (bolsas.js) y dentro de cada una, el de sus niveles: la
   ruta sigue siendo una lista plana —el candado y el cursor la
   recorren igual— pero agrupada por ingrediente en vez de por día.

   `num` es el número DENTRO de la bolsa, que es el que el jugador
   ve: «3 de 18 del choclo» dice algo; «parada 27 de 49» no.
   ============================================================ */

/* de `tiempoBase` (segundos para 3 cucharas) salen los tres cortes,
   con la misma proporción que traían los ingredientes a mano */
const cucharasDeTiempo = (base) => [base, Math.round(base * 1.5), Math.round(base * 2.2)];

function construirRuta() {
  const ruta = [];
  ORDEN_BOLSAS.forEach((bolsa, b) => {
    nivelesDeBolsa(bolsa).forEach((v, i) => {
      /* la ficha del ingrediente sale de `porId`, que mira los dos
         catálogos: los de la olla (la feria) no están en NIVELES */
      const ing = porId(v.base);
      if (!ing) return;
      ruta.push(nodoDeVariante(ing, v.base, v, {
        bolsa, puesto: b, num: i + 1, intro: i === 0,
      }));
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
    /* El PRIMER nivel de una bolsa presenta el ingrediente, así que
       se llama como él: "Las habas". Los siguientes al revés: cuatro
       ingredientes comparten icono, y un nodo que solo dice
       "Apretadas" no dice de quién — pero a esas alturas el nombre
       corto del nivel ya basta, el ingrediente se conoce. */
    corto: extra.intro
      ? ing.nombre
      : (v.corto || v.nombre.replace(/^.*·\s*/, '').replace(/^(El|La|Los|Las)\s/, '').replace(/^\w/, c => c.toUpperCase())),
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
  if (pantalla !== 'juego' && enModo()) { Apuro.parar(); Olla.parar(); pararReloj(); }
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
  if (pantalla === 'bolsa') renderBolsa();
  if (pantalla === 'cuaderno') { renderCuaderno(); estado.cuadernoVisto = true; guardar(); }
}

/* ---------- modo dev: todos los niveles abiertos, para probar mecánicas ---------- */

function pintarPortada() {
  const hechos = listos();
  const btn = $('#btn-empezar');
  const avance = $('#portada-avance');
  const reiniciar = $('#btn-reiniciar');
  if (btn) btn.textContent = hechos ? 'Seguir cocinando' : 'Abrir la despensa';
  /* el avance habla en el idioma de la despensa: ingredientes y plato */
  const niveles = RUTA.filter(n => estaListo(n.id)).length;
  const plato = platoDe(loQueSabe());
  if (avance) {
    avance.textContent = hechos ? `${hechos} de ${ORDEN_BOLSAS.length} ingredientes · ${niveles} niveles` : '';
    avance.classList.toggle('hidden', !hechos);
  }
  /* LA TARJETA DE AVANCE, sólo con partida: el anillo de la despensa
     y el plato que hoy sale. Es la ficha de "continuar" de cualquier
     juego — se ve de un vistazo cuánto hay y qué estabas cocinando. */
  const tarjeta = $('#portada-tarjeta');
  if (tarjeta) {
    tarjeta.classList.toggle('hidden', !hechos);
    const pct = Math.round(hechos / ORDEN_BOLSAS.length * 100);
    const anillo = $('#portada-anillo'); if (anillo) anillo.style.setProperty('--p', pct);
    const cifra = $('#portada-anillo-n'); if (cifra) cifra.textContent = pct + '%';
    const d = $('#portada-dia');
    if (d) d.textContent = plato ? `${plato.nombre} · ${plato.eyebrow}` : 'La despensa, por abrir';
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

    tocable(btn, () => {
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

/* EL BOTÓN DE EL APURO VIVE EN EL HTML pero se muda al fondo de la
   mesa en cada render. La referencia se guarda ANTES del primer
   `innerHTML = ''`: una vez dentro de la lista, ese borrado lo
   destruiría y con él sus eventos — guardado aquí, el elemento
   sobrevive detached y vuelve a montarse con todo puesto. */
let btnApuroEl = null;

/* lo que hace el botón grande del dock ahora mismo: cada pintada lo
   decide (cocinar la olla en la mesa, el nivel que toca en la bolsa) */
let sigueAccion = null;

/* ============================================================
   LA MESA ES LA DESPENSA — una bolsa por ingrediente.

   Antes esta pantalla era un carrusel de días y el juego, el camino
   de una semana. La despensa dice otra cosa: aquí están los
   dieciocho ingredientes, cada uno con sus niveles dentro, y tú
   escoges por dónde. Se abren de a poco —la siguiente al saber la de
   antes— pero una abierta no se cierra jamás, así que a las tres
   bolsas ya hay tres frentes.

   `bolsaAbierta` es el cursor de la mesa (qué bolsa estás mirando) y
   `focoId` el de dentro de una bolsa (qué nivel). Son dos cursores
   porque son dos pantallas.
   ============================================================ */

let focoId = null;            /* el nivel bajo el cursor, dentro de una bolsa */
let bolsaAbiertaId = null;    /* la bolsa cuya pantalla se está mirando */

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
  if (izq) tocable(izq, () => { sfx('tab'); irA(i - 1); });
  if (der) tocable(der, () => { sfx('tab'); irA(i + 1); });
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


/* ============================================================
   EL DOCK DE LA MESA: LA OLLA.

   La barra de abajo de la despensa ofrece SIEMPRE lo mismo —cocinar—
   y lo que cambia es QUÉ se cocina. Con una bolsa sabida salen habas
   cocinadas; con quince, fanesca. Esa frase es el motor del juego
   entero: no dice «llevas 7 de 18», dice qué comida te sale hoy y a
   qué ingrediente le falta poco para la siguiente.

   Sin ninguna bolsa sabida no hay olla que ofrecer y el botón lleva a
   la primera bolsa, que es lo único que hay que hacer. */
function pintarDock() {
  const b = $('#btn-sigue');
  if (!b) return;
  const sabe = loQueSabe();
  const plato = platoDe(sabe);
  b.classList.remove('hidden');
  if (!plato) {
    const primera = ORDEN_BOLSAS[0];
    const ing = porId(primera);
    b.innerHTML = `<b>▶ Empezar por ${ing ? ing.nombre.toLowerCase() : 'el principio'}</b><small>una vaina y ya sabes de qué va esto</small>`;
    sigueAccion = () => abrirBolsa(primera);
    return;
  }
  /* EL VERBO ARRIBA Y EL PLATO ABAJO. Con el nombre del plato en el
     renglón grande —«Cocinar sopa de zapallo y doce granos»— el botón
     se partía en dos líneas y se comía el pie. El plato ya está en el
     titular de la pantalla; aquí lo que hace falta es el verbo. */
  const rec = recordDe(plato);
  b.innerHTML = `<b>🍲 ${rec ? 'Cocinar otra vez' : 'Cocinar'}</b><small>${rec
    ? 'tu récord: ' + relojDePartida(rec.ms)
    : aMinuscula(plato.nombre)}</small>`;
  sigueAccion = () => arrancarOlla();
}

/* la barra de abajo DENTRO de una bolsa: el nivel que toca */
function pintarDockBolsa() {
  const b = $('#bolsa-sigue');
  if (!b) return;
  const n = focoId ? rutaPorId(focoId) : null;
  if (!n) { b.classList.add('hidden'); bolsaAccion = null; return; }
  const hecho = estaListo(n.id);
  b.classList.remove('hidden');
  b.innerHTML = `<b>${hecho ? '↻ Otra vez' : '▶ Cocinar'}</b><small>${n.num} · ${n.corto || n.nombre}</small>`;
  bolsaAccion = () => jugar(n.id);
}
let bolsaAccion = null;

/* mover el cursor: la ficha elegida se marca y el dock la nombra */
/* ---------- TOCAR DE VERDAD ----------
   Un dedo no es un puntero: entre que baja y sube se corre unos
   píxeles. Pasados unos diez, el navegador decide que aquello fue un
   arrastre y NO dispara `click` — pero el botón sí recibió el toque,
   así que se pinta pulsado. Ese es el fallo que se veía en el
   teléfono: la ficha (o el botón de El Apuro) parpadeaba al tocarla
   y no pasaba nada, una y otra vez, sobre todo dentro del carrusel
   del recetario, que es una zona que además se desplaza.

   Medido: con 10 px de deriva llega el click; con 14 ya no llega
   ninguno.

   Así que estos botones no esperan al `click`: se quedan con el
   pointerdown, miden lo que se movió el dedo al levantarlo y, si fue
   un toque (menos de TOLERANCIA y menos de un segundo), actúan. El
   `click` se sigue escuchando —teclado y ratón lo usan— con un
   antirrebote para no hacer la cosa dos veces. */
const TAP_TOLERANCIA = 30;   /* px que puede correrse el dedo y seguir siendo un toque */
const TAP_TIEMPO = 900;      /* ms: más que esto es una pulsación larga, no un toque */

/* EL ÚLTIMO TOQUE ATENDIDO, DE CUALQUIER BOTÓN. Tiene que ser global
   y no de cada botón, y esto costó un bug feo: al tocar una bolsa de
   la despensa, el toque abre su pantalla AL INSTANTE, y el `click` de
   cortesía que el navegador manda después cae sobre lo que ahora está
   debajo del dedo —un renglón de nivel— cuyo propio contador de
   toques está a cero. Resultado: un toque en la bolsa del choclo
   entraba directo a un mesón que nadie pidió.

   Con la marca compartida, cualquier `click` que llegue a menos de
   700 ms de un toque atendido es el fantasma de ese toque y se
   descarta, esté donde esté. */
let ultimoTapGlobal = 0;

function tocable(el, fn) {
  if (!el) return;
  let x0 = 0, y0 = 0, t0 = 0, vivo = false;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); vivo = true;
  });
  el.addEventListener('pointerup', (e) => {
    if (!vivo) return;
    vivo = false;
    /* el ratón no tiene este problema: que siga por `click`, así el
       arrastre de un botón con el ratón no dispara nada raro */
    if (e.pointerType === 'mouse') return;
    if (Math.hypot(e.clientX - x0, e.clientY - y0) > TAP_TOLERANCIA) return;
    if (Date.now() - t0 > TAP_TIEMPO) return;
    ultimoTapGlobal = Date.now();
    fn(e);
  });
  /* si el navegador se queda con el gesto (un desplazamiento de
     verdad), esto ya no es un toque */
  el.addEventListener('pointercancel', () => { vivo = false; });
  el.addEventListener('click', (e) => {
    /* iOS manda un `click` de cortesía poco después del toque que ya
       atendimos: ese sobra. El de teclado (Enter en un botón) y el
       del ratón, no — y por eso no se descartan por tiempo entre
       toques, que rompería un repique rápido como el que revela el
       modo dev.

       `detail > 0` es lo que separa un click de PUNTERO de uno
       sintético o de teclado, que llegan con detail 0. Sin esa
       condición, la mordaza de 700 ms se comía también los clicks de
       teclado que cayeran justo después de un toque. */
    if (e.detail > 0 && Date.now() - ultimoTapGlobal < 700) return;
    fn(e);
  });
}

/* ============================================================
   UNA BOLSA EN LA MESA — la ficha del menú.

   Dice tres cosas y ninguna más: qué ingrediente es, cuánto llevas
   dentro, y si está abierta. La cuenta es de NIVELES (3 de 18), no
   de porcentaje: dentro de una bolsa el jugador cuenta peldaños.

   Los estados son cuatro y se leen sin instrucciones:
     · cerrada  — apagada, con candado
     · nueva    — se acaba de abrir y aún no la has tocado: brilla
     · en curso — el gesto ya lo sabes, quedan peldaños
     · sabida   — todos sus niveles hechos, con su sello
   ============================================================ */
function fichaBolsa(bolsa) {
  const ing = porId(bolsa);
  const niveles = nivelesBolsa(bolsa);
  const hechos = niveles.filter(n => estaListo(n.id)).length;
  const abierta = bolsaAbierta(bolsa);
  const sabe = sabeHacer(bolsa);
  const completa = hechos >= niveles.length && niveles.length > 0;
  const nueva = abierta && hechos === 0;
  const pct = niveles.length ? Math.round(hechos / niveles.length * 100) : 0;

  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.bolsa = bolsa;
  b.className = 'bolsa'
    + (!abierta ? ' bolsa--cerrada' : '')
    + (completa ? ' bolsa--completa' : (sabe ? ' bolsa--sabida' : ''))
    + (nueva ? ' bolsa--nueva' : '');
  b.innerHTML = `
    <span class="bolsa-ico" aria-hidden="true">${icono(ing ? ing.icono : 'fanesca')}</span>
    <span class="bolsa-nombre">${ing ? ing.nombre : bolsa}</span>
    <span class="bolsa-pie">${!abierta
      ? '<span class="bolsa-candado" aria-hidden="true">🔒</span>'
      : (nueva
        ? '<span class="bolsa-nuevo">empieza aquí</span>'
        : `<span class="bolsa-cuenta">${hechos} / ${niveles.length}</span>`)}</span>
    ${abierta && hechos > 0 ? `<span class="bolsa-barra" aria-hidden="true"><i style="width:${pct}%"></i></span>` : ''}
    ${completa ? '<span class="bolsa-sello" aria-hidden="true">✓</span>' : ''}`;
  b.setAttribute('aria-label', `${ing ? ing.nombre : bolsa}${abierta
    ? ` · ${hechos} de ${niveles.length} niveles`
    : ' (cerrada)'}`);
  tocable(b, () => {
    sfx('tab');
    if (!abierta) {
      const antes = porId(ORDEN_BOLSAS[PUESTO[bolsa] - 1]);
      toast(antes ? `Primero ${antes.nombre.toLowerCase()} 👆` : 'Todavía no');
      return;
    }
    abrirBolsa(bolsa);
  });
  return b;
}

/* ============================================================
   LA DESPENSA — la pantalla del menú.

   Cabecera con el plato que hoy te sale y lo que le falta al
   siguiente; las dieciocho bolsas en rejilla; abajo, la olla.

   LA CABECERA NO CUENTA PARADAS. Antes decía «14 / 46 paradas ·
   miércoles» y eso no es una razón para seguir jugando, es un
   inventario. Ahora dice qué comida sale de tu despensa hoy y qué
   ingrediente la sube de nombre — que es lo que de verdad mueve a
   abrir otra bolsa.
   ============================================================ */
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

  const sabe = loQueSabe();
  const plato = platoDe(sabe);
  const proximo = proximoPlato(sabe);
  const nivelesHechos = RUTA.filter(n => estaListo(n.id)).length;
  const racha = (estado.dias && estado.dias.seguidos > 1) ? ` · 🔥${estado.dias.seguidos}` : '';

  const titulo = $('#mesa-titulo');
  if (titulo) titulo.textContent = plato ? plato.nombre : 'La despensa';
  const sub = $('#mesa-progreso');
  if (sub) {
    sub.textContent = !plato
      ? 'dieciocho bolsas y una olla vacía'
      : (proximo
        ? `${proximo.faltan.length === 1 ? 'te falta' : 'te faltan'} ${listaDeBolsas(proximo.faltan)} para ${proximo.plato.enFrase}${racha}`
        : `los dieciocho, y la mesa puesta${racha}`);
  }
  /* el anillo mira los INGREDIENTES, no los niveles: es el camino a
     la fanesca, y los peldaños de más de una bolsa no lo acercan */
  const pct = Math.round(sabe.size / ORDEN_BOLSAS.length * 100);
  const anillo = $('#mesa-anillo'); if (anillo) anillo.style.setProperty('--p', pct);
  const cifra = $('#mesa-anillo-n'); if (cifra) cifra.textContent = `${sabe.size}/${ORDEN_BOLSAS.length}`;
  const nota = $('#mesa-plato-nota');
  if (nota) {
    nota.textContent = plato ? plato.texto : 'Abre la primera bolsa y ya tendrás qué cocinar.';
    nota.classList.remove('hidden');
  }
  const pista = $('#mesa-niveles');
  if (pista) pista.textContent = nivelesHechos ? `${nivelesHechos} de ${RUTA.length} niveles` : '';

  const lista = $('#mesa-lista');
  if (!btnApuroEl) btnApuroEl = document.getElementById('btn-apuro');
  lista.innerHTML = '';
  lista.className = 'mesa-bolsas';
  ORDEN_BOLSAS.forEach(id => lista.appendChild(fichaBolsa(id)));

  /* EL APURO se ofrece cuando ya hay gestos que apurar: con tres
     bolsas sabidas hay tres mesones distintos en la baraja, y un
     modo sin fin con un solo mesón no es un modo, es el mismo nivel
     otra vez. */
  if (btnApuroEl) {
    const hayApuro = sabe.size >= 3 || estado.devMode;
    btnApuroEl.classList.toggle('hidden', !hayApuro);
    const pie = btnApuroEl.querySelector('#btn-apuro-pie');
    if (pie) pie.textContent = estado.apuro
      ? `Tu récord: ${estado.apuro.raciones} raciones`
      : 'Raciones sin fin, contra el reloj';
    if (hayApuro) $('#mesa-extras').appendChild(btnApuroEl);
  }

  pintarDock();

  /* LA DESPENSA COMPLETA SE CELEBRA AQUÍ, al volver a la mesa, y una
     sola vez. Es el final del juego: no queda ingrediente que
     aprender y la olla ya cocina la fanesca entera.

     EN MODO DEV NO. Allí se saben los dieciocho por decreto, no por
     haberlos cocinado, así que el altar salía en la primera pantalla
     —y su escena, que ocupa la pantalla entera, se tragaba todos los
     toques de después. Celebrar un final que nadie ganó no es sólo
     falso: deja el juego sin responder. */
  if (!proximo && !estado.despensaVista && !estado.devMode) setTimeout(mostrarFinal, 450);
}

/* el nombre de un ingrediente para meterlo en una frase */
function nombreDeBolsa(id) {
  const ing = porId(id);
  return ing ? ing.nombre.toLowerCase() : id;
}

/* «el mote», «el mote y la col», «el mote, la col y 3 más»: la lista
   de lo que falta, que es la razón concreta para abrir otra bolsa.
   Más de tres nombres no caben en el renglón y dejan de informar. */
function listaDeBolsas(ids) {
  const n = ids.map(nombreDeBolsa);
  if (n.length === 1) return n[0];
  if (n.length === 2) return `${n[0]} y ${n[1]}`;
  if (n.length === 3) return `${n[0]}, ${n[1]} y ${n[2]}`;
  return `${n[0]}, ${n[1]} y ${n.length - 2} más`;
}

/* «Sopa de Cuaresma» dentro de una frase es «la sopa de Cuaresma»:
   sólo baja la primera letra, que los nombres propios de dentro
   —Cuaresma— siguen siendo nombres propios */
const aMinuscula = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

/* ============================================================
   DENTRO DE UNA BOLSA — los niveles de un ingrediente.

   Es la pantalla que faltaba: aquí es donde alguien decide que le
   gusta el choclo y se queda. Arriba, el ingrediente y su gesto;
   en el medio, sus niveles en fila con su récord; abajo, el que
   toca.

   La fila SÍ es una fila —cada nivel abre el siguiente— porque los
   peldaños de un ingrediente están escritos para enseñarse en ese
   orden. Lo que ya no es una fila es el juego entero.
   ============================================================ */
function abrirBolsa(bolsa) {
  bolsaAbiertaId = bolsa;
  renderBolsa();
  mostrar('bolsa');
}

function renderBolsa() {
  const bolsa = bolsaAbiertaId;
  if (!bolsa) return;
  const ing = porId(bolsa);
  const niveles = nivelesBolsa(bolsa);
  const hechos = niveles.filter(n => estaListo(n.id)).length;

  $('#bolsa-titulo').textContent = ing ? ing.nombre : bolsa;
  $('#bolsa-tarea').textContent = ing ? ing.tarea : '';
  const cuenta = $('#bolsa-cuenta');
  if (cuenta) cuenta.textContent = `${hechos} de ${niveles.length}`;
  const anillo = $('#bolsa-anillo');
  if (anillo) anillo.style.setProperty('--p', niveles.length ? Math.round(hechos / niveles.length * 100) : 0);
  const deco = $('#bolsa-anillo-ic');
  if (deco) deco.innerHTML = icono(ing ? ing.icono : 'fanesca');

  /* EL CURSOR de la bolsa: se queda donde estaba si ese nivel es de
     esta bolsa y sigue abierto; si no, al primero sin hacer. */
  const dentro = (id) => niveles.some(n => n.id === id);
  const iDe = (id) => RUTA.findIndex(n => n.id === id);
  if (!focoId || !dentro(focoId) || !desbloqueado(iDe(focoId))) {
    const sig = niveles.find(n => !estaListo(n.id) && desbloqueado(iDe(n.id)));
    focoId = (sig || niveles[niveles.length - 1] || {}).id || null;
  }

  /* EL GESTO ES EL DEL NIVEL BAJO EL CURSOR, no el de la bolsa. En el
     choclo los dos primeros peldaños son la feria —escoger, que se
     juega con otra mano— y la cabecera decía «jala las hojas hacia
     abajo» para un mesón donde no hay ninguna hoja que jalar. */
  const enFoco = focoId ? rutaPorId(focoId) : null;
  const fichaGesto = enFoco ? porId(enFoco.base) : ing;
  const gesto = $('#bolsa-gesto');
  if (gesto) gesto.innerHTML = fichaGesto ? fichaGesto.gesto : '';

  const ol = $('#bolsa-niveles');
  ol.innerHTML = '';
  niveles.forEach(n => {
    const i = iDe(n.id);
    const abierto = desbloqueado(i);
    const mejor = estado.mejores[n.id];
    const esSiguiente = abierto && !mejor;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = n.id;
    b.className = 'renglon ' + (mejor ? 'renglon--hecho' : (esSiguiente ? 'renglon--siguiente' : 'renglon--bloqueado'))
      + (focoId === n.id ? ' renglon--foco' : '');
    const dif = n.dificultad ? `<span class="renglon-dif" aria-hidden="true">${'🌶️'.repeat(n.dificultad)}</span>` : '';
    b.innerHTML = `
      <span class="renglon-num">${n.num}</span>
      <span class="renglon-txt"><span class="renglon-nombre">${n.corto || n.nombre}</span>${dif}</span>
      <span class="renglon-estado">${mejor
        ? `<span class="renglon-cucharas">${cucharasHTML(mejor.cucharas)}</span>`
        : (esSiguiente ? '<span class="renglon-lapiz" aria-hidden="true">✎</span>' : '<span class="renglon-candado" aria-hidden="true">🔒</span>')}</span>`;
    b.setAttribute('aria-label', `Nivel ${n.num}: ${n.nombre}`
      + (n.dificultad ? ` (dificultad ${n.dificultad} de 5)` : '')
      + (abierto ? '' : ' (bloqueado)'));
    tocable(b, () => {
      sfx('tab');
      if (!abierto) { toast('Primero ' + (niveles[niveles.indexOf(n) - 1] || {}).corto + ' 👆'); return; }
      focoId = n.id;
      $$('#bolsa-niveles .renglon--foco').forEach(el => el.classList.remove('renglon--foco'));
      b.classList.add('renglon--foco');
      pintarDockBolsa();
      jugar(n.id);
    });
    li.appendChild(b);
    ol.appendChild(li);
  });

  pintarDockBolsa();
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
   La escena del final: encima del altar, los ingredientes
   caen a la olla uno a uno, en el orden en que entran de verdad
   (ORDEN_OLLA, en niveles.js). Todo es DOM: aquí se ponen las piezas
   y el ritmo, el CSS las deja caer. Cada uno deja un trozo en el
   caldo, que va pasando de agua a fanesca, y el vapor sube con la
   olla llena. Un toque la salta; con movimiento reducido no se lanza.
   Devuelve una promesa que se cumple cuando la escena se apagó —o se
   saltó—: la fiesta del altar espera a eso, para que el confeti caiga
   sobre la olla lista y no debajo de una cortina negra. */
/* el color del trozo que cada uno deja en el caldo vive con el ORDEN
   (niveles.js): dos listas de dieciséis con las mismas claves
   terminan un día sin coincidir */
const OLLA_TROZOS = Object.fromEntries(ORDEN_OLLA.map(o => [o.id, o.color]));
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
    eyebrow.textContent = 'los dieciocho, en una sola olla';
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
      eyebrow.textContent = 'que hierva despacio';
      nombre.textContent = 'la despensa entera, en una sola olla'; reentra(nombre);
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

/* ---------- adelantar trabajo ----------
   Mientras se lee la hoja de «a la olla», el juego está de brazos
   cruzados y la parada que sigue ya se sabe cuál es: se trae su
   módulo y sus modelos AHORA, para que el toque en «Siguiente
   parada» no tenga que esperar a la red ni al import. Es media
   costura menos, y no cuesta nada — si el jugador se va a la mesa,
   lo peor que pasa es que quedó un módulo cargado de más. */
let precargado = null;
/* la próxima parada llega ENCADENADA (desde la hoja de listo) y no
   desde el recetario: lo pone el botón, lo consume jugar() */
let cadenaPendiente = false;
function precargarParada(n) {
  if (!n || !n.modulo || (precargado && precargado.id === n.id)) return;
  try {
    const prom = n.modulo().catch(() => null);
    precargado = { id: n.id, prom };
    Motor.modelosListos().catch(() => {});
  } catch (e) { precargado = null; }
}

/* ---------- la tarjeta de parada ----------
   Al entrar al mesón la cortina baja un instante y presenta la
   escena: qué día es, qué parada, qué se hace. Tapa la carga del
   módulo y los modelos —que es cuando la pantalla estaba en blanco—
   y no captura el dedo: si el jugador ya está tocando, se va sola. */
let cortinaId = null, cortinaT0 = 0;
/* Cuánto se queda la tarjeta. Entrando desde el recetario presenta la
   parada y merece su respiro; ENCADENANDO —terminaste una y caes en la
   siguiente— el jugador ya está en faena y lo que quiere es la tabla:
   ahí la tarjeta pasa como un rótulo de escena, no como una pausa. */
const CORTINA_MIN = 1000;         /* ms mínimos con la tarjeta a la vista */
const CORTINA_TRAS_LISTO = 600;   /* y nunca menos de esto con el mesón YA armado detrás */
const CORTINA_MIN_CADENA = 560;
const CORTINA_TRAS_LISTO_CADENA = 300;
let cortinaCorta = false;
function tarjetaDeParada(n) {
  const c = $('#cortina');
  if (!c || !n) return;
  const ing = porId(n.bolsa);
  const cuantos = nivelesBolsa(n.bolsa).length;
  $('#cortina-dia').textContent = `${ing ? ing.nombre : 'la despensa'} · ${n.num} de ${cuantos}`;
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
      const tras = cortinaCorta ? CORTINA_TRAS_LISTO_CADENA : CORTINA_TRAS_LISTO;
      const min = cortinaCorta ? CORTINA_MIN_CADENA : CORTINA_MIN;
      const falta = Math.max(tras, min - (performance.now() - cortinaT0));
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
    tocable(p, () => { sfx('tab'); if (cuadernoCarrusel) cuadernoCarrusel.irA(k); });
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

  /* ---------- LOS INGREDIENTES ----------
     Esto salía antes en la hoja de listo, después de cada parada: un
     párrafo de historia y una cita, justo cuando el jugador tiene el
     pulgar encima de «siguiente». Nadie lo leía. Aquí sí se lee,
     porque a esta página se entra queriendo. Y no se pierde nada: es
     el mismo texto, entero, con su cita. */
  const ganadas = Object.entries(TARJETAS).filter(([k]) => (estado.leidos || []).includes(k));
  if (ganadas.length) {
    pagina('pagina capitulo', `
      <div class="capitulo-head">
        <span class="plate">${icono('granos_mixtos')}</span>
        <h3 class="capitulo-titulo">Los ingredientes</h3>
      </div>
      <div class="capitulo-cuerpo">
        <p class="capitulo-cerrojo">Uno por cada cosa que ya cocinaste. Los que faltan se abren solos.</p>
        ${ganadas.map(([, t]) => `
          <h4 class="tarjeta-titulo">${t.titulo}</h4>
          <p>${t.texto}</p>
          ${t.cita ? `<blockquote class="cita"><p>«${t.cita.texto}»</p>
            <footer>${t.cita.quien}<span>${t.cita.datos || ''}</span></footer></blockquote>` : ''}`).join('')}
      </div>`);
  }

  /* ---------- EL ORDEN DE LA OLLA ----------
     Las dieciséis razones que el caldero suelta de a una cuando te
     equivocas. Juntas son la receta, y juntas sólo caben aquí: en
     pleno mesón nadie lee dieciséis renglones seguidos. */
  pagina('pagina capitulo', `
    <div class="capitulo-head">
      <span class="plate">${icono(OLLA.icono)}</span>
      <h3 class="capitulo-titulo">El orden de la olla</h3>
    </div>
    <div class="capitulo-cuerpo">
      <p>${OLLA.gesto}</p>
      <ol class="orden-olla">
        ${ORDEN_OLLA.map((o, i) => `<li><b>${i + 1}. ${o.nombre}</b><span>${o.porque}</span></li>`).join('')}
      </ol>
    </div>`);

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

/* ---------- las faenas del mesón ----------
   Un nivel de varias fases —el zapallo parte, taja y limpia; la col
   enrolla y corta— cambiaba de faena avisando sólo con el rótulo, y
   desde fuera se sentía como si el juego hubiera cambiado de tema a
   media partida. Ahora las faenas van en fila bajo el HUD: la de
   ahora abierta y con su nombre, las hechas con su visto.

   Quién manda el paso: el nivel, si lo dice con `api.paso(i)` —los
   multifase saben exactamente cuándo cambian—; y si no lo dice, la
   barra de progreso, porque cada paso trae el `desde` (la fracción
   del nivel en que empieza) desde niveles.js. Así los doce de
   siempre lo tienen gratis y los nuevos pueden afinarlo. */
let pasosNivel = null, pasoAhora = -1, pasoForzado = false;

function pintarPasos(n) {
  const caja = $('#hud-pasos');
  if (!caja) return;
  /* un solo paso no es una fila de pasos: es el nivel entero */
  pasosNivel = (n && Array.isArray(n.pasos) && n.pasos.length > 1) ? n.pasos : null;
  pasoAhora = -1; pasoForzado = false;
  caja.classList.toggle('hidden', !pasosNivel);
  if (!pasosNivel) { caja.innerHTML = ''; return; }
  caja.innerHTML = pasosNivel
    .map((p, i) => `<span class="hud-paso" data-i="${i}"><i>${p.ico || '•'}</i><b>${p.txt}</b></span>`)
    .join('');
  marcarPaso(0);
}

function marcarPaso(i, delNivel) {
  if (!pasosNivel) return;
  if (delNivel) pasoForzado = true;
  i = Math.max(0, Math.min(pasosNivel.length - 1, i));
  if (i === pasoAhora) return;
  /* LA BARRA no retrocede: en un nivel que reparte el trabajo por
     piezas la fracción sube y baja, y la fila daría tumbos. EL NIVEL
     sí puede: el huevo vuelve a «cáscalo» con cada huevo nuevo, y
     decir «pélalo» mientras toca golpear es mentir. */
  if (i < pasoAhora && !delNivel) return;
  pasoAhora = i;
  const fichas = $$('#hud-pasos .hud-paso');
  fichas.forEach((f, k) => {
    f.classList.toggle('hud-paso--hecho', k < i);
    f.classList.toggle('hud-paso--ahora', k === i);
    if (k === i) { f.classList.remove('entra'); void f.offsetWidth; f.classList.add('entra'); }
  });
}

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
  /* en los modos no hay tope: un descuido cuesta segundos (El Apuro)
     o penalización y calidad (La Olla), pero nunca corta la partida */
  const tope = enModo() ? Infinity : topeFallos();
  el.classList.toggle('visible', fallosAhora > 0);
  el.textContent = Number.isFinite(tope) ? `✗ ${fallosAhora} / ${tope}` : `✗ ${fallosAhora}`;
  el.classList.toggle('hud-fallos--rojo', Number.isFinite(tope) && fallosAhora >= tope - 1);
}
function registrarFallo(tipo, msg) {
  if (!enModo() && !corriendo && !relojEnEspera) return;
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
    if (msg) alerta(msg, 'peligro');
    return;
  }
  /* en La Olla el descuido SUMA al marcador: el reloj sube, así que
     la penalización se enseña con el signo al revés */
  if (Olla.activo) {
    const coste = OLLA_MODO.fallo || 4;
    Olla.descontar(coste);
    flotarTiempo('+' + coste + 's', 'pierde');
    if (msg) alerta(msg, 'peligro');
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
  /* En La Olla el reloj es de partida entera: minutos y segundos, sin
     décimas. Una centésima parpadeando durante nueve minutos es un
     tic nervioso, y aquí lo que se compara son medios minutos. */
  if (Olla.activo) {
    el.classList.remove('hud-tiempo--rojo');
    n.textContent = relojDePartida(Olla.ms);
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
    const m = modoVivo();
    if (m) m.tick(dt);
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
/* LAS CITAS YA NO SALEN JUGANDO. Eran nueve segundos de texto sobre
   el mesón —con el reloj detenido— y probándolo con gente pasó lo
   que pasa siempre: nadie se para a leer en mitad de una faena,
   quieren seguir. Lo que se contaba aquí no se perdió: vive en el
   cuaderno, con su contexto y su fuente, y en la pantalla de «se
   arruinó la olla», que es el único momento del juego donde el
   jugador está detenido a la fuerza.

   La maquinaria se queda puesta —detiene el reloj, se cierra sola, se
   puede tocar para saltarla— porque es la forma correcta de decir
   algo largo si algún día hace falta. Hoy no la llama nadie. */
function voz(cita, ms = 9000, opts = {}) {
  const v = $('#voz');
  if (!cita) { v.classList.remove('visible'); if (vozPauso) { vozPauso = false; if (nivelActual) arrancarReloj(); } return; }
  /* y en un modo, menos todavía: nueve segundos de texto en pleno
     contrarreloj no se leen, se sufren */
  if (enModo()) return;
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
    const enCurso = modoVivo();
    const racion = enCurso && (enCurso === Apuro ? Apuro.racion : Olla.paso);
    const meta = (racion && racion.cuota) || totalAhora;
    const k = Math.max(0, Math.min(1, hechos / meta));
    const barra = $('#hud-barra');
    barra.style.width = (k * 100) + '%';
    const pct = $('#hud-pct');
    if (pct) pct.textContent = Apuro.activo
      ? Apuro.raciones + (Apuro.raciones === 1 ? ' ración' : ' raciones')
      /* en La Olla, DÓNDE VAS DE LA PARTIDA entera. El avance dentro
         del acto no dice nada en los actos de un solo mesón («1/1») y
         lo que se quiere saber en una partida de nueve minutos es
         cuánto falta para el plato. */
      : (Olla.activo ? `${Math.min(Olla.indice + 1, Olla.total)}/${Olla.total}` : Math.round(k * 100) + '%');
    Motor.llenarRecipiente('batea', k);
    /* la faena que toca según lo hecho — salvo que el nivel ya la
       esté diciendo él mismo con api.paso() */
    if (pasosNivel && !pasoForzado) {
      let i = 0;
      pasosNivel.forEach((p, j) => { if (k >= (p.desde || 0)) i = j; });
      marcarPaso(i);
    }
    if (subio) {
      racha(cuanto, k);
      puntosFlotantes(cuanto);
    }
    /* El Apuro escucha el mismo latido que la barra. No necesita que
       el nivel sepa nada de él: con saber cuánto lleva hecho de su
       propio total ya puede decidir si la ración está servida. */
    if (enCurso) enCurso.progreso(hechos, total || 1);
  },
  composta(k) { Motor.llenarRecipiente('composta', Math.max(0, Math.min(1, k))); },
  completar() {
    const m = modoVivo();
    if (m) { m.completar(); return; }
    /* "en espera" también es una partida viva: el reloj arranca con
       el primer toque, y un nivel terminado de un toque no puede
       quedarse sin celebrar por un tecnicismo del cronómetro */
    if (corriendo || relojEnEspera) { relojEnEspera = false; terminarNivel(); }
  },
  arruinar(motivo) {
    /* en un modo un desastre no tira la partida —cuesta segundos en
       El Apuro, penalización y calidad en La Olla— así que si el modo
       se lo queda, aquí no se abre nada */
    const m = modoVivo();
    if (m && m.arruinar(motivo)) return;
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
  /* …y decir en qué faena de la fila va: el nivel lo sabe mejor que
     la barra, sobre todo cuando el trabajo se reparte por piezas */
  paso(i) { marcarPaso(i, true); },
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
  aroDestino: (...a) => Motor.aroDestino(...a),
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

/* UN MONTAJE A LA VEZ. `jugar` es asíncrono: entre el toque y el
   mesón hay dos esperas (el módulo y los modelos). Si en ese hueco se
   toca otra parada o se sale a la mesa, la carga vieja seguía su
   camino y terminaba montando lo suyo encima: se veía la pantalla de
   juego SIN mesón, y desde ahí ninguna ficha respondía porque ya no
   se estaba en el recetario. Cada montaje lleva su número; el que
   deja de ser el último, se calla. */
let montaje = 0;

async function jugar(id) {
  const n = rutaPorId(id);
  if (!n) return;
  /* sin WebGL no hay mesón: entrar igual dejaba al jugador atrapado
     en una pantalla vacía. El aviso largo ya está puesto en la escena
     desde init(); aquí basta con no entrar. */
  if (!motorListo) { toast('Este minijuego necesita WebGL 😔'); return; }
  const mi = ++montaje;
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
  pintarPasos(n);
  cortinaCorta = cadenaPendiente; cadenaPendiente = false;
  mostrar('juego');
  tarjetaDeParada(n);

  try {
    /* si esta parada ya se venía precargando mientras se leía la hoja
       de la anterior, el import ya está resuelto y no hay que ir a
       buscar nada: es el grueso de la costura entre parada y parada */
    const m = await ((precargado && precargado.id === id) ? precargado.prom : n.modulo());
    /* mientras llegaba el módulo, el jugador se fue o entró a otra:
       esta carga ya no manda */
    if (mi !== montaje) return;
    modActual = m.default || m;
  } catch (e) {
    if (mi !== montaje) return;
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
  if (mi !== montaje) return;
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
  /* EL AVISO DEL BICHO, UNA VEZ POR BICHO Y NO POR PARADA. Salía en
     cada parada nueva con bichos —unas veinticinco veces a lo largo de
     la campaña— repitiendo la misma regla a alguien que ya la sabe, y
     una instrucción repetida enseña a saltarse las instrucciones. El
     gusanito, la mosca y el gorgojo se avisan la primera vez que
     aparecen y nunca más: son tres reglas, no veinticinco. */
  if (traeBichos && n.bicho && !(estado.bichosVistos || []).includes(n.bicho)) {
    estado.bichosVistos = [...(estado.bichosVistos || []), n.bicho];
    guardar();
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

/* La regla del modo se cuenta UNA VEZ EN LA VIDA y en una línea. Es
   lo único que hace falta leer para jugarlo; el resto —de dónde sale
   el orden, qué es la uchucuta, por qué el bacalao— vive en el
   cuaderno, que es donde alguien lo lee porque quiere. */
function reglaDelApuro() {
  if (estado.apuroJugado) return null;
  estado.apuroJugado = true; guardar();
  return '<b>El Apuro:</b> haz una parte de cada ingrediente y el reloj te <b>devuelve segundos</b>.';
}
function reglaDeLaOlla() {
  if (estado.ollaModoJugado) return null;
  estado.ollaModoJugado = true; guardar();
  return '<b>La Olla:</b> la fanesca entera, de principio a fin. El reloj <b>sube</b>: es tu marca.';
}

/* LA REGLA DE LA PORCIÓN, una vez por partida. En una cocina nadie
   pela el zapallo entero: se pela lo que la olla pide y se pasa a lo
   siguiente. El juego hace lo mismo en siete mesones y no lo decía,
   así que parecía que se le adelantaba al jugador. Se cuenta la
   primera vez que toca un mesón cortado, no en todos: repetirlo siete
   veces por partida sería el ruido que este juego acaba de quitarse. */
let avisadaPorcion = false;
function reglaDeLaPorcion(paso) {
  if (avisadaPorcion || !paso || (paso.porcion ?? 1) >= 1) return null;
  avisadaPorcion = true;
  return 'La olla pide <b>una parte</b>, no el ingrediente entero: cuando se llene la barra, ya está.';
}

/* mm:ss — una partida de nueve minutos no se lee en décimas */
function relojDePartida(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ============================================================
   MONTAR UN MESÓN PARA UN MODO

   Es `jugar()` sin la campaña: sin récords, sin tarjeta de parada,
   sin modal de listo — y sobre todo sin volver a la mesa entre uno y
   otro, que es lo que le quitaba fluidez al juego. La mesa cambia y
   ya estás en el siguiente.

   Sirve a LOS DOS MODOS. Lo único que cambia entre ellos es qué
   escribe el HUD y con qué dificultad se arman los bichos, así que
   eso entra por parámetro y el resto —la ficha, el módulo, los
   modelos, los tres caminos de error— es el mismo código. Escribirlo
   dos veces era garantizar que el segundo se quedara sin los
   arreglos del primero.
   ============================================================ */
async function montarMeson(base, config, modo, opts = {}) {
  const ficha = porId(base);
  /* SIN FICHA O SIN MÓDULO NO SE ESPERA: se avisa y el modo pide el
     siguiente. Antes esto hacía `return` a secas y la partida se
     quedaba con el mesón anterior en pantalla, muda, para siempre. */
  if (!ficha) {
    console.error('El modo pidió un mesón que no existe:', base);
    toast(`No encontré «${base}» en esta versión: sigo con otro 😔`, 3200);
    modo.saltar();
    return;
  }
  nivelActual = ficha;
  pintarPasos(ficha);
  const ic = $('#hud-icono'); if (ic) ic.innerHTML = icono(ficha.icono);
  if (opts.hud) opts.hud(ficha);
  try {
    const m = await ficha.modulo();
    modActual = m.default || m;
  } catch (e) {
    console.error(e);
    toast(`No se pudo abrir ${ficha.nombre.toLowerCase()}: sigo con otro 😔`, 3200);
    modo.saltar();
    return;
  }
  await Motor.modelosListos();
  /* LA PARTIDA PUDO ACABARSE MIENTRAS SE MONTABA: montar es
     asíncrono, y si terminó en ese hueco el resumen ya está en
     pantalla — construir el nivel ahora lo pondría a vivir detrás del
     modal, encolando pistas para nadie */
  if (!modo.activo) return;
  hechosAhora = 0; totalAhora = 1; fallosAhora = 0;
  pintarFallos();
  /* justo antes de construir: a partir de aquí el progreso que llegue
     es de ESTE mesón y no del que se estaba jugando */
  modo.activar();
  api.dificultad = opts.dificultad || 1;
  const capturadas = [];
  capturaPista = (msg, ms) => capturadas.push({ msg, ms });
  /* si construir revienta, se salta en vez de dejar medio mesón
     montado y el modo esperando un progreso que no llega */
  try {
    Motor.cargar(modActual, api, config);
  } catch (e) {
    console.error(e);
    capturaPista = null;
    toast(`Se cayó el mesón de ${ficha.nombre.toLowerCase()}: sigo con otro 😔`, 3200);
    try { Motor.descargar(); } catch (e2) {}
    modo.saltar();
    return;
  }
  capturaPista = null;
  renderControles(modActual);
  Editor.nivel(ficha.id);
  /* EL GESTO, Y NADA MÁS. Un modo rápido no es excusa para soltar a
     alguien en las habas sin decirle qué se hace — pero tampoco es
     sitio para un párrafo: la regla del modo se cuenta una vez en la
     vida y el resto vive en el cuaderno. */
  const fila = [];
  if (opts.reglas) fila.push({ msg: opts.reglas });
  fila.push({ msg: ficha.gesto }, ...capturadas);
  ultimaPista = ficha.gesto;
  pistasEnFila(fila);
}

const GANCHOS_APURO = {
  montar: (base, config) => montarMeson(base, config, Apuro, {
    hud: (ficha) => apuroHUD(ficha.nombre),
    /* en El Apuro la dificultad de los bichos sube con la tanda: la
       primera enseña, de la cuarta en adelante ya no perdonan */
    dificultad: Math.min(5, Apuro.tanda || 1),
    reglas: reglaDelApuro(),
  }),

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

/* ============================================================
   LA OLLA — la fanesca entera, contra tu récord

   `modo-olla.js` lleva las reglas; esto es lo que el modo le pide al
   juego: montar el paso que toca, cantar un acto, cobrar un desastre
   y cerrar la partida.
   ============================================================ */

function ollaHUD(ficha) {
  const acto = Olla.acto;
  const t = $('#hud-tarea');
  /* EL RÓTULO DICE DÓNDE ESTÁS, no qué hacer. En una partida de nueve
     minutos lo que se pierde es el sitio —¿voy por la mitad?— y eso no
     lo contesta el nombre del ingrediente solo. Salvo en los actos de
     un solo mesón, donde el acto y el mesón se llaman igual: «La olla
     · la olla» no dice nada y gasta el único renglón que hay. */
  const donde = acto ? acto.nombre : 'La olla';
  const que = ficha ? ficha.nombre : '';
  if (t) t.textContent = (!que || que.toLowerCase() === donde.toLowerCase())
    ? donde
    : `${donde} · ${que.toLowerCase()}`;
  const pct = $('#hud-pct');
  if (pct) pct.textContent = `${Math.min(Olla.indice + 1, Olla.total)}/${Olla.total}`;
  const barra = $('#hud-barra');
  if (barra) barra.style.width = '0%';
}

const GANCHOS_OLLA = {
  montar: (base, config, dificultad, paso) => montarMeson(base, config, Olla, {
    hud: (ficha) => ollaHUD(ficha),
    dificultad,
    reglas: reglaDeLaOlla() || reglaDeLaPorcion(paso),
  }),

  /* UN PASO HECHO SE CELEBRA CHIQUITO. Son veinte en una partida: una
     fiesta entera por cada uno sería medio minuto de confeti y la
     partida perdería su ritmo. El aplauso gordo es el del acto.

     PERO EL CORTE SE NARRA. Siete mesones se dan por hechos antes de
     terminar el ingrediente, y sin decir nada eso se siente a que el
     juego te quita el mesón a media pelada. El aviso verde se queda
     en pantalla mientras el mesón siguiente se monta, así que la
     explicación sobrevive al cambio — que es justo lo que hacía
     falta. */
  pasoHecho({ paso, indice, total, parcial }) {
    sfx('bien'); buzz([12, 18]);
    const ficha = porId(paso.base);
    const nombre = ficha ? ficha.nombre : 'Listo';
    if (parcial) {
      alerta(`${nombre}: con eso alcanza para la olla`, 'bien');
      setTimeout(() => alerta(null), 2600);
    } else toast(`${nombre} ✓ · ${indice + 1} de ${total}`);
  },

  /* EL ACTO SÍ ES UN MOMENTO. Es lo que parte nueve minutos en cuatro
     carreras: entra un cartel con su nombre, y al cerrarse se canta la
     marca contra tu récord. */
  acto(acto, i, de) {
    sfx('tab'); buzz([14, 22, 14]);
    cartelDeActo(acto, i, de);
  },

  actoCerrado({ acto, ms, delta }) {
    sfx('fiesta'); buzz([15, 25, 15]);
    Motor.destello('rgba(232,129,58,.2)');
    /* la marca parcial, con el signo que importa: contra tu propia
       sombra. Sin récord no hay nada que comparar y decir "+0:00"
       sobre una primera partida es inventarse un dato. */
    const marca = relojDePartida(ms);
    if (delta == null) toast(`${acto.nombre}: ${marca}`, 2600);
    else {
      const mejor = delta < 0;
      flotarTiempo((mejor ? '−' : '+') + relojDePartida(Math.abs(delta)), mejor ? 'gana' : 'pierde');
      toast(`${acto.nombre}: ${marca} · ${mejor ? '¡mejor que tu récord!' : 'tu récord iba más rápido'}`, 3000);
    }
  },

  castigo({ coste, motivo }) {
    sfx('mal'); buzz([50, 40, 60]);
    Motor.destello('rgba(230,57,70,.4)');
    Motor.sacudir(0.7);
    flotarTiempo('+' + coste + 's', 'pierde');
    alerta(`${motivo && motivo.titulo ? motivo.titulo : 'Se dañó'} · +${coste}s`, 'peligro');
    setTimeout(() => alerta(null), 2800);
  },

  finDePartida(resumen) { cerrarOlla(resumen); },
};

/* el cartel que abre cada acto: dos segundos, sin nada que leer más
   allá del nombre y de dónde va la partida */
let cartelId = null;
function cartelDeActo(acto, i, de) {
  const el = $('#acto-cartel');
  if (!el) return;
  $('#acto-cartel-ico').textContent = acto.ico || '🍲';
  $('#acto-cartel-eyebrow').textContent = `acto ${i + 1} de ${de} · ${acto.eyebrow}`;
  $('#acto-cartel-nombre').textContent = acto.nombre;
  $('#acto-cartel-lema').textContent = acto.lema;
  el.hidden = false;
  el.classList.remove('entra'); void el.offsetWidth; el.classList.add('entra');
  clearTimeout(cartelId);
  cartelId = setTimeout(() => { el.classList.remove('entra'); el.hidden = true; }, 2100);
}

/* el plato de la partida en curso: se fija al arrancar, porque el
   récord y la pantalla del final son de ESE plato y no del que se
   pueda cocinar mañana */
let platoEnCurso = null;

function arrancarOlla() {
  if (!motorListo) { toast('Este minijuego necesita WebGL 😔'); return; }
  const sabe = loQueSabe();
  const plato = platoDe(sabe);
  if (!plato) { toast('Primero aprende a preparar algo 🧺'); return; }
  const pasos = pasosOlla(sabe);
  if (!pasos.length) { toast('La olla está vacía todavía'); return; }
  platoEnCurso = plato;
  initAudio();
  pararReloj();
  tiempoMs = 0;
  reiniciarRacha();
  alerta(null);
  pista(null);
  mostrar('juego');
  avisadaPorcion = false;
  Olla.arrancar(GANCHOS_OLLA, recordDe(plato), pasos, actosOlla(pasos));
  arrancarReloj();
  estado.intentos++;
  guardar();
}

/* EL RÉCORD ES POR PLATO. Una sopa de granos tiernos de minuto y
   medio y una fanesca de nueve minutos no se comparan: son dos
   comidas. `estado.ollas` guarda el mejor de cada peldaño y así
   volver a cocinar el mismo plato sigue siendo una carrera contra ti,
   mientras que subir de plato estrena marcador. */
const recordDe = (plato) => (plato && estado.ollas && estado.ollas[plato.id]) || null;

function cerrarOlla(resumen) {
  pararReloj();
  Olla.parar();
  const cartel = $('#acto-cartel'); if (cartel) { clearTimeout(cartelId); cartel.hidden = true; }
  if (resumen.completa) { sfx('fiesta'); buzz([20, 40, 20, 60]); }
  else sfx('tab');

  /* EL RÉCORD ES DE PARTIDAS TERMINADAS. Media fanesca en cuatro
     minutos no es un récord de cuatro minutos: es media fanesca. */
  const plato = platoEnCurso;
  const mejor = recordDe(plato);
  const esRecord = resumen.completa && plato && (!mejor || resumen.ms < mejor.ms);
  if (esRecord) {
    if (!estado.ollas) estado.ollas = {};
    estado.ollas[plato.id] = {
      plato: plato.id,
      ms: Math.round(resumen.ms), cucharas: resumen.cucharas,
      desastres: resumen.desastres, descuidos: resumen.descuidos,
      actos: resumen.actos, fecha: fechaLocal(),
    };
  } else if (mejor && resumen.completa) {
    mejor.cucharas = Math.max(mejor.cucharas || 1, resumen.cucharas);
  }
  guardar();

  setTimeout(() => {
    Motor.setActive(false);
    const cabecera = document.querySelector('#modal-olla .sheet-eyebrow');
    if (cabecera) cabecera.textContent = resumen.completa
      ? (plato ? plato.eyebrow : 'la olla está servida')
      : (resumen.porque === 'salida' ? 'lo dejaste ahí' : 'se cortó la partida');
    const tituloOlla = document.querySelector('#modal-olla .sheet-title');
    if (tituloOlla) tituloOlla.textContent = resumen.completa && plato ? `¡${plato.nombre}!` : 'La olla se quedó a medias';
    $('#olla-tiempo').textContent = relojDePartida(resumen.ms);
    $('#olla-tiempo-pie').textContent = resumen.completa
      ? (resumen.penalizacion ? `${relojDePartida(resumen.msLimpio)} de manos + ${Math.round(resumen.penalizacion / 1000)}s de penalización` : 'sin una sola penalización')
      : `llegaste hasta ${resumen.pasos} de ${resumen.de}`;

    /* las cucharas son de CALIDAD: cómo salió, no cuánto tardaste */
    $('#olla-cucharas').innerHTML = cucharasHTML(0);
    const huecos = $('#olla-cucharas').querySelectorAll('.cuchara');
    const cuch = resumen.completa ? resumen.cucharas : 0;
    for (let i = 0; i < cuch; i++) {
      setTimeout(() => { huecos[i].classList.add('llena', 'cae'); sfx('bien', 1 + i * 0.18); buzz(14); }, 280 + i * 230);
    }
    $('#olla-detalle').textContent = resumen.completa
      ? (resumen.desastres || resumen.descuidos
        ? `${resumen.desastres} desastre${resumen.desastres === 1 ? '' : 's'} · ${resumen.descuidos} descuido${resumen.descuidos === 1 ? '' : 's'}`
        : 'Ni un desastre ni un descuido')
      : 'La olla se quedó a medias.';
    $('#olla-mejor').textContent = esRecord
      ? (mejor ? `¡Nuevo récord! antes: ${relojDePartida(mejor.ms)}` : 'Tu primera fanesca completa')
      : (mejor ? `Tu récord sigue siendo ${relojDePartida(mejor.ms)}` : 'Termínala entera y tendrás récord');

    /* LAS MARCAS POR ACTO, que es donde se ve dónde se pierde el
       tiempo. Es la tabla que hace que alguien juegue la tercera
       partida: no basta con saber que tardaste, hay que saber dónde. */
    const tabla = $('#olla-actos');
    if (tabla) {
      const refs = (mejor && mejor.actos) || {};
      /* sólo los actos que esta partida jugó: con pocas bolsas no hay
         feria ni plato, y una fila con un guion no es información */
      tabla.innerHTML = OLLA_MODO.actos.filter(a => Number.isFinite(resumen.actos[a.id])).map(a => {
        const t = resumen.actos[a.id];
        if (!Number.isFinite(t)) return `<li class="olla-acto olla-acto--sin"><b>${a.ico} ${a.nombre}</b><span>—</span></li>`;
        const r = refs[a.id];
        const d = Number.isFinite(r) ? t - r : null;
        const marca = d == null ? '' : `<i class="${d <= 0 ? 'mejor' : 'peor'}">${d <= 0 ? '−' : '+'}${relojDePartida(Math.abs(d))}</i>`;
        return `<li class="olla-acto"><b>${a.ico} ${a.nombre}</b><span>${relojDePartida(t)} ${marca}</span></li>`;
      }).join('');
    }

    /* la escalera de logros, igual que en El Apuro: los conseguidos en
       color, los pendientes en gris con su meta. Sin la escalera a la
       vista no hay siguiente peldaño que perseguir. */
    const ya = estado.logrosOlla || (estado.logrosOlla = []);
    const nuevos = (resumen.logros || []).filter(l => !ya.includes(l.id));
    nuevos.forEach(l => ya.push(l.id));
    if (nuevos.length) guardar();
    const cajaL = $('#olla-logros');
    if (cajaL) {
      cajaL.innerHTML = OLLA_MODO.logros.map(l => {
        const esNuevo = nuevos.some(x => x.id === l.id);
        const hecho = ya.includes(l.id);
        return `<li class="logro${esNuevo ? ' logro--nuevo' : (hecho ? '' : ' logro--pendiente')}">
          <strong>${hecho ? l.titulo : '· ' + l.titulo}</strong>
          <span>${hecho ? l.texto : (l.meta || '')}</span></li>`;
      }).join('');
      nuevos.forEach((_, i) => setTimeout(() => sfx('bien', 1 + i * 0.12), 900 + i * 320));
    }

    $('#olla-otra').textContent = resumen.completa ? 'Otra vez, más rápido' : 'Volver a empezar';
    $('#modal-olla').classList.add('open');
    if (resumen.completa) celebrar(esRecord ? 54 : 30);
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

  /* LA HOJA ASOMA ENSEGUIDA. Esperaba 620 ms mirando un mesón ya
     terminado, y luego el redoble de cucharas tardaba otro segundo:
     entre una parada y la siguiente se iban casi cuatro segundos de
     nada. El respiro sigue —hay que ver caer el último grano— pero
     medido en un tercio, y el redoble va al doble de rápido. */
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
      }, 280 + i * 230);
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
    const clave = n.base || n.id;
    const tarjeta = TARJETAS[clave];
    const caja = $('#listo-nota');
    if (tarjeta) {
      /* la página se GANA aquí y se LEE en el cuaderno: lo que sale en
         la hoja de listo es un renglón diciendo que hay algo nuevo */
      const esNueva = !(estado.leidos || []).includes(clave);
      if (esNueva) { estado.leidos.push(clave); estado.cuadernoVisto = false; }
      [].concat(tarjeta.abre || []).forEach(abrirCapitulo);
      if (esNueva) guardar();
      caja.classList.toggle('hidden', !esNueva);
      if (esNueva) $('#listo-nota-titulo').textContent = tarjeta.titulo;
    } else caja.classList.add('hidden');

    /* el botón verde dice A DÓNDE va: al peldaño siguiente de esta
       misma bolsa, o —cuando la bolsa se acabó— a la despensa, que es
       donde está la noticia (una bolsa nueva abierta, un plato que
       subió de nombre) */
    const sig = siguienteEnBolsa(n.bolsa);
    const nueva = bolsaQueAbre(n);
    $('#listo-seguir').textContent = nueva
      ? `¡Se abrió ${nombreDeBolsa(nueva)}!`
      : (sig ? 'Siguiente nivel' : 'A la despensa');
    $('#modal-listo').classList.add('open');
    sfx('fiesta');
    /* tres cucharas merecen más papelitos que una */
    celebrar(cuch >= 3 ? 44 : (cuch === 2 ? 28 : 16));
    /* y mientras se lee, se va trayendo el que sigue */
    if (sig) precargarParada(sig);
  }, 240);
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
    /* y la frase de cocina del ingrediente, si la tiene: aquí no le
       quita el sitio a nada — el jugador está detenido a la fuerza */
    const notaEl = $('#arruinado-nota');
    if (notaEl) {
      const nota = nivelActual && nivelActual.nota;
      notaEl.textContent = nota || '';
      notaEl.classList.toggle('hidden', !nota);
    }
    $('#modal-arruinado').classList.add('open');
  }, 900);
}

function salirDelNivel() {
  /* corta cualquier montaje en vuelo: si se sale mientras un mesón
     estaba cargando, el que llegue tarde ya no tiene a quién servir */
  montaje++;
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
  tocable($('#btn-empezar'), () => {
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
    tocable(btnReset, () => {
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
    if (ver) tocable(ver, () => {
      clearTimeout(toquesId);
      toquesId = setTimeout(() => { toquesVersion = 0; }, 1600);
      if (++toquesVersion >= 5) {
        toquesVersion = 0;
        btnDev.classList.remove('hidden');
        toast('Modo dev a la vista 🛠');
      }
    });
    tocable(btnDev, () => {
      sfx('tab');
      estado.devMode = !estado.devMode;
      guardar();
      pintarDev();
      toast(estado.devMode ? 'Modo dev: todos los niveles abiertos 🛠' : 'Modo dev desactivado');
      if ($('#screen-mesa').classList.contains('active')) renderMesa();
    });
  }

  /* El Apuro: cerrado hasta saber tres ingredientes. Soltar a
     alguien que no ha jugado nada en un contrarreloj de mesones al
     azar es soltarlo a perder sin saber por qué; y con un solo gesto
     aprendido, un modo «sin fin» es el mismo nivel repetido. */
  tocable($('#btn-apuro'), () => {
    sfx('tab');
    const sabe = loQueSabe().size;
    if (sabe < 3 && !estado.devMode) {
      toast(`El Apuro se abre con tres ingredientes — sabes ${sabe}`);
      return;
    }
    arrancarApuro();
  });
  tocable($('#apuro-otra'), () => { sfx('tab'); cerrarModales(); arrancarApuro(); });
  tocable($('#apuro-salir'), () => { sfx('tab'); cerrarModales(); mostrar('mesa'); });
  tocable($('#olla-otra'), () => { sfx('tab'); cerrarModales(); arrancarOlla(); });
  tocable($('#olla-salir'), () => { sfx('tab'); cerrarModales(); mostrar('mesa'); });


  tocable($('#voz'), () => voz(null));

  /* «Sigue»: lo que renderMesa haya decidido que toca */
  tocable($('#btn-sigue'), () => {
    sfx('tab');
    if (sigueAccion) sigueAccion();
  });

  /* «?»: la última pista, otra vez. No cuesta nada — el reloj corre
     igual, que releer no es trampa. */
  tocable($('#btn-pista'), () => {
    sfx('tab');
    if (ultimaPista) pistaAhora(ultimaPista, duracionDe(ultimaPista));
  });
  tocable($('#btn-cuaderno'), () => { sfx('tab'); mostrar('cuaderno'); });
  /* el renglón de «se abrió una página» lleva DIRECTO a leerla: si
     obligara a cerrar la hoja, volver a la mesa y buscar el cuaderno,
     no la abriría nadie */
  tocable($('#listo-nota'), () => {
    sfx('tab');
    cerrarModales();
    Motor.descargar(); Motor.setActive(false);
    nivelActual = null; modActual = null;
    mostrar('cuaderno');
  });
  /* la hoja de la cocina: dónde se cocina, fuera del recetario */
  const btnCocina = $('#btn-cocina');
  if (btnCocina) tocable(btnCocina, () => { sfx('tab'); $('#modal-cocina').classList.add('open'); });
  const cocinaCerrar = $('#cocina-cerrar');
  if (cocinaCerrar) tocable(cocinaCerrar, () => { sfx('tab'); cerrarModales(); });
  tocable($('#cuaderno-volver'), () => { sfx('tab'); mostrar('mesa'); });
  /* la bolsa: volver a la despensa por arriba o por abajo, y el
     botón grande que juega el peldaño del cursor */
  ['#bolsa-volver', '#bolsa-volver-arriba'].forEach(sel => {
    const b = $(sel);
    if (b) tocable(b, () => { sfx('tab'); mostrar('mesa'); });
  });
  tocable($('#bolsa-sigue'), () => { if (bolsaAccion) bolsaAccion(); });
  const volverArriba = $('#cuaderno-volver-arriba');
  if (volverArriba) tocable(volverArriba, () => { sfx('tab'); mostrar('mesa'); });
  tocable($('#final-cuaderno'), () => { cerrarModales(); mostrar('cuaderno'); });

  let salirArmado = 0;
  tocable($('#btn-salir'), () => {
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
    /* y en La Olla con más razón: es una partida de nueve minutos y
       lo que se pierde al salir no es una ración, es la fanesca */
    if (Olla.activo) {
      if (Date.now() - salirArmado > 2600) {
        salirArmado = Date.now();
        toast('¿Dejar la fanesca a medias? Toca otra vez');
        return;
      }
      Olla.terminar('salida');
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

  tocable($('#listo-seguir'), () => {
    const n = nivelActual;
    cerrarModales();
    Motor.descargar();
    nivelActual = null; modActual = null;
    /* lo que venga ahora es una parada ENCADENADA: su tarjeta pasa
       corta, porque la mano ya está caliente */
    cadenaPendiente = true;
    /* SE ABRIÓ UNA BOLSA → a la despensa: estrenar un ingrediente es
       la noticia del juego y hay que verla en la mesa, con la bolsa
       nueva brillando. Es una de las dos escalas que el flujo se
       permite; entre peldaño y peldaño se sigue yendo directo. */
    const nueva = bolsaQueAbre(n);
    if (nueva) {
      mostrar('mesa');
      setTimeout(() => toast(`Bolsa nueva: ${nombreDeBolsa(nueva)} 🧺`), 500);
      return;
    }
    /* DIRECTO al siguiente peldaño de ESTA bolsa. Quien está en el
       choclo se quedó en el choclo a propósito. */
    const sig = n ? siguienteEnBolsa(n.bolsa) : null;
    if (!sig) {
      /* la bolsa se acabó: a su pantalla, con el sello puesto */
      if (n) { bolsaAbiertaId = n.bolsa; renderBolsa(); mostrar('bolsa'); }
      else mostrar('mesa');
      return;
    }
    jugar(sig.id);
  });
  tocable($('#listo-repetir'), () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    cadenaPendiente = true;
    if (id) jugar(id);
  });

  /* SEGUIR SIN BUSCAR EL BOTÓN. La hoja de «a la olla» se despacha
     con un empujón hacia arriba —el gesto de una consola: la hoja
     sale por donde entró— o con Enter en teclado. El botón sigue
     ahí para quien lo prefiera; esto es para quien ya lleva diez
     paradas y no quiere apuntar. */
  const hojaListo = $('#modal-listo .sheet');
  if (hojaListo) {
    let y0 = null, x0 = null, seguido = false;
    const empieza = (x, y, destino) => {
      /* sobre un botón no hay gesto (ese es su trabajo), y con la
         hoja desplazada tampoco: ahí subir es volver al principio de
         la tarjeta, no salir corriendo */
      if ((destino && destino.closest && destino.closest('button')) || hojaListo.scrollTop > 2) { y0 = null; return; }
      y0 = y; x0 = x; seguido = false;
    };
    const mueve = (x, y) => {
      if (y0 === null || seguido) return;
      /* hacia arriba, decidido y sin irse de lado: cualquier otra
         cosa es alguien leyendo la tarjeta con el dedo encima */
      if (y - y0 < -46 && Math.abs(x - x0) < 40) {
        seguido = true; y0 = null;
        sfx('tab'); buzz(10);
        $('#listo-seguir').click();
      }
    };
    const suelta = () => { y0 = null; };
    /* TOUCH y no sólo pointer: la hoja se desplaza por dentro
       (overflow-y), así que en cuanto el dedo sube el navegador se
       queda con el gesto y CANCELA los pointer events — el gesto no
       llegaba nunca. Los touch sí siguen llegando, en passive. */
    hojaListo.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) empieza(t.clientX, t.clientY, e.target); }, { passive: true });
    hojaListo.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) mueve(t.clientX, t.clientY); }, { passive: true });
    hojaListo.addEventListener('touchend', suelta, { passive: true });
    hojaListo.addEventListener('touchcancel', suelta, { passive: true });
    /* y con ratón, en escritorio, donde no hay quien cancele nada */
    hojaListo.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') empieza(e.clientX, e.clientY, e.target); });
    hojaListo.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') mueve(e.clientX, e.clientY); });
    hojaListo.addEventListener('pointerup', suelta);
  }

  tocable($('#arruinado-reintentar'), () => {
    const id = nivelActual ? nivelActual.id : null;
    cerrarModales();
    Motor.descargar();
    if (id) jugar(id);
  });
  tocable($('#arruinado-salir'), () => { cerrarModales(); salirDelNivel(); });

  tocable($('#final-ok'), () => { cerrarModales(); mostrar('mesa'); });
  /* un toque en la escena de la olla la salta: el altar ya está
     abierto debajo */
  const escOlla = $('#olla-escena');
  if (escOlla) escOlla.addEventListener('pointerdown', (e) => { e.preventDefault(); apagarEscenaOlla(true); });

  document.addEventListener('keydown', (e) => {
    /* con la hoja de listo abierta, Enter sigue: el gesto de teclado
       equivalente al empujón hacia arriba */
    if ((e.key === 'Enter' || e.key === ' ') && $('#modal-listo').classList.contains('open')) {
      e.preventDefault();
      $('#listo-seguir').click();
      return;
    }
    if (e.key === 'Escape') {
      if ($$('.modal.open').length) { cerrarModales(); return; }
      /* también con Escape el Apuro se CIERRA guardando: la salida
         directa era la única ruta del juego que tiraba a la basura
         raciones ganadas, sin resumen ni récord */
      if (Apuro.activo) { Apuro.terminar('salida'); return; }
      if (Olla.activo) { Olla.terminar('salida'); return; }
      if ($('#screen-juego').classList.contains('active')) salirDelNivel();
      else if ($('#screen-cuaderno').classList.contains('active')) mostrar('mesa');
    }
    /* las flechas del teclado pasan de pantalla, como el mando */
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !$$('.modal.open').length) {
      const paso = e.key === 'ArrowLeft' ? -1 : 1;
      if ($('#screen-cuaderno').classList.contains('active') && cuadernoCarrusel) { sfx('tab'); cuadernoCarrusel.irA(cuadernoCarrusel.i + paso); }
    }
  });

  /* el primer dedo sobre el mesón arranca el reloj de la campaña */
  $('#escena').addEventListener('pointerdown', () => {
    /* RED DE SEGURIDAD: pantalla de juego sin mesón montado. No
       debería pasar nunca (ver `montaje`), pero si pasa el jugador se
       queda tocando una escena muerta sin entender por qué, y desde
       ahí ninguna ficha del recetario responde — porque ya no está en
       el recetario. Al primer toque, se le devuelve a la mesa. */
    if (!modActual && !enModo() && $('#screen-juego').classList.contains('active')) {
      toast('Ese mesón no llegó a armarse — te devuelvo al recetario');
      salirDelNivel();
      return;
    }
    if (relojEnEspera) { relojEnEspera = false; arrancarReloj(); }
  }, { capture: true });

  /* el navegador se fue a otra pestaña: no correr el reloj de gratis */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && corriendo) { corriendo = false; }
    else if (!document.hidden && relojId && !corriendo) { arrancarReloj(); }
  });
}

/* ============================================================
   EL ALTAR — cuando la despensa se completa.

   Antes salía al terminar la semana: cuarenta y seis paradas y la
   olla al final del camino. Ahora la olla se cocina desde el primer
   día, así que este altar ya no puede ser «la olla»: es el momento en
   que la despensa se llena — sabes preparar los DIECIOCHO y lo que
   sale de tu olla ya se llama fanesca servida. Sale una sola vez.
   ============================================================ */
function mostrarFinal() {
  if (!estado.despensaVista) { estado.despensaVista = true; guardar(); }
  $('#final-eyebrow').textContent = 'la despensa, completa';
  $('#final-titulo').textContent = '¡Ya sabes hacer la fanesca entera!';
  $('#final-cuerpo').textContent = 'Los dieciocho pasaron por tus manos: grano por grano, vaina por vaina, del choclo que escogiste en la feria al maduro del plato. De aquí en adelante, lo que salga de tu olla es una fanesca servida.';
  /* la cuenta es de LO BÁSICO: un ingrediente por bolsa, que es lo
     que la olla pide. Los peldaños de más de una bolsa son de quien
     le tomó gusto a ese ingrediente y no son deuda de nadie. */
  const cuenta = RUTA.filter(n => n.id === basicoDe(n.bolsa));
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

  /* EL ATAJO DE AUTOR: `?dev` en la dirección prende el modo dev y
     `?dev=0` lo apaga, sin ritual de toques — para cuando el ritual
     falla (un teléfono que no da clics en lo que no es botón) o para
     abrir el juego ya abierto desde un enlace. */
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('dev')) {
      estado.devMode = q.get('dev') !== '0';
      guardar();
    }
  } catch (e) {}

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
  get ruta() { return RUTA.map(n => ({ id: n.id, bolsa: n.bolsa, num: n.num, dif: n.dificultad, base: n.base, intro: !!n.intro })); },
  api,
  Apuro, Olla, ORDEN_OLLA,
  arrancarOlla, mostrar, abrirBolsa, ORDEN_BOLSAS, PLATOS,
  /* lo que la despensa sabe hoy y qué se cocina con ello: es lo que
     hay que poder mirar desde fuera para probar la escalera */
  get sabe() { return [...loQueSabe()]; },
  get plato() { return platoDe(loQueSabe()); },
  pasosDeLaOlla: (sabe) => pasosOlla(sabe ? new Set(sabe) : loQueSabe()),
  sondear: (x, y) => Motor.sondear(x, y),
  puntos: () => ({ batea: Motor.proyectar(BATEA), composta: Motor.proyectar(COMPOSTA) }),
};

document.addEventListener('DOMContentLoaded', init);
