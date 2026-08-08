/* ============================================================
   FANESCA — modelos/quinua.js
   La batea de lavar, el agua, la espuma y el grano.

   Este es el único sitio del juego donde hay agua, y el agua es el
   personaje: se enturbia, hace espuma y se bota. Por eso van tres
   discos apilados —agua, espuma, y los granos al fondo— en vez de
   un solo relleno: el nivel los mueve por separado.

   La espuma no es blanco liso. La saponina hace una espuma de
   burbuja gorda y despareja, así que se arma con bolitas achatadas
   repartidas en espiral: de lejos es una capa, de cerca son
   burbujas.

   PARTES NOMBRADAS (para que un .glb encaje)
     batea-quinua → 'cuenco', 'agua', 'espuma', 'granos'
     grano-quinua → 'cuerpo', 'germen'
   ============================================================ */

import { registrar, pieza } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { achatar, forma } from './organico.js';

export const RADIO_BATEA = 0.66;

registrar('batea-quinua', (THREE, opts = {}) => {
  const r = opts.radio || RADIO_BATEA;
  const g = new THREE.Group();
  g.name = 'batea-quinua';

  const cuenco = pieza('cuenco', THREE, { radio: r });
  cuenco.name = 'cuenco';
  g.add(cuenco);

  /* los granos, al fondo y quietos: se ven a través del agua */
  const granos = new THREE.Group();
  granos.name = 'granos';
  granos.position.y = 0.05;
  const geoG = forma('grano-quinua-capa', () =>
    achatar(new THREE.SphereGeometry(1, 7, 6), { desde: -0.5, dureza: 0.5 }));
  const matG = mate(THREE, COMIDA.quinua);
  for (let i = 0; i < 46; i++) {
    /* espiral de oro: reparte sin apelotonar y sin dibujar anillos */
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / 46) * r * 0.62;
    const m = new THREE.Mesh(geoG, matG);
    m.position.set(Math.cos(a) * rad, (i % 3) * 0.006, Math.sin(a) * rad);
    m.scale.set(0.028, 0.016, 0.028);
    m.rotation.y = a;
    m.userData.ignorar = true;
    granos.add(m);
  }
  g.add(granos);

  /* El agua: un disco apenas azulado y translúcido. El radio va
     ajustado a la pared del cuenco a ESA altura y no al borde de
     arriba — con 0.9r el disco asomaba por fuera de la batea y se
     veía un aro pálido rodeándola, como si el agua flotara alrededor
     en vez de estar dentro. */
  const agua = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r * 0.7, 0.07, 24),
    brillante(THREE, COMIDA.agua, { transparent: true, opacity: 0.55 })
  );
  agua.position.y = 0.12;
  agua.name = 'agua';
  agua.userData.ignorar = true;
  g.add(agua);

  /* la espuma: burbujas, no una tapa de yeso */
  const espuma = new THREE.Group();
  espuma.name = 'espuma';
  espuma.position.y = 0.155;
  espuma.visible = false;
  const geoB = new THREE.SphereGeometry(1, 7, 6);
  const matB = mate(THREE, COMIDA.espuma, { transparent: true, opacity: 0.9 });
  for (let i = 0; i < 34; i++) {
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / 34) * r * 0.82;
    const b = new THREE.Mesh(geoB, matB);
    const s = 0.05 + (i % 4) * 0.017;
    b.position.set(Math.cos(a) * rad, (i % 3) * 0.008, Math.sin(a) * rad);
    b.scale.set(s, s * 0.55, s);
    b.userData.ignorar = true;
    espuma.add(b);
  }
  g.add(espuma);

  g.userData.r = r;
  return g;
});

registrar('grano-quinua', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'grano-quinua';
  const geo = forma('grano-quinua', () =>
    achatar(new THREE.SphereGeometry(1, 8, 6), { desde: -0.45, dureza: 0.55 }));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, opts.limpio ? COMIDA.quinua_limpia : COMIDA.quinua));
  cuerpo.scale.set(0.032, 0.018, 0.032);
  cuerpo.name = 'cuerpo';
  /* el germen: el anillito que le da la vuelta al grano y que es lo
     que se enrosca al cocinarse */
  const germen = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 5, 12), mate(THREE, COMIDA.quinua_germen));
  germen.rotation.x = Math.PI / 2;
  germen.position.y = 0.002;
  germen.name = 'germen';
  germen.userData.ignorar = true;
  g.add(cuerpo, germen);
  return g;
});
