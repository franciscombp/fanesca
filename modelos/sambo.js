/* ============================================================
   FANESCA — modelos/sambo.js
   La media de sambo que se ralla y el rallador.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     media-sambo → 'pulpa' (la cara cortada, se va gastando)
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, forma, formaVariada } from './organico.js';
import { pintar, lienzo, sstep, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  sambo_piel: '#5f8f45',          /* el verde de la cáscara, de verdad */
  sambo_piel_oscura: '#41703a',
  sambo_veta: '#e4edc6',          /* las vetas crema que la recorren */
  sambo_corteza: '#3d6a2c',       /* la corteza vista de canto en el corte */
  sambo_bajo_corteza: '#b9d293',  /* la franja verdosa bajo la corteza */
  sambo_canto: '#eef3d6',         /* el canto de la pulpa */
  sambo_placenta: '#efe3b8',      /* la tripa fibrosa del centro */
  hebra_punta: '#a9c98a',
  hebra: '#f6efd4',
  hojalata_hueco: '#2f2b27',
};

/* ---------- EL SAMBO: la media y el rallador ---------- */

/* LA CARA DE CORTE, pintada: es lo único del sambo que se ve de
   verdad (la piel queda casi toda bajo la tabla). Era un disco blanco
   con cinco bolitas encima —un plato con galletas—; un sambo partido
   se reconoce por la corteza verde fina, la franja verdosa debajo, la
   pulpa casi blanca con venitas y la placenta fibrosa al centro con
   las pepas amontonadas. Amontonadas y no en flor: un anillo regular
   de pepas se leía como pepino. */
function texCorteSambo(THREE) {
  return lienzo(THREE, 'corteSambo', 512, (x, S) => {
    const R = S / 2, az = azarCon(7);
    const g = x.createRadialGradient(R, R, 0, R, R, R);
    g.addColorStop(0, COLORES.sambo_placenta); g.addColorStop(0.3, '#f1e8c8');
    g.addColorStop(0.42, '#f8f4e4'); g.addColorStop(0.84, '#f5f4e2'); g.addColorStop(0.88, '#dfe9c4');
    g.addColorStop(0.915, COLORES.sambo_bajo_corteza); g.addColorStop(0.935, '#4f7f37'); g.addColorStop(1, COLORES.sambo_corteza);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    /* motas crema en la corteza: el sambo es pintón, no liso */
    for (let i = 0; i < 70; i++) {
      const a = az() * Math.PI * 2, rr = R * (0.95 + az() * 0.04);
      x.fillStyle = `rgba(228,237,198,${0.35 + az() * 0.3})`;
      x.beginPath(); x.ellipse(R + Math.cos(a) * rr, R + Math.sin(a) * rr, 3 + az() * 4, 1.5 + az() * 1.5, a, 0, Math.PI * 2); x.fill();
    }
    /* venitas radiales, tenues y desordenadas */
    x.globalAlpha = 0.06; x.strokeStyle = '#b8c99a'; x.lineWidth = 2;
    for (let i = 0; i < 100; i++) {
      const a = az() * Math.PI * 2, r0 = R * (0.4 + az() * 0.08), r1 = R * (0.78 + az() * 0.1);
      x.beginPath(); x.moveTo(R + Math.cos(a) * r0, R + Math.sin(a) * r0);
      x.lineTo(R + Math.cos(a + (az() - 0.5) * 0.1) * r1, R + Math.sin(a + (az() - 0.5) * 0.1) * r1); x.stroke();
    }
    x.globalAlpha = 1;
    /* la placenta: hebras que salen del centro */
    x.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
      const a = az() * Math.PI * 2, r1 = R * (0.26 + az() * 0.12);
      x.strokeStyle = `rgba(214,196,140,${0.3 + az() * 0.3})`; x.lineWidth = 1.5 + az() * 2;
      x.beginPath(); x.moveTo(R + (az() - 0.5) * 16, R + (az() - 0.5) * 16);
      x.quadraticCurveTo(R + Math.cos(a + 0.5) * r1 * 0.5, R + Math.sin(a + 0.5) * r1 * 0.5, R + Math.cos(a) * r1, R + Math.sin(a) * r1);
      x.stroke();
    }
    /* las pepas, en racimo irregular dentro del hueco (~0.36R),
       algunas encimadas */
    for (let i = 0; i < 13; i++) {
      const a = az() * Math.PI * 2, rr = R * Math.sqrt(az()) * 0.27;
      x.save(); x.translate(R + Math.cos(a) * rr, R + Math.sin(a) * rr); x.rotate(a + (az() - 0.5) * 1.2);
      x.fillStyle = 'rgba(80,60,30,.18)'; x.beginPath(); x.ellipse(2, 3, 21, 10, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#efe2b6'; x.strokeStyle = '#a88c55'; x.lineWidth = 3;
      x.beginPath(); x.ellipse(0, 0, 18 + az() * 6, 9 + az() * 3, 0, 0, Math.PI * 2); x.fill(); x.stroke();
      x.restore();
    }
  }, { anisotropia: 4 });
}

