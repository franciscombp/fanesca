/* FOTOS DE MESÓN — herramienta, no prueba (no está en correr.sh).

   Saca una foto de cada nivel pedido tal como lo ve el jugador, con
   las sombras forzadas (en GL por software la guardia de ~33 fps las
   apagaría), y dice lo que le cuesta al motor: llamadas de dibujo y
   triángulos. Es lo que se usó para la auditoría del 3D: antes y
   después, medido.

     node pruebas/fotos.mjs <carpeta> [nivel ...]       (sin niveles: el
                                                        primero de cada bolsa)
     POSE=archivo.js node pruebas/fotos.mjs <carpeta> nivel
                                         (corre ese JS en la página tras
                                          montar, p. ej. abrir las vainas)

   Variables: SITIO (por defecto http://localhost:8899), CHROME. */
import { chromium } from 'playwright';
import fs from 'fs';

const DIR = process.argv[2];
const SOLO = process.argv.slice(3);
if (!DIR) { console.error('uso: node pruebas/fotos.mjs <carpeta> [nivel ...]'); process.exit(2); }
fs.mkdirSync(DIR, { recursive: true });
const SITIO = process.env.SITIO || 'http://localhost:8899';
const POSE = process.env.POSE ? fs.readFileSync(process.env.POSE, 'utf8') : '';
const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_sombras', 'siempre');
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', holaVisto: true, despensaVista: true, devMode: true, versionVista: '9.9.9', bichosVistos: ['gusanito', 'mosca', 'gorgojo'] }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2400);
await p.evaluate(() => document.querySelectorAll('.aviso-actualizar, .modal.open').forEach(x => x.classList.remove('open')));
await p.click('#btn-empezar'); await p.waitForTimeout(700);
const ids = SOLO.length ? SOLO : await p.evaluate(() => {
  const vistos = new Set(); const out = [];
  window.Fanesca.ruta.forEach(n => { if (!vistos.has(n.bolsa + n.base)) { vistos.add(n.bolsa + n.base); out.push(n.id); } });
  return out;
});
const info = {};
for (const id of ids) {
  await p.evaluate((id) => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); window.Fanesca.jugar(id); }, id);
  for (let t = 0; t < 80; t++) {
    if (await p.evaluate(() => !!window.Fanesca.modulo && document.querySelector('.screen.active').id === 'screen-juego')) break;
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout(2600);
  if (POSE) { await p.evaluate(POSE); await p.waitForTimeout(1200); }
  info[id] = await p.evaluate(() => {
    const i = window.Fanesca.Motor.pintor.info;
    return { calls: i.render.calls, tris: i.render.triangles };
  });
  await p.screenshot({ path: `${DIR}/${id}.png` });
  await p.evaluate(() => { const s = document.querySelector('#btn-salir'); if (s) s.click(); });
  await p.waitForTimeout(400);
}
console.log(JSON.stringify(info));
if (errs.length) console.log('errores', errs);
await b.close();
