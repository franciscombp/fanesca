/* ============================================================
   FANESCA — nivel-zapallo.js
   PARTIR, DESPEPITAR, PELAR Y CORTAR.

   Un zapallo no llega a la olla en rodajas. Llega redondo y con su
   rabo, y antes del cuchillo hay tres cosas que hacer con las manos.
   Este nivel las hace todas, en el orden en que se hacen:

     1. PARTIR    — un trazo largo de adelante hacia atrás, por el
                    lomo. Se abre en dos mitades que se mecen.
     2. DESPEPITAR— barrer el hueco: las pepas y las hebras salen a
                    la composta a puñados.
     3. PELAR     — jalar cada tira de cáscara a lo largo del gajo.
     4. CORTAR    — ahora sí, las tajadas, cruzando la línea.

   Es el mismo arco que el choclo: primero desvestir, después el
   gesto rápido. Y la lección de siempre en el último tramo —una
   tajada solo cae cuando quedó suelta por los dos lados— sigue
   entera, porque es la mejor idea que tenía este nivel.

   El gusano aparece cuando la pulpa queda al aire, que es cuando
   aparece de verdad. No corre a la batea: se pasea sobre el
   zapallo. El peligro no es que llegue, es que lo partas en dos sin
   verlo porque estaba justo sobre tu línea.
   ============================================================ */

import { nuevoGusano } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { N, GRUESO, R, R_ENTERO, xDeTajada, xDeFrontera } from './modelos/zapallo.js';

let THREE, raiz, api;

const HONDO_TABLA = 1.6;
let TABLA_Z = 0;
const TOL_X = 0.34;             /* cuánto puede desviarse el corte */
const LARGO_MIN = 0.3;          /* profundidad mínima del trazo */
const GUSANO_VEL = 0.055;

const PEPAS = 5;                /* por mitad */
const TIRAS = 4;                /* tiras de cáscara por mitad */
/* Cuánto se separan al partirse. Con 0.62 las tiras de cáscara de
   los flancos caían a 30px del filo de la pantalla: alcanzables, pero
   pidiendo puntería de borde, que es justo lo que este juego no
   quiere. Más juntas caben con holgura. */
const SEP_MITAD = 0.5;

/* el marcador va sumando las cuatro faenas, para que la barra se
   mueva desde el primer gesto y no se quede plana media partida */
const TOTAL = 1 + PEPAS * 2 + TIRAS * 2 + N;

let fase = 'partir';            /* partir | despepitar | pelar | cortar */
let grupo = null;
let entero = null;
let mitades = [];               /* {obj, lado, pepas[], tiras[], pelada} */
let tajadas = [];
let guias = [];
let cortes = new Set();
let bicho = null;
let hechos = 0;
let modo = null, cargado = false, pellizcando = false;
let p0 = null;
let terminado = false;

const ALTO = () => api.MESA_Y + 0.1;

function sumar(n) {
  hechos += n;
  api.progreso(hechos, TOTAL);
}

/* ============================================================
   1 · PARTIR
   ============================================================ */

function ponerEntero() {
  entero = api.pieza('zapallo-entero');
  entero.position.set(0, ALTO() + R_ENTERO * 0.78, TABLA_Z);
  entero.userData = { tipo: 'entero' };
  entero.add(api.sombraBlob(1.5, -R_ENTERO * 0.78 + 0.06));
  grupo.add(entero);

  /* la guía por el lomo: la única línea de esta fase */
  /* el zapallo entero es más ancho que alto, así que la guía se pide
     con sus dos radios: escalada por igual se metía dentro de la
     calabaza por los costados y flotaba por arriba */
  const g = api.pieza('guia-zapallo', {
    ry: R_ENTERO * 0.78 + 0.045,
    rz: R_ENTERO + 0.045,
    grosor: 1.5,
  });
  g.position.set(0, ALTO() + 0.02, TABLA_Z);
  g.userData.ignorar = true;
  grupo.add(g);
  guias.push({ grupo: g, b: 'lomo' });

  api.rotulo('Partir el zapallo');
  api.pista('Córtalo en dos: <b>un trazo de arriba a abajo</b>, por la línea.', 4200);
}

