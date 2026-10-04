/* ============================================================
   FANESCA — modelos/bichos.js
   Los invitados que nadie quiere en la olla: su forma.

   Todos los niveles comparten la misma gramática, y por eso los
   bichos se arman en un solo sitio: si el gusanito del choclo y
   el del zapallo se vieran distinto, el jugador tendría que
   aprender dos veces la misma regla.

   ------------------------------------------------------------
   PARTES NOMBRADAS

   Estos tres son los únicos modelos que se ANIMAN, así que el
   juego tiene que poder encontrar sus pedazos. Los busca por
   nombre (nunca por índice de hijo), y por eso un .glb esculpido
   en Blender funciona igual mientras respete estos nombres:

     gusano  → seg0, seg1, … segN   (los segmentos que se menean)
               aro                  (el anillo rojo de alarma)
     gorgojo → pata0 … pata5, cuerpo, aro   (elitro0/1, cabeza, trompa: decorado)
     mosca   → ala0, ala1, aro

   El aro es aparte: no lo dibuja Blender ni debería. Es interfaz
   —la señal de "esto no se toca"— y por eso lo pone siempre el
   código, con el rojo del sistema de diseño, aunque el cuerpo
   venga de un .glb.
   ============================================================ */

import { registrar, parte, partes } from './registro.js';
import { COMIDA, mate, token } from './paleta.js';
import { ojitos } from './utileria.js';
import { forma } from './organico.js';
import { pintar } from './pintura.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* ---------- COLORES NUEVOS (de paso: van a paleta.js) ----------
   Aquí mientras paleta.js está en obra; mudarlos a COMIDA no cambia
   nada más. */
const COLORES = {
  /* el élitro: castaño con lustre. El caparazón mate #7a5c3c se
     confundía con la lenteja #c98a4b; éste se separa por valor y,
     sobre todo, por el brillo — el bicho es personaje, no comida */
  gorgojo_elitro: '#7a4526',
  gorgojo_elitro_brillo: '#9c8a78',
  gorgojo_cabeza: '#4a3426',
  /* la carita del gusano */
  brillo_ojo: '#ffffff',
  cachete: '#f29aa6',
};

/* materiales de bicho que no cambian nunca: uno por sesión, marcados
   para que tirar() no los deseche al cambiar de nivel */
const materiales = new Map();
function compartido(clave, hacer) {
  let m = materiales.get(clave);
  if (!m) { m = hacer(); m.userData.compartida = true; materiales.set(clave, m); }
  return m;
}

/* el aro rojo que late: la única señal que el jugador necesita
   para saber "esto no se toca". Interfaz, no comida: por eso sale
   del sistema de diseño y no de la paleta de la olla. */
export function aroDeAlarma(THREE, r) {
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(r, r * 0.11, 8, 22),
    new THREE.MeshBasicMaterial({ color: token('--chile-500', '#ce2029'), transparent: true, opacity: 0.9 })
  );
  aro.rotation.x = Math.PI / 2;
  aro.name = 'aro';
  aro.userData.ignorar = true;   /* el aro no se raycastea: sería trampa */
  return aro;
}

/* ---------- gusanito: choclo, habas y zapallo ----------
   `eje` dice hacia dónde crece el cuerpo desde la cabeza:
     'z' — tumbado en la mesa, cabeza hacia +Z (el que camina)
     'y' — trepando, cabeza hacia +Y (el de la mazorca, donde +Y
           es el eje del choclo y +Z lo que mira la cámara) */

