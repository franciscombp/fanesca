/* ============================================================
   FANESCA — modelos/guarnicion.js
   La guarnición: sartén, maduro, empanadita, ají y el plato servido.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     sarten        → 'fondo', 'aceite', 'mango', 'virola'
     maduro        → 'tajada' (el PRIMER hijo con material: el nivel
                     le cambia .color al dorarse)
     empanadita    → 'cuerpo', 'repulgue'
     aji-cuenco    → el cuenco + 'salsa'
     plato-fanesca → 'hondo', 'crema', 'granos'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, curvar, forma, formaVariada } from './organico.js';
import { pintar, lienzo, azarCon } from './pintura.js';
import { sombraBlob } from './utileria.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  /* la sartén de hierro: casi negra, con un brillo frío de metal
     (Phong local; nada de mapa de entorno, que no cabe en un teléfono) */
  sarten_hierro: '#3b3733',
  sarten_brillo: '#8a847a',
  sarten_virola: '#8d8a84',
  aceite: '#c9962e',
  aceite_brillo: '#fff0c0',
  /* el maduro: brillo de caramelo, oscuro y cálido */
  maduro_brillo: '#4a3820',
  /* la empanadita de viento: masa dorada y el repulgue más tostado */
  empanadita_masa: '#e9b866',
  empanadita_repulgue: '#dba352',
  /* el plato de peltre */
  peltre_brillo: '#4a4a46',
  /* la crema de la fanesca, del centro al filo */
  crema_centro: '#f0cf73',
  crema_media: '#e2b452',
  crema_filo: '#c99540',
  perejil: '#4f8a2b',
  perejil_claro: '#6aa23a',
  culantro: '#3f7f2a',
  tomate_arbol: '#f07a3a',
};

/* uv plana desde arriba: sirve para las dos caras de lo que se voltea */
function uvPlano(geo, sx = 1, sz = 1) {
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 * sx + 0.5, p.getZ(i) * 0.5 * sz + 0.5);
  uv.needsUpdate = true;
  return geo;
}

/* ---------- LAS TEXTURAS (una por sesión, con lienzo) ---------- */

/* LA CREMA DE LA FANESCA. Clave 'crema-fanesca' a propósito: la olla
   grande del fondo puede pedir la misma y no cuesta otra. */
function texturaCrema(THREE) {
  return lienzo(THREE, 'crema-fanesca', 256, (x, S) => {
    const r = azarCon(17);
    const g = x.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
    g.addColorStop(0, COLORES.crema_centro); g.addColorStop(0.75, COLORES.crema_media); g.addColorStop(1, COLORES.crema_filo);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    /* lo verde de las habas y arvejas deshechas en el caldo */
    for (let i = 0; i < 26; i++) {
      x.fillStyle = `rgba(140,165,70,${0.08 + r() * 0.1})`;
      x.beginPath(); x.arc(r() * S, r() * S, 8 + r() * 22, 0, 7); x.fill();
    }
    /* la espiral de leche que deja el cucharón */
    x.strokeStyle = 'rgba(255,248,225,.55)'; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath();
    for (let t = 0; t < 9.5; t += 0.05) {
      const rr = 6 + t * 10, a = t * 1.15;
      const px = S / 2 + Math.cos(a) * rr, py = S / 2 + Math.sin(a) * rr * 0.9;
      t ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
    for (let i = 0; i < 70; i++) {
      x.save(); x.translate(r() * S, r() * S); x.rotate(r() * 6);
      x.fillStyle = r() < 0.5 ? COLORES.perejil : COLORES.perejil_claro; x.fillRect(-1.5, -3, 3, 6);
      x.restore();
    }
    /* migas de queso */
    for (let i = 0; i < 30; i++) {
      x.fillStyle = 'rgba(255,252,240,.9)';
      x.beginPath(); x.ellipse(r() * S, r() * S, 2 + r() * 3, 1.5 + r() * 2, r() * 3, 0, 7); x.fill();
    }
  });
}

/* la masa de la empanadita: ampollas de la fritura y azúcar */
function texturaEmpanada(THREE) {
  return lienzo(THREE, 'empanadita-masa', 128, (x, S) => {
    const r = azarCon(29);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) {
      const cx = r() * S, cy = r() * S, R = 3 + r() * 6;
      x.fillStyle = 'rgba(170,105,40,.22)'; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,240,205,.5)'; x.beginPath(); x.arc(cx - R * 0.2, cy - R * 0.2, R * 0.6, 0, 7); x.fill();
    }
    for (let i = 0; i < 260; i++) { x.fillStyle = 'rgba(255,255,255,.95)'; x.fillRect(r() * S, r() * S, 1.4, 1.4); }
  });
}