function partir() {
  if (fase !== 'partir') return;
  fase = 'despepitar';

  const g = guias.find(x => x.b === 'lomo');
  if (g) { g.grupo.visible = false; }
  grupo.remove(entero);
  entero = null;

  api.sfx('corte'); api.buzz([26, 40, 26]);
  api.destello('rgba(255,220,150,.42)');
  api.sacudir(0.55);
  api.chispas(new THREE.Vector3(0, ALTO() + R_ENTERO, TABLA_Z), '#ffe6ab', 22, 1.3);

  [-1, 1].forEach(lado => {
    const m = api.pieza('mitad-zapallo');
    /* La media calabaza se apoya en su cúpula, así que hay que
       levantarla el alto de esa cúpula. Con el origen puesto en la
       tabla, la mitad de abajo quedaba ENTERRADA y desde la cámara
       se veía un disco pálido y plano: parecía una tortilla, no
       medio zapallo. */
    m.position.set(0, ALTO() + R_ENTERO * 0.78, TABLA_Z);
    /* Las dos mitades miran al jugador. Antes una se giraba media
       vuelta para "reflejarla", que en una cúpula no se nota —pero sí
       se notaba en las tiras de cáscara: las cuatro de esa mitad
       quedaban en la cara de ATRÁS, fuera del alcance del dedo y casi
       fuera de vista. Media faena imposible por un giro decorativo. */
    m.rotation.y = lado * 0.12;
    m.userData = { tipo: 'mitad', lado };
    grupo.add(m);

    const rec = { obj: m, lado, pepas: [], tiras: [], pelada: false, limpia: false };

    /* las pepas, dentro del hueco */
    for (let i = 0; i < PEPAS; i++) {
      const a = (i / PEPAS) * Math.PI * 2 + lado;
      const r = R_ENTERO * (0.14 + (i % 2) * 0.14);
      const p = api.pieza('pepa-zapallo');
      p.scale.setScalar(1.5);
      p.position.set(Math.cos(a) * r, 0.03 + (i % 2) * 0.01, Math.sin(a) * r);
      p.rotation.y = a;
      p.userData = { tipo: 'pepa', ignorar: false };
      m.add(p);
      rec.pepas.push(p);

      /* y su hebra al lado: lo que de verdad cuesta sacar */
      const f = api.pieza('fibra-zapallo', { variante: i });
      f.position.set(Math.cos(a + 0.5) * r * 1.2, 0.02, Math.sin(a + 0.5) * r * 1.2);
      f.rotation.y = a;
      f.userData.ignorar = true;
      m.add(f);
      rec.fibras = rec.fibras || [];
      rec.fibras.push(f);
    }

    mitades.push(rec);
    /* se mecen al abrirse, como se abre un zapallo de verdad */
    api.tween(m.position, 'x', lado * SEP_MITAD, 0.42, undefined);
    api.tween(m.rotation, 'z', lado * 0.16, 0.3, undefined,
      () => api.tween(m.rotation, 'z', 0, 0.36));
  });

  sumar(1);
  api.rotulo('Sacar las pepas');
  api.pista('<b>Barre las pepas</b> con el dedo, como limpiando la mesa.', 3600);
  api.toast('¡Se abrió! 🎃');
}

/* ============================================================
   2 · DESPEPITAR
   ============================================================ */

function despepitarEn(punto) {
  if (fase !== 'despepitar' || !punto) return;
  let saco = 0;
  for (const m of mitades) {
    if (m.limpia) continue;
    for (const p of m.pepas) {
      if (p.userData.ida) continue;
      const w = p.getWorldPosition(new THREE.Vector3());
      if (Math.hypot(w.x - punto.x, w.z - punto.z) > 0.38) continue;
      p.userData.ida = true;
      p.userData.tipo = null;
      m.obj.remove(p);
      p.position.copy(w);
      p.userData.escalaBase = p.scale.x;
      raiz.add(p);
      api.volarA(p, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.44, alto: 0.5 });
      saco++;
    }
    if (saco && m.fibras) {
      const f = m.fibras.find(x => !x.userData.ida);
      if (f) {
        f.userData.ida = true;
        const w = f.getWorldPosition(new THREE.Vector3());
        m.obj.remove(f);
        f.position.copy(w);
        f.userData.escalaBase = f.scale.x;
        raiz.add(f);
        api.volarA(f, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.42 });
      }
    }
    if (m.pepas.every(p => p.userData.ida)) m.limpia = true;
  }
  if (!saco) return;

  sumar(saco);
  api.sfx(saco > 1 ? 'pop2' : 'pop');
  api.buzz(saco > 1 ? 14 : 9);
  api.chispas(punto.clone().setY(ALTO() + 0.3), '#f3e6bc', 4 + saco * 2, 0.8);
  api.composta(Math.min(1, hechos / (1 + PEPAS * 2)));

  if (mitades.every(m => m.limpia)) pasarAPelar();
}

