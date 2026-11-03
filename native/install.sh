#!/usr/bin/env bash
# Register or remove the Hassala Markdown writer as a native messaging host.
#
# Supported browsers: Brave, Google Chrome, Chromium, and Microsoft Edge
# on Linux and macOS.
#
# The unpacked extension ID is derived from the extension folder path, so run
# this script again if you move or rename the folder.
#
# If you publish Hassala on the Chrome Web Store, install the host with the
# published extension ID instead:
#
#   HASSALA_EXT_ID=<chrome-web-store-extension-id> bash native/install.sh
#
# Remove the host again:
#
#   bash native/install.sh --uninstall
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$(cd "$HERE/.." && pwd)"
HOST_NAME="com.hassala.writer"
HOST_SCRIPT="$HERE/hassala_writer.py"
ACTION="install"
EXT_ID_ARG="${HASSALA_EXT_ID:-}"

usage() {
  cat <<'TEXT'
Usage: bash native/install.sh [options]

Options:
  --extension-id <id>   Register this 32-character Chrome extension ID.
                        Needed for a Chrome Web Store build, or on systems
                        where the unpacked ID cannot be derived.
  --uninstall           Remove the Hassala native host registration.
  -h, --help            Show this help.

Environment:
  HASSALA_EXT_ID        Same as --extension-id.
TEXT
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension-id)
      if [[ $# -lt 2 || -z "${2:-}" ]]; then
        echo "Missing value for --extension-id." >&2
        exit 2
      fi
      EXT_ID_ARG="$2"
      shift 2
      ;;
    --uninstall)
      ACTION="uninstall"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

compute_extension_id() {
  python3 - "$EXT_DIR" <<'PY'
import hashlib
import os
import sys

path = os.path.realpath(sys.argv[1])
digest = hashlib.sha256(path.encode()).hexdigest()[:32]
print("".join(chr(ord("a") + int(char, 16)) for char in digest))
PY
}

remove_hosts() {
  local target_dir="$1"
  mkdir -p "$target_dir"
  rm -f "$target_dir/$HOST_NAME.json"
  # Remove registrations written by older Hassala builds without hard-coding
  # a personal name or a previous extension ID.
  find "$target_dir" -maxdepth 1 -type f \
    -name 'com.*.obsidian_writer.json' -delete
}

install_host() {
  local target_dir="$1"
  local target_file="$target_dir/$HOST_NAME.json"
  remove_hosts "$target_dir"

  python3 - "$target_file" "$HOST_NAME" "$HOST_SCRIPT" "$EXT_ID" <<'PY'
import json
import sys

target_file, host_name, script_path, extension_id = sys.argv[1:5]
manifest = {
    "name": host_name,
    "description": "Hassala word bank writer (Markdown)",
    "path": script_path,
    "type": "stdio",
    "allowed_origins": [f"chrome-extension://{extension_id}/"],
}
with open(target_file, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY

  echo "Installed: $target_file"
}

case "$(uname -s)" in
  Darwin)
    BASE="$HOME/Library/Application Support"
    TARGETS=(
      "$BASE/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      "$BASE/Google/Chrome/NativeMessagingHosts"
      "$BASE/Chromium/NativeMessagingHosts"
      "$BASE/Microsoft Edge/NativeMessagingHosts"
    )
    ;;
  Linux)
    BASE="${XDG_CONFIG_HOME:-$HOME/.config}"
    TARGETS=(
      "$BASE/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      "$BASE/google-chrome/NativeMessagingHosts"
      "$BASE/chromium/NativeMessagingHosts"
      "$BASE/microsoft-edge/NativeMessagingHosts"
    )
    ;;
  *)
    echo "Unsupported OS: $(uname -s)." >&2
    echo "On Windows, use native/install.ps1 or follow docs/INSTALL.md." >&2
    exit 1
    ;;
esac

if [[ "$ACTION" == "uninstall" ]]; then
  for target in "${TARGETS[@]}"; do
    remove_hosts "$target"
    echo "Removed Hassala host from: $target"
  done
  echo
  echo "Uninstalled host: $HOST_NAME"
  exit 0
fi

if [[ -n "$EXT_ID_ARG" ]]; then
  EXT_ID="$EXT_ID_ARG"
else
  EXT_ID="$(compute_extension_id)"
fi

if [[ ! "$EXT_ID" =~ ^[a-p]{32}$ ]]; then
  echo "Invalid extension ID: $EXT_ID" >&2
  echo "Expected 32 characters in the range a-p." >&2
  exit 2
fi

if [[ ! -f "$HOST_SCRIPT" ]]; then
  echo "Missing host script: $HOST_SCRIPT" >&2
  exit 1
fi

chmod +x "$HOST_SCRIPT"

for target in "${TARGETS[@]}"; do
  install_host "$target"
done

cat <<TEXT

Host name:      $HOST_NAME
Extension ID:   $EXT_ID
Extension path: $EXT_DIR
Default file:   ~/Documents/Hassala Words.md

The native host works without a config file. To change the default folder,
copy native/config.example.json to native/config.json and edit it.

Reload the extension, then open its settings to verify the connection.
TEXT
