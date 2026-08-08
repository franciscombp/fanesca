/* ============================================================
   FANESCA — niveles.js
   Los datos, separados del código: qué ingredientes se preparan,
   en qué orden, con qué gesto y en cuánto tiempo son 3 cucharas.

   Agregar un ingrediente nuevo es agregar una entrada aquí y un
   archivo `nivel-<id>.js` que cumpla el contrato del motor.
   ============================================================ */

export const NIVELES = [
  {
    id: 'maiz',
    nombre: 'El choclo',
    tarea: 'Deshojar y desgranar',
    icono: 'maiz',
    modulo: () => import('./nivel-maiz.js'),
    gesto: 'Primero <b>deshoja</b>: jala cada hoja hacia abajo y arranca los pelos. Luego toca un grano de la punta y <b>arrastra</b> a lo largo: la fila se va en cascada. Van dos choclos, y no son iguales: el <b>tierno</b> revienta si pasas el dedo con fuerza; el <b>duro</b> pelea grano a grano.',
    nota: 'Doce granos, doce apóstoles. El choclo se compra con hoja —así se sabe que es de hoy— y se desgrana con el pulgar, empezando siempre por una orilla.',
    bicho: 'el gusanito',
    /* segundos para 3, 2 y 1 cuchara */
    cucharas: [80, 120, 175],
  },
  {
    id: 'habas',
    nombre: 'Las habas',
    tarea: 'Desvainar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-habas.js'),
    gesto: 'Pasa el dedo por la <b>costura</b> de la vaina para abrirla, y toca cada haba para echarla a la batea.',
    nota: 'La haba tierna es de la sierra alta. Se abre la vaina por el filo y salen acomodadas como en su cama.',
    bicho: 'el gusanito',
    cucharas: [50, 80, 120],
  },
  {
    id: 'arveja',
    nombre: 'La arveja',
    tarea: 'Deshilar y correr',
    icono: 'arveja',
    modulo: () => import('./nivel-arveja.js'),
    gesto: 'Esta vaina está <b>cosida por un hilo</b>. Agárralo del rabito y <b>jala a lo largo</b> — de través no sale. Abierta la vaina, <b>corre el pulgar</b> por encima y las arvejas salen en cadena.',
    nota: 'La arveja parece la haba y en la mano no se parece en nada. Es la única vaina de la olla que hay que deshilar primero: mientras el hilo esté puesto, no cede.',
    bicho: 'el gusanito',
    cucharas: [65, 100, 145],
  },
  {
    id: 'chochos',
    nombre: 'Los chochos',
    tarea: 'Pelar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-chochos.js'),
    gesto: '<b>Aprieta</b> cada chocho y la pepa salta fuera de su piel. Arrastra el dedo por encima y van saltando en fila.',
    nota: 'El chocho llega ya desamargado: son días de agua corriente para quitarle lo amargo. Pelarlo es lo último y lo más fácil.',
    bicho: 'el gorgojo',
    cucharas: [40, 65, 100],
  },
  {
    id: 'frejol',
    nombre: 'El fréjol',
    tarea: 'Reventar',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-frejol.js'),
    gesto: '<b>Mantén el dedo</b> sobre la vaina hasta que reviente, y luego <b>barre</b> los granos hacia la batea.',
    nota: 'Fréjol tierno, el de la vaina moteada. Se aprieta hasta que truena y los granos saltan solos.',
    bicho: 'el gorgojo',
    cucharas: [50, 80, 120],
  },
  {
    id: 'melloco',
    nombre: 'El melloco',
    tarea: 'Raspar la babaza',
    icono: 'melloco',
    modulo: () => import('./nivel-melloco.js'),
    gesto: '<b>Raspa</b> pasando el dedo por encima, parejo y sin arrebato. Si lo empujas de golpe se te dispara y hay que ir a buscarlo. Cuando pierde el brillo, está limpio.',
    nota: 'El melloco viene forrado en su propia baba. Es el único de la olla que se defiende: apretarlo es perderlo.',
    bicho: 'el gusanito',
    cucharas: [55, 85, 125],
  },
  {
    id: 'zapallo',
    nombre: 'El zapallo',
    tarea: 'Cortar',
    icono: 'zapallo',
    modulo: () => import('./nivel-zapallo.js'),
    gesto: '<b>Corta</b> siguiendo las líneas punteadas, sin desviarte. Si hay un gusano en la línea, sácalo antes.',
    nota: 'Zapallo y sambo, los dos hermanos dulces de la fanesca. Se cortan en cubos parejos para que se deshagan igual.',
    bicho: 'el gusano gordo',
    cucharas: [45, 70, 105],
  },
  {
    id: 'col',
    nombre: 'La col',
    tarea: 'Enrollar y cortar',
    icono: 'hoja',
    modulo: () => import('./nivel-col.js'),
    gesto: 'Primero <b>enrolla</b> la hoja empujándola de lado a lado hasta que quede un cigarro. Después <b>cruza el rollo</b> con el dedo, tajada por tajada. Cerca de la punta salen finitas.',
    nota: 'Más finita. Una tajada gruesa también es una tajada, pero te acaba la col a la mitad — y toca traer otra.',
    bicho: 'el gusano de la col',
    cucharas: [60, 95, 140],
  },
  {
    id: 'escoger',
    nombre: 'La lenteja',
    tarea: 'Escoger el grano',
    icono: 'granos_mixtos',
    modulo: () => import('./nivel-escoger.js'),
    gesto: '<b>Toca</b> las piedritas y los granos picados para botarlos. Cuando la mesa esté limpia, <b>barre</b> las lentejas a la batea. Aquí no gana el rápido: gana el que mira.',
    nota: 'Escoger el grano se hace sentadas y conversando, con el grano regado sobre la mesa. Es de las pocas tareas de cocina que se hacen entre varias porque sí, no porque falte tiempo.',
    bicho: 'el gorgojo',
    cucharas: [70, 110, 160],
  },
  {
    id: 'quinua',
    nombre: 'La quinua',
    tarea: 'Lavar la saponina',
    icono: 'quinua',
    modulo: () => import('./nivel-quinua.js'),
    gesto: '<b>Remueve en círculos</b> dentro de la batea, pegado a la orilla — ir y venir derecho no lava nada. Cuando el agua se llene de espuma, <b>bótala</b> y sigue con la nueva.',
    nota: 'La saponina es el jabón que la planta se puso encima para que no se la coman los pájaros. Si entra con el grano, amarga la olla entera.',
    bicho: 'el gorgojo',
    cucharas: [50, 80, 120],
  },
  {
    id: 'mani',
    nombre: 'El maní',
    tarea: 'Majar en la piedra',
    icono: 'mani',
    modulo: () => import('./nivel-mani.js'),
    gesto: 'La mano de piedra <b>va y viene</b>: arrastra a lo largo de la losa, sin prisa. Cada pasada empuja los granos hacia la orilla, y en la orilla ya no muerde — <b>arrímalos al centro</b> cada tanto.',
    nota: 'El gesto más viejo de esta cocina. Aquí no hay atajo rápido, y es a propósito: lo que se pide no es maña, es insistencia.',
    bicho: 'el gorgojo',
    cucharas: [70, 105, 155],
  },
  {
    id: 'bacalao',
    nombre: 'El bacalao',
    tarea: 'Desalar y tender',
    icono: 'bacalao',
    modulo: () => import('./nivel-bacalao.js'),
    gesto: '<b>Frota</b> cada presa hasta sacarle la sal y <b>arrástrala</b> al cordel. Si se te posa una mosca, <b>espántala</b> de un roce — no la aplastes.',
    nota: 'El bacalao llega seco y salado desde el norte. Se le saca la sal frotando y se tiende a orear antes de la leche.',
    bicho: 'la mosca',
    cucharas: [55, 85, 130],
  },
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

export function tiempoBonito(ms) {
  const s = Math.max(0, ms) / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return m > 0 ? `${m}:${r.toFixed(1).padStart(4, '0')}` : `${r.toFixed(1)}s`;
}
