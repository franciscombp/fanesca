/* «A VECES CAMBIA ANTES DE TERMINAR LA ACTIVIDAD DE PELAR».
   Siete de los veinte mesones se dan por hechos antes de acabar el
   ingrediente: la olla pide una parte. No es un fallo, es la receta —
   pero el juego no lo decía y se sentía a que te quitaba el mesón de
   las manos. Aquí se comprueba que ahora lo dice: la regla la primera
   vez, y el «con eso alcanza» en cada corte. */
import { chromium } from 'playwright';
const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'semana', devMode: true, ollaModoJugado: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(600);

await p.evaluate(() => window.Fanesca.arrancarOlla());
await p.waitForTimeout(3000);

/* qué mesones se cortan, según la propia config */
const cortados = await p.evaluate(() => window.Fanesca.Olla.total);
console.log('pasos de la partida:', cortados);

const avisos = [];
const pistas = [];
let vistaRegla = false;
for (let n = 0; n < 20; n++) {
  const info = await p.evaluate(() => {
    const M = window.Fanesca.Olla;
    return M.activo && M.paso ? { base: M.paso.paso.base, porcion: M.paso.paso.porcion ?? 1 } : null;
  });
  if (!info) break;
  /* la pista de arranque, antes de tocar nada */
  const pista = await p.evaluate(() => (document.querySelector('#juego-pista') || {}).textContent || '');
  if (/una parte/i.test(pista)) { vistaRegla = true; pistas.push(info.base); }
  /* darlo por hecho y mirar qué dice el juego */
  await p.evaluate(() => { window.Fanesca.api.progreso(0, 100); window.Fanesca.api.progreso(100, 100); });
  await p.waitForTimeout(500);
  const al = await p.evaluate(() => (document.querySelector('#hud-alerta') || {}).textContent || '');
  if (info.porcion < 1) avisos.push({ base: info.base, alerta: al });
  /* esperar a que el siguiente mesón esté PUESTO. Entre uno y otro
     `paso` es null porque montar es asíncrono; con una espera fija el
     bucle se salía a mitad de partida, y comparando índices se colgaba
     —para cuando se lee, el índice YA avanzó—. Lo que se espera es
     simplemente que vuelva a haber mesón. */
  await p.evaluate(() => new Promise(res => {
    const M = window.Fanesca.Olla;
    const t0 = Date.now();
    const e = setInterval(() => {
      if (!M.activo || M.paso || Date.now() - t0 > 8000) { clearInterval(e); res(); }
    }, 120);
  }));
}

console.log('mesones cortados y lo que dijo el juego al cortarlos:');
avisos.forEach(a => console.log(`   ${a.base.padEnd(10)} → "${a.alerta}"`));

ok('P1 los siete mesones cortados avisan al cortarse',
  avisos.length >= 6 && avisos.every(a => /alcanza/i.test(a.alerta)),
  `${avisos.filter(a => /alcanza/i.test(a.alerta)).length} de ${avisos.length} con aviso`);
ok('P2 y la regla se explica UNA vez, no en cada uno', vistaRegla && pistas.length === 1,
  `salió en: ${pistas.join(', ') || 'ninguno'}`);

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 5).forEach(e => console.log('  !', e));
await b.close();
