/* LOS RETOS DE CADA BOLSA: que se ofrezcan donde pueden ganarse, que
   la cuenta diga la verdad, que caigan al cumplirse y que no se
   pierdan al repetir un nivel peor —que es lo que los convertiría en
   un castigo por volver. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

const cargar = async (save) => {
  await p.evaluate(async (s) => {
    const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
    const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
    localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
  }, save);
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
  await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
  await p.click('#btn-empezar'); await p.waitForTimeout(700);
};

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);

/* ---- R1: la bolsa del queso no ofrece cazagusanos ----
   Cuatro bolsas no traen un solo bicho; prometer ahí ese reto sería
   prometer una casilla que nunca se marca. */
await cargar({ vistoPortada: true, mapa: 'bolsas', despensaVista: true,
  mejores: Object.fromEntries(['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil',
    'feria-1-escoger', 'mote-1-tres-aguas', 'melloco-1-facil', 'escoger-1-facil', 'garbanzo-1-remojado',
    'col-1-facil', 'quinua-1-facil', 'sambo-1-tierno', 'zapallo-1-facil', 'mani-1-facil',
    'bacalao-1-facil', 'queso-1-fresco'].map(id => [id, { ms: 40000, cucharas: 2 }])) });

const retosDe = async (bolsa) => {
  await p.evaluate((x) => window.Fanesca.abrirBolsa(x), bolsa);
  await p.waitForTimeout(500);
  return p.evaluate(() => [...document.querySelectorAll('#bolsa-retos .reto')].map(r => ({
    titulo: r.querySelector('strong').textContent,
    meta: r.querySelector('small').textContent,
    marca: r.querySelector('.reto-marca').textContent,
    hecho: r.classList.contains('reto--hecho'),
  })));
};

let r = await retosDe('queso');
ok('R1 el queso no ofrece cazagusanos (no trae un bicho)',
  !r.some(x => /cazagusanos/i.test(x.titulo)), r.map(x => x.titulo).join(', '));
/* R2: «la bolsa entera» no se ofrece en una bolsa de UN nivel —ahí
   saldría gratis con el primero—. Desde que cada bolsa tiene su
   escalera ya no queda ninguna así en el catálogo, así que la regla
   se prueba directamente contra retos.js con un resumen de juguete:
   que no haya a quién aplicársela hoy no quiere decir que pueda
   romperse sin que nadie se entere. */
const regla = await p.evaluate(async () => {
  const { retosDe, metasDe } = await import('./retos.js');
  const uno = { ...metasDe(1, 1), hechos: 0, tresCucharas: 0, limpios: 0, bichos: 0 };
  const cinco = { ...metasDe(5, 5), hechos: 0, tresCucharas: 0, limpios: 0, bichos: 0 };
  return { uno: retosDe(uno).map(r => r.id), cinco: retosDe(cinco).map(r => r.id) };
});
ok('R2 «la bolsa entera» no se ofrece en una bolsa de un solo nivel',
  !regla.uno.includes('entera') && regla.cinco.includes('entera'),
  `un nivel: ${regla.uno.join(',')} · cinco: ${regla.cinco.join(',')}`);

/* ---- R3: el choclo ofrece los cuatro, con metas de su tamaño ---- */
r = await retosDe('maiz');
ok('R3 el choclo ofrece los cuatro retos', r.length === 4, r.map(x => x.titulo).join(', '));
const rapida = r.find(x => /rápida/i.test(x.titulo));
ok('R4 y la meta sale del tamaño de la bolsa (18 niveles → 9)',
  /9/.test(rapida.meta), rapida.meta);
const entera = r.find(x => /entera/i.test(x.titulo));
ok('R5 «la bolsa entera» pide sus dieciocho', /18/.test(entera.meta), entera.meta);

