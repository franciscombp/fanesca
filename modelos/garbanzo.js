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

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL GARBANZO: pepa con piquito y camisita ---------- */

registrar('garbanzo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'garbanzo';
  const geoP = formaVariada('garbanzo-pepa', 4, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.07, escala: 2.2, semilla: k + 3 }));
  const pepa = new THREE.Mesh(geoP, brillante(THREE, COMIDA.garbanzo));
  pepa.scale.set(0.085, 0.08, 0.082);
  pepa.name = 'pepa';
  /* el piquito que lo delata como garbanzo */
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.045, 6), mate(THREE, COMIDA.garbanzo));
  pico.position.set(0.055, 0.045, 0);
  pico.rotation.z = -0.7;
  pico.userData.ignorar = true;
  /* la camisita: la piel remojada, holgada y a punto de soltarse */
  /* el tamaño, en la geometría: el nivel la afloja con
     camisita.scale.setScalar(1 + k·0.35), que con el tamaño metido en
     la escala la inflaba a una esfera crema de media pantalla */
  const camisita = new THREE.Mesh(
    forma('garbanzo-camisita', () => new THREE.SphereGeometry(1, 12, 9).scale(0.098, 0.09, 0.094)),
    mate(THREE, COMIDA.garbanzo_camisita, { transparent: true, opacity: 0.55 })
  );
  camisita.name = 'camisita';
  camisita.userData.ignorar = true;
  g.add(pepa, pico, camisita);
  return g;
});
