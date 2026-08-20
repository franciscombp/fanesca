/* ============================================================
   FANESCA — Configuración métrica de niveles

   Sistema completo de parámetros. Cada nivel es PURO DATA:
   dificultad, parámetros del juego, tiempos — sin una línea
   de lógica. Los módulos de nivel leen la config dinámicamente.

   Estructura:
   - dificultad: 1-5 (progresión global)
   - bloque: categoría de gesto
   - tiempoBase: segundos para 3 cucharas
   - [tipo]: objeto con parámetros específicos del nivel

   ============================================================ */

/* ============================================================
   DESGRANAR — LA TEMPORADA DEL CHOCLO Y EL MAÍZ

   Quince paradas, y no son quince veces lo mismo: la temporada
   recorre el maíz como lo recorre el año. Empieza en el CHOCLO
   tierno —el de la mata, que cede solo—, pasa al DURO, y termina en
   el MAÍZ SECO, el de la tonga colgada, que se agarra con todo y
   hay que desgranar de puño.

   Cada tres o cuatro paradas entra algo nuevo y las siguientes lo
   mezclan con lo anterior:

     1–3    el gesto: deshojar, desgranar, la cascada
     4–5    el duro: el grano que pelea
     6–8    los dañados: lo que NO hay que tocar
     9–10   el volumen: tres mazorcas
     11–15  el maíz seco: la temporada se cierra donde se guarda

   `hojas` son las que hay que arrancar; `podridos` y `gusanos` van
   POR MAZORCA (un número los reparte igual a todas, una lista da el
   de cada una). Cuántos granos trae un choclo no se pone aquí: son
   A×P de modelos/choclo.js, la forma de la mazorca.
   ============================================================ */
export const MAIZ = {
  /* --- el gesto --- */
  'maiz-1-introduccion': {
    nombre: 'El choclo · primeros granos',
    corto: 'Primeros granos',
    dificultad: 1, bloque: 'DESGRANAR',
    tiempoBase: 140,
    config: { choclos: 1, hojas: 5, madurez: ['tierno'], podridos: 0, gusanos: 0 }
  },
  'maiz-2-cascada': {
    nombre: 'El choclo · la fila entera',
    corto: 'La cascada',
    dificultad: 1, bloque: 'DESGRANAR',
    tiempoBase: 125,
    config: { choclos: 1, hojas: 8, madurez: ['tierno'], podridos: 0, gusanos: 0 }
  },
  'maiz-3-dos': {
    nombre: 'Dos choclos tiernos',
    corto: 'Dos choclos',
    dificultad: 2, bloque: 'DESGRANAR',
    tiempoBase: 120,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'tierno'], podridos: 0, gusanos: [1, 1] }
  },

  /* --- el duro --- */
  'maiz-4-primer-duro': {
    nombre: 'El primero duro',
    corto: 'El primer duro',
    dificultad: 2, bloque: 'DESGRANAR',
    tiempoBase: 115,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'duro'], podridos: 0, gusanos: [1, 1] }
  },
  'maiz-5-duro': {
    nombre: 'Los dos duros',
    corto: 'Los dos duros',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 10, madurez: ['duro', 'duro'], podridos: 0, gusanos: [1, 1] }
  },

  /* --- los dañados: lo que NO hay que tocar --- */
  'maiz-6-primer-danado': {
    nombre: 'El primer dañado',
    corto: 'Un dañado',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'tierno'], podridos: 1, gusanos: [1, 1] }
  },
  'maiz-7-danado-duro': {
    nombre: 'Dañados en el duro',
    corto: 'Dañado y duro',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 105,
    config: { choclos: 2, hojas: 10, madurez: ['duro', 'duro'], podridos: 2, gusanos: [1, 1] }
  },
  'maiz-8-picada': {
    nombre: 'La mazorca picada',
    corto: 'La picada',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 100,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'duro'], podridos: 4, gusanos: [1, 2] }
  },

  /* --- el volumen: tres mazorcas --- */
  'maiz-9-tres': {
    nombre: 'Tres mazorcas',
    corto: 'Tres mazorcas',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 150,
    config: { choclos: 3, hojas: 10, madurez: ['tierno', 'duro', 'tierno'], podridos: 2, gusanos: [1, 1, 1] }
  },
  'maiz-10-costal': {
    nombre: 'El costal entero',
    corto: 'El costal',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 140,
    config: { choclos: 3, hojas: 12, madurez: ['duro', 'duro', 'tierno'], podridos: 4, gusanos: [1, 2, 1] }
  },

  /* --- el maíz seco: donde se guarda la temporada --- */
  'maiz-11-seco': {
    nombre: 'El maíz seco',
    corto: 'El maíz seco',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 125,
    config: { choclos: 1, hojas: 6, madurez: ['seco'], podridos: 0, gusanos: 0 }
  },
  'maiz-12-seco-tierno': {
    nombre: 'Seco y tierno',
    corto: 'Seco y tierno',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 120,
    config: { choclos: 2, hojas: 10, madurez: ['seco', 'tierno'], podridos: 2, gusanos: [1, 1] }
  },
  'maiz-13-tonga': {
    nombre: 'La tonga',
    corto: 'La tonga',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 115,
    config: { choclos: 2, hojas: 10, madurez: ['seco', 'seco'], podridos: 3, gusanos: [1, 2] }
  },
  'maiz-14-morocho': {
    nombre: 'El morocho picado',
    corto: 'El morocho',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 12, madurez: ['seco', 'duro'], podridos: 6, gusanos: [2, 2] }
  },
  'maiz-15-ultima': {
    nombre: 'La última tonga',
    corto: 'La última',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 160,
    config: { choclos: 3, hojas: 12, madurez: ['seco', 'seco', 'duro'], podridos: 6, gusanos: [2, 2, 2] }
  },
};

