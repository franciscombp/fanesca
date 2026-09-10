/* ¿DE QUÉ TAMAÑO NACE CADA PIEZA? El caldero las normaliza por su
   bulto para meterlas en un cuenco del tamaño de una uña, y en
   pantalla salían blobs del tamaño de media cocina. Antes de tocar
   nada, medir: cuánto mide su caja y qué escala pide. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const r = await p.evaluate(async () => {
  const M = await import('./modelos/index.js');
  const THREE = (await import('three')).default || (await import('three'));
  const { ORDEN_OLLA } = await import('./niveles.js');
  const out = [];
  for (const ing of ORDEN_OLLA) {
    let o;
    try { o = M.pieza(ing.pieza, THREE, { ...(ing.opts || {}), variante: 1 }); }
    catch (e) { out.push({ id: ing.id, pieza: ing.pieza, error: e.message }); continue; }
    const caja = new THREE.Box3().setFromObject(o);
    const t = new THREE.Vector3(); caja.getSize(t);
    let mallas = 0; o.traverse(x => { if (x.isMesh) mallas++; });
    out.push({ id: ing.id, pieza: ing.pieza, mallas,
      x: +t.x.toFixed(4), y: +t.y.toFixed(4), z: +t.z.toFixed(4),
      vacia: !isFinite(t.x) || t.x === 0 && t.y === 0 && t.z === 0 });
  }
  return out;
});
const OBJ = 0.165 * 0.62;
r.forEach(x => {
  if (x.error) { console.log(String(x.id).padEnd(10), x.pieza.padEnd(16), 'ERROR', x.error); return; }
  const mayor = Math.max(x.x, x.y, x.z) || 1;
  const esc = OBJ / mayor;
  const alerta = (!isFinite(esc) || esc > 3 || x.vacia) ? '  ← SOSPECHOSA' : '';
  console.log(String(x.id).padEnd(10), x.pieza.padEnd(16), `mallas ${String(x.mallas).padStart(3)}`,
    `caja ${x.x} × ${x.y} × ${x.z}`, `→ escala ${esc.toFixed(2)}`, alerta);
});
await b.close();
