/* ============================================================
   FANESCA — nivel-caldero.js
   LA OLLA: echar los dieciséis en orden y no dejar que se pegue.

   Durante siete versiones la olla fue una ESCENA: los ingredientes
   caían solos en el orden correcto mientras el jugador miraba. Era
   bonita y era el final del juego, pero el final del juego no puede
   ser lo único que no se juega.

   ------------------------------------------------------------
   POR QUÉ EL ORDEN ES EL JUEGO

   La fanesca no se cocina echando todo junto, y ése es el dato que
   este juego lleva dieciséis mesones queriendo enseñar: el zapallo
   primero porque se deshace y hace el cuerpo; los granos duros
   después; lo tierno al final; el queso con el fuego ya bajo. Es
   conocimiento de cocina real, se aprende una sola vez y se recuerda
   para siempre — que es exactamente la forma de un buen minijuego.

   Equivocarse no arruina nada: el cuenco rebota y la olla DICE POR
   QUÉ ése no va todavía (`porque`, en ORDEN_OLLA). Un error que
   explica es una lección; un error que solo castiga es un muro. La
   segunda partida se hace de memoria y en un tercio del tiempo, y
   ésa es toda la gracia de un modo que se repite.

   ------------------------------------------------------------
   Y POR QUÉ ADEMÁS HAY QUE REVOLVER

   Porque el orden solo sería un examen: piensas, aciertas, esperas.
   La olla se pega mientras dudas — es lo que pasa de verdad — así
   que hay que ir alternando: buscar el que sigue con un ojo y dar
   vueltas con la otra mano. Eso convierte un cuestionario en una
   cocina.

   La pega no arruina la olla nunca: cuesta un descuido y sigue. En
   un modo de nueve minutos, perder en el minuto ocho por una quemada
   es la forma más rápida de que nadie vuelva a empezar la partida.
   ============================================================ */

import { ORDEN_OLLA } from './niveles.js';
import { ANCHO_SEGURO } from './motor3d.js';

let THREE, raiz, api;

/* ---------- la geografía del mesón ---------- */

/* LA OLLA VA AL FONDO DEL TODO y los cuencos delante, en la franja
   que queda entre ella y los dos recipientes del motor. Esa franja es
   más estrecha de lo que parece: la batea y la composta viven en
   z 1.92 con 0.44 de radio, así que de z 1.48 para acá lo que se
   ponga queda TAPADO por ellas — tres de los dieciséis cuencos
   estaban ahí, invisibles, en un mesón que se gana encontrando el que
   toca. Entre el filo de la olla (0.51) y el de la batea (1.48) caben
   exactamente tres filas de cuencos de 0.30. */
const OLLA_Z = -0.05;
const OLLA_R = 0.56;              /* radio de boca */
const OLLA_ALTO = 0.46;
const CALDO_Y = () => api.MESA_Y + OLLA_ALTO * 0.74;
const CUENCO_R = 0.15;
/* LAS TRES FILAS SE ESTRECHAN HACIA EL JUGADOR, y no es un capricho
   de composición: `ANCHO_SEGURO` es el medio ancho de mundo que la
   cámara garantiza EN EL PUNTO QUE MIRA, y las filas de adelante
   están más cerca del ojo, así que ahí ese mismo ancho ya no cabe.
   Con las tres al mismo ancho, seis de los dieciséis cuencos se
   quedaban fuera de la pantalla: imposibles de agarrar, en un mesón
   que se gana encontrando el que toca.

   Los anchos salen de la cuenta —medio ancho visible ≈ ANCHO_SEGURO ×
   (distancia a la fila / distancia al punto mirado)— con el radio del
   cuenco descontado para que ninguno quede con medio cuerpo fuera. */
const FILAS = [
  { n: 6, z: 0.70, ancho: 1.86 },
  { n: 5, z: 1.02, ancho: 1.68 },
  { n: 5, z: 1.34, ancho: 1.50 },
];

/* CUÁNTOS CUENCOS Y DÓNDE. La olla ya no arma siempre los dieciséis:
   cocina lo que el jugador sabe preparar, y eso son dos cuencos en la
   primera partida y dieciséis en la última. Con las filas fijas, dos
   cuencos salían pegados a una esquina de una mesa vacía.

   Se llena de ATRÁS hacia adelante —la fila del fondo primero— por
   dos razones: la de atrás es la más ancha (cabe más) y deja libre la
   franja de delante, que es por donde pasa la mano al arrastrar. */
