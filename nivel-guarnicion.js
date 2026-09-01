/* ============================================================
   FANESCA — nivel-guarnicion.js
   FREÍR Y ARMAR — lo de encima del plato.

   La fanesca no se sirve pelada: lleva maduro frito, empanaditas
   de viento y el ají al lado. Este es el único nivel con RELOJ
   PROPIO dentro del gesto: el maduro se dora solo en la sartén y
   lo que se juega es el CUÁNDO.

     fase 1 — FREÍR:  arrastra la tajada a la sartén; cuando dore,
                      tócala para VOLTEARLA; dorada de los dos
                      lados, sácala al plato. Si se pasa, se quema
                      — a la composta, y se repone otra.
     fase 2 — ARMAR:  el plato hondo con la crema; arrastra encima
                      los maduros, las empanaditas y el ají.

   Quemar una tajada no arruina nada: cuesta tiempo, que es la
   moneda de esta cocina. `resistencia` aprieta la ventana del
   volteo — la sartén de la casa llena calienta más fuerte.
   ============================================================ */

let THREE, raiz, api;

const HONDO_TABLA = 1.7;
let TABLA_Z = 0;

/* los tiempos del fuego, con resistencia 0: dorar un lado toma 2.4s
   y hay 2.6s de margen antes de que se queme */
const DORA_REF = 2.4, MARGEN_REF = 2.6;

let PRESAS = 3;
let T_DORA = DORA_REF, T_MARGEN = MARGEN_REF;
let TOTAL = 0;

let generacion = 0;      /* mata los setTimeout de una partida vieja */
let sartenObj = null, platoObj = null, ajiObj = null;
let tajadas = [];        /* {obj, malla, estado, lado, dora, x0, z0} */
let empanaditas = [];
let fase = 'freir';
let hechos = 0;
let fritas = 0;
let enMano = null;       /* lo que va agarrado: {tipo, rec} */
let avisadoVoltea = false;
let terminado = false;

const SARTEN = () => new THREE.Vector3(-0.55, api.MESA_Y + 0.2, TABLA_Z);
const ESPERA = (i) => new THREE.Vector3(0.95, api.MESA_Y + 0.16, TABLA_Z - 0.5 + i * 0.34);
const PLATO = () => new THREE.Vector3(0.15, api.MESA_Y + 0.18, TABLA_Z + 0.05);

function nuevaTajada(i) {
  const obj = api.pieza('maduro', { variante: i });
  obj.scale.setScalar(1.5);
  const p = ESPERA(i % 3);
  obj.position.copy(p);
  obj.userData = { tipo: 'tajada' };
  raiz.add(obj);
  const rec = { obj, malla: obj, estado: 'cruda', lado: 0, dora: 0, x0: p.x, z0: p.z };
  tajadas.push(rec);
  return rec;
}

function colorDeTajada(rec) {
  const crudo = new THREE.Color('#f2c04e');
  const dorado = new THREE.Color('#d98f2b');
  const quemado = new THREE.Color('#5c3a1c');
  const k = rec.dora;
  const m = rec.obj.material || rec.obj.children.find(c => c.material)?.material;
  if (!m) return;
  if (k <= 1) m.color.copy(crudo).lerp(dorado, k);
  else m.color.copy(dorado).lerp(quemado, Math.min(1, (k - 1) / (T_MARGEN / T_DORA)));
}

function quemar(rec) {
  rec.estado = 'quemada';
  rec.obj.userData.tipo = null;
  api.sfx('mal'); api.buzz([30, 20, 30]);
  api.aviso('🔥 ¡Se quemó! A la composta — va otra tajada', 'peligro');
  rec.obj.userData.escalaBase = 1.5;
  api.volarA(rec.obj, api.COMPOSTA.clone().setY(api.MESA_Y + 0.16), { dur: 0.5, alto: 0.4 });
  tajadas = tajadas.filter(t => t !== rec);
  nuevaTajada(tajadas.length + fritas + 3);
}

function voltear(rec) {
  if (rec.estado !== 'friendo' || rec.dora < 1) return false;
  rec.lado++;
  hechos++;
  api.sfx('corte'); api.buzz(10);
  api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.4), '#f6d98a', 6, 0.6);
  api.tween(rec.obj.rotation, 'x', rec.obj.rotation.x + Math.PI, 0.22);
  api.progreso(hechos, TOTAL);
  if (rec.lado >= 2) {
    rec.estado = 'lista';
    api.aviso('Dorada — sácala de la sartén', 'bien');
  } else {
    rec.dora = 0;
  }
  return true;
}