registrar('gusano', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const eje = opts.eje || 'z';
  const segmentos = opts.segmentos || 5;
  const claro = mate(THREE, opts.color || COMIDA.gusano);
  const oscuro = mate(THREE, opts.color2 || COMIDA.gusano_oscuro);

  const obj = new THREE.Group();
  obj.name = 'gusano';
  /* LA COBRA. Desde la cámara de la tabla el gusano caminaba con la
     cabeza al frente: los ojos miraban lejos, desde arriba no se
     veían, y se leía como una fila de cuentas verdes. Ahora levanta
     la cabeza —la cabeza en alto, el segundo segmento a medias—, la
     cabeza es más grande (proporción tierna) y los segmentos van más
     juntos, para que se lea un cuerpo y no un collar.

     La subida va en Y (o en Z si trepa): nuevoGusano anima sólo la X
     de cada segmento, y no se pisan. */
  const SEP = 0.068;
  const subida = [0.025, 0.012];
  for (let i = 0; i < segmentos; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry((0.062 - i * 0.005) * k, 9, 7),
      i % 2 ? oscuro : claro
    );
    const alza = (subida[i] || 0) * k;
    if (eje === 'y') { s.position.y = -i * SEP * k; s.position.z = alza; }
    else { s.position.z = -i * SEP * k; s.position.y = alza; }
    s.name = 'seg' + i;
    obj.add(s);
    if (i === 0) {
      /* la cabeza crece por ESCALA y no por radio: así los ojitos,
         que son hijos, crecen con ella y siguen asomando */
      s.scale.setScalar(1.25);
      /* ojos un 18 % más grandes, más arriba, y girados hacia la
         cámara de arriba cuando camina tumbado */
      const r = 0.0225 * k, sep = 0.028 * k, y = 0.03 * k, z = 0.05 * k;
      const oj = ojitos(THREE, sep, y, z, r);
      if (eje !== 'y') oj.rotation.x = -0.35;
      oj.add(caritaDeGusano(THREE, sep, y, z, r));
      s.add(oj);
    }
  }
  return obj;
});

/* El brillo de los ojos y los cachetes, en UNA malla con color por
   vértice: un ojo sin brillo es un botón, no un ojo. Va colgada de los
   ojitos para girar con ellos. (Cuando ojitos() de utileria.js traiga
   su propio brillo, aquí quedan sólo los cachetes.) */
function caritaDeGusano(THREE, sep, y, z, r) {
  const geo = forma(`carita-gusano:${sep.toFixed(4)}:${y.toFixed(4)}:${z.toFixed(4)}:${r.toFixed(4)}`, () => {
    const piezas = [];
    const con = (g, hex) => {
      const c = new THREE.Color(hex);
      g.deleteAttribute('uv');
      return pintar(THREE, g, (col) => col.copy(c));
    };
    [-1, 1].forEach(s => {
      const b = new THREE.SphereGeometry(r * 0.22, 6, 4);
      b.translate(s * sep + r * 0.18, y + r * 0.3, z + r * 1.05);
      piezas.push(con(b, COLORES.brillo_ojo));
      const c = new THREE.SphereGeometry(r * 0.55, 8, 6);
      c.scale(1, 0.6, 0.4);
      c.translate(s * sep * 1.45, y - r * 0.9, z + r * 0.3);
      piezas.push(con(c, COLORES.cachete));
    });
    const f = mergeGeometries(piezas);
    piezas.forEach(g => g.dispose());
    return f;
  });
  const m = new THREE.Mesh(geo, compartido('carita', () => new THREE.MeshBasicMaterial({ vertexColors: true })));
  m.name = 'carita';
  m.userData.ignorar = true;
  return m;
}

/* ---------- gorgojo: el escarabajito del fréjol ---------- */

