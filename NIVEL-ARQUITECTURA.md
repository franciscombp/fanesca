# Arquitectura Métrica de Niveles — La Fanesca

## Principio

**Cero lógica en la config, cero números en el código.**

Cada nivel es un **motor genérico** que lee **parámetros puros** de `niveles-config.js`. 

---

## Estructura

### 1. CONFIG (niveles-config.js)

```js
'maiz-2-tierno': {
  nombre: 'El choclo tierno',
  dificultad: 2,
  bloque: 'DESGRANAR',
  orden: 2,
  tiempoBase: 120,
  config: {
    choclos: 2,
    hojas: 10,
    grano_total: 126,
    madurez: ['tierno', 'tierno'],
    podridos: 0,
    gusanos: [1, 1],
  }
}
```

**PURO DATA:**
- `dificultad`: escala global (1-5)
- `tiempoBase`: segundos para 3 cucharas
- `config.*`: parámetros específicos del nivel

---

### 2. MODULO (nivel-maiz.js)

El módulo **nunca hardcodea números**. Lee todo de `config`:

```js
import { MAIZ } from './niveles-config.js';

export default {
  id: 'maiz',
  
  construir(ctx, nivelConfig) {
    // nivelConfig = MAIZ['maiz-2-tierno'].config
    
    const CHOCLOS = nivelConfig.choclos;          // 2
    const HOJAS = nivelConfig.hojas;              // 10
    const TOTAL = nivelConfig.grano_total;        // 126
    const MADUREZ = nivelConfig.madurez;          // ['tierno', 'tierno']
    const GUSANOS_POR = nivelConfig.gusanos;      // [1, 1]
    const PODRIDOS = nivelConfig.podridos;        // 0
    
    // TODO EL CÓDIGO USES LOS PARÁMETROS
    // No hardcodea: CHOCLOS = 2, HOJAS = 10, etc.
  }
}
```

---

### 3. MOTOR (main.js → jugar())

Cuando el usuario elige un nivel:

```js
async function jugar(nivelId) {
  const cfg = nivelPor(nivelId);  // obtiene config completa
  const mod = await cfg.modulo(); // carga nivel-maiz.js, etc.
  
  // Pasa los parámetros al nivel
  Motor.cargar(mod, api, cfg.config);
  
  // El nivel lee cfg.config en su construir()
}
```

---

## Mapa de Niveles (30 niveles)

```
BLOQUE 1: DESGRANAR (5 niveles)
├─ maiz-1-introduccion   (orden 1,  dif 1) — 1 choclo, 5 hojas, tierno
├─ maiz-2-tierno         (orden 2,  dif 2) — 2 choclos tiernos
├─ maiz-3-duro           (orden 3,  dif 3) — 2 choclos duros + 2 podridos
├─ maiz-4-mix            (orden 4,  dif 4) — mix + 4 podridos + más gusanos
└─ maiz-5-podrido        (orden 5,  dif 5) — muchos podridos, tiempo apretado

BLOQUE 2: DESVAINAR (5 niveles)
├─ arveja-1-facil        (orden 6,  dif 2) — intro al hilo
├─ arveja-2-normal       (orden 7,  dif 3) — hilo normal
├─ arveja-3-dificil      (orden 8,  dif 4) — hilo pegajoso
├─ habas-1-facil         (orden 9,  dif 2) — vaina suave
└─ habas-2-normal        (orden 10, dif 3) — vaina apretada

BLOQUE 3: RASPAR (2 niveles)
├─ melloco-1-facil       (orden 11, dif 2)
└─ melloco-2-normal      (orden 12, dif 3)

BLOQUE 4: LAVAR (2 niveles)
├─ quinua-1-facil        (orden 13, dif 2)
└─ quinua-2-normal       (orden 14, dif 3)

BLOQUE 5: ENROLLAR (2 niveles)
├─ col-1-facil           (orden 15, dif 2)
└─ col-2-fino            (orden 16, dif 3)

BLOQUE 6: MAJAR (2 niveles)
├─ mani-1-facil          (orden 17, dif 2)
└─ mani-2-rapido         (orden 18, dif 3)

BLOQUE 7: ESCOGER (3 niveles)
├─ escoger-1-facil       (orden 19, dif 2)
├─ escoger-2-normal      (orden 20, dif 3)
└─ escoger-3-dificil     (orden 21, dif 4)

BLOQUE 8: PELAR (2 niveles)
├─ chochos-1-facil       (orden 22, dif 2)
└─ chochos-2-normal      (orden 23, dif 3)

BLOQUE 9: REVENTAR (2 niveles)
├─ frejol-1-facil        (orden 24, dif 2)
└─ frejol-2-normal       (orden 25, dif 3)

BLOQUE 10: DESALAR (2 niveles)
├─ bacalao-1-facil       (orden 26, dif 2)
└─ bacalao-2-normal      (orden 27, dif 3)

BLOQUE 11: MULTIGESTOS (3 niveles)
├─ zapallo-1-facil       (orden 28, dif 2)
├─ zapallo-2-normal      (orden 29, dif 3)
└─ zapallo-3-rapido      (orden 30, dif 4)
```

---

## Cómo Funciona

### Ejemplo: Nivel de Maíz Duro

