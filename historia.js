/* ============================================================
   FANESCA — historia.js
   Lo que el plato cuenta, separado del código que lo cocina.

   La fanesca no es solo una sopa: es el país en un plato. Un
   ritual andino de cosecha al que el calendario católico se le
   montó encima sin moverlo de fecha, con granos de dos orillas
   del océano y un pescado del Atlántico Norte metido a 2.800
   metros de altura. Todo eso está en los ingredientes que el
   jugador tiene en las manos, así que aquí vive el texto que se
   los cuenta — en el cuaderno, en los briefs y en las tarjetas
   que se ganan al terminar cada nivel.

   Regla de este archivo: lo que se afirma, se sostiene; lo que
   está en disputa, se dice que está en disputa (el nombre, sin ir
   más lejos, no lo sabe nadie). Las fuentes van al final y se
   muestran en el cuaderno.
   ============================================================ */

/* ============================================================
   LAS VOCES
   Citas de lideresas indígenas ecuatorianas. Todas van textuales,
   con nombre y con datos verificables, y solo se usan donde el
   juego de verdad las sostiene: una cita puesta de adorno donde
   no viene a cuento las gasta.

   La de Amaguaña es la que da sentido a todo el nivel del choclo,
   porque describe LITERALMENTE la mecánica: el grano que se va se
   lleva la fila, y sin filas no queda mazorca.
   ============================================================ */

export const AMAGUANA_MAZORCA = {
  texto: 'Los indígenas que hemos sufrido, que hemos chupado las cuerizas, las garrotizas, tenemos que estar unidos porque la unidad es como la mazorca: si se va el grano, se va la fila; si se va la fila, se acaba la mazorca.',
  corta: 'La unidad es como la mazorca: si se va el grano, se va la fila; si se va la fila, se acaba la mazorca.',
  quien: 'Tránsito Amaguaña',
  datos: 'Pesillo, Cayambe, 10 de septiembre de 1909 – 10 de mayo de 2009. Lideresa kichwa; con Dolores Cacuango encabezó en 1926 la primera huelga de trabajadores de hacienda en Olmedo-Pesillo, y caminó veintiséis marchas a Quito.',
};

export const AMAGUANA_SANGRE = {
  texto: 'Yo he viajado y he caminado por todos los lugares, pero nunca he negociado con la sangre de mis hermanos.',
  quien: 'Tránsito Amaguaña',
  datos: 'Vivió cien años. Estuvo presa, la acusaron de armar escuelas «comunistas», y siguió.',
};

export const CACUANGO_PARAMO = {
  texto: 'Somos como la paja de páramo que se arranca y vuelve a crecer… y de paja de páramo sembraremos el mundo.',
  quien: 'Dolores Cacuango',
  datos: 'Pesillo, Cayambe, 1881 – 1971. Fundó en 1946 la primera escuela bilingüe kichwa-castellano del Ecuador, y fue de las fundadoras de la Federación Ecuatoriana de Indios.',
};

export const CHANCOSO_AGRICULTURA = {
  texto: 'La agricultura es una historia, una identidad: quienes cultivan lo hacen gracias a la herencia que dejaron los ancestros, mantenida por milenios.',
  quien: 'Blanca Chancoso',
  datos: 'Kichwa otavalo, cofundadora de Ecuarunari y de la CONAIE. (Declaración recogida en entrevista, no cita de archivo: por eso va parafraseada y marcada como tal.)',
};

export const VOCES = [AMAGUANA_MAZORCA, CACUANGO_PARAMO, AMAGUANA_SANGRE, CHANCOSO_AGRICULTURA];

/* ============================================================
   LA SEMANA — la historia que sostiene el mapa.

   El desgrane no es metáfora: en las casas donde todavía se hace
   fanesca, la semana antes del Viernes Santo la familia se turna
   para pelar, desvainar y desgranar — es faena de varias tardes y
   de varias manos, y por eso el juego se cuenta como una semana en
   la que cada día llega alguien más a ayudar.

   `quien` es la línea del banner en el mapa: quién está hoy en la
   cocina. `escena` es el cierre del día — se lee UNA vez, cuando
   se termina la última parada del día, y son dos o tres frases:
   un capítulo que se cierra, no una novela. `refri` es el
   inventario que queda listo, porque el progreso también se cuenta
   en fundas.
   ============================================================ */

