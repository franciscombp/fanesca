/* EL CALDERO, con dedos: equivocarse a propósito, echar los dieciséis
   en orden y revolver. Se juega DENTRO del modo — montarlo a mano deja
   `modActual` en null y el primer toque dispara la red de seguridad de
   main.js, que devuelve a la mesa. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const W = 390, H = 844;

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', devMode: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(600);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x: Math.round(x), y: Math.round(y), id: 1 });
const arrastrar = async (x0, y0, x1, y1, pasos = 10) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x0, y0)] });
  await p.waitForTimeout(22);
  for (let i = 1; i <= pasos; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(x0 + (x1 - x0) * i / pasos, y0 + (y1 - y0) * i / pasos)] });
    await p.waitForTimeout(12);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(340);
};
const hud = () => p.evaluate(() => ({
  barra: (document.querySelector('#hud-barra') || {}).style.width,
  fallos: (document.querySelector('#hud-fallos') || {}).textContent,
  alerta: (document.querySelector('#hud-alerta') || {}).textContent,
  tarea: (document.querySelector('#hud-tarea') || {}).textContent,
}));

await p.evaluate(() => window.Fanesca.arrancarOlla());
await p.waitForTimeout(2800);
/* Entre un mesón y el siguiente hay una carga asíncrona y ahí
   `Olla.paso` es null. Con un número fijo de vueltas, cada hueco se
   comía una y en el renderizador por software nunca se llegaba al
   caldero: hay que ESPERAR a que haya paso, no gastar la vuelta. */
for (let vuelta = 0; vuelta < 60; vuelta++) {
  const base = await p.evaluate(() => window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base);
  if (base === 'caldero') break;
  if (!base) { await p.waitForTimeout(400); continue; }
  await p.evaluate(() => { window.Fanesca.api.progreso(0, 100); window.Fanesca.api.progreso(100, 100); });
  await p.waitForTimeout(700);
}
await p.waitForTimeout(1400);
ok('C0 se llega al caldero', await p.evaluate(() => window.Fanesca.Olla.paso.paso.base === 'caldero'));

const donde = () => p.evaluate(() => {
  const F = window.Fanesca; const out = {};
  F.Motor.escena.traverse(o => {
    if (o.userData && o.userData.tipo === 'cuenco') {
      const v = o.position.clone(); v.y += 0.12;
      const s = F.Motor.proyectar(v);
      out[o.userData.ing] = { x: Math.round(s.x), y: Math.round(s.y) };
    }
  });
  return out;
});
const sitios = await donde();
const lista = Object.entries(sitios);
ok('C1 hay dieciséis cuencos', lista.length === 16, lista.length + ' cuencos');
const fuera = lista.filter(([, c]) => c.x < 22 || c.x > W - 22 || c.y < 110 || c.y > H - 90);
ok('C2 y todos caben en pantalla', fuera.length === 0, JSON.stringify(fuera));

const olla = await p.evaluate(() => {
  const F = window.Fanesca;
  let v = null;
  F.Motor.escena.traverse(o => { if (!v && o.userData && o.userData.tipo === 'cuenco') v = o.position.clone(); });
  v.set(0, F.Motor.MESA_Y + 0.34, -0.05);
  const s = F.Motor.proyectar(v);
  return { x: Math.round(s.x), y: Math.round(s.y) };
});
ok('C3 la olla cae dentro de la pantalla', olla.x > 20 && olla.x < W - 20 && olla.y > 100 && olla.y < H - 100, JSON.stringify(olla));

const orden = await p.evaluate(() => window.Fanesca.ORDEN_OLLA.map(o => o.id));

/* equivocarse a propósito: el ÚLTIMO de la receta, echado el primero */
await arrastrar(sitios[orden[15]].x, sitios[orden[15]].y, olla.x, olla.y);
let h = await hud();
ok('C4 echar fuera de turno rebota y explica por qué',
  parseFloat(h.barra) === 0 && (h.alerta || '').length > 24, JSON.stringify({ barra: h.barra, alerta: h.alerta }));
ok('C5 y lo cobra como descuido', /✗ [1-9]/.test(h.fallos || ''), h.fallos);

/* ahora los dieciséis en su orden, buscando el cuenco cada vez
   (rebotan de vuelta a su sitio, así que las posiciones valen) */
let echados = 0;
for (const id of orden) {
  const c = (await donde())[id];
  if (!c) { console.log('  falta el cuenco de', id); break; }
  await arrastrar(c.x, c.y, olla.x, olla.y, 8);
  /* la cuenta se le pregunta AL NIVEL, no a la barra: al entrar el
     último el modo ya cambió de mesón y la barra volvió a cero */
  const n = await p.evaluate(() => window.__caldero ? window.__caldero.echados : -1);
  /* -1 = el mesón ya se descargó, y eso sólo pasa cuando la olla se
     armó entera: el último entró y el modo pasó al plato */
  if (n === -1) { echados = 16; break; }
  if (n <= echados) { console.log('  no entró:', id, '(echados', n + ')'); break; }
  echados = n;
  if (await p.evaluate(() => !window.Fanesca.Olla.activo || !window.Fanesca.Olla.paso || window.Fanesca.Olla.paso.paso.base !== 'caldero')) break;
}
ok('C6 los dieciséis entran en el orden de la receta', echados >= 16, echados + ' de 16');
await p.waitForTimeout(2200);
const tras = await p.evaluate(() => window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base);
ok('C7 y la olla armada pasa al plato', tras === 'huevo', 'ahora: ' + tras);

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
