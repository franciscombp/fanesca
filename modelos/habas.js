/* ============================================================
   FANESCA — modelos/habas.js
   La vaina que se abre por la costura, y el haba de adentro.

   La vaina es de las pocas piezas de este juego que se ARTICULA:
   la tapa cuelga de una bisagra al fondo y se echa para atrás al
   abrirse, como una vaina de verdad — no se desvanece.

   PARTES NOMBRADAS (para que un .glb encaje)
     vaina-haba → 'bisagra' (el grupo que rota al abrir)
                  'tapa', 'abajo', 'costura', 'rabo'
                  bulto0 … bultoN (los granos que se adivinan afuera)
     haba       → 'cuerpo', 'ombligo'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, curvar, entubar, formaVariada, forma } from './organico.js';
import { pintar, aterciopelado, mediaCascara, bultosEnFila } from './pintura.js';

export const POR_VAINA = 5;
export const PASO_HABA = 0.168;

/* medio largo de la vaina: la escala x de cada media cáscara */
const MEDIO_LARGO = 0.44;

/* EL PERFIL DE TUBO. La vaina era un elipsoide: un calabacín liso que
   se afilaba desde el centro, y a la altura de las habas de las puntas
   ya no había dónde ponerlas. Una vaina de haba es un tubo gordo que se
   cierra solo al final. */
const perfilHaba = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 4)), 0.4);

const acotar = (v) => Math.max(-1, Math.min(1, v));

/* LA MEDIA CÁSCARA: una sola geometría base por lado, deformada una vez,
   y de ella salen la cáscara y su forro. Antes el forro era otra esfera
   de radio 0.96 y asomaba en astillas blancas por donde la cáscara
   abollada se hundía; un clon de la MISMA superficie a 0.955 no puede
   asomar nunca. */
function baseVaina(THREE, arriba) {
  return forma('media-vaina-haba2:' + (arriba ? 'a' : 'b'), () => {
    const g = mediaCascara(THREE, { arriba, segLargo: 34, segSeccion: 12 });
    abollar(g, { fuerza: 0.03, escala: 3.4, semilla: arriba ? 1 : 2 });
    entubar(g, { eje: 'x', perfil: perfilHaba });
    /* los granos marcados desde dentro, en el lomo de la tapa: se
       adivina cuántas habas hay antes de abrirla. Antes eran cinco
       bolitas pegadas, tres enterradas y dos como verrugas. */
    if (arriba) {
      bultosEnFila(g, {
        centros: [-2, -1, 0, 1, 2].map(i => i * PASO_HABA / MEDIO_LARGO),
        sigma: 0.10, alto: 0.30,
        peso: (x, y, z) => Math.pow(Math.max(0, Math.min(1, y)), 1.3) * Math.exp(-z * z / 0.5),
      });
    }
    return g;
  });
}

