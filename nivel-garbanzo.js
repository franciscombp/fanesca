/* ============================================================
   FANESCA — nivel-garbanzo.js
   FROTAR EL REMOJADO.

   El garbanzo pasó la noche en agua y la piel ya no está pegada:
   está PUESTA, como una camisita holgada. No se pellizca como el
   chocho ni se aprieta como el fréjol — se FROTA, que es el gesto
   de las dos palmas hecho con un dedo: pasadas cortas encima del
   grano hasta que la camisita cede y se suelta sola.

     · frotar encima de un garbanzo → la camisita se afloja
     · suelta la camisita           → pepa a la batea, piel a la composta
     · tocar sin frotar             → no hace nada (y se dice)

   `resistencia` es cuánto frote pide cada uno: el remojado corto
   se aferra más. El gusanito camina entre los granos, como en
   toda tabla de esta cocina.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const ANCHO_TABLA = 3.1, HONDO_TABLA = 1.7;
const FORMA_REJILLA = 4 / 3;
let TABLA_Z = 0;
const RADIO_DEDO = 0.26;

/* El frote de referencia: con resistencia 1, soltar una camisita
   pide ~0.9 unidades de arrastre encima del grano — tres pasadas
   cortas. Menos y sería un toque disfrazado; más y es lija. */
const FROTE_REF = 0.9;

let TOTAL = 10;
let FROTE_PIDE = FROTE_REF;
let CON_GUSANO = 1;

let grupo = null;
let granos = [];        /* {obj, pepa, camisita, frote, ido, x, z} */
let plaga = null;
let hechos = 0;
let modo = null;
let previo = null;      /* el punto anterior del arrastre, para medir frote */
let avisadoToque = false;
let pellizcando = false;
let terminado = false;

function nuevoGarbanzo(x, z, i) {
  const g = api.pieza('garbanzo', { variante: i });
  g.scale.setScalar(1.6);
  g.position.set(x, api.MESA_Y + 0.15, z);
  g.rotation.y = Math.random() * Math.PI;
  g.userData = { tipo: 'garbanzo' };
  g.add(api.sombraBlob(0.28, -0.14));
  return { obj: g, pepa: api.parte(g, 'pepa'), camisita: api.parte(g, 'camisita'), frote: 0, ido: false, x, z };
}

function soltarCamisita(rec) {
  if (rec.ido) return;
  rec.ido = true;
  rec.obj.userData.tipo = null;
  hechos++;

  const donde = rec.obj.position.clone();
  api.chispas(donde.clone().setY(api.MESA_Y + 0.3), '#f2e3c2', 6, 0.7);
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.buzz(9);

  /* la camisita flota a la composta y la pepa, limpia, a la batea */
  const cam = rec.camisita;
  rec.obj.remove(cam);
  cam.position.copy(donde);
  raiz.add(cam);
  cam.userData.escalaBase = 1.6;
  cam.userData.suelto = true;
  api.volarA(cam, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.55, alto: 0.5 });

  rec.obj.userData.escalaBase = 1.6;
  api.volarA(rec.obj, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.45, alto: 0.55 });
  api.composta(hechos / TOTAL);
  api.progreso(hechos, TOTAL);
  revisarFinal();
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea', 'bien'); return; }
  terminado = true;
  api.completar();
}

/* el frote: lo que el dedo RECORRE encima del grano, no las veces
   que lo toca. La camisita se va aflojando a la vista — se agranda
   y aclara — para que el avance se lea sin ninguna barra. */
function frotarHasta(p) {
  if (!p) return;
  const bicho = plaga.cercaDe(p, 0.16);
  if (bicho) { plaga.aplastar(bicho); previo = null; return; }
  if (!previo) { previo = p.clone(); return; }
  const d = Math.hypot(p.x - previo.x, p.z - previo.z);
  previo = p.clone();
  if (d < 1e-4 || d > 0.6) return;   /* un salto de dedo no es frote */

  for (const rec of granos) {
    if (rec.ido) continue;
    if (Math.hypot(rec.obj.position.x - p.x, rec.obj.position.z - p.z) > RADIO_DEDO) continue;
    rec.frote += d;
    const k = Math.min(1, rec.frote / FROTE_PIDE);
    /* la camisita se ahueca: se agranda y se vuelve más de aire */
    rec.camisita.scale.setScalar(1 + k * 0.35);
    rec.camisita.material.opacity = 0.55 - k * 0.3;
    rec.obj.rotation.y += d * 2.4;
    if (Math.random() < 0.2) api.sfx('frotar');
    if (rec.frote >= FROTE_PIDE) soltarCamisita(rec);
    return;   /* un dedo frota UN garbanzo: el de abajo */
  }
}

