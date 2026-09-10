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
    pasos: [{ ico: '🔪', txt: 'Pártelo', desde: 0 }, { ico: '🎃', txt: 'Tájalo', desde: 0.08 }, { ico: '🥄', txt: 'Raspa y pela', desde: 0.4 }],
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
    pasos: [{ ico: '🧀', txt: 'Desmiga', desde: 0 }, { ico: '🥛', txt: 'La leche', desde: 0.85 }],
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
    pasos: [{ ico: '🥚', txt: 'Cáscalo', desde: 0 }, { ico: '🤏', txt: 'Pélalo', desde: 0.35 }],
    nombre: 'El huevo duro',
    tarea: 'Cascar y pelar',
    icono: 'huevo',
    modulo: () => import('./nivel-huevo.js'),
    gesto: 'Dale <b>golpecitos</b> hasta que se cuartee y luego <b>rasca la cáscara</b> con el dedo.',

    nota: 'El huevo duro va encima, no adentro: en rodajas, coronando el plato. Se casca a golpecitos y la cáscara sale rascando con el pulgar, pedazo a pedazo.',
    bicho: 'el gusanito',
    cucharas: [50, 75, 110],
  },
  {
    id: 'guarnicion',
    emoji: '🍌',
    cuenta: 'piezas',
    pasos: [{ ico: '🍳', txt: 'Fríe el maduro', desde: 0 }, { ico: '🍽️', txt: 'Arma el plato', desde: 0.34 }],
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

   CADA ENTRADA CARGA TRES COSAS MÁS desde que el orden dejó de ser
   sólo una escena y pasó a ser un minijuego (nivel-caldero):

     · `color` — el trozo que deja en el caldo. Estaba escrito aparte
       en main.js y ahora sale de aquí, que es donde vive el orden:
       dos listas de dieciséis con las mismas claves terminan un día
       sin coincidir.
     · `pieza` — qué modelo se ve en su cuenco sobre el mesón.
     · `porque` — POR QUÉ va en ese puesto. Es lo que el caldero dice
       cuando alguien lo echa fuera de turno, y es el motivo entero de
       que el orden sea un juego: aprenderse la receta es aprenderse
       estas dieciséis razones, no dieciséis posiciones.
   ============================================================ */
export const ORDEN_OLLA = [
  { id: 'zapallo',  nombre: 'el zapallo',  color: '#f0a04b', pieza: 'trozo-pulpa',
    porque: 'El zapallo va primero: se deshace en el caldo y es el que le da cuerpo y color.' },
  { id: 'sambo',    nombre: 'el sambo',    color: '#dfe6b0', pieza: 'hebra-sambo',
    porque: 'El sambo va con el zapallo, al principio: los dos se hacen puré y son la base.' },
  { id: 'mote',     nombre: 'el mote',     color: '#f3e9c8', pieza: 'grano-choclo', opts: { madurez: 'seco' },
    porque: 'El mote entra temprano: es grano grande y aguanta el hervor largo.' },
  { id: 'garbanzo', nombre: 'el garbanzo', color: '#e8c98a', pieza: 'garbanzo',
    porque: 'El garbanzo es de los duros: cuanto antes entre, mejor.' },
  { id: 'habas',    nombre: 'las habas',   color: '#8fae7e', pieza: 'haba',
    porque: 'Las habas van con los granos gruesos, antes que los tiernos.' },
  { id: 'frejol',   nombre: 'el fréjol',   color: '#b98aae', pieza: 'grano-frejol',
    porque: 'El fréjol pide su rato: entra con los granos duros, no al final.' },
  { id: 'maiz',     nombre: 'el choclo',   color: '#f4d35e', pieza: 'grano-choclo',
    porque: 'El choclo va después de los duros: es tierno y se deshace si hierve de más.' },
  { id: 'arveja',   nombre: 'la arveja',   color: '#7fb069', pieza: 'arveja',
    porque: 'La arveja es tierna: va con el choclo, en la segunda mitad.' },
  { id: 'escoger',  nombre: 'la lenteja',  color: '#c98a4b', pieza: 'lenteja',
    porque: 'La lenteja se cuece rapidísimo: si entra temprano se hace papilla.' },
  { id: 'chochos',  nombre: 'los chochos', color: '#fbf3e0', pieza: 'chocho',
    porque: 'Los chochos ya vienen cocidos y desamargados: entran casi al final, sólo a calentarse.' },
  { id: 'melloco',  nombre: 'el melloco',  color: '#f0c352', pieza: 'melloco',
    porque: 'El melloco suelta baba: va tarde, para que no espese toda la olla.' },
  { id: 'quinua',   nombre: 'la quinua',   color: '#efe6d2', pieza: 'grano-quinua',
    porque: 'La quinua se abre en nada: al final, o desaparece.' },
  { id: 'mani',     nombre: 'el maní con leche', color: '#d9b48a', pieza: 'mani-pasta',
    porque: 'El maní molido con leche va al final: es lo que amarra el caldo, y hervido de más se corta.' },
  { id: 'col',      nombre: 'la col',      color: '#bcd39a', pieza: 'col-tira',
    porque: 'La col entra picadita y casi al último: dos hervores y ya está.' },
  { id: 'bacalao',  nombre: 'el bacalao con su leche', color: '#fbf3e0', pieza: 'presa-bacalao',
    porque: 'El bacalao entra desmenuzado con la leche en que se coció, casi al apagar.' },
  { id: 'queso',    nombre: 'el queso, al final', color: '#fdfaf0', pieza: 'miga-queso',
    porque: 'El queso es lo último, con el fuego ya bajo: si hierve, se hace chicle.' },
];

/* ============================================================
   LOS MESONES QUE NO SON UN INGREDIENTE

   La feria y el caldero no se preparan: se escogen y se cocinan. No
   viven en NIVELES —no son parte de los dieciséis ni de la campaña,
   y meterlos ahí descuadraría todo lo que cuenta ingredientes— pero
   sí son mesones de pleno derecho, con su módulo y su gesto, y el
   modo La Olla los monta por el mismo camino que a los demás.
   ============================================================ */
export const MESONES_MODO = [
  {
    id: 'feria',
    emoji: '🧺',
    cuenta: 'choclos',
    nombre: 'La feria',
    tarea: 'Escoger el choclo',
    icono: 'maiz',
    modulo: () => import('./nivel-feria.js'),
    gesto: '<b>Arrastra al canasto</b> los choclos tiernos. <b>Tócalo</b> para abrirle la hoja.',
    nota: 'El choclo es lo único que se escoge en el puesto, uno por uno: se le abre la hoja con el pulgar y se le mira el grano. Lo demás se compra por libras.',
    cucharas: [45, 70, 100],
  },
  {
    id: 'caldero',
    emoji: '🍲',
    cuenta: 'ingredientes',
    /* dos faenas de verdad, no dos gestos: los doce granos entran en
       fila y los cuatro del final —el maní con leche, la col, el
       bacalao y el queso— van con el fuego ya bajo. Revolver no es una
       faena, es lo que se hace todo el rato. */
    pasos: [{ ico: '🥄', txt: 'Los granos, en orden', desde: 0 }, { ico: '🥛', txt: 'Lo del final', desde: 0.74 }],
    nombre: 'La olla',
    tarea: 'Armar la fanesca',
    icono: 'fanesca',
    modulo: () => import('./nivel-caldero.js'),
    gesto: 'Arrastra cada cuenco a la olla <b>en su turno</b>. Y <b>revuelve</b> dando vueltas: si se pega, se quema.',
    nota: 'El orden no es capricho: lo que más demora entra primero y lo tierno al final. Por eso la fanesca se cocina toda la tarde y se revuelve sin parar.',
    cucharas: [70, 105, 150],
  },
];

/* Los dos catálogos, en una sola búsqueda. Que `porId` mire también
   los mesones del modo es lo que deja al juego montarlos por el
   mismo camino que a un ingrediente cualquiera, sin un `if` por
   delante en cada sitio donde se pide una ficha. */
export const porId = (id) => NIVELES.find(n => n.id === id) || MESONES_MODO.find(n => n.id === id) || undefined;

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
