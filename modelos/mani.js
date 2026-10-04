/* ============================================================
   FANESCA — modelos/mani.js
   La piedra de moler, su mano, el grano de maní y la pasta.

   La piedra es una batea de piedra: no es una tabla plana, tiene
   el centro hundido de tanto uso. Ese hueco es información de
   juego —es donde el grano se queda quieto y donde de verdad se
   muele— así que se modela, no se pinta.

   El maní es UNA pieza con cintura, forrado en su piel colorada y
   con parches donde la piel se descascara y asoma el grano crema. La
   cintura se hornea en la geometría (honda: a 33 px de largo una
   cintura tímida no se ve) porque la silueta con cintura es lo que
   lo hace legible a este tamaño. Eran dos esferas y un cinturón:
   tres llamadas por grano, y se leía como cuentas de collar.

   PARTES NOMBRADAS (para que un .glb encaje)
     piedra-moler → 'losa', 'hueco', pata0 … pata3
     mano-piedra  → 'canto'
     mani         → 'grano'
     mani-pasta   → 'pasta'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, achatar, entubar, forma, formaVariada } from './organico.js';
import { pintar, lienzo, sstep, ruido3, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  granito: '#8a8378',          /* el fondo del lienzo de la piedra */
  piedra_aceite: '#c9a97a',    /* la mancha tibia del maní molido */
  /* más OSCURA y fría que la losa, para que se separe de ella. Con
     '#9a948c' sobre el granito, y el brillo encima, salía casi blanca */
  piedra_mano: '#77746f',
  mano_brillo: '#3a3632',
  mani_piel: '#a0532f',        /* menos naranja que #b5673a, que el ACES encendía */
};

/* EL GRANITO: moteado fino de piedra, a 256 y repetido. Con manchas
   y escamas más fuertes (alfa .5-.7) se leía como terrazo o como
   galleta con crema; aquí todo es tenue y lo que se ve es el grano. */
function texturaGranito(THREE) {
  const tx = lienzo(THREE, 'granito', 256, (ctx, S) => {
    const rnd = azarCon(29);
    ctx.fillStyle = COLORES.granito;
    ctx.fillRect(0, 0, S, S);
    /* se pinta tres veces corrido para que repita sin costura */
    const punto = (x, y, r) => {
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2); ctx.fill();
      }
    };
    for (let i = 0; i < 26; i++) {
      const oscura = rnd() < 0.5;
      /* difusas: con borde duro salían como sellos redondos */
      const a = 0.12 + rnd() * 0.02, x = rnd() * S, y = rnd() * S, r = 20 + rnd() * 50;
      const tono = oscura ? '60,55,50' : '200,192,180';
      for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
        const rg = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        rg.addColorStop(0, `rgba(${tono},${a})`); rg.addColorStop(1, `rgba(${tono},0)`);
        ctx.fillStyle = rg;
        ctx.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
      }
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rnd() < 0.55 ? 'rgba(52,48,44,.32)' : 'rgba(205,198,186,.26)';
      ctx.fillRect(Math.floor(rnd() * S), Math.floor(rnd() * S), 1, 1);
    }
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rnd() < 0.5 ? `rgba(40,36,34,${0.4 + rnd() * 0.05})` : `rgba(230,224,212,${0.4 + rnd() * 0.05})`;
      punto(rnd() * S, rnd() * S, 0.8 + rnd() * 1.0);
    }
  }, { repetir: true });
  tx.repeat.set(1.6, 1);
  return tx;
}

/* un color de la paleta como multiplicador del granito: para que el
   producto textura × color de vértice salga del tono pedido */
function sobreGranito(THREE, hex) {
  const c = new THREE.Color(hex), g = new THREE.Color(COLORES.granito);
  return new THREE.Color(c.r / g.r, c.g / g.g, c.b / g.b);
}

export const LARGO_PIEDRA = 1.9;
export const ANCHO_PIEDRA = 1.15;

