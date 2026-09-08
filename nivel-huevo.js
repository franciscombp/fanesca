/* ============================================================
   FANESCA — nivel-huevo.js
   CASCAR Y PELAR EL HUEVO DURO.

   El huevo va ENCIMA de la fanesca, no adentro — pero se pela en
   la misma cocina y con el mismo cuidado. Son dos gestos que todo
   el mundo conoce y ningún otro nivel usa:

     · golpecito seco (toques) → la cáscara se cuartea
     · ya cuarteado, RASCA la cáscara: tocar o pasar el dedo por
       encima va sacando los pedazos, que caen a la composta
     · sin cáscara, el huevo se va solo a la batea

   POR QUÉ ASÍ. Antes la cáscara sólo salía ARRASTRANDO, y con un
   umbral de jalón: quien tocaba —que es lo primero que hace
   cualquiera— no conseguía nada y el nivel parecía roto. Y los ocho
   cascos eran parches lisos, sin una grieta a la vista, así que
   tampoco se veía por dónde agarrar. Ahora la cáscara se abre al
   cuartearse (los pedazos se separan y se ven las grietas), el
   primero se levanta y late para decir «por aquí», y los dos gestos
   valen: tocar saca ese pedazo, pasar el dedo saca los que roce.
   Nadie se queda atascado por elegir mal la mano.

   `golpes` es cuántos toques pide la cáscara; `cantidad`, cuántos
   huevos trae la docena de hoy.
   ============================================================ */

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;

let HUEVOS = 3;
let GOLPES = 4;
let TOTAL = 0;              /* golpes + cascos + entrega, por huevo */

let generacion = 0;         /* mata los setTimeout de una partida vieja */
let huevoObj = null;
let cascos = [];            /* los pedazos de cáscara que quedan */
let grietas = null;         /* el grupo de rayitas dibujadas al golpear */
let huevoActual = 0;
let golpesDados = 0;
let fase = 'cascar';        /* cascar → pelar → entregar */
let hechos = 0;
let avisadoPicoteo = false;
let terminado = false;
/* el pedazo que se levanta al cuartearse: la señal de por dónde
   empezar. Late hasta que alguien lo saca. */
let primero = null;

const CENTRO = () => new THREE.Vector3(0, api.MESA_Y + 0.33, TABLA_Z);
const porHuevo = () => GOLPES + 8 + 1;   /* golpes + ocho cascos + la entrega */

function ponerHuevo() {
  fase = 'cascar';
  golpesDados = 0;
  huevoObj = api.pieza('huevo');
  huevoObj.scale.setScalar(1.9);
  huevoObj.position.copy(CENTRO());
  huevoObj.userData = { tipo: 'huevo' };
  huevoObj.add(api.sombraBlob(0.35, -0.16));
  raiz.add(huevoObj);
  cascos = [];
  primero = null;
  for (let i = 0; i < 8; i++) {
    const c = api.parte(huevoObj, 'casco' + i);
    if (c) {
      c.userData.tipo = 'casco';
      /* hacia dónde mira este pedazo: es media esfera partida en
         cuatro gajos y dos pisos, así que su centro sale de su propio
         gajo. Sirve para separarlo al cuartearse y para saber en qué
         dirección se despega. */
      const fila = i < 4 ? 1 : -1, gajo = i % 4;
      const a = (gajo + 0.5) * Math.PI / 2;
      c.userData.fuera = new THREE.Vector3(Math.sin(a), fila * 0.55, Math.cos(a)).normalize();
      c.userData.base = c.position.clone();
      cascos.push(c);
    }
  }
  grietas = new THREE.Group();
  huevoObj.add(grietas);
  if (api.rotulo) api.rotulo(`Cascar · huevo ${huevoActual + 1} de ${HUEVOS}`);
  /* cada huevo empieza de cero: la fila vuelve a «cáscalo» */
  if (api.paso) api.paso(0);
}

function golpear() {
  if (fase !== 'cascar') return;
  golpesDados++;
  hechos++;
  api.sfx('crack'); api.buzz([14, 10]);
  api.sacudir(0.25);
  /* cada golpe dibuja su grieta: una rayita oscura sobre la cáscara */
  const a = Math.random() * Math.PI * 2;
  const g = new THREE.Mesh(
    new THREE.TorusGeometry(0.255, 0.006, 3, 10, 0.5 + Math.random() * 0.6),
    new THREE.MeshBasicMaterial({ color: '#8a7a5e' })
  );
  g.scale.set(1, 1.3, 1);
  g.rotation.set(Math.random() * 2 - 1, a, Math.random() * 2 - 1);
  g.userData.ignorar = true;
  grietas.add(g);
  api.chispas(huevoObj.position.clone().setY(api.MESA_Y + 0.6), '#f0e0c8', 4, 0.5);
  api.progreso(hechos, TOTAL);

  if (golpesDados >= GOLPES) cuartear();
}

