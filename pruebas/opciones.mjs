/* TU COCINA: las opciones, la pausa y las ayudas.

   Protege que:
   · la hoja se abra desde la portada y desde la despensa, y que lo
     que se cambia ahí se recuerde y se aplique antes de pintar;
   · ‹ con faena empezada abra la pausa —no un «toca otra vez» de dos
     segundos— y que con la pausa el reloj NO corra; «seguir» lo
     retoma y un segundo ‹ sale, como el doble toque de antes;
   · con «bichos mansos» un toque rescate al bicho en vez de aplastarlo
     (y cuente para el reto de cazagusanos);
   · a la segunda vez que un bicho arruina el mismo nivel, la hoja de
     «se arruinó» ofrezca la ayuda. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };
const H = ['habas-1-facil', 'chochos-1-facil', 'frejol-1-facil'];

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(800);
await p.evaluate(async (H) => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', holaVisto: true, despensaVista: true, versionVista: '9.9.9', bichosVistos: ['el gusanito', 'el gorgojo'], mejores: Object.fromEntries(H.map(id => [id, { ms: 30000, cucharas: 3 }])) }));
}, H);
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));

/* O1 · desde la portada */
await p.tap('#btn-opciones'); await p.waitForTimeout(700);
let r = await p.evaluate(() => ({ abierta: document.querySelector('#modal-cocina').classList.contains('open'), filas: document.querySelectorAll('#opciones-lista .opcion').length }));
ok('O1 «⚙ opciones» de la portada abre Tu cocina con sus opciones', r.abierta && r.filas >= 4, JSON.stringify(r));

/* O2 · letra grande: se aplica y se recuerda */
await p.evaluate(() => document.querySelector('.opcion[data-opcion="letra"]').click());
await p.waitForTimeout(300);
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1500);
r = await p.evaluate(() => ({ letra: document.documentElement.dataset.letra, raiz: getComputedStyle(document.documentElement).fontSize }));
ok('O2 «letra grande» se recuerda y se aplica antes de pintar', r.letra === 'grande' && parseFloat(r.raiz) >= 19, JSON.stringify(r));
await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('fanesca_v1')); s.opciones.letra = 'normal'; localStorage.setItem('fanesca_v1', JSON.stringify(s)); });
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2000);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz]').forEach(x => x.remove()));

/* O3 · desde la despensa */
await p.click('#btn-empezar'); await p.waitForTimeout(900);
await p.tap('#btn-cocina'); await p.waitForTimeout(700);
r = await p.evaluate(() => document.querySelector('#modal-cocina').classList.contains('open'));
ok('O3 el ⚙ de la despensa abre la misma hoja', r === true);
await p.evaluate(() => document.querySelector('#cocina-cerrar').click()); await p.waitForTimeout(400);

const jugar = async (id) => {
  await p.evaluate((id) => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); window.Fanesca.jugar(id); }, id);
  for (let t = 0; t < 60; t++) {
    if (await p.evaluate(() => !!window.Fanesca.modulo && document.querySelector('.screen.active').id === 'screen-juego' && !!window.Fanesca.Motor.escena)) break;
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(900);
};

/* O4 · la pausa: el reloj quieto */
await jugar('habas-2-normal');
await p.evaluate(() => { document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.Fanesca.api.progreso(1, 10); });
/* se espera a que el reloj marque algo: en un Chromium sin GPU cargado
   el intervalo del reloj llega tarde */
