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
    /* sintagma nominal, no frase: el nombre entra en plantillas como
       «… a la olla» y «Primero …», donde una oración quedaba rota */
    nombre: 'El choclo duro',
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
    /* sintagma nominal por lo mismo que el choclo duro de arriba */
    nombre: 'El maíz seco',
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

/* LOS TIEMPOS DE ESTOS ONCE TAMBIÉN SE DERIVAN, no se escriben.

   El ancla de cada ingrediente es el primer corte de cucharas de su
   nivel original (niveles.js) — un número PROBADO CON LOS DEDOS — que
   corresponde a la variante cuyas cuentas igualan las constantes de
   siempre. De ahí: t = ancla × (carga / carga_ancla) ÷ presión, con
   la carga en unidades del ingrediente (vainas, presas, lavadas…)
   encarecida un 12% por punto de resistencia, y la presión relajada
   en la intro (0.85) y apretada en la difícil (1.15).

   Antes estaban a ojo y regalaban las cucharas: la haba normal daba
   70 s para un trabajo que lo probado pedía en 50, y el chocho fácil
   85 s donde el gesto real toma 30. Un marcador que siempre da tres
   cucharas no mide nada.

   El detalle de la derivación: scratchpad/derivar-tiempos.mjs. */

/* DESVAINAR — Vainas

   `cantidad` son VAINAS de verdad. Estaba a 1 en todas: era un
   marcador de cuando ningún nivel leía la config, y ahora que la
   leen dejaría una sola vaina en la tabla en vez de las seis. */
export const VAINAS = {
  'arveja-1-facil': {
    nombre: 'La arveja · primer hilo',
    dificultad: 2, bloque: 'DESVAINAR',
    tiempoBase: 45,
    config: {
      cantidad: 4,
      resistencia: 0,       // 0=suave, 1=normal, 2=apretada
      hilo_friccion: 0.3,   // 0.3=fácil, 0.8=difícil
      gusanos: 0,
    }
  },
  'arveja-2-normal': {
    nombre: 'La arveja natural',
    corto: 'La arveja',
    dificultad: 3, bloque: 'DESVAINAR',
    tiempoBase: 65,
    config: {
      cantidad: 6,
      resistencia: 1,
      hilo_friccion: 0.5,
      gusanos: 2,
    }
  },
  'arveja-3-dificil': {
    nombre: 'La arveja apretada',
    corto: 'La apretada',
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
    tiempoBase: 35,
    config: {
      cantidad: 4,
      resistencia: 0,
      gusanos: 1,
    }
  },
  'habas-2-normal': {
    nombre: 'Las habas apretadas',
    corto: 'Apretadas',
    dificultad: 3, bloque: 'DESVAINAR',
    tiempoBase: 50,
    config: {
      cantidad: 6,
      resistencia: 1,
      gusanos: 2,
    }
  },
};

// RASPAR — Melloco
export const MELLOCO_NIVELES = {
  'melloco-1-facil': {
    nombre: 'El melloco · raspe suave',
    dificultad: 2, bloque: 'RASPAR',
    tiempoBase: 45,
    config: {
      cantidad: 6,
      resistencia: 0,
      gusanos: 1,
    }
  },
  'melloco-2-normal': {
    nombre: 'El melloco normal',
    corto: 'Con babaza',
    dificultad: 3, bloque: 'RASPAR',
    tiempoBase: 55,
    config: {
      cantidad: 8,
      resistencia: 1,
      gusanos: 2,
    }
  },
};

