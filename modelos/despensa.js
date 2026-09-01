/* ============================================================
   FANESCA — modelos/despensa.js
   Las piezas de los seis que faltaban: sambo, garbanzo, arroz,
   queso y leche, huevo duro y la guarnición.

   Van juntos en un archivo porque llegaron juntos —eran la
   despensa entera— y porque cada uno trae dos o tres piezas
   chicas: partirlos en seis archivos de cuarenta líneas repartía
   la misma media página en seis sitios. Si alguno crece hasta
   merecer archivo propio, se muda con sus piezas y ya.

   PARTES NOMBRADAS (para que un .glb encaje)
     media-sambo   → 'pulpa' (la cara cortada, se va gastando)
     garbanzo      → 'pepa', 'camisita'
     batea-arroz   → 'cuenco', 'agua', 'granos'
     bloque-queso  → 'bloque'
     jarra-leche   → 'leche' (el chorro se anima desde el nivel)
     huevo         → 'cascara', 'clara', 'casco0'…'cascoN'
     sarten        → 'fondo'
     maduro        → 'tajada'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, forma, formaVariada } from './organico.js';

/* ---------- EL SAMBO: la media y el rallador ---------- */

registrar('media-sambo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'media-sambo';
  /* la media luna: media esfera con la piel veteada del sambo */
  const geoP = forma('sambo-piel', () =>
    abollar(new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { fuerza: 0.04, escala: 2 }));
  const piel = new THREE.Mesh(geoP, mate(THREE, COMIDA.sambo_piel));
  piel.scale.set(0.42, 0.3, 0.42);
  piel.name = 'piel';
  /* las vetas: gajos claros pintados como cintas delgadas */
  for (let i = 0; i < 6; i++) {
    const v = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.012, 4, 18, Math.PI), mate(THREE, COMIDA.sambo_veta));
    v.rotation.z = Math.PI;
    v.rotation.y = (i / 6) * Math.PI * 2;
    v.scale.y = 0.71;
    v.userData.ignorar = true;
    g.add(v);
  }
  /* la cara cortada, mirando arriba: la pulpa que se ralla */
  const pulpa = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 18), brillante(THREE, COMIDA.sambo_pulpa));
  pulpa.position.y = 0.01;
  pulpa.name = 'pulpa';
  g.add(piel, pulpa);
  /* unas pepas asomadas en la pulpa */
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), mate(THREE, COMIDA.sambo_pepa));
    p.position.set(Math.cos(a) * 0.18, 0.035, Math.sin(a) * 0.18);
    p.scale.y = 0.4;
    p.userData.ignorar = true;
    g.add(p);
  }
  return g;
});

registrar('rallador', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'rallador';
  /* la plancha inclinada con su marco de madera */
  const marco = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 1.5), mate(THREE, COMIDA.rallador_marco));
  const plancha = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.05, 1.3), brillante(THREE, COMIDA.rallador));
  plancha.position.y = 0.035;
  marco.userData.ignorar = true; plancha.userData.ignorar = true;
  g.add(marco, plancha);
  /* los dientes: la rejilla de picos que hace el trabajo */
  const geoD = new THREE.ConeGeometry(0.02, 0.05, 4);
  const matD = mate(THREE, COMIDA.rallador_diente);
  for (let f = 0; f < 8; f++) for (let c = 0; c < 5; c++) {
    const d = new THREE.Mesh(geoD, matD);
    d.position.set((c - 2) * 0.15 + (f % 2 ? 0.05 : 0), 0.08, (f - 3.5) * 0.15);
    d.userData.ignorar = true;
    g.add(d);
  }
  return g;
});

registrar('hebra-sambo', (THREE) => {
  const h = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.16, 3, 5), mate(THREE, COMIDA.sambo_pulpa));
  h.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
  h.name = 'hebra-sambo';
  return h;
});

/* ---------- EL GARBANZO: pepa con piquito y camisita ---------- */

