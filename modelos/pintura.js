/* ============================================================
   FANESCA — modelos/pintura.js
   Lo que le faltaba a la caja de herramientas para que una pieza
   tenga PIEL y no solo silueta.

   Hasta aquí el único detalle posible era pegar mallas encima —los
   bultos de la vaina, las motas del fréjol, las manchas del melloco,
   el piquito del garbanzo—, y cada una costaba una llamada de dibujo
   y se leía como una calcomanía. Con esto el detalle va DENTRO de la
   pieza y no cuesta nada por cuadro:

     pintar()       — color por vértice: el lomo más claro que el
                      canto, la oclusión en los valles, una mancha que
                      es parte de la piel y no una bolita pegada.
     lienzo()       — texturas pintadas a canvas, una por sesión.
     conBorde()     — luz de borde (Fresnel): el terciopelo de la vaina
                      de haba, la película mojada del chocho en
                      salmuera. Sin pasada extra: se inyecta en el
                      shader del material que ya existe.
     mediaCascara() / bultosEnFila() — la cáscara de una vaina con sus
                      granos marcados desde dentro.

   Todo se calcula UNA vez, dentro del constructor de forma() o
   formaVariada() (organico.js), y queda en caché con la geometría.
   ============================================================ */

/* la curva suave de 0 a 1 entre a y b */
export const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/* El mismo ruido de organico.js, para pintar con él: continuo y
   determinista (misma semilla, misma mancha). */
export function ruido3(x, y, z, semilla = 0) {
  const s = semilla * 1.37;
  return (
    Math.sin(x * 1.7 + y * 2.3 + s) * Math.cos(y * 1.9 - z * 2.1 + s) * 0.6 +
    Math.sin(z * 2.7 + x * 1.3 - s) * Math.cos(x * 2.9 + y * 1.1 + s) * 0.4
  );
}

/* ---------- pintar ----------
   Escribe el atributo 'color' llamando a fn(c, i, x, y, z, nx, ny, nz)
   por vértice; fn deja el color en `c` (un THREE.Color, en espacio
   LINEAL: los hex de la paleta se convierten con new THREE.Color(hex),
   que ya linealiza — nunca hex/255).

   El material lleva { vertexColors: true } y color blanco, o un color
   base si fn devuelve multiplicadores cerca de 1.

   Cuidado con Math.pow sobre coordenadas que pueden pasar de ±1 (los
   bultos empujan los vértices): pow de un negativo da NaN y la cara
   sale NEGRA. Acotar antes. */
export function pintar(THREE, geo, fn) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    c.setRGB(1, 1, 1);
    fn(c, i, pos.getX(i), pos.getY(i), pos.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i));
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/* ---------- lienzo ----------
   Una CanvasTexture por clave y por sesión. tirar() (motor3d.js)
   desecha geometrías y materiales al cambiar de nivel, pero NO
   texturas: una textura nueva por pieza se quedaría en la memoria de
   video para siempre. Compartida, cuesta una vez.

   `tam` es un lado (cuadrada) o [ancho, alto]. */
const lienzos = new Map();
export function lienzo(THREE, clave, tam, dibujar, opts = {}) {
  let tx = lienzos.get(clave);
  if (tx) return tx;
  const [W, H] = Array.isArray(tam) ? tam : [tam, tam];
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  dibujar(c.getContext('2d'), W, H);
  tx = new THREE.CanvasTexture(c);
  tx.colorSpace = opts.datos ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  if (opts.repetir) tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.anisotropy = opts.anisotropia || 1;
  lienzos.set(clave, tx);
  return tx;
}

/* azar con semilla para pintar lienzos repetibles */
export function azarCon(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* ---------- la luz de borde ----------
   Fresnel en el shader del propio material: más luz donde la
   superficie se pone de canto a la cámara. Es lo que lee como
   TERCIOPELO (la pelusa de la vaina de haba, color claro y potencia
   baja) o como PELÍCULA MOJADA (la salmuera del chocho, blanco y
   potencia alta).

   No es el «wrap» que se probó y se descartó para toda la comida
   (chocaba con la auto-sombra del sol): solo suma un borde, y solo en
   las piezas que lo piden.

   `alfa` = [centro, borde] hace que un material transparente sea más
   opaco en el canto, como una piel fina.

   Si el three de mañana cambia el include que se reemplaza, no se
   toca nada: la pieza sale sin borde, pero sale. */
export function conBorde(mat, opts = {}) {
  const color = opts.color || '#ffffff';
  const fuerza = opts.fuerza != null ? opts.fuerza : 0.25;
  const potencia = opts.potencia != null ? opts.potencia : 2.2;
  const alfa = opts.alfa || null;
  mat.onBeforeCompile = (sh, renderer) => {
    if (!sh.fragmentShader.includes('#include <opaque_fragment>')) return;
    const THREE_Color = mat.color.constructor;
    sh.uniforms.uBorde = { value: new THREE_Color(color) };
    sh.uniforms.uFuerza = { value: fuerza };
    sh.uniforms.uPot = { value: potencia };
    sh.uniforms.uAlfa = { value: alfa ? { x: alfa[0], y: alfa[1] } : { x: 1, y: 1 } };
    sh.fragmentShader = sh.fragmentShader
      .replace('void main() {', 'uniform vec3 uBorde; uniform float uFuerza; uniform float uPot; uniform vec2 uAlfa;\nvoid main() {')
      .replace('#include <opaque_fragment>',
        'float fresV = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), uPot);\n' +
        'outgoingLight += uBorde * fresV * uFuerza;\n' +
        (alfa ? 'diffuseColor.a = max(mix(uAlfa.x, uAlfa.y, fresV), clamp(dot(reflectedLight.directSpecular, vec3(0.6)), 0.0, 1.0));\n' : '') +
        '#include <opaque_fragment>');
  };
  /* que todos los materiales con borde compartan programa */
  mat.customProgramCacheKey = () => (alfa ? 'borde-alfa' : 'borde');
  return mat;
}

/* atajo: un mate (Lambert) con borde de terciopelo */
export function aterciopelado(THREE, color, opts = {}) {
  const { borde, ...matOpts } = opts;
  return conBorde(new THREE.MeshLambertMaterial({ color, ...matOpts }), borde || {});
}

/* ---------- la cáscara de una vaina ----------
   Media esfera con los polos en ±x: anillos densos a lo largo y las
   puntas lisas, sin la estrella del polo en el lomo (que es donde
   cae la luz). `arriba` da la mitad con y en [0, 1]. */
export function mediaCascara(THREE, opts = {}) {
  const arriba = opts.arriba !== false;
  const g = new THREE.SphereGeometry(1, opts.segSeccion || 12, opts.segLargo || 34,
    arriba ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/* ---------- los granos marcados desde dentro ----------
   Empuja la superficie por su normal con una campana por cada centro
   (en x, en unidades de la malla sin escalar): son los bultos de los
   granos dentro de la vaina, parte de la cáscara y no bolitas
   pegadas. Va DESPUÉS de entubar y ANTES de curvar. */
export function bultosEnFila(geo, opts = {}) {
  const centros = opts.centros || [];
  const sigma = opts.sigma != null ? opts.sigma : 0.14;
  const alto = opts.alto != null ? opts.alto : 0.25;
  const peso = opts.peso || (() => 1);
  geo.computeVertexNormals();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let s = 0;
    for (const c of centros) s += Math.exp(-((x - c) * (x - c)) / (2 * sigma * sigma));
    const d = alto * s * peso(x, y, z);
    pos.setXYZ(i, x + nor.getX(i) * d, y + nor.getY(i) * d, z + nor.getZ(i) * d);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
