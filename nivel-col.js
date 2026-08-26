/* ============================================================
   FANESCA — nivel-col.js
   ENROLLAR Y CORTAR EN TIRAS.

   Dos tiempos, como en la cocina. Primero la hoja se <b>enrolla</b>
   —el dedo la va empujando de una orilla a la otra hasta que queda
   un cigarro— y recién entonces se <b>corta al través</b>, tajada
   por tajada, avanzando desde la punta.

   La regla que hace al nivel es la misma que le grita cualquier
   cocinera a quien pica col por primera vez: <b>más finita</b>. Una
   tajada gruesa también es una tajada, así que cortar a lo bestia
   no te frena en el acto — te frena después, porque el rollo se te
   acaba a la mitad de lo que necesitas y toca traer otra col. El
   castigo por apurarse no es un cartel: es más trabajo.

     · arrastrar de lado a lado sobre la hoja → se enrolla
     · cruzar el rollo con el dedo            → una tira
     · cuanto más cerca de la punta cortes    → más finita

   Y entre hoja y hoja se esconde un gusano del color exacto de la
   col. Cruzar el rollo sin mirar es cómo se te va a la olla.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { ANCHO_HOJA, LARGO_HOJA } from './modelos/col.js';

let THREE, raiz, api;

/* La col no se cuenta en hojas. Aquí la hoja no es la pieza del
   nivel sino el material: vienen las que hagan falta y cuántas gastes
   es cosa tuya, no del enunciado — de eso trata el nivel entero. Lo
   que la olla pide es picado, así que la cuenta va en tiras y una col
   vale las de siempre. */
const TIRAS_POR_COL = 24;
let OBJETIVO = TIRAS_POR_COL;    /* tiras que pide la olla */
const HONDO_TABLA = 1.7;
const ANCHO_TABLA = 3.1;
let TABLA_Z = 0;
const ALTO = 0.14;

/* cuánto mundo hay que empujar de lado para enrollar una hoja */
let ENROLLADO = ANCHO_HOJA * 0.68;
/* La col apretada no cede a la primera: hay que pasarle el dedo de
   orilla a orilla más veces. Se descartó hacerla resistir por tiempo
   —eso premiaría dejar la yema apoyada encima, que no es enrollar— y
   se dejó lo que el gesto ya medía: centímetros de dedo. La tabla va
   en fracción del ancho de la hoja y no en mundo, para que siga
   queriendo decir lo mismo el día que la col cambie de tamaño. */
const ENROLLADO_POR_RESISTENCIA = [0.44, 0.68, 1.04];
/* el corte: lo que se considera fino, y lo máximo que el cuchillo
   se lleva de una vez (más que esto es un trozo, no una tira) */
let FINA = 0.1;
let GRUESA = 0.24;
const MAX_TAJADA = 0.34;
/* Pedir el corte fino no cambia el cuchillo: cambia la vara. Qué
   tajada se celebra y a partir de cuál te gritan. Por eso MAX_TAJADA
   se queda fuera de la tabla — bajarlo haría que el corte a lo bestia
   se llevara MENOS rollo, o sea que la parada exigente costaría menos
   col que la fácil, justo al revés de lo que promete su nombre. */
const VARA_DEL_CORTE = {
  grueso: { fina: 0.1, gruesa: 0.24 },
  fino: { fina: 0.07, gruesa: 0.16 },
};
const SOBRA = 0.1;               /* el cabito que ya no se puede cortar */
let CON_GUSANO = 2;

let colGrupo = null;
let plaga = null;
let hoja = null;                 /* {obj, lamina, enrollado} mientras se enrolla */
let rollo = null;                /* {obj, cil, punta, largo, z0} mientras se corta */
let hojasUsadas = 0;
let tiras = 0;
let finas = 0;
let gruesas = 0;
let modo = null;
let ultimoPunto = null;
let pellizcando = false;
let terminado = false;

/* ---------- la hoja ---------- */

