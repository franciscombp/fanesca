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
import { COMIDA, mate } from './paleta.js';
import { achatar, abollar, forma } from './organico.js';
import { lienzo, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
export const COLORES = {
  agua_clara: '#6fa3aa',      /* el agua limpia: verde-azulada, no salmón */
  agua_jabon: '#e6e8e0',      /* hacia dónde se enturbia la de la quinua */
  batea_clara: '#b07a45',     /* la batea es de madera, no el cuenco naranja de las esquinas */
  batea_oscura: '#8a5a30',
  burbuja: '#fdfcf6',
  burbuja_sombra: '#eef3ee',
};

export const RADIO_BATEA = 0.66;

/* LA PARED DE LA BATEA a la altura y (local de la batea): el cuenco
   va de r·0.72 en el fondo a r en el borde, a r·0.62 de alto. Con
   esto se dimensionan el agua, la espuma y el montón de granos, para
   que nada atraviese la madera. La usa también mote.js. */
export const pared = (y, r = RADIO_BATEA) => r * (0.72 + 0.28 * y / (r * 0.62));

/* ---------- EL AGUA ----------
   Era un cilindro brillante y translúcido de un solo tono, y encima
   del fondo naranja se leía como un disco salmón: sin línea de agua,
   sin borde, sin nada que dijera «líquido». Ahora es una sola
   superficie con tres cosas en el propio shader (sin mallas de más):

     · fresnel: más opaca y clara de canto, como el agua de verdad;
     · el menisco: la línea clara donde el agua toca la pared;
     · la turbiedad: el nivel sigue moviendo material.opacity como
       siempre, y aquí esa opacidad se traduce a cuánto se enturbia
       (o0 → limpia, o1 → turbia). La del mote, además, se nubla de
       cal con manchas y motitas de hollejo (`nube`).

   Es una subclase con onBeforeCompile y copy() propios porque el
   mote clona el material: Material.clone() hace new Constructor() SIN
   argumentos y copy(), así que lo de cada agua viaja en copy(). */
let ClaseAgua = null;
export function materialAgua(THREE, opts = {}) {
  if (!ClaseAgua) {
    ClaseAgua = class MaterialAgua extends THREE.MeshPhongMaterial {
      constructor(p) {
        super(p);
        this.agua = { o0: 0.42, o1: 0.7, a0: 0.16, a1: 0.8, nube: 0, jabon: 0, rad: 0.55 };
        this.nube = null;
      }
      copy(src) {
        super.copy(src);
        if (src.agua) this.agua = { ...src.agua };
        this.nube = src.nube || null;
        return this;
      }
      onBeforeCompile(sh) {
        const A = this.agua;
        sh.uniforms.uTurb = { value: new THREE.Vector4(A.o0, A.o1, A.a0, A.a1) };
        sh.uniforms.uAgua = { value: new THREE.Vector3(A.nube, A.jabon, A.rad) };
        sh.uniforms.tNube = { value: this.nube };
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec2 vAguaXZ;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAguaXZ = position.xz;');
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform vec4 uTurb; uniform vec3 uAgua; uniform sampler2D tNube; varying vec2 vAguaXZ;')
          .replace('#include <opaque_fragment>', `
            float frA = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.0);
            float turb = clamp((opacity - uTurb.x) / (uTurb.y - uTurb.x), 0.0, 1.0);
            float nb = texture2D(tNube, vAguaXZ * 1.3).r;
            float kn = turb * uAgua.x;
            float men = smoothstep(0.92, 0.995, length(vAguaXZ) / uAgua.z);
            outgoingLight *= mix(1.0, 0.85 + 0.3 * nb, kn);
            outgoingLight = mix(outgoingLight, vec3(0.90, 0.91, 0.88), turb * uAgua.y);
            outgoingLight = mix(outgoingLight, vec3(0.93, 0.95, 0.94), clamp(frA * 0.55 + men * 0.5, 0.0, 1.0));
            diffuseColor.a = clamp(mix(uTurb.z, uTurb.w, turb) * mix(1.0, 0.55 + 0.9 * nb, kn) + frA * 0.5 + men * 0.3, 0.0, 0.97);
            #include <opaque_fragment>`);
      }
      customProgramCacheKey() { return 'agua-v1'; }
    };
  }
  const { agua, ...matOpts } = opts;
  const m = new ClaseAgua({ transparent: true, depthWrite: false, shininess: 90, specular: '#ffffff', ...matOpts });
  Object.assign(m.agua, agua || {});
  m.nube = texNube(THREE);
  return m;
}

/* la nube de cal: manchas suaves y motitas de hollejo, que repiten
   sin costura (cada mancha se dibuja en sus nueve desfases). Escala
   de grises: el color lo pone el nivel. La quinua la lleva también
   —un solo programa para las dos aguas— pero con nube 0 no se ve. */
function texNube(THREE) {
  return lienzo(THREE, 'nube-cal', 256, (x, S) => {
    const az = azarCon(5);
    x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
    const nueve = (f) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) f(dx * S, dy * S); };
    for (let i = 0; i < 110; i++) {
      const px = az() * S, py = az() * S, rr = 10 + az() * 40, v = az() < 0.5 ? 255 : 0;
      nueve((ox, oy) => {
        const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rr);
        g.addColorStop(0, `rgba(${v},${v},${v},0.22)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
        x.fillStyle = g; x.fillRect(px + ox - rr, py + oy - rr, rr * 2, rr * 2);
      });
    }
    x.fillStyle = 'rgba(70,60,40,0.5)';
    for (let i = 0; i < 160; i++) {
      x.beginPath(); x.ellipse(az() * S, az() * S, 1.5 + az() * 2, 1 + az(), az() * 3, 0, Math.PI * 2); x.fill();
    }
  }, { repetir: true, datos: true });
}

/* la superficie del agua a la altura yTop de la batea, para una malla
   puesta en y = 0.12 (donde el nivel la mece) */
export function superficieAgua(THREE, r, yTop) {
  return forma('agua-batea:' + Math.round(r * 100) + ':' + Math.round(yTop * 100), () => {
    const d = new THREE.CircleGeometry(pared(yTop, r) - 0.01, 64);
    d.rotateX(-Math.PI / 2);
    d.translate(0, yTop - 0.12, 0);
    return d;
  });
}

/* la burbuja vista desde arriba: anillo apenas más oscuro y el brillo
   arriba a la izquierda */
function texBurbuja(THREE) {
  return lienzo(THREE, 'burbuja', 64, (x, S) => {
    const R = S / 2;
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    const g = x.createRadialGradient(R, R, R * 0.6, R, R, R);
    g.addColorStop(0, 'rgba(200,210,205,0)'); g.addColorStop(0.7, 'rgba(190,200,196,0.55)'); g.addColorStop(1, 'rgba(225,230,228,0.2)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(255,255,255,0.95)';
    x.beginPath(); x.ellipse(R * 0.68, R * 0.62, R * 0.2, R * 0.12, -0.6, 0, Math.PI * 2); x.fill();
  });
}

/* el grano visto en montón: granitos crudos en grises (el tono lo pone
   material.color, que el nivel va aclarando) */
function texLecho(THREE) {
  const t = lienzo(THREE, 'lecho-quinua', 256, (x, S) => {
    const az = azarCon(23);
    x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) {
      const v = 210 + (az() * 45) | 0;
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.beginPath(); x.ellipse(az() * S, az() * S, 2 + az(), 1.6 + az() * 0.8, az() * 3, 0, Math.PI * 2); x.fill();
    }
  }, { repetir: true });
  t.repeat.set(2, 2);
  return t;
}

registrar('batea-quinua', (THREE, opts = {}) => {
  const r = opts.radio || RADIO_BATEA;
  const g = new THREE.Group();
  g.name = 'batea-quinua';

  /* madera y no el naranja de los cuencos de las esquinas: así la
     batea de lavar se distingue de un vistazo, y bajo el agua el
     fondo pardo deja de teñirla de salmón */
  const cuenco = pieza('cuenco', THREE, { radio: r, colorA: COLORES.batea_clara, colorB: COLORES.batea_oscura });
  cuenco.name = 'cuenco';
  g.add(cuenco);

  /* LOS GRANOS: un montículo texturado y una capa de granitos encima,
     en dos llamadas de dibujo (eran 46 fichas sueltas). El borde del
     montón toca el fondo del cuenco, y la cima queda bajo el agua.
     Cada hijo tiene su material con .color, que el nivel aclara. */
  const granos = new THREE.Group();
  granos.name = 'granos';
  granos.position.y = 0.05;
  const RL = pared(0.012, r) - 0.008;
  const alto = (d) => -0.038 + 0.075 * Math.pow(Math.max(0, 1 - (d / RL) * (d / RL)), 1.5);
  const geoL = forma('lecho-quinua:' + Math.round(r * 100), () => {
    const l = new THREE.RingGeometry(0.001, RL, 48, 6);
    l.rotateX(-Math.PI / 2);
    const pos = l.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, alto(Math.hypot(pos.getX(i), pos.getZ(i))));
    l.computeVertexNormals();
    return abollar(l, { fuerza: 0.006, escala: 9, semilla: 31 });
  });
  const lecho = new THREE.Mesh(geoL, mate(THREE, COMIDA.quinua, { map: texLecho(THREE) }));
  lecho.name = 'lecho';
  lecho.userData.ignorar = true;
  granos.add(lecho);

  const geoG = forma('grano-quinua-capa', () =>
    achatar(new THREE.SphereGeometry(1, 7, 6), { desde: -0.5, dureza: 0.5 }));
  const NG = 90;
  const capa = new THREE.InstancedMesh(geoG, mate(THREE, COMIDA.quinua), NG);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), E = new THREE.Vector3();
  const Y = new THREE.Vector3(0, 1, 0), C = new THREE.Color();
  const az = azarCon(9);
  for (let i = 0; i < NG; i++) {
    /* espiral de oro: reparte sin apelotonar y sin dibujar anillos */
    const a = i * 2.399963;
    const rad = Math.sqrt((i + 0.5) / NG) * RL * 0.88;
    P.set(Math.cos(a) * rad, alto(rad) + 0.008, Math.sin(a) * rad);
    Q.setFromAxisAngle(Y, a);
    const k = 0.85 + az() * 0.3;
    E.set(0.026 * k, 0.016 * k, 0.026 * k);
    capa.setMatrixAt(i, M.compose(P, Q, E));
    const v = 0.86 + az() * 0.14;
    capa.setColorAt(i, C.setRGB(v, v, v));
  }
  capa.name = 'capa';
  capa.userData.ignorar = true;
  capa.userData.sombra = false;
  capa.computeBoundingSphere();
  granos.add(capa);
  g.add(granos);

  /* El agua: una superficie, no un cilindro. El radio va ajustado a la
     pared del cuenco a ESA altura y no al borde de arriba — con 0.9r el
     disco asomaba por fuera de la batea y se veía un aro pálido
     rodeándola, como si el agua flotara alrededor en vez de estar
     dentro. El nivel la mece con base 0.11: el agua queda en ≈0.19. */
  const agua = new THREE.Mesh(
    superficieAgua(THREE, r, 0.2),
    materialAgua(THREE, { color: COLORES.agua_clara, opacity: 0.55,
      agua: { o0: 0.42, o1: 0.7, a0: 0.16, a1: 0.8, nube: 0, jabon: 0.55, rad: pared(0.2, r) - 0.01 } })
  );
  agua.position.y = 0.12;
  agua.name = 'agua';
  agua.userData.ignorar = true;
  g.add(agua);

  /* LA ESPUMA: burbujas, no una tapa de yeso. Domos instanciados (una
     llamada de dibujo; eran 34) cargados a la orilla, donde la espuma
     se junta. Con un tope duro contra la pared: las burbujas grandes
     de la orilla la atravesaban y salían manchas blancas por fuera de
     la batea. Los uv van planos, vistos desde arriba, para que la
     textura de burbuja (anillo y brillo) se lea como burbuja y no
     como franjas. */
  const yEsp = 0.195;
  const espuma = new THREE.Group();
  espuma.name = 'espuma';
  espuma.position.y = yEsp;
  espuma.visible = false;
  const geoB = forma('domo-burbuja', () => {
    const d = new THREE.SphereGeometry(1, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const pos = d.attributes.position, uv = d.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, 0.5 - pos.getZ(i) / 2);
    return d;
  });
  const NB = 70;
  const burbujas = new THREE.InstancedMesh(geoB,
    mate(THREE, COLORES.burbuja, { transparent: true, opacity: 0.9, map: texBurbuja(THREE), depthWrite: false }), NB);
  const tope = pared(yEsp, r) - 0.012;
  const sombra = new THREE.Color(COLORES.burbuja_sombra), blanco = new THREE.Color('#ffffff');
  for (let i = 0; i < NB; i++) {
    const a = i * 2.399963;
    const h = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const sz = 0.025 + 0.05 * h * h;
    const rad = Math.min(Math.pow((i + 0.5) / NB, 0.35) * tope, tope - sz);
    P.set(Math.cos(a) * rad, (i % 3) * 0.004, Math.sin(a) * rad);
    Q.identity();
    E.set(sz, sz * 0.6, sz);
    burbujas.setMatrixAt(i, M.compose(P, Q, E));
    burbujas.setColorAt(i, C.copy(blanco).lerp(sombra, h));
  }
  burbujas.name = 'burbujas';
  burbujas.userData.ignorar = true;
  burbujas.userData.sombra = false;
  burbujas.computeBoundingSphere();
  espuma.add(burbujas);
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
