/* ============================================================
   FANESCA — nivel-escoger.js
   ESCOGER EL GRANO (lenteja).

   El único nivel que no premia la velocidad. Escoger el grano es
   lo que se hace sentadas, con el grano regado sobre la mesa y
   conversando: sacar las piedritas, los granos picados, los palos.
   No hay atajo — el atajo es justamente el error.

   Y por eso aquí la regla de los bichos deja de ser un castigo
   añadido y pasa a ser el nivel entero: el gorgojo es del mismo
   tamaño y casi del mismo color que una piedrita. Tocar lo que
   sobra es el gesto correcto; tocar al gorgojo es aplastarlo. La
   única forma de no equivocarse es mirar antes de tocar.

     · tocar una piedrita o un grano picado → fuera, a la composta
     · tocar una lenteja buena              → se pierde (cuesta)
     · arrastrar desde el gorgojo           → a la composta
     · con la mesa limpia, barrer           → todo a la batea
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { ANCHO_SEGURO } from './motor3d.js';

let THREE, raiz, api;

/* la mitad de lentejas, del doble de tamaño: escoger es mirar, y
   mirar no puede depender de tener buena vista */
let BUENAS = 22;
let PIEDRAS = 5;
let PICADOS = 4;
let GORGOJOS = 2;
/* Esa mesa deja de ser fija, pero sigue siendo la parada por defecto,
   así que se guarda tal como nace y de ella salen los valores por
   defecto de la config: `cantidad` se cuenta en granos y arranca en
   estos 31, y los dos porcentajes arrancan en la proporción exacta que
   la mesa de siempre ya tenía. Escribir 0.16 y 0.13 a mano habría dado
   casi lo mismo, y ese "casi" es un grano de diferencia con lo que se
   juega hoy. */
const GRANOS_HOY = BUENAS + PIEDRAS + PICADOS;
const PIEDRAS_PCT_HOY = PIEDRAS / GRANOS_HOY;
const PICADOS_PCT_HOY = PICADOS / GRANOS_HOY;
/* La tabla no se planta en un z puesto a ojo: `api.FRENTE_TABLA` es
   hasta dónde puede llegar sin meterse dentro de los cuencos, y de
   ahí se resta media tabla. Si mañana la batea se mueve, la tabla se
   corre sola. */
const HONDO_TABLA = 1.7;
let TABLA_Z = 0;                 /* se fija en construir(), desde api */
/* el grano tiene su propio bulto: se deja margen para que ninguno
   quede con medio cuerpo fuera del cuadro.
   Se gira la disposición: más en profundidad (Z) que en ancho (X) */
const ANCHO = 0.62, HONDO = 1.02;
const RADIO_DEDO = 0.17;         /* fino a propósito, pero no imposible */
const RADIO_BARRIDO = 0.28;

let granosGrupo = null;
let granos = [];                 /* {obj, clase:'buena'|'piedra'|'picado', ido} */
let plaga = null;
let sacados = 0;                 /* impurezas fuera */
let recogidas = 0;               /* lentejas buenas en la batea */
let perdidas = 0;
let fase = 'escoger';            /* 'escoger' | 'barrer' */
let modo = null;
let pellizcando = false;
let terminado = false;

const SUCIAS = () => PIEDRAS + PICADOS;
const TOTAL = () => SUCIAS() + BUENAS;

/* Las tres formas —la buena, la piedra angulosa y la picada con su
   agujero— viven en modelos/lenteja.js. Esa diferencia de forma ES
   el nivel: si se vieran igual, escoger sería adivinar. */

const PIEZA_DE = { buena: 'lenteja', piedra: 'piedra', picado: 'lenteja-picada' };

function nuevoGrano(clase, x, z) {
  const g = api.pieza(PIEZA_DE[clase] || 'lenteja', { variante: granos.length });
  /* al doble: la lenteja de verdad es chiquita, pero un juego que se
     juega con el dedo no puede tener el objetivo del tamaño de un
     grano de verdad. Lo que importa es que la piedra siga
     pareciéndose a la lenteja, no que ambas sean minúsculas. */
  g.scale.setScalar(2);
  g.position.set(x, api.MESA_Y + 0.15, z);
  g.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
  g.userData = { tipo: 'grano', clase };
  return { obj: g, clase, ido: false };
}

