/* ============================================================
   FANESCA — modo-apuro.js
   EL APURO: la cocina del Viernes Santo a las once de la mañana.

   La campaña se juega con calma —un ingrediente, su gesto, su
   historia— y así debe seguir. Esto es lo contrario, y a propósito:
   ingredientes que se suceden sin respiro mientras el reloj corre.

   ------------------------------------------------------------
   POR QUÉ ESTE MÓDULO NO SABE JUGAR A NADA

   No hay aquí ni un grano de maíz ni una vaina. El Apuro no
   reimplementa los niveles: los ENCADENA. Los doce minijuegos ya
   saben cocinarse solos y ya avisan de todo lo que les pasa por un
   único sitio —`api.progreso`, `api.completar`, `api.arruinar`— así
   que este módulo se sienta encima de esas tres llamadas y con eso
   le basta.

   La consecuencia es la que importa: **añadir el modo no tocó ni un
   nivel**. Un ingrediente nuevo entra al Apuro por su entrada de
   `APURO.raciones` en la config y nada más; y si mañana el modo se
   quita, los doce niveles siguen exactamente igual. Un modo que
   hubiera que ir a cablear a doce archivos habría envejecido mal a
   la segunda mecánica nueva.

   ------------------------------------------------------------
   LAS TRES DECISIONES DE DISEÑO

   1. EL RELOJ ES LA VIDA, y no hay vidas.
      En este juego hay gestos que castigan la prisa: el choclo
      tierno revienta si pasas el dedo fuerte, el melloco se dispara
      si lo empujas. Un modo de vidas te vuelve cauto, y cauto contra
      el reloj es una contradicción que el jugador siente aunque no
      sepa nombrarla. Con el reloj como única vida, ir rápido y ir
      bien son la misma decisión — que es justo lo que este juego
      lleva doce niveles enseñando.

   2. EL RELOJ SUBE.
      Cada ración terminada devuelve segundos. La recompensa de
      hacerlo bien no son puntos abstractos: es seguir jugando. Es el
      enganche más viejo que hay y sigue siendo el mejor.

   3. LOS BICHOS NO MATAN, COBRAN.
      En la campaña aplastar un gusanito arruina la olla y se acabó.
      Aquí cuesta segundos y la partida sigue. Perder de golpe por un
      error a los diez segundos es la forma más rápida de que alguien
      cierre el juego; una partida que sigue es una partida que
      quieres terminar.

   ------------------------------------------------------------
   Y LA RACIÓN NO ES EL NIVEL ENTERO

   Un choclo son ciento veintiséis granos: un minuto largo, más de lo
   que dura media partida de este modo. Así que una ración es una
   PARTE —`porcion` en la config— y se da por terminada cuando el
   nivel reporta ese tanto por ciento de su propio progreso. El nivel
   no se entera de que lo cortaron a la mitad, y no tiene por qué:
   en una cocina con prisa nadie termina un choclo antes de pasar al
   siguiente, se agarra lo que se puede y se sigue.
   ============================================================ */

import { APURO, variantesDe } from './niveles-config.js';

/* ---------- estado de la partida ---------- */

let activo = false;
let reloj = 0;              /* segundos que quedan */
let raciones = 0;           /* raciones terminadas */
let tanda = 1;
let mejorCadena = 0, cadena = 0;   /* raciones seguidas sin castigo */
let tocados = new Set();    /* qué ingredientes salieron, para la tarjeta final */
let castigos = 0;           /* cuántos desastres */
let segundosGanados = 0;
let racionActual = null;    /* { base, cuota, total, hechos } */
let bolsa = [];             /* la baraja de ingredientes, sin reposición */
let ganchos = null;         /* lo que el modo le pide al juego */
let pidiendoSiguiente = false;
let pendiente = null;      /* la ración cuyo nivel se está montando */

/* ---------- la baraja ----------
   Sin reposición y barajada: sacar al azar puro repetía el mismo
   ingrediente tres veces seguidas con una frecuencia que se nota y
   se siente rota, aunque sea perfectamente aleatoria. Se agota la
   bolsa y se rebaraja, que es como reparte una baraja de verdad. */

function rebarajar() {
  bolsa = APURO.raciones.slice();
  for (let i = bolsa.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]];
  }
}

function sacarDeLaBolsa(evitar) {
  if (!bolsa.length) rebarajar();
  /* que no salga dos veces seguidas el mismo, ni al rebarajar */
  let i = bolsa.findIndex(r => r.base !== evitar);
  if (i < 0) i = 0;
  return bolsa.splice(i, 1)[0];
}

/* ---------- la dificultad de cada ración ----------
   Sale de la CAMPAÑA, no de una tabla propia. Cada ingrediente ya
   tiene su escalera de variantes ordenada de suave a brava, así que
   la tanda simplemente sube por esa escalera. Una segunda tabla de
   dificultades para el modo sería la misma curva escrita dos veces,
   y a la tercera semana ya no coincidirían. */

function configDe(racion, tandaActual) {
  const escalera = variantesDe(racion.base);
  if (!escalera.length) return { ...(racion.ajustes || {}) };
  const i = Math.min(tandaActual - 1, escalera.length - 1);
  return { ...escalera[i].config, ...(racion.ajustes || {}) };
}

const bonoDeTanda = (t) => Math.max(APURO.bonoMinimo, APURO.bonoBase - (t - 1));

/* ---------- la partida ---------- */

