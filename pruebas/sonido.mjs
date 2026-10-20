/* EL SONIDO Y LA SENSACIÓN: que lo que el juego dice con el oído, el
   dedo y la cámara diga lo que quiere decir. Se espía al AudioContext
   (qué osciladores arrancan y a qué altura), a navigator.vibrate y a
   la cámara.

   Protege cosas que ya se rompieron sin que nadie lo oyera:
   · la racha sonaba en zigzag (752, 916, 817, 991 Hz…) y fuera de
     tonalidad; tiene que SUBIR y caer en la pentatónica de Do;
   · api.sfx se comía el tono que pedía el nivel, y la olla del
     caldero sonaba igual con el primer ingrediente que con el octavo;
   · dos niveles llamaban a las chispas con los argumentos al revés y
     no salía ninguna;
   · la fiesta sonaba ANTES de que se vieran las cucharas;
   · con movimiento reducido la cámara seguía temblando. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const ctx = await b.newContext({ viewport: { width: 420, height: 860 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.addInitScript(() => {
  /* cada oscilador que arranca deja su altura y su momento */
  window.__notas = [];
  const P = (window.AudioContext || window.webkitAudioContext).prototype;
  const orig = P.createOscillator;
  P.createOscillator = function () {
    const o = orig.call(this);
    /* la altura se agenda (setValueAtTime), así que se lee de ahí:
       `frequency.value` sigue en 440 hasta que el reloj llega */
    let hz = null;
    const sv = o.frequency.setValueAtTime.bind(o.frequency);
    o.frequency.setValueAtTime = (v, t) => { if (hz == null) hz = v; return sv(v, t); };
    const st = o.start.bind(o);
    o.start = (t) => { window.__notas.push({ hz: hz ?? o.frequency.value, t: performance.now() }); return st(t); };
    return o;
  };
  window.__vib = [];
  navigator.vibrate = (x) => { window.__vib.push(x); return true; };
});
await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(900);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', holaVisto: true, despensaVista: true, versionVista: '9.9.9', bichosVistos: ['gusanito', 'mosca', 'gorgojo'] }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2200);
await p.evaluate(() => document.querySelectorAll('[class*=actualiz], .modal.open').forEach(x => x.classList.remove('open')));
await p.click('#btn-empezar'); await p.waitForTimeout(700);

