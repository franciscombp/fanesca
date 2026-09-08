/* ============================================================
   LA FANESCA — actualizador.js
   Registra el service worker y maneja el ciclo de versión de
   cara al jugador:

   1. INSTALAR   — primera visita con internet: el juego entero
                   queda guardado y desde ahí abre sin conexión.
   2. DETECTAR   — al volver a abrir (o cada hora con la app
                   abierta) se revisa si hay versión nueva.
   3. AVISAR     — si la hay, aparece el botón "Actualizar" sobre
                   la barra. Nada se recarga a traición.
   4. ESTRENAR   — tras actualizar (o al abrir una versión nueva)
                   se muestra la nota de versiones una sola vez.

   Requiere version.js cargado antes (APP_VERSION, NOVEDADES).
   La ruta del sw se pasa con data-sw en la etiqueta <script>, para
   que una página en un subdirectorio pueda apuntar a la de arriba.
   ============================================================ */

(function () {
  /* con nombre propio: localStorage es del ORIGEN, así que en
     github.io este cajón se comparte con las demás apps del sitio */
  const VISTA_KEY = 'fanesca_version_vista';

  /* TOCAR SIN DEPENDER DEL CLICK. Igual que en main.js: si el dedo se
     corre más de diez píxeles entre bajar y subir, el navegador no
     dispara `click` aunque el botón se haya pintado pulsado. Aquí
     vive su propia copia porque este archivo no es un módulo: es lo
     primero que se carga y no puede importar nada del juego. */
  function tocar(el, fn) {
    if (!el) return;
    let x0 = 0, y0 = 0, t0 = 0, vivo = false, ultimoTap = 0;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); vivo = true;
    });
    el.addEventListener('pointerup', (e) => {
      if (!vivo) return;
      vivo = false;
      if (e.pointerType === 'mouse') return;
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 30 || Date.now() - t0 > 900) return;
      ultimoTap = Date.now();
      fn(e);
    });
    el.addEventListener('pointercancel', () => { vivo = false; });
    el.addEventListener('click', (e) => { if (Date.now() - ultimoTap < 700) return; fn(e); });
  }

  /* ---------- la nota de versiones ---------- */

  function mostrarNovedades() {
    const nota = NOVEDADES[0];
    /* Solo lo del JUGADOR. `internos` es la bitácora de autor —
       herramientas, arquitectura, cosas que no se notan jugando— y
       no tiene por qué interrumpir a nadie. Si una versión no le
       cambió nada al jugador, no hay nota que mostrar. */
    if (!nota || !nota.cambios || !nota.cambios.length) return;
    const modal = document.createElement('div');
    /* `nota-version` la marca como hoja de lista larga: el botón de
       cerrar se queda pegado abajo y lo que crece es la lista, no la
       hoja. Sin eso, cinco novedades empujaban el botón fuera de la
       pantalla en cualquier teléfono que no fuera enorme y el jugador
       se quedaba ATRAPADO detrás de la nota: veía el recetario a
       través del fondo, tocaba los ingredientes y no pasaba nada. */
    modal.className = 'modal nota-version open';
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
      <div class="sheet">
        <button type="button" class="icono-boton nota-version-x" aria-label="Cerrar">×</button>
        <span class="nota-version-ic" aria-hidden="true">🎉</span>
        <p class="sheet-eyebrow">versión ${nota.v} · ${nota.fecha}</p>
        <h3 class="sheet-title">${nota.titulo}</h3>
        <ul class="nota-version-lista">
          ${nota.cambios.map(c => `<li>${c}</li>`).join('')}
        </ul>
        <button type="button" class="btn btn--maiz btn--block nota-version-ok">¡A cocinar!</button>
      </div>`;
    const cerrar = () => modal.remove();
    tocar(modal.querySelector('.nota-version-ok'), cerrar);
    tocar(modal.querySelector('.nota-version-x'), cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
    /* y con Escape, en teclado */
    document.addEventListener('keydown', function esc(e) {
      if (e.key !== 'Escape') return;
      document.removeEventListener('keydown', esc);
      cerrar();
    });
    document.body.appendChild(modal);
  }

  function revisarEstreno() {
    let vista = null;
    try { vista = localStorage.getItem(VISTA_KEY); } catch (e) {}
    if (vista === APP_VERSION) return;
    try { localStorage.setItem(VISTA_KEY, APP_VERSION); } catch (e) {}
    /* en la primerísima visita no hay "novedades": todo es nuevo */
    if (vista !== null) setTimeout(mostrarNovedades, 900);
  }

  /* etiqueta discreta con la versión, si la página tiene dónde */
  document.addEventListener('DOMContentLoaded', () => {
    const sitio = document.querySelector('[data-version]');
    if (sitio) sitio.textContent = 'v' + APP_VERSION;
    revisarEstreno();
  });

  /* ---------- el service worker y su botón de actualizar ---------- */

  if (!('serviceWorker' in navigator)) return;
  const script = document.currentScript;
  const rutaSW = (script && script.dataset.sw) || 'sw.js';

  let avisoPuesto = false;
  let actualizandoPorBoton = false;
  let esperandoSalida = false;
  function avisarActualizacion(reg) {
    if (avisoPuesto || !reg.waiting) return;
    /* NUNCA EN PLENO NIVEL. El chequeo corre al recuperar el foco y
       cada hora, así que a un jugador activo el botón le aterrizaba a
       media faena —o a media partida de El Apuro—, plantado donde
       vive el pulgar, y un toque le recargaba la partida. Se espera a
       que vuelva a la mesa o a la portada: la versión nueva puede
       esperar tres minutos; la partida de alguien, no. */
    const juego = document.getElementById('screen-juego');
    if (juego && juego.classList.contains('active')) {
      if (esperandoSalida) return;
      esperandoSalida = true;
      const espera = setInterval(() => {
        if (juego.classList.contains('active')) return;
        clearInterval(espera);
        esperandoSalida = false;
        avisarActualizacion(reg);
      }, 2000);
      return;
    }
    avisoPuesto = true;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--maiz aviso-actualizar';
    btn.innerHTML = '✨ Nueva versión — <b>Actualizar</b>';
    tocar(btn, () => {
      btn.disabled = true;
      btn.textContent = 'Actualizando…';
      actualizandoPorBoton = true;
      reg.waiting.postMessage('SKIP_WAITING');
    });
    document.body.appendChild(btn);
  }

  window.addEventListener('load', () => {
    /* updateViaCache 'none': el sw y su version.js importado se piden
       frescos en cada chequeo — sin esto, el bump de versión no se ve */
    navigator.serviceWorker.register(rutaSW, { updateViaCache: 'none' }).then((reg) => {
      if (reg.waiting) avisarActualizacion(reg);
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarActualizacion(reg);
        });
      });
      /* revisar al recuperar el foco, al VOLVER EL INTERNET y cada
         hora con la app abierta */
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      window.addEventListener('online', () => reg.update().catch(() => {}));
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => { /* sin sw (http plano, navegador viejo): el juego sigue normal */ });

    /* clients.claim() en el sw dispara "controllerchange" incluso en la
       primerísima instalación (una página sin controlador que recién
       queda controlada) — recargar ahí sería una recarga a traición.
       Solo recargamos cuando NOSOTROS pedimos la actualización. */
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando || !actualizandoPorBoton) return;
      recargando = true;
      location.reload();
    });
  });
})();
