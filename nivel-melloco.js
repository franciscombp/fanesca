/* ============================================================
   FANESCA — nivel-melloco.js
   RASPAR LA BABAZA.

   El melloco viene envuelto en su propia baba, y esa baba no se
   quita apretando: apretando se te dispara. Se quita <b>raspando</b>
   —el pulgar de un lado a otro, con paso firme y sin arrebato— y
   ese es el único gesto de esta cocina que castiga la prisa en el
   acto y no al final.

   Es el reverso exacto del choclo. Ahí, ir rápido es la gracia:
   abres un hueco y la hilera se va sola. Aquí, ir rápido es perder
   el melloco de vista y tener que ir a buscarlo al otro lado de la
   tabla. La mano aprende la diferencia en dos resbalones.

     · arrastrar despacio sobre un melloco → se le va la baba
     · arrastrar de golpe                  → se dispara, y a empezar
     · arrastrar desde el gusanito         → a la composta

   La baba no se cuenta en una barra: se VE. La cáscara brillante se
   va poniendo mate hasta que el melloco queda limpio y se va solo
   a la batea.
   ============================================================ */

import { nuevaPlaga } from './plaga.js';
import { ANCHO_SEGURO } from './motor3d.js';

let THREE, raiz, api;

let CUANTOS = 8;
const HONDO_TABLA = 1.7;
const ANCHO_TABLA = 3.1;
let TABLA_Z = 0;
const ALTO = 0.16;               /* a qué altura descansa un melloco */
/* el dedo es gordo, igual que en las habas: 0.17 era media yema y
   raspar se volvía puntería sobre una papa de tres centímetros */
const RADIO_DEDO = 0.3;
let CON_GUSANO = 2;
/* Los dos de siempre asomaban al 30% y al 65% del avance, y esos dos
   números pasan a ser los extremos del reparto sea cual sea el número
   de bichos: antes del 30% la mano todavía está aprendiendo el raspe y
   un bicho es una trampa, y pasado el 65% el gusanito puede nacer
   cuando el último melloco ya voló a la batea —y para entonces
   `revisarFinal` cerró el nivel sin haberlo cobrado. */
const PRIMER_BICHO = 0.3, ULTIMO_BICHO = 0.65;
/* el mismo tope que le puso modelos/melloco.js a la baba */
const BABA_OPACA = 0.34;

/* Cuánto mundo hay que raspar para dejar uno limpio. La baba apretada
   no se defiende aguantando el paso del dedo —eso premiaría apoyar la
   yema quieta encima, que no es raspar— sino pidiendo más centímetros
   de recorrido. Los tres valores se separan lo justo para que la suave
   no se caiga de un roce y la apretada no acabe siendo un fregado. */
const RASPADO_POR_RESISTENCIA = [0.5, 0.78, 1.15];
let RASPADO = 0.78;
/* Y el filo de la navaja: pasar de aquí y el melloco sale disparado.
   Se mide en mundo POR SEGUNDO, no por cuadro: medirlo por cuadro
   castigaba al teléfono lento (mismo gesto, cuadros más largos, más
   mundo por cuadro) en vez de castigar la mano ansiosa. Y se mide
   sobre una velocidad suavizada, para que un solo evento nervioso
   del navegador no dispare la papa.

   Este filo se queda fuera de la config a propósito. La campaña trae
   una `velocidad_minima` —cuánto hay que correr para que el gesto
   cuente— y aquí correr es justamente lo que se castiga: atarla a este
   número haría que la parada que en los demás ingredientes exige más
   mano fuera en el melloco la más indulgente, y la curva de dificultad
   se daría la vuelta en esta cocina sola. */
const RESBALON = 9.5;              /* unidades de mundo por segundo */
let velSuave = 0, velT = 0;

let mellocosGrupo = null;
let mellocos = [];               /* {obj, babaza, baba, limpio} */
let plaga = null;
let hechos = 0;
let modo = null;
let ultimoPunto = null;
let resbalados = 0;
let pellizcando = false;
let terminado = false;

function nuevoMelloco(x, z, i) {
  const g = api.pieza('melloco', { variante: i });
  g.position.set(x, api.MESA_Y + ALTO, z);
  g.rotation.y = Math.random() * Math.PI;
  g.rotation.z = (Math.random() - 0.5) * 0.3;
  g.userData = { tipo: 'melloco' };
  g.add(api.sombraBlob(0.4, -ALTO + 0.12));
  return { obj: g, babaza: api.parte(g, 'babaza'), cuerpo: api.parte(g, 'cuerpo'), baba: 1, limpio: false, resbalando: 0 };
}