function ponerHoja() {
  const g = api.pieza('col-hoja', { variante: hojasUsadas });
  g.position.set(0, api.MESA_Y + ALTO, TABLA_Z);
  g.rotation.y = (Math.random() - 0.5) * 0.16;
  g.userData = { tipo: 'hoja' };
  colGrupo.add(g);
  hoja = { obj: g, lamina: api.parte(g, 'lamina'), nervio: api.parte(g, 'nervio'), enrollado: 0 };
  api.rotulo('Enrollar la col');
  api.pista('Empuja la hoja <b>de lado a lado</b> hasta que quede un cigarro.', 3400);
}

function enrollar(cuanto) {
  if (!hoja) return;
  hoja.enrollado = Math.min(ENROLLADO, hoja.enrollado + cuanto);
  const k = hoja.enrollado / ENROLLADO;
  /* la hoja se angosta mientras el rollo se engorda: el ojo lo lee
     como enrollarse aunque por dentro sean dos mallas distintas */
  hoja.lamina.scale.x = Math.max(0.06, 1 - k * 0.94);
  hoja.obj.position.x = -ANCHO_HOJA / 2 * k * 0.5;
  if (hoja.nervio) hoja.nervio.position.x = 0;
  if (k < 1) return;

  const donde = hoja.obj.position.clone();
  colGrupo.remove(hoja.obj);
  hoja = null;
  hacerRollo(donde);
}

/* ---------- el rollo ---------- */

function hacerRollo(donde) {
  const largo = LARGO_HOJA;
  const g = api.pieza('col-rollo', { largo });
  g.position.set(0, api.MESA_Y + ALTO, TABLA_Z);
  g.userData = { tipo: 'rollo' };
  colGrupo.add(g);
  rollo = { obj: g, cil: api.parte(g, 'cilindro'), punta: api.parte(g, 'punta'), largo, base: TABLA_Z };
  colocarRollo();
  api.sfx('tab'); api.buzz(14);
  api.rotulo('Cortar en tiras');
  api.pista('Ahora <b>cruza el rollo</b> con el dedo. Cerca de la punta salen finitas.', 3600);

  /* El bicho vive entre las hojas y aparece al armar el rollo, que
     es cuando en la cocina de verdad se descubre. Pero NO en la
     primera hoja y NO pegado al rollo: el corte de este nivel es un
     barrido que cruza la tabla entera, así que un bicho recién
     nacido en esa franja es una derrota sin jugada. Nace adelante,
     fuera del carril del cuchillo, y con tiempo de verse. */
  if (hojasUsadas >= 1 && hojasUsadas <= CON_GUSANO) {
    const lado = hojasUsadas % 2 ? -1 : 1;
    plaga.soltar('gusano', new THREE.Vector3(
      lado * (0.75 + Math.random() * 0.35),
      api.MESA_Y,
      TABLA_Z + HONDO_TABLA / 2 - 0.22,
    ));
  }
  hojasUsadas++;
}

/* el rollo se acorta por la punta de adelante, así que hay que
   recolocarlo para que la cara que se corta quede siempre a la vista */
function colocarRollo() {
  if (!rollo) return;
  rollo.cil.scale.z = rollo.largo / LARGO_HOJA;
  rollo.obj.position.z = rollo.base - (LARGO_HOJA - rollo.largo) / 2;
  if (rollo.punta) rollo.punta.position.z = rollo.largo / 2 + 0.004;
}

/* Dónde se acepta un cruce como corte.

   No es una franja centrada en el rollo, y ese fue el error que más
   costó ver: al rebanar, el rollo se acorta por la punta de adelante
   y su centro RETROCEDE. Con una franja pegada al rollo, la mano se
   quedaba cortando donde ya no había nada y el cuchillo dejaba de
   morder sin explicación — había que perseguir el rollo hacia atrás,
   que es lo contrario de lo que hace cualquiera picando col.

   La zona buena es toda la HUELLA de la hoja: desde el culito que
   queda hasta donde empezó la punta. Cortar por delante de la cara
   no es error (sale la tira más fina, ver `cortarEn`), así que el
   dedo se puede quedar cómodo en el mismo sitio toda la faena. */
