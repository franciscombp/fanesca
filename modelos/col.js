/* ============================================================
   FANESCA — modelos/col.js
   La hoja de col, el cigarro que se hace con ella, y la tira.

   Tres piezas para un solo gesto en dos tiempos: la hoja se
   enrolla y el rollo se corta. Como en la cocina, el rollo no es
   otra cosa: es la misma hoja, apretada.

   La hoja NO es un plano. Una hoja de col es un plato ondulado con
   un nervio grueso que la levanta por el medio — si se dibuja
   plana se lee como un papel verde. Aquí la ondulación se hornea
   en la geometría y el nervio va aparte, con volumen.

   PARTES NOMBRADAS (para que un .glb encaje)
     col-hoja  → 'lamina', 'nervio'
     col-rollo → 'cilindro', 'punta'
     col-tira  → 'tira'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { forma, formaVariada } from './organico.js';
import { lienzo, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta.
   La lámina va en blanco y el verde lo pone la textura: del borde
   oscuro al corazón casi crema, que es como se ve una hoja de col
   a contraluz. */
const COLORES = {
  col_borde: '#86b654',      /* la orilla, donde la hoja es más verde */
  col_media: '#add07a',
  col_cerca: '#d6e8ae',      /* junto al nervio, ya pálida */
  col_corazon: '#e3efc6',
};

export const ANCHO_HOJA = 1.5;   /* de lado a lado: lo que se enrolla */
export const LARGO_HOJA = 1.15;  /* el largo del futuro rollo */

/* la lámina ondulada: un plato poco hondo (sube hacia la orilla) con
   una onda que crece hacia el borde y un rizo fino en la orilla. Al
   centro, junto al nervio, la hoja es casi plana.

   ALTURA ACOTADA a 0.08: el nivel angosta la lámina con scale.x hasta
   0.06 pero la altura no se encoge, así que una orilla alta quedaría
   como una aleta parada junto al rollo 'parcial' (que mide 0.255·r).
   La silueta la da la textura (alphaTest), no la geometría: por eso
   ya no se estrecha la punta. */
function laminaGeo(THREE, semilla) {
  const g = new THREE.PlaneGeometry(ANCHO_HOJA, LARGO_HOJA, 30, 22);
  const pos = g.attributes.position;
  let maxZ = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const bx = Math.abs(x) / (ANCHO_HOJA / 2), by = Math.abs(y) / (LARGO_HOJA / 2);
    const borde = Math.min(1, Math.hypot(bx, 0.9 * by));
    let z = 0.03 * bx * bx + 0.01 * by * by
      + (0.012 * Math.sin(6.5 * x + semilla) + 0.009 * Math.sin(5.1 * y - semilla)) * (0.3 + bx)
      + Math.pow(borde, 4) * 0.015 * Math.sin(11 * Math.atan2(y, x) + semilla);
    z = Math.min(0.08, z);
    maxZ = Math.max(maxZ, z);
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.userData.maxZ = maxZ;
  return g;
}

/* EL DIBUJO DE LA HOJA: degradado del borde verde al corazón crema,
   nervaduras secundarias que salen del nervio y suben hacia la punta,
   y una red fina entre ellas. Sin esto la hoja era un papel verde
   del mismo valor que la tabla. A 512 y con trazos al doble: a 256
   la red caía por debajo del texel y las venas salían borrosas. */
