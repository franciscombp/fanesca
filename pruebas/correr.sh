#!/usr/bin/env bash
# ============================================================
# Corre la batería contra una copia local del juego.
#
# Levanta un servidor estático sobre el repo, pasa las pruebas una a
# una y lo apaga al terminar. Sale con 1 si alguna falla, para que
# valga en un gancho de pre-commit o en Actions.
#
#   ./pruebas/correr.sh              todas
#   ./pruebas/correr.sh humo olla    solo esas
#
# Variables:
#   PUERTO   dónde se sirve el juego (por defecto 8899)
#   CHROME   ruta a un Chromium propio (por defecto, el de Playwright)
# ============================================================
set -uo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUERTO="${PUERTO:-8899}"
export SITIO="http://localhost:${PUERTO}"

# La batería, en orden de lo más general a lo más particular: si el
# humo falla, lo demás casi seguro también, y conviene verlo primero.
TODAS=(humo despensa olla feria caldero porcion didactica arveja dedo ficha-hecha carrusel huevo devmode nota actualiza)
PRUEBAS=("${@:-}")
[ -z "${PRUEBAS[*]}" ] && PRUEBAS=("${TODAS[@]}")

command -v node >/dev/null || { echo "Hace falta node"; exit 1; }
# Playwright se instala DENTRO de pruebas/ (ver package.json): así la
# raíz del repo sigue sin package.json ni node_modules, que es lo que
# permite que el juego se publique tal cual, sin build.
( cd "$RAIZ/pruebas" && node -e "import('playwright')" ) 2>/dev/null || {
  echo "Hace falta Playwright:"
  echo "  cd pruebas && npm install && npx playwright install chromium"; exit 1; }

echo "Sirviendo $RAIZ en $SITIO"
python3 -m http.server "$PUERTO" -d "$RAIZ" >/dev/null 2>&1 &
SERVIDOR=$!
# el servidor se apaga pase lo que pase: sin esto, una prueba que
# revienta deja el puerto ocupado y la siguiente vuelta falla por algo
# que no tiene nada que ver
trap 'kill $SERVIDOR 2>/dev/null' EXIT
sleep 1

FALLARON=()
for n in "${PRUEBAS[@]}"; do
  echo
  echo "══ $n ══"
  if node "$RAIZ/pruebas/$n.mjs"; then :; else FALLARON+=("$n"); fi
done

echo
if [ ${#FALLARON[@]} -eq 0 ]; then
  echo "TODO VERDE — ${#PRUEBAS[@]} pruebas"
else
  echo "FALLARON: ${FALLARON[*]}"
  exit 1
fi
