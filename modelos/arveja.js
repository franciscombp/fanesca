/* ============================================================
   FANESCA — modelos/arveja.js
   La vaina de arveja y su grano.

   La arveja se parece a la haba de lejos y no se parece en nada
   en la mano. La vaina es más flaca, más tiesa y más brillante, y
   sobre todo tiene el <b>hilo</b>: esa fibra que corre por la
   costura y que hay que jalar desde el rabito antes de que la
   vaina se deje abrir. Por eso el hilo es una pieza propia y no
   una raya pintada — el juego lo mueve.

   Los granos van pegados a la pared de arriba, en fila y tocándose,
   que es como vienen: por eso al correr el pulgar salen en cadena
   y no de a uno.

   PARTES NOMBRADAS (para que un .glb encaje)
     vaina-arveja → 'bisagra' (el grupo que rota al abrir)
                    'tapa', 'abajo', 'hilo', 'rabo'
                    bulto0 … bultoN (los granos que se marcan afuera)
     arveja       → 'cuerpo', 'cicatriz'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, curvar, formaVariada, forma } from './organico.js';

export const POR_VAINA = 5;
export const PASO_ARVEJA = 0.19;

/* media cáscara. Más honda y menos ancha que la de haba: la vaina de
   arveja es casi un tubo partido, y esa sección redonda es lo que
   hace que los granos rueden hacia afuera solos cuando se abre. */
function mediaVaina(THREE, arriba) {
  const geo = forma('media-vaina-arveja:' + (arriba ? 'a' : 'b'), () =>
    curvar(
      abollar(
        new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, arriba ? 0 : Math.PI / 2, Math.PI / 2),
        { fuerza: 0.045, escala: 3.8, semilla: arriba ? 11 : 12 },
      ),
      /* la vaina de arveja se arquea: nunca está recta sobre la mesa */
      { eje: 'x', hacia: 'z', k: 0.1 },
    ));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.vaina_arveja));
  m.scale.set(0.5, 0.128, 0.116);
  const forro = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 18, 10, 0, Math.PI * 2, arriba ? 0 : Math.PI / 2, Math.PI / 2),
    mate(THREE, COMIDA.vaina_arveja_dentro, { side: THREE.DoubleSide })
  );
  forro.name = 'forro';
  forro.userData.ignorar = true;
  m.add(forro);
  return m;
}

registrar('vaina-arveja', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  const abajo = mediaVaina(THREE, false);
  abajo.name = 'abajo';
  v.add(abajo);

  const bisagra = new THREE.Group();
  bisagra.name = 'bisagra';
  bisagra.position.z = -0.085;
  const tapa = mediaVaina(THREE, true);
  tapa.name = 'tapa';
  tapa.position.z = 0.085;

  /* los bultos: la vaina de arveja marca sus granos mucho más que la
     de haba — se cuentan desde afuera antes de abrirla */
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.064, 8, 6), mate(THREE, COMIDA.vaina_arveja));
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_ARVEJA, 0.055, 0.1);
    b.scale.set(1, 0.62, 0.9);
    b.name = 'bulto' + i;
    b.userData.ignorar = true;
    bisagra.add(b);
  }
  bisagra.add(tapa);
  v.add(bisagra);

  /* EL HILO. No es adorno: es el primer gesto del nivel. Va tenso por
     toda la costura y sale del rabito, y el juego lo estira y lo tira
     a la composta cuando el jugador lo jala. Por eso es una malla
     larga y fina de verdad, no una línea pintada sobre la vaina: hay
     que poder verlo despegarse. */
  const hilo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 1.02, 5),
    mate(THREE, COMIDA.hilo_arveja)
  );
  hilo.rotation.z = Math.PI / 2;
  hilo.position.set(0, 0.014, 0.115);
  hilo.name = 'hilo';
  v.add(hilo);

  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.017, 0.11, 6), mate(THREE, COMIDA.hilo_arveja));
  rabo.rotation.z = Math.PI / 2.5;
  rabo.position.set(-0.45, 0.025, 0.02);
  rabo.name = 'rabo';
  v.add(rabo);

  return v;
});

registrar('arveja', (THREE, opts = {}) => {
  const a = new THREE.Group();
  a.name = 'arveja';
  /* casi esférica, pero no del todo: la arveja se aplana un poco
     donde apretaba contra sus vecinas dentro de la vaina */
  const geo = formaVariada('arveja', 4, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.09, escala: 2.8, semilla: k + 21 }));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COMIDA.arveja));
  cuerpo.scale.set(0.082, 0.077, 0.08);
  cuerpo.name = 'cuerpo';
  /* la cicatriz: el puntito claro por donde iba pegada a la vaina */
  const cicatriz = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 5), mate(THREE, COMIDA.arveja_cicatriz));
  cicatriz.position.set(0, -0.05, 0.02);
  cicatriz.scale.set(1, 0.5, 1);
  cicatriz.name = 'cicatriz';
  cicatriz.userData.ignorar = true;
  a.add(cuerpo, cicatriz);
  return a;
});
