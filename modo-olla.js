/* ============================================================
   FANESCA — modo-olla.js
   LA OLLA: la fanesca entera, de una sentada, contra tu récord.

   ------------------------------------------------------------
   POR QUÉ ESTE MÓDULO TAMPOCO SABE JUGAR A NADA

   Igual que El Apuro, esto no reimplementa ni un mesón: los ENCADENA
   sobre las tres llamadas que los dieciocho niveles ya hacen —
   `api.progreso`, `api.completar`, `api.arruinar`— y con eso le
   basta. Añadir el modo no tocó ni un nivel; quitarlo mañana no
   rompería ninguno.

   La diferencia con El Apuro no está en cómo se monta cada mesón,
   sino en QUÉ mide el reloj y en qué orden vienen las cosas:

     · el reloj SUBE y es el marcador, no la vida;
     · el orden es fijo y es el de la receta de verdad;
     · la partida no se pierde nunca: se cocina mejor o peor.

   ------------------------------------------------------------
   LAS DOS MONEDAS

   TIEMPO — lo que tardaste, penalizaciones incluidas. Es el récord y
   es contra lo único que se compite: tú de la vez pasada.

   CALIDAD — cuántos descuidos y cuántos desastres. Sale en cucharas
   al final, como en la campaña. Existe porque si el tiempo fuera lo
   único que cuenta, la partida óptima sería barrer con todo a la
   batea y comerse las penalizaciones — y ese no es el juego.

   Que sean DOS y no una es lo que hace que la segunda partida sea
   distinta de la primera: la primera vez se cocina; la segunda se
   decide dónde correr y dónde no.

   ------------------------------------------------------------
   LA MARCA PARCIAL

   Al cerrar cada acto se guarda el tiempo y se compara con el de tu
   mejor partida. Es la mitad del enganche de este modo: nueve
   minutos de mesones encadenados se sienten a lista de tareas, pero
   cuatro carreras de dos minutos contra tu propia sombra, no.
   ============================================================ */

import { OLLA_MODO, configOlla, dificultadOlla } from './niveles-config.js';

/* ---------- estado de la partida ---------- */

let activo = false;
let ms = 0;                  /* lo que lleva corriendo el reloj */
let penalizacionMs = 0;      /* lo que suman los desastres y descuidos */
let i = -1;                  /* el paso en curso, dentro de `pasos` */
/* LOS PASOS SON DE LA PARTIDA, no del modo. La olla cocina lo que el
   jugador sabe preparar —habas cocinadas con una bolsa, fanesca con
   quince— así que la lista se recibe en `arrancar` en vez de estar
   escrita aquí. `actos` son los que quedaron con pasos: sin choclo no
   hay feria, y el `actoIndex` de cada paso indexa ESTA lista. */
let pasos = [];
let actos = [];
let actoDesde = 0;           /* ms en que arrancó el acto de ahora */
let parciales = [];          /* { acto, ms, total } al cerrar cada acto */
let desastres = 0, descuidos = 0;
let feriaLimpia = true, ollaLimpia = true;   /* para los logros */
let pasoActual = null;       /* { paso, cuota, total, hechos, servido } */
let pendiente = null;        /* el paso cuyo mesón se está montando */
let ganchos = null;
let pidiendo = false;
let montajesFallidos = 0;
let mejor = null;            /* la mejor partida guardada, para las marcas */

const pasoDe = (k) => pasos[k] || null;
const actoDe = (k) => { const p = pasoDe(k); return p ? actos[p.actoIndex] : null; };

/* ---------- la partida ---------- */

function arrancar(g, mejorGuardado, pasosDeLaPartida, actosDeLaPartida) {
  ganchos = g;
  mejor = mejorGuardado || null;
  pasos = pasosDeLaPartida || [];
  actos = actosDeLaPartida || [];
  if (!pasos.length) return false;
  activo = true;
  ms = 0; penalizacionMs = 0;
  i = -1; actoDesde = 0; parciales = [];
  desastres = 0; descuidos = 0;
  feriaLimpia = true; ollaLimpia = true;
  pasoActual = null; pendiente = null;
  pidiendo = false; montajesFallidos = 0;
  siguientePaso();
  return true;
}