/* LA CÁSCARA SE ABRE. Que el huevo pase de «liso con rayitas» a
   «cuarteado de verdad» es lo que hace entender que ya toca pelar:
   cada pedazo se separa un poco y queda su grieta a la vista. Uno se
   levanta más y late, para decir por dónde empezar. */
function cuartear() {
  fase = 'pelar';
  if (api.rotulo) api.rotulo(`Pelar · huevo ${huevoActual + 1} de ${HUEVOS}`);
  if (api.paso) api.paso(1);
  api.sfx('bien'); api.buzz([12, 18, 12]);
  api.sacudir(0.3);
  cascos.forEach((c, i) => {
    if (!c.userData.tipo) return;
    const d = c.userData.fuera;
    const sep = 0.012 + Math.random() * 0.008;
    api.tween(c.position, 'x', c.userData.base.x + d.x * sep, 0.22);
    api.tween(c.position, 'y', c.userData.base.y + d.y * sep, 0.22);
    api.tween(c.position, 'z', c.userData.base.z + d.z * sep, 0.22);
    c.rotation.z = (Math.random() - 0.5) * 0.05;
    void i;
  });
  /* el de arriba del todo se levanta: es el que se ve mejor y el que
     el dedo alcanza sin tapar el huevo */
  primero = cascos.find(c => c.userData.tipo) || null;
  api.chispas(huevoObj.position.clone().setY(api.MESA_Y + 0.62), '#f0e0c8', 10, 0.7);
  api.pista('Ya está cuarteado: <b>rasca la cáscara</b> — toca los pedazos o pasa el dedo por encima.', 4200);
}

function jalarCasco(casco) {
  if (fase !== 'pelar' || !casco || !casco.userData.tipo) return;
  casco.userData.tipo = null;
  if (primero === casco) primero = cascos.find(c => c.userData.tipo) || null;
  hechos++;
  /* el casco se despega: se reparenta al mundo y vuela a la composta */
  const donde = casco.getWorldPosition(new THREE.Vector3());
  huevoObj.remove(casco);
  casco.position.copy(donde);
  casco.scale.setScalar(1.9);
  casco.userData.suelto = true;
  raiz.add(casco);
  api.volarA(casco, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.45, alto: 0.45 });
  api.sfx(hechos % 2 ? 'pop' : 'pop2'); api.buzz(8);
  api.composta((huevoActual * 8 + (8 - cascos.filter(c => c.userData.tipo).length)) / (HUEVOS * 8));
  api.progreso(hechos, TOTAL);

  if (!cascos.some(c => c.userData.tipo)) {
    /* SIN CÁSCARA SE VA SOLO. Pedir un toque más para «entregarlo»
       era un paso de trámite: el huevo ya está pelado, nadie lo deja
       ahí. Se va a la batea con su brillo y entra el siguiente. */
    fase = 'entregar';
    grietas.visible = false;
    primero = null;
    api.sfx('bien');
    api.toast('¡Blanquito! 🥚');
    api.chispas(huevoObj.position.clone().setY(api.MESA_Y + 0.5), '#fdfaf0', 12, 0.8);
    const mi = generacion;
    setTimeout(() => { if (generacion === mi && !terminado && fase === 'entregar') entregar(); }, 300);
  }
}

/* rascar: el pedazo que quede bajo el dedo se despega. Vale tocando
   y vale pasando el dedo, que es como se pela de verdad. */
function pelarEn(punto) {
  if (fase !== 'pelar') return false;
  const c = cascoCerca(punto, 0.34);
  if (!c) return false;
  jalarCasco(c);
  return true;
}

function entregar() {
  if (fase !== 'entregar') return;
  fase = 'ido';
  hechos++;
  huevoObj.userData.tipo = null;
  huevoObj.userData.escalaBase = 1.9;
  api.volarA(huevoObj, api.BATEA.clone().setY(api.MESA_Y + 0.24), { dur: 0.5, alto: 0.6 });
  api.sfx('bien'); api.buzz([10, 16]);
  api.progreso(hechos, TOTAL);
  huevoActual++;
  if (huevoActual < HUEVOS) {
    /* con token: sin él, salir del nivel en estos 420 ms plantaba el
       siguiente huevo en el mesón del nivel que viniera después */
    const mi = generacion;
    setTimeout(() => { if (generacion === mi && !terminado) ponerHuevo(); }, 420);
  } else {
    terminado = true;
    api.completar();
  }
}

