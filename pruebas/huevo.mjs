/* EL HUEVO, CON EL DEDO. Lo que se quejaba el jugador: no se entendía
   cómo sacar la cáscara. Se prueba que:
     H1 · golpecitos con toques lo cuartean
     H2 · al cuartearse, los pedazos se separan y hay uno señalado
     H3 · TOCAR un pedazo lo saca (antes no hacía nada)
     H4 · pasar el dedo por encima va sacando los que roza
     H5 · sin cáscara el huevo se va solo, sin pedir otro toque
     H6 · y la docena entera se termina */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/CONNECTION|fonts|ERR_FAILED/i.test(m.text())) errs.push(m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'semana', devMode: true, mejores: {} }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));
await p.click('#btn-empezar'); await p.waitForTimeout(900);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
const tap = async (x, y, esp = 240) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(50);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(esp);
};
const H = () => p.evaluate(() => { const h = window.__huevo; return h ? { fase: h.fase, hechos: h.hechos, cascos: h.cascos, primero: h.puntoPrimero, huevo: h.puntoHuevo } : null; });

await p.evaluate(() => window.Fanesca.jugar('huevo-1-duro'));
await p.waitForTimeout(2800);
await p.evaluate(() => { document.querySelector('#juego-pista').classList.remove('visible'); const c = document.querySelector('#cortina'); c.classList.remove('abre', 'cierra'); });
let h = await H();
console.log('al empezar:', JSON.stringify(h));
ok('H0 el mesón del huevo abre en la fase de cascar', h && h.fase === 'cascar' && h.cascos === 8, JSON.stringify(h));
await p.screenshot({ path: 'huevo-1-entero.png' });

/* H1 · golpecitos */
for (let i = 0; i < 6; i++) { await tap(h.huevo.x, h.huevo.y, 180); const s = await H(); if (s.fase === 'pelar') break; }
h = await H();
ok('H1 los golpecitos lo cuartean', h.fase === 'pelar', JSON.stringify(h));
await p.screenshot({ path: 'huevo-2-cuarteado.png' });
ok('H2 al cuartearse hay un pedazo señalado en pantalla', !!h.primero, JSON.stringify(h.primero));

/* H3 · TOCAR un pedazo lo saca */
const antes = h.cascos;
await tap(h.primero.x, h.primero.y, 320);
h = await H();
ok('H3 tocar un pedazo saca la cáscara (antes no hacía nada)', h.cascos === antes - 1, `${antes} → ${h.cascos}`);

/* H4 · rascar con el dedo. Se mide por lo HECHO y no por los cascos
   que quedan: rascando bien se acaba el huevo y entra otro con su
   cáscara entera, y entonces «quedan menos» sería mentira. */
const c0 = h.hechos;
const hv = h.huevo;
for (let pasada = 0; pasada < 3 && (await H()).fase === 'pelar'; pasada++) {
  const y = hv.y - 30 + pasada * 30;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(hv.x - 55, y)] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(hv.x - 55 + i * 11, y)] }); await p.waitForTimeout(18); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(200);
}
h = await H();
ok('H4 pasar el dedo por encima va sacando los pedazos', h.hechos > c0 + 2, `hechos ${c0} → ${h.hechos} (fase ${h.fase})`);
await p.screenshot({ path: 'huevo-3-pelando.png' });

/* H5 · sin cáscara se va solo */
await p.evaluate(() => { const h = window.__huevo; for (let i = 0; i < 8 && h.cascos > 0; i++) h.pelar(); });
await p.waitForTimeout(1200);
h = await H();
ok('H5 sin cáscara el huevo se va solo, sin pedir otro toque', h && (h.fase === 'cascar' || h.fase === 'ido'), JSON.stringify(h));

/* H6 · terminar la docena */
for (let n = 0; n < 3 && h; n++) {
  for (let i = 0; i < 30 && (await H())?.fase !== 'cascar'; i++) await p.waitForTimeout(100);
  await p.evaluate(() => { const h = window.__huevo; if (!h) return; for (let i = 0; i < 8 && h.fase === 'cascar'; i++) h.golpear(); for (let i = 0; i < 9 && h.fase === 'pelar'; i++) h.pelar(); });
  await p.waitForTimeout(900);
  h = await H();
  if (!h) break;
}
await p.waitForTimeout(1400);
const r = await p.evaluate(() => ({ modal: document.querySelector('#modal-listo').classList.contains('open'), nombre: document.querySelector('#listo-nombre').textContent }));
ok('H6 la docena se termina y va a la olla', r.modal && /huevo/i.test(r.nombre), JSON.stringify(r));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
