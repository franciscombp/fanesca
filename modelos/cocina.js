/* ============================================================
   FANESCA — modelos/cocina.js
   El puesto donde se trabaja: pared de azulejo, piso, mesón,
   gabinete, repisa con frascos, la olla grande humeando, y los
   dos cuencos (la batea de lo bueno y la composta de lo que se
   bota).

   Esto es fondo, no mecánica — con una excepción que sí lo es:
   **los dos cuencos**. La batea y la composta son destinos de
   juego (ahí se sueltan los bichos), así que sus posiciones las
   manda el motor y aquí solo se dibujan.

   Todo lo de aquí LEE la paleta del sistema de diseño, nunca la
   copia: si mañana cambia el color del barrio, esta cocina se
   repinta sola. No es un detalle — el juego nació con la paleta
   anterior y cuando el sistema de diseño cambió, el `git merge` no
   vio ningún conflicto y sin esto habría quedado con los colores
   de una versión que ya no existe.

   PARTES NOMBRADAS (para que un .glb encaje)
     cuenco → 'cuerpo', 'fondo', 'labio', 'relleno'
   ============================================================ */

import { registrar } from './registro.js';
import { escenarioDe, POR_DEFECTO } from '../escenarios.js';
import { token, mate, mateToken, apagar, mezclar } from './paleta.js';
import { sombraBlob } from './utileria.js';

/* un color de escenario: o es un token del sistema ('--madera-400')
   o un hex escrito a mano. token() con un hex devolvía el RESPALDO,
   no el hex — y así un suelo '#8a5a36' se habría pintado de otro. */
const colorDe = (v, respaldo) => (v && v.startsWith('--') ? token(v, respaldo) : (v || respaldo));

/* azar con semilla: las texturas de fondo salen iguales en cada
   partida, y dos fotos del mismo mesón se pueden comparar */
