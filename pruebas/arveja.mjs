/* LOS GRANOS SIGUEN LA FORMA DE LA VAINA.

   Un jugador lo dijo así: «las arvejas, cuando están inclinadas, los
   granos no siguen la misma forma». Y era verdad — la vaina se arquea
   y se afila, y los cinco granos estaban en una recta plana: los de
   las puntas asomaban por los costados y todos flotaban por encima
   del vientre en vez de estar metidos dentro.

   Esta prueba compara, grano a grano, dónde está con dónde dice
   `perfilVaina()` que está el vientre de la vaina a esa altura. Es la
   clase de error que no se ve en una captura de frente y salta a la
   vista en cuanto la vaina está girada. */
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
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', devMode: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2300);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(600);

await p.evaluate(() => window.Fanesca.jugar('arveja-2-normal'));
await p.waitForTimeout(3600);

const r = await p.evaluate(async () => {
  const { perfilVaina, ARVEJA_R } = await import('./modelos/arveja.js');
  const F = window.Fanesca;
  const vainas = [];
  F.Motor.escena.traverse(o => {
    if (!(o.userData && o.userData.tipo === 'vaina')) return;
    const granos = [];
    o.traverse(h => {
      if (!(h.userData && h.userData.tipo === 'arveja')) return;
      const perfil = perfilVaina(h.position.x);
      granos.push({
        i: h.userData.i,
        x: h.position.x, y: h.position.y, z: h.position.z,
        escala: h.scale.x,
        /* dónde DEBERÍA estar según el perfil de la vaina */
        zEje: perfil.z, hondo: perfil.hondo, ancho: perfil.ancho,
        /* medio ancho del grano ya escalado */
        medio: ARVEJA_R.z * h.scale.x,
      });
    });
    vainas.push({ giro: o.rotation.y, granos: granos.sort((a, c) => a.i - c.i) });
  });
  return vainas;
});

ok('A0 hay vainas con sus cinco granos', r.length > 0 && r.every(v => v.granos.length === 5),
  `${r.length} vainas`);

const todos = r.flatMap(v => v.granos);

/* 1. el arco: la z del grano tiene que ser la del eje de la vaina */
const fueraDelEje = todos.filter(g => Math.abs(g.z - g.zEje) > 0.0015);
ok('A1 cada grano está sobre el eje ARQUEADO de la vaina', fueraDelEje.length === 0,
  fueraDelEje.length ? `${fueraDelEje.length} desviados (p.ej. z=${fueraDelEje[0].z.toFixed(4)} y el eje va en ${fueraDelEje[0].zEje.toFixed(4)})` : 'los cinco');

/* 2. el afilado: ninguno puede ser más ancho que la vaina donde está */
const sobresalen = todos.filter(g => g.medio > g.ancho + 0.002);
ok('A2 ninguno es más ancho que la vaina a su altura', sobresalen.length === 0,
  sobresalen.length ? `${sobresalen.length} se salen (grano ${sobresalen[0].medio.toFixed(4)} vs vaina ${sobresalen[0].ancho.toFixed(4)})` : 'ninguno');

/* 3. las puntas son más chicas que el centro: la vaina se afila y
      ellos con ella (que además es como son de verdad) */
const centro = todos.filter(g => g.i === 2);
const puntas = todos.filter(g => g.i === 0 || g.i === 4);
ok('A3 los de las puntas son más chicos que el del centro',
  puntas.every(g => g.escala < centro[0].escala - 0.05),
  `puntas ${puntas[0].escala.toFixed(2)} · centro ${centro[0].escala.toFixed(2)}`);

/* 4. la hondura: metidos en el vientre, no posados encima. El fondo
      del grano toca el fondo de la vaina, con medio pelo de margen */
/* el grano descansa en el fondo: su centro está a un radio del suelo
   del vientre. 0.077 es su semieje vertical (ARVEJA_R.y). */
const alturaEsperada = (g) => -g.hondo + 0.077 * g.escala;
const flotan = todos.filter(g => Math.abs(g.y - alturaEsperada(g)) > 0.004);
ok('A4 están metidos en el vientre, no posados encima', flotan.length === 0,
  flotan.length ? `${flotan.length} a destiempo (y=${flotan[0].y.toFixed(4)}, vientre a ${(-flotan[0].hondo).toFixed(4)})` : 'los cinco');

console.log('  perfil medido en la primera vaina:');
r[0].granos.forEach(g => console.log(
  `   grano ${g.i}: x=${g.x.toFixed(3)} y=${g.y.toFixed(4)} z=${g.z.toFixed(4)} · escala ${g.escala.toFixed(2)} · la vaina ahí mide ${g.ancho.toFixed(4)}`));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 5).forEach(e => console.log('  !', e));
await b.close();
