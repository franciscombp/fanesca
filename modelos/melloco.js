/* ============================================================
   FANESCA — modelos/melloco.js
   El melloco: un tubérculo chiquito, amarillo y manchado de rosa
   fuerte, envuelto en su propia baba.

   La babaza es una malla aparte y semitransparente, un pelín más
   grande que el melloco, y es LA pieza del nivel: se le baja la
   opacidad a medida que se raspa, así que el jugador ve cuánto le
   falta sin necesidad de una barra.

   Las manchas van DENTRO de la piel, pintadas por vértice: eran
   esferitas achatadas pegadas encima, se leían como confeti y
   costaban una llamada cada una. El melloco de verdad no es de un
   color, es amarillo con brochazos morados repartidos sin ninguna
   gracia.

   PARTES NOMBRADAS (para que un .glb encaje)
     melloco → 'cuerpo', 'babaza'
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA } from './paleta.js';
import { abollar, curvar, forma, formaVariada } from './organico.js';
import { pintar, sstep, ruido3 } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  melloco_punta: '#e6c84a',    /* un extremo más verdoso-dorado */
  melloco_mancha: '#c2306f',   /* más fuerte que #c9527e: sobrevive a la baba */
  melloco_ojo: '#b07a3c',      /* las yemas */
  /* el velo de sucio: apenas gris. Con '#e9e4d6' el melloco salía
     crema pálido y en la madera perdía su amarillo vivo */
  melloco_velo: '#f4efe2',
  melloco_brillo: '#4a4436',
};

/* achaparrado y torcido: el melloco es casi un riñón corto. Se curva
   a propósito para que ninguno se lea como una cápsula. Con tres yemas
   hundidas, que es lo que lo hace tubérculo y no caramelo. */
function geoMelloco(THREE, k) {
  const g = curvar(
    abollar(new THREE.SphereGeometry(1, 22, 14), { fuerza: 0.08, escala: 2.1, semilla: k + 31 }),
    { eje: 'x', hacia: 'z', k: 0.16 },
  );
  const pos = g.attributes.position;
  const ojos = [0, 1, 2].map(j => new THREE.Vector3(Math.cos(2.3 * j + k), 0.4 * Math.sin(1.7 * j), Math.sin(2.3 * j + k)).normalize());
  const v = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    d.copy(v).normalize();
    for (const o of ojos) if (d.angleTo(o) < 0.14) { v.multiplyScalar(0.955); break; }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.userData.ojos = ojos;
  return g;
}

/* la piel: amarillo con un extremo dorado, brochazos magenta en
   vuelta de oro (para que no caigan en fila ni se amontonen) y las
   yemas cafés */
function pintarMelloco(THREE, g, k) {
  const base = new THREE.Color(COMIDA.melloco), punta = new THREE.Color(COLORES.melloco_punta);
  const mancha = new THREE.Color(COLORES.melloco_mancha), ojo = new THREE.Color(COLORES.melloco_ojo);
  const n = 5 + (k % 3);
  const centros = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n * 2 - 1, a = 2.399963 * i + k, r = Math.sqrt(1 - u * u);
    centros.push([new THREE.Vector3(u, Math.sin(a) * r, Math.cos(a) * r), 0.36 + ((i * 7 + k * 3) % 5) / 4 * 0.24]);
  }
  const d = new THREE.Vector3();
  return pintar(THREE, g, (c, i, x, y, z) => {
    d.set(x, y, z).normalize();
    c.copy(base).lerp(punta, 0.5 * sstep(-0.2, -1, x));
    let w = 0;
    for (const [cc, r0] of centros) {
      const rr = r0 * (1 + 0.3 * ruido3(4 * d.x, 4 * d.y, 4 * d.z, k));
      w = Math.max(w, sstep(rr, 0.5 * rr, d.angleTo(cc)));
    }
    c.lerp(mancha, w * 0.92);
    for (const o of g.userData.ojos) if (d.angleTo(o) < 0.10) { c.lerp(ojo, 0.8); break; }
  });
}

registrar('melloco', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'melloco';
  const k = ((opts.variante || 0) % 5 + 5) % 5;

  const geo = forma('melloco-piel:' + k, () => pintarMelloco(THREE, geoMelloco(THREE, k), k));
  /* material por melloco: el nivel le cambia el color (el velo) al
     limpiarlo. Phong de brillo bajo y especular oscuro: cera, no
     plástico */
  const cuerpo = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
    color: COLORES.melloco_velo, vertexColors: true, shininess: 30, specular: COLORES.melloco_brillo,
  }));
  cuerpo.scale.set(0.15, 0.1, 0.105);
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);

  /* LA BABAZA. Semitransparente y brillante — es lo único de este
     juego que lleva un reflejo claro a propósito: la baba SÍ tiene
     un reflejo húmedo, y es la señal de que todavía no está limpio.

     Opacidad baja a propósito. A 0.62 la baba no se leía como baba:
     se leía como el color del melloco, y ocho mellocos amarillos
     manchados de rosa salían en pantalla como ocho dientes de ajo.
     Lo que tiene que verse mojado es el melloco, no una cápsula
     encima de él — el aviso de "sucio" lo da el brillo, no el velo. */
  /* EL TAMAÑO VA EN LA GEOMETRÍA y la malla queda a escala 1. Iba en
     mesh.scale, y el nivel escribe babaza.scale.setScalar(...) para
     encogerla al refregar: al primer roce la baba pasaba de 0.17 a
     ~1 de radio y una esfera lechosa tapaba un tercio de la pantalla.

     Y es el MISMO cuerpo de su variante, un pelín inflado: abraza los
     bollos y las yemas, así que no hay anillo blanco alrededor (una
     esfera lisa se leía como cápsula, no como piel mojada). */
  const babaza = new THREE.Mesh(
    forma('melloco-babaza:' + k, () => {
      const b = geo.clone();
      b.deleteAttribute('color');
      b.scale(0.15 * 1.08, 0.1 * 1.11, 0.105 * 1.08);
      return b;
    }),
    new THREE.MeshPhongMaterial({ color: COMIDA.melloco_babaza, specular: '#ffffff', shininess: 70,
      transparent: true, opacity: 0.34, depthWrite: false })
  );
  babaza.name = 'babaza';
  g.add(babaza);

  return g;
});
