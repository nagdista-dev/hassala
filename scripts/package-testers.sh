#!/usr/bin/env bash
# Build a self-contained ZIP for testers.
#
# Unlike the store package, this archive includes the native host and the
# installation guide, so a tester can load the extension and enable saving
# without access to the private repository.
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
  native \
  docs \
  README.md \
  CHANGELOG.md \
  LICENSE \
  -x 'native/config.json' '*.DS_Store' '*__pycache__*' '*.py[cod]' >/dev/null

echo "Built: $OUT_FILE"
echo "Size:  $(du -h "$OUT_FILE" | cut -f1)"
