/* ============================================================
   FANESCA — nivel-arveja.js
   DESHILAR Y CORRER EL PULGAR.

   La arveja parece la haba y en la mano no se parece en nada. La
   vaina de haba se abre frotándole la costura por donde sea. La de
   arveja no: tiene un <b>hilo</b> tenso que sale del rabito, y
   mientras ese hilo esté puesto la vaina no cede. Hay que agarrarlo
   por la punta y jalarlo <b>a lo largo</b> — en el sentido correcto,
   que es hacia el otro extremo. Jalar para el lado no hace nada,
   igual que en la vida.

   Recién con el hilo fuera la vaina se abre sola y quedan los granos
   en fila, tocándose. Ahí sí: el pulgar corre por encima y salen en
   cadena, uno empujando al otro. Cuanto más largo el corrido, más
   agudo el sonido — que es exactamente lo que engancha de desvainar
   arvejas de verdad.

     · arrastrar DESDE EL RABITO a lo largo → sale el hilo, se abre
     · tocar una arveja                     → esa a la batea
     · correr el pulgar por la vaina abierta → salen en cadena
     · arrastrar desde el gusanito           → a la composta

   Y la trampa de siempre: la vaina con bicho se ve igual que las
   otras hasta que se abre. Correr el pulgar sin mirar es cómo se te
   va el gusanito a la olla.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { POR_VAINA, PASO_ARVEJA } from './modelos/arveja.js';

let THREE, raiz, api;

const FILAS = [-0.32, 0.32];
const COLS = [-0.94, 0, 0.94];
const HONDO_TABLA = 1.7;
let TABLA_Z = 0;
const CON_GUSANO = 2;

/* Cuánto mundo hay que jalar para que el hilo salga entero. Es
   deliberadamente más largo que el frote de la haba: deshilar es un
   tirón franco de punta a punta, no un restregón corto. */
const LARGO_HILO = 0.5;
/* Cuánto puede desviarse el tirón del eje de la vaina antes de que
   deje de contar. Generoso —el dedo no va con regla— pero no tanto
   como para que cualquier arrastre deshile. */
const TOLERANCIA = 0.72;

let vainasGrupo = null;
let vainas = [];
let plaga = null;
let hechos = 0;
let TOTAL = 0;
let modo = null;                 /* 'deshilar' | 'correr' | 'cargar' */
let jalando = null;              /* la vaina que se está deshilando */
let ultimoPunto = null;
let cadena = 0;                  /* arvejas seguidas en un solo corrido */
let pellizcando = false;
let terminado = false;

function nuevaVaina(x, z, conGusano) {
  const v = api.pieza('vaina-arveja');
  v.position.set(x, api.MESA_Y + 0.21, z);
  /* casi alineadas con el eje X, pero no del todo: si estuvieran
     perfectas se leería una cuadrícula y no una mesa de cocina */
  v.rotation.y = (Math.random() - 0.5) * 0.42;
  v.userData = { tipo: 'vaina' };

  const bisagra = api.parte(v, 'bisagra');
  const hilo = api.parte(v, 'hilo');

  const granos = [];
  for (let i = 0; i < POR_VAINA; i++) {
    const a = api.pieza('arveja', { variante: i });
    a.position.set((i - (POR_VAINA - 1) / 2) * PASO_ARVEJA, -0.006, 0);
    a.userData = { tipo: 'arveja', i };
    a.visible = false;
    granos.push(a);
    v.add(a);
  }

  return {
    obj: v, bisagra, hilo, granos, conGusano,
    /* de qué lado está el rabito, en coordenadas del mundo: es por
       donde hay que empezar a jalar */
    deshilada: false, abierta: false, vaciada: false, jalado: 0,
  };
}

/* el eje de la vaina en el mundo, ya girada: el tirón se compara
   contra esto, no contra el eje X de la escena */
function ejeDe(rec) {
  const a = rec.obj.rotation.y;
  return { x: Math.cos(a), z: -Math.sin(a) };
}

