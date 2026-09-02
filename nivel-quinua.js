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
     · virar la batea hacia un lado             → se bota el agua
     · repetir hasta que ya no espume

   BOTAR EL AGUA ES UN GESTO, no un botón: el dedo sale de la batea
   hacia un costado, la batea se va inclinando con él y, pasado el
   filo, el agua cae. Virarla con el agua todavía limpia no es
   gratis — se va grano con ella, y eso es un descuido.

   Tres aguas bastan si se remueve bien. Botar antes de tiempo no
   está prohibido: solo cuesta otra agua, y el reloj corre.

   Cuánta saponina trae el grano, cuánto aguanta cada agua y cuántos
   gorgojos vienen escondidos los pone la config de la parada. La
   batea es la misma para el primer lavado flojo y para la quinua
   que espuma tres veces; lo que cambia es el jabón que trae encima.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { RADIO_BATEA } from './modelos/quinua.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;
const ALTO_BATEA = 0.1;

/* La quinua de referencia es la del lavado normal: 0.7 de saponina,
   3.2 vueltas completas de dedo. Las demás paradas se miden contra
   ella en proporción — así una quinua más floja no es otro juego,
   es la misma batea con menos jabón encima. */
const SAPONINA_REF = 0.7;
const VUELTAS_REF = 3.2;
const TOTAL_REF = VUELTAS_REF * Math.PI * 2;

/* Cuánta saponina hay, en vueltas completas de dedo. */
let VUELTAS = VUELTAS_REF;
let TOTAL_RAD = TOTAL_REF;

/* Lo que aguanta UN agua antes de colmarse de espuma, en radianes de
   saponina sacada. Se calibra contra la quinua de referencia y NO
   contra el trabajo de esta parada: la batea tiene el tamaño que
   tiene. Si la capacidad fuera una fracción del total de hoy, un
   grano más jabonoso haría más espuma en la misma cantidad de aguas
   —el agua se estiraría sola— y es justo al revés: más saponina son
   más aguas. */
let LAVADAS = 3;
let POR_AGUA = 1 / LAVADAS;
let CAPACIDAD_AGUA = TOTAL_REF * POR_AGUA;

let CON_GORGOJO = 2;

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
/* el viraje: cuánto va inclinada la batea (0..1) y si ya se botó en
   este mismo gesto — una sola botada por viraje */
let virando = 0;
let viradoEnGesto = false;
/* desde dónde empieza a virar y cuánto hay que salirse para botar */
const VIRA_DESDE = 0.12;
const VIRA_RECORRIDO = 0.5;
const VIRA_ANGULO = 0.6;

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
  const peso = Math.min(1, r / (RADIO_BATEA * 0.42));
  const avance = Math.abs(d) * peso;
  if (avance < 1e-5) return;

  if (espuma >= 1) {
    if (!avisadoColmada) {
      avisadoColmada = true;
      api.sfx('resist'); api.buzz([16, 18]);
      api.aviso('El agua ya no da más — vira la batea y pon otra', 'bien');
      api.pista('Está saturada de espuma. <b>Vira la batea</b> hacia un lado para botar el agua.', 3200);
    }
    return;
  }

  quitado = Math.min(TOTAL_RAD, quitado + avance);
  espuma = Math.min(1, espuma + avance / CAPACIDAD_AGUA);
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

/* unos granos que se van con el agua: la prueba de que virar antes
   de tiempo cuesta */
function perderGrano(lado) {
  const c = centro();
  for (let i = 0; i < 3; i++) {
    const g = api.pieza('grano-quinua');
    if (!g) break;
    g.scale.setScalar(1.6);
    g.position.set(c.x + lado * RADIO_BATEA * 0.6, api.MESA_Y + 0.3, c.z + (Math.random() - 0.5) * 0.3);
    g.userData.escalaBase = 1;
    raiz.add(g);
    api.volarA(g, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.45 + i * 0.05, alto: 0.4 });
  }
}

function botarAgua(opts = {}) {
  if (terminado) return;
  const lado = opts.lado || -1;
  if (espuma < 0.06) {
    /* agua limpia botada: se va grano con ella, y eso es un descuido */
    api.sfx('resist');
    perderGrano(lado);
    api.chispas(centro().clone().setY(api.MESA_Y + 0.36), '#e8f2f4', 8, 0.8);
    if (api.fallo) api.fallo('agua', 'Esa agua estaba limpia: se fue grano con ella');
    else api.aviso('Esa agua está limpia todavía', 'bien');
    return;
  }
  aguas++;
  espuma = 0;
  avisadoColmada = false;
  anguloPrevio = null;
  /* la espuma se va por el borde y el agua vuelve a entrar */
  api.tween(espumaGrupo.scale, 'y', 0.02, 0.26);
  /* con el gesto, la batea ya va inclinada por el dedo: sólo el
     botón de prueba necesita el vaivén */
  if (!opts.desdeGesto) api.tween(bateaObj.rotation, 'z', -0.34, 0.22, undefined, () => api.tween(bateaObj.rotation, 'z', 0, 0.3));
  api.chispas(centro().clone().setY(api.MESA_Y + 0.36), '#e8f2f4', 10, 0.9);
  api.sfx('frotar'); api.buzz([12, 18, 12]);
  api.composta(Math.min(1, (aguas - 1) / LAVADAS));
  setTimeout(() => { if (!terminado) { pintar(); api.aviso(`Agua ${aguas} — sigue removiendo`); } }, 280);
}

