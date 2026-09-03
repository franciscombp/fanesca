/* ============================================================
   FANESCA — nivel-zapallo.js
   PARTIR, TAJAR PAREJO, SACAR LAS PEPAS Y PELAR FINO.

   Un zapallo no llega a la olla en cubos. Llega redondo y con su
   rabo, y así es como se prepara en una cocina de la Sierra: se
   parte, se corta en tajadas, y a cada tajada se le saca el hueco
   de las pepas y se le quita la cáscara. Este nivel hace eso, en
   ese orden, y con la tajada TENDIDA en la tabla, grande, una por
   una — que es como se pela de verdad y como se entiende de un
   vistazo:

     1. PARTIR   — un trazo largo por el lomo. Se abre en dos.
     2. TAJAR    — las mitades boca abajo; un trazo por cada raya.
     3. LIMPIAR  — cada tajada, tendida: se RASPA el hueco para que
                   salgan las pepas, y se pasa el cuchillo pegado a
                   la cáscara, siguiendo el arco. Limpia y pelada,
                   se va sola a la batea y entra la siguiente.

   EL RETO ES TÉCNICO, no un bicho. Lo que se mide es lo que mide
   una abuela mirándote las manos:
     · la tajada PAREJA: el trazo derecho y encima de la raya. Un
       trazo que se fue de la línea deja una tajada chueca.
     · la PULPA SE QUEDA: raspar más allá del hueco se lleva pulpa,
       y pelar grueso también. Cada pedazo que vuela a la composta
       es merma, y la merma de más es un descuido.
     · PELAR FINO: el cuchillo agarra la cáscara sólo en una franja
       pegada a la orilla. Por fuera no agarra; por dentro corta
       pulpa.
   Cuánto perdona cada cosa lo dice la parada (EXIGENCIA): en la
   presentación las franjas son anchas y la merma se cobra recién a
   la tercera; en la brava, un solo raspón hondo ya cuesta.

   El gusano sólo está en algunas paradas, y donde está de verdad:
   entre las pepas. Aparece al raspar el hueco de una tajada, se
   pasea por el hueco y hay que llevarlo a la composta antes de que
   esa tajada pueda ir a la olla.

   (Hasta la 2.4 el nivel barría pepas de las mitades y jalaba tiras
   de cáscara de una cúpula, con un gusano siempre paseando encima.
   No se entendía qué se limpiaba ni por qué, y el bicho era el único
   reto. Se rehizo entero.)
   ============================================================ */

import { nuevoGusano } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { N, GRUESO, R, R_ENTERO, R_PLANA, GRUESO_PLANA, CASCARA, HUECO, SEGMENTOS_CASCARA } from './modelos/zapallo.js';

let THREE, raiz, api;

/* El reparto de las tajadas de pie: GRUESO manda desde el modelo, el
   número lo dice la parada. */
let TAJADAS = N;
const xTajada = (i) => (i - (TAJADAS - 1) / 2) * GRUESO;
const xFrontera = (b) => (b - TAJADAS / 2) * GRUESO;

const HONDO_TABLA = 1.6;
let ANCHO_TABLA = 3.4;
let TABLA_Z = 0;
let LARGO_MIN = 0.3;            /* largo mínimo del trazo que corta */
const dif = () => Math.max(1, Math.min(5, (api && api.dificultad) || 1));
const GUSANO_VEL_REF = 0.05;
const gusanoVel = () => GUSANO_VEL_REF * (1.2 + 0.2 * (dif() - 1));

/* LA EXIGENCIA, por `resistencia` de la parada. Todo en mundo:
     trazo   — largo mínimo del trazo que parte o corta
     fino    — cuánto puede meterse el cuchillo bajo la cáscara sin
               que cuente como pulpa (la franja "fina")
     hueco   — cuánto puede salirse el dedo del hueco al raspar
     chueca  — a cuántos gruesos de la raya el corte ya sale chueco
     torcido — cuánto puede irse de lado el trazo (x) de punta a punta
     merma   — cuántos pedazos de pulpa por tajada antes del descuido */
const EXIGENCIA = [
  { trazo: 0.22, fino: 0.17, hueco: 0.17, chueca: 0.75, torcido: 0.42, merma: 3 },   /* suave */
  { trazo: 0.30, fino: 0.11, hueco: 0.11, chueca: 0.55, torcido: 0.28, merma: 2 },   /* normal */
  { trazo: 0.40, fino: 0.07, hueco: 0.07, chueca: 0.42, torcido: 0.20, merma: 1 },   /* apretada */
];
let EX = EXIGENCIA[1];
let CON_GUSANO = 0;

const PEPAS = 6;                /* por tajada tendida */
const FIBRAS = 3;
const RADIO_PEPA = 0.2;         /* cuán cerca hay que pasar para llevarse la pepa */

/* el marcador suma las tres faenas: partir, cada corte, y limpiar y
   pelar cada tajada */
let TOTAL = 1 + (N - 1) + N * 2;

