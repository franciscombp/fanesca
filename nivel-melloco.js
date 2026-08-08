/* ============================================================
   FANESCA — nivel-melloco.js
   RASPAR LA BABAZA.

   El melloco viene envuelto en su propia baba, y esa baba no se
   quita apretando: apretando se te dispara. Se quita <b>raspando</b>
   —el pulgar de un lado a otro, con paso firme y sin arrebato— y
   ese es el único gesto de esta cocina que castiga la prisa en el
   acto y no al final.

   Es el reverso exacto del choclo. Ahí, ir rápido es la gracia:
   abres un hueco y la hilera se va sola. Aquí, ir rápido es perder
   el melloco de vista y tener que ir a buscarlo al otro lado de la
   tabla. La mano aprende la diferencia en dos resbalones.

     · arrastrar despacio sobre un melloco → se le va la baba
     · arrastrar de golpe                  → se dispara, y a empezar
     · arrastrar desde el gusanito         → a la composta

   La baba no se cuenta en una barra: se VE. La cáscara brillante se
   va poniendo mate hasta que el melloco queda limpio y se va solo
   a la batea.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';

let THREE, raiz, api;

const CUANTOS = 8;
const HONDO_TABLA = 1.7;
const ANCHO_TABLA = 3.1;
let TABLA_Z = 0;
const ALTO = 0.16;               /* a qué altura descansa un melloco */
const RADIO_DEDO = 0.17;
const CON_GUSANO = 2;
/* el mismo tope que le puso modelos/melloco.js a la baba */
const BABA_OPACA = 0.34;

/* Cuánto mundo hay que raspar para dejar uno limpio. */
const RASPADO = 0.95;
/* Y el filo de la navaja: si el dedo recorre más que esto en un solo
   cuadro, el melloco sale disparado. Está calibrado contra el paso
   de un arrastre cómodo (~0.02-0.05 por cuadro a 60fps); pasarse de
   aquí es ir con ansias, no ir rápido. */
const RESBALON = 0.075;

let mellocosGrupo = null;
let mellocos = [];               /* {obj, babaza, baba, limpio} */
let plaga = null;
let hechos = 0;
let modo = null;
let ultimoPunto = null;
let resbalados = 0;
let pellizcando = false;
let terminado = false;

function nuevoMelloco(x, z, i) {
  const g = api.pieza('melloco', { variante: i });
  g.position.set(x, api.MESA_Y + ALTO, z);
  g.rotation.y = Math.random() * Math.PI;
  g.rotation.z = (Math.random() - 0.5) * 0.3;
  g.userData = { tipo: 'melloco' };
  g.add(api.sombraBlob(0.4, -ALTO + 0.12));
  return { obj: g, babaza: api.parte(g, 'babaza'), cuerpo: api.parte(g, 'cuerpo'), baba: 1, limpio: false, resbalando: 0 };
}

/* que ninguno se escape del mundo jugable: la tabla y un margen */
function encajar(v) {
  v.x = Math.max(-ANCHO_TABLA / 2 + 0.16, Math.min(ANCHO_TABLA / 2 - 0.16, v.x));
  v.z = Math.max(TABLA_Z - HONDO_TABLA / 2 + 0.14, Math.min(TABLA_Z + HONDO_TABLA / 2 - 0.14, v.z));
  return v;
}

function raspar(rec, cuanto) {
  if (rec.limpio) return;
  rec.baba = Math.max(0, rec.baba - cuanto / RASPADO);
  /* la baba se ve, no se cuenta: la cáscara pasa de brillante a mate */
  rec.babaza.material.opacity = BABA_OPACA * rec.baba;
  rec.babaza.scale.setScalar(1 - 0.1 * (1 - rec.baba));
  if (rec.baba > 0) {
    if (Math.random() < 0.25) api.chispas(rec.obj.position.clone().setY(api.MESA_Y + ALTO + 0.1), '#eef6d8', 2, 0.5);
    return;
  }

  rec.limpio = true;
  rec.obj.userData.tipo = null;
  rec.babaza.visible = false;
  /* limpio se ve más claro: el melloco lavado pierde el velo gris */
  if (rec.cuerpo) rec.cuerpo.material.color.set('#f8dc8e');
  hechos++;
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.buzz(12);
  api.chispas(rec.obj.position.clone().setY(api.MESA_Y + ALTO + 0.12), '#fbf3d0', 8, 0.8);
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.46, alto: 0.6 });
  api.progreso(hechos, CUANTOS);
  revisarFinal();
}