/* ============================================================
   3 · PELAR
   ============================================================ */

function pasarAPelar() {
  fase = 'pelar';
  api.rotulo('Pelar la cáscara');
  api.pista('<b>Pasa el dedo por cada tira</b> de cáscara y se despega.', 3600);
  api.toast('Limpio por dentro ✨');

  mitades.forEach(m => {
    for (let i = 0; i < TIRAS; i++) {
      /* Cada tira cuelga de su propio pivote girado: orientar la malla
         con tres ángulos de Euler a la vez se enreda —el orden importa
         y las tiras salían atravesadas— mientras que un grupo girado
         en Y y la tira apenas inclinada dentro se lee bien y se
         entiende al leerlo. */
      const piv = new THREE.Group();
      piv.rotation.y = -Math.PI / 2 + (i + 0.5) / TIRAS * Math.PI;
      const c = api.pieza('cascara-zapallo', { largo: R_ENTERO * 1.2 });
      c.position.set(0, -R_ENTERO * 0.26, R_ENTERO * 0.84);
      c.rotation.x = 0.42;
      c.userData = { tipo: 'cascara', i };
      piv.add(c);
      m.obj.add(piv);
      m.tiras.push(c);
    }
  });

  nacerBicho();
}

function pelarEn(punto, dz) {
  if (fase !== 'pelar' || !punto) return;
  /* cualquier arrastre que pase por la tira la despega: la regla de
     "solo a lo largo" era realista y frustrante a la vez, y de las
     dos, la que importa es la segunda */
  for (const m of mitades) {
    for (const c of m.tiras) {
      if (c.userData.ida) continue;
      const w = c.getWorldPosition(new THREE.Vector3());
      if (Math.hypot(w.x - punto.x, w.z - punto.z) > 0.42) continue;
      c.userData.ida = true;
      c.userData.tipo = null;
      if (c.parent) c.parent.remove(c);
      c.position.copy(w);
      c.userData.escalaBase = 1;
      raiz.add(c);
      api.volarA(c, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.55 });
      sumar(1);
      api.sfx('frotar'); api.buzz(11);
      api.chispas(w.clone().setY(w.y + 0.2), '#e9b56a', 6, 0.7);
      api.composta(Math.min(1, hechos / (1 + PEPAS * 2 + TIRAS * 2)));
      return;                    /* una tira por tirón: se siente mejor */
    }
  }
}

function todoPelado() {
  return mitades.every(m => m.tiras.every(c => c.userData.ida));
}

/* ============================================================
   4 · CORTAR
   ============================================================ */

function pasarACortar() {
  fase = 'cortar';
  api.rotulo('Cortar en tajadas');
  api.pista('<b>Un trazo por línea</b>, de arriba a abajo. La tajada cae al quedar suelta por los dos lados.', 4200);
  api.toast('¡Pelado! 🔪');

  mitades.forEach(m => { grupo.remove(m.obj); });

  for (let i = 0; i < N; i++) {
    const g = api.pieza('tajada-zapallo');
    g.position.set(xDeTajada(i), ALTO(), TABLA_Z);
    g.userData = { tipo: 'zapallo', i };
    grupo.add(g);
    tajadas.push({ mesh: g, i, ida: false });
    /* entran cayendo, escalonadas: se ve que el zapallo se acomodó */
    g.scale.setScalar(0.01);
    setTimeout(() => {
      api.tween(g.scale, 'x', 1, 0.26); api.tween(g.scale, 'y', 1, 0.26); api.tween(g.scale, 'z', 1, 0.26);
    }, i * 45);
  }

  for (let b = 1; b < N; b++) {
    const g = api.pieza('guia-zapallo', { grosor: 1.2 });
    g.position.set(xDeFrontera(b), ALTO(), TABLA_Z);
    grupo.add(g);
    guias.push({ grupo: g, b });
  }

  if (bicho) bicho.x = xDeFrontera(2 + Math.floor(Math.random() * (N - 3)));
}