// DESVAINAR — Vainas
export const VAINAS = {
  'arveja-1-facil': {
    nombre: 'La arveja · primer hilo',
    dificultad: 2, bloque: 'DESVAINAR',
    tiempoBase: 85,
    config: {
      tipo: 'arveja',
      cantidad: 1,
      resistencia: 0,       // 0=suave, 1=normal, 2=apretada
      hilo_friccion: 0.3,   // 0.3=fácil, 0.8=difícil
      gusanos: 0,
    }
  },
  'arveja-2-normal': {
    nombre: 'La arveja natural',
    dificultad: 3, bloque: 'DESVAINAR',
    tiempoBase: 75,
    config: {
      tipo: 'arveja',
      cantidad: 1,
      resistencia: 1,
      hilo_friccion: 0.5,
      gusanos: 1,
    }
  },
  'arveja-3-dificil': {
    nombre: 'La arveja apretada',
    dificultad: 4, bloque: 'DESVAINAR',
    tiempoBase: 65,
    config: {
      tipo: 'arveja',
      cantidad: 1,
      resistencia: 2,
      hilo_friccion: 0.8,
      gusanos: 1,
    }
  },

  'habas-1-facil': {
    nombre: 'Las habas · apertura suave',
    dificultad: 2, bloque: 'DESVAINAR',
    tiempoBase: 80,
    config: {
      tipo: 'haba',
      cantidad: 1,
      resistencia: 0,
      gusanos: 0,
    }
  },
  'habas-2-normal': {
    nombre: 'Las habas apretadas',
    dificultad: 3, bloque: 'DESVAINAR',
    tiempoBase: 70,
    config: {
      tipo: 'haba',
      cantidad: 1,
      resistencia: 1,
      gusanos: 1,
    }
  },
};

// RASPAR — Melloco
export const MELLOCO_NIVELES = {
  'melloco-1-facil': {
    nombre: 'El melloco · raspe suave',
    dificultad: 2, bloque: 'RASPAR',
    tiempoBase: 95,
    config: {
      cantidad: 1,
      velocidad_minima: 0.2,   // tolerancia de velocidad
      resistencia: 0,
      gusanos: 0,
    }
  },
  'melloco-2-normal': {
    nombre: 'El melloco normal',
    dificultad: 3, bloque: 'RASPAR',
    tiempoBase: 80,
    config: {
      cantidad: 1,
      velocidad_minima: 0.5,
      resistencia: 1,
      gusanos: 1,
    }
  },
};