function repartir(n) {
  const filas = [];
  let queda = n;
  for (const f of FILAS) {
    if (queda <= 0) break;
    /* lo que falta se reparte parejo entre las filas que quedan: con
       siete no van seis y uno, van cuatro y tres */
    const restantes = FILAS.length - FILAS.indexOf(f);
    const cabe = Math.min(f.n, Math.max(1, Math.ceil(queda / restantes)));
    filas.push({ ...f, n: cabe });
    queda -= cabe;
  }
  return filas;
}
const RADIO_TOQUE = 66;           /* px de agarre en pantalla */
const CERCA_OLLA = 0.72;          /* soltar dentro de esto es echar */

/* el caldo pasa de leche a fanesca conforme entran los dieciséis */
const AGUA = [0xef, 0xea, 0xdc], FANESCA = [0xe0, 0xb4, 0x5c], QUEMADO = [0x6b, 0x4a, 0x2a];
const mezcla = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

/* ---------- la pega ----------
   Sube sola mientras nadie revuelve y baja con cada vuelta de
   cuchara. `pega` va de 0 a 1; al llegar a 1 se cobra un descuido y
   se baja a medio camino — nunca a cero, o la quemada no tendría
   consecuencia, y nunca se queda arriba, o serían tres descuidos
   seguidos por el mismo despiste. */
const SUBE = 0.052;               /* por segundo, a ritmo 1 */
const BAJA_POR_VUELTA = 0.55;     /* cuánto quita una vuelta entera */
const AVISA = 0.6;

/* ---------- estado ---------- */

let grupo = null, ollaGrupo = null, caldo = null, trozos = null, cuchara = null;
let aro = null;           /* el aro que marca la boca de la olla */
let cuencos = [];                 /* { obj, ing, i, x, z, dentro } */
let echados = 0;
let cargado = null;
let modo = null;                  /* 'cuenco' | 'revolver' */
let pega = 0, ritmo = 1;
let anguloPrev = null, vueltaAcum = 0;
let seguidos = 0;         /* errores de orden encadenados: a los dos, se alumbra el que toca */
let cobradoEnTurno = false;   /* si este turno ya pagó su descuido */
let terminado = false;
let giroCaldo = 0;
let pistaPega = 0;

/* LA RECETA DE ESTA PARTIDA. `cfg.ingredientes` trae los ids que la
   olla lleva hoy; sin ella, los dieciséis de siempre — que es lo que
   hace falta para jugar este mesón suelto. */
let RECETA = ORDEN_OLLA;
const siguiente = () => RECETA[echados] || null;

/* ---------- la olla ---------- */

function construirOlla() {
  const g = new THREE.Group();
  g.position.set(0, api.MESA_Y, OLLA_Z);

  const barro = new THREE.MeshStandardMaterial({ color: 0x3f3a38, roughness: 0.72, metalness: 0.18 });
  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(OLLA_R, OLLA_R * 0.82, OLLA_ALTO, 32, 1, true), barro);
  cuerpo.material.side = THREE.DoubleSide;
  cuerpo.position.y = OLLA_ALTO / 2;
  const fondo = new THREE.Mesh(new THREE.CircleGeometry(OLLA_R * 0.82, 28), barro);
  fondo.rotation.x = -Math.PI / 2;
  fondo.position.y = 0.01;
  const labio = new THREE.Mesh(new THREE.TorusGeometry(OLLA_R, 0.045, 8, 32), barro);
  labio.rotation.x = Math.PI / 2;
  labio.position.y = OLLA_ALTO;
  /* las dos asas: sin ellas es un vaso, con ellas es una olla */
  [-1, 1].forEach(s => {
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.032, 6, 14, Math.PI), barro);
    asa.rotation.y = Math.PI / 2;
    asa.position.set(s * OLLA_R * 0.98, OLLA_ALTO * 0.78, 0);
    g.add(asa);
  });

  caldo = new THREE.Mesh(new THREE.CircleGeometry(OLLA_R * 0.94, 32),
    new THREE.MeshStandardMaterial({ color: 0xefeadc, roughness: 0.55 }));
  caldo.rotation.x = -Math.PI / 2;
  caldo.position.y = OLLA_ALTO * 0.74;

  trozos = new THREE.Group();
  trozos.position.y = OLLA_ALTO * 0.75;

  /* la cuchara de palo, apoyada en el borde hasta que alguien la use */
  cuchara = new THREE.Group();
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.72, 8),
    new THREE.MeshStandardMaterial({ color: 0xc08c4e, roughness: 0.85 }));
  palo.position.y = 0.30;
  const pala = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0xb87f42, roughness: 0.85 }));
  pala.scale.set(1, 0.34, 1.25);
  cuchara.add(palo, pala);
  /* recostada, no clavada: con 0.42 rad se veía un palo de pie en
     medio de la olla. Una cuchara de palo descansa contra el borde. */
  cuchara.rotation.z = 0.95;
  cuchara.position.set(OLLA_R * 0.34, OLLA_ALTO * 0.42, 0);

  g.add(cuerpo, fondo, labio, caldo, trozos, cuchara);
  return g;
}