function enZonaDeCorte(z) {
  if (!rollo) return false;
  const atras = rollo.obj.position.z - rollo.largo / 2 - 0.2;
  const adelante = rollo.base + LARGO_HOJA / 2 + 0.25;
  return z > atras && z < adelante;
}

/* dónde está, en z del mundo, la cara que toca cortar */
function caraDelRollo() {
  return rollo ? rollo.obj.position.z + rollo.largo / 2 : 0;
}

function cortarEn(z) {
  if (!rollo || terminado) return;
  const cara = caraDelRollo();
  const grosor = cara - z;
  /* Cortar "por delante de la cara" no es un error: es lo que hace
     cualquiera que pica col. El cuchillo se queda donde está y lo
     que avanza es el rollo, así que pasada tras pasada en el mismo
     sitio salen tiras finísimas — que es justo la recompensa del
     nivel. Solo se rechaza el corte que cae fuera del rollo. */
  const tajada = Math.min(Math.max(grosor, FINA * 0.7), MAX_TAJADA, rollo.largo);
  rollo.largo -= tajada;

  const t = api.pieza('col-tira', { grosor: tajada });
  t.position.set(rollo.obj.position.x, api.MESA_Y + ALTO, cara - tajada / 2);
  t.rotation.y = (Math.random() - 0.5) * 0.4;
  t.userData = { tipo: null, escalaBase: 1 };
  colGrupo.add(t);
  api.volarA(t, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.42, alto: 0.55 });

  tiras++;
  if (tajada <= FINA) {
    finas++;
    api.sfx('corte');
    api.chispas(t.position.clone().setY(api.MESA_Y + 0.3), '#dcecb8', 5, 0.7);
    api.buzz(9);
  } else if (tajada >= GRUESA) {
    gruesas++;
    api.sfx('resist'); api.buzz([14, 16]);
    if (gruesas === 1) api.pista('<b>Más finita.</b> Una tajada gruesa es una sola tira: así se te acaba la col.', 3600);
    else api.aviso('Muy gruesa — vas a necesitar otra col');
  } else {
    api.sfx(tiras % 2 ? 'pop' : 'pop2');
    api.buzz(8);
  }

  api.progreso(tiras, OBJETIVO);
  colocarRollo();

  if (tiras >= OBJETIVO) { revisarFinal(); return; }

  /* el cabito que ya no da para más se va a la composta y entra col
     nueva. Cortar grueso se paga aquí: en hojas de más. */
  if (rollo.largo <= SOBRA) {
    const viejo = rollo.obj;
    rollo = null;
    viejo.userData.tipo = null;
    viejo.userData.escalaBase = 1;
    api.volarA(viejo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.42 });
    api.composta(Math.min(1, hojasUsadas / 4));
    setTimeout(() => { if (!terminado && !hoja && !rollo) ponerHoja(); }, 340);
  }
}

