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
import { token, mate, mateToken } from './paleta.js';
import { sombraBlob } from './utileria.js';

/* ---------- texturas pintadas a canvas ---------- */

function texturaCanvas(THREE, dibuja, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  dibuja(c.getContext('2d'), size);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

export function texturaAzulejos(THREE) {
  return texturaCanvas(THREE, (ctx, S) => {
    const T = S / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? token('--talavera-500', '#1b5faa') : token('--talavera-300', '#5f97d8');
      ctx.fillRect(x * T, y * T, T, T);
      ctx.fillStyle = 'rgba(255,255,255,.28)';
      ctx.fillRect(x * T + 4, y * T + 4, T - 8, T * 0.28);
      ctx.strokeStyle = token('--talavera-700', '#123f74');
      ctx.lineWidth = 4;
      ctx.strokeRect(x * T + 2, y * T + 2, T - 4, T - 4);
    }
  });
}

export function texturaMadera(THREE, base, veta) {
  return texturaCanvas(THREE, (ctx, S) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = veta; ctx.lineWidth = 3; ctx.globalAlpha = .5;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y = (i + .5) * S / 9;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(S * .3, y - 8, S * .6, y + 8, S, y);
      ctx.stroke();
    }
  });
}

export function texturaVapor(THREE) {
  return texturaCanvas(THREE, (ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 4, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }, 64);
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

  const cuerpo = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 0.72, r * 0.62, 22, 1, true),
    mate(THREE, colorA, { side: THREE.DoubleSide })
  );
  cuerpo.position.y = r * 0.31;
  cuerpo.name = 'cuerpo';

  const fondo = new THREE.Mesh(new THREE.CircleGeometry(r * 0.72, 22), mate(THREE, colorB));
  fondo.rotation.x = -Math.PI / 2;
  fondo.position.y = 0.012;
  fondo.name = 'fondo';

  const labio = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.075, 8, 24), mate(THREE, colorB));
  labio.rotation.x = Math.PI / 2;
  labio.position.y = r * 0.62;
  labio.name = 'labio';

  g.add(cuerpo, fondo, labio);

  const relleno = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r * 0.72, 0.06, 22),
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

