/* ============================================================
   FANESCA — nivel-sambo.js
   RALLAR EL SAMBO.

   El sambo tierno no se pica: se ralla, y rallar es un vaivén.
   Se agarra la media luna, se apoya contra el rallador y se pasa
   DE ARRIBA ABAJO — cada pasada suelta hebra y gasta la media,
   hasta que no queda nada en la mano y se agarra la siguiente.

     · arrastra desde la media       → la llevas en la mano
     · pásala sobre el rallador      → cada pasada suelta hebra
     · fuera del rallador no se ralla nada (y se nota)

   Lo que cuenta es el RECORRIDO sobre la plancha, como el frote
   del garbanzo pero en grande: dar golpecitos no ralla, y mover
   la media por el aire tampoco. `resistencia` es cuántas pasadas
   pide cada media — el sambo más hecho está más duro.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;

/* la zona útil del rallador, en unidades de mesa */
const RALLA_ANCHO = 0.5, RALLA_HONDO = 0.78;

/* una pasada de referencia recorre el largo de la plancha; con
   resistencia 1 la media pide ~seis pasadas */
const PASADA = 0.6;
const PASADAS_REF = 6;

let MEDIAS = 2;
let PASADAS_POR_MEDIA = PASADAS_REF;
let CON_GUSANO = 1;
let TOTAL = MEDIAS * PASADAS_REF;

let ralladorObj = null, mediaObj = null, montonGrupo = null;
let plaga = null;
let hechos = 0;              /* pasadas ralladas, en total */
let mediaGastada = 0;        /* pasadas de la media actual */
let mediaActual = 0;
let enMano = false;
let recorrido = 0;           /* arrastre acumulado sobre la plancha */
let previo = null;
let avisadoAire = false;
let pellizcando = false;
let terminado = false;

/* a -0.88 la media queda entera en pantalla y no toca el marco del
   rallador (que llega hasta ±0.6); a -1.05 se cortaba por el filo */
const REPOSO = () => new THREE.Vector3(-0.88, 0, TABLA_Z + 0.1);

function ponerMedia() {
  mediaObj = api.pieza('media-sambo');
  const p = REPOSO();
  mediaObj.position.set(p.x, api.MESA_Y + 0.16, p.z);
  mediaObj.userData = { tipo: 'media' };
  mediaObj.add(api.sombraBlob(0.5, -0.14));
  raiz.add(mediaObj);
  mediaGastada = 0;
}

function soltarHebra(donde) {
  const h = api.pieza('hebra-sambo');
  h.position.copy(donde).setY(api.MESA_Y + 0.3);
  h.userData.suelto = true;
  raiz.add(h);
  api.volarA(h, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4 + Math.random() * 0.15, alto: 0.5 });
}

function pasadaHecha() {
  hechos++;
  mediaGastada++;
  api.sfx(hechos % 2 ? 'frotar' : 'corte'); api.buzz(8);
  const donde = mediaObj.position.clone();
  soltarHebra(donde); soltarHebra(donde);
  api.chispas(donde.clone().setY(api.MESA_Y + 0.34), '#f6edcf', 4, 0.6);
  /* la media se gasta a la vista: es la barra de progreso de verdad */
  const k = 1 - mediaGastada / PASADAS_POR_MEDIA;
  mediaObj.scale.setScalar(Math.max(0.35, 0.4 + 0.6 * k));
  api.progreso(hechos, TOTAL);

  if (mediaGastada >= PASADAS_POR_MEDIA) {
    enMano = false;
    mediaObj.userData.tipo = null;
    api.volarA(mediaObj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.45 });
    api.composta(++mediaActual / MEDIAS);
    api.sfx('bien');
    if (mediaActual < MEDIAS) {
      ponerMedia();
      api.aviso('Media rallada — agarra la otra', 'bien');
    } else {
      revisarFinal();
    }
  }
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea', 'bien'); return; }
  terminado = true;
  api.completar();
}

function sobreRallador(p) {
  return Math.abs(p.x) < RALLA_ANCHO && Math.abs(p.z - TABLA_Z) < RALLA_HONDO;
}

