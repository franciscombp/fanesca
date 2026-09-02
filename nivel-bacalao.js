/* ============================================================
   FANESCA — nivel-bacalao.js
   DESALAR Y TENDER EL BACALAO.

   El único nivel donde una misma presa pide dos gestos distintos,
   y en orden: primero frotar hasta sacarle la sal, después
   cargarla al cordel. La presa cambia de comportamiento sola —
   mientras tenga sal, arrastrar sobre ella es frotar; cuando ya
   está limpia, arrastrar es levantarla.

   El bicho de este nivel no camina: vuela y se posa. Las moscas
   van a lo salado, así que aparecen justo donde estás trabajando.
   Aplastar una sobre el pescado arruina todo. Para sacarla se
   arrastra desde ella: se espanta y se va.

   Cuántas presas se tienden, cuánta sal traen encima y cada cuánto
   cae una mosca los pone la config de la parada. El cordel y la
   tabla son los mismos para el primer desale y para el bacalao que
   viene curado a lo bruto; lo que cambia es el trabajo que hay
   encima de cada presa y la paciencia que dejan las moscas.
   ============================================================ */

import { nuevaMosca } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { CARNE_LIMPIA } from './modelos/bacalao.js';

let THREE, raiz, api;

let PRESAS = 5;
/* El bacalao de referencia es el del desale normal: 0.7 de sal, siete
   granos por presa. Las demás paradas se miden contra él en proporción
   —y no contra una escala inventada— para que la parada de siempre siga
   pidiendo exactamente sus siete granos y para que media sal sea de
   verdad la mitad del frotado. Nunca menos de uno: una presa que
   naciera limpia se saltaría el primer gesto del nivel y aparecería
   lista para tender sin que el jugador entienda por qué. */
const SAL_REF = 0.7, SAL_POR_PRESA_REF = 7;
let SAL_POR_PRESA = SAL_POR_PRESA_REF;
/* La tabla no se planta en un z puesto a ojo: `api.FRENTE_TABLA` es
   hasta dónde puede llegar sin meterse dentro de los cuencos, y de
   ahí se resta media tabla. Si mañana la batea se mueve, la tabla se
   corre sola. */
const HONDO_TABLA = 1.4;
let TABLA_Z = 0;                 /* se fija en construir(), desde api */
const FROTE = 0.11;              /* mundo recorrido por cada grano de sal */
const CORDEL_Z = -0.62;          /* arrastra hacia el fondo para tender */
const CORDEL_Y = () => api.MESA_Y + 0.92;
/* Las moscas de la parada normal caen cada once segundos, y eso es la
   frecuencia 0.5. El resto se lee como proporción de ella: el doble de
   frecuencia tiene que ser el doble de moscas, no una tabla de segundos
   puestos a ojo parada por parada. */
const FRECUENCIA_REF = 0.5, MOSCA_CADA_REF = 11;
let MOSCA_CADA = MOSCA_CADA_REF; /* segundos entre moscas */
/* El respiro de apertura, antes de la primera mosca: el jugador todavía
   está entendiendo que aquí se frota. */
const PRIMERA_MOSCA = 4.5;
const MOSCA_DURA = 6.5;          /* cuánto se queda posada */
/* Recién posada, la mosca no mata: el dedo ya venía frotando ahí y
   perder por eso sería castigar un reflejo imposible. En ese respiro,
   rozarla la espanta — que es lo que pasaría de verdad. */
/* el respiro de la mosca recién posada se acorta con la dificultad
   de la parada (api.dificultad); el perdón, sólo en la presentación */
const MOSCA_GRACIA_REF = 1.2;
const moscaGracia = () => MOSCA_GRACIA_REF * ((api.dificultad || 1) <= 2 ? 0.8 : 0.5);

let presasGrupo = null, moscasGrupo = null;
let presas = [];                 /* {obj, sal:[], limpia, tendida, x, z} */
let moscas = [];                 /* {obj, m, presa, t0, estado} */
let hechos = 0, TOTAL = PRESAS * (SAL_POR_PRESA + 1);
let modo = null, cargada = null, frotando = null, ultimoPunto = null;
let tMosca = 4, huecosCordel = [];
let terminado = false, avisoLimpia = false;
let perdonMosca = false;   /* una mosca aplastada perdonada por nivel */

