/* ============================================================
   FANESCA — modelos/zapallo.js
   El zapallo, en las cuatro formas que tiene mientras se prepara:
   entero, partido a la mitad, pelado y en tajadas.

   Un zapallo no llega a la olla en rodajas: llega redondo, con su
   rabo, y hay que partirlo, despepitarlo, pelarlo y recién ahí
   cortarlo. Cada una de esas formas es una pieza distinta aquí, y
   el nivel las va cambiando — igual que el choclo pasa de mazorca
   con hojas a tusa pelada.

   Como en el choclo, la medida manda y vive aquí: el nivel usa
   GRUESO y R para saber dónde cae cada tajada y cada línea de
   corte.

   PARTES NOMBRADAS (para que un .glb encaje)
     zapallo-entero → 'cuerpo', 'rabo'
     mitad-zapallo  → 'piel', 'cara', 'hueco'
     cascara-zapallo→ 'cascara'
     fibra-zapallo  → 'fibra'
     tajada-zapallo → una malla suelta (tres materiales: piel,
                      pulpa, pulpa — en ese orden de grupo)
     tajada-plana   → 'cuerpo', 'pared', cascara0…cascaraN, 'hueco'
     trozo-pulpa    → una malla suelta
     guia-zapallo   → raya0 … rayaN (la línea punteada del corte)
     pepa-zapallo   → una malla suelta
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, gajos, forma, formaVariada } from './organico.js';
import { pintar, lienzo, sstep, azarCon } from './pintura.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  zapallo_valle: '#a4501a',      /* el fondo del valle entre gajos, en sombra */
  zapallo_cresta: '#f2a640',     /* el lomo del gajo, donde pega la luz */
  zapallo_polo: '#8f5320',       /* tostado hacia el rabo y hacia el asiento */
  rabo_verde: '#5d5a2a',         /* rabo seco: verde oliva en la base… */
  rabo_paja: '#b59a62',          /* …pajizo hacia la punta… */
  rabo_corte: '#e3d0a0',         /* …y la punta cortada, clara */
  pulpa_centro: '#f9d27a',       /* la tajada tendida: pulpa clara al centro */
  pulpa_orilla: '#ec9634',       /* y más subida de color hacia la cáscara */
  pulpa_canto: '#f0a03a',        /* el canto de la tajada, a la sombra */
  hueco_fondo: '#d9782a',
  hueco_sombra: '#b8611f',
  hueco_labio: '#f2b452',
  fibra: '#f4b552',
};

/* LOS GAJOS PINTADOS: el valle oscuro y el lomo claro. La silueta ya
   decía «gajos», pero de frente el zapallo era un bulto de un solo
   naranja: sin oclusión en los valles, la luz no tenía dónde
   quebrarse. v = 0 en la cresta, 1 al fondo del valle — la misma
   cuenta con que gajos() cava, así el color cae justo en la forma.
   `polo` tuesta las puntas del eje (rabo y asiento) si se pide. */
function pintarGajos(THREE, geo, opts = {}) {
  const n = opts.n || 9;
  const base = new THREE.Color(opts.base || COMIDA.zapallo_piel);
  const valle = new THREE.Color(COLORES.zapallo_valle);
  const cresta = new THREE.Color(COLORES.zapallo_cresta);
  const polo = new THREE.Color(COLORES.zapallo_polo);
  const yPolo = opts.yPolo || 0;
  return pintar(THREE, geo, (c, i, x, y, z) => {
    const v = (1 - Math.cos(n * Math.atan2(x, z))) / 2;
    c.copy(base).lerp(valle, 0.75 * Math.pow(v, 1.6)).lerp(cresta, 0.45 * Math.pow(1 - v, 4));
    if (yPolo) c.lerp(polo, 0.55 * sstep(0.62, 1.0, Math.abs(y) / yPolo));
    /* pecas finitas: ningún zapallo es de un solo naranja */
    c.multiplyScalar(1 + 0.05 * Math.sin(x * 37 + z * 23) * Math.sin(y * 41 - x * 17));
  });
}

