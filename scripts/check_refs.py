#!/usr/bin/env python3
"""Static checks for manifest/HTML/JS references and privacy regressions."""

from __future__ import annotations

import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
FAILURES: list[str] = []
ALLOWED_HOME_NAMES = {"you", "user", "me", "name", "username", "example"}


def fail(message: str) -> None:
    FAILURES.append(message)
    print(f"FAIL  {message}")


def ok(message: str) -> None:
    print(f"ok    {message}")


def read(path: str) -> str:
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def check_file(path: str, label: str) -> None:
    full = os.path.join(ROOT, path)
    if os.path.isfile(full):
        ok(f"{label}: {path}")
    else:
        fail(f"{label} missing: {path}")


def main() -> int:
    manifest_path = os.path.join(ROOT, "manifest.json")
    try:
        manifest = json.loads(read(manifest_path))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL  manifest.json: {exc}")
        return 1

    ok("manifest.json parses")

    # Runtime files declared in the manifest.
    for key in ("background",):
        value = manifest.get(key, {}).get("service_worker")
        if value:
            check_file(value, key)

    options_page = manifest.get("options_ui", {}).get("page")
    if options_page:
        check_file(options_page, "options_ui")

    for group, key in (("icons", "icons"), ("action", "default_icon")):
        values = manifest.get(group, {})
        if group == "action":
            values = values.get(key, {}) if isinstance(values, dict) else {}
        for size, path in values.items():
            check_file(path, f"{group} {size}")

    for index, script in enumerate(manifest.get("content_scripts", [])):
        for path in script.get("js", []) + script.get("css", []):
            check_file(path, f"content_scripts[{index}]")

    for index, resource in enumerate(manifest.get("web_accessible_resources", [])):
        for pattern in resource.get("resources", []):
            if "*" in pattern:
                directory = os.path.join(ROOT, os.path.dirname(pattern))
                if os.path.isdir(directory):
                    ok(f"web_accessible_resources[{index}]: {pattern}")
                else:
                    fail(f"web_accessible_resources directory missing: {pattern}")
            else:
                check_file(pattern, f"web_accessible_resources[{index}]")

    # Local HTML references.
    html_files = [
        os.path.join(dirpath, name)
        for dirpath, _, names in os.walk(os.path.join(ROOT, "src"))
        for name in names
        if name.endswith(".html")
    ]
    for html_path in html_files:
        base = os.path.dirname(html_path)
        text = read(html_path)
        for match in re.finditer(r'(?:src|href)="([^"]+)"', text):
            ref = match.group(1)
            if ref.startswith(("#", "http:", "https:", "data:", "mailto:")):
                continue
            target = os.path.normpath(os.path.join(base, ref.split("?", 1)[0]))
            if os.path.isfile(target):
                ok(f"HTML ref in {os.path.relpath(html_path, ROOT)}: {ref}")
            else:
                fail(f"broken HTML ref in {os.path.relpath(html_path, ROOT)}: {ref}")

    # importScripts and runtime.getURL references in JS.
    js_files = [
        os.path.join(dirpath, name)
        for dirpath, _, names in os.walk(os.path.join(ROOT, "src"))
        for name in names
        if name.endswith(".js")
    ]
    for js_path in js_files:
        base = os.path.dirname(js_path)
        text = read(js_path)
        for match in re.finditer(r"importScripts\(['\"]([^'\"]+)['\"]\)", text):
            target = os.path.normpath(os.path.join(base, match.group(1)))
            if os.path.isfile(target):
                ok(f"importScripts in {os.path.relpath(js_path, ROOT)}")
            else:
                fail(f"broken importScripts in {os.path.relpath(js_path, ROOT)}")
        for match in re.finditer(r"getURL\(['\"]([^'\"]+)['\"]\)", text):
            ref = match.group(1)
            target = os.path.join(ROOT, ref)
            if os.path.isfile(target):
                ok(f"getURL in {os.path.relpath(js_path, ROOT)}: {ref}")
            else:
                fail(f"broken getURL in {os.path.relpath(js_path, ROOT)}: {ref}")

    # Security regressions.
    forbidden = {
        "remote code eval": "eval(",
        "remote code Function": "new Function(",
        "document.write": "document.write(",
    }

    text_extensions = (
        ".js",
        ".html",
        ".css",
        ".py",
        ".sh",
        ".json",
        ".md",
        ".txt",
        ".yml",
        ".yaml",
        ".ps1",
        ".bat",
    )
    skip_dirs = {".git", "dist", "node_modules", "__pycache__"}
    scan_files: list[str] = []
    for dirpath, dirnames, names in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in skip_dirs]
        for name in names:
            full = os.path.join(dirpath, name)
            if name in {"TODO.md", "check_refs.py"}:
                continue
            if name.endswith(text_extensions) or name in {"LICENSE", ".gitignore"}:
                scan_files.append(full)

    for path in scan_files:
        text = read(path)
        relative = os.path.relpath(path, ROOT)
        for label, needle in forbidden.items():
            if needle in text:
                fail(f"{label} found in {relative}")
        if relative.endswith(".html") and re.search(
            r"<script(?![^>]*\bsrc=)[^>]*>", text
        ):
            fail(f"inline script found in {relative}")

        # A real home directory must never be committed. Placeholders such as
        # /home/you are documentation examples and are allowed.
        for match in re.finditer(r"/home/([A-Za-z0-9._-]+)", text):
            if match.group(1).lower() not in ALLOWED_HOME_NAMES:
                fail(f"personal home path found in {relative}: {match.group(0)}")

    # Old root-level layout must not come back.
    manifest_text = read(manifest_path)
    for stale in (
        '"icons/icon128.png"',
        '"service_worker": "background.js"',
        '"page": "options.html"',
    ):
        if stale in manifest_text:
            fail(f"stale manifest path: {stale}")

    # The bundled font must be present and licensed.
    check_file("src/fonts/BalooBhaijaan2-Variable.woff2", "bundled font")
    check_file("src/fonts/OFL.txt", "font license")

    print()
    if FAILURES:
        print(f"{len(FAILURES)} check(s) failed.")
        return 1
    print("All reference and regression checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
