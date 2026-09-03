/* ============================================================
   FANESCA — niveles.js
   Los datos, separados del código: qué ingredientes se preparan,
   en qué orden, con qué gesto y en cuánto tiempo son 3 cucharas.

   Agregar un ingrediente nuevo es agregar una entrada aquí y un
   archivo `nivel-<id>.js` que cumpla el contrato del motor.
   ============================================================ */

/* EL GESTO ES UNA FRASE, no un párrafo. Es lo primero que sale sobre
   el mesón al entrar y desde que no hay ficha previa es la única
   presentación del ingrediente: tiene que caber en una mirada. Los
   detalles —el tierno que revienta, el hilo que no sale de través—
   los enseñan las pistas del propio nivel, cada una en su momento,
   que es cuando una instrucción sirve. La versión larga de cada
   texto vive en la tarjeta del final y en el cuaderno. */
export const NIVELES = [
  {
    id: 'maiz',
    emoji: '🌽',
    cuenta: 'granos',
    pasos: [{ ico: '🌽', txt: 'Arranca las hojas', desde: 0 }, { ico: '🌾', txt: 'Desgrana los granos', desde: 0.18 }],
    nombre: 'El choclo',
    tarea: 'Deshojar y desgranar',
    icono: 'maiz',
    modulo: () => import('./nivel-maiz.js'),
    gesto: 'Jala las hojas <b>hacia abajo</b>; pelado, toca una punta y <b>arrastra a lo largo</b>.',

    nota: 'Doce granos, doce apóstoles. El choclo se compra con hoja —así se sabe que es de hoy— y se desgrana con el pulgar, empezando siempre por una orilla.',
    bicho: 'el gusanito',
    /* segundos para 3, 2 y 1 cuchara */
    cucharas: [80, 120, 175],
  },
  {
    id: 'habas',
    emoji: '🫛',
    cuenta: 'habas',
    pasos: [{ ico: '🫛', txt: 'Abre las vainas', desde: 0 }, { ico: '🟢', txt: 'Saca las habas', desde: 0.15 }],
    nombre: 'Las habas',
    tarea: 'Desvainar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-habas.js'),
    gesto: 'Pasa el dedo por la <b>costura</b> y toca cada haba para echarla a la batea.',

    nota: 'La haba tierna es de la sierra alta. Se abre la vaina por el filo y salen acomodadas como en su cama.',
    bicho: 'el gusanito',
    cucharas: [50, 80, 120],
  },
  {
    id: 'arveja',
    emoji: '🟩',
    cuenta: 'arvejas',
    pasos: [{ ico: '🧵', txt: 'Jala el hilo', desde: 0 }, { ico: '🫛', txt: 'Corre el pulgar', desde: 0.15 }],
    nombre: 'La arveja',
    tarea: 'Deshilar y correr',
    icono: 'arveja',
    modulo: () => import('./nivel-arveja.js'),
    gesto: '<b>Jala el hilo</b> desde el rabito, a lo largo. Abierta, corre el pulgar.',

    nota: 'La arveja parece la haba y en la mano no se parece en nada. Es la única vaina de la olla que hay que deshilar primero: mientras el hilo esté puesto, no cede.',
    bicho: 'el gusanito',
    cucharas: [65, 100, 145],
  },
  {
    id: 'chochos',
    emoji: '⚪',
    cuenta: 'chochos',
    pasos: [{ ico: '🤏', txt: 'Aprieta cada chocho', desde: 0 }],
    nombre: 'Los chochos',
    tarea: 'Pelar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-chochos.js'),
    gesto: '<b>Aprieta</b> cada chocho y la pepa salta sola de su piel.',

    nota: 'El chocho llega ya desamargado: son días de agua corriente para quitarle lo amargo. Pelarlo es lo último y lo más fácil.',
    bicho: 'el gorgojo',
    cucharas: [40, 65, 100],
  },
  {
    id: 'frejol',
    emoji: '🫘',
    cuenta: 'fréjoles',
    pasos: [{ ico: '✊', txt: 'Aprieta hasta que truene', desde: 0 }, { ico: '🫘', txt: 'Barre los granos', desde: 0.2 }],
    nombre: 'El fréjol',
    tarea: 'Reventar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-frejol.js'),
    gesto: '<b>Mantén el dedo</b> sobre la vaina hasta que truene; luego barre los granos.',

    nota: 'Fréjol tierno, el de la vaina moteada. Se aprieta hasta que truena y los granos saltan solos.',
    bicho: 'el gorgojo',
    cucharas: [50, 80, 120],
  },
  {
    id: 'melloco',
    emoji: '🥔',
    cuenta: 'mellocos',
    pasos: [{ ico: '🥔', txt: 'Refriega la baba', desde: 0 }],
    nombre: 'El melloco',
    tarea: 'Refregar y lavar',
    icono: 'melloco',
    modulo: () => import('./nivel-melloco.js'),
    gesto: '<b>Refriega</b> parejo y sin arrebato: si lo empujas de golpe, se dispara.',

    nota: 'El melloco no se pela: se refriega bajo el agua hasta sacarle la tierra y la baba que suelta. Es el único de la olla que se defiende: apretarlo es perderlo.',
    bicho: 'el gusanito',
    cucharas: [55, 85, 125],
  },
  {
    id: 'zapallo',
    emoji: '🎃',
    cuenta: 'tajadas',
    pasos: [{ ico: '🔪', txt: 'Pártelo en dos', desde: 0 }, { ico: '🔪', txt: 'Corta en tajadas', desde: 0.1 }, { ico: '🥄', txt: 'Raspa las pepas', desde: 0.4 }, { ico: '🔪', txt: 'Pela fino', desde: 0.4 }],
    nombre: 'El zapallo',
    tarea: 'Partir, tajar y pelar',
    icono: 'zapallo',
    modulo: () => import('./nivel-zapallo.js'),
    gesto: '<b>Parte</b>, corta en tajadas parejas y, una por una, <b>raspa el hueco y pela fino</b>: la pulpa se queda.',

    nota: 'Un zapallo no llega a la olla en cubos. Este es el nivel más técnico de la mesa: tajadas parejas, las pepas fuera sin llevarse pulpa y la cáscara fina. Lo que sobra va a la composta, y una abuela lo cuenta.',
    bicho: 'el gusano',
    cucharas: [80, 120, 175],
  },
  {
    id: 'col',
    emoji: '🥬',
    cuenta: 'tiras',
    pasos: [{ ico: '🥬', txt: 'Enrolla la hoja', desde: 0 }, { ico: '🔪', txt: 'Corta al través', desde: 0.2 }],
    nombre: 'La col',
    tarea: 'Enrollar y cortar',
    icono: 'hoja',
    modulo: () => import('./nivel-col.js'),
    gesto: '<b>Enrolla</b> la hoja hasta hacer un cigarro y córtalo al través, finito.',

    nota: 'Más finita. Una tajada gruesa también es una tajada, pero te acaba la col a la mitad — y toca traer otra.',
    bicho: 'el gusano de la col',
    cucharas: [60, 95, 140],
  },
  {
    id: 'escoger',
    emoji: '🍚',
    cuenta: 'granos',
    pasos: [{ ico: '🪨', txt: 'Saca las piedritas', desde: 0 }, { ico: '👌', txt: 'Recoge lo bueno', desde: 0.45 }],
    nombre: 'La lenteja',
    tarea: 'Escoger el grano',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-escoger.js'),
    gesto: 'Bota <b>piedritas y picados</b>; con la mesa limpia, barre lo bueno.',

    nota: 'Escoger el grano se hace sentadas y conversando, con el grano regado sobre la mesa. Es de las pocas tareas de cocina que se hacen entre varias porque sí, no porque falte tiempo.',
    bicho: 'el gorgojo',
    cucharas: [70, 110, 160],
  },
  {
    id: 'quinua',
    emoji: '🌾',
    cuenta: 'lavadas',
    pasos: [{ ico: '🌀', txt: 'Remueve en círculos', desde: 0 }, { ico: '💧', txt: 'Bota el agua', desde: 0.3 }],
    nombre: 'La quinua',
    tarea: 'Lavar la saponina',
    icono: 'quinua',
    modulo: () => import('./nivel-quinua.js'),
    gesto: '<b>Remueve en círculos</b> pegado a la orilla; agua con espuma, agua que se bota.',

    nota: 'La saponina es el jabón que la planta se puso encima para que no se la coman los pájaros. Si entra con el grano, amarga la olla entera.',
    bicho: 'el gorgojo',
    cucharas: [50, 80, 120],
  },
  {
    id: 'mani',
    emoji: '🥜',
    cuenta: 'maní',
    pasos: [{ ico: '🪨', txt: 'Maja en la piedra', desde: 0 }, { ico: '👐', txt: 'Arrima los granos', desde: 0.25 }],
    nombre: 'El maní',
    tarea: 'Majar en la piedra',
    icono: 'mani',
    modulo: () => import('./nivel-mani.js'),
    gesto: 'La mano de piedra <b>va y viene</b> a lo largo; arrima los granos de la orilla.',

    nota: 'El gesto más viejo de esta cocina. Aquí no hay atajo rápido, y es a propósito: lo que se pide no es maña, es insistencia.',
    bicho: 'el gorgojo',
    cucharas: [70, 105, 155],
  },
  {
    id: 'bacalao',
    emoji: '🐟',
    cuenta: 'trozos',
    pasos: [{ ico: '🧂', txt: 'Frota la sal', desde: 0 }, { ico: '💧', txt: 'A la tina, a remojar', desde: 0.3 }],
    nombre: 'El bacalao',
    tarea: 'Desalar',
    icono: 'bacalao',
    modulo: () => import('./nivel-bacalao.js'),
    gesto: '<b>Frota</b> la sal gruesa de cada presa y llévala a la tina a remojar.',
    avisoBicho: '🪰 Si se posa <b>la mosca</b>: espántala de un roce. <b>No la aplastes</b> contra la carne.',

    nota: 'El bacalao llega seco y enterrado en sal. Se le sacude la sal de encima y se deja en remojo desde la víspera, cambiando el agua; recién entonces se cocina en leche y se desmenuza para la olla.',
    bicho: 'la mosca',
    cucharas: [55, 85, 130],
  },
  {
    id: 'garbanzo',
    emoji: '🫘',
    cuenta: 'garbanzos',
    nombre: 'El garbanzo',
    tarea: 'Pelar remojado',
    icono: 'garbanzo',
    modulo: () => import('./nivel-garbanzo.js'),
    gesto: '<b>Frota</b> cada garbanzo con pasadas cortas y la camisita se suelta sola.',

    nota: 'El garbanzo llegó con los españoles y se quedó. Pasa la noche en agua, y a la mañana la piel ya no está pegada: está puesta, como una camisita, y sale frotando.',
    bicho: 'el gusanito',
    cucharas: [45, 68, 99],
  },
  {
    id: 'sambo',
    emoji: '🥒',
    cuenta: 'pasadas',
    nombre: 'El sambo',
    tarea: 'Rallar',
    icono: 'sambo',
    modulo: () => import('./nivel-sambo.js'),
    gesto: 'Agarra la media y <b>pásala por el rallador</b>, de arriba abajo, hasta que quede hebra.',

    nota: 'El sambo es el primo pálido del zapallo, y de esta misma tierra. Tierno no se pica: se ralla, y la hebra se deshace en la olla hasta que nadie sabe decir dónde quedó.',
    bicho: 'el gusanito',
    cucharas: [55, 83, 121],
  },
  {
    id: 'mote',
    emoji: '🌽',
    cuenta: 'aguas',
    pasos: [{ ico: '🌊', txt: 'Agita de lado a lado', desde: 0 }, { ico: '💧', txt: 'Vira el agua turbia', desde: 0.3 }],
    nombre: 'El mote',
    tarea: 'Lavar',
    icono: 'mote',
    modulo: () => import('./nivel-mote.js'),
    gesto: '<b>Agita de lado a lado</b>; cuando el agua salga turbia, vira la batea y pon otra.',

    nota: 'El mote llega del mercado ya cocido y pelado con cal. Tres aguas, como la quinua, pero aquí no hay espuma que mirar — se mira el color: el agua sale turbia de cal y de hollejo, y cuando sale clara, el mote está listo.',
    bicho: 'el gorgojo',
    cucharas: [45, 68, 99],
  },
  {
    id: 'queso',
    emoji: '🧀',
    cuenta: 'migas',
    nombre: 'El queso y la leche',
    tarea: 'Desmenuzar',
    icono: 'queso',
    modulo: () => import('./nivel-queso.js'),
    gesto: '<b>Pellizca</b> el bloque y se desmigaja; al final, la leche de un solo golpe.',
    avisoBicho: '🪰 Si se posa <b>la mosca</b>: espántala de un roce. <b>No la aplastes</b> contra el queso.',

    nota: 'El queso fresco se desmigaja con los dedos, nunca se corta: la miga se deshace en la sopa y el cuchillo no. La leche entra al final y de un solo golpe — es lo que vuelve crema el caldo.',
    bicho: 'la mosca',
    cucharas: [40, 60, 88],
  },
  {
    id: 'huevo',
    emoji: '🥚',
    cuenta: 'huevos',
    nombre: 'El huevo duro',
    tarea: 'Cascar y pelar',
    icono: 'huevo',
    modulo: () => import('./nivel-huevo.js'),
    gesto: 'Un <b>golpecito seco</b> para cuartearlo, y <b>jala los cascos</b> desde la grieta.',

    nota: 'El huevo duro va encima, no adentro: en rodajas, coronando el plato. Se casca de un golpecito seco y la cáscara sale en pedazos, jalando desde la grieta.',
    bicho: 'el gusanito',
    cucharas: [50, 75, 110],
  },
  {
    id: 'guarnicion',
    emoji: '🍌',
    cuenta: 'piezas',
    nombre: 'La guarnición',
    tarea: 'Freír y armar',
    icono: 'maduro',
    modulo: () => import('./nivel-guarnicion.js'),
    gesto: 'Frie el maduro y <b>voltéalo cuando dore</b>; al final arma el plato con todo encima.',

    nota: 'La fanesca no se sirve pelada: maduro frito, empanaditas de viento y el ají al lado. Lo de arriba del plato, que en esta casa importa tanto como lo de abajo.',
    bicho: 'el gusanito',
    cucharas: [75, 113, 165],
  },
];

