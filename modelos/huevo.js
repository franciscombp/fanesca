/* ============================================================
   FANESCA — modelos/huevo.js
   El huevo duro que se casca y se pela.

   Vivía en despensa.js con los otros cinco que llegaron juntos; se
   mudó con sus piezas cuando creció (la auditoría del 3D les pidió
   piel y forma, y seis pieles en un archivo eran seis manos editando
   la misma página).

   PARTES NOMBRADAS (para que un .glb encaje)
     huevo → 'cascara', 'clara', 'casco0'…'cascoN'
   ============================================================ */

import { registrar } from './registro.js';
import { forma } from './organico.js';
import { lienzo, azarCon } from './pintura.js';

/* COLORES NUEVOS — de paso: van a mudarse a COMIDA en paleta.js.
   Viven aquí mientras tanto para no pisar a quien edita la paleta. */
const COLORES = {
  /* huevo de campo: beige tostado, un pelo más subido que el de
     antes para que, ya con pintas, no se lea gris sobre la tabla */
  huevo_cascara: '#dcc29a',
  /* la clara recién pelada: blanco tibio, no blanco de loza */
  huevo_clara: '#fbf8ef',
  huevo_clara_brillo: '#57524a',
};

/* LO ALARGADO DEL HUEVO. Una esfera estirada en y es un elipsoide:
   las dos puntas iguales, y con la base enterrada se leía campana.
   El huevo es más gordo abajo que arriba, así que cada anillo se
   angosta según su altura: s = 1 − k·(y/R).

   Las normales se escriben A MANO (gradiente de la superficie): si
   se recalculan por casco, cada casco ve solo su mitad y en el
   ecuador y en los meridianos queda una costura de luz.
     n ∝ (X/s², Y + (X²+Z²)·k/(R·s³), Z/s²)
   Después se hornea el ×1.3 en la geometría (y no en mesh.scale):
   el nivel le hace setScalar al casco que late y al que vuela, y
   eso borraba el alargado — asomaba la clara por la punta.

   Lo exporta el modelo y lo importa el nivel para que las grietas
   sigan la misma cáscara: con otra forma, flotaban fuera. */
export const ALARGADO = 1.3;
export function perfilHuevo(geo, R, k = 0.11) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const s = 1 - k * (y / R);
    const X = pos.getX(i) * s, Z = pos.getZ(i) * s;
    pos.setXYZ(i, X, y, Z);
    if (nor) {
      const nx = X / (s * s), nz = Z / (s * s);
      const ny = y + (X * X + Z * Z) * k / (R * s * s * s);
      const l = Math.hypot(nx, ny, nz) || 1;
      nor.setXYZ(i, nx / l, ny / l, nz / l);
    }
  }
  pos.needsUpdate = true;
  if (nor) nor.needsUpdate = true;
  /* scale() transforma también las normales (con la inversa), así
     que siguen bien después de estirar */
  geo.scale(1, ALARGADO, 1);
  return geo;
}

/* UV CÚBICO: el eje dominante de la normal elige qué dos coordenadas
   son u y v. La UV de esfera pellizca las pintas en el polo de
   arriba, que es justo lo que mira la cámara. */
function uvCubo(geo, rep = 3) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ay >= ax && ay >= az) uv.setXY(i, x * rep, z * rep);
    else if (ax >= az) uv.setXY(i, z * rep, y * rep);
    else uv.setXY(i, x * rep, y * rep);
  }
  uv.needsUpdate = true;
  return geo;
}

/* las pintas del huevo de campo: un velo de manchas tostadas y
   puntitos finos. Cacheada: una por sesión */
function texturaPintas(THREE) {
  return lienzo(THREE, 'huevo-pintas', 128, (x, S) => {
    const r = azarCon(23);
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 12; i++) {
      x.fillStyle = `rgba(175,135,95,${0.04 + r() * 0.03})`;
      x.beginPath(); x.arc(r() * S, r() * S, 3 + r() * 4, 0, 7); x.fill();
    }
    for (let i = 0; i < 170; i++) {
      x.fillStyle = `rgba(130,90,55,${0.25 + r() * 0.35})`;
      x.beginPath(); x.arc(r() * S, r() * S, 0.4 + r() * 1.1, 0, 7); x.fill();
    }
  }, { repetir: true });
}

/* ---------- EL HUEVO DURO ---------- */

registrar('huevo', (THREE) => {
  const g = new THREE.Group();
  g.name = 'huevo';
  /* la clara, debajo: lo que queda al pelar. Es el único brillo
     justificado del mesón: la clara recién pelada es resbalosa */
  const geoClara = forma('huevo-clara', () => perfilHuevo(new THREE.SphereGeometry(0.235, 28, 20), 0.235));
  const clara = new THREE.Mesh(geoClara, new THREE.MeshPhongMaterial({
    color: COLORES.huevo_clara, shininess: 30, specular: COLORES.huevo_clara_brillo,
  }));
  clara.name = 'clara';
  g.add(clara);
  /* la cáscara: OCHO cascos que se despegan uno a uno. Sin recortes
     en los bordes: los ocho teselan la misma superficie y no se
     solapan (no hay z-fighting), y ya no queda la franja de clara en
     el ecuador ni el punto blanco en la punta que la hacían campana. */
  const matC = new THREE.MeshLambertMaterial({ color: COLORES.huevo_cascara, map: texturaPintas(THREE) });
  let n = 0;
  for (let fila = 0; fila < 2; fila++) {
    for (let c = 0; c < 4; c++) {
      const geo = forma('huevo-casco' + n, () => uvCubo(perfilHuevo(new THREE.SphereGeometry(0.252, 10, 8,
        c * Math.PI / 2, Math.PI / 2, fila * Math.PI / 2, Math.PI / 2), 0.252)));
      const casco = new THREE.Mesh(geo, matC);
      casco.name = 'casco' + (n++);
      g.add(casco);
    }
  }
  return g;
});
