#!/usr/bin/env bash
# Build a self-contained ZIP for testers.
#
# The extension keeps words in chrome.storage.local and exports them on demand,
# so there is no native host to install.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(python3 -c "import json; print(json.load(open('$ROOT/manifest.json'))['version'])")"
OUT_DIR="$ROOT/dist"
OUT_FILE="$OUT_DIR/hassala-$VERSION-testers.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

cd "$ROOT"
zip -r "$OUT_FILE" \
  manifest.json \
  src \
  docs \
  README.md \
  CHANGELOG.md \
  LICENSE \
  -x '*.DS_Store' '*__pycache__*' '*.py[cod]' >/dev/null

echo "Built: $OUT_FILE"
echo "Size:  $(du -h "$OUT_FILE" | cut -f1)"
