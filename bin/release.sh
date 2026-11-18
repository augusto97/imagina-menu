#!/usr/bin/env bash
# Publica la versión actual del plugin en la rama `release`.
#
# La rama `release` es huérfana: solo contiene los ZIP listos para instalar (sin código fuente):
#   imagina-menu-X.Y.Z.zip   una por versión, nunca se reemplaza
#   imagina-menu.zip         copia de la última versión (enlace fijo de descarga)
#   SHA256SUMS               sumas de verificación
#   README.md                lista de versiones con sus enlaces
#
# Uso (desde la rama de desarrollo, con todo confirmado en git):
#   bash bin/release.sh                 # compila, prueba, empaqueta y sube a origin/release
#   bash bin/release.sh --no-push       # igual, pero sin subir (para revisar)
#   bash bin/release.sh --force         # vuelve a publicar una versión ya publicada
#
# Variables opcionales:
#   RELEASE_COMMIT_FOOTER   líneas que se añaden al final del mensaje del commit de la versión.
set -euo pipefail
cd "$( dirname "$0" )/.."

PUSH=1
FORCE=0
for arg in "$@"; do
	case "$arg" in
		--no-push) PUSH=0 ;;
		--force) FORCE=1 ;;
		*) echo "Opción desconocida: $arg"; exit 2 ;;
	esac
done

BRANCH=release
REPO_URL=$( git remote get-url origin | sed -E 's#^(https?://)[^@/]*@#\1#; s#\.git$##; s#^git@github\.com:#https://github.com/#; s#^https?://[^/]*/git/#https://github.com/#' )
VERSION=$( sed -n "s/^define( 'IMM_VERSION', '\([^']*\)' );/\1/p" imagina-menu.php )
HEADER_VERSION=$( sed -n 's/^ \* Version:[[:space:]]*\(.*\)$/\1/p' imagina-menu.php | tr -d '[:space:]' )
SOURCE=$( git rev-parse --short HEAD )
SOURCE_BRANCH=$( git rev-parse --abbrev-ref HEAD )

# ── Comprobaciones previas ─────────────────────────────────────────────────────────────────────
[ -n "$VERSION" ] || { echo "No se encontró IMM_VERSION en imagina-menu.php"; exit 1; }
[ "$VERSION" = "$HEADER_VERSION" ] || { echo "La versión de la cabecera ($HEADER_VERSION) no coincide con IMM_VERSION ($VERSION)"; exit 1; }
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Versión no válida: $VERSION (formato X.Y.Z)"; exit 1; }
if [ -n "$( git status --porcelain --untracked-files=no )" ]; then
	echo "Hay cambios sin confirmar: la versión publicada debe corresponder a un commit."; exit 1
fi
if [ "$SOURCE_BRANCH" = "$BRANCH" ]; then
	echo "Ejecuta el script desde la rama de desarrollo, no desde $BRANCH."; exit 1
fi

echo "▸ Imagina Menu $VERSION (commit $SOURCE de $SOURCE_BRANCH)"

# ── Pruebas y paquete ──────────────────────────────────────────────────────────────────────────
if [ -x vendor/bin/phpunit ]; then
	vendor/bin/phpunit --colors=never >/dev/null || { echo "Las pruebas unitarias fallan: no se publica."; exit 1; }
	echo "✔ Pruebas unitarias"
else
	echo "· Sin vendor/ (composer install): se omiten las pruebas unitarias"
fi
bash bin/build-zip.sh >/dev/null
ZIP="dist/imagina-menu-${VERSION}.zip"
[ -f "$ZIP" ] || { echo "No se generó $ZIP"; exit 1; }
# El ZIP debe instalarse como plugins/imagina-menu y traer el archivo principal con la misma versión.
unzip -p "$ZIP" imagina-menu/imagina-menu.php | grep -q "define( 'IMM_VERSION', '${VERSION}' );" || { echo "El ZIP no contiene imagina-menu/imagina-menu.php con la versión $VERSION"; exit 1; }
echo "✔ Paquete $ZIP ($( du -h "$ZIP" | cut -f1 ))"

# ── Rama release (huérfana) en un worktree temporal ────────────────────────────────────────────
WORK=$( mktemp -d )
cleanup() { git worktree remove --force "$WORK" >/dev/null 2>&1 || rm -rf "$WORK"; git worktree prune >/dev/null 2>&1 || true; }
trap cleanup EXIT