function siguientePaso() {
  if (!activo || pidiendo) return;
  const antes = pasoDe(i);
  i++;
  const paso = pasoDe(i);
  if (!paso) { terminar('lista'); return; }
  pidiendo = true;
  /* EL ACTO SE ANUNCIA AL ENTRAR, no al salir. El cartel del acto es
     lo que le da forma a la partida larga: sin él, pasar de la feria
     al desgrane es un mesón más y nueve minutos son una fila. */
  const acto = actos[paso.actoIndex];
  if (!antes || antes.actoIndex !== paso.actoIndex) {
    actoDesde = ms;
    if (ganchos.acto) ganchos.acto(acto, paso.actoIndex, actos.length);
  }
  /* como en El Apuro: el paso NO se activa aquí sino cuando su mesón
     va a construirse de verdad. Montar es asíncrono y en ese hueco el
     mesón anterior sigue vivo y sigue reportando progreso — si el
     paso nuevo ya estuviera puesto, esa llamada tardía le fijaría el
     total del ingrediente viejo y la cuota saldría de otra cosa. */
  pasoActual = null;
  pendiente = { paso, cuota: 0, total: 0, hechos: 0, servido: false };
  ganchos.montar(paso.base, configOlla(paso), dificultadOlla(paso), paso)
    .finally(() => { pidiendo = false; });
}

/* el juego avisa de que ya va a construir: ahora sí, este paso cuenta */
function activar() {
  if (!activo || !pendiente) return;
  pasoActual = pendiente;
  pendiente = null;
  /* un mesón que SÍ abrió borra la cuenta de los que no: el corte es
     a la tercera SEGUIDA, y sin esto tres fallos sueltos repartidos
     por una partida de veinte pasos la cerraban por «error» */
  montajesFallidos = 0;
}

function progreso(hechos, total) {
  if (!activo || !pasoActual) return;
  if (!pasoActual.total && total > 0) {
    pasoActual.total = total;
    /* al menos uno: con porciones chicas y totales chicos, redondear
       hacia abajo daba cuotas de cero y el paso se daba solo */
    pasoActual.cuota = Math.max(1, Math.ceil(total * (pasoActual.paso.porcion ?? 1)));
  }
  pasoActual.hechos = hechos;
  if (pasoActual.cuota && hechos >= pasoActual.cuota) hecho();
}

/* el mesón terminó entero antes de la cuota: cuenta igual */
function completar() {
  if (activo && pasoActual) hecho();
}

function hecho() {
  if (!activo || !pasoActual || pasoActual.servido) return;
  pasoActual.servido = true;
  const paso = pasoActual.paso;
  /* `parcial` es la mitad del relato de este modo. Siete de los veinte
     mesones se dan por hechos ANTES de terminar el ingrediente —la
     olla pide una parte, no el zapallo entero— y sin decirlo el juego
     parecía arrancarte el mesón de las manos a media pelada. Un
     jugador lo dijo así: «a veces cambia antes de terminar la
     actividad de pelar». No es un fallo: es la receta. Pero hay que
     contarlo. */
  ganchos.pasoHecho({
    paso, indice: i, total: pasos.length,
    parcial: (paso.porcion ?? 1) < 1,
    hechos: pasoActual.hechos, cuota: pasoActual.cuota,
  });
  /* ¿se cerró el acto? La marca se toma AQUÍ y no al montar el
     siguiente: entre uno y otro hay una carga asíncrona, y meterla
     dentro del parcial haría que el tiempo del acto dependiera de lo
     rápido que el teléfono importe un módulo. */
  if (paso.ultimoDelActo) cerrarActo();
  siguientePaso();
}

function cerrarActo() {
  const acto = actos[pasoDe(i).actoIndex];
  const duro = ms - actoDesde;
  const previo = mejor && mejor.actos && mejor.actos[acto.id];
  parciales.push({ acto: acto.id, ms: duro, total: ms + penalizacionMs });
  if (ganchos.actoCerrado) {
    ganchos.actoCerrado({
      acto, ms: duro, total: ms + penalizacionMs,
      /* la diferencia contra tu récord: negativa es que vas mejor.
         Sin récord no hay marca que enseñar — y "vas +0:00" sobre una
         primera partida es un dato inventado. */
      delta: Number.isFinite(previo) ? duro - previo : null,
      ultimo: pasoDe(i + 1) === null,
    });
  }
}

/* UN DESASTRE NO ACABA LA PARTIDA. En la campaña arruina la olla; en
   El Apuro cuesta la vida en segundos. Aquí suma penalización, baja
   la calidad y el paso se da por hecho: quedarse en un choclo con la
   olla arruinada no tiene nada que ofrecer, y echar al jugador a los
   dos minutos de una partida de nueve es la forma más rápida de que
   no vuelva a empezarla.

   Devuelve true para que el juego sepa que el modo se lo quedó y NO
   abra la pantalla de partida arruinada. */