/* el casco más cercano al punto tocado, por área: el dedo es gordo */
function cascoCerca(p, radio = 0.4) {
  if (!p) return null;
  let mejor = null, dm = radio;
  for (const c of cascos) {
    if (!c.userData.tipo) continue;
    const w = c.getWorldPosition(new THREE.Vector3());
    const d = Math.hypot(w.x - p.x, w.z - p.z);
    if (d < dm) { dm = d; mejor = c; }
  }
  return mejor;
}

export default {
  id: 'huevo',
  camara: 'tabla',

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    generacion++;
    huevoActual = 0; hechos = 0; avisadoPicoteo = false; primero = null; terminado = false;

    HUEVOS = Math.max(1, Math.round(cfg.cantidad ?? 3));
    GOLPES = Math.max(2, Math.round(cfg.golpes ?? 4));
    TOTAL = HUEVOS * porHuevo();

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    ponerHuevo();
    api.progreso(0, TOTAL);

    window.__huevo = {
      get fase() { return fase; },
      get hechos() { return hechos; },
      get cascos() { return cascos.filter(c => c.userData.tipo).length; },
      /* dónde está en pantalla el pedazo que hay que rascar, para
         poder probarlo con un dedo de verdad */
      get puntoPrimero() {
        const c = primero && primero.userData.tipo ? primero : cascos.find(x => x.userData.tipo);
        if (!c) return null;
        const w = c.getWorldPosition(new THREE.Vector3());
        const q = api.proyectar(w);
        return { x: Math.round(q.x), y: Math.round(q.y) };
      },
      get puntoHuevo() { const q = api.proyectar(CENTRO()); return { x: Math.round(q.x), y: Math.round(q.y) }; },
      golpear() { golpear(); return fase; },
      pelar() { const c = cascos.find(x => x.userData.tipo); if (c) jalarCasco(c); return fase; },
      entregar() { entregar(); return huevoActual; },
    };
  },

  objetivos() { return [huevoObj].filter(Boolean); },

  alTocar() {
    if (terminado) return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.33);
    if (!p || Math.hypot(p.x - CENTRO().x, p.z - CENTRO().z) > 0.85) return;
    if (fase === 'cascar') { golpear(); return; }
    if (fase === 'entregar') { entregar(); return; }
    /* TOCAR TAMBIÉN PELA: era lo primero que hacía todo el mundo y
       era lo único que no funcionaba */
    if (fase === 'pelar') {
      if (pelarEn(p)) return;
      if (!avisadoPicoteo) {
        avisadoPicoteo = true;
        api.sfx('resist');
        api.pista('Ahí ya no queda cáscara: <b>rasca donde todavía haya</b> pedazos.', 3000);
      }
    }
  },

  alArrastrarInicio() {
    if (terminado || fase !== 'pelar') return;
    pelarEn(api.puntoEnPlano(api.MESA_Y + 0.33));
  },

  /* el dedo va rascando: cada pedazo que roza se despega. Sin umbral
     de jalón — el umbral era invisible y hacía que arrastrar tampoco
     pareciera funcionar. */
  alArrastrar() {
    if (terminado || fase !== 'pelar') return;
    pelarEn(api.puntoEnPlano(api.MESA_Y + 0.33));
  },

  alArrastrarFin() {},

  actualizar(dt, t) {
    if (!huevoObj || terminado) return;
    if (fase === 'entregar') huevoObj.rotation.y += dt * 0.6;
    /* respira apenas: la mesa está viva */
    if (fase !== 'ido') huevoObj.position.y = CENTRO().y + Math.sin(t * 2.1) * 0.005;
    /* el pedazo por el que empezar late: es la única instrucción que
       no hay que leer */
    if (primero && primero.userData.tipo) {
      const k = 1 + Math.abs(Math.sin(t * 3.4)) * 0.03;
      primero.scale.setScalar(k);
      const d = primero.userData.fuera, b = primero.userData.base;
      const s = 0.02 + Math.abs(Math.sin(t * 3.4)) * 0.012;
      primero.position.set(b.x + d.x * s, b.y + d.y * s, b.z + d.z * s);
    }
  },

  destruir() {
    generacion++;
    huevoObj = null; cascos = []; grietas = null; primero = null; terminado = false;
    delete window.__huevo;
  },
};