registrar('gorgojo', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const obj = new THREE.Group();
  obj.name = 'gorgojo';

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.075 * k, 12, 9),
    mate(THREE, COMIDA.gorgojo_cuerpo)
  );
  cuerpo.scale.set(0.8, 0.62, 1.15);
  cuerpo.name = 'cuerpo';

  /* LOS ÉLITROS. Antes: media esfera marrón mate y, encima, una
     'raya' de caja que sobresalía del lomo como una cuchilla negra.
     Ahora dos alas duras, cada una media cúpula, abiertas apenas en V
     para que la raja del medio se lea sola —sin pieza extra—, con
     los hombros claros y el faldón oscuro pintados en el vértice, y
     un lustre que el escarabajo sí tiene: es personaje, no comida, y
     el brillo es justo lo que lo separa de las legumbres mates.

     OJO con phiStart: SphereGeometry hace x = -r·cos φ·sin θ, así que
     -π/2..π/2 es la mitad -X y π/2..3π/2 la +X. Con 0 y π salen las
     mitades de adelante y de atrás (pasó en el prototipo). */
  const matElitro = compartido('elitro', () => new THREE.MeshPhongMaterial({
    color: COLORES.gorgojo_elitro, vertexColors: true,
    shininess: 50, specular: COLORES.gorgojo_elitro_brillo,
  }));
  const elitros = [-1, 1].map((s, i) => {
    const r = 0.072 * k;
    const geo = forma(`elitro:${s}:${k}`, () => {
      const g = new THREE.SphereGeometry(r, 12, 9, s < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI / 2);
      return pintar(THREE, g, (c, j, x, y) => {
        const v = Math.min(1.1, 0.6 + 0.5 * (y / r));
        c.setRGB(v, v, v);
      });
    });
    const e = new THREE.Mesh(geo, matElitro);
    e.scale.set(0.82, 0.55, 1.1);
    e.position.set(s * 0.004 * k, 0.014 * k, -0.004 * k);
    e.rotation.z = -s * 0.06;
    e.name = 'elitro' + i;
    return e;
  });

  /* la cabeza, un 20 % más grande y más arriba: proporción tierna */
  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.042 * 1.2 * k, 10, 8),
    mate(THREE, COLORES.gorgojo_cabeza)
  );
  cabeza.position.set(0, 0.017 * k, 0.086 * k);
  cabeza.name = 'cabeza';
  cabeza.add(ojitos(THREE, 0.026 * k, 0.017 * k, 0.038 * k, 0.017 * k));

  /* la trompita del gorgojo, que es su marca: va con la cabeza, o
     queda enterrada debajo de la cabeza agrandada */
  const trompa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008 * k, 0.012 * k, 0.06 * k, 6),
    mate(THREE, COLORES.gorgojo_cabeza)
  );
  trompa.rotation.x = Math.PI / 2.2;
  trompa.position.set(0, 0.004 * k, 0.135 * k);
  trompa.name = 'trompa';

  obj.add(cuerpo, ...elitros, cabeza, trompa);

  let n = 0;
  [-1, 1].forEach(s => [-0.045, 0, 0.045].forEach(z => {
    const pata = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006 * k, 0.005 * k, 0.06 * k, 5),
      mate(THREE, COMIDA.gorgojo_oscuro)
    );
    pata.position.set(0.06 * k * s, -0.03 * k, z * k);
    pata.rotation.z = s * 0.7;
    pata.name = 'pata' + (n++);
    obj.add(pata);
  }));

  return obj;
});

/* ---------- mosca: la que ronda el bacalao ---------- */

