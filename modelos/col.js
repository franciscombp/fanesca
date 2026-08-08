/* ============================================================
   FANESCA — modelos/col.js
   La hoja de col, el cigarro que se hace con ella, y la tira.

   Tres piezas para un solo gesto en dos tiempos: la hoja se
   enrolla y el rollo se corta. Como en la cocina, el rollo no es
   otra cosa: es la misma hoja, apretada.

   La hoja NO es un plano. Una hoja de col es un plato ondulado con
   un nervio grueso que la levanta por el medio — si se dibuja
   plana se lee como un papel verde. Aquí la ondulación se hornea
   en la geometría y el nervio va aparte, con volumen.

   PARTES NOMBRADAS (para que un .glb encaje)
     col-hoja  → 'lamina', 'nervio'
     col-rollo → 'cilindro', 'punta'
     col-tira  → 'tira'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { forma, formaVariada } from './organico.js';

export const ANCHO_HOJA = 1.5;   /* de lado a lado: lo que se enrolla */
export const LARGO_HOJA = 1.15;  /* el largo del futuro rollo */

/* la lámina ondulada. La onda va en las dos direcciones y crece
   hacia el borde: al centro, junto al nervio, la hoja es casi
   plana; en la orilla se riza. */
function laminaGeo(THREE, semilla) {
  const g = new THREE.PlaneGeometry(ANCHO_HOJA, LARGO_HOJA, 16, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const borde = Math.abs(x) / (ANCHO_HOJA / 2);
    const onda = Math.sin(x * 6.5 + semilla) * 0.035 + Math.sin(y * 5.1 - semilla) * 0.025;
    pos.setZ(i, onda * (0.25 + borde * borde));
    /* y la punta se estrecha: la hoja no es un rectángulo */
    const estrecho = 1 - 0.22 * Math.pow(Math.abs(y) / (LARGO_HOJA / 2), 2);
    pos.setX(i, x * estrecho);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

registrar('col-hoja', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'col-hoja';

  const geo = formaVariada('col-lamina', 3, opts.variante || 0, (k) => laminaGeo(THREE, k * 1.7));
  const lamina = new THREE.Mesh(geo, mate(THREE, COMIDA.col_hoja, { side: THREE.DoubleSide }));
  lamina.rotation.x = -Math.PI / 2;
  lamina.name = 'lamina';
  g.add(lamina);

  /* el nervio: grueso, claro, y por eso es la línea que el ojo sigue
     para saber en qué sentido se enrolla la hoja */
  const nervio = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.016, LARGO_HOJA * 0.96, 6),
    mate(THREE, COMIDA.col_nervio)
  );
  nervio.rotation.x = Math.PI / 2;
  nervio.position.y = 0.018;
  nervio.name = 'nervio';
  nervio.userData.ignorar = true;
  g.add(nervio);

  return g;
});

/* el cigarro: la misma hoja, apretada. Se le da el largo por opts
   porque el rollo se acorta a cada tajada. */
registrar('col-rollo', (THREE, opts = {}) => {
  const largo = opts.largo != null ? opts.largo : LARGO_HOJA;
  const g = new THREE.Group();
  g.name = 'col-rollo';

  const cil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.115, largo, 12, 1),
    mate(THREE, COMIDA.col_hoja)
  );
  cil.rotation.x = Math.PI / 2;
  cil.name = 'cilindro';
  g.add(cil);

  /* la espiral de la punta: sin esto un rollo de col es un tubo */
  const punta = new THREE.Mesh(
    new THREE.TorusGeometry(0.055, 0.026, 6, 14),
    mate(THREE, COMIDA.col_tronco)
  );
  punta.position.z = largo / 2 + 0.004;
  punta.name = 'punta';
  punta.userData.ignorar = true;
  g.add(punta);

  return g;
});

registrar('col-tira', (THREE, opts = {}) => {
  const grosor = opts.grosor != null ? opts.grosor : 0.05;
  const geo = forma('col-tira:' + Math.round(grosor * 100), () => {
    const g = new THREE.BoxGeometry(0.2, 0.02, Math.max(0.014, grosor), 6, 1, 1);
    /* la tira sale rizada, como sale de verdad al deshacerse el rollo */
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) + Math.sin(x * 14) * 0.022);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  });
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.col_tira, { side: THREE.DoubleSide }));
  m.name = 'tira';
  return m;
});