registrar('garbanzo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'garbanzo';
  const geoP = formaVariada('garbanzo-pepa', 4, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 9), { fuerza: 0.07, escala: 2.2, semilla: k + 3 }));
  const pepa = new THREE.Mesh(geoP, brillante(THREE, COMIDA.garbanzo));
  pepa.scale.set(0.085, 0.08, 0.082);
  pepa.name = 'pepa';
  /* el piquito que lo delata como garbanzo */
  const pico = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.045, 6), mate(THREE, COMIDA.garbanzo));
  pico.position.set(0.055, 0.045, 0);
  pico.rotation.z = -0.7;
  pico.userData.ignorar = true;
  /* la camisita: la piel remojada, holgada y a punto de soltarse */
  const camisita = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 9),
    mate(THREE, COMIDA.garbanzo_camisita, { transparent: true, opacity: 0.55 })
  );
  camisita.scale.set(0.098, 0.09, 0.094);
  camisita.name = 'camisita';
  camisita.userData.ignorar = true;
  g.add(pepa, pico, camisita);
  return g;
});

/* ---------- EL ARROZ: la batea del agua lechosa ---------- */

registrar('batea-arroz', (THREE, opts = {}) => {
  const r = opts.radio || 0.66;
  const g = new THREE.Group();
  g.name = 'batea-arroz';
  const cuenco = pieza('cuenco', THREE, { radio: r });
  cuenco.name = 'cuenco';
  g.add(cuenco);
  /* el montón de arroz al fondo: granitos alargados, blancos */
  const granos = new THREE.Group();
  granos.name = 'granos';
  granos.position.y = 0.05;
  const geoG = forma('grano-arroz', () =>
    achatar(new THREE.SphereGeometry(1, 7, 6), { desde: -0.4, dureza: 0.4 }));
  const matG = mate(THREE, COMIDA.arroz);
  for (let i = 0; i < 52; i++) {
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / 52) * r * 0.62;
    const m = new THREE.Mesh(geoG, matG);
    m.position.set(Math.cos(a) * rad, (i % 3) * 0.005, Math.sin(a) * rad);
    m.scale.set(0.05, 0.017, 0.02);
    m.rotation.y = a * 1.7;
    m.userData.ignorar = true;
    granos.add(m);
  }
  g.add(granos);
  /* el agua: arranca clara y el nivel la va poniendo lechosa */
  const agua = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r * 0.7, 0.07, 24),
    brillante(THREE, COMIDA.agua, { transparent: true, opacity: 0.5 })
  );
  agua.position.y = 0.12;
  agua.name = 'agua';
  agua.userData.ignorar = true;
  g.add(agua);
  g.userData.r = r;
  return g;
});

/* ---------- EL QUESO Y LA LECHE ---------- */

registrar('bloque-queso', (THREE) => {
  const g = new THREE.Group();
  g.name = 'bloque-queso';
  const geo = forma('queso-bloque', () =>
    abollar(new THREE.CylinderGeometry(0.5, 0.54, 0.4, 18), { fuerza: 0.03, escala: 3 }));
  const bloque = new THREE.Mesh(geo, brillante(THREE, COMIDA.queso));
  bloque.name = 'bloque';
  /* la marca del molde, como el queso de hoja de mercado */
  const aro = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 5, 20), mate(THREE, COMIDA.queso_borde));
  aro.rotation.x = Math.PI / 2;
  aro.position.y = 0.1;
  aro.userData.ignorar = true;
  g.add(bloque, aro);
  return g;
});

registrar('miga-queso', (THREE, opts = {}) => {
  const geo = formaVariada('queso-miga', 5, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 9, 7), { fuerza: 0.2, escala: 1.8, semilla: k + 11 }));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.queso));
  m.scale.setScalar(0.07 + (opts.variante % 3) * 0.012);
  m.name = 'miga-queso';
  return m;
});

registrar('jarra-leche', (THREE) => {
  const g = new THREE.Group();
  g.name = 'jarra-leche';
  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.42, 14), brillante(THREE, COMIDA.jarra));
  const leche = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 14), mate(THREE, COMIDA.leche));
  leche.position.y = 0.17;
  leche.name = 'leche';
  const asa = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 6, 12, Math.PI), mate(THREE, COMIDA.jarra));
  asa.position.set(0.2, 0.05, 0);
  asa.rotation.z = -Math.PI / 2;
  asa.userData.ignorar = true;
  g.add(cuerpo, leche, asa);
  return g;
});

