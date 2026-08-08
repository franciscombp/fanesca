/* ============================================================
   FANESCA — modelos/mani.js
   La piedra de moler, su mano, el grano de maní y la pasta.

   La piedra es una batea de piedra: no es una tabla plana, tiene
   el centro hundido de tanto uso. Ese hueco es información de
   juego —es donde el grano se queda quieto y donde de verdad se
   muele— así que se modela, no se pinta.

   El maní es dos lóbulos con una cintura, forrado en su piel
   colorada. Sale de dos esferas y no de una cápsula porque la
   silueta con cintura es lo que lo hace legible a este tamaño.

   PARTES NOMBRADAS (para que un .glb encaje)
     piedra-moler → 'losa', 'hueco', pata0 … pata3
     mano-piedra  → 'canto'
     mani         → 'lobulo0', 'lobulo1', 'piel'
     mani-pasta   → 'pasta'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

export const LARGO_PIEDRA = 1.9;
export const ANCHO_PIEDRA = 1.15;

registrar('piedra-moler', (THREE, opts = {}) => {
  const largo = opts.largo || LARGO_PIEDRA;
  const ancho = opts.ancho || ANCHO_PIEDRA;
  const g = new THREE.Group();
  g.name = 'piedra-moler';

  /* la losa, con el centro gastado. El hundido se hornea en la
     geometría: una losa plana con una sombra pintada encima se ve
     exactamente como lo que es, una calcomanía. */
  const geo = forma('losa-moler', () => {
    const l = new THREE.BoxGeometry(1, 0.16, 1, 20, 1, 14);
    const pos = l.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0.05) continue;
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.min(1, Math.hypot(x / 0.42, z / 0.36));
      pos.setY(i, y - (1 - d * d) * 0.055);
    }
    pos.needsUpdate = true;
    l.computeVertexNormals();
    return abollar(l, { fuerza: 0.006, escala: 6, semilla: 5 });
  });
  const losa = new THREE.Mesh(geo, mate(THREE, COMIDA.piedra_moler));
  losa.scale.set(largo, 1, ancho);
  losa.name = 'losa';
  g.add(losa);

  /* tres patas: una piedra de moler se inclina hacia quien muele */
  [[-0.4, -0.34], [0.4, -0.34], [0, 0.36]].forEach((p, i) => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.16, 7),
      mate(THREE, COMIDA.lenteja_piedra)
    );
    pata.position.set(p[0] * largo, -0.14, p[1] * ancho);
    pata.name = 'pata' + i;
    pata.userData.ignorar = true;
    g.add(pata);
  });

  return g;
});

registrar('mano-piedra', (THREE) => {
  const g = new THREE.Group();
  g.name = 'mano-piedra';
  const geo = forma('mano-piedra', () =>
    achatar(
      abollar(new THREE.SphereGeometry(1, 14, 10), { fuerza: 0.09, escala: 2.2, semilla: 9 }),
      { desde: -0.55, dureza: 0.6 },
    ));
  const canto = new THREE.Mesh(geo, mate(THREE, COMIDA.piedra_moler));
  canto.scale.set(0.2, 0.15, 0.34);
  canto.name = 'canto';
  g.add(canto);
  return g;
});

registrar('mani', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'mani';
  const geo = formaVariada('mani-lobulo', 3, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 10, 8), { fuerza: 0.1, escala: 2.6, semilla: k + 41 }));
  /* dos lóbulos con cintura: la silueta que lo hace maní y no bolita */
  [-1, 1].forEach((s, i) => {
    const l = new THREE.Mesh(geo, mate(THREE, COMIDA.mani_piel));
    l.position.z = s * 0.035;
    l.scale.set(0.052, 0.048, 0.056);
    l.name = 'lobulo' + i;
    g.add(l);
  });
  /* La cintura entre los dos lóbulos. Va MÁS OSCURA que la piel: es
     un pliegue, y un pliegue no le da la luz. Estaba al revés —una
     banda clara cruzando un grano colorado— y el resultado era una
     cuenta de collar con cinturón, no un maní. */
  const piel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.047, 0.047, 0.026, 8, 1, true),
    mate(THREE, COMIDA.mani_veta, { side: THREE.DoubleSide })
  );
  piel.rotation.x = Math.PI / 2;
  piel.name = 'piel';
  piel.userData.ignorar = true;
  g.add(piel);
  return g;
});

/* la mancha de pasta que queda donde se molió un grano */
registrar('mani-pasta', (THREE, opts = {}) => {
  const r = opts.radio || 0.09;
  const geo = forma('mani-pasta', () =>
    achatar(
      abollar(new THREE.SphereGeometry(1, 10, 7), { fuerza: 0.16, escala: 3.2, semilla: 13 }),
      { desde: -0.2, dureza: 0.9 },
    ));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.mani_pasta));
  m.scale.set(r, r * 0.16, r * 0.82);
  m.name = 'pasta';
  return m;
});
