/* ============================================================
   FANESCA — nivel-arroz.js
   LAVAR HASTA QUE EL AGUA SALGA CLARA.

   El arroz es el pariente terco de la quinua, y el gesto es el
   contrario a propósito: la quinua se remueve EN CÍRCULOS y aquí
   los círculos no sirven — el arroz se AGITA, de lado a lado, y
   lo que se mira no es la espuma sino el color del agua: cada
   vaivén la pone más blanca, y cuando ya salió toda la leche del
   almidón, se bota y se pone otra. El agua que sale clara es la
   señal de que se acabó.

     · agita de lado a lado dentro de la batea → el agua se pone blanca
     · vira la batea hacia un costado          → se bota el agua
     · cuando un agua entera sale clara       → listo

   BOTAR ES UN GESTO, como en la quinua: el dedo sale de la batea por
   un costado y la batea se inclina con él hasta que el agua cae.
   Virarla con el agua todavía clara se lleva arroz — un descuido.

   `lavadas_requeridas` es cuántas aguas pide; `agitadas_por_agua`
   cuántos vaivenes suelta cada una. El gorgojo del costal sale a
   la orilla de la batea, como en la quinua.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;
const RADIO_BATEA = 0.66;

/* un vaivén de referencia: ida y vuelta de un tercio de batea */
const VAIVEN = 0.42;

let LAVADAS = 3;
let AGITADAS = 10;
let CON_GORGOJO = 1;
let TOTAL = 30;

let generacion = 0;         /* mata los setTimeout de una partida vieja */
let bateaObj = null, aguaMalla = null, granosGrupo = null;
let plaga = null;
let hechos = 0;             /* agitadas totales */
let enAgua = 0;             /* agitadas del agua actual */
let aguas = 1;
let recorrido = 0;
let dirPrevia = 0;
let previo = null;
let modo = null;
let avisadoBlanca = false;
let avisadoCirculo = false;
let anguloAcum = 0;         /* para pescar al que remueve en círculos */
let pellizcando = false;
let terminado = false;
/* el viraje: inclinación de la batea (0..1) y si ya se botó en este gesto */
let virando = 0;
let viradoEnGesto = false;
const VIRA_DESDE = 0.12;
const VIRA_RECORRIDO = 0.5;
const VIRA_ANGULO = 0.6;

const centro = () => new THREE.Vector3(0, api.MESA_Y + 0.1, TABLA_Z);

function pintar() {
  /* el agua se pone lechosa con lo agitado del agua ACTUAL, y cada
     agua nueva arranca menos turbia: el almidón se va acabando */
  const kAgua = Math.min(1, enAgua / AGITADAS);
  const base = 1 - (aguas - 1) / LAVADAS;      /* cuánta leche queda por soltar */
  const clara = new THREE.Color('#bcd7dd');
  const leche = new THREE.Color('#f2f0e4');
  aguaMalla.material.color.copy(clara).lerp(leche, kAgua * Math.max(0.25, base));
  aguaMalla.material.opacity = 0.5 + 0.3 * kAgua;
}

