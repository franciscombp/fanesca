/* ============================================================
   FANESCA — nivel-chochos.js
   PELAR LOS CHOCHOS.

   Este es el nivel que más se parece a la idea que originó todo el
   minijuego: reventar. El chocho ya vino desamargado —eso son días
   de agua corriente, no un minijuego— y lo que queda es lo bueno:
   apretarlo entre los dedos hasta que la pepa salta fuera de su
   piel, que es un gesto que engancha por lo mismo que enganchan
   los juegos de reventar: sale entero, hace clic, y se ve el antes
   y el después.

     · tocar un chocho      → salta la pepa; la piel a la composta
     · arrastrar por encima → van saltando en fila
     · arrastrar desde el gorgojo → a la composta

   El truco del nivel es de vista, no de dedo: el gorgojo tiene el
   tamaño y el color del chocho. Barrer rápido es la forma más
   fácil de mandarlo a la batea sin haberlo visto.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

/* Doce, no veinticuatro. Con veinticuatro chochos en la tabla cada
   uno medía menos que la yema del dedo: se podía jugar mirando de
   cerca, que es exactamente lo que este juego no quiere pedir.
   Menos piezas y más grandes se aprietan igual de rico y se ven
   desde el otro lado de la mesa.
   `cantidad` mueve esa docena y nada más: filas y columnas no se
   escriben, se deducen de cuántos chochos hay conservando la forma
   4×3 —más ancha que honda, como la tabla—, para que el montón
   crezca a lo ancho antes que hacia el fondo, que es por donde se
   sale del encuadre. Doce vuelven a dar 4×3: la tabla de siempre. */
let TOTAL = 12;
let FILAS = 3, COLS = 4;         /* la rejilla de esa docena; se rehace en construir() */
const FORMA_REJILLA = 4 / 3;     /* cuatro de ancho por tres de fondo, la de doce */
/* La tabla no se planta en un z puesto a ojo: `api.FRENTE_TABLA` es
   hasta dónde puede llegar sin meterse dentro de los cuencos, y de
   ahí se resta media tabla. Si mañana la batea se mueve, la tabla se
   corre sola. */
const ANCHO_TABLA = 3.1, HONDO_TABLA = 1.7;
let TABLA_Z = 0;                 /* se fija en construir(), desde api */
const PASO_X = 0.62, PASO_Z = 0.46;   /* la holgura buena: la de doce */
let CON_GORGOJO = 2;
/* Del apretón no se ve más que el arco de la pepa saliendo disparada,
   así que ahí es donde muerde `velocidad_salto`. La duración del vuelo
   se queda quieta a propósito: es lo que tarda la pepa en caer en la
   batea, y recortarla no se lee como más fuerza sino como una película
   puesta en rápido. */
let ALTO_SALTO = 0.62;
const RADIO_DEDO = 0.24;         /* el dedo tapa más que un píxel */

let chochosGrupo = null;
let chochos = [];                /* {obj, piel, pepa, ido} */
let plaga = null;
let hechos = 0;
let modo = null;
let pellizcando = false;
let terminado = false;

/* La forma del chocho vive en modelos/chochos.js: piel traslúcida
   con la pepa amarilla adentro. Aquí solo se pide y se coloca. */

function nuevoChocho(x, z, i) {
  const g = api.pieza('chocho', { variante: i });
  g.scale.setScalar(1.7);   /* que se vea el chocho, no el píxel */
  g.position.set(x, api.MESA_Y + 0.16, z);
  g.rotation.y = Math.random() * Math.PI;
  g.userData = { tipo: 'chocho' };
  g.add(api.sombraBlob(0.3, -0.15));
  return { obj: g, piel: api.parte(g, 'piel'), pepa: api.parte(g, 'pepa'), ido: false, x, z };
}

function reventar(rec) {
  if (rec.ido) return false;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  hechos++;

  const donde = rec.obj.position.clone();
  api.chispas(donde.clone().setY(api.MESA_Y + 0.3), '#fdf3c8', 6, 0.7);
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.buzz(9);

  /* la pepa salta a la batea y la piel se va a la composta:
     dos destinos distintos, que es justo lo que pasa al pelarlos */
  const pepa = rec.pepa;
  rec.obj.remove(pepa);
  pepa.position.copy(donde);
  raiz.add(pepa);
  pepa.userData.escalaBase = 1;
  api.volarA(pepa, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.42 + Math.random() * 0.12, alto: ALTO_SALTO });

  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.4 });
  api.composta(hechos / TOTAL);

  api.progreso(hechos, TOTAL);
  revisarFinal();
  return true;
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gorgojo antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

/* el dedo es gordo: se resuelve por área, no por rayo */
function apretarEn(punto) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_DEDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const c of chochos) {
    if (c.ido) continue;
    if (Math.hypot(c.obj.position.x - punto.x, c.obj.position.z - punto.z) < RADIO_DEDO) reventar(c);
  }
}

