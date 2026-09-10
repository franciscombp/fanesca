/* ¿El carrusel de días responde AL DEDO? Se prueba deslizar adelante
   y atrás con toques de verdad desde una página intermedia, y que un
   deslizamiento no acabe abriendo un mesón sin querer. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const rec = { ms: 30000, cucharas: 3 };
const LUNES = ['maiz-1-introduccion', 'habas-1-facil', 'maiz-2-cascada', 'chochos-1-facil', 'frejol-1-facil', 'maiz-3-gusanito', 'arveja-1-facil', 'melloco-1-facil'];
const MARTES = ['escoger-1-facil', 'col-1-facil', 'maiz-4-dos'];
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'semana', diasVistos: ['lunes'], mejores: Object.fromEntries([...LUNES, ...MARTES].map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));
await p.click('#btn-empezar'); await p.waitForTimeout(1000);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
const desliza = async (x, y, dx, pasos = 12) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  for (let i = 1; i <= pasos; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(Math.round(x + dx * i / pasos), y)] }); await p.waitForTimeout(16); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(800);
};
const pag = () => p.evaluate(() => ({
  t: getComputedStyle(document.querySelector('#mesa-lista')).transform,
  tab: (document.querySelector('.tab--activa') || {}).textContent,
  pantalla: document.querySelector('.screen.active').id,
}));
const vp = await p.evaluate(() => { const r = document.querySelector('#mesa-carrusel').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });

let a = await pag();
console.log('arranque:', JSON.stringify(a));
/* adelante: dedo de derecha a izquierda */
await desliza(vp.x + 130, vp.y, -240);
let r = await pag();
ok('K1 deslizar el dedo pasa al día siguiente', r.t !== a.t && r.pantalla === 'screen-mesa', a.tab + ' → ' + r.tab + ' | ' + r.t);
/* atrás: de izquierda a derecha */
a = r;
await desliza(vp.x - 130, vp.y, 240);
r = await pag();
ok('K2 y deslizando al revés se vuelve al anterior', r.t !== a.t && r.pantalla === 'screen-mesa', a.tab + ' → ' + r.tab + ' | ' + r.t);
/* un deslizamiento no debe abrir un mesón */
ok('K3 deslizar no abre ningún mesón', r.pantalla === 'screen-mesa', r.pantalla);
/* y otro más, para ver que no se traba */
a = r;
await desliza(vp.x + 130, vp.y, -240);
r = await pag();
ok('K4 dos veces seguidas sigue respondiendo', r.t !== a.t, a.t + ' → ' + r.t);
await p.screenshot({ path: 'carrusel.png' });

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 4).forEach(e => console.log('  !', e));
await b.close();
