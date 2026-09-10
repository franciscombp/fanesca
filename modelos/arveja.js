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

/* ---------- LA FORMA DE LA VAINA, EN UN SOLO SITIO ----------

   La media cáscara es media esfera unitaria ARQUEADA y luego
   escalada. Esos cuatro números estaban escritos dentro del
   constructor y en ningún otro lado, así que todo lo que va DENTRO de
   la vaina —los granos, los bultos— se colocaba en línea recta: una
   fila plana dentro de un cuerpo que se arquea y se afila.

   Se nota, y un jugador lo dijo con estas palabras: «las arvejas,
   cuando están inclinadas, los granos no siguen la misma forma». Los
   de las puntas se salían por los costados —ahí la vaina mide un 65%
   de lo que mide al medio— y todos flotaban por encima del vientre.

   `perfilVaina(x)` contesta las tres cosas que hay que saber para
   meter algo dentro: por dónde pasa el eje (el arco), cuánto mide de
   medio ancho y qué tan honda es a esa altura. Modelo y nivel la
   llaman a ella; si mañana la vaina se hace más gorda, lo de dentro
   se entera solo. */
export const VAINA = {
  largo: 0.5,     /* medio largo, en x */
  alto: 0.128,    /* hondura del vientre, en y */
  ancho: 0.116,   /* medio ancho, en z */
  arco: 0.1,      /* cuánto se arquea (ver curvar, más abajo) */
};

/* el bulto de un grano, para saber si cabe donde lo van a poner */
export const ARVEJA_R = { x: 0.082, y: 0.077, z: 0.08 };

export function perfilVaina(x) {
  /* u es la x en coordenadas de la esfera unitaria, que es donde
     `curvar` hizo su trabajo */
  const u = Math.max(-1, Math.min(1, x / VAINA.largo));
  /* la esfera se afila hacia las puntas: éste es su radio a esa x */
  const r = Math.sqrt(Math.max(0, 1 - u * u));
  return {
    z: u * u * VAINA.arco * VAINA.ancho,   /* el arco, ya escalado */
    ancho: r * VAINA.ancho,
    hondo: r * VAINA.alto,
  };
}

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
      { eje: 'x', hacia: 'z', k: VAINA.arco },
    ));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.vaina_arveja));
  m.scale.set(VAINA.largo, VAINA.alto, VAINA.ancho);
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
    const x = (i - (POR_VAINA - 1) / 2) * PASO_ARVEJA;
    const perfil = perfilVaina(x);
    /* los bultos siguen el arco de la vaina y se achican en las
       puntas, igual que los granos que están marcando: son la promesa
       de lo que hay dentro y tienen que prometer lo mismo */
    b.position.set(x, 0.055, 0.1 + perfil.z);
    const encoge = Math.min(1, perfil.ancho / VAINA.ancho + 0.18);
    b.scale.set(encoge, 0.62 * encoge, 0.9 * encoge);
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
  cuerpo.scale.set(ARVEJA_R.x, ARVEJA_R.y, ARVEJA_R.z);
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
