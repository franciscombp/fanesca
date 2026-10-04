/* ============================================================
   FANESCA — modelos/choclo.js
   Las piezas del choclo: el grano, la tusa, la hoja y los pelos.

   ------------------------------------------------------------
   LA MEDIDA MANDA, Y ESTÁ AQUÍ

   Este archivo define la GEOMETRÍA del choclo: cuántas hileras
   tiene, qué tan gordo es al medio, dónde cae cada grano. El
   nivel importa esas medidas y las usa para su lógica (la regla
   del vecino ausente, la cascada, dónde se esconde el gusanito).

   Está así a propósito: la forma y las posiciones son lo mismo.
   Si en Blender esculpes un grano más gordo, cambias PASO aquí y
   todo —el modelo, la rejilla y la lógica— se entera a la vez.
   Si estuvieran en dos sitios, un día no coincidirían y los
   granos se encimarían sin que nadie supiera por qué.

   ------------------------------------------------------------
   PARTES NOMBRADAS (para que un .glb encaje)

     grano-choclo → 'cuerpo'  (la que cambia de color y de escala)
     tusa         → una malla suelta, sin partes
     hoja-choclo  → 'lamina'
     pelos-choclo → 'mechon' (todas las hebras en una malla), 'agarre'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { formaVariada, forma } from './organico.js';
import { pintar, lienzo, ruido3, sstep, azarCon } from './pintura.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- COLORES NUEVOS (de paso: van a paleta.js) ----------
   Viven aquí mientras paleta.js está en obra; el día que se muden a
   COMIDA, estas claves se vuelven COMIDA.choclo_* y nada más cambia.

   UN SOLO AMARILLO POR MADUREZ, con un temblor chico (ΔL ≤ 4 %). La
   paleta vieja iba de #f3c352 a #fae09a: granos casi blancos entre
   amarillos, y la mazorca salía de retazos. Un choclo de verdad es
   parejo; lo que lo hace leerse grano a grano es la JUNTA oscura, no
   el color. Y los tres siguen separados por tono, que es lo que se
   juzga a ojo en la feria: amarillo yema, naranja cuajado, hueso. */
const COLORES = {
  choclo_tierno: ['#f7d264', '#f5cd58', '#f8d76e', '#f4ca55', '#f9d974'],
  /* las puntas, apenas más pálidas: el crema de antes las leía como
     dientes alrededor del tope */
  choclo_tierno_punta: '#f6d97f',
  choclo_duro: ['#eaa92e', '#e6a428', '#eeb03a', '#e4a126', '#ecad35'],
  choclo_duro_punta: '#eeb84c',
  choclo_seco: ['#e3d5ae', '#dfd0a6', '#e6d9b4', '#ddcda2', '#e5d7b1'],
  choclo_seco_punta: '#e9ddba',
  /* el podrido: café, con la corona más oscura y un anillo de moho */
  grano_podrido: '#6b4423',
  grano_podrido_mancha: '#3e2614',
  grano_podrido_moho: '#7d8a6a',
  /* la hoja, un punto más clara: la textura de nervaduras le baja ~7 % */
  hoja_choclo: ['#86b057', '#77a34d', '#93b866'],
};

/* ---------- la rejilla: la medida compartida ---------- */

export const A = 14;             /* hileras alrededor de la tusa */
export const P = 9;              /* granos a lo largo de cada hilera */
export const R = 0.46;           /* radio de la mazorca */
export const PASO = 0.208;       /* separación entre granos a lo largo */
export const LARGO = P * PASO;

/* la mazorca es más gorda al medio que en las puntas */
export const perfil = (u) => 0.80 + 0.20 * Math.sin(Math.PI * u);
export const uDe = (p) => (p + 0.5) / P;

/* Dónde va el grano (a, p): ángulo, radio y altura.

   AL TRESBOLILLO. Las hileras impares van media posición más
   arriba. En un choclo de verdad los granos no forman una cuadrícula
   sino un damero encajado —cada grano se mete en el hueco de sus dos
   vecinos— y esa es LA señal que hace que el ojo lea "maíz" y no
   "burbujas en cuadrícula". Es medio renglón de código y cambia todo.

   Ojo: esto mueve el grano en pantalla, no en la rejilla. La lógica
   sigue hablando de (a, p) y la regla del vecino ausente no se
   entera — que es justamente por qué la rejilla es lógica y no
   geométrica. */
export const TRESBOLILLO = 0.5;   /* medio paso de desfase por hilera */

export function posicionDe(a, p) {
  const th = (a / A) * Math.PI * 2;
  const r = R * perfil(uDe(p));
  const h = (p - (P - 1) / 2) * PASO + (a % 2 ? PASO * TRESBOLILLO : 0);
  return { th, r, h };
}

/* ---------- los dos temperamentos del choclo ----------
   No es solo color: el tierno cede casi solo pero revienta si
   pasas el dedo con fuerza; el duro no revienta nunca pero sus
   granos trabados aguantan el doble. La diferencia se ve —por eso
   vive con el modelo— y se juega —por eso el nivel la lee. */

export const MADUREZ = {
  tierno: {
    id: 'tierno', resistencia: 2, escala: 1.06,
    paleta: COLORES.choclo_tierno,
    punta: COLORES.choclo_tierno_punta,
    tusa: COMIDA.choclo_tierno_tusa,
    cascada: 0.038,
    presenta: 'Está <b>tierno</b>: cede solito, pero con fuerza el grano revienta.',
  },
  duro: {
    id: 'duro', resistencia: 5, escala: 0.94,
    paleta: COLORES.choclo_duro,
    punta: COLORES.choclo_duro_punta,
    tusa: COMIDA.choclo_duro_tusa,
    cascada: 0.08,
    presenta: 'Este está <b>duro</b>: no revienta, pero los trabados pelean.',
  },
  /* EL MAÍZ SECO. Ya no es choclo: es el maíz de la tonga, el que se
     guardó colgado hasta que perdió el agua. El grano se agarra a la
     tusa con todo y la cascada corre pesadísima — desgranarlo es de
     puño, no de dedo. Es el final de la temporada por algo. */
  seco: {
    id: 'seco', resistencia: 8, escala: 0.88,
    paleta: COLORES.choclo_seco,
    punta: COLORES.choclo_seco_punta,
    tusa: COMIDA.choclo_seco_tusa,
    cascada: 0.14,
    presenta: 'Este es <b>maíz seco</b>: se agarra con todo y la fila corre pesada.',
  },
};