if git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null 2>&1; then
	git fetch -q origin "$BRANCH"
	git worktree add -q -B "$BRANCH" "$WORK" "origin/$BRANCH"
elif git show-ref --verify --quiet "refs/heads/$BRANCH"; then
	git worktree add -q "$WORK" "$BRANCH"
else
	git worktree add -q --detach "$WORK"
	( cd "$WORK" && git checkout -q --orphan "$BRANCH" && git rm -rfq . >/dev/null 2>&1 || true )
	( cd "$WORK" && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + )
fi

TARGET="$WORK/imagina-menu-${VERSION}.zip"
if [ -f "$TARGET" ] && [ "$FORCE" -ne 1 ]; then
	echo "La versión $VERSION ya está publicada en $BRANCH. Sube la versión en imagina-menu.php o usa --force."; exit 1
fi

cp "$ZIP" "$TARGET"
cp "$ZIP" "$WORK/imagina-menu.zip"

# Registro de versiones (una línea por versión: versión, fecha, commit de origen, tamaño).
LOG="$WORK/.versiones"
touch "$LOG"
grep -v "^${VERSION}	" "$LOG" > "$LOG.tmp" || true
printf "%s\t%s\t%s\t%s\n" "$VERSION" "$( date -u +%Y-%m-%d )" "$SOURCE" "$( du -h "$TARGET" | cut -f1 )" >> "$LOG.tmp"
sort -t. -k1,1nr -k2,2nr -k3,3nr "$LOG.tmp" > "$LOG"
rm -f "$LOG.tmp"

( cd "$WORK" && sha256sum imagina-menu-*.zip imagina-menu.zip > SHA256SUMS )

RAW="${REPO_URL}/raw/${BRANCH}"
{
	echo "# Imagina Menu — versiones para instalar"
	echo
	echo "Esta rama solo contiene el plugin empaquetado, listo para instalar en WordPress (sin código fuente)."
	echo
	echo "**Última versión: ${VERSION}** — [descargar imagina-menu.zip](${RAW}/imagina-menu.zip)"
	echo
	echo "## Instalar"
	echo
	echo "1. Descarga el ZIP de la versión que quieras."
	echo "2. En WordPress: **Plugins → Añadir nuevo → Subir plugin**, elige el ZIP y actívalo."
	echo "   Para actualizar sobre una versión instalada, WordPress ofrece «Reemplazar la versión actual»."
	echo "3. Con Imagina Updater: sube el mismo ZIP al servidor de actualizaciones."
	echo
	echo "Verifica la descarga con \`sha256sum -c SHA256SUMS\` (ver [SHA256SUMS](SHA256SUMS))."
	echo
	echo "## Versiones"
	echo
	echo "| Versión | Fecha | Descarga | Tamaño | Código fuente |"
	echo "|---|---|---|---|---|"
	while IFS=$'\t' read -r v d c s; do
		[ -n "$v" ] || continue
		echo "| ${v} | ${d} | [imagina-menu-${v}.zip](${RAW}/imagina-menu-${v}.zip) | ${s} | [\`${c}\`](${REPO_URL}/commit/${c}) |"
	done < "$LOG"
} > "$WORK/README.md"

MESSAGE="Versión ${VERSION}

Paquete imagina-menu-${VERSION}.zip generado con bin/build-zip.sh desde ${SOURCE} (${SOURCE_BRANCH})."
if [ -n "${RELEASE_COMMIT_FOOTER:-}" ]; then
	MESSAGE="${MESSAGE}

${RELEASE_COMMIT_FOOTER}"
fi

( cd "$WORK" && git add -A && git commit -q -m "$MESSAGE" )
echo "✔ Commit en $BRANCH: $( git -C "$WORK" log --oneline -1 )"

if [ "$PUSH" -eq 1 ]; then
	for attempt in 1 2 3 4; do
		if git -C "$WORK" push -q -u origin "$BRANCH"; then
			echo "✔ Publicado: ${RAW}/imagina-menu-${VERSION}.zip"
			exit 0
		fi
		sleep $(( 2 ** attempt ))
	done
	echo "No se pudo subir la rama $BRANCH."; exit 1
fi
echo "· Sin subir (--no-push). Rama local: $BRANCH"
