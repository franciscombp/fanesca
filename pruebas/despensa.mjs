/* LA DESPENSA, con dedos: que el menú sea la lista de ingredientes,
   que las bolsas se abran de a poco, que dentro de una bolsa estén
   sus niveles, y que la olla cocine lo que hay desde la primera. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
ok('B0 no reventó al cargar', errs.length === 0, errs.slice(0, 3).join(' | '));

await p.click('#btn-empezar'); await p.waitForTimeout(700);

const mesa = await p.evaluate(() => ({
  pantalla: (document.querySelector('.screen.active') || {}).id,
  titulo: (document.querySelector('#mesa-titulo') || {}).textContent,
  sub: (document.querySelector('#mesa-progreso') || {}).textContent,
  bolsas: document.querySelectorAll('#mesa-lista .bolsa').length,
  abiertas: document.querySelectorAll('#mesa-lista .bolsa:not(.bolsa--cerrada)').length,
  primera: (document.querySelector('#mesa-lista .bolsa') || {}).dataset && document.querySelector('#mesa-lista .bolsa').dataset.bolsa,
  nueva: (document.querySelector('#mesa-lista .bolsa--nueva') || {}).dataset?.bolsa,
  dock: (document.querySelector('#btn-sigue') || {}).textContent,
}));
ok('B1 el menú es la lista de ingredientes', mesa.bolsas === 18, mesa.bolsas + ' bolsas');
ok('B2 y arranca con una sola abierta, la más sencilla', mesa.abiertas === 1 && mesa.primera === 'habas', `${mesa.abiertas} abierta · ${mesa.primera}`);
ok('B3 la primera brilla como «empieza aquí»', mesa.nueva === 'habas', mesa.nueva || '(ninguna)');
ok('B4 sin nada hecho, el dock lleva a la primera bolsa', /empezar por/i.test(mesa.dock || ''), (mesa.dock || '').slice(0, 46));
ok('B5 no quedan restos de la semana', !/parada|lunes|martes/i.test(mesa.sub || ''), mesa.sub);

/* entrar a la bolsa de las habas */
await p.evaluate(() => window.Fanesca.abrirBolsa('habas'));
await p.waitForTimeout(600);
const bolsa = await p.evaluate(() => ({
  pantalla: (document.querySelector('.screen.active') || {}).id,
  titulo: (document.querySelector('#bolsa-titulo') || {}).textContent,
  niveles: [...document.querySelectorAll('#bolsa-niveles .renglon')].map(r => r.dataset.id),
  abiertos: document.querySelectorAll('#bolsa-niveles .renglon:not(.renglon--bloqueado)').length,
  dock: (document.querySelector('#bolsa-sigue') || {}).textContent,
}));
ok('B6 la bolsa abre su propia pantalla', bolsa.pantalla === 'screen-bolsa' && /haba/i.test(bolsa.titulo || ''), `${bolsa.pantalla} · ${bolsa.titulo}`);
ok('B7 con los niveles de ESE ingrediente', bolsa.niveles.length === 2 && bolsa.niveles.every(id => id.startsWith('habas')), bolsa.niveles.join(', '));
ok('B8 y sólo el primero abierto', bolsa.abiertos === 1, bolsa.abiertos + ' abierto(s)');

/* el choclo: la feria de primero, y dieciocho peldaños */
const choclo = await p.evaluate(() => {
  const F = window.Fanesca;
  return F.ruta.filter(n => n.bolsa === 'maiz').map(n => n.id);
});
ok('B9 el choclo empieza por escoger en la feria', choclo[0] === 'feria-1-escoger', choclo.slice(0, 4).join(', '));
ok('B10 y es la bolsa honda: dieciocho niveles', choclo.length === 18, choclo.length + ' niveles');

/* jugar el básico de las habas y ver que abre la siguiente bolsa */
await p.evaluate(() => window.Fanesca.jugar('habas-1-facil'));
await p.waitForTimeout(2600);
await p.evaluate(() => window.Fanesca.api.completar());
await p.waitForTimeout(1600);
const trasListo = await p.evaluate(() => ({
  seguir: (document.querySelector('#listo-seguir') || {}).textContent,
  abierto: document.querySelector('#modal-listo') && document.querySelector('#modal-listo').classList.contains('open'),
}));
ok('B11 al terminar el básico, el botón anuncia la bolsa nueva',
  trasListo.abierto && /se abrió/i.test(trasListo.seguir || ''), `${trasListo.abierto ? '' : '(no abrió) '}${trasListo.seguir}`);

await p.evaluate(() => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); window.Fanesca.mostrar('mesa'); });
await p.waitForTimeout(700);
const mesa2 = await p.evaluate(() => ({
  titulo: (document.querySelector('#mesa-titulo') || {}).textContent,
  sub: (document.querySelector('#mesa-progreso') || {}).textContent,
  abiertas: document.querySelectorAll('#mesa-lista .bolsa:not(.bolsa--cerrada)').length,
  dock: (document.querySelector('#btn-sigue') || {}).textContent,
  sabidas: document.querySelectorAll('#mesa-lista .bolsa--sabida, #mesa-lista .bolsa--completa').length,
}));
ok('B12 la bolsa siguiente queda abierta', mesa2.abiertas === 2, mesa2.abiertas + ' abiertas');
ok('B13 y con UN ingrediente ya hay plato que cocinar',
  /habas/i.test(mesa2.titulo || '') && /cocinar/i.test(mesa2.dock || ''), `${mesa2.titulo} · ${(mesa2.dock || '').slice(0, 40)}`);
ok('B14 la cabecera dice qué falta para el plato siguiente',
  /te falta/i.test(mesa2.sub || ''), mesa2.sub);

/* la olla de verdad, con un solo ingrediente */
const pasos = await p.evaluate(() => {
  const F = window.Fanesca;
  return F.pasosDeLaOlla().map(x => x.base);
});
ok('B15 la olla arma sus pasos con lo que hay', pasos.length === 2 && pasos[0] === 'habas' && pasos[1] === 'caldero', pasos.join(' → '));
ok('B16 sin choclo no hay feria', !pasos.includes('feria'), pasos.join(' → '));

/* y con los dieciocho, la partida entera */
const completa = await p.evaluate(() => {
  const F = window.Fanesca;
  return F.pasosDeLaOlla(F.ORDEN_BOLSAS).map(x => x.base);
});
ok('B17 con la despensa llena son los veinte pasos de siempre',
  completa.length === 20 && completa[0] === 'feria' && completa[completa.length - 1] === 'guarnicion',
  completa.length + ' pasos');

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 8).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) || errs.length ? 1 : 0);