let fase = 'partir';            /* partir | cortar | limpiar */
let grupo = null;
let entero = null;
let mitades = [];
let tajadas = [];               /* de pie: {mesh, i, chueca} */
let guias = [];
let cortes = new Set();
let cola = [];                  /* tajadas de pie esperando su turno */
let actual = null;              /* la tendida: ver siguienteTajada() */
let conGusano = new Set();      /* índices de tajada con gusano entre las pepas */
let bichos = [];
let cargando = null;
let hechos = 0;
let modo = null, cargado = false, pellizcando = false;
let p0 = null;
let gesto = null;               /* el gesto en curso sobre la tendida */
let terminado = false;
let cuchillo = null, trazo = null;
let generacion = 0;             /* mata los setTimeout de una partida vieja */
let avisado = {};
let mermaTotal = 0;             /* pedazos de pulpa perdidos en toda la faena */

const ALTO = () => api.MESA_Y + 0.1;
const ALTO_PLANA = () => ALTO() + GRUESO_PLANA;
/* la tajada tendida: la orilla recta (con el hueco) hacia el jugador
   y el arco al fondo, para que raspar quede cerca del pulgar */
const centroPlana = () => new THREE.Vector3(0, ALTO(), TABLA_Z + 0.5);
const COLA_Z = () => TABLA_Z - 0.68;
const xCola = (k, n) => (n < 2 ? 0 : -1.0 + k * (2.0 / (n - 1)));

/* dónde cae un punto respecto a la tendida: distancia al centro de la
   orilla y ángulo desde +X hacia el fondo, de 0 a π — el mismo con que
   están puestos los tramos de cáscara */
function polar(p) {
  const c = centroPlana();
  const dx = p.x - c.x, dz = c.z - p.z;
  return { d: Math.hypot(dx, dz), ang: Math.atan2(dz, dx), dz, dx };
}

/* ---------- el cuchillo que sigue al dedo ---------- */

function conCuchillo() {
  return fase === 'partir' || fase === 'cortar' || (fase === 'limpiar' && gesto && gesto.tipo === 'pelar');
}
function alturaCuchillo() {
  if (fase === 'partir') return ALTO() + R_ENTERO * 1.75;
  if (fase === 'cortar') return ALTO() + R + 0.16;
  return ALTO_PLANA() + 0.14;
}
function mostrarCuchillo(p) {
  if (!cuchillo) {
    cuchillo = api.pieza('cuchillo');
    raiz.add(cuchillo);
    trazo = api.pieza('trazo');
    raiz.add(trazo);
  }
  cuchillo.visible = true;
  /* la línea del trazo sólo sirve en los cortes rectos: al pelar el
     dedo va en arco y una recta de punta a punta confunde */
  trazo.visible = fase !== 'limpiar';
  moverCuchillo(p);
}
function moverCuchillo(p) {
  if (!cuchillo || !p || !p0) return;
  const alto = alturaCuchillo();
  cuchillo.position.set(p.x, alto, p.z);
  cuchillo.rotation.set(0.25, 0, 0.7);
  if (!trazo.visible) return;
  const dx = p.x - p0.x, dz = p.z - p0.z, L = Math.hypot(dx, dz);
  trazo.position.set((p.x + p0.x) / 2, alto - 0.08, (p.z + p0.z) / 2);
  trazo.rotation.y = Math.atan2(dx, dz);
  trazo.scale.set(1, 1, Math.max(0.01, L));
}
function esconderCuchillo(exito) {
  if (cuchillo && exito) {
    api.tween(cuchillo.position, 'y', cuchillo.position.y - 0.25, 0.08, undefined, () => { if (cuchillo) cuchillo.visible = false; });
  } else if (cuchillo) cuchillo.visible = false;
  if (trazo) trazo.visible = false;
}

function sumar(n) {
  hechos += n;
  api.progreso(hechos, TOTAL);
  api.composta(Math.min(1, hechos / TOTAL));
}

/* algo que se va volando: se saca de donde esté y se lanza */
function volar(obj, destino, dur = 0.5, alto = 0.5) {
  const w = obj.getWorldPosition(new THREE.Vector3());
  if (obj.parent) obj.parent.remove(obj);
  obj.position.copy(w);
  obj.userData.escalaBase = obj.scale.x;
  raiz.add(obj);
  api.volarA(obj, destino, { dur, alto });
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

  const g = api.pieza('guia-zapallo', { ry: R_ENTERO * 0.78 + 0.045, rz: R_ENTERO + 0.045, grosor: 1.5 });
  g.position.set(0, ALTO() + 0.02, TABLA_Z);
  g.userData.ignorar = true;
  grupo.add(g);
  guias.push({ grupo: g, b: 'lomo' });

  api.rotulo('Partir el zapallo');
  api.pista('Córtalo en dos: <b>un trazo de arriba a abajo</b>, por la línea.', 4200);
}

