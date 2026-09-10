/* El ritual del modo dev: cinco toques RÁPIDOS en el número de
   versión. Importa porque el manejador de toques nuevo no debe
   tragarse repiques seguidos. Y el atajo ?dev. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
const tap = async (x, y, esp = 160) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(esp);
};

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });

const ver = await p.evaluate(() => { const v = document.querySelector('[data-version]'); const r = v.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), txt: v.textContent }; });
console.log('la versión:', JSON.stringify(ver));
let r = await p.evaluate(() => document.querySelector('#btn-dev').classList.contains('hidden'));
ok('V1 el botón de modo dev nace oculto', r === true, String(r));
/* cinco toques seguidos y rápidos, como los daría un autor */
for (let i = 0; i < 5; i++) await tap(ver.x, ver.y, 170);
r = await p.evaluate(() => document.querySelector('#btn-dev').classList.contains('hidden'));
ok('V2 cinco toques rápidos revelan el modo dev', r === false, 'oculto=' + r);
const bd = await p.evaluate(() => { const e = document.querySelector('#btn-dev'); const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
await tap(bd.x, bd.y, 500);
r = await p.evaluate(() => window.Fanesca.estado.devMode);
ok('V3 y el botón lo enciende', r === true, String(r));

await p.goto(`${SITIO}/index.html?dev=0`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2000);
r = await p.evaluate(() => window.Fanesca.estado.devMode);
ok('V4 ?dev=0 lo apaga', r === false, String(r));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 4).forEach(e => console.log('  !', e));
await b.close();
