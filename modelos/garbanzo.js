/* ============================================================
   FANESCA — modelos/garbanzo.js
   El garbanzo remojado: pepa con piquito y camisita.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     garbanzo → 'pepa', 'camisita'
   ============================================================ */

import { registrar } from './registro.js';
import { brillante } from './paleta.js';
import { abollar, forma, formaVariada } from './organico.js';
import { pintar, sstep, ruido3 } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta.
   Más dorados que COMIDA.garbanzo: el crema de antes, bajo la
   camisita y sobre la madera clara, era una bolita de merengue. */
const COLORES = {
  garbanzo_pepa: '#e0b56c',
  garbanzo_pico: '#c99a55',       /* el piquito, un pelín tostado */
  /* la camisita remojada: un pelín más tibia que '#f6ead0', que con
     la madera clara detrás borraba al grano en un solo crema */
  garbanzo_piel: '#efdcb4',
  garbanzo_piel_brillo: '#5a554a',
};

/* LA PEPA: una esfera empujada por su radio. El pico va de lado y
   no hacia arriba: de lado se lee en la silueta (que es lo que la
   cámara cenital ve); hacia arriba parecía la punta de una cebolla.
   Con el surco que lo parte en dos y unas arrugas de remojo. */
function geoPepa(THREE, k) {
  const g = new THREE.SphereGeometry(1, 18, 12);
  const pos = g.attributes.position;
  const pico = new THREE.Vector3(0.75, 0.55, 0.1).normalize();
  const d = new THREE.Vector3();
  const pintura = [];
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    const al = Math.max(0, d.dot(pico) - 0.82) / 0.18;
    const surco = Math.exp(-((d.z / 0.12) ** 2)) * sstep(0, 0.7, 0.6 * d.x + 0.8 * d.y);
    const n2 = 0.022 * ruido3(6.5 * d.x, 6.5 * d.y, 6.5 * d.z, k + 8);
    const r = 1 + 0.3 * al * al - 0.06 * surco + 0.04 * ruido3(2.2 * d.x, 2.2 * d.y, 2.2 * d.z, k + 3) + n2;
    pos.setXYZ(i, d.x * r, d.y * r, d.z * r);
    pintura.push([sstep(0.75, 0.95, d.dot(pico)), n2, surco]);
  }
  g.computeVertexNormals();
  const base = new THREE.Color(COLORES.garbanzo_pepa), tost = new THREE.Color(COLORES.garbanzo_pico);
  return pintar(THREE, g, (c, i) => {
    const [p, n2, surco] = pintura[i];
    c.copy(base).lerp(tost, 0.6 * p).multiplyScalar(1 + 0.07 * (n2 / 0.022 - 1.6 * surco));
  });
}

/* ---------- EL GARBANZO: pepa con piquito y camisita ---------- */

registrar('garbanzo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'garbanzo';
  const k = ((opts.variante || 0) % 4 + 4) % 4;
  const geoP = formaVariada('garbanzo-pepa-v', 4, k, (kk) => geoPepa(THREE, kk));
  const pepa = new THREE.Mesh(geoP, brillante(THREE, '#ffffff', { vertexColors: true }));
  pepa.scale.set(0.085, 0.08, 0.082);
  pepa.name = 'pepa';
  /* la camisita: la piel remojada, holgada y a punto de soltarse */
  /* el tamaño, en la geometría: el nivel la afloja con
     camisita.scale.setScalar(1 + k·0.35), que con el tamaño metido en
     la escala la inflaba a una esfera crema de media pantalla.

     Es la MISMA pepa de su variante, al 1.15: abraza el pico y las
     arrugas. Una esfera lisa al 1.1 dejaba al pico atravesarla y la
     piel salía a parches, como pelota de playa. Cerrada y sin
     DoubleSide: no pide la segunda pasada de los transparentes. */
  const camisita = new THREE.Mesh(
    forma('garbanzo-camisita:' + k, () => {
      const c = abollar(geoP.clone().deleteAttribute('color'), { fuerza: 0.02, escala: 5.5, semilla: k + 5 });
      return c.scale(0.085 * 1.15, 0.08 * 1.15, 0.082 * 1.15);
    }),
    new THREE.MeshPhongMaterial({ color: COLORES.garbanzo_piel, specular: COLORES.garbanzo_piel_brillo,
      shininess: 24, transparent: true, opacity: 0.55, depthWrite: false })
  );
  camisita.name = 'camisita';
  camisita.userData.ignorar = true;
  g.add(pepa, camisita);
  return g;
});
