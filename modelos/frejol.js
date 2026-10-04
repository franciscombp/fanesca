/* ============================================================
   FANESCA — modelos/frejol.js
   La vaina moteada que truena, y el grano vino de adentro.

   El fréjol tierno no se abre con delicadeza: se aprieta hasta
   que revienta. Por eso la vaina se dibuja hinchable —el nivel le
   sube la escala mientras la aprietas— y las motas son parte del
   cuerpo, no un detalle: son lo que la distingue de la vaina de
   habas de un vistazo.

   PARTES NOMBRADAS (para que un .glb encaje)
     vaina-frejol → 'cuerpo', mota0…motaN, bulto0…bultoN
     grano-frejol → 'cuerpo', 'raya'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, curvar, formaVariada, forma } from './organico.js';
import { lienzo, azarCon } from './pintura.js';

export const POR_VAINA = 6;
export const PASO_GRANO = 0.128;

/* LAS VETAS DEL FRÉJOL TIERNO, PINTADAS EN LA PIEL. Eran esferas vino
   pegadas encima que asomaban como ampollas o cerezas, y la vaina se
   leía como un pan con cerezas. Aquí son llamas finas a lo largo, más
   cargadas hacia las puntas, como en la vaina de verdad. Las llamas se
   dibujan también desplazadas un ancho a cada lado, para que la costura
   de la textura alrededor de la vaina no se note.

   Llamas angostas (rx ≤ 5): más anchas se leen como piel de vaca. */
