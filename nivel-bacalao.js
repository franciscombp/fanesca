/* ============================================================
   FANESCA — nivel-bacalao.js
   DESALAR EL BACALAO: SACUDIRLE LA SAL Y PONERLO A REMOJAR.

   El único nivel donde una misma presa pide dos gestos distintos,
   y en orden: primero frotar hasta sacarle la sal gruesa de encima,
   después cargarla a la tina de remojo. La presa cambia de
   comportamiento sola — mientras tenga sal, arrastrar sobre ella es
   frotar; cuando ya está limpia, arrastrar es levantarla.

   Así se desala de verdad en la Sierra: la sal de encima se sacude
   o se enjuaga, y el resto sale con horas de remojo y aguas que se
   cambian, desde la víspera. Al día siguiente se cocina en leche.
   (Hasta la 2.4 el nivel tendía las presas en un cordel "a orear",
   que es cosa de curar pescado, no de desalarlo: se corrigió.)

   El bicho de este nivel no camina: vuela y se posa. Las moscas
   van a lo salado, así que aparecen justo donde estás trabajando.
   Aplastar una sobre el pescado arruina todo. Para sacarla se
   arrastra desde ella: se espanta y se va.

   Cuántas presas se remojan, cuánta sal traen encima y cada cuánto
   cae una mosca los pone la config de la parada. La tina y la
   tabla son las mismas para el primer desale y para el bacalao que
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
/* La tina va pegada detrás de la tabla: arrastrar "hacia arriba" en
   la pantalla es ir hacia allá en el mundo. Pasado TINA_LLEGA la
   presa se suelta y cae al agua. */
const TINA_Z = -0.48;
const TINA_LLEGA = -0.2;
let tinaObj = null;
let tinaBase = null;             /* la presa flota a esta altura */
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
let tMosca = 4, huecosTina = [];
let terminado = false, avisoLimpia = false;
let perdonMosca = false;   /* una mosca aplastada perdonada por nivel */

/* La presa con sus vetas y su piel, los cristales de sal y la
   tina viven en modelos/bacalao.js. La carne se busca POR NOMBRE
   porque es la única pieza del juego que cambia de material en
   vivo: al quedar sin sal, pasa de salada a limpia. */

/* La fila de la tabla nunca estuvo a compás: -1.05, -0.52, 0, 0.52,
   1.05, con medio centímetro de más en las orillas. Ese descuadre es lo
   que la hace parecer puesta a mano y no calculada, así que la fila de
   cinco se conserva tal cual y sólo se reparte a compás cuando la parada
   pide otra cantidad. El ancho no crece con las presas: ensanchar la
   fila las sacaría de la madera y de la tina del fondo. Que se aprieten
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

/* Los puestos en la tina van parejos a lo ancho, entre ±0.74: la
   tina mide 1.15 de semieje y la presa 0.31 de media anchura, así que
   más allá se saldría por el filo. Con muchas presas se montan un
   poco unas sobre otras —el zigzag en z y la altura que sube por
   puesto lo hacen ver como lo que es: bacalao apilado en remojo. */
function huecosDeLaTina(n) {
  if (n < 2) return [0];
  return Array.from({ length: n }, (_, i) => -0.74 + i * (1.48 / (n - 1)));
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
      api.pista('Ya está sin la sal de encima: ahora <b>arrástrala hacia arriba</b>, a la tina, a remojar.', 4200);
    }
  }
}

/* a remojar: la presa cae al agua de la tina y se queda flotando.
   `tendida` se conserva como nombre del estado —"ya está fuera de la
   tabla"— porque lo leen las moscas y el frotado. */
