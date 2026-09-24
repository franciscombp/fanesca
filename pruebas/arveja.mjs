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
/* el arco de la vaina a una x, en sus propias unidades */
const perfilArco = (x, r) => Math.pow(x / r.largo, 2) * r.arco * r.ancho;
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
  const { perfilVaina, perfilCascara, ARVEJA_R, VAINA, PERFIL } = await import('./modelos/arveja.js');
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
    /* EL LECHO QUE SE VE: el forro. Se mide de sus vértices y no de
       la fórmula, que es lo que podría estar equivocado. */
    const forros = [];
    o.traverse(h => { if (h.name === 'forro') forros.push(h); });
    const V3 = o.position.constructor;
    const ejeZforro = forros.length ? (() => {
      const pos = forros[0].geometry.attributes.position;
      const v = new V3();
      let minZ = 1e9, maxZ = -1e9, minZc = 1e9, maxZc = -1e9;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        forros[0].localToWorld(v); o.worldToLocal(v);
        /* sólo la franja de una punta, que es donde el arco se nota */
        if (v.x < VAINA.largo * 0.7) continue;
        minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
      }
      return (minZ + maxZ) / 2;
    })() : null;
    vainas.push({ giro: o.rotation.y, ejeZforro, granos: granos.sort((a, c) => a.i - c.i) });
  });
  return { vainas, R: ARVEJA_R, largo: VAINA.largo, ancho: VAINA.ancho, arco: VAINA.arco, forro: VAINA.forro };
});
const R = r.R;

const V_ = r.vainas;
ok('A0 hay vainas con sus cinco granos', V_.length > 0 && V_.every(v => v.granos.length === 5),
  `${V_.length} vainas`);

const todos = V_.flatMap(v => v.granos);

/* 1. el arco: la z del grano tiene que ser la del eje de la vaina */
const fueraDelEje = todos.filter(g => Math.abs(g.z - g.zEje) > 0.0015);
ok('A1 cada grano está sobre el eje ARQUEADO de la vaina', fueraDelEje.length === 0,
  fueraDelEje.length ? `${fueraDelEje.length} desviados (p.ej. z=${fueraDelEje[0].z.toFixed(4)} y el eje va en ${fueraDelEje[0].zEje.toFixed(4)})` : 'los cinco');

/* 2. el afilado: ninguno puede ser más ancho que la vaina donde está */
const sobresalen = todos.filter(g => g.medio > g.ancho + 0.002);
ok('A2 ninguno es más ancho que la vaina a su altura', sobresalen.length === 0,
  sobresalen.length ? `${sobresalen.length} se salen (grano ${sobresalen[0].medio.toFixed(4)} vs vaina ${sobresalen[0].ancho.toFixed(4)})` : 'ninguno');

/* 3. LA VAINA ES UN TUBO, así que los cinco van del mismo tamaño.
      Antes era media esfera escalada —un limón— y se afilaba desde el
      centro: los de las puntas salían a 0.83 y trepaban por una curva.
      Que los cinco midan lo mismo ES la prueba de que el cuerpo
      mantiene su sección, que es lo que hace una vaina. */
const centro = todos.filter(g => g.i === 2);
const puntas = todos.filter(g => g.i === 0 || g.i === 4);
ok('A3 los cinco van del mismo tamaño: la vaina es un tubo, no un limón',
  puntas.every(g => Math.abs(g.escala - centro[0].escala) < 0.02),
  `puntas ${puntas[0].escala.toFixed(2)} · centro ${centro[0].escala.toFixed(2)}`);

/* 4. la hondura: metidos en el vientre, no posados encima. El fondo
      del grano toca el fondo de la vaina, con medio pelo de margen */
/* el grano descansa en el fondo: su centro está a un radio del suelo
   del vientre. El semieje sale del propio modelo, no de un número
   copiado — copiado, adelgazar la arveja dejaba la prueba midiendo
   contra el tamaño viejo y tapando el fallo. */
const alturaEsperada = (g) => -g.hondo + R.y * g.escala;
const flotan = todos.filter(g => Math.abs(g.y - alturaEsperada(g)) > 0.004);
ok('A4 están metidos en el vientre, no posados encima', flotan.length === 0,
  flotan.length ? `${flotan.length} a destiempo (y=${flotan[0].y.toFixed(4)}, vientre a ${(-flotan[0].hondo).toFixed(4)})` : 'los cinco');

/* 5. EL LECHO QUE SE VE LLEVA EL MISMO ARCO que los granos. El forro
      era una esfera aparte, sin arquear: los granos seguían el arco de
      la cáscara y el lecho iba recto, así que hacia las puntas se
      salían de él. Es el fallo que un jugador reportó dos veces. */
const puntaZ = perfilArco(r.largo * 0.85, r);
const conForro = V_.filter(v => v.ejeZforro != null);
ok('A5 el lecho que se ve lleva el mismo arco que los granos',
  conForro.length > 0 && conForro.every(v => Math.abs(v.ejeZforro - puntaZ) < 0.004),
  conForro.length ? `forro ${conForro[0].ejeZforro.toFixed(4)} · arco esperado ${puntaZ.toFixed(4)}` : 'sin forro');

console.log('  perfil medido en la primera vaina:');
V_[0].granos.forEach(g => console.log(
  `   grano ${g.i}: x=${g.x.toFixed(3)} y=${g.y.toFixed(4)} z=${g.z.toFixed(4)} · escala ${g.escala.toFixed(2)} · la vaina ahí mide ${g.ancho.toFixed(4)}`));

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 5).forEach(e => console.log('  !', e));
await b.close();
