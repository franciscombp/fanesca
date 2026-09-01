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

   DOS LISTAS, Y NO SE MEZCLAN:

     cambios[]  lo que el JUGADOR ve. Es lo único que sale en la
                nota de versión, y se escribe para alguien que
                está cocinando, no para quien programa: qué le
                cambia en las manos, en una línea, sin nombres de
                archivos ni de funciones.

     internos[] la bitácora de autor. No se muestra NUNCA. Aquí
                van las herramientas de desarrollo, los cambios de
                arquitectura y lo que no se nota jugando.

   Si una versión no tiene nada en `cambios`, no hay nota que
   mostrar: al jugador no se le interrumpe para contarle algo que
   no le pasó a él.
   ============================================================ */

const APP_VERSION = '1.22.0';

/* la más reciente primero */
const NOVEDADES = [
  {
    v: '1.22.0',
    fecha: '2026-09-01',
    titulo: 'Sigue, y la pista que se relee',
    cambios: [
      'El botón «Sigue» flota al pie del recetario: desde cualquier punto, un toque te lleva a la parada que toca — y a la olla cuando ya no queda semana.',
      'En el mesón apareció el «?»: repite la última pista, las veces que haga falta. La enseñanza deja de ser una ventana de diez segundos irrepetibles.',
      'Las cucharas por fin se explican donde se ven: «tu tiempo, en cucharas — tres es mano de abuela».',
      'La portada con progreso habla claro: cuántas paradas llevas y por qué día vas.',
    ],
    internos: [
      'ultimaPista se guarda en pistaAhora y arranca en el gesto del ingrediente por nivel (jugar/montarRacion); #btn-pista la repite sin parar el reloj.',
      '#btn-sigue pintado por renderMesa (sigueAccion): siguiente parada abierta, o mostrarFinal con la campaña lista; oculto con todo servido. .scroll de la mesa con padding para no taparlo.',
      'pintarPortada: avance en paradas y día; botón «Abrir el recetario» sin progreso.',
    ],
  },
  {
    v: '1.21.0',
    fecha: '2026-09-01',
    titulo: 'Cada uno con su cara',
    cambios: [
      'Los seis nuevos ya tienen su propio dibujo en el recetario: el garbanzo con su piquito, el sambo con sus vetas, la rueda de queso, el huevo con su grieta y el maduro de la guarnición.',
      'El cronómetro recuperó su relojito ⏱ — se lo comía el primer repintado.',
      'La racha de días ahora va con el reloj de tu casa: cocinar en la noche ya no cuenta como mañana.',
      'El Apuro con cero raciones ya no te celebra ni presume «récord: 0» — te dice cómo se empieza.',
      'Las citas ya no aparecen en pleno Apuro: el contrarreloj no es sitio para leer, y todas se releen en el cuaderno.',
    ],
    internos: [
      'pintarReloj escribe en #hud-tiempo-n (no en la píldora); fechaLocal() en racha y récord del Apuro; voz() sale temprano si Apuro.activo.',
      'montarRacion aborta si el modo murió durante el montaje asíncrono (el nivel se construía detrás del modal de resumen).',
      'cerrarApuro: fiesta solo con raciones > 0; apuro-mejor con rama honesta para récord 0.',
      'aria-labelledby en los cinco modales; .portada-link a 44px tocables; ICONS.garbanzo/sambo/queso/huevo/maduro en icons.js.',
    ],
  },
  {
    v: '1.20.0',
    fecha: '2026-09-01',
    titulo: 'La despensa, vacía: cocinan los dieciocho',
    cambios: [
      'Los seis que esperaban en la despensa ya tienen minijuego, cada uno con su gesto: frotar el garbanzo remojado, rallar el sambo, agitar el arroz hasta que el agua salga clara, desmigar el queso (y la leche de un solo golpe), cascar y pelar el huevo duro, y freír el maduro para armar el plato.',
      'La semana creció a 46 paradas: el garbanzo llega el martes con el costal, el sambo el miércoles desde la huerta, el arroz el jueves con la casa llena.',
      'El Viernes Santo ahora se juega: con la olla servida se abren el queso, el huevo y la guarnición — lo de encima del plato — y al armarlo, la mesa queda puesta.',
      'El Apuro reparte ahora dieciocho ingredientes, con la mosca rondando el queso y la sartén contra el reloj.',
      'Seis tarjetas nuevas para el cuaderno: la camisita del remojo, el primo pálido, el agua que sale blanca, la miga y la leche, lo de encima, y el plato que se arma.',
    ],
    internos: [
      'nivel-garbanzo/sambo/arroz/queso/huevo/guarnicion.js: seis módulos con el contrato de siempre; piezas en modelos/despensa.js (paleta ampliada). Todos con token de generación para sus setTimeout — el siguiente huevo se plantaba en el mesón del nivel siguiente.',
      'DIAS: martes/miércoles/jueves a 9 paradas; día viernes con sirve:true — desbloqueado() y el candado del recetario miran ollaVista; la olla, el final y su cuenta (129 cucharas) miden solo la campaña de 43.',
      'APURO.raciones: 18 entradas con porciones calibradas (guarnición con presas:1); SIN_FIN para los seis. POR_VENIR = [] y la despensa no se dibuja vacía.',
      'maduro en Group: la forma vive en la escala del mesh y escalarlo directo la borraba (tajada del tamaño de la pantalla).',
    ],
  },
  {
    v: '1.19.0',
    fecha: '2026-09-01',
    titulo: 'El recetario de la abuela',
    cambios: [
      'La semana ya no es un mapa: es el recetario de la abuela. Cada día es una página de la libreta —con su renglón rojo de margen y su letra a mano— y cada parada, un paso numerado de la receta.',
      'Los pasos hechos se tachan con tinta verde y guardan sus cucharas; el que sigue lleva el lápiz y respira.',
      'Al final del cuaderno está la receta grande: la fanesca, con su barra llenándose parada a parada. Y la última página es el Viernes Santo, donde vive El Apuro.',
      'Cada página dice quién está hoy en la cocina y cuánto va del día — la semana entera se hojea en un momento.',
    ],
    internos: [
      'renderMesa: recetario en flujo (secciones .pagina + renglones .renglon) en vez de la serpiente absoluta; adiós zonas/banners/sendero SVG. Clase renglon y no paso: .paso es el kill-switch del HUD viejo del zapallo (display:none !important).',
      'Los renglones de presentación se escriben «El choclo · desgranar» (corto + tarea); las variantes van con su nombre. Autoscroll por rectángulos (offsetTop ya no mide contra el contenedor).',
      'Caveat (Google Fonts) para lo manuscrito: quién vino, números de paso, el sello de «✓ hecho». Fallback cursive.',
      'Portada: «Abrir el recetario»; el letrero de la mesa: «El recetario de la abuela».',
    ],
  },
  {
    v: '1.18.0',
    fecha: '2026-09-01',
    titulo: 'La semana de la fanesca',
    cambios: [
      'El juego ahora es una semana: de lunes a Viernes Santo, con la familia llegando a ayudar día a día — el canasto del mercado, el costal de la tía, los primos al desgrane, la casa llena y la tonga de la noche.',
      'El mapa se volvió un viaje de verdad: cada día con su color y su gente, las paradas numeradas del 1 al 40, y la olla al final del camino llenándose parada a parada.',
      'Cada día que termines tiene su escena: quién vino, qué se contó y qué quedó en la refri.',
      'El Apuro es el Viernes Santo — se abre terminando el lunes y ya no se acaba: pasada la escalera de la campaña, cada tanda sigue apretando de verdad (más bichos, más dañados, más resistencia).',
      'Los siete logros de El Apuro se ven completos al terminar cada partida: los tuyos en color, los que faltan en gris con lo que piden.',
      'Los avisos de la despensa ahora duran lo que toma leerlos.',
    ],
    internos: [
      'DIAS en niveles-config: 5 días × 8 paradas entrelazadas (presentaciones en el orden probado + escaleras en orden, dificultad 1-2→4-5); RUTA se construye de ahí; candado lineal con gracia (lo hecho nunca se re-cierra).',
      'DIAS_RELATO y VIERNES en historia.js; modal-dia una vez por día (estado.diasVistos); un solo final (la olla, tras la parada 40).',
      'renderMesa: zonas de color por día, banners con quién, nodo-num, olla centrada con barra de llenado, banda del viernes con #btn-apuro mudado dentro (referencia rescatada del innerHTML).',
      'configApuro(base, tanda) + SIN_FIN: extrapolación con topes de parámetros honestos por ingrediente; logro docena por raciones servidas (set aparte de tocados).',
      'Guardado con marca de generación mapa:"semana" (no se hereda del default en cargar); migración de mapa viejo: ollaVista inferida solo sin marca, días completos marcados vistos.',
    ],
  },
  {
    v: '1.17.1',
    fecha: '2026-08-27',
    titulo: 'Lista para las manos de todos',
    cambios: [
      'El rótulo del Acto I ya no se imprime encima de la mesa: tiene su sitio en el camino, como el del Acto II.',
      'El botón de "Nueva versión" ya no aparece en pleno nivel: espera a que vuelvas a la mesa, para no costarle la partida a nadie.',
      'Salir de El Apuro pide un segundo toque —como en la campaña— y guarda siempre lo que llevas, también con la tecla Escape.',
      'En el maíz, la presentación de cada mazorca y el aviso de los granos dañados ya no se pisan: se leen una detrás de la otra.',
      'El cuaderno aclara lo del jueves: la olla se deja lista la víspera, y el Viernes Santo se sirve.',
    ],
    internos: [
      'renderMesa: base del camino 76→176 para que el rótulo del Acto I quede dentro de #mesa-lista (top 58, no −42).',
      'actualizador.js: avisarActualizacion() espera con un intervalo a que #screen-juego deje de estar activa.',
      'motorListo: jugar() y arrancarApuro() no entran sin WebGL; migrar() sanea tipos del guardado (mejores no-objeto, récords sin ms, leidos no-array, dias).',
      'nivel-maiz: presentarMazorca() encola avisarPodridos() a 4,8 s con token contra choclo nuevo y destruir().',
      'niveles-config: «El segundo está duro»→«El choclo duro», «Entra el maíz seco»→«El maíz seco» — sintagmas nominales para «… a la olla» y «Primero …».',
    ],
  },
  {
    v: '1.17.0',
    fecha: '2026-08-27',
    titulo: 'La versión redonda',
    cambios: [
      'El juego por fin enseña y se deja leer: las pistas duran lo que toma leerlas, van en fila —el gesto, la del nivel, el aviso del bicho— y una parada ya superada no repite el tutorial.',
      'El reloj arranca con tu primer toque, no mientras lees: aprender ya no cuesta cucharas.',
      'Terminar el 12º ingrediente sirve la fanesca de verdad, las tarjetas de cada nivel aparecen (estaban mudas las doce) y el cuaderno se abre con ellas.',
      'La temporada cuenta y termina: el marcador sigue después de la olla, el sendero se dora parada a parada, y la parada 40 cierra con "¡Se acabó la cosecha!".',
      'La primera visita va al grano: sin selector de cocinas ni El Apuro estorbando — aparecen cuando ya cocinaste algo. El Apuro se abre con cuatro ingredientes y enseña sus reglas la primera vez.',
      'Las vainas abiertas de arveja y haba ya no muestran granos falsos en la tapa, y los avisos de rutina dejaron de sonar a alarma.',
      'El modo dev salió de la portada: cinco toques en el número de versión lo revelan.',
    ],
    internos: [
      'pista(): duración por palabras (340 ms/u, piso 2,6 s, techo 12 s) y pistasEnFila() con captura de las pistas de construir(). Una pista reactiva corta la fila.',
      'gestos de niveles.js reescritos a una frase; avisoBicho por ingrediente (la mosca se espanta, no se pellizca) y condicionado a que la config traiga bichos.',
      'relojEnEspera: jugar() arma sin arrancar y el primer pointerdown en #escena dispara; completar/arruinar aceptan el estado en espera.',
      'Sendero por orden visual con dorado por parada; marcador por actos; mostrarFinal(temporada) reutiliza el altar con la cuenta de las 40.',
      'Apuro: porciones recalibradas (maíz 0.22 y pelado con hojas:0, col/bacalao 0.30, maní 0.35, zapallo 0.25), cuota congelada en la de tanda 1, castigo con coste y ración perdida visibles 700 ms, la voz no congela su reloj, partida de 0 raciones sin felicitación hueca.',
      'ARRUINADO normaliza el artículo del bicho («El el gusano» y «El mosca», fuera). Banda de dificultad repartida por huecos ideales: el final es la tonga, no diez choclos seguidos.',
      'ollaVista abre el Acto II y migra para quien ya jugaba la temporada; builders.js al PRECACHE.',
    ],
  },
  {
    v: '1.16.0',
    fecha: '2026-08-26',
    titulo: 'Dos actos, y la olla en su sitio',
    cambios: [
      'La mesa se reordenó en dos actos. El primero son los doce ingredientes, uno cada uno, en el orden en que conviene aprenderlos — y termina en la olla. Eso ya es un juego entero con final.',
      'El segundo acto es la temporada: las veintiocho paradas bravas, ordenadas de menos a más y repartidas entre ingredientes. Antes había quince paradas de choclo seguidas antes de ver otra cosa.',
      'La olla dejó de estar escondida al final de cuarenta paradas. Se abre con los doce, que es como fue siempre, y ahora se ve donde le toca.',
      'Las paradas del primer acto se llaman por su ingrediente —"Las habas", "El zapallo"— en vez de por su variante.',
    ],
    internos: [
      'construirRuta() arma Acto I (la variante más suave de cada ingrediente, en orden de gesto) + Acto II (el resto por dificultad, en rueda entre ingredientes dentro de cada banda).',
      'Medido antes: la dificultad bajaba 11 veces de 39 y el juego hacía pico en la parada 15. Ahora el Acto II no baja ni una vez en 27, y el máximo de paradas seguidas del mismo ingrediente pasó de 15 a 6.',
      'El Acto II se abre al cocinar la olla, no al terminar la parada anterior.',
      'El alto del camino salía del ÚLTIMO centro empujado, que ahora es la olla —en medio—, así que las 28 paradas del Acto II se salían del contenedor encima de la despensa. Sale del más profundo.',
    ],
  },
  {
    v: '1.15.0',
    fecha: '2026-08-26',
    titulo: 'El Apuro',
    cambios: [
      'Los doce ingredientes tienen ya su escalera de dificultad: la mesa pasa de 16 paradas a 40. Cada una cambia de verdad —más vainas, más apretadas, más bichos—, no sólo de nombre.',
      'Modo nuevo: El Apuro. Los ingredientes se suceden sin respiro contra el reloj, y cada ración que terminas te DEVUELVE segundos. Los bichos ya no arruinan la partida: te quitan tiempo, y la partida sigue.',
      'Se acabó la ficha antes de cada nivel. Ahora tocas un ingrediente y ya estás cocinando: el gesto se explica dentro, sobre el mesón, que es donde se puede aplicar mientras se lee.',
      'Arreglada la arveja: las vainas se montaban de dos en dos y las arvejas salían atravesadas respecto a su propia vaina.',
      'Al final de cada partida de El Apuro se abre una página del cuaderno —de un ingrediente que acabas de tener en la mano— y se cantan los logros nuevos, que sólo salen la primera vez.',
    ],
    internos: [
      'modo-apuro.js no sabe jugar a nada: se engancha a api.progreso / api.completar / api.arruinar y encadena los niveles que ya existen. Añadir el modo no tocó ni un nivel.',
      'Una ración es una PORCIÓN del nivel (APURO.raciones), no el nivel entero: el choclo son 126 granos y eso es más que media partida del modo.',
      'La dificultad de cada tanda sale de la escalera de variantes de la campaña, no de una tabla propia: dos tablas serían la misma curva escrita dos veces.',
      'La baraja de ingredientes va sin reposición y barajada; el azar puro repetía el mismo ingrediente con una frecuencia que se siente rota.',
      'ARRUINADO gana `clave` para que el modo le ponga precio en segundos a cada desastre.',
      'nivel-arveja: las arvejas vuelven al eje X del modelo y COLS pasa a ±0.5 (la vaina mide 0.95 y estaban a 0.7).',
      'Los doce niveles leen construir(ctx, cfg) con valores por defecto idénticos a sus constantes de hoy: con cfg vacío nada cambia.',
      '`cantidad: 1` estaba de marcador en casi todas las configs, de cuando ningún nivel las leía. Ahora que las leen habría dejado una sola vaina donde había seis: se pusieron las cuentas reales (6 habas, 12 chochos, 5 fréjoles, 8 mellocos, 7 tajadas, 16 manís, 5 presas).',
      'El maní tomaba velocidad_minima cruda como umbral en unidades de mundo: 0.2 era lo que el dedo recorre en seis eventos de cruzar la losa, y la parada rápida habría sido injugable.',
      'El melloco y la quinua dejan parámetros sin cablear a propósito: en el melloco correr es lo que se castiga, y en la quinua hay UNA batea. Se quitaron de sus configs para no prometer perillas que no giran.',
    ],
  },
  {
    v: '1.14.0',
    fecha: '2026-08-20',
    titulo: 'La temporada del maíz, medida',
    cambios: [
      'La curva de dificultad del maíz estaba mal y ahora está medida. Había un salto brutal en la tercera parada, y la parada 11 —donde entra el maíz seco— te devolvía a un nivel más fácil que la 2.',
      'Ninguna parada se alarga para hacerse difícil. La final duraba 5:37; ahora dura 4:11, y ninguna otra pasa de 3:40. Un nivel largo que además puedes perder por tocar un gusano no es difícil, es cruel.',
      'Las tres mazorcas aparecen una sola vez, en la última, y son lo que queda del costal: una seca, una dura y una tierna. Las demás paradas van de dos, y la dificultad sale de la madurez, los dañados, los bichos y el reloj.',
      'Cada mecánica nueva entra con un respiro y sola: la parada del primer dañado baja a tierno, y la del maíz seco quita los dañados. Aprender algo nuevo a la vez que un pico de dificultad no se aprende, se sufre.',
      'Nueva parada al principio: el gusanito ahora se presenta en una mazorca sola, antes de que aparezcan dos.',
      'Tus récords no se pierden aunque las paradas se hayan reordenado.',
    ],
    internos: [
      'Los tiempoBase ya no se escriben a ojo: se derivan de t = carga / presión objetivo. La carga se mide en granos equivalentes (tierno 1.00, duro 1.18, seco 1.42 según su cascada y resistencia; hoja 3, gusano 10, dañado 5).',
      'La curva es un diente de sierra con valles y picos crecientes; salto máximo entre paradas 45% (era 130%). Los dos valles son -0.18 y -0.50 (el cráter del seco era -2.84).',
      'El tierno con reloj apretado es una trampa —revienta en papilla y limpiarla cuesta más—, así que las paradas de más presión van de duro y seco.',
      'RENOMBRADOS en main.js migra los ids de las paradas que corrieron de puesto.',
    ],
  },
  {
    v: '1.13.0',
    fecha: '2026-08-20',
    titulo: 'La temporada del choclo y el maíz',
    cambios: [
      'El choclo pasa de cinco paradas a quince, y no son quince veces lo mismo: la temporada recorre el maíz como lo recorre el año. Empieza en el choclo tierno de la mata, pasa al duro, y termina en el MAÍZ SECO — el de la tonga colgada, que se agarra con todo y hay que desgranar de puño.',
      'Nuevo: el maíz seco. Mate, blanquecino, sin brillo — ya perdió el agua. Sus granos aguantan mucho más y la fila corre pesada.',
      'Aparecen mazorcas de tres en tres, y los dañados se mezclan con todo lo anterior.',
      'Ya no hay que agotar el maíz para seguir: terminado el primer choclo se abren a la vez el segundo choclo y las primeras habas. Dentro de la temporada se va en fila; entre ingredientes, basta con haber cocinado el anterior una vez.',
      'El brief del choclo ya cuenta las tres madureces y los granos dañados — antes hablaba solo de tierno y duro, y de "dos choclos" cuando ya podían ser uno o tres.',
    ],
    internos: [
      'MADUREZ gana "seco" (resistencia 7, cascada 0.14) con paleta propia choclo_seco en paleta.js.',
      'MAIZ pasa a 15 entradas en niveles-config.js; los hitos entran solos y en fácil (maiz-6 baja a tierno para que el dañado sea lo único nuevo; maiz-11 es una mazorca sin bichos ni dañados).',
      'Fuera el campo `orden` a mano: se deriva del orden de declaración. Eran 40 números que renumerar a mano al meter un nivel en medio.',
      'desbloqueado() distingue dentro-de-temporada (en fila) de cambio-de-ingrediente (basta una variante hecha).',
    ],
  },
  {
    v: '1.12.0',
    fecha: '2026-08-20',
    titulo: 'Los granos dañados no se sacan',
    cambios: [
      'Cambia la regla: los granos cafés ya no hay que sacarlos con cuidado — hay que DEJARLOS. No salen, traban la hilera y toca rodearlos, y al terminar el choclo se van montados en la tusa a la composta. Es como se hace de verdad: nadie despica una mazorca grano podrido por grano podrido, se bota el olote.',
      'Antes la regla era sacarlos con el dedo suave, y además estaban rotos: no salían de ninguna manera, por mucho cuidado que les pusieras.',
      'Rozarlos mientras barres una hilera ya no castiga — barriendo es imposible no tocarlos. Lo que se cobra es picotearlos a propósito, y la primera vez se perdona.',
    ],
    internos: [
      'sacarGrano() solo acepta tipo "grano", así que los podridos nunca podían salir: el camino de "toque delicado" era inalcanzable. Se quita el umbral FUERZA_PODRIDO y con él la mecánica de velocidad.',
      'cobLimpio() ignora los podridos; botarTusa() los cuelga de la tusa con attach() y los manda a la composta con ella; revisarCob() la bota también en el último choclo, con 720 ms antes de completar para que se vea.',
      'TOTAL descuenta los dañados: contarlos dejaba la barra clavada bajo el 100% para siempre.',
      'La selección nunca los pone pegados entre sí: cuatro en cruz encerrarían un grano bueno sin vecino ausente y el choclo no se podría terminar.',
      'topeDePodrido() (barrido y cascada, sin castigo) y picotearPodrido() (toque deliberado, un perdón y luego arruina). alTocar pasa deliberado=true.',
    ],
  },
  {
    v: '1.11.1',
    fecha: '2026-08-20',
    titulo: 'El gusanito se queda en la mano',
    cambios: [
      'Arreglado: al agarrar el gusanito se iba hacia atrás y se hacía chiquito, como si se escapara al fondo. Ahora viene hacia adelante y se queda del mismo tamaño, pegado al dedo — se siente que lo tienes cogido.',
      'Los granos dañados ahora se explican. Al aparecer la rejilla te dicen cuántos hay y qué hacerles; laten despacio para que se distingan de un vistazo; y la primera vez que rompas uno se te perdona, con el aviso de qué pasó.',
      'Una hilera en cascada ya no se lleva por delante un grano dañado: se para ahí. Esos salen a mano y despacio.',
    ],
    internos: [
      'motor3d: puntoAnteCamara(dist) — punto sobre el rayo del dedo a distancia fija de la cámara. puntoEnPlano servía mientras lo cargado iba sobre el mesón; con la mazorca de pie el dedo apunta alto y el rayo tardaba 7 unidades en bajar al plano de la mesa.',
      'nivel-maiz: llevarALaMano() dibuja con puntoAnteCamara y guarda el punto del mesón aparte para juzgar dónde cae. agarrarBicho() salta a la mano al iniciar el arrastre, no al primer movimiento.',
      'Granos dañados: umbral propio FUERZA_PODRIDO (950 px/s, más exigente que el tierno), un perdón antes de arruinar, latido en actualizar(), y esPodrido() traba la cascada como ya hacía la papilla.',
      'velSuave se reinicia en alTocar y alArrastrarInicio: un toque heredaba la velocidad del arrastre anterior y podía romper un dañado sin que el gesto fuera rápido.',
      'window.__maiz gana pelar(), despertar(), velSuave, podridos y perdonadoPodrido para poder probar lo que pasa después del deshojado.',
    ],
  },
  {
    v: '1.11.0',
    fecha: '2026-08-20',
    titulo: 'El choclo, en cinco',
    cambios: [
      'El choclo ya no es una parada: son cinco, y suben. Empieza con uno solo y pocas hojas, y termina con dos choclos duros, más gusanos y el tiempo apretado. Los chiles debajo de cada nodo dicen qué tan brava está la que sigue.',
      'Granos podridos: cafés, dañados, quietos. No revientan como el tierno — se rompen si les pasas el dedo con fuerza, y lo que sale de ahí se va a la olla y la arruina. Hay que sacarlos despacio.',
      'Tu récord del choclo no se pierde: pasa al primero de los cinco.',
    ],
    internos: [
      'niveles-config.js: 30 niveles como puro dato (dificultad, tiempoBase, parámetros). Índice plano POR_ID y variantesDe(base); el prefijo del id es el ingrediente.',
      'main.js arma RUTA = ingredientes de niveles.js × variantes de la config. CON_VARIANTES marca qué módulos ya leen sus parámetros — hoy solo maiz — para no pintar nodos que jugarían igual.',
      'Motor.cargar(mod, api, config) pasa la config al construir(ctx, config) del nivel. nivel-maiz lee choclos, madurez, gusanos y podridos, y calcula TOTAL de ahí.',
      'Granos podridos: modelo grano-podrido en modelos/choclo.js, umbral de velocidad FUERZA en intentarGrano, ARRUINADO.granoPodrido.',
      'migrar() mueve mejores.maiz a maiz-1-introduccion. niveles-config.js entra al PRECACHE del sw.',
    ],
  },
  {
    v: '1.10.2',
    fecha: '2026-08-10',
    titulo: 'La vista que le queda a cada nivel',
    cambios: [
      'Las habas, fréjol, arvejas, col y bacalao tienen ahora su propia cámara optimizada. Cada nivel ve exactamente lo que necesita: en los que tienen elementos dispersos a lo ancho, la cámara se aleja un poco más y se levanta para que no se escape nada.',
      'El resultado es más claro: sin que nada escape, y sin que sobre espacio vacío que distraiga.',
    ],
    internos: [
      'Cámaras personalizadas en nivel-habas, nivel-frejol, nivel-arveja, nivel-col, nivel-bacalao.',
      'Todas con posición (Z) más alejada (3.75–3.9 vs 2.98 por defecto) y altura (Y) levantada un poco (3.15–3.3 vs 3.05).',
      'La mira (lookAt) se mantiene en el mismo sitio para que la mesa se vea desde el mismo ángulo, solo que desde más atrás.',
    ],
  },
  {
    v: '1.10.1',
    fecha: '2026-08-10',
    titulo: 'Encuadre perfecto en los doce',
    cambios: [
      'Arreglado: en algunos niveles los ingredientes se salían de la pantalla y no se podían agarrar — la cámara no los veía aunque estuvieran cocinando.',
      'Todos los niveles comparten ahora la misma regla de encuadre: lo que cabe en el cuadro tiene un ancho garantizado. Cada uno sabe qué margen necesita, y nada puede escaparse a los lados.',
    ],
    internos: [
      'Constante ANCHO_SEGURO exportada de motor3d.js: ±1.18 unidades de mundo, el ancho que ve la cámara sin importar la distancia.',
      'Todos los niveles ajustan sus objetos a ANCHO_SEGURO o menos. El melloco y el escoger lo respetan en la distribución inicial y en los resbalones.',
      'plaga.js usa el mismo ancho para que los gusanos nunca nazcan fuera de cuadro.',
      'Medición sistemática de todos los niveles: 12 × 12 = 144 objetos tocables, todos dentro del cuadro.',
    ],
  },
  {
    v: '1.10.0',
    fecha: '2026-08-10',
    titulo: 'Elige tu cocina',
    cambios: [
      'Ahora escoges dónde cocinar: la cocina de ciudad con su azulejo, la casa de campo con pared de adobe y luz de tarde, o el patio a cielo abierto.',
      'La pantalla quedó despejada: se fueron los carteles y contadores que se metían entre tu dedo y la mesa.',
      'Se ve más de cerca. Los cuencos se acercaron y la mesa llena la pantalla, en vez de dejar medio mesón vacío abajo.',
    ],
    internos: [
      'Editor de escena de escritorio (modo dev): cámara, escenario y luces en vivo, con la línea lista para pegar en el nivel.',
      'El motor acepta `fov` por nivel; el encuadre se calcula por ángulo vertical con garantía de ancho para los cuencos.',
      'escenarios.js: la cocina pasa a ser datos (pared, piso, madera, luz) en vez de estar escrita a mano.',
    ],
  },
  {
    v: '1.9.0',
    fecha: '2026-08-10',
    titulo: 'La cocina se ve como se debe ver',
    cambios: [
      'La cocina se llenó de cosas: ollas de barro en la repisa, un textil sobre el mesón y luz de ventana, con lo que estás cocinando como lo más brillante del cuadro.',
      'Los aciertos seguidos se celebran en grande, y cada grano suelta sus puntos volando hacia la batea.',
    ],
    internos: [
      'HUD de vidrio con filo dorado; contadores de cuenco llevados desde el motor; medidor de ritmo; panel de pasos; riel de ingredientes. Casi todo esto se retiró en 1.10 por estorbar.',
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
