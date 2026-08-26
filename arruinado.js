/* ============================================================
   FANESCA — arruinado.js
   Por qué se arruinó la olla, dicho en palabras.

   Esto es copy, no código de juego: vive aparte de bichos.js
   (que ahora es solo forma, en modelos/) por la misma razón que
   historia.js vive aparte de los niveles. El texto se lee, se
   corrige y se traduce sin abrir un archivo de geometría.

   Y hay un motivo de diseño para que sea UN solo sitio: el
   jugador tiene que entender que perdió por la MISMA regla en los
   siete niveles. Si cada nivel escribiera su propio mensaje, la
   regla se sentiría como siete reglas parecidas.

   Cada motivo lleva además su `clave`. En la campaña no se usa —ahí
   todos acaban igual, con la olla botada— pero El Apuro le pone
   precio en segundos a cada desastre, y necesita saber cuál fue sin
   tener que leerle el título al jugador.
   ============================================================ */

export const ARRUINADO = {
  aplastado: (bicho = 'gusanito') => ({
    clave: 'aplastado',
    titulo: 'Lo aplastaste',
    texto: `El ${bicho} reventó encima de la comida. Con eso ya no hay nada que hacer: se bota todo y se empieza de nuevo.`,
  }),
  enLaBatea: (bicho = 'gusanito') => ({
    clave: 'enLaBatea',
    titulo: 'Se te fue a la batea',
    texto: `El ${bicho} llegó hasta la batea y se mezcló con lo bueno. Ya no se puede separar: toca botar todo y empezar de nuevo.`,
  }),
  granoPodrido: () => ({
    clave: 'granoPodrido',
    titulo: 'Picaste un grano dañado',
    texto: `Los granos cafés están podridos y no se sacan: se dejan en la tusa y se van con ella a la composta. Este lo reventaste encima de lo bueno, y con eso se bota todo.`,
  }),
};
