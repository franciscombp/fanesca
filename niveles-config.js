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

   Quince paradas que recorren el maíz como lo recorre el año: del
   CHOCLO tierno de la mata, al DURO, al MAÍZ SECO de la tonga
   colgada — que ya perdió el agua, se agarra con todo y hay que
   desgranar de puño.

   LOS TIEMPOS NO ESTÁN ESCRITOS A OJO: SE DERIVARON.

   Para cada parada se calcula su CARGA en granos equivalentes —un
   grano tierno en cascada vale 1; el duro 1.18 y el seco 1.42, que
   es lo que dicen su resistencia y su cascada; una hoja vale 3, un
   gusano 10 y un dañado 5, porque rompe la fila y hay que rodearla—
   y de ahí sale el tiempo: t = carga / presión objetivo.

   Al revés —escribiendo el tiempo y dejando que la presión salga de
   rebote— la curva subía y bajaba sin patrón: había un salto del
   130% en la parada 3 y un cráter en la 11 que la dejaba más fácil
   que la 2.

   LA CURVA ES UN DIENTE DE SIERRA, no una rampa. Cada mecánica
   nueva entra con un respiro (7 el dañado, 11 el seco), pero cada
   valle queda MÁS ALTO que el anterior y cada pico más alto que el
   anterior. El salto máximo entre paradas es del 45%.

   Y NO SE ALARGAN PARA HACERSE DIFÍCILES. Meter más mazorcas hace
   los niveles largos, no difíciles, y un nivel largo que además
   puedes perder por tocar un gusano no es difícil: es cruel. Por
   eso doce de las quince van a dos mazorcas y la dificultad sale de
   la madurez, los dañados, los bichos y el reloj. Las tres
   mazorcas aparecen UNA vez, en la última, como lo que son: la
   gran faena.

   `hojas` son las que hay que arrancar; `podridos` y `gusanos` van
   POR MAZORCA (un número los reparte igual a todas, una lista da el
   de cada una). Cuántos granos trae un choclo no se pone aquí: son
   A×P de modelos/choclo.js, la forma de la mazorca.
   ============================================================ */
export const MAIZ = {
  /* --- el gesto: deshojar, desgranar, y el bicho --- */
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
    tiempoBase: 120,
    config: { choclos: 1, hojas: 8, madurez: ['tierno'], podridos: 0, gusanos: 0 }
  },
  'maiz-3-gusanito': {
    nombre: 'El choclo con gusanito',
    corto: 'El gusanito',
    dificultad: 2, bloque: 'DESGRANAR',
    tiempoBase: 105,
    config: { choclos: 1, hojas: 8, madurez: ['tierno'], podridos: 0, gusanos: 1 }
  },

  /* --- dos mazorcas, y la segunda pelea --- */
  'maiz-4-dos': {
    nombre: 'Dos choclos tiernos',
    corto: 'Dos choclos',
    dificultad: 2, bloque: 'DESGRANAR',
    tiempoBase: 130,
    config: { choclos: 2, hojas: 6, madurez: ['tierno', 'tierno'], podridos: 0, gusanos: 0 }
  },
  'maiz-5-primer-duro': {
    nombre: 'El segundo está duro',
    corto: 'El primer duro',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 140,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'duro'], podridos: 0, gusanos: [1, 1] }
  },
  'maiz-6-duro': {
    nombre: 'Los dos duros',
    corto: 'Los dos duros',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 130,
    config: { choclos: 2, hojas: 10, madurez: ['duro', 'duro'], podridos: 0, gusanos: [1, 1] }
  },

  /* --- los dañados: lo que NO hay que tocar --- */
  'maiz-7-primer-danado': {
    nombre: 'El primer dañado',
    corto: 'Un dañado',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 125,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'tierno'], podridos: 1, gusanos: [1, 1] }
  },
  'maiz-8-danado-duro': {
    nombre: 'Dañados en el duro',
    corto: 'Dañado y duro',
    dificultad: 3, bloque: 'DESGRANAR',
    tiempoBase: 125,
    config: { choclos: 2, hojas: 10, madurez: ['duro', 'duro'], podridos: 2, gusanos: [1, 1] }
  },
  'maiz-9-picada': {
    nombre: 'La mazorca picada',
    corto: 'La picada',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 115,
    config: { choclos: 2, hojas: 10, madurez: ['tierno', 'duro'], podridos: 4, gusanos: [1, 2] }
  },
  'maiz-10-plaga': {
    nombre: 'El choclo con plaga',
    corto: 'La plaga',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 115,
    config: { choclos: 2, hojas: 12, madurez: ['duro', 'duro'], podridos: 5, gusanos: [2, 2] }
  },

  /* --- el maíz seco: la temporada se cierra donde se guarda --- */
  'maiz-11-seco': {
    nombre: 'Entra el maíz seco',
    corto: 'El maíz seco',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 8, madurez: ['seco', 'tierno'], podridos: 0, gusanos: [1, 1] }
  },
  'maiz-12-seco-duro': {
    nombre: 'Seco y duro',
    corto: 'Seco y duro',
    dificultad: 4, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 10, madurez: ['seco', 'duro'], podridos: 2, gusanos: [1, 1] }
  },
  'maiz-13-tonga': {
    nombre: 'La tonga',
    corto: 'La tonga',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 2, hojas: 10, madurez: ['seco', 'seco'], podridos: 3, gusanos: [1, 2] }
  },
  'maiz-14-morocho': {
    nombre: 'El morocho picado',
    corto: 'El morocho',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 105,
    config: { choclos: 2, hojas: 12, madurez: ['seco', 'duro'], podridos: 6, gusanos: [2, 2] }
  },

  /* --- la gran faena --- */
  'maiz-15-ultima': {
    nombre: 'La última tonga',
    corto: 'La última',
    dificultad: 5, bloque: 'DESGRANAR',
    tiempoBase: 110,
    config: { choclos: 3, hojas: 5, madurez: ['seco', 'duro', 'tierno'], podridos: 2, gusanos: [1, 1, 1] }
  },
};

