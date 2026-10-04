/* ============================================================
   FANESCA — modelos/chochos.js
   El chocho: una pepa amarilla dentro de una piel traslúcida.

   La piel va un pelín más grande y semitransparente, para que se
   vea que hay algo adentro esperando salir — que es la mitad de
   las ganas de apretarlo.

   PARTES NOMBRADAS (para que un .glb encaje)
     chocho → 'pepa'    (la que salta a la batea)
              'piel'    (la que se va a la composta)
              'ombligo'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, formaVariada } from './organico.js';
import { pintar, conBorde } from './pintura.js';

const acotar01 = (v) => Math.max(0, Math.min(1, v));

/* LA FORMA DEL CHOCHO, UNA SOLA para la pepa y su piel: moneda
   irregular con la muesca del ombligo. Eran dos esferas distintas con
   facetas que no coincidían, y la pepa asomaba por la piel en parches
   duros. Con la misma superficie, la piel (un poco más grande) la
   contiene siempre. */
function baseChocho(THREE, k) {
  return formaVariada('chocho-base', 4, k, (kk) => {
    const g = abollar(new THREE.SphereGeometry(1, 20, 12), { fuerza: 0.04, escala: 2.4, semilla: kk + 7 });
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      if (x > 0.7) pos.setX(i, x - 0.09 * Math.exp(-z * z / 0.04) * (x - 0.7) / 0.3);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  });
}

registrar('chocho', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'chocho';
  const v = opts.variante || 0;

  /* la pepa: amarilla con la panza en sombra. EL TAMAÑO VA EN LA
     GEOMETRÍA: la pepa sale volando sola y volarA() le pone una escala
     pareja al final del vuelo; con el tamaño en mesh.scale, en el
     último cuarto del salto se inflaba diez veces. */
  const sombra = new THREE.Color(COMIDA.chocho_pepa_sombra), luz = new THREE.Color(COMIDA.chocho_pepa);
  const geoP = formaVariada('chocho-pepa2', 4, v, (k) => {
    const p = pintar(THREE, baseChocho(THREE, k).clone(), (c, i, x, y) => {
      c.copy(sombra).lerp(luz, Math.pow(acotar01((y + 1) / 2), 0.9));
    });
    p.scale(0.1, 0.062, 0.088);
    return p;
  });
  const pepa = new THREE.Mesh(geoP, mate(THREE, '#ffffff', { vertexColors: true }));
  pepa.name = 'pepa';

  /* LA PIEL EN SALMUERA: casi transparente al centro, lechosa en el
     canto y con un brillo húmedo apagado. Era un Lambert al 50 % sin
     brillo, y el chocho se leía como galleta seca — lo apetitoso del
     chocho es justo que está mojado. Sin escribir profundidad: es una
     película, no una cáscara. */
  const geoPiel = formaVariada('chocho-piel2', 4, v, (k) => baseChocho(THREE, k).clone().scale(0.112, 0.072, 0.098));
  const piel = new THREE.Mesh(geoPiel, conBorde(
    new THREE.MeshPhongMaterial({ color: COMIDA.chocho_piel, shininess: 28, specular: '#7a6e55', transparent: true, depthWrite: false }),
    /* el centro algo lechoso y no del todo transparente: con la piel
       casi invisible la pepa salía dorada, y el chocho que se compra es
       PÁLIDO — la pepa se adivina, no se exhibe */
    { color: COMIDA.chocho_piel_borde, fuerza: 0.3, potencia: 2.0, alfa: [0.42, 0.9] }));
  piel.name = 'piel';
  piel.userData.ignorar = true;

  /* el ombligo, sobre la piel y en la muesca: dentro de ella se veía
     como un manchón gris */
  const ombligo = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), mate(THREE, COMIDA.chocho_ombligo));
  ombligo.position.set(0.106, 0.012, 0);
  ombligo.scale.set(0.3, 0.55, 0.9);
  ombligo.name = 'ombligo';
  ombligo.userData.ignorar = true;

  g.add(pepa, ombligo, piel);
  return g;
});