// LAVAR — Quinua
export const QUINUA_NIVELES = {
  'quinua-1-facil': {
    nombre: 'La quinua · primer lavado',
    dificultad: 2, bloque: 'LAVAR',
    tiempoBase: 100,
    config: {
      cantidad: 1,
      saponina_nivel: 0.4,    // densidad de saponina (0-1)
      lavadas_requeridas: 2,
      gusanos: 0,
    }
  },
  'quinua-2-normal': {
    nombre: 'La quinua espumosa',
    dificultad: 3, bloque: 'LAVAR',
    tiempoBase: 85,
    config: {
      cantidad: 1,
      saponina_nivel: 0.7,
      lavadas_requeridas: 3,
      gusanos: 1,
    }
  },
};

// ENROLLAR — Col
export const COL_NIVELES = {
  'col-1-facil': {
    nombre: 'La col · primer rollo',
    dificultad: 2, bloque: 'ENROLLAR',
    tiempoBase: 105,
    config: {
      cantidad: 1,
      resistencia: 0,
      espesor_corte: 'grueso',
      gusanos: 0,
    }
  },
  'col-2-fino': {
    nombre: 'La col cortadita',
    dificultad: 3, bloque: 'ENROLLAR',
    tiempoBase: 90,
    config: {
      cantidad: 1,
      resistencia: 1,
      espesor_corte: 'fino',
      gusanos: 1,
    }
  },
};

// MAJAR — Maní
export const MANI_NIVELES = {
  'mani-1-facil': {
    nombre: 'El maní · primer majado',
    dificultad: 2, bloque: 'MAJAR',
    tiempoBase: 110,
    config: {
      cantidad: 1,
      velocidad_minima: 0.2,
      resistencia: 0,
      gusanos: 0,
    }
  },
  'mani-2-rapido': {
    nombre: 'El maní majado',
    dificultad: 3, bloque: 'MAJAR',
    tiempoBase: 95,
    config: {
      cantidad: 1,
      velocidad_minima: 0.4,
      resistencia: 1,
      gusanos: 1,
    }
  },
};

// ESCOGER — Lentejas
export const ESCOGER_NIVELES = {
  'escoger-1-facil': {
    nombre: 'La lenteja · poquitas piedras',
    dificultad: 2, bloque: 'ESCOGER',
    tiempoBase: 95,
    config: {
      cantidad: 1,
      piedras_pct: 0.05,     // 5% de piedras
      defectos_pct: 0.05,    // granos picados
      gusanos: 0,
    }
  },
  'escoger-2-normal': {
    nombre: 'La lenteja normal',
    dificultad: 3, bloque: 'ESCOGER',
    tiempoBase: 75,
    config: {
      cantidad: 1,
      piedras_pct: 0.10,
      defectos_pct: 0.08,
      gusanos: 1,
    }
  },
  'escoger-3-dificil': {
    nombre: 'La lenteja sucia',
    dificultad: 4, bloque: 'ESCOGER',
    tiempoBase: 65,
    config: {
      cantidad: 1,
      piedras_pct: 0.15,
      defectos_pct: 0.12,
      gusanos: 1,
    }
  },
};

// CHOCHOS — Pelar
export const CHOCHOS_NIVELES = {
  'chochos-1-facil': {
    nombre: 'Los chochos · pelada suave',
    dificultad: 2, bloque: 'PELAR',
    tiempoBase: 85,
    config: {
      cantidad: 1,
      resistencia: 0,
      velocidad_salto: 0.4,
      gusanos: 0,
    }
  },
  'chochos-2-normal': {
    nombre: 'Los chochos pelados',
    dificultad: 3, bloque: 'PELAR',
    tiempoBase: 70,
    config: {
      cantidad: 1,
      resistencia: 1,
      velocidad_salto: 0.6,
      gusanos: 1,
    }
  },
};

// FRÉJOL — Reventar
export const FREJOL_NIVELES = {
  'frejol-1-facil': {
    nombre: 'El fréjol · revientas fácil',
    dificultad: 2, bloque: 'REVENTAR',
    tiempoBase: 90,
    config: {
      cantidad: 1,
      resistencia: 0,
      presion_requerida: 0.3,
      gusanos: 0,
    }
  },
  'frejol-2-normal': {
    nombre: 'El fréjol reventado',
    dificultad: 3, bloque: 'REVENTAR',
    tiempoBase: 75,
    config: {
      cantidad: 1,
      resistencia: 1,
      presion_requerida: 0.6,
      gusanos: 1,
    }
  },
};

