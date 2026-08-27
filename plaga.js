/* ============================================================
   FANESCA — plaga.js
   Los bichos que caminan por la tabla, en un solo sitio.

   Tres niveles (habas, fréjol, zapallo) comparten exactamente el
   mismo drama: aparece un bicho, camina hacia la batea, y el
   jugador tiene que agarrarlo y botarlo a la composta antes de
   que llegue — sin tocarlo, porque tocarlo es aplastarlo.

   Si cada nivel lo reimplementara, tarde o temprano uno caminaría
   más rápido o perdonaría un toque, y la regla dejaría de ser una
   regla. Vive aquí una sola vez.
   ============================================================ */

import { nuevoGusano, nuevoGorgojo } from './modelos/bichos.js';
import { ARRUINADO } from './arruinado.js';
import { ANCHO_SEGURO } from './motor3d.js';

export function nuevaPlaga(THREE, api, raiz, opts = {}) {
  const nombre = opts.nombre || 'gusanito';
  const VEL = opts.vel || 0.13;             /* unidades por segundo hacia la batea */
  /* Un bicho que nace pegado a la batea es una derrota sin jugada: la
     vaina de la derecha está a un palmo del cuenco. Nazca donde nazca,
     se lo aparta hasta esta distancia para que siempre haya carrera. */
  const ARRANQUE = opts.arranque || 1.15;
  /* Cuánto levanta al bicho sobre la superficie que pisa: la panza
     del gusano y las patas del gorgojo bajan ~0.06, así que menos
     que esto lo entierra. */
  const ALTO = opts.alto != null ? opts.alto : 0.055;
  /* Y CUÁL es esa superficie. Sin esto el bicho camina a la altura
     del mesón y la tabla de picar —que sobresale un centímetro— se
     lo traga: se le ve media cabeza y el jugador no puede agarrarlo.
     Cada nivel dice dónde está su tabla. */
  const SUELO = opts.superficie || (() => api.MESA_Y);
  const CERCA_BATEA = opts.cercaBatea || 0.42;
  const CERCA_COMPOSTA = opts.cercaComposta || 0.9;
  /* El bicho aparece justo bajo el dedo que lo destapó, y muchas veces
     ese dedo viene barriendo. Sin este respiro, destapar un bicho sería
     perder sin poder reaccionar — que no es dificultad, es injusticia. */
  const GRACIA = opts.gracia != null ? opts.gracia : 1.5;

  /* A qué altura viaja el bicho cargado. */
  const ALTO_CARGA = 0.3;

  const grupo = new THREE.Group();
  raiz.add(grupo);
  const lista = [];
  let cargado = null;
  let avisados = 0;
  let perdonado = false;   /* un apretón perdonado por nivel */
  let avisadoRoce = false; /* el "lo empujaste" se explica una vez */

  const destino = api.BATEA.clone().setY(api.MESA_Y + ALTO);

  function soltar(clase, pos) {
    const bicho = clase === 'gorgojo'
      ? nuevoGorgojo(THREE, { escala: 1 })
      : nuevoGusano(THREE, { eje: 'z' });
    const nodo = new THREE.Group();
    nodo.userData = { tipo: 'bicho' };
    nodo.add(bicho.obj);
    nodo.position.copy(pos);
    /* apartarlo de la batea sin sacarlo del mesón */
    let dx = pos.x - api.BATEA.x, dz = pos.z - api.BATEA.z;
    let d = Math.hypot(dx, dz);
    if (d < 0.01) { dx = -1; dz = -0.2; d = Math.hypot(dx, dz); }
    if (d < ARRANQUE) {
      /* un bicho fuera de cuadro no se puede agarrar, y sin agarrarlo
         el nivel no se termina: nace siempre donde se le vea */
      const tope = ANCHO_SEGURO - 0.16;
      nodo.position.x = Math.max(-tope, Math.min(tope, api.BATEA.x + (dx / d) * ARRANQUE));
      nodo.position.z = Math.max(-0.45, Math.min(1.05, api.BATEA.z + (dz / d) * ARRANQUE));
    }
    nodo.position.y = SUELO(nodo.position.x, nodo.position.z) + ALTO;
    grupo.add(nodo);
    nodo.scale.setScalar(0.01);
    api.tween(nodo.scale, 'x', 1, 0.28); api.tween(nodo.scale, 'y', 1, 0.28); api.tween(nodo.scale, 'z', 1, 0.28);

    const rec = { nodo, bicho, estado: 'suelto', t0: api.reloj };
    lista.push(rec);
    api.sfx('crack'); api.buzz([25, 30, 25]);
    if (!avisados++) {
      api.pista('<b>Pellízcalo con dos dedos</b> y llévalo a la composta verde (o arrástralo con uno). Si lo tocas, lo aplastas.', 5200);
    }
    api.aviso(`🪱 ¡Un ${nombre}! Llévalo a la composta — no lo aplastes`);
    return rec;
  }

  return {
    soltar,
    grupo,
    objetivos() { return [grupo]; },
    vivos() { return lista.filter(r => r.estado !== 'ido').length; },
    /* para los niveles que barren por área en vez de por rayo */
    lista() { return lista; },
    /* ¿este objeto tocado es uno de los nuestros? */
    de(raizTocada) { return lista.find(r => r.nodo === raizTocada && r.estado !== 'ido') || null; },

    /* EL DEDO QUE APRIETA ES EL QUE MATA.

       Esta regla estuvo al revés una versión: barrer aplastaba y el
       toque solo asustaba. Se hizo así para no castigar al barrido
       distraído, pero dejó el nivel sin riesgo ninguno — apretar al
       bicho, que es LO ÚNICO que en una cocina de verdad lo revienta,
       no costaba nada. Ahora manda el gesto: el dedo que se posa
       encima aprieta; el dedo que va de paso, barriendo, solo lo
       empuja. Cuidado con el dedo, no puntería. */
    tocado(rec) {
      if (!rec || rec.estado !== 'suelto') return false;
      /* UN gesto, UNA consecuencia: sin esto un toque repetido se
         cobraba el perdón y la derrota antes de poder leer nada */
      if (rec.inmune && api.reloj < rec.inmune) return false;

      /* recién salido: todavía no lo viste, no cuenta */
      if (api.reloj - rec.t0 < GRACIA) {
        rec.nodo.position.z += 0.06;
        rec.inmune = api.reloj + 1.0;
        api.sfx('resist'); api.buzz([20, 20]);
        api.pista('¡Casi! <b>No lo aprietes</b>: arrástralo hasta la composta.', 2600);
        return false;
      }

      /* EL PERDÓN: el primer apretón de cada nivel enseña la regla en
         vez de cobrarla. El segundo sí se paga. */
      if (!perdonado) {
        perdonado = true;
        rec.t0 = api.reloj + 0.6;          /* mareado: dos segundos sin caminar */
        rec.inmune = api.reloj + 1.4;
        rec.nodo.position.z += 0.1;
        api.sfx('mal'); api.buzz([40, 30, 40]);
        api.destello('rgba(230,57,70,.3)');
        api.aviso('💛 ¡Casi lo aplastas! Esta te la perdono', 'peligro');
        api.pista('No lo toques con la yema: <b>arrástralo</b> hasta la composta. A la próxima se arruina la olla.', 3800);
        return false;
      }
      api.arruinar(ARRUINADO.aplastado(nombre));
      return true;
    },

    /* EL DEDO DE PASO. Barriendo, el bicho no se aplasta: se lo lleva
       por delante y queda rodando. Barrer es el gesto de trabajo de
       media mesa, y castigarlo obligaba a mirar cada grano antes de
       moverse — lento y frustrante, justo lo contrario de lo que este
       juego pide. Empujarlo igual estorba: hay que ir a buscarlo. */
    aplastar(rec) {
      if (!rec || rec.estado !== 'suelto') return false;
      if (rec.inmune && api.reloj < rec.inmune) return false;
      rec.inmune = api.reloj + 0.7;
      /* rueda un poco en el sentido en que iba el dedo */
      rec.nodo.position.z += 0.16;
      rec.nodo.position.x += (Math.random() - 0.5) * 0.22;
      rec.t0 = api.reloj + 0.3;            /* aturdido un momento */
      api.sfx('resist'); api.buzz(10);
      if (!avisadoRoce) {
        avisadoRoce = true;
        api.pista('Lo empujaste sin querer. <b>Arrástralo</b> a la composta antes de seguir.', 3000);
      }
      return false;
    },
    /* ¿hay algún bicho suelto a menos de `r` de este punto? */
    cercaDe(punto, r) {
      return lista.find(x => x.estado === 'suelto'
        && Math.hypot(x.nodo.position.x - punto.x, x.nodo.position.z - punto.z) < r) || null;
    },

    /* la versión pantalla de `cercaDe`, para el pellizco: en vez de
       medir en el mundo (y exigir que el dedo caiga sobre el mesón
       exactamente donde está el bicho), mide en píxeles de pantalla
       contra dónde se VE el bicho — que es justo lo que el pellizco
       puede juzgar con generosidad sin volverse trampa. */
    masCercaEnPantalla(clienteX, clienteY, radioPx = 95) {
      let mejor = null, mejorD = radioPx;
      for (const rec of lista) {
        if (rec.estado !== 'suelto') continue;
        const mundo = rec.nodo.position.clone();
        mundo.y += ALTO + 0.03;
        const p = api.proyectar(mundo);
        const d = Math.hypot(p.x - clienteX, p.y - clienteY);
        if (d < mejorD) { mejorD = d; mejor = rec; }
      }
      return mejor;
    },

    agarrar(rec) {
      if (!rec || rec.estado !== 'suelto') return false;
      rec.estado = 'cargado';
      cargado = rec;
      rec.bicho.aro.visible = false;
      api.sfx('tab'); api.buzz(12);
      api.aviso('Llévalo a la composta 🌿', 'bien');
      return true;
    },
    llevando() { return !!cargado; },
    /* `punto` es dónde cae el dedo sobre el mesón. El bicho se dibuja
       más alto —se ve cargado en la mano— pero lo que cuenta para
       soltarlo es el punto del mesón: si juzgáramos por dónde flota,
       el jugador tendría que pasarse de largo de la composta para
       que le valiera, y eso se siente roto. */
    mover(punto) {
      if (!cargado || !punto) return;
      cargado.suelo = { x: punto.x, z: punto.z };
      /* PEGADO AL DEDO, EN PANTALLA.

         Dos intentos anteriores fallaron por lo mismo: colocar el
         bicho en coordenadas del mundo relativas al punto del mesón
         (subirlo en Y, adelantarlo en Z) siempre lo despega del dedo
         en pantalla — en esta cámara subir es irse hacia atrás, y
         cualquier compensación fija solo acierta a una distancia.

         Lo correcto es no compensar: se raycastea el MISMO rayo del
         dedo contra un plano a la altura de carga. La intersección
         proyecta por construcción al píxel exacto del dedo, así que
         el bicho queda debajo de la mano a cualquier altura y en
         cualquier parte del mesón. El punto del plano del mesón se
         guarda aparte (`suelo`): es el que decide dónde cae al
         soltarlo, porque soltar se juzga contra la mesa, no contra
         el aire. */
      const enMano = api.puntoEnPlano(api.MESA_Y + ALTO_CARGA) || punto;
      cargado.nodo.position.set(enMano.x, api.MESA_Y + ALTO_CARGA, enMano.z);
      cargado.nodo.rotation.z = Math.sin(api.reloj * 12) * 0.3;
    },
    /* devuelve 'composta' si lo botaste bien, 'devuelto' si se te cayó */
    soltarMano() {
      if (!cargado) return null;
      const rec = cargado; cargado = null;
      const p = rec.suelo || rec.nodo.position;
      if (Math.hypot(p.x - api.COMPOSTA.x, p.z - api.COMPOSTA.z) < CERCA_COMPOSTA) {
        rec.estado = 'ido';
        api.volarA(rec.nodo, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.35, alto: 0.35 });
        api.chispas(api.COMPOSTA.clone().setY(api.MESA_Y + 0.4), '#8ab143', 10);
        api.sfx('bien'); api.buzz([15, 25]);
        api.aviso(null);
        api.toast('¡Fuera de la olla! 🌿');
        return 'composta';
      }
      rec.estado = 'suelto';
      rec.bicho.aro.visible = true;
      rec.nodo.position.y = SUELO(rec.nodo.position.x, rec.nodo.position.z) + ALTO;
      rec.nodo.rotation.z = 0;
      api.sfx('resist');
      api.aviso(`🪱 Se te resbaló. Otra vez: hasta la composta`);
      return 'devuelto';
    },

    actualizar(dt, t) {
      for (const rec of lista) {
        if (rec.estado === 'ido') continue;
        rec.bicho.animar(t);
        if (rec.estado !== 'suelto') continue;
        const p = rec.nodo.position;
        const dx = destino.x - p.x, dz = destino.z - p.z;
        const d = Math.hypot(dx, dz);
        if (d < CERCA_BATEA) {
          rec.estado = 'ido';
          api.arruinar(ARRUINADO.enLaBatea(nombre));
          return true;
        }
        p.x += (dx / d) * VEL * dt;
        p.z += (dz / d) * VEL * dt;
        p.y = SUELO(p.x, p.z) + ALTO;    /* sube y baja de la tabla */
        rec.nodo.rotation.y = Math.atan2(dx, dz);
      }
      return false;
    },

    destruir() {
      lista.length = 0;
      cargado = null;
      if (grupo.parent) grupo.parent.remove(grupo);
    },
  };
}
