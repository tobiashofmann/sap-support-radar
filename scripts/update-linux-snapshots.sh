#!/usr/bin/env bash
#
# Regenerates the Playwright visual-regression baseline screenshots for
# linux (tests/e2e/*.spec.ts-snapshots/*-linux.png) from a macOS/Windows dev
# machine, using a container.
#
# Playwright keys each baseline screenshot's filename by OS platform
# (`-darwin.png` / `-linux.png` / `-win32.png` - see playwright.config.ts's
# use of the default `{testFilePath}-snapshots/{arg}-{projectName}-{platform}`
# naming). GitHub Actions' `ubuntu-latest` runners are Linux, so without a
# `-linux.png` baseline committed alongside the `-darwin.png` ones generated
# on a Mac, every toHaveScreenshot() assertion fails in CI with "no baseline
# found" - this script produces those Linux baselines locally, matching what
# CI will actually render, without needing a GitHub Actions run to do it.
#
# Usage: ./scripts/update-linux-snapshots.sh
#   CONTAINER_ENGINE=docker ./scripts/update-linux-snapshots.sh   # force docker over podman
#
# Requires Docker or Podman. Runs entirely inside the official Playwright
# container image - the dev server, the browser, and the test run all happen
# there, so the host's own node_modules (native macOS binaries, e.g. for
# UI5 Tooling/Vite) is never touched: node_modules inside the container is
# kept in its own volume, separate from the bind-mounted repository.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

if [ -n "${CONTAINER_ENGINE:-}" ]; then
	ENGINE="$CONTAINER_ENGINE"
elif command -v docker >/dev/null 2>&1; then
	ENGINE="docker"
elif command -v podman >/dev/null 2>&1; then
	ENGINE="podman"
else
	echo "Error: neither docker nor podman found on PATH. Install one, or set CONTAINER_ENGINE." >&2
	exit 1
fi

PLAYWRIGHT_VERSION="$(node -p "require('./node_modules/@playwright/test/package.json').version")"
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

echo "Using $ENGINE with image $IMAGE (matches the installed @playwright/test version)."

"$ENGINE" run --rm \
	--ipc=host \
	-v "$REPO_ROOT":/work \
	-v sap-support-radar-e2e-node-modules:/work/node_modules \
	-w /work \
	"$IMAGE" \
	bash -c "npm ci && npx playwright test --update-snapshots=all"

echo
echo "Done. Review the new/changed tests/e2e/*.spec.ts-snapshots/*-linux.png files before committing."
