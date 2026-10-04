/* ============================================================
   FANESCA — modelos/queso.js
   El queso fresco, sus migas y la jarra de leche.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     bloque-queso → 'bloque', 'hoja' (la hoja de plátano de abajo; el
                    nivel la pasa a la tabla para que no encoja)
     jarra-leche  → 'cuerpo', 'leche', 'asa' (el chorro se anima
                    desde el nivel)

   El bloque tiene el ORIGEN EN LA BASE: el nivel lo encoge en y al
   desmigar, y con el origen al centro la base subía y el queso
   quedaba flotando a la sexta miga.
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, forma, formaVariada } from './organico.js';
import { pintar, lienzo, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  /* el queso fresco: crema frío, no blanco puro (ACES lo quemaba y la
     cara de arriba se volvía un plano sin detalle) */
  queso_bloque: '#f1ead6',
  queso_brillo: '#3e3a30',
  /* la hoja de plátano del queso de hoja */
  hoja_platano_oscura: '#4f7f2e',
  hoja_platano_clara: '#79a948',
  /* la jarra de peltre: el mismo esmalte que la tina, con filo azul */
  peltre_brillo: '#4a4a46',
};

/* ---------- LAS TEXTURAS (una por sesión, con lienzo) ---------- */

/* la cuajada: granito fino y ojitos chicos y FRÍOS. En el prototipo
   los ojos eran grandes y cafés y el queso se leía tortilla */
function texturaQueso(THREE) {
  return lienzo(THREE, 'queso-cuajada', 256, (x, S) => {
    const r = azarCon(5);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      x.fillStyle = `rgba(205,190,155,${0.12 + r() * 0.18})`;
      x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
    }
    for (let i = 0; i < 140; i++) {
      const cx = r() * S, cy = r() * S, R = 1.2 + r() * r() * 3.5;
      x.fillStyle = 'rgba(178,165,135,.45)';
      x.beginPath(); x.ellipse(cx, cy, R * (1 + r() * 0.6), R, r() * 3, 0, 7); x.fill();
      x.fillStyle = 'rgba(140,125,95,.3)';
      x.beginPath(); x.ellipse(cx, cy - R * 0.25, R * 0.6, R * 0.5, 0, 0, 7); x.fill();
      /* el labio de luz del ojito: lo que lo hace hueco y no mancha */
      x.fillStyle = 'rgba(255,255,255,.75)';
      x.beginPath(); x.ellipse(cx, cy + R * 0.75, R * 0.9, R * 0.3, 0, 0, Math.PI); x.fill();
    }
  }, { repetir: true });
}

/* la hoja de plátano: recortada en óvalo con el borde rasgado (el
   alfa lo corta), nervadura clara y venas a ±40° */
function texturaHoja(THREE) {
  return lienzo(THREE, 'queso-hoja', 256, (x, S) => {
    x.save(); x.beginPath();
    for (let i = 0; i <= 120; i++) {
      const a = i / 120 * Math.PI * 2;
      const k = 1 + 0.03 * Math.sin(a * 11) + 0.02 * Math.sin(a * 29);
      const px = S / 2 + Math.cos(a) * S * 0.49 * k, py = S / 2 + Math.sin(a) * S * 0.36 * k;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath(); x.clip();
    const g = x.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, COLORES.hoja_platano_oscura); g.addColorStop(0.5, COLORES.hoja_platano_clara);
    g.addColorStop(1, COLORES.hoja_platano_oscura);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.strokeStyle = 'rgba(225,240,190,.35)'; x.lineWidth = 1.2;
    for (let k = -16; k <= 16; k++) {
      const x0 = S / 2 + k * 9;
      x.beginPath(); x.moveTo(x0, S / 2); x.lineTo(x0 + 40, 0);
      x.moveTo(x0, S / 2); x.lineTo(x0 + 40, S); x.stroke();
    }
    x.strokeStyle = 'rgba(235,245,205,.8)'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(0, S / 2); x.lineTo(S, S / 2); x.stroke();
    x.restore();
  });
}

/* ---------- EL QUESO Y LA LECHE ---------- */