/* La presa con sus vetas y su piel, los cristales de sal y el
   cordel viven en modelos/bacalao.js. La carne se busca POR NOMBRE
   porque es la única pieza del juego que cambia de material en
   vivo: al quedar sin sal, pasa de salada a limpia. */

/* La fila de la tabla nunca estuvo a compás: -1.05, -0.52, 0, 0.52,
   1.05, con medio centímetro de más en las orillas. Ese descuadre es lo
   que la hace parecer puesta a mano y no calculada, así que la fila de
   cinco se conserva tal cual y sólo se reparte a compás cuando la parada
   pide otra cantidad. El ancho no crece con las presas: ensanchar la
   fila las sacaría de la madera y del cordel de arriba. Que se aprieten
   no rompe el frotado porque el zigzag en z deja a cada vecina en otra
   hilera, que es justamente para lo que está. */
/* Un poco más apretada que la original (±1.05): con la cámara de
   ahora las presas de las orillas se cortaban con el filo de la
   pantalla. El descuadre de medio centímetro se conserva. */
const FILA_A_MANO = [-0.85, -0.42, 0, 0.42, 0.85];
const MEDIA_FILA = 0.85;

function filaDePresas(n) {
  if (n === FILA_A_MANO.length) return FILA_A_MANO.slice();
  if (n < 2) return [0];
  return Array.from({ length: n }, (_, i) => -MEDIA_FILA + i * (MEDIA_FILA * 2 / (n - 1)));
}

/* Los huecos del cordel sí eran parejos (-1, -0.5, 0, 0.5, 1), y esta
   cuenta los devuelve clavados para cinco. Se reparten entre los mismos
   postes de siempre porque el tendedero no se mueve: caben más presas,
   más juntas, como en un tendedero de verdad. */
function huecosDelCordel(n) {
  if (n < 2) return [0];
  return Array.from({ length: n }, (_, i) => -1 + i * (2 / (n - 1)));
}

function nuevaPresa(x, z) {
  const g = api.pieza('presa-bacalao');
  g.position.set(x, api.MESA_Y + 0.14, z);
  g.rotation.y = (Math.random() - 0.5) * 0.5;
  g.userData = { tipo: 'presa' };
  g.add(api.sombraBlob(0.62, -0.13));

  /* los cristales de sal, que son el trabajo del nivel */
  const sal = [];
  for (let i = 0; i < SAL_POR_PRESA; i++) {
    const s = api.pieza('grano-sal');
    const a = Math.random() * Math.PI * 2, d = Math.random();
    s.position.set(Math.cos(a) * d * 0.23, 0.068, Math.sin(a) * d * 0.15);
    s.rotation.set(Math.random(), Math.random(), Math.random());
    g.add(s);
    sal.push(s);
  }

  return { obj: g, carne: api.parte(g, 'carne'), sal, limpia: false, tendida: false, x, z };
}

function quitarSal(rec) {
  const s = rec.sal.pop();
  if (!s) return;
  api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.24), '#ffffff', 4, 0.5);
  rec.obj.remove(s);
  hechos++;
  api.progreso(hechos, TOTAL);
  api.sfx('frotar'); api.buzz(5);
  if (!rec.sal.length) {
    rec.limpia = true;
    rec.carne.material.color.set(CARNE_LIMPIA);
    api.sfx('pop2'); api.buzz([10, 20]);
    if (!avisoLimpia) {
      avisoLimpia = true;
      api.pista('Ya está sin sal: ahora <b>arrástrala hacia arriba</b>, hasta el cordel.', 4200);
    }
  }
}

function tender(rec) {
  rec.tendida = true;
  rec.obj.userData.tipo = null;
  hechos++;
  api.progreso(hechos, TOTAL);
  const hueco = huecosCordel.shift();
  const destino = new THREE.Vector3(hueco, CORDEL_Y() - 0.14, CORDEL_Z);
  api.tween(rec.obj, 'position', destino, 0.3);
  rec.obj.rotation.set(-Math.PI / 2.1, 0, (Math.random() - 0.5) * 0.2);
  rec.obj.userData.colgada = { x: hueco, fase: Math.random() * 6 };

  /* la pinza de ropa */
  const pinza = api.pieza('pinza');
  pinza.position.set(0, 0, 0.16);
  rec.obj.add(pinza);

  api.sfx('bien'); api.buzz([15, 25]);
  api.chispas(destino.clone(), '#fff3c9', 8, 0.8);
  revisarFinal();
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  terminado = true;
  api.completar();
}

