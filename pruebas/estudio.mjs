/* FOTOS DE ESTUDIO — herramienta, no prueba (no está en correr.sh).

   Saca herramientas/estudio.html de cerca, una foto por escena, con
   la cocina y la luz del juego. Es para juzgar un modelo —una hoja de
   choclo, una vaina— que en la foto de mesón no se alcanza a ver.

     node pruebas/estudio.mjs <carpeta> [escena ...]
          (por defecto: arveja choclo choclo-medio pelos)

   Con compara.mjs se arma el antes y después. Variables: SITIO, CHROME. */
import { chromium } from 'playwright';
import fs from 'fs';

const DIR = process.argv[2];
if (!DIR) { console.error('uso: node pruebas/estudio.mjs <carpeta> [escena ...]'); process.exit(2); }
const ESCENAS = process.argv.slice(3).length ? process.argv.slice(3) : ['arveja', 'choclo', 'choclo-medio', 'pelos'];
fs.mkdirSync(DIR, { recursive: true });
const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage({ viewport: { width: 720, height: 720 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const info = {};
for (const e of ESCENAS) {
  await p.goto(`${SITIO}/herramientas/estudio.html?escena=${e}`, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => window.listo === true, null, { timeout: 60000 });
  await p.waitForTimeout(300);
  info[e] = await p.evaluate(() => { const i = window.estudio.renderer.info; return { calls: i.render.calls, tris: i.render.triangles }; });
  await p.screenshot({ path: `${DIR}/${e}.png` });
}
console.log(JSON.stringify(info));
if (errs.length) console.log('errores', errs);
await b.close();