function revisarFinal() {
  if (terminado || tiras < OBJETIVO) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusano antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

export default {
  id: 'col',
  /* la hoja de col se enrolla de lado a lado: la cámara ve bien el
     ancho completo, con una altura media que permite ver el progreso
     del enrollado y el corte sin forzar la vista */
  camara: { pos: [0, 3.15, 3.75], mira: [0, 0.98, 0.30] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;

    OBJETIVO = TIRAS_POR_COL * (cfg.cantidad ?? 1);
    ENROLLADO = ANCHO_HOJA * (ENROLLADO_POR_RESISTENCIA[cfg.resistencia ?? 1] ?? 0.68);
    /* Se busca la vara por la etiqueta y no por índice: un
       `espesor_corte` mal escrito en la config cae en el corte de
       siempre en vez de dejar el nivel sin umbrales y con todas las
       tajadas contadas como gruesas. */
    const vara = VARA_DEL_CORTE[cfg.espesor_corte] ?? VARA_DEL_CORTE.grueso;
    FINA = vara.fina;
    GRUESA = vara.gruesa;
    /* Es un tope, no una cuota: el bicho sale al armar el rollo, así
       que pedir más bichos que hojas gaste el jugador simplemente no
       los saca. Cortar grueso —que es lo que quema hojas— es lo que
       los va destapando, y esa es justo la moraleja del nivel. */
    CON_GUSANO = cfg.gusanos ?? 2;

    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    hoja = null; rollo = null; hojasUsadas = 0;
    tiras = 0; finas = 0; gruesas = 0;
    modo = null; ultimoPunto = null; pellizcando = false; terminado = false;

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    colGrupo = new THREE.Group();
    raiz.add(colGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusano', vel: 0.12, gracia: 1.6,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    ponerHoja();
    api.progreso(0, OBJETIVO);
  },

  objetivos() { return [colGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    if (hoja) { api.sfx('resist'); api.pista('La hoja se <b>enrolla</b>: pásale el dedo de lado a lado.', 2800); return; }
    if (rollo) { api.sfx('resist'); api.pista('No se pica a golpecitos: <b>cruza el rollo</b> de un lado al otro.', 2800); }
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
    modo = hoja ? 'enrollar' : 'cortar';
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + ALTO);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }

    const p = api.puntoEnPlano(api.MESA_Y + ALTO);
    const prev = ultimoPunto;
    ultimoPunto = p;
    if (!p || !prev) return;

    /* El bicho se aplasta cortando por encima de él, no por pasarle
       el dedo cerca. La diferencia importa justo aquí: el gesto de
       este nivel barre la tabla de lado a lado, y si cualquier roce
       matara, el nivel sería un campo minado en vez de un descuido
       castigado. Solo cuenta si el dedo va donde está la col. */
    const cortando = rollo && Math.abs(p.z - rollo.obj.position.z) < rollo.largo / 2 + 0.15;
    if (cortando) {
      const encima = plaga.cercaDe(p, 0.13);
      if (encima) { plaga.aplastar(encima); return; }
    }

    if (hoja) {
      /* solo cuenta lo que va DE LADO: empujar hacia adelante no
         enrolla nada, igual que en la tabla */
      enrollar(Math.abs(p.x - prev.x));
      return;
    }
    if (!rollo) return;

    /* Un corte es un CRUCE: el dedo pasa de un lado del rollo al otro.
       Medirlo así —y no por "tocó el rollo"— es lo que hace que el
       gesto sea una pasada limpia y no un frote.

       Pero el cruce hay que buscarlo en el SEGMENTO de este cuadro,
       no comparando el lado de ahora con el del cuadro anterior. Un
       barrido rápido entra y sale del rollo dentro del mismo cuadro:
       el motor ve un solo salto de izquierda a derecha, el lado
       "anterior" ya es el de la derecha, y el corte no se registra
       nunca. Era exactamente eso — con el dedo lento cortaba y con
       el dedo rápido, que es como se pica de verdad, no. */
    const rx = rollo.obj.position.x;
    const a = prev.x - rx, b = p.x - rx;
    /* Ojo con el cero: si el dedo cae JUSTO sobre el eje del rollo,
       `Math.sign` devuelve 0 y una comparación de signos se come el
       cruce — el corte más centrado de todos, que es el que
       cualquiera hace, sería el único que no cuenta. Se cierra el
       intervalo por un lado y se abre por el otro: así el cruce se
       cobra una sola vez aunque haya un cuadro apoyado en el eje. */
    if ((a < 0 && b >= 0) || (a > 0 && b <= 0)) {
      /* dónde cruzó, para saber a qué altura del rollo cortó */
      const k = Math.abs(a) / (Math.abs(a) + Math.abs(b));
      const zc = prev.z + (p.z - prev.z) * k;
      if (enZonaDeCorte(zc)) cortarEn(zc);
    }
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; ultimoPunto = null;
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
    if (plaga) plaga.actualizar(dt, t);
    if (hoja) hoja.obj.position.y = api.MESA_Y + ALTO + Math.sin(t * 2.2) * 0.003;
  },

  destruir() {
    if (plaga) plaga.destruir();
    hoja = null; rollo = null; plaga = null; colGrupo = null;
    modo = null; ultimoPunto = null;
    pellizcando = false; terminado = false;
  },
};