export const N = 7;              /* tajadas */
export const GRUESO = 0.36;      /* ancho de cada tajada */
export const R = 0.5;            /* radio del zapallo ya partido */
export const R_ENTERO = 0.66;    /* y el del zapallo antes de partirlo */

/* la tajada TENDIDA en la tabla, grande, para limpiarla y pelarla:
   una media luna vista desde arriba, con la cáscara por el arco y el
   hueco de las pepas al centro de la orilla recta. Es la única pieza
   del nivel donde la precisión del dedo se mide en milímetros de
   mundo, así que va enorme: casi todo el ancho seguro de la cámara. */
export const R_PLANA = 0.88;           /* radio de la media luna */
export const GRUESO_PLANA = 0.2;       /* su grosor, tendida */
export const CASCARA = 0.09;           /* ancho de la cáscara vista desde arriba */
export const HUECO = 0.42;             /* radio del hueco de las pepas, en radios */
export const SEGMENTOS_CASCARA = 9;    /* la cáscara se pela por tramos */

export const xDeTajada = (i) => (i - (N - 1) / 2) * GRUESO;
export const xDeFrontera = (b) => (b - N / 2) * GRUESO;

registrar('tajada-zapallo', (THREE) => {
  /* medio cilindro tumbado: el zapallo partido a lo largo, cara abajo.
     Tres materiales porque el cilindro trae tres grupos: costado,
     tapa y fondo — el costado es la piel, las caras son pulpa. */
  /* Los gajos del zapallo: la piel no es un cilindro liso, tiene
     lomos que le dan la vuelta. Solo con ruido salía un pan; con
     gajos regulares —ocho, para que la mitad de cilindro contenga
     cuatro enteros y las caras de corte queden en cresta— se lee
     zapallo desde la silueta. El ruido se queda encima, flojito,
     para que ningún gajo sea idéntico al de al lado. */
  const geo = forma('tajada-zapallo', () =>
    abollar(
      gajos(new THREE.CylinderGeometry(R, R, GRUESO * 0.97, 40, 2, false, 0, Math.PI),
        { eje: 'y', n: 8, hondura: 0.14 }),
      { fuerza: 0.012, escala: 4.2, semilla: 41 },
    ));
  /* los valles oscuros en la piel: los lomos se leen durante toda la
     fase de corte. Las tapas no usan el color de vértice (miran de
     canto a la cámara; pintarles un hueco sería trabajo invisible). */
  if (!geo.attributes.color) pintarGajos(THREE, geo, { n: 8 });
  const g = new THREE.Mesh(
    geo,
    [
      mate(THREE, '#ffffff', { vertexColors: true }),
      mate(THREE, COMIDA.zapallo_pulpa),
      mate(THREE, COMIDA.zapallo_pulpa),
    ]
  );
  g.rotation.z = Math.PI / 2;      /* eje a lo largo de X, panza arriba */
  g.name = 'tajada';
  return g;
});

