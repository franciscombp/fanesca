/* ============================================================
   FANESCA — modelos/guarnicion.js
   La guarnición: sartén, maduro, empanadita, ají y el plato servido.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     sarten → 'fondo'
     maduro → 'tajada'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- LA GUARNICIÓN: sartén, maduro, empanadita, ají ---------- */

registrar('sarten', (THREE) => {
  const g = new THREE.Group();
  g.name = 'sarten';
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.1, 20), brillante(THREE, COMIDA.sarten));
  fondo.name = 'fondo';
  const pared = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 22), mate(THREE, COMIDA.sarten));
  pared.rotation.x = Math.PI / 2;
  pared.position.y = 0.07;
  pared.userData.ignorar = true;
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.7, 8), mate(THREE, COMIDA.sarten_mango));
  mango.rotation.z = Math.PI / 2;
  mango.position.set(0.95, 0.05, 0);
  mango.userData.ignorar = true;
  g.add(fondo, pared, mango);
  return g;
});

registrar('maduro', (THREE, opts = {}) => {
  /* EN UN GROUP a propósito: la forma de la tajada vive en la escala
     del mesh (una esfera aplastada), y si el nivel escalara ese mesh
     directamente la borraría — pasó: un setScalar(1.5) convirtió la
     tajada en un globo del tamaño de la pantalla */
  const g = new THREE.Group();
  g.name = 'maduro';
  const geo = formaVariada('maduro-tajada', 3, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 8), { fuerza: 0.05, escala: 2, semilla: k + 5 }));
  const t = new THREE.Mesh(geo, brillante(THREE, COMIDA.maduro));
  t.scale.set(0.24, 0.05, 0.13);
  t.name = 'tajada';
  g.add(t);
  return g;
});

registrar('empanadita', (THREE, opts = {}) => {
  /* la media luna de viento: media esfera achatada con repulgue */
  const g = new THREE.Group();
  g.name = 'empanadita';
  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI),
    brillante(THREE, COMIDA.empanadita)
  );
  cuerpo.scale.set(1, 0.55, 0.8);
  cuerpo.rotation.x = -Math.PI / 2;
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 5, 14, Math.PI), mate(THREE, COMIDA.empanadita));
  borde.userData.ignorar = true;
  g.add(cuerpo, borde);
  return g;
});

registrar('aji-cuenco', (THREE) => {
  const g = new THREE.Group();
  g.name = 'aji-cuenco';
  const c = pieza('cuenco', THREE, { radio: 0.22 });
  const salsa = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.05, 14), mate(THREE, COMIDA.aji_salsa));
  salsa.position.y = 0.1;
  salsa.userData.ignorar = true;
  g.add(c, salsa);
  return g;
});

registrar('plato-fanesca', (THREE) => {
  const g = new THREE.Group();
  g.name = 'plato-fanesca';
  const hondo = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.42, 0.22, 20), brillante(THREE, COMIDA.plato_hondo));
  const crema = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 20), mate(THREE, COMIDA.crema_fanesca));
  crema.position.y = 0.1;
  crema.name = 'crema';
  g.add(hondo, crema);
  return g;
});
