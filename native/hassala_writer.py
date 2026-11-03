#!/usr/bin/env python3
"""Native messaging host: append saved words to a Hassala Markdown file.

The extension talks to this process through Chrome/Brave native messaging.
It only appends to one Markdown file chosen by the user, so a page can never
ask it to write anywhere else.
"""

from __future__ import annotations

import html
import json
import os
import re
import shutil
import struct
import subprocess
import sys

HOST_VERSION = 8
MAX_MESSAGE_BYTES = 1024 * 1024
MAX_FIELD_LENGTH = 200
MAX_NOTE_PATH = 300
MAX_ABSOLUTE_PATH = 4096
MAX_BROWSE_ENTRIES = 2000

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")

DEFAULT_CONFIG = {
    "vault": os.path.expanduser("~/Documents"),
    "file": "Hassala Words.md",
}

TABLE_HEADER = (
    "| # | English | Arabic |\n"
    "| --- | --- | --- |\n"
)
TABLE_SEPARATOR = "| --- | --- | --- |"
NUMBER_HEADERS = {"#", "no", "no.", "number", "رقم", "الرقم"}
ENGLISH_HEADERS = {"word", "english", "الكلمة"}
ARABIC_HEADERS = {"translation", "arabic", "الترجمة"}
EXTRA_HEADERS = {"direction", "added", "الاتجاه", "تمت الإضافة"}
PAGE_HEADER = (
    "---\n"
    "tags:\n"
    "  - english\n"
    "  - vocabulary\n"
    "  - hassala\n"
    "---\n\n"
)
GENERATED_TITLE = re.compile(r"(?m)^#\s+(?:Translated Words|Hassala Words)\s*\n+")
GENERATED_SECTION = re.compile(
    r"(?m)^##\s+(?:Added by Translator|Added by Hassala)\s*\n+"
)
ARABIC_TEXT = re.compile(r"[\u0600-\u06FF]")

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
WHITESPACE = re.compile(r"\s+")
TATWEEL = re.compile(r"\u0640")


# ---------- Native messaging protocol ----------


def read_message():
    header = sys.stdin.buffer.read(4)
    if len(header) != 4:
        return None

    length = struct.unpack("<I", header)[0]
    if length == 0 or length > MAX_MESSAGE_BYTES:
        return None

    payload = sys.stdin.buffer.read(length)
    try:
        return json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None


def write_message(message):
    payload = json.dumps(message, ensure_ascii=False).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(payload)))
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()


# ---------- Helpers ----------


def clean_field(value):
    text = CONTROL_CHARS.sub(" ", str(value or ""))
    return WHITESPACE.sub(" ", text).strip()[:MAX_FIELD_LENGTH]


def normalize_word(word):
    # English words are matched case-insensitively. Arabic keeps its letters
    # but ignores tatweel, so "كــتاب" and "كتاب" are the same word.
    return TATWEEL.sub("", WHITESPACE.sub(" ", word).strip()).casefold()


def escape_cell(value):
    # Keep saved words inert inside Markdown table cells. Raw HTML in a note is
    # rendered by some Markdown apps, and a word can come from any web page.
    text = value.replace("&", "&amp;")
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    return text.replace("\\", "\\\\").replace("|", "\\|")


def split_row(line):
    """Split a Markdown table row, honouring backslash-escaped pipes."""
    line = line.strip()
    if line.startswith("|"):
        line = line[1:]
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]

    cells = []
    current = []
    escaped = False

    for char in line:
        if escaped:
            current.append(char)
            escaped = False
        elif char == "\\":
            escaped = True
        elif char == "|":
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(char)

    if escaped:
        current.append("\\")
    cells.append("".join(current).strip())
    return cells


def normalize_note_path(value):
    # Notes are always addressed relative to the vault. Hidden folders and
    # parent traversal are rejected so a bad setting cannot escape the vault.
    if not isinstance(value, str):
        return None

    relative = CONTROL_CHARS.sub(" ", value).strip().replace("\\", "/")
    relative = relative.lstrip("/")

    if not relative or len(relative) > MAX_NOTE_PATH:
        return None
    if not relative.lower().endswith(".md"):
        relative += ".md"

    parts = relative.split("/")
    if any(
        not part or part in (".", "..") or part.startswith(".")
        for part in parts
    ):
        return None

    return "/".join(parts)


