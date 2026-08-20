# Arquitectura métrica de niveles — La Fanesca

## Principio

**Cero lógica en la config, cero números en el código.**

Un nivel es un **motor genérico** que lee **parámetros puros** de
`niveles-config.js`. Cambiar la dificultad es editar datos, no código.

---

## Las tres piezas

### 1. Los ingredientes — `niveles.js`

Los doce: su módulo, su icono, su gesto, su bicho, su nota. Esto no
cambia con la dificultad. Es *qué* se cocina.

### 2. Las variantes — `niveles-config.js`

Puro dato. Cada entrada es un nivel jugable con su dificultad y sus
parámetros. Es *qué tan brava* está esa parada.

```js
'maiz-3-duro': {
  nombre: 'El choclo duro',
  dificultad: 3, bloque: 'DESGRANAR', orden: 3,
  tiempoBase: 115,          // segundos para 3 cucharas
  config: {
    choclos: 2,
    hojas: 10,
    madurez: ['duro', 'duro'],
    podridos: 2,            // POR MAZORCA
    gusanos: [1, 1],        // POR MAZORCA
  }
}
```

El **id lleva el ingrediente en el prefijo**: `maiz-3-duro` → `maiz`.
De ahí sale qué `nivel-*.js` se carga, sin una segunda tabla que un
día deja de coincidir con la primera.

Lo que **no** va en la config: cuántos granos trae un choclo. Eso son
`A × P` de `modelos/choclo.js` — la forma de la mazorca, no una
perilla. Un parámetro que se puede escribir pero no hace nada es peor
que no tenerlo.

### 3. La ruta — `main.js`

La mesa se dibuja de la mezcla de los dos:

```js
const RUTA = construirRuta();   // ingredientes × variantes
```

Un ingrediente se abre en varios nodos **solo si su módulo lee la
config**. Eso lo dice `CON_VARIANTES`:

```js
const CON_VARIANTES = new Set(['maiz']);
```

Hoy es el choclo y nadie más. Pintar cinco nodos de arveja que juegan
exactamente igual sería prometer una campaña que no existe. Cuando un
`nivel-*.js` aprenda a leer sus parámetros, se agrega su id ahí y sus
variantes aparecen solas.

---

## Cómo llega la config al nivel

```
main.jugar(id)
  └─ obtenerConfigNivel(id)      → el nodo de RUTA ya trae su config
  └─ Motor.cargar(mod, api, config)
       └─ nivel.construir(ctx, config)
```

Y el módulo lee, sin hardcodear:

```js
construir(ctx, levelConfig = {}) {
  CHOCLOS      = levelConfig.choclos ?? 2;
  GUSANOS_POR  = porChoclo(levelConfig.gusanos,  [1, 2]);
  PODRIDOS_POR = porChoclo(levelConfig.podridos, [0, 0]);
  HOJAS_N      = levelConfig.hojas ?? HOJAS;
  orden        = (levelConfig.madurez ?? ['tierno', 'duro']).slice();
  TOTAL        = CHOCLOS * A * P;
}
```

`porChoclo()` acepta un número —el mismo para todas las mazorcas— o
una lista con el valor de cada una.

---

## El choclo, en cinco

| Orden | Id | Dif | Choclos | Hojas | Madurez | Podridos/mazorca | Gusanos | tiempoBase |
|---|---|---|---|---|---|---|---|---|
| 1 | `maiz-1-introduccion` | 🌶️ | 1 | 5 | tierno | 0 | 0 | 140s |
| 2 | `maiz-2-tierno` | 🌶️🌶️ | 2 | 10 | tierno, tierno | 0 | 1, 1 | 120s |
| 3 | `maiz-3-duro` | 🌶️🌶️🌶️ | 2 | 10 | duro, duro | 2 | 1, 1 | 115s |
| 4 | `maiz-4-mix` | 🌶️🌶️🌶️🌶️ | 2 | 10 | tierno, duro | 4 | 1, 2 | 100s |
| 5 | `maiz-5-podrido` | 🌶️🌶️🌶️🌶️🌶️ | 2 | 10 | duro, duro | 6 | 2, 2 | 90s |

De `tiempoBase` salen los tres cortes de cuchara: `[t, t×1.5, t×2.2]`.

---

## Los granos dañados

Cafés, podridos, quietos. **No son una tarea: son un estorbo.**

La regla cabe en una línea: **no se sacan, se dejan**. Traban la
hilera y hay que rodearlos, y al terminar el choclo se van **montados
en la tusa** a la composta. Es como se hace de verdad — nadie despica
una mazorca grano podrido por grano podrido, se bota el olote.

```js
function botarTusa() {
  for (...) if (g.userData.tipo === 'grano-podrido') { tusa.attach(g); fila[p] = null; }
  api.volarA(tusa, api.COMPOSTA..., { dur: 0.55, alto: 0.6 });
}
```

