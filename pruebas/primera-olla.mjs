/* LA PRIMERA OLLA — la de alguien que acaba de desvainar sus habas.

   Es lo que cocina un jugador nuevo en sus dos primeros minutos: un
   mesón de habas y un caldero con UN cuenco. La olla de dieciséis ya
   tiene su prueba (olla.mjs, caldero.mjs); ésta mira que la chica no
   hable como si fuera la grande — sin fila de faenas que nunca llega a
   la segunda, sin «cada cuenco en su turno» sobre un cuenco, sin
   anunciar «la fanesca» cuando salieron unas habas, y diciendo al
   final qué plato sigue.

   El cuenco se arrastra con el dedo de verdad (CDP), no empujando el
   progreso: es el único gesto de esta olla y tiene que funcionar. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource|ERR_CERT/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const cdp = await p.context().newCDPSession(p);
const toque = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({
    vistoPortada: true, mapa: 'bolsas', holaVisto: true,
    mejores: { 'habas-1-facil': { ms: 30000, cucharas: 3 } },
  }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2400);
await p.evaluate(() => document.querySelectorAll('.aviso-actualizar, .modal.open').forEach(x => x.remove()));
await p.click('#btn-empezar'); await p.waitForTimeout(800);

/* ---- P1/P2: la receta de hoy son las habas, y nada más ---- */
const plan = await p.evaluate(() => {
  const F = window.Fanesca;
  const pasos = F.pasosDeLaOlla();
  const cal = pasos.find(x => x.base === 'caldero');
  return { bases: pasos.map(x => x.base), receta: cal && cal.config.ingredientes, dock: (document.querySelector('#btn-sigue') || {}).textContent };
});
ok('P1 la primera olla son dos pasos: las habas y el caldero', plan.bases.join(',') === 'habas,caldero', plan.bases.join(' → '));
ok('P2 y el caldero lleva un solo cuenco', JSON.stringify(plan.receta) === '["habas"]', JSON.stringify(plan.receta));

await p.evaluate(() => document.querySelector('#btn-sigue').click());

/* el mesón de las habas se da por hecho empujando su cuota entera:
   aquí se prueba la olla, no el desvaine (ése tiene su prueba) */
let base = null;
for (let i = 0; i < 60; i++) {
  base = await p.evaluate(() => window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base);
  if (base === 'caldero') break;
  if (base) await p.evaluate(() => { window.Fanesca.api.progreso(0, 999); window.Fanesca.api.progreso(999, 999); });
  await p.waitForTimeout(250);
}
ok('P3 del desvaine se pasa al caldero', base === 'caldero', base);
/* esperar al MÓDULO y a su cuenco, no a un reloj */
let cuencos = 0;
for (let t = 0; t < 40 && !cuencos; t++) {
  cuencos = await p.evaluate(() => { let n = 0; window.Fanesca.Motor.escena.traverse(o => { if (o.userData && o.userData.tipo === 'cuenco') n++; }); return n; });
  if (!cuencos) await p.waitForTimeout(150);
}
ok('P4 en el mesón hay exactamente un cuenco', cuencos === 1, cuencos + ' cuencos');

await p.waitForTimeout(900);
const hud = await p.evaluate(() => ({
  filaOculta: document.querySelector('#hud-pasos').classList.contains('hidden'),
  fila: document.querySelector('#hud-pasos').textContent.trim(),
}));
ok('P5 sin fila de faenas: un solo cuenco es una sola faena', hud.filaOculta, hud.fila || 'oculta');