/* ---------- el diente ----------
   La forma del grano. Una esfera abollada no es un grano de choclo:
   126 bolitas montadas se leían como un racimo de burbujas, una
   coliflor. El grano de verdad es un DIENTE: corona casi cuadrada que
   mira afuera, apenas abombada, y una cuña que se afina hacia la tusa
   donde los vecinos lo aprietan.

   Sobre una esfera con los polos en ±Y (que quedan escondidos bajo
   los granos de arriba y de abajo):
     · squircle: |x|^0.62 y |y|^0.62 empujan la corona a cuadrada;
     · cuña: lo que mira a la tusa (z < 0) se encoge a 0.72;
     · la corona se aplana de z = 0.35 para afuera;
     · el seco y el podrido llevan hoyuelo: el grano que perdió agua
       se hunde al medio, que es como se reconoce el maíz de tonga.

   Y lleva su OCLUSIÓN pintada en el color por vértice: oscuro hacia
   la raíz y en el canto de la corona. Esa es la junta oscura entre
   hileras, la que hace que el ojo cuente granos en vez de ver una
   masa amarilla — sin costar una sola llamada. */
function diente(THREE, geo, o = {}) {
  const cuadrar = o.cuadrar ?? 0.62;
  const hoyuelo = o.hoyuelo || 0;
  const ruidoF = o.ruidoF ?? 0.045;
  const ruidoE = o.ruidoE ?? 2.4;
  const hundir = o.hundir ?? 1;
  const semilla = o.semilla || 0;
  const pos = geo.attributes.position;
  const ao = new Float32Array(pos.count);
  const sq = (v) => Math.sign(v) * Math.pow(Math.min(1, Math.abs(v)), cuadrar);
  for (let i = 0; i < pos.count; i++) {
    let x = sq(pos.getX(i)), y = sq(pos.getY(i)), z = pos.getZ(i);
    const cu = 0.72 + 0.28 * sstep(0, 0.62, (z + 1) / 2);
    x *= cu; y *= cu;
    if (z > 0.35) z = 0.35 + (z - 0.35) * 0.62;
    if (hoyuelo && z > 0.3) z -= hoyuelo * Math.exp(-(x * x + y * y) / 0.12);
    z *= z > 0 ? hundir : 1;
    const n = ruido3(x * ruidoE, y * ruidoE, z * ruidoE, semilla) * ruidoF;
    x *= 1 + n; y *= 1 + n; z += 0.6 * n;
    pos.setXYZ(i, x, y, z);
    /* el canto: qué tan cerca del borde de la corona, ya cuadrada */
    const borde = Math.max(Math.abs(x), Math.abs(y)) / cu;
    ao[i] = (0.42 + 0.58 * sstep(0, 0.42, z)) *
      (1 - 0.38 * sstep(0.7, 1, borde)) *
      (1 + 0.06 * sstep(0.3, 0.6, z));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  /* la mancha (sólo el podrido) va en el mismo color por vértice,
     con el material en blanco: multiplicar un café oscuro por otro
     café oscuro sale negro, no podrido */
  const mancha = o.mancha;
  pintar(THREE, geo, (c, i, x, y, z) => {
    const a = ao[i];
    if (mancha) {
      const r = Math.hypot(x, y);
      c.copy(mancha.base);
      if (z > 0.1) {
        /* el squircle empuja casi toda la corona a r > 0.4: la mancha
           se mide en esa escala o el moho tapa la cara entera */
        c.lerp(mancha.moho, 0.6 * sstep(0.38, 0.5, r) * (1 - sstep(0.66, 0.8, r)));
        c.lerp(mancha.centro, 1 - sstep(0.2, 0.4, r));
      }
      c.multiplyScalar(a);
    } else {
      /* un pelo más cálido en la sombra, como el maíz de verdad */
      c.setRGB(a, a, a * 0.96);
    }
  });
  return geo;
}

/* ---------- la luz del grano ----------
   Los tres choclos usaban el mismo Phong y sólo cambiaba el tinte: el
   tierno no se sentía jugoso ni el duro cuajado, y en la feria ver eso
   ES la jugada. Dos toques en el shader, sin pasada extra:

     · luz envolvente (wrap): la sombra entra suave en el grano, como
       si la luz se metiera en la leche. Mucha en el tierno, poca en el
       duro, casi nada en el seco — que es harina, no leche.
     · borde lechoso a contraluz, multiplicado por la oclusión del
       vértice: si no, aclaraba justo los costados donde se juntan los
       granos y deshacía la junta oscura.

   Nada de brillo duro (la regla de paleta.js): shininess ≤ 14 y el
   specular oscuro. Un material por (madurez, color), compartido entre
   los 126 granos y marcado para que tirar() no lo deseche: de 126
   materiales por choclo a seis. Por eso NADIE puede mutar el color de
   un grano (hoy nadie lo hace: la feria tiñe hojas y pelos). */
const LUZ = {
  tierno: { envolver: 0.35, borde: 0.22, bordeColor: '#fff2c2', shininess: 14, specular: '#4a3e2a' },
  duro:   { envolver: 0.20, borde: 0.08, bordeColor: '#ffd27a', shininess: 8,  specular: '#3a3226' },
  seco:   { envolver: 0.08, borde: 0,    bordeColor: '#ffffff', shininess: 2,  specular: '#1a1712' },
};
const materialesGrano = new Map();

function granoJugoso(THREE, madurez, color, vc = true) {
  const L = LUZ[madurez] || LUZ.tierno;
  /* normalizado: '#F7D264', '#f7d264' y un undefined que se cuele no
     pueden abrir tres materiales distintos */
  const hex = new THREE.Color(color || '#ffffff').getHexString();
  const clave = madurez + ':' + hex + ':' + (vc ? 1 : 0);
  let m = materialesGrano.get(clave);
  if (m) return m;
  m = new THREE.MeshPhongMaterial({ color: '#' + hex, vertexColors: vc, shininess: L.shininess, specular: L.specular });
  const W = L.envolver.toFixed(2);
  m.onBeforeCompile = (sh) => {
    /* si el three de mañana cambia la línea, el grano sale sin
       envolvente, pero sale */
    const pars = THREE.ShaderChunk.lights_phong_pars_fragment;
    const viejo = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );';
    if (pars.includes(viejo)) {
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_phong_pars_fragment>',
        pars.replace(viejo, `float dotNL = saturate( ( dot( geometryNormal, directLight.direction ) + ${W} ) / ( 1.0 + ${W} ) );`));
    }
    if (L.borde > 0 && sh.fragmentShader.includes('#include <emissivemap_fragment>')) {
      sh.uniforms.uBorde = { value: new THREE.Color(L.bordeColor).multiplyScalar(L.borde) };
      sh.fragmentShader = sh.fragmentShader
        .replace('uniform vec3 emissive;', 'uniform vec3 emissive;\nuniform vec3 uBorde;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float fresG = pow( 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) ), 2.2 );
          #ifdef USE_COLOR
            totalEmissiveRadiance += uBorde * vColor.rgb * fresG;
          #else
            totalEmissiveRadiance += uBorde * fresG;
          #endif
        }`);
    }
  };
  m.customProgramCacheKey = () => 'grano:' + W + ':' + L.borde + ':' + (vc ? 1 : 0);
  m.userData.compartida = true;
  materialesGrano.set(clave, m);
  return m;
}

/* el índice de paleta, protegido: la feria pedía variante -1 y
   `-1 % 5` es -1 — salía un grano BLANCO (color undefined) por choclo
   abierto */
/* cuánto se inclina la corona de las puntas. 0.4 las paraba como una
   corona de dientes alrededor del tope de la tusa; 0.22 basta para
   cerrar la punta sin que se lea dentadura */
const INCLINA_PUNTA = 0.22;

const deLaPaleta = (lista, v) => lista[((v % lista.length) + lista.length) % lista.length];

/* tres dientes por madurez; el seco con hoyuelo. 14×10 y no más: con
   16×12 el choclo se iba a 49k triángulos para un borde que no se ve */
function geoDiente(THREE, madurez, variante, seg = [14, 10]) {
  return formaVariada('grano-diente-' + madurez + ':' + seg[0], 3, variante, (k) =>
    diente(THREE, new THREE.SphereGeometry(1, seg[0], seg[1]), {
      semilla: k * 3 + 1,
      hoyuelo: madurez === 'seco' ? 0.14 : 0,
    }));
}

/* ---------- el grano ----------
   Se pide con su madurez y si es de punta. Un pelo más ancho que
   el paso de la rejilla: así se aprietan entre sí como en la
   mazorca de verdad y no se ve la tusa entre medio.

   `lado` (sólo en las puntas): -1 la fila de abajo, +1 la de arriba.
   Inclina la corona hacia afuera del eje y tapa el tope de la tusa,
   que asomaba como un disco crema. */

registrar('grano-choclo', (THREE, opts = {}) => {
  const id = MADUREZ[opts.madurez] ? opts.madurez : 'tierno';
  const m = MADUREZ[id];
  const punta = !!opts.punta;
  const variante = opts.variante || 0;

  const g = new THREE.Group();
  g.name = 'grano';
  const color = punta ? m.punta : deLaPaleta(m.paleta, variante);
  const cuerpo = new THREE.Mesh(geoDiente(THREE, id, variante), granoJugoso(THREE, id, color));
  /* Gordo y asomado. En el eje local del grano: X es el ancho a lo
     largo de la hilera, Y lo alto del choclo, Z lo que sobresale.
     Se pasan del paso de la rejilla a propósito — los granos de un
     choclo se aprietan entre sí, no se rozan. Y cada uno con su
     genio: ni dos granos reales son iguales.

     El envoltorio se queda a ±4 % del de la esfera (0.124, 0.132,
     0.126): el área de toque no puede achicarse o el rayo cae entre
     granos, en la tusa. El squircle, encima, la AGRANDA ~15 %. */
  const e = m.escala * (0.96 + Math.random() * 0.08);
  cuerpo.scale.set(
    (punta ? 0.112 : 0.128) * e,
    (punta ? 0.112 : 0.127) * e,
    (punta ? 0.108 : 0.13) * e,
  );
  /* poco giro: una corona cuadrada torcida de más se ve desordenada,
     no natural */
  cuerpo.rotation.z = (Math.random() - 0.5) * 0.056;
  if (punta && opts.lado) cuerpo.rotation.x = -INCLINA_PUNTA * opts.lado;
  cuerpo.name = 'cuerpo';
  /* 126 piezas casi iguales: con el tope de sombras del motor, el azar
     de la escala decidía cuáles proyectaban — un salpicado al azar.
     La sombra la dan las hojas y la tusa; el grano lleva su oclusión
     pintada. */
  cuerpo.userData.sombra = false;
  g.add(cuerpo);
  return g;
}, { variante: (o) => '-' + (MADUREZ[o.madurez] ? o.madurez : 'tierno') });

/* ---------- la ventana de la feria ----------
   En el puesto nadie toca un grano: sólo se MIRA la franja que deja
   ver el pulgar. Así que esos granos no necesitan ser piezas: van
   fundidos en UNA malla por madurez —las hileras a = 2..5 de la cara
   de arriba, de punta a punta para que no quede tusa pelada en los
   extremos— con el color de cada grano en el vértice. De quince
   llamadas por choclo abierto a una, y compartida entre todos los
   choclos de la misma clase. */
export function ventanaDeGranos(THREE, madurez) {
  const id = MADUREZ[madurez] ? madurez : 'tierno';
  const m = MADUREZ[id];
  const geo = forma('feria-ventana:' + id, () => {
    const piezas = [];
    const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler();
    const pos = new THREE.Vector3(), esc = new THREE.Vector3();
    for (let a = 2; a <= 5; a++) {
      for (let p = 0; p < P; p++) {
        const { th, r, h } = posicionDe(a, p);
        const v = a * 7 + p * 3;
        const punta = p === 0 || p === P - 1;
        const g = geoDiente(THREE, id, v, [10, 8]).clone();
        /* el color del grano se hornea sobre la oclusión */
        const c = new THREE.Color(punta ? m.punta : deLaPaleta(m.paleta, v));
        const col = g.attributes.color;
        for (let i = 0; i < col.count; i++) col.setXYZ(i, col.getX(i) * c.r, col.getY(i) * c.g, col.getZ(i) * c.b);
        const k = m.escala;
        esc.set((punta ? 0.112 : 0.128) * k, (punta ? 0.112 : 0.127) * k, (punta ? 0.108 : 0.13) * k);
        eu.set(punta ? -INCLINA_PUNTA * (p === 0 ? -1 : 1) : 0, th, 0, 'YXZ');
        q.setFromEuler(eu);
        pos.set(Math.sin(th) * (r + 0.03), h, Math.cos(th) * (r + 0.03));
        g.applyMatrix4(mat.compose(pos, q, esc));
        piezas.push(g);
      }
    }
    const fundida = mergeGeometries(piezas);
    piezas.forEach(g => g.dispose());
    return fundida;
  });
  const malla = new THREE.Mesh(geo, granoJugoso(THREE, id, '#ffffff'));
  malla.name = 'granos';
  malla.userData.sombra = false;
  return malla;
}

/* ---------- la papilla ----------
   El grano tierno reventado. Se queda pegado a la tusa, traba la
   hilera y hay que limpiarlo aparte: reventar no es un atajo, es
   el desvío. */

registrar('papilla-choclo', (THREE) => {
  const splat = new THREE.Mesh(
    new THREE.SphereGeometry(1, 8, 6),
    mate(THREE, COMIDA.choclo_papilla)
  );
  splat.scale.set(0.135, 0.04, 0.115);
  splat.name = 'papilla';
  return splat;
});

/* ---------- el grano podrido ----------
   Grano dañado, de color café oscuro. Es frágil: si lo tocas con
   fuerza se va a la olla y arruina el nivel. Requiere un toque
   delicado para removerse. Nuevo desafío en niveles de dificultad
   alta.

   El mismo diente, pero hundido y arrugado (hoyuelo, corona baja,
   ruido fino): se distingue por la SILUETA y no sólo por el color,
   que es lo que pide un jugador daltónico. La mancha —corona negra y
   un anillo de moho— va pintada en el vértice. */

registrar('grano-podrido', (THREE, opts = {}) => {
  const variante = opts.variante || 0;

  const g = new THREE.Group();
  g.name = 'grano-podrido';

  const geo = formaVariada('grano-podrido-diente', 3, variante, (k) =>
    diente(THREE, new THREE.SphereGeometry(1, 14, 10), {
      semilla: k * 5 + 2, hoyuelo: 0.2, hundir: 0.85, ruidoF: 0.12, ruidoE: 5,
      mancha: {
        base: new THREE.Color(COLORES.grano_podrido),
        centro: new THREE.Color(COLORES.grano_podrido_mancha),
        moho: new THREE.Color(COLORES.grano_podrido_moho),
      },
    }));
  const cuerpo = new THREE.Mesh(geo, granoJugoso(THREE, 'seco', '#ffffff'));

  /* Escala similar al grano normal para que se mezcle en la rejilla:
     0.96 y no menos, que el área de toque es la misma regla */
  const e = 0.96 * (0.96 + Math.random() * 0.08);
  cuerpo.scale.set(0.128 * e, 0.127 * e, 0.13 * e);
  cuerpo.rotation.z = (Math.random() - 0.5) * 0.14;
  cuerpo.name = 'cuerpo';
  cuerpo.userData.sombra = false;
  g.add(cuerpo);

  /* Marcas de userData para el nivel: tipo y fragilidad */
  g.userData = {
    tipo: 'grano-podrido',
    fragil: true,
    velocidad_critica: 1200,  /* px/s — por encima, se daña */
  };

  return g;
});

/* ---------- la tusa ----------
   El corazón de la mazorca, con su tallito corto abajo para que
   se lea como choclo y no como mango de escoba.

   CON SUS ALVÉOLOS. Cada grano que sale destapaba una tusa crema lisa
   de pared, y al final volaba a la composta un cilindro blanco. La
   tusa de verdad es un panal: un hoyito por grano, con su labio
   claro, y entre hilera e hilera un lomo de paja. Va pintado en una
   textura (y su relieve en otra, gris, de bump) que sale de la MISMA
   rejilla que los granos —posicionDe, con el tresbolillo—, así que
   cada hueco queda exactamente donde estaba su grano. */

const TUSA_LARGO = LARGO + PASO * 0.9;
const TUSA_TOPE = 0.04;   /* el primer y último 4 % de v: lisos */

/* dibuja la rejilla de alvéolos; `bump` cambia los colores por alturas */
function dibujarTusa(ctx, W, H, bump) {
  const largo = TUSA_LARGO;
  ctx.fillStyle = bump ? '#c8c8c8' : '#f2f2f2';
  ctx.fillRect(0, 0, W, H);
  const yDe = (h) => (1 - (h + largo / 2) / largo) * H;   /* flipY: v=1 arriba */
  /* los lomos de paja entre hileras: oscuros en el color (la junta se
     lee oscura) pero CRESTAS en el relieve, no surcos */
  ctx.fillStyle = bump ? '#f4f4f4' : '#c7a77a';
  for (let a = 0; a < A; a++) {
    const x = ((a + 0.5) / A) * W;
    ctx.fillRect(x - 1.5 * W / 256, H * 0.05, 3 * W / 256, H * 0.9);
  }
  const rx = 0.40 * W / A, ry = 0.40 * H * PASO / largo;
  for (let a = 0; a < A; a++) {
    for (let p = -1; p <= P; p++) {
      const h = (p - (P - 1) / 2) * PASO + (a % 2 ? PASO * TRESBOLILLO : 0);
      const y = yDe(h);
      /* también en u±1, para que la costura no corte un hoyo */
      for (const du of [-1, 0, 1]) {
        const x = ((a / A) + du) * W;
        if (x < -rx || x > W + rx) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, ry / rx);
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        if (bump) {
          gr.addColorStop(0, '#303030');
          gr.addColorStop(0.65, '#8a8a8a');
          gr.addColorStop(0.92, '#ffffff');
          gr.addColorStop(1, 'rgba(200,200,200,0)');
        } else {
          gr.addColorStop(0, '#b8925f');
          gr.addColorStop(0.65, '#d7bd8a');
          gr.addColorStop(0.92, '#fff3d6');
          gr.addColorStop(1, 'rgba(255,243,214,0)');
        }
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
  }
  /* los topes: la textura estirada sobre el tope y el tallo se veía
     como rayas de paja; ahí va parejo */
  ctx.fillStyle = bump ? '#c8c8c8' : '#f2f2f2';
  ctx.fillRect(0, H * (1 - TUSA_TOPE), W, H * TUSA_TOPE);
  /* el de arriba, en sombra: entre la corona de granos de la punta
     asomaba como un cono blanco; oscuro se lee como el hueco que es */
  ctx.fillStyle = bump ? '#c8c8c8' : '#9a8a6c';
  ctx.fillRect(0, 0, W, H * 0.07);
}

registrar('tusa', (THREE, opts = {}) => {
  const m = MADUREZ[opts.madurez] || MADUREZ.tierno;
  /* la misma tusa para las tres madureces: solo cambia el tinte */
  const geo = forma('tusa-alveolos', () => {
    const pts = [];
    const N = 26;
    const largo = TUSA_LARGO;
    pts.push(new THREE.Vector2(0.004, -largo / 2 - 0.5));
    pts.push(new THREE.Vector2(0.1, -largo / 2 - 0.46));
    pts.push(new THREE.Vector2(0.125, -largo / 2 - 0.12));
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      let r = R * perfil(u) * 0.90;
      if (u < 0.07) r = 0.125 + (r - 0.125) * (u / 0.07);
      if (u > 0.93) r *= (1 - u) / 0.07;
      pts.push(new THREE.Vector2(Math.max(0.004, r), (u - 0.5) * largo));
    }
    /* 28 y no 22: múltiplo de las 14 hileras, así las columnas de
       vértices caen alineadas con las de alvéolos */
    const g = new THREE.LatheGeometry(pts, 28);
    /* la v de Lathe va por punto del perfil, no por altura: el tallo
       se comía un tercio de la textura. Se reasigna por altura. */
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setY(i, Math.max(0, Math.min(1, (pos.getY(i) + largo / 2) / largo)));
    }
    return g;
  });
  /* 512×256 y no menos: en el maíz la tusa mide ~700 px de alto en el
     teléfono, y con 128 texeles el relieve salía en escalones */
  const mapa = lienzo(THREE, 'tusa-alveolos', [512, 256], (c, W, H) => dibujarTusa(c, W, H, false));
  const relieve = lienzo(THREE, 'tusa-alveolos-bump', [512, 256], (c, W, H) => dibujarTusa(c, W, H, true), { datos: true });
  const t = new THREE.Mesh(geo, mate(THREE, m.tusa, { map: mapa, bumpMap: relieve, bumpScale: 3 }));
  t.name = 'tusa';
  return t;
}, { variante: (o) => '-' + (MADUREZ[o.madurez] ? o.madurez : 'tierno') });

/* ---------- las hojas ----------
   Siguen la panza del choclo, se abren en faldón abajo y cierran
   en punta arriba. Van POR FUERA del grano (que asoma hasta
   R·perfil + ~0.14): si no, los granos las atraviesan y el choclo
   nunca se ve cerrado. */

/* Diez hojas: dos vueltas completas para deshojar, más realista.
   Las cinco de afuera son más verdes (protectoras), y las cinco de
   adentro son más claras y tienen pelitos que hay que quitar.
   Esto refleja mejor la estructura real del choclo con varias capas
   de protección. */
export const HOJAS = 10;
/* Sobresale del choclo lo justo para taparlo con margen. Más larga
   y, al abrirse, la punta se acuesta encima de los cuencos. */
export const LARGO_HOJA = LARGO + 0.8;
export const BASE_HOJA = -LARGO / 2 - 0.42;   /* de dónde nace la hoja */

/* Dónde deja la hoja de tapar choclo y empieza a ser solo punta.
   Se calcula, no se elige a ojo: es la altura de la punta de la
   mazorca traducida a la coordenada de la hoja. De aquí depende que
   no se vea un grano antes de tiempo — el cierre en punta NO puede
   empezar antes, o la hoja se mete por dentro de los granos de
   arriba y los deja asomando con el choclo todavía cerrado. Que es
   exactamente lo que pasaba cuando el umbral era un 0.76 puesto a
   mano. */
export const U_PUNTA = (LARGO / 2 - BASE_HOJA) / LARGO_HOJA;

export function radioHoja(u) {
  /* de la punta para arriba: ya no hay choclo debajo, la hoja se
     cierra en pico. Cuadrático, para que salga un pico afilado y no
     un cono de fiesta. */
  if (u >= U_PUNTA) {
    const t = (u - U_PUNTA) / (1 - U_PUNTA);
    const r0 = R * perfil(1) + 0.19;
    return r0 * (1 - Math.pow(t, 1.7) * 0.93) + 0.02;
  }
  const yLocal = BASE_HOJA + u * LARGO_HOJA;
  const uCob = Math.max(0, Math.min(1, (yLocal + LARGO / 2) / LARGO));
  /* pegada a la panza del choclo, siempre por fuera del grano */
  const cuerpo = R * perfil(uCob) + 0.19;
  /* la culata: por debajo del primer grano las hojas se recogen
     hacia el tallo. Sin esto el choclo se apoya en un faldón acampanado
     —más ancho abajo que al medio— que es la silueta de un jarrón, no
     la de una mazorca. */
  if (yLocal < -LARGO / 2) {
    const t = Math.min(1, (-LARGO / 2 - yLocal) / 0.42);
    return cuerpo * (1 - 0.46 * t * t);
  }
  return cuerpo;
}

/* Cuántos NUDOS tiene la hoja. Una hoja de choclo no se abre como
   una tapa con bisagra: se va curvando, y la punta siempre va más
   abierta que la base. Con un solo pivote eso es imposible — sale
   una aleta rígida. Con tres eslabones encadenados, cada uno girando
   un poco menos que el anterior, la hoja se enrolla hacia afuera y
   el gesto pasa de "se abrió una compuerta" a "la estoy pelando". */
export const NUDOS = 3;

/* una banda de la hoja, de u0 a u1 del largo total */
function geoBandaDeHoja(THREE, n, u0, u1, arc) {
  const alto = (u1 - u0) * LARGO_HOJA;
  const g = new THREE.CylinderGeometry(1, 1, alto, 9, 6, true, -arc / 2, arc);
  g.translate(0, alto / 2, 0);   /* nace en y=0, crece hacia +Y */
  const pos = g.attributes.position;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
    /* u global dentro de la hoja entera, para que el perfil sea
       continuo entre bandas y no se vea el corte */
    const u = Math.max(0, Math.min(1, u0 + (y / alto) * (u1 - u0)));
    /* la nervadura: la hoja no es un casquete liso, tiene costillas
       a lo largo. Ondular el radio según el ángulo las dibuja sin
       costar un solo triángulo de más. */
    const ang = Math.atan2(x, z);
    /* La nervadura central levantada es lo que separa una hoja de la
       siguiente. Sin ella las cinco hojas se funden en una vaina lisa
       —se veía un pod verde, no un choclo envuelto— porque el traslape
       es tan generoso que los bordes no se leen. Con el lomo al medio,
       cada hoja tiene su propia luz y el ojo cuenta cinco. */
    const borde = Math.min(1, Math.abs(ang) / (arc / 2));
    const lomo = Math.cos(borde * Math.PI / 2);      /* 1 al centro, 0 al borde */
    const nervio = 1 + lomo * 0.050 + Math.cos(ang * 11) * 0.009;
    /* EN TEJA: cada hoja levanta su borde derecho un 8 % y así se monta
       siempre sobre el izquierdo de la siguiente, como las tejas de un
       tejado. Antes todas iban al mismo radio y el traslape no se leía
       como capas. El 8 % tiene que ganarle al lomo del 5 %, o el borde
       de la vecina atraviesa la hoja en la zona donde se tapan. Como
       todas son iguales y solo giran, se puede pelar cualquiera en
       cualquier orden sin que una cruce a otra. */
    const lado = Math.max(-1, Math.min(1, ang / (arc / 2)));
    const teja = 1 + 0.08 * (lado + 1) / 2;
    const r = radioHoja(u) * nervio * teja;
    /* Y SE AFINA HACIA LA PUNTA. Sin esto la hoja mantiene el mismo
       ancho de arriba abajo y, una vez abierta, se lee como una
       placa — que es exactamente lo que la delataba.

       Pero mientras la hoja tape choclo hay un piso que no puede
       cruzar: las cinco tienen que solaparse entre sí, y con el
       traslape de 1.46 eso es 1/1.46 ≈ 0.69 del arco. Por debajo de
       ahí se abren rendijas y se ven los granos con el choclo
       todavía cerrado — se regala el descubrimiento antes de que el
       jugador jale nada. Pasada la punta ya no tapa nada y puede
       adelgazar libre hasta terminar en hoja de verdad. */
    const t = Math.max(0, (u - 0.42) / (1 - 0.42));
    /* el piso baja EN RAMPA, no de un escalón: cortarlo de golpe en
       la punta abría dos muescas oscuras en los hombros del choclo */
    const tp = u < U_PUNTA ? 0 : (u - U_PUNTA) / (1 - U_PUNTA);
    const piso = 0.80 - 0.50 * tp * tp;
    const afila = Math.max(piso, 1 - 0.72 * t * t);
    const a2 = ang * afila;
    pos.setX(k, Math.sin(a2) * r);
    pos.setZ(k, Math.cos(a2) * r);
    /* la v de la UV es el u GLOBAL de la hoja: las tres bandas
       comparten la textura de nervaduras sin corte en los nudos */
    g.attributes.uv.setY(k, u);
  }
  g.computeVertexNormals();
  return g;
}

/* Las cinco hojas tienen exactamente la misma geometría —solo cambian
   de color y de ángulo—, así que la banda se calcula una vez por
   tramo y se reparte: tres geometrías en vez de quince, y el vuelto
   es medio segundo menos armando cada choclo. */
function bandaDeHoja(THREE, n, u0, u1, arc, material, total) {
  const geo = forma('hoja-choclo-banda:' + n + ':' + total, () => geoBandaDeHoja(THREE, n, u0, u1, arc));
  return new THREE.Mesh(geo, material);
}

registrar('hoja-choclo', (THREE, opts = {}) => {
  const i = opts.indice || 0;
  /* con traslape holgado: las hojas se tapan entre sí como en el
     choclo real, y de paso cubren lo que el afinado les quita.

     El arco sale de CUÁNTAS HOJAS TIENE ESTE CHOCLO, no de la
     constante: era siempre el de diez hojas (~53°), y los niveles
     reparten cinco (maíz) o seis (feria) a 72° o 60°. Con el choclo
     todavía cerrado ya se veían columnas de granos entre hoja y hoja —
     se regalaba el descubrimiento— y en la feria los choclos cerrados
     salían rayados de tusa como panes. */
  const total = opts.total || HOJAS;
  const arc = (Math.PI * 2 / total) * 1.46;

  /* colores según la posición: hojas exteriores más verdes,
     interiores más claras. Con 10 hojas, las primeras 5 (0-4) son
     verdes oscuras, y las últimas 5 (5-9) son claras y casi blancas */
  let color;
  /* con cinco o seis hojas todas son de afuera: las claras de adentro
     solo existen en el choclo entero de diez */
  const esInterior = total >= 8 && i >= Math.ceil(total / 2);
  if (esInterior) {
    /* hojas interiores: tonos muy claros, casi blancos */
    const blancos = ['#e8e8dc', '#e2e2d4', '#ebe7dc', '#dfe5d8'];
    color = blancos[i % blancos.length];
  } else {
    /* hojas exteriores: verdes oscuros protectores */
    const verdes = COLORES.hoja_choclo;
    color = verdes[i % verdes.length];
  }
  /* El material es POR HOJA y nunca compartido: la feria le cambia el
     color con tintar(). La textura y el programa, en cambio, son de
     todas. */
  const material = opts.nervada === false
    ? mate(THREE, color, { side: THREE.DoubleSide })
    : hojaNervada(THREE, color);

  /* la cadena: nudo0 en la base, y cada nudo cuelga del anterior */
  const raizHoja = new THREE.Group();
  raizHoja.name = 'lamina';
  let padre = raizHoja;
  for (let n = 0; n < NUDOS; n++) {
    const u0 = n / NUDOS, u1 = (n + 1) / NUDOS;
    const nudo = new THREE.Group();
    nudo.name = 'nudo' + n;
    /* el primero nace en la base; los demás, donde acabó el anterior */
    if (n > 0) nudo.position.y = LARGO_HOJA / NUDOS;
    const banda = bandaDeHoja(THREE, n, u0, u1, arc, material, total);
    banda.name = 'banda' + n;
    nudo.add(banda);
    padre.add(nudo);
    padre = nudo;
  }

  /* las hojas interiores tienen pelitos (silk) pegados: fibras finas
     que hay que quitar junto con la hoja. Antes eran 4-5 cilindros
     con geometría y material nuevos por hoja —unas diecisiete llamadas
     en un choclo de diez hojas para hilos que casi no se ven—; ahora
     van fundidos, tres variantes repartidas. */
  if (esInterior) {
    const pelitosHoja = new THREE.Group();
    pelitosHoja.name = 'pelitos-hoja';
    const geo = formaVariada('pelitos-hoja', 3, i, (k) => {
      const azar = azarCon(97 + k * 31);
      const hilos = [];
      for (let p = 0; p < 4 + (k % 2); p++) {
        const largo = 0.15 + azar() * 0.1;
        const c = new THREE.CylinderGeometry(0.0015, 0.004, largo, 4, 6);
        c.translate(0, largo / 2, 0);
        c.rotateZ((azar() - 0.5) * 0.8);
        c.translate((azar() - 0.5) * 0.08, 0.2 + azar() * LARGO_HOJA * 0.7, 0.02);
        hilos.push(c);
      }
      const f = mergeGeometries(hilos);
      hilos.forEach(h => h.dispose());
      return f;
    });
    const hilo = new THREE.Mesh(geo, mate(THREE, '#d4cfc0'));
    hilo.name = 'pelitos';
    pelitosHoja.add(hilo);
    raizHoja.add(pelitosHoja);
  }

  return raizHoja;
});

/* ---------- la piel de la hoja ----------
   La hoja cerrada era un escudo verde liso de un solo color, plástico
   inyectado. Una hoja de choclo tiene nervaduras paralelas a lo largo,
   los bordes finos que dejan pasar la luz, la punta más pálida, y por
   DENTRO es casi blanca: las peladas que cuelgan y las de la feria
   enseñan el revés.

   La textura es de LUMINANCIA (casi gris): el tono lo sigue mandando
   material.color, así que tintar() de la feria sigue funcionando y la
   señal no cambia de color. Una sola, a nivel de módulo, para todas
   las hojas de la sesión (tirar() no desecha texturas). */
function dibujarHoja(ctx, W, H) {
  const azar = azarCon(4242);
  ctx.fillStyle = 'rgb(240,242,233)';
  ctx.fillRect(0, 0, W, H);
  /* bordes finos, más claros: la luz pasa */
  const bordeW = W * 0.10;
  let gr = ctx.createLinearGradient(0, 0, bordeW, 0);
  gr.addColorStop(0, 'rgb(255,255,240)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, bordeW, H);
  gr = ctx.createLinearGradient(W, 0, W - bordeW, 0);
  gr.addColorStop(0, 'rgb(255,255,240)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = gr; ctx.fillRect(W - bordeW, 0, bordeW, H);
  /* la punta (arriba, por flipY) más pálida; la base, más honda */
  gr = ctx.createLinearGradient(0, 0, 0, H * 0.25);
  gr.addColorStop(0, 'rgb(255,252,232)'); gr.addColorStop(1, 'rgba(255,252,232,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H * 0.25);
  gr = ctx.createLinearGradient(0, H, 0, H * 0.85);
  gr.addColorStop(0, 'rgb(205,210,194)'); gr.addColorStop(1, 'rgba(205,210,194,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, H * 0.85, W, H * 0.15);
  /* las nervaduras paralelas, con un serpenteo chico. Suaves: con
     más contraste la hoja de la feria —diez píxeles de alto— salía
     rayada como un tapete */
  for (let x = 2, n = 0; x < W - 2; x += 3.2, n++) {
    const gruesa = n % 4 === 0;
    ctx.strokeStyle = gruesa ? 'rgba(70,90,40,0.12)' : 'rgba(70,90,40,0.06)';
    ctx.lineWidth = gruesa ? 1.5 : 1;
    ctx.beginPath();
    for (let y = 0; y <= H; y += 16) {
      const xx = x + Math.sin(y * 0.05 + n) * 0.6;
      if (y === 0) ctx.moveTo(xx, y); else ctx.lineTo(xx, y);
    }
    ctx.stroke();
  }
  /* el nervio central, claro */
  ctx.fillStyle = 'rgba(255,255,235,0.45)';
  ctx.fillRect(W / 2 - 1, 0, 2, H);
  /* fibras sueltas: rompen lo impreso */
  for (let f = 0; f < 160; f++) {
    ctx.fillStyle = azar() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(60,80,30,0.06)';
    ctx.fillRect(azar() * W, azar() * H, 1, 6 + azar() * 14);
  }
}

function hojaNervada(THREE, color) {
  const mapa = lienzo(THREE, 'hoja-choclo-nervada', [64, 256], dibujarHoja, { anisotropia: 4 });
  const m = mate(THREE, color, { side: THREE.DoubleSide, map: mapa });
  /* el revés, pálido: va DESPUÉS de color_fragment, así que se aplica
     sobre mapa × color y tintar() sigue mandando en la cara de afuera */
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\n  if ( !gl_FrontFacing ) diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.93, 0.94, 0.80 ), 0.42 );');
  };
  m.customProgramCacheKey = () => 'hoja-reves';
  return m;
}

/* ---------- los pelos ----------
   Largos: nacen del choclo y ASOMAN por la punta del cono de
   hojas, para que se vean antes de deshojar y se puedan arrancar
   de un jalón al final.

   UNA SOLA MALLA. Eran veintiséis cilindros —veintisiete llamadas con
   el agarre— del mismo café, en abanico: se leían como alambres o una
   escoba, no como seda. Y en la feria, a escala 0.22, medían menos de
   un píxel cuando el color del pelo es la MITAD de la señal del juego.

   Ahora son hebras finas agrupadas en siete mechones (la seda sale en
   manojos, no repartida como púas), que se levantan y se vencen por
   su peso, escritas directo en un BufferGeometry. El color por vértice
   es un gris cálido que oscurece a la punta: material.color sigue
   siendo el tono, y la feria lo sigue tiñendo. `grosor` engorda las
   hebras donde se ven de lejos (la feria pide 4). */

function geoPenacho(THREE, hebras, grosor) {
  const LADOS = 3, TRAMOS = 8;
  const anillos = TRAMOS + 1;
  const nV = hebras * anillos * LADOS;
  const posA = new Float32Array(nV * 3), norA = new Float32Array(nV * 3), colA = new Float32Array(nV * 3);
  const idx = [];
  const azar = azarCon(1300 + hebras * 7 + grosor);
  const P0 = new THREE.Vector3(), Pt = new THREE.Vector3(), T = new THREE.Vector3();
  const N = new THREE.Vector3(), B = new THREE.Vector3(), arriba = new THREE.Vector3();
  let v = 0;
  for (let i = 0; i < hebras; i++) {
    const c = Math.floor(i * 7 / hebras);
    const yaw = c * 2.39996 + (azar() - 0.5) * 0.24;
    const incl = (25 + azar() * 35) * Math.PI / 180;   /* desde la vertical */
    const L = 0.40 + azar() * 0.22;
    const caida = 0.35 + 0.35 * ((L - 0.40) / 0.22) * (0.6 + azar() * 0.4);
    const dir = new THREE.Vector3(Math.sin(incl) * Math.sin(yaw), Math.cos(incl), Math.sin(incl) * Math.cos(yaw));
    const ra = Math.sqrt(azar()) * 0.06, ta = azar() * Math.PI * 2;
    P0.set(Math.sin(ta) * ra, LARGO / 2 + 0.26 + azar() * 0.12, Math.cos(ta) * ra);
    const base = v;
    for (let s = 0; s < anillos; s++) {
      const t = s / TRAMOS;
      Pt.copy(P0).addScaledVector(dir, L * t);
      Pt.y -= caida * L * t * t;
      /* la tangente: dir más la derivada de la caída */
      T.copy(dir).multiplyScalar(L);
      T.y -= 2 * caida * L * t;
      T.normalize();
      arriba.set(Math.abs(T.y) > 0.9 ? 1 : 0, Math.abs(T.y) > 0.9 ? 0 : 1, 0);
      N.crossVectors(T, arriba).normalize();
      B.crossVectors(T, N);
      const rad = grosor * (0.0055 * (1 - t) + 0.0022 * t);
      const g = 1 - 0.28 * t;
      for (let l = 0; l < LADOS; l++) {
        const a = (l / LADOS) * Math.PI * 2;
        const nx = Math.cos(a) * N.x + Math.sin(a) * B.x;
        const ny = Math.cos(a) * N.y + Math.sin(a) * B.y;
        const nz = Math.cos(a) * N.z + Math.sin(a) * B.z;
        posA.set([Pt.x + nx * rad, Pt.y + ny * rad, Pt.z + nz * rad], v * 3);
        norA.set([nx, ny, nz], v * 3);
        colA.set([g, g, g * 0.94], v * 3);
        v++;
      }
    }
    for (let s = 0; s < TRAMOS; s++) {
      for (let l = 0; l < LADOS; l++) {
        const a0 = base + s * LADOS + l, a1 = base + s * LADOS + (l + 1) % LADOS;
        const b0 = a0 + LADOS, b1 = a1 + LADOS;
        idx.push(a0, a1, b1, a0, b1, b0);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posA, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(norA, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  return geo;
}

registrar('pelos-choclo', (THREE, opts = {}) => {
  const hebras = opts.hebras || 64;
  const grosor = opts.grosor || 1.8;
  const g = new THREE.Group();
  g.name = 'pelos';

  /* la geometría es de todos (forma); el material es de ESTA pieza,
     porque la feria lo tiñe. Lambert y no un lustre de seda: en
     hebras de uno a cuatro píxeles el brillo no se ve, y la regla de
     paleta.js es no poner plástico en la comida. */
  const mechon = new THREE.Mesh(
    forma('pelos-choclo:' + hebras + ':' + grosor, () => geoPenacho(THREE, hebras, grosor)),
    mate(THREE, COMIDA.pelo_choclo[0], { vertexColors: true, side: THREE.DoubleSide }),
  );
  mechon.name = 'mechon';
  /* el penacho es aire: no le gasta un cupo de sombra a las hojas */
  mechon.userData.sombra = false;
  g.add(mechon);

  /* ---- el agarre ----
     Las hebras finas dejan más aire que pelo: el dedo cae entre dos y
     no pasa nada. Esta campana invisible le da al penacho el blanco
     que su silueta promete. Sin `ignorar`, a propósito: es el
     objetivo, no decoración.

     visible:false EN EL MATERIAL, no en el objeto: el render se la
     salta (ya no cuesta una llamada transparente por choclo) y el
     rayo la sigue tocando, porque Mesh.raycast no mira el material y
     el motor sólo filtra por object.visible. */
  const agarre = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 10, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  agarre.position.y = LARGO / 2 + 0.5;
  agarre.scale.set(1, 0.85, 1);
  agarre.name = 'agarre';
  agarre.userData.sombra = false;
  g.add(agarre);

  return g;
});
