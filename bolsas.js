/* ============================================================
   FANESCA — bolsas.js
   LAS BOLSAS: el menú del juego.

   Antes el menú era una semana —lunes a viernes, cuarenta y seis
   paradas en una sola fila— y el juego era ese camino. Eso tenía dos
   problemas que se vieron con jugadores:

     · La fila única obligaba a tragarse el choclo para llegar a las
       habas. A quien le gustaba un gesto no podía quedarse en él.
     · La olla, el plato entero, estaba al final de las cuarenta y
       seis. Nadie cocinaba una fanesca en su primera sesión, y el
       juego se llama La Fanesca.

   Ahora el menú es LA LISTA DE INGREDIENTES. Cada ingrediente es una
   bolsa que abres y dentro tiene sus niveles: el gesto primero y
   después lo que ese ingrediente puede enseñarte. Quien quiera ser el
   pro del choclo se queda en el choclo, y no le cuesta el resto.

   Y LA OLLA SE COCINA DESDE TEMPRANO. No espera a los dieciocho: con
   la primera bolsa ya cocinas algo —habas cocinadas, un platito— y
   cada bolsa nueva sube el plato un peldaño hasta la fanesca. Eso es
   lo que hace que valga la pena abrir la siguiente bolsa: no un
   número que sube, sino que la comida cambia de nombre.
   ============================================================ */

/* ============================================================
   EL ORDEN EN QUE SE ABREN

   De la mano más fácil a la más brava. Antes el orden era el de la
   dificultad de APRENDER el gesto y empezaba por el choclo; el choclo
   es la faena larga (deshojar y desgranar dos mazorcas) y de primera
   parada es un peaje de dos minutos antes de que el juego enseñe
   nada más. Ahora abre la haba: abres una vaina, salen las habas y
   ya sabes de qué va esto. Presentar rápido vale más que presentar
   en orden de dificultad.

   El orden RELATIVO de los doce que ya estaban probados con
   jugadores se respeta donde no choca con eso —chochos, fréjol y
   arveja siguen juntos al principio, el zapallo sigue siendo de los
   últimos— y los seis que no tenían sitio en la semana (el mote, el
   garbanzo, el sambo, el queso, el huevo, la guarnición) entran
   donde su gesto pesa.

   El zapallo se adelanta al puesto trece, delante del maní y del
   bacalao, y no por su gesto —que sigue siendo el más técnico de la
   mesa— sino por el PLATO: el zapallo y el sambo son el cuerpo del
   caldo, y una fanesca que llega antes que ellos no es una fanesca.
   Para entonces el jugador lleva doce bolsas encima, que es cuando
   toca la más difícil.
   ============================================================ */
export const ORDEN_BOLSAS = [
  'habas',      /*  1 · abre la vaina y salen: la presentación más corta que hay */
  'chochos',    /*  2 · aprieta y la pepa salta sola */
  'frejol',     /*  3 · aprieta hasta que truene */
  'arveja',     /*  4 · el hilo primero: la primera regla que hay que saber */
  'maiz',       /*  5 · la faena grande, y empieza escogiendo en la feria */
  'mote',       /*  6 · el choclo seco, lavado: va pegado al choclo */
  'melloco',    /*  7 · refregar sin arrebato */
  'escoger',    /*  8 · la lenteja, grano a grano */
  'garbanzo',   /*  9 · pelar remojado */
  'col',        /* 10 · enrollar y cortar fino */
  'quinua',     /* 11 · lavar hasta que no amargue */
  'sambo',      /* 12 · rallar */
  'zapallo',    /* 13 · partir, tajar y pelar: el cuerpo del caldo */
  'mani',       /* 14 · majar en la piedra */
  'bacalao',    /* 15 · desalar: lo que la hace fanesca */
  'queso',      /* 16 · desmenuzar */
  'huevo',      /* 17 · cascar y pelar */
  'guarnicion', /* 18 · freír y armar el plato */
];

/* el puesto de una bolsa, para ordenar y para saber cuál sigue */
export const PUESTO = Object.fromEntries(ORDEN_BOLSAS.map((id, i) => [id, i]));

/* ============================================================
   LA ESCALERA DE PLATOS

   La respuesta a «¿y esto para qué lo estoy pelando?». Cada peldaño
   es un plato de verdad que se cocina con lo que el jugador ya sabe
   preparar, y el nombre cambia cuando cambia el plato — que es la
   única forma honesta de contar un avance en una cocina.

   `pide` es ACUMULATIVO: cada peldaño incluye lo del anterior, así
   que la lista es exactamente el orden de las bolsas. Se escribe
   entera igualmente —y no como «las primeras N»— para que un
   guardado viejo, o el modo dev, o cualquier orden raro de bolsas
   caiga en el peldaño que le toca por lo que TIENE, no por cuántas.

   Y EL BACALAO ES EL QUE LA NOMBRA. Antes del bacalao hay una sopa
   de Cuaresma muy buena; con el bacalao es fanesca. Eso no es un
   ajuste de dificultad, es lo que el plato es.
   ============================================================ */