/* ---- R6: la cuenta dice la verdad ---- */
const caza = r.find(x => /cazagusanos/i.test(x.titulo));
ok('R6 sin bichos salvados, el cazagusanos va en cero', /^0 \//.test(caza.marca), caza.marca);

/* ---- R7: un reto cumplido se ve ganado ----
   Los niveles de la bolsa se leen DEL JUEGO y no se escriben aquí:
   la prueba vieja daba por hecho que las habas tenían dos, y el día
   que la bolsa creció a cinco se quedó midiendo una bolsa que ya no
   existía. */
const habas = await p.evaluate(() => window.Fanesca.ruta.filter(n => n.bolsa === 'habas').map(n => n.id));
await cargar({ vistoPortada: true, mapa: 'bolsas', despensaVista: true,
  mejores: Object.fromEntries(habas.map((id, i) => [id, { ms: 30000 + i * 1000, cucharas: 3, limpio: true, bichos: 2 }])) });
r = await retosDe('habas');
const ganados = r.filter(x => x.hecho).map(x => x.titulo);
ok(`R7 con los ${habas.length} niveles a tres cucharas, limpios y con bichos, caen los cuatro`,
  ganados.length === 4, ganados.join(', '));
const caza2 = r.find(x => /cazagusanos/i.test(x.titulo));
ok('R8 y el cazagusanos cuenta la suma de todos sus niveles',
  caza2 && caza2.hecho, caza2 && caza2.marca);

/* ---- R8b: a medio camino, la cuenta es honesta ---- */
await cargar({ vistoPortada: true, mapa: 'bolsas', despensaVista: true,
  mejores: { [habas[0]]: { ms: 30000, cucharas: 3, limpio: true, bichos: 1 } } });
r = await retosDe('habas');
const rap = r.find(x => /rápida/i.test(x.titulo));
ok('R8b con un nivel de cinco, «mano rápida» dice cuánto falta', rap && !rap.hecho && /^1 \/ 3$/.test(rap.marca), rap && rap.marca);

/* R9 vuelve a la bolsa completa */
await cargar({ vistoPortada: true, mapa: 'bolsas', despensaVista: true,
  mejores: Object.fromEntries(habas.map((id, i) => [id, { ms: 30000 + i * 1000, cucharas: 3, limpio: true, bichos: 2 }])) });

/* ---- R9: la despensa enseña la medalla ---- */
await p.evaluate(() => window.Fanesca.mostrar('mesa'));
await p.waitForTimeout(600);
const medalla = await p.evaluate(() => {
  const f = document.querySelector('#mesa-lista .bolsa[data-bolsa="habas"] .bolsa-medallas');
  return f ? f.textContent : null;
});
ok('R9 la ficha de la despensa enseña cuántos retos lleva', /🏅4/.test(medalla || ''), medalla);

/* ---- R10: lo limpio no se pierde al repetir peor ----
   Un reto que se cae al volver a jugar sería un castigo por volver,
   que es justo lo contrario de lo que estos retos vienen a hacer. */
await cargar({ vistoPortada: true, mapa: 'bolsas', despensaVista: true, mejores: {
  'habas-1-facil': { ms: 30000, cucharas: 3, limpio: true, bichos: 5 },
} });
await p.evaluate(() => window.Fanesca.jugar('habas-1-facil'));
await p.waitForTimeout(2800);
/* se juega SUCIO: un descuido y a la olla */
await p.evaluate(() => { window.Fanesca.api.fallo('prueba', 'un descuido a propósito'); });
await p.waitForTimeout(400);
await p.evaluate(() => window.Fanesca.api.completar());
await p.waitForTimeout(1600);
const guardado = await p.evaluate(() => JSON.parse(localStorage.getItem('fanesca_v1')).mejores['habas-1-facil']);
ok('R10 repetir sucio no borra el «limpio» ya ganado', guardado.limpio === true, JSON.stringify(guardado));
ok('R11 ni los bichos que ya habías salvado', (guardado.bichos || 0) >= 5, JSON.stringify(guardado));
/* un nivel cerrado sin que el reloj corriera dejaba un récord de
   0.0 s, imbatible para siempre. El tiempo sólo cuenta si lo hubo. */
ok('R12 y un cierre sin reloj no escribe un récord de cero', guardado.ms === 30000, 'ms ' + guardado.ms);

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