function sacarAlPlato(rec) {
  rec.estado = 'frita';
  rec.obj.userData.tipo = null;
  fritas++;
  api.sfx('bien'); api.buzz([10, 14]);
  rec.obj.userData.escalaBase = 1.5;
  const p = ESPERA((fritas - 1) % 3).clone();
  p.x = 1.15; p.z += 0.05;
  api.volarA(rec.obj, p, { dur: 0.4, alto: 0.5 });
  rec.reposo = p;

  if (fritas >= PRESAS) armarFase();
}

function armarFase() {
  fase = 'armar';
  if (api.rotulo) api.rotulo('Armar el plato · la guarnición');
  platoObj = api.pieza('plato-fanesca');
  platoObj.position.copy(PLATO());
  platoObj.userData = { tipo: 'plato' };
  platoObj.scale.setScalar(0.01);
  raiz.add(platoObj);
  api.tween(platoObj.scale, 'x', 1, 0.35); api.tween(platoObj.scale, 'y', 1, 0.35); api.tween(platoObj.scale, 'z', 1, 0.35);

  /* las empanaditas ya vinieron hechas —son de viento, de la tienda
     de la esquina— y el ají estaba esperando su momento */
  for (let i = 0; i < 2; i++) {
    const e = api.pieza('empanadita');
    e.position.set(-1.05, api.MESA_Y + 0.14, TABLA_Z - 0.35 + i * 0.42);
    e.userData = { tipo: 'topping', clase: 'empanadita' };
    raiz.add(e);
    empanaditas.push(e);
  }
  ajiObj = api.pieza('aji-cuenco');
  ajiObj.position.set(-1.05, api.MESA_Y + 0.12, TABLA_Z + 0.5);
  ajiObj.userData = { tipo: 'topping', clase: 'aji' };
  raiz.add(ajiObj);
  /* las tajadas fritas también se ponen encima */
  tajadas.filter(t => t.estado === 'frita').forEach(t => { t.obj.userData.tipo = 'topping'; t.obj.userData.clase = 'maduro'; });

  api.pista('Ahora <b>arma el plato</b>: arrastra encima el maduro, las empanaditas y el ají.', 4600);
  api.sfx('fiesta');
}

function ponerEnPlato(obj) {
  obj.userData.tipo = null;
  hechos++;
  const puestos = TOTAL - hechos;
  const a = hechos * 2.4;
  const destino = PLATO().clone();
  destino.x += Math.cos(a) * 0.28;
  destino.z += Math.sin(a) * 0.22;
  destino.y = api.MESA_Y + 0.3;
  obj.userData.escalaBase = obj.scale.x;
  api.volarA(obj, destino, { dur: 0.4, alto: 0.5 });
  api.sfx('pop2'); api.buzz(9);
  api.progreso(hechos, TOTAL);
  if (hechos >= TOTAL && !terminado) {
    terminado = true;
    const mi = generacion;
    setTimeout(() => { if (generacion === mi) api.completar(); }, 500);
  }
}

const cerca = (a, b, r) => Math.hypot(a.x - b.x, a.z - b.z) < r;

