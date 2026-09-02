/* ============================================================
   FANESCA — nivel-queso.js
   DESMENUZAR EL QUESO — Y LA LECHE AL FINAL.

   El queso fresco no se corta: se desmigaja con los dedos, pedazo
   a pedazo, y cada miga cae a la batea. Cuando el bloque se acabó
   entra la leche — de un solo golpe, como manda la casa: se agarra
   la jarra, se lleva sobre la batea y se vuelca entera.

     · pellizca (o toca) el bloque → se desprende una miga
     · acabado el bloque           → agarra la jarra y viértela
     · la mosca se posa en el queso → espántala ANTES de seguir

   La mosca es la de la casa: al queso fresco le encanta. Recién
   posada no mata —el dedo venía en camino—, pero desmigar con la
   mosca puesta es meterla a la olla. `moscas_frecuencia` dice
   cada cuánto vuelve.
   ============================================================ */

import { nuevaMosca } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;

const MOSCA_CADA_REF = 12;    /* segundos entre moscas, con frecuencia 0.35 */
const FRECUENCIA_REF = 0.35;
/* recién posada, espantarla no cuenta como aplastarla — pero el
   respiro se acorta con la dificultad de la parada (api.dificultad),
   y el perdón de la primera mosca sólo existe en la presentación */
const MOSCA_GRACIA_REF = 0.9;
const moscaGracia = () => MOSCA_GRACIA_REF * ((api.dificultad || 1) <= 2 ? 0.8 : 0.5);

let PEDAZOS = 12;
let MOSCA_CADA = MOSCA_CADA_REF;

let bloqueObj = null, bloqueMalla = null, jarraObj = null, moscasGrupo = null;
let moscas = [];              /* {obj, m, t0, estado} */
let proximaMosca = 0;
let hechos = 0;               /* migas + 1 por la leche */
let TOTAL = 13;
let fase = 'desmigar';        /* desmigar → leche */
let jarraEnMano = false;
let vertiendo = 0;
let perdonMosca = false;
let terminado = false;

/* a 0.92 la jarra cabe entera en el ancho seguro; a 1.05 se cortaba */
const JARRA_REPOSO = () => new THREE.Vector3(0.92, api.MESA_Y + 0.26, TABLA_Z + 0.15);

function moscaPosada() { return moscas.find(m => m.estado === 'posada'); }

function soltarMosca() {
  const m = nuevaMosca(THREE, { escala: 1.1 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'mosca' };
  nodo.add(m.obj);
  nodo.position.copy(bloqueObj.position).setY(api.MESA_Y + 0.55);
  nodo.position.x += (Math.random() - 0.5) * 0.3;
  moscasGrupo.add(nodo);
  moscas.push({ obj: nodo, m, t0: api.reloj, estado: 'posada' });
  api.sfx('resist'); api.buzz([12, 12, 12]);
  api.aviso('🪰 ¡Una mosca en el queso! Espántala de un roce antes de seguir');
}

function espantar(rec) {
  rec.estado = 'ida';
  rec.obj.userData.tipo = null;
  api.sfx('tab'); api.buzz(10);
  api.chispas(rec.obj.position.clone(), '#cfd8dc', 6, 0.6);
  const lejos = rec.obj.position.clone().add(new THREE.Vector3((Math.random() - .5) * 3, 2.2, -2.2));
  api.volarA(rec.obj, lejos, { dur: 0.55, alto: 0.4 });
  api.aviso(null);
  api.toast('¡Zape! 🪰');
}

function desmigar() {
  if (terminado || fase !== 'desmigar') return;
  /* desmigar con la mosca encima es mandarla adentro: la primera se
     perdona con susto, la segunda arruina la olla */
  const mosca = moscaPosada();
  if (mosca) {
    if (api.reloj - mosca.t0 < moscaGracia()) { espantar(mosca); return; }
    if (!perdonMosca) {
      perdonMosca = true;
      espantar(mosca);
      api.pista('💛 ¡Casi la metes a la olla! <b>Espanta la mosca</b> antes de desmigar. Esta te la perdono.', 4600);
      return;
    }
    api.arruinar(ARRUINADO.aplastado('mosca'));
    return;
  }

  hechos++;
  const donde = bloqueObj.position.clone().setY(api.MESA_Y + 0.4);
  donde.x += (Math.random() - 0.5) * 0.4;
  const miga = api.pieza('miga-queso', { variante: hechos });
  miga.position.copy(donde);
  miga.userData.suelto = true;
  raiz.add(miga);
  api.volarA(miga, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.42 + Math.random() * 0.12, alto: 0.55 });
  api.sfx(hechos % 2 ? 'pop' : 'pop2'); api.buzz(9);
  api.chispas(donde, '#f8f3e2', 5, 0.6);

  /* el bloque se gasta a la vista */
  const k = 1 - Math.min(1, hechos / PEDAZOS);
  bloqueObj.scale.set(0.6 + 0.4 * k, Math.max(0.25, k), 0.6 + 0.4 * k);
  api.progreso(hechos, TOTAL);

  if (hechos >= PEDAZOS) {
    fase = 'leche';
    bloqueObj.visible = false;
    if (api.rotulo) api.rotulo('La leche · el queso y la leche');
    api.pista('Queso listo. Ahora <b>agarra la jarra</b> y vuélcala sobre la batea — de un solo golpe.', 4600);
    api.sfx('bien');
  }
}

