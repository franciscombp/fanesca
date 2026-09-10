/* ¿RESPONDEN AL DEDO LAS DOS PANTALLAS QUE SE RECORREN?

   El carrusel de días ya no existe: la despensa se BAJA con el pulgar
   y el que se desliza de lado es el cuaderno. Se prueban los dos con
   toques de verdad, y sobre todo lo que rompía antes: que recorrer una
   pantalla NO acabe abriendo algo sin querer. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const rec = { ms: 30000, cucharas: 3 };
const HECHOS = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil',
  'feria-1-escoger', 'maiz-1-introduccion', 'mote-1-tres-aguas'];
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'bolsas', mejores: Object.fromEntries(HECHOS.map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));
await p.click('#btn-empezar'); await p.waitForTimeout(1000);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
const desliza = async (x, y, dx, dy = 0, pasos = 12) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(Math.round(x + dx * i / pasos), Math.round(y + dy * i / pasos))] });
    await p.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(800);
};
const pantalla = () => p.evaluate(() => document.querySelector('.screen.active').id);

/* ---- la despensa se baja con el pulgar ---- */
const caja = await p.evaluate(() => { const r = document.querySelector('.scroll--despensa').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
const alto = await p.evaluate(() => { const s = document.querySelector('.scroll--despensa'); return { arriba: s.scrollTop, hay: s.scrollHeight > s.clientHeight }; });
ok('K0 la despensa tiene más bolsas de las que caben', alto.hay, JSON.stringify(alto));
await desliza(caja.x, caja.y + 160, 0, -260);
let s1 = await p.evaluate(() => document.querySelector('.scroll--despensa').scrollTop);
ok('K1 bajar el pulgar recorre la despensa', s1 > 20, `scrollTop ${alto.arriba} → ${s1}`);
ok('K2 y bajarla NO abre ninguna bolsa', (await pantalla()) === 'screen-mesa', await pantalla());
await desliza(caja.x, caja.y - 120, 0, 260);
const s2 = await p.evaluate(() => document.querySelector('.scroll--despensa').scrollTop);
ok('K3 y se vuelve a subir', s2 < s1, `scrollTop ${s1} → ${s2}`);

/* ---- el cuaderno sí se pasa de lado ---- */
await p.evaluate(() => document.querySelector('#btn-cuaderno').click());
await p.waitForTimeout(1000);
const pag = () => p.evaluate(() => ({
  t: getComputedStyle(document.querySelector('#cuaderno-capitulos')).transform,
  pantalla: document.querySelector('.screen.active').id,
}));
const vp = await p.evaluate(() => { const r = document.querySelector('#cuaderno-carrusel').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
let a = await pag();
await desliza(vp.x + 130, vp.y, -240);
let r = await pag();
ok('K4 deslizar el dedo pasa de página en el cuaderno', r.t !== a.t && r.pantalla === 'screen-cuaderno', a.t + ' → ' + r.t);
a = r;
await desliza(vp.x - 130, vp.y, 240);
r = await pag();
ok('K5 y deslizando al revés se vuelve', r.t !== a.t && r.pantalla === 'screen-cuaderno', a.t + ' → ' + r.t);
a = r;
await desliza(vp.x + 130, vp.y, -240);
r = await pag();
ok('K6 dos veces seguidas sigue respondiendo', r.t !== a.t, a.t + ' → ' + r.t);
await p.screenshot({ path: 'carrusel.png' });

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