function partir() {
  if (fase !== 'partir') return;
  fase = 'abriendo';

  const g = guias.find(x => x.b === 'lomo');
  if (g) g.grupo.visible = false;
  grupo.remove(entero);
  entero = null;

  api.sfx('corte'); api.buzz([26, 40, 26]);
  api.destello('rgba(255,220,150,.42)');
  api.sacudir(0.55);
  api.chispas(new THREE.Vector3(0, ALTO() + R_ENTERO, TABLA_Z), '#ffe6ab', 22, 1.3);

  /* las dos mitades se abren y se mecen un instante, con el hueco de
     las pepas a la vista: es el "¡se abrió!" — después se acuestan
     boca abajo para tajarlas */
  [-1, 1].forEach(lado => {
    const m = api.pieza('mitad-zapallo');
    m.position.set(0, ALTO() + R_ENTERO * 0.78, TABLA_Z);
    m.rotation.y = lado * 0.12;
    m.userData = { tipo: 'mitad', lado };
    grupo.add(m);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + lado;
      const p = api.pieza('pepa-zapallo');
      p.scale.setScalar(1.5);
      p.position.set(Math.cos(a) * R_ENTERO * 0.2, 0.03, Math.sin(a) * R_ENTERO * 0.2);
      p.rotation.y = a;
      p.userData.ignorar = true;
      m.add(p);
    }
    mitades.push({ obj: m, lado });
    api.tween(m.position, 'x', lado * 0.5, 0.42);
    api.tween(m.rotation, 'z', lado * 0.16, 0.3, undefined, () => api.tween(m.rotation, 'z', 0, 0.36));
  });

  sumar(1);
  api.toast('¡Se abrió! 🎃');
  const mi = ++generacion;
  setTimeout(() => { if (generacion === mi && !terminado) pasarACortar(); }, 780);
}

/* ============================================================
   2 · TAJAR — las mitades boca abajo, un trazo por raya
   ============================================================ */

function pasarACortar() {
  fase = 'cortar';
  api.rotulo('Cortar en tajadas');
  api.pista('<b>Un trazo por raya</b>, derecho y encima de la línea: la tajada torcida es un descuido.', 4200);

  mitades.forEach(m => grupo.remove(m.obj));
  mitades = [];

  for (let i = 0; i < TAJADAS; i++) {
    const g = api.pieza('tajada-zapallo');
    g.position.set(xTajada(i), ALTO(), TABLA_Z);
    g.userData = { tipo: 'zapallo', i };
    grupo.add(g);
    tajadas.push({ mesh: g, i, chueca: false });
    g.scale.setScalar(0.01);
    setTimeout(() => {
      api.tween(g.scale, 'x', 1, 0.26); api.tween(g.scale, 'y', 1, 0.26); api.tween(g.scale, 'z', 1, 0.26);
    }, i * 45);
  }
  for (let b = 1; b < TAJADAS; b++) {
    const g = api.pieza('guia-zapallo', { grosor: 1.2 });
    g.position.set(xFrontera(b), ALTO(), TABLA_Z);
    grupo.add(g);
    guias.push({ grupo: g, b });
  }
}

function libre(b) { return b <= 0 || b >= TAJADAS || cortes.has(b); }

/* la tajada que quedó suelta por los dos lados da un saltito: se ve
   que ya es tajada, aunque todavía no se vaya a ningún lado */
function revisarSueltas() {
  tajadas.forEach(t => {
    if (t.suelta || !libre(t.i) || !libre(t.i + 1)) return;
    t.suelta = true;
    api.chispas(t.mesh.position.clone().setY(ALTO() + 0.3), '#ffd28a', 6, 0.7);
    api.tween(t.mesh.position, 'y', ALTO() + 0.07, 0.12, undefined, () => api.tween(t.mesh.position, 'y', ALTO(), 0.16));
  });
  if (cortes.size >= TAJADAS - 1) {
    const mi = ++generacion;
    setTimeout(() => { if (generacion === mi && !terminado) pasarALimpiar(); }, 420);
  }
}

function cortar(b, lejos, torcido) {
  if (cortes.has(b)) return false;
  cortes.add(b);
  const g = guias.find(x => x.b === b);
  if (g) api.tween(g.grupo.scale, 'y', 0.01, 0.18, undefined, () => { g.grupo.visible = false; });
  api.sfx('corte'); api.buzz([12, 18]);
  api.chispas(new THREE.Vector3(xFrontera(b), ALTO() + R, TABLA_Z), '#fff3c9', 9, 0.8);
  sumar(1);

  /* LA TAJADA CHUECA: el corte se hace igual —el cuchillo ya pasó—
     pero la tajada de la derecha de esa raya queda torcida y cuenta
     como descuido. Se ve: queda ladeada en la fila y después,
     tendida, más delgada de un lado. */
  const chueca = lejos > EX.chueca * GRUESO || torcido > EX.torcido;
  if (chueca) {
    const t = tajadas[Math.min(b, TAJADAS - 1)];
    if (t) { t.chueca = true; t.mesh.rotation.y = (Math.random() < 0.5 ? -1 : 1) * 0.16; }
    api.sfx('resist'); api.buzz([16, 12, 16]);
    const msg = torcido > EX.torcido
      ? 'Esa tajada quedó chueca: el trazo se fue de lado — derecho, de arriba a abajo'
      : 'Esa tajada quedó chueca: el trazo no iba sobre la raya';
    if (api.fallo) api.fallo('chueca', msg);
    else api.aviso(msg, 'peligro');
  }
  revisarSueltas();
  return true;
}

