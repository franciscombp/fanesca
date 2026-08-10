/* ============================================================
   FANESCA — escenarios.js
   DÓNDE se cocina. La misma mesa, la misma mecánica, otro sitio.

   La fanesca no se cocina en un solo lugar del país: se cocina en
   una cocina de ciudad con azulejo, en una casa de campo con pared
   de adobe y fogón de leña, y en el patio cuando la olla es tan
   grande que no cabe adentro. Cada uno cambia la pared, el piso,
   la madera del mesón, el color de la luz y lo que hay en la
   repisa — nada de la mecánica.

   Un escenario es SOLO datos. `modelos/cocina.js` los lee y arma;
   así, agregar uno nuevo es escribir aquí unas líneas y no tocar
   ni el motor ni un nivel.
   ============================================================ */

export const ESCENARIOS = [
  {
    id: 'azulejo',
    nombre: 'Cocina de ciudad',
    pie: 'Azulejo de talavera y luz de ventana',
    emoji: '🏠',
    pared: { tipo: 'azulejo', tinte: '#b3a08b' },
    piso: { tipo: 'damero', a: '--madera-200', b: '--peltre-300' },
    meson: { base: '--madera-300', veta: '--madera-500' },
    gabinete: '--rosa-500',
    luz: { cielo: '#fff3dc', suelo: '--madera-400', hemi: 1.42,
           sol: '#ffe6bd', solInt: 1.45, foco: '#ffd9a0', focoInt: 1.05 },
    ventana: true,
    textil: true,
  },
  {
    id: 'adobe',
    nombre: 'Casa de campo',
    pie: 'Pared de adobe, leña y tarde de páramo',
    emoji: '🌄',
    /* el adobe no es liso: se pinta con grano para que la pared no
       parezca un cartón beige */
    pared: { tipo: 'adobe', tinte: '#d8bb92' },
    piso: { tipo: 'tierra', a: '--madera-400', b: '--madera-600' },
    meson: { base: '--madera-400', veta: '--madera-700' },
    gabinete: '--madera-600',
    /* la luz de las cinco de la tarde en la sierra: baja y naranja */
    luz: { cielo: '#ffe7c0', suelo: '--madera-600', hemi: 1.15,
           sol: '#ffbf70', solInt: 1.7, foco: '#ffcf8c', focoInt: 1.2 },
    ventana: true,
    textil: true,
  },
  {
    id: 'patio',
    nombre: 'El patio',
    pie: 'A cielo abierto, como cuando la olla no cabe adentro',
    emoji: '🌿',
    pared: { tipo: 'verde', tinte: '#9fb98a' },
    piso: { tipo: 'piedra', a: '--peltre-300', b: '--peltre-200' },
    meson: { base: '--madera-300', veta: '--madera-600' },
    gabinete: '--nopal-600',
    /* mediodía afuera: luz clara, cenital, sombras cortas */
    luz: { cielo: '#eaf6ff', suelo: '--nopal-600', hemi: 1.75,
           sol: '#fffaf0', solInt: 1.35, foco: '#ffffff', focoInt: 0.75 },
    ventana: false,
    textil: true,
  },
];

export const POR_DEFECTO = 'azulejo';

export function escenarioDe(id) {
  return ESCENARIOS.find(e => e.id === id) || ESCENARIOS[0];
}
