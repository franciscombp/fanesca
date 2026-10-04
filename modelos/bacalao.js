/* ============================================================
   FANESCA — modelos/bacalao.js
   La presa de bacalao con su sal encima, y la tina donde se pone
   a remojar.

   La presa es la única pieza del juego que CAMBIA de material en
   vivo: al quitarle toda la sal, la carne pasa de salada
   (amarillenta) a limpia (casi blanca). Por eso su carne se
   llama 'carne' — el nivel la busca por nombre y le cambia el
   material, y eso funciona igual si la presa viene de Blender.

   PARTES NOMBRADAS (para que un .glb encaje)
     presa-bacalao → 'carne'  (la que se aclara al desalarse; la piel
                     va pintada en su color de vértice)
                     'costra' (la sal pegada; nace escondida y el
                     nivel la enciende y la apaga al frotar)
     grano-sal     → una malla suelta
     tina          → 'cuerpo', 'filo', 'agua'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate } from './paleta.js';
import { abollar, forma } from './organico.js';
import { pintar, lienzo, azarCon } from './pintura.js';
import { sombraBlob } from './utileria.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  /* la piel del lomo y de abajo, gris parda: se ve al levantar la
     presa y por el canto trasero */
  bacalao_piel_canto: '#8e8a80',
  /* los cristales de sal: blancos con un brillo duro de cristal */
  sal_brillo: '#ffffff',
  sal_fondo: '#3a3a36',
  /* el agua de la tina, del centro hondo al filo bajito */
  agua_hondo: '#4f8fae',
  agua_filo: '#9cc8d6',
  /* oscuro a propósito: la luz de la ventana entra rasante y un
     specular claro lavaba el agua entera a gris hielo */
  agua_brillo: '#6f8a94',
};

/* el color de la carne ya desalada: lo pide el nivel para el cambio */
export const CARNE_SALADA = COMIDA.bacalao_carne;
export const CARNE_LIMPIA = COMIDA.bacalao_carne_limpia;

/* ---------- LAS TEXTURAS (una por sesión, con lienzo) ---------- */

/* LAS LASCAS: el bacalao cocido se abre en hojuelas, y esas hojuelas
   (los miómeros) se ven en la carne cruda como chevrones. Eso lo hace
   pescado y no pan pita con rayas. Alfas bajas: más fuertes se leía
   estampado. */
function texturaLascas(THREE) {
  return lienzo(THREE, 'bacalao-lascas', 256, (x, S) => {
    const r = azarCon(41);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 400; i++) {
      x.strokeStyle = `rgba(190,160,115,${0.04 + r() * 0.06})`; x.lineWidth = 1;
      const y = r() * S, x0 = r() * S;
      x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + 6 + r() * 12, y + (r() - 0.5) * 2); x.stroke();
    }
    for (let i = 0; i < 9; i++) {
      const x0 = 14 + i * 29 + (r() - 0.5) * 8, c = 16 + r() * 10;
      /* un cuarto de los tramos se corta: la lasca no es una regla */
      const tramos = [[0, 0.5], [0.5, 1]].filter(() => r() > 0.25);
      tramos.forEach(([a, b]) => {
        const y0 = a * S, y1 = b * S, ym = (y0 + y1) / 2;
        x.strokeStyle = 'rgba(165,128,82,.18)'; x.lineWidth = 2.2;
        x.beginPath(); x.moveTo(x0 + (a ? 4 : 0), y0); x.quadraticCurveTo(x0 + c, ym, x0 + (b < 1 ? 4 : 0), y1); x.stroke();
        x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 1.4;
        x.beginPath(); x.moveTo(x0 + 3 + (a ? 4 : 0), y0); x.quadraticCurveTo(x0 + 3 + c, ym, x0 + 3 + (b < 1 ? 4 : 0), y1); x.stroke();
      });
    }
    /* el borde reseco, más amarillo */
    const g = x.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(210,175,110,0)'); g.addColorStop(1, 'rgba(210,175,110,.22)');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  });
}