// LAVAR — Quinua
export const QUINUA_NIVELES = {
  'quinua-1-facil': {
    nombre: 'La quinua · primer lavado',
    dificultad: 2, bloque: 'LAVAR',
    tiempoBase: 40,
    config: {
      saponina_nivel: 0.4,    // densidad de saponina (0-1)
      lavadas_requeridas: 2,
      gusanos: 0,
    }
  },
  'quinua-2-normal': {
    nombre: 'La quinua espumosa',
    corto: 'Espumosa',
    dificultad: 3, bloque: 'LAVAR',
    tiempoBase: 50,
    config: {
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
    tiempoBase: 65,
    config: {
      cantidad: 1,
      resistencia: 0,
      espesor_corte: 'grueso',
      gusanos: 1,
    }
  },
  'col-2-fino': {
    nombre: 'La col cortadita',
    corto: 'Cortadita',
    dificultad: 3, bloque: 'ENROLLAR',
    tiempoBase: 60,
    config: {
      cantidad: 1,
      resistencia: 1,
      espesor_corte: 'fino',
      gusanos: 2,
    }
  },
};

// MAJAR — Maní
export const MANI_NIVELES = {
  'mani-1-facil': {
    nombre: 'El maní · primer majado',
    dificultad: 2, bloque: 'MAJAR',
    tiempoBase: 55,
    config: {
      cantidad: 12,
      velocidad_minima: 0.2,
      resistencia: 0,
      gusanos: 1,
    }
  },
  'mani-2-rapido': {
    nombre: 'El maní majado',
    corto: 'Majado',
    dificultad: 3, bloque: 'MAJAR',
    tiempoBase: 70,
    config: {
      cantidad: 16,
      velocidad_minima: 0.4,
      resistencia: 1,
      gusanos: 2,
    }
  },
};

// ESCOGER — Lentejas
export const ESCOGER_NIVELES = {
  'escoger-1-facil': {
    nombre: 'La lenteja · poquitas piedras',
    dificultad: 2, bloque: 'ESCOGER',
    tiempoBase: 70,
    config: {
      cantidad: 26,
      piedras_pct: 0.05,     // 5% de piedras
      defectos_pct: 0.05,    // granos picados
      gusanos: 1,
    }
  },
  'escoger-2-normal': {
    nombre: 'La lenteja normal',
    corto: 'Con piedras',
    dificultad: 3, bloque: 'ESCOGER',
    tiempoBase: 70,
    config: {
      cantidad: 31,
      piedras_pct: 0.10,
      defectos_pct: 0.08,
      gusanos: 2,
    }
  },
  'escoger-3-dificil': {
    nombre: 'La lenteja sucia',
    corto: 'La sucia',
    dificultad: 4, bloque: 'ESCOGER',
    tiempoBase: 70,
    config: {
      cantidad: 36,
      piedras_pct: 0.15,
      defectos_pct: 0.12,
      gusanos: 3,
    }
  },
};

// CHOCHOS — Pelar
export const CHOCHOS_NIVELES = {
  'chochos-1-facil': {
    nombre: 'Los chochos · pelada suave',
    dificultad: 2, bloque: 'PELAR',
    tiempoBase: 30,
    config: {
      cantidad: 9,
      resistencia: 0,
      velocidad_salto: 0.4,
      gusanos: 1,
    }
  },
  'chochos-2-normal': {
    nombre: 'Los chochos pelados',
    corto: 'Pelados',
    dificultad: 3, bloque: 'PELAR',
    tiempoBase: 40,
    config: {
      cantidad: 12,
      resistencia: 1,
      velocidad_salto: 0.6,
      gusanos: 2,
    }
  },
};

// FRÉJOL — Reventar
export const FREJOL_NIVELES = {
  'frejol-1-facil': {
    nombre: 'El fréjol · revientas fácil',
    dificultad: 2, bloque: 'REVENTAR',
    tiempoBase: 40,
    config: {
      cantidad: 4,
      resistencia: 0,
      presion_requerida: 0.3,
      gusanos: 1,
    }
  },
  'frejol-2-normal': {
    nombre: 'El fréjol reventado',
    corto: 'Reventado',
    dificultad: 3, bloque: 'REVENTAR',
    tiempoBase: 50,
    config: {
      cantidad: 5,
      resistencia: 1,
      presion_requerida: 0.6,
      gusanos: 2,
    }
  },
};

// BACALAO — Desalar
export const BACALAO_NIVELES = {
  'bacalao-1-facil': {
    nombre: 'El bacalao · primer desale',
    dificultad: 2, bloque: 'DESALAR',
    tiempoBase: 50,
    config: {
      cantidad: 4,
      sal_nivel: 0.4,
      moscas_velocidad: 'lenta',
      moscas_frecuencia: 0.3,
      gusanos: 0,
    }
  },
  'bacalao-2-normal': {
    nombre: 'El bacalao desalado',
    corto: 'Desalado',
    dificultad: 3, bloque: 'DESALAR',
    tiempoBase: 55,
    config: {
      cantidad: 5,
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
    tiempoBase: 60,
    config: {
      cantidad: 5,
      resistencia: 0,
      gusanos: 1,
    }
  },
  'zapallo-2-normal': {
    nombre: 'El zapallo completo',
    corto: 'Completo',
    dificultad: 3, bloque: 'MULTIGESTOS',
    tiempoBase: 80,
    config: {
      cantidad: 7,
      resistencia: 1,
      gusanos: 1,
    }
  },
  'zapallo-3-rapido': {
    nombre: 'El zapallo a la carrera',
    corto: 'A la carrera',
    dificultad: 4, bloque: 'MULTIGESTOS',
    tiempoBase: 75,
    config: {
      cantidad: 7,
      resistencia: 2,
      gusanos: 2,
    }
  },
};

// FROTAR — Garbanzo
export const GARBANZO_NIVELES = {
  'garbanzo-1-remojado': {
    nombre: 'El garbanzo · la camisita',
    dificultad: 2, bloque: 'FROTAR',
    tiempoBase: 45,
    config: {
      cantidad: 10,
      resistencia: 1,      // cuánto frote pide cada camisita
      gusanos: 1,
    }
  },
};

// RALLAR — Sambo
export const SAMBO_NIVELES = {
  'sambo-1-tierno': {
    nombre: 'El sambo · a la hebra',
    dificultad: 3, bloque: 'RALLAR',
    tiempoBase: 55,
    config: {
      cantidad: 2,         // medias lunas
      resistencia: 1,      // pasadas que pide cada media
      gusanos: 1,
    }
  },
};

// AGITAR — Arroz
export const ARROZ_NIVELES = {
  'arroz-1-tres-aguas': {
    nombre: 'El arroz · tres aguas',
    dificultad: 2, bloque: 'AGITAR',
    tiempoBase: 45,
    config: {
      lavadas_requeridas: 3,
      agitadas_por_agua: 10,
      gusanos: 1,
    }
  },
};

// DESMENUZAR — Queso y leche
export const QUESO_NIVELES = {
  'queso-1-fresco': {
    nombre: 'El queso · a la miga',
    dificultad: 2, bloque: 'DESMENUZAR',
    tiempoBase: 40,
    config: {
      pedazos: 12,
      moscas_frecuencia: 0.35,
      gusanos: 0,
    }
  },
};

// CASCAR — Huevo duro
export const HUEVO_NIVELES = {
  'huevo-1-duro': {
    nombre: 'El huevo · cascar y pelar',
    dificultad: 2, bloque: 'CASCAR',
    tiempoBase: 50,
    config: {
      cantidad: 3,
      golpes: 4,
      gusanos: 0,
    }
  },
};

// ARMAR — La guarnición
export const GUARNICION_NIVELES = {
  'guarnicion-1-completa': {
    nombre: 'La guarnición · el plato',
    dificultad: 3, bloque: 'ARMAR',
    tiempoBase: 75,
    config: {
      presas: 3,           // tajadas de maduro que se fríen
      resistencia: 0,      // aprieta la ventana del volteo
      gusanos: 0,
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
  FROTAR: GARBANZO_NIVELES,
  RALLAR: SAMBO_NIVELES,
  AGITAR: ARROZ_NIVELES,
  DESMENUZAR: QUESO_NIVELES,
  CASCAR: HUEVO_NIVELES,
  ARMAR: GUARNICION_NIVELES,
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
   LA SEMANA — el orden de la campaña.

   La fanesca no se cocina en una tarde: se cocina en una SEMANA.
   El desgrane es faena de familia — cada día llega alguien más a
   ayudar y cada día se deja algo listo en la refri — y ese es el
   viaje del juego: cinco días de preparación que terminan el jueves
   por la noche con la olla hirviendo, para servirla el Viernes
   Santo.

   CÓMO ESTÁ REPARTIDO (y por qué así):

   · Los doce ingredientes se PRESENTAN en el orden de siempre —por
     lo difícil que es aprender su gesto, no ejecutarlo—: maíz,
     habas, chochos, fréjol, arveja, melloco, lenteja, col, quinua,
     maní, bacalao, zapallo. Ese orden se probó con jugadores y no
     se toca; aquí solo se estira a lo largo de tres días.

   · Las variantes bravas de cada uno se ENTRELAZAN con las
     presentaciones: el lunes deshilas tu primera arveja y el jueves
     te toca la apretada, que es exactamente como pasa en una cocina
     de verdad — lo fácil al principio de la semana, la tonga al
     final. Entrelazado, además, nunca hay quince paradas de maíz
     seguidas.

   · Dentro de un ingrediente el orden de su escalera SE RESPETA:
     este reparto solo decide en qué día cae cada peldaño, nunca
     los adelanta.

   · La dificultad sube por día: lunes 1-2, martes 2-3, miércoles
     2-3, jueves 3-4, y la noche 4-5 cerrando con el trío de maíz
     más bravo. La olla va DESPUÉS de la última parada: el clímax
     del juego está al final del camino, no en la mitad.
   ============================================================ */
export const DIAS = [
  {
    id: 'lunes',
    nombre: 'Lunes', titulo: 'El canasto del mercado',
    paradas: [
      'maiz-1-introduccion', 'habas-1-facil', 'maiz-2-cascada',
      'chochos-1-facil', 'frejol-1-facil', 'maiz-3-gusanito',
      'arveja-1-facil', 'melloco-1-facil',
    ],
  },
  {
    id: 'martes',
    nombre: 'Martes', titulo: 'El costal de la tía',
    paradas: [
      'escoger-1-facil', 'col-1-facil', 'maiz-4-dos',
      'quinua-1-facil', 'garbanzo-1-remojado', 'habas-2-normal',
      'mani-1-facil', 'maiz-5-primer-duro', 'chochos-2-normal',
    ],
  },
  {
    id: 'miercoles',
    nombre: 'Miércoles', titulo: 'Los primos al desgrane',
    paradas: [
      'bacalao-1-facil', 'arveja-2-normal', 'maiz-6-duro',
      'zapallo-1-facil', 'sambo-1-tierno', 'melloco-2-normal',
      'maiz-7-primer-danado', 'col-2-fino', 'frejol-2-normal',
    ],
  },
  {
    id: 'jueves',
    nombre: 'Jueves por la mañana', titulo: 'La casa llena',
    paradas: [
      'quinua-2-normal', 'maiz-8-danado-duro', 'arroz-1-tres-aguas',
      'mani-2-rapido', 'escoger-2-normal', 'maiz-9-picada',
      'bacalao-2-normal', 'zapallo-2-normal', 'arveja-3-dificil',
    ],
  },
  {
    id: 'noche',
    nombre: 'Jueves por la noche', titulo: 'La tonga',
    paradas: [
      'maiz-10-plaga', 'escoger-3-dificil', 'maiz-11-seco',
      'zapallo-3-rapido', 'maiz-12-seco-duro', 'maiz-13-tonga',
      'maiz-14-morocho', 'maiz-15-ultima',
    ],
  },
  /* EL VIERNES SE JUEGA. La olla ya hirvió la noche anterior; lo que
     queda es lo de ENCIMA — el queso desmigado, el huevo en rodajas,
     el maduro frito— y por eso esta página se abre con la fanesca
     servida (`sirve: true` es el candado que mira la olla, no la
     parada anterior). Después de armar el plato, El Apuro: servir a
     una casa que no deja de llenarse. */
  {
    id: 'viernes', sirve: true,
    nombre: 'Viernes Santo', titulo: 'Se sirve',
    paradas: ['queso-1-fresco', 'huevo-1-duro', 'guarnicion-1-completa'],
  },
];

/* el día de una parada, por id — para el mapa y para saber cuándo
   se cierra un capítulo */
export const DIA_DE = {};
DIAS.forEach((d, i) => d.paradas.forEach(id => { DIA_DE[id] = { dia: d.id, index: i }; }));

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

  /* LOS LOGROS. Se miran al cerrar la partida y sólo se cantan la
     primera vez: un logro que sale en cada partida deja de ser un
     logro a la segunda y se vuelve ruido. Están puestos sobre las
     cosas que el modo quiere ENSEÑAR a hacer —encadenar sin
     desastres, aguantar hasta las tandas bravas, tocar toda la
     despensa— y no sobre el número gordo, que ya es el marcador. */
  /* `meta` es la condición dicha ANTES de cumplirla: es lo que se
     enseña en gris en la escalera de logros. `texto` es lo que se
     dice al conseguirlo. Son frases distintas porque miran en
     direcciones distintas. */
  logros: [
    { id: 'primera',   pide: r => r.raciones >= 1,  titulo: 'Primera ración',        meta: 'Sirve una ración',                          texto: 'Ya sabes de qué va el apuro.' },
    { id: 'diez',      pide: r => r.raciones >= 10, titulo: 'Diez raciones',         meta: 'Sirve diez en una partida',                 texto: 'Eso ya es media olla.' },
    { id: 'veinte',    pide: r => r.raciones >= 20, titulo: 'Veinte raciones',       meta: 'Sirve veinte en una partida',               texto: 'La cocina entera contigo.' },
    { id: 'limpia',    pide: r => r.raciones >= 6 && r.castigos === 0, titulo: 'Sin un solo bicho', meta: 'Seis raciones sin ningún desastre', texto: 'Seis raciones y ni uno se te fue a la olla.' },
    { id: 'cadena8',   pide: r => r.mejorCadena >= 8, titulo: 'Ocho seguidas',       meta: 'Encadena ocho sin fallar',                  texto: 'Encadenar es el truco entero del modo.' },
    { id: 'tanda4',    pide: r => r.tandas >= 4,     titulo: 'Cuarta tanda',         meta: 'Aguanta hasta la tanda 4',                  texto: 'Aguantaste cuando el reloj ya casi no devuelve nada.' },
    /* por raciones SERVIDAS, no repartidas: que te haya tocado el
       zapallo y se te haya quemado no es haberlo cocinado */
    { id: 'docena',    pide: r => (r.servidos || r.ingredientes).length >= 12, titulo: 'Los doce', meta: 'Sirve los doce ingredientes en una partida', texto: 'Serviste la despensa completa en una sola partida.' },
  ],

  /* QUÉ ENTRA Y CUÁNTO. `porcion` es qué parte del nivel completo
     cuenta como una ración: el choclo entero son ciento veintiséis
     granos y eso es un minuto largo — demasiado para una vuelta de
     un modo que dura dos. `ajustes` recorta lo que en el apuro no
     tiene sentido: nadie deshoja diez hojas cuando va con prisa, el
     choclo ya viene pelado de la feria. */
  /* Las porciones se calibraron midiendo lo que tarda cada ración de
     verdad: el bono es plano (9 s), así que las raciones tienen que
     costar parecido — antes la quinua valía una vuelta de dedo y el
     bacalao trece toques por presa. Y el choclo entra YA PELADO
     (hojas: 0): cobraba tres gestos de deshojado antes de dejar
     puntuar, con la barra clavada en cero. */
  raciones: [
    { base: 'maiz',    porcion: 0.22, ajustes: { hojas: 0 } },
    { base: 'arveja',  porcion: 0.70 },
    { base: 'habas',   porcion: 0.70 },
    { base: 'chochos', porcion: 0.70 },
    { base: 'frejol',  porcion: 0.70 },
    { base: 'melloco', porcion: 0.60 },
    { base: 'col',     porcion: 0.30 },
    /* sin gorgojo: en escoger el bicho TRABA la fase de barrer —no se
       puede puntuar hasta sacarlo— y camina solo a la batea en ~18 s.
       Una ración que te cobra 30 s hagas lo que hagas no es brava,
       es una tómbola. */
    { base: 'escoger', porcion: 0.50, ajustes: { gusanos: 0 } },
    { base: 'quinua',  porcion: 0.50 },
    { base: 'mani',    porcion: 0.35 },
    { base: 'bacalao', porcion: 0.30 },
    { base: 'zapallo', porcion: 0.25 },
    /* los seis que llegaron después, medidos con la misma vara: que
       una ración cueste alrededor de diez segundos de manos */
    { base: 'garbanzo',   porcion: 0.60 },
    { base: 'sambo',      porcion: 0.50 },
    { base: 'arroz',      porcion: 0.34 },
    { base: 'queso',      porcion: 0.45 },
    { base: 'huevo',      porcion: 0.34 },
    /* una sola tajada: freír tiene reloj propio y dos raciones de
       sartén seguidas ya son media partida */
    { base: 'guarnicion', porcion: 0.35, ajustes: { presas: 1 } },
  ],
};

/* ============================================================
   EL APURO SIN FIN — la dificultad después de la escalera.

   Las tandas suben por la escalera de variantes de la campaña, pero
   diez de los doce ingredientes solo tienen dos peldaños: de la
   tanda 3 en adelante subir de tanda ya solo bajaba el bono, y un
   modo sin fin cuya dificultad se aplana a los dos minutos no es
   sin fin, es corto con propina.

   Así que pasada la escalera la config SIGUE SUBIENDO, parámetro a
   parámetro. Cada entrada dice qué se le aprieta a ese ingrediente
   por tanda extra y hasta dónde — y solo toca parámetros que su
   nivel LEE de verdad (los mismos que usan sus variantes: subir un
   número que nadie mira sería dificultad de mentira). Los topes
   existen porque cada parámetro tiene un punto donde deja de ser
   más difícil y pasa a ser injusto o imposible: tres gusanos por
   mazorca todavía se juegan, seis son una lotería.

   Lo que NO se toca aquí: las cantidades. La cuota de la ración
   está congelada en la de la tanda 1 (modo-apuro), así que subir
   `cantidad` no encarece la ración — solo alargaría el nivel por
   detrás de la cuota sin que el jugador lo sienta. La dificultad
   honesta del sin fin es resistencia y bichos, no volumen. */
const SIN_FIN = {
  maiz:    { podridos: { por: 1, tope: 8 }, gusanos: { por: 0.5, tope: 4 } },
  arveja:  { hilo_friccion: { por: 0.05, tope: 0.9 }, gusanos: { por: 1, tope: 5 } },
  habas:   { resistencia: { por: 0.5, tope: 2 }, gusanos: { por: 1, tope: 5 } },
  chochos: { velocidad_salto: { por: 0.1, tope: 0.9 }, gusanos: { por: 1, tope: 5 } },
  frejol:  { presion_requerida: { por: 0.05, tope: 0.8 }, gusanos: { por: 1, tope: 5 } },
  melloco: { resistencia: { por: 0.5, tope: 2 }, gusanos: { por: 1, tope: 5 } },
  col:     { resistencia: { por: 0.5, tope: 2 }, gusanos: { por: 1, tope: 4 } },
  /* el gorgojo va apagado por `ajustes` y eso manda: aquí solo se
     ensucia más el costal */
  escoger: { piedras_pct: { por: 0.03, tope: 0.25 }, defectos_pct: { por: 0.02, tope: 0.2 } },
  quinua:  { saponina_nivel: { por: 0.1, tope: 1 }, gusanos: { por: 0.5, tope: 3 } },
  mani:    { velocidad_minima: { por: 0.08, tope: 0.7 }, resistencia: { por: 0.5, tope: 2 } },
  bacalao: { sal_nivel: { por: 0.1, tope: 1 }, moscas_frecuencia: { por: 0.1, tope: 0.9 } },
  zapallo: { resistencia: { por: 0.5, tope: 2 }, gusanos: { por: 0.5, tope: 3 } },
  garbanzo:   { resistencia: { por: 0.5, tope: 3 }, gusanos: { por: 1, tope: 5 } },
  sambo:      { resistencia: { por: 0.5, tope: 3 }, gusanos: { por: 0.5, tope: 3 } },
  arroz:      { gusanos: { por: 0.5, tope: 3 } },
  queso:      { moscas_frecuencia: { por: 0.1, tope: 0.9 } },
  huevo:      { golpes: { por: 0.5, tope: 7 } },
  guarnicion: { resistencia: { por: 0.5, tope: 2 } },
};

/* La config de una ración según la tanda. Dentro de la escalera de
   variantes, el peldaño que toca; más allá, el último peldaño más el
   apriete de SIN_FIN por cada tanda extra. Los valores que en la
   escalera son enteros (gusanos, podridos) se redondean hacia abajo:
   medio gusano no existe, y así el apriete entra cada dos tandas en
   vez de a saltos raros. */
export function configApuro(base, tanda) {
  const escalera = variantesDe(base);
  if (!escalera.length) return {};
  const i = Math.min(tanda - 1, escalera.length - 1);
  const cfg = { ...escalera[i].config };
  const extra = tanda - escalera.length;
  if (extra <= 0) return cfg;
  const aprietes = SIN_FIN[base] || {};
  for (const [param, { por, tope }] of Object.entries(aprietes)) {
    const actual = cfg[param];
    /* los gusanos por mazorca pueden venir en lista: se aprieta el
       total repartido, que es lo que el nivel siente */
    const valorBase = Array.isArray(actual)
      ? Math.max(...actual)
      : (typeof actual === 'number' ? actual : 0);
    let v = Math.min(tope, valorBase + por * extra);
    if (Number.isInteger(valorBase) && Number.isInteger(tope)) v = Math.floor(v);
    cfg[param] = v;
  }
  return cfg;
}
