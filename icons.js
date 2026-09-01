/* ============================================================
   LA FANESCA — icons.js
   Las ilustraciones de las pantallas de papel: la portada, las
   fichas de la mesa de prep y los capítulos del cuaderno. Todo
   SVG inline, sin dependencias.

   Lo que se ve DENTRO del nivel no está aquí: eso es 3D y vive
   en modelos/. Aquí solo hay dibujitos planos.

   Set recortado del que nació en Pambamesa: quedaron los siete
   que este juego pide (más `mezcla_rara`, que es el comodín
   cuando se pide un id que no existe).
   ============================================================ */

const INK = '#4a4038';

const _svg = (inner) =>
  `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

/* Defs globales de acuarela: main.js los inyecta una vez en el
   documento. Ninguno de los iconos de abajo los usa todavía —
   están para que un icono nuevo pueda pedir volumen sin tener que
   declarar sus propios gradientes. */
const ICON_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="ico-sheen" cx="34%" cy="25%" r="46%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".52"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ico-depth" cx="50%" cy="40%" r="63%">
    <stop offset="56%" stop-color="#5a4326" stop-opacity="0"/><stop offset="100%" stop-color="#5a4326" stop-opacity=".19"/>
  </radialGradient>
</defs></svg>`;

/* carita kawaii: ojos, sonrisa y chapetes */
function face(x = 32, y = 34, s = 1, mood = 'happy') {
  const mouth = mood === 'dizzy'
    ? `<path d="M-4 5 Q-2 3 0 5 Q2 7 4 5" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
    : mood === 'sleepy'
      ? `<path d="M-3 5 H3" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<path d="M-3 4 Q0 6.6 3 4" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const eyes = mood === 'dizzy'
    ? `<path d="M-9 -2 L-5 2 M-5 -2 L-9 2 M5 -2 L9 2 M9 -2 L5 2" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`
    : mood === 'sleepy'
      ? `<path d="M-9.5 0 Q-7 2.2 -4.5 0 M4.5 0 Q7 2.2 9.5 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : `<circle cx="-7" cy="0" r="2.2" fill="${INK}"/><circle cx="7" cy="0" r="2.2" fill="${INK}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})">${eyes}${mouth}
    <ellipse cx="-11.5" cy="4" rx="3" ry="1.9" fill="#f2a48d" opacity=".5"/>
    <ellipse cx="11.5" cy="4" rx="3" ry="1.9" fill="#f2a48d" opacity=".5"/></g>`;
}

/* vapor: dos volutas suaves */
const steam = (x = 32, y = 14) =>
  `<g stroke="#c9bda7" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85">
     <path d="M${x - 6} ${y + 6} Q${x - 9} ${y + 1} ${x - 6} ${y - 3}"/>
     <path d="M${x + 6} ${y + 8} Q${x + 3} ${y + 3} ${x + 6} ${y - 1}"/></g>`;

const ICONS = {};

/* ============ Los ingredientes de la mesa ============ */

ICONS.maiz = _svg(`
  <path d="M12 40 Q8 24 20 14 Q17 32 22 46 Q16 46 12 40 Z" fill="#8fae7e"/>
  <path d="M52 40 Q56 24 44 14 Q47 32 42 46 Q48 46 52 40 Z" fill="#8fae7e"/>
  <ellipse cx="32" cy="32" rx="12" ry="20" fill="#f2d06b"/>
  <g fill="#e3b84e">
    <circle cx="27" cy="20" r="2"/><circle cx="37" cy="20" r="2"/>
    <circle cx="25" cy="28" r="2"/><circle cx="32" cy="26" r="2"/><circle cx="39" cy="28" r="2"/>
    <circle cx="27" cy="44" r="2"/><circle cx="37" cy="44" r="2"/>
  </g>
  ${face(32, 35, .72)}`);

ICONS.zapallo = _svg(`
  <rect x="29.5" y="8" width="5" height="9" rx="2.4" fill="#8a6240"/>
  <ellipse cx="18" cy="36" rx="11" ry="15" fill="#d99a4e"/>
  <ellipse cx="46" cy="36" rx="11" ry="15" fill="#d99a4e"/>
  <ellipse cx="32" cy="36" rx="12" ry="17" fill="#e0a45c"/>
  ${face(32, 36, .85)}`);

ICONS.granos_mixtos = _svg(`
  <path d="M18 24 Q14 18 20 16 H44 Q50 18 46 24 Q54 34 50 45 Q47 54 32 54 Q17 54 14 45 Q10 34 18 24 Z" fill="#e8d9b8"/>
  <path d="M20 16 Q32 22 44 16" stroke="#c9b891" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <ellipse cx="24" cy="36" rx="3.4" ry="2.4" fill="#b98aae"/>
  <ellipse cx="34" cy="32" rx="3.4" ry="2.4" fill="#8fae7e"/>
  <ellipse cx="41" cy="39" rx="3.4" ry="2.4" fill="#e0a45c"/>
  <ellipse cx="29" cy="44" rx="3.4" ry="2.4" fill="#a5744c"/>
  <ellipse cx="38" cy="47" rx="3.4" ry="2.4" fill="#c98a5b"/>`);

ICONS.bacalao = _svg(`
  <path d="M8 32 Q8 22 20 20 L48 18 Q52 24 52 32 Q52 40 48 46 L20 44 Q8 42 8 32 Z" fill="#d9cdb8"/>
  <path d="M50 26 L60 20 Q61 32 60 44 L50 38" fill="#c9bda3"/>
  <path d="M20 24 L28 40 M28 24 L36 40 M36 23 L44 39" stroke="#c2b498" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M14 28 Q16.5 30 19 28" stroke="${INK}" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  <path d="M14 36 H19" stroke="${INK}" stroke-width="1.7" stroke-linecap="round"/>`);

ICONS.hoja = _svg(`
  <path d="M32 8 Q52 18 50 36 Q48 52 32 56 Q16 52 14 36 Q12 18 32 8 Z" fill="#9dbd8a"/>
  <path d="M32 12 V52 M32 24 Q24 26 20 32 M32 24 Q40 26 44 32 M32 38 Q26 40 23 44 M32 38 Q38 40 41 44" stroke="#7d9b76" stroke-width="2" fill="none" stroke-linecap="round"/>`);

/* la vaina de arveja: cosida por su hilo, que es el gesto del nivel */
ICONS.arveja = _svg(`
  <path d="M10 38 Q10 22 26 18 L46 15 Q56 20 54 32 Q52 44 40 47 L22 50 Q11 48 10 38 Z" fill="#7cbb4a"/>
  <path d="M12 34 Q30 26 52 24" stroke="#4e8a33" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M52 24 Q58 22 60 16" stroke="#4e8a33" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <g fill="#a6cc55" stroke="#5f9438" stroke-width="1.2">
    <circle cx="22" cy="40" r="5"/><circle cx="33" cy="37" r="5.2"/><circle cx="44" cy="34" r="4.8"/>
  </g>
  ${face(33, 30, .58)}`);

/* el melloco: amarillo manchado de rosa, y relumbrando de baba */
ICONS.melloco = _svg(`
  <ellipse cx="33" cy="50" rx="16" ry="3" fill="#3a2c18" opacity=".15"/>
  <path d="M14 34 Q14 20 30 19 Q46 18 50 28 Q54 40 42 46 Q26 51 18 44 Q13 40 14 34 Z" fill="#f0c352"/>
  <ellipse cx="24" cy="28" rx="6" ry="3.4" fill="#c9527e" transform="rotate(-18 24 28)"/>
  <ellipse cx="42" cy="35" rx="5" ry="3" fill="#c9527e" transform="rotate(12 42 35)"/>
  <ellipse cx="31" cy="41" rx="4" ry="2.4" fill="#c9527e" transform="rotate(-8 31 41)"/>
  <path d="M20 26 Q26 21 34 21" stroke="#fffdf2" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>
  ${face(32, 33, .62)}`);

/* la quinua: la batea, el agua y la espuma que hay que botar */
ICONS.quinua = _svg(`
  <ellipse cx="32" cy="53" rx="19" ry="3.2" fill="#3a2c18" opacity=".16"/>
  <path d="M10 28 Q10 50 32 50 Q54 50 54 28 Z" fill="#e8d9b8"/>
  <ellipse cx="32" cy="28" rx="22" ry="7.4" fill="#bcd7dd"/>
  <g fill="#fcfaf2">
    <circle cx="22" cy="26" r="4"/><circle cx="31" cy="24" r="5"/><circle cx="41" cy="26.5" r="4.2"/>
    <circle cx="26" cy="29" r="3"/><circle cx="37" cy="29" r="3.2"/>
  </g>
  <g fill="#ded0a0">
    <ellipse cx="25" cy="34" rx="2.6" ry="1.6"/><ellipse cx="34" cy="36" rx="2.6" ry="1.6"/>
    <ellipse cx="42" cy="33" rx="2.6" ry="1.6"/>
  </g>
  <path d="M10 28 Q10 50 32 50 Q54 50 54 28" fill="none" stroke="${INK}" stroke-width="1.8" stroke-opacity=".35" stroke-linecap="round"/>`);

/* el maní: la piedra de moler con su mano y el grano encima */
ICONS.mani = _svg(`
  <path d="M8 38 Q8 33 14 32 H50 Q56 33 56 38 Q56 43 50 44 H14 Q8 43 8 38 Z" fill="#7d766c"/>
  <path d="M14 44 V49 M32 45 V50 M50 44 V49" stroke="#8d8577" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="24" cy="31" rx="9" ry="6" fill="#8d8577"/>
  <ellipse cx="22" cy="29" rx="4" ry="2.2" fill="#a09789" opacity=".7"/>
  <g fill="#b5673a">
    <ellipse cx="40" cy="30" rx="4.4" ry="3.6"/><ellipse cx="45.6" cy="30.6" rx="4.4" ry="3.6"/>
  </g>
  <ellipse cx="42.8" cy="30.3" rx="2.2" ry="3.4" fill="#eccb92"/>
  ${face(24, 31, .42)}`);

/* ============ El plato y el cuaderno ============ */

ICONS.fanesca = _svg(`${steam(32, 10)}
  <ellipse cx="32" cy="26" rx="22" ry="7.5" fill="#e0b45c"/>
  <circle cx="22" cy="24" r="2.2" fill="#8fae7e"/>
  <circle cx="32" cy="26" r="2.2" fill="#c98a5b"/>
  <circle cx="42" cy="24" r="2.2" fill="#b98aae"/>
  <ellipse cx="36" cy="22" rx="4.5" ry="2" fill="#efe6d2"/>
  <path d="M9 26 Q9 50 32 50 Q55 50 55 26 Z" fill="#f6eed9"/>
  <path d="M9 26 Q9 50 32 50 Q55 50 55 26" fill="none" stroke="#e2d5ba" stroke-width="2"/>
  <ellipse cx="32" cy="52" rx="10" ry="2.5" fill="#e2d5ba"/>
  ${face(32, 38, .78)}`);

ICONS.cuaderno = _svg(`
  <rect x="14" y="10" width="36" height="44" rx="6" fill="#c9a06c"/>
  <rect x="14" y="10" width="8" height="44" rx="4" fill="#a5744c"/>
  <rect x="28" y="24" width="18" height="3.4" rx="1.7" fill="#f6eed9" opacity=".85"/>
  <rect x="28" y="32" width="14" height="3.4" rx="1.7" fill="#f6eed9" opacity=".6"/>
  ${face(35, 44, .55)}`);

/* ============ Los seis que salieron de la despensa ============
   Compartían todos el costalito de granos_mixtos, y siete platos
   con el mismo dibujo no se distinguen ni abiertos ni con candado.
   Cada uno con su cara, como manda la casa. */

/* el garbanzo: la pepa con su piquito y la camisita floja */
ICONS.garbanzo = _svg(`
  <ellipse cx="32" cy="38" rx="19" ry="17" fill="#f2e3c2" opacity=".6"/>
  <ellipse cx="32" cy="36" rx="16" ry="15" fill="#e8c98a"/>
  <path d="M40 24 Q46 20 45 14 Q39 15 38 21 Q39 23 40 24 Z" fill="#dcb878"/>
  ${face(32, 38, .78)}`);

/* el sambo: el primo pálido, con sus vetas crema */
ICONS.sambo = _svg(`
  <rect x="29.5" y="8" width="5" height="8" rx="2.4" fill="#8a9b60"/>
  <ellipse cx="32" cy="36" rx="19" ry="17" fill="#cfe0a8"/>
  <path d="M24 20.5 Q20 36 24 51 M32 19 V53 M40 20.5 Q44 36 40 51" stroke="#e9f2cd" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  ${face(32, 37, .8)}`);

/* el queso fresco: la rueda blanca con su tajada de menos */
ICONS.queso = _svg(`
  <ellipse cx="32" cy="26" rx="20" ry="8" fill="#fdfaf0"/>
  <path d="M12 26 V42 Q12 50 32 50 Q52 50 52 42 V26 Q52 34 32 34 Q12 34 12 26 Z" fill="#f4eddc"/>
  <path d="M32 18.5 L44 21.5 L38 27 Q35 25.6 32 25.8 Z" fill="#e8dfc4"/>
  ${face(32, 43, .62)}`);

/* el huevo duro: cascado de un golpecito, con su grieta */
ICONS.huevo = _svg(`
  <path d="M32 10 Q47 10 47 34 Q47 54 32 54 Q17 54 17 34 Q17 10 32 10 Z" fill="#f6ecd9"/>
  <path d="M22 22 L27 26 L31 21 L36 26 L41 21.5" stroke="#c9b891" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  ${face(32, 38, .74)}`);

/* el maduro de la guarnición: la banana curva de freír */
ICONS.maduro = _svg(`
  <path d="M14 22 Q18 44 38 50 Q52 54 54 44 Q54 40 48 40 Q34 40 26 30 Q20 23 20 18 Q14 16 14 22 Z" fill="#f2c04e"/>
  <path d="M18 19 Q16 15 19 13 Q22 14 22 18 Z" fill="#8a6240"/>
  <path d="M50 43 Q53 44 52 47" stroke="#d98f2b" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M22 24 Q26 36 38 43" stroke="#e0ac35" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  ${face(38, 33, .6)}`);

/* el comodín: lo que sale cuando se pide un id que no existe */
ICONS.mezcla_rara = _svg(`
  <path d="M14 38 Q10 26 20 22 Q22 14 32 16 Q42 12 46 22 Q56 26 50 38 Q54 48 42 50 Q36 54 28 50 Q16 52 14 38 Z" fill="#9aa88f"/>
  <circle cx="22" cy="24" r="3" fill="#b3bfa6"/>
  <circle cx="44" cy="42" r="2.4" fill="#b3bfa6"/>
  <circle cx="40" cy="18" r="2" fill="#b3bfa6"/>
  ${face(32, 34, .9, 'dizzy')}`);

/* API pública */
function iconOf(id) {
  return ICONS[id] || ICONS.mezcla_rara;
}