function rallarHasta(p) {
  if (!p || !enMano || !mediaObj) return;
  /* la media sigue al dedo, esté donde esté */
  mediaObj.position.set(p.x, api.MESA_Y + 0.24, p.z);
  if (!sobreRallador(p)) {
    previo = null;
    if (!avisadoAire && hechos === 0) {
      avisadoAire = true;
      api.pista('Por el aire no se ralla: pásala <b>sobre la plancha</b>, de arriba abajo.', 3200);
    }
    return;
  }
  if (!previo) { previo = p.clone(); return; }
  /* solo cuenta el vaivén A LO LARGO de la plancha: ir de costado es
     pasear la media, no rallarla */
  const d = Math.abs(p.z - previo.z);
  previo = p.clone();
  if (d < 1e-4 || d > 0.5) return;
  recorrido += d;
  if (Math.random() < 0.25) api.sfx('frotar');
  if (recorrido >= PASADA) {
    recorrido -= PASADA;
    pasadaHecha();
  }
}

export default {
  id: 'sambo',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    hechos = 0; mediaGastada = 0; mediaActual = 0; recorrido = 0;
    enMano = false; previo = null; avisadoAire = false; pellizcando = false; terminado = false;

    MEDIAS = Math.max(1, Math.round(cfg.cantidad ?? 2));
    PASADAS_POR_MEDIA = Math.max(2, Math.round(PASADAS_REF * (1 + 0.35 * ((cfg.resistencia ?? 1) - 1))));
    CON_GUSANO = Math.max(0, Math.round(cfg.gusanos ?? 1));
    TOTAL = MEDIAS * PASADAS_POR_MEDIA;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    ralladorObj = api.pieza('rallador');
    ralladorObj.position.set(0, api.MESA_Y + 0.13, TABLA_Z);
    ralladorObj.userData = { tipo: 'rallador' };
    raiz.add(ralladorObj);

    montonGrupo = new THREE.Group();
    raiz.add(montonGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.13,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    ponerMedia();
    this._sueltos = 0;
    api.progreso(0, TOTAL);

    window.__sambo = {
      get hechos() { return hechos; },
      rallar() { if (mediaObj) { enMano = true; pasadaHecha(); enMano = false; } return hechos; },
      sinBichos() { plaga.lista().forEach(r => { r.estado = 'ido'; }); },
    };
  },

  objetivos() { return [ralladorObj, mediaObj, plaga.grupo].filter(Boolean); },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    api.sfx('resist');
    api.pista('Agárrala y <b>pásala por el rallador</b> — con tocar no sale hebra.', 2800);
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y, 62);
    if (rec && plaga.agarrar(rec)) { enMano = false; this._modo = 'cargar'; return; }
    this._modo = 'rallar';
    enMano = true;
    previo = null;
    rallarHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrar() {
    if (terminado) return;
    if (this._modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    rallarHasta(api.puntoEnPlano(api.MESA_Y + 0.2));
  },

  alArrastrarFin() {
    if (this._modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    this._modo = null;
    previo = null;
    /* al soltar, la media vuelve a su sitio si no se gastó */
    if (enMano && mediaObj && mediaObj.userData.tipo === 'media') {
      const p = REPOSO();
      api.tween(mediaObj.position, 'x', p.x, 0.3);
      api.tween(mediaObj.position, 'z', p.z, 0.3);
      api.tween(mediaObj.position, 'y', api.MESA_Y + 0.16, 0.3);
    }
    enMano = false;
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
      const umbral = Math.min(TOTAL - 1, TOTAL * (0.3 + 0.35 * cuando));
      if (hechos >= umbral) {
        this._sueltos++;
        plaga.soltar('gusano', new THREE.Vector3(0.9, api.MESA_Y, TABLA_Z + 0.2));
      }
    }
  },

  destruir() {
    if (plaga) plaga.destruir();
    plaga = null; ralladorObj = null; mediaObj = null; montonGrupo = null;
    enMano = false; previo = null; pellizcando = false; terminado = false;
    delete window.__sambo;
  },
};