function arruinar(motivo) {
  if (!activo) return false;
  const clave = (motivo && motivo.clave) || 'otro';
  const coste = OLLA_MODO.castigo[clave] ?? OLLA_MODO.castigo.otro;
  desastres++;
  penalizacionMs += coste * 1000;
  const paso = pasoActual && pasoActual.paso;
  if (paso && paso.acto === 'feria') feriaLimpia = false;
  if (paso && paso.acto === 'olla') ollaLimpia = false;
  ganchos.castigo({ coste, motivo, total: ms + penalizacionMs });
  if (pasoActual && !pasoActual.servido) {
    pasoActual.servido = true;
    if (paso && paso.ultimoDelActo) cerrarActo();
    /* el respiro es para que el aviso del castigo se VEA antes de que
       cambie el mesón: sin él, la mesa nueva se traga la explicación */
    const token = ++castigoToken;
    setTimeout(() => { if (activo && token === castigoToken) siguientePaso(); }, 800);
  }
  return true;
}
let castigoToken = 0;

/* un descuido chico: no tira el paso, sólo suma segundos y baja la
   calidad. Es la moneda con la que se paga ir demasiado rápido. */
function descontar(seg) {
  if (!activo) return;
  descuidos++;
  penalizacionMs += seg * 1000;
  const paso = pasoActual && pasoActual.paso;
  if (paso && paso.acto === 'feria') feriaLimpia = false;
  if (paso && paso.acto === 'olla') ollaLimpia = false;
}

function tick(dt) {
  if (!activo) return;
  ms += dt * 1000;
}

/* cuántas cucharas merece esta fanesca: por CALIDAD, nunca por
   tiempo — el tiempo ya es el marcador (ver niveles-config) */
function cucharasDeCalidad() {
  const puntos = descuidos + desastres * OLLA_MODO.pesoDesastre;
  const [tres, dos] = OLLA_MODO.cortesCalidad;
  return puntos <= tres ? 3 : (puntos <= dos ? 2 : 1);
}

function terminar(porque) {
  if (!activo) return;
  activo = false;
  const resumen = {
    porque,
    ms: ms + penalizacionMs,
    msLimpio: ms,
    penalizacion: penalizacionMs,
    desastres, descuidos,
    cucharas: cucharasDeCalidad(),
    feriaLimpia, ollaLimpia,
    /* si esta partida pasó por la feria: sin choclo en la despensa no
       hay puesto, y la medalla del ojo de feriante no se gana sola */
    conFeria: pasos.some(p => p.base === 'feria'),
    /* hasta dónde llegó, para el resumen de quien se salió a medias */
    pasos: Math.max(0, i), de: pasos.length,
    completa: porque === 'lista',
    actos: Object.fromEntries(parciales.map(p => [p.acto, p.ms])),
    parciales: parciales.slice(),
  };
  /* qué logros CUMPLE esta partida; cuáles son NUEVOS lo decide el
     juego, que es quien tiene el guardado. Y sólo si se terminó: media
     fanesca no gana la medalla de la fanesca entera. */
  resumen.logros = resumen.completa
    ? OLLA_MODO.logros.filter(l => { try { return l.pide(resumen); } catch (e) { return false; } })
    : [];
  pasoActual = null;
  ganchos.finDePartida(resumen);
}

/* EL MESÓN NO ABRIÓ. Si el juego no pudo montar el paso, la partida
   no puede quedarse esperando a un mesón que nunca va a llegar. Aquí
   —a diferencia de El Apuro, que baraja— saltar significa PERDERSE un
   ingrediente de la receta, así que además cuesta calidad: la fanesca
   sale sin él. A la tercera seguida se cierra la partida. */
function saltar() {
  if (!activo) return;
  pendiente = null;
  pasoActual = null;
  pidiendo = false;
  montajesFallidos++;
  descuidos++;
  if (montajesFallidos >= 3) { terminar('error'); return; }
  const paso = pasoDe(i);
  if (paso && paso.ultimoDelActo) cerrarActo();
  siguientePaso();
}

function parar() {
  activo = false;
  pasoActual = null;
  pendiente = null;
  pidiendo = false;
  montajesFallidos = 0;
}

export default {
  get activo() { return activo; },
  get ms() { return ms + penalizacionMs; },
  get penalizacion() { return penalizacionMs; },
  get paso() { return pasoActual; },
  get indice() { return i; },
  get total() { return pasos.length; },
  get acto() { return actoDe(i); },
  get actoIndex() { return pasoDe(i) ? pasoDe(i).actoIndex : 0; },
  /* cuántos pasos van hechos DENTRO del acto de ahora, para el HUD */
  get enActo() {
    const p = pasoDe(i);
    if (!p) return { hechos: 0, de: 1 };
    const desde = pasos.findIndex(x => x.actoIndex === p.actoIndex);
    const cuantos = pasos.filter(x => x.actoIndex === p.actoIndex).length;
    return { hechos: i - desde, de: cuantos };
  },
  arrancar, parar, activar, progreso, completar, arruinar, descontar, tick, terminar, saltar,
};