export const DIAS_RELATO = {
  lunes: {
    quien: 'tú y la abuela',
    escena: 'La abuela repasa las fundas una por una y no falta nada. «Mañana viene tu tía con el costal», dice, y apunta en un papelito lo que queda por conseguir. La casa ya huele a víspera.',
    refri: 'Habas peladas, chochos, fréjol, la primera arveja y tres choclos desgranados.',
  },
  martes: {
    quien: 'la tía, con noticias de medio mundo',
    escena: 'La tía llegó con el costal al hombro y noticias de medio mundo. Entre los tres dejaron la lenteja escogida, la quinua lavada y el maní majado en la piedra. «El jueves esto se llena», advierte. No exagera.',
    refri: 'La lenteja limpia, la col en tiras, la quinua sin espuma y el maní molido.',
  },
  miercoles: {
    quien: 'los primos, y el tío con el bacalao',
    escena: 'Los primos desgranaron más de lo que botaron, que en ellos ya es decir. La vecina mandó col y zapallo de su huerta, y el tío apareció con el bacalao envuelto en papel: se le sacudió la sal y quedó en la tina, en remojo. La refri ya no cierra a la primera.',
    refri: 'El bacalao en remojo, el zapallo partido, y la mesa del desgrane llena de tusas.',
  },
  jueves: {
    quien: 'todos, y todos opinan',
    escena: 'Ya no cabe un alma en la cocina y todo el mundo opina de todo. Tú a lo tuyo: la arveja apretada, la mazorca picada, el mote lavado, el maní fino. La abuela le cambia el agua al bacalao, lo prueba, y por primera vez en la semana no corrige nada.',
    refri: 'Todo lo delicado, listo. Solo queda lo bravo: la tonga.',
  },
  noche: {
    quien: 'la última faena, casi a oscuras',
    escena: 'La casa por fin se calló. Quedan la abuela, tú y la tonga de maíz seco — la faena que se hace de noche porque de día no dio tiempo. El último grano cae cuando ya nadie lo ve. Ahora sí: la olla.',
    refri: 'No queda nada por pelar. Mañana solo se sirve.',
  },
  /* el viernes también se juega: lo de encima del plato */
  viernes: {
    quien: 'todos los que caben, y más',
    escena: 'El queso desmigado, el huevo en rodajas, el maduro todavía caliente. La abuela mira la mesa, mira la olla y te mira a ti: «Sirve tú». Y la puerta no deja de sonar.',
    refri: 'Nada — ya está todo en la mesa. Ahora, a servir.',
  },
};

/* la promesa del Viernes: el texto de la zona final del mapa, donde
   vive El Apuro — la campaña termina el jueves con la olla, y el
   modo sin fin ES el viernes */
export const VIERNES = {
  nombre: 'Viernes Santo',
  titulo: 'Se sirve',
  quien: 'todos los que caben, y más',
  promesa: 'A las once de la mañana la casa se llena y nadie deja de llegar. Sirve raciones mientras el reloj aguante — esto no se acaba: se aguanta.',
};