export default {
  id: 'chochos',
  /* trabajo de detalle: la cámara se acerca para que el chocho se vea */
  /* acercada, pero no tanto: la composta y la batea TIENEN que caber
     en cuadro, porque llevar el bicho hasta allá es una regla del juego */
  camara: { pos: [0, 2.7, 3.42], mira: [0, 0.96, 0.44] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    chochos = []; hechos = 0; terminado = false; modo = null; pellizcando = false;

    /* La rejilla sale de la cantidad, no al revés: se conserva la forma
       4×3 de la docena, que es la que cabe en la tabla y en el
       encuadre. Repartir por el ancho real de la tabla daba cinco
       columnas para doce chochos —la tabla es más ancha que honda— y
       eso es otra mesa, no la de siempre. */
    TOTAL = Math.max(1, Math.round(cfg.cantidad ?? 12));
    COLS = Math.max(1, Math.round(Math.sqrt(TOTAL * FORMA_REJILLA)));
    FILAS = Math.ceil(TOTAL / COLS);
    ALTO_SALTO = cfg.velocidad_salto ?? 0.62;
    CON_GORGOJO = Math.max(0, Math.round(cfg.gusanos ?? 2));

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    chochosGrupo = new THREE.Group();
    raiz.add(chochosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gorgojo', vel: 0.14,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* Pasada la docena la holgura de siempre se sale de la madera, y
       agrandar la tabla no es salida: la cámara está puesta para que
       quepan tabla, batea y composta a la vez. Así que la rejilla se
       aprieta hasta el borde útil —apretar nunca estira: con pocos
       chochos la separación sigue siendo la de siempre—, que además
       mantiene a todos sobre la tabla, que es donde el gorgojo camina
       a la altura correcta. */
    const MARGEN = 0.35;   /* medio chocho: que ninguno cuelgue del filo */
    const pasoX = COLS > 1 ? Math.min(PASO_X, (ANCHO_TABLA - MARGEN * 2) / (COLS - 1)) : PASO_X;
    const pasoZ = FILAS > 1 ? Math.min(PASO_Z, (HONDO_TABLA - MARGEN * 2) / (FILAS - 1)) : PASO_Z;

    for (let i = 0; i < TOTAL; i++) {
      const f = Math.floor(i / COLS), c = i - f * COLS;
      /* la última fila puede ir corta, y va centrada por su propia
         cuenta: colgada a la izquierda se leería como un error */
      const enFila = Math.min(COLS, TOTAL - f * COLS);
      const x = (c - (enFila - 1) / 2) * pasoX + (f % 2 ? pasoX * 0.22 : 0);
      const z = TABLA_Z + (f - (FILAS - 1) / 2) * pasoZ;
      const rec = nuevoChocho(x, z, i);
      chochosGrupo.add(rec.obj);
      chochos.push(rec);
    }

    /* los gorgojos salen a mitad de faena, cuando ya agarraste ritmo:
       es cuando de verdad duele tener que frenar y mirar */
    this._sueltos = 0;
    api.progreso(0, TOTAL);
  },

  objetivos() { return [chochosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    /* el tap resuelve por área (el dedo es gordo), así que el bicho
       también hay que buscarlo por área ANTES de apretar: si está en
       el radio, esto es un toque al bicho — susto, no aplastada */
    const punto = api.puntoEnPlano(api.MESA_Y + 0.16);
    const b = punto && plaga.cercaDe(punto, RADIO_DEDO);
    if (b) { plaga.tocado(b); return; }
    apretarEn(punto);
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
    modo = 'apretar';
    apretarEn(api.puntoEnPlano(api.MESA_Y + 0.16));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'apretar') apretarEn(api.puntoEnPlano(api.MESA_Y + 0.16));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
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
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    /* que aparezcan cuando ya vas lanzado, no al principio: el primero
       al cuarto de faena, el último al 60%, y los de en medio repartidos
       entre esas dos marcas. Soltar de golpe todos los que pasen de dos
       —que es lo que salía solo con el umbral viejo— no da tres sustos:
       da un enjambre, y un enjambre se limpia de una sola pasada. */
    if (this._sueltos < CON_GORGOJO) {
      const cuando = CON_GORGOJO > 1 ? this._sueltos / (CON_GORGOJO - 1) : 0;
      /* siempre con trabajo por delante: en una tabla corta las dos
         marcas caen tan pegadas al final que el bicho aparecía cuando
         ya no quedaba nada que pelar —o después de cerrar el nivel—, y
         un gorgojo que se promete en la config y no se ve es peor que
         no ponerlo. Con doce chochos el tope no muerde: 3 y 7.2. */
      const umbral = Math.min(TOTAL - 1, TOTAL * (0.25 + 0.35 * cuando));
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = chochos.filter(c => !c.ido);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, api.MESA_Y, TABLA_Z);
        plaga.soltar('gorgojo', donde);
      }
    }

    /* los que quedan tiemblan un pelo: la mesa está viva */
    chochos.forEach((c, i) => {
      if (c.ido) return;
      c.obj.position.y = api.MESA_Y + 0.16 + Math.sin(t * 2 + i) * 0.004;
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    chochos = []; plaga = null; chochosGrupo = null;
    modo = null; pellizcando = false; terminado = false;
  },
};