registrar('piedra-moler', (THREE, opts = {}) => {
  const largo = opts.largo || LARGO_PIEDRA;
  const ancho = opts.ancho || ANCHO_PIEDRA;
  const g = new THREE.Group();
  g.name = 'piedra-moler';

  /* la losa, con el centro gastado. El hundido se hornea en la
     geometría: una losa plana con una sombra pintada encima se ve
     exactamente como lo que es, una calcomanía. */
  /* La planta es una superelipse (n=8): esquinas redondeadas de
     piedra gastada y no de caja. n=8 todavía contiene el rectángulo
     donde la mano y los granos se quedan (|x| ≤ 0.87, |z| ≤ 0.495):
     con n=6 ya se comía esa esquina. */
  const geo = forma('losa-moler-v2', () => {
    const l = new THREE.BoxGeometry(1, 0.16, 1, 24, 2, 16);
    const pos = l.attributes.position, nor = l.attributes.normal, uv = l.attributes.uv;
    const cara = new Int8Array(pos.count);   /* 1 arriba, -1 abajo, 0 costado */
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const nx = nor.getX(i), ny = nor.getY(i);
      cara[i] = ny > 0.5 ? 1 : ny < -0.5 ? -1 : 0;
      /* UV desde la posición, con la misma densidad en todas las caras:
         la caja estiraba 0..1 sobre 0.16 de alto y las motas del
         granito salían como rayitas */
      if (cara[i]) uv.setXY(i, x + 0.5, z + 0.5);
      else if (Math.abs(nx) > 0.5) uv.setXY(i, (z + 0.5) * 0.6, y * 0.87);
      else uv.setXY(i, x + 0.5, y * 0.87);
      const th = Math.atan2(z, x), c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th));
      if (Math.hypot(x, z) > 1e-6) {
        const f = (0.5 * Math.pow(c ** 8 + sn ** 8, -1 / 8)) / (0.5 / Math.max(c, sn));
        pos.setX(i, x * f); pos.setZ(i, z * f);
      }
      if (y < 0.05) continue;
      /* el hundido de tanto moler —información de juego— y la orilla
         que se redondea hacia el costado */
      const xr = pos.getX(i), zr = pos.getZ(i);
      const d = Math.min(1, Math.hypot(x / 0.42, z / 0.36));
      const rho = Math.pow(Math.abs(2 * xr) ** 8 + Math.abs(2 * zr) ** 8, 1 / 8);
      let yy = y - (1 - d * d) * 0.055;
      if (rho > 0.9) yy -= ((rho - 0.9) / 0.1) ** 2 * 0.025;
      pos.setY(i, yy);
    }
    pos.needsUpdate = true; uv.needsUpdate = true;
    l.computeVertexNormals();
    abollar(l, { fuerza: 0.006, escala: 6, semilla: 5 });
    /* las caras de la caja no comparten vértices: en los costados la
       normal sale del gradiente de la superelipse, sin el pliegue duro
       que dejaba computeVertexNormals en cada esquina redondeada */
    const nn = l.attributes.normal;
    for (let i = 0; i < pos.count; i++) {
      if (cara[i] || pos.getY(i) > 0.06) continue;
      const x = pos.getX(i), z = pos.getZ(i);
      const gx = Math.sign(x) * Math.abs(2 * x) ** 7, gz = Math.sign(z) * Math.abs(2 * z) ** 7;
      const m = Math.hypot(gx, gz) || 1;
      nn.setXYZ(i, gx / m, 0, gz / m);
    }
    /* el color: centro pulido y más claro, la mancha tibia del aceite
       del maní donde se muele, la orilla más oscura, y los costados
       oscureciendo hacia el pie. Así el «muela aquí» se ve en color */
    const aceite = sobreGranito(THREE, COLORES.piedra_aceite);
    return pintar(THREE, l, (cc, i, x, y, z) => {
      if (cara[i] === 1) {
        const d = Math.min(1, Math.hypot(x / 0.42, z / 0.36));
        const rho = Math.pow(Math.abs(2 * x) ** 8 + Math.abs(2 * z) ** 8, 1 / 8);
        cc.setScalar(1.08 - 0.12 * sstep(0.5, 1, d));
        cc.lerp(aceite, (1 - sstep(0.15, 0.75, d)) * 0.2 * (0.7 + 0.3 * ruido3(5 * x, 0, 5 * z, 3)));
        cc.multiplyScalar(1 - 0.1 * sstep(0.92, 1, rho));
      } else if (cara[i] === -1) cc.setScalar(0.5);
      else cc.setScalar(0.55 + 0.3 * sstep(-0.08, 0.07, y));
    });
  });
  const losa = new THREE.Mesh(geo, mate(THREE, '#ffffff', { map: texturaGranito(THREE), vertexColors: true }));
  losa.scale.set(largo, 1, ancho);
  losa.name = 'losa';
  g.add(losa);

  /* tres patas: una piedra de moler se inclina hacia quien muele */
  [[-0.4, -0.34], [0.4, -0.34], [0, 0.36]].forEach((p, i) => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 0.16, 7),
      mate(THREE, '#ffffff', { map: texturaGranito(THREE) })
    );
    pata.material.color.setScalar(0.8);   /* el mismo granito, a la sombra */
    pata.position.set(p[0] * largo, -0.14, p[1] * ancho);
    pata.name = 'pata' + i;
    pata.userData.ignorar = true;
    g.add(pata);
  });

  return g;
});