/* que ninguno se escape del mundo jugable: la tabla y un margen */
function encajar(v) {
  /* la tabla es más ancha que lo que se ve: si el melloco resbala
     hasta su filo, se sale de la pantalla y ya no hay cómo rasparlo */
  /* el melloco se juega MÁS CERCA de la cámara que el punto de
     mira, y ahí el cuadro es más angosto que el ancho garantizado:
     por eso el margen es mayor que el de otros niveles */
  const tope = Math.min(ANCHO_TABLA / 2 - 0.16, ANCHO_SEGURO - 0.30);
  v.x = Math.max(-tope, Math.min(tope, v.x));
  v.z = Math.max(TABLA_Z - HONDO_TABLA / 2 + 0.14, Math.min(TABLA_Z + HONDO_TABLA / 2 - 0.14, v.z));
  return v;
}

function raspar(rec, cuanto) {
  if (rec.limpio) return;
  rec.baba = Math.max(0, rec.baba - cuanto / RASPADO);
  /* la baba se ve, no se cuenta: la cáscara pasa de brillante a mate */
  rec.babaza.material.opacity = BABA_OPACA * rec.baba;
  rec.babaza.scale.setScalar(1 - 0.1 * (1 - rec.baba));
  if (rec.baba > 0) {
    if (Math.random() < 0.25) api.chispas(rec.obj.position.clone().setY(api.MESA_Y + ALTO + 0.1), '#eef6d8', 2, 0.5);
    return;
  }

  rec.limpio = true;
  rec.obj.userData.tipo = null;
  rec.babaza.visible = false;
  /* limpio se ve más claro: el melloco lavado pierde el velo gris */
  if (rec.cuerpo) rec.cuerpo.material.color.set('#f8dc8e');
  hechos++;
  api.sfx(hechos % 2 ? 'pop' : 'pop2');
  api.buzz(12);
  api.chispas(rec.obj.position.clone().setY(api.MESA_Y + ALTO + 0.12), '#fbf3d0', 8, 0.8);
  rec.obj.userData.escalaBase = 1;
  api.volarA(rec.obj, api.BATEA.clone().setY(api.MESA_Y + 0.2), { dur: 0.46, alto: 0.6 });
  api.progreso(hechos, CUANTOS);
  revisarFinal();
}

/* se te disparó: sale patinando en el sentido del dedo */
function resbalar(rec, dx, dz) {
  if (rec.limpio || rec.resbalando > 0) return;
  const d = Math.hypot(dx, dz) || 1;
  const destino = encajar(new THREE.Vector3(
    rec.obj.position.x + (dx / d) * (0.4 + Math.random() * 0.2),
    api.MESA_Y + ALTO,
    rec.obj.position.z + (dz / d) * (0.4 + Math.random() * 0.2),
  ));
  rec.resbalando = 0.34;
  api.tween(rec.obj.position, 'x', destino.x, 0.32);
  api.tween(rec.obj.position, 'z', destino.z, 0.32);
  api.tween(rec.obj.rotation, 'y', rec.obj.rotation.y + 2.6, 0.32);
  api.sfx('resist'); api.buzz([18, 24]);
  if (!resbalados++) {
    api.pista('Se te disparó. La baba no se quita a lo bruto: <b>raspa parejo</b>, sin arrebato.', 3600);
  }
}

function rasparEn(punto, paso, dx, dz) {
  if (!punto) return;
  const bicho = plaga.cercaDe(punto, RADIO_DEDO);
  if (bicho) { plaga.aplastar(bicho); return; }
  /* velocidad real del dedo, suavizada: mundo por segundo */
  const ahora = api.reloj;
  const dt = Math.max(0.008, ahora - velT);
  velT = ahora;
  velSuave = velSuave * 0.6 + (paso / dt) * 0.4;
  for (const rec of mellocos) {
    if (rec.limpio || rec.resbalando > 0) continue;
    if (Math.hypot(rec.obj.position.x - punto.x, rec.obj.position.z - punto.z) > RADIO_DEDO) continue;
    if (velSuave > RESBALON) { resbalar(rec, dx, dz); continue; }
    raspar(rec, paso);
  }
}