/* ---------- los cuencos del mesón ---------- */

/* Cada pieza del catálogo nace con su tamaño de verdad —una presa de
   bacalao mide cinco veces lo que una lenteja— así que se normalizan
   por su bulto: lo que importa aquí no es la escala real sino que los
   dieciséis se reconozcan de un vistazo en un cuenco del tamaño de
   una uña.

   Y SE ENVUELVE, no se le toca la escala. Media docena de piezas del
   catálogo son una malla suelta que ya viene escalada por su
   constructor —`miga-queso` es una esfera unidad a 0.07— y escribirle
   encima la escala calculada la multiplicaba por diez: en pantalla
   salían bultos blancos del tamaño de media cocina. Envuelta en un
   grupo, la escala se compone con la suya en vez de borrarla, y da
   igual si la pieza es una malla o un grupo entero. */
function aEscala(obj, objetivo) {
  const caja = new THREE.Box3().setFromObject(obj);
  const t = new THREE.Vector3();
  caja.getSize(t);
  const mayor = Math.max(t.x, t.y, t.z) || 1;
  const cuna = new THREE.Group();
  cuna.add(obj);
  cuna.scale.setScalar(objetivo / mayor);
  return cuna;
}

function nuevoCuenco(ing, i) {
  const g = new THREE.Group();
  const cuenco = api.pieza('cuenco', { radio: CUENCO_R, relleno: ing.color });
  g.add(cuenco);
  /* tres copias de la pieza de verdad asomando: el color solo no
     distingue dieciséis cuencos, y una etiqueta flotante en 3D sobre
     cada uno sería un mesón lleno de carteles */
  const monton = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const p = aEscala(api.pieza(ing.pieza, { ...(ing.opts || {}), variante: i * 3 + k }), CUENCO_R * 0.62);
    const th = (k / 3) * Math.PI * 2 + i;
    p.position.set(Math.cos(th) * CUENCO_R * 0.3, 0, Math.sin(th) * CUENCO_R * 0.3);
    p.rotation.y = th;
    monton.add(p);
  }
  monton.position.y = CUENCO_R * 0.44;
  g.add(monton);
  g.userData = { tipo: 'cuenco', i, ing: ing.id };
  return g;
}

/* ---------- echar ---------- */

