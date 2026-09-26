/* PRUEBA DE HUMO del camino principal, para no publicar a ciegas:
   portada → despensa → entrar a una bolsa → jugar su nivel →
   encadenar al siguiente → cuaderno → El Apuro. Toca donde toca un
   dedo y no llama a funciones internas más que para jugar rápido. */
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
/* cinco bolsas sabidas: hay despensa que enseñar, El Apuro abierto
   (pide tres) y una bolsa a medias donde encadenar */
const HECHOS = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil', 'arveja-1-facil', 'feria-1-escoger'];

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'bolsas', apuroJugado: true, mejores: Object.fromEntries(HECHOS.map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));

/* 0 · EL SONIDO SE APAGA EN LA PORTADA, se recuerda y calla de
   verdad. Se cuentan los osciladores que crea el juego: con el
   silencio puesto, abrir la despensa (que suena) no crea ninguno. */
await p.evaluate(() => {
  window.__osc = 0;
  const P = (window.AudioContext || window.webkitAudioContext).prototype;
  const orig = P.createOscillator;
  P.createOscillator = function () { window.__osc++; return orig.call(this); };
});
/* 900 ms y no 200: el juego se traga el click que llega justo detrás
   de un toque (es el antifantasma de `tocable`), y abrir la despensa
   enseguida no probaba nada */
await p.tap('#btn-sonido'); await p.waitForTimeout(900);
const mudo = await p.evaluate(() => ({
  txt: document.querySelector('#btn-sonido').textContent,
  guardado: JSON.parse(localStorage.getItem('fanesca_v1')).silencio,
  osc: window.__osc,
}));
ok('S0 el botón de la portada apaga el sonido y se recuerda', /sin sonido/.test(mudo.txt) && mudo.guardado === true && mudo.osc === 0, JSON.stringify(mudo));
/* y el contrario, que es lo que le da sentido al cero de arriba: al
   encenderlo suena el toque de prueba. Luego se vuelve a apagar. */
await p.tap('#btn-sonido'); await p.waitForTimeout(300);
const suena = await p.evaluate(() => window.__osc);
await p.tap('#btn-sonido'); await p.waitForTimeout(900);
await p.evaluate(() => { window.__osc = 0; });
ok('S0a encenderlo suena, así que el silencio calla algo que sí sonaba', suena > 0, 'osciladores: ' + suena);

/* 1 · la portada abre la despensa */
await p.click('#btn-empezar'); await p.waitForTimeout(900);
const trasAbrir = await p.evaluate(() => ({ osc: window.__osc, pantalla: document.querySelector('.screen.active').id }));
ok('S0b y en silencio abrir la despensa no suena', trasAbrir.pantalla === 'screen-mesa' && trasAbrir.osc === 0, JSON.stringify(trasAbrir));
let r = await p.evaluate(() => ({
  pantalla: document.querySelector('.screen.active').id,
  bolsas: document.querySelectorAll('#mesa-lista .bolsa').length,
  plato: document.querySelector('#mesa-titulo').textContent,
}));
ok('S1 la portada abre la despensa con sus bolsas', r.pantalla === 'screen-mesa' && r.bolsas === 18, JSON.stringify(r));
ok('S1a y la cabecera dice qué se cocina hoy', /sopa|habas|fanesca|crema/i.test(r.plato || ''), r.plato);

/* 1b · NADA TAPA LA DESPENSA. La comprobación que faltaba: quien
   recibe el toque en el centro de una bolsa tiene que ser la bolsa.
   Un modal que no se podía cerrar dejó al jugador tocando en balde
   con todo «funcionando» por debajo. */
r = await p.evaluate(() => {
  const f = [...document.querySelectorAll('#mesa-lista .bolsa')].find(x => { const b = x.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top > 100 && b.bottom < innerHeight - 60; });
  if (!f) return { hay: false };
  const b = f.getBoundingClientRect();
  const el = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
  return { hay: true, id: f.dataset.bolsa, suya: !!(el && el.closest('.bolsa') === f), tapa: el ? (el.id || el.className || el.tagName) : null };
});
ok('S1b el toque sobre una bolsa llega a la bolsa (nada encima)', r.hay && r.suya, JSON.stringify(r));

