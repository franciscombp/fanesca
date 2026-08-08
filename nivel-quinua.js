/* ============================================================
   FANESCA — nivel-quinua.js
   LAVAR HASTA QUE NO ESPUME.

   La quinua viene forrada en saponina: un jabón que la planta se
   puso encima para que no se la coman los pájaros, y que amarga
   la olla entera si entra con ella. No se quita frotando en seco
   ni escogiendo: se quita <b>removiendo en el agua</b>, en
   círculos, hasta que el agua se llena de espuma. Y ahí no se
   sigue: ahí se bota el agua y se empieza otra.

   Por eso este nivel no mide distancia como los demás — mide
   <b>vueltas</b>. Ir y venir en línea recta no lava nada, igual
   que en la batea de verdad. Hay que dar la vuelta.

     · arrastrar en círculos dentro de la batea → sube la espuma
     · botar el agua (el botón)                 → agua nueva
     · repetir hasta que ya no espume

   Tres aguas bastan si se remueve bien. Botar antes de tiempo no
   está prohibido: solo cuesta otra agua, y el reloj corre.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { RADIO_BATEA } from './modelos/quinua.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;
const ALTO_BATEA = 0.1;

/* Cuánta saponina hay, en vueltas completas de dedo. Tres aguas
   bien removidas: cada agua aguanta una vuelta y pico antes de
   colmarse de espuma. */
const VUELTAS = 4.2;
const TOTAL_RAD = VUELTAS * Math.PI * 2;
/* la espuma de un agua se colma con esta parte del trabajo total */
const POR_AGUA = 1 / 3;
const CON_GORGOJO = 2;

let bateaObj = null, aguaMalla = null, espumaGrupo = null, granosGrupo = null;
let plaga = null;
let quitado = 0;                 /* radianes de saponina ya sacados */
let espuma = 0;                  /* 0..1 dentro del agua de ahora */
let aguas = 1;
let anguloPrevio = null;
let modo = null;
let avisadoColmada = false;
let pellizcando = false;
let terminado = false;

function centro() {
  return new THREE.Vector3(0, api.MESA_Y + ALTO_BATEA, TABLA_Z);
}

/* ---------- remover ---------- */

/* Lo que cuenta es el ÁNGULO barrido alrededor del centro de la
   batea, no lo que recorre el dedo. Un vaivén recto barre ángulo
   casi nulo; una vuelta entera barre 2π. Es la diferencia entre
   revolver y solo mover la mano. */
function removerHasta(p) {
  if (!p) return;
  const c = centro();
  const dx = p.x - c.x, dz = p.z - c.z;
  const r = Math.hypot(dx, dz);
  /* fuera de la batea no se remueve nada */
  if (r > RADIO_BATEA * 1.05) { anguloPrevio = null; return; }

  const bicho = plaga.cercaDe(p, 0.16);
  if (bicho) { plaga.aplastar(bicho); return; }

  const a = Math.atan2(dz, dx);
  if (anguloPrevio === null) { anguloPrevio = a; return; }
  let d = a - anguloPrevio;
  /* el salto de -π a π es la vuelta, no un giro de 360° */
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  anguloPrevio = a;

  /* remover pegado al centro no mueve el agua: el dedo tiene que ir
     por la orilla, que es donde de verdad arrastra el grano */
  const peso = Math.min(1, r / (RADIO_BATEA * 0.55));
  const avance = Math.abs(d) * peso;
  if (avance < 1e-5) return;

  if (espuma >= 1) {
    if (!avisadoColmada) {
      avisadoColmada = true;
      api.sfx('resist'); api.buzz([16, 18]);
      api.aviso('El agua ya no da más — bótala y pon otra');
      api.pista('Está saturada de espuma. <b>Bota el agua</b> y sigue con la nueva.', 3200);
    }
    return;
  }

  quitado = Math.min(TOTAL_RAD, quitado + avance);
  espuma = Math.min(1, espuma + avance / (TOTAL_RAD * POR_AGUA));
  pintar();
  if (Math.random() < 0.12) api.chispas(c.clone().setY(api.MESA_Y + 0.34), '#fdfbf3', 2, 0.5);
  api.progreso(Math.round(quitado), Math.round(TOTAL_RAD));

  if (quitado >= TOTAL_RAD) listo();
}

function pintar() {
  const k = quitado / TOTAL_RAD;
  espumaGrupo.visible = espuma > 0.02;
  espumaGrupo.scale.set(1, Math.max(0.05, espuma), 1);
  espumaGrupo.children.forEach(b => { b.material.opacity = 0.25 + 0.65 * espuma; });
  /* el agua se enturbia con la saponina que sale */
  aguaMalla.material.opacity = 0.42 + 0.28 * espuma;
  /* y el grano se va aclarando: la prueba de que sirve de algo */
  granosGrupo.children.forEach(m => m.material.color.lerpColors(
    new THREE.Color('#ded0a0'), new THREE.Color('#f3ead0'), k));
}