function azar(semilla) {
  let s = semilla >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* llevar un color a una luminancia fija (en sRGB), con tope de croma:
   para lo que debe leerse como «la sombra bajo el mesón» */
function aLuz(THREE, color, l, sMax) {
  const c = new THREE.Color(color);
  const h = {};
  c.getHSL(h, THREE.SRGBColorSpace);
  c.setHSL(h.h, Math.min(h.s, sMax), l, THREE.SRGBColorSpace);
  return '#' + c.getHexString(THREE.SRGBColorSpace);
}

/* ---------- texturas pintadas a canvas ---------- */

function texturaCanvas(THREE, dibuja, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  dibuja(c.getContext('2d'), size);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

/* EL AZULEJO, CLARO Y DE FONDO. Era talavera azul a cuadros con junta
   casi negra: el cuarto de arriba de cada mesón salía como una reja
   azul noche, lo más oscuro y frío del cuadro — se comía la comida y
   contradecía la luz de tarde. Ahora es azulejo crema con el rombo
   de talavera dibujado a trazo, y se desenfoca un pelo: es un fondo,
   y un fondo de foto de producto está fuera de foco. El desenfoque es
   del canvas (gratis en la GPU); donde el navegador no tiene
   ctx.filter simplemente no hay desenfoque. */
export function texturaAzulejos(THREE) {
  return texturaCanvas(THREE, (ctx, S) => {
    const T = S / 4;
    ctx.fillStyle = token('--peltre-400', '#e8d9bf');
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? token('--peltre-200', '#f6efe1') : token('--peltre-300', '#efe5d2');
      ctx.fillRect(x * T + 2, y * T + 2, T - 4, T - 4);
      const cx = x * T + T / 2, cy = y * T + T / 2, d = T * 0.28;
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = token('--talavera-500', '#1b5faa');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy - d); ctx.lineTo(cx + d, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx - d, cy);
      ctx.closePath(); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if ('filter' in ctx) {
      ctx.filter = 'blur(1.5px)';
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.filter = 'none';
    }
  });
}

/* EL MESÓN, NOGAL Y DE TABLONES. Era naranja saturado con nueve
   rayas idénticas: el segundo color más fuerte del cuadro, justo
   detrás de la tabla. Ahora son tablones de un café apagado —derivado
   del token del escenario, no copiado— con su veta y su junta, más
   oscuros que la tabla miel para que ésta se despegue. */
export function texturaMadera(THREE, base, veta) {
  return texturaCanvas(THREE, (ctx, S) => {
    const rnd = azar(7);
    const TABLONES = 6;
    const alto = S / TABLONES;
    for (let i = 0; i < TABLONES; i++) {
      /* cada tablón con su tono: un mismo café pero no idéntico */
      const k = 0.9 + rnd() * 0.2;
      ctx.fillStyle = apagar(THREE, base, 0.62 * k, 0.7);
      ctx.fillRect(0, i * alto, S, alto);
      ctx.strokeStyle = veta;
      for (let v = 0; v < 14; v++) {
        ctx.globalAlpha = 0.08 + rnd() * 0.14;
        ctx.lineWidth = 0.8 + rnd() * 1.6;
        const y0 = i * alto + 3 + rnd() * (alto - 6);
        const amp = 1 + rnd() * 3, f = 0.006 + rnd() * 0.012, ph = rnd() * 6.3;
        ctx.beginPath();
        for (let x = 0; x <= S; x += 8) {
          const y = y0 + Math.sin(x * f + ph) * amp;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      /* la junta entre tablones */
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#4a2c18';
      ctx.fillRect(0, i * alto, S, 2);
      ctx.globalAlpha = 1;
    }
  }, 512);
}

export function texturaVapor(THREE) {
  return texturaCanvas(THREE, (ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
}

/* paredes según el escenario: cada una con su grano, porque un
   plano de color liso se lee como cartón */
export function texturaPared(THREE, tipo) {
  if (tipo === 'azulejo') return texturaAzulejos(THREE);
  if (tipo === 'adobe') {
    return texturaCanvas(THREE, (ctx, S) => {
      ctx.fillStyle = '#c9a173'; ctx.fillRect(0, 0, S, S);
      /* paja y grano del adobe */
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = ['rgba(255,235,190,.5)', 'rgba(120,80,40,.35)', 'rgba(90,60,30,.28)'][i % 3];
        const x = Math.random() * S, y = Math.random() * S;
        ctx.fillRect(x, y, 1 + Math.random() * 5, 1 + Math.random() * 1.6);
      }
      /* juntas horizontales del bloque */
      ctx.strokeStyle = 'rgba(90,58,28,.34)'; ctx.lineWidth = 3;
      for (let y = 0; y <= S; y += S / 3) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke(); }
    });
  }
  /* patio: cal verdosa con manchas de humedad */
  return texturaCanvas(THREE, (ctx, S) => {
    ctx.fillStyle = '#cddcc0'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(120,150,100,${0.05 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(Math.random() * S, Math.random() * S, 8 + Math.random() * 34, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function texturaPiso(THREE, tipo, a, b) {
  if (tipo === 'damero') {
    return texturaCanvas(THREE, (ctx, S) => {
      const T = S / 2;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 ? a : b;
        ctx.fillRect(x * T, y * T, T, T);
      }
    }, 128);
  }
  if (tipo === 'tierra') {
    return texturaCanvas(THREE, (ctx, S) => {
      ctx.fillStyle = a; ctx.fillRect(0, 0, S, S);
      for (let i = 0; i < 700; i++) {
        ctx.fillStyle = `rgba(60,35,15,${0.05 + Math.random() * 0.18})`;
        ctx.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 6, 2 + Math.random() * 4);
      }
    }, 128);
  }
  /* piedra de patio: lajas irregulares */
  return texturaCanvas(THREE, (ctx, S) => {
    ctx.fillStyle = b; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = 'rgba(90,90,85,.5)'; ctx.lineWidth = 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const T = S / 4, o = (y % 2) * T / 2;
      ctx.strokeRect(x * T + o - T, y * T, T - 2, T - 2);
    }
  }, 128);
}

/* color de vértice según la altura (t de 0 abajo a 1 arriba) */
function pintarAlto(THREE, geo, f) {
  const pos = geo.attributes.position;
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) - min.y) / ((max.y - min.y) || 1);
    const k = f(t);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/* color de vértice según la distancia al centro (u de 0 a 1) */
function pintarRadio(THREE, geo, R, f) {
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const u = Math.min(1, Math.hypot(pos.getX(i), pos.getY(i)) / R);
    const k = f(u);
    col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
}

/* ---------- el cuenco: batea y composta ----------
   Cuerpo abierto con un fondo que se llena. El disco de relleno
   sube conforme el jugador va echando cosas: es la única forma de
   que se vea que lo que sacaste fue a algún lado. */

registrar('cuenco', (THREE, opts = {}) => {
  const r = opts.radio || 0.44;
  const colorA = opts.colorA || token('--madera-300', '#d07c3f');
  const colorB = opts.colorB || token('--madera-500', '#93491c');
  const colorRelleno = opts.relleno || token('--maiz-300', '#ffc93c');

  const g = new THREE.Group();
  g.name = 'cuenco';

  /* VOLUMEN SIN TEXTURA: oclusión pintada en el color de vértice. Eran
     un cilindro y un disco de un solo tono, y por dentro se leían como
     un plato plano. Oscuro al fondo y claro al filo, por dentro y por
     fuera; y el fondo se ensombrece hacia la esquina donde toca la
     pared. Con tres anillos de alto y no uno: con uno solo el degradado
     no tiene dónde doblarse. */
  const geoCuerpo = new THREE.CylinderGeometry(r, r * 0.72, r * 0.62, 32, 3, true);
  pintarAlto(THREE, geoCuerpo, (t) => 0.5 + 0.5 * t * t * (3 - 2 * t));
  const cuerpo = new THREE.Mesh(geoCuerpo, mate(THREE, colorA, { side: THREE.DoubleSide, vertexColors: true }));
  cuerpo.position.y = r * 0.31;
  cuerpo.name = 'cuerpo';

  const geoFondo = new THREE.CircleGeometry(r * 0.72, 32);
  pintarRadio(THREE, geoFondo, r * 0.72, (u) => 0.82 - 0.30 * u * u);
  const fondo = new THREE.Mesh(geoFondo, mate(THREE, colorB, { vertexColors: true }));
  fondo.rotation.x = -Math.PI / 2;
  fondo.position.y = 0.012;
  fondo.name = 'fondo';

  /* el labio un poco más claro que el cuerpo: es lo que atrapa la luz
     y dibuja el borde del cuenco contra la mesa */
  const labio = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.075, 10, 40),
    mate(THREE, new THREE.Color(colorB).multiplyScalar(1.08)));
  labio.rotation.x = Math.PI / 2;
  labio.position.y = r * 0.62;
  labio.name = 'labio';

  g.add(cuerpo, fondo, labio);

  const relleno = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r * 0.72, 0.06, 32),
    mate(THREE, colorRelleno)
  );
  relleno.position.y = 0.04;
  relleno.scale.setScalar(0.001);
  relleno.visible = false;
  relleno.name = 'relleno';
  g.add(relleno);

  g.add(sombraBlob(THREE, r * 2.4, 0.008));
  g.userData.r = r;
  return g;
});

/* ---------- el puesto entero ----------
   Devuelve { grupo, vapores } — los vapores los anima el motor,
   porque su altura depende del reloj de la escena. */

export function construirCocina(THREE, MESA_Y, escenarioId) {
  const E = escenarioDe(escenarioId || POR_DEFECTO);
  const grupo = new THREE.Group();
  grupo.name = 'cocina';
  const vapores = [];

  const tiles = texturaPared(THREE, E.pared.tipo);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(E.pared.tipo === 'azulejo' ? 4 : 3, E.pared.tipo === 'azulejo' ? 3.4 : 2.6);
  /* El fondo iba a todo color y se comía la escena: pesaba más que
     la comida, que es justo al revés de lo que hace una foto de
     producto. El tinte de cada escenario lo manda hacia atrás. */
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(11, 9),
    new THREE.MeshLambertMaterial({ map: tiles, color: E.pared.tinte }));
  pared.position.set(0, 3.4, -1.9);
  pared.name = 'pared';
  grupo.add(pared);

  const pisoTex = texturaPiso(THREE, E.piso.tipo,
    token(E.piso.a, '#e8a469'), token(E.piso.b, '#e3dfd6'));
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  pisoTex.repeat.set(7, 5);
  /* el piso queda bajo el mesón, en su sombra: el damero claro era lo
     más brillante del borde de abajo y tiraba del ojo hacia afuera */
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshLambertMaterial({
    map: pisoTex, color: E.piso.tipo === 'tierra' ? '#b0a598' : '#8c7f72' }));
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(0, -0.02, 3);
  piso.name = 'piso';
  grupo.add(piso);

  /* el mesón: ancho y hondo, porque aquí se trabaja con las manos */
  const woodTop = texturaMadera(THREE, token(E.meson.base, '#d07c3f'), token(E.meson.veta, '#93491c'));
  woodTop.wrapS = woodTop.wrapT = THREE.RepeatWrapping;
  woodTop.repeat.set(2, 1.4);
  const meson = new THREE.Mesh(new THREE.BoxGeometry(9, 0.24, 3.9), new THREE.MeshLambertMaterial({ map: woodTop }));
  meson.position.set(0, MESA_Y - 0.12, 0.15);
  meson.name = 'meson';
  /* lo que está en la tabla y se sale de ella proyecta en el mesón */
  meson.receiveShadow = true;
  grupo.add(meson);

  /* frente del gabinete, para que el mesón no flote */
  /* EL BAJO-MESÓN SE LEE COMO SOMBRA. Era un rosa a croma plena con
     una cápsula amarilla centrada que parecía un botón del HUD. Sigue
     siendo del color del escenario, llevado a una luz fija y baja; en
     la cocina de azulejo, además, hacia la madera oscura (el rosa solo
     apagado se iba a burdeos). */
  const gab0 = token(E.gabinete, '#e01b6a');
  const gab1 = E.id === 'azulejo' ? mezclar(THREE, gab0, token('--madera-700', '#47220b'), 0.6) : gab0;
  const gabinete = new THREE.Mesh(new THREE.BoxGeometry(9, 2.6, 0.1), mate(THREE, aLuz(THREE, gab1, 0.24, 0.45)));
  gabinete.position.set(0, -0.46, 2.05);
  gabinete.name = 'gabinete';
  grupo.add(gabinete);
  [-2.9, 0, 2.9].forEach((x, i) => {
    const tir = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 10), mateToken(THREE, '--madera-600', '#6b3512'));
    tir.rotation.z = Math.PI / 2;
    tir.position.set(x, 0.56, 2.12);
    tir.name = 'tirador' + i;
    grupo.add(tir);
  });

  /* repisa con frascos, al fondo */
  const repisa = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.42), mateToken(THREE, '--madera-400', '#b4632c'));
  repisa.position.set(1.6, 2.42, -1.78);
  repisa.name = 'repisa';
  grupo.add(repisa);
  const frascoM = mateToken(THREE, '--peltre-200', '#f3f1ec');
  [[0.85, token('--rosa-400', '#f53d8a')], [1.35, token('--nopal-400', '#8cc63f')],
   [1.85, token('--maiz-400', '#f5a623')], [2.35, token('--talavera-300', '#5f97d8')]].forEach(([x, tapa], i) => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(.11, .12, .3, 14), frascoM);
    f.position.set(x, 2.62, -1.78);
    f.name = 'frasco' + i;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .06, 14), mate(THREE, tapa));
    t.position.set(x, 2.79, -1.78);
    t.name = 'tapaFrasco' + i;
    grupo.add(f, t);
  });

  /* la olla grande de la fanesca, al fondo a la izquierda, humeando:
     todo lo que preparas termina ahí, y se ve mientras trabajas */
  const olla = new THREE.Group();
  olla.name = 'ollaGrande';
  /* ABIERTA: era un cilindro cerrado cuya tapa tapaba el caldo, y se
     leía como un balde rojo con tapa. Y el rojo, un poco apagado: es
     el fondo, no la comida. */
  const cuerpoOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.56, 28, 1, true),
    mate(THREE, apagar(THREE, token('--chile-500', '#ce2029'), 1, 0.8), { side: THREE.DoubleSide }));
  cuerpoOlla.name = 'cuerpo';
  olla.add(cuerpoOlla);
  const borde = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.048, 8, 24), mateToken(THREE, '--peltre-100', '#ffffff'));
  borde.rotation.x = Math.PI / 2; borde.position.y = 0.28;
  borde.name = 'borde';
  olla.add(borde);
  [-1, 1].forEach((s, i) => {
    const asa = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.033, 8, 14, Math.PI), mateToken(THREE, '--peltre-100', '#ffffff'));
    asa.position.set(0.48 * s, 0.11, 0);
    asa.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2;
    asa.name = 'asa' + i;
    olla.add(asa);
  });
  const caldo = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.04, 24), mateToken(THREE, '--maiz-300', '#ffc93c'));
  caldo.position.y = 0.24;
  caldo.name = 'caldo';
  olla.add(caldo);
  olla.position.set(-1.55, MESA_Y + 0.28, -1.35);
  grupo.add(olla);

  const vaporTex = texturaVapor(THREE);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: vaporTex, transparent: true, opacity: 0 }));
    p.position.set(-1.55, MESA_Y + 0.8, -1.35);
    p.userData.fase = i / 3;
    p.name = 'vapor' + i;
    grupo.add(p);
    vapores.push(p);
  }

  /* ---------- la cocina que se ve DETRÁS ----------
     La referencia que pidió el jugador es una cocina de casa con
     cosas: ollas de barro en la repisa, un textil en el mesón, luz
     de ventana entrando de lado. Nada de esto se toca ni estorba —
     está para que el ingrediente tenga dónde estar. */

  /* ollas de barro en la repisa, de tres tamaños */
  const barro = [
    [-2.5, 0.20, '--madera-400'], [-1.95, 0.15, '--madera-500'],
    [-1.5, 0.24, '--madera-300'], [3.05, 0.18, '--madera-500'],
  ];
  barro.forEach(([x, r, tok], i) => {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), mateToken(THREE, tok, '#b4632c'));
    o.scale.y = 0.82;
    o.position.set(x, 2.5 + r * 0.8, -1.76);
    o.name = 'olla-barro' + i;
    grupo.add(o);
    const cuello = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.62, r * 0.34, 12), mateToken(THREE, '--madera-600', '#723713'));
    cuello.position.set(x, 2.5 + r * 1.5, -1.76);
    cuello.name = 'cuello-barro' + i;
    grupo.add(cuello);
  });
  /* la repisa se alarga para sostenerlas */
  const repisa2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.09, 0.42), mateToken(THREE, '--madera-400', '#b4632c'));
  repisa2.position.set(-2.0, 2.42, -1.78);
  repisa2.name = 'repisa2';
  grupo.add(repisa2);

  /* el textil andino sobre el mesón: la franja de color que en la
     referencia hace que la madera no sea un vacío café */
  /* EL TEXTIL, MÁS ANGOSTO Y MENOS ENCENDIDO. Era la franja más
     saturada de la pantalla, justo entre la tabla y los cuencos: el
     ojo se iba a él antes que a la comida. Sigue siendo andino, con
     sus colores llevados un trecho hacia la madera. */
  if (E.textil !== false) {
  const haciaMadera = (c) => mezclar(THREE, c, token('--madera-600', '#6b3512'), 0.45);
  const textilTex = texturaCanvas(THREE, (ctx, S) => {
    ctx.fillStyle = token('--madera-700', '#4b230b');
    ctx.fillRect(0, 0, S, S);
    const franjas = [
      token('--chile-500', '#ce2029'), token('--maiz-300', '#ffc93c'),
      token('--talavera-300', '#5f97d8'), token('--nopal-400', '#8cc63f'),
      token('--rosa-400', '#f53d8a'),
    ].map(haciaMadera);
    const h = S / 10;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = franjas[i % franjas.length];
      ctx.fillRect(0, i * h, S, h * 0.62);
      /* el rombo del tejido */
      ctx.fillStyle = 'rgba(255,255,255,.18)';
      for (let x = 0; x < S; x += h) {
        ctx.beginPath();
        ctx.moveTo(x + h / 2, i * h + h * 0.1);
        ctx.lineTo(x + h * 0.82, i * h + h * 0.31);
        ctx.lineTo(x + h / 2, i * h + h * 0.52);
        ctx.lineTo(x + h * 0.18, i * h + h * 0.31);
        ctx.closePath(); ctx.fill();
      }
    }
  }, 256);
  textilTex.wrapS = textilTex.wrapT = THREE.RepeatWrapping;
  textilTex.repeat.set(3, 1);
  const textil = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.40),
    new THREE.MeshLambertMaterial({ map: textilTex }));
  textil.rotation.x = -Math.PI / 2;
  textil.position.set(0, MESA_Y + 0.002, 1.72);
  textil.name = 'textil';
  grupo.add(textil);
  }

  /* la ventana por la izquierda: de ahí viene el sol, y verla
     explica la luz en vez de que caiga de la nada */
  if (E.ventana) {
  const luzVentana = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.0),
    new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.9 }));
  luzVentana.position.set(-3.5, 3.1, -1.86);
  luzVentana.name = 'ventana';
  grupo.add(luzVentana);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.08), mateToken(THREE, '--madera-600', '#723713'));
  marco.position.set(-3.5, 3.1, -1.9);
  marco.name = 'marco-ventana';
  grupo.add(marco);
  }

  /* ---------- la luz ----------
     Tres luces, y ninguna fuerte. El error fácil es una sola
     direccional potente: da un lado quemado y otro casi negro, y eso
     —más que el material— es lo que hace que todo parezca plástico
     duro. Un render de arcilla está iluminado como un bodegón de
     estudio: una luz principal suave, mucho relleno para que la
     sombra sea CLARA y no negra, y un contraluz que despega las
     cosas del fondo. */

  /* el cielo de la cocina: relleno envolvente, la que más aporta */
  grupo.add(new THREE.HemisphereLight(E.luz.cielo, colorDe(E.luz.suelo, '#b4632c'), E.luz.hemi));

  /* la principal: sol de ventana por la izquierda, suave y más cálido
     — la referencia es una cocina de tarde, no un quirófano */
  /* EL SOL PROYECTA SOMBRA. Hasta ahora nada la proyectaba: las vainas,
     el zapallo, el huevo y la sartén flotaban sobre la tabla, y nada
     decía de qué lado entra la luz. Una sola luz con sombra —ésta—,
     con su cámara ajustada a la tabla y nada más: el resto de la
     cocina no la necesita y en un teléfono cada metro cuenta.

     La dirección es la de siempre (desde la ventana, arriba a la
     izquierda y por delante), así que la sombra cae a la derecha y
     hacia atrás: nunca tapa la tabla delante del jugador. Sale CLARA
     —intensidad de escenario, ~0.8— porque una sombra negra es de
     render duro, no de arcilla.

     El tamaño del mapa lo pone el motor, que es quien sabe en qué
     teléfono está; qué piezas proyectan, también (marcarSombras). */
  const sol = new THREE.DirectionalLight(E.luz.sol, E.luz.solInt);
  sol.name = 'sol';
  const centro = new THREE.Vector3(0, MESA_Y, 0.62);
  sol.position.copy(centro).addScaledVector(new THREE.Vector3(-2.5, 5.5, 4).normalize(), 6);
  sol.target.position.copy(centro);
  sol.castShadow = true;
  sol.shadow.radius = 4;
  sol.shadow.intensity = E.luz.sombra ?? 0.78;
  sol.shadow.bias = -0.0006;
  sol.shadow.normalBias = 0.015;
  Object.assign(sol.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 2, far: 10 });
  sol.shadow.camera.updateProjectionMatrix();
  grupo.add(sol, sol.target);

  /* el foco de la faena: un punto tibio justo sobre la tabla, para
     que el ingrediente sea lo más brillante del cuadro y el ojo caiga
     ahí solo. Es el truco que separa "escena 3D" de "producto". */
  const foco = new THREE.PointLight(E.luz.foco, E.luz.focoInt, 6.5, 2);
  foco.position.set(0, MESA_Y + 2.1, 1.5);
  foco.name = 'foco-faena';
  grupo.add(foco);

  /* el relleno del otro lado: sin esto la cara derecha se apaga */
  const relleno = new THREE.DirectionalLight(E.luz.relleno || '#e8f0ff', E.luz.rellenoInt ?? 0.34);
  relleno.position.set(3.5, 2.2, 2.5);
  grupo.add(relleno);

  /* el contraluz: un filo de luz por detrás que separa el ingrediente
     del azulejo del fondo, como el borde claro de la refri en una
     foto de estudio */
  const contra = new THREE.DirectionalLight('#ffffff', 0.4);
  contra.position.set(0.5, 3.5, -4);
  grupo.add(contra);

  return { grupo, vapores };
}