def resolve_note(vault, value):
    if not isinstance(value, str) or not value.strip():
        raise ValueError("invalid note path")

    raw = CONTROL_CHARS.sub(" ", value).strip()
    expanded = os.path.expanduser(raw)

    # The settings page prefers full paths from the filesystem root. Both
    # absolute paths and vault-relative names are accepted, but the final
    # target must always stay inside the configured vault.
    if os.path.isabs(expanded):
        if not expanded.lower().endswith(".md"):
            expanded += ".md"

        target = os.path.realpath(expanded)
        try:
            inside = os.path.commonpath([vault, target]) == vault
        except ValueError:
            inside = False

        if not inside:
            raise ValueError("target file must live inside the vault")
        if target == vault or os.path.isdir(target):
            raise ValueError("target must be a note file")

        relative = os.path.relpath(target, vault).replace(os.sep, "/")
        relative = normalize_note_path(relative)
        if not relative:
            raise ValueError("invalid note path")
        return target, relative

    relative = normalize_note_path(raw)
    if not relative:
        raise ValueError("invalid note path")

    target = os.path.realpath(os.path.join(vault, relative))
    try:
        inside = os.path.commonpath([vault, target]) == vault
    except ValueError:
        inside = False

    if not inside:
        raise ValueError("target file must live inside the vault")
    if target == vault or os.path.isdir(target):
        raise ValueError("target must be a note file")

    return target, relative


def resolve_absolute_file(value, allow_missing=False):
    """Resolve a full path chosen by the user, without a vault restriction.

    The settings page sends the exact Markdown file the user picked or typed.
    The file must already exist, so a typo can never create a note in the wrong
    place. Non-Markdown files are rejected so a bad path cannot be used to
    append table rows to shell config, source code, or other files.

    ``allow_missing`` is used internally for the configured default file only:
    Hassala may create that one file on first save, exactly as documented.
    """
    if not isinstance(value, str) or not value.strip():
        return None, "invalid_file"

    raw = CONTROL_CHARS.sub(" ", value).strip()
    if len(raw) > MAX_ABSOLUTE_PATH:
        return None, "invalid_file"

    expanded = os.path.expanduser(raw)
    if not os.path.isabs(expanded):
        return None, "invalid_file"

    target = os.path.realpath(expanded)
    if target == os.path.sep or os.path.isdir(target):
        return None, "invalid_file"
    if not target.lower().endswith(".md"):
        return None, "invalid_file"
    if not os.path.isfile(target):
        if allow_missing:
            return target, None
        return None, "file_missing"
    return target, None


def default_target_path():
    """Return the configured default Markdown file, or None if invalid."""
    try:
        _, target, _ = load_config()
        return target
    except Exception:
        return None


def stored_config():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as handle:
            stored = json.load(handle)
    except FileNotFoundError:
        return {}
    except (OSError, json.JSONDecodeError) as exc:
        print(f"hassala_writer: bad config: {exc}", file=sys.stderr)
        return {}

    return stored if isinstance(stored, dict) else {}


def load_config():
    config = dict(DEFAULT_CONFIG)
    stored = stored_config()

    if isinstance(stored.get("vault"), str) and stored["vault"].strip():
        config["vault"] = stored["vault"]
    if isinstance(stored.get("file"), str) and stored["file"].strip():
        config["file"] = stored["file"]

    vault = os.path.realpath(os.path.expanduser(config["vault"]))
    target, relative = resolve_note(vault, config["file"])
    return vault, target, relative