function echar(rec) {
  const esperado = siguiente();
  if (!esperado) return;
  if (rec.ing.id !== esperado.id) {
    /* NO ES CASTIGO, ES CLASE. El cuenco vuelve a su sitio y la olla
       dice por qué ése no va todavía; a la segunda seguida se alumbra
       el que sí toca, que es piedad sin regalar la respuesta.

       Y EL TURNO SE COBRA UNA SOLA VEZ. La primera partida se juega
       sin saberse la receta —de eso va— y cobrando cada intento, ir
       probando salía a treinta y dos descuidos: la partida de estreno
       terminaba con una cuchara y dos minutos de penalización por
       hacer exactamente lo que el mesón pide, que es aprender. Un
       descuido por puesto de la receta: quince como mucho, y en la
       segunda vuelta casi ninguno. */
    seguidos++;
    api.sfx('mal', 1.2);
    api.buzz([28, 20]);
    if (!cobradoEnTurno) { cobradoEnTurno = true; api.fallo('orden', 'Ése no va todavía'); }
    api.aviso(rec.ing.porque, 'peligro');
    api.pista(rec.ing.porque + (seguidos >= 2 ? ` Ahora toca <b>${esperado.nombre}</b>.` : ''), 4200);
    if (seguidos >= 2) alumbrar(esperado);
    volverASuSitio(rec);
    return;
  }
  seguidos = 0;
  cobradoEnTurno = false;
  rec.dentro = true;
  echados++;
  api.sfx('plop', 0.82 + echados * 0.03);
  api.buzz(10);
  api.sacudir(0.18);

  /* cae dentro y deja su trozo en el caldo */
  const destino = new THREE.Vector3(0, api.MESA_Y + OLLA_ALTO * 0.5, OLLA_Z);
  api.volarA(rec.obj, destino, { dur: 0.34, alto: 0.34 });
  const tr = new THREE.Mesh(
    new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 8, 6),
    new THREE.MeshStandardMaterial({ color: new THREE.Color(ing2color(rec.ing)), roughness: 0.7 }));
  tr.scale.y = 0.45;
  const th = Math.random() * Math.PI * 2, r = Math.random() * OLLA_R * 0.7;
  tr.position.set(Math.cos(th) * r, 0, Math.sin(th) * r);
  trozos.add(tr);
  api.chispas(new THREE.Vector3(0, CALDO_Y(), OLLA_Z), 10, ing2color(rec.ing));

  /* echar también revuelve un poco: el chorro mueve el caldo */
  pega = Math.max(0, pega - 0.12);
  pintarCaldo();
  api.progreso(echados, RECETA.length);
  const falta = siguiente();
  if (!falta) { rematar(); return; }
  api.aviso(`${rec.ing.nombre} ✓`, 'bien');
  /* la olla se pone más brava conforme se llena: más cosas dentro,
     más se pega el fondo. Es la curva del nivel y no hace falta
     escribirla en ningún sitio más. */
  ritmo = 1 + echados / RECETA.length;
}

const ing2color = (ing) => ing.color || '#e8d9b8';

function volverASuSitio(rec) {
  api.tween(rec.obj.position, 'x', rec.x, 0.2);
  api.tween(rec.obj.position, 'z', rec.z, 0.2);
  api.tween(rec.obj.position, 'y', api.MESA_Y + 0.02, 0.2);
}

let alumbrado = null;
function alumbrar(ing) {
  const rec = cuencos.find(c => c.ing.id === ing.id && !c.dentro);
  if (!rec) return;
  alumbrado = rec;
  rec.brilla = 1;
}

/* EL AVISO DE «TERMINADO» NO PUEDE SOBREVIVIR AL MESÓN.

   Un `setTimeout(() => api.completar(), 700)` a secas sigue vivo
   después de que el motor descargue el nivel, y en un modo que
   encadena mesones eso es un desastre silencioso: el caldero acaba,
   el modo monta el huevo, y setecientos milisegundos más tarde el
   temporizador del caldero dispara `completar()` sobre el huevo y se
   lo salta entero. Salía en la prueba como «la olla armada pasa al
   plato… guarnición»: un mesón desaparecido sin un solo error.

   Con el identificador guardado y limpiado en destruir(), el aviso
   muere con su mesón. Regla para cualquier nivel: un temporizador que
   llame a la api tiene que poder cancelarse en destruir(). */
let remateId = null;
function rematar() {
  if (terminado) return;
  terminado = true;
  api.sfx('fiesta');
  api.aviso('¡La fanesca está armada! 🍲', 'bien');
  api.pista('Que hierva despacio.', 2600);
  remateId = setTimeout(() => { remateId = null; api.completar(); }, 700);
}

/* ---------- revolver ---------- */

function anguloDelDedo() {
  const p = api.puntoEnPlano(CALDO_Y());
  if (!p) return null;
  const dx = p.x, dz = p.z - OLLA_Z;
  if (Math.hypot(dx, dz) < 0.06) return null;   /* en el centro no hay ángulo */
  return Math.atan2(dz, dx);
}

function revolverEn() {
  const a = anguloDelDedo();
  if (a == null) return;
  if (anguloPrev != null) {
    let d = a - anguloPrev;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    vueltaAcum += Math.abs(d);
    giroCaldo += d;
    pega = Math.max(0, pega - (Math.abs(d) / (Math.PI * 2)) * BAJA_POR_VUELTA);
    if (vueltaAcum > Math.PI * 2) {
      vueltaAcum -= Math.PI * 2;
      api.sfx('pop', 0.7);
    }
  }
  anguloPrev = a;
  cuchara.position.set(Math.cos(a) * OLLA_R * 0.55, OLLA_ALTO * 0.5, Math.sin(a) * OLLA_R * 0.55);
  cuchara.rotation.z = 0.95 * Math.cos(a);
  cuchara.rotation.x = -0.95 * Math.sin(a);
  pintarCaldo();
}

