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
     guia-zapallo   → raya0 … rayaN (la línea punteada del corte)
     pepa-zapallo   → una malla suelta
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, gajos, forma } from './organico.js';

export const N = 7;              /* tajadas */
export const GRUESO = 0.36;      /* ancho de cada tajada */
export const R = 0.5;            /* radio del zapallo ya partido */
export const R_ENTERO = 0.66;    /* y el del zapallo antes de partirlo */

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
  const g = new THREE.Mesh(
    geo,
    [
      mate(THREE, COMIDA.zapallo_piel),
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
  const mat = mate(THREE, COMIDA.zapallo_guia);
  for (let i = 0; i <= trozos; i++) {
    if (i % 2) continue;
    const a = (i / trozos) * Math.PI;
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.034 * gr, 0.05 * gr, 0.1 * gr), mat);
    d.position.set(0, Math.sin(a) * ry, -Math.cos(a) * rz);
    d.rotation.x = -a;
    d.name = 'raya' + i;
    d.userData.ignorar = true;
    g.add(d);
  }
  return g;
});

/* las pepas asomando por la cara abierta de las puntas */
registrar('pepa-zapallo', (THREE) => {
  const p = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mate(THREE, COMIDA.zapallo_pepa));
  p.scale.set(1, 0.45, 1.3);
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

  const geo = forma('zapallo-entero', () =>
    abollar(
      gajos(new THREE.SphereGeometry(1, 34, 22), { eje: 'y', n: 9, hondura: 0.17 }),
      { fuerza: 0.02, escala: 3.4, semilla: 61 },
    ));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COMIDA.zapallo_piel));
  cuerpo.scale.set(r, r * 0.78, r);
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);

  /* el rabo: corto, grueso y torcido. Es el detalle que más rápido
     dice "esto es un zapallo y no una pelota". */
  const rabo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.085, 0.2, 7),
    mate(THREE, COMIDA.zapallo_guia)
  );
  rabo.position.y = r * 0.78;
  rabo.rotation.z = 0.22;
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
  const piel = new THREE.Mesh(geo, mate(THREE, COMIDA.zapallo_piel));
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

/* ---------- la hebra que envuelve las pepas ---------- */
registrar('fibra-zapallo', (THREE, opts = {}) => {
  const geo = forma('fibra-zapallo', () =>
    abollar(new THREE.SphereGeometry(1, 8, 6), { fuerza: 0.3, escala: 4.5, semilla: 71 }));
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.zapallo_fibra));
  const s = 0.06 + (opts.variante || 0) % 3 * 0.012;
  m.scale.set(s * 1.6, s * 0.5, s);
  m.name = 'fibra';
  return m;
});