function agitarHasta(p) {
  if (!p) return;
  const c = centro();
  const r = Math.hypot(p.x - c.x, p.z - c.z);
  if (r > RADIO_BATEA * 1.05) { previo = null; return; }

  const bicho = plaga.cercaDe(p, 0.16);
  if (bicho) { plaga.aplastar(bicho); return; }

  if (!previo) { previo = p.clone(); return; }
  const dx = p.x - previo.x, dz = p.z - previo.z;
  const d = Math.hypot(dx, dz);
  /* el ángulo barrido delata al que vino de la quinua: dando vueltas
     se avanza poquísimo, y la primera vez se le dice por qué */
  const a1 = Math.atan2(previo.z - c.z, previo.x - c.x);
  const a2 = Math.atan2(p.z - c.z, p.x - c.x);
  let da = a2 - a1;
  while (da > Math.PI) da -= Math.PI * 2;
  while (da < -Math.PI) da += Math.PI * 2;
  anguloAcum += Math.abs(da);
  previo = p.clone();
  if (d < 1e-4 || d > 0.5) return;

  if (anguloAcum > Math.PI * 2.2 && hechos < 2 && !avisadoCirculo) {
    avisadoCirculo = true;
    api.pista('Esto no es la quinua: aquí no se dan vueltas — <b>agita de lado a lado</b>.', 3600);
  }

  if (enAgua >= AGITADAS) {
    if (!avisadoBlanca) {
      avisadoBlanca = true;
      api.sfx('resist'); api.buzz([16, 18]);
      api.aviso('El agua ya salió blanca — vira la batea y pon otra', 'bien');
      api.pista('Ya soltó toda la leche. <b>Vira la batea</b> hacia un lado para botar el agua.', 3200);
    }
    return;
  }

  /* lo que cuenta es el VAIVÉN: recorrido en línea, premiando el
     cambio de dirección — el zarandeo de verdad */
  const dir = Math.sign(dx || dz);
  recorrido += d * (dir !== 0 && dirPrevia !== 0 && dir !== dirPrevia ? 1.4 : 1);
  if (dir !== 0) dirPrevia = dir;
  if (recorrido >= VAIVEN) {
    recorrido -= VAIVEN;
    enAgua++; hechos++;
    api.sfx('frotar'); api.buzz(6);
    if (Math.random() < 0.3) api.chispas(c.clone().setY(api.MESA_Y + 0.34), '#f2f0e4', 3, 0.5);
    pintar();
    api.progreso(hechos, TOTAL);
    /* la última agua no pide botarse: si ya no queda leche que soltar,
       el arroz está lavado y el nivel lo dice él solo */
    if (hechos >= TOTAL) listo();
  }
}

/* unos granos que se van con el agua clara */
function perderGrano(lado) {
  const c = centro();
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshLambertMaterial({ color: '#fdfbf4' }));
    g.scale.set(1.6, 0.8, 0.8);
    g.position.set(c.x + lado * RADIO_BATEA * 0.6, api.MESA_Y + 0.3, c.z + (Math.random() - 0.5) * 0.3);
    g.userData.escalaBase = 1;
    raiz.add(g);
    api.volarA(g, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.45 + i * 0.05, alto: 0.4 });
  }
}

function botarAgua(opts = {}) {
  if (terminado) return;
  const lado = opts.lado || -1;
  if (enAgua < 1) {
    /* agua clara botada: se va arroz con ella, y eso es un descuido */
    api.sfx('resist');
    perderGrano(lado);
    api.chispas(centro().clone().setY(api.MESA_Y + 0.36), '#f2f0e4', 8, 0.8);
    if (api.fallo) api.fallo('agua', 'Esa agua estaba clara: se fue arroz con ella');
    else api.aviso('Esa agua está clara todavía — agita primero', 'bien');
    return;
  }
  const completa = enAgua >= AGITADAS;
  aguas += completa ? 1 : 0;
  /* botar a medias no está prohibido: solo no avanza el agua */
  enAgua = 0; recorrido = 0; dirPrevia = 0; previo = null; avisadoBlanca = false;
  if (!opts.desdeGesto) api.tween(bateaObj.rotation, 'z', -0.34, 0.22, undefined, () => api.tween(bateaObj.rotation, 'z', 0, 0.3));
  api.chispas(centro().clone().setY(api.MESA_Y + 0.36), '#f2f0e4', 10, 0.9);
  api.sfx('frotar'); api.buzz([12, 18, 12]);
  api.composta(Math.min(1, (aguas - 1) / LAVADAS));
  pintar();
  if (hechos >= TOTAL) { listo(); return; }
  /* con token: el aviso de "agua nueva" no tiene por qué aparecer en
     el mesón de otro nivel si se sale en este parpadeo */
  const mi = ++generacion;
  setTimeout(() => { if (generacion === mi && !terminado) api.aviso(`Agua ${Math.min(aguas, LAVADAS)} — sigue agitando`); }, 280);
}

function listo() {
  if (terminado) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea', 'bien'); return; }
  terminado = true;
  /* la prueba final: el agua queda clara y el grano blanquito */
  aguaMalla.material.color.set('#bcd7dd');
  aguaMalla.material.opacity = 0.45;
  granosGrupo.children.forEach(m => m.material.color.set('#fdfbf4'));
  api.sfx('bien');
  api.completar();
}

