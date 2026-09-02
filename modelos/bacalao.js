/* ============================================================
   FANESCA — modelos/bacalao.js
   La presa de bacalao con su sal encima, y la tina donde se pone
   a remojar.

   La presa es la única pieza del juego que CAMBIA de material en
   vivo: al quitarle toda la sal, la carne pasa de salada
   (amarillenta) a limpia (casi blanca). Por eso su carne se
   llama 'carne' — el nivel la busca por nombre y le cambia el
   material, y eso funciona igual si la presa viene de Blender.

   PARTES NOMBRADAS (para que un .glb encaje)
     presa-bacalao → 'carne'  (la que se aclara al desalarse)
                     'piel', 'filo', veta0…vetaN
     grano-sal     → una malla suelta
     tina          → 'cuerpo', 'filo', 'agua'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, forma } from './organico.js';

/* el color de la carne ya desalada: lo pide el nivel para el cambio */
export const CARNE_SALADA = COMIDA.bacalao_carne;
export const CARNE_LIMPIA = COMIDA.bacalao_carne_limpia;

registrar('presa-bacalao', (THREE) => {
  const g = new THREE.Group();
  g.name = 'presa';

  /* la presa es un trozo cortado, no una pastilla: se abolla fuerte
     para que se lea desgarrada */
  const geoCarne = forma('bacalao-carne', () =>
    abollar(new THREE.SphereGeometry(1, 14, 10), { fuerza: 0.1, escala: 2.8, semilla: 31 }));
  const carne = new THREE.Mesh(geoCarne, mate(THREE, CARNE_SALADA));
  carne.scale.set(0.31, 0.07, 0.2);
  carne.name = 'carne';

  const piel = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    mate(THREE, COMIDA.bacalao_piel)
  );
  piel.scale.set(0.313, 0.072, 0.203);
  piel.name = 'piel';
  piel.userData.ignorar = true;

  /* las vetas del lomo, para que se lea como pescado y no como pan */
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.24), mate(THREE, COMIDA.bacalao_veta));
    v.position.set((i - 1.5) * 0.105, 0.066, 0);
    v.name = 'veta' + i;
    v.userData.ignorar = true;
    g.add(v);
  }

  /* el filo de piel oscura por un lado: sin esto es un pan blanco */
  const filo = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI), mate(THREE, COMIDA.bacalao_piel));
  filo.scale.set(0.315, 0.073, 0.075);
  filo.position.z = -0.145;
  filo.rotation.y = Math.PI;
  filo.name = 'filo';
  filo.userData.ignorar = true;

  g.add(carne, piel, filo);
  return g;
});

/* los cristales de sal, que son el trabajo del nivel */
registrar('grano-sal', (THREE) => {
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.03), mate(THREE, COMIDA.sal));
  s.name = 'sal';
  s.userData.ignorar = true;
  return s;
});

/* ---------- la tina de remojo ----------
   Al fondo de la tabla, donde hasta la 2.4 hubo un cordel: el
   bacalao no se orea, se REMOJA — desde la víspera, cambiando el
   agua, que es como se le saca la sal de verdad. Una lavacara ancha
   y baja, de peltre crema con el filo azul, con el agua adentro.
   Ovalada a propósito (más ancha que honda): las presas se echan
   una junto a otra y tienen que caber todas sin que la tina se
   coma la tabla.

   PARTES NOMBRADAS
     tina → 'cuerpo', 'filo', 'agua'
   `userData.nivelAgua` es la altura de la superficie: el nivel
   apoya ahí las presas para que floten y no se hundan. */
registrar('tina', (THREE, opts = {}) => {
  const ancho = opts.ancho || 1.15;   /* semieje en x */
  const hondo = opts.hondo || 0.5;    /* semieje en z */
  const alto = opts.alto || 0.24;
  const g = new THREE.Group();
  g.name = 'tina';

  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 0.84, alto, 28, 1, true),
    mate(THREE, COMIDA.peltre, { side: THREE.DoubleSide })
  );
  cuerpo.scale.set(ancho, 1, hondo);
  cuerpo.position.y = alto / 2;
  cuerpo.name = 'cuerpo';

  const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.84, 28), mate(THREE, COMIDA.peltre_sombra));
  fondo.rotation.x = -Math.PI / 2;
  fondo.scale.set(ancho, hondo, 1);
  fondo.position.y = 0.012;
  fondo.userData.ignorar = true;

  /* el filo azul, la firma del peltre */
  const filo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.028, 8, 36), mate(THREE, COMIDA.peltre_filo));
  filo.rotation.x = Math.PI / 2;
  filo.scale.set(ancho, hondo, 1);
  filo.position.y = alto;
  filo.name = 'filo';
  filo.userData.ignorar = true;

  const nivelAgua = alto * 0.72;
  /* el agua más azul que la de las bateas: sobre el peltre crema, el
     agua clarita de siempre desaparecía y la tina parecía un plato */
  const agua = new THREE.Mesh(
    new THREE.CircleGeometry(0.97, 28),
    brillante(THREE, COMIDA.agua_tina, { transparent: true, opacity: 0.72 })
  );
  agua.rotation.x = -Math.PI / 2;
  agua.scale.set(ancho, hondo, 1);
  agua.position.y = nivelAgua;
  agua.name = 'agua';
  agua.userData.ignorar = true;

  g.add(cuerpo, fondo, filo, agua);
  g.userData.nivelAgua = nivelAgua;
  return g;
});