def browse_entries(path_value, root_value, include_files, show_hidden):
    has_root = isinstance(root_value, str) and bool(root_value.strip())

    if has_root:
        root = os.path.realpath(os.path.expanduser(root_value.strip()))
        if not os.path.isdir(root):
            return {"ok": False, "error": "vault_missing"}
        start = path_value if isinstance(path_value, str) and path_value.strip() else root
    else:
        root = ""
        start = (
            path_value
            if isinstance(path_value, str) and path_value.strip()
            else os.path.expanduser("~")
        )

    target = os.path.realpath(os.path.expanduser(start))

    if root:
        try:
            inside = os.path.commonpath([root, target]) == root
        except ValueError:
            inside = False
        if not inside:
            return {"ok": False, "error": "outside_root"}

    if not os.path.isdir(target):
        return {"ok": False, "error": "not_directory"}

    if root:
        parent = None if target == root else os.path.dirname(target)
    else:
        parent = os.path.dirname(target)
        if parent == target:
            parent = None

    dirs = []
    files = []

    try:
        with os.scandir(target) as iterator:
            for entry in iterator:
                if len(dirs) + len(files) >= MAX_BROWSE_ENTRIES:
                    break

                name = entry.name
                if not show_hidden and name.startswith("."):
                    continue

                try:
                    if entry.is_dir(follow_symlinks=False):
                        dirs.append({"name": name, "path": os.path.join(target, name)})
                    elif (
                        include_files
                        and entry.is_file(follow_symlinks=False)
                        and name.lower().endswith(".md")
                    ):
                        full = os.path.join(target, name)
                        relative = (
                            os.path.relpath(full, root).replace(os.sep, "/")
                            if root
                            else name
                        )
                        files.append(
                            {"name": name, "path": full, "relative": relative}
                        )
                except OSError:
                    continue
    except OSError as exc:
        print(f"hassala_writer: cannot browse: {exc}", file=sys.stderr)
        return {"ok": False, "error": "unreadable"}

    dirs.sort(key=lambda item: item["name"].casefold())
    files.sort(key=lambda item: item["name"].casefold())

    return {
        "ok": True,
        "path": target,
        "root": root,
        "parent": parent,
        "dirs": dirs,
        "files": files,
    }


def header_cells(line):
    cells = [cell.strip().casefold() for cell in split_row(line)]
    if cells and cells[0] in NUMBER_HEADERS:
        return cells[1:], True
    return cells, False


def is_our_header(line):
    if not line.startswith("|"):
        return False

    cells, _ = header_cells(line)
    if not 2 <= len(cells) <= 4:
        return False

    first_ok = cells[0] in ENGLISH_HEADERS
    second_ok = cells[1] in ARABIC_HEADERS
    rest_ok = set(cells[2:]) <= EXTRA_HEADERS
    return first_ok and second_ok and rest_ok


def numbered_header(line):
    _, numbered = header_cells(line)
    return numbered


def is_number_cell(value):
    return bool(re.fullmatch(r"\d+", value.strip()))


def extract_pair(cells, numbered):
    if numbered and len(cells) >= 3:
        cells = cells[1:]
    if len(cells) < 2:
        return None

    english, arabic = canonical_pair(cells[0], cells[1])
    if not english and not arabic:
        return None
    return english, arabic


def is_separator(line):
    if not line.startswith("|"):
        return False

    cells = split_row(line)
    return bool(cells) and all(
        cell and set(cell) <= set("-: ") for cell in cells
    )


def is_arabic_cell(value):
    return bool(ARABIC_TEXT.search(html.unescape(value)))


def canonical_pair(first, second):
    # English always lives in the first column and Arabic in the second,
    # regardless of the translation direction used when the row was added.
    first = html.unescape(first)
    second = html.unescape(second)
    if is_arabic_cell(first) and not is_arabic_cell(second):
        return second, first
    return first, second


def migrate_content(content):
    """Remove extra columns, number the rows, and fix mixed column order."""
    changed = False

    without_title = GENERATED_TITLE.sub("", content)
    if without_title != content:
        content = without_title
        changed = True

    without_section = GENERATED_SECTION.sub("", content)
    if without_section != content:
        content = without_section
        changed = True

    lines = content.splitlines(keepends=True)
    output = []
    in_table = False
    numbered = False
    row_number = 0

    for line in lines:
        stripped = line.strip()
        newline = "\n" if line.endswith("\n") else ""

        if is_our_header(stripped):
            numbered = numbered_header(stripped)
            header = "| # | English | Arabic |" + newline
            output.append(header)
            in_table = True
            row_number = 0
            if stripped != header.strip():
                changed = True
            continue

        if in_table and is_separator(stripped):
            separator = TABLE_SEPARATOR + newline
            output.append(separator)
            if stripped != separator.strip():
                changed = True
            continue

        if in_table and stripped.startswith("|"):
            cells = split_row(stripped)
            pair = extract_pair(cells, numbered)
            if pair:
                english, arabic = pair
                row_number += 1
                row = (
                    f"| {row_number} | {escape_cell(english)} "
                    f"| {escape_cell(arabic)} |{newline}"
                )
                output.append(row)
                if row != line:
                    changed = True
                continue
        elif in_table and stripped and not stripped.startswith("|"):
            in_table = False

        output.append(line)

    return "".join(output), changed


