/* LA OLLA — la partida completa, de punta a punta.
   Se entra al modo, se comprueban los cuatro actos y los veinte
   mesones, y se llega al resumen con récord. Los mesones se
   "juegan" empujando api.progreso desde fuera, que es lo único que
   el modo escucha. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const rec = { ms: 30000, cucharas: 3 };
/* LA DESPENSA COMPLETA: la olla cocina lo que se sabe hacer, así que
   para probar la partida entera —los veinte pasos, los cuatro actos—
   hay que llegar con los dieciocho básicos hechos. */
const BASICOS = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil', 'feria-1-escoger',
  'mote-1-tres-aguas', 'melloco-1-facil', 'escoger-1-facil', 'garbanzo-1-remojado', 'col-1-facil',
  'quinua-1-facil', 'sambo-1-tierno', 'zapallo-1-facil', 'mani-1-facil', 'bacalao-1-facil',
  'queso-1-fresco', 'huevo-1-duro', 'guarnicion-1-completa'];

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'bolsas', mejores: Object.fromEntries(BASICOS.map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(900);

/* ---- O1: el botón de cocinar vive al pie de la despensa ---- */
const btn = await p.evaluate(() => {
  const b = document.querySelector('#btn-sigue');
  if (!b || b.classList.contains('hidden')) return null;
  const r = b.getBoundingClientRect();
  return { txt: b.textContent.replace(/\s+/g, ' ').trim(), dentro: r.top > 0 && r.bottom <= innerHeight, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
ok('O1 el botón de cocinar está al pie de la despensa', !!btn, btn ? btn.txt : 'no existe');
ok('O2 con los dieciocho sabidos, ofrece la fanesca servida', btn && /cocinar/i.test(btn.txt) && /fanesca servida/i.test(btn.txt), btn && btn.txt);
ok('O3 y cabe entero en la pantalla', btn && btn.dentro, btn ? JSON.stringify({ dentro: btn.dentro }) : '');

/* ---- entrar al modo con un toque de dedo ---- */
const cdp = await p.context().newCDPSession(p);
const tap = async (x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await p.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 6, y: y + 9, id: 1 }] });
  await p.waitForTimeout(20);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(600);
};
await tap(btn.x, btn.y);
await p.waitForTimeout(2600);
const arranco = await p.evaluate(() => window.Fanesca.Olla.activo);
ok('O4 un toque con deriva arranca la partida', arranco);

/* ---- el cartel del primer acto ---- */
const cartel = await p.evaluate(() => {
  const c = document.querySelector('#acto-cartel');
  return { hubo: !!(c && !c.hidden), nombre: (document.querySelector('#acto-cartel-nombre') || {}).textContent };
});
ok('O5 el acto se anuncia con su cartel', cartel.nombre === 'La feria', JSON.stringify(cartel));

/* ---- el mesón montado es la feria, con choclos ---- */
await p.waitForTimeout(1200);
const feria = await p.evaluate(() => ({
  tarea: (document.querySelector('#hud-tarea') || {}).textContent,
  pct: (document.querySelector('#hud-pct') || {}).textContent,
  reloj: (document.querySelector('#hud-tiempo-n') || {}).textContent,
  paso: window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base,
}));
ok('O6 el primer mesón es la feria', feria.paso === 'feria', JSON.stringify(feria));
ok('O7 el reloj de partida se lee en mm:ss', /^\d+:\d\d$/.test(feria.reloj || ''), feria.reloj);
ok('O8 el HUD dice en qué acto va', /feria/i.test(feria.tarea || ''), feria.tarea);

/* ---- jugar la partida entera empujando el progreso ----
   Cada mesón se da por hecho llamando a api.progreso con su cuota.
   Es lo único que el modo escucha, así que es la prueba honesta de
   que los veinte pasos se encadenan. */
const jugarUno = async () => p.evaluate(() => new Promise(res => {
  const M = window.Fanesca.Olla;
  const antes = M.indice;
  const pa = M.paso;
  if (!pa) return res({ fin: true });
  /* el nivel reporta su total y luego la cuota entera */
  window.Fanesca.api.progreso(0, 100);
  window.Fanesca.api.progreso(100, 100);
  const t0 = Date.now();
  const espera = setInterval(() => {
    if (M.indice !== antes || !M.activo) { clearInterval(espera); res({ de: pa.paso.base, ahora: M.indice, activo: M.activo }); }
    else if (Date.now() - t0 > 9000) { clearInterval(espera); res({ trabado: pa.paso.base, ahora: M.indice }); }
  }, 120);
}));

const recorrido = [];
for (let i = 0; i < 24; i++) {
  const r = await jugarUno();
  if (r.fin) break;
  recorrido.push(r);
  if (r.trabado) { console.log('  TRABADO en', r.trabado); break; }
  if (!r.activo) break;
  await p.waitForTimeout(1500);   /* deja montar el siguiente mesón */
}
console.log('  recorrido:', recorrido.map(r => r.de || ('TRABADO:' + r.trabado)).join(' → '));
ok('O9 la partida recorre los veinte pasos sin trabarse', !recorrido.some(r => r.trabado), recorrido.length + ' pasos');
ok('O10 y llega al final', recorrido.length >= 20, 'llegó a ' + recorrido.length);

/* ---- el resumen ---- */
await p.waitForTimeout(1600);
const fin = await p.evaluate(() => {
  const m = document.querySelector('#modal-olla');
  return {
    abierto: !!(m && m.classList.contains('open')),
    tiempo: (document.querySelector('#olla-tiempo') || {}).textContent,
    pie: (document.querySelector('#olla-tiempo-pie') || {}).textContent,
    mejor: (document.querySelector('#olla-mejor') || {}).textContent,
    actos: [...document.querySelectorAll('#olla-actos .olla-acto')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
    logros: document.querySelectorAll('#olla-logros .logro').length,
    cucharas: document.querySelectorAll('#olla-cucharas .cuchara.llena').length,
    /* el récord es POR PLATO desde que la olla cocina lo que hay: con
       los dieciocho sabidos, el plato es 'servida' */
    guardado: (JSON.parse(localStorage.getItem('fanesca_v1') || '{}').ollas || {}).servida,
  };
});
ok('O11 se abre el resumen de la partida', fin.abierto);
ok('O12 con el tiempo total en mm:ss', /^\d+:\d\d$/.test(fin.tiempo || ''), fin.tiempo);
ok('O13 con las cuatro marcas por acto', fin.actos.length === 4, JSON.stringify(fin.actos));
ok('O14 y guarda el récord del plato', !!(fin.guardado && fin.guardado.ms > 0), JSON.stringify(fin.guardado && { ms: fin.guardado.ms, cucharas: fin.guardado.cucharas }));
ok('O15 la escalera de logros está entera', fin.logros === 8, fin.logros + ' logros');
console.log('  mejor:', fin.mejor, '| pie:', fin.pie);

/* ---- segunda partida: las marcas se comparan contra el récord ---- */
await p.evaluate(() => document.querySelector('#olla-salir').click());
await p.waitForTimeout(900);
const conRecord = await p.evaluate(() => {
  const b = document.querySelector('#btn-sigue');
  return b ? b.textContent.replace(/\s+/g, ' ').trim() : null;
});
ok('O16 el botón enseña el récord al volver', /récord/i.test(conRecord || ''), conRecord);

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 8).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
