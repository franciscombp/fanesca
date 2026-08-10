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
  };
}
let estado = nuevoEstado();
function guardar() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(estado)); } catch (e) {} }
function cargar() {
  try {
    const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(SAVE_KEY_VIEJA);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return (s && typeof s === 'object') ? Object.assign(nuevoEstado(), s) : null;
  } catch (e) { return null; }
}

const estaListo = (id) => !!estado.mejores[id];
const listos = () => NIVELES.filter(n => estaListo(n.id)).length;

/* el siguiente se abre cuando el anterior ya fue a la olla; los
   ya hechos quedan siempre abiertos para bajarse el tiempo. En modo
   dev, todo está abierto: para probar una mecánica no hace falta
   jugarse los ingredientes anteriores primero. */
function desbloqueado(i) { return estado.devMode || i === 0 || estaListo(NIVELES[i - 1].id); }

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
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + pantalla));
  Motor.setActive(pantalla === 'juego');
  if (pantalla === 'mesa') { renderMesa(); marcaCuaderno(); }
  if (pantalla === 'cuaderno') { renderCuaderno(); estado.cuadernoVisto = true; guardar(); }
}

/* ---------- modo dev: todos los niveles abiertos, para probar mecánicas ---------- */

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

function renderMesa() {
  const hechos = listos();
  const todos = hechos >= NIVELES.length;
  const dias = (estado.dias && estado.dias.seguidos > 1) ? ` · 🔥${estado.dias.seguidos} días` : '';
  $('#mesa-progreso').textContent = `${hechos} / ${NIVELES.length}${dias}`;
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
  const centros = [];

  const nodoDe = (n, i, estadoNodo) => {
    const b = document.createElement('button');
    b.type = 'button';
    const x = XS[i % XS.length];
    const y = i * PASO + 76;
    centros.push({ x, y });
    b.className = 'nodo ' + estadoNodo;
    b.style.left = x + '%';
    b.style.top = y + 'px';
    b.style.animationDelay = Math.min(i * 0.045, 0.5) + 's';
    return b;
  };

  NIVELES.forEach((n, i) => {
    const abierto = desbloqueado(i);
    const mejor = estado.mejores[n.id];
    const esSiguiente = abierto && !mejor;
    const b = nodoDe(n, i, mejor ? 'nodo--hecho' : (esSiguiente ? 'nodo--siguiente' : 'nodo--bloqueado'));
    b.innerHTML = `
      <span class="nodo-plato">${icono(n.icono)}</span>
      ${!abierto && !mejor ? '<span class="nodo-candado" aria-hidden="true">🔒</span>' : ''}
      ${mejor ? `<span class="nodo-cucharas">${cucharasHTML(mejor.cucharas)}</span>` : ''}
      <span class="nodo-nombre">${n.nombre.replace(/^(El|La|Los|Las)\s/, '')}</span>`;
    b.setAttribute('aria-label', n.nombre + (abierto ? '' : ' (bloqueado)'));
    b.addEventListener('click', () => {
      sfx('tab');
      if (!abierto) { toast('Primero ' + NIVELES[i - 1].nombre.toLowerCase() + ' 👆'); return; }
      /* rejugarlo no necesita instrucciones: directo a la mesa. El
         brief queda para la primera vez, que es cuando enseña algo */
      if (mejor) jugar(n.id);
      else abrirBrief(n.id);
    });
    lista.appendChild(b);
  });

  /* la olla, al final del camino */
  const olla = nodoDe(OLLA, NIVELES.length, todos ? 'nodo--olla' : 'nodo--olla nodo--bloqueado');
  olla.innerHTML = `
    <span class="nodo-plato nodo-plato--olla">${icono(OLLA.icono)}</span>
    ${todos ? '' : '<span class="nodo-candado" aria-hidden="true">🔒</span>'}
    <span class="nodo-nombre">${todos ? '¡A cocinar!' : `La olla · faltan ${NIVELES.length - hechos}`}</span>`;
  olla.addEventListener('click', () => {
    sfx('tab');
    if (!todos) { toast(`La olla se abre con los doce — faltan ${NIVELES.length - hechos}`); return; }
    mostrarFinal();
  });
  lista.appendChild(olla);

  /* el sendero dibujado: un tramo por par de nodos, y los tramos ya
     recorridos van en dorado — el progreso se ve en el propio camino */
  const alto = centros[centros.length - 1].y + 120;
  lista.style.height = alto + 'px';
  const tramos = centros.slice(1).map((c, i) => {
    const a = centros[i];
    const hecho = i < hechos;
    const d = `M ${a.x} ${a.y} C ${a.x} ${a.y + 66}, ${c.x} ${c.y - 66}, ${c.x} ${c.y}`;
    /* dos trazos por tramo: la base ancha es la tierra del sendero,
       las rayas de encima son las baldosas — sobre el mantel a
       cuadros, un solo trazo punteado se perdía */
    return `<path class="tramo-base" d="${d}"/><path class="tramo ${hecho ? 'tramo--hecho' : ''}" d="${d}"/>`;
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
     que hacer scroll para encontrar dónde seguir */
  const scrollMesa = document.querySelector('#screen-mesa .scroll');
  const nodoSig = lista.querySelector('.nodo--siguiente') || lista.querySelector('.nodo--olla');
  if (scrollMesa && nodoSig) {
    requestAnimationFrame(() => {
      scrollMesa.scrollTop = Math.max(0, nodoSig.offsetTop - scrollMesa.clientHeight * 0.45);
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

/* ---------- el brief antes de cada nivel ---------- */

let nivelPendiente = null;

function abrirBrief(id) {
  const n = porId(id);
  nivelPendiente = id;
  const mejor = estado.mejores[id];
  $('#brief-art').innerHTML = `<span class="plate">${icono(n.icono)}</span>`;
  $('#brief-tarea').textContent = n.tarea;
  $('#brief-nombre').textContent = n.nombre;
  $('#brief-gesto').innerHTML = n.gesto;
  $('#brief-bicho').innerHTML = `🪱 Si sale <b>${n.bicho}</b>: pellízcalo y a la composta. No lo aplastes.`;
  $('#brief-nota').textContent = n.nota || '';
  $('#brief-mejor').textContent = mejor
    ? `Tu mejor tiempo: ${tiempoBonito(mejor.ms)} · ${mejor.cucharas} cuchara${mejor.cucharas > 1 ? 's' : ''}`
    : `3 cucharas si bajas de ${n.cucharas[0]}s`;
  $('#modal-brief').classList.add('open');
}

/* ---------- el nivel en curso ---------- */

let nivelActual = null;      /* datos de niveles.js */
let modActual = null;        /* el módulo cargado */
let t0 = 0, tiempoMs = 0, corriendo = false, relojId = null;
let hechosAhora = 0, totalAhora = 1;

/* El reloj se ve mientras se juega: de él salen las cucharas, así que
   esconderlo era pedirle al jugador que corriera contra un número
   secreto. Se detiene solo mientras se lee una cita —ahí la prisa sí
   sobra— y se vuelve a contar entero en el modal de listo. */
function pintarReloj() {
  const el = $('#hud-tiempo');
  el.textContent = tiempoBonito(tiempoMs);
}

function arrancarReloj() {
  t0 = performance.now() - tiempoMs;
  corriendo = true;
  clearInterval(relojId);
  relojId = setInterval(() => {
    if (!corriendo) return;
    tiempoMs = performance.now() - t0;
    pintarReloj();
    /* el marcador vive en este mismo latido: no hace falta meterse en
       el bucle de render del motor para algo que cambia doce veces
       por segundo y no es 3D */
    colocarCuencos();
    pintarRitmo();
  }, 83);
}
function pararReloj() { corriendo = false; clearInterval(relojId); relojId = null; }

let pistaId = null;
function pista(msg, ms = 3200) {
  const p = $('#juego-pista');
  if (!msg) { p.classList.remove('visible'); return; }
  p.innerHTML = msg;
  p.classList.add('visible');
  clearTimeout(pistaId);
  if (ms) pistaId = setTimeout(() => p.classList.remove('visible'), ms);
}

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
    const k = Math.max(0, Math.min(1, hechos / totalAhora));
    const barra = $('#hud-barra');
    barra.style.width = (k * 100) + '%';
    const pct = $('#hud-pct');
    if (pct) pct.textContent = Math.round(k * 100) + '%';
    Motor.llenarRecipiente('batea', k);
    if (subio) {
      racha(cuanto, k);
      puntosFlotantes(cuanto);
      marcarPasos(k);
    }
  },
  composta(k) { Motor.llenarRecipiente('composta', Math.max(0, Math.min(1, k))); },
  completar() { if (corriendo) terminarNivel(); },
  arruinar(motivo) { if (corriendo) arruinarNivel(motivo); },
  aviso: alerta,
  pista,
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

/* ============================================================
   EL MARCADOR DE LA COCINA
   Los cuencos cuentan, los pasos se tachan, el ritmo se mide y el
   camino de los doce se ve sin salir del nivel. Todo cuelga de datos
   que el juego ya tenía; ningún nivel tuvo que aprender nada nuevo.
   ============================================================ */

/* los chips van pegados a los cuencos DEL MUNDO: se reproyectan cada
   cuadro porque la cámara de cada nivel es distinta */
function colocarCuencos() {
  const caja = $('#hud-cuencos');
  if (!caja || !Motor.camara || !nivelActual) return;
  const poner = (id, v3) => {
    const el = $(id);
    if (!el) return;
    /* bien por encima del cuenco: a media altura los chips caían
       sobre el borde y se los comía la pista */
    const p = Motor.proyectar(v3.clone().setY(MESA_Y + 0.95));
    /* y dentro de la pantalla: proyectados a pelo se salían por el
       filo izquierdo y se metían debajo del panel de pasos */
    const w = el.offsetWidth || 90;
    const min = w / 2 + 6;
    const max = (window.innerWidth || 390) - w / 2 - 6;
    el.style.left = Math.max(min, Math.min(max, p.x)) + 'px';
    el.style.top = Math.max(56, p.y - 6) + 'px';
    el.classList.add('visible');
  };
  try { poner('#cuenco-batea', BATEA); poner('#cuenco-composta', COMPOSTA); } catch (e) {}
}

function pintarCuencos(c) {
  const b = $('#cuenco-batea'), m = $('#cuenco-composta');
  if (!b || !m || !nivelActual) return;
  const bueno = (nivelActual.cuenta || 'listo').toUpperCase();
  b.innerHTML = `<b>${c.batea}</b><i>${bueno}</i>`;
  m.innerHTML = `<b>${c.composta}</b><i>CÁSCARAS</i>`;
  [[b, c.batea], [m, c.composta]].forEach(([el, n]) => {
    if (!n) return;
    el.classList.remove('brinca'); void el.offsetWidth; el.classList.add('brinca');
  });
}

/* PERFECTO / BIEN / REGULAR / LENTO: la aguja corre contra los mismos
   umbrales con los que se ganan las cucharas, así que el reloj por fin
   dice algo. Es la mitad buena del "score attack" sin romper que la
   faena se termina. */
function pintarRitmo() {
  const caja = $('#hud-ritmo');
  if (!caja || !nivelActual || !nivelActual.cucharas) return;
  const [tres, dos, uno] = nivelActual.cucharas;
  /* el tiempo que llevas, proyectado a la faena entera: si sigues a
     este paso, ¿en cuánto acabas? */
  const k = Math.max(0.06, hechosAhora / (totalAhora || 1));
  const proyectado = (tiempoMs / 1000) / k;
  const tramo = proyectado <= tres ? 0 : proyectado <= dos ? 1 : proyectado <= uno ? 2 : 3;
  const dentro = tramo === 0 ? proyectado / tres
    : tramo === 1 ? (proyectado - tres) / (dos - tres)
    : tramo === 2 ? (proyectado - dos) / (uno - dos) : 0.5;
  const x = (tramo + Math.max(0, Math.min(1, dentro))) * 25;
  const aguja = $('#ritmo-aguja');
  if (aguja) aguja.style.left = Math.max(2, Math.min(98, x)) + '%';
  caja.classList.add('visible');
}

/* los pasos del nivel, a la derecha, tachándose solos */
function renderPasos(n) {
  const caja = $('#hud-pasos');
  if (!caja) return;
  const pasos = n.pasos || null;
  if (!pasos) { caja.classList.remove('visible'); caja.innerHTML = ''; return; }
  caja.innerHTML = pasos.map((p, i) =>
    `<div class="paso" data-i="${i}"><span class="paso-ico">${p.ico}</span><span class="paso-txt">${p.txt}</span></div>`).join('');
  caja.classList.add('visible');
  marcarPasos(0);
}

function marcarPasos(k) {
  const caja = $('#hud-pasos');
  if (!caja || !nivelActual || !nivelActual.pasos) return;
  const pasos = nivelActual.pasos;
  caja.querySelectorAll('.paso').forEach((el, i) => {
    const desde = pasos[i].desde || 0;
    const hasta = i + 1 < pasos.length ? (pasos[i + 1].desde || 1) : 1.01;
    el.classList.toggle('paso--hecho', k >= hasta);
    el.classList.toggle('paso--activo', k >= desde && k < hasta);
  });
}

/* el camino de los doce, en chiquito, mientras cocinas */
function renderRiel(actual) {
  const riel = $('#hud-riel');
  if (!riel) return;
  riel.innerHTML = NIVELES.map(n => {
    const hecho = estaListo(n.id);
    const ahora = n.id === actual;
    const cls = ahora ? 'riel-item riel-item--ahora' : hecho ? 'riel-item riel-item--hecho' : 'riel-item riel-item--porvenir';
    const marca = hecho ? '<span class="riel-marca">✓</span>' : '';
    return `<div class="${cls}"><span class="riel-plato">${icono(n.icono)}</span><span class="riel-txt">${n.nombre.replace(/^(El|La|Los|Las) /, '')}</span>${marca}</div>`;
  }).join('');
  const act = riel.querySelector('.riel-item--ahora');
  if (act) riel.scrollLeft = Math.max(0, act.offsetLeft - riel.clientWidth / 2 + act.offsetWidth / 2);
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
  const n = porId(id);
  if (!n) return;
  nivelActual = n;
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
  renderPasos(n);
  renderRiel(n.id);
  pintarCuencos({ batea: 0, composta: 0 });
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
  Motor.cargar(modActual, api);
  renderControles(modActual);
  pista(n.gesto, 5200);
  arrancarReloj();
  estado.intentos++;
  guardar();
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
    $('#listo-nombre').textContent = n.nombre + ' a la olla';
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
    const tarjeta = TARJETAS[n.id];
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

    const quedan = NIVELES.some(x => !estaListo(x.id));
    $('#listo-seguir').textContent = quedan ? 'Siguiente ingrediente' : 'Servir la fanesca';
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
  $('#btn-empezar').addEventListener('click', () => {
    initAudio(); sfx('tab');
    estado.vistoPortada = true; guardar();
    mostrar('mesa');
  });

  const btnDev = $('#btn-dev');
  if (btnDev) btnDev.addEventListener('click', () => {
    sfx('tab');
    estado.devMode = !estado.devMode;
    guardar();
    pintarDev();
    toast(estado.devMode ? 'Modo dev: todos los niveles abiertos 🛠' : 'Modo dev desactivado');
    if ($('#screen-mesa').classList.contains('active')) renderMesa();
  });

  $('#brief-ok').addEventListener('click', () => {
    cerrarModales();
    if (nivelPendiente) jugar(nivelPendiente);
  });
  $('#brief-cancelar').addEventListener('click', cerrarModales);
  $('#modal-brief').addEventListener('click', (e) => { if (e.target === $('#modal-brief')) cerrarModales(); });

  $('#voz').addEventListener('click', () => voz(null));
  $('#btn-cuaderno').addEventListener('click', () => { sfx('tab'); mostrar('cuaderno'); });
  $('#cuaderno-volver').addEventListener('click', () => { sfx('tab'); mostrar('mesa'); });
  $('#final-cuaderno').addEventListener('click', () => { cerrarModales(); mostrar('cuaderno'); });

  let salirArmado = 0;
  $('#btn-salir').addEventListener('click', () => {
    sfx('tab');
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
    const sig = NIVELES.find(x => !estaListo(x.id));
    Motor.descargar();
    nivelActual = null; modActual = null;
    if (!sig) { mostrar('mesa'); setTimeout(mostrarFinal, 300); return; }
    /* DIRECTO al siguiente, sin escala en la mesa. La escala rompía
       la seguidilla — que es exactamente lo que un juego casual debe
       proteger: terminar un nivel tiene que desembocar en el
       siguiente sin darle a la mano dónde soltarse. Si el nivel es
       nuevo, su brief ES la transición; si ya se jugó, ni eso. */
    if (estado.mejores[sig.id]) { jugar(sig.id); }
    else { mostrar('mesa'); abrirBrief(sig.id); }
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
      if ($('#screen-juego').classList.contains('active')) salirDelNivel();
      else if ($('#screen-cuaderno').classList.contains('active')) mostrar('mesa');
    }
  });

  /* el navegador se fue a otra pestaña: no correr el reloj de gratis */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && corriendo) { corriendo = false; }
    else if (!document.hidden && relojId && !corriendo) { arrancarReloj(); }
  });
}

function mostrarFinal() {
  const total = NIVELES.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].ms : 0), 0);
  const cuch = NIVELES.reduce((a, n) => a + (estado.mejores[n.id] ? estado.mejores[n.id].cucharas : 0), 0);
  $('#final-cierre').textContent = CIERRE;
  $('#final-voz').innerHTML = `«${CACUANGO_PARAMO.texto}»<span>${CACUANGO_PARAMO.quien}</span>`;
  $('#final-total').textContent = `${cuch} de ${NIVELES.length * 3} cucharas · ${tiempoBonito(total)} en total`;
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
  /* el motor avisa qué cayó en cada cuenco y el marcador lo pinta */
  if (ok) Motor.alCuenco(pintarCuencos);
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
  mostrar(estado.vistoPortada ? 'mesa' : 'portada');
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
  sondear: (x, y) => Motor.sondear(x, y),
  puntos: () => ({ batea: Motor.proyectar(BATEA), composta: Motor.proyectar(COMPOSTA) }),
};

document.addEventListener('DOMContentLoaded', init);
