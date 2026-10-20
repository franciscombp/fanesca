/* ANTES | DESPUÉS — herramienta, no prueba.

   Junta dos carpetas de fotos de pruebas/fotos.mjs en una sola imagen,
   una fila por nivel, para mirarlas lado a lado. Sin niveles, toma los
   que estén en las dos carpetas.

     node pruebas/compara.mjs <antes> <después> <salida.png> [nivel ...] */
import { chromium } from 'playwright';
import fs from 'fs';

const [a, b, salida, ...pedidos] = process.argv.slice(2);
if (!salida) { console.error('uso: node pruebas/compara.mjs <antes> <despues> <salida.png> [nivel ...]'); process.exit(2); }
const ids = pedidos.length ? pedidos
  : fs.readdirSync(a).filter(f => f.endsWith('.png') && fs.existsSync(`${b}/${f}`)).map(f => f.slice(0, -4)).sort();
const w = 300, h = Math.round(w * 844 / 390);
const img = (d, id) => (fs.existsSync(`${d}/${id}.png`) ? `data:image/png;base64,${fs.readFileSync(`${d}/${id}.png`).toString('base64')}` : '');
const br = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await br.newPage({ viewport: { width: w * 2 + 10, height: 100 }, deviceScaleFactor: 1 });
await p.setContent('<body style="margin:0;background:#222;font:12px sans-serif;color:#fff">' + ids.map(id =>
  `<div style="display:flex;gap:10px;margin-bottom:6px;position:relative"><img src="${img(a, id)}" style="width:${w}px;height:${h}px"><img src="${img(b, id)}" style="width:${w}px;height:${h}px"><span style="position:absolute;left:4px;top:4px;background:#000a;padding:2px 4px">${id}</span></div>`).join('') + '</body>');
await p.screenshot({ path: salida, fullPage: true });
await br.close();