/* ---- P6/P7: las faenas salen de la receta ---- */
const faenas = await p.evaluate(async () => {
  const m = (await import('./nivel-caldero.js')).default;
  const txt = (l) => l.map(f => f.txt).join(' + ');
  return {
    uno: txt(m.faenas({ ingredientes: ['habas'] })),
    granos: txt(m.faenas({ ingredientes: ['habas', 'chochos', 'frejol'] })),
    conMani: m.faenas({ ingredientes: ['habas', 'chochos', 'frejol', 'mani'] }),
    todos: txt(m.faenas({})),
    gestoUno: m.gesto({ ingredientes: ['habas'] }),
    gestoVarios: m.gesto({ ingredientes: ['habas', 'chochos'] }),
  };
});
ok('P6 con granos y maní hay dos faenas, y la segunda es el maní',
  faenas.conMani.length === 2 && /maní/i.test(faenas.conMani[1].txt) && faenas.conMani[1].desde > 0.7 && faenas.conMani[1].desde < 0.75,
  faenas.conMani.map(f => `${f.txt}@${f.desde.toFixed(2)}`).join(' + '));
ok('P7 la receta entera conserva sus dos faenas de siempre', faenas.todos === 'Los granos, en orden + Lo del final', faenas.todos);
ok('P8 el gesto de un cuenco nombra lo que se echa, y el de varios es el de la ficha',
  /las habas/.test(faenas.gestoUno || '') && !/en su turno/.test(faenas.gestoUno || '') && faenas.gestoVarios === null,
  (faenas.gestoUno || '').replace(/<[^>]+>/g, ''));

/* ---- P9: el cuenco a la olla, con el dedo ---- */
const pos = await p.evaluate(() => {
  const F = window.Fanesca; const V3 = F.api.BATEA.constructor;
  let c = null; F.Motor.escena.traverse(o => { if (o.userData && o.userData.tipo === 'cuenco') c = o; });
  const s = F.Motor.proyectar(c.getWorldPosition(new V3()));
  const o = F.Motor.proyectar(new V3(0, F.api.MESA_Y + 0.34, -0.05));
  return { s, o };
});
await toque('touchStart', pos.s.x, pos.s.y - 6);
for (let k = 1; k <= 12; k++) {
  await toque('touchMove', pos.s.x + (pos.o.x - pos.s.x) * k / 12, pos.s.y - 6 + (pos.o.y - pos.s.y + 6) * k / 12);
  await p.waitForTimeout(30);
}
await toque('touchEnd');
let aviso = '';
for (let t = 0; t < 20 && !/Ya/.test(aviso); t++) {
  await p.waitForTimeout(80);
  aviso = await p.evaluate(() => document.body.innerText.match(/¡Ya [^!]*!/)?.[0] || '');
}
ok('P9 la olla anuncia el plato de hoy, no la fanesca', /habas cocinadas/.test(aviso) && !/fanesca/i.test(aviso), aviso || 'sin aviso');

/* ---- P10–P13: el resumen ---- */
let fin = null;
for (let t = 0; t < 40; t++) {
  fin = await p.evaluate(() => ({
    abierto: !!document.querySelector('#modal-olla.open'),
    titulo: (document.querySelector('#olla-titulo') || {}).textContent,
    mejor: (document.querySelector('#olla-mejor') || {}).textContent,
    sigue: (document.querySelector('#olla-sigue') || {}).textContent,
    sigueVisible: !!document.querySelector('#olla-sigue:not(.hidden)'),
    logros: JSON.parse(localStorage.getItem('fanesca_v1')).logrosOlla || [],
    record: (JSON.parse(localStorage.getItem('fanesca_v1')).ollas || {}).habas,
  }));
  if (fin.abierto) break;
  await p.waitForTimeout(150);
}
ok('P10 el resumen se titula con el plato', fin.abierto && fin.titulo === '¡Habas cocinadas!', fin.titulo);
ok('P11 el récord es de las habas, no de «tu primera fanesca»', /habas cocinadas/.test(fin.mejor) && !/fanesca/.test(fin.mejor) && !!fin.record, fin.mejor);
ok('P12 y dice qué plato sigue', fin.sigueVisible && /chochos/.test(fin.sigue) && /sopa de granos tiernos/.test(fin.sigue), fin.sigue);
ok('P13 la receta de memoria no se regala con un solo cuenco', fin.logros.includes('primera') && !fin.logros.includes('receta'), fin.logros.join(','));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 8).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) || errs.length ? 1 : 0);