function deshilar(rec, avance) {
  if (rec.deshilada) return;
  rec.jalado = Math.min(LARGO_HILO, rec.jalado + avance);
  const k = rec.jalado / LARGO_HILO;
  /* el hilo se despega desde el rabito: se acorta y se corre hacia
     la punta contraria, que es lo que se ve al deshilar de verdad */
  rec.hilo.scale.y = Math.max(0.02, 1 - k);
  rec.hilo.position.x = -0.42 * (1 - k) + 0.42 * k * 0.0;
  rec.hilo.position.y = 0.012 + k * 0.05;
  /* y la vaina ya empieza a entreabrirse, para que se note que va */
  rec.bisagra.rotation.x = -0.5 * k;
  if (k < 1) return;

  rec.deshilada = true;
  api.sfx('crack'); api.buzz(16);
  /* el hilo suelto no se queda en la mesa: es basura, va a la composta */
  rec.obj.remove(rec.hilo);
  rec.hilo.position.copy(rec.obj.position);
  rec.hilo.scale.set(1, 1, 1);
  raiz.add(rec.hilo);
  rec.hilo.userData.escalaBase = 1;
  api.volarA(rec.hilo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.45, alto: 0.42 });
  abrirVaina(rec);
}

function abrirVaina(rec) {
  if (rec.abierta) return;
  rec.abierta = true;
  api.tween(rec.bisagra.rotation, 'x', -2.15, 0.32);
  rec.granos.forEach((a, i) => {
    a.visible = true;
    a.scale.setScalar(0.01);
    setTimeout(() => {
      api.tween(a.scale, 'x', 1, 0.2); api.tween(a.scale, 'y', 1, 0.2); api.tween(a.scale, 'z', 1, 0.2);
    }, i * 30);
  });
  if (rec.conGusano) {
    const p = rec.obj.position.clone();
    p.z += 0.12;
    plaga.soltar('gusano', p);
  }
}

function sacarArveja(a) {
  if (!a.visible || a.userData.ida) return false;
  a.userData.ida = true;
  hechos++;
  cadena++;
  api.chispas(a.position.clone(), '#cfe58f', 4, 0.7);
  a.userData.escalaBase = 1;
  api.volarA(a, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.4 + Math.random() * 0.1, alto: 0.58 });
  /* el sonido sube con la cadena: correr el pulgar de punta a punta
     suena a escalita, y esa escalita ES la recompensa del gesto */
  api.sfx(cadena % 2 ? 'pop' : 'pop2');
  api.buzz(cadena > 2 ? 12 : 8);
  api.progreso(hechos, TOTAL);
  revisarVaciadas();
  revisarFinal();
  return true;
}

function revisarVaciadas() {
  vainas.forEach(rec => {
    if (rec.vaciada || !rec.abierta) return;
    if (rec.granos.some(a => !a.userData.ida)) return;
    rec.vaciada = true;
    setTimeout(() => {
      if (!rec.obj.parent) return;
      rec.obj.userData.tipo = null;
      rec.obj.userData.escalaBase = 1;
      api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.5 });
      api.composta(vainas.filter(v => v.vaciada).length / vainas.length);
    }, 240);
  });
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

function bajoElDedo() {
  const hits = api.raycast([vainasGrupo, plaga.grupo], true);
  for (const h of hits) {
    let o = h.object;
    while (o && !(o.userData && o.userData.tipo)) o = o.parent;
    if (o) return o;
  }
  return null;
}

/* de qué vaina es esta malla (la arveja cuelga de su vaina) */
function vainaDe(obj) {
  let o = obj;
  while (o) {
    const rec = vainas.find(v => v.obj === o);
    if (rec) return rec;
    o = o.parent;
  }
  return null;
}