/* ---------- EL HUEVO DURO ---------- */

registrar('huevo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'huevo';
  /* la clara, debajo: lo que queda al pelar */
  const clara = new THREE.Mesh(new THREE.SphereGeometry(0.235, 14, 11), brillante(THREE, COMIDA.huevo_clara));
  clara.scale.set(1, 1.3, 1);
  clara.name = 'clara';
  g.add(clara);
  /* la cáscara: OCHO cascos que se despegan uno a uno. Cada casco es
     un parche de esfera apenas más grande que la clara; el nivel los
     jala desde la grieta. */
  const matC = mate(THREE, COMIDA.huevo_cascara);
  let n = 0;
  for (let fila = 0; fila < 2; fila++) {
    for (let c = 0; c < 4; c++) {
      const casco = new THREE.Mesh(
        new THREE.SphereGeometry(0.252, 8, 6,
          c * Math.PI / 2, Math.PI / 2,
          fila * Math.PI / 2 + 0.06, Math.PI / 2 - 0.12),
        matC
      );
      casco.scale.set(1, 1.3, 1);
      casco.name = 'casco' + (n++);
      g.add(casco);
    }
  }
  return g;
});

/* ---------- LA GUARNICIÓN: sartén, maduro, empanadita, ají ---------- */

registrar('sarten', (THREE) => {
  const g = new THREE.Group();
  g.name = 'sarten';
  const fondo = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.55, 0.1, 20), brillante(THREE, COMIDA.sarten));
  fondo.name = 'fondo';
  const pared = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 22), mate(THREE, COMIDA.sarten));
  pared.rotation.x = Math.PI / 2;
  pared.position.y = 0.07;
  pared.userData.ignorar = true;
  const mango = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.7, 8), mate(THREE, COMIDA.sarten_mango));
  mango.rotation.z = Math.PI / 2;
  mango.position.set(0.95, 0.05, 0);
  mango.userData.ignorar = true;
  g.add(fondo, pared, mango);
  return g;
});

registrar('maduro', (THREE, opts = {}) => {
  /* EN UN GROUP a propósito: la forma de la tajada vive en la escala
     del mesh (una esfera aplastada), y si el nivel escalara ese mesh
     directamente la borraría — pasó: un setScalar(1.5) convirtió la
     tajada en un globo del tamaño de la pantalla */
  const g = new THREE.Group();
  g.name = 'maduro';
  const geo = formaVariada('maduro-tajada', 3, opts.variante || 0, (k) =>
    abollar(new THREE.SphereGeometry(1, 12, 8), { fuerza: 0.05, escala: 2, semilla: k + 5 }));
  const t = new THREE.Mesh(geo, brillante(THREE, COMIDA.maduro));
  t.scale.set(0.24, 0.05, 0.13);
  t.name = 'tajada';
  g.add(t);
  return g;
});

registrar('empanadita', (THREE, opts = {}) => {
  /* la media luna de viento: media esfera achatada con repulgue */
  const g = new THREE.Group();
  g.name = 'empanadita';
  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI),
    brillante(THREE, COMIDA.empanadita)
  );
  cuerpo.scale.set(1, 0.55, 0.8);
  cuerpo.rotation.x = -Math.PI / 2;
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.022, 5, 14, Math.PI), mate(THREE, COMIDA.empanadita));
  borde.userData.ignorar = true;
  g.add(cuerpo, borde);
  return g;
});

registrar('aji-cuenco', (THREE) => {
  const g = new THREE.Group();
  g.name = 'aji-cuenco';
  const c = pieza('cuenco', THREE, { radio: 0.22 });
  const salsa = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.05, 14), mate(THREE, COMIDA.aji_salsa));
  salsa.position.y = 0.1;
  salsa.userData.ignorar = true;
  g.add(c, salsa);
  return g;
});

registrar('plato-fanesca', (THREE) => {
  const g = new THREE.Group();
  g.name = 'plato-fanesca';
  const hondo = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.42, 0.22, 20), brillante(THREE, COMIDA.plato_hondo));
  const crema = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 20), mate(THREE, COMIDA.crema_fanesca));
  crema.position.y = 0.1;
  crema.name = 'crema';
  g.add(hondo, crema);
  return g;
});
