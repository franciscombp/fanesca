/* ============================================================
   FANESCA — retos.js
   LOS RETOS DE CADA BOLSA.

   La despensa resolvió por dónde entrar; esto resuelve por qué
   volver. Sin retos, una bolsa terminada es una bolsa muerta: tiene
   su ✓ y ya no ofrece nada. Y el juego pide justo lo contrario —que
   alguien se quede en el choclo porque le gustó desgranar.

   TRES EJES, Y CADA UNO PREMIA OTRA FORMA DE JUGAR. Es lo que se
   pidió con estas palabras: «puede jugar por ser el más veloz o el
   más cuidadoso o el que más gusanos ha atrapado».

     · rápida   — el reloj. Tres cucharas, que es el corte probado.
     · limpia   — la mano. Terminar sin un solo descuido, que es lo
                  contrario de correr.
     · cazador  — los bichos. Sacarlos vivos, no aplastarlos.
     · entera   — la colección. Bajar la bolsa hasta el último peldaño.

   RÁPIDA Y LIMPIA SE PELEAN A PROPÓSITO. El choclo tierno revienta
   si pasas el dedo fuerte y el melloco se dispara si lo empujas: ir
   rápido cuesta descuidos. Que los dos retos no se puedan servir en
   la misma partida es el punto — son dos maneras de jugar el mismo
   mesón, no dos casillas que se marcan de paso.

   LAS METAS SALEN DEL TAMAÑO DE LA BOLSA, no están escritas una por
   una. Dieciocho bolsas por cuatro retos son setenta y dos números a
   mano, y el día que a la quinua le entre un tercer nivel habría que
   acordarse de subirle los suyos. Aquí se derivan: media bolsa para
   las de destreza, y los bichos por los niveles que de verdad traen
   bichos — prometer un cazagusanos en el queso sería prometer un
   reto imposible.
   ============================================================ */

/* Media bolsa, redondeando hacia arriba y nunca menos de uno: en una
   bolsa de un solo nivel el reto es ese nivel. */
const mitad = (n) => Math.max(1, Math.ceil(n / 2));

export const RETOS = [
  {
    id: 'rapida',
    ico: '⏱',
    titulo: 'Mano rápida',
    meta: (b) => `Tres cucharas en ${b.metaRapida} ${b.metaRapida === 1 ? 'nivel' : 'niveles'}`,
    llevas: (b) => `${Math.min(b.tresCucharas, b.metaRapida)} / ${b.metaRapida}`,
    pide: (b) => b.tresCucharas >= b.metaRapida,
    texto: 'Al corte de las tres cucharas no se llega apurándose: se llega sabiéndose el gesto.',
  },
  {
    id: 'limpia',
    ico: '🌿',
    titulo: 'Sin un descuido',
    meta: (b) => `Termina ${b.metaLimpia} ${b.metaLimpia === 1 ? 'nivel' : 'niveles'} sin fallar uno`,
    llevas: (b) => `${Math.min(b.limpios, b.metaLimpia)} / ${b.metaLimpia}`,
    pide: (b) => b.limpios >= b.metaLimpia,
    texto: 'Ni un grano reventado, ni uno perdido, ni una tajada de más. Mano de abuela.',
  },
  {
    id: 'cazador',
    ico: '🪱',
    titulo: 'Cazagusanos',
    /* sólo donde puede ganarse: cuatro bolsas no traen un solo bicho
       y ahí este reto sería una casilla que nunca se marca */
    hay: (b) => b.conBichos > 0,
    meta: (b) => `Saca ${b.metaBichos} bichos vivos a la composta`,
    llevas: (b) => `${Math.min(b.bichos, b.metaBichos)} / ${b.metaBichos}`,
    pide: (b) => b.bichos >= b.metaBichos,
    texto: 'Aplastarlo arruina la olla; sacarlo vivo no cuesta nada más que pulso.',
  },
  {
    id: 'entera',
    ico: '🧺',
    titulo: 'La bolsa entera',
    /* en una bolsa de un solo nivel este reto es el mismo nivel y
       sale gratis con el primero: no se ofrece */
    hay: (b) => b.total > 1,
    meta: (b) => `Baja los ${b.total} niveles`,
    llevas: (b) => `${Math.min(b.hechos, b.total)} / ${b.total}`,
    pide: (b) => b.hechos >= b.total,
    texto: 'Del gesto a la gran faena, sin saltarse un peldaño.',
  },
];

/* los retos que una bolsa OFRECE de verdad, con sus metas ya puestas */
export function retosDe(resumen) {
  return RETOS.filter(r => !r.hay || r.hay(resumen));
}

/* Las metas de una bolsa, derivadas de su tamaño. `niveles` son sus
   peldaños y `conBichos` los que traen bichos de verdad. */
export function metasDe(niveles, conBichos) {
  return {
    total: niveles,
    conBichos,
    metaRapida: mitad(niveles),
    metaLimpia: mitad(niveles),
    /* al menos tres, para que en una bolsa de un solo nivel siga
       siendo un reto y no un trámite */
    metaBichos: Math.max(3, conBichos),
  };
}