/* la costra de sal: blanca y transparente, a manchones y granitos */
function texturaCostra(THREE) {
  return lienzo(THREE, 'bacalao-costra', 256, (x, S) => {
    const r = azarCon(43);
    x.clearRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) {
      const cx = S / 2 + (r() - 0.5) * S * 0.8, cy = S / 2 + (r() - 0.5) * S * 0.8, R = 4 + r() * 14;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, `rgba(255,255,255,${0.35 + r() * 0.35})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
    for (let i = 0; i < 500; i++) {
      x.fillStyle = 'rgba(255,255,255,.9)';
      x.fillRect(S / 2 + (r() - 0.5) * S * 0.85, S / 2 + (r() - 0.5) * S * 0.85, 1.5, 1.5);
    }
  });
}

/* el agua de la tina: honda al centro y clara hacia el filo, con
   anillos de onda y cáusticas. El nivel la mece corriendo el offset,
   y puede: esta clave solo la usa la tina */
function texturaAgua(THREE) {
  return lienzo(THREE, 'tina-agua', 256, (x, S) => {
    const r = azarCon(47);
    const g = x.createRadialGradient(S / 2, S / 2, 6, S / 2, S / 2, S / 2);
    const media = new THREE.Color(COMIDA.agua_tina).getStyle();
    g.addColorStop(0, COLORES.agua_hondo); g.addColorStop(0.7, media); g.addColorStop(1, COLORES.agua_filo);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const R = 20 + r() * 40;
      x.strokeStyle = `rgba(255,255,255,${0.1 + r() * 0.08})`;
      x.beginPath(); x.ellipse(S * (0.25 + r() * 0.5), S * (0.25 + r() * 0.5), R, R * 0.8, r() * 3, 0, 7); x.stroke();
    }
    x.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = 'rgba(255,255,255,.12)';
      x.beginPath(); x.moveTo(r() * S, r() * S);
      x.bezierCurveTo(r() * S, r() * S, r() * S, r() * S, r() * S, r() * S); x.stroke();
    }
  }, { repetir: true });
}

/* LA LONJA. Planta de superelipse (p 3.2): los cantos rectos de un
   trozo cortado y no el óvalo de un pan. Las caras de arriba y abajo
   se aplanan. La caja exterior sigue siendo .62×.14×.4 con la escala
   de la malla: en los ejes la superelipse mide 1, igual que la
   esfera (el frotado, los huecos de la tina y el caldero la miden). */
function geoLonja(THREE) {
  return forma('bacalao-lonja', () => {
    const s = new THREE.SphereGeometry(1, 20, 12);
    const p = s.attributes.position;
    const P = 3.2;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (Math.hypot(x, z) > 1e-6) {
        const th = Math.atan2(z, x);
        const R = Math.pow(Math.pow(Math.abs(Math.cos(th)), P) + Math.pow(Math.abs(Math.sin(th)), P), -1 / P);
        x *= R; z *= R;
      }
      if (Math.abs(y) > 0.7) y = Math.sign(y) * (0.7 + (Math.abs(y) - 0.7) * 0.3);
      p.setXYZ(i, x, y, z);
    }
    p.needsUpdate = true;
    s.computeVertexNormals();
    abollar(s, { fuerza: 0.1, escala: 2.8, semilla: 31 });
    /* uv plana desde arriba, sin salirse de [0,1] en los ejes */
    const uv = s.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * 0.5 + 0.5, p.getZ(i) * 0.5 + 0.5);
    uv.needsUpdate = true;
    /* LA PIEL, pintada y no pegada: el canto trasero y la cara de
       abajo. La media esfera gris de antes asomaba detrás como una
       ceja flotante y costaba una llamada por presa */
    const piel = new THREE.Color(COLORES.bacalao_piel_canto);
    return pintar(THREE, s, (c, i, x, y, z) => {
      let k = Math.max(0, Math.min(1, (-z - 0.55) / 0.3)) * (y > -0.3 ? 1 : 0);
      if (y < -0.55) k = Math.max(k, Math.min(1, (-y - 0.55) / 0.2));
      c.lerp(piel, 0.85 * k);
    });
  });
}

registrar('presa-bacalao', (THREE) => {
  const g = new THREE.Group();
  g.name = 'presa';
  const geo = geoLonja(THREE);
  /* material PROPIO por presa: el nivel le cambia el color al desalar */
  const carne = new THREE.Mesh(geo, mate(THREE, CARNE_SALADA, { map: texturaLascas(THREE), vertexColors: true }));
  carne.scale.set(0.31, 0.07, 0.2);
  carne.name = 'carne';

  /* LA COSTRA DE SAL: la misma lonja, un pelo más grande, con sal
     pintada y transparente. El nivel le baja la opacidad a medida que
     se frota; nace escondida para que la presa que va al caldero (ya
     desalada) no la traiga, y escondida no cuesta llamada. */
  const costra = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
    map: texturaCostra(THREE), transparent: true, depthWrite: false,
  }));
  costra.scale.set(0.313, 0.0707, 0.202);
  costra.renderOrder = 2;
  costra.visible = false;
  costra.name = 'costra';
  costra.userData.ignorar = true;

  g.add(carne, costra);
  return g;
});

/* los cristales de sal, que son el trabajo del nivel: octaedros que
   destellan como cristal, no cubitos de confeti. El material es de
   todos los granos (compartida: tirar() no lo desecha) */
let matSal = null;
registrar('grano-sal', (THREE) => {
  if (!matSal) {
    matSal = new THREE.MeshPhongMaterial({
      color: COMIDA.sal, specular: COLORES.sal_brillo, shininess: 70, emissive: COLORES.sal_fondo,
    });
    matSal.userData.compartida = true;
  }
  const s = new THREE.Mesh(forma('grano-sal', () => new THREE.OctahedronGeometry(0.02, 0)), matSal);
  s.scale.set(1.1, 0.75, 1.1);
  s.name = 'sal';
  s.userData.ignorar = true;
  return s;
});

/* ---------- la tina de remojo ----------
   Al fondo de la tabla, donde hasta la 2.4 hubo un cordel: el
   bacalao no se orea, se REMOJA — desde la víspera, cambiando el
   agua, que es como se le saca la sal de verdad. Una lavacara ancha
   y baja, de peltre crema con el filo azul, con el agua adentro.
   Ovalada a propósito (más ancha que honda): las presas se echan
   una junto a otra y tienen que caber todas sin que la tina se
   coma la tabla.

   PARTES NOMBRADAS
     tina → 'cuerpo', 'filo', 'agua'
   `userData.nivelAgua` es la altura de la superficie: el nivel
   apoya ahí las presas para que floten y no se hundan. */
registrar('tina', (THREE, opts = {}) => {
  const ancho = opts.ancho || 1.15;   /* semieje en x */
  const hondo = opts.hondo || 0.5;    /* semieje en z */
  const alto = opts.alto || 0.24;
  const g = new THREE.Group();
  g.name = 'tina';

  /* la pared más oscura hacia el fondo: sin eso era una bandeja sin
     profundidad. El cilindro está centrado: y va de −alto/2 a alto/2 */
  const geoCuerpo = pintar(THREE, new THREE.CylinderGeometry(1, 0.84, alto, 28, 2, true), (c, i, x, y) => {
    c.setScalar(0.7 + 0.3 * ((y + alto / 2) / alto));
  });
  const cuerpo = new THREE.Mesh(geoCuerpo,
    mate(THREE, COMIDA.peltre, { side: THREE.DoubleSide, vertexColors: true }));
  cuerpo.scale.set(ancho, 1, hondo);
  cuerpo.position.y = alto / 2;
  cuerpo.name = 'cuerpo';

  const fondo = new THREE.Mesh(new THREE.CircleGeometry(0.84, 28), mate(THREE, COMIDA.peltre_sombra));
  fondo.rotation.x = -Math.PI / 2;
  fondo.scale.set(ancho, hondo, 1);
  fondo.position.y = 0.012;
  fondo.userData.ignorar = true;

  /* el filo azul, la firma del peltre */
  const filo = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 6, 48), mate(THREE, COMIDA.peltre_filo));
  filo.rotation.x = Math.PI / 2;
  filo.scale.set(ancho, hondo, 1);
  filo.position.y = alto;
  filo.name = 'filo';
  filo.userData.ignorar = true;

  const nivelAgua = alto * 0.72;
  /* el agua más azul que la de las bateas: sobre el peltre crema, el
     agua clarita de siempre desaparecía y la tina parecía un plato */
  /* y con brillo DURO: el agua es la única superficie del mesón donde
     un reflejo chico y blanco es lo correcto */
  const agua = new THREE.Mesh(
    new THREE.CircleGeometry(0.97, 40),
    new THREE.MeshPhongMaterial({
      color: '#ffffff', map: texturaAgua(THREE), transparent: true, opacity: 0.85,
      shininess: 90, specular: COLORES.agua_brillo,
    })
  );
  agua.rotation.x = -Math.PI / 2;
  agua.scale.set(ancho, hondo, 1);
  agua.position.y = nivelAgua;
  agua.name = 'agua';
  agua.userData.ignorar = true;

  /* la sombra de contacto en el mesón, ovalada como la tina */
  const sombra = sombraBlob(THREE, 2.6, 0.006);
  sombra.scale.y = 0.45;

  g.add(cuerpo, fondo, filo, agua, sombra);
  g.userData.nivelAgua = nivelAgua;
  return g;
});
