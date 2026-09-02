/* ============================================================
   FANESCA — modelos/utileria.js
   Las piezas que no son de ningún ingrediente pero salen en casi
   todos: la tabla de picar, la sombra bajo las cosas y los ojitos
   de los bichos.

   La tabla estaba copiada en seis niveles con medidas apenas
   distintas — el clásico duplicado que nadie nota hasta que hay
   que cambiar el color de la madera en seis sitios.
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';

/* ---------- la tabla de picar ----------
   Cada nivel la pide de su medida; el grosor y el color son los
   mismos para todos, que es lo que hace que se lea como la misma
   cocina. Sobresale 0.10 del mesón: por eso los bichos que caminan
   encima necesitan la función `superficie` de plaga.js. */

export const GROSOR_TABLA = 0.1;
export const ALTO_TABLA = 0.10;   /* cuánto sobresale del mesón */

registrar('tabla', (THREE, opts = {}) => {
  const ancho = opts.ancho || 3.1;
  const hondo = opts.hondo || 1.7;
  const t = new THREE.Mesh(
    new THREE.BoxGeometry(ancho, GROSOR_TABLA, hondo),
    mate(THREE, COMIDA.tabla)
  );
  t.name = 'tabla';
  return t;
});

/* ---------- el cuchillo y el trazo ----------
   El cuchillo sigue al dedo mientras se parte o se corta, y el
   trazo pinta la línea que el dedo lleva hecha. Ninguno se toca
   (ignorar): son la mano del jugador, no una pieza del mesón. Sin
   ellos, cortar era arrastrar un dedo invisible sobre una guía y
   esperar a ver si pasó algo; con ellos se ve el corte formarse. */

registrar('cuchillo', (THREE, opts = {}) => {
  const g = new THREE.Group();
  const largo = opts.largo || 0.62;
  const hoja = new THREE.Mesh(
    new THREE.BoxGeometry(0.022, 0.15, largo),
    new THREE.MeshStandardMaterial({ color: '#d9dde3', metalness: 0.75, roughness: 0.28 })
  );
  hoja.position.set(0, 0, largo / 2);
  hoja.name = 'hoja';
  const filo = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.02, largo * 0.96),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  filo.position.set(0, -0.05, largo / 2);
  const mango = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.07, 0.26),
    new THREE.MeshLambertMaterial({ color: '#6b3a1c' })
  );
  mango.position.set(0, 0.01, -0.13);
  mango.name = 'mango';
  const remache = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8),
    new THREE.MeshLambertMaterial({ color: '#c9a45c' })
  );
  remache.rotation.z = Math.PI / 2;
  remache.position.set(0, 0.01, -0.13);
  g.add(hoja, filo, mango, remache);
  g.name = 'cuchillo';
  g.userData.ignorar = true;
  g.traverse(o => { o.userData.ignorar = true; });
  return g;
});

/* una tira de un mundo de largo sobre la mesa; se escala en z hasta
   la distancia que el dedo lleva recorrida */
registrar('trazo', (THREE, opts = {}) => {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(opts.ancho || 0.06, 0.012, 1),
    new THREE.MeshBasicMaterial({ color: opts.color || '#fff1b8', transparent: true, opacity: 0.85 })
  );
  m.name = 'trazo';
  m.userData.ignorar = true;
  return m;
});

/* ---------- la sombra ----------
   Un disco borroso pintado a canvas. Sin esto las cosas flotan;
   con esto se apoyan. La textura se hace una sola vez. */

let sombraTex = null;

export function texturaSombra(THREE) {
  if (sombraTex) return sombraTex;
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(60,30,10,.42)');
  g.addColorStop(1, 'rgba(60,30,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  sombraTex = new THREE.CanvasTexture(c);
  sombraTex.colorSpace = THREE.SRGBColorSpace;
  return sombraTex;
}

export function sombraBlob(THREE, size = 0.8, alto = 0.012) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: texturaSombra(THREE), transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = alto;
  m.name = 'sombra';
  m.userData.ignorar = true;
  return m;
}

/* ---------- los ojitos ----------
   Dos bolitas con pupila. Los llevan todos los bichos: es lo que
   los vuelve personajes en vez de obstáculos, y lo que hace que
   aplastar a uno se sienta mal — que es exactamente el punto. */

export function ojitos(THREE, sep = 0.06, y = 0.05, z = 0.09, r = 0.028) {
  const g = new THREE.Group();
  g.name = 'ojitos';
  const blanco = new THREE.MeshBasicMaterial({ color: COMIDA.ojo_blanco });
  const negro = new THREE.MeshBasicMaterial({ color: COMIDA.ojo_negro });
  [-1, 1].forEach((s, i) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), blanco);
    o.position.set(sep * s, y, z);
    o.name = 'ojo' + i;
    const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 8, 6), negro);
    p.position.set(sep * s, y, z + r * 0.62);
    p.name = 'pupila' + i;
    g.add(o, p);
  });
  return g;
}
