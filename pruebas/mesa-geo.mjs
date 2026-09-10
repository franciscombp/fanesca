/* ¿dónde está cada cosa en la mesa? Geometría de las páginas, de las
   fichas y del carrusel, para entender por qué un toque no llega. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
const rec = { ms: 30000, cucharas: 3 };
const LUNES = ['maiz-1-introduccion', 'habas-1-facil', 'maiz-2-cascada', 'chochos-1-facil', 'frejol-1-facil', 'maiz-3-gusanito', 'arveja-1-facil', 'melloco-1-facil'];
const MARTES = ['escoger-1-facil', 'col-1-facil', 'maiz-4-dos'];
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async (s) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear(); localStorage.setItem('fanesca_v1', JSON.stringify(s));
}, { vistoPortada: true, mapa: 'bolsas', diasVistos: ['lunes'], mejores: Object.fromEntries([...LUNES, ...MARTES].map(id => [id, rec])) });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));
await p.click('#btn-empezar'); await p.waitForTimeout(1000);

const geo = await p.evaluate(() => {
  const R = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
  const lista = document.querySelector('#mesa-lista');
  const vp = document.querySelector('#mesa-carrusel');
  const pags = [...lista.children].map((pg, i) => ({ i, clase: pg.className.slice(0, 40), caja: R(pg), fichas: pg.querySelectorAll('.renglon').length }));
  const fichas = [...document.querySelectorAll('#mesa-lista .renglon')].slice(0, 12).map(f => ({ id: f.dataset.id, caja: R(f) }));
  const scroll = document.querySelector('#mesa-carrusel .scroll') || document.querySelector('#screen-mesa .scroll');
  return {
    viewport: R(vp), transform: getComputedStyle(lista).transform,
    listaCaja: R(lista), pags, fichas,
    scroll: scroll ? { caja: R(scroll), scrollTop: scroll.scrollTop, scrollHeight: scroll.scrollHeight, clientHeight: scroll.clientHeight, overflow: getComputedStyle(scroll).overflowY } : null,
    tabActiva: (document.querySelector('.tab--activa') || {}).textContent,
  };
});
console.log(JSON.stringify(geo, null, 1));
await p.screenshot({ path: 'mesa-geo.png' });
await b.close();
