/* VOLVER A UNA PARADA YA JUGADA. Antes hacían falta dos toques y el
   primero se perdía cada vez que el dedo resbalaba: la ficha parecía
   muerta. Ahora un toque entra. Se prueba con toques TÁCTILES y sólo
   sobre fichas de verdad en pantalla, desde donde uno vuelve a una
   parada vieja: la página a la vista, la flecha, la pestaña del día.
   Y la carrera: entrar y salir a lo bruto nunca debe dejar la
   pantalla de juego sin mesón (de ahí no se salía tocando fichas). */
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
const tap = async (x, y, espera = 320) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(60);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(espera);
};
const hechasVisibles = () => p.evaluate(() => [...document.querySelectorAll('#mesa-lista .renglon--hecho')]
  .map(f => { const r = f.getBoundingClientRect(); return { id: f.dataset.id, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), dentro: r.left >= 0 && r.right <= innerWidth && r.top >= 100 && r.bottom <= innerHeight - 60 }; })
  .filter(f => f.dentro));
const est = () => p.evaluate(() => ({
  pantalla: document.querySelector('.screen.active').id,
  mod: window.Fanesca.modulo && window.Fanesca.modulo.id,
  nivel: window.Fanesca.nivel && window.Fanesca.nivel.id,
}));
/* salir del mesón de verdad: el botón pide confirmación con faena
   empezada, así que se toca hasta volver a la mesa */
const salir = async () => {
  for (let i = 0; i < 3; i++) {
    await p.evaluate(() => document.querySelector('#btn-salir').click());
    await p.waitForTimeout(700);
    if ((await est()).pantalla === 'screen-mesa') return true;
  }
  return false;
};

/* ---- A · una parada hecha de la página a la vista ---- */
let vis = await hechasVisibles();
console.log('hechas a la vista:', JSON.stringify(vis.map(v => v.id)));
let r;
if (vis.length) {
  await tap(vis[0].x, vis[0].y, 2800);
  r = await est();
  ok('A1 un solo toque en una parada ya jugada entra al mesón', r.pantalla === 'screen-juego' && !!r.mod, vis[0].id + ' → ' + JSON.stringify(r));
  ok('A2 y salir devuelve al recetario', await salir(), JSON.stringify(await est()));
} else ok('A0 hay alguna parada hecha a la vista', false, 'ninguna');

/* ---- B · con la flecha, al día anterior ---- */
const flecha = await p.evaluate(() => { const el = document.querySelector('#mesa-izq'); if (!el || el.classList.contains('hidden')) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
if (flecha) {
  await tap(flecha.x, flecha.y, 700);
  vis = await hechasVisibles();
  ok('B1 la flecha lleva al día anterior y sus fichas están a la vista', vis.length > 0, JSON.stringify(vis.map(v => v.id)).slice(0, 80));
  if (vis.length) {
    await tap(vis[1] ? vis[1].x : vis[0].x, vis[1] ? vis[1].y : vis[0].y, 2800);
    r = await est();
    ok('B2 y una parada vieja entra con un toque', r.pantalla === 'screen-juego' && !!r.mod, JSON.stringify(r));
    ok('B3 y se sale', await salir(), JSON.stringify(await est()));
  }
} else ok('B0 la flecha existe', false, 'no hay #mesa-izq');

/* ---- C · con la pestaña del día ---- */
const tab = await p.evaluate(() => { const t = [...document.querySelectorAll('#dias-tabs .tab')][2]; if (!t) return null; const r = t.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), txt: t.textContent }; });
if (tab) {
  await tap(tab.x, tab.y, 700);
  const t2 = await p.evaluate(() => (document.querySelector('.tab--activa') || {}).textContent);
  ok('C1 la pestaña cambia de día', t2 === tab.txt, tab.txt + ' → ' + t2);
}

/* ---- D · la carrera: entrar y salir a lo bruto ---- */
await p.evaluate(() => { const t = [...document.querySelectorAll('#dias-tabs .tab')][0]; if (t) t.click(); });
await p.waitForTimeout(600);
vis = await hechasVisibles();
let fantasma = null;
for (let v = 0; v < 3 && v < vis.length; v++) {
  /* entrar y salir sin esperar a que el mesón termine de armarse */
  await tap(vis[v].x, vis[v].y, 260);
  await p.evaluate(() => document.querySelector('#btn-salir').click());
  await p.waitForTimeout(900);
  const s = await est();
  if (s.pantalla === 'screen-juego' && !s.mod) { fantasma = s; break; }
  /* si quedó dentro de un mesón, salir en condiciones antes de seguir */
  if (s.pantalla === 'screen-juego') await salir();
  await p.waitForTimeout(300);
}
ok('D1 entrar y salir a lo bruto nunca deja la pantalla de juego sin mesón', !fantasma, fantasma ? JSON.stringify(fantasma) : 'sin fantasmas en 3 vueltas');
r = await est();
if (r.pantalla === 'screen-juego') await salir();
vis = await hechasVisibles();
ok('D2 y al final se puede volver a entrar a una parada', vis.length > 0, JSON.stringify((await est())));
await p.screenshot({ path: 'ficha-mesa.png' });

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
