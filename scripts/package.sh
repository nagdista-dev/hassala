#!/usr/bin/env bash
# Build a Chrome Web Store-ready ZIP.
#
# The archive contains only the files the extension needs at runtime.
# Docs, brand assets, and store copy are excluded.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(python3 -c "import json; print(json.load(open('$ROOT/manifest.json'))['version'])")"
OUT_DIR="$ROOT/dist"
OUT_FILE="$OUT_DIR/hassala-$VERSION.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

cd "$ROOT"
zip -r "$OUT_FILE" manifest.json src \
  -x '*.DS_Store' '*__pycache__*' '*.py[cod]' >/dev/null

echo "Built: $OUT_FILE"
echo "Size:  $(du -h "$OUT_FILE" | cut -f1)"
