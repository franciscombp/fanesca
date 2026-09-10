/* EL DEDO NO ES UN PUNTERO PERFECTO. Un tap humano se mueve unos
   píxeles entre que baja y sube. Aquí se toca una ficha del recetario
   y el botón de El Apuro con desplazamientos crecientes (0,3,6,10,14,
   20 px) y se mira SI LLEGA EL CLICK — el `pressed` se ve siempre,
   que es justo lo que despista: parece que respondió y no hizo nada.
   Se cuenta también qué eventos llegan al botón. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const rec = { ms: 30000, cucharas: 3 };
/* cinco bolsas sabidas: hay despensa con fichas abiertas y El Apuro
   pasa de su corte de tres ingredientes */
const HECHOS = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil', 'feria-1-escoger'];

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'bolsas', apuroJugado: true, mejores: Object.fromEntries(HECHOS.map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(1000);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
/* espía: cuenta los eventos que le llegan al elemento */
const espiar = (sel) => p.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  window.__ev = [];
  ['pointerdown', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'touchcancel', 'click'].forEach(t =>
    el.addEventListener(t, () => window.__ev.push(t), true));
  return true;
}, sel);
const eventos = () => p.evaluate(() => (window.__ev || []).join(','));
/* un tap con deriva: baja, se mueve `d` px y sube */
const tapDeriva = async (x, y, d) => {
  await p.evaluate(() => { window.__ev = []; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(30);
  if (d) {
    /* la deriva de un pulgar: sobre todo hacia abajo y un poco de lado */
    for (let i = 1; i <= 3; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(x + Math.round(d * 0.6 * i / 3), y + Math.round(d * i / 3))] });
      await p.waitForTimeout(16);
    }
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(500);
};
const dondeFicha = () => p.evaluate(() => {
  const f = [...document.querySelectorAll('#mesa-lista .bolsa:not(.bolsa--cerrada)')].find(x => { const b = x.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top > 100 && b.bottom < innerHeight - 60; });
  if (!f) return null;
  const b = f.getBoundingClientRect();
  return { id: f.dataset.bolsa, x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
});
const enBolsa = () => p.evaluate(() => (document.querySelector('.screen.active') || {}).id === 'screen-bolsa');
const volver = async () => { if (await enBolsa()) { await p.evaluate(() => document.querySelector('#bolsa-volver').click()); await p.waitForTimeout(800); } };

/* ---- la ficha de la despensa, con deriva creciente ---- */
console.log('— ficha de la despensa —');
for (const d of [0, 3, 6, 10, 14, 20, 26]) {
  const f = await dondeFicha();
  if (!f) { console.log('  sin ficha a la vista'); break; }
  await espiar(`#mesa-lista .bolsa[data-bolsa="${f.id}"]`);
  await tapDeriva(f.x, f.y, d);
  const ev = await eventos();
  const entro = await enBolsa();
  console.log(`  deriva ${String(d).padStart(2)} px → ${entro ? 'ENTRA' : 'no pasa nada'} | eventos: ${ev}`);
  /* pasados 30 px de recorrido real ya no es un toque sino un
     arrastre, y entonces NO debe abrir: si abriera, bajar la
     despensa con el pulgar entraría en bolsas sin querer. Con la
     deriva en diagonal de esta prueba, 26 px de avance son 30.3 px de
     recorrido: justo al otro lado de la raya. */
  if (d >= 26) ok(`D${d} con ${d} px ya es un arrastre y NO abre nada`, !entro, ev);
  else ok(`D${d} un tap con ${d} px de deriva abre la bolsa`, entro, ev);
  await volver();
}

/* ---- el botón de El Apuro, al pie de la despensa ---- */
console.log('— botón de El Apuro —');
await p.evaluate(() => { const s = document.querySelector('.scroll--despensa'); if (s) s.scrollTop = s.scrollHeight; });
await p.waitForTimeout(600);
for (const d of [0, 6, 14, 22]) {
  const a = await p.evaluate(() => { const e = document.querySelector('#btn-apuro'); if (!e || e.classList.contains('hidden')) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; });
  if (!a) { console.log('  el botón no está'); break; }
  await espiar('#btn-apuro');
  await tapDeriva(a.x, a.y, d);
  const ev = await eventos();
  const arranco = await p.evaluate(() => window.Fanesca.Apuro.activo);
  console.log(`  deriva ${String(d).padStart(2)} px → ${arranco ? 'ARRANCA' : 'no pasa nada'} | eventos: ${ev}`);
  ok(`A${d} un tap con ${d} px de deriva arranca El Apuro`, arranco, ev);
  if (arranco) { await p.evaluate(() => window.Fanesca.Apuro.terminar('salida')); await p.waitForTimeout(900); await p.evaluate(() => document.querySelector('#apuro-salir').click()); await p.waitForTimeout(700); await p.evaluate(() => { const s = document.querySelector('.scroll--despensa'); if (s) s.scrollTop = s.scrollHeight; }); await p.waitForTimeout(600); }
}

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 5).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
