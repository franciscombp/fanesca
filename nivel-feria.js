/* ============================================================
   FANESCA — nivel-feria.js
   LA FERIA: escoger el choclo.

   El único mesón del juego que no se gana con la mano. Aquí no hay
   nada que pelar ni que reventar: hay que MIRAR y decidir, que es lo
   primero que se hace de verdad cuando se va a cocinar una fanesca.

   ------------------------------------------------------------
   POR QUÉ EL CHOCLO Y NO "LA COMPRA ENTERA"

   Porque es lo único que se escoge de verdad grano por grano. El
   fréjol, la quinua y la lenteja se compran por libras y se escogen
   DESPUÉS, en la mesa —eso ya es el mesón de la lenteja—; el choclo
   se escoge en el puesto, con la casera mirando, abriéndole la hoja
   con el pulgar para verle el grano. Una feria donde se escogen doce
   cosas sería doce veces el mismo gesto sin que ninguna signifique
   nada; una donde se escoge la que importa, no.

   ------------------------------------------------------------
   LAS TRES CLASES, Y QUÉ SIRVE

     · TIERNO — el grano lechoso, que se aplasta y suelta leche.
       Es el de la fanesca y es el único que sirve.
     · DURO    — ya cuajó. Sirve para mote, no para esta olla.
     · SECO    — el de la tonga. Eso es maíz tostado, y en la fanesca
       no se ablanda ni hirviendo toda la tarde.

   ------------------------------------------------------------
   EL RETO ES SER TÉCNICO, NO RÁPIDO

   Por fuera cada choclo enseña dos señales —el color de la hoja y el
   de los pelos— y casi siempre dicen la verdad. Casi. Hay choclos
   que vienen tiernos dentro de una hoja cansada y choclos ya duros
   con la hoja todavía verde: ésos sólo se descubren abriendo.

   Y ABRIR CUESTA, porque en la feria de verdad también cuesta: la
   casera te deja abrir dos, no los seis. Ahí está el juego —
   gastar las aperturas en los que dudas y fiarte de la hoja en los
   que no. El seco NUNCA se disfraza: la hoja seca se ve de lejos, y
   un juego donde ni mirando bien puedes acertar no es difícil, es
   una tómbola.
   ============================================================ */

import { LARGO, LARGO_HOJA, BASE_HOJA, NUDOS, posicionDe, A, P } from './modelos/choclo.js';

let THREE, raiz, api;

/* ---------- la mesa del puesto ---------- */

const HONDO_TABLA = 1.8;
let TABLA_Z = 0;
const ESCALA = 0.30;              /* el choclo de verdad no cabe seis veces */
const HOJAS_PUESTO = 6;           /* seis bastan para que se lea "con hoja" */
const ALTO = 0.06;                /* cuánto levanta del mesón, ya escalado */
const RADIO_TOQUE = 78;           /* px en pantalla para agarrar un choclo */

/* Cuánta hoja se abre al mirar. No del todo: en el puesto se abre una
   ventanita con el pulgar y se vuelve a cerrar, no se desnuda el
   choclo — y media hoja abierta deja ver el grano igual. */
const ABRE = 0.62;

/* ---------- las señales ----------
   El color de la hoja y el de los pelos son TODA la información que
   hay antes de abrir. Viven aquí, juntos, porque son un mismo
   lenguaje: si mañana la hoja pálida se ve más verde hay que mover
   el pelo con ella o la señal deja de leerse. */
/* Los tres tienen que distinguirse DE UN VISTAZO: verde de mata,
   caqui cansado y paja. La primera versión los pintaba alternando con
   el color de hoja interior del modelo —hueso, casi blanco— y los
   seis choclos salían igual de pálidos: la señal no existía. */
const SENAL = {
  fresco: { hoja: '#5d9430', hojaIn: '#7fae4a', pelo: '#f6e9c2', dice: 'hoja verde, pelo claro' },
  palido: { hoja: '#a9ac63', hojaIn: '#c2c184', pelo: '#b8813f', dice: 'hoja pálida, pelo oscuro' },
  seco:   { hoja: '#c39b4e', hojaIn: '#d8b878', pelo: '#6f4f2a', dice: 'hoja seca, pelo marrón' },
};