/* ---------- botar el agua ---------- */

function botarAgua() {
  if (terminado) return;
  if (espuma < 0.06) {
    api.sfx('resist');
    api.aviso('Esa agua está limpia todavía');
    return;
  }
  aguas++;
  espuma = 0;
  avisadoColmada = false;
  anguloPrevio = null;
  /* la espuma se va por el borde y el agua vuelve a entrar */
  api.tween(espumaGrupo.scale, 'y', 0.02, 0.26);
  api.tween(bateaObj.rotation, 'z', -0.34, 0.22, undefined, () => api.tween(bateaObj.rotation, 'z', 0, 0.3));
  api.chispas(centro().clone().setY(api.MESA_Y + 0.36), '#e8f2f4', 10, 0.9);
  api.sfx('frotar'); api.buzz([12, 18, 12]);
  api.composta(Math.min(1, (aguas - 1) / 3));
  setTimeout(() => { if (!terminado) { pintar(); api.aviso(`Agua ${aguas} — sigue removiendo`); } }, 280);
}

/* ---------- terminar ---------- */

function listo() {
  if (terminado) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  /* la quinua limpia se va a la olla; el agua turbia se queda */
  granosGrupo.children.forEach((m, i) => {
    const g = m.clone();
    g.userData.escalaBase = m.scale.x;
    g.position.copy(m.getWorldPosition(new THREE.Vector3()));
    raiz.add(g);
    m.visible = false;
    api.volarA(g, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4 + (i % 7) * 0.03, alto: 0.55 });
  });
  api.sfx('bien');
  api.completar();
}

export default {
  id: 'quinua',
  /* la batea manda el encuadre: tiene que verse el agua entera */
  camara: { pos: [0, 3.0, 3.5], mira: [0, 1.06, 0.34] },

  controles: [{ id: 'botar', txt: '🪣 Botar el agua', tip: 'cuando esté espumosa' }],

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    quitado = 0; espuma = 0; aguas = 1; anguloPrevio = null;
    modo = null; avisadoColmada = false; pellizcando = false; terminado = false;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    bateaObj = api.pieza('batea-quinua');
    bateaObj.position.copy(centro());
    bateaObj.userData = { tipo: 'batea' };
    raiz.add(bateaObj);

    aguaMalla = api.parte(bateaObj, 'agua');
    espumaGrupo = api.parte(bateaObj, 'espuma');
    granosGrupo = api.parte(bateaObj, 'granos');
    /* cada grano con su material: se aclaran de a poco, y si lo
       compartieran se aclararían todos de golpe o ninguno */
    granosGrupo.children.forEach(m => { m.material = m.material.clone(); });

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.12,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    this._sueltos = 0;
    pintar();
    api.progreso(0, Math.round(TOTAL_RAD));
    api.pista('Remueve <b>en círculos</b>, pegado a la orilla. Ir y venir derecho no lava.', 4200);
  },

  objetivos() { return [bateaObj, plaga.grupo]; },

  alControl(id, fase) {
    if (id === 'botar' && fase === 'abajo') botarAgua();
  },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    api.sfx('resist');
    api.pista('Con tocar no sale: hay que <b>dar vueltas</b> dentro de la batea.', 2800);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    modo = 'remover';
    anguloPrevio = null;
    removerHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'remover') removerHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); if (quitado >= TOTAL_RAD) listo(); }
    modo = null; anguloPrevio = null;
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
    if (quitado >= TOTAL_RAD) listo();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    /* el gorgojo sale del grano guardado, no del agua: aparece en la
       tabla, al lado de la batea, y arranca para la olla */
    if (this._sueltos < CON_GORGOJO) {
      const umbral = this._sueltos === 0 ? TOTAL_RAD * 0.3 : TOTAL_RAD * 0.66;
      if (quitado >= umbral) {
        this._sueltos++;
        const lado = this._sueltos % 2 ? -1 : 1;
        plaga.soltar('gorgojo', new THREE.Vector3(lado * (RADIO_BATEA + 0.34), api.MESA_Y, TABLA_Z + 0.1));
      }
    }

    /* el agua se mueve sola un poco: una batea quieta se ve de vidrio */
    if (aguaMalla) aguaMalla.position.y = 0.11 + Math.sin(t * 1.7) * 0.004;
    if (espumaGrupo && espumaGrupo.visible) espumaGrupo.rotation.y += dt * 0.25;
  },

  destruir() {
    if (plaga) plaga.destruir();
    bateaObj = null; aguaMalla = null; espumaGrupo = null; granosGrupo = null;
    plaga = null; modo = null; anguloPrevio = null;
    pellizcando = false; terminado = false;
  },
};
