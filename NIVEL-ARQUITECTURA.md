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

## La temporada del choclo y el maíz

Quince paradas que recorren el maíz como lo recorre el año: del
**choclo tierno** de la mata, al **duro**, al **maíz seco** de la tonga
colgada.

### Los tiempos no están escritos a ojo: se derivaron

Para cada parada se calcula su **carga** en granos equivalentes y de
ahí sale el tiempo: `t = carga / presión objetivo`.

```
carga = Σ_mazorcas (A×P − dañados) × factor(madurez)
      + hojas × mazorcas × 3        (un jalón de hoja ≈ 3 granos)
      + gusanos × 10                (pellizcar y llevar a la composta)
      + dañados × 5                 (rompe la fila: hay que rodearla)

factor: tierno 1.00 · duro 1.18 · seco 1.42   ← de su cascada y resistencia
```

Al revés —escribiendo el tiempo y dejando que la presión saliera de
rebote— la curva subía y bajaba sin patrón. Medida, tenía un salto del
**130%** en la parada 3 y un **cráter** en la 11 que la dejaba más
fácil que la 2.

### La curva es un diente de sierra, no una rampa

| # | corto | dif | maz | madurez | dañ | gus | t | presión | dura |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Primeros granos | 🌶️ | 1 | tierno | 0 | 0 | 140 | 1.01 | 1:04 |
| 2 | La cascada | 🌶️ | 1 | tierno | 0 | 0 | 120 | 1.25 | 1:08 |
| 3 | El gusanito | 🌶️🌶️ | 1 | tierno | 0 | 1 | 105 | 1.52 | 1:13 |
| 4 | Dos choclos | 🌶️🌶️ | 2 | tierno·2 | 0 | 0 | 130 | 2.22 | 2:11 |
| 5 | El primer duro | 🌶️🌶️🌶️ | 2 | tierno, duro | 0 | 1,1 | 140 | 2.53 | 2:41 |
| 6 | Los dos duros | 🌶️🌶️🌶️ | 2 | duro·2 | 0 | 1,1 | 130 | **2.90** ▲ | 2:52 |
| 7 | Un dañado | 🌶️🌶️🌶️ | 2 | tierno·2 | 1 | 1,1 | 125 | *2.72* ▼ | 2:35 |
| 8 | Dañado y duro | 🌶️🌶️🌶️ | 2 | duro·2 | 2 | 1,1 | 125 | 3.14 | 2:58 |
| 9 | La picada | 🌶️🌶️🌶️🌶️ | 2 | tierno, duro | 4 | 1,2 | 115 | 3.44 | 3:00 |
| 10 | La plaga | 🌶️🌶️🌶️🌶️ | 2 | duro·2 | 5 | 2,2 | 115 | **3.89** ▲ | 3:23 |
| 11 | El maíz seco | 🌶️🌶️🌶️🌶️ | 2 | seco, tierno | 0 | 1,1 | 110 | *3.39* ▼ | 2:50 |
| 12 | Seco y duro | 🌶️🌶️🌶️🌶️ | 2 | seco, duro | 2 | 1,1 | 110 | 3.84 | 3:12 |
| 13 | La tonga | 🌶️🌶️🌶️🌶️🌶️ | 2 | seco·2 | 3 | 1,2 | 110 | 4.27 | 3:33 |
| 14 | El morocho | 🌶️🌶️🌶️🌶️🌶️ | 2 | seco, duro | 6 | 2,2 | 105 | 4.61 | 3:40 |
| 15 | La última | 🌶️🌶️🌶️🌶️🌶️ | 3 | seco, duro, tierno | 2 | 1,1,1 | 110 | **5.01** | 4:11 |

Cada mecánica nueva entra con un **respiro** (▼ 7 el dañado, ▼ 11 el
seco), pero cada valle queda más alto que el anterior y cada pico más
alto que el anterior. Salto máximo entre paradas: **45%**.

Los hitos entran además **solos**: la 7 baja a tierno para que el
dañado sea lo único nuevo, y la 11 quita los dañados para que lo sea
el seco. Un mecanismo nuevo presentado a la vez que un pico de
dificultad no se aprende, se sufre.

### No se alargan para hacerse difíciles

Meter más mazorcas hace los niveles **largos, no difíciles**, y un
nivel largo que además puedes perder por tocar un gusano no es
difícil: es cruel. La primera versión de esta temporada usaba tres
mazorcas dos veces y la final duraba **5:37**.

Por eso doce de las quince van a **dos mazorcas** y la dificultad sale
de la madurez, los dañados, los bichos y el reloj. Las tres mazorcas
aparecen **una** vez, en la última, como lo que son: la gran faena —
y son *lo que queda del costal* (una seca, una dura, una tierna), no
tres secas, que daban casi cinco minutos.

### Las tres madureces

| | resistencia | cascada | factor | qué se siente |
|---|---|---|---|---|
| `tierno` | 2 | 0.038 | 1.00 | cede solo, pero revienta con fuerza |
| `duro` | 5 | 0.08 | 1.18 | no revienta; los trabados pelean |
| `seco` | 7 | 0.14 | 1.42 | se agarra con todo; la fila corre pesada |

El **tierno con el reloj apretado es una trampa**: pasar el dedo
rápido lo revienta en papilla, y limpiarla cuesta más que sacarlo
despacio. Por eso las paradas de más presión (10, 13, 14) van de duro
y seco, que no revientan, y el tierno se queda donde el reloj deja
respirar.

`seco` es el maíz de la tonga, el que se guardó colgado hasta perder
el agua. Su paleta (`choclo_seco`) es mate y blanquecina: ya no
brilla, y por eso se lee duro antes de tocarlo. De regalo, los granos
dañados se distinguen mucho mejor sobre el pálido que sobre el
amarillo del tierno.

### El orden no se escribe

`orden` se deriva del orden de declaración. Antes cada nivel llevaba
su `orden: N` a mano: meter una parada en medio obligaba a renumerar
todo lo de abajo, y el primer olvido dejaba la temporada desordenada
sin que nada fallara.

Lo que sí hay que mantener a mano es `RENOMBRADOS` en `main.js`: el
número del id dice el puesto, así que reordenar la temporada renombra
paradas, y sin esa tabla a quien ya las jugó se le borran los récords.

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

## Progreso — dos candados, y no son el mismo

- **Dentro de la temporada** de un ingrediente se va en fila: el
  choclo duro se abre cuando pasaste el tierno, y así hasta la última
  tonga. Eso es lo que hace que quince paradas se sientan una
  temporada y no un menú.
- **Al cambiar de ingrediente** basta con haber cocinado el anterior
  una vez. Si no, las habas quedarían detrás de las quince paradas del
  maíz y la olla detrás de la campaña entera: quien quisiera ver la
  fanesca tendría que agotar el maíz primero. Terminado el primer
  choclo se abren a la vez el segundo choclo y las primeras habas.
- En `devMode`, todo abierto.
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