export const HISTORIA = {
  entradilla: 'Se come un solo día al año y casi nadie la cocina solo. Debajo del queso y la leche hay una fiesta de cosecha más vieja que las iglesias que hoy le ponen fecha: la de agradecer a la Pachamama por sus frutos.',

  capitulos: [
    {
      id: 'origen',
      titulo: 'Antes se llamaba uchucuta',
      icono: 'maiz',
      cuerpo: [
        'Mucho antes de la Semana Santa, en los Andes ya se cocinaba esta olla. Se llamaba <b>uchucuta</b>: en kichwa, granos tiernos cocidos con ají y hierbas. Se hacía con lo primero que daba la tierra —choclo, fréjol, habas, mellocos, zapallo, sambo— y se comía con carne de llama.',
        'No era una comida cualquiera: era la del <b>Mushuk Nina</b>, la fiesta del Fuego Nuevo, y la del <b>Pawkar Raymi</b>, la del florecimiento. Se apagaban los fogones y se encendía fuego nuevo para estrenar el año. Comerse los primeros granos tiernos, todos juntos en una olla, era la manera de darle las gracias a la <b>Pachamama</b>: la tierra había vuelto a responder, y eso se celebra comiéndosela juntos.',
      ],
    },
    {
      id: 'fecha',
      titulo: 'Por qué cae justo en Semana Santa',
      icono: 'hoja',
      cuerpo: [
        'No es casualidad, y no es que una tradición haya reemplazado a la otra: es que las dos miran <b>el mismo día del cielo</b>.',
        'El Mushuk Nina se celebraba en el <b>equinoccio de marzo</b>. Y la Pascua cristiana no tiene fecha fija: se calcula como el primer domingo después de la primera luna llena que sigue a ese mismo equinoccio. El calendario que llegó de Europa cayó encima del andino sin tener que moverlo.',
        'Por eso la fanesca es de Viernes Santo y de cosecha a la vez. Son dos calendarios comiendo del mismo plato.',
        'Y si este juego dice <b>jueves santo</b>, no es un despiste: pelar, desgranar y desvainar toma la tarde entera, así que la olla se deja lista la víspera. El jueves se cocina; el viernes se sirve.',
      ],
    },
    {
      id: 'nombre',
      titulo: 'El nombre no lo sabe nadie',
      icono: 'cuaderno',
      cuerpo: [
        'Hay tres explicaciones y ninguna está probada. Se repiten como si fueran datos, pero son hipótesis:',
        '· Del latín <b>fames</b> (hambre) — de ahí <i>famesco</i>, tener hambre.<br>· De <b>faneca</b>, un pescado corriente para los españoles.<br>· De <b>juanesca</b>, por las mujeres que cocinaban en haciendas y conventos; cuenta la versión más contada que una tal Juana la servía en un convento de Quito.',
        'Que el plato más simbólico del país tenga el origen del nombre en disputa dice bastante: llegó hasta aquí por la cocina y la boca, no por los papeles.',
      ],
    },
    {
      id: 'granos',
      titulo: 'Doce apóstoles encima, la Pachamama debajo',
      icono: 'granos_mixtos',
      cuerpo: [
        'Los españoles le pusieron encima la lectura que hoy todos repiten: los <b>doce granos son los doce apóstoles</b> y el bacalao es Cristo. Eso tiene nombre — <b>sincretismo</b>: vestir de misa una fiesta que ya existía, para que lo de antes pareciera venir de ellos.',
        'Pero rasca el caldo y ahí sigue lo primero: una olla de cosecha para <b>agradecer a la Pachamama</b> por sus frutos, con los granos tiernos de marzo. Decirlo no es resentimiento — es la alegría de descubrir que en medio de la fiesta religiosa hay algo más, y que ese algo nunca se fue. Como la paja de páramo de Dolores Cacuango: la arrancaron, y volvió a crecer dentro de la misma olla.',
        'Mira de dónde viene cada grano y el plato lo cuenta solo. No es un plato indígena con añadidos ni un plato español con adornos: es literalmente las dos despensas revueltas y hervidas juntas hasta que no se pueden separar.',
      ],
      cita: CACUANGO_PARAMO,
      granos: [
        { n: 'Choclo', de: 'aca' }, { n: 'Fréjol', de: 'aca' },
        { n: 'Chochos', de: 'aca' }, { n: 'Zapallo', de: 'aca' },
        { n: 'Sambo', de: 'aca' }, { n: 'Melloco', de: 'aca' },
        { n: 'Maní', de: 'aca' }, { n: 'Quinua', de: 'aca' },
        { n: 'Habas', de: 'alla' }, { n: 'Arveja', de: 'alla' },
        { n: 'Lenteja', de: 'alla' }, { n: 'Garbanzo', de: 'alla' },
        { n: 'Mote', de: 'aca' }, { n: 'Col', de: 'alla' },
        { n: 'Leche y queso', de: 'alla' }, { n: 'Bacalao', de: 'alla' },
      ],
    },
    {
      id: 'bacalao',
      titulo: 'Un pescado del Atlántico Norte, a 2.800 metros',
      icono: 'bacalao',
      cuerpo: [
        'Pregunta incómoda: ¿qué hace un bacalao del mar del norte en una sopa de páramo, en un país con costa propia y pescado fresco a un día de camino?',
        'La respuesta es la Cuaresma. La Iglesia prohibía la carne roja en vigilia, así que había que comer pescado. Pero no había hielo ni trenes: el único pescado capaz de cruzar el Atlántico y después <b>subir a los Andes</b> era el que venía seco y enterrado en sal. La sal no era condimento, era el transporte.',
        'Por eso el primer gesto de quien cocina fanesca es <b>quitarle la sal</b>: se le sacude la sal gruesa de encima y se pone en remojo desde la víspera, con aguas que se cambian y se botan. Recién entonces se cocina en leche y se desmenuza. Desalar el bacalao es deshacer un viaje de siglos para poder comérselo.',
      ],
    },
    {
      id: 'unidad',
      titulo: '«Si se va el grano, se va la fila»',
      icono: 'maiz',
      cuerpo: [
        'Cualquiera que haya desgranado un choclo lo sabe con las manos antes que con la cabeza: un grano del centro, apretado por los cuatro lados, no sale. Hay que empezar por una orilla — y en cuanto sale el primero, la hilera entera se va sola.',
        '<b>Tránsito Amaguaña</b> usó exactamente esa imagen, y no como metáfora bonita: la dijo explicando por qué los peones de hacienda tenían que organizarse.',
        'No es que el juego se parezca a la frase. Es que la frase describe la mecánica: aquí un grano solo se suelta cuando le falta un vecino, y en cuanto falta uno se va la hilera completa. Ella lo sabía porque desgranaba choclo.',
      ],
      cita: AMAGUANA_MAZORCA,
    },
    {
      id: 'voces',
      titulo: 'Las que lo dijeron primero',
      icono: 'cuaderno',
      cuerpo: [
        'Las dos nacieron en <b>Pesillo, Cayambe</b>, en haciendas donde sus familias eran huasipungueras: trabajaban la tierra del patrón a cambio de un pedazo para sembrar. En 1926 encabezaron juntas la primera huelga de trabajadores de hacienda del país.',
        '<b>Dolores Cacuango</b> (1881–1971) fundó en 1946 la primera escuela bilingüe kichwa-castellano del Ecuador, cuando enseñar en kichwa era motivo de persecución. Fue de las fundadoras de la Federación Ecuatoriana de Indios.',
        '<b>Tránsito Amaguaña</b> (1909–2009) caminó veintiséis marchas a Quito, estuvo presa, y vivió cien años. Cuando le preguntaban qué había sacado de todo eso:',
        'Y de la generación que siguió, <b>Blanca Chancoso</b>, kichwa otavalo, cofundadora de Ecuarunari y de la CONAIE, insiste en algo que este plato demuestra solo: que sembrar y cocinar son también una manera de acordarse.',
      ],
      citas: [CACUANGO_PARAMO, AMAGUANA_SANGRE, CHANCOSO_AGRICULTURA],
    },
  ],

  fuentes: [
    { t: 'Fanesca — Wikipedia en español', u: 'https://es.wikipedia.org/wiki/Fanesca' },
    { t: 'Origen y permanencia de la Fanesca — Archivo Metropolitano de Historia de Quito', u: 'http://archivoqhistorico.quito.gob.ec/index.php/quito-y-sus-historias/36-origen-y-permanencia-de-la-fanesca' },
    { t: 'El origen de la fanesca, un plato que empezó con carne de llama — Primicias', u: 'https://www.primicias.ec/noticias/entretenimiento/gastronomia/semana-santa-fanesca-origen-historia-ecuador/' },
    { t: 'La historia de la fanesca — Infobae', u: 'https://www.infobae.com/america/america-latina/2022/04/16/la-historia-de-la-fanesca-la-sopa-ecuatoriana-que-recuerda-a-jesus-y-sus-apostoles/' },
    { t: 'Tránsito Amaguaña, la líder indígena que vivió cien años — Infobae', u: 'https://www.infobae.com/america/america-latina/2021/07/11/la-historia-de-transito-amaguana-la-lider-indigena-ecuatoriana-que-vivio-hasta-los-100-anos/' },
    { t: 'Tránsito Amaguaña — biografía y logros (Lifeder)', u: 'https://www.lifeder.com/transito-amaguana/' },
    { t: 'El legado de Dolores Cacuango — Fundación Rosa Luxemburg', u: 'https://www.rosalux.org.ec/pdfs/D-Cacuango.pdf' },
    { t: 'Entrevista a Blanca Chancoso — FLACSO Andes', u: 'https://www.flacsoandes.edu.ec/web/imagesFTP/BLANCA_CHANCOSO.pdf' },
  ],
};