/* ---------- las moscas ---------- */

function soltarMosca() {
  const candidatas = presas.filter(p => !p.tendida && p.sal.length
    && p !== (frotando || null)                    /* nunca donde está el dedo */
    && !moscas.some(m => m.presa === p && m.estado === 'posada'));
  if (!candidatas.length) return;
  const presa = candidatas[Math.floor(Math.random() * candidatas.length)];
  const m = nuevaMosca(THREE, { escala: 1.1 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'mosca' };
  nodo.add(m.obj);
  nodo.position.copy(presa.obj.position).setY(api.MESA_Y + 0.24);
  nodo.position.x += (Math.random() - 0.5) * 0.2;
  moscasGrupo.add(nodo);
  moscas.push({ obj: nodo, m, presa, t0: api.reloj, estado: 'posada' });
  api.sfx('resist'); api.buzz([12, 12, 12]);
  api.aviso('🪰 ¡Una mosca en el bacalao! Pellízcala o arrastra desde ella para espantarla');
}

function espantar(rec) {
  rec.estado = 'ida';
  rec.obj.userData.tipo = null;
  api.sfx('tab'); api.buzz(10);
  api.chispas(rec.obj.position.clone(), '#cfd8dc', 6, 0.6);
  const lejos = rec.obj.position.clone().add(new THREE.Vector3((Math.random() - .5) * 3, 2.2, -2.2));
  api.volarA(rec.obj, lejos, { dur: 0.55, alto: 0.4 });
  if (!moscas.some(m => m.estado === 'posada')) api.aviso(null);
  api.toast('¡Zape! 🪰');
}

const moscaEn = (presa) => moscas.find(m => m.estado === 'posada' && m.presa === presa);

export default {
  id: 'bacalao',
  /* las presas se tienden a lo ancho del cordel: la cámara se aleja
     para que se vea el espacio disponible en el tendedero y las moscas
     no sorprendan — además necesita verse bien el área de frotado */
  camara: 'cordel',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    perdonMosca = (api.dificultad || 1) > 2;   /* de tres chiles en adelante no se perdona */

    PRESAS = Math.max(1, Math.round(cfg.cantidad ?? 5));
    SAL_POR_PRESA = Math.max(1, Math.round(SAL_POR_PRESA_REF * ((cfg.sal_nivel ?? SAL_REF) / SAL_REF)));
    /* TOTAL se calculaba al declararlo, cuando las presas y la sal eran
       fijas para siempre. Ahora las dos llegan de la parada y la cuenta
       hay que rehacerla aquí: si no, la barra mediría otra receta y el
       nivel se daría por terminado antes o nunca. */
    TOTAL = PRESAS * (SAL_POR_PRESA + 1);

    const frecuencia = cfg.moscas_frecuencia ?? FRECUENCIA_REF;
    /* Frecuencia 0 no es "una mosca cada muchísimo": es un desale sin
       moscas, y se juega así. Con la espera en infinito la cuenta atrás
       de actualizar() nunca llega a cero y no hace falta un caso aparte
       allá abajo, ni tampoco la mosca de apertura. */
    MOSCA_CADA = frecuencia > 0 ? MOSCA_CADA_REF * (FRECUENCIA_REF / frecuencia) : Infinity;
    /* El respiro de apertura no puede durar más que el intervalo mismo:
       en una parada plagada, hacer esperar a la primera mosca más que a
       las siguientes regalaría el tramo más fácil justo al principio. */
    tMosca = frecuencia > 0 ? Math.min(PRIMERA_MOSCA, MOSCA_CADA) : Infinity;

    /* 'moscas_velocidad' se queda sin cablear a propósito. La mosca de
       este nivel no viaja: aparece ya posada sobre la presa y de ahí no
       se mueve hasta que se va. Lo único que corre a una velocidad son
       las alas, y acelerarlas no cambiaría ni un gesto del jugador:
       sería prometer una parada más difícil que se juega igual. Lo que
       aquí aprieta a las moscas es cada cuánto caen, y eso ya lo hace
       'moscas_frecuencia'.

       'gusanos' tampoco: en el bacalao no hay bicho escondido que
       destapar. La mosca no viene dentro de la presa, llega volando con
       el reloj, así que un número de bichos ocultos no tiene dónde
       ponerse. La config de las dos paradas lo trae en 0. */

    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    presas = []; moscas = []; hechos = 0; terminado = false;
    modo = null; cargada = null; frotando = null; ultimoPunto = null;
    avisoLimpia = false;
    huecosCordel = huecosDelCordel(PRESAS);

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    /* el cordel donde se tiende, al fondo: arrastrar "hacia arriba"
       en la pantalla es ir hacia allá en el mundo */
    const cuerda = api.pieza('cordel', { largo: 2.9 });
    cuerda.position.set(0, CORDEL_Y(), CORDEL_Z);
    raiz.add(cuerda);
    [-1.45, 1.45].forEach(x => {
      const poste = api.pieza('poste');
      poste.position.set(x, api.MESA_Y + 0.52, CORDEL_Z);
      raiz.add(poste);
    });

    presasGrupo = new THREE.Group();
    moscasGrupo = new THREE.Group();
    raiz.add(presasGrupo, moscasGrupo);

    const xs = filaDePresas(PRESAS);
    xs.forEach((x, i) => {
      const rec = nuevaPresa(x, TABLA_Z + (i % 2 ? 0.24 : -0.2));
      presasGrupo.add(rec.obj);
      presas.push(rec);
    });

    api.progreso(0, TOTAL);
  },

  objetivos() { return [presasGrupo, moscasGrupo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    if (info.raiz.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === info.raiz && m.estado === 'posada');
      if (rec && api.reloj - rec.t0 < moscaGracia()) { espantar(rec); return; }
      if (!perdonMosca) {
        perdonMosca = true;
        espantar(rec);
        api.sfx('mal'); api.buzz([40, 30, 40]);
        api.aviso('💛 ¡Por poquito! Esta te la perdono — espántala de un roce suave');
        return;
      }
      api.arruinar(ARRUINADO.aplastado('mosca'));
      return;
    }
    if (info.raiz.userData.tipo === 'presa') {
      const rec = presas.find(p => p.obj === info.raiz);
      if (!rec || rec.tendida) return;
      api.sfx('resist');
      api.pista(rec.limpia
        ? 'Está lista: <b>arrástrala hacia el cordel</b> del fondo.'
        : '<b>Frota</b> pasando el dedo de un lado a otro hasta sacarle la sal.', 3200);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + 0.2);
    if (r && r.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === r && m.estado === 'posada');
      if (rec) espantar(rec);
      modo = null;
      return;
    }
    if (r && r.userData.tipo === 'presa') {
      const rec = presas.find(p => p.obj === r);
      if (!rec || rec.tendida) { modo = null; return; }
      if (rec.limpia) {
        modo = 'cargar'; cargada = rec;
        api.sfx('tab'); api.buzz(10);
      } else {
        modo = 'frotar'; frotando = rec;
      }
      return;
    }
    modo = 'frotar'; frotando = null;
  },

  alArrastrar(info) {
    if (terminado) return;

    if (modo === 'cargar' && cargada) {
      const p = api.puntoEnPlano(api.MESA_Y);
      if (!p) return;
      cargada.suelo = { x: p.x, z: p.z };
      /* al ir hacia el fondo la presa se levanta sola hacia el cordel */
      const subida = Math.max(0, -(p.z - 0.05)) * 1.05;
      cargada.obj.position.set(p.x, api.MESA_Y + 0.24 + subida, p.z);
      cargada.obj.rotation.x = -Math.min(1.35, subida * 1.6);
      return;
    }

    if (modo === 'frotar') {
      const p = api.puntoEnPlano(api.MESA_Y + 0.2);
      if (!p) return;
      const prev = ultimoPunto;
      ultimoPunto = p;
      if (!prev) return;
      const paso = Math.hypot(p.x - prev.x, p.z - prev.z);
      /* ¿sobre qué presa está el dedo ahora? */
      const rec = presas.find(x => !x.tendida && Math.abs(x.obj.position.x - p.x) < 0.32 && Math.abs(x.obj.position.z - p.z) < 0.23);
      if (!rec) return;
      const mosca = moscaEn(rec);
      if (mosca) {
        if (api.reloj - mosca.t0 < moscaGracia()) { espantar(mosca); api.pista('La espantaste a tiempo. <b>No las toques</b>: arrastra desde ellas.', 2800); }
        else if (!perdonMosca) {
          perdonMosca = true;
          espantar(mosca);
          api.sfx('mal'); api.buzz([40, 30, 40]);
          api.aviso('💛 ¡Por poquito! Esta te la perdono');
        }
        else api.arruinar(ARRUINADO.aplastado('mosca'));
        return;
      }
      if (!rec.sal.length) return;
      rec.frote = (rec.frote || 0) + paso;
      rec.obj.rotation.z = Math.sin(api.reloj * 22) * 0.04;
      while (rec.frote >= FROTE && rec.sal.length) { rec.frote -= FROTE; quitarSal(rec); }
    }
  },

  /* pellizcar con dos dedos: espanta la mosca más cercana en pantalla.
     Igual que el arrastre-desde-ella, nunca aplasta — el pellizco es
     la forma sin riesgo de sacarla de encima. */
  alPellizcarInicio(info) {
    if (terminado) return;
    let mejor = null, mejorD = 70;
    const mundo = new THREE.Vector3();
    for (const rec of moscas) {
      if (rec.estado !== 'posada') continue;
      rec.obj.getWorldPosition(mundo);
      const p = api.proyectar(mundo);
      const d = Math.hypot(p.x - info.cliente.x, p.y - info.cliente.y);
      if (d < mejorD) { mejorD = d; mejor = rec; }
    }
    if (mejor) espantar(mejor);
  },
  alPellizcarMover() {},
  alPellizcarFin() {},

  alArrastrarFin() {
    if (terminado) { modo = null; return; }
    if (modo === 'cargar' && cargada) {
      const rec = cargada; cargada = null; modo = null;
      const p = rec.suelo || rec.obj.position;
      if (p.z < -0.3) tender(rec);
      else {
        api.tween(rec.obj, 'position', new THREE.Vector3(rec.x, api.MESA_Y + 0.14, rec.z), 0.24);
        rec.obj.rotation.x = 0;
        api.sfx('resist');
        api.pista('Más arriba: hasta el <b>cordel</b> del fondo.', 2600);
      }
      return;
    }
    if (frotando) frotando.obj.rotation.z = 0;
    modo = null; frotando = null; ultimoPunto = null;
  },

  actualizar(dt, t) {
    /* las moscas: llegan, se quedan un rato y se van solas */
    tMosca -= dt;
    if (tMosca <= 0) { tMosca = MOSCA_CADA; soltarMosca(); }
    moscas.forEach(rec => {
      if (rec.estado !== 'posada') return;
      rec.m.animar(t);
      rec.obj.position.y = api.MESA_Y + 0.24 + Math.abs(Math.sin(t * 3.2)) * 0.012;
      if (t - rec.t0 > MOSCA_DURA) {
        rec.estado = 'ida';
        rec.obj.userData.tipo = null;
        api.volarA(rec.obj, rec.obj.position.clone().add(new THREE.Vector3(1.2, 1.8, -1.6)), { dur: 0.7, alto: 0.3 });
        if (!moscas.some(m => m.estado === 'posada')) api.aviso(null);
      }
    });

    /* lo tendido se mece en el cordel */
    presas.forEach(rec => {
      const c = rec.obj.userData.colgada;
      if (!c) return;
      rec.obj.rotation.z = Math.sin(t * 1.6 + c.fase) * 0.09;
    });
  },

  destruir() {
    presas = []; moscas = [];
    presasGrupo = moscasGrupo = null;
    cargada = null; frotando = null; modo = null; terminado = false;
  },
};
