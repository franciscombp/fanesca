/* ============================================================
   FANESCA — nivel-mani.js
   MAJAR EN LA PIEDRA.

   El último gesto que le falta a esta cocina, y el más antiguo: el
   <b>vaivén</b>. La mano de piedra va y viene sobre la losa, y el
   maní se va rindiendo pasada tras pasada hasta volverse pasta.

   Lo que lo hace distinto de todo lo demás no es la fuerza: es que
   el grano <b>huye</b>. Cada pasada empuja los granos hacia la
   orilla, y en la orilla la mano ya no los alcanza. Así que moler
   no es repetir el mismo movimiento: es ir y venir, y cada tanto
   arrimar de vuelta al centro lo que se escapó. Cualquiera que
   haya molido en piedra lo sabe con el hombro.

     · arrastrar a lo largo de la piedra → la mano muele lo que pisa
     · arrastrar de la orilla al centro  → arrima lo que se escapó
     · arrastrar desde el gorgojo        → a la composta

   No hay atajo rápido en este nivel, y es a propósito: es el que
   cierra los doce, y el que dice que aquí lo que se pide no es
   maña sino insistencia.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { LARGO_PIEDRA, ANCHO_PIEDRA } from './modelos/mani.js';

let THREE, raiz, api;

let CUANTOS = 16;                /* granos de maní sobre la piedra */
let PIEDRA_Z = 0;
const ALTO_LOSA = 0.2;           /* la cara de la losa sobre el mesón */
const HONDO_PIEDRA = ANCHO_PIEDRA;

const RADIO_MANO = 0.26;         /* lo que la mano de piedra abarca */
/* cuánto vaivén aguanta un grano antes de rendirse */
let MOLIENDA = 1.15;
/* Las tres piedras de la campaña. La dureza se sube por aguante y no
   por el radio de la mano ni por el empuje: una molienda difícil es la
   que pide más pasadas, no la que vuelve el gesto torpe. Tocar el radio
   habría hecho lo segundo — el jugador fallaría el grano en vez de
   insistir sobre él, que es justo lo que este nivel quiere enseñar. */
const MOLIENDAS = [0.7, 1.15, 1.7];
/* Por debajo de esto el dedo no muele: tiembla. Hoy sólo descarta el
   ruido del puntero, pero es el mismo umbral con el que se le puede
   exigir un vaivén de verdad, porque manda sobre las dos cosas que un
   arrastre lento no debería regalar: la molida y la cuenta de pasadas. */
let PASO_MINIMO = 1e-5;
/* la orilla donde ya no muerde: el grano queda ahí, a la vista y
   fuera de juego, hasta que se lo arrime */
const ORILLA_X = LARGO_PIEDRA * 0.4;
const ORILLA_Z = ANCHO_PIEDRA * 0.3;
let CON_GORGOJO = 2;

let piedra = null, mano = null, granosGrupo = null;
let granos = [];                 /* {obj, molido, hecho} */
let plaga = null;
let hechos = 0;
let pasadas = 0;
let sentido = 0;
let modo = null;
let ultimoPunto = null;
let avisadoOrilla = false;
let pellizcando = false;
let terminado = false;

function caraLosa() { return api.MESA_Y + ALTO_LOSA; }

function nuevoGrano(x, z, i) {
  const g = api.pieza('mani', { variante: i });
  g.position.set(x, caraLosa() + 0.045, z);
  g.rotation.y = Math.random() * Math.PI;
  g.userData = { tipo: 'mani' };
  return { obj: g, molido: 0, hecho: false };
}

/* ¿este grano quedó fuera del alcance de la mano? */
function enOrilla(rec) {
  return Math.abs(rec.obj.position.x) > ORILLA_X || Math.abs(rec.obj.position.z - PIEDRA_Z) > ORILLA_Z;
}

function moler(rec, cuanto) {
  if (rec.hecho) return;
  rec.molido = Math.min(MOLIENDA, rec.molido + cuanto);
  const k = rec.molido / MOLIENDA;
  /* se aplasta a la vista: baja y se despatarra */
  rec.obj.scale.set(1 + k * 0.5, Math.max(0.12, 1 - k * 0.85), 1 + k * 0.35);
  rec.obj.position.y = caraLosa() + 0.045 * (1 - k * 0.8);
  if (rec.molido < MOLIENDA) return;

  rec.hecho = true;
  rec.obj.userData.tipo = null;
  granosGrupo.remove(rec.obj);

  /* donde estaba el grano queda su mancha de pasta */
  const pasta = api.pieza('mani-pasta', { radio: 0.085 + Math.random() * 0.03 });
  pasta.position.set(rec.obj.position.x, caraLosa() + 0.008, rec.obj.position.z);
  pasta.rotation.y = Math.random() * Math.PI;
  pasta.userData = { tipo: null, ignorar: true };
  granosGrupo.add(pasta);
  rec.pasta = pasta;

  hechos++;
  api.sfx(hechos % 2 ? 'crack' : 'pop2');
  api.buzz(14);
  api.chispas(pasta.position.clone().setY(caraLosa() + 0.1), '#e8c98a', 5, 0.6);
  api.progreso(hechos, CUANTOS);
  revisarFinal();
}