/* el ají de la casa: cebolla, culantro y tomate de árbol picados */
function texturaAji(THREE) {
  return lienzo(THREE, 'aji-picado', 128, (x, S) => {
    const r = azarCon(31);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 30; i++) { x.fillStyle = COLORES.tomate_arbol; x.fillRect(r() * S, r() * S, 3 + r() * 3, 2 + r() * 3); }
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,240,230,.85)'; x.fillRect(r() * S, r() * S, 2.5 + r() * 2, 2.5 + r() * 2); }
    for (let i = 0; i < 40; i++) {
      x.save(); x.translate(r() * S, r() * S); x.rotate(r() * 6);
      x.fillStyle = COLORES.culantro; x.fillRect(-1.5, -3, 3, 6); x.restore();
    }
  });
}

/* ---------- LA GUARNICIÓN: sartén, maduro, empanadita, ají ---------- */

registrar('sarten', (THREE) => {
  const g = new THREE.Group();
  g.name = 'sarten';
  /* UN TORNO con piso, pared abierta y labio: el cilindro con un toro
     encima se leía plato oscuro o llanta. El piso por dentro queda en
     y 0.05 (ahí se apoyan las tajadas) y el radio en ~0.64. */
  const geo = forma('sarten-hierro', () => {
    const perfil = [[0, -0.05], [0.49, -0.05], [0.55, -0.035], [0.59, 0.02], [0.635, 0.105], [0.645, 0.122],
      [0.632, 0.13], [0.6, 0.075], [0.56, 0.058], [0.5, 0.05], [0, 0.05]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.LatheGeometry(perfil, 44);
    /* el centro del piso gastado de tanto uso: un pelo más claro */
    return pintar(THREE, t, (c, i, x, y, z) => {
      const r = Math.hypot(x, z);
      if (y > 0.045 && r < 0.5) c.setScalar(0.82 + 0.16 * (1 - r / 0.5));
    });
  });
  const fondo = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: COLORES.sarten_hierro, specular: COLORES.sarten_brillo, shininess: 26, vertexColors: true,
  }));
  fondo.name = 'fondo';

  /* un velo de aceite: el brillo dorado que dice «está caliente» */
  const aceite = new THREE.Mesh(new THREE.CircleGeometry(0.5, 44), new THREE.MeshPhongMaterial({
    color: COLORES.aceite, transparent: true, opacity: 0.28, shininess: 90,
    specular: COLORES.aceite_brillo, depthWrite: false,
  }));
  aceite.rotation.x = -Math.PI / 2;
  aceite.position.y = 0.053;
  aceite.name = 'aceite';
  aceite.userData.ignorar = true;

  /* EL MANGO APUNTA ATRÁS A LA DERECHA. Hacia +x cruzaba encima de la
     tajada cruda que espera en x 0.72. Va en un pivote para girarlo
     entero (mango y virola) sin recalcular posiciones. */
  const pivote = new THREE.Group();
  pivote.rotation.y = 1.07;
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.7, 8), mate(THREE, COMIDA.sarten_mango));
  mango.rotation.z = Math.PI / 2 - 0.12;
  mango.position.set(0.98, 0.09, 0);
  mango.name = 'mango';
  mango.userData.ignorar = true;
  const virola = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), new THREE.MeshPhongMaterial({
    color: COLORES.sarten_virola, specular: '#ffffff', shininess: 50,
  }));
  virola.rotation.z = Math.PI / 2 - 0.12;
  virola.position.set(0.68, 0.11, 0);
  virola.name = 'virola';
  virola.userData.ignorar = true;
  pivote.add(mango, virola);

  /* la sombra de contacto pegada a la base: sirve sobre la tabla y
     sobre el mesón, donde se retira */
  g.add(fondo, aceite, pivote, sombraBlob(THREE, 1.55, -0.048));
  return g;
});