/* ---------- terminar ---------- */

function listo() {
  if (terminado) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea', 'bien'); return; }
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
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;

    /* La saponina se cobra en vueltas de dedo: el doble de jabón
       encima es el doble de removida. Va como proporción de la quinua
       de referencia —y no como un factor suelto— para que la parada
       normal siga pidiendo exactamente sus 3.2 vueltas. */
    const saponina = cfg.saponina_nivel ?? SAPONINA_REF;
    VUELTAS = VUELTAS_REF * (saponina / SAPONINA_REF);
    TOTAL_RAD = VUELTAS * Math.PI * 2;

    /* Las lavadas no se cuentan: se reparte el aguante. Cada agua se
       colma con la parte que le toca del trabajo de referencia, así
       que pedir más lavadas es darle menos aguante a cada agua, y el
       jugador las descubre botando, no leyendo un número. */
    LAVADAS = cfg.lavadas_requeridas ?? 3;
    POR_AGUA = 1 / LAVADAS;
    CAPACIDAD_AGUA = TOTAL_REF * POR_AGUA;

    CON_GORGOJO = cfg.gusanos ?? 2;

    /* 'cantidad' se queda sin cablear a propósito: aquí hay UNA batea
       y el grano es un montón, no piezas que se cuenten. Estirar las
       vueltas en su nombre sería cobrar por una segunda batea que
       nadie ve en la mesa. */

    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    quitado = 0; espuma = 0; aguas = 1; anguloPrevio = null;
    modo = null; avisadoColmada = false; pellizcando = false; terminado = false;
    virando = 0; viradoEnGesto = false;

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
    api.pista('Remueve <b>en círculos</b>, pegado a la orilla. Para botar el agua, <b>vira la batea</b> hacia un lado.', 4600);

    window.__quinua = {
      get quitado() { return quitado; },
      get aguas() { return aguas; },
      get espuma() { return espuma; },
      botar() { botarAgua(); },
    };
  },

  objetivos() { return [bateaObj, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    api.sfx('resist');
    api.pista('Con tocar no sale: hay que <b>dar vueltas</b> dentro de la batea.', 2800);
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
    modo = 'remover';
    anguloPrevio = null;
    removerHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'remover') return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.2);
    if (!p) return;
    /* EL VIRAJE: si el dedo sale de la batea por un costado, la batea
       se inclina con él; pasado el recorrido, se bota el agua. Una
       sola botada por gesto: para otra hay que volver a agarrar. */
    const c = centro();
    const fuera = Math.abs(p.x - c.x) - RADIO_BATEA;
    if (fuera > VIRA_DESDE) {
      const lado = Math.sign(p.x - c.x) || -1;
      virando = Math.min(1, (fuera - VIRA_DESDE) / VIRA_RECORRIDO);
      bateaObj.rotation.z = -lado * virando * VIRA_ANGULO;
      if (virando >= 1 && !viradoEnGesto) { viradoEnGesto = true; botarAgua({ desdeGesto: true, lado }); }
      anguloPrevio = null;
      return;
    }
    if (virando > 0) { virando = 0; api.tween(bateaObj.rotation, 'z', 0, 0.25); }
    removerHasta(p);
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); if (quitado >= TOTAL_RAD) listo(); }
    if (virando > 0 && bateaObj) api.tween(bateaObj.rotation, 'z', 0, 0.3);
    virando = 0; viradoEnGesto = false;
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
      /* Se reparten entre el primer tercio y los dos tercios del
         lavado, salgan dos o salgan cinco: antes del 0.3 el jugador
         todavía está entendiendo el círculo, y después del 0.66 el
         bicho aparecería con la batea casi lista, de puro castigo. */
      const t = CON_GORGOJO > 1 ? this._sueltos / (CON_GORGOJO - 1) : 0;
      const umbral = TOTAL_RAD * (0.3 * (1 - t) + 0.66 * t);
      if (quitado >= umbral) {
        this._sueltos++;
        const lado = this._sueltos % 2 ? -1 : 1;
        /* de a pares se alternan los lados; del tercero en adelante se
           corren hacia el frente para no salir uno encima de otro */
        const fila = Math.floor((this._sueltos - 1) / 2) * 0.22;
        plaga.soltar('gorgojo', new THREE.Vector3(lado * (RADIO_BATEA + 0.34), api.MESA_Y, TABLA_Z + 0.1 + fila));
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
    pellizcando = false; terminado = false; virando = 0; viradoEnGesto = false;
    delete window.__quinua;
  },
};