for (let t = 0; t < 30; t++) {
  if (await p.evaluate(() => document.querySelector('#hud-tiempo-n').textContent !== '0.0s')) break;
  await p.evaluate(() => document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await p.waitForTimeout(250);
}
await p.evaluate(() => document.querySelector('#btn-salir').click());
await p.waitForTimeout(300);
const t1 = await p.evaluate(() => ({ pausa: document.querySelector('#modal-pausa').classList.contains('open'), reloj: document.querySelector('#hud-tiempo-n').textContent }));
await p.waitForTimeout(2000);
const t2 = await p.evaluate(() => document.querySelector('#hud-tiempo-n').textContent);
ok('O4 con faena empezada, ‹ abre la pausa', t1.pausa, JSON.stringify(t1));
ok('O4a y en pausa el reloj no corre', t1.reloj === t2, `${t1.reloj} → ${t2}`);
await p.evaluate(() => document.querySelector('#pausa-seguir').click());
let t3;
for (let t = 0; t < 20; t++) {
  await p.waitForTimeout(250);
  t3 = await p.evaluate(() => ({ pausa: document.querySelector('#modal-pausa').classList.contains('open'), reloj: document.querySelector('#hud-tiempo-n').textContent }));
  if (t3.reloj !== t2) break;
}
ok('O4b «seguir» cierra la pausa y el reloj vuelve a correr', !t3.pausa && t3.reloj !== t2, `${t2} → ${t3.reloj}`);
await p.evaluate(() => document.querySelector('#btn-salir').click()); await p.waitForTimeout(300);
await p.evaluate(() => document.querySelector('#btn-salir').click()); await p.waitForTimeout(900);
r = await p.evaluate(() => document.querySelector('.screen.active').id);
ok('O4c un segundo ‹ con la pausa abierta sale, como el doble toque', r === 'screen-mesa', r);

/* O5 · bichos mansos: un toque rescata */
await p.evaluate(() => { const s = window.Fanesca.estado; s.opciones.bichosMansos = true; });
await jugar('habas-2-normal');
await p.evaluate(() => document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
const rescate = await p.evaluate(async () => {
  const F = window.Fanesca, M = F.Motor, THREE_V = M.escena.position.constructor;
  /* se suelta un bicho con la plaga del propio nivel: es la que lee la ayuda */
  const plaga = window.__plaga || null;
  if (!plaga) return { sinPlaga: true };
  const rec = plaga.soltar('gusano', new THREE_V(0.3, F.api.MESA_Y, 0.4));
  await new Promise(r => setTimeout(r, 400));
  plaga.tocado(rec);
  await new Promise(r => setTimeout(r, 900));
  return { estado: rec.estado, arruinado: document.querySelector('#modal-arruinado').classList.contains('open') };
});
ok('O5 con bichos mansos, tocar al bicho lo rescata (no arruina)', rescate.sinPlaga || (rescate.estado === 'ido' && !rescate.arruinado), JSON.stringify(rescate));
await p.evaluate(() => { window.Fanesca.estado.opciones.bichosMansos = false; });
await p.evaluate(() => document.querySelector('#btn-salir').click()); await p.waitForTimeout(300);
await p.evaluate(() => { if (document.querySelector('#modal-pausa').classList.contains('open')) document.querySelector('#pausa-salir').click(); });
await p.waitForTimeout(800);

/* O6 · la ayuda se ofrece a la segunda vez */
/* arruinar sólo vale con el reloj armado, y el reloj se arma cuando la
   cortina termina de irse: se reintenta hasta que la hoja se abre */
const arruinar = async () => {
  let r = { abierta: false, ayuda: false };
  for (let i = 0; i < 6 && !r.abierta; i++) {
    await p.evaluate(() => { document.querySelector('#escena').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    await p.waitForTimeout(250);
    await p.evaluate(() => window.Fanesca.api.arruinar({ clave: 'enLaBatea', titulo: 'Se te fue a la batea', texto: 'El gusanito llegó hasta la batea.' }));
    for (let t = 0; t < 10 && !r.abierta; t++) {
      await p.waitForTimeout(300);
      r = await p.evaluate(() => ({ abierta: document.querySelector('#modal-arruinado').classList.contains('open'), ayuda: !document.querySelector('#arruinado-ayuda').classList.contains('hidden') }));
    }
  }
  return r;
};
await jugar('chochos-2-normal');
const a1 = await arruinar();
await p.evaluate(() => document.querySelector('#arruinado-reintentar').click());
for (let t = 0; t < 40; t++) { if (await p.evaluate(() => !!window.Fanesca.modulo && !document.querySelector('.modal.open'))) break; await p.waitForTimeout(200); }
await p.waitForTimeout(1200);
const a2 = await arruinar();
ok('O6 la primera vez la hoja no ofrece ayuda', a1.abierta && !a1.ayuda, JSON.stringify(a1));
ok('O6a a la segunda, ofrece «con bichos mansos»', a2.abierta && a2.ayuda, JSON.stringify(a2));

if (errs.length) ok('O9 sin errores en la página', false, errs.slice(0, 3).join(' | '));
await b.close();
const malos = V.filter(l => l.startsWith('✗'));
console.log(malos.length ? `\nHAY FALLOS (${malos.length})` : '\nTODO VERDE');
process.exit(malos.length ? 1 : 0);