function revisarFinal() {
  if (terminado || hechos < CUANTOS) return;
  if (plaga.vivos()) { api.aviso('Falta sacar el gusanito antes de llevar la batea', 'bien'); return; }
  terminado = true;
  api.completar();
}

export default {
  id: 'melloco',
  /* de cerca: la baba solo se lee si el melloco ocupa pantalla */
  camara: { pos: [0, 2.72, 3.46], mira: [0, 0.96, 0.44] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    /* ocho es la tabla de siempre: dos hileras de cuatro */
    CUANTOS = cfg.cantidad ?? 8;
    CON_GUSANO = cfg.gusanos ?? 2;
    /* una resistencia fuera de la tabla cae en la normal en vez de
       dejar el nivel con un NaN por raspar: un dato mal escrito no
       debería costar una olla */
    RASPADO = RASPADO_POR_RESISTENCIA[cfg.resistencia ?? 1] ?? 0.78;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    mellocos = []; hechos = 0; terminado = false;
    modo = null; ultimoPunto = null; resbalados = 0; pellizcando = false;
    velSuave = 0; velT = 0;

    const tabla = api.pieza('tabla', { ancho: ANCHO_TABLA, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    mellocosGrupo = new THREE.Group();
    raiz.add(mellocosGrupo);

    plaga = nuevaPlaga(THREE, api, raiz, { nombre: 'gusanito', vel: 0.12,
      /* Este nivel se juega con el dedo pegado a la mesa barriendo de
         lado a lado, así que el bicho casi siempre nace debajo de una
         mano que ya viene en movimiento. Un segundo de gracia no da
         para reaccionar a eso: el jugador ni alcanza a leer el aviso. */
      gracia: 1.8,
      superficie: (x, z) => (Math.abs(x) < 1.55 && Math.abs(z - TABLA_Z) < 0.85)
        ? api.MESA_Y + 0.10 : api.MESA_Y,
    });

    /* regados, no en cuadrícula: vienen de un costal, no de una caja.
       Y pasando por `encajar`, que es quien sabe hasta dónde se ve:
       el reparto inicial llegaba a x=1.14 y el de la orilla quedaba
       medio fuera de pantalla —imposible de raspar— porque solo los
       resbalones respetaban el límite.

       Cuatro por hilera es lo que cabe entre los filos, así que lo que
       crece con la cantidad son las hileras, hacia el fondo. Y la tabla
       NO se alarga para recibirlas —como sí hace la de las habas—
       porque aquí la cámara está echada encima del melloco para que la
       baba se lea, y una hilera más atrás se saldría del cuadro: antes
       que estirar la tabla se aprieta el paso entre hileras. El reparto
       va centrado en las dos direcciones; dejar el `f - 0.5` de las dos
       hileras de siempre hacía que la tercera y la cuarta crecieran
       solo hacia atrás, y `encajar` terminaba apilándolas todas contra
       el mismo filo, unas encima de otras. */
    const columnas = Math.min(4, CUANTOS);
    const filas = Math.ceil(CUANTOS / columnas);
    const hueco = HONDO_TABLA - 0.28;   /* lo que `encajar` deja jugable */
    const pasoFila = filas > 1 ? Math.min(0.46, hueco / (filas - 1)) : 0.46;
    for (let i = 0; i < CUANTOS; i++) {
      const f = Math.floor(i / columnas), c = i % columnas;
      const p = encajar(new THREE.Vector3(
        (c - (columnas - 1) / 2) * 0.62 + (f % 2 ? 0.16 : -0.1) + (Math.random() - 0.5) * 0.1,
        0,
        TABLA_Z + (f - (filas - 1) / 2) * pasoFila + (Math.random() - 0.5) * 0.1,
      ));
      const x = p.x, z = p.z;
      const rec = nuevoMelloco(x, z, i);
      mellocosGrupo.add(rec.obj);
      mellocos.push(rec);
    }

    this._sueltos = 0;
    api.progreso(0, CUANTOS);
  },

  objetivos() { return [mellocosGrupo, plaga.grupo]; },

  alTocar(info) {
    if (terminado) return;
    if (info.raiz && info.raiz.userData.tipo === 'bicho') { plaga.tocado(plaga.de(info.raiz)); return; }
    /* un toque seco no raspa nada: la baba pide recorrido */
    if (info.raiz && info.raiz.userData.tipo === 'melloco') {
      api.sfx('resist');
      api.pista('Con tocarlo no sale. <b>Raspa</b>: pasa el dedo por encima, de lado a lado.', 3200);
    }
  },

  alArrastrarInicio(info) {
    if (terminado) return;
    /* Agarrar por cercanía EN PANTALLA, como el pellizco. Exigir que
       el rayo acierte la malla exacta de un bicho de un centímetro
       hacía que "arrastrar desde él" fallara la mitad de las veces y
       el dedo terminara barriendo POR ENCIMA del bicho que intentaba
       salvar — el gesto correcto castigado por puntería. */
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y, 62);
    if (rec && plaga.agarrar(rec)) { modo = 'cargar'; return; }
    modo = 'raspar';
    ultimoPunto = api.puntoEnPlano(api.MESA_Y + ALTO);
    /* cada gesto arranca en calma: la velocidad del anterior no se
       hereda, o el primer roce del nuevo saldría disparado */
    velSuave = 0; velT = api.reloj;
  },

  alArrastrar() {
    if (terminado) return;
    if (modo === 'cargar') { plaga.mover(api.puntoEnPlano(api.MESA_Y)); return; }
    if (modo !== 'raspar') return;

    const p = api.puntoEnPlano(api.MESA_Y + ALTO);
    const prev = ultimoPunto;
    ultimoPunto = p;
    if (!p || !prev) return;
    const dx = p.x - prev.x, dz = p.z - prev.z;
    rasparEn(p, Math.hypot(dx, dz), dx, dz);
  },

  alArrastrarFin() {
    if (modo === 'cargar') { plaga.soltarMano(); revisarFinal(); }
    modo = null; ultimoPunto = null;
  },

  alPellizcarInicio(info) {
    if (terminado) return;
    const rec = plaga.masCercaEnPantalla(info.cliente.x, info.cliente.y);
    if (rec && plaga.agarrar(rec)) pellizcando = true;
  },
  alPellizcarMover() {
    if (!pellizcando) return;
    plaga.mover(api.puntoEnPlano(api.MESA_Y));
  },
  alPellizcarFin() {
    if (!pellizcando) return;
    pellizcando = false;
    plaga.soltarMano();
    revisarFinal();
  },

  actualizar(dt, t) {
    if (plaga && plaga.actualizar(dt, t)) return;

    if (this._sueltos < CON_GUSANO) {
      /* el reparto se interpola como media ponderada entre los dos
         extremos, y no sumando un paso cada vez, porque `0.3 + 0.35` no
         cae exacto en 0.65 y esa basurilla de coma flotante movía de
         sitio al segundo gusanito de la parada que ya existe */
      const cuando = CON_GUSANO > 1
        ? (PRIMER_BICHO * (CON_GUSANO - 1 - this._sueltos) + ULTIMO_BICHO * this._sueltos) / (CON_GUSANO - 1)
        : PRIMER_BICHO;
      /* y ningún bicho puede esperar al último melloco: en una tabla
         corta el 30% del avance cae más allá de la última pieza, y el
         gusanito nacía cuando `revisarFinal` ya había dado la olla por
         buena. Con el tope, una parada de un solo melloco lo suelta de
         entrada, que es lo único que le deja sitio. */
      const umbral = Math.min(CUANTOS * cuando, CUANTOS - 1);
      if (hechos >= umbral) {
        this._sueltos++;
        const vivos = mellocos.filter(m => !m.limpio);
        const donde = vivos.length ? vivos[Math.floor(Math.random() * vivos.length)].obj.position.clone()
                                   : new THREE.Vector3(0, api.MESA_Y, TABLA_Z);
        plaga.soltar('gusano', donde);
      }
    }

    mellocos.forEach((rec, i) => {
      if (rec.resbalando > 0) rec.resbalando = Math.max(0, rec.resbalando - dt);
      if (rec.limpio) return;
      /* los babosos relumbran: el brillo que se apaga al raspar */
      if (rec.babaza.visible) {
        rec.babaza.material.opacity = BABA_OPACA * rec.baba * (0.88 + Math.sin(t * 2.6 + i) * 0.12);
      }
    });
  },

  destruir() {
    if (plaga) plaga.destruir();
    mellocos = []; plaga = null; mellocosGrupo = null;
    modo = null; ultimoPunto = null; pellizcando = false; terminado = false;
  },
};