Dos gestos, dos tratos:

| gesto | qué pasa |
|---|---|
| **rozarlo barriendo** una hilera | la hilera se para ahí. Sin castigo: barriendo es imposible no tocarlos, y perder por un roce que el gesto no puede evitar es perder por algo que no hiciste |
| **picotearlo** a propósito (toque suelto) | lo revienta dentro de la olla. La primera se perdona |

Sólo `alTocar` pasa `deliberado = true`; el barrido y la cascada
llaman a `topeDePodrido()`, que solo empuja y avisa.

Tres detalles que sostienen la regla:

- **Nunca en las puntas.** Ahí el grano sale con solo rozarlo.
- **Nunca pegados entre sí.** Un grano sale si tiene un vecino
  ausente, y los dañados no se van nunca: cuatro en cruz encerrarían
  un grano bueno que ya no habría cómo sacar, y el choclo quedaría
  imposible de terminar.
- **`TOTAL` los descuenta.** Contarlos dejaba la barra clavada bajo el
  100% para siempre: se leería como un nivel que no se puede cerrar.

El modelo es `grano-podrido` en `modelos/choclo.js`: la misma
geometría del grano, en café `#6b4423`, y late despacio para
distinguirse de un vistazo entre ciento veinte granos quietos.

> **Historia:** la primera versión pedía sacarlos con el dedo suave,
> con un umbral de velocidad. Además de ser el gesto equivocado, no
> funcionaba: `sacarGrano()` solo acepta `tipo === 'grano'`, así que
> el camino del "toque delicado" era inalcanzable y los dañados no
> salían por mucho cuidado que se les pusiera.

---

## Progreso

- **Un nodo** se abre cuando el anterior de la ruta ya fue a la olla.
  En `devMode`, todo abierto.
- **La olla** se abre con los **doce ingredientes**, no con las
  variantes: `ingredienteListo(base)` es cierto en cuanto una
  cualquiera de sus variantes está hecha. Las de más arriba son para
  bajarse el tiempo.
- **Los récords viejos migran**: `migrar()` mueve `mejores.maiz` a
  `maiz-1-introduccion`. Sin eso, a quien ya lo cocinó se le borraba
  el récord y se le cerraba el camino entero detrás.

---

## Cambiar la dificultad

Una línea:

```js
'maiz-2-tierno': {
  config: {
    hojas: 12,                     // ← dos hojas más
    madurez: ['tierno', 'duro'],   // ← el segundo, duro
    podridos: 1,                   // ← un dañado por mazorca
    gusanos: [1, 2],               // ← un bicho más en el segundo
  }
}
```

---

## Lo que falta

Los otros once ingredientes ya tienen sus variantes escritas en
`niveles-config.js` (30 niveles en total), pero **sus módulos todavía
no leen los parámetros**, así que no están en `CON_VARIANTES` y se
dibujan como un solo nodo. Para abrir uno:

1. Que su `construir(ctx, config)` lea lo que necesita.
2. Agregar su id a `CON_VARIANTES` en `main.js`.
3. Comprobar que `migrar()` le pase el récord viejo.

Ese orden importa: el paso 2 sin el 1 pinta nodos que juegan igual.


---

## Llevar algo en la mano (`puntoAnteCamara`)

Un detalle del motor que se paga caro si se ignora.

`api.puntoEnPlano(y)` corta el rayo del dedo contra un **plano
horizontal**. Sirve mientras lo que se carga va sobre el mesón: ahí el
dedo apunta hacia abajo y el rayo cruza el plano cerca.

Con la mazorca **de pie** —a 1.78 sobre la mesa— el dedo apunta ALTO, y
un rayo que apunta alto tarda muchísimo en bajar a la altura de la
mesa. El gusanito salía pegado al dedo *en píxeles* pero **siete
unidades detrás de la escena**: diminuto y al fondo. En pantalla eso no
se lee como "lo tengo en la mano", se lee como que se escapó.

```js
const DIST_MANO = 3.1;
function llevarALaMano(w) {
  const suelo = api.puntoEnPlano(api.MESA_Y);      // dónde CAE al soltarlo
  if (suelo) w.suelo = { x: suelo.x, z: suelo.z };
  const enMano = api.puntoAnteCamara(DIST_MANO);   // dónde se DIBUJA
  if (enMano) w.obj.position.copy(enMano);
  return suelo;
}
```

Medido: distancia a la cámara **constante en 3.10** durante todo el
arrastre (mismo tamaño aparente) y **0 px** de desfase con el dedo.

Cualquier nivel que cargue algo por encima del mesón necesita
`puntoAnteCamara`. Los que trabajan sobre la tabla pueden seguir con
`puntoEnPlano`.