def check_file(value):
    target, error = resolve_absolute_file(value, allow_missing=True)
    if error:
        return {"ok": False, "error": error}

    if not os.path.isfile(target):
        default = default_target_path()
        if not default or target != default:
            return {"ok": False, "error": "file_missing"}
        return {
            "ok": True,
            "create": True,
            "file": target,
            "filePath": target,
            "path": target,
        }

    if not os.access(target, os.W_OK):
        return {"ok": False, "error": "write_failed"}

    return {
        "ok": True,
        "create": False,
        "file": target,
        "filePath": target,
        "path": target,
    }


def open_file(value):
    """Open the chosen note with the user's default Markdown app."""
    if isinstance(value, str) and value.strip():
        target, error = resolve_absolute_file(value, allow_missing=True)
        if error:
            return {"ok": False, "error": error}
        if not os.path.isfile(target):
            default = default_target_path()
            if not default or target != default:
                return {"ok": False, "error": "file_missing"}
            try:
                ensure_note(target, create=True)
            except OSError:
                return {"ok": False, "error": "write_failed"}
    else:
        try:
            _, target, _ = load_config()
        except Exception:
            return {"ok": False, "error": "config_error"}
        if not os.path.isfile(target):
            try:
                ensure_note(target, create=True)
            except OSError:
                return {"ok": False, "error": "file_missing"}

    try:
        if os.name == "nt":
            os.startfile(target)  # type: ignore[attr-defined]
        elif sys.platform == "darwin":
            subprocess.Popen(
                ["open", target],
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        else:
            opener = shutil.which("xdg-open")
            command = [opener, target] if opener else None
            if command is None:
                gio = shutil.which("gio")
                if gio:
                    command = [gio, "open", target]
            if command is None:
                return {"ok": False, "error": "open_failed"}
            subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
    except (OSError, ValueError) as exc:
        print(f"hassala_writer: cannot open note: {exc}", file=sys.stderr)
        return {"ok": False, "error": "open_failed"}

    return {
        "ok": True,
        "file": target,
        "filePath": target,
        "path": target,
    }


def ensure_note(path, create=True):
    if not os.path.exists(path):
        if not create:
            raise FileNotFoundError(path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(PAGE_HEADER + TABLE_HEADER)
        return

    with open(path, encoding="utf-8") as handle:
        content = handle.read()

    migrated, changed = migrate_content(content)
    if changed:
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(migrated)
        content = migrated

    if TABLE_SEPARATOR in content:
        return

    # The note was created or edited by hand. Add our table at the end rather
    # than trying to rewrite whatever the user already wrote.
    if content and not content.endswith("\n"):
        content += "\n"
    if content and not content.endswith("\n\n"):
        content += "\n"

    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content + TABLE_HEADER)


def existing_rows(path):
    found = set()
    count = 0
    in_table = False
    numbered = False

    try:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                stripped = line.strip()

                if is_our_header(stripped):
                    numbered = numbered_header(stripped)
                    in_table = True
                    continue

                if not in_table:
                    continue

                if is_separator(stripped):
                    continue

                if stripped.startswith("|"):
                    pair = extract_pair(split_row(stripped), numbered)
                    if pair:
                        english, arabic = pair
                        found.add(
                            (normalize_word(english), normalize_word(arabic))
                        )
                        count += 1
                elif stripped:
                    in_table = False
    except FileNotFoundError:
        pass

    return found, count


def append_entry(word, translation, mode, file_override=None):
    override = file_override.strip() if isinstance(file_override, str) else ""

    if override:
        expanded = os.path.expanduser(CONTROL_CHARS.sub(" ", override).strip())

        if os.path.isabs(expanded):
            target, error = resolve_absolute_file(override, allow_missing=True)
            if error:
                return {"ok": False, "error": error}
            if not os.path.isfile(target):
                default = default_target_path()
                if not default or target != default:
                    return {"ok": False, "error": "file_missing"}
            relative = target
        else:
            vault, _, _ = load_config()
            if not os.path.isdir(vault):
                return {"ok": False, "error": "vault_missing"}
            try:
                target, relative = resolve_note(vault, override)
            except ValueError:
                return {"ok": False, "error": "invalid_file"}
    else:
        vault, target, relative = load_config()
        if not os.path.isdir(vault):
            return {"ok": False, "error": "vault_missing"}

    try:
        ensure_note(target, create=True)
    except FileNotFoundError:
        return {"ok": False, "error": "file_missing"}
    except OSError:
        return {"ok": False, "error": "write_failed"}

    if mode == "ar-en":
        english, arabic = translation, word
    else:
        english, arabic = word, translation

    pair = (normalize_word(english), normalize_word(arabic))
    pairs, count = existing_rows(target)
    if pair in pairs:
        return {
            "ok": True,
            "duplicate": True,
            "file": relative,
            "filePath": target,
            "path": target,
        }

    # Only the language pair is stored; the direction and date add no value.
    row = (
        f"| {count + 1} | {escape_cell(english)} "
        f"| {escape_cell(arabic)} |\n"
    )

    prefix = ""
    if os.path.getsize(target) > 0:
        with open(target, "rb") as handle:
            handle.seek(-1, os.SEEK_END)
            if handle.read(1) != b"\n":
                prefix = "\n"

    with open(target, "a", encoding="utf-8") as handle:
        handle.write(prefix + row)

    return {
        "ok": True,
        "duplicate": False,
        "file": relative,
        "filePath": target,
        "path": target,
    }


# ---------- Entry point ----------


def main():
    message = read_message()
    if not isinstance(message, dict):
        write_message({"ok": False, "error": "invalid_message"})
        return 0

    kind = message.get("type", "append")

    if kind in ("ping", "info"):
        try:
            vault, target, relative = load_config()
            write_message(
                {
                    "ok": True,
                    "host": "hassala_writer",
                    "version": HOST_VERSION,
                    "vault": vault,
                    "file": relative,
                    "filePath": target,
                    "path": target,
                    "defaultFile": relative,
                    "defaultFilePath": target,
                }
            )
        except Exception as exc:  # noqa: BLE001 - report instead of crashing
            write_message({"ok": False, "error": "config_error", "detail": str(exc)[:200]})
        return 0

    if kind == "browse":
        try:
            write_message(
                browse_entries(
                    message.get("path"),
                    message.get("root"),
                    bool(message.get("files")),
                    bool(message.get("showHidden")),
                )
            )
        except Exception as exc:  # noqa: BLE001 - report instead of crashing
            print(f"hassala_writer: browse failed: {exc}", file=sys.stderr)
            write_message({"ok": False, "error": "browse_failed"})
        return 0

    if kind == "checkFile":
        try:
            write_message(check_file(message.get("file")))
        except Exception as exc:  # noqa: BLE001 - report instead of crashing
            print(f"hassala_writer: checkFile failed: {exc}", file=sys.stderr)
            write_message({"ok": False, "error": "write_failed"})
        return 0

    if kind == "openFile":
        try:
            write_message(open_file(message.get("file")))
        except Exception as exc:  # noqa: BLE001 - report instead of crashing
            print(f"hassala_writer: openFile failed: {exc}", file=sys.stderr)
            write_message({"ok": False, "error": "open_failed"})
        return 0

    if kind != "append":
        write_message({"ok": False, "error": "unknown_action"})
        return 0

    word = clean_field(message.get("word"))
    translation = clean_field(message.get("translation"))
    mode = message.get("mode")
    file_override = message.get("file")

    if not word or not translation:
        write_message({"ok": False, "error": "empty"})
        return 0
    if mode not in ("en-ar", "ar-en"):
        write_message({"ok": False, "error": "invalid_direction"})
        return 0
    if file_override is not None and not isinstance(file_override, str):
        write_message({"ok": False, "error": "invalid_file"})
        return 0

    try:
        write_message(
            append_entry(
                word,
                translation,
                mode,
                file_override if isinstance(file_override, str) and file_override.strip() else None,
            )
        )
    except Exception as exc:  # noqa: BLE001 - never break the protocol
        print(f"hassala_writer: {exc}", file=sys.stderr)
        write_message({"ok": False, "error": "write_failed"})

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