**Config** (niveles-config.js):
```js
'maiz-3-duro': {
  nombre: 'El choclo duro',
  dificultad: 3,
  tiempoBase: 115,  // 115s = 3 cucharas
  config: {
    choclos: 2,
    hojas: 10,
    grano_total: 126,
    madurez: ['duro', 'duro'],
    podridos: 2,    // GRANOS PODRIDOS
    gusanos: [1, 1],
  }
}
```

**Nivel** (nivel-maiz.js):
```js
construir(ctx, config) {
  // Lee parámetros
  const MADUREZ = MADUREZ[config.madurez[0]];  // 'duro'
  const PODRIDOS = config.podridos;            // 2
  
  // Genera granos: TOTAL - PODRIDOS
  const granosNormales = config.grano_total - PODRIDOS;  // 124
  
  // Distribuye podridos aleatoriamente en la rejilla
  const posicionesPodridas = seleccionarAzar(PODRIDOS);
  
  for (let a = 0; a < A; a++) {
    for (let p = 0; p < P; p++) {
      const esPodrido = posicionesPodridas.includes([a, p]);
      
      if (esPodrido) {
        // Grano podrido: color café, frágil, toca mal → arruina olla
        granos[a][p] = nuevoGranoPodrido(a, p);
      } else {
        // Grano normal: color normal, resistencia según MADUREZ
        granos[a][p] = nuevoGrano(a, p, MADUREZ);
      }
    }
  }
}
```

---

## Características Métricas

### 1. Progresión de Dificultad

```
Orden  Nivel           Bloque       Dif  Hojas  Granos  Podridos  Gusanos  TiempoBase
1      maiz-1          DESGRANAR    1    5      63      0         0        140s
2      maiz-2          DESGRANAR    2    10     126     0         [1,1]    120s
3      maiz-3          DESGRANAR    3    10     126     2         [1,1]    115s
4      maiz-4          DESGRANAR    4    10     126     4         [1,2]    100s
5      maiz-5          DESGRANAR    5    10     126     6         [2,2]    90s
```

Cada nivel: +1 dificultad = -10/15% tiempo, +parámetro de resistencia

### 2. Granos Podridos (Nueva Mecánica)

```js
// En config:
podridos: 4  // cantidad de granos que salen podridos

// En modelo (choclo.js):
registrar('grano-podrido', (THREE, opts) => {
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    geo,
    brillante(THREE, '#6b4423')  // CAFÉ DAÑADO
  );
  g.userData = { tipo: 'grano-podrido', fragilidad: 1.0 };
  return g;
});

// En nivel-maiz.js: lógica delicada
function intentarGranoPodrido(granoPodrido) {
  if (velSuave > FUERZA_GRANO_PODRIDO) {
    // ¡Lo rompiste! Se va a la olla
    api.arruinar(ARRUINADO.granoPodrido());
  } else {
    // Toque delicado: sale limpio
    sacarGrano(granoPodrido.a, granoPodrido.p);
  }
}
```

### 3. Variantes de Tiempo

```
Dificultad  Factor   Tiempo para 3 cucharas
1           1.0x     tiempoBase
2           0.85x    tiempoBase * 0.85
3           0.70x    tiempoBase * 0.70
4           0.55x    tiempoBase * 0.55
5           0.45x    tiempoBase * 0.45
```

---

## Cambiar Parámetros (Ejemplo)

### Quiero que Choclo 2 sea más difícil

**ANTES** (necesitaría editar nivel-maiz.js, constants, todo):
```js
// nivel-maiz.js
const CHOCLOS = 2;
const HOJAS = 10;
const MADUREZ = ['tierno', 'tierno'];
const GUSANOS_POR = [1, 1];
// ... cambiar líneas en 5 sitios...
```

**AHORA** (solo 1 línea en config):
```js
// niveles-config.js
'maiz-2-tierno': {
  config: {
    choclos: 2,
    hojas: 12,              // ← +2 hojas
    grano_total: 126,
    madurez: ['tierno', 'duro'],  // ← cambiar segundo a duro
    podridos: 1,            // ← +1 podrido
    gusanos: [1, 2],        // ← +1 gusano
  }
}
```

---

## Estructura de Carpetas

```
fanesca/
├─ niveles-config.js         ← TODOS LOS PARÁMETROS
├─ nivel-maiz.js             ← Lee config, motor genérico
├─ nivel-arveja.js           ← Lee config, motor genérico
├─ nivel-*.js                ← Cada uno motor genérico
├─ main.js                   ← jugar(nivelId) → pasa config
└─ modelos/
   ├─ choclo.js              ← Grano normal + grano podrido
   ├─ arveja.js
   └─ ...
```

---

## Ventajas

✅ **Sin duplicación**: Cambias dificultad en 1 lugar  
✅ **Transparencia**: Ves la curva completa de dificultad  
✅ **Expansión fácil**: Agregar nivel = agregar 1 objeto  
✅ **Testeable**: Los parámetros son datos (no código)  
✅ **Balanceable**: Tweak numérico en 10 segundos  
✅ **Legible**: Tabla clara de progresión  

---

## Próximos Pasos

1. **Implementar lectura de config** en `nivel-maiz.js`
2. **Crear tipo "grano-podrido"** en `modelos/choclo.js`
3. **Expandir otros niveles** (arveja, habas, etc.) con params
4. **Integrar en main.js** → pasar config al construir nivel
5. **Desbloqueo progresivo** (opcional): `devMode = true` → todo abierto