registrar('bloque-queso', (THREE) => {
  const g = new THREE.Group();
  g.name = 'bloque-queso';
  /* un torno con el hombro redondeado: el cilindro de 18 caras se
     veía facetado en la silueta y con el toro encima se leía tapa de
     balde. Radio 0.545 (el toque mide 0.75 desde el centro) y alto
     ≈0.4, como antes. */
  const geo = forma('queso-bloque-torno', () => {
    const perfil = [[0, 0], [0.47, 0], [0.515, 0.012], [0.535, 0.04], [0.545, 0.12], [0.545, 0.24],
      [0.535, 0.32], [0.515, 0.365], [0.48, 0.39], [0.43, 0.40], [0.25, 0.405], [0, 0.405]]
      .map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.LatheGeometry(perfil, 40);
    /* la costura del torno (phi = 0) mira a +z, a la cámara: se gira
       media vuelta ANTES de abollar para que quede atrás */
    t.rotateY(Math.PI);
    /* UV antes de abollar, con la u propia del torno: repetición
       entera (×3) y sin el salto de atan2 */
    const pos = t.attributes.position, uv = t.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0.375) uv.setXY(i, pos.getX(i) * 0.9 + 0.5, pos.getZ(i) * 0.9 + 0.5);
      else uv.setXY(i, uv.getX(i) * 3, y * 0.9 + 0.3);
    }
    return abollar(t, { fuerza: 0.012, escala: 5, semilla: 3 });
  });
  /* húmedo sin verse plástico: shininess bajo y specular oscuro */
  const bloque = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    map: texturaQueso(THREE), color: COLORES.queso_bloque, shininess: 14, specular: COLORES.queso_brillo,
  }));
  bloque.name = 'bloque';

  /* LA HOJA: queso de hoja de mercado. alphaTest SIN transparent: así
     sigue siendo opaca para el motor y RECIBE la sombra del sol del
     queso (una transparente quedaba fuera y la sombra desaparecía
     justo encima). No proyecta: es una lámina pegada a la tabla. */
  const geoHoja = forma('queso-hoja', () => {
    const h = new THREE.PlaneGeometry(1.75, 1.75, 10, 10);
    const p = h.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const d = Math.max(0, Math.hypot(p.getX(i) / 0.86, p.getY(i) / 0.63) - 0.62);
      p.setZ(i, d * d * 0.18);   /* los bordes se curvan hacia arriba */
    }
    h.computeVertexNormals();
    return h;
  });
  const hoja = new THREE.Mesh(geoHoja, new THREE.MeshLambertMaterial({
    map: texturaHoja(THREE), alphaTest: 0.5, side: THREE.DoubleSide,
  }));
  hoja.rotation.set(-Math.PI / 2, 0, 0.35);
  hoja.position.y = -0.001;
  hoja.name = 'hoja';
  hoja.userData.sombra = false;

  g.add(bloque, hoja);
  return g;
});

registrar('miga-queso', (THREE, opts = {}) => {
  const geo = formaVariada('queso-miga', 5, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 9, 7), { fuerza: 0.2, escala: 1.8, semilla: k + 11 }));
  /* a 0.07 la cuajada no se ve: basta el color del bloque */
  const m = new THREE.Mesh(geo, mate(THREE, COLORES.queso_bloque));
  m.scale.setScalar(0.07 + (opts.variante % 3) * 0.012);
  m.name = 'miga-queso';
  return m;
});

registrar('jarra-leche', (THREE) => {
  const g = new THREE.Group();
  g.name = 'jarra-leche';
  /* JARRA DE PELTRE ABIERTA. El cilindro cerrado de barro tapaba la
     leche con su tapa: se leía maceta vacía. Torno con pared (sube
     por fuera, baja por dentro) y el pico en +x. */
  const geo = forma('jarra-peltre', () => {
    const perfil = [[0, -0.21], [0.15, -0.21], [0.17, -0.19], [0.2, -0.08], [0.205, 0.02], [0.18, 0.12],
      [0.165, 0.17], [0.175, 0.2], [0.185, 0.215], [0.175, 0.222], [0.155, 0.2], [0.15, 0.1],
      [0.17, 0], [0.16, -0.18], [0, -0.18]].map(([r, y]) => new THREE.Vector2(r, y));
    const t = new THREE.LatheGeometry(perfil, 28);
    /* el pico: los vértices de arriba que miran a +x se estiran y se
       levantan, en coseno² para que no salga un diente */
    const pos = t.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const a = Math.atan2(z, x);
      if (y <= 0.15 || Math.abs(a) >= 0.5) continue;
      const f = Math.pow(Math.cos(a / 0.5 * Math.PI / 2), 2);
      const r = Math.hypot(x, z), r2 = r + 0.06 * f;
      pos.setXYZ(i, x / r * r2, y + 0.02 * f, z / r * r2);
    }
    t.computeVertexNormals();
    /* el filo azul, la firma del peltre, por color de vértice: sin
       una malla más */
    const filo = new THREE.Color(COMIDA.peltre_filo);
    return pintar(THREE, t, (c, i, x, y) => { if (y > 0.205) c.copy(filo); });
  });
  const matPeltre = new THREE.MeshPhongMaterial({
    color: COMIDA.peltre, vertexColors: true, shininess: 30, specular: COLORES.peltre_brillo,
    side: THREE.DoubleSide,
  });
  const cuerpo = new THREE.Mesh(geo, matPeltre);
  cuerpo.name = 'cuerpo';
  /* la leche, ahora a la vista dentro de la boca */
  const leche = new THREE.Mesh(new THREE.CircleGeometry(0.152, 24), mate(THREE, COMIDA.leche));
  leche.rotation.x = -Math.PI / 2;
  leche.position.y = 0.17;
  leche.name = 'leche';
  /* el asa del lado CONTRARIO al pico: el nivel vuelca la jarra con
     rotation.z negativo, que baja +x; con el asa en +x vertía por
     encima de su propia asa */
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 6, 12, Math.PI),
    new THREE.MeshPhongMaterial({ color: COMIDA.peltre, shininess: 30, specular: COLORES.peltre_brillo }));
  asa.position.set(-0.2, 0.03, 0);
  asa.rotation.z = Math.PI / 2;
  asa.name = 'asa';
  asa.userData.ignorar = true;
  g.add(cuerpo, leche, asa);
  return g;
});