function verterLeche(dt) {
  if (fase !== 'leche' || !jarraEnMano) return;
  const p = jarraObj.position;
  const sobreBatea = Math.hypot(p.x - api.BATEA.x, p.z - api.BATEA.z) < 0.7;
  if (!sobreBatea) { vertiendo = Math.max(0, vertiendo - dt * 2); jarraObj.rotation.z = 0; return; }
  /* encima de la batea la jarra se vuelca sola: sostenerla ahí ES el gesto */
  vertiendo += dt;
  jarraObj.rotation.z = -Math.min(1.4, vertiendo * 2.2);
  if (Math.random() < 0.5) api.chispas(api.BATEA.clone().setY(api.MESA_Y + 0.45), '#fdfbf4', 3, 0.5);
  if (Math.random() < 0.2) api.sfx('frotar');
  if (vertiendo >= 0.9 && !terminado) {
    terminado = true;
    hechos = TOTAL;
    api.progreso(hechos, TOTAL);
    jarraEnMano = false;
    api.volarA(jarraObj, JARRA_REPOSO(), { dur: 0.4, alto: 0.3 });
    api.sfx('bien');
    api.completar();
  }
}

export default {
  id: 'queso',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    moscas = []; hechos = 0; fase = 'desmigar'; jarraEnMano = false;
    vertiendo = 0; terminado = false;
    perdonMosca = (api.dificultad || 1) > 2;   /* de tres chiles en adelante no se perdona */

    PEDAZOS = Math.max(2, Math.round(cfg.pedazos ?? 12));
    TOTAL = PEDAZOS + 1;   /* la leche es el último punto */
    const frecuencia = cfg.moscas_frecuencia ?? FRECUENCIA_REF;
    MOSCA_CADA = frecuencia > 0 ? MOSCA_CADA_REF * (FRECUENCIA_REF / frecuencia) : Infinity;
    proximaMosca = api.reloj + Math.min(MOSCA_CADA, 7);

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    bloqueObj = api.pieza('bloque-queso');
    bloqueObj.position.set(-0.2, api.MESA_Y + 0.32, TABLA_Z);
    bloqueObj.userData = { tipo: 'bloque' };
    bloqueObj.add(api.sombraBlob(0.7, -0.3));
    raiz.add(bloqueObj);
    bloqueMalla = api.parte(bloqueObj, 'bloque');

    jarraObj = api.pieza('jarra-leche');
    jarraObj.position.copy(JARRA_REPOSO());
    jarraObj.userData = { tipo: 'jarra' };
    raiz.add(jarraObj);

    moscasGrupo = new THREE.Group();
    raiz.add(moscasGrupo);

    api.progreso(0, TOTAL);

    window.__queso = {
      get hechos() { return hechos; },
      get fase() { return fase; },
      desmigar() { const m = moscaPosada(); if (m) espantar(m); desmigar(); return hechos; },
      leche() { if (fase === 'leche' && !terminado) { terminado = true; hechos = TOTAL; api.progreso(hechos, TOTAL); api.completar(); } },
    };
  },

  objetivos() { return [bloqueObj, jarraObj, moscasGrupo].filter(Boolean); },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === info.raiz && m.estado === 'posada');
      if (rec) { espantar(rec); return; }
    }
    const p = api.puntoEnPlano(api.MESA_Y + 0.3);
    if (fase === 'desmigar' && p && Math.hypot(p.x - bloqueObj.position.x, p.z - bloqueObj.position.z) < 0.75) {
      desmigar();
      return;
    }
    if (fase === 'leche') api.pista('Agarra la <b>jarra</b> y llévala sobre la batea.', 2600);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'mosca') {
      const rec = moscas.find(m => m.obj === info.raiz && m.estado === 'posada');
      if (rec) { espantar(rec); return; }
    }
    const p = api.puntoEnPlano(api.MESA_Y + 0.3);
    if (!p) return;
    if (fase === 'leche' && Math.hypot(p.x - jarraObj.position.x, p.z - jarraObj.position.z) < 0.6) {
      jarraEnMano = true;
      return;
    }
    if (fase === 'desmigar' && Math.hypot(p.x - bloqueObj.position.x, p.z - bloqueObj.position.z) < 0.75) {
      this._arrastrado = 0;
      this._modo = 'desmigar';
      desmigar();
    }
  },

  alArrastrar(info) {
    if (terminado) return;
    if (jarraEnMano) {
      const p = api.puntoEnPlano(api.MESA_Y + 0.4);
      if (p) { jarraObj.position.set(p.x, api.MESA_Y + 0.45, p.z); }
      return;
    }
    /* arrastrar sobre el bloque también desmiga, cada tanto trecho:
       es el pulgar barriendo el borde */
    if (this._modo === 'desmigar' && fase === 'desmigar') {
      this._arrastrado = (this._arrastrado || 0) + (info.delta ? Math.hypot(info.delta.x, info.delta.y) : 4);
      if (this._arrastrado > 60) {
        this._arrastrado = 0;
        const p = api.puntoEnPlano(api.MESA_Y + 0.3);
        if (p && Math.hypot(p.x - bloqueObj.position.x, p.z - bloqueObj.position.z) < 0.75) desmigar();
      }
    }
  },

  alArrastrarFin() {
    this._modo = null;
    if (jarraEnMano) {
      jarraEnMano = false;
      jarraObj.rotation.z = 0;
      vertiendo = 0;
      api.volarA(jarraObj, JARRA_REPOSO(), { dur: 0.35, alto: 0.25 });
    }
  },

  alPellizcarInicio(info) {
    if (terminado) return;
    /* el pellizco es el gesto bueno: espanta la mosca si la hay, y si
       no, desmigaja donde caiga */
    const rec = moscas.find(m => m.estado === 'posada');
    if (rec) { espantar(rec); return; }
    if (fase === 'desmigar') desmigar();
  },

  actualizar(dt, t) {
    /* las moscas llegan cada tanto, solo mientras hay queso expuesto */
    if (!terminado && fase === 'desmigar' && api.reloj >= proximaMosca && MOSCA_CADA !== Infinity) {
      proximaMosca = api.reloj + MOSCA_CADA;
      if (!moscaPosada()) soltarMosca();
    }
    moscas.forEach(m => {
      if (m.estado !== 'posada') return;
      m.obj.position.y = api.MESA_Y + 0.55 + Math.sin(t * 9 + m.t0) * 0.015;
      if (m.m && m.m.animar) m.m.animar(t);
    });
    verterLeche(dt);
  },

  destruir() {
    moscas = []; bloqueObj = null; bloqueMalla = null; jarraObj = null; moscasGrupo = null;
    jarraEnMano = false; terminado = false;
    delete window.__queso;
  },
};