registrar('mosca', (THREE, opts = {}) => {
  const k = opts.escala || 1;
  const obj = new THREE.Group();
  obj.name = 'mosca';

  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.055 * k, 10, 8),
    mate(THREE, COMIDA.mosca_cuerpo)
  );
  cuerpo.scale.set(0.75, 0.7, 1.25);
  cuerpo.name = 'cuerpo';

  const cabeza = new THREE.Mesh(
    new THREE.SphereGeometry(0.038 * k, 10, 8),
    mate(THREE, COMIDA.mosca_cabeza)
  );
  cabeza.position.z = 0.06 * k;
  cabeza.name = 'cabeza';

  obj.add(cuerpo, cabeza);

  /* ojos rojos enormes: se lee de lejos que es una mosca */
  [-1, 1].forEach((s, i) => {
    const o = new THREE.Mesh(
      new THREE.SphereGeometry(0.026 * k, 8, 6),
      mate(THREE, COMIDA.mosca_ojo)
    );
    o.position.set(0.024 * k * s, 0.008 * k, 0.075 * k);
    o.name = 'ojoRojo' + i;
    obj.add(o);
  });

  const matAla = new THREE.MeshBasicMaterial({
    color: COMIDA.mosca_ala, transparent: true, opacity: 0.5,
    side: THREE.DoubleSide, depthWrite: false,
  });
  [-1, 1].forEach((s, i) => {
    const a = new THREE.Mesh(new THREE.CircleGeometry(0.07 * k, 12, 0, Math.PI), matAla);
    a.position.set(0.03 * k * s, 0.03 * k, -0.01 * k);
    a.rotation.set(-Math.PI / 2.4, 0, s * 0.5);
    a.name = 'ala' + i;
    a.userData.ignorar = true;
    a.userData.lado = s;
    obj.add(a);
  });

  return obj;
});

/* ============================================================
   LOS BICHOS VIVOS
   El modelo es la forma; esto es la forma + su meneo + su aro.
   Devuelve siempre { obj, aro, animar(t) }, venga el cuerpo de
   código o de un .glb — por eso busca las partes por nombre.
   ============================================================ */

import { pieza } from './registro.js';

function latirAro(aro, t, vel = 6, amp = 0.14, base = 0.55, ampOp = 0.3) {
  if (!aro || !aro.visible) return;
  const e = 1 + Math.sin(t * vel) * amp;
  aro.scale.set(e, e, 1);
  aro.material.opacity = base + Math.sin(t * vel) * ampOp;
}

export function nuevoGusano(THREE, opts = {}) {
  const k = opts.escala || 1;
  const eje = opts.eje || 'z';
  const obj = pieza('gusano', THREE, opts);
  const seg = partes(obj, 'seg');

  const aro = aroDeAlarma(THREE, 0.16 * k);
  if (eje === 'y') { aro.rotation.x = Math.PI / 2; aro.position.y = -0.15 * k; }
  else { aro.rotation.x = -Math.PI / 2; aro.position.set(0, -0.045 * k, -0.15 * k); }
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, seg, aro,
    /* el meneo, y el aro latiendo */
    animar(t) {
      seg.forEach((s, i) => { s.position.x = Math.sin(t * 9 - i * 0.9 + fase) * 0.022 * k; });
      latirAro(aro, t);
    },
  };
}

export function nuevoGorgojo(THREE, opts = {}) {
  const k = opts.escala || 1;
  const obj = pieza('gorgojo', THREE, opts);
  const patas = partes(obj, 'pata');
  const cuerpo = parte(obj, 'cuerpo');

  const aro = aroDeAlarma(THREE, 0.15 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, aro,
    animar(t) {
      patas.forEach((pt, i) => { pt.rotation.x = Math.sin(t * 14 + i * 1.4 + fase) * 0.45; });
      if (cuerpo) cuerpo.position.y = Math.sin(t * 14 + fase) * 0.004 * k;
      latirAro(aro, t);
    },
  };
}

export function nuevaMosca(THREE, opts = {}) {
  const k = opts.escala || 1;
  const obj = pieza('mosca', THREE, opts);
  const alas = partes(obj, 'ala').map(m => ({ m, s: m.userData.lado || 1 }));

  const aro = aroDeAlarma(THREE, 0.14 * k);
  aro.position.y = -0.05 * k;
  obj.add(aro);

  const fase = Math.random() * 6;
  return {
    obj, alas, aro,
    animar(t) {
      alas.forEach(({ m, s }) => { m.rotation.z = s * (0.5 + Math.sin(t * 42 + fase) * 0.55); });
      latirAro(aro, t, 7, 0.16, 0.5, 0.32);
    },
  };
}