const CLASE = {
  tierno: {
    id: 'tierno', madurez: 'tierno', sirve: true,
    nombre: 'tierno', dentro: 'El grano está <b>lechoso</b>: éste sí.',
    alTomar: 'Tierno 🌽 al canasto',
  },
  duro: {
    id: 'duro', madurez: 'duro', sirve: false,
    nombre: 'duro', dentro: 'Ya cuajó: está <b>duro</b>.',
    alTomar: 'Ese está duro: eso es <b>mote</b>, no fanesca',
  },
  seco: {
    id: 'seco', madurez: 'seco', sirve: false,
    nombre: 'seco', dentro: 'Grano <b>seco</b>, de la tonga.',
    alTomar: 'Ese es de <b>tostado</b>: en la fanesca no se ablanda',
  },
};

/* ---------- estado ---------- */

let CHOCLOS = 6, PEDIDOS = 3, DUDOSOS = 2, APERTURAS = 2;
let puesto = [];              /* { grupo, clase, senal, abierto, tomado, x, z, hojas, granos } */
let grupo = null;
let llevados = 0;             /* tiernos en el canasto */
let aperturas = 0;            /* las que quedan */
let cargado = null;           /* el choclo en la mano */
let terminado = false;
let avisadoSinAperturas = false;

/* ---------- armar un choclo del puesto ---------- */

function tintar(obj, color) {
  obj.traverse(o => { if (o.material && o.material.color) o.material.color.set(color); });
}

function nuevaHoja(i, senal) {
  const pivot = new THREE.Group();
  pivot.rotation.y = (i / HOJAS_PUESTO) * Math.PI * 2;
  pivot.position.y = BASE_HOJA;
  const mesh = api.pieza('hoja-choclo', { indice: i });
  /* Las hojas del modelo se colorean por su POSICIÓN en el choclo
     entero —las de dentro casi blancas, las de fuera verdes— y aquí
     las seis tienen que decir lo mismo: la señal. Sólo las dos
     últimas van un punto más claras, para que el manojo no se vea
     plano; alternando, la mitad salían color hueso y borraban la
     señal entera. */
  tintar(mesh, i >= HOJAS_PUESTO - 2 ? senal.hojaIn : senal.hoja);
  pivot.add(mesh);
  const nudos = [];
  for (let n = 0; n < NUDOS; n++) { const nd = api.parte(mesh, 'nudo' + n); if (nd) nudos.push(nd); }
  return { pivot, nudos };
}

const CURVA_HOJA = [1.15, 0.85, 0.70];
function doblar(h, k) { h.nudos.forEach((nd, n) => { nd.rotation.x = (CURVA_HOJA[n] || 0.5) * k; }); }

/* Los granos que se ven al abrir: sólo la cara de arriba, y no los
   126. Nadie mira un choclo por detrás en el puesto, y ciento
   veintiséis granos por seis choclos son setecientos objetos para
   enseñar un color. */
function nuevosGranos(clase) {
  const g = new THREE.Group();
  g.visible = false;
  /* tres hileras y cinco granos: es la ventana que se ve desde arriba
     con la hoja abierta. Cinco hileras eran setenta granos más por
     choclo —casi doscientos en el puesto— para enseñar un color. */
  for (let a = -1; a <= 1; a++) {
    for (let p = 2; p < P - 2; p++) {
      const { th, r, h } = posicionDe(((a % A) + A) % A, p);
      const grano = api.pieza('grano-choclo', { madurez: clase.madurez, variante: a * 7 + p * 3 });
      grano.position.set(Math.sin(th) * (r + 0.03), h, Math.cos(th) * (r + 0.03));
      grano.rotation.y = th;
      g.add(grano);
    }
  }
  return g;
}

