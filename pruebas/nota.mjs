/* ¿SE PUEDE CERRAR LA NOTA DE VERSIÓN EN UN TELÉFONO? La hoja crece
   con la lista de cambios; si el botón «¡A cocinar!» queda fuera de
   la pantalla, el jugador se queda atrapado detrás de la nota: ve el
   recetario borroso, toca, y no pasa nada. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

for (const [w, h, nombre] of [[390, 844, 'iPhone 14'], [375, 667, 'iPhone SE'], [360, 640, 'Android chico'], [412, 915, 'Pixel']]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  /* como alguien que venía de una versión anterior */
  await p.evaluate(() => { localStorage.setItem('fanesca_version_vista', '2.0.0'); localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'semana', mejores: {} })); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(() => {
    const m = document.querySelector('.modal.open');
    if (!m) return { nota: false };
    const sheet = m.querySelector('.sheet');
    const btn = m.querySelector('.nota-version-ok') || m.querySelector('button');
    const x = m.querySelector('.nota-version-x');
    const rb = btn.getBoundingClientRect(), rs = sheet.getBoundingClientRect();
    const rx = x ? x.getBoundingClientRect() : null;
    return {
      nota: true,
      botonDentro: rb.top >= 0 && rb.bottom <= innerHeight && (!rx || (rx.top >= 0 && rx.bottom <= innerHeight)),
      boton: [Math.round(rb.top), Math.round(rb.bottom)],
      equis: rx ? [Math.round(rx.top), Math.round(rx.bottom)] : null,
      alto: innerHeight,
      hoja: [Math.round(rs.top), Math.round(rs.bottom), Math.round(rs.height)],
      scroll: { top: sheet.scrollTop, alto: sheet.scrollHeight, visible: sheet.clientHeight },
      fondoTocable: rs.top > 8,
      cambios: m.querySelectorAll('li').length,
    };
  });
  console.log(nombre, JSON.stringify(r));
  ok(`N·${nombre}: el botón de cerrar la nota se ve sin desplazar`, r.nota && r.botonDentro, JSON.stringify(r.boton) + ' de ' + r.alto);
  if (w === 390) await p.screenshot({ path: 'nota-version.png' });
  await p.close();
}
console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
await b.close();