function pintarHoja(ctx, S, rnd, conSilueta) {
  const cx = S / 2;
  if (conSilueta) {
    /* la silueta: superelipse n=3.2 con apenas dos ondas largas. Una
       onda alta (sin47θ) la hacía ver rota, no rizada */
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const th = i / 160 * Math.PI * 2;
      const c = Math.cos(th), sn = Math.sin(th);
      const k = Math.pow(Math.pow(Math.abs(c), 3.2) + Math.pow(Math.abs(sn), 3.2), -1 / 3.2);
      const r = 0.475 * S * k * (1 + 0.035 * Math.sin(7 * th) + 0.02 * Math.sin(13 * th));
      const x = cx + c * r, y = cx + sn * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.clip();
  }
  const gr = ctx.createLinearGradient(0, 0, S, 0);
  gr.addColorStop(0, COLORES.col_borde); gr.addColorStop(0.3, COLORES.col_media);
  gr.addColorStop(0.47, COLORES.col_cerca); gr.addColorStop(0.5, COLORES.col_corazon);
  gr.addColorStop(0.53, COLORES.col_cerca); gr.addColorStop(0.7, COLORES.col_media);
  gr.addColorStop(1, COLORES.col_borde);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, S, S);
  if (conSilueta) {
    const rg = ctx.createRadialGradient(cx, cx, 0.3 * S, cx, cx, 0.55 * S);
    rg.addColorStop(0, 'rgba(50,100,30,0)'); rg.addColorStop(1, 'rgba(50,100,30,.32)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, S, S);
  }
  /* la red terciaria */
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(236,246,214,.22)'; ctx.lineWidth = 1.6;
  for (let i = 0; i < 140; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 32, y + Math.sin(a) * 32); ctx.stroke();
  }
  /* las secundarias, de dos en dos desde el nervio */
  const alfa = conSilueta ? 1 : 0.5;
  for (const lado of [-1, 1]) {
    let y0 = S - 0.13 * S;
    while (y0 > 0.1 * S) {
      const largo = (0.36 + rnd() * 0.08) * S, sube = (0.10 + rnd() * 0.07) * S;
      const pts = [];
      for (let j = 0; j <= 10; j++) {
        const t = j / 10;
        pts.push([cx + lado * largo * t, y0 - sube * t * t]);
      }
      for (const sombra of [true, false]) {
        for (let j = 0; j < 10; j++) {
          const t = j / 10;
          const w = (5 - 4.2 * t) * 2;
          ctx.lineWidth = sombra ? w + 4.4 : w;
          ctx.strokeStyle = sombra ? `rgba(70,115,40,${0.28 * alfa})`
            : `rgba(242,249,226,${(0.85 - 0.6 * t) * alfa})`;
          const o = sombra ? [2.4, 3.6] : [0, 0];
          ctx.beginPath();
          ctx.moveTo(pts[j][0] + o[0], pts[j][1] + o[1]);
          ctx.lineTo(pts[j + 1][0] + o[0], pts[j + 1][1] + o[1]);
          ctx.stroke();
        }
      }
      if (rnd() < 0.4) {
        /* una horquilla de vez en cuando: sin ella parece peine */
        ctx.lineWidth = 2.8; ctx.strokeStyle = `rgba(242,249,226,${0.45 * alfa})`;
        ctx.beginPath(); ctx.moveTo(pts[4][0], pts[4][1]);
        ctx.lineTo(pts[4][0] + lado * 0.12 * S, pts[4][1] + 0.05 * S); ctx.stroke();
      }
      y0 -= (0.085 + rnd() * 0.05) * S;
    }
  }
}

const texturaHoja = (THREE) => lienzo(THREE, 'col-hoja', 512,
  (ctx, S) => pintarHoja(ctx, S, azarCon(7), true), { anisotropia: 4 });

/* el costado del rollo: la misma hoja sin silueta y con las venas a
   media fuerza (enrolladas se ven de canto), más la costura de la
   última vuelta. En el cilindro la u da la vuelta y la v corre a lo
   largo, así que las venas horizontales quedan como anillos. */
const texturaRollo = (THREE) => lienzo(THREE, 'col-rollo-lado', 256, (ctx, S) => {
  pintarHoja(ctx, S, azarCon(11), false);
  const costura = (dx, estilo, lw) => {
    ctx.strokeStyle = estilo; ctx.lineWidth = lw;
    ctx.beginPath();
    for (let v = 0; v <= S; v += 2) {
      const u = 0.62 * S + 5 * Math.sin(0.11 * v) + 2 * Math.sin(0.37 * v) + dx;
      if (v === 0) ctx.moveTo(u, v); else ctx.lineTo(u, v);
    }
    ctx.stroke();
  };
  costura(-3, 'rgba(235,245,215,.7)', 2);
  costura(0, 'rgba(60,100,35,.45)', 5);
});