/* DESVAINAR — Vainas

   `cantidad` son VAINAS de verdad. Estaba a 1 en todas: era un
   marcador de cuando ningún nivel leía la config, y ahora que la
   leen dejaría una sola vaina en la tabla en vez de las seis. */
export const VAINAS = {
  'arveja-1-facil': {
    nombre: 'La arveja · primer hilo',
    dificultad: 2, bloque: 'DESVAINAR',
    tiempoBase: 85,
    config: {
      cantidad: 4,
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
      cantidad: 6,
      resistencia: 1,
      hilo_friccion: 0.5,
      gusanos: 2,
    }
  },
  'arveja-3-dificil': {
    nombre: 'La arveja apretada',
    dificultad: 4, bloque: 'DESVAINAR',
    tiempoBase: 65,
    config: {
      cantidad: 6,
      resistencia: 2,
      hilo_friccion: 0.8,
      gusanos: 3,
    }
  },

  'habas-1-facil': {
    nombre: 'Las habas · apertura suave',
    dificultad: 2, bloque: 'DESVAINAR',
    tiempoBase: 80,
    config: {
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

/* ============================================================
   EL APURO — el modo contrarreloj

   La campaña se juega con calma: un ingrediente, su gesto, su
   historia. El Apuro es lo contrario y a propósito — es la cocina
   del Viernes Santo a las once de la mañana, con todo el mundo
   pidiendo la olla.

   POR QUÉ EL TIEMPO Y NO LAS VIDAS. En este juego hay gestos que
   CASTIGAN la prisa: el choclo tierno revienta si pasas el dedo
   fuerte, el melloco se dispara si lo empujas. Un modo de vidas
   te vuelve cauto, y cauto contra el reloj es una contradicción
   que el jugador siente aunque no sepa nombrarla. Con el reloj como
   única vida, ir rápido y ir bien son la misma decisión.

   Y EL RELOJ SUBE. Cada ración terminada devuelve segundos: la
   recompensa de hacerlo bien no son puntos abstractos, es seguir
   jugando. Es el enganche más viejo que hay y sigue siendo el mejor.

   LOS BICHOS NO MATAN, COBRAN. En la campaña aplastar un gusanito
   arruina la olla y se acabó. Aquí te cuesta segundos: la partida
   sigue, y una partida que sigue es una partida que quieres
   terminar. Perder de golpe por un error a los diez segundos es la
   forma más rápida de que alguien cierre el juego.
   ============================================================ */
export const APURO = {
  relojInicial: 45,
  /* el bono por ración baja con las tandas: al principio regala
     tiempo para que entres, después hay que ganárselo */
  bonoBase: 9,
  bonoMinimo: 4,
  racionesPorTanda: 4,
  /* lo que cuesta cada desastre, en segundos */
  castigo: { aplastado: 10, enLaBatea: 12, granoPodrido: 8, otro: 8 },
  /* aviso cuando quedan estos segundos: el reloj se pone rojo y late */
  avisoRojo: 10,

  /* QUÉ ENTRA Y CUÁNTO. `porcion` es qué parte del nivel completo
     cuenta como una ración: el choclo entero son ciento veintiséis
     granos y eso es un minuto largo — demasiado para una vuelta de
     un modo que dura dos. `ajustes` recorta lo que en el apuro no
     tiene sentido: nadie deshoja diez hojas cuando va con prisa, el
     choclo ya viene pelado de la feria. */
  raciones: [
    { base: 'maiz',    porcion: 0.30, ajustes: { hojas: 2 } },
    { base: 'arveja',  porcion: 0.70 },
    { base: 'habas',   porcion: 0.70 },
    { base: 'chochos', porcion: 0.70 },
    { base: 'frejol',  porcion: 0.70 },
    { base: 'melloco', porcion: 0.60 },
    { base: 'col',     porcion: 0.55 },
    { base: 'escoger', porcion: 0.50 },
    { base: 'quinua',  porcion: 0.50 },
    { base: 'mani',    porcion: 0.50 },
    { base: 'bacalao', porcion: 0.55 },
    { base: 'zapallo', porcion: 0.35 },
  ],
};