/* ============================================================
   EL RESTO DEL MAPA — vacío, y ojalá se quede así.

   Aquí vivieron seis ingredientes esperando minijuego, apagados en
   la despensa de la mesa. Ya cocinan todos. La lista se queda por
   si un día la receta crece (¿la cebolla del refrito? ¿el ají?):
   lo que se agregue aquí aparece solo en la despensa, con su gesto
   prometido, hasta que tenga su `nivel-<id>.js`.
   ============================================================ */

export const POR_VENIR = [];

/* ============================================================
   Y EL FINAL: LA OLLA

   No es un ingrediente, es lo que se hace con todos. Se abre
   cuando los doce están listos, y por ahora sirve la fanesca; el
   minijuego de cocinarla —el orden en que entran los granos, que
   es lo que de verdad decide si sale buena— viene después.
   ============================================================ */

export const OLLA = {
  id: 'olla',
  nombre: 'La fanesca',
  tarea: 'Cocinar la olla',
  icono: 'fanesca',
  gesto: 'Primero el zapallo y el sambo con la leche, que son el cuerpo; después los granos, cada uno cocido aparte; el maní molido, la col, el bacalao con su leche, y al final el queso. Que hierva despacio y no se deje de revolver.',
};

/* ============================================================
   EL ORDEN EN QUE ENTRAN A LA OLLA — la escena final.

   La fanesca de la Sierra no se cocina echando todo junto: el
   zapallo y el sambo se cuecen primero con la leche y se hacen puré
   (son el cuerpo del caldo); los granos se cocinan cada uno aparte
   y entran ya cocidos, empezando por los más duros; el maní tostado
   va molido con leche; la col picada fina; el bacalao se cocina en
   leche y entra desmenuzado con esa misma leche; y el queso fresco
   se desmiga al final, casi con el fuego apagado. El nombre corto
   es lo que se lee mientras cae.
   ============================================================ */