/* ============================================================
   3 · LIMPIAR — cada tajada tendida: raspar el hueco y pelar fino
   ============================================================ */

function pasarALimpiar() {
  if (fase === 'limpiar') return;
  fase = 'limpiar';
  api.rotulo('Sacar las pepas y pelar');
  api.pista('Una por una: <b>raspa el hueco</b> para sacar las pepas, y <b>pasa el cuchillo pegado a la cáscara</b>, siguiendo el arco. La pulpa se queda.', 5200);
  api.toast('¡Tajadas! Ahora una por una 🎃');

  guias.forEach(g => { g.grupo.visible = false; });

  /* dónde está el gusano, si hay: entre las pepas de alguna tajada */
  conGusano = new Set();
  const indices = tajadas.map(t => t.i).sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(CON_GUSANO, indices.length); i++) conGusano.add(indices[i]);

  /* la fila entera se retira al fondo, chiquita: es la cola */
  cola = tajadas.slice();
  reacomodarCola();
  const mi = ++generacion;
  setTimeout(() => { if (generacion === mi && !terminado) siguienteTajada(); }, 520);
}

function reacomodarCola() {
  const n = cola.length;
  cola.forEach((t, k) => {
    api.tween(t.mesh.position, 'x', xCola(k, n), 0.4);
    api.tween(t.mesh.position, 'z', COLA_Z(), 0.4);
    api.tween(t.mesh.scale, 'x', 0.42, 0.4); api.tween(t.mesh.scale, 'y', 0.42, 0.4); api.tween(t.mesh.scale, 'z', 0.42, 0.4);
  });
}

function siguienteTajada() {
  if (!cola.length || actual || terminado) return;
  const t = cola.shift();
  reacomodarCola();
  /* la de pie se va y aparece tendida, grande, al centro */
  api.tween(t.mesh.scale, 'x', 0.01, 0.2); api.tween(t.mesh.scale, 'y', 0.01, 0.2);
  api.tween(t.mesh.scale, 'z', 0.01, 0.2, undefined, () => { if (t.mesh.parent) t.mesh.parent.remove(t.mesh); });

  const obj = api.pieza('tajada-plana');
  obj.position.copy(centroPlana());
  obj.userData = { tipo: 'tajada', i: t.i };
  /* la chueca se nota: ladeada y más delgada */
  const escY = t.chueca ? 0.72 : 1;
  if (t.chueca) obj.rotation.y = 0.07;
  obj.scale.set(0.2, escY, 0.2);
  grupo.add(obj);
  api.tween(obj.scale, 'x', 1, 0.3); api.tween(obj.scale, 'z', 1, 0.3);

  /* las pepas y las hebras, dentro del hueco */
  const pepas = [], fibras = [];
  const rh = R_PLANA * HUECO;
  for (let i = 0; i < PEPAS; i++) {
    const a = Math.PI * (i + 0.5) / PEPAS;
    const rad = rh * (0.3 + 0.38 * (i % 2));
    const p = api.pieza('pepa-zapallo');
    p.scale.setScalar(2.3);
    p.position.set(Math.cos(a) * rad, GRUESO_PLANA + 0.03, -Math.sin(a) * rad);
    p.rotation.y = a + 0.4;
    p.userData = { tipo: 'pepa', ignorar: false };
    obj.add(p);
    pepas.push(p);
  }
  for (let i = 0; i < FIBRAS; i++) {
    const a = Math.PI * (i + 0.5) / FIBRAS + 0.2;
    const f = api.pieza('fibra-zapallo', { variante: i });
    f.scale.multiplyScalar(1.6);
    f.position.set(Math.cos(a) * rh * 0.55, GRUESO_PLANA + 0.015, -Math.sin(a) * rh * 0.55);
    f.rotation.y = a;
    f.userData.ignorar = true;
    obj.add(f);
    fibras.push(f);
  }
  const cascaras = [];
  for (let k = 0; k < SEGMENTOS_CASCARA; k++) cascaras.push(api.parte(obj, 'cascara' + k));

  actual = { obj, i: t.i, pepas, fibras, cascaras, merma: 0, limpia: false, pelada: false, gusano: conGusano.has(t.i), salio: false, chueca: t.chueca };
  api.sfx('tab'); api.buzz(8);
}

/* la pulpa que se va: un raspón fuera del hueco o una cáscara gruesa.
   El pedazo vuela cada vez que pasa (se ve irse), pero la MERMA se
   cuenta una vez por gesto: una pasada honda por todo el arco es un
   error, no nueve — nueve descuidos por un solo cuchillazo torpe era
   arruinar la olla con la primera tajada. */