function nuevoChoclo(clase, senal, i) {
  const g = new THREE.Group();
  const tusa = api.pieza('tusa', { madurez: clase.madurez });
  g.add(tusa);
  const granos = nuevosGranos(clase);
  g.add(granos);
  const hojas = [];
  for (let h = 0; h < HOJAS_PUESTO; h++) {
    const hoja = nuevaHoja(h, senal);
    hojas.push(hoja);
    g.add(hoja.pivot);
  }
  /* EL PENACHO VA EN LA PUNTA DE LA HOJA, no en la del grano. Puesto
     a lo alto del choclo (LARGO/2) le quedaba treinta centímetros por
     dentro del manojo, y las hebras salían atravesando las hojas: en
     pantalla no se leían como pelos sino como rayones sobre el
     choclo. La hoja llega hasta BASE_HOJA + LARGO_HOJA; ahí, y algo
     más corto, es un mechón asomando por la punta. */
  const pelos = api.pieza('pelos-choclo');
  tintar(pelos, senal.pelo);
  pelos.position.y = BASE_HOJA + LARGO_HOJA - 0.10;
  pelos.scale.setScalar(0.72);
  g.add(pelos);

  /* ACOSTADO A LO ANCHO, y esto costó una captura de pantalla
     entender: puesto en profundidad —con la punta hacia el jugador—
     la cámara del mesón lo mira casi desde arriba y el choclo sale
     escorzado, como un huevo verde. Nadie lo leía como choclo. De
     lado se ve LARGO, que es la única forma en que una mazorca se
     reconoce, y el penacho queda a un costado. */
  const cuna = new THREE.Group();
  cuna.rotation.z = Math.PI / 2;
  cuna.add(g);
  const raizChoclo = new THREE.Group();
  raizChoclo.add(cuna);
  raizChoclo.scale.setScalar(ESCALA);
  /* la punta a un lado o al otro y algo de desorden: seis mazorcas
     perfectamente paralelas no son un puesto, son un almacén */
  raizChoclo.rotation.y = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.34;
  raizChoclo.userData = { tipo: 'choclo', i };
  return { raizChoclo, hojas, granos };
}

/* ---------- el sorteo del puesto ----------
   Se arma la lista de clases primero y las señales después, porque
   las mentiras son una PROPIEDAD DEL PUESTO y no de cada choclo: hay
   que garantizar que haya tiernos suficientes para llenar el canasto
   y que los disfrazados sean exactamente los que pide la config. */
function repartir() {
  const clases = [];
  /* tiernos: los pedidos más uno de margen. Un puesto con justo los
     que hacen falta convierte cualquier error en un callejón sin
     salida — y el error aquí es el juego. Más de uno de margen y el
     puesto se vuelve un trámite: hay que poder equivocarse una vez,
     no tres. */
  const tiernos = Math.min(CHOCLOS - 1, PEDIDOS + 1);
  for (let i = 0; i < tiernos; i++) clases.push(CLASE.tierno);
  /* el resto, entre duros y secos, con al menos un seco: es la
     trampa fácil y la que enseña la regla */
  const resto = CHOCLOS - tiernos;
  for (let i = 0; i < resto; i++) clases.push(i === 0 ? CLASE.seco : (Math.random() < 0.5 ? CLASE.seco : CLASE.duro));
  for (let i = clases.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [clases[i], clases[j]] = [clases[j], clases[i]];
  }

  /* la señal honesta de cada clase */
  const honesta = { tierno: 'fresco', duro: 'palido', seco: 'seco' };
  const senales = clases.map(c => honesta[c.id]);
  /* y las mentiras: sólo entre tierno y duro. El seco NO se disfraza
     —la hoja seca se ve de lejos— porque un puesto donde ni mirando
     bien puedes acertar no es difícil, es una tómbola. */
  const disfrazables = clases.map((c, k) => (c.id === 'tierno' || c.id === 'duro') ? k : -1).filter(k => k >= 0);
  for (let i = disfrazables.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [disfrazables[i], disfrazables[j]] = [disfrazables[j], disfrazables[i]];
  }
  disfrazables.slice(0, Math.min(DUDOSOS, disfrazables.length)).forEach(k => {
    senales[k] = clases[k].id === 'tierno' ? 'palido' : 'fresco';
  });
  return clases.map((c, k) => ({ clase: c, senal: SENAL[senales[k]] }));
}

/* ---------- llevar y devolver ---------- */

function alCanasto(rec) {
  if (terminado || rec.tomado) return;
  rec.tomado = true;
  api.sfx('pop');
  api.volarA(rec.raizChoclo, api.BATEA, { dur: 0.5, alto: 0.7 });
  if (rec.clase.sirve) {
    llevados++;
    api.chispas(api.BATEA, 8, '#f4d35e');
    api.aviso(rec.clase.alTomar, 'bien');
    api.progreso(llevados, PEDIDOS);
    if (llevados >= PEDIDOS) rematar();
    return;
  }
  /* un choclo que no sirve no arruina la olla: cuesta. En la campaña
     baja cucharas; en el modo La Olla suma segundos. Y hay que
     reponerlo — el canasto sigue pidiendo lo mismo. */
  api.fallo('feria', rec.clase.alTomar);
  api.pista(rec.clase.alTomar + '. Sigue buscando <b>tiernos</b>.', 3200);
}