function pintarCaldo() {
  const k = echados / RECETA.length;
  const base = mezcla(AGUA, FANESCA, k);
  /* la pega se ve ANTES de cobrarse: el caldo se va oscureciendo
     desde el aviso. Un medidor que solo avisa cuando ya perdiste no
     es un medidor, es un susto. */
  const c = mezcla(base, QUEMADO, Math.max(0, pega - 0.25) * 0.9);
  caldo.material.color.setRGB(c[0] / 255, c[1] / 255, c[2] / 255);
}

function seQuemo() {
  pega = 0.5;
  api.sfx('mal'); api.buzz([50, 30, 50]);
  api.destello('rgba(120,60,20,.28)');
  api.fallo('pegado', 'Se pegó el fondo · revuelve más seguido');
  api.aviso('Se pegó el fondo 🔥 revuelve', 'peligro');
  pintarCaldo();
}

function cercaDelDedo(cx, cy) {
  let mejor = null, mejorD = RADIO_TOQUE;
  cuencos.forEach(rec => {
    if (rec.dentro) return;
    const p = api.proyectar(new THREE.Vector3(rec.x, api.MESA_Y + CUENCO_R * 0.6, rec.z));
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < mejorD) { mejorD = d; mejor = rec; }
  });
  return mejor;
}

const sobreLaOlla = () => {
  const p = api.puntoEnPlano(CALDO_Y());
  return !!p && Math.hypot(p.x, p.z - OLLA_Z) < OLLA_R * 1.25;
};