registrar('maduro', (THREE, opts = {}) => {
  /* EN UN GROUP a propósito: la forma de la tajada vive en la escala
     del mesh (una esfera aplastada), y si el nivel escalara ese mesh
     directamente la borraría — pasó: un setScalar(1.5) convirtió la
     tajada en un globo del tamaño de la pantalla */
  const g = new THREE.Group();
  g.name = 'maduro';
  /* UNA TAJADA AL SESGO, no una tortilla: caras de corte planas, la
     curva del plátano y el canto oscuro (lo caramelizado) pintado por
     vértice. colorDeTajada del nivel multiplica encima, así que crudo,
     dorado y quemado siguen mandando. Sin textura: a ~110 px la fibra
     y las semillas no se ven y en el prototipo la ensuciaban. */
  const geo = formaVariada('maduro-tajada-sesgo', 3, opts.variante || 0, (k) => {
    const s = new THREE.SphereGeometry(1, 24, 12);
    const p = s.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (Math.abs(y) > 0.62) p.setY(i, Math.sign(y) * (0.62 + (Math.abs(y) - 0.62) * 0.25));
    }
    p.needsUpdate = true;
    s.computeVertexNormals();
    curvar(s, { eje: 'x', hacia: 'z', k: 0.22 });
    abollar(s, { fuerza: 0.03, escala: 3, semilla: k + 5 });
    return pintar(THREE, s, (c, i, x, y, z, nx, ny) => {
      const lado = 1 - Math.min(1, Math.abs(ny) * 1.25);
      const v = 1 - 0.45 * lado;
      c.setRGB(v, v * 0.9, v * 0.78);
    });
  });
  const t = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: COMIDA.maduro, vertexColors: true, shininess: 22, specular: COLORES.maduro_brillo,
  }));
  t.scale.set(0.24, 0.05, 0.13);
  t.name = 'tajada';
  g.add(t);
  return g;
});

registrar('empanadita', (THREE) => {
  /* LA EMPANADITA DE VIENTO, CERRADA: media luna inflada con el canto
     recto atrás, base plana y el repulgue trenzado por la curva. La
     media cáscara abierta con un toro parado se leía cartera con asa,
     y en el plato como arcos huecos. */
  const g = new THREE.Group();
  g.name = 'empanadita';
  const geo = forma('empanadita-cuerpo', () => {
    const s = new THREE.SphereGeometry(1, 24, 12);
    const p = s.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i); if (z < 0) p.setZ(i, z * 0.12);
      const y = p.getY(i); if (y < -0.2) p.setY(i, -0.2 + (y + 0.2) * 0.3);
    }
    p.needsUpdate = true;
    s.computeVertexNormals();
    return uvPlano(abollar(s, { fuerza: 0.05, escala: 4, semilla: 9 }));
  });
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COLORES.empanadita_masa, { map: texturaEmpanada(THREE) }));
  cuerpo.scale.set(0.17, 0.085, 0.13);
  cuerpo.position.z = -0.03;
  cuerpo.name = 'cuerpo';
  /* el repulgue: medio toro con el tubo ondulado (18 pellizcos) */
  const geoR = forma('empanadita-repulgue', () => {
    const t = new THREE.TorusGeometry(1, 0.11, 6, 40, Math.PI);
    const tp = t.attributes.position;
    for (let i = 0; i < tp.count; i++) {
      const X = tp.getX(i), Y = tp.getY(i), Z = tp.getZ(i);
      const u = Math.atan2(Y, X);
      const cx = Math.cos(u), cy = Math.sin(u);
      const k = 1 + 0.45 * Math.sin(u * 18);
      tp.setXYZ(i, cx + (X - cx) * k, cy + (Y - cy) * k, Z * k);
    }
    t.computeVertexNormals();
    return t;
  });
  const repulgue = new THREE.Mesh(geoR, mate(THREE, COLORES.empanadita_repulgue));
  repulgue.rotation.x = Math.PI / 2;
  repulgue.scale.set(0.168, 0.128, 0.17);
  repulgue.position.set(0, -0.012, -0.03);
  repulgue.name = 'repulgue';
  repulgue.userData.ignorar = true;
  g.add(cuerpo, repulgue);
  return g;
});

