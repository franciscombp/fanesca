/* ============================================================
   FANESCA — modelos/sambo.js
   La media de sambo que se ralla y el rallador.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     media-sambo → 'pulpa' (la cara cortada, se va gastando)
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL SAMBO: la media y el rallador ---------- */

registrar('media-sambo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'media-sambo';
  /* la media luna: media esfera con la piel veteada del sambo */
  const geoP = forma('sambo-piel', () =>
    abollar(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { fuerza: 0.04, escala: 2 }));
  const piel = new THREE.Mesh(geoP, mate(THREE, COMIDA.sambo_piel));
  piel.scale.set(0.42, 0.3, 0.42);
  piel.name = 'piel';
  /* las vetas: gajos claros pintados como cintas delgadas */
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 4, 18, Math.PI), mate(THREE, COMIDA.sambo_veta));
    v.rotation.z = Math.PI;
    v.rotation.y = (i / 6) * Math.PI * 2;
    v.scale.y = 0.71;
    v.userData.ignorar = true;
    g.add(v);
  }
  /* la cara cortada, mirando arriba: la pulpa que se ralla */
  const pulpa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 18), brillante(THREE, COMIDA.sambo_pulpa));
  pulpa.position.y = 0.01;
  pulpa.name = 'pulpa';
  g.add(piel, pulpa);
  /* unas pepas asomadas en la pulpa */
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), mate(THREE, COMIDA.sambo_pepa));
    p.position.set(Math.cos(a) * 0.18, 0.035, Math.sin(a) * 0.18);
    p.scale.y = 0.4;
    p.userData.ignorar = true;
    g.add(p);
  }
  return g;
});

registrar('rallador', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'rallador';
  /* la plancha inclinada con su marco de madera */
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 1.5), mate(THREE, COMIDA.rallador_marco));
  const plancha = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 1.3), brillante(THREE, COMIDA.rallador));
  plancha.position.y = 0.035;
  marco.userData.ignorar = true; plancha.userData.ignorar = true;
  g.add(marco, plancha);
  /* los dientes: la rejilla de picos que hace el trabajo */
  const geoD = new THREE.ConeGeometry(0.02, 0.05, 4);
  const matD = mate(THREE, COMIDA.rallador_diente);
  for (let f = 0; f < 8; f++) for (let c = 0; c < 5; c++) {
    const d = new THREE.Mesh(geoD, matD);
    d.position.set((c - 2) * 0.15 + (f % 2 ? 0.05 : 0), 0.08, (f - 3.5) * 0.15);
    d.userData.ignorar = true;
    g.add(d);
  }
  return g;
});

registrar('hebra-sambo', (THREE) => {
  const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.16, 3, 5), mate(THREE, COMIDA.sambo_pulpa));
  h.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  h.name = 'hebra-sambo';
  return h;
});