const jugar = async (id) => {
  await p.evaluate((id) => { document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open')); window.Fanesca.jugar(id); }, id);
  for (let t = 0; t < 80; t++) {
    if (await p.evaluate(() => !!window.Fanesca.modulo && document.querySelector('.screen.active').id === 'screen-juego')) break;
    await p.waitForTimeout(150);
  }
  await p.waitForTimeout(800);
};
await jugar('chochos-1-facil');

/* 1 · LA ESCALERA. Ocho aciertos seguidos, alternando pop y pop2
   como hacen los niveles. Cada nota sube (o se queda arriba) y cae en
   la pentatónica de Do. */
const PENTA = [0, 2, 4, 7, 9];   /* do re mi sol la, en semitonos */
const enPenta = (hz) => {
  const semis = 12 * Math.log2(hz / 261.6256);
  const r = Math.round(semis);
  return Math.abs(semis - r) * 100 < 5 && PENTA.includes(((r % 12) + 12) % 12);
};
const escalera = await p.evaluate(async () => {
  const api = window.Fanesca.api;
  const out = [];
  for (let k = 1; k <= 8; k++) {
    window.__notas = [];
    api.progreso(k, 12);
    api.sfx(k % 2 ? 'pop' : 'pop2');
    out.push(window.__notas.map(n => n.hz));
    await new Promise(r => setTimeout(r, 60));
  }
  return out;
});
const pops = escalera.map(l => l[l.length - 1]).filter(Boolean);
ok('SO1 la racha suena: ocho aciertos, ocho notas', pops.length === 8, JSON.stringify(escalera));
ok('SO1a y sube, sin zigzag', pops.every((h, i) => i === 0 || h >= pops[i - 1] - 0.01), pops.map(Math.round).join(' '));
ok('SO1b y cada nota es de la pentatónica de Do', pops.every(enPenta), pops.map(h => h.toFixed(1)).join(' '));

/* 2 · EL TONO QUE PIDE EL NIVEL SE RESPETA */
const tonos = await p.evaluate(async () => {
  const api = window.Fanesca.api;
  window.__notas = []; api.sfx('plop', 0.82);
  await new Promise(r => setTimeout(r, 60));
  const a = window.__notas[0] && window.__notas[0].hz;
  window.__notas = []; api.sfx('plop', 1.06);
  await new Promise(r => setTimeout(r, 60));
  const c = window.__notas[0] && window.__notas[0].hz;
  return { a, c };
});
ok('SO2 api.sfx respeta el tono: la olla sube con cada ingrediente', tonos.a && tonos.c && tonos.c > tonos.a * 1.2, JSON.stringify(tonos));

/* 3 · LAS CHISPAS, con los argumentos al derecho y al revés */
const chispas = await p.evaluate(() => {
  const M = window.Fanesca.Motor;
  const cuenta = () => { let n = 0; M.escena.traverse(o => { if (o.isSprite && o.material && o.material.map && o.visible) n++; }); return n; };
  const pos = { x: 0, y: 1, z: 0, clone() { return this; } };
  const antes = cuenta();
  M.chispas(window.Fanesca.api.BATEA, '#f4d35e', 8);
  const bien = cuenta() - antes;
  M.chispas(window.Fanesca.api.BATEA, 8, '#f4d35e');
  const reves = cuenta() - antes - bien;
  M.chispas(window.Fanesca.api.BATEA, '#e8f2f4', 6, 1, { forma: 'gota' });
  M.chispas(window.Fanesca.api.BATEA, '#e8f2f4', 6, 1, { forma: 'nada' });
  const total = cuenta() - antes;
  return { bien, reves, total };
});
/* con movimiento reducido salen la mitad: 8 → 4 */
ok('SO3 las chispas salen, aunque se pidan con el color y la cantidad al revés', chispas.bien === 4 && chispas.reves === 4, JSON.stringify(chispas));
ok('SO3a y una forma que no existe cae en la estrella', chispas.total === 4 + 4 + 3 + 3, JSON.stringify(chispas));

/* 4 · MOVIMIENTO REDUCIDO: la cámara no tiembla */
const cam = await p.evaluate(async () => {
  const M = window.Fanesca.Motor;
  const c = M.camara || M.camera;
  if (!c) return { sin: true };
  const x0 = c.position.x, y0 = c.position.y;
  M.sacudir(1.2);
  let max = 0;
  for (let i = 0; i < 8; i++) {
    await new Promise(r => requestAnimationFrame(r));
    max = Math.max(max, Math.hypot(c.position.x - x0, c.position.y - y0));
  }
  return { max };
});
ok('SO4 con movimiento reducido la sacudida no mueve la cámara', cam.sin || cam.max < 1e-6, JSON.stringify(cam));

/* 5 · LA VIBRACIÓN: nada de pausas que el dedo no siente, y los
   golpecitos de acierto con tope */
const vib = await p.evaluate(async () => {
  const api = window.Fanesca.api;
  await new Promise(r => setTimeout(r, 1200));
  window.__vib = [];
  for (let i = 0; i < 10; i++) api.buzz(8);
  const golpecitos = window.__vib.length;
  await new Promise(r => setTimeout(r, 300));
  window.__vib = [];
  api.buzz([18, 12, 18]);
  const patron = window.__vib[0];
  return { golpecitos, patron };
});
ok('SO5 diez aciertos en el mismo instante no son diez vibraciones', vib.golpecitos <= 2, JSON.stringify(vib));
ok('SO5a las pausas de un patrón se estiran a 50 ms', Array.isArray(vib.patron) && vib.patron[1] >= 50, JSON.stringify(vib));

/* 6 · EL FINAL: las cucharas primero, la fiesta después. Se termina
   el nivel y se mira cuándo arrancan las notas de la fiesta (Do6)
   respecto de las de la última cuchara. */
const fin = await p.evaluate(async () => {
  window.__notas = [];
  const t0 = performance.now();
  window.Fanesca.api.completar ? window.Fanesca.api.completar() : window.Fanesca.api.progreso(1, 1);
  await new Promise(r => setTimeout(r, 2200));
  const notas = window.__notas.map(n => ({ hz: Math.round(n.hz), t: Math.round(n.t - t0) }));
  const llenas = document.querySelectorAll('#listo-cucharas .cuchara.llena').length;
  return { notas, llenas, abierta: document.querySelector('#modal-listo').classList.contains('open') };
});
const do6 = fin.notas.filter(n => Math.abs(n.hz - 1047) < 3);
const ultimaCuchara = fin.notas.filter(n => n.t < (do6[0] ? do6[0].t : Infinity)).pop();
ok('SO6 el nivel termina con su hoja y sus cucharas', fin.abierta && fin.llenas >= 1, JSON.stringify({ llenas: fin.llenas, abierta: fin.abierta }));
ok('SO6a la fiesta no suena antes de las cucharas', fin.llenas < 3 || (do6.length && do6[0].t > 900), JSON.stringify(fin.notas.slice(0, 20)));

if (errs.length) ok('SO9 sin errores en la página', false, errs.slice(0, 3).join(' | '));
await b.close();
const malos = V.filter(l => l.startsWith('✗'));
console.log(malos.length ? `\nHAY FALLOS (${malos.length})` : '\nTODO VERDE');
process.exit(malos.length ? 1 : 0);