/* ---------- lo que se gana al terminar cada ingrediente ---------- */

export const TARJETAS = {
  maiz: {
    titulo: 'El choclo, y la fila que se va sola',
    texto: 'El choclo es de aquí: llevaba miles de años en estos valles cuando llegó todo lo demás. Se desgrana empezando por una orilla, porque el grano del centro está trabado por sus cuatro vecinos — que es exactamente la imagen que usó Tránsito Amaguaña para explicar por qué había que organizarse.',
    cita: AMAGUANA_MAZORCA,
    abre: ['unidad'],
  },
  habas: {
    titulo: 'El haba cruzó el mar',
    texto: 'El haba no es americana: llegó del Mediterráneo y se quedó a vivir en el páramo, donde el frío no la mata. Hoy nadie la siente ajena. En la misma olla van habas de allá y choclo de aquí, y ya no hay manera de separarlos.',
    abre: ['granos'],
  },
  frejol: {
    titulo: 'El fréjol, de este lado',
    texto: 'El fréjol sí es de acá, domesticado en América mucho antes de que existiera la Cuaresma. Iba en la uchucuta, la olla de granos tiernos que se comía en el Mushuk Nina para estrenar el año agrícola. La fanesca es esa olla, con otro nombre y otra fecha encima.',
    abre: ['origen', 'fecha'],
  },
  chochos: {
    titulo: 'Lo amargo se quita con paciencia',
    texto: 'El chocho crudo es tóxico y amarguísimo: no se come sin antes pasar días en agua corriente, cambiándola. Nadie descubrió eso en una tarde. Es conocimiento acumulado por generaciones y transmitido casi siempre entre mujeres, de una cocina a otra, sin escribirse en ninguna parte.',
    abre: ['origen'],
  },
  escoger: {
    titulo: 'Escoger el grano, que se hace entre varias',
    texto: 'Escoger el grano —sacarle las piedritas y lo picado— es de las pocas tareas que se hacen sentadas y en conjunto. Por eso la fanesca casi nunca se cocina sola: no es que sea difícil, es que da para conversar. La olla más simbólica del país es, en la práctica, una excusa para juntarse.',
    cita: CHANCOSO_AGRICULTURA,
    abre: ['voces'],
  },
  zapallo: {
    titulo: 'Zapallo y sambo, los dos hermanos',
    texto: 'Zapallo y sambo son americanos y son la base: cocidos con la leche y hechos puré, son lo que le da cuerpo a la fanesca. Lo dulce de abajo, que sostiene los doce granos sin que se note. Casi nunca se los nombra, y sin ellos no hay plato.',
    abre: ['nombre'],
  },
  arveja: {
    titulo: 'La que llegó con las otras',
    texto: 'La arveja vino del mismo lado que la haba y el garbanzo, y como ellas se quedó. En la olla nadie las separa por origen: se separan por gesto, que es lo único que distingue de verdad un grano de otro cuando lo tienes en la mano.',
    abre: ['granos'],
  },
  melloco: {
    titulo: 'El que se defiende',
    texto: 'El melloco es andino y es terco: no se pela, se refriega bajo el agua para sacarle la tierra y la baba que suelta, y apretándolo se dispara. En la sierra se lo come desde antes de que existiera la palabra fanesca, y sigue entrando en la olla sin que casi nadie lo nombre.',
    abre: ['origen'],
  },
  col: {
    titulo: 'La col, que llegó y se hizo indispensable',
    texto: 'La col cruzó el Atlántico con los españoles y terminó picada finita en una sopa andina de Semana Santa. Es el ejemplo más doméstico de lo que hace este plato: no adoptó la col como adorno, la volvió estructura.',
    abre: ['granos'],
  },
  quinua: {
    titulo: 'El grano que se defiende con jabón',
    texto: 'La quinua se cubre de saponina para que no se la coman los pájaros, y ese jabón amarga la olla si entra con ella. Quitarlo es agua y vueltas, igual que desamargar el chocho: dos granos de aquí que exigen paciencia antes de dejarse comer. Nadie descubrió eso en una tarde.',
    abre: ['origen'],
  },
  mani: {
    titulo: 'Majar, que es el gesto más viejo',
    texto: 'Moler en piedra es anterior a todo lo demás que hay en esta cocina: a la olla, al fogón, al calendario que le puso fecha al plato. El maní es americano y se maja como se ha majado siempre — tostado primero, yendo y viniendo, sin atajo, hasta que con la leche se vuelve la crema que espesa el caldo. Es el único ingrediente que no premia la maña sino la insistencia.',
    cita: CHANCOSO_AGRICULTURA,
    abre: ['origen', 'voces'],
  },
  bacalao: {
    titulo: 'La sal era el barco',
    texto: 'El bacalao llegó por una regla religiosa —nada de carne en vigilia— y se quedó por una razón física: sin frío, el único pescado que podía cruzar el Atlántico y subir a los Andes era el que venía seco y enterrado en sal. Sacudirle la sal y dejarlo en remojo, como acabas de hacer, es empezar a deshacerle el viaje; mañana se cocina en leche.',
    abre: ['bacalao'],
  },
  garbanzo: {
    titulo: 'La camisita del remojo',
    texto: 'El garbanzo vino del Mediterráneo con los mismos barcos que el haba, y aprendió las mismas costumbres: una noche entera en agua antes de tocar la olla. A la mañana la piel ya no está pegada — está puesta, floja, y sale frotando. En muchas casas es el paso que les toca a los niños, porque no se puede hacer mal.',
    abre: ['granos'],
  },
  sambo: {
    titulo: 'El primo pálido',
    texto: 'El sambo es de estas mismas tierras que el zapallo, y en la fanesca entran los dos: el zapallo en cubos que se ven, el sambo en hebra que desaparece. Rallado y hervido se deshace entero en el caldo — nadie lo encuentra en el plato y sin él el caldo no es el mismo. Hay ingredientes que trabajan así, sin firmar.',
    abre: ['origen'],
  },
  mote: {
    titulo: 'El grano que ya vino cocido',
    texto: 'El mote es maíz seco pelado con cal o con lejía de ceniza —el mismo truco que el nixtamal de México, aprendido en estos Andes por su cuenta— y llega del mercado ya cocido. Lo turbio que suelta al lavarse es la cal y el hollejo que le quedaron, no mugre: por eso no se lava mirando espuma, como la quinua, sino mirando el agua. Cada grano de esta cocina se lava distinto, y saber cuál es cuál también es cocinar.',
    abre: ['origen'],
  },
  queso: {
    titulo: 'La miga, nunca el cuchillo',
    texto: 'El queso fresco se desmigaja con los dedos porque la miga se funde en el caldo y el cubo de cuchillo no: flota entero, como ajeno. La leche y el queso son la capa que el calendario católico le puso encima a la olla de granos — la vigilia prohibía la carne, no la vaca — y a estas alturas ya son tan de la fanesca como el choclo.',
    abre: ['granos'],
  },
  huevo: {
    titulo: 'Lo de encima también cuenta',
    texto: 'El huevo duro no va dentro de la fanesca: va encima, en rodajas, coronando el plato con el maduro y las empanaditas. Es la señal de que este plato no se sirve — se ARMA, y cada casa lo arma distinto. Pelarlo bien tiene su truco de toda la vida: cascarlo a golpecitos y jalar desde la grieta, nunca de a poquitos.',
  },
  guarnicion: {
    titulo: 'El plato se arma',
    texto: 'Maduro frito, empanaditas de viento, el ají al lado: la guarnición es la firma de cada casa sobre un plato que es de todos. Dos fanescas con la misma olla no llegan iguales a la mesa. Y el maduro tiene una sola regla, que ya conoces: se voltea cuando dora — ni antes, que queda pálido, ni después, que ya no hay maduro.',
  },
};

export const CIERRE = 'Doce granos de dos orillas, un pescado del norte y una fiesta de cosecha que sobrevivió debajo de otra. La Pachamama puso los frutos; las manos, todo lo demás. Por eso se sirve en un solo plato, y por eso se come entre varios.';