export default {
  id: 'caldero',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    cuencos = []; echados = 0; cargado = null; modo = null;
    pega = 0; ritmo = (cfg.pega ?? 1); anguloPrev = null; vueltaAcum = 0;
    seguidos = 0; cobradoEnTurno = false; terminado = false;
    giroCaldo = 0; alumbrado = null; pistaPega = 0;

    grupo = new THREE.Group();
    raiz.add(grupo);
    ollaGrupo = construirOlla();
    grupo.add(ollaGrupo);
    pintarCaldo();

    /* LA BOCA DE LA OLLA, MARCADA. Este mesón pide arrastrar un cuenco
       A UN SITIO, y ese sitio era una olla oscura al fondo entre
       dieciséis cuencos: el gesto se entendía y el blanco no.
       Preguntado qué faltaba, la respuesta fue exactamente ésa:
       «dónde tengo que tocar». El aro se enciende con el cuenco ya en
       la mano, que es cuando hace falta. */
    aro = api.aroDestino(OLLA_R * 1.12);
    aro.obj.position.set(0, api.MESA_Y + OLLA_ALTO + 0.03, OLLA_Z);
    grupo.add(aro.obj);

    /* LOS DIECISÉIS, BARAJADOS. En el orden de la receta, encontrar
       el que sigue sería recorrer una fila de izquierda a derecha:
       cero decisión. Barajados hay que RECONOCER el ingrediente, que
       es lo que el juego lleva dieciséis mesones enseñando. */
    const pedidos = Array.isArray(cfg.ingredientes) && cfg.ingredientes.length
      ? cfg.ingredientes
      : ORDEN_OLLA.map(o => o.id);
    RECETA = ORDEN_OLLA.filter(o => pedidos.includes(o.id));
    if (!RECETA.length) RECETA = ORDEN_OLLA;
    const baraja = RECETA.map((ing, i) => ({ ing, i }));
    for (let i = baraja.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baraja[i], baraja[j]] = [baraja[j], baraja[i]];
    }
    let k = 0;
    repartir(baraja.length).forEach(fila => {
      const ancho = Math.min(fila.ancho, ANCHO_SEGURO * 2 - 0.24);
      for (let n = 0; n < fila.n && k < baraja.length; n++, k++) {
        const { ing } = baraja[k];
        const x = fila.n === 1 ? 0 : -ancho / 2 + (ancho / (fila.n - 1)) * n;
        const obj = nuevoCuenco(ing, k);
        obj.position.set(x, api.MESA_Y + 0.02, fila.z);
        grupo.add(obj);
        cuencos.push({ obj, ing, x, z: fila.z, dentro: false, brilla: 0 });
      }
    });

    /* ventana de diagnóstico, como la tienen el zapallo, el huevo y el
       mote: desde fuera se puede leer por dónde va la olla sin
       deducirlo de la barra del HUD */
    window.__caldero = { get echados() { return echados; }, get pega() { return pega; }, get siguiente() { const s = siguiente(); return s && s.id; } };
    api.progreso(0, RECETA.length);
    /* sin aviso de arranque: el aviso vive donde vive la fila de
       faenas y se le montaba encima. La pista ya lo dice, y con más
       sitio para decirlo. */
    api.pista('<b>Arrastra a la olla</b> el que va primero. Si te equivocas, la olla te dice por qué. Y <b>da vueltas dentro</b> para que no se pegue.', 5600);
  },

  objetivos() { return [grupo]; },

  alTocar(info) {
    if (terminado) return;
    const rec = cercaDelDedo(info.cliente.x, info.cliente.y);
    if (rec) { api.pista(`Es <b>${rec.ing.nombre}</b>.`, 1800); api.sfx('tab'); return; }
    /* un toque sobre la olla también revuelve un poquito: castigar a
       quien la toca sin arrastrar sería enseñar a no tocarla */
    if (sobreLaOlla()) { pega = Math.max(0, pega - 0.05); pintarCaldo(); api.sfx('pop', 0.7); }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const rec = cercaDelDedo(info.cliente.x, info.cliente.y);
    if (rec) {
      cargado = rec; modo = 'cuenco';
      api.sfx('tab');
      if (aro) aro.apuntar(true);
      api.rotulo(`A la olla · ${rec.ing.nombre}`);
      return;
    }
    /* si no agarró cuenco, el arrastre revuelve — empiece donde
       empiece. Exigir que el dedo baje DENTRO de la boca de la olla
       hacía que la mitad de las vueltas no contaran. */
    modo = 'revolver';
    anguloPrev = null;
    revolverEn();
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cuenco' && cargado) {
      const p = api.puntoEnPlano(api.MESA_Y + 0.34);
      if (p) cargado.obj.position.set(p.x, api.MESA_Y + 0.34, p.z);
      return;
    }
    if (modo === 'revolver') revolverEn();
  },

  alArrastrarFin() {
    if (aro) aro.apuntar(false);
    if (modo === 'cuenco' && cargado) {
      const rec = cargado;
      cargado = null; modo = null;
      const p = rec.obj.position;
      if (Math.hypot(p.x, p.z - OLLA_Z) < CERCA_OLLA) echar(rec);
      else volverASuSitio(rec);
      return;
    }
    modo = null; anguloPrev = null;
  },

  actualizar(dt, t) {
    if (aro) aro.latir(t);
    if (terminado) return;
    /* SE PEGA MIENTRAS NADIE REVUELVE. Sube sola y sube más conforme
       la olla se llena; revolver la baja y echar algo también. */
    if (modo !== 'revolver') {
      pega = Math.min(1, pega + SUBE * ritmo * dt);
      if (pega >= 1) seQuemo();
      else pintarCaldo();
    }
    if (pega > AVISA && t - pistaPega > 6) {
      pistaPega = t;
      api.aviso('Se está pegando · revuelve 🥄', 'peligro');
    }
    /* el caldo gira con la cuchara y se va frenando solo */
    if (trozos) {
      trozos.rotation.y += giroCaldo * dt * 6;
      giroCaldo *= Math.max(0, 1 - dt * 3);
      /* y hierve: los trozos suben y bajan con el hervor */
      trozos.children.forEach((tr, i) => { tr.position.y = Math.sin(t * 2.4 + i) * 0.012; });
    }
    /* el cuenco alumbrado late hasta que se usa */
    if (alumbrado && !alumbrado.dentro) {
      const k = 1 + Math.sin(t * 7) * 0.07;
      alumbrado.obj.scale.setScalar(k);
    } else if (alumbrado) { alumbrado.obj.scale.setScalar(1); alumbrado = null; }
  },

  destruir() {
    clearTimeout(remateId); remateId = null;
    delete window.__caldero;
    cuencos = []; grupo = null; ollaGrupo = null; caldo = null;
    trozos = null; cuchara = null; cargado = null; modo = null; aro = null;
    alumbrado = null; terminado = false;
  },
};