function remojar(rec) {
  rec.tendida = true;
  rec.obj.userData.tipo = null;
  hechos++;
  api.progreso(hechos, TOTAL);
  const hueco = huecosTina.shift();
  const orden = PRESAS - huecosTina.length - 1;   /* 0..n-1 según orden de llegada */
  const zig = (orden % 2 ? 0.1 : -0.1);
  const destino = new THREE.Vector3(hueco, tinaBase + orden * 0.012, TINA_Z + zig);
  api.tween(rec.obj, 'position', destino, 0.26);
  /* plana sobre el agua, apenas torcida */
  rec.obj.rotation.set(0, (Math.random() - 0.5) * 0.5, 0);
  rec.obj.userData.flotando = { y: destino.y, fase: Math.random() * 6 };

  /* el chapuzón: agua que salta y el filo del agua que tiembla */
  api.sfx('bien'); api.buzz([15, 25]);
  api.chispas(destino.clone().setY(destino.y + 0.08), '#bcd7dd', 12, 0.9);
  if (tinaObj) {
    const agua = api.parte(tinaObj, 'agua');
    if (agua) {
      const base = tinaObj.userData.nivelAgua || 0.17;
      agua.position.y = base + 0.03;
      api.tween(agua.position, 'y', base, 0.5);
    }
  }
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
  /* la tina va detrás de la tabla: la cámara se pica un poco menos
     para que se vea entera y el arrastre "hacia arriba" tenga a dónde
     ir — además necesita verse bien el área de frotado */
  camara: 'remojo',

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
    huecosTina = huecosDeLaTina(PRESAS);

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    /* la tina de remojo, pegada detrás de la tabla: arrastrar
       "hacia arriba" en la pantalla es ir hacia allá en el mundo */
    tinaObj = api.pieza('tina');
    tinaObj.position.set(0, api.MESA_Y, TINA_Z);
    tinaObj.userData = { tipo: 'tina' };
    raiz.add(tinaObj);
    tinaBase = api.MESA_Y + (tinaObj.userData.nivelAgua || 0.17) - 0.03;

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

    /* ventanita para las pruebas automáticas, como en los otros
       mesones: frotar de golpe, echar a la tina, espantar todo */
    window.__bacalao = {
      get hechos() { return hechos; },
      get presas() { return presas.map(p => ({ limpia: p.limpia, tendida: p.tendida, sal: p.sal.length })); },
      frotar(i) { const p = presas[i]; if (!p) return; while (p.sal.length) quitarSal(p); },
      remojar(i) { const p = presas[i]; if (p && p.limpia && !p.tendida) remojar(p); },
      sinMoscas() { moscas.filter(m => m.estado === 'posada').forEach(espantar); },
    };
  },

  objetivos() { return [presasGrupo, moscasGrupo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    if (info.raiz.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === info.raiz && m.estado === 'posada');
      if (rec && api.reloj - rec.t0 < moscaGracia()) { espantar(rec); return; }
      if (!perdonMosca) {
        perdonMosca = true;
        if (api.fallo) api.fallo('mosca');
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
        ? 'Está lista: <b>arrástrala a la tina</b> del fondo, a remojar.'
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
      /* al ir hacia el fondo la presa se levanta un poco, como si la
         mano la alzara por encima del filo de la tina */
      const subida = Math.max(0, -(p.z - 0.05)) * 0.4;
      cargada.obj.position.set(p.x, api.MESA_Y + 0.24 + subida, p.z);
      cargada.obj.rotation.x = -Math.min(0.5, subida * 1.6);
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
          if (api.fallo) api.fallo('mosca');
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
      if (p.z < TINA_LLEGA) remojar(rec);
      else {
        api.tween(rec.obj, 'position', new THREE.Vector3(rec.x, api.MESA_Y + 0.14, rec.z), 0.24);
        rec.obj.rotation.x = 0;
        api.sfx('resist');
        api.pista('Más arriba: hasta la <b>tina</b> del fondo.', 2600);
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

    /* lo que está en remojo flota: sube y baja apenas, y se ladea */
    presas.forEach(rec => {
      const f = rec.obj.userData.flotando;
      if (!f) return;
      rec.obj.position.y = f.y + Math.sin(t * 1.5 + f.fase) * 0.008;
      rec.obj.rotation.z = Math.sin(t * 1.1 + f.fase) * 0.035;
      rec.obj.rotation.x = Math.cos(t * 0.9 + f.fase) * 0.025;
    });
    /* y el agua de la tina respira */
    if (tinaObj) {
      const agua = api.parte(tinaObj, 'agua');
      if (agua) agua.rotation.z = Math.sin(t * 0.7) * 0.01;
    }
  },

  destruir() {
    presas = []; moscas = [];
    presasGrupo = moscasGrupo = null; tinaObj = null; tinaBase = null;
    cargada = null; frotando = null; modo = null; terminado = false;
    delete window.__bacalao;
  },
};