/* la mano empuja lo que pisa: por eso el grano se arrima o se escapa */
function empujar(rec, dx, dz) {
  const p = rec.obj.position;
  p.x = Math.max(-LARGO_PIEDRA / 2 + 0.08, Math.min(LARGO_PIEDRA / 2 - 0.08, p.x + dx * 0.55));
  p.z = Math.max(PIEDRA_Z - HONDO_PIEDRA / 2 + 0.08, Math.min(PIEDRA_Z + HONDO_PIEDRA / 2 - 0.08, p.z + dz * 0.55));
}

function pasar(p, dx, dz) {
  if (!p) return;
  const bicho = plaga.cercaDe(p, 0.17);
  if (bicho) { plaga.aplastar(bicho); return; }

  /* la mano de piedra sigue al dedo, sin salirse de la losa */
  mano.position.x = Math.max(-LARGO_PIEDRA / 2 + 0.12, Math.min(LARGO_PIEDRA / 2 - 0.12, p.x));
  mano.position.z = Math.max(PIEDRA_Z - HONDO_PIEDRA / 2 + 0.1, Math.min(PIEDRA_Z + HONDO_PIEDRA / 2 - 0.1, p.z));
  mano.rotation.z -= dx * 2.2;   /* rueda: no se desliza como un jabón */

  const paso = Math.hypot(dx, dz);
  if (paso < PASO_MINIMO) return;

  /* la pasada: cada vez que el vaivén cambia de sentido suma una, y
     con ella sube el tono. Es el metrónomo del nivel. */
  const s = Math.sign(dx);
  if (s !== 0 && sentido !== 0 && s !== sentido) {
    pasadas++;
    api.sfx('frotar');
    api.buzz(6);
  }
  if (s !== 0) sentido = s;

  let algunoEnOrilla = false;
  for (const rec of granos) {
    if (rec.hecho) continue;
    const d = Math.hypot(rec.obj.position.x - mano.position.x, rec.obj.position.z - mano.position.z);
    if (d > RADIO_MANO) { if (enOrilla(rec)) algunoEnOrilla = true; continue; }
    empujar(rec, dx, dz);
    /* en la orilla la mano lo roza pero no lo muele: solo lo arrima */
    if (enOrilla(rec)) { algunoEnOrilla = true; continue; }
    moler(rec, paso);
  }

  if (algunoEnOrilla && !avisadoOrilla && hechos > 2) {
    avisadoOrilla = true;
    api.pista('Se te escaparon a la orilla. <b>Arrímalos al centro</b>: ahí la piedra no muerde.', 3800);
  }
}

function revisarFinal() {
  if (terminado || hechos < CUANTOS) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  /* la pasta se recoge de la piedra y se va entera a la olla */
  granos.forEach((rec, i) => {
    if (!rec.pasta || !rec.pasta.parent) return;
    rec.pasta.userData.escalaBase = rec.pasta.scale.x;
    api.volarA(rec.pasta, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.42 + (i % 5) * 0.04, alto: 0.55 });
  });
  api.sfx('bien');
  api.completar();
}

