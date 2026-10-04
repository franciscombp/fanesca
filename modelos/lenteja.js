/* ============================================================
   FANESCA — modelos/lenteja.js
   Lo que hay regado en la mesa al escoger el grano: la lenteja
   buena, la piedrita y el grano picado.

   Estas tres piezas son el nivel entero, y por eso su forma es
   una decisión de diseño y no de adorno:

     · la buena  — disco liso y parejo
     · la piedra — ANGULOSA (un dodecaedro achatado). No es
                   redonda, y eso es exactamente lo que la delata
                   al ojo antes que el color
     · el picado — del tamaño de la buena pero oscuro y CON UN
                   AGUJERO, que es lo que lo hace descartable

   Si las tres se vieran igual, escoger sería adivinar. Si se
   vieran demasiado distintas, no habría nada que escoger.

   PARTES NOMBRADAS (para que un .glb encaje)
     lenteja / piedra → 'cuerpo'
     lenteja-picada   → 'cuerpo', 'hueco'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, formaVariada } from './organico.js';
import { pintar, sstep, ruido3 } from './pintura.js';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta.

   Sobre la tabla de MADERA (#bda484, veta #8a6a48) la lenteja se
   separa por CROMA: naranja, no café. Por eso las bases varían solo
   un ±6% de luz alrededor de COMIDA.lenteja y la mota tira a un
   naranja tostado, nunca a oliva ni al valor de la veta. Y el picado
   sigue siendo lo más oscuro de la mesa. */
const COLORES = {
  lenteja_bases: ['#c98a4b', '#c4844a', '#cd9050', '#c08249', '#c88c4e'],
  lenteja_mota: '#a86f3a',
  lenteja_hueco_fondo: '#24170f',
  lenteja_hueco_labio: '#8f7250',
};

/* LA LENTE. Una icosfera y no una SphereGeometry: la esfera dejaba
   una estrella en el polo, que es justo lo que mira la cámara. Se
   aplana con un perfil de lente (canto fino, panza al centro), un
   poco más plana por debajo, que es como se asienta. */
function geoLente(THREE, k, semilla) {
  let g = new THREE.IcosahedronGeometry(1, 3);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.max(-1, Math.min(1, pos.getY(i)));
    pos.setY(i, Math.sign(y) * Math.pow(Math.abs(y), 1.6) * (y > 0 ? 1 : 0.85));
  }
  g.computeVertexNormals();
  return abollar(g, { fuerza: 0.05, escala: 2.3, semilla });
}

/* la altura de la lente sin escalar en un punto (x, z): para sentar
   el hueco SOBRE la cara y no flotando ni enterrado */
function altoLente(x, z) {
  const r2 = Math.min(1, x * x + z * z);
  return Math.pow(Math.sqrt(1 - r2), 1.6);
}

/* la mota va hacia un tono más OSCURO que la base: en el picado, una
   mota naranja lo aclararía, y el picado tiene que seguir siendo lo
   más oscuro de la mesa */
function pintarLente(THREE, g, base, k, motaHex = COLORES.lenteja_mota) {
  const b = new THREE.Color(base), mota = new THREE.Color(motaHex);
  return pintar(THREE, g, (c, i, x, y, z) => {
    c.copy(b).lerp(mota, 0.18 * Math.max(0, ruido3(3 * x, 3 * y, 3 * z, k + 7)));
    const r = Math.hypot(x, z);
    c.multiplyScalar((1 - 0.12 * sstep(0.72, 1, r)) * (1 + 0.05 * ruido3(9 * x, 9 * y, 9 * z, k + 3)));
  });
}

registrar('lenteja', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'lenteja';
  const geo = formaVariada('lenteja-lente', 5, opts.variante || 0, (k) =>
    pintarLente(THREE, geoLente(THREE, k, k + 17), COLORES.lenteja_bases[k], k));
  const m = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  m.scale.set(0.058, 0.024, 0.058);
  m.name = 'cuerpo';
  g.add(m);
  return g;
});

/* LA PIEDRA: una icosfera tallada a golpes con siete planos al azar
   (cada una con los suyos), y facetada: cada cara su gris. Angulosa
   pero sin ser una gema perfecta — un dodecaedro se leía como
   cristal de juguete. */
