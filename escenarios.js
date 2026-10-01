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
    pared: { tipo: 'azulejo', tinte: '#c9b8a2' },
    piso: { tipo: 'damero', a: '--madera-200', b: '--peltre-300' },
    meson: { base: '--madera-300', veta: '--madera-500' },
    gabinete: '--rosa-500',
    /* EL SOL MANDA, EL CIELO RELLENA. Antes el hemisferio ponía casi
       la mitad de la luz sobre la tabla y el sol un tercio: la comida
       no tenía lado oscuro y ninguna sombra se notaba. Ahora el sol
       de ventana es más de la mitad —ámbar—, el cielo baja y se
       enfría, y la suma sobre la tabla es la misma (la exposición no
       se toca). Frío contra cálido es lo que da volumen sin oscurecer.
       `sombra` es cuán oscura cae la sombra del sol: clara, de arcilla,
       nunca negra. */
    luz: { cielo: '#e4e9f2', suelo: '#8a5a36', hemi: 0.85,
           sol: '#ffd9a6', solInt: 2.3, foco: '#ffd9a0', focoInt: 0.55,
           relleno: '#cfdcff', rellenoInt: 0.45, sombra: 0.78 },
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
    luz: { cielo: '#e8e4ee', suelo: '--madera-600', hemi: 0.70,
           sol: '#ffb868', solInt: 2.6, foco: '#ffcf8c', focoInt: 0.6,
           relleno: '#cfdcff', rellenoInt: 0.45, sombra: 0.8 },
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
    luz: { cielo: '#eaf3ff', suelo: '--nopal-600', hemi: 1.10,
           sol: '#fff6e8', solInt: 2.4, foco: '#ffffff', focoInt: 0.35,
           relleno: '#cfdcff', rellenoInt: 0.45, sombra: 0.65 },
    ventana: false,
    textil: true,
  },
];

export const POR_DEFECTO = 'azulejo';

export function escenarioDe(id) {
  return ESCENARIOS.find(e => e.id === id) || ESCENARIOS[0];
}
