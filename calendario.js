/* ============================================================
   FANESCA — calendario.js
   Cuándo es Cuaresma y Semana Santa, en el reloj de la casa.

   La bienvenida dice «se cocina una vez al año, para Semana Santa»
   y el cuaderno explica por qué cae ahí, pero el juego no sabía en qué
   fecha estaba. Con esto lo sabe, y lo usa como SABOR: la portada dice
   cuánto falta para el Viernes Santo y el cuaderno, en qué día cae este
   año. Nada se gana ni se pierde por jugar en esas fechas — una cuenta
   regresiva sobre un premio sería presión; ésta es la de la fiesta.

   La Pascua es el primer domingo después de la primera luna llena
   que sigue al equinoccio de marzo: el algoritmo anónimo gregoriano
   (Meeus/Butcher) la saca sin tablas. Todo en fecha LOCAL, como la
   racha de días: en Ecuador la noche no es mañana.
   ============================================================ */

/* el domingo de Pascua del año `y` (fecha local, a mediodía para que
   ningún cambio de hora la mueva de día) */
export function pascua(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia, 12);
}

const masDias = (f, n) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + n, 12);
const soloDia = (f) => new Date(f.getFullYear(), f.getMonth(), f.getDate(), 12);
const entre = (a, b) => Math.round((soloDia(b) - soloDia(a)) / 864e5);

/* En qué tramo del año estamos:
   · 'cuaresma'      de Ceniza al sábado antes de Ramos;
   · 'semana-santa'  de Ramos al domingo de Pascua;
   · 'fuera'         el resto del año.
   Con las fechas de ESTE ciclo (después de Pascua, las del año que
   viene) y cuántos días faltan para el Viernes Santo. */
export function temporada(hoy = new Date()) {
  let p = pascua(hoy.getFullYear());
  if (entre(p, hoy) > 0) p = pascua(hoy.getFullYear() + 1);
  const ceniza = masDias(p, -46), ramos = masDias(p, -7);
  const jueves = masDias(p, -3), viernes = masDias(p, -2);
  const h = soloDia(hoy);
  const fase = h >= ramos ? 'semana-santa' : (h >= ceniza ? 'cuaresma' : 'fuera');
  return { fase, pascua: p, ceniza, ramos, jueves, viernes, diasAlViernes: entre(h, viernes) };
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const fechaBonita = (f) => `${f.getDate()} de ${MESES[f.getMonth()]}`;

/* la línea de arriba de la portada: en temporada, la fiesta; fuera,
   null (y la portada deja la de siempre) */
export function lineaDeTemporada(hoy = new Date()) {
  const t = temporada(hoy);
  /* EL OTRO CALENDARIO TAMBIÉN CUENTA: el Mushuk Nina, el año nuevo
     andino del fuego nuevo, con el equinoccio de marzo (cae el 20 o el
     21, según el año). El cuaderno cuenta que la fanesca viene de ahí.
     Si coincide con Semana Santa, gana la Semana Santa. */
  if (t.fase !== 'semana-santa' && hoy.getMonth() === 2 && hoy.getDate() >= 20 && hoy.getDate() <= 22) {
    return 'mushuk nina · el año nuevo andino, el del fuego nuevo';
  }
  if (t.fase === 'semana-santa') {
    if (t.diasAlViernes > 1) return 'semana santa · la olla se prende el jueves';
    if (t.diasAlViernes === 1) return 'jueves santo · hoy se prende la olla';
    if (t.diasAlViernes === 0) return 'viernes santo · hoy se sirve la fanesca';
    return 'semana santa · todavía hay fanesca en la olla';
  }
  if (t.fase === 'cuaresma') {
    return t.diasAlViernes === 1 ? 'cuaresma · falta un día para el viernes santo'
      : `cuaresma · faltan ${t.diasAlViernes} días para el viernes santo`;
  }
  return null;
}

/* el renglón del cuaderno: en qué día cae este ciclo */
export function lineaDelViernes(hoy = new Date()) {
  const t = temporada(hoy);
  const y = t.viernes.getFullYear();
  const cuando = y === hoy.getFullYear() ? 'Este año' : `En ${y}`;
  const verbo = t.diasAlViernes < 0 ? 'cayó' : 'cae';
  return `${cuando} el <b>Viernes Santo</b> ${verbo} el ${fechaBonita(t.viernes)}, y la olla se prende la víspera.`;
}
