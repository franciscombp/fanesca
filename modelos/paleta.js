/* ============================================================
   FANESCA — modelos/paleta.js
   Los colores de las cosas, en un solo sitio.

   Dos reglas:

   1. Lo que existe como token del sistema de diseño se LEE del
      sistema (`token()`), nunca se copia. Así, si mañana cambia la
      paleta del juego, la cocina se repinta sola — que es
      exactamente el error que ya nos costó una vez, cuando el
      minijuego se quedó con los colores de una versión anterior.

   2. Lo que NO existe como token —el amarillo de un grano de
      choclo tierno, el vino de la mota del fréjol— vive aquí y no
      regado por los niveles. Son colores de comida, no de
      interfaz: no tienen por qué estar en design-system.css, pero
      sí tienen que estar juntos.

   Un modelo nunca escribe un `#rrggbb` suelto. Lo pide aquí.
   ============================================================ */

let _raiz = null;

/* un token del sistema de diseño, con respaldo por si se lee antes
   de que el CSS esté puesto */
export function token(nombre, respaldo) {
  if (!_raiz) _raiz = getComputedStyle(document.documentElement);
  return (_raiz.getPropertyValue(nombre) || '').trim() || respaldo;
}

/* Los colores de la comida. No son tokens del sistema porque no son
   interfaz: son el color que tiene un grano de maíz tierno, y ese no
   cambia porque cambie la marca. */
