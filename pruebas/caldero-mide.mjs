/* ¿QUÉ SON LOS BULTOS GIGANTES DEL CALDERO? Se monta el mesón solo y
   se listan los objetos de la escena por tamaño, con su nombre y su
   escala: así se ve si son piezas mal normalizadas, restos del nivel
   anterior, o parte de la cocina. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', devMode: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(600);
await p.evaluate(() => window.Fanesca.arrancarOlla());
await p.waitForTimeout(3000);
/* saltar hasta el caldero */
for (let i = 0; i < 22; i++) {
  const base = await p.evaluate(() => window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base);
  if (base === 'caldero') break;
  await p.evaluate(() => { window.Fanesca.api.progreso(0, 100); window.Fanesca.api.progreso(100, 100); });
  await p.waitForTimeout(1250);
}
await p.waitForTimeout(1500);
const r = await p.evaluate(() => {
  const F = window.Fanesca, THREE_BOX = [];
  const escena = F.Motor.escena;
  const out = [];
  escena.traverse(o => {
    if (!o.isMesh) return;
    let v = o.visible, q = o.parent; while (v && q) { v = q.visible; q = q.parent; }
    if (!v) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox;
    /* tamaño en el mundo: la caja local por la escala acumulada */
    o.updateWorldMatrix(true, false);
    const e = new (o.position.constructor)(); o.matrixWorld.decompose(new (o.position.constructor)(), o.quaternion.clone(), e);
    const sx = (bb.max.x - bb.min.x) * Math.abs(e.x);
    const sy = (bb.max.y - bb.min.y) * Math.abs(e.y);
    const sz = (bb.max.z - bb.min.z) * Math.abs(e.z);
    const mayor = Math.max(sx, sy, sz);
    /* de quién cuelga: el ancestro con userData.tipo */
    let padre = o, tipo = '';
    while (padre) { if (padre.userData && padre.userData.tipo) { tipo = padre.userData.tipo + (padre.userData.ing ? ':' + padre.userData.ing : ''); break; } padre = padre.parent; }
    out.push({ n: o.name || '(sin nombre)', tipo, mayor: +mayor.toFixed(3), esc: +e.x.toFixed(3) });
  });
  out.sort((a, c) => c.mayor - a.mayor);
  return { total: out.length, top: out.slice(0, 16) };
});
console.log('mallas visibles:', r.total);
r.top.forEach(x => console.log(String(x.mayor).padStart(8), '·', String(x.n).padEnd(18), 'de', (x.tipo || '—').padEnd(20), 'escala', x.esc));
await p.screenshot({ path: 'caldero.png' });
await b.close();
