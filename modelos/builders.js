/* ============================================================
   FANESCA — modelos/builders.js
   Configuración centralizada de todos los builders/piezas.

   Este archivo define:
   - Qué piezas existen en el juego
   - Sus variantes (diferentes versiones)
   - Qué partes nombradas cada pieza tiene (claves)
   - Documentación y categoria de cada pieza

   Es el lugar único donde agregar nuevas piezas o variantes,
   y se usa tanto en el exportador como en el juego.
   ============================================================ */

/**
 * Categorías de piezas para organizar mejor el exportador
 */
export const CATEGORIAS = {
  CHOCLO: 'choclo',
  GRANOS: 'granos',
  VAINAS: 'vainas',
  BICHOS: 'bichos',
  VARIOS: 'varios',
};

/**
 * Catálogo completo de piezas con sus variantes y configuración
 */
export const PIEZAS = {
  // ========== CHOCLO ==========
  'grano-choclo': {
    categoria: CATEGORIAS.CHOCLO,
    nombre: 'Grano de choclo',
    descripcion: 'Un solo grano de la mazorca',
    claves: 'cuerpo (color según madurez)',
    variantes: [
      { sufijo: '-tierno', opts: { madurez: 'tierno' }, nombre: 'Tierno' },
      { sufijo: '-duro', opts: { madurez: 'duro' }, nombre: 'Duro' },
    ],
  },
  'tusa': {
    categoria: CATEGORIAS.CHOCLO,
    nombre: 'Tusa (corazón de choclo)',
    descripcion: 'El núcleo central de la mazorca',
    claves: 'ninguna (decorativo)',
    variantes: [
      { sufijo: '-tierno', opts: { madurez: 'tierno' }, nombre: 'Tierno' },
      { sufijo: '-duro', opts: { madurez: 'duro' }, nombre: 'Duro' },
    ],
  },
  'hoja-choclo': {
    categoria: CATEGORIAS.CHOCLO,
    nombre: 'Hoja de choclo',
    descripcion: 'Una hoja de la vaina del choclo (articulada en 3 nudos)',
    claves: 'nudo0, nudo1, nudo2, banda0…banda2, pelitos-hoja (interior)',
    variantes: [],
  },
  'papilla-choclo': {
    categoria: CATEGORIAS.CHOCLO,
    nombre: 'Papilla de choclo',
    descripcion: 'Grano tierno reventado (traba la hilera)',
    claves: 'papilla (manchita)',
    variantes: [],
  },
  'pelos-choclo': {
    categoria: CATEGORIAS.CHOCLO,
    nombre: 'Pelos de choclo',
    descripcion: 'El penacho de pelos/seda del choclo',
    claves: 'pelo0…pelo25, agarre (hit invisible)',
    variantes: [],
  },

  // ========== GRANOS Y SEMILLAS ==========
  'arveja': {
    categoria: CATEGORIAS.GRANOS,
    nombre: 'Arveja',
    descripcion: 'Un grano de arveja dentro de la vaina',
    claves: 'ninguna',
    variantes: [],
  },
  'haba': {
    categoria: CATEGORIAS.GRANOS,
    nombre: 'Haba',
    descripcion: 'Un grano de haba dentro de la vaina',
    claves: 'ninguna',
    variantes: [],
  },

  // ========== VAINAS ==========
  'vaina-arveja': {
    categoria: CATEGORIAS.VAINAS,
    nombre: 'Vaina de arveja',
    descripcion: 'La vaina que contiene las arvejas',
    claves: 'bisagra (giro apertura), hilo (para deshilar)',
    variantes: [],
  },
  'vaina-haba': {
    categoria: CATEGORIAS.VAINAS,
    nombre: 'Vaina de haba',
    descripcion: 'La vaina que contiene las habas',
    claves: 'bisagra (giro apertura)',
    variantes: [],
  },

  // ========== BICHOS ==========
  'gusano': {
    categoria: CATEGORIAS.BICHOS,
    nombre: 'Gusano',
    descripcion: 'El gusanito peligroso del choclo (segmentado)',
    claves: 'seg0, seg1, seg2, seg3 (4 segmentos del cuerpo)',
    variantes: [],
  },
  'gorgojo': {
    categoria: CATEGORIAS.BICHOS,
    nombre: 'Gorgojo',
    descripcion: 'El bicho del nivel de escoger lentejas',
    claves: 'pata0…pata5 (6 patas), cuerpo',
    variantes: [],
  },
  'mosca': {
    categoria: CATEGORIAS.BICHOS,
    nombre: 'Mosca',
    descripcion: 'Insecto pequeño (variaciones según nivel)',
    claves: 'ala0, ala1 (dos alas)',
    variantes: [],
  },

  // ========== VARIOS ==========
  'chocho': {
    categoria: CATEGORIAS.VARIOS,
    nombre: 'Chocho',
    descripcion: 'Semilla de chocho (lupini)',
    claves: 'pepa (la semilla), piel (envoltura)',
    variantes: [],
  },
  'presa-bacalao': {
    categoria: CATEGORIAS.VARIOS,
    nombre: 'Trozo de bacalao',
    descripcion: 'Un pedazo de bacalao desalándose',
    claves: 'carne (aclara al desalar)',
    variantes: [],
  },
  'tabla': {
    categoria: CATEGORIAS.VARIOS,
    nombre: 'Tabla de trabajo',
    descripcion: 'Tabla reutilizable de la mesa',
    claves: 'ninguna',
    variantes: [],
  },
  'cuenco': {
    categoria: CATEGORIAS.VARIOS,
    nombre: 'Cuenco (batea/composta)',
    descripcion: 'Recipiente para recoger ingredientes',
    claves: 'relleno (contenido visible)',
    variantes: [],
  },
};

/**
 * Obtiene piezas agrupadas por categoría
 */
export function piezasPorCategoria() {
  const grupos = {};
  Object.entries(CATEGORIAS).forEach(([_, cat]) => {
    grupos[cat] = [];
  });
  Object.entries(PIEZAS).forEach(([id, data]) => {
    grupos[data.categoria].push({ id, ...data });
  });
  return grupos;
}

/**
 * Obtiene todas las variantes de una pieza
 */
export function variantesDe(id) {
  const pieza = PIEZAS[id];
  if (!pieza) return [];
  return pieza.variantes.length > 0
    ? pieza.variantes
    : [{ sufijo: '', opts: {}, nombre: 'Default' }];
}

/**
 * Obtiene información de exportación (nombre + archivo)
 */
export function datosExportacion(id, variante = {}) {
  const pieza = PIEZAS[id];
  if (!pieza) return null;
  const nombre = id + (variante.sufijo || '');
  return {
    id,
    nombre,
    archivo: nombre + '.glb',
    titulo: pieza.nombre + (variante.nombre ? ` (${variante.nombre})` : ''),
    descripcion: pieza.descripcion,
    claves: pieza.claves,
    categoria: pieza.categoria,
    opts: variante.opts || {},
  };
}

/**
 * Lista plana de todos los archivos a exportar
 */
export function listadoExportacion() {
  const lista = [];
  Object.entries(PIEZAS).forEach(([id, data]) => {
    const vars = variantesDe(id);
    vars.forEach(v => {
      lista.push(datosExportacion(id, v));
    });
  });
  return lista;
}
