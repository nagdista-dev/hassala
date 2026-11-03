# Security — Hassala

**Last updated:** November 3, 2026

This document explains the threat model, security controls, permissions, and
known limitations. The goal is to make it clear what Hassala does and where its
trust boundaries are.

---

## 1. Scope

Hassala is a Manifest V3 browser extension. All code is bundled with the
extension, and the project has no backend server. Markdown saving happens
through a Native Messaging Host on the user's device.

**Assets we protect:**

- Translation text typed or selected by the user.
- Saved words and the Markdown word bank.
- Extension settings (file path, blocked sites, and so on).
- The user's device and files.
- The extension's reputation and publishing keys (no keys are stored in code).

---

## 2. Trust boundaries

```text
Web page (untrusted)
        │  DOM / selection / YouTube captions
        ▼
Content script (isolated world, extension code)
        │  chrome.runtime.sendMessage
        ▼
Background service worker
        │  chrome.runtime.sendNativeMessage
        ▼
Native host (Python, on the user's device)
        │  writes a .md file
        ▼
Local Markdown file
```

- **The page is untrusted.** Any data that comes from it (selected text, YouTube
  captions) is treated as text, never code.
- **Content scripts are isolated** from page JavaScript. The UI uses a closed
  Shadow DOM so the page cannot read the translation or input elements.
- **The background worker** is the only bridge between the UI and the native
  host.
- **The native host** is a separate process, restricted to the extension ID, and
  validates every path.

---

## 3. Security controls

### 3.1 Extension

- **No remote code:** no scripts are loaded from the internet, and there is no
  `eval` or `new Function`.
- **Explicit CSP:** `script-src 'self'; object-src 'self'`.
- **Restricted messaging:** `chrome.runtime.onMessage` rejects any message that
  does not come from this extension (`sender.id !== chrome.runtime.id`).
- **Safe rendering:** translations and captions are rendered with
  `textContent`, not `innerHTML`.
- **Closed Shadow DOM:** the page's JavaScript cannot access the UI.
- **Internal API:** YouTube talks to the translator through an object in the
  isolated world, and the background opens the panel through
  `chrome.tabs.sendMessage`, not a DOM event the page can forge.
- **No tracking:** no analytics, telemetry, or ads.

### 3.2 Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Save settings and recent words locally. |
| `nativeMessaging` | Talk to the host that writes the word bank file. |
| `scripting` | Inject the translator UI when the toolbar icon is clicked. |
| `activeTab` | Act on the current tab when a translation is requested. |
| `offscreen` | Play pronunciation audio without opening a window. |
| Host permissions | `clients5.google.com`, `api.mymemory.translated.net`, `translate.googleapis.com`, `translate.google.com` — translation and pronunciation services only. |

There is no `tabs`, `history`, `bookmarks`, or `downloads` permission, and no
access to the camera or microphone.

### 3.3 Native host

- **`allowed_origins`:** contains exactly one extension ID.
- **Bounded messages:** maximum 1 MB per message and 200 characters per field.
- **Bounded paths:** a custom path must be:
  - Absolute.
  - End with `.md`.
  - An existing regular file (not a directory or device).
  - Shorter than 4096 characters.
- **Only the default file** may be created automatically if it does not exist.
- **`realpath`:** symlinks are resolved before validation, so a `.md` path cannot
  point to a non-Markdown file.
- **No shell:** opening a file uses `xdg-open` / `open` / `os.startfile` with an
  argument list, not a shell string.
- **Markdown/HTML escaping:** `&`, `<`, `>`, `|`, and `\` are escaped before
  writing, so words cannot execute HTML or break the table.
- **No network:** the host makes no network connections.

### 3.4 Storage

- Settings and history live in `chrome.storage.local` (per device/profile).
- Translation and audio caches live only in service-worker memory.
- The word bank file lives on disk under the user's control.

---

## 4. Data that leaves the device

Translation text is sent to:

- `translate.googleapis.com`
- `clients5.google.com`
- `api.mymemory.translated.net` (fallback)
- `translate.google.com` / `translate.googleapis.com` (TTS)

All connections use HTTPS. See [PRIVACY.md](PRIVACY.md) for details. No other
data is sent anywhere.

---

## 5. Known limitations

- **Third-party translation services:** text reaches them under their own
  policies. Hassala does not control their retention.
- **Compromised device:** if the user's device has malware or a compromised
  browser profile, no extension can protect local data.
- **The native host is a local file:** anyone with access to the user's files can
  modify it. Users must protect their device account.
- **Markdown viewers:** the extension escapes HTML, but some Markdown apps allow
  raw HTML from other sources. Open files from trusted sources.
- **Translation is not encryption:** do not type secrets or sensitive data into
  a translator or your word bank file.

---

## 6. Reporting a security issue

- Use **Security → Report a vulnerability** in the
  [repository](https://github.com/nagdista-dev/hassala/security/advisories/new)
  (GitHub Security Advisories). This is the preferred path.
- If advisories are unavailable, open an issue titled `[security]` without
  sensitive details.
- **Do not disclose the details publicly** before a fix is available.
- Include the extension version, browser, operating system, reproduction steps,
  and impact.

No personal email is required or published by the project.

---

## 7. Release checks

```bash
bash scripts/check.sh
```

The checks verify:

- JavaScript, Python, JSON, and shell syntax.
- Every file referenced by the manifest and HTML exists.
- No stale paths or remote code.
- No personal names or home paths in extension code.
- Native host tests (save, duplicate, migration, path rejection, `.md` only).

Before any release:

1. `bash scripts/package.sh`
2. `unzip -l dist/hassala-<version>.zip` — must contain only `manifest.json` and
   `src/`.
3. Review `store/permissions.md`.
4. Upload the ZIP to the Chrome Web Store.
5. Keep the SHA256 of the package.

---

## 8. Security contribution rules

- Do not add `eval`, `new Function`, or remote code loading.
- Do not add tracking or analytics without an explicit discussion.
- Any new permission must be documented in `store/permissions.md` and
  `docs/PRIVACY.md`.
- Any new file write must go through `resolve_absolute_file` or `resolve_note`.
- Any new text from a page must be rendered with `textContent`.
- Run `bash scripts/check.sh` before any PR.