/* se te disparó: sale patinando en el sentido del dedo */
function resbalar(rec, dx, dz) {
  if (rec.limpio || rec.resbalando > 0) return;
  const d = Math.hypot(dx, dz) || 1;
  const destino = encajar(new THREE.Vector3(
    rec.obj.position.x + (dx / d) * (0.55 + Math.random() * 0.3),
    api.MESA_Y + ALTO,
    rec.obj.position.z + (dz / d) * (0.55 + Math.random() * 0.3),
  ));
  rec.resbalando = 0.34;
  api.tween(rec.obj.position, 'x', destino.x, 0.32);
  api.tween(rec.obj.position, 'z', destino.z, 0.32);
  api.tween(rec.obj.rotation, 'y', rec.obj.rotation.y + 2.6, 0.32);
  api.sfx('resist'); api.buzz([18, 24]);
  if (!resbalados++) {
    api.pista('Se te disparó. La baba no se quita a lo bruto: <b>raspa parejo</b>, sin arrebato.', 3600);
  }
}

function rasparEn(punto, paso, dx, dz) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_DEDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  for (const rec of mellocos) {
    if (rec.limpio || rec.resbalando > 0) continue;
    if (Math.hypot(rec.obj.position.x - punto.x, rec.obj.position.z - punto.z) > RADIO_DEDO) continue;
    if (paso > RESBALON) { resbalar(rec, dx, dz); continue; }
    raspar(rec, paso);
  }
}

function revisarFinal() {
  if (terminado || hechos < CUANTOS) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

export default {
  id: 'melloco',
  /* de cerca: la baba solo se lee si el melloco ocupa pantalla */
  camara: { pos: [0, 2.88, 3.6], mira: [0, 1.08, 0.42] },

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    mellocos = []; hechos = 0; terminado = false;
    modo = null; ultimoPunto = null; resbalados = 0; pellizcando = false;

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    mellocosGrupo = new THREE.Group();
    raiz.add(mellocosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.12,
      /* Este nivel se juega con el dedo pegado a la mesa barriendo de
         lado a lado, así que el bicho casi siempre nace debajo de una
         mano que ya viene en movimiento. Un segundo de gracia no da
         para reaccionar a eso: el jugador ni alcanza a leer el aviso. */
      gracia: 1.8,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* regados, no en cuadrícula: vienen de un costal, no de una caja */
    for (let i = 0; i < CUANTOS; i++) {
      const f = Math.floor(i / 4), c = i % 4;
      const x = (c - 1.5) * 0.62 + (f % 2 ? 0.16 : -0.1) + (Math.random() - 0.5) * 0.1;
      const z = TABLA_Z + (f - 0.5) * 0.46 + (Math.random() - 0.5) * 0.1;
      const rec = nuevoMelloco(x, z, i);
      mellocosGrupo.add(rec.obj);
      mellocos.push(rec);
    }

    this._sueltos = 0;
    api.progreso(0, CUANTOS);
  },

  objetivos() { return [mellocosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    /* un toque seco no raspa nada: la baba pide recorrido */
    if (info.raiz && info.raiz.userData.tipo === 'melloco') {
      api.sfx('resist');
      api.pista('Con tocarlo no sale. <b>Raspa</b>: pasa el dedo por encima, de lado a lado.', 3200);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    modo = 'raspar';
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + ALTO);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'raspar') return;

    const p = api.puntoEnPlano(api.MESA_Y + ALTO);
    const prev = ultimoPunto;
    ultimoPunto = p;
    if (!p || !prev) return;
    const dx = p.x - prev.x, dz = p.z - prev.z;
    rasparEn(p, Math.hypot(dx, dz), dx, dz);
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; ultimoPunto = null;
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
      const umbral = this._sueltos === 0 ? CUANTOS * 0.3 : CUANTOS * 0.65;
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = mellocos.filter(m => !m.limpio);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, api.MESA_Y, TABLA_Z);
        plaga.soltar('gusano', donde);
      }
    }

    mellocos.forEach((rec, i) => {
      if (rec.resbalando > 0) rec.resbalando = Math.max(0, rec.resbalando - dt);
      if (rec.limpio) return;
      /* los babosos relumbran: el brillo que se apaga al raspar */
      if (rec.babaza.visible) {
        rec.babaza.material.opacity = BABA_OPACA * rec.baba * (0.88 + Math.sin(t * 2.6 + i) * 0.12);
      }
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    mellocos = []; plaga = null; mellocosGrupo = null;
    modo = null; ultimoPunto = null; pellizcando = false; terminado = false;
  },
};
