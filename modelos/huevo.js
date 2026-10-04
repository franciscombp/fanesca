/* ============================================================
   FANESCA — modelos/huevo.js
   El huevo duro que se casca y se pela.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     huevo → 'cascara', 'clara', 'casco0'…'cascoN'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL HUEVO DURO ---------- */

registrar('huevo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'huevo';
  /* la clara, debajo: lo que queda al pelar */
  const clara = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 11), brillante(THREE, COMIDA.huevo_clara));
  clara.scale.set(1, 1.3, 1);
  clara.name = 'clara';
  g.add(clara);
  /* la cáscara: OCHO cascos que se despegan uno a uno. Cada casco es
     un parche de esfera apenas más grande que la clara; el nivel los
     jala desde la grieta. */
  const matC = mate(THREE, COMIDA.huevo_cascara);
  let n = 0;
  for (let fila = 0; fila < 2; fila++) {
    for (let c = 0; c < 4; c++) {
      const casco = new THREE.Mesh(
        new THREE.SphereGeometry(0.252, 8, 6,
          c * Math.PI / 2, Math.PI / 2,
          fila * Math.PI / 2 + 0.06, Math.PI / 2 - 0.12),
        matC
      );
      casco.scale.set(1, 1.3, 1);
      casco.name = 'casco' + (n++);
      g.add(casco);
    }
  }
  return g;
});
