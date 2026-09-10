/* VOLVER A UN NIVEL YA JUGADO. Antes hacían falta dos toques y el
   primero se perdía cada vez que el dedo resbalaba: la ficha parecía
   muerta. Ahora un toque entra. Se prueba con toques TÁCTILES y sólo
   sobre cosas de verdad en pantalla, por los dos caminos que hay para
   volver a un nivel viejo: la bolsa desde la despensa y el renglón
   dentro de la bolsa. Y la carrera: entrar y salir a lo bruto nunca
   debe dejar la pantalla de juego sin mesón (de ahí no se salía). */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/CONNECTION|fonts|ERR_FAILED/i.test(m.text())) errs.push(m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const rec = { ms: 30000, cucharas: 3 };
/* cinco bolsas con progreso, dos de ellas con más de un peldaño: hay
   niveles viejos a los que volver por los dos caminos */
const HECHOS = ['habas-1-facil', 'habas-2-normal', 'chochos-1-facil', 'frejol-1-facil',
  'arveja-1-facil', 'arveja-2-normal', 'feria-1-escoger', 'maiz-1-introduccion'];

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
const tap = async (x, y, espera = 320) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(espera);
};
const centro = (sel) => p.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.top < 100 || r.bottom > innerHeight - 60) return null;
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
}, sel);
/* los renglones ya jugados que están de verdad en pantalla */
const hechosVisibles = () => p.evaluate(() => [...document.querySelectorAll('#bolsa-niveles .renglon--hecho')]
  .map(f => { const r = f.getBoundingClientRect(); return { id: f.dataset.id, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), dentro: r.top >= 100 && r.bottom <= innerHeight - 70 }; })
  .filter(f => f.dentro));
const est = () => p.evaluate(() => ({
  pantalla: document.querySelector('.screen.active').id,
  mod: window.Fanesca.modulo && window.Fanesca.modulo.id,
  nivel: window.Fanesca.nivel && window.Fanesca.nivel.id,
}));
/* salir del mesón de verdad: el botón pide confirmación con faena
   empezada, así que se toca hasta volver a una pantalla de menú */
const enMenu = (s) => s === 'screen-mesa' || s === 'screen-bolsa';
const salir = async () => {
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => document.querySelector('#btn-salir').click());
    await p.waitForTimeout(700);
    if (enMenu((await est()).pantalla)) return true;
  }
  return false;
};

/* ---- A · una bolsa con progreso, desde la despensa ---- */
const bolsa = await centro('#mesa-lista .bolsa[data-bolsa="arveja"]');
let r;
if (bolsa) {
  await tap(bolsa.x, bolsa.y, 900);
  r = await est();
  ok('A1 un toque en una bolsa abre su pantalla', r.pantalla === 'screen-bolsa', JSON.stringify(r));
} else ok('A0 la bolsa de la arveja está a la vista', false, 'no la encuentro');

/* ---- B · un nivel ya jugado, con un solo toque ---- */
let vis = await hechosVisibles();
console.log('niveles hechos a la vista:', JSON.stringify(vis.map(v => v.id)));
if (vis.length) {
  await tap(vis[0].x, vis[0].y, 3000);
  r = await est();
  ok('B1 un solo toque en un nivel ya jugado entra al mesón', r.pantalla === 'screen-juego' && !!r.mod, vis[0].id + ' → ' + JSON.stringify(r));
  ok('B2 y salir devuelve a un menú', await salir(), JSON.stringify(await est()));
} else ok('B0 hay algún nivel hecho a la vista', false, 'ninguno');

/* ---- C · volver a la despensa y entrar a otra bolsa ---- */
const volver = await centro('#bolsa-volver');
if (volver) {
  await tap(volver.x, volver.y, 800);
  r = await est();
  ok('C1 el botón de la bolsa devuelve a la despensa', r.pantalla === 'screen-mesa', JSON.stringify(r));
}
const otra = await centro('#mesa-lista .bolsa[data-bolsa="habas"]');
if (otra) {
  await tap(otra.x, otra.y, 900);
  vis = await hechosVisibles();
  ok('C2 y otra bolsa enseña los suyos', vis.length > 0 && vis.every(v => v.id.startsWith('habas')), JSON.stringify(vis.map(v => v.id)));
}

/* ---- D · la carrera: entrar y salir a lo bruto ---- */
vis = await hechosVisibles();
let fantasma = null;
for (let v = 0; v < 3 && v < vis.length; v++) {
  /* entrar y salir sin esperar a que el mesón termine de armarse */
  await tap(vis[v].x, vis[v].y, 260);
  await p.evaluate(() => document.querySelector('#btn-salir').click());
  await p.waitForTimeout(900);
  const s = await est();
  if (s.pantalla === 'screen-juego' && !s.mod) { fantasma = s; break; }
  if (s.pantalla === 'screen-juego') await salir();
  await p.waitForTimeout(300);
  /* volver a la bolsa si el salir dejó en la despensa */
  if ((await est()).pantalla === 'screen-mesa') {
    const c = await centro('#mesa-lista .bolsa[data-bolsa="habas"]');
    if (c) await tap(c.x, c.y, 800);
  }
  vis = await hechosVisibles();
}
ok('D1 entrar y salir a lo bruto nunca deja la pantalla de juego sin mesón', !fantasma, fantasma ? JSON.stringify(fantasma) : 'sin fantasmas en 3 vueltas');
r = await est();
if (r.pantalla === 'screen-juego') await salir();
ok('D2 y al final se sigue en un menú', enMenu((await est()).pantalla), JSON.stringify(await est()));
await p.screenshot({ path: 'ficha-mesa.png' });

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