function geoPiedra(THREE, k) {
  let g = new THREE.IcosahedronGeometry(1, 1);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position;
  let s = (k + 1) * 977;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const planos = [];
  for (let j = 0; j < 7; j++) {
    const n = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    planos.push([n, 0.72 + rnd() * 0.16]);
  }
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.multiplyScalar(1 + 0.08 * ruido3(3 * v.x, 3 * v.y, 3 * v.z, k));
    for (const [n, d] of planos) {
      const p = v.dot(n);
      if (p > d) v.addScaledVector(n, -(p - d));
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g = g.toNonIndexed();
  g.computeVertexNormals();
  /* gris por cara, y más oscuro por debajo */
  const gris = new THREE.Color(COMIDA.lenteja_piedra);
  const col = new Float32Array(g.attributes.position.count * 3);
  const p2 = g.attributes.position;
  for (let f = 0; f < p2.count / 3; f++) {
    const h = Math.abs(Math.sin(f * 12.9898 + k * 78.233) * 43758.5453) % 1;
    const yc = (p2.getY(f * 3) + p2.getY(f * 3 + 1) + p2.getY(f * 3 + 2)) / 3;
    const m = (0.86 + 0.24 * h) - (yc < -0.3 ? 0.12 : 0);
    for (let j = 0; j < 3; j++) {
      col[(f * 3 + j) * 3] = gris.r * m; col[(f * 3 + j) * 3 + 1] = gris.g * m; col[(f * 3 + j) * 3 + 2] = gris.b * m;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  /* que la piedra mida lo que medía: (0.055, 0.034, 0.05) de radio */
  g.computeBoundingBox();
  const bb = g.boundingBox;
  g.scale(2 / (bb.max.x - bb.min.x), 2 / (bb.max.y - bb.min.y), 2 / (bb.max.z - bb.min.z));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

registrar('piedra', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'piedra';
  /* angulosa: la piedra no es redonda, y eso es lo que la delata */
  const geo = formaVariada('piedra-tallada', 4, opts.variante || 0, (k) => geoPiedra(THREE, k));
  const m = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  m.scale.set(0.055, 0.034, 0.05);
  m.name = 'cuerpo';
  g.add(m);
  return g;
});

/* el hueco del bicho: un cráter (fondo oscuro con su labio claro), no
   una bolita negra encima, que se leía como un ojo. Una sola malla
   con color por vértice: la misma llamada que antes. */
let geoHueco = null;
function huecoGeo(THREE) {
  if (geoHueco) return geoHueco;
  const pinta = (g, hex) => {
    const c = new THREE.Color(hex);
    return pintar(THREE, g, (cc) => cc.copy(c));
  };
  const fondo = pinta(new THREE.CircleGeometry(0.013, 14), COLORES.lenteja_hueco_fondo);
  const labio = pinta(new THREE.RingGeometry(0.013, 0.02, 14), COLORES.lenteja_hueco_labio);
  labio.translate(0, 0, -0.0004);
  geoHueco = mergeGeometries([fondo, labio]).rotateX(-Math.PI / 2);
  geoHueco.userData.compartida = true;
  return geoHueco;
}

registrar('lenteja-picada', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'picado';
  const base = COMIDA.lenteja_picada;
  const geo = formaVariada('lenteja-picada-lente', 4, opts.variante || 0, (k) =>
    pintarLente(THREE, geoLente(THREE, k, k + 23), base, k + 2, COMIDA.lenteja_hueco));
  const m = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  m.scale.set(0.058, 0.026, 0.058);
  m.name = 'cuerpo';
  /* el agujero del bicho, que es lo que lo hace descartable */
  const hueco = new THREE.Mesh(huecoGeo(THREE), mate(THREE, '#ffffff', { vertexColors: true }));
  hueco.position.set(0.016, 0.026 * altoLente(0.016 / 0.058, 0.008 / 0.058) + 0.001, 0.008);
  hueco.name = 'hueco';
  hueco.userData.ignorar = true;
  g.add(m, hueco);
  return g;
});
