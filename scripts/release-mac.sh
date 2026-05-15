#!/usr/bin/env bash
#
# Codi macOS release helper.
#
# One command to:
#   1. Sanity-check the repo state (clean tree, main branch, version, tag).
#   2. Build the universal-binary .dmg artifacts.
#   3. Create a GitHub Release and upload both arm64 / x64 .dmg files.
#
# Usage:
#   npm run release:mac
#
# Environment knobs:
#   RELEASE_DRY_RUN=1          Print the gh commands but do not call them.
#   RELEASE_DRAFT=1            Create the release as a draft (recommended for the first run).
#   RELEASE_ALLOW_NON_MAIN=1   Allow running from a non-main branch (CI / experiments).
#   RELEASE_SKIP_BUILD=1       Skip `npm run build` (use the .dmg already in release/).
#
# The script never pushes commits or git tags directly. `gh release create`
# creates and pushes the tag for us.

set -euo pipefail

# ----- helpers ---------------------------------------------------------------

err() {
	printf '\033[31m[release-mac] ERROR:\033[0m %s\n' "$*" >&2
}

info() {
	printf '\033[34m[release-mac]\033[0m %s\n' "$*"
}

dry_or_run() {
	if [[ "${RELEASE_DRY_RUN:-0}" == "1" ]]; then
		printf '\033[33m[DRY-RUN]\033[0m %s\n' "$*"
	else
		eval "$*"
	fi
}

# ----- locate repo root ------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ----- preflight checks ------------------------------------------------------

if ! command -v gh >/dev/null 2>&1; then
	err "gh CLI not found. Install with: brew install gh"
	exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
	err "gh CLI is not logged in. Run: gh auth login"
	exit 1
fi

if ! command -v node >/dev/null 2>&1; then
	err "node not found in PATH."
	exit 1
fi

# Clean working tree (allow untracked .claude/ etc. that are gitignored).
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
	err "Working tree has uncommitted changes. Commit or stash first."
	git status --short
	exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" && "${RELEASE_ALLOW_NON_MAIN:-0}" != "1" ]]; then
	err "Current branch is '$CURRENT_BRANCH', not 'main'. Set RELEASE_ALLOW_NON_MAIN=1 to override."
	exit 1
fi

VERSION="$(node -p "require('./package.json').version")"
if [[ -z "$VERSION" ]]; then
	err "Could not read version from package.json."
	exit 1
fi
TAG="v$VERSION"
info "Version: $VERSION (tag $TAG)"

# Abort if the GitHub Release already exists.
if gh release view "$TAG" >/dev/null 2>&1; then
	err "GitHub Release $TAG already exists. Bump the version (npm run version:patch) and retry."
	exit 1
fi

# ----- build -----------------------------------------------------------------

if [[ "${RELEASE_SKIP_BUILD:-0}" == "1" ]]; then
	info "RELEASE_SKIP_BUILD=1 — skipping npm run build."
else
	info "Running npm run build (vite + electron-builder dmg)..."
	npm run build
fi

ARM64_DMG="release/Codi-$VERSION-arm64.dmg"
X64_DMG="release/Codi-$VERSION.dmg"

for f in "$ARM64_DMG" "$X64_DMG"; do
	if [[ ! -f "$f" ]]; then
		err "Expected build artifact not found: $f"
		exit 1
	fi
	# Require at least 50 MB to catch corrupt / empty dmgs.
	size_bytes="$(stat -f%z "$f" 2>/dev/null || stat -c%s "$f")"
	if (( size_bytes < 50 * 1024 * 1024 )); then
		err "$f is only $size_bytes bytes (< 50 MB). Build may be broken."
		exit 1
	fi
	info "OK: $f ($size_bytes bytes)"
done

# ----- release notes ---------------------------------------------------------

NOTES_TEMPLATE="$REPO_ROOT/scripts/release-notes.template.md"
if [[ ! -f "$NOTES_TEMPLATE" ]]; then
	err "Release notes template missing: $NOTES_TEMPLATE"
	exit 1
fi

NOTES_TMP="$(mktemp -t codi-release-notes.XXXXXX)"
trap 'rm -f "$NOTES_TMP"' EXIT
sed "s/{{VERSION}}/$VERSION/g" "$NOTES_TEMPLATE" >"$NOTES_TMP"
info "Release notes prepared at $NOTES_TMP"

# ----- gh release create -----------------------------------------------------

EXTRA_ARGS=()
if [[ "${RELEASE_DRAFT:-0}" == "1" ]]; then
	EXTRA_ARGS+=("--draft")
fi

# Use an array to keep the command auditable in dry-run mode.
CREATE_CMD=(gh release create "$TAG" --title "Codi $TAG" --notes-file "$NOTES_TMP" "${EXTRA_ARGS[@]}")
UPLOAD_CMD=(gh release upload "$TAG" "$ARM64_DMG" "$X64_DMG" --clobber)

if [[ "${RELEASE_DRY_RUN:-0}" == "1" ]]; then
	printf '\033[33m[DRY-RUN]\033[0m %s\n' "${CREATE_CMD[*]}"
	printf '\033[33m[DRY-RUN]\033[0m %s\n' "${UPLOAD_CMD[*]}"
	info "Dry-run complete. Nothing was published."
	exit 0
fi

info "Creating release $TAG ..."
"${CREATE_CMD[@]}"

info "Uploading artifacts ..."
"${UPLOAD_CMD[@]}"

RELEASE_URL="$(gh release view "$TAG" --json url --jq .url)"
info "Done. Release URL: $RELEASE_URL"