export function construirCocina(THREE, MESA_Y) {
  const grupo = new THREE.Group();
  grupo.name = 'cocina';
  const vapores = [];

  const tiles = texturaAzulejos(THREE);
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  tiles.repeat.set(4, 3.4);
  /* El azulejo iba a todo color y se comía la escena: el fondo
     pesaba más que la comida, que es justo al revés de lo que hace
     una foto de producto. Se le baja el brillo con un tinte cálido
     —sigue siendo talavera, pero se queda atrás. */
  const pared = new THREE.Mesh(new THREE.PlaneGeometry(11, 9),
    new THREE.MeshLambertMaterial({ map: tiles, color: '#b3a08b' }));
  pared.position.set(0, 3.4, -1.9);
  pared.name = 'pared';
  grupo.add(pared);

  const pisoTex = texturaCanvas(THREE, (ctx, S) => {
    const T = S / 2;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      ctx.fillStyle = (x + y) % 2 ? token('--madera-200', '#e8a469') : token('--peltre-300', '#e3dfd6');
      ctx.fillRect(x * T, y * T, T, T);
    }
  }, 128);
  pisoTex.wrapS = pisoTex.wrapT = THREE.RepeatWrapping;
  pisoTex.repeat.set(7, 5);
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), new THREE.MeshLambertMaterial({ map: pisoTex }));
  piso.rotation.x = -Math.PI / 2;
  piso.position.set(0, -0.02, 3);
  piso.name = 'piso';
  grupo.add(piso);

  /* el mesón: ancho y hondo, porque aquí se trabaja con las manos */
  const woodTop = texturaMadera(THREE, token('--madera-300', '#d07c3f'), token('--madera-500', '#93491c'));
  const meson = new THREE.Mesh(new THREE.BoxGeometry(9, 0.24, 3.9), new THREE.MeshLambertMaterial({ map: woodTop }));
  meson.position.set(0, MESA_Y - 0.12, 0.15);
  meson.name = 'meson';
  grupo.add(meson);

  /* frente del gabinete, para que el mesón no flote */
  const gabinete = new THREE.Mesh(new THREE.BoxGeometry(9, 2.6, 0.1), mateToken(THREE, '--rosa-500', '#e01b6a'));
  gabinete.position.set(0, -0.46, 2.05);
  gabinete.name = 'gabinete';
  grupo.add(gabinete);
  [-2.9, 0, 2.9].forEach((x, i) => {
    const tir = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 10), mateToken(THREE, '--maiz-400', '#f5a623'));
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
  const cuerpoOlla = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 0.56, 24), mateToken(THREE, '--chile-500', '#ce2029'));
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
  const textilTex = texturaCanvas(THREE, (ctx, S) => {
    ctx.fillStyle = token('--madera-700', '#4b230b');
    ctx.fillRect(0, 0, S, S);
    const franjas = [
      token('--chile-500', '#ce2029'), token('--maiz-300', '#ffc93c'),
      token('--talavera-300', '#5f97d8'), token('--nopal-400', '#8cc63f'),
      token('--rosa-400', '#f53d8a'),
    ];
    const h = S / 10;
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = franjas[i % franjas.length];
      ctx.fillRect(0, i * h, S, h * 0.62);
      /* el rombo del tejido */
      ctx.fillStyle = 'rgba(255,255,255,.32)';
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
  const textil = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.62),
    new THREE.MeshLambertMaterial({ map: textilTex }));
  textil.rotation.x = -Math.PI / 2;
  textil.position.set(0, MESA_Y + 0.002, 1.72);
  textil.name = 'textil';
  grupo.add(textil);

  /* la ventana por la izquierda: de ahí viene el sol, y verla
     explica la luz en vez de que caiga de la nada */
  const luzVentana = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.0),
    new THREE.MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0.9 }));
  luzVentana.position.set(-3.5, 3.1, -1.86);
  luzVentana.name = 'ventana';
  grupo.add(luzVentana);
  const marco = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 0.08), mateToken(THREE, '--madera-600', '#723713'));
  marco.position.set(-3.5, 3.1, -1.9);
  marco.name = 'marco-ventana';
  grupo.add(marco);

  /* ---------- la luz ----------
     Tres luces, y ninguna fuerte. El error fácil es una sola
     direccional potente: da un lado quemado y otro casi negro, y eso
     —más que el material— es lo que hace que todo parezca plástico
     duro. Un render de arcilla está iluminado como un bodegón de
     estudio: una luz principal suave, mucho relleno para que la
     sombra sea CLARA y no negra, y un contraluz que despega las
     cosas del fondo. */

  /* el cielo de la cocina: relleno envolvente, la que más aporta */
  grupo.add(new THREE.HemisphereLight('#fff3dc', token('--madera-400', '#b4632c'), 1.42));

  /* la principal: sol de ventana por la izquierda, suave y más cálido
     — la referencia es una cocina de tarde, no un quirófano */
  const sol = new THREE.DirectionalLight('#ffe6bd', 1.45);
  sol.position.set(-2.5, 5.5, 4);
  grupo.add(sol);

  /* el foco de la faena: un punto tibio justo sobre la tabla, para
     que el ingrediente sea lo más brillante del cuadro y el ojo caiga
     ahí solo. Es el truco que separa "escena 3D" de "producto". */
  const foco = new THREE.PointLight('#ffd9a0', 1.05, 6.5, 2);
  foco.position.set(0, MESA_Y + 2.1, 1.5);
  foco.name = 'foco-faena';
  grupo.add(foco);

  /* el relleno del otro lado: sin esto la cara derecha se apaga */
  const relleno = new THREE.DirectionalLight('#e8f0ff', 0.34);
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
