#!/usr/bin/env python3
"""Validate the public GitHub Pages site: metadata, links, JSON-LD, sitemap."""

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE_URL = "https://hassala.nagdista.com/"
FAILURES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)
    print(f"FAIL  {message}")


def ok(message: str) -> None:
    print(f"ok    {message}")


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.stack: list[str] = []
        self.json_ld: list[str] = []
        self._in_json_ld = False
        self._buffer = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if "id" in attributes and attributes["id"]:
            self.ids.append(attributes["id"])
        if tag == "script" and attributes.get("type") == "application/ld+json":
            self._in_json_ld = True
            self._buffer = ""
        if tag not in {
            "meta", "link", "img", "br", "hr", "input", "source", "area",
            "base", "col", "embed", "param", "track", "wbr",
        }:
            self.stack.append(tag)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._in_json_ld:
            self._in_json_ld = False
            self.json_ld.append(self._buffer)
        if tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                fail(f"unclosed <{self.stack.pop()}> before </{tag}>")
            if self.stack:
                self.stack.pop()

    def handle_data(self, data: str) -> None:
        if self._in_json_ld:
            self._buffer += data


def check_metadata(path: Path, text: str) -> None:
    relative = path.relative_to(ROOT)
    if "<title>" not in text:
        fail(f"{relative}: missing <title>")
    if 'name="description"' not in text:
        fail(f"{relative}: missing meta description")
    if 'rel="canonical"' not in text:
        fail(f"{relative}: missing canonical URL")
    lang = re.search(r'<html[^>]*\blang="([^"]+)"', text)
    if not lang:
        fail(f"{relative}: missing html lang")
    if path.parts[-2:] == ("ar", "index.html") or "/ar/" in path.as_posix():
        if 'dir="rtl"' not in text:
            fail(f"{relative}: Arabic page must set dir=rtl")
    canonical = re.search(r'<link rel="canonical" href="([^"]+)"', text)
    if canonical and not canonical.group(1).startswith(BASE_URL):
        fail(f"{relative}: canonical is outside {BASE_URL}: {canonical.group(1)}")


def check_links(path: Path, text: str) -> None:
    relative = path.relative_to(ROOT)
    for match in re.finditer(r'(?:href|src)="([^"]+)"', text):
        target = match.group(1)
        if target.startswith(("http://", "https://", "#", "mailto:", "data:", "tel:")):
            continue
        clean = target.split("#", 1)[0].split("?", 1)[0]
        if not clean:
            continue
        resolved = (path.parent / clean).resolve()
        if resolved.is_dir():
            resolved = resolved / "index.html"
        if not resolved.is_file():
            fail(f"{relative}: broken local target {target}")


def check_json_ld(path: Path, blocks: list[str]) -> None:
    relative = path.relative_to(ROOT)
    if not blocks:
        fail(f"{relative}: missing JSON-LD")
        return
    for block in blocks:
        try:
            json.loads(block)
            ok(f"{relative}: JSON-LD parses")
        except json.JSONDecodeError as exc:
            fail(f"{relative}: invalid JSON-LD: {exc}")


def main() -> int:
    if not SITE.is_dir():
        fail("site/ directory is missing")
        return 1

    html_files = sorted(SITE.rglob("*.html"))
    if not html_files:
        fail("no HTML files found in site/")
        return 1

    canonical_urls: dict[str, Path] = {}
    alternates_by_page: dict[str, dict[str, str]] = {}
    page_langs: dict[str, str] = {}
    for path in html_files:
        text = path.read_text(encoding="utf-8")
        relative = path.relative_to(ROOT)
        parser = PageParser()
        parser.feed(text)
        parser.close()
        if parser.stack:
            fail(f"{relative}: unclosed tags at end: {parser.stack}")
        duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicates:
            fail(f"{relative}: duplicate ids: {duplicates}")
        check_metadata(path, text)
        check_links(path, text)
        check_json_ld(path, parser.json_ld)

        canonical = re.search(r'<link rel="canonical" href="([^"]+)"', text)
        if canonical:
            if canonical.group(1) in canonical_urls:
                fail(f"{relative}: duplicate canonical with {canonical_urls[canonical.group(1)]}")
            canonical_urls[canonical.group(1)] = path
            language = re.search(r'<html[^>]*\blang="([^"]+)"', text)
            page_langs[canonical.group(1)] = language.group(1) if language else "en"
            alternates_by_page[canonical.group(1)] = dict(
                re.findall(
                    r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"',
                    text,
                )
            )

    # hreflang must be reciprocal and point to real pages.
    for canonical, alternates in alternates_by_page.items():
        path = canonical_urls[canonical]
        if not alternates:
            continue
        language = page_langs[canonical]
        if "x-default" not in alternates:
            fail(f"{path.relative_to(ROOT)}: missing hreflang x-default")
        if alternates.get(language) != canonical:
            fail(f"{path.relative_to(ROOT)}: missing self hreflang for {language}")
        for alternate_language, target in alternates.items():
            if alternate_language == "x-default":
                continue
            if target not in canonical_urls:
                fail(
                    f"{path.relative_to(ROOT)}: hreflang {alternate_language} "
                    f"target is not a known page: {target}"
                )
                continue
            if alternates_by_page[target].get(language) != canonical:
                fail(
                    f"{path.relative_to(ROOT)}: hreflang {alternate_language} -> "
                    f"{target}, but the target does not link back with {language}"
                )

    # Sitemap must describe real pages and include every page with a canonical.
    sitemap_path = SITE / "sitemap.xml"
    if not sitemap_path.is_file():
        fail("site/sitemap.xml is missing")
    else:
        try:
            tree = ET.parse(sitemap_path)
        except ET.ParseError as exc:
            fail(f"sitemap.xml does not parse: {exc}")
        else:
            namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            locations = [node.text for node in tree.findall(".//s:loc", namespace)]
            if not locations:
                fail("sitemap.xml has no URLs")
            for location in locations:
                if not location:
                    continue
                # The site lives at the root of its domain, so the URL path is
                # the folder path inside site/ ("" -> index.html).
                relative = urlparse(location).path.strip("/")
                target = SITE / relative / "index.html" if relative else SITE / "index.html"
                if not target.is_file():
                    fail(f"sitemap URL does not map to a file: {location} -> {target}")
            for canonical, path in canonical_urls.items():
                if canonical not in locations:
                    fail(f"{path.relative_to(ROOT)}: canonical is missing from sitemap.xml")
            ok(f"sitemap.xml lists {len(locations)} URLs")

    for required in ("robots.txt", "llms.txt", "llms-full.txt", "site.webmanifest"):
        if not (SITE / required).is_file():
            fail(f"site/{required} is missing")
        else:
            ok(f"site/{required} exists")

    print()
    if FAILURES:
        print(f"{len(FAILURES)} site check(s) failed.")
        return 1
    print("All site checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