export const ORDEN_OLLA = [
  { id: 'zapallo',  nombre: 'el zapallo' },
  { id: 'sambo',    nombre: 'el sambo' },
  { id: 'mote',     nombre: 'el mote' },
  { id: 'garbanzo', nombre: 'el garbanzo' },
  { id: 'habas',    nombre: 'las habas' },
  { id: 'frejol',   nombre: 'el fréjol' },
  { id: 'maiz',     nombre: 'el choclo' },
  { id: 'arveja',   nombre: 'la arveja' },
  { id: 'escoger',  nombre: 'la lenteja' },
  { id: 'chochos',  nombre: 'los chochos' },
  { id: 'melloco',  nombre: 'el melloco' },
  { id: 'quinua',   nombre: 'la quinua' },
  { id: 'mani',     nombre: 'el maní con leche' },
  { id: 'col',      nombre: 'la col' },
  { id: 'bacalao',  nombre: 'el bacalao con su leche' },
  { id: 'queso',    nombre: 'el queso, al final' },
];

export const porId = (id) => NIVELES.find(n => n.id === id);

/* cuántas cucharas merece un tiempo */
export function cucharasDe(nivel, ms) {
  const s = ms / 1000;
  const [a, b, c] = nivel.cucharas;
  if (s <= a) return 3;
  if (s <= b) return 2;
  if (s <= c) return 1;
  return 1;   /* terminarlo siempre vale al menos una */
}

/* LOS FALLOS BAJAN CUCHARAS. El tiempo solo no califica: un grano
   reventado, uno perdido, una tajada quemada o un bicho perdonado
   son descuidos, y una mano con descuidos no es mano de abuela. En
   las presentaciones (uno y dos chiles) se cobra recién al tercero;
   de tres chiles en adelante el primero ya cuesta la tercera cuchara
   y tres descuidos dejan una sola. */
export function cucharasConFallos(cuch, fallos, dificultad = 1) {
  if (!fallos) return cuch;
  if (dificultad <= 2) return fallos >= 3 ? Math.max(1, cuch - 1) : cuch;
  if (fallos >= 3) return 1;
  return Math.min(cuch, 2);
}

export function tiempoBonito(ms) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(1).padStart(4, '0')}` : `${r.toFixed(1)}s`;
}