/* 2 · entrar a una bolsa a medias y ver sus niveles */
await p.evaluate(() => document.querySelector('#mesa-lista .bolsa[data-bolsa="maiz"]').click());
await p.waitForTimeout(900);
r = await p.evaluate(() => ({
  pantalla: document.querySelector('.screen.active').id,
  niveles: document.querySelectorAll('#bolsa-niveles .renglon').length,
  dock: document.querySelector('#bolsa-sigue').textContent,
}));
/* el botón de la bolsa dice el GESTO del nivel —«Cocinar» es de la
   olla— y el del choclo empieza en la feria: «▶ Escoger el choclo» */
ok('S2 la bolsa abre con sus niveles y su botón', r.pantalla === 'screen-bolsa' && r.niveles === 18 && /▶ Escoger/.test(r.dock) && !/cocinar/i.test(r.dock), JSON.stringify(r));

/* 3 · el dock de la bolsa entra al nivel que toca */
await p.evaluate(() => document.querySelector('#bolsa-sigue').click());
await p.waitForTimeout(3200);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id, nivel: window.Fanesca.nivel && window.Fanesca.nivel.id }));
ok('S3 el dock de la bolsa entra al mesón que toca', r.pantalla === 'screen-juego' && !!r.mod, JSON.stringify(r));

/* 4 · terminarlo deja la hoja de «a la olla» */
await p.evaluate(() => { document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
await p.waitForTimeout(200);
await p.evaluate(() => window.Fanesca.api.completar());
await p.waitForTimeout(1400);
r = await p.evaluate(() => ({ modal: document.querySelector('#modal-listo').classList.contains('open'), nombre: document.querySelector('#listo-nombre').textContent, seguir: document.querySelector('#listo-seguir').textContent }));
ok('S4 terminar un nivel abre la hoja con su nombre', r.modal && /a la olla/i.test(r.nombre), JSON.stringify(r));

/* 5 · seguir encadena al peldaño de al lado, dentro de la misma bolsa */
await p.evaluate(() => document.querySelector('#listo-seguir').click());
await p.waitForTimeout(3200);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id, nivel: window.Fanesca.nivel && window.Fanesca.nivel.id }));
ok('S5 «siguiente nivel» encadena dentro de la misma bolsa',
  r.pantalla === 'screen-juego' && !!r.mod && /^(feria|maiz)/.test(r.nivel || ''), JSON.stringify(r));
await p.evaluate(() => document.querySelector('#btn-salir').click()); await p.waitForTimeout(900);
r = await p.evaluate(() => document.querySelector('.screen.active').id);
ok('S6 y salir devuelve a la despensa', r === 'screen-mesa', r);

/* 6 · el cuaderno */
await p.evaluate(() => document.querySelector('#btn-cuaderno').click());
await p.waitForTimeout(900);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, capitulos: document.querySelectorAll('#cuaderno-capitulos .capitulo-portada, #cuaderno-capitulos .pag').length }));
ok('S7 el cuaderno abre con sus capítulos', r.pantalla === 'screen-cuaderno' && r.capitulos > 0, JSON.stringify(r));
await p.evaluate(() => document.querySelector('#cuaderno-volver').click()); await p.waitForTimeout(700);

/* 7 · El Apuro arranca y sirve */
await p.evaluate(() => document.querySelector('#btn-apuro').click());
await p.waitForTimeout(3200);
r = await p.evaluate(() => ({ activo: window.Fanesca.Apuro.activo, pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id }));
ok('S8 El Apuro arranca con un ingrediente montado', r.activo && r.pantalla === 'screen-juego' && !!r.mod, JSON.stringify(r));
await p.evaluate(() => window.Fanesca.Apuro.terminar('salida'));
await p.waitForTimeout(1200);
r = await p.evaluate(() => document.querySelector('#modal-apuro').classList.contains('open'));
ok('S9 y al terminar enseña el resumen', r === true, String(r));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
