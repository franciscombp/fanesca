/* LO QUE LE PASA AL JUGADOR DE VERDAD: tiene la app guardada con una
   versión anterior (service worker incluido), se publica una nueva y
   él vuelve a abrir. Aquí NO se limpia nada —ni cachés, ni el aviso
   de actualizar, ni el guardado— porque eso es justo lo que las
   pruebas de siempre borraban y por eso nunca vieron este caso.
   Se prueba lo que él toca: una ficha del recetario y el play de
   El Apuro. */
import { chromium } from 'playwright';

const PUERTO = process.env.PUERTO || '8901';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
/* un contexto persistente no hace falta: basta con no borrar nada */
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message + ' | ' + (e.stack || '').split('\n')[1]));
p.on('console', m => { if (m.type() === 'error' && !/CONNECTION|fonts/i.test(m.text())) errs.push('CONSOLE: ' + m.text().slice(0, 200)); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const U = `http://localhost:${PUERTO}/index.html`;
const rec = { ms: 30000, cucharas: 3 };
/* cinco bolsas sabidas: hay despensa y El Apuro pasa su corte de tres */
const HECHOS = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil', 'feria-1-escoger'];

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x, y, id: 1 });
const tap = async (x, y, esp = 400) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(70);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(esp);
};
/* qué hay DEBAJO del dedo en ese punto: si algo tapa, aquí se ve */
const quienRecibe = (x, y) => p.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cadena = [];
  for (let e = el; e && cadena.length < 4; e = e.parentElement) cadena.push(e.id ? '#' + e.id : (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName));
  return { el: cadena[0], cadena: cadena.join(' < ') };
}, [x, y]);

/* ---- 1 · la versión VIEJA queda instalada, con partida ---- */
await p.goto(U, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(1200);
await p.evaluate((s) => localStorage.setItem('fanesca_v1', JSON.stringify(s)),
  { vistoPortada: true, mapa: 'bolsas', apuroJugado: true, mejores: Object.fromEntries(HECHOS.map(id => [id, rec])) });
/* que el service worker termine de guardarse todo */
await p.evaluate(() => navigator.serviceWorker.ready);
await p.waitForTimeout(2500);
let r = await p.evaluate(async () => ({
  version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?',
  sw: !!navigator.serviceWorker.controller,
  cachés: (await caches.keys()),
}));
console.log('instalada la versión vieja:', JSON.stringify(r));

/* ---- 2 · se publica la nueva encima y el jugador vuelve ---- */
console.log('… esperando a que se publique la versión nueva');
await p.waitForTimeout(9000);
await p.reload({ waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);
r = await p.evaluate(async () => ({
  version: typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?',
  sw: !!navigator.serviceWorker.controller,
  cachés: (await caches.keys()),
  aviso: !!document.querySelector('.aviso-actualizar'),
  modales: [...document.querySelectorAll('.modal')].map(m => m.className),
  pantalla: (document.querySelector('.screen.active') || {}).id,
}));
console.log('tras volver a abrir:', JSON.stringify(r));

/* la nota de versión: tiene que poder cerrarse con el dedo, sin
   desplazar nada. Es lo que dejaba al jugador encerrado. */
const nota = await p.evaluate(() => {
  const m = document.querySelector('.modal.open');
  if (!m) return null;
  const x = m.querySelector('.nota-version-x');
  const okb = m.querySelector('.nota-version-ok');
  const r = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2), dentro: b.top >= 0 && b.bottom <= innerHeight }; };
  return { x: x ? r(x) : null, ok: okb ? r(okb) : null };
});
console.log('la nota de versión:', JSON.stringify(nota));
ok('U0 la nota de versión se puede cerrar sin desplazar', !nota || (nota.ok && nota.ok.dentro) || (nota.x && nota.x.dentro), JSON.stringify(nota));
if (nota && nota.ok && nota.ok.dentro) {
  await tap(nota.ok.x, nota.ok.y, 600);
  const queda = await p.evaluate(() => !!document.querySelector('.modal.open'));
  ok('U0b y al tocarlo se va', !queda, String(queda));
}

/* la portada: entrar al recetario */
const emp = await p.evaluate(() => { const e = document.querySelector('#btn-empezar'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
if (emp) { await tap(emp.x, emp.y, 1200); }
r = await p.evaluate(() => (document.querySelector('.screen.active') || {}).id);
ok('U1 desde la portada se llega a la despensa', r === 'screen-mesa', r + ' | ' + JSON.stringify(await quienRecibe(emp.x, emp.y)));

/* ---- 3 · tocar una bolsa de la despensa ---- */
const ficha = await p.evaluate(() => {
  const f = [...document.querySelectorAll('#mesa-lista .bolsa:not(.bolsa--cerrada)')].find(x => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top > 100 && r.bottom < innerHeight - 60; });
  if (!f) return null;
  const r = f.getBoundingClientRect();
  return { id: f.dataset.bolsa, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
console.log('bolsa a tocar:', JSON.stringify(ficha), '| recibe:', JSON.stringify(ficha && await quienRecibe(ficha.x, ficha.y)));
if (ficha) {
  await tap(ficha.x, ficha.y, 1200);
  r = await p.evaluate(() => (document.querySelector('.screen.active') || {}).id);
  ok('U2 tocar una bolsa abre sus niveles', r === 'screen-bolsa', r + ' | recibe: ' + JSON.stringify(await quienRecibe(ficha.x, ficha.y)));
  if (r === 'screen-bolsa') { await p.evaluate(() => document.querySelector('#bolsa-volver').click()); await p.waitForTimeout(900); }
} else ok('U2 hay una bolsa que tocar', false, 'ninguna a la vista');

/* ---- 4 · el play de El Apuro ----
   vive al pie de la despensa: hay que bajar hasta él, como baja el
   jugador */
await p.evaluate(() => { const s = document.querySelector('.scroll--despensa'); if (s) s.scrollTop = s.scrollHeight; });
await p.waitForTimeout(700);
const apuro = await p.evaluate(() => {
  const e = document.querySelector('#btn-apuro');
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), oculto: e.classList.contains('hidden'), caja: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] };
});
console.log('botón del Apuro:', JSON.stringify(apuro));
if (apuro && !apuro.oculto && apuro.caja[3] > 0) {
  console.log('recibe el toque:', JSON.stringify(await quienRecibe(apuro.x, apuro.y)));
  await tap(apuro.x, apuro.y, 3200);
  r = await p.evaluate(() => ({ activo: window.Fanesca && window.Fanesca.Apuro.activo, pantalla: (document.querySelector('.screen.active') || {}).id, toast: document.querySelector('#toast').textContent }));
  ok('U3 el play de El Apuro arranca la partida', r.activo === true && r.pantalla === 'screen-juego', JSON.stringify(r));
} else ok('U3 el botón de El Apuro está a la vista y se puede tocar', false, JSON.stringify(apuro));

await p.screenshot({ path: 'actualiza.png' });
console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 8).forEach(e => console.log('  !', e));
await b.close();
