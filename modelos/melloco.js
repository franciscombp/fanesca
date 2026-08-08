/* ============================================================
   FANESCA — modelos/melloco.js
   El melloco: un tubérculo chiquito, amarillo y manchado de rosa
   fuerte, envuelto en su propia baba.

   La babaza es una malla aparte y semitransparente, un pelín más
   grande que el melloco, y es LA pieza del nivel: se le baja la
   opacidad a medida que se raspa, así que el jugador ve cuánto le
   falta sin necesidad de una barra.

   Las manchas van como calcomanías sobre el cuerpo (esferitas
   achatadas y hundidas): el melloco de verdad no es de un color,
   es amarillo con brochazos morados repartidos sin ninguna gracia.

   PARTES NOMBRADAS (para que un .glb encaje)
     melloco → 'cuerpo', 'babaza', mancha0 … manchaN
   ============================================================ */

import { registrar } from './registro.js';
import { COMIDA, mate, brillante } from './paleta.js';
import { abollar, curvar, formaVariada } from './organico.js';

registrar('melloco', (THREE, opts = {}) => {
  const g = new THREE.Group();
  g.name = 'melloco';

  /* achaparrado y torcido: el melloco es casi un riñón corto. Se
     curva a propósito para que ninguno se lea como una cápsula. */
  const geo = formaVariada('melloco', 5, opts.variante || 0, (k) =>
    curvar(
      abollar(new THREE.SphereGeometry(1, 14, 10), { fuerza: 0.14, escala: 2.1, semilla: k + 31 }),
      { eje: 'x', hacia: 'z', k: 0.16 },
    ));
  const cuerpo = new THREE.Mesh(geo, mate(THREE, COMIDA.melloco));
  cuerpo.scale.set(0.15, 0.1, 0.105);
  cuerpo.name = 'cuerpo';
  g.add(cuerpo);

  /* las manchas: repartidas con una vuelta de oro para que no caigan
     en fila ni se amontonen, que es lo que pasa con Math.random */
  const nm = 4 + ((opts.variante || 0) % 3);
  for (let i = 0; i < nm; i++) {
    const a = i * 2.399963;
    const u = (i + 0.5) / nm * 2 - 1;
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mate(THREE, COMIDA.melloco_mancha));
    m.position.set(u * 0.13, Math.sin(a) * r * 0.085, Math.cos(a) * r * 0.09);
    m.scale.set(1.1 + (i % 2) * 0.5, 0.55, 0.9);
    m.name = 'mancha' + i;
    m.userData.ignorar = true;
    g.add(m);
  }

  /* LA BABAZA. Semitransparente y brillante — es lo único de este
     juego que se pinta con `brillante` a propósito: la baba SÍ tiene
     un reflejo húmedo, y es la señal de que todavía no está limpio.

     Opacidad baja a propósito. A 0.62 la baba no se leía como baba:
     se leía como el color del melloco, y ocho mellocos amarillos
     manchados de rosa salían en pantalla como ocho dientes de ajo.
     Lo que tiene que verse mojado es el melloco, no una cápsula
     encima de él — el aviso de "sucio" lo da el brillo, no el velo. */
  const babaza = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10),
    brillante(THREE, COMIDA.melloco_babaza, { transparent: true, opacity: 0.34 })
  );
  babaza.scale.set(0.168, 0.118, 0.122);
  babaza.name = 'babaza';
  g.add(babaza);

  return g;
});