export const PLATOS = [
  {
    id: 'habas',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'las habas cocinadas',
    nombre: 'Habas cocinadas',
    corto: 'Habas',
    eyebrow: 'lo primero que sale de una olla',
    pide: ['habas'],
    texto: 'Un platito de habas tiernas con sal. No es fanesca, pero es lo primero que aprende a cocinar cualquiera en esta sierra.',
  },
  {
    id: 'granos',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de granos tiernos',
    nombre: 'Sopa de granos tiernos',
    corto: 'Granos tiernos',
    eyebrow: 'ya es una sopa',
    pide: ['habas', 'chochos', 'frejol'],
    texto: 'Habas, chochos y fréjol en la misma agua. Con tres granos ya hay sopa.',
  },
  {
    id: 'choclo',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de granos y choclo',
    nombre: 'Sopa de granos y choclo',
    corto: 'Granos y choclo',
    eyebrow: 'con lo dulce del choclo',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz'],
    texto: 'El choclo entra tarde y endulza el caldo. Cinco granos: la mitad del camino de la fanesca.',
  },
  {
    id: 'cuaresma',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de Cuaresma',
    nombre: 'Sopa de Cuaresma',
    corto: 'De Cuaresma',
    eyebrow: 'la de los jueves de marzo',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo'],
    texto: 'Nueve cosas en la olla y ninguna de carne. Así se come en Cuaresma en toda la sierra, mucho antes de que llegue el Viernes Santo.',
  },
  {
    id: 'cuaresma-col',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de Cuaresma con col',
    nombre: 'Sopa de Cuaresma con col',
    corto: 'Con col',
    eyebrow: 'lo verde y lo que espesa',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua'],
    texto: 'La col picada fina y la quinua lavada. Once, y la olla ya no es agua con granos: tiene cuerpo.',
  },
  {
    id: 'zapallo',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de zapallo',
    nombre: 'Sopa de zapallo y doce granos',
    corto: 'Con zapallo',
    eyebrow: 'ahora sí, el cuerpo',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua', 'sambo', 'zapallo'],
    texto: 'El zapallo y el sambo se deshacen en la leche y son el cuerpo del caldo. De aquí en adelante ya se parece.',
  },
  {
    id: 'mani',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la sopa de maní',
    nombre: 'Sopa de maní y doce granos',
    corto: 'Con maní',
    eyebrow: 'le falta una sola cosa',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua', 'sambo', 'zapallo', 'mani'],
    texto: 'El maní molido con leche es lo que amarra todo. Está a un ingrediente de ser fanesca, y ese ingrediente viene del mar.',
  },
  {
    id: 'fanesca',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la fanesca',
    nombre: 'Fanesca',
    corto: 'Fanesca',
    eyebrow: 'ya es la de verdad',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua', 'sambo', 'zapallo', 'mani', 'bacalao'],
    texto: 'El bacalao es el que la nombra. Doce granos y el pescado seco: eso, y no otra cosa, es una fanesca.',
  },
  {
    id: 'fanesca-casa',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la fanesca de la casa',
    nombre: 'Fanesca de la casa',
    corto: 'De la casa',
    eyebrow: 'con el queso al final',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua', 'sambo', 'zapallo', 'mani', 'bacalao', 'queso'],
    texto: 'El queso fresco desmigado con el fuego ya bajo. Es el último que entra y el que la hace de casa y no de restaurante.',
  },
  {
    id: 'servida',
    /* el nombre metido en una frase: «te falta el mote para …» */
    enFrase: 'la fanesca servida',
    nombre: 'Fanesca servida',
    corto: 'Servida',
    eyebrow: 'la mesa, puesta',
    pide: ['habas', 'chochos', 'frejol', 'arveja', 'maiz', 'mote', 'melloco', 'escoger', 'garbanzo', 'col', 'quinua', 'sambo', 'zapallo', 'mani', 'bacalao', 'queso', 'huevo', 'guarnicion'],
    texto: 'Con el huevo en rodajas, el maduro frito, las empanaditas y el ají. Un plato de fanesca no se sirve pelado: lo de encima es la mitad de la fiesta.',
  },
];

/* ============================================================
   QUÉ SE PUEDE COCINAR HOY

   `sabe` es el conjunto de ingredientes cuyo BÁSICO está hecho — el
   primer nivel de su bolsa. El plato es el peldaño más alto cuya
   lista entera cabe ahí dentro; si no llega ni al primero, todavía
   no hay olla.
   ============================================================ */
export function platoDe(sabe) {
  const tiene = (id) => sabe.has ? sabe.has(id) : sabe.includes(id);
  let mejor = null;
  for (const p of PLATOS) if (p.pide.every(tiene)) mejor = p;
  return mejor;
}

/* El peldaño siguiente y lo que le falta. Es lo que hace que abrir
   otra bolsa tenga un porqué concreto: no «te falta uno» sino «te
   falta el bacalao, y con él esto se llama fanesca». */
export function proximoPlato(sabe) {
  const tiene = (id) => sabe.has ? sabe.has(id) : sabe.includes(id);
  for (const p of PLATOS) {
    const faltan = p.pide.filter(id => !tiene(id));
    if (faltan.length) return { plato: p, faltan };
  }
  return null;
}

/* Los ingredientes que van a la olla con lo que hoy se sabe: el
   plato de ahora manda, y van en el orden de la receta —no en el de
   las bolsas—, que lo pone ORDEN_OLLA. */
export function ingredientesDelPlato(sabe, orden) {
  const plato = platoDe(sabe);
  if (!plato) return [];
  const dentro = new Set(plato.pide);
  return orden.filter(o => dentro.has(o.id));
}
