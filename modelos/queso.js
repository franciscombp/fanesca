/* ============================================================
   FANESCA — modelos/queso.js
   El queso fresco, sus migas y la jarra de leche.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     bloque-queso → 'bloque'
     jarra-leche  → 'leche' (el chorro se anima desde el nivel)
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL QUESO Y LA LECHE ---------- */

registrar('bloque-queso', (THREE) => {
  const g = new THREE.Group();
  g.name = 'bloque-queso';
  const geo = forma('queso-bloque', () =>
    abollar(new THREE.CylinderGeometry(0.5, 0.54, 0.4, 18), { fuerza: 0.03, escala: 3 }));
  const bloque = new THREE.Mesh(geo, brillante(THREE, COMIDA.queso));
  bloque.name = 'bloque';
  /* la marca del molde, como el queso de hoja de mercado */
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 5, 20), mate(THREE, COMIDA.queso_borde));
  aro.rotation.x = Math.PI / 2;
  aro.position.y = 0.1;
  aro.userData.ignorar = true;
  g.add(bloque, aro);
  return g;
});

registrar('miga-queso', (THREE, opts = {}) => {
  const geo = formaVariada('queso-miga', 5, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 9, 7), { fuerza: 0.2, escala: 1.8, semilla: k + 11 }));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.queso));
  m.scale.setScalar(0.07 + (opts.variante % 3) * 0.012);
  m.name = 'miga-queso';
  return m;
});

registrar('jarra-leche', (THREE) => {
  const g = new THREE.Group();
  g.name = 'jarra-leche';
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 14), brillante(THREE, COMIDA.jarra));
  const leche = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 14), mate(THREE, COMIDA.leche));
  leche.position.y = 0.17;
  leche.name = 'leche';
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 6, 12, Math.PI), mate(THREE, COMIDA.jarra));
  asa.position.set(0.2, 0.05, 0);
  asa.rotation.z = -Math.PI / 2;
  asa.userData.ignorar = true;
  g.add(cuerpo, leche, asa);
  return g;
});
