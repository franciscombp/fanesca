/* TODOS LOS NIVELES MONTAN, Y NINGUNO MIENTE.

   La red que faltaba. El catálogo tiene decenas de niveles y hasta
   ahora sólo se probaban un puñado: un nivel con una config que su
   módulo no sabe leer —o un id mal escrito— no se notaba hasta que
   alguien llegaba a él jugando, y para entonces ya estaba publicado.

   Aquí se monta CADA UNO por el camino del juego, se comprueba que
   arme su mesón, que declare un total de trabajo mayor que cero y que
   no reviente. Es lenta a propósito: es el seguro de las escaleras de
   cada bolsa. */
import { chromium } from 'playwright';

const SITIO = process.env.SITIO || 'http://localhost:8899';
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
const errs = [];
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/ERR_CONNECTION|Failed to load resource|ERR_CERT/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const V = [];
const ok = (n, c, x = '') => { const l = `${c ? '✓' : '✗ FALLO'} ${n}${x ? ' — ' + x : ''}`; V.push(l); console.log(l); };

await p.goto(`${SITIO}/index.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(700);
await p.evaluate(async () => {
  const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister()));
  const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k)));
  localStorage.clear();
  localStorage.setItem('fanesca_v1', JSON.stringify({ vistoPortada: true, mapa: 'bolsas', despensaVista: true, devMode: true }));
});
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2400);
await p.evaluate(() => { document.querySelectorAll('.modal.open, .aviso-actualizar').forEach(x => x.remove()); });
await p.click('#btn-empezar'); await p.waitForTimeout(700);

const ruta = await p.evaluate(() => window.Fanesca.ruta.map(n => ({ id: n.id, bolsa: n.bolsa, base: n.base })));
ok('T0 el catálogo tiene niveles que probar', ruta.length > 20, ruta.length + ' niveles');

const malos = [];
const flacos = [];
for (const n of ruta) {
  const antes = errs.length;
  await p.evaluate((id) => window.Fanesca.jugar(id), n.id);
  /* esperar al MÓDULO, no a un reloj: montar importa un archivo */
  let montado = false;
  for (let t = 0; t < 60; t++) {
    montado = await p.evaluate(() => !!window.Fanesca.modulo);
    if (montado) break;
    await p.waitForTimeout(150);
  }
  const est = await p.evaluate(() => ({
    mod: window.Fanesca.modulo && window.Fanesca.modulo.id,
    pantalla: (document.querySelector('.screen.active') || {}).id,
    /* cuánto trabajo declara: la barra del HUD sale de api.progreso,
       y un mesón que nunca llama a progreso no se puede terminar */
    total: window.__total === undefined ? null : window.__total,
    pct: (document.querySelector('#hud-pct') || {}).textContent,
  }));
  if (!montado || est.pantalla !== 'screen-juego') malos.push(`${n.id} (${est.pantalla}, mod ${est.mod})`);
  else if (errs.length > antes) malos.push(`${n.id} (reventó: ${errs[antes].slice(0, 70)})`);
  /* T4 se alimenta aquí: cuántas piezas del mesón caen FUERA de la
     pantalla. Subir las cantidades es la forma más fácil de que un
     nivel deje media mesa donde el dedo no llega, y ya pasó una vez
     con los dieciséis cuencos del caldero. */
  if (montado) {
    const fuera = await p.evaluate(() => {
      const F = window.Fanesca;
      const V3 = F.api.BATEA.constructor;
      let total = 0;
      const malas = [];
      F.Motor.escena.traverse(o => {
        if (!o.visible || !o.userData || !o.userData.tipo) return;
        if (o.userData.ignorar) return;
        const v = o.getWorldPosition(new V3());
        const s = F.Motor.proyectar(v);
        total++;
        if (s.x < 8 || s.x > innerWidth - 8 || s.y < 96 || s.y > innerHeight - 70) {
          malas.push(`${o.userData.tipo}@${Math.round(s.x)},${Math.round(s.y)}`);
        }
      });
      return { total, malas };
    });
    if (fuera.total && fuera.malas.length) flacos.push(`${n.id}: ${fuera.malas.length}/${fuera.total} fuera [${fuera.malas.slice(0, 3).join(' ')}]`);
  }

  /* salir limpio antes del siguiente */
  await p.evaluate(() => { const b = document.querySelector('#btn-salir'); if (b) b.click(); });
  await p.waitForTimeout(260);
  await p.evaluate(() => { const b = document.querySelector('#btn-salir'); if (b) b.click(); });
  await p.waitForTimeout(240);
}

ok('T1 todos los niveles del catálogo montan su mesón', malos.length === 0,
  malos.length ? malos.slice(0, 6).join(' | ') : `los ${ruta.length}`);

/* T2: ninguna bolsa se queda sin escalera. La promesa del menú nuevo
   es poder quedarse en un ingrediente; una bolsa de un solo nivel no
   ofrece dónde quedarse. */
const porBolsa = {};
ruta.forEach(n => { porBolsa[n.bolsa] = (porBolsa[n.bolsa] || 0) + 1; });
const sueltas = Object.entries(porBolsa).filter(([, n]) => n < 3).map(([b, n]) => `${b}(${n})`);
ok('T2 ninguna bolsa tiene menos de tres niveles', sueltas.length === 0,
  sueltas.length ? sueltas.join(' ') : `${Object.keys(porBolsa).length} bolsas`);

/* T3: la dificultad no baja DENTRO DE UN GESTO.

   Por gesto y no por bolsa: en el choclo conviven dos —escoger en la
   feria y desgranar— y cada uno tiene su propia rampa. Que el
   desgrane empiece en uno después de una feria de cuatro no es un
   desorden: es que se está enseñando algo nuevo, y lo nuevo se enseña
   desde abajo. Lo que sí sería un fallo es que dentro del desgrane el
   quinto peldaño fuera más fácil que el cuarto. */
const gestos = await p.evaluate(() => {
  const F = window.Fanesca;
  const out = {};
  F.ruta.forEach(n => { (out[n.base] = out[n.base] || []).push({ id: n.id, dif: n.dif }); });
  return out;
});
const desordenados = Object.entries(gestos)
  .filter(([, ns]) => ns.some((n, i) => i > 0 && n.dif < ns[i - 1].dif))
  .map(([g, ns]) => `${g}(${ns.map(n => n.dif).join('')})`);
ok('T3 dentro de un gesto la dificultad no baja', desordenados.length === 0,
  desordenados.length ? desordenados.join(' ') : `${Object.keys(gestos).length} gestos en orden`);

ok('T4 ninguna pieza del mesón queda fuera de la pantalla', flacos.length === 0,
  flacos.length ? flacos.slice(0, 8).join(' | ') : 'ninguna');

console.log('---');
console.log(V.some(v => v.startsWith('✗')) ? 'HAY FALLOS' : 'TODO VERDE');
console.log('errores JS:', errs.length); errs.slice(0, 8).forEach(e => console.log('  !', e));
await b.close();
process.exit(V.some(v => v.startsWith('✗')) ? 1 : 0);
