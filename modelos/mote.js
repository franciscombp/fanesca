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
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL MOTE: la batea del agua turbia ---------- */

registrar('batea-mote', (THREE, opts = {}) => {
  const r = opts.radio || 0.66;
  const g = new THREE.Group();
  g.name = 'batea-mote';
  const cuenco = pieza('cuenco', THREE, { radio: r });
  cuenco.name = 'cuenco';
  g.add(cuenco);
  /* el montón de mote al fondo: granos gordos, pálidos, cada uno con
     su forma — el mote pelado es maíz seco que se hinchó al cocerse,
     y ningún grano queda igual al vecino */
  const granos = new THREE.Group();
  granos.name = 'granos';
  granos.position.y = 0.05;
  const geoG = forma('grano-mote', () =>
    abollar(achatar(new THREE.SphereGeometry(1, 8, 6), { desde: -0.3, dureza: 0.5 }), { fuerza: 0.08, escala: 2.2, semilla: 17 }));
  const matG = mate(THREE, COMIDA.mote);
  for (let i = 0; i < 40; i++) {
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / 40) * r * 0.64;
    const m = new THREE.Mesh(geoG, matG);
    m.position.set(Math.cos(a) * rad, (i % 3) * 0.008, Math.sin(a) * rad);
    m.scale.set(0.052, 0.034, 0.046);
    m.rotation.set(0, a * 1.7, (i % 2) * 0.3);
    m.userData.ignorar = true;
    granos.add(m);
  }
  g.add(granos);
  /* el agua: arranca clara y el nivel la va enturbiando de cal */
  const agua = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r * 0.7, 0.07, 24),
    brillante(THREE, COMIDA.agua, { transparent: true, opacity: 0.5 })
  );
  agua.position.y = 0.12;
  agua.name = 'agua';
  agua.userData.ignorar = true;
  g.add(agua);
  g.userData.r = r;
  return g;
});