function devolver(rec) {
  api.tween(rec.raizChoclo.position, 'x', rec.x, 0.18);
  api.tween(rec.raizChoclo.position, 'z', rec.z, 0.18);
  api.tween(rec.raizChoclo.position, 'y', api.MESA_Y + ALTO, 0.18);
}

function abrir(rec) {
  if (rec.abierto || rec.tomado) return;
  if (aperturas <= 0) {
    api.sfx('mal', 1.4);
    if (!avisadoSinAperturas) {
      avisadoSinAperturas = true;
      api.aviso('La casera ya no te deja abrir más', 'peligro');
      api.pista('Se acabaron las aperturas: los demás, <b>por la hoja</b> — verde y pelo claro es tierno.', 4200);
    }
    return;
  }
  rec.abierto = true;
  rec.apertura = 0.0001;      /* de aquí lo lleva actualizar() */
  aperturas--;
  api.sfx('tab');
  api.buzz(10);
  rec.granos.visible = true;
  api.aviso(`${rec.clase.dentro.replace(/<[^>]+>/g, '')} · te quedan ${aperturas}`, rec.clase.sirve ? 'bien' : 'peligro');
  api.pista(rec.clase.dentro + (rec.clase.sirve ? ' <b>Llévatelo</b>.' : ' Déjalo.'), 2600);
  rotularAperturas();
}

/* CORTO, PORQUE EL HUD CORTA. El rótulo cabe en unos dieciocho
   caracteres y «La feria · 0/3 tiernos · 3 aperturas» salía como «La
   feria · 0/3 tie…»: el dato que importa —cuántas aperturas quedan—
   se perdía justo al final. Los tiernos ya los cuenta la barra; aquí
   sólo va lo escaso. */
function rotularAperturas() {
  api.rotulo(`Feria · abrir: ${aperturas}`);
}

/* el aviso de «terminado» se cancela con el mesón: suelto, seguiría
   vivo después de descargar el nivel y dispararía `completar()` sobre
   el mesón SIGUIENTE, saltándoselo entero (ver nivel-caldero) */
let remateId = null;
function rematar() {
  if (terminado) return;
  terminado = true;
  api.sfx('bien');
  api.aviso('¡El canasto está lleno! 🧺', 'bien');
  remateId = setTimeout(() => { remateId = null; api.completar(); }, 420);
}

/* el choclo más cerca del dedo EN PANTALLA: pedirle al rayo que
   acierte una hoja de dos centímetros era puntería, no juego */
function cercaDelDedo(cx, cy) {
  let mejor = null, mejorD = RADIO_TOQUE;
  puesto.forEach(rec => {
    if (rec.tomado) return;
    const p = api.proyectar(new THREE.Vector3(rec.x, api.MESA_Y + ALTO + 0.05, rec.z));
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d < mejorD) { mejorD = d; mejor = rec; }
  });
  return mejor;
}