// BACALAO — Desalar
export const BACALAO_NIVELES = {
  'bacalao-1-facil': {
    nombre: 'El bacalao · primer desale',
    dificultad: 2, bloque: 'DESALAR',
    tiempoBase: 100,
    config: {
      cantidad: 1,
      sal_nivel: 0.4,
      moscas_velocidad: 'lenta',
      moscas_frecuencia: 0.3,
      gusanos: 0,
    }
  },
  'bacalao-2-normal': {
    nombre: 'El bacalao desalado',
    dificultad: 3, bloque: 'DESALAR',
    tiempoBase: 85,
    config: {
      cantidad: 1,
      sal_nivel: 0.7,
      moscas_velocidad: 'normal',
      moscas_frecuencia: 0.5,
      gusanos: 0,
    }
  },
};

// ZAPALLO — Multigestos
export const ZAPALLO_NIVELES = {
  'zapallo-1-facil': {
    nombre: 'El zapallo · introducción',
    dificultad: 2, bloque: 'MULTIGESTOS',
    tiempoBase: 125,
    config: {
      cantidad: 1,
      resistencia: 0,
      gusanos: 0,
    }
  },
  'zapallo-2-normal': {
    nombre: 'El zapallo completo',
    dificultad: 3, bloque: 'MULTIGESTOS',
    tiempoBase: 100,
    config: {
      cantidad: 1,
      resistencia: 1,
      gusanos: 1,
    }
  },
  'zapallo-3-rapido': {
    nombre: 'El zapallo a la carrera',
    dificultad: 4, bloque: 'MULTIGESTOS',
    tiempoBase: 75,
    config: {
      cantidad: 1,
      resistencia: 2,
      gusanos: 1,
    }
  },
};

// COMPILAR TODO
export const TODOS_NIVELES = {
  DESGRANAR: MAIZ,
  DESVAINAR: VAINAS,
  RASPAR: MELLOCO_NIVELES,
  LAVAR: QUINUA_NIVELES,
  ENROLLAR: COL_NIVELES,
  MAJAR: MANI_NIVELES,
  ESCOGER: ESCOGER_NIVELES,
  PELAR: CHOCHOS_NIVELES,
  REVENTAR: FREJOL_NIVELES,
  DESALAR: BACALAO_NIVELES,
  MULTIGESTOS: ZAPALLO_NIVELES,
};

/* LISTA PLANA ORDENADA (para menú)

   Cada entrada se queda con su `id` (la clave del objeto) y con el
   `base`: el ingrediente del que sale, que es lo que decide qué
   `nivel-<id>.js` se carga. El id ya lo dice —'maiz-3-duro' viene de
   'maiz'— y derivarlo del prefijo evita una segunda tabla que un día
   deja de coincidir con la primera. */
export const NIVELES_ORDENADO = Object.entries(TODOS_NIVELES)
  .flatMap(([_, niveles]) => Object.entries(niveles))
  .map(([id, n]) => ({ ...n, id, base: id.split('-')[0] }))
  /* El orden ES el orden en que están escritos. Antes cada nivel
     llevaba un `orden: N` a mano y había treinta números que mantener
     sincronizados: meter un nivel en medio obligaba a renumerar todo
     lo de abajo, y el primero que se olvidara dejaba la temporada
     desordenada sin que nada fallara. */
  .map((n, i) => ({ ...n, orden: i + 1, index: i }));

/* índice plano por id: la búsqueda por nombre no servía y la que
   había recorría TODOS_NIVELES ignorando cuál nivel estaba mirando,
   así que devolvía siempre el primero de la lista */
export const POR_ID = Object.fromEntries(NIVELES_ORDENADO.map(n => [n.id, n]));

// HELPERS
export function nivelPor(id) {
  return POR_ID[id] || null;
}

/* las variantes de un ingrediente, en orden de dificultad */
export function variantesDe(base) {
  return NIVELES_ORDENADO.filter(n => n.base === base);
}

export function proximoNivel(ordenActual) {
  return NIVELES_ORDENADO[ordenActual + 1] || null;
}

export function nivelPorBloque(bloque) {
  return NIVELES_ORDENADO.filter(n => n.bloque === bloque);
}