/* la línea punteada por donde va el cuchillo */
registrar('guia-zapallo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'guia';
  const trozos = 9;
  /* El arco puede ser el del zapallo entero o el de una tajada, así
     que el radio se pide. Y las rayas se piden GRUESAS a propósito:
     una línea de dos milímetros es un adorno para quien ya sabe
     jugar, no una instrucción para quien recién agarra el teléfono.
     Si la guía es lo que dice dónde va el cuchillo, tiene que verse
     desde el otro lado de la mesa. */
  const ry = opts.ry != null ? opts.ry : R + 0.012;
  const rz = opts.rz != null ? opts.rz : R + 0.012;
  const gr = opts.grosor != null ? opts.grosor : 1;
  /* CADA RAYA ES UNA TIRA PLANA tangente a la superficie, crema al
     centro y oscura al borde (color de vértice: sin malla de más).
     Eran cajas café de 5 cm de alto: flotaban sobre los valles de los
     gajos y se leían como grapas clavadas, no como una línea. */
  const geo = new THREE.PlaneGeometry(0.06 * gr, 0.15 * gr, 3, 1);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const oscuro = new THREE.Color(COMIDA.zapallo_guia), claro = new THREE.Color(COMIDA.zapallo_tiza);
  const w = 0.06 * gr;
  for (let k = 0; k < pos.count; k++) {
    const borde = Math.abs(Math.abs(pos.getX(k)) - w / 2) < 1e-6;
    const c = borde ? oscuro : claro;
    col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = mate(THREE, '#ffffff', { vertexColors: true, side: THREE.DoubleSide,
    emissive: '#3a2a12', emissiveIntensity: 0.15 });
  const X = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= trozos; i++) {
    if (i % 2) continue;
    const a = (i / trozos) * Math.PI;
    /* en el zapallo entero la cima es del rabo: una raya ahí asomaba
       por detrás de él como una astilla */
    if (opts.sinCima && Math.abs(Math.cos(a)) < 0.25) continue;
    const d = new THREE.Mesh(geo, mat);
    d.position.set(0, Math.sin(a) * ry, -Math.cos(a) * rz);
    /* ejes: ancho en x, largo a lo largo del arco, normal hacia fuera */
    const normal = new THREE.Vector3(0, Math.sin(a), -Math.cos(a));
    const tangente = new THREE.Vector3(0, -Math.cos(a), -Math.sin(a));
    d.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, tangente, normal));
    d.name = 'raya' + i;
    d.userData.ignorar = true;
    g.add(d);
  }
  return g;
});

/* las pepas asomando por la cara abierta de las puntas */
/* LA FORMA VA EN LA GEOMETRÍA: lágrima plana con su reborde. Iba en
   p.scale (1, 0.45, 1.3) y el nivel hace p.scale.setScalar(2.3), que
   pisaba la forma: salían pelotas de golf blancas. */
registrar('pepa-zapallo', (THREE) => {
  const geo = forma('pepa-zapallo', () => {
    const g = new THREE.SphereGeometry(1, 16, 8);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const cara = new THREE.Color(COMIDA.zapallo_pepa), borde = new THREE.Color(COMIDA.zapallo_pepa_borde);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      /* ancha atrás, afilada adelante */
      const f = 0.3 + 0.7 * Math.pow((z + 1) / 2, 0.55);
      pos.setXYZ(i, x * 0.62 * f, y * 0.2, z);
      /* el reborde levantado de la pepa de zapallo, más tostado */
      c.copy(cara).lerp(borde, 0.8 * Math.pow(1 - Math.abs(y), 3));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.scale(0.028 / 0.62, 0.009 / 0.2, 0.045);
    g.computeVertexNormals();
    return g;
  });
  const p = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  p.name = 'pepa';
  p.userData.ignorar = true;
  return p;
});

/* ---------- el zapallo entero ----------
   Redondo, con gajos hondos y su rabo leñoso. Es lo primero que se
   ve del nivel y tiene que leerse como zapallo desde la silueta,
   sin depender del color: por eso los gajos van más marcados que en
   la tajada, y por eso está achatado —un zapallo apoyado se sienta,
   no rueda. */