export const COMIDA = {
  /* choclo tierno: amarillo pálido con brillo */
  choclo_tierno: ['#f8d267', '#f6c94b', '#fae09a', '#f3c352', '#fbe084'],
  choclo_tierno_punta: '#fbe9b4',
  choclo_tierno_tusa: '#f8efd6',
  /* choclo duro: más anaranjado y mate */
  choclo_duro: ['#eaa92e', '#e09d24', '#efb84a', '#d99a20', '#f0c25e'],
  choclo_duro_punta: '#f3cf7f',
  choclo_duro_tusa: '#efe3c0',
  /* maíz seco: el morocho de la tonga, mate y blanquecino. Ya no
     brilla —perdió el agua— y por eso pelea grano a grano. */
  choclo_seco: ['#e8dcbb', '#ded0a8', '#f0e6cb', '#d6c69a', '#eadfc0'],
  choclo_seco_punta: '#f2ead4',
  choclo_seco_tusa: '#e2d5b4',
  choclo_papilla: '#eedda0',
  hoja_choclo: ['#7fa851', '#6f9c47', '#8bb15f'],
  pelo_choclo: ['#d9b06a', '#c59a55'],

  /* habas: la vaina verde y el haba pálida */
  vaina_haba: '#86b45c',
  vaina_haba_dentro: '#e8f0cd',
  haba: '#cfe09b',
  haba_ombligo: '#9bb069',
  hilo_haba: '#5f8a3e',

  /* arveja: la vaina más tiesa y brillante que la del haba, y el
     hilo que la cose — que aquí es una pieza, no una raya pintada */
  vaina_arveja: '#7cbb4a',
  vaina_arveja_dentro: '#eaf4d2',
  hilo_arveja: '#4e8a33',
  arveja: '#a6cc55',
  arveja_cicatriz: '#dfeab4',

  /* chochos: piel translúcida, pepa amarilla */
  chocho_piel: '#efe7cd',
  chocho_pepa: '#f5cf58',
  chocho_ombligo: '#c9b184',

  /* fréjol: vaina moteada, grano vino */
  vaina_frejol: '#d9c27a',
  vaina_frejol_dentro: '#f2e7c0',
  frejol: '#c9526a',
  frejol_mota: '#8e3550',

  /* zapallo: piel naranja, pulpa clara, pepas */
  zapallo_piel: '#d98b2b',
  zapallo_pulpa: '#f6b957',
  zapallo_pepa: '#f3e6bc',
  zapallo_guia: '#5b3b1c',
  zapallo_hueco: '#e0983f',
  zapallo_fibra: '#f2cb86',
  /* la cáscara vista de canto en la tajada tendida: más oscura que la
     piel, porque pelar fino es seguir una franja y la franja tiene
     que leerse a un palmo del teléfono */
  zapallo_cascara: '#9a5a22',

  /* melloco: amarillo manchado de rosa fuerte, y la babaza —esa
     baba transparente que es la razón entera del nivel */
  melloco: '#f0c352',
  melloco_mancha: '#c9527e',
  melloco_babaza: '#f4f7e4',
  melloco_limpio: '#f8dc8e',

  /* col: la hoja clara con su nervadura gruesa y el tronco */
  col_hoja: '#bcd88f',
  col_nervio: '#eaf3d4',
  col_tira: '#cbe2a0',
  col_tronco: '#e6efcd',

  /* quinua: el grano crudo, el lavado, y la espuma de saponina */
  quinua: '#ded0a0',
  quinua_limpia: '#f3ead0',
  quinua_germen: '#c3b083',
  espuma: '#fcfaf2',
  agua: '#bcd7dd',

  /* maní: la piel colorada, el grano y la pasta ya majada */
  mani: '#eccb92',
  mani_piel: '#b5673a',
  mani_pasta: '#d7a45f',
  mani_veta: '#8e4a26',
  piedra_moler: '#7d766c',

  /* lenteja: la buena, la piedra y la picada */
  lenteja: '#c98a4b',
  lenteja_piedra: '#8d8577',
  lenteja_picada: '#6b543a',
  lenteja_hueco: '#3a2a20',

  /* bacalao: carne salada, carne limpia, piel y sal */
  bacalao_carne: '#ecd8b4',
  bacalao_carne_limpia: '#fbf3e0',
  bacalao_piel: '#6f6a5e',
  bacalao_veta: '#dcc59c',
  sal: '#ffffff',
  cuerda: '#c9a06c',
  /* la tina de remojo: lavacara de peltre crema con el filo azul,
     la de toda cocina de la Sierra */
  peltre: '#eef0ea',
  peltre_sombra: '#cfd4cc',
  peltre_filo: '#1b5faa',
  agua_tina: '#8dbfd2',

  /* los bichos */
  gusano: '#a8d05a',
  gusano_oscuro: '#8ab143',
  gusano_zapallo: '#c4e076',
  gusano_zapallo_oscuro: '#9dc24f',
  gorgojo_cuerpo: '#5a4630',
  gorgojo_caparazon: '#7a5c3c',
  gorgojo_oscuro: '#3a2a20',
  gorgojo_cabeza: '#3f3122',
  mosca_cuerpo: '#3c3a3f',
  mosca_cabeza: '#2b2a2e',
  mosca_ojo: '#c0392b',
  mosca_ala: '#eaf4f6',

  /* sambo: el primo pálido del zapallo — piel verde agua con vetas
     crema, pulpa clarita que se deshace en hebra */
  sambo_piel: '#cfe0a8',
  sambo_veta: '#e9f2cd',
  sambo_pulpa: '#f6edcf',
  sambo_pepa: '#e8d9a8',
  rallador: '#c4beb2',
  rallador_diente: '#8f887b',
  rallador_marco: '#a5744a',

  /* garbanzo: la pepa con su piquito y la camisita que suelta */
  garbanzo: '#e8c98a',
  garbanzo_camisita: '#f2e3c2',

  /* mote: el grano gordo y pálido, con el gris de la cal encima
     hasta que se lava; y el agua que sale turbia */
  mote: '#ede3c4',
  agua_leche: '#f2f0e4',

  /* queso y leche: fresco, blanco, de desmigajar */
  queso: '#f8f3e2',
  queso_borde: '#efe6cc',
  leche: '#fdfbf4',
  jarra: '#c9855a',

  /* huevo duro: cáscara, grieta y la clara de adentro */
  huevo_cascara: '#f0e0c8',
  huevo_grieta: '#8a7a5e',
  huevo_clara: '#fbf7ee',

  /* la guarnición: el maduro por sus tres estados, la empanadita y
     el ají — lo de encima del plato */
  sarten: '#4a4640',
  sarten_mango: '#6b4a2c',
  maduro: '#f2c04e',
  maduro_dorado: '#d98f2b',
  maduro_quemado: '#5c3a1c',
  empanadita: '#f0d9a0',
  aji_salsa: '#d94f30',
  plato_hondo: '#e8dbc0',
  crema_fanesca: '#f0dfae',

  /* la utilería del mesón */
  tabla: '#ecc287',
  ojo_blanco: '#fffdf6',
  ojo_negro: '#3a2a20',
};

/* atajos para no repetir `new THREE.MeshLambertMaterial({color})` */
export const mate = (THREE, color, opts = {}) =>
  new THREE.MeshLambertMaterial({ color, ...opts });

/* Apenas satinado: el grano tierno tiene humedad, pero NO es
   plástico.

   Aquí se pasó de rosca una vez y vale dejarlo escrito: buscando que
   se viera jugoso se subió el shininess a 70 con un specular claro, y
   el resultado fue justo lo contrario de apetecible — un reflejo
   chico y duro que grita juguete. La comida en render de arcilla se
   ve rica por la LUZ y la forma, no por el brillo: casi mate
   (shininess 8) y con el specular oscuro y desaturado, que solo
   marca el volumen del grano sin ponerle un punto blanco encima. */
export const brillante = (THREE, color, opts = {}) =>
  new THREE.MeshPhongMaterial({ color, shininess: 8, specular: '#3a3226', ...opts });

/* un material desde un token del sistema */
export const mateToken = (THREE, nombre, respaldo, opts = {}) =>
  mate(THREE, token(nombre, respaldo), opts);