export default {
  id: 'guarnicion',
  camara: { pos: [0, 3.0, 3.7], mira: [0, 0.95, 0.35] },

  construir(ctx, cfg = {}) {
    THREE = ctx.THREE; raiz = ctx.raiz; api = ctx.api;
    TABLA_Z = api.FRENTE_TABLA - HONDO_TABLA / 2;
    generacion++;
    tajadas = []; empanaditas = []; fase = 'freir'; hechos = 0; fritas = 0;
    enMano = null; avisadoVoltea = false; terminado = false;
    platoObj = null; ajiObj = null;

    PRESAS = Math.max(1, Math.round(cfg.presas ?? 3));
    const res = cfg.resistencia ?? 0;
    T_DORA = DORA_REF * (1 - 0.12 * res);
    T_MARGEN = Math.max(1.1, MARGEN_REF * (1 - 0.3 * res));
    /* dos volteos por tajada + cada pieza puesta encima al final */
    TOTAL = PRESAS * 2 + PRESAS + 2 + 1;

    const tabla = api.pieza('tabla', { ancho: 3.1, hondo: HONDO_TABLA });
    tabla.position.set(0, api.MESA_Y + 0.05, TABLA_Z);
    tabla.userData = { tipo: 'tabla' };
    raiz.add(tabla);

    sartenObj = api.pieza('sarten');
    sartenObj.position.copy(SARTEN());
    sartenObj.userData = { tipo: 'sarten' };
    raiz.add(sartenObj);

    for (let i = 0; i < Math.min(3, PRESAS); i++) nuevaTajada(i);

    api.progreso(0, TOTAL);

    window.__guarnicion = {
      get fase() { return fase; },
      get hechos() { return hechos; },
      freirUno() {
        const rec = tajadas.find(t => t.estado === 'cruda') || tajadas.find(t => t.estado === 'friendo');
        if (!rec) return fase;
        rec.estado = 'friendo';
        rec.obj.position.copy(SARTEN()).setY(api.MESA_Y + 0.26);
        rec.dora = 1; voltear(rec);
        rec.dora = 1; voltear(rec);
        sacarAlPlato(rec);
        return fase;
      },
      armar() {
        const obj = [...empanaditas, ajiObj, ...tajadas.map(t => t.obj)]
          .find(o => o && o.userData.tipo === 'topping');
        if (obj) ponerEnPlato(obj);
        return hechos;
      },
    };
  },

  objetivos() { return [sartenObj, platoObj, ajiObj, ...empanaditas, ...tajadas.map(t => t.obj)].filter(Boolean); },

  alTocar() {
    if (terminado) return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.24);
    if (!p) return;
    /* el toque en la sartén es el volteo */
    const rec = tajadas.find(t => (t.estado === 'friendo' || t.estado === 'lista') && cerca(t.obj.position, p, 0.5));
    if (rec) {
      if (rec.estado === 'friendo' && rec.dora < 1 && !avisadoVoltea) {
        avisadoVoltea = true;
        api.pista('Todavía no dora: <b>espera</b> a que tome color y ahí voltéala.', 3000);
        return;
      }
      if (rec.estado === 'friendo') voltear(rec);
      return;
    }
  },

  alArrastrarInicio() {
    if (terminado) return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.24);
    if (!p) return;
    /* agarrar lo más cercano que se pueda llevar */
    if (fase === 'armar') {
      const top = [...empanaditas, ajiObj, ...tajadas.map(t => t.obj)]
        .filter(o => o && o.userData.tipo === 'topping')
        .find(o => cerca(o.position, p, 0.45));
      if (top) { enMano = { tipo: 'topping', obj: top }; return; }
    }
    const cruda = tajadas.find(t => t.estado === 'cruda' && cerca(t.obj.position, p, 0.4));
    if (cruda) { enMano = { tipo: 'tajada', rec: cruda }; return; }
    const lista = tajadas.find(t => t.estado === 'lista' && cerca(t.obj.position, p, 0.5));
    if (lista) { enMano = { tipo: 'lista', rec: lista }; return; }
  },

  alArrastrar() {
    if (terminado || !enMano) return;
    const p = api.puntoEnPlano(api.MESA_Y + 0.3);
    if (!p) return;
    const obj = enMano.obj || enMano.rec.obj;
    obj.position.set(p.x, api.MESA_Y + 0.34, p.z);
  },

  alArrastrarFin() {
    if (!enMano) return;
    const m = enMano;
    enMano = null;
    const obj = m.obj || m.rec.obj;
    if (m.tipo === 'tajada') {
      if (cerca(obj.position, SARTEN(), 0.6)) {
        m.rec.estado = 'friendo';
        m.rec.dora = 0; m.rec.lado = 0;
        obj.position.copy(SARTEN()).setY(api.MESA_Y + 0.26);
        obj.position.x += (Math.random() - 0.5) * 0.3;
        api.sfx('frotar'); api.buzz(8);
      } else {
        api.tween(obj.position, 'x', m.rec.x0, 0.3);
        api.tween(obj.position, 'z', m.rec.z0, 0.3);
        api.tween(obj.position, 'y', api.MESA_Y + 0.16, 0.3);
      }
      return;
    }
    if (m.tipo === 'lista') {
      /* fuera de la sartén ya cuenta como sacada */
      if (!cerca(obj.position, SARTEN(), 0.62)) { sacarAlPlato(m.rec); }
      else obj.position.copy(SARTEN()).setY(api.MESA_Y + 0.26);
      return;
    }
    if (m.tipo === 'topping') {
      if (cerca(obj.position, PLATO(), 0.6)) ponerEnPlato(obj);
      else api.tween(obj.position, 'y', api.MESA_Y + 0.14, 0.3);
    }
  },

  actualizar(dt, t) {
    if (terminado) return;
    for (const rec of tajadas) {
      if (rec.estado !== 'friendo') continue;
      if (enMano && enMano.rec === rec) continue;
      rec.dora += dt / T_DORA;
      colorDeTajada(rec);
      if (Math.random() < dt * 3) api.chispas(rec.obj.position.clone().setY(api.MESA_Y + 0.36), '#f6d98a', 1, 0.35);
      if (rec.dora >= 1 && rec.dora - dt / T_DORA < 1) {
        api.sfx('pop2');
        api.aviso('¡Ya dora! Tócala para voltearla', 'bien');
      }
      if (rec.dora > 1 + T_MARGEN / T_DORA) quemar(rec);
    }
  },

  destruir() {
    generacion++;
    tajadas = []; empanaditas = [];
    sartenObj = null; platoObj = null; ajiObj = null;
    enMano = null; terminado = false;
    delete window.__guarnicion;
  },
};