registrar('col-hoja', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'col-hoja';

  const geo = formaVariada('col-lamina', 3, opts.variante || 0, (k) => laminaGeo(THREE, k * 1.7));
  /* blanco: el verde lo pone la textura. alphaTest y no transparente:
     así sigue proyectando sombra, y three arma la sombra con la misma
     silueta recortada */
  const lamina = new THREE.Mesh(geo, mate(THREE, '#ffffff',
    { map: texturaHoja(THREE), side: THREE.DoubleSide, alphaTest: 0.5 }));
  lamina.rotation.x = -Math.PI / 2;
  lamina.name = 'lamina';
  g.add(lamina);

  /* el nervio: grueso, claro, y por eso es la línea que el ojo sigue
     para saber en qué sentido se enrolla la hoja */
  const nervio = new THREE.Mesh(
    /* sección de óvalo aplastado, y al 0.9 del largo para no asomar
       más allá de la punta recortada de la lámina */
    forma('col-nervio', () => new THREE.CylinderGeometry(0.05, 0.014, LARGO_HOJA * 0.9, 10, 6).scale(1.25, 1, 0.6)),
    mate(THREE, COMIDA.col_nervio)
  );
  nervio.rotation.x = Math.PI / 2;
  nervio.position.y = 0.03;
  nervio.name = 'nervio';
  nervio.userData.ignorar = true;
  g.add(nervio);

  return g;
});

/* la cara del rollo: una espiral de Arquímedes sobre el verde claro
   del corazón de la hoja. Una sola textura para todos los rollos
   (tirar() no libera texturas: una por rollo se quedaría en memoria). */
let espiralTex = null;
function texturaEspiral(THREE) {
  if (espiralTex) return espiralTex;
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e1edc4';
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = '#86b257'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let t = 0; t <= 1.0001; t += 0.004) {
    const r = 6 + 54 * t, th = t * Math.PI * 2 * 3.4;
    const x = S / 2 + Math.cos(th) * r, y = S / 2 + Math.sin(th) * r;
    if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.strokeStyle = '#6f9e45'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(S / 2, S / 2, 61, 0, Math.PI * 2); ctx.stroke();
  espiralTex = new THREE.CanvasTexture(c);
  espiralTex.colorSpace = THREE.SRGBColorSpace;
  return espiralTex;
}

/* el cigarro: la misma hoja, apretada. Se le da el largo por opts
   porque el rollo se acorta a cada tajada. */
registrar('col-rollo', (THREE, opts = {}) => {
  const largo = opts.largo != null ? opts.largo : LARGO_HOJA;
  const g = new THREE.Group();
  g.name = 'col-rollo';

  /* ACOSTADO EN LA GEOMETRÍA, no con rotation.x. El nivel acorta el
     rollo con cil.scale.z = largo/LARGO_HOJA a cada tajada; con el
     cilindro girado en la malla, la z local era un RADIO: el rollo se
     quedaba del largo entero y se aplastaba en una cinta, y la punta
     quedaba enterrada a media cinta como una media luna blanca. */
  const cil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.115, largo, 18, 1).rotateX(Math.PI / 2),
    /* con la hoja pintada alrededor: sin ella, a ~38 px de alto en el
       teléfono, el rollo era un tubo verde liso */
    mate(THREE, '#ffffff', { map: texturaRollo(THREE) })
  );
  cil.name = 'cilindro';
  g.add(cil);

  /* la espiral de la punta: sin esto un rollo de col es un tubo. Era
     una dona blanca; ahora es la cara del rollo con la hoja enrollada
     pintada, que es lo que se ve al mirar un cigarro de col de frente */
  const punta = new THREE.Mesh(
    new THREE.CircleGeometry(0.112, 24),
    mate(THREE, '#ffffff', { map: texturaEspiral(THREE) })
  );
  punta.position.z = largo / 2 + 0.004;
  punta.name = 'punta';
  punta.userData.ignorar = true;
  g.add(punta);

  return g;
});

registrar('col-tira', (THREE, opts = {}) => {
  const grosor = opts.grosor != null ? opts.grosor : 0.05;
  const geo = forma('col-tira:' + Math.round(grosor * 100), () => {
    const g = new THREE.BoxGeometry(0.2, 0.02, Math.max(0.014, grosor), 6, 1, 1);
    /* la tira sale rizada, como sale de verdad al deshacerse el rollo */
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) + Math.sin(x * 14) * 0.022);
    }
    pos.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  });
  const m = new THREE.Mesh(geo, mate(THREE, COMIDA.col_tira, { side: THREE.DoubleSide }));
  m.name = 'tira';
  return m;
});