export default {
  id: 'garbanzo',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    granos = []; hechos = 0; terminado = false; modo = null; previo = null;
    avisadoToque = false; pellizcando = false;

    TOTAL = Math.max(1, Math.round(cfg.cantidad ?? 10));
    FROTE_PIDE = FROTE_REF * (1 + 0.45 * ((cfg.resistencia ?? 1) - 1));
    CON_GUSANO = Math.max(0, Math.round(cfg.gusanos ?? 1));

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    grupo = new THREE.Group();
    raiz.add(grupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.14,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* la rejilla de los chochos, que es la que cabe en la tabla */
    const COLS = Math.max(1, Math.round(Math.sqrt(TOTAL * FORMA_REJILLA)));
    const FILAS = Math.ceil(TOTAL / COLS);
    const MARGEN = 0.35;
    /* 0.56 y no 0.62: con cuatro columnas y el corrimiento de las
       hileras impares, el garbanzo de la orilla derecha llegaba a
       1.21 y la cámara cercana lo cortaba por el filo (ancho seguro
       ±1.18). Así queda en 1.1 con margen. */
    const pasoX = COLS > 1 ? Math.min(0.56, (ANCHO_TABLA - MARGEN * 2) / (COLS - 1)) : 0.56;
    const pasoZ = FILAS > 1 ? Math.min(0.46, (HONDO_TABLA - MARGEN * 2) / (FILAS - 1)) : 0.46;
    for (let i = 0; i < TOTAL; i++) {
      const f = Math.floor(i / COLS), c = i - f * COLS;
      const enFila = Math.min(COLS, TOTAL - f * COLS);
      const x = (c - (enFila - 1) / 2) * pasoX + (f % 2 ? pasoX * 0.22 : 0);
      const z = TABLA_Z + (f - (FILAS - 1) / 2) * pasoZ;
      const rec = nuevoGarbanzo(x, z, i);
      grupo.add(rec.obj);
      granos.push(rec);
    }

    this._sueltos = 0;
    api.progreso(0, TOTAL);
    api.pista('Pasa el dedo <b>encima del grano</b>, de un lado a otro: la camisita se suelta sola.', 4200);

    window.__garbanzo = {
      get hechos() { return hechos; },
      frotar() { const v = granos.find(g => !g.ido); if (v) soltarCamisita(v); return hechos; },
      sinBichos() { plaga.lista().forEach(r => { r.estado = 'ido'; }); },
    };
  },

  objetivos() { return [grupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    /* tocar no es frotar, y la primera vez se dice */
    if (!avisadoToque) {
      avisadoToque = true;
      api.sfx('resist');
      api.pista('Con tocar no sale: <b>frota</b> — pasadas cortas encima del garbanzo.', 3200);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y, 62);
    if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    modo = 'frotar';
    previo = null;
    frotarHasta(api.puntoEnPlano(api.MESA_Y + 0.15));
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo === 'frotar') frotarHasta(api.puntoEnPlano(api.MESA_Y + 0.15));
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
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
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;
    if (this._sueltos < CON_GUSANO) {
      const cuando = CON_GUSANO > 1 ? this._sueltos / (CON_GUSANO - 1) : 0;
      const umbral = Math.min(TOTAL - 1, TOTAL * (0.25 + 0.35 * cuando));
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = granos.filter(g => !g.ido);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, api.MESA_Y, TABLA_Z);
        plaga.soltar('gusano', donde);
      }
    }
    granos.forEach((g, i) => {
      if (g.ido) return;
      g.obj.position.y = api.MESA_Y + 0.15 + Math.sin(t * 2 + i) * 0.004;
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    granos = []; plaga = null; grupo = null;
    modo = null; previo = null; pellizcando = false; terminado = false;
    delete window.__garbanzo;
  },
};