function mermar(p, motivo) {
  if (!actual) return;
  const tr = api.pieza('trozo-pulpa');
  tr.position.set(p.x, ALTO_PLANA() + 0.04, p.z);
  tr.userData.escalaBase = tr.scale.x;
  raiz.add(tr);
  api.volarA(tr, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.45 });
  api.chispas(p.clone().setY(ALTO_PLANA() + 0.1), '#f0a04b', 6, 0.6);
  if (gesto && gesto.hondo) { api.sfx('resist', 0.9); return; }
  if (gesto) gesto.hondo = true;
  actual.merma++; mermaTotal++;
  api.sfx('resist'); api.buzz([14, 10]);
  const msg = motivo === 'hueco'
    ? 'Sólo el hueco: raspa las pepas sin llevarte pulpa'
    : 'Te llevaste pulpa: el cuchillo pegado a la cáscara, más fino';
  if (actual.merma >= EX.merma) {
    actual.merma = 0;
    if (api.fallo) api.fallo('pulpa', msg);
    else api.aviso(msg, 'peligro');
  } else if (!avisado[motivo]) {
    avisado[motivo] = true;
    api.pista(msg, 3200);
  }
}

function bichoBajoElDedo(p) {
  const w = bichos.find(x => x.estado === 'suelto' && Math.hypot(x.nodo.position.x - p.x, x.nodo.position.z - p.z) < 0.16);
  if (w) { aplastarBicho(w); return true; }
  return false;
}

function limpiarEn(p) {
  if (!actual || !p || !gesto) return;
  if (bichoBajoElDedo(p)) return;
  const q = polar(p);
  if (q.dz < -0.1) return;
  /* fuera del hueco pero todavía sobre la pulpa: raspón hondo — se
     cobra una vez por gesto, no por cuadro */
  if (q.d > R_PLANA * HUECO + EX.hueco) {
    if (!gesto.hondo && q.d < R_PLANA - 0.05) mermar(p, 'hueco');
    return;
  }
  let saco = 0;
  for (const pe of actual.pepas) {
    if (pe.userData.ida) continue;
    const w = pe.getWorldPosition(new THREE.Vector3());
    if (Math.hypot(w.x - p.x, w.z - p.z) > RADIO_PEPA) continue;
    pe.userData.ida = true;
    volar(pe, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), 0.44, 0.5);
    saco++;
  }
  if (!saco) return;
  const f = actual.fibras.find(x => !x.userData.ida);
  if (f) { f.userData.ida = true; volar(f, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), 0.5, 0.42); }
  api.sfx(saco > 1 ? 'pop2' : 'pop'); api.buzz(saco > 1 ? 14 : 9);
  api.chispas(p.clone().setY(ALTO_PLANA() + 0.2), '#f3e6bc', 4 + saco * 2, 0.8);
  if (actual.gusano && !actual.salio) nacerBicho();
  if (actual.pepas.every(x => x.userData.ida)) {
    actual.limpia = true;
    actual.fibras.forEach(x => { if (!x.userData.ida) { x.userData.ida = true; volar(x, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), 0.5, 0.4); } });
    sumar(1);
    revisarTajada();
  }
}

function pelarEn(p) {
  if (!actual || !p || !gesto) return;
  if (bichoBajoElDedo(p)) return;
  const q = polar(p);
  if (q.dz < -0.05) return;
  const K = SEGMENTOS_CASCARA;
  const k = Math.floor(q.ang / (Math.PI / K));
  if (k < 0 || k >= K) return;
  const seg = actual.cascaras[k];
  if (!seg || seg.userData.ida) return;
  const desde = R_PLANA - CASCARA;                  /* donde empieza la cáscara */
  if (q.d > R_PLANA + 0.16) return;                 /* por fuera: el cuchillo no agarra */
  if (q.d < desde - EX.fino - 0.22) return;         /* muy adentro: eso es pasear por la pulpa, no pelar */
  const fino = q.d >= desde - EX.fino;
  seg.userData.ida = true;
  volar(seg, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), 0.5, 0.5);
  gesto.pelados++;
  api.sfx('corte', fino ? 1 : 0.8); api.buzz(8);
  api.chispas(p.clone().setY(ALTO_PLANA() + 0.12), fino ? '#e9b56a' : '#f0a04b', 5, 0.6);
  if (!fino) mermar(p, 'fino');
  if (actual.cascaras.every(x => x.userData.ida)) {
    actual.pelada = true;
    const pared = api.parte(actual.obj, 'pared');
    if (pared) pared.visible = false;
    sumar(1);
    revisarTajada();
  }
}

/* limpia y pelada, la tajada se va a la batea y entra la siguiente */
function revisarTajada() {
  if (!actual || !actual.limpia || !actual.pelada) return;
  if (bichos.some(w => w.estado !== 'ido')) {
    api.aviso('🪱 Saca el gusano a la composta antes de llevar la tajada');
    return;
  }
  const obj = actual.obj;
  const hechas = TAJADAS - cola.length;
  actual = null;
  obj.userData.tipo = null;
  api.chispas(obj.position.clone().setY(ALTO_PLANA() + 0.2), '#ffd28a', 12, 0.9);
  obj.userData.escalaBase = 1;
  api.volarA(obj, api.BATEA.clone().setY(api.MESA_Y + 0.24), { dur: 0.55, alto: 0.72 });
  api.sfx('bien'); api.buzz([14, 20, 14]);
  api.toast(`Tajada ${hechas} de ${TAJADAS} 🎃`);
  const mi = ++generacion;
  setTimeout(() => {
    if (generacion !== mi || terminado) return;
    if (cola.length) siguienteTajada(); else revisarFinal();
  }, 380);
}