export default {
  id: 'arroz',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    hechos = 0; enAgua = 0; aguas = 1; recorrido = 0; dirPrevia = 0; previo = null;
    modo = null; avisadoBlanca = false; avisadoCirculo = false; anguloAcum = 0;
    pellizcando = false; terminado = false; virando = 0; viradoEnGesto = false;

    LAVADAS = Math.max(1, Math.round(cfg.lavadas_requeridas ?? 3));
    AGITADAS = Math.max(2, Math.round(cfg.agitadas_por_agua ?? 10));
    CON_GORGOJO = Math.max(0, Math.round(cfg.gusanos ?? 1));
    TOTAL = LAVADAS * AGITADAS;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    bateaObj = api.pieza('batea-arroz');
    bateaObj.position.copy(centro());
    bateaObj.userData = { tipo: 'batea' };
    raiz.add(bateaObj);
    aguaMalla = api.parte(bateaObj, 'agua');
    aguaMalla.material = aguaMalla.material.clone();
    granosGrupo = api.parte(bateaObj, 'granos');
    granosGrupo.children.forEach(m => { m.material = m.material.clone(); });

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.12,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    this._sueltos = 0;
    pintar();
    api.progreso(0, TOTAL);
    api.pista('<b>Agita de lado a lado</b> dentro de la batea; cuando el agua salga blanca, <b>vira la batea</b> hacia un lado.', 4600);

    window.__arroz = {
      get hechos() { return hechos; },
      agitar() { if (enAgua < AGITADAS) { enAgua++; hechos++; pintar(); api.progreso(hechos, TOTAL); if (hechos >= TOTAL) listo(); } return hechos; },
      botar() { botarAgua(); },
      sinBichos() { plaga.lista().forEach(r => { r.estado = 'ido'; }); },
    };
  },

  objetivos() { return [bateaObj, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    api.sfx('resist');
    api.pista('Con tocar no suelta el almidón: hay que <b>agitar</b> dentro de la batea.', 2800);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y, 62);
    if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    modo = 'agitar';
    previo = null; anguloAcum = 0;
    agitarHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'agitar') return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.2);
    if (!p) return;
    /* el viraje: el dedo sale por un costado y la batea se inclina
       con él; pasado el recorrido, se bota. Una botada por gesto. */
    const c = centro();
    const fuera = Math.abs(p.x - c.x) - RADIO_BATEA;
    if (fuera > VIRA_DESDE) {
      const lado = Math.sign(p.x - c.x) || -1;
      virando = Math.min(1, (fuera - VIRA_DESDE) / VIRA_RECORRIDO);
      bateaObj.rotation.z = -lado * virando * VIRA_ANGULO;
      if (virando >= 1 && !viradoEnGesto) { viradoEnGesto = true; botarAgua({ desdeGesto: true, lado }); }
      previo = null;
      return;
    }
    if (virando > 0) { virando = 0; api.tween(bateaObj.rotation, 'z', 0, 0.25); }
    agitarHasta(p);
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); if (hechos >= TOTAL) listo(); }
    if (virando > 0 && bateaObj) api.tween(bateaObj.rotation, 'z', 0, 0.3);
    virando = 0; viradoEnGesto = false;
    modo = null; previo = null;
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
    if (hechos >= TOTAL) listo();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;
    if (this._sueltos < CON_GORGOJO) {
      const cuando = CON_GORGOJO > 1 ? this._sueltos / (CON_GORGOJO - 1) : 0;
      const umbral = TOTAL * (0.3 + 0.35 * cuando);
      if (hechos >= umbral) {
        this._sueltos++;
        const lado = this._sueltos % 2 ? -1 : 1;
        plaga.soltar('gorgojo', new THREE.Vector3(lado * (RADIO_BATEA + 0.34), api.MESA_Y, TABLA_Z + 0.1));
      }
    }
    if (aguaMalla) aguaMalla.position.y = 0.12 + Math.sin(t * 1.7) * 0.004;
  },

  destruir() {
    generacion++;
    if (plaga) plaga.destruir();
    bateaObj = null; aguaMalla = null; granosGrupo = null; plaga = null;
    modo = null; previo = null; pellizcando = false; terminado = false;
    virando = 0; viradoEnGesto = false;
    delete window.__arroz;
  },
};
