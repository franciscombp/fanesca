/* ============================================================
   LA FANESCA — sw.js (service worker)
   El juego funciona sin conexión: en la instalación se guarda
   todo (incluida Three.js) en una caché nombrada con la versión.
   Subir APP_VERSION en version.js publica una caché nueva; la
   vieja se borra al activar.

   OJO CON EL PREFIJO. La Cache Storage es del ORIGEN, no del
   directorio: en github.io esta app comparte cajón con cualquier
   otra del mismo usuario. Por eso el barrido de "cachés viejas"
   solo toca las que empiezan por 'fanesca-' — con un prefijo
   ajeno le borraríamos el modo sin conexión a la app de al lado.

   Estrategia:
   - archivos propios → caché primero (por eso vuela y funciona
     sin internet); la frescura llega por versión, no por red
   - fuentes de Google → red con respaldo en caché (la primera
     visita con internet las deja guardadas para siempre)
   - modelos modelos/glb/*.glb → red, y si responde se guarda; sus
     404 son parte del juego (significan "usa el modelo del código")

   La actualización NO es a traición: el worker nuevo espera hasta
   que el jugador toca "Actualizar" (mensaje SKIP_WAITING desde
   actualizador.js) o hasta que cierra todas las pestañas.
   ============================================================ */

importScripts('version.js');

const PREFIJO = 'fanesca-';
const CACHE = PREFIJO + APP_VERSION;
const RUNTIME = PREFIJO + 'runtime';

const PRECACHE = [
  './',
  './index.html',
  './design-system.css',
  './fanesca.css',
  './icons.js',
  './version.js',
  './actualizador.js',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './vendor/three.module.min.js',
  './vendor/three.core.min.js',
  './vendor/addons/loaders/GLTFLoader.js',
  './vendor/addons/utils/BufferGeometryUtils.js',
  './vendor/addons/utils/SkeletonUtils.js',
  './main.js',
  './escenarios.js',
  './editor.js',
  './motor3d.js',
  './historia.js',
  './arruinado.js',
  './plaga.js',
  './niveles.js',
  './niveles-config.js',
  './modo-apuro.js',
  /* los modelos: la forma de cada ingrediente. Sin esto el juego
     abre sin conexión pero no puede armar un solo nivel. */
  './modelos/index.js',
  './modelos/registro.js',
  './modelos/builders.js',
  './modelos/paleta.js',
  './modelos/organico.js',
  './modelos/utileria.js',
  './modelos/cocina.js',
  './modelos/bichos.js',
  './modelos/choclo.js',
  './modelos/habas.js',
  './modelos/arveja.js',
  './modelos/chochos.js',
  './modelos/frejol.js',
  './modelos/melloco.js',
  './modelos/zapallo.js',
  './modelos/col.js',
  './modelos/lenteja.js',
  './modelos/quinua.js',
  './modelos/mani.js',
  './modelos/bacalao.js',
  './modelos/glb/indice.json',
  './nivel-maiz.js',
  './nivel-habas.js',
  './nivel-arveja.js',
  './nivel-chochos.js',
  './nivel-frejol.js',
  './nivel-melloco.js',
  './nivel-zapallo.js',
  './nivel-col.js',
  './nivel-escoger.js',
  './nivel-quinua.js',
  './nivel-mani.js',
  './nivel-bacalao.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  /* nada de skipWaiting aquí: el jugador decide cuándo actualizar */
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nombres = await caches.keys();
    await Promise.all(nombres
      .filter(n => n.startsWith(PREFIJO) && n !== CACHE && n !== RUNTIME)
      .map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* fuentes de Google: red primero, respaldo en caché para offline */
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(RUNTIME);
        c.put(req, res.clone());
        return res;
      } catch (err) {
        const guardada = await caches.match(req);
        return guardada || Response.error();
      }
    })());
    return;
  }

  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const guardada = await caches.match(req, { ignoreSearch: url.pathname.endsWith('/') });
    if (guardada) return guardada;
    try {
      const res = await fetch(req);
      /* los .glb que sí existan quedan guardados para offline */
      if (res.ok && url.pathname.endsWith('.glb')) {
        const c = await caches.open(RUNTIME);
        c.put(req, res.clone());
      }
      return res;
    } catch (err) {
      /* sin red y sin caché: si era navegación, entrega la portada */
      if (req.mode === 'navigate') {
        const inicio = await caches.match('./index.html');
        if (inicio) return inicio;
      }
      return Response.error();
    }
  })());
});