registrar('zapallo-entero', (THREE, opts = {}) => {
  const r = opts.radio || R_ENTERO;
  const g = new THREE.Group();
  g.name = 'zapallo-entero';

  /* Más segmentos que antes (eran 34×22, unos cuatro por gajo: la
     silueta salía en facetas). Y SIN achatar(): achatar sube la base
     y el nivel asienta el zapallo contando con que el fondo está en
     y = -1, a ras de la tabla — achatado quedaba flotando, con la
     sombra del sol despegada. Desde esta cámara el asiento no se ve.
     Lo que sí se ve es la copa: se baja hacia el rabo (no es un
     hoyuelo de verdad, pero la corona del rabo tapa el centro). */
  const geo = forma('zapallo-entero', () => {
    const s = gajos(new THREE.SphereGeometry(1, 56, 26), { eje: 'y', n: 9, hondura: 0.17 });
    const pos = s.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.55) pos.setY(i, y - 0.16 * Math.pow(sstep(0.55, 1, y), 1.6));
    }
    s.computeVertexNormals();
    abollar(s, { fuerza: 0.012, escala: 3.4, semilla: 61 });
    return pintarGajos(THREE, s, { yPolo: 0.84 });
  });
  const cuerpo = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  cuerpo.scale.set(r, r * 0.78, r);
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);

  /* el rabo: corto, grueso y torcido. Es el detalle que más rápido
     dice "esto es un zapallo y no una pelota". Un cilindro de siete
     lados se leía como estaca clavada: el de verdad es una estrella
     de cinco aristas, se ensancha como campana donde nace, se tuerce
     y se dobla, y está seco — verde oliva abajo, paja arriba, y la
     punta del corte clara. */
  const geoR = forma('rabo-zapallo', () => {
    const rg = new THREE.CylinderGeometry(0.05, 0.075, 0.24, 15, 8);
    const rp = rg.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i), y = rp.getY(i), z = rp.getZ(i);
      const t = (y + 0.12) / 0.24;              /* 0 base, 1 punta */
      const k = (1 + 0.22 * Math.cos(Math.atan2(x, z) * 5)) * (1 + 0.9 * Math.pow(1 - sstep(0, 0.35, t), 2));
      const xs = x * k, zs = z * k, tw = t * 0.9;
      rp.setXYZ(i, xs * Math.cos(tw) - zs * Math.sin(tw) + t * t * 0.07, y, xs * Math.sin(tw) + zs * Math.cos(tw));
    }
    rg.computeVertexNormals();
    const seco = new THREE.Color(COLORES.rabo_verde), paja = new THREE.Color(COLORES.rabo_paja), corte = new THREE.Color(COLORES.rabo_corte);
    return pintar(THREE, rg, (c, i, x, y) => {
      if (y > 0.119) c.copy(corte);
      else c.copy(seco).lerp(paja, sstep(0.2, 0.95, (y + 0.12) / 0.24));
    });
  });
  const rabo = new THREE.Mesh(geoR, mate(THREE, '#ffffff', { vertexColors: true }));
  rabo.position.y = r * 0.78 * 0.84 + 0.1;
  rabo.rotation.z = 0.18;
  rabo.name = 'rabo';
  rabo.userData.ignorar = true;
  g.add(rabo);

  return g;
});

/* ---------- media calabaza, con su hueco ----------
   El hueco es una cúpula invertida hundida en la cara de corte. No
   es un agujero de verdad —taladrar la malla costaría caro y no se
   vería mejor— pero con la sombra del borde y las pepas dentro,
   lee como cavidad desde el único ángulo desde el que se mira. */
registrar('mitad-zapallo', (THREE, opts = {}) => {
  const r = opts.radio || R_ENTERO;
  const g = new THREE.Group();
  g.name = 'mitad-zapallo';

  const geo = forma('mitad-zapallo', () =>
    abollar(
      gajos(new THREE.SphereGeometry(1, 30, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
        { eje: 'y', n: 9, hondura: 0.17 }),
      { fuerza: 0.02, escala: 3.4, semilla: 62 },
    ));
  /* la misma piel pintada del entero: si no, al partirlo cambiaba de
     zapallo */
  if (!geo.attributes.color) pintarGajos(THREE, geo, { yPolo: 1 });
  const piel = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  piel.scale.set(r, r * 0.78, r);
  piel.name = 'piel';
  g.add(piel);

  /* la cara de corte: pulpa clara, la parte que se va a pelar */
  const cara = new THREE.Mesh(
    new THREE.CircleGeometry(r * 0.985, 30),
    mate(THREE, COMIDA.zapallo_pulpa, { side: THREE.DoubleSide })
  );
  cara.rotation.x = -Math.PI / 2;
  cara.position.y = 0.002;
  cara.name = 'cara';
  g.add(cara);

  /* el hueco de las pepas, hundido en el centro */
  const hueco = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.52, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    mate(THREE, COMIDA.zapallo_hueco, { side: THREE.DoubleSide })
  );
  hueco.scale.set(1, 0.62, 1);
  hueco.position.y = 0.004;
  hueco.name = 'hueco';
  hueco.userData.ignorar = true;
  g.add(hueco);

  return g;
});

