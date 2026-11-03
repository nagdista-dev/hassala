#!/usr/bin/env python3
"""End-to-end tests for the Hassala native messaging host.

Run from the repository root:
    python3 tests/test_native_host.py

The host is copied into a temporary directory so the repository's own
native/config.json is never touched.
"""

from __future__ import annotations

import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
HOST_NAME = "hassala_writer.py"

failures: list[str] = []


def check(name: str, condition: bool, detail: object = "") -> None:
    if condition:
        print(f"  PASS  {name}")
    else:
        failures.append(name)
        print(f"  FAIL  {name} {detail}")


def send(host_path: str, message: dict) -> dict:
    payload = json.dumps(message, ensure_ascii=False).encode("utf-8")
    proc = subprocess.run(
        [sys.executable, host_path],
        input=struct.pack("<I", len(payload)) + payload,
        capture_output=True,
        timeout=30,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace"))
    raw = proc.stdout
    if len(raw) < 4:
        raise RuntimeError(f"short response: {raw!r}")
    size = struct.unpack("<I", raw[:4])[0]
    return json.loads(raw[4 : 4 + size].decode("utf-8"))


def write_config(host_dir: str, vault: str, file_name: str) -> None:
    with open(os.path.join(host_dir, "config.json"), "w", encoding="utf-8") as handle:
        json.dump({"vault": vault, "file": file_name}, handle)


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="hassala-host-test-") as tmp:
        host_dir = os.path.join(tmp, "native")
        vault = os.path.join(tmp, "vault")
        os.makedirs(vault)
        shutil.copytree(os.path.join(ROOT, "native"), host_dir)
        host = os.path.join(host_dir, HOST_NAME)
        write_config(host_dir, vault, "Hassala Words.md")
        note = os.path.join(vault, "Hassala Words.md")

        print("info")
        info = send(host, {"type": "info"})
        check("info ok", info.get("ok") is True, info)
        check("host name", info.get("host") == "hassala_writer", info.get("host"))
        check("host version", info.get("version") == 8, info.get("version"))
        check("default file path", info.get("filePath") == note, info.get("filePath"))

        print("missing default file")
        check("default file missing before save", not os.path.exists(note))
        checked = send(host, {"type": "checkFile", "file": note})
        check("check default ok", checked.get("ok") is True, checked)
        check("check default can create", checked.get("create") is True, checked)
        check("check does not create file", not os.path.exists(note))

        print("first save creates the default file")
        first = send(
            host,
            {
                "type": "append",
                "word": "hello",
                "translation": "مرحبًا",
                "mode": "en-ar",
            },
        )
        check("save ok", first.get("ok") is True, first)
        check("not duplicate", first.get("duplicate") is False, first)
        check("default file created", os.path.isfile(note))

        content = open(note, encoding="utf-8").read()
        check("tag added", "  - hassala" in content, content)
        check("header modern", "| # | English | Arabic |" in content, content)
        check("row written", "| 1 | hello | مرحبًا |" in content, content)

        print("duplicate")
        dup = send(
            host,
            {
                "type": "append",
                "word": "hello",
                "translation": "مرحبًا",
                "mode": "en-ar",
            },
        )
        check("duplicate flagged", dup.get("duplicate") is True, dup)
        content = open(note, encoding="utf-8").read()
        check("no second row", content.count("| 1 | hello |") == 1)

        print("reverse direction duplicate")
        rev = send(
            host,
            {
                "type": "append",
                "word": "مرحبًا",
                "translation": "hello",
                "mode": "ar-en",
            },
        )
        check("reverse duplicate flagged", rev.get("duplicate") is True, rev)

        print("custom existing Markdown file")
        custom = os.path.join(tmp, "custom.md")
        with open(custom, "w", encoding="utf-8") as handle:
            handle.write("# My notes\n\nSome text.\n")
        custom_save = send(
            host,
            {
                "type": "append",
                "word": "book",
                "translation": "كتاب",
                "mode": "en-ar",
                "file": custom,
            },
        )
        check("custom save ok", custom_save.get("ok") is True, custom_save)
        custom_content = open(custom, encoding="utf-8").read()
        check("custom row", "| 1 | book | كتاب |" in custom_content, custom_content)
        check(
            "blank line before appended table",
            "Some text.\n\n| # | English | Arabic |" in custom_content,
            custom_content,
        )

        print("custom paths are validated")
        missing = os.path.join(tmp, "missing.md")
        missing_res = send(
            host,
            {
                "type": "append",
                "word": "x",
                "translation": "س",
                "mode": "en-ar",
                "file": missing,
            },
        )
        check(
            "missing custom file rejected",
            missing_res.get("ok") is False and missing_res.get("error") == "file_missing",
            missing_res,
        )
        check("missing custom file not created", not os.path.exists(missing))

        non_md = os.path.join(tmp, "notes.txt")
        open(non_md, "w", encoding="utf-8").close()
        non_md_res = send(
            host,
            {
                "type": "append",
                "word": "x",
                "translation": "س",
                "mode": "en-ar",
                "file": non_md,
            },
        )
        check(
            "non-markdown rejected",
            non_md_res.get("ok") is False and non_md_res.get("error") == "invalid_file",
            non_md_res,
        )
        check(
            "non-markdown untouched",
            open(non_md, encoding="utf-8").read() == "",
        )

        traversal = send(
            host,
            {
                "type": "append",
                "word": "x",
                "translation": "س",
                "mode": "en-ar",
                "file": "../outside.md",
            },
        )
        check(
            "relative traversal rejected",
            traversal.get("ok") is False,
            traversal,
        )

        if hasattr(os, "symlink"):
            symlink = os.path.join(vault, "link.md")
            try:
                os.symlink(non_md, symlink)
            except OSError:
                symlink = ""
            if symlink:
                link_res = send(
                    host,
                    {
                        "type": "append",
                        "word": "x",
                        "translation": "س",
                        "mode": "en-ar",
                        "file": symlink,
                    },
                )
                check(
                    "symlink to non-markdown rejected",
                    link_res.get("ok") is False,
                    link_res,
                )

        print("Markdown escaping and dedupe")
        escaped = send(
            host,
            {
                "type": "append",
                "word": "<b>bold</b> & a|b",
                "translation": "نص <script>",
                "mode": "en-ar",
                "file": custom,
            },
        )
        check("escaped save ok", escaped.get("ok") is True, escaped)
        escaped_content = open(custom, encoding="utf-8").read()
        check(
            "html escaped",
            "&lt;b&gt;bold&lt;/b&gt; &amp; a\\|b" in escaped_content,
            escaped_content,
        )
        check(
            "script escaped",
            "&lt;script&gt;" in escaped_content,
            escaped_content,
        )
        escaped_dup = send(
            host,
            {
                "type": "append",
                "word": "<b>bold</b> & a|b",
                "translation": "نص <script>",
                "mode": "en-ar",
                "file": custom,
            },
        )
        check("escaped duplicate", escaped_dup.get("duplicate") is True, escaped_dup)

        print("old table migration")
        legacy = os.path.join(tmp, "legacy.md")
        with open(legacy, "w", encoding="utf-8") as handle:
            handle.write(
                "# Translated Words\n\n"
                "| Word | Translation | Direction | Added |\n"
                "| --- | --- | --- | --- |\n"
                "| hello | مرحبًا | en-ar | 2026-01-01 |\n"
            )
        mig = send(
            host,
            {
                "type": "append",
                "word": "new",
                "translation": "جديد",
                "mode": "en-ar",
                "file": legacy,
            },
        )
        check("migration save ok", mig.get("ok") is True, mig)
        migrated = open(legacy, encoding="utf-8").read()
        check("old title removed", "# Translated Words" not in migrated, migrated)
        check(
            "old columns removed",
            "Direction" not in migrated and "Added" not in migrated,
            migrated,
        )
        check("merged header", "| # | English | Arabic |" in migrated, migrated)
        check("old row kept", "| hello | مرحبًا |" in migrated, migrated)
        check("new row numbered", "| 2 | new | جديد |" in migrated, migrated)

        print("browse")
        browsed = send(
            host,
            {"type": "browse", "root": vault, "files": True, "showHidden": False},
        )
        check("browse ok", browsed.get("ok") is True, browsed)
        names = {entry["name"] for entry in browsed.get("files", [])}
        check("browse lists markdown", "Hassala Words.md" in names, names)

        print("open missing custom file")
        opened = send(host, {"type": "openFile", "file": missing})
        check(
            "open missing rejected",
            opened.get("ok") is False and opened.get("error") == "file_missing",
            opened,
        )

        print("invalid messages")
        invalid = send(host, {"type": "append"})
        check("empty fields rejected", invalid.get("ok") is False, invalid)
        unknown = send(host, {"type": "nope"})
        check("unknown action rejected", unknown.get("ok") is False, unknown)

    print()
    if failures:
        print(f"FAILED ({len(failures)}): {', '.join(failures)}")
        return 1
    print("All native host tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
