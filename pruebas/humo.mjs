/* PRUEBA DE HUMO del camino principal, para no publicar a ciegas:
   portada → recetario → entrar a la parada que toca → terminarla →
   encadenar a la siguiente → cuaderno → El Apuro. Toca donde toca un
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
const LUNES = ['maiz-1-introduccion', 'habas-1-facil', 'maiz-2-cascada', 'chochos-1-facil', 'frejol-1-facil', 'maiz-3-gusanito', 'arveja-1-facil'];

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'semana', apuroJugado: true, mejores: Object.fromEntries(LUNES.map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));

/* 1 · la portada abre el recetario */
await p.click('#btn-empezar'); await p.waitForTimeout(900);
let r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, fichas: document.querySelectorAll('#mesa-lista .renglon').length, marcador: document.querySelector('#mesa-progreso').textContent }));
ok('S1 la portada abre el recetario con sus paradas', r.pantalla === 'screen-mesa' && r.fichas > 40, JSON.stringify(r));

/* 1b · NADA TAPA EL RECETARIO. La comprobación que faltaba: quien
   recibe el toque en el centro de una ficha tiene que ser la ficha.
   Un modal que no se podía cerrar dejó al jugador tocando en balde
   con todo «funcionando» por debajo. */
r = await p.evaluate(() => {
  const f = [...document.querySelectorAll('#mesa-lista .renglon')].find(x => { const b = x.getBoundingClientRect(); return b.left >= 0 && b.right <= innerWidth && b.top > 100 && b.bottom < innerHeight - 60; });
  if (!f) return { hay: false };
  const b = f.getBoundingClientRect();
  const el = document.elementFromPoint(Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2));
  return { hay: true, id: f.dataset.id, suya: !!(el && el.closest('.renglon') === f), tapa: el ? (el.id || el.className || el.tagName) : null };
});
ok('S1b el toque sobre una ficha llega a la ficha (nada encima)', r.hay && r.suya, JSON.stringify(r));

/* 2 · el dock entra a la parada que toca */
await p.evaluate(() => document.querySelector('#btn-sigue').click());
await p.waitForTimeout(3000);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id, nivel: window.Fanesca.nivel && window.Fanesca.nivel.id }));
ok('S2 el dock entra al mesón que toca', r.pantalla === 'screen-juego' && !!r.mod, JSON.stringify(r));

/* 3 · terminarla deja la hoja de «a la olla» */
await p.evaluate(() => { document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
await p.waitForTimeout(200);
await p.evaluate(() => window.Fanesca.api.completar());
await p.waitForTimeout(1200);
r = await p.evaluate(() => ({ modal: document.querySelector('#modal-listo').classList.contains('open'), nombre: document.querySelector('#listo-nombre').textContent, seguir: document.querySelector('#listo-seguir').textContent }));
ok('S3 terminar una parada abre la hoja con su nombre', r.modal && /a la olla/i.test(r.nombre), JSON.stringify(r));

/* 4 · seguir: encadena a la siguiente, o cierra el día si tocaba
   (el cierre de día va a la mesa a propósito, con su escena) */
const cerrabaDia = /Cerrar|mesa/i.test(r.seguir);
await p.evaluate(() => document.querySelector('#listo-seguir').click());
await p.waitForTimeout(3000);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id, dia: document.querySelector('#modal-dia').classList.contains('open') }));
ok(cerrabaDia ? 'S4 al cerrarse el día, «seguir» lleva a la mesa con su escena' : 'S4 «siguiente parada» encadena a otro mesón',
  cerrabaDia ? (r.pantalla === 'screen-mesa' && r.dia) : (r.pantalla === 'screen-juego' && !!r.mod), JSON.stringify(r));
if (cerrabaDia) { await p.evaluate(() => document.querySelector('#dia-seguir').click()); await p.waitForTimeout(700); }
else { await p.evaluate(() => document.querySelector('#btn-salir').click()); await p.waitForTimeout(800); }
r = await p.evaluate(() => document.querySelector('.screen.active').id);
ok('S5 y se vuelve al recetario', r === 'screen-mesa', r);

/* 5 · el cuaderno */
await p.evaluate(() => document.querySelector('#btn-cuaderno').click());
await p.waitForTimeout(900);
r = await p.evaluate(() => ({ pantalla: document.querySelector('.screen.active').id, capitulos: document.querySelectorAll('#cuaderno-capitulos .capitulo-portada, #cuaderno-capitulos .pag').length }));
ok('S6 el cuaderno abre con sus capítulos', r.pantalla === 'screen-cuaderno' && r.capitulos > 0, JSON.stringify(r));
await p.evaluate(() => document.querySelector('#cuaderno-volver').click()); await p.waitForTimeout(700);

/* 6 · El Apuro arranca y sirve */
await p.evaluate(() => document.querySelector('#btn-apuro').click());
await p.waitForTimeout(3200);
r = await p.evaluate(() => ({ activo: window.Fanesca.Apuro.activo, pantalla: document.querySelector('.screen.active').id, mod: window.Fanesca.modulo && window.Fanesca.modulo.id }));
ok('S7 El Apuro arranca con un ingrediente montado', r.activo && r.pantalla === 'screen-juego' && !!r.mod, JSON.stringify(r));
await p.evaluate(() => window.Fanesca.Apuro.terminar('salida'));
await p.waitForTimeout(1200);
r = await p.evaluate(() => document.querySelector('#modal-apuro').classList.contains('open'));
ok('S8 y al terminar enseña el resumen', r === true, String(r));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