/* ---------- la tira de cáscara que sale al pelar ----------
   Curvada, porque sale de una superficie curva: una tira recta se
   ve como una calcomanía despegada y no como cáscara. */
registrar('cascara-zapallo', (THREE, opts = {}) => {
  const largo = opts.largo != null ? opts.largo : 0.62;
  const geo = forma('cascara-zapallo:' + Math.round(largo * 50), () => {
    const c = new THREE.PlaneGeometry(0.17, largo, 3, 10);
    const pos = c.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      /* teja: se arquea a lo ancho y se riza en las puntas */
      pos.setZ(i, -(x * x) * 1.6 - Math.pow(y / largo, 2) * 0.1);
    }
    pos.needsUpdate = true;
    c.computeVertexNormals();
    return c;
  });
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.zapallo_piel, { side: THREE.DoubleSide }));
  m.name = 'cascara';
  return m;
});

/* LAS TEXTURAS DEL CORTE, una por sesión (lienzo() las guarda: tirar()
   no libera texturas, así que crearlas por pieza las dejaría en la
   memoria de video para siempre). */
function texCorteZapallo(THREE) {
  return lienzo(THREE, 'corteZapallo-sinPiel', 512, (x, S) => {
    const R = S / 2;
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, COLORES.pulpa_centro); g.addColorStop(0.42, '#f8c96a');
    g.addColorStop(0.8, '#f2a845'); g.addColorStop(0.9, '#ee9a36'); g.addColorStop(1, COLORES.pulpa_orilla);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    /* las venitas de la pulpa, apenas: más fuertes salían rayos de sol */
    const az = azarCon(29);
    x.globalAlpha = 0.04; x.strokeStyle = '#fff3c8'; x.lineWidth = 2;
    for (let i = 0; i < 80; i++) {
      const a = az() * Math.PI * 2, r0 = R * (0.4 + az() * 0.12), r1 = R * (0.78 + az() * 0.12);
      x.beginPath(); x.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
      x.lineTo(R + Math.cos(a + (az() - 0.5) * 0.08) * r1, R + Math.sin(a + (az() - 0.5) * 0.08) * r1); x.stroke();
    }
    x.globalAlpha = 1;
  }, { anisotropia: 4 });
}

/* el hueco: con hebras mientras está sucio, y el mismo degradado sin
   ellas cuando se raspó — así se VE que se limpió */
export function texHueco(THREE, conHebras) {
  return lienzo(THREE, conHebras ? 'huecoZapallo' : 'huecoZapallo-limpio', 256, (x, S) => {
    const R = S / 2;
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, COLORES.hueco_fondo); g.addColorStop(0.7, '#e58a34');
    g.addColorStop(0.9, COLORES.hueco_sombra); g.addColorStop(1, COLORES.hueco_labio);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    if (!conHebras) return;
    const az = azarCon(53);
    x.lineCap = 'round';
    for (let i = 0; i < 60; i++) {
      const a = az() * Math.PI * 2, r0 = az() * R * 0.3, r1 = R * (0.6 + az() * 0.3);
      x.strokeStyle = `rgba(255,${200 + (i % 30)},${120 + (i % 40)},${0.12 + az() * 0.18})`;
      x.lineWidth = 1.5 + az() * 3;
      x.beginPath(); x.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
      x.bezierCurveTo(R + Math.cos(a + 0.5) * r1 * 0.4, R + Math.sin(a + 0.5) * r1 * 0.4,
        R + Math.cos(a - 0.4) * r1 * 0.7, R + Math.sin(a - 0.4) * r1 * 0.7, R + Math.cos(a) * r1, R + Math.sin(a) * r1);
      x.stroke();
    }
  });
}