function libre(b) { return b <= 0 || b >= N || cortes.has(b); }

function revisarSueltas() {
  let cayeron = 0;
  tajadas.forEach(t => {
    if (t.ida) return;
    if (!libre(t.i) || !libre(t.i + 1)) return;
    t.ida = true;
    t.mesh.userData.tipo = null;
    cayeron++;
    api.chispas(t.mesh.position.clone().setY(ALTO() + 0.3), '#ffd28a', 10, 0.9);
    t.mesh.userData.escalaBase = 1;
    api.volarA(t.mesh, api.BATEA.clone().setY(api.MESA_Y + 0.24), { dur: 0.5, alto: 0.72 });
  });
  if (cayeron) {
    sumar(cayeron);
    api.sfx(cayeron > 1 ? 'bien' : 'pop');
    api.buzz(cayeron > 1 ? [14, 20, 14] : 11);
    if (cayeron > 1) api.toast(`¡${cayeron} tajadas de una! 🎃`);
  }
  revisarFinal();
}

function cortar(b) {
  if (cortes.has(b)) return false;

  if (bicho && bicho.estado === 'suelto' && Math.abs(bicho.x - xDeFrontera(b)) < 0.19) {
    api.destello('rgba(230,57,70,.55)');
    api.arruinar({
      titulo: 'Lo partiste en dos',
      texto: 'El cuchillo pasó justo por encima del gusano. Medio gusano se quedó en la tajada y ese zapallo ya no va a la olla: hay que empezar de nuevo.',
    });
    return true;
  }

  cortes.add(b);
  const g = guias.find(x => x.b === b);
  if (g) api.tween(g.grupo.scale, 'y', 0.01, 0.18, undefined, () => { g.grupo.visible = false; });
  api.sfx('corte'); api.buzz([12, 18]);
  api.chispas(new THREE.Vector3(xDeFrontera(b), ALTO() + R, TABLA_Z), '#fff3c9', 9, 0.8);
  revisarSueltas();
  return true;
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  if (bicho && bicho.estado !== 'ido') { api.aviso('Falta sacar el gusano antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

/* ============================================================
   el gusano paseandero
   ============================================================ */

function nacerBicho() {
  if (bicho) return;
  const gus = nuevoGusano(THREE, { eje: 'z', escala: 2.2, color: '#c4e076', color2: '#9dc24f', segmentos: 6 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'bicho' };
  nodo.add(gus.obj);
  const x = (Math.random() - 0.5) * 1.1;
  nodo.position.set(x, ALTO() + 0.24, TABLA_Z + 0.02);
  nodo.rotation.y = Math.PI / 2;
  raiz.add(nodo);
  bicho = { nodo, gus, x, dir: 1, estado: 'suelto' };
  api.sfx('crack'); api.buzz([25, 30, 25]);
  api.aviso('🪱 ¡Un gusano en la pulpa! Llévalo a la composta — no lo aplastes');
  api.pista('<b>Pellízcalo con dos dedos</b> y llévalo a la composta verde (o arrástralo con uno).', 5000);
}

function alturaBicho() {
  return fase === 'cortar' ? ALTO() + R + 0.1 : ALTO() + 0.24;
}

function bichoEncima() {
  if (!bicho || bicho.estado !== 'suelto') return;
  bicho.nodo.position.set(bicho.x, alturaBicho(), TABLA_Z + 0.02);
}

let perdonado = false;

function tocarBicho() {
  if (!bicho || bicho.estado !== 'suelto') return;
  bicho.nodo.position.x += bicho.dir * -0.06;
  api.sfx('resist'); api.buzz([18, 14]);
  api.pista('Así no sale: <b>pellízcalo</b> con dos dedos, o <b>arrastra desde él</b>.', 2800);
}

function aplastarBicho() {
  if (!bicho || bicho.estado !== 'suelto') return;
  if (!perdonado) {
    perdonado = true;
    api.sfx('mal'); api.buzz([40, 30, 40]);
    api.destello('rgba(230,57,70,.3)');
    api.aviso('💛 ¡Uy, casi lo aplastas! Esta te la perdono — a la composta');
    return;
  }
  api.arruinar(ARRUINADO.aplastado('el gusano'));
}

/* ============================================================
   el módulo
   ============================================================ */

export default {
  id: 'zapallo',
  /* de cerca: el zapallo entero es lo más grande de la cocina y
     tiene que llenar la pantalla para que partirlo se sienta */
  camara: { pos: [0, 2.74, 3.4], mira: [0, 1.02, 0.4] },

  construir(ctx) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    fase = 'partir';
    perdonado = false;
    mitades = []; tajadas = []; guias = []; cortes = new Set(); hechos = 0;
    terminado = false; modo = null; cargado = false; pellizcando = false;
    bicho = null; entero = null; p0 = null;

    const tabla = api.pieza('tabla', { ancho: 3.4, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    grupo = new THREE.Group();
    raiz.add(grupo);

    ponerEntero();
    api.progreso(0, TOTAL);
  },

  objetivos() { return bicho ? [grupo, bicho.nodo] : [grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { tocarBicho(); return; }
    if (fase === 'partir') {
      api.sfx('resist');
      api.pista('No va a golpecitos: <b>un trazo de arriba a abajo</b>, cruzándolo.', 2800);
    } else if (fase === 'pelar') {
      api.sfx('resist');
      api.pista('<b>Arrastra el dedo</b> por la tira y se despega.', 2600);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    /* agarre por cercanía en pantalla, como en plaga.js */
    const cercaDelBicho = bicho && bicho.estado === 'suelto' && (() => {
      const p = api.proyectar(bicho.nodo.position.clone().setY(alturaBicho() + 0.05));
      return Math.hypot(p.x - info.cliente.x, p.y - info.cliente.y) < 62;
    })();
    if (cercaDelBicho) {
      bicho.estado = 'cargado'; cargado = true;
      bicho.gus.aro.visible = false;
      api.sfx('tab'); api.buzz(12);
      api.aviso('Llévalo a la composta 🌿');
      modo = 'cargar';
      return;
    }
    modo = 'gesto';
    p0 = api.puntoEnPlano(ALTO());
  },

  alArrastrar() {
    if (terminado) return;
    const p = api.puntoEnPlano(ALTO());
    if (modo === 'cargar') {
      if (!p || !bicho) return;
      /* pegado al dedo en pantalla: mismo truco que plaga.js — el
         rayo del dedo contra un plano a la altura de carga */
      bicho.suelo = { x: p.x, z: p.z };
      const enMano = api.puntoEnPlano(api.MESA_Y + 0.3) || p;
      bicho.nodo.position.set(enMano.x, api.MESA_Y + 0.3, enMano.z);
      bicho.nodo.rotation.z = Math.sin(api.reloj * 12) * 0.3;
      return;
    }
    if (modo !== 'gesto' || !p || !p0) return;

    const dz = p.z - (this._pz != null ? this._pz : p.z);
    this._pz = p.z;

    if (fase === 'despepitar') { despepitarEn(p); return; }
    if (fase === 'pelar') { pelarEn(p, dz); return; }
  },

  alArrastrarFin() {
    if (modo === 'cargar' && bicho) {
      const p = bicho.suelo || bicho.nodo.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < 0.75) {
        bicho.estado = 'ido';
        api.volarA(bicho.nodo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 12, 1);
        api.sfx('bien'); api.buzz([15, 25]);
        api.aviso(null); api.toast('¡Fuera de la olla! 🌿');
        revisarFinal();
      } else {
        bicho.estado = 'suelto';
        bicho.gus.aro.visible = true;
        bichoEncima();
        api.sfx('resist');
        api.aviso('🪱 Se te resbaló. Otra vez: hasta la composta');
      }
      cargado = false; modo = null; this._pz = null;
      return;
    }

    /* el trazo largo: partir y cortar se juzgan al soltar, porque lo
       que importa es la línea entera, no cada cuadro */
    const p1 = api.puntoEnPlano(ALTO());
    if (modo === 'gesto' && p0 && p1) {
      const largo = Math.abs(p1.z - p0.z);
      const torcido = Math.abs(p1.x - p0.x);
      if (fase === 'partir') {
        /* Cualquier trazo largo que pase por encima del zapallo lo
           parte. La regla anterior rechazaba trazos "torcidos" y
           pedía el medio exacto — puntería disfrazada de realismo.
           La gracia es la rapidez: si el gesto fue franco, corta. */
        if (largo >= LARGO_MIN * 0.8 && Math.abs((p0.x + p1.x) / 2) < R_ENTERO) {
          partir();
        } else if (largo >= LARGO_MIN * 0.4) {
          api.sfx('resist'); api.buzz([16, 20]);
          api.pista('Más largo: <b>de arriba a abajo</b>, cruzándolo entero.', 2800);
        }
      } else if (fase === 'cortar' && largo >= LARGO_MIN * 0.8) {
        /* el corte elige SIEMPRE la línea pendiente más cercana al
           trazo: ningún gesto decidido se queda sin cortar nada */
        const x = (p0.x + p1.x) / 2;
        let mejor = -1, dMejor = Infinity;
        for (let b = 1; b < N; b++) {
          if (cortes.has(b)) continue;
          const d = Math.abs(x - xDeFrontera(b));
          if (d < dMejor) { dMejor = d; mejor = b; }
        }
        if (mejor > 0 && dMejor < GRUESO * 1.4) cortar(mejor);
      }
    }
    modo = null; p0 = null; this._pz = null;
  },

  alPellizcarInicio(info) {
    if (terminado || !bicho || bicho.estado !== 'suelto') return;
    const p = api.proyectar(bicho.nodo.position.clone().setY(alturaBicho() + 0.05));
    if (Math.hypot(p.x - info.cliente.x, p.y - info.cliente.y) > 80) return;
    bicho.estado = 'cargado'; pellizcando = true;
    bicho.gus.aro.visible = false;
    api.sfx('tab'); api.buzz(12);
    api.aviso('Llévalo a la composta 🌿');
  },
  alPellizcarMover() {
    if (!pellizcando || !bicho) return;
    const p = api.puntoEnPlano(api.MESA_Y);
    if (!p) return;
    bicho.suelo = { x: p.x, z: p.z };
    const enMano = api.puntoEnPlano(api.MESA_Y + 0.3) || p;
    bicho.nodo.position.set(enMano.x, api.MESA_Y + 0.3, enMano.z);
  },
  alPellizcarFin() {
    if (!pellizcando) return;
    pellizcando = false;
    modo = 'cargar';
    this.alArrastrarFin();
  },

  actualizar(dt, t) {
    if (bicho && bicho.estado === 'suelto') {
      bicho.gus.animar(t);
      /* se pasea de un lado a otro sobre el zapallo, sin salirse */
      const tope = fase === 'cortar' ? (N / 2) * GRUESO - 0.12 : 1.0;
      bicho.x += bicho.dir * GUSANO_VEL * dt;
      if (bicho.x > tope) { bicho.x = tope; bicho.dir = -1; }
      if (bicho.x < -tope) { bicho.x = -tope; bicho.dir = 1; }
      bicho.nodo.rotation.y = bicho.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      bichoEncima();
    }

    if (fase === 'pelar' && todoPelado()) pasarACortar();

    /* el zapallo entero respira un poco: nada quieto del todo */
    if (entero) entero.position.y = ALTO() + R_ENTERO * 0.78 + Math.sin(t * 1.6) * 0.006;
  },

  destruir() {
    mitades = []; tajadas = []; guias = []; cortes = new Set();
    grupo = null; entero = null; bicho = null;
    modo = null; p0 = null; cargado = false; pellizcando = false; terminado = false;
  },
};