function sacar(rec) {
  if (rec.ido) return;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  const buena = rec.clase === 'buena';

  if (buena) {
    /* tocar una lenteja buena la manda a la composta: no arruina la
       olla, pero se pierde, y eso ya duele lo justo */
    perdidas++;
    api.sfx('resist'); api.buzz(12);
    api.toast('Esa estaba buena 😕');
  } else {
    sacados++;
    api.sfx('pop'); api.buzz(8);
    api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.26), '#cfd8dc', 4, 0.5);
  }
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.44, alto: 0.45 });
  api.composta((sacados + perdidas) / (SUCIAS() + 6));

  api.progreso(sacados + recogidas, TOTAL());
  revisarFase();
}

function recoger(rec) {
  if (rec.ido || rec.clase !== 'buena') return;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  recogidas++;
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4, alto: 0.5 });
  api.sfx(recogidas % 2 ? 'pop' : 'pop2');
  api.progreso(sacados + recogidas, TOTAL());
  revisarFinal();
}

/* la mesa está limpia cuando no queda ni una impureza a la vista */
function revisarFase() {
  if (fase !== 'escoger') return;
  const sucio = granos.some(g => !g.ido && g.clase !== 'buena');
  if (sucio || plaga.vivos()) return;
  fase = 'barrer';
  api.sfx('bien');
  api.aviso(null);
  api.pista('Limpio. Ahora <b>barre las lentejas</b> a la batea.', 4200);
  api.toast('Mesa limpia ✦');
}

function revisarFinal() {
  if (terminado) return;
  if (granos.some(g => !g.ido && g.clase === 'buena')) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea', 'bien'); return; }
  terminado = true;
  api.completar();
}

function bajoElDedo(punto, radio) {
  if (!punto) return null;
  let mejor = null, mejorD = radio;
  for (const g of granos) {
    if (g.ido) continue;
    const d = Math.hypot(g.obj.position.x - punto.x, g.obj.position.z - punto.z);
    if (d < mejorD) { mejorD = d; mejor = g; }
  }
  return mejor;
}

function barrerEn(punto) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_BARRIDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const g of granos) {
    if (g.ido) continue;
    if (Math.hypot(g.obj.position.x - punto.x, g.obj.position.z - punto.z) > RADIO_BARRIDO) continue;
    if (g.clase === 'buena') recoger(g);
    else {
      /* barrer con basura todavía puesta la manda a la batea: es el
         error que este nivel entero existe para enseñar */
      api.arruinar({
        titulo: 'Barriste con todo',
        texto: 'Te llevaste una piedra a la batea junto con las lentejas. Eso se siente al primer bocado y no hay cómo sacarlo después: toca escoger de nuevo.',
      });
      return;
    }
  }
}