registrar('media-sambo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'media-sambo';
  /* la media luna: media esfera con la piel veteada del sambo. Casi
     toda queda bajo la tabla (asoma una banda de dedo de ancho), así
     que va barata: pocos segmentos y las vetas en el color de vértice,
     en vez de seis toros pegados encima (seis llamadas de dibujo). */
  const geoP = forma('sambo-piel-v2', () => {
    const s = abollar(new THREE.SphereGeometry(1, 32, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { fuerza: 0.04, escala: 2 });
    const verde = new THREE.Color(COLORES.sambo_piel), oscuro = new THREE.Color(COLORES.sambo_piel_oscura);
    const crema = new THREE.Color(COLORES.sambo_veta);
    return pintar(THREE, s, (c, i, x, y, z) => {
      const phi = Math.atan2(x, z);
      const veta = sstep(0.55, 0.92, Math.cos(phi * 10 + 0.8 * Math.sin(y * 6 + phi * 2)));
      const mota = 0.5 + 0.5 * Math.sin(x * 13 + z * 7) * Math.sin(y * 11 - x * 5);
      c.copy(verde).lerp(oscuro, 0.5 * mota).lerp(crema, 0.8 * veta);
    });
  });
  const piel = new THREE.Mesh(geoP, mate(THREE, '#ffffff', { vertexColors: true }));
  piel.scale.set(0.42, 0.3, 0.42);
  piel.name = 'piel';
  /* la cara cortada, mirando arriba: la pulpa que se ralla. Las pepas
     van pintadas en ella (eran cinco mallas más). */
  const pulpa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.405, 0.045, 48), [
    mate(THREE, COLORES.sambo_canto),
    brillante(THREE, '#ffffff', { map: texCorteSambo(THREE) }),
    mate(THREE, '#ffffff', { map: texCorteSambo(THREE) }),
  ]);
  pulpa.position.y = 0.01;
  pulpa.name = 'pulpa';
  g.add(piel, pulpa);
  return g;
});

/* LA PLANCHA DE HOJALATA: punzada a clavo, con la rebaba levantada
   alrededor de cada hueco — así son los ralladores de mercado. Eran
   cuarenta conitos (cuarenta llamadas de dibujo) que se leían como
   chinches en un corcho; pintados en la textura, con su relieve en el
   bumpMap, se leen como lata y cuestan una sola. */
function texHojalata(THREE) {
  return lienzo(THREE, 'hojalata', [256, 512], (y, W, H) => {
    const az = azarCon(11);
    /* la luz entra por la izquierda y la plancha se curva: un brillo
       ancho y no un gris parejo */
    const gl = y.createLinearGradient(0, 0, W, 0);
    gl.addColorStop(0, '#a9a69f'); gl.addColorStop(0.28, '#e2e0da'); gl.addColorStop(0.42, '#c3c0b8'); gl.addColorStop(1, '#9d9a92');
    y.fillStyle = gl; y.fillRect(0, 0, W, H);
    y.globalAlpha = 0.05; y.fillStyle = '#000';
    for (let i = 0; i < 220; i++) y.fillRect(0, az() * H, W, 1);
    y.globalAlpha = 1;
    for (let f = 0; f < 22; f++) for (let k = 0; k < 10; k++) {
      const cx = 14 + k * 23.5 + (f % 2 ? 11 : 0), cy = 14 + f * 22.5;
      if (cx > W - 8) continue;
      y.fillStyle = 'rgba(255,255,255,.75)'; y.beginPath(); y.ellipse(cx, cy - 3, 7, 4, 0, Math.PI, 0); y.fill();
      y.fillStyle = COLORES.hojalata_hueco; y.beginPath(); y.ellipse(cx, cy, 5.5, 3.2, 0, 0, Math.PI * 2); y.fill();
      y.fillStyle = 'rgba(40,30,20,.25)'; y.beginPath(); y.ellipse(cx, cy + 5, 6, 2.5, 0, 0, Math.PI * 2); y.fill();
    }
  }, { anisotropia: 4 });
}

registrar('rallador', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'rallador';
  /* el marco de madera, con la plancha encima */
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 1.5), mate(THREE, COMIDA.rallador_marco));
  /* la plancha, arqueada a lo ancho como las de lata: el tope queda
     en 0.075, bajo la pulpa en la mano (que empieza más arriba) */
  const geoP = forma('plancha-rallador', () => {
    const p = new THREE.PlaneGeometry(0.74, 1.3, 8, 1);
    p.rotateX(-Math.PI / 2);
    const pos = p.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = 2 * pos.getX(i) / 0.74;
      pos.setY(i, 0.035 + 0.04 * (1 - u * u));
    }
    p.computeVertexNormals();
    return p;
  });
  const tx = texHojalata(THREE);
  /* el metal sí lleva especular: es lo único de la mesa que no es comida */
  const plancha = new THREE.Mesh(geoP, new THREE.MeshPhongMaterial({
    map: tx, bumpMap: tx, bumpScale: 1.5, shininess: 40, specular: '#6e6a62', side: THREE.DoubleSide }));
  marco.userData.ignorar = true; plancha.userData.ignorar = true;
  g.add(marco, plancha);
  return g;
});

/* la hebra rallada: un fideo ondulado de pulpa con la puntita verde
   de la corteza. Va a lo largo de X y se gira solo un poco en z: con
   el giro de π/2 de la cápsula de antes quedaba PARADA, y también el
   ícono del sambo en el caldero. */
registrar('hebra-sambo', (THREE, opts = {}) => {
  const k0 = opts.variante != null ? opts.variante : (Math.random() * 4) | 0;
  const geo = formaVariada('hebra-sambo', 4, k0, (k) => {
    const pts = [];
    for (let q = 0; q <= 6; q++) {
      const t = q / 6;
      pts.push(new THREE.Vector3((t - 0.5) * 0.19, 0.012 * Math.sin(t * 7 + k * 1.7), 0.018 * Math.sin(t * 5 + k)));
    }
    const tubo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.011, 4, false);
    const cuerpo = new THREE.Color(COLORES.hebra), punta = new THREE.Color(COLORES.hebra_punta);
    return pintar(THREE, tubo, (c, i, x) => c.copy(cuerpo).lerp(punta, sstep(0.06, 0.095, x)));
  });
  const h = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  h.rotation.z = (Math.random() - 0.5) * 0.8;
  h.name = 'hebra-sambo';
  return h;
});
