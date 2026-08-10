/* ============================================================
   LA FANESCA — version.js
   La versión de la app y su nota de versiones, en UN solo sitio.

   Lo cargan dos mundos:
   - la página (index.html), para mostrar la versión y las
     novedades;
   - el service worker (sw.js) vía importScripts, para nombrar su
     caché: subir la versión aquí ES publicar una actualización.

   REGLA DE RELEASE: todo cambio que deba llegar a los jugadores
   sube APP_VERSION y añade su entrada arriba de NOVEDADES. Sin
   ese bump, los que ya instalaron la app se quedan con la copia
   guardada — que es justo lo que hace que funcione sin conexión.
   ============================================================ */

const APP_VERSION = '1.9.0';

/* la más reciente primero */
const NOVEDADES = [
  {
    v: '1.9.0',
    fecha: '2026-08-10',
    titulo: 'La cocina se ve como se debe ver',
    cambios: [
      'La interfaz entera se rehízo: paneles de vidrio con filo dorado, la cabecera con el ingrediente y su icono, la barra con el porcentaje al lado y el reloj con su cronómetro.',
      'Los cuencos cuentan en voz alta: cuántos granos llevas y cuántas cáscaras botaste, sobre cada uno. La cuenta se lleva en el motor, así que los doce ingredientes la muestran sin que ninguno pueda olvidarse de sumar.',
      'Los aciertos seguidos ya no son un numerito de esquina: son un cartel grande —¡BIEN!, ¡PERFECTO!, ¡IMPARABLE!— y cada grano suelta su +10 volando hacia la batea.',
      'Nuevo medidor de ritmo: PERFECTO, BIEN, REGULAR o LENTO, con la aguja corriendo contra los mismos umbrales con los que se ganan las cucharas. El reloj por fin dice algo mientras juegas.',
      'A la derecha, los pasos del nivel se tachan solos; abajo, el camino de los doce ingredientes va contigo sin salir de la cocina.',
      'Y la cocina tiene cosas: ollas de barro en la repisa, un textil andino sobre el mesón, una ventana que explica de dónde viene el sol, y un foco tibio sobre la tabla para que lo que estás cocinando sea lo más brillante del cuadro.',
    ],
  },
  {
    v: '1.8.0',
    fecha: '2026-08-09',
    titulo: 'El dedo que aprieta',
    cambios: [
      'Cambia la regla del bicho, y con ella la tensión del juego: barrer ya no lo aplasta —el dedo que va de paso solo lo empuja y lo deja rodando— pero posarle la yema encima sí. Apretar es lo único que en una cocina de verdad revienta a un gusano. La primera vez se te perdona; la segunda se bota la olla.',
      'El reloj vuelve a verse. Estuvo escondido una versión entera, y como las cucharas salen de él, taparlo era pedirte que corrieras contra un número secreto.',
      'Arreglado, y no era menor: el reloj no se reiniciaba entre ingredientes. Si salías a la mesa a medio jugar y entrabas a otro, empezaba con el tiempo del anterior sumado encima — y de ahí salían tus cucharas.',
      'Los mensajes se ven: los avisos entran con un golpe, tienen color según si es peligro o celebración, y las pistas pesan más. Sobre una cocina en 3D, un aviso que aparecía con un fundido suave no lo veía nadie.',
      'La frase de Tránsito Amaguaña sobre la mazorca ya no sale dos veces: si se te da la cascada, se te guarda para la tarjeta del final; si vas grano por grano sin que se suelte la hilera, aparece a mitad y ahí sí te enseña el truco.',
    ],
  },
  {
    v: '1.7.3',
    fecha: '2026-08-09',
    titulo: 'El melloco deja de castigar la prisa',
    cambios: [
      'El melloco se disparaba casi siempre: medía el apuro por cuadro de animación, así que en un teléfono lento el mismo gesto contaba como más brusco. Ahora mide la velocidad de la mano de verdad, suavizada, y con el dedo el doble de gordo. Raspar rápido raspa; solo el tirón con ansias lo hace resbalar.',
      'Arreglado en el choclo: al pasar de jalar una hoja a girar la mazorca, la animación de la hoja cerrándose reventaba por dentro en cada cuadro. No se veía, pero era un error por gesto.',
      'El fréjol ya se barre rápido: el dedo junta todo lo que cruza en el camino, no solo lo que había justo donde el navegador alcanzó a avisar. Antes, una barrida ligera pasaba por encima de los granos y los dejaba ahí.',
    ],
  },
  {
    v: '1.7.2',
    fecha: '2026-08-09',
    titulo: 'La arveja vuelve a abrir',
    cambios: [
      'Arreglado, y era grave: la arveja no abría. Se le daba clic y el juego devolvía a la mesa con un "no se pudo abrir ese ingrediente" — un error de escritura la tenía rota desde la versión pasada. Ya está.',
      'Y de paso se le puso el mismo dedo gordo que a las habas: correr el pulgar por la vaina abierta se lleva todo lo que roza, sin apuntarle a cada arveja.',
    ],
  },
  {
    v: '1.7.1',
    fecha: '2026-08-09',
    titulo: 'Rapidez, no puntería',
    cambios: [
      'Las habas ya no piden dedo de cirujano: todo lo que quede bajo la yema se viene, el barrido va juntando lo que roza, y la vaina se abre aunque el dedo pase apenas rozándola. Además están más gordas.',
      'El zapallo se entiende: cualquier trazo largo lo parte (chueco vale), el cuchillo toma solo la línea más cercana, y la cáscara sale se jale por donde se jale. Las pistas ahora hablan de la pantalla — "un trazo de arriba a abajo" — no de la cocina.',
      'El gusanito del choclo ya no se esconde: repta hacia el lado que estás mirando, así que gires como gires la mazorca, siempre lo tienes enfrente. Y camina más despacio, con más tiempo de gracia.',
      'Desgranar perdona el arranque: si el dedo empieza un pelo afuera del grano y baja por la hilera, desgrana igual — antes ese gesto se tomaba por girar y no pasaba nada. Y con las hojas ya peladas, agarrar el choclo por donde sea arranca la envoltura: no hay que apuntarle a los pelos.',
      'Arreglado: si el grano que escondía al gusanito se reventaba, el bicho quedaba sepultado en la papilla y no salía nunca. Ahora se despierta igual.',
    ],
  },
  {
    v: '1.7.0',
    fecha: '2026-08-09',
    titulo: 'El camino a la olla',
    cambios: [
      'La mesa es ahora un camino: los doce ingredientes serpentean hasta la olla, con el sendero recorrido en dorado y el siguiente paso latiendo. Se abre mostrando dónde vas.',
      'Tocar un gusanito ya no arruina nada: lo asusta. El peligro siempre fue barrer sin mirar — y hasta ahí llega el perdón: la primera aplastada de cada nivel se disculpa, la segunda no.',
      'El bicho cargado va pegado al dedo, adelante, como debe. Y agarrarlo ya no pide puntería: cerca es suficiente, con uno o dos dedos.',
      'El reloj ya no se ve mientras juegas: corre por dentro y se cuenta al final, con las cucharas cayendo de a una. Leer una cita tampoco cuesta tiempo — el reloj se detiene solo.',
      'Los aciertos seguidos suenan cada vez más agudo, la batea rebota al recibir, y perder te dice cuán cerca estabas.',
      'Cocinar días seguidos enciende una racha 🔥 que se ve en la mesa.',
      'Terminar un nivel lleva directo al siguiente, sin escalas. Y mantener apretado el fréjol ya no selecciona texto ni se corta si te tiembla el dedo.',
      'La historia, más honesta: los doce apóstoles fueron el vestido que le pusieron encima — debajo sigue la fiesta de agradecerle a la Pachamama por sus frutos. Como la paja de páramo: la arrancaron, y volvió a crecer dentro de la misma olla.',
    ],
  },
  {
    v: '1.6.0',
    fecha: '2026-08-09',
    titulo: 'Todo más grande, y el zapallo entero',
    cambios: [
      'El zapallo ya no llega en rodajas: llega redondo y con su rabo. Se parte de un trazo, se le barre el hueco de pepas y hebras, se le jala la cáscara tira por tira, y recién ahí se corta en tajadas. Cuatro faenas seguidas — es el nivel más largo de la mesa y el que más se parece a estar cocinando.',
      'Todo se ve más grande. Menos cosas en la tabla y más gordas: doce chochos en vez de veinticuatro, la lenteja al doble, la arveja y la quinua también. La cámara se acercó y mira más abajo, así que la mesa llena el cuadro en vez de la pared de azulejo.',
      'La mesa muestra ahora el mapa completo: los doce que se juegan, la olla al final —que se abre cuando están todos— y lo que todavía no tiene minijuego (el sambo, el garbanzo, el arroz, el queso, el huevo, la guarnición), apagado y tocable para leer qué gesto va a pedir.',
      'Rachas: los aciertos seguidos se cuentan y se celebran, con el contador junto al reloj. La barra late al subir y la faena avisa a mitad y a tres cuartos.',
      'Arreglado: al pellizcar un bicho saltaba hacia atrás y se sentía como que se soltaba justo al agarrarlo. Ahora viene hacia ti, cargado bajo los dedos.',
      'Nada que haya que tocar mide ya menos que la yema de un dedo.',
    ],
  },
  {
    v: '1.5.0',
    fecha: '2026-08-08',
    titulo: 'Doce granos, de verdad',
    cambios: [
      'Cinco ingredientes nuevos, y con ellos la olla llega a doce: la arveja, el melloco, la col, la quinua y el maní.',
      'La arveja no se abre frotándola como el haba: está cosida por un hilo que hay que jalar del rabito, a lo largo. Recién ahí el pulgar corre por encima y salen en cadena.',
      'El melloco se te dispara si lo empujas de golpe. Se raspa parejo, y la baba se ve irse: la cáscara pasa de brillante a mate.',
      'La col se enrolla como un cigarro y se corta al través. Cortar grueso no te frena en el momento — te frena después, cuando se te acaba la col y toca traer otra.',
      'La quinua es la primera batea con agua del juego: se remueve en círculos hasta que espuma, y ahí se bota el agua y se empieza otra. Ir y venir en línea recta no lava nada.',
      'El maní se maja en piedra, yendo y viniendo. Cada pasada empuja los granos a la orilla, donde la piedra ya no muerde: hay que arrimarlos de vuelta.',
      'La olla grande ahora cuenta hasta doce, con una frase por ingrediente que entra.',
    ],
  },
  {
    v: '1.4.0',
    fecha: '2026-08-08',
    titulo: 'La fanesca, en su propia cocina',
    cambios: [
      'El juego se mudó a su propio sitio: ya no es un minijuego dentro de otra cocina, sino la olla entera. Se instala solo, se actualiza solo y abre en su propia pantalla.',
      'Tu progreso se viene contigo: los tiempos y las cucharas que ya te habías ganado siguen ahí.',
    ],
  },
  {
    v: '1.3.0',
    fecha: '2026-08-08',
    titulo: 'Menos plástico, más plastilina',
    cambios: [
      'Nada en la mesa es ya una esfera perfecta: los granos, las lentejas, los chochos y las vainas salen amasados, cada uno con su forma. El zapallo estrena gajos y por fin se ve zapallo y no pan.',
      'El choclo se ve como se ve un choclo: los granos van al tresbolillo (encajados, no en cuadrícula), las hojas tienen nervadura y se cierran en punta, y el penacho de pelos se vence en vez de apuntar como palillos.',
      'Las hojas peladas cuelgan junto al choclo en vez de acostarse sobre la mesa tapando los cuencos.',
      'Arreglado: la tabla de picar atravesaba la batea y la composta en todos los niveles.',
      'La cocina se ilumina como una foto de plastilina: luz suave, sin brillos de juguete y sin claros quemados.',
      'Cambiar de nivel ya no deja modelos viejos ocupando memoria — importa en teléfonos, después de un rato jugando.',
    ],
  },
  {
    v: '1.2.0',
    fecha: '2026-08-08',
    titulo: 'Los modelos, en archivos que se pueden esculpir',
    cambios: [
      'Cada cosa que se ve en la mesa de prep —el grano, la hoja, el gusano, la lenteja— pasó a tener su propio archivo en modelos/. Los niveles ya no dibujan: piden sus piezas y las colocan.',
      'Se pueden editar en Blender: la herramienta en herramientas/ exporta las 28 piezas a .glb, y el juego usa tu versión en cuanto la devuelvas.',
      'Todos los colores en un solo sitio, y los del sistema de diseño se leen en vivo: si cambia la paleta, esta cocina se repinta sola.',
    ],
  },
  {
    v: '1.1.2',
    fecha: '2026-08-07',
    titulo: 'La cabecera ya no se esconde tras el notch',
    cambios: [
      'Arreglado: en iPhone con notch o Dynamic Island, la barra de arriba (progreso, título del nivel, reloj) quedaba parcialmente tapada. Ahora respeta el área segura.',
    ],
  },
  {
    v: '1.1.1',
    fecha: '2026-08-07',
    titulo: 'Pellízcalos: cuesta menos atrapar al bicho',
    cambios: [
      'Nuevo gesto: pellizca el bicho con dos dedos (o arrástralo con uno, como antes) para cargarlo hasta la composta. El pellizco perdona más: agarra al más cercano aunque el dedo no caiga justo encima.',
      'Botón de modo dev en la portada, para abrir los siete niveles de una vez y probar cualquier mecánica sin jugarse los anteriores.',
    ],
  },
  {
    v: '1.1.0',
    fecha: '2026-08-07',
    titulo: 'El choclo entero (y dos manos más en la mesa)',
    cambios: [
      'El choclo llega con hojas: se deshoja jalando hacia abajo, y van dos por olla — el tierno revienta si pasas el dedo con fuerza; el duro pelea grano a grano.',
      'Dos niveles nuevos: pelar chochos y escoger la lenteja.',
      'Más voces en el cuaderno: Tránsito Amaguaña, Dolores Cacuango y Blanca Chancoso.',
      'La fanesca estrena icono propio: su choclo a medio deshojar.',
      'Los gusanos ya caminan SOBRE la tabla de picar, no medio hundidos.',
    ],
  },
  {
    v: '1.0.0',
    fecha: '2026-08-07',
    titulo: 'Se prende el fogón',
    cambios: [
      'La mesa de prep en 3D: desgrana, desvaina y pica con los dedos.',
      'Cinco ingredientes, cinco gestos, y una sola regla para los bichos: al gusanito se lo saca, no se lo aplasta.',
      'El cuaderno: de dónde sale esta olla, capítulo por capítulo, y se abre con las manos.',
      'La app se instala y funciona sin conexión; se actualiza sola al volver el internet.',
    ],
  },
];