function revisarFinal() {
  if (terminado || hechos < TOTAL) return;
  const quedan = bichos.filter(w => w.estado !== 'ido').length;
  if (quedan) { api.aviso('Falta sacar el gusano antes de llevar la batea'); return; }
  terminado = true;
  api.completar();
}

/* ============================================================
   el gusano entre las pepas
   ============================================================ */

function alturaBicho() { return ALTO_PLANA() + 0.1; }

function bichoEncima(w) {
  if (!w || w.estado !== 'suelto') return;
  w.nodo.position.set(w.x, alturaBicho(), w.z);
}

function nacerBicho() {
  if (!actual) return;
  actual.salio = true;
  const c = centroPlana();
  const gus = nuevoGusano(THREE, { eje: 'z', escala: 2.2, color: '#c4e076', color2: '#9dc24f', segmentos: 6 });
  const nodo = new THREE.Group();
  nodo.userData = { tipo: 'bicho' };
  nodo.add(gus.obj);
  const x = c.x + (Math.random() - 0.5) * 0.3;
  const z = c.z - R_PLANA * HUECO * 0.45;
  nodo.position.set(x, alturaBicho(), z);
  nodo.rotation.y = Math.PI / 2;
  raiz.add(nodo);
  bichos.push({ nodo, gus, x, z, dir: Math.random() < 0.5 ? -1 : 1, estado: 'suelto', tope: R_PLANA * HUECO - 0.14 });
  api.sfx('crack'); api.buzz([25, 30, 25]);
  api.aviso('🪱 ¡Un gusano entre las pepas! Llévalo a la composta — no lo aplastes');
  api.pista('<b>Pellízcalo con dos dedos</b> y llévalo a la composta verde (o arrástralo con uno).', 5000);
}

function bichoCercaDe(cliente, radio) {
  let mejor = null, dMejor = radio;
  for (const w of bichos) {
    if (w.estado !== 'suelto') continue;
    const p = api.proyectar(w.nodo.position.clone().setY(alturaBicho() + 0.05));
    const d = Math.hypot(p.x - cliente.x, p.y - cliente.y);
    if (d < dMejor) { dMejor = d; mejor = w; }
  }
  return mejor;
}

let perdonado = false;
let avisadoRoce = false;

function tocarBicho(w) {
  if (!w || w.estado !== 'suelto') return;
  if (w.inmune && api.reloj < w.inmune) return;
  if (!perdonado) {
    perdonado = true;
    if (api.fallo) api.fallo('bicho');
    w.inmune = api.reloj + 1.4;
    api.sfx('mal'); api.buzz([40, 30, 40]);
    api.destello('rgba(230,57,70,.3)');
    api.aviso('💛 ¡Casi lo aplastas! Esta te la perdono', 'peligro');
    api.pista('No lo toques con la yema: <b>arrástralo</b> hasta la composta. A la próxima se arruina la olla.', 3800);
    return;
  }
  api.arruinar(ARRUINADO.aplastado('el gusano'));
}

function aplastarBicho(w) {
  if (!w || w.estado !== 'suelto') return;
  if (dif() >= 4) { tocarBicho(w); return; }
  if (w.inmune && api.reloj < w.inmune) return;
  w.inmune = api.reloj + (dif() >= 3 ? 0.3 : 0.7);
  w.x += w.dir * -0.14;
  api.sfx('resist'); api.buzz(10);
  if (!avisadoRoce) {
    avisadoRoce = true;
    api.pista('Lo empujaste sin querer. <b>Arrástralo</b> a la composta antes de seguir.', 3000);
  }
}

/* ============================================================
   el módulo
   ============================================================ */

