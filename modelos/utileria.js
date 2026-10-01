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

/* LA TABLA ES DE MADERA: con veta, canto biselado y esquinas
   redondeadas. Era una caja de color crema plano y sus costados
   quedaban fuera de cuadro: se leía como una franja de papel, y todo
   lo pálido que se pone encima (chocho, huevo, queso, bacalao, mote)
   perdía la silueta, crema sobre crema.

   Contrato que NO cambia: una sola malla llamada 'tabla' (los niveles
   le ponen userData y la raycastean), el contorno EXACTO ancho×hondo
   (FRENTE_TABLA y rejillaEnTabla lo suponen) y la cara de arriba en
   +GROSOR_TABLA/2 (los bichos caminan en MESA_Y+0.10). Nadie lee
   geometry.parameters, así que pasar de caja a extrusión es seguro.

   La textura es UNA para todas las tablas: tirar() desecha geometrías
   y materiales al cambiar de nivel, pero no texturas, y una nueva por
   nivel se quedaría en la memoria de video. */
let tablaTex = null;
function texturaTabla(THREE) {
  if (tablaTex) return tablaTex;
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  let s = 11;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  ctx.fillStyle = COMIDA.tabla;
  ctx.fillRect(0, 0, W, H);
  /* las bandas anchas de la madera, claras y oscuras */
  for (let y = 0; y < H; y++) {
    const n = 0.5 * Math.sin(y * 0.045) + 0.3 * Math.sin(y * 0.13 + 1.7) + 0.2 * Math.sin(y * 0.31 + 0.4);
    ctx.fillStyle = n > 0 ? `rgba(255,236,200,${n * 0.10})` : `rgba(120,70,30,${-n * 0.12})`;
    ctx.fillRect(0, y, W, 1);
  }
  /* la veta: a lo largo de la tabla, ondulada */
  ctx.strokeStyle = COMIDA.tabla_veta;
  for (let i = 0; i < 70; i++) {
    ctx.globalAlpha = 0.06 + rnd() * 0.16;
    ctx.lineWidth = 0.6 + rnd() * 1.4;
    const y0 = rnd() * H, amp = 2 + rnd() * 6, f = 0.004 + rnd() * 0.01, ph = rnd() * 6.3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = y0 + Math.sin(x * f + ph) * amp;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  /* las rayitas de cuchillo de una tabla que se usa */
  ctx.strokeStyle = '#7a5230';
  for (let i = 0; i < 40; i++) {
    ctx.globalAlpha = 0.05 + rnd() * 0.07;
    ctx.lineWidth = 1;
    const x = rnd() * W, y = rnd() * H, l = 10 + rnd() * 40, a = (rnd() - 0.5) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  tablaTex = new THREE.CanvasTexture(c);
  tablaTex.colorSpace = THREE.SRGBColorSpace;
  tablaTex.anisotropy = 4;
  return tablaTex;
}

function geoTabla(THREE, ancho, hondo) {
  const b = 0.022;          /* el bisel: lo que atrapa la luz y dibuja el canto */
  const r = 0.07;           /* las esquinas */
  /* la extrusión ensancha el contorno lo que mide el bisel: se dibuja
     más chico para que el borde final mida justo ancho×hondo */
  const w = ancho - 2 * b, h = hondo - 2 * b;
  const forma = new THREE.Shape();
  forma.moveTo(-w / 2 + r, -h / 2);
  forma.lineTo(w / 2 - r, -h / 2);
  forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  forma.lineTo(w / 2, h / 2 - r);
  forma.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  forma.lineTo(-w / 2 + r, h / 2);
  forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  forma.lineTo(-w / 2, -h / 2 + r);
  forma.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const hondura = GROSOR_TABLA - 2 * b;
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: hondura, bevelEnabled: true, bevelThickness: b, bevelSize: b,
    bevelSegments: 3, curveSegments: 4,
  });
  /* la extrusión va en z: se acuesta (el grosor queda en y) y se
     centra, para que la cara de arriba quede en +GROSOR/2 como la caja */
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -hondura / 2, 0);
  /* UV de tabla entera, sin repetir: la veta no es periódica y
     repetida dejaba una costura en plena zona de juego */
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / ancho + 0.5, pos.getZ(i) / hondo + 0.5);
  }
  uv.needsUpdate = true;
  return geo;
}

registrar('tabla', (THREE, opts = {}) => {
  const ancho = opts.ancho || 3.1;
  const hondo = opts.hondo || 1.7;
  const t = new THREE.Mesh(
    geoTabla(THREE, ancho, hondo),
    new THREE.MeshLambertMaterial({ map: texturaTabla(THREE) })
  );
  t.name = 'tabla';
  /* recibe la sombra de lo que se pone encima; no proyecta (es el piso
     de la faena, y su propia sombra caería en el mesón, fuera de foco) */
  t.receiveShadow = true;
  t.userData.sombra = false;
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

/* Con la sombra del sol encima, este disco ya no hace de sombra: hace
   de OCLUSIÓN DE CONTACTO, el oscuro justo donde la pieza se apoya.
   Por eso tiene un núcleo fuerte que se apaga rápido, y no la rampa
   lineal de antes, que bajo el huevo o el zapallo ni se veía. */
export function texturaSombra(THREE) {
  if (sombraTex) return sombraTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(58,32,14,.62)');
  g.addColorStop(0.30, 'rgba(58,32,14,.46)');
  g.addColorStop(0.55, 'rgba(58,32,14,.20)');
  g.addColorStop(0.80, 'rgba(58,32,14,.06)');
  g.addColorStop(1, 'rgba(58,32,14,0)');
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

/* ---------- el aro del destino ----------

   «Hay cosas que no son claras de jugar», y preguntado qué faltaba, la
   respuesta fue una sola: **dónde tengo que tocar**. Los dos mesones
   nuevos piden arrastrar algo A UN SITIO —el choclo al canasto, el
   cuenco a la olla— y ese sitio no se anunciaba: era un cuenco más
   entre los cuencos de la cocina. El gesto estaba claro; el blanco no.

   Esto es el blanco: un aro plano en el suelo, del color del maíz,
   que late despacio. No es decoración — es la única señal que dice
   «aquí». `latir()` lo anima y `apuntar()` lo enciende cuando el
   jugador ya lleva algo en la mano, que es cuando de verdad hace
   falta saber a dónde va.

   No se raycastea (`ignorar`): un aro que intercepta el dedo sería
   una ayuda que estorba. */
export function aroDestino(THREE, r = 0.5, color = '#f4b942') {
  const g = new THREE.Group();
  g.name = 'aro-destino';
  const anillo = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.055, 8, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false })
  );
  anillo.rotation.x = -Math.PI / 2;
  anillo.userData.ignorar = true;
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(r * 0.62, r * 0.95, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.12, depthWrite: false })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.004;
  halo.userData.ignorar = true;
  g.add(anillo, halo);
  g.userData.ignorar = true;
  let fuerza = 0;   /* 0 en reposo, 1 con algo en la mano */
  return {
    obj: g,
    /* encendido mientras se lleva algo: el aro crece y se aclara */
    apuntar(si) { fuerza = si ? 1 : 0; },
    latir(t) {
      const base = 1 + Math.sin(t * 2.4) * 0.035;
      const k = base + fuerza * 0.10;
      g.scale.set(k, 1, k);
      anillo.material.opacity = 0.5 + fuerza * 0.42 + Math.sin(t * 2.4) * 0.08;
      halo.material.opacity = 0.12 + fuerza * 0.20;
    },
  };
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