function mediaVaina(THREE, arriba) {
  const clave = 'media-vaina-haba2:' + (arriba ? 'a' : 'b');
  const base = baseVaina(THREE, arriba);
  /* la piel: el lomo más claro que el canto, y un moteado apenas */
  const geoC = forma(clave + ':casc', () => pintar(THREE, base.clone(), (c, i, x, y, z) => {
    const yc = acotar(y);
    const k = 0.86 + 0.16 * Math.abs(yc) + 0.06 * z + 0.04 * Math.sin(23 * x + 7 * z) * Math.sin(17 * yc);
    c.setRGB(k * 1.02, k, k * 0.94);
  }));
  /* TERCIOPELO: la vaina de haba tiene pelusa, y la pelusa se ve en
     el canto, donde la superficie se pone de lado a la luz. Más de
     ~0.22 y la vaina sale escarchada. */
  const g = new THREE.Mesh(geoC, aterciopelado(THREE, COMIDA.vaina_haba,
    { vertexColors: true, borde: { color: COMIDA.vaina_haba_borde, fuerza: 0.2, potencia: 2.4 } }));
  g.scale.set(MEDIO_LARGO, 0.13, 0.115);
  /* el forro: algodón que verdea hacia el filo */
  const dentro = new THREE.Color(COMIDA.vaina_haba_dentro), filo = new THREE.Color(COMIDA.vaina_haba_filo);
  const geoF = forma(clave + ':forro', () => {
    const f = pintar(THREE, base.clone(), (c, i, x, y) => {
      c.copy(dentro).lerp(filo, Math.pow(Math.max(0, 1 - Math.abs(acotar(y))), 2.5));
    });
    f.scale(0.955, 0.955, 0.955);
    return f;
  });
  const forro = new THREE.Mesh(geoF, mate(THREE, '#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  forro.name = 'forro';
  forro.userData.ignorar = true;
  g.add(forro);
  return g;
}

registrar('vaina-haba', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  const abajo = mediaVaina(THREE, false);
  abajo.name = 'abajo';
  v.add(abajo);

  /* la tapa cuelga de una bisagra al fondo */
  const bisagra = new THREE.Group();
  bisagra.name = 'bisagra';
  bisagra.position.z = -0.1;
  const tapa = mediaVaina(THREE, true);
  tapa.name = 'tapa';
  tapa.position.z = 0.1;

  /* los bultos ya son parte de la cáscara; quedan como marcas vacías
     con su nombre de siempre porque el nivel los recorre al abrir */
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Object3D();
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_HABA, 0.052, 0.1);
    b.name = 'bulto' + i;
    bisagra.add(b);
  }
  bisagra.add(tapa);
  v.add(bisagra);

  /* LA COSTURA SIGUE EL FILO. Era una caja recta de 0.9 sobre un filo
     que se mete hacia dentro en las puntas: quedaba en el aire y
     asomaba por los dos lados como un palillo suelto. Ahora es un hilo
     que corre pegado al borde de la vaina, por donde se abre. */
  const geoCostura = forma('costura-haba', () => {
    const pts = [];
    for (let k = 0; k <= 24; k++) {
      const x = -0.41 + (0.82 * k) / 24;
      pts.push(new THREE.Vector3(x, 0.004, 0.114 * perfilHaba(x / MEDIO_LARGO)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0075, 5, false);
  });
  const costura = new THREE.Mesh(geoCostura, mate(THREE, COMIDA.costura_haba));
  costura.name = 'costura';
  costura.userData.ignorar = true;
  v.add(costura);

  /* el rabo, metido en la punta: flotaba separado con un hueco */
  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.1, 6), mate(THREE, COMIDA.hilo_haba));
  rabo.rotation.z = Math.PI / 2.3;
  rabo.position.set(-0.475, 0.02, 0);
  rabo.name = 'rabo';
  rabo.userData.ignorar = true;
  v.add(rabo);

  return v;
});

/* EL HABA: plana y arriñonada, más verde en el canto, con la uña oscura
   en una punta. Era una papa facetada con un ladrillito verde encima. */
registrar('haba', (THREE, opts = {}) => {
  const h = new THREE.Group();
  h.name = 'haba';
  const cara = new THREE.Color(COMIDA.haba), canto = new THREE.Color(COMIDA.haba_canto);
  const geo = formaVariada('haba2', 4, opts.variante || 0, (k) => {
    const g = curvar(
      abollar(new THREE.SphereGeometry(1, 18, 12), { fuerza: 0.04, escala: 1.7, semilla: k + 3 }),
      { eje: 'x', hacia: 'z', k: 0.14 },
    );
    return pintar(THREE, g, (c, i, x, y, z, nx, ny) => {
      c.copy(canto).lerp(cara, Math.pow(Math.max(0, ny), 0.8) * (1 - 0.25 * Math.abs(acotar(x))));
    });
  });
  const cuerpo = new THREE.Mesh(geo, aterciopelado(THREE, '#ffffff',
    { vertexColors: true, borde: { color: '#f4fbd8', fuerza: 0.22, potencia: 2.4 } }));
  /* igual de larga que antes (el nivel recoge por cercanía con ese
     radio), más plana */
  cuerpo.scale.set(0.086, 0.052, 0.07);
  cuerpo.name = 'cuerpo';
  const ombligo = new THREE.Mesh(
    forma('una-haba', () => new THREE.CapsuleGeometry(0.006, 0.034, 2, 6)),
    mate(THREE, COMIDA.haba_una));
  ombligo.rotation.x = Math.PI / 2;
  ombligo.position.set(0.079, 0.012, 0);
  ombligo.name = 'ombligo';
  ombligo.userData.ignorar = true;
  h.add(cuerpo, ombligo);
  return h;
});