export default {
  id: 'zapallo',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;

    TAJADAS = Math.max(2, Math.round(cfg.cantidad ?? N));
    EX = EXIGENCIA[Math.max(0, Math.min(2, Math.round(cfg.resistencia ?? 1)))];
    LARGO_MIN = EX.trazo;
    CON_GUSANO = Math.max(0, Math.round(cfg.gusanos ?? 0));
    TOTAL = 1 + (TAJADAS - 1) + TAJADAS * 2;
    ANCHO_TABLA = 3.4 + Math.max(0, TAJADAS - N) * GRUESO;

    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    fase = 'partir';
    perdonado = dif() > 2; avisadoRoce = false; avisado = {}; mermaTotal = 0;
    mitades = []; tajadas = []; guias = []; cortes = new Set(); cola = []; actual = null; conGusano = new Set();
    hechos = 0; terminado = false; modo = null; cargado = false; pellizcando = false;
    bichos = []; cargando = null; entero = null; p0 = null; gesto = null;
    generacion++;

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    grupo = new THREE.Group();
    raiz.add(grupo);

    ponerEntero();
    api.progreso(0, TOTAL);

    /* ventanita para las pruebas automáticas */
    window.__zapallo = {
      get fase() { return fase; },
      get hechos() { return hechos; },
      get total() { return TOTAL; },
      get actual() { return actual ? { i: actual.i, merma: actual.merma, limpia: actual.limpia, pelada: actual.pelada, pepas: actual.pepas.filter(p => !p.userData.ida).length, cascaras: actual.cascaras.filter(c => !c.userData.ida).length, chueca: actual.chueca, gusano: actual.gusano } : null; },
      get cola() { return cola.length; },
      get chuecas() { return tajadas.filter(t => t.chueca).length; },
      get mermas() { return mermaTotal; },
      partir() { partir(); },
      cortar(b) { if (fase === 'cortar') cortar(b, 0, 0); },
      cortarTodo() { if (fase === 'cortar') for (let b = 1; b < TAJADAS; b++) cortar(b, 0, 0); },
      limpiar() { if (!actual) return; gesto = { tipo: 'limpiar', hondo: false, pelados: 0 }; actual.pepas.forEach(pe => { if (!pe.userData.ida) { pe.userData.ida = true; volar(pe, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16)); } }); if (actual.gusano && !actual.salio) nacerBicho(); actual.limpia = true; sumar(1); gesto = null; revisarTajada(); },
      pelar() { if (!actual) return; actual.cascaras.forEach(c => { if (!c.userData.ida) { c.userData.ida = true; volar(c, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16)); } }); actual.pelada = true; sumar(1); revisarTajada(); },
      sinBichos() { bichos.forEach(w => { if (w.estado !== 'ido') { w.estado = 'ido'; if (w.nodo.parent) w.nodo.parent.remove(w.nodo); } }); api.aviso(null); if (actual) revisarTajada(); else revisarFinal(); },
    };
  },

  objetivos() { return [grupo, ...bichos.map(w => w.nodo)]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') {
      tocarBicho(bichos.find(w => w.nodo === info.raiz));
      return;
    }
    if (fase === 'partir') {
      api.sfx('resist');
      api.pista('No va a golpecitos: <b>un trazo de arriba a abajo</b>, cruzándolo.', 2800);
    } else if (fase === 'cortar') {
      api.sfx('resist');
      api.pista('<b>Un trazo por raya</b>, de arriba a abajo, derecho.', 2600);
    } else if (fase === 'limpiar' && actual) {
      api.sfx('resist');
      const p = api.puntoEnPlano(ALTO_PLANA());
      const q = p ? polar(p) : null;
      api.pista(q && q.d < R_PLANA * HUECO + 0.1
        ? 'Raspa: <b>pasa el dedo por el hueco</b>, de lado a lado, y las pepas salen.'
        : 'Pela: <b>arrastra el cuchillo por la orilla</b>, pegado a la cáscara, siguiendo el arco.', 3000);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    const alAlcance = bichoCercaDe(info.cliente, 62);
    if (alAlcance) {
      cargando = alAlcance;
      cargando.estado = 'cargado'; cargado = true;
      cargando.gus.aro.visible = false;
      api.sfx('tab'); api.buzz(12);
      api.aviso('Llévalo a la composta 🌿', 'bien');
      modo = 'cargar';
      return;
    }
    if (fase === 'limpiar') {
      if (!actual) { modo = null; return; }
      p0 = api.puntoEnPlano(ALTO_PLANA());
      if (!p0) { modo = null; return; }
      const q = polar(p0);
      /* fuera de la tajada no hay gesto; dentro, el hueco raspa y todo
         lo demás pela — un dedo que arranca en la pulpa de en medio
         va al cuchillo, que ahí no corta ni castiga */
      if (q.dz < -0.2 || q.d > R_PLANA + 0.3) { modo = null; return; }
      modo = 'gesto';
      gesto = { tipo: q.d <= R_PLANA * HUECO + EX.hueco * 0.6 ? 'limpiar' : 'pelar', hondo: false, pelados: 0, recorrido: 0, prev: p0.clone() };
      if (gesto.tipo === 'pelar') mostrarCuchillo(p0);
      else limpiarEn(p0);
      return;
    }
    modo = 'gesto';
    p0 = api.puntoEnPlano(ALTO());
    if (conCuchillo() && p0) mostrarCuchillo(p0);
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') {
      const p = api.puntoEnPlano(ALTO());
      if (!p || !cargando) return;
      cargando.suelo = { x: p.x, z: p.z };
      const enMano = api.puntoEnPlano(api.MESA_Y + 0.3) || p;
      cargando.nodo.position.set(enMano.x, api.MESA_Y + 0.3, enMano.z);
      cargando.nodo.rotation.z = Math.sin(api.reloj * 12) * 0.3;
      return;
    }
    if (modo !== 'gesto' || !p0) return;
    if (fase === 'limpiar') {
      const p = api.puntoEnPlano(ALTO_PLANA());
      if (!p || !gesto) return;
      gesto.recorrido += Math.hypot(p.x - gesto.prev.x, p.z - gesto.prev.z);
      gesto.prev = p.clone();
      if (gesto.tipo === 'pelar') { moverCuchillo(p); pelarEn(p); }
      else limpiarEn(p);
      return;
    }
    const p = api.puntoEnPlano(ALTO());
    if (p && conCuchillo()) moverCuchillo(p);
  },

  alArrastrarFin() {
    if (modo === 'cargar' && cargando) {
      const w = cargando;
      const p = w.suelo || w.nodo.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < 0.75) {
        w.estado = 'ido';
        api.volarA(w.nodo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 12, 1);
        api.sfx('bien'); api.buzz([15, 25]);
        if (!bichos.some(x => x.estado !== 'ido')) api.aviso(null);
        api.toast('¡Fuera de la olla! 🌿');
        if (actual) revisarTajada(); else revisarFinal();
      } else {
        w.estado = 'suelto';
        w.gus.aro.visible = true;
        bichoEncima(w);
        api.sfx('resist');
        api.aviso('🪱 Se te resbaló. Otra vez: hasta la composta');
      }
      cargando = null; cargado = false; modo = null;
      return;
    }

    if (fase === 'limpiar') {
      if (gesto && gesto.tipo === 'pelar' && !gesto.pelados && gesto.recorrido > 0.25 && !avisado.cascara) {
        avisado.cascara = true;
        api.pista('Así no agarra la cáscara: <b>pegado a la orilla</b>, siguiendo el arco.', 3000);
      }
      esconderCuchillo(!!(gesto && gesto.pelados));
      modo = null; p0 = null; gesto = null;
      return;
    }

    /* los trazos rectos se juzgan al soltar: importa la línea entera */
    const p1 = api.puntoEnPlano(ALTO());
    let corto = false;
    if (modo === 'gesto' && p0 && p1) {
      const largo = Math.abs(p1.z - p0.z);
      const torcido = Math.abs(p1.x - p0.x);
      corto = largo >= LARGO_MIN * 0.8;
      if (fase === 'partir') {
        if (largo >= LARGO_MIN * 0.8 && Math.abs((p0.x + p1.x) / 2) < R_ENTERO) partir();
        else if (largo >= LARGO_MIN * 0.4) {
          api.sfx('resist'); api.buzz([16, 20]);
          api.pista('Más largo: <b>de arriba a abajo</b>, cruzándolo entero.', 2800);
        }
      } else if (fase === 'cortar' && largo >= LARGO_MIN * 0.8) {
        /* el corte elige la raya pendiente más cercana al trazo, y lo
           lejos que quedó de ella decide si la tajada salió pareja */
        const x = (p0.x + p1.x) / 2;
        let mejor = -1, dMejor = Infinity;
        for (let b = 1; b < TAJADAS; b++) {
          if (cortes.has(b)) continue;
          const d = Math.abs(x - xFrontera(b));
          if (d < dMejor) { dMejor = d; mejor = b; }
        }
        if (mejor > 0 && dMejor < GRUESO * 1.4) cortar(mejor, dMejor, torcido);
      }
    }
    esconderCuchillo(corto);
    modo = null; p0 = null;
  },

  alPellizcarInicio(info) {
    if (terminado) return;
    const w = bichoCercaDe(info.cliente, 80);
    if (!w) return;
    cargando = w;
    w.estado = 'cargado'; pellizcando = true;
    w.gus.aro.visible = false;
    api.sfx('tab'); api.buzz(12);
    api.aviso('Llévalo a la composta 🌿', 'bien');
  },
  alPellizcarMover() {
    if (!pellizcando || !cargando) return;
    const p = api.puntoEnPlano(api.MESA_Y);
    if (!p) return;
    cargando.suelo = { x: p.x, z: p.z };
    const enMano = api.puntoEnPlano(api.MESA_Y + 0.3) || p;
    cargando.nodo.position.set(enMano.x, api.MESA_Y + 0.3, enMano.z);
  },
  alPellizcarFin() {
    if (!pellizcando) return;
    pellizcando = false;
    modo = 'cargar';
    this.alArrastrarFin();
  },

  actualizar(dt, t) {
    for (const w of bichos) {
      if (w.estado !== 'suelto') continue;
      w.gus.animar(t);
      /* se pasea por el hueco, sin salirse de él */
      w.x += w.dir * gusanoVel() * dt;
      if (w.x > w.tope) { w.x = w.tope; w.dir = -1; }
      if (w.x < -w.tope) { w.x = -w.tope; w.dir = 1; }
      w.nodo.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      bichoEncima(w);
    }
    if (entero) entero.position.y = ALTO() + R_ENTERO * 0.78 + Math.sin(t * 1.6) * 0.006;
  },

  destruir() {
    generacion++;
    mitades = []; tajadas = []; guias = []; cortes = new Set(); cola = []; actual = null;
    grupo = null; entero = null; bichos = []; cargando = null;
    cuchillo = null; trazo = null; gesto = null;
    modo = null; p0 = null; cargado = false; pellizcando = false; terminado = false;
    delete window.__zapallo;
  },
};