registrar('mano-piedra', (THREE) => {
  const g = new THREE.Group();
  g.name = 'mano-piedra';
  /* un rodillo de sección REDONDA con las puntas romas. Con la sección
     ovalada y la base achatada, al rodar cambiaba de ancho y la cara
     plana subía como un pliegue. Y gorda a propósito: la mano muele
     todo lo que queda a RADIO_MANO (0.26) de su centro, y una piedra
     flaca aplastaba granos que se veían lejos de ella. */
  const geo = forma('mano-piedra-v2', () => {
    const m = abollar(
      /* los polos de la esfera a las puntas (z): arriba, donde mira la
         cámara, el polo dejaba una estrella pellizcada */
      entubar(new THREE.SphereGeometry(1, 20, 14).rotateX(Math.PI / 2),
        { eje: 'z', perfil: (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), 3.2)), 0.42) }),
      { fuerza: 0.04, escala: 2.2, semilla: 9 });
    const tono = sobreGranito(THREE, COLORES.piedra_mano);
    return pintar(THREE, m, (c, i, x, y, z) => {
      c.copy(tono).multiplyScalar(0.92 + 0.12 * sstep(-0.2, 0.9, y));
      c.addScalar(0.05 * ruido3(3 * x, 3 * y, 3 * z, 9));
    });
  });
  /* el granito con brillo de mano: pulida de tanto uso. Las motas
     ruedan con ella, y así se ve el va y viene */
  const canto = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: '#ffffff', map: texturaGranito(THREE), vertexColors: true,
    shininess: 14, specular: COLORES.mano_brillo,
  }));
  canto.scale.set(0.16, 0.16, 0.33);
  canto.name = 'canto';
  g.add(canto);
  return g;
});

registrar('mani', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'mani';
  const geo = formaVariada('mani-grano', 4, opts.variante || 0, (k) => {
    const m = abollar(
      entubar(new THREE.SphereGeometry(1, 18, 12), {
        eje: 'z',
        /* la cintura entre los dos cotiledones, honda (−25%) */
        perfil: (u) => Math.sqrt(Math.max(0, 1 - u * u)) * (1 - 0.25 * Math.exp(-((u / 0.22) ** 2))),
      }),
      { fuerza: 0.05, escala: 2.6, semilla: k + 41 });
    const piel = new THREE.Color(COLORES.mani_piel), grano = new THREE.Color(COMIDA.mani);
    /* el umbral del descascarado cambia por variante: de un 15% a un
       40% de grano a la vista. Igual en todos (0.32) parecía tocino;
       en la mitad nomás, frijol colorado */
    const umbral = [0.48, 0.42, 0.36, 0.44][k];
    return pintar(THREE, m, (c, i, x, y, z) => {
      c.copy(piel).multiplyScalar(1 + 0.06 * ruido3(7 * x, 7 * y, 7 * z, k));
      if (Math.abs(z) < 0.12) c.multiplyScalar(0.85);   /* el pliegue no le da la luz */
      c.lerp(grano, sstep(umbral, umbral + 0.12, ruido3(1.8 * x + k, 1.8 * y, 1.8 * z, k + 13)));
      const r = Math.hypot(x, y, z) || 1;
      if (z / r > 0.93) c.lerp(grano, 0.8);             /* el germen en la punta */
    });
  });
  const m = new THREE.Mesh(geo, mate(THREE, '#ffffff', { vertexColors: true }));
  m.scale.set(0.05, 0.046, 0.085);
  m.name = 'grano';
  g.add(m);
  return g;
});

/* la mancha de pasta que queda donde se molió un grano */
registrar('mani-pasta', (THREE, opts = {}) => {
  const r = opts.radio || 0.09;
  const geo = forma('mani-pasta', () =>
    achatar(
      abollar(new THREE.SphereGeometry(1, 10, 7), { fuerza: 0.16, escala: 3.2, semilla: 13 }),
      { desde: -0.2, dureza: 0.9 },
    ));
  /* aceitosa: el maní molido suelta su grasa */
  const m = new THREE.Mesh(geo, brillante(THREE, COMIDA.mani_pasta));
  m.scale.set(r, r * 0.16, r * 0.82);
  m.name = 'pasta';
  return m;
});