export default {
  id: 'arveja',

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    vainas = []; hechos = 0; terminado = false;
    modo = null; jalando = null; ultimoPunto = null; cadena = 0; pellizcando = false;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    vainasGrupo = new THREE.Group();
    raiz.add(vainasGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.13,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    const conBicho = new Set();
    while (conBicho.size < CON_GUSANO) conBicho.add(Math.floor(Math.random() * (FILAS.length * COLS.length)));

    let i = 0;
    FILAS.forEach(dz => COLS.forEach(dx => {
      const rec = nuevaVaina(dx, TABLA_Z + dz, conBicho.has(i));
      vainasGrupo.add(rec.obj);
      vainas.push(rec);
      i++;
    }));

    TOTAL = vainas.length * POR_VAINA;
    api.progreso(0, TOTAL);
  },

  objetivos() { return [vainasGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado || !info.raiz) return;
    const t = info.raiz.userData.tipo;
    if (t === 'bicho') { plaga.aplastar(plaga.de(info.raiz)); return; }
    if (t === 'arveja') { cadena = 0; sacarArveja(info.raiz); return; }
    if (t === 'vaina') {
      const rec = vainas.find(v => v.obj === info.raiz);
      if (rec && !rec.deshilada) {
        api.sfx('resist');
        api.tween(rec.obj.rotation, 'z', 0.1, 0.07, undefined, () => api.tween(rec.obj.rotation, 'z', 0, 0.14));
        api.pista('Está cosida por el <b>hilo</b>. Agárralo del rabito y <b>jala a lo largo</b>.', 3200);
      }
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const r = info.raiz;
    if (r && r.userData.tipo === 'bicho') {
      const rec = plaga.de(r);
      if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    }
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + 0.23);
    cadena = 0;

    const rec = r ? vainaDe(r) : null;
    if (rec && !rec.deshilada) { modo = 'deshilar'; jalando = rec; return; }

    modo = 'correr';
    if (r && r.userData.tipo === 'arveja') sacarArveja(r);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }

    const p = api.puntoEnPlano(api.MESA_Y + 0.23);
    const prev = ultimoPunto;
    ultimoPunto = p;
    if (!p || !prev) return;
    const dx = p.x - prev.x, dz = p.z - prev.z;
    const paso = Math.hypot(dx, dz);

    if (modo === 'deshilar') {
      if (!jalando || jalando.deshilada) { modo = 'correr'; return; }
      if (paso < 1e-5) return;
      /* SOLO cuenta lo que va en el sentido de la vaina. Jalar de
         través mueve el dedo pero no saca el hilo — igual que jalar
         una hebra en perpendicular no la despega, la revienta. */
      const eje = ejeDe(jalando);
      const proy = (dx * eje.x + dz * eje.z) / paso;
      if (Math.abs(proy) < TOLERANCIA) return;
      deshilar(jalando, paso * Math.abs(proy));
      return;
    }

    if (modo !== 'correr') return;
    const bajo = bajoElDedo();
    if (!bajo) return;
    if (bajo.userData.tipo === 'bicho') { plaga.aplastar(plaga.de(bajo)); return; }
    if (bajo.userData.tipo === 'arveja') { sacarArveja(bajo); return; }
    if (bajo.userData.tipo === 'vaina') {
      /* El dedo pasó por encima de una vaina todavía cosida yendo a lo
         largo: eso ES jalar el hilo, aunque el arrastre no hubiera
         empezado justo sobre ella. Exigir que el gesto ARRANQUE sobre
         una vaina de un centímetro es la misma puntería imposible que
         el motor ya se negó a pedir para agarrar un bicho. Lo que
         cuenta es el sentido del tirón, no dónde apoyaste el dedo. */
      const rec = vainas.find(v => v.obj === bajo);
      if (rec && !rec.deshilada) { modo = 'deshilar'; jalando = rec; }
    }
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; jalando = null; ultimoPunto = null; cadena = 0;
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
    if (plaga) plaga.actualizar(dt, t);
    /* el hilo todavía puesto vibra un pelo: pide que lo jalen */
    vainas.forEach((rec, i) => {
      if (rec.deshilada || !rec.hilo.parent) return;
      rec.hilo.position.y = 0.012 + Math.sin(t * 3 + i) * 0.002;
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    vainas = []; plaga = null; vainasGrupo = null;
    modo = null; jalando = null; ultimoPunto = null; cadena = 0;
    pellizcando = false; terminado = false;
  },
};
