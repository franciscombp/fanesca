/* LO QUE SE ENSEÑA NO INTERRUMPE. Después de probarlo con gente se
   sacó el texto largo de en medio del juego: la hoja de listo sólo
   avisa de que hay página nueva, la pantalla de error sí cuenta algo,
   y el cuaderno guarda todo entero. Esta prueba comprueba las tres. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'semana' }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(700);

/* --- terminar una parada: la hoja de listo no puede traer un ensayo --- */
await p.evaluate(() => window.Fanesca.jugar('maiz-1-introduccion'));
await p.waitForTimeout(3400);
await p.evaluate(() => { window.Fanesca.api.progreso(1, 10); window.Fanesca.api.completar(); });
await p.waitForTimeout(1400);
const listo = await p.evaluate(() => {
  const m = document.querySelector('#modal-listo');
  const nota = document.querySelector('#listo-nota');
  const hoja = m ? m.querySelector('.sheet') : null;
  return {
    abierto: !!(m && m.classList.contains('open')),
    hayNota: !!(nota && !nota.classList.contains('hidden')),
    titulo: (document.querySelector('#listo-nota-titulo') || {}).textContent,
    /* cuánto texto trae la hoja: antes venía un párrafo de historia y
       una cita, que es lo que nadie leía */
    palabras: hoja ? hoja.textContent.trim().split(/\s+/).length : -1,
    tarjetaVieja: !!document.querySelector('#listo-tarjeta'),
    alto: hoja ? Math.round(hoja.getBoundingClientRect().height) : -1,
  };
});
ok('D1 la hoja de listo se abre', listo.abierto);
ok('D2 y ya no trae la tarjeta de historia', !listo.tarjetaVieja);
ok('D3 sino un renglón que avisa de la página nueva', listo.hayNota && (listo.titulo || '').length > 4, listo.titulo);
ok('D4 y cabe en la pantalla sin desplazarse', listo.alto > 0 && listo.alto < 800, listo.alto + ' px de alto');
console.log('  palabras en la hoja:', listo.palabras);

/* --- el toque en el renglón lleva al cuaderno --- */
await p.evaluate(() => document.querySelector('#listo-nota').click());
await p.waitForTimeout(1100);
const cuad = await p.evaluate(() => ({
  pantalla: (document.querySelector('.screen.active') || {}).id,
  paginas: document.querySelectorAll('#cuaderno-capitulos .pag').length,
  ingredientes: [...document.querySelectorAll('.capitulo-titulo')].some(h => h.textContent === 'Los ingredientes'),
  orden: [...document.querySelectorAll('.capitulo-titulo')].some(h => h.textContent === 'El orden de la olla'),
  razones: document.querySelectorAll('.orden-olla li').length,
}));
ok('D5 el renglón lleva derecho al cuaderno', cuad.pantalla === 'screen-cuaderno', cuad.pantalla);
ok('D6 con la página de los ingredientes ganados', cuad.ingredientes, cuad.paginas + ' páginas');
ok('D7 y el orden de la olla, con sus dieciséis razones', cuad.orden && cuad.razones === 16, cuad.razones + ' razones');
/* el texto de la tarjeta del choclo tiene que estar ENTERO ahí */
const texto = await p.evaluate(() => {
  const h = [...document.querySelectorAll('.tarjeta-titulo')].find(x => /choclo/i.test(x.textContent));
  return h ? (h.nextElementSibling || {}).textContent : null;
});
ok('D8 y el texto del ingrediente, entero', !!texto && texto.length > 150, (texto || '').slice(0, 60) + '…');

/* --- la pantalla de error sí cuenta algo --- */
await p.evaluate(() => document.querySelector('#cuaderno-volver').click());
await p.waitForTimeout(800);
await p.evaluate(() => window.Fanesca.jugar('maiz-1-introduccion'));
await p.waitForTimeout(3400);
await p.evaluate(() => { window.Fanesca.api.progreso(1, 10); window.Fanesca.api.arruinar({ clave: 'aplastado', titulo: 'Lo aplastaste', texto: 'El gusanito reventó encima de la comida.' }); });
await p.waitForTimeout(1600);
const mal = await p.evaluate(() => ({
  abierto: !!(document.querySelector('#modal-arruinado') || {}).classList.contains('open'),
  motivo: (document.querySelector('#arruinado-motivo') || {}).textContent,
  nota: (document.querySelector('#arruinado-nota') || {}).textContent,
  notaVisible: !document.querySelector('#arruinado-nota').classList.contains('hidden'),
}));
ok('D9 la pantalla de «se arruinó» se abre con su motivo', mal.abierto && (mal.motivo || '').length > 20);
ok('D10 y ahí sí cuenta la frase de cocina del ingrediente', mal.notaVisible && (mal.nota || '').length > 40, (mal.nota || '').slice(0, 60) + '…');

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