export default {
  id: 'feria',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2 + 0.12;
    CHOCLOS = Math.max(3, Math.round(cfg.choclos ?? 6));
    PEDIDOS = Math.max(1, Math.min(CHOCLOS - 1, Math.round(cfg.pedidos ?? 3)));
    DUDOSOS = Math.max(0, Math.round(cfg.dudosos ?? 2));
    APERTURAS = Math.max(0, Math.round(cfg.aperturas ?? 2));
    aperturas = APERTURAS;
    puesto = []; llevados = 0; cargado = null; terminado = false;
    avisadoSinAperturas = false;

    const mesa = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    mesa.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    mesa.userData = { tipo: 'tabla' };
    raiz.add(mesa);

    grupo = new THREE.Group();
    raiz.add(grupo);

    /* DE DOS EN DOS, EN FILAS. Acostado a lo ancho un choclo mide
       casi un tercio de todo el mundo que la cámara garantiza: caben
       dos por fila y no más. Las filas de adelante van un poco más
       juntas porque están más cerca del ojo — `ANCHO_SEGURO` se
       garantiza en el punto que la cámara mira, no aquí, y con las
       tres a la misma separación los de las puntas se salían de la
       pantalla por medio cuerpo. */
    const reparto = repartir();
    const FILAS = [
      { z: TABLA_Z - 0.52, sep: 1.00 },
      { z: TABLA_Z,        sep: 0.92 },
      { z: TABLA_Z + 0.52, sep: 0.84 },
    ];
    const poner = (i) => {
      const fila = FILAS[Math.floor(i / 2) % FILAS.length];
      /* el impar de la última fila va al medio, no de medio lado */
      const solo = (i === reparto.length - 1) && (reparto.length % 2 === 1);
      return { x: solo ? 0 : (i % 2 ? 1 : -1) * fila.sep / 2, z: fila.z };
    };
    reparto.forEach((r, i) => {
      const { x, z } = poner(i);
      const { raizChoclo, hojas, granos } = nuevoChoclo(r.clase, r.senal, i);
      raizChoclo.position.set(x, api.MESA_Y + ALTO, z);
      grupo.add(raizChoclo);
      /* la sombra va SUELTA sobre el mesón y no colgada del choclo:
         colgada se iría con él al canasto —una sombra volando— y
         además heredaría la escala de 0.30 */
      const sombra = api.sombraBlob(0.92);
      sombra.position.set(x, api.MESA_Y + 0.055, z);
      grupo.add(sombra);
      puesto.push({ raizChoclo, hojas, granos, sombra, clase: r.clase, senal: r.senal, x, z, abierto: false, apertura: 0, tomado: false });
    });

    rotularAperturas();
    api.progreso(0, PEDIDOS);
    api.aviso(`Lleva ${PEDIDOS} choclos tiernos`, 'bien');
    api.pista(`<b>Arrastra al canasto</b> los que sirvan. <b>Tócalo</b> para abrirle la hoja y verle el grano — te dejan abrir <b>${APERTURAS}</b>.`, 5200);
  },

  objetivos() { return [grupo]; },

  alTocar(info) {
    if (terminado) return;
    const rec = cercaDelDedo(info.cliente.x, info.cliente.y);
    if (!rec) return;
    if (rec.abierto) {
      api.pista(rec.clase.dentro + (rec.clase.sirve ? ' <b>Arrástralo al canasto</b>.' : ' Déjalo ahí.'), 2600);
      return;
    }
    abrir(rec);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    cargado = cercaDelDedo(info.cliente.x, info.cliente.y);
    if (!cargado) return;
    api.sfx('tab');
    cargado.raizChoclo.position.y = api.MESA_Y + 0.30;
  },

  alArrastrar() {
    if (!cargado) return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.30);
    if (p) cargado.raizChoclo.position.set(p.x, api.MESA_Y + 0.30, p.z);
  },

  alArrastrarFin() {
    if (!cargado) return;
    const rec = cargado;
    cargado = null;
    const p = rec.raizChoclo.position;
    /* ¿lo soltó sobre el canasto? Con margen ancho: el canasto es el
       destino de TODO el juego y fallarlo por cuatro centímetros
       después de haber escogido bien sería castigar lo correcto. */
    if (Math.hypot(p.x - api.BATEA.x, p.z - api.BATEA.z) < 0.62) { alCanasto(rec); return; }
    devolver(rec);
  },

  /* la hoja se abre AQUÍ y no con timers: seis hojas escalonadas a
     golpe de setTimeout siguen corriendo después de salir del mesón,
     y lo que se abre para entonces ya no existe */
  actualizar(dt) {
    puesto.forEach(rec => {
      if (!rec.abierto || rec.apertura >= 1) return;
      rec.apertura = Math.min(1, rec.apertura + dt / 0.34);
      rec.hojas.forEach((h, k) => {
        /* escalonadas: seis hojas abriéndose a la vez es un parpadeo;
           una tras otra es un pulgar abriendo la hoja */
        const p = Math.max(0, Math.min(1, (rec.apertura - k * 0.07) / 0.6));
        doblar(h, p * ABRE);
      });
    });
  },

  destruir() {
    clearTimeout(remateId); remateId = null;
    puesto = []; grupo = null; cargado = null; terminado = false;
  },
};