/* ---------- la tajada tendida: media luna con cáscara y hueco ----------
   Es la pieza de la faena técnica. El cuerpo es la media luna
   extruida (con todas sus paredes, que un medio cilindro abierto
   dejaba ver el interior por la orilla recta); la cáscara va en
   SEGMENTOS aparte sobre el arco, porque se pela tramo a tramo y
   cada tramo tiene que poder volar solo a la composta; y el hueco de
   las pepas es un medio disco hundido de color al centro de la
   orilla recta, que es donde queda de verdad la cavidad al cortar un
   zapallo a través del eje.

   Coordenadas: la orilla recta va a lo largo de X pasando por el
   origen, y el arco mira a -Z (al fondo de la tabla). El ángulo de
   un punto del arco se mide desde +X hacia -Z, de 0 a π: es el mismo
   ángulo con que se colocan los segmentos de cáscara.

   PARTES NOMBRADAS
     tajada-plana → 'cuerpo', 'pared', cascara0…cascaraN, 'hueco' */
registrar('tajada-plana', (THREE, opts = {}) => {
  const r = opts.radio || R_PLANA;
  const h = opts.grueso || GRUESO_PLANA;
  const g = new THREE.Group();
  g.name = 'tajada-plana';

  const geo = forma('tajada-plana:' + Math.round(r * 100), () => {
    const forma2d = new THREE.Shape();
    forma2d.moveTo(-r, 0);
    forma2d.absarc(0, 0, r, Math.PI, 0, true);
    forma2d.lineTo(-r, 0);
    const e = new THREE.ExtrudeGeometry(forma2d, { depth: h, bevelEnabled: false, curveSegments: 40 });
    /* uv planos centrados en el eje: el degradado de la textura queda
       en anillos alrededor del hueco, como en el corte de verdad. Con
       r/0.93 la orilla cae dentro del naranja subido; se usa la
       variante SIN piel pintada, porque una raya parda en la orilla
       se leía como cáscara olvidada después de pelar. */
    const uv = e.attributes.uv, pos = e.attributes.position, rr = r / 0.93;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * rr) + 0.5, pos.getY(i) / (2 * rr) + 0.5);
    return e;
  });
  /* grupo 0 = tapas (la cara que se mira), 1 = costados (el canto) */
  const cuerpo = new THREE.Mesh(geo, [
    mate(THREE, '#ffffff', { map: texCorteZapallo(THREE) }),
    mate(THREE, COLORES.pulpa_canto),
  ]);
  /* la extrusión va en +Z: acostada, +Z pasa a ser arriba y el arco
     de la forma (+Y) pasa a -Z, al fondo */
  cuerpo.rotation.x = -Math.PI / 2;
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);

  /* la pared de cáscara por el arco, vista de canto */
  const pared = new THREE.Mesh(
    new THREE.CylinderGeometry(r + 0.006, r + 0.006, h, 40, 1, true, 0, Math.PI),
    mate(THREE, COMIDA.zapallo_cascara, { side: THREE.DoubleSide })
  );
  pared.rotation.y = Math.PI / 2;
  pared.position.y = h / 2;
  pared.name = 'pared';
  pared.userData.ignorar = true;
  g.add(pared);

  /* la cáscara vista desde arriba, en tramos que se pelan uno a uno */
  const K = SEGMENTOS_CASCARA;
  for (let k = 0; k < K; k++) {
    const seg = new THREE.Mesh(
      new THREE.RingGeometry(r - CASCARA, r + 0.006, 6, 1, k * Math.PI / K, Math.PI / K),
      mate(THREE, COMIDA.zapallo_cascara)
    );
    seg.rotation.x = -Math.PI / 2;
    seg.position.y = h + 0.003;
    seg.name = 'cascara' + k;
    seg.userData = { tipo: 'cascara', k, ignorar: true };
    g.add(seg);
  }

  /* el hueco de las pepas, al centro de la orilla recta */
  /* pintado y no plano: un labio iluminado, la sombra de la cavidad
     justo debajo, y las hebras. Era un medio disco de un solo naranja
     y no se leía como hueco: se raspaba algo que no se veía. */
  const hueco = new THREE.Mesh(
    new THREE.CircleGeometry(r * HUECO, 24, 0, Math.PI),
    mate(THREE, '#ffffff', { map: texHueco(THREE, true) })
  );
  hueco.rotation.x = -Math.PI / 2;
  hueco.position.y = h + 0.002;
  hueco.name = 'hueco';
  hueco.userData.ignorar = true;
  g.add(hueco);

  return g;
});