export default {
  id: 'escoger',
  /* el nivel entero es mirar de cerca: la cámara acompaña */
  /* acercada, pero con los dos cuencos dentro del encuadre: sin eso
     no hay dónde soltar el gorgojo */
  camara: { pos: [0, 2.9, 3.75], mira: [0, 1.08, 0.42] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    granos = []; sacados = 0; recogidas = 0; perdidas = 0;
    fase = 'escoger'; modo = null; pellizcando = false; terminado = false;

    /* La mesa se arma en este orden y no en otro: primero cuánto grano
       hay —`cantidad` se cuenta en granos, que es la unidad que el dedo
       toca— y sobre ese montón muerden los dos porcentajes. Las buenas
       son lo que sobra, no un tercer número escrito aparte: así una
       parada mal sumada no puede dejar más basura que lenteja, y
       `piedras_pct` significa de verdad "de cada diez granos, uno".
       Redondeando, porque media piedra no existe. */
    const cuantos = Math.max(1, Math.round(cfg.cantidad ?? GRANOS_HOY));
    PIEDRAS = Math.round(cuantos * (cfg.piedras_pct ?? PIEDRAS_PCT_HOY));
    PICADOS = Math.round(cuantos * (cfg.defectos_pct ?? PICADOS_PCT_HOY));
    /* nunca menos de una lenteja buena: sin nada que llevar a la batea
       el nivel no tendría final al que llegar */
    BUENAS = Math.max(1, cuantos - PIEDRAS - PICADOS);
    GORGOJOS = Math.max(0, Math.round(cfg.gusanos ?? 2));
    /* Una mesa sin piedras, sin picados y sin gorgojos nace trabada: a
       'barrer' sólo se pasa sacando la última impureza, y si no hubo
       ninguna esa transición no llega nunca — el jugador tendría que
       sacrificar una lenteja buena para desbloquear su propia mesa. Si
       nace limpia, que nazca en fase de barrer. */
    if (!SUCIAS() && !GORGOJOS) fase = 'barrer';

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    granosGrupo = new THREE.Group();
    raiz.add(granosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.1,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* El cuadro donde se riegan crece con la raíz del número de granos,
       porque lo que se reparte es superficie. En el cuadro de siempre,
       al doble de grano el sorteo de posiciones se queda sin hueco
       libre —pide 0.115 de separación y se rinde a los 60 intentos— y
       termina montando unos granos sobre otros; un grano tapado no se
       puede escoger, que es hacer trampa contra el jugador. La otra
       salida, achicarlos, es precisamente la que este nivel tiene
       prohibida. El ancho topa donde la cámara deja de garantizar
       mundo; el fondo sigue de largo, que es hacia donde la regada ya
       estaba estirada a propósito. */
    const crece = Math.sqrt(cuantos / GRANOS_HOY);
    const anchoRegada = Math.min(ANCHO * crece, ANCHO_SEGURO - 0.20);
    const hondoRegada = HONDO * crece;

    /* regadas de verdad, no en rejilla: si estuvieran alineadas se
       verían de un golpe y no habría nada que escoger */
    const puestos = [];
    const meter = (clase) => {
      let x, z, k = 0;
      do {
        x = (Math.random() - 0.5) * 2 * anchoRegada;
        z = TABLA_Z + (Math.random() - 0.5) * 2 * hondoRegada;
        k++;
      } while (k < 60 && puestos.some(p => Math.hypot(p.x - x, p.z - z) < 0.115));
      puestos.push({ x, z });
      const rec = nuevoGrano(clase, x, z);
      granosGrupo.add(rec.obj);
      granos.push(rec);
    };
    for (let i = 0; i < BUENAS; i++) meter('buena');
    for (let i = 0; i < PIEDRAS; i++) meter('piedra');
    for (let i = 0; i < PICADOS; i++) meter('picado');

    /* los gorgojos están desde el principio: son parte de lo que hay
       que encontrar, no una sorpresa a mitad de camino.
       Salen entre el grano, con la regada que le haya tocado a esta
       parada, pero sin pasar del filo de la madera aunque la regada
       crezca: fuera de la tabla el bicho camina a otra altura y deja de
       confundirse con una piedrita, que es todo lo que lo hace temible.
       El tope va medido en la misma vara que la regada, con el 0.8 sin
       aplicar todavía, para que la mesa de siempre siga saliendo de la
       misma cuenta de siempre y no de una equivalente. */
    const hondoBicho = Math.min(hondoRegada, HONDO_TABLA / 2 / 0.8);
    for (let i = 0; i < GORGOJOS; i++) {
      const x = (Math.random() - 0.5) * 2 * anchoRegada * 0.8;
      const z = TABLA_Z + (Math.random() - 0.5) * 2 * hondoBicho * 0.8;
      plaga.soltar('gorgojo', new THREE.Vector3(x, api.MESA_Y, z));
    }
    /* El aviso describe ESTA mesa, no la de siempre: prometer gorgojos
       donde no hay ninguno enseña a desconfiar del aviso, y en un nivel
       que se gana mirando antes de tocar, el aviso es parte de lo que
       se mira. */
    const ojo = GORGOJOS === 0 ? '' : GORGOJOS === 1 ? '. Ojo: hay un gorgojo' : '. Ojo: hay gorgojos';
    api.aviso(fase === 'barrer'
      ? 'Ni una piedra: barre las lentejas a la batea'
      : 'Saca piedritas y granos picados' + ojo);
    api.progreso(0, TOTAL());
  },

  objetivos() { return [granosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    const punto = api.puntoEnPlano(api.MESA_Y + 0.13);
    const bicho = plaga.cercaDe(punto, RADIO_DEDO);
    if (bicho) { plaga.aplastar(bicho); return; }
    const g = bajoElDedo(punto, RADIO_DEDO);
    if (!g) return;
    if (fase === 'barrer' && g.clase === 'buena') { recoger(g); return; }
    sacar(g);
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
    if (fase === 'barrer') { modo = 'barrer'; barrerEn(api.puntoEnPlano(api.MESA_Y + 0.13)); return; }
    /* mientras haya basura, arrastrar no barre: obligaría a mirar menos */
    modo = null;
    api.pista('Todavía no. <b>Toca</b> las piedritas y los granos picados uno por uno.', 3000);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'barrer') barrerEn(api.puntoEnPlano(api.MESA_Y + 0.13));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFase(); revisarFinal(); }
    modo = null;
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
    revisarFase();
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga) plaga.actualizar(dt, t);
  },

  destruir() {
    if (plaga) plaga.destruir();
    granos = []; plaga = null; granosGrupo = null;
    modo = null; pellizcando = false; terminado = false;
  },
};
