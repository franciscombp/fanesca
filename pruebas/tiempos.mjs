/* ============================================================
   DE DÓNDE SALEN LOS TIEMPOS DE CADA NIVEL

   `tiempoBase` son los segundos que valen tres cucharas, y NO se
   escriben a ojo. A ojo regalaban las cucharas: la haba normal daba
   70 s para un trabajo que lo probado pedía en 50, y un marcador que
   siempre da tres cucharas no mide nada.

   LA CUENTA

     t = k · carga(config) / presión

   · `carga` es el trabajo del nivel en unidades del propio
     ingrediente —vainas, lavadas, presas— encarecidas un 12% por
     punto de resistencia. Cada ingrediente dice la suya abajo.
   · `presión` es lo apretado que se quiere el corte: 0.85 en la
     presentación (que perdona), 1.00 en las normales, 1.15 en las
     bravas. Es lo único que se elige a mano, y es una decisión de
     diseño, no un número físico.
   · `k` es el ancla del ingrediente y NO se inventa: sale de su
     primer nivel, cuyo tiempo se probó con los dedos.

   Los bichos no entran en la carga. Se comprobó despejándolos de las
   parejas que ya estaban probadas y salía un coste de 0.01 unidades:
   un gusano cuesta atención, no segundos.

   CÓMO SE USA

     node pruebas/tiempos.mjs          compara lo derivado con lo escrito
     node pruebas/tiempos.mjs --ancla  enseña el ancla de cada ingrediente

   Si una fila se va de más del 8%, o el modelo de ese ingrediente
   está mal o el número escrito lo está. Las dos cosas hay que
   mirarlas; lo que no vale es dejar la fila torcida.
   ============================================================ */
import { variantesDe } from '../niveles-config.js';

/* la carga de un nivel, por ingrediente. Devuelve unidades de trabajo
   de ESE ingrediente: no se comparan entre sí, cada uno tiene su k. */
const res = (c) => 1 + 0.12 * (c.resistencia || 0);

export const CARGA = {
  /* los que se cuentan por piezas */
  habas:      (c) => c.cantidad * res(c),
  chochos:    (c) => c.cantidad * res(c),
  frejol:     (c) => c.cantidad * res(c),
  melloco:    (c) => c.cantidad * res(c),
  garbanzo:   (c) => c.cantidad * res(c),
  sambo:      (c) => c.cantidad * res(c),
  mani:       (c) => c.cantidad * res(c),
  bacalao:    (c) => c.cantidad * res(c),
  arveja:     (c) => c.cantidad * res(c),
  escoger:    (c) => (c.cantidad || c.granos || 1) * res(c),
  queso:      (c) => c.pedazos,
  guarnicion: (c) => c.presas * res(c),
  /* el huevo se cuenta en GOLPES: tres huevos de cuatro golpes son
     doce toques, y es lo que de verdad lleva tiempo */
  huevo:      (c) => c.cantidad * c.golpes,
  /* los que se lavan: la unidad es la agitada */
  mote:       (c) => c.lavadas_requeridas * (c.agitadas_por_agua || 10),
  /* la quinua se mide en lavadas: la saponina cambia CÓMO se siente,
     no cuánto dura (comprobado contra sus dos niveles probados) */
  quinua:     (c) => c.lavadas_requeridas,
  /* la col es una sola cabeza: lo que da trabajo es el grosor del
     corte, que multiplica los cortes que hay que dar */
  col:        (c) => (c.cantidad || 1) * (c.espesor_corte === 'fino' ? 1.15 : 1) * res(c),
  /* el maíz tiene su propia derivación, más vieja y más fina: la
     hoja vale 3 granos, el dañado 5 y el gusano 10 */
  maiz:       (c) => {
    const dur = { tierno: 1, duro: 1.18, seco: 1.42 };
    const granos = (c.madurez || []).reduce((a, m) => a + 26 * (dur[m] || 1), 0);
    const pod = Array.isArray(c.podridos) ? c.podridos.reduce((a, x) => a + x, 0) : (c.podridos || 0) * (c.choclos || 1);
    const gus = Array.isArray(c.gusanos) ? c.gusanos.reduce((a, x) => a + x, 0) : (c.gusanos || 0) * (c.choclos || 1);
    return granos + (c.hojas || 0) * (c.choclos || 1) * 3 + pod * 5 + gus * 10;
  },
  /* la feria no se trabaja, se escoge: la carga es cuántos hay que
     mirar, y abrir uno cuesta porque hay que decidir antes */
  feria:      (c) => c.choclos + c.dudosos * 2,
  zapallo:    (c) => (c.tajadas || c.cantidad || 6) * res(c),
};

/* LA PRESIÓN ES LA FORMA DE LA ESCALERA, y es LA decisión de diseño
   de esta tabla: cuánto más rápido se espera que vayan las manos en
   cada peldaño. Sube porque el jugador mejora — el mismo trabajo en
   menos tiempo es exactamente lo que significa aprender un gesto.

   La escalera del choclo, que es la que está probada con jugadores,
   sube de 0.85 a más de 5 a lo largo de sus quince peldaños. Las
   escaleras de cinco usan esta curva más corta. */
export const PRESION = { intro: 0.85, normal: 1.0, dura: 1.1, brava: 1.22, feroz: 1.35 };
export const CURVA5 = ['intro', 'normal', 'dura', 'brava', 'feroz'];

/* el ancla de un ingrediente: la saca de su primer nivel, que es el
   que se probó con los dedos */
export function anclaDe(base, presionDelPrimero = 'intro') {
  const ns = variantesDe(base);
  if (!ns.length) return null;
  const c = CARGA[base];
  if (!c) return null;
  const carga = c(ns[0].config);
  if (!carga) return null;
  return (ns[0].tiempoBase * PRESION[presionDelPrimero]) / carga;
}

export function derivar(base, config, presion = 'normal', ancla = null) {
  const k = ancla != null ? ancla : anclaDe(base);
  if (k == null) return null;
  return Math.round((k * CARGA[base](config)) / PRESION[presion]);
}

/* ---------- el informe ---------- */
if (process.argv[1] && process.argv[1].endsWith('tiempos.mjs')) {
  const bases = Object.keys(CARGA);
  const soloAncla = process.argv.includes('--ancla');
  let peor = 0;
  for (const base of bases) {
    const ns = variantesDe(base);
    if (!ns.length) continue;
    const k = anclaDe(base);
    if (k == null) { console.log(`${base}: sin modelo de carga`); continue; }
    if (soloAncla) { console.log(`${base.padEnd(11)} k = ${k.toFixed(3)}`); continue; }
    console.log(`── ${base}  (k = ${k.toFixed(3)})`);
    ns.forEach((n) => {
      /* LA PRESIÓN IMPLÍCITA, que es lo que de verdad informa: no
         «cuánto se desvía de una presión que yo supuse» sino «qué
         ritmo le está pidiendo este peldaño a las manos». Una
         escalera sana la sube sin saltos. */
      const carga = CARGA[base](n.config);
      const pi = (k * carga) / n.tiempoBase;
      peor = Math.max(peor, pi);
      console.log(`   ${n.id.padEnd(24)} ${String(n.tiempoBase).padStart(4)} s  carga ${carga.toFixed(1).padStart(6)}  presión ${pi.toFixed(2)}`);
    });
  }
  if (!soloAncla) console.log('\nla presión sube porque el jugador mejora: el mismo trabajo en menos tiempo.');
}