function texturaVainaFrejol(THREE) {
  return lienzo(THREE, 'vaina-frejol', [128, 256], (ctx, W, H) => {
    const rnd = azarCon(23);
    ctx.fillStyle = COMIDA.vaina_frejol;
    ctx.fillRect(0, 0, W, H);
    const punta = (y0, y1, a0, a1) => {
      const gr = ctx.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, `rgba(150,40,80,${a0})`); gr.addColorStop(1, `rgba(150,40,80,${a1})`);
      ctx.fillStyle = gr; ctx.fillRect(0, y0, W, y1 - y0);
    };
    punta(0, H * 0.18, 0.35, 0);
    punta(H * 0.82, H, 0, 0.35);
    const vetas = COMIDA.frejol_veta;
    /* el crema tiene que mandar: con más llamas la vaina salía roja */
    for (let i = 0; i < 64; i++) {
      const x = rnd() * W, y = rnd() * H;
      const rx = 1.2 + rnd() * 2.8, ry = 10 + rnd() * 26, giro = (rnd() - 0.5) * 0.5;
      ctx.globalAlpha = 0.45 + rnd() * 0.3;
      ctx.fillStyle = vetas[i % vetas.length];
      for (const dx of [-W, 0, W]) {
        ctx.beginPath(); ctx.ellipse(x + dx, y, rx, ry, giro, 0, Math.PI * 2); ctx.fill();
      }
    }
    for (let i = 0; i < 60; i++) {
      const x = rnd() * W, y = rnd() * H, r = 0.8 + rnd() * 1.6;
      ctx.globalAlpha = 0.5 + rnd() * 0.4;
      ctx.fillStyle = vetas[i % vetas.length];
      for (const dx of [-W, 0, W]) { ctx.beginPath(); ctx.arc(x + dx, y, r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }, { repetir: true });
}

/* el marmoleado del grano: vino con manchas oscuras y claras */
function texturaGranoFrejol(THREE) {
  return lienzo(THREE, 'grano-frejol', 64, (ctx, W, H) => {
    const rnd = azarCon(31);
    ctx.fillStyle = COMIDA.frejol;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W, y = rnd() * H, rx = 2 + rnd() * 5, ry = 1 + rnd() * 2.5, a = rnd() * Math.PI;
      ctx.fillStyle = i % 3 === 2 ? 'rgba(236,178,186,.55)' : 'rgba(128,36,66,.75)';
      for (const dx of [-W, 0, W]) { ctx.beginPath(); ctx.ellipse(x + dx, y, rx, ry, a, 0, Math.PI * 2); ctx.fill(); }
    }
  }, { repetir: true });
}

registrar('vaina-frejol', (THREE) => {
  const v = new THREE.Group();
  v.name = 'vaina';

  /* LA VAINA SE ARQUEA ENTERA Y SE MARCA EN CADA GRANO. La cápsula
     tenía un solo segmento de alto: curvar y abollar solo movían las
     tapas, y el tramo largo quedaba recto y liso —una salchicha—.
     Con dieciocho anillos se arquea de verdad, y entre grano y grano
     se estrecha un cuello. Aplanada: la vaina de fréjol es más ancha
     que alta. El arco va hacia Z porque el cuerpo se gira 90° para
     acostarse (arqueada en X quedaría invisible desde la mesa). */
  const geoC = forma('vaina-frejol-cuerpo2', () => {
    const g = new THREE.CapsuleGeometry(0.1, 0.62, 8, 20, 18);
    g.scale(0.8, 1, 1);
    g.computeVertexNormals();
    const pos = g.attributes.position, nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const d = 0.02 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (y - PASO_GRANO / 2) / PASO_GRANO)) *
        Math.max(0, 1 - Math.pow(Math.abs(y) / 0.36, 6));
      pos.setXYZ(i, pos.getX(i) + nor.getX(i) * d, y + nor.getY(i) * d, pos.getZ(i) + nor.getZ(i) * d);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    abollar(g, { fuerza: 0.01, escala: 5.5, semilla: 4 });
    return curvar(g, { eje: 'y', hacia: 'z', k: 0.55 });
  });
  const cuerpo = new THREE.Mesh(geoC, mate(THREE, '#ffffff', { map: texturaVainaFrejol(THREE) }));
  cuerpo.rotation.z = Math.PI / 2;
  cuerpo.name = 'cuerpo';
  v.add(cuerpo);

  /* motas y bultos ya son parte de la piel y de la forma: quedan como
     marcas vacías con sus nombres de siempre (los .glb y el editor los
     conocen). Eran quince mallas por vaina; ahora son tres. */
  for (let i = 0; i < 8; i++) { const m = new THREE.Object3D(); m.name = 'mota' + i; v.add(m); }
  for (let i = 0; i < POR_VAINA; i++) {
    const b = new THREE.Object3D();
    b.position.set((i - (POR_VAINA - 1) / 2) * PASO_GRANO, 0.082, 0);
    b.name = 'bulto' + i;
    v.add(b);
  }

  /* el rabito, en la punta del arco */
  const rabo = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.016, 0.09, 6), mate(THREE, COMIDA.rabo_frejol));
  rabo.rotation.z = Math.PI / 2.3;
  rabo.position.set(-0.44, 0.03, 0.09);
  rabo.name = 'rabo';
  rabo.userData.ignorar = true;
  v.add(rabo);

  return v;
});

/* EL GRANO: arriñonado, marmoleado de vino, con su ojito crema en el
   lado hundido. Era una piedrita roja facetada con un ladrillo encima.
   La escala del cuerpo no cambia: el gorgojo es la trampa «del mismo
   tamaño». */
registrar('grano-frejol', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'grano';
  const geo = formaVariada('grano-frejol2', 4, opts.variante || 0, (k) =>
    curvar(
      abollar(new THREE.SphereGeometry(1, 16, 12), { fuerza: 0.05, escala: 2.1, semilla: k + 11 }),
      { eje: 'x', hacia: 'z', k: 0.2 },
    ));
  const cuerpo = new THREE.Mesh(geo, brillante(THREE, '#ffffff',
    { map: texturaGranoFrejol(THREE), shininess: 14, specular: '#3a2a2a' }));
  cuerpo.scale.set(0.062, 0.05, 0.052);
  cuerpo.name = 'cuerpo';
  const raya = new THREE.Mesh(forma('ojo-frejol', () => new THREE.SphereGeometry(1, 8, 6)), mate(THREE, COMIDA.frejol_ojo));
  raya.scale.set(0.014, 0.006, 0.006);
  raya.position.set(0, 0.012, 0.05);
  raya.name = 'raya';
  raya.userData.ignorar = true;
  g.add(cuerpo, raya);
  return g;
});
