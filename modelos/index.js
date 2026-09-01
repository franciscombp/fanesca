/* ============================================================
   FANESCA — modelos/index.js
   La puerta única al catálogo de modelos.

   Importar este archivo corre los `registrar()` de todos los
   ingredientes: a partir de ahí `pieza('grano-choclo', …)`
   funciona sin que cada nivel tenga que acordarse de importar su
   archivo de modelos.

   Agregar un ingrediente nuevo es escribir `modelos/<algo>.js`
   con sus `registrar()` y agregarlo a la lista de abajo.
   ============================================================ */

import './utileria.js';
import './cocina.js';
import './bichos.js';
import './choclo.js';
import './habas.js';
import './arveja.js';
import './chochos.js';
import './frejol.js';
import './melloco.js';
import './zapallo.js';
import './col.js';
import './lenteja.js';
import './quinua.js';
import './mani.js';
import './bacalao.js';
import './despensa.js';

export { registrar, pieza, parte, partes, cargarGLB, tieneGLB, registradas } from './registro.js';
export { PIEZAS, CATEGORIAS, piezasPorCategoria, variantesDe, datosExportacion, listadoExportacion } from './builders.js';
export { token, COMIDA, mate, brillante, mateToken } from './paleta.js';
export { sombraBlob, ojitos, GROSOR_TABLA, ALTO_TABLA } from './utileria.js';
export { nuevoGusano, nuevoGorgojo, nuevaMosca, aroDeAlarma } from './bichos.js';
export { construirCocina } from './cocina.js';
