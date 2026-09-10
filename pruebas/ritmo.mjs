/* ¿ES PESADA LA FERIA, O ES EL CHROMIUM SIN GPU? Se miden los mismos
   dos números (mallas visibles y cuadros por segundo) en la feria y en
   un mesón viejo y probado —el choclo de dos mazorcas— para tener con
   qué comparar. Un número solo no dice nada. */
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

const medir = async (etiqueta) => {
  const c = await p.evaluate(() => {
    let mallas = 0, visibles = 0, tri = 0;
    window.Fanesca.Motor.escena.traverse(o => {
      if (!o.isMesh) return;
      mallas++;
      let v = o.visible, q = o.parent; while (v && q) { v = q.visible; q = q.parent; }
      if (v) { visibles++; const g = o.geometry; if (g && g.index) tri += g.index.count / 3; else if (g && g.attributes.position) tri += g.attributes.position.count / 3; }
    });
    return { mallas, visibles, tri: Math.round(tri) };
  });
  const fps = await p.evaluate(() => new Promise(res => {
    let n = 0; const t = performance.now();
    const f = () => { n++; if (performance.now() - t < 2500) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t) / 1000))); };
    requestAnimationFrame(f);
  }));
  console.log(`${etiqueta.padEnd(24)} mallas ${String(c.mallas).padStart(4)} · visibles ${String(c.visibles).padStart(4)} · triángulos ${String(c.tri).padStart(6)} · ${fps} fps`);
};

/* el mesón viejo y probado */
const t1 = Date.now();
await p.evaluate(() => window.Fanesca.jugar('maiz-6-duro'));
await p.waitForTimeout(3200);
console.log('  montar maiz-6-duro:', Date.now() - t1, 'ms');
await medir('choclo · dos duros');

await p.evaluate(() => document.querySelector('#btn-salir').click());
await p.waitForTimeout(900);
const t2 = Date.now();
await p.evaluate(() => window.Fanesca.arrancarOlla());
await p.waitForTimeout(3200);
console.log('  montar la feria:', Date.now() - t2, 'ms');
await medir('la feria · siete choclos');

/* y el caldero */
for (let i = 0; i < 22; i++) {
  const base = await p.evaluate(() => window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base);
  if (base === 'caldero') break;
  await p.evaluate(() => { window.Fanesca.api.progreso(0, 100); window.Fanesca.api.progreso(100, 100); });
  await p.waitForTimeout(1300);
}
await p.waitForTimeout(800);
await medir('el caldero · 16 cuencos');
await p.screenshot({ path: 'caldero.png' });
await b.close();
