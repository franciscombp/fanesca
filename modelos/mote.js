/* ============================================================
   FANESCA — modelos/mote.js
   La batea del mote y su agua turbia de cal.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     batea-mote → 'cuenco', 'agua', 'granos'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, formaVariada } from './organico.js';
import { pintar, sstep, azarCon } from './pintura.js';
import { COLORES as AGUA, materialAgua, superficieAgua, pared } from './quinua.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta.
   El grano va NORMALIZADO a la corona (blanco): multiplica al color
   del material, que es el que el nivel cambia de la cal a limpio. */
const COLORES = {
  mote_corona: '#ffffff',
  mote_marfil: '#f5efdd',
  mote_sombra: '#ddd1ad',
  mote_pico: '#cfae75',         /* el piquito donde el grano iba pegado a la tusa */
};

/* ---------- EL GRANO DE MOTE ----------
   Maíz pelado y reventado al cocerse: base angosta con su piquito,
   corona ancha que se abre en flor. Eran octágonos abollados; por la
   forma y la sombra de la base ya se lee mote, aunque la flor mida dos
   píxeles en el teléfono. El tamaño va horneado (0.05). */
function geoMote(THREE, k) {
  return formaVariada('grano-mote-v', 3, k, (v) => {
    const gg = new THREE.SphereGeometry(1, 10, 8);
    const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      let X = gp.getX(i), Y = gp.getY(i);
      const Z = gp.getZ(i);
      const t = (Z + 1) / 2;                 /* 0 base (pico) … 1 corona */
      const w = 0.55 + 0.45 * Math.pow(t, 0.5);
      X *= w; Y *= w * 0.8;
      /* la flor: la corona se hunde en una hendidura suave */
      if (Z > 0.3 && Y > 0) Y -= 0.22 * Math.exp(-X * X / 0.04) * sstep(0.3, 1, Z);
      gp.setXYZ(i, X, Y, Z * 1.05);
    }
    gg.computeVertexNormals();
    abollar(gg, { fuerza: 0.05, escala: 2.4, semilla: 17 + v });
    gg.scale(0.05, 0.05, 0.05);
    const marfil = new THREE.Color(COLORES.mote_marfil), corona = new THREE.Color(COLORES.mote_corona);
    const sombra = new THREE.Color(COLORES.mote_sombra), pico = new THREE.Color(COLORES.mote_pico);
    return pintar(THREE, gg, (c, i, x, y, z) => {
      const t = Math.min(1, Math.max(0, (z / 0.0525 + 1) / 2));
      c.copy(marfil).lerp(corona, sstep(0.4, 1, t)).lerp(sombra, 0.4 * sstep(0.15, -0.4, y / 0.05));
      if (t < 0.12) c.lerp(pico, 0.85);
    });
  });
}

/* el grano suelto (el que se va con el agua mal botada, y el del
   caldero) */
registrar('grano-mote', (THREE, opts = {}) => {
  const k = opts.variante != null ? opts.variante : (Math.random() * 3) | 0;
  const m = new THREE.Mesh(geoMote(THREE, k), mate(THREE, opts.limpio ? '#f7efd6' : COMIDA.mote, { vertexColors: true }));
  m.name = 'grano-mote';
  return m;
});

/* ---------- EL MOTE: la batea del agua turbia ---------- */

registrar('batea-mote', (THREE, opts = {}) => {
  const r = opts.radio || 0.66;
  const g = new THREE.Group();
  g.name = 'batea-mote';
  /* la misma batea de madera que la de la quinua */
  const cuenco = pieza('cuenco', THREE, { radio: r, colorA: AGUA.batea_clara, colorB: AGUA.batea_oscura });
  cuenco.name = 'cuenco';
  g.add(cuenco);
  /* el montón de mote al fondo: granos gordos, pálidos, cada uno con
     su giro y su tamaño — el mote pelado es maíz seco que se hinchó al
     cocerse, y ningún grano queda igual al vecino. Instanciados: una
     llamada de dibujo en vez de cuarenta. El nivel tiñe el material
     del único hijo, como antes teñía el de cada grano. */
  const granos = new THREE.Group();
  granos.name = 'granos';
  granos.position.y = 0.05;
  const N = 40;
  const im = new THREE.InstancedMesh(geoMote(THREE, 0), mate(THREE, COMIDA.mote, { vertexColors: true }), N);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), E = new THREE.Vector3();
  const Eu = new THREE.Euler(), C = new THREE.Color();
  const az = azarCon(41);
  for (let i = 0; i < N; i++) {
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / N) * r * 0.64;
    P.set(Math.cos(a) * rad, (i % 3) * 0.008, Math.sin(a) * rad);
    /* la corona hacia arriba, cada uno ladeado a su modo */
    Eu.set(-Math.PI / 2 + 0.4 * Math.sin(i), a * 1.7, 0.3 * Math.cos(i * 3));
    Q.setFromEuler(Eu);
    E.setScalar(0.9 + az() * 0.2);
    im.setMatrixAt(i, M.compose(P, Q, E));
    const v = 0.9 + az() * 0.1;
    im.setColorAt(i, C.setRGB(v, v, v));
  }
  im.name = 'mote';
  im.userData.ignorar = true;
  im.userData.sombra = false;
  im.computeBoundingSphere();
  granos.add(im);
  g.add(granos);
  /* el agua: arranca clara y el nivel la va enturbiando de cal. Con la
     nube encendida: el agua turbia del mote se lee TURBIA (manchas de
     cal y motitas de hollejo), no solo como un disco más claro. */
  const agua = new THREE.Mesh(
    superficieAgua(THREE, r, 0.2),
    materialAgua(THREE, { color: AGUA.agua_clara, opacity: 0.5,
      agua: { o0: 0.5, o1: 0.82, a0: 0.16, a1: 0.86, nube: 1, jabon: 0, rad: pared(0.2, r) - 0.01 } })
  );
  agua.position.y = 0.12;
  agua.name = 'agua';
  agua.userData.ignorar = true;
  g.add(agua);
  g.userData.r = r;
  return g;
});
