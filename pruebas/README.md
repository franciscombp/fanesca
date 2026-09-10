# Las pruebas

Un juego que se toca con el dedo no se prueba llamando funciones: se
prueba **tocándolo**. Todas estas abren el juego en un Chromium del
tamaño de un teléfono, mandan toques y arrastres de verdad por CDP
(`Input.dispatchTouchEvent`) y miran lo que pasa en pantalla.

Eso no es capricho. El error más caro que ha tenido este juego —los
botones que se pintaban pulsados y no hacían nada— era **invisible**
para cualquier prueba que llamara `element.click()`: el navegador no
dispara `click` cuando el dedo se corre más de diez píxeles, y una
prueba que hace clic sintético nunca se entera. `dedo.mjs` existe por
eso y lo mide con la deriva creciente.

## Correrlas

```sh
./pruebas/correr.sh              # la batería entera
./pruebas/correr.sh humo olla    # solo esas
```

Hace falta `node`, `python3` (para servir los archivos) y Playwright,
que se instala **dentro de esta carpeta**:

```sh
cd pruebas && npm install && npx playwright install chromium
```

Va aquí y no en la raíz a propósito: el juego no tiene build ni
dependencias —se publica tal cual— y meterle un `package.json` arriba
sería empezar a tenerlas.

`correr.sh` levanta el servidor, pasa las pruebas y lo apaga. Sale con
1 si alguna falla. Dos variables: `PUERTO` (8899) y `CHROME` (si
quieres apuntar a un Chromium propio en vez del de Playwright).

## La batería

Dicen ✓ o ✗ y terminan con `TODO VERDE` o `HAY FALLOS`.

| | qué protege |
|---|---|
| `humo` | el camino principal entero: portada → recetario → parada → hoja de listo → siguiente → cuaderno → El Apuro. Si esta pasa, el juego se puede publicar. |
| `olla` | la partida completa del modo La Olla: los veinte pasos encadenados, los cuatro actos, el resumen y el récord. |
| `feria` | el puesto del choclo: cuántos hay, que quepan en pantalla, abrir la hoja, gastar las aperturas y llenar el canasto. |
| `caldero` | echar los dieciséis en orden, que equivocarse rebote y explique, y que la olla armada pase al plato. |
| `porcion` | que el modo AVISE cuando da un mesón por hecho antes de terminarlo. Siete de los veinte se cortan —la olla pide una parte— y sin decirlo parecía que te quitaba el mesón a media pelada. |
| `arveja` | que los granos sigan el arco y el afilado de la vaina, y estén metidos en el vientre. Un error que no se ve de frente y salta en cuanto la vaina está girada. |
| `didactica` | que lo que se enseña no interrumpa: la hoja de listo sin ensayo, el cuaderno con el texto entero, la pantalla de error contando algo. |
| `dedo` | el toque con deriva. Mide con cuántos píxeles de desvío deja de llegar el `click` y comprueba que el juego responde igual. |
| `ficha-hecha` | volver a una parada ya jugada, y entrar y salir a lo bruto sin dejar la pantalla de juego sin mesón. |
| `carrusel` | deslizar entre días con el dedo, sin abrir mesones sin querer. |
| `huevo` | cascar y pelar: el mesón que más se quejaba de que no se entendía. |
| `devmode` | el ritual de los cinco toques en el número de versión. |
| `nota` | que la nota de versión se pueda cerrar en cuatro tamaños de teléfono. El botón se salía de la pantalla. |
| `actualiza` | la actualización de verdad, con service worker: instalar, publicar una versión nueva, ver el botón y estrenarla. |

## Los diagnósticos

No afirman nada: imprimen números para mirar. Se corren a mano.

| | qué mide |
|---|---|
| `ritmo` | mallas, triángulos y cuadros por segundo de un mesón, **al lado de uno viejo y probado**. Un número solo no dice nada: 4 fps asusta hasta que ves que el choclo de siempre también da 4 en un Chromium sin GPU. |
| `piezas` | de qué tamaño nace cada pieza del catálogo y qué escala pide para caber en un cuenco. |
| `caldero-mide` | los objetos de la escena ordenados por tamaño real. Encontró piezas que salían diez veces más grandes porque se les escribía la escala encima de la suya. |
| `mesa-geo` | dónde cae cada ficha del recetario en pantalla, para entender por qué un toque no llega. |

## Escribir una nueva

Tres cosas que costaron caras y conviene no volver a aprender:

- **Toca donde toca un dedo.** `element.click()` se salta justo la
  clase de error que más ha dolido aquí.
- **Monta los mesones por donde se montan de verdad** (`jugar()` o
  arrancando un modo). Llamar a `Motor.cargar` a mano deja
  `modActual` en null, y entonces el primer toque dispara la red de
  seguridad de `main.js` que devuelve a la mesa: lo que creías probar
  ya era otra cosa.
- **Pregúntale al juego, no al HUD.** Al terminar un mesón el modo ya
  cambió al siguiente y la barra volvió a cero; leer la barra te dice
  que no entró cuando sí entró. Los niveles publican su estado en
  `window.__<nombre>` para eso.

Un fallo suele ser de la prueba antes que del juego. Confírmalo mirando
la captura antes de tocar código.
