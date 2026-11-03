#!/usr/bin/env bash
# Run every local check before committing or packaging Hassala.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== JavaScript syntax =="
while IFS= read -r -d '' file; do
  node --check "$file"
  echo "ok    ${file#./}"
done < <(find src -type f -name '*.js' -print0 | sort -z)

echo
echo "== Python syntax =="
python3 -m py_compile native/hassala_writer.py scripts/*.py tests/*.py
echo "ok    Python files"

echo
echo "== JSON =="
while IFS= read -r -d '' file; do
  jq empty "$file"
  echo "ok    ${file#./}"
done < <(
  find . -type f -name '*.json' \
    -not -path './.git/*' -not -path './dist/*' -not -path './node_modules/*' \
    -not -path '*/__pycache__/*' -print0 | sort -z
)

echo
echo "== Shell syntax =="
for file in native/*.sh scripts/*.sh; do
  bash -n "$file"
  echo "ok    $file"
done

echo
echo "== References, security, and privacy =="
python3 scripts/check_refs.py

echo
echo "== Native host end-to-end tests =="
python3 tests/test_native_host.py

echo
echo "All checks passed."
