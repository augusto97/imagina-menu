#!/usr/bin/env bash
# Empaqueta el plugin para distribución (Imagina Updater o subida manual).
#
# Lista blanca: solo lo que el plugin necesita en el servidor. Nada de tests, herramientas de
# build, documentación interna, archivos de bloqueo de dependencias ni fuentes del admin: no se
# pueden pedir por URL si no están.
#
# Uso: bash bin/build-zip.sh   →   dist/imagina-menu-<versión>.zip
set -euo pipefail
cd "$( dirname "$0" )/.."

VERSION=$( sed -n "s/^define( 'IMM_VERSION', '\([^']*\)' );/\1/p" imagina-menu.php )
OUT="dist/imagina-menu-${VERSION}.zip"
STAGE=$( mktemp -d )
trap 'rm -rf "$STAGE"' EXIT
DEST="$STAGE/imagina-menu"
mkdir -p "$DEST" dist

# Compilar lo que se distribuye.
npm run --silent build >/dev/null
node bin/size.mjs >/dev/null || { echo "El frontend supera el presupuesto de rendimiento"; exit 1; }
( cd admin && npm run --silent build >/dev/null )

cp imagina-menu.php uninstall.php "$DEST/"
[ -f readme.txt ] && cp readme.txt "$DEST/"
cp -r src assets icons blocks "$DEST/"
mkdir -p "$DEST/admin" && cp -r admin/dist "$DEST/admin/dist"
[ -d languages ] && cp -r languages "$DEST/"

# Autoloader optimizado (classmap-authoritative): sin búsquedas en disco por clase.
cp composer.json "$DEST/"
COMPOSER_ALLOW_SUPERUSER=1 composer --working-dir="$DEST" dump-autoload --classmap-authoritative --no-dev --quiet
rm -f "$DEST/composer.json"

# Nunca: servidor de desarrollo de Vite, mapas de fuentes, archivos ocultos.
rm -f "$DEST/admin/dist/vite-dev-server.json"
find "$DEST" \( -name '*.map' -o -name '.*' \) -not -path "$DEST" -exec rm -rf {} + 2>/dev/null || true

# Cada carpeta con un index.php vacío (sin listado de directorios en servidores mal configurados).
find "$DEST" -type d | while read -r dir; do
	[ -f "$dir/index.php" ] || printf "<?php\n// Silence is golden.\n" > "$dir/index.php"
done

# Comprobación: todo .php fuera de index.php debe cortar si se pide directo por URL.
missing=$( grep -rL "defined( 'ABSPATH' )\|defined( 'WP_UNINSTALL_PLUGIN' )\|Silence is golden" --include='*.php' --exclude-dir=vendor "$DEST" || true )
if [ -n "$missing" ]; then
	echo "Archivos PHP sin protección contra acceso directo:"; echo "$missing"; exit 1
fi

rm -f "$OUT"
( cd "$STAGE" && zip -qr9 - imagina-menu ) > "$OUT"
echo "$OUT ($( du -h "$OUT" | cut -f1 ))"