export default {
  id: 'mani',
  camara: { pos: [0, 2.76, 3.48], mira: [0, 0.97, 0.44] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    CUANTOS = cfg.cantidad ?? 16;
    MOLIENDA = MOLIENDAS[cfg.resistencia ?? 1] ?? 1.15;
    /* el umbral viaja en unidades de la losa por evento de arrastre, no
       en metros por segundo: es la misma vara con la que se mide el
       avance de la molienda, y compararlas en escalas distintas sería
       prometer una exigencia que el nivel no aplicaría */
    /* `velocidad_minima` viene como un dial de 0 a 1, no en unidades
       de mundo. Tomarla cruda ponía el umbral en 0.2 —lo que el dedo
       recorre en SEIS eventos de cruzar la losa entera— y la parada
       rápida habría sido literalmente injugable. Se mapea a un rango
       que sí quiere decir algo aquí, y sin config se queda en el
       filtro de ruido de siempre. */
    PASO_MINIMO = 1e-5 + (cfg.velocidad_minima ?? 0) * 0.05;
    CON_GORGOJO = cfg.gusanos ?? 2;
    PIEDRA_Z = api.FRENTE_TABLA - HONDO_PIEDRA / 2;
    granos = []; hechos = 0; pasadas = 0; sentido = 0;
    modo = null; ultimoPunto = null; avisadoOrilla = false;
    pellizcando = false; terminado = false;

    piedra = api.pieza('piedra-moler', { largo: LARGO_PIEDRA, ancho: ANCHO_PIEDRA });
    piedra.position.set(0, api.MESA_Y + 0.14, PIEDRA_Z);
    piedra.userData = { tipo: 'piedra' };
    raiz.add(piedra);

    granosGrupo = new THREE.Group();
    raiz.add(granosGrupo);

    /* los granos, amontonados en el hueco de la piedra: es donde los
       pone quien va a moler, no repartidos con escuadra */
    for (let i = 0; i < CUANTOS; i++) {
      const a = i * 2.399963;
      const r = Math.sqrt((i + 0.5) / CUANTOS) * 0.42;
      const rec = nuevoGrano(Math.cos(a) * r * 1.5, PIEDRA_Z + Math.sin(a) * r, i);
      granosGrupo.add(rec.obj);
      granos.push(rec);
    }

    mano = api.pieza('mano-piedra');
    mano.position.set(-LARGO_PIEDRA * 0.32, caraLosa() + 0.1, PIEDRA_Z);
    mano.userData = { tipo: 'mano' };
    mano.add(api.sombraBlob(0.5, -0.09));
    raiz.add(mano);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.13, gracia: 1.8,
      /* la losa es más alta que una tabla de picar: si el bicho
         caminara a la altura del mesón se hundiría en la piedra */
      superficie: (x, z) => (Math.abs(x) < LARGO_PIEDRA / 2 && Math.abs(z - PIEDRA_Z) < HONDO_PIEDRA / 2)
        ? caraLosa() : api.MESA_Y,
    });

    this._sueltos = 0;
    api.progreso(0, CUANTOS);
    api.pista('La mano de piedra <b>va y viene</b>. Arrastra a lo largo, sin prisa.', 4200);
  },

  objetivos() { return [granosGrupo, plaga.grupo, piedra, mano]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    api.sfx('resist');
    api.pista('Un golpe no muele. <b>Arrastra</b> la piedra de un lado al otro.', 2800);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    /* Agarrar por cercanía EN PANTALLA, como el pellizco. Exigir que
       el rayo acierte la malla exacta de un bicho de un centímetro
       hacía que "arrastrar desde él" fallara la mitad de las veces y
       el dedo terminara barriendo POR ENCIMA del bicho que intentaba
       salvar — el gesto correcto castigado por puntería. */
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y, 62);
    if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    modo = 'moler';
    sentido = 0;
    ultimoPunto = api.puntoEnPlano(caraLosa());
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'moler') return;

    const p = api.puntoEnPlano(caraLosa());
    const prev = ultimoPunto;
    ultimoPunto = p;
    if (!p || !prev) return;
    pasar(p, p.x - prev.x, p.z - prev.z);
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; ultimoPunto = null; sentido = 0;
  },

  alPellizcarInicio(info) {
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y);
    if (rec && plaga.agarrar(rec)) pellizcando = true;
  },
  alPellizcarMover() {
    if (!pellizcando) return;
    plaga.mover(api.puntoEnPlano(api.MESA_Y));
  },
  alPellizcarFin() {
    if (!pellizcando) return;
    pellizcando = false;
    plaga.soltarMano();
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    if (this._sueltos < CON_GORGOJO) {
      /* los dos gorgojos de siempre salían a un tercio y a dos tercios
         de la molienda; con más bichos se reparten dentro de esa misma
         franja en vez de estirarse hacia el final, donde el jugador ya
         tiene la pasta lista y un bicho tardío sólo es peaje. Los
         extremos se escriben tal cual y no salen de la interpolación
         porque 0.3 + 0.35 no da 0.65 en coma flotante, y el nivel de
         hoy debe soltarlos en el mismo grano que soltaba ayer. */
      const reparto = CON_GORGOJO > 1 ? this._sueltos / (CON_GORGOJO - 1) : 0;
      const umbral = CUANTOS * (reparto === 0 ? 0.3 : reparto === 1 ? 0.65 : 0.3 + 0.35 * reparto);
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = granos.filter(g => !g.hecho);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, caraLosa(), PIEDRA_Z);
        plaga.soltar('gorgojo', donde);
      }
    }

    /* la mano descansa apoyada, con su peso: sin esto flota */
    if (mano) mano.position.y = caraLosa() + 0.1 + Math.sin(t * 3) * 0.002;
  },

  destruir() {
    if (plaga) plaga.destruir();
    granos = []; plaga = null; piedra = null; mano = null; granosGrupo = null;
    modo = null; ultimoPunto = null; pellizcando = false; terminado = false;
  },
};