registrar('aji-cuenco', (THREE) => {
  const g = new THREE.Group();
  g.name = 'aji-cuenco';
  const c = pieza('cuenco', THREE, { radio: 0.22 });
  /* con lo picado a la vista: un disco rojo liso no se leía ají */
  const salsa = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.05, 20),
    mate(THREE, COMIDA.aji_salsa, { map: texturaAji(THREE) }));
  salsa.position.y = 0.1;
  salsa.name = 'salsa';
  salsa.userData.ignorar = true;
  g.add(c, salsa);
  return g;
});

/* los granos que asoman en la crema, en el orden de la receta */
const GRANOS = [
  ['haba', 0.05, 0.026, 0.036],
  ['arveja', 0.026, 0.026, 0.026],
  ['choclo', 0.03, 0.02, 0.024],
  ['frejol', 0.036, 0.02, 0.022],
  ['chocho_piel', 0.032, 0.024, 0.03],
  ['mote', 0.038, 0.026, 0.032],
];
const N_GRANOS = 48;

registrar('plato-fanesca', (THREE) => {
  const g = new THREE.Group();
  g.name = 'plato-fanesca';
  /* EL PLATO HONDO DE PELTRE con su filo azul. El cono crema sobre la
     tabla crema se perdía y se leía vacío. El pie (y −0.08) cae en el
     tope de la tabla; la cara de la crema en 0.104, donde el nivel
     posa lo de encima. Radio ≤0.632: las empanaditas esperan en −0.85. */
  const geo = forma('plato-peltre', () => {
    const perfil = [[0, -0.08], [0.3, -0.08], [0.32, -0.068], [0.34, -0.055], [0.45, 0.02], [0.53, 0.085],
      [0.6, 0.1], [0.611, 0.102], [0.62, 0.108], [0.632, 0.118], [0.626, 0.127], [0.612, 0.127],
      [0.6, 0.12], [0.535, 0.106], [0.46, 0.06], [0, 0.03]].map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.LatheGeometry(perfil, 48);
    const filo = new THREE.Color(COMIDA.peltre_filo);
    return pintar(THREE, t, (c, i, x, y, z) => { if (Math.hypot(x, z) > 0.609 && y > 0.1) c.copy(filo); });
  });
  const hondo = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: COMIDA.peltre, vertexColors: true, shininess: 30, specular: COLORES.peltre_brillo,
  }));
  hondo.name = 'hondo';

  const crema = new THREE.Mesh(new THREE.CircleGeometry(0.54, 48), mate(THREE, '#ffffff', { map: texturaCrema(THREE) }));
  crema.rotation.x = -Math.PI / 2;
  crema.position.y = 0.104;
  crema.name = 'crema';

  /* LOS GRANOS en UNA sola malla instanciada (una llamada para 48),
     repartidos en espiral áurea. Sin `ignorar`: así siguen RECIBIENDO
     la sombra del sol de lo que se pone encima; no proyectan. */
  const im = new THREE.InstancedMesh(forma('plato-grano', () => new THREE.SphereGeometry(1, 7, 5)),
    mate(THREE, '#ffffff'), N_GRANOS);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < N_GRANOS; i++) {
    const [tono, sx, sy, sz] = GRANOS[i % GRANOS.length];
    const c = COMIDA[tono === 'choclo' ? 'choclo_tierno' : tono];
    col.set(Array.isArray(c) ? c[0] : c);
    const a = i * 2.39996, r = Math.sqrt((i + 0.5) / N_GRANOS) * 0.47;
    q.setFromEuler(e.set(0, a * 1.7, 0));
    m4.compose(v.set(Math.cos(a) * r, 0.108, Math.sin(a) * r), q, s.set(sx, sy, sz));
    im.setMatrixAt(i, m4);
    im.setColorAt(i, col);
  }
  im.name = 'granos';
  im.userData.sombra = false;

  g.add(hondo, crema, im, sombraBlob(THREE, 1.5, -0.076));
  return g;
});