function arrancar(g) {
  ganchos = g;
  activo = true;
  reloj = APURO.relojInicial;
  raciones = 0; tanda = 1; cadena = 0; mejorCadena = 0;
  castigos = 0; segundosGanados = 0;
  tocados = new Set();
  racionActual = null;
  pendiente = null;
  pidiendoSiguiente = false;
  rebarajar();
  siguienteRacion();
}

function siguienteRacion() {
  if (!activo || pidiendoSiguiente) return;
  pidiendoSiguiente = true;
  const anterior = racionActual && racionActual.base;
  const racion = sacarDeLaBolsa(anterior);
  const tandaAntes = tanda;
  tanda = 1 + Math.floor(raciones / APURO.racionesPorTanda);
  /* La subida de tanda hay que ANUNCIARLA. Es el momento en que el
     juego se pone más bravo y devuelve menos tiempo, y si pasa en
     silencio el jugador sólo nota que de pronto le cuesta más — que
     se siente a injusticia y no a progresión. */
  if (tanda > tandaAntes && ganchos.tanda) ganchos.tanda(tanda, bonoDeTanda(tanda));

  /* LA RACIÓN NO SE ACTIVA AQUÍ, sino cuando su nivel se monta de
     verdad (`activar`, que el juego llama justo antes de construirlo).

     Montar es asíncrono —hay que importar el módulo y esperar a los
     modelos— y en ese hueco el nivel ANTERIOR sigue vivo y sigue
     llamando a progreso(). Si la ración nueva ya estuviera puesta,
     esa llamada tardía le fijaría el total del ingrediente viejo, y
     la cuota saldría calculada sobre otra cosa: raciones que se
     sirven solas o que no se sirven nunca. */
  racionActual = null;
  pendiente = { base: racion.base, porcion: racion.porcion, cuota: 0, total: 0, hechos: 0 };
  tocados.add(racion.base);
  ganchos.montar(racion.base, configDe(racion, tanda))
    .finally(() => { pidiendoSiguiente = false; });
}

/* El juego avisa de que ya va a construir el nivel: ahora sí, esta
   ración es la que cuenta. */
function activar() {
  if (!activo || !pendiente) return;
  racionActual = pendiente;
  pendiente = null;
}

/* El nivel reporta su progreso. Aquí se decide si la ración ya está
   servida: no hace falta terminar el ingrediente, sólo su parte. */
function progreso(hechos, total) {
  if (!activo || !racionActual) return;
  if (!racionActual.total && total > 0) {
    racionActual.total = total;
    /* al menos uno: con porciones chicas y totales chicos, redondear
       hacia abajo daba cuotas de cero y la ración se servía sola */
    racionActual.cuota = Math.max(1, Math.ceil(total * racionActual.porcion));
  }
  racionActual.hechos = hechos;
  if (racionActual.cuota && hechos >= racionActual.cuota) servida();
}

/* el nivel terminó entero antes de llegar a la cuota (ingredientes
   cortos, o alguien que va muy rápido): cuenta igual */
function completar() {
  if (activo && racionActual) servida();
}

function servida() {
  if (!activo || !racionActual || racionActual.servida) return;
  racionActual.servida = true;
  raciones++;
  cadena++;
  if (cadena > mejorCadena) mejorCadena = cadena;
  const bono = bonoDeTanda(tanda);
  reloj += bono;
  segundosGanados += bono;
  ganchos.racionServida({ base: racionActual.base, bono, raciones, cadena });
  siguienteRacion();
}

/* Un desastre. En la campaña esto arruina la olla; aquí cuesta
   segundos y la vida sigue. Devuelve true para que el juego sepa que
   el modo se lo quedó y NO abra la pantalla de partida arruinada. */
function arruinar(motivo) {
  if (!activo) return false;
  const clave = (motivo && motivo.clave) || 'otro';
  const coste = APURO.castigo[clave] ?? APURO.castigo.otro;
  castigos++;
  cadena = 0;
  reloj -= coste;
  ganchos.castigo({ coste, motivo, reloj: Math.max(0, reloj) });
  if (reloj <= 0) { terminar('reloj'); return true; }
  /* la ración se da por perdida y entra otra: quedarse en un choclo
     con la olla ya arruinada no tiene nada que ofrecer */
  if (racionActual) racionActual.servida = true;
  siguienteRacion();
  return true;
}

function tick(dt) {
  if (!activo) return;
  reloj -= dt;
  if (reloj <= 0) { reloj = 0; terminar('reloj'); }
}

function terminar(porque) {
  if (!activo) return;
  activo = false;
  const resumen = {
    porque,
    raciones,
    tandas: tanda,
    mejorCadena,
    castigos,
    segundosGanados,
    ingredientes: [...tocados],
  };
  /* qué logros CUMPLE esta partida. Cuáles son nuevos lo decide el
     juego, que es quien tiene el guardado: aquí no se sabe —ni hace
     falta saber— qué hizo el jugador otros días. */
  resumen.logros = APURO.logros.filter(l => { try { return l.pide(resumen); } catch (e) { return false; } });
  racionActual = null;
  ganchos.finDePartida(resumen);
}

function parar() {
  activo = false;
  racionActual = null;
  pendiente = null;
  pidiendoSiguiente = false;
}

export default {
  get activo() { return activo; },
  get reloj() { return Math.max(0, reloj); },
  get raciones() { return raciones; },
  get tanda() { return tanda; },
  get cadena() { return cadena; },
  get enRojo() { return activo && reloj <= APURO.avisoRojo; },
  get racion() { return racionActual; },
  arrancar, parar, activar, progreso, completar, arruinar, tick, terminar,
};
