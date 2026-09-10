/* LA FERIA, sola y con cronómetro: cuánto tarda en armarse, a qué
   ritmo va el mesón, y qué pasa al llevarse los choclos. Va aparte
   porque el mesón de siete choclos con hoja es lo más pesado que se
   ha armado en este juego y hay que MEDIRLO, no suponerlo. */
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
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'semana', devMode: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(600);

const cdp = await p.context().newCDPSession(p);
const pt = (x, y) => ({ x: Math.round(x), y: Math.round(y), id: 1 });
const tap = async (x, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x, y)] });
  await p.waitForTimeout(40);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(380);
};
const arrastrar = async (x0, y0, x1, y1, pasos = 10) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt(x0, y0)] });
  await p.waitForTimeout(25);
  for (let i = 1; i <= pasos; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [pt(x0 + (x1 - x0) * i / pasos, y0 + (y1 - y0) * i / pasos)] });
    await p.waitForTimeout(14);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await p.waitForTimeout(420);
};

const t0 = Date.now();
await p.evaluate(() => window.Fanesca.arrancarOlla());
await p.waitForTimeout(3000);
console.log('  arrancar + montar la feria:', Date.now() - t0, 'ms (con 3 s de espera dentro)');

const cuenta = await p.evaluate(() => {
  let mallas = 0, visibles = 0;
  window.Fanesca.Motor.escena.traverse(o => { if (o.isMesh) { mallas++; let v = o.visible, q = o.parent; while (v && q) { v = q.visible; q = q.parent; } if (v) visibles++; } });
  return { mallas, visibles };
});
console.log('  mallas en escena:', cuenta.mallas, '· visibles:', cuenta.visibles);
ok('P1 el puesto no pasa de 500 mallas visibles', cuenta.visibles < 500, cuenta.visibles + ' visibles');

/* ritmo real: cuántos cuadros en dos segundos */
const fps = await p.evaluate(() => new Promise(res => {
  let n = 0; const t = performance.now();
  const f = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(f); else res(Math.round(n / ((performance.now() - t) / 1000))); };
  requestAnimationFrame(f);
}));
console.log('  fps (chromium por software, sin GPU):', fps);

const choclos = await p.evaluate(() => {
  const F = window.Fanesca; const out = [];
  F.Motor.escena.traverse(o => {
    if (o.userData && o.userData.tipo === 'choclo') {
      const v = o.position.clone(); v.y += 0.12;
      const s = F.Motor.proyectar(v);
      out.push({ i: o.userData.i, x: Math.round(s.x), y: Math.round(s.y) });
    }
  });
  return out.sort((a, c) => a.i - c.i);
});
ok('P2 seis choclos', choclos.length === 6, choclos.map(c => `${c.x},${c.y}`).join(' '));
/* con margen para el cuerpo del choclo, no solo el centro */
const fuera = choclos.filter(c => c.x < 40 || c.x > W - 40 || c.y < 110 || c.y > H - 90);
ok('P3 todos con su cuerpo dentro de la pantalla', fuera.length === 0, JSON.stringify(fuera));

await p.screenshot({ path: 'feria.png' });

/* llevarse choclos hasta llenar el canasto o agotar el puesto */
const batea = await p.evaluate(() => window.Fanesca.puntos().batea);
let vueltas = 0;
for (const c of choclos) {
  vueltas++;
  await arrastrar(c.x, c.y, batea.x, batea.y);
  const sigue = await p.evaluate(() => {
    const M = window.Fanesca.Olla;
    return M.activo && M.paso && M.paso.paso.base === 'feria';
  });
  if (!sigue) break;
}
/* entre un mesón y el siguiente hay un hueco en que `paso` es null:
   montar es asíncrono. Se espera a que el siguiente esté puesto. */
await p.waitForTimeout(2600);
const estado = await p.evaluate(() => ({
  activo: window.Fanesca.Olla.activo,
  indice: window.Fanesca.Olla.indice,
  base: window.Fanesca.Olla.paso && window.Fanesca.Olla.paso.paso.base,
  fallos: (document.querySelector('#hud-fallos') || {}).textContent,
  tarea: (document.querySelector('#hud-tarea') || {}).textContent,
}));
ok('P4 el canasto se llena y el modo pasa de mesón', estado.base && estado.base !== 'feria', `${vueltas} arrastres · paso ${estado.indice}: ${estado.base} · ${estado.fallos}`);

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 6).forEach(e => console.log('  !', e));
await b.close();