/* el pedazo de pulpa que se va con un raspón hondo o con una cáscara
   gruesa: es lo que el nivel castiga, así que tiene que verse irse.
   LA FORMA VA EN LA GEOMETRÍA y la malla queda en escala uniforme:
   iba en scale (1.4, 0.6, 1) y volarA() termina el vuelo con
   setScalar(escalaBase), que la inflaba en el último tramo. Es un
   taco cortado y no un bollo: caja soldada (sin soldar, abollar abre
   grietas en las aristas, porque cada cara empuja por su normal), con
   la arista de cáscara tostada. Mide lo que medía: 0.21 × 0.09 × 0.15. */
registrar('trozo-pulpa', (THREE, opts = {}) => {
  const geo = forma('trozo-pulpa', () => {
    let b = new THREE.BoxGeometry(0.21, 0.09, 0.15, 3, 2, 2);
    b.deleteAttribute('normal'); b.deleteAttribute('uv');
    b = mergeVertices(b);
    abollar(b, { fuerza: 0.006, escala: 30, semilla: 73 });
    const piel = new THREE.Color(COMIDA.zapallo_cascara);
    const claro = new THREE.Color(COLORES.pulpa_centro), subido = new THREE.Color(COLORES.pulpa_orilla);
    return pintar(THREE, b, (c, i, x, y, z) => {
      if (y > 0.03 && z > 0.05) c.copy(piel);
      else c.copy(claro).lerp(subido, sstep(-0.075, 0.075, z));
    });
  });
  const m = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  m.scale.setScalar((opts.tam || 0.075) / 0.075);
  m.name = 'trozo-pulpa';
  return m;
});

/* ---------- la hebra que envuelve las pepas ----------
   Hebras de verdad, no un bollo de papel arrugado: seis tubos finos
   ondulados, unidos en una sola geometría (una llamada de dibujo).
   La proporción va en los PUNTOS de la curva y el grosor en unidades
   de mundo: escalar el tubo después lo aplastaba a un píxel que
   parpadeaba. El nivel la agranda ×1.6 de forma uniforme. */
registrar('fibra-zapallo', (THREE, opts = {}) => {
  const geo = formaVariada('fibra-zapallo', 3, opts.variante || 0, (k) => {
    const s = 0.06 + 0.012 * k;
    const tubos = [];
    for (let j = 0; j < 6; j++) {
      const pts = [];
      for (let q = 0; q <= 5; q++) {
        const t = q / 5;
        pts.push(new THREE.Vector3((t - 0.5) * 1.6 * s,
          (0.12 + 0.12 * Math.sin(3 * t + j + k)) * 0.5 * s,
          (0.25 * Math.sin(5 * t + 2 * j + k) + (j - 2.5) * 0.12) * s));
      }
      tubos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.0035, 3, false));
    }
    return mergeGeometries(tubos);
  });
  const m = new THREE.Mesh(geo, brillante(THREE, COLORES.fibra));
  m.name = 'fibra';
  return m;
});
