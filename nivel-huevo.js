/* ============================================================
   FANESCA — nivel-huevo.js
   CASCAR Y PELAR EL HUEVO DURO.

   El huevo va ENCIMA de la fanesca, no adentro — pero se pela en
   la misma cocina y con el mismo cuidado. Son dos gestos que todo
   el mundo conoce y ningún otro nivel usa:

     · golpecito seco (toques) → la cáscara se cuartea
     · ya cuarteado, JALA cada casco desde la grieta → a la composta
     · pelado del todo, tócalo → a la batea, y viene el siguiente

   Seguir golpeando un huevo ya cuarteado no pela nada — se dice, y
   se enseña a jalar. `golpes` es cuántos toques pide la cáscara;
   `cantidad`, cuántos huevos trae la docena de hoy.
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
let arrastrando = null;     /* el casco agarrado */
let terminado = false;

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
  for (let i = 0; i < 8; i++) {
    const c = api.parte(huevoObj, 'casco' + i);
    if (c) { c.userData.tipo = 'casco'; cascos.push(c); }
  }
  grietas = new THREE.Group();
  huevoObj.add(grietas);
  if (api.rotulo) api.rotulo(`Cascar · huevo ${huevoActual + 1} de ${HUEVOS}`);
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

  if (golpesDados >= GOLPES) {
    fase = 'pelar';
    if (api.rotulo) api.rotulo(`Pelar · huevo ${huevoActual + 1} de ${HUEVOS}`);
    api.sfx('bien');
    api.pista('Cuarteado. Ahora <b>jala cada casco</b> desde la grieta, hacia afuera.', 3800);
  }
}

function jalarCasco(casco) {
  if (fase !== 'pelar' || !casco || !casco.userData.tipo) return;
  casco.userData.tipo = null;
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
    fase = 'entregar';
    grietas.visible = false;
    api.sfx('bien');
    api.pista('Blanquito y entero: <b>tócalo</b> y va a la batea.', 3000);
  }
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
  camara: { pos: [0, 2.6, 3.3], mira: [0, 0.98, 0.42] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    generacion++;
    huevoActual = 0; hechos = 0; avisadoPicoteo = false; arrastrando = null; terminado = false;

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
    if (fase === 'pelar' && !avisadoPicoteo) {
      avisadoPicoteo = true;
      api.sfx('resist');
      api.pista('Golpear ya no pela: <b>jala el casco</b> hacia afuera, desde la grieta.', 3200);
    }
  },

  alArrastrarInicio() {
    if (terminado) return;
    if (fase !== 'pelar') return;
    arrastrando = cascoCerca(api.puntoEnPlano(api.MESA_Y + 0.33));
    this._d = 0;
  },

  alArrastrar(info) {
    if (terminado || !arrastrando) return;
    /* el jalón se mide en pantalla: pasado el umbral, el casco cede */
    this._d = (this._d || 0) + (info.delta ? Math.hypot(info.delta.x, info.delta.y) : 5);
    if (this._d > 34) {
      const c = arrastrando;
      arrastrando = null;
      jalarCasco(c);
    }
  },

  alArrastrarFin() { arrastrando = null; },

  actualizar(dt, t) {
    if (!huevoObj || terminado) return;
    if (fase === 'entregar') huevoObj.rotation.y += dt * 0.6;
    /* respira apenas: la mesa está viva */
    if (fase !== 'ido') huevoObj.position.y = CENTRO().y + Math.sin(t * 2.1) * 0.005;
  },

  destruir() {
    generacion++;
    huevoObj = null; cascos = []; grietas = null; arrastrando = null; terminado = false;
    delete window.__huevo;
  },
};
