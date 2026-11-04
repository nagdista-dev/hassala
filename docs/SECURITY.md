# Security — Hassala

**Last updated:** November 4, 2026

This document explains the threat model, security controls, permissions, and
known limitations. The goal is to make it clear what Hassala does and where its
trust boundaries are.

---

## 1. Scope

Hassala is a Manifest V3 browser extension. All code is bundled with the
extension, and the project has no backend server. Saved words live in
`chrome.storage.local`; exports are normal browser downloads triggered by an
explicit user click. There is no native messaging host and no filesystem write
path.

**Assets we protect:**

- Translation text typed or selected by the user.
- Saved words, folders, and the local word bank.
- Extension settings (active folder, blocked sites, and so on).
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
        │  chrome.storage.local
        ▼
Local word bank (inside the extension)
        │  explicit user click
        ▼
Blob URL + <a download>  →  browser download
```

- **The page is untrusted.** Any data that comes from it (selected text, YouTube
  captions) is treated as text, never code.
- **Content scripts are isolated** from page JavaScript. The UI uses a closed
  Shadow DOM so the page cannot read the translation or input elements.
- **The background worker** is the only bridge between the UI and local storage.
- **Export is user-initiated.** The extension cannot create a file without the
  user clicking the export button, and the browser remains in control of where
  the download goes.

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
| `storage` | Save words, folders, settings, and recent words locally. |
| `scripting` | Inject the translator UI when the toolbar icon is clicked. |
| `activeTab` | Act on the current tab when a translation is requested. |
| `offscreen` | Play pronunciation audio without opening a window. |
| Host permissions | `clients5.google.com`, `api.mymemory.translated.net`, `translate.googleapis.com`, `translate.google.com` — translation and pronunciation services only. |

There is no `nativeMessaging`, `downloads`, `tabs`, `history`, or `bookmarks`
permission, and no access to the camera or microphone. Export uses a temporary
`Blob` URL, which does not require the `downloads` permission.

### 3.3 Word bank and export

- **Local only:** the word bank is stored in `chrome.storage.local` and is never
  uploaded.
- **Bounded data:** maximum 10,000 words, 200 folders, 200 characters per word
  or translation, and 60 characters per folder name.
- **Sanitized input:** control characters and bidi override characters are
  removed, whitespace is collapsed, and fields are length-limited.
- **Serialized writes:** read-modify-write operations are queued so two fast
  saves cannot overwrite each other.
- **Protected default folder:** General cannot be deleted; deleting another
  folder moves its words back to General.
- **Duplicate prevention:** the same word + translation pair is stored once,
  regardless of direction.
- **Markdown escaping:** `&`, `<`, `>`, `|`, backticks, brackets, `*`, `_`, and
  backslashes are escaped before export.
- **CSV injection guard:** cells that begin with `=`, `+`, `-`, `@`, tab, or
  carriage return are prefixed with an apostrophe.
- **Filename sanitization:** path separators and reserved Windows device names
  are rejected, and the correct extension is applied.
- **No automatic files:** the extension never writes to disk on its own, and it
  does not request the `downloads` permission.

### 3.4 Storage

- Words, folders, settings, and history live in `chrome.storage.local` (per
  device/profile).
- Translation and audio caches live only in service-worker memory.
- Exported files live on disk under the user's control.

---

## 4. Data that leaves the device

Translation text is sent to:

- `translate.googleapis.com`
- `clients5.google.com`
- `api.mymemory.translated.net` (fallback)
- `translate.google.com` / `translate.googleapis.com` (TTS)

All connections use HTTPS. See [PRIVACY.md](PRIVACY.md) for details. No other
data is sent anywhere. Saved words and folders are never sent to a server.

---

## 5. Known limitations

- **Third-party translation services:** text reaches them under their own
  policies. Hassala does not control their retention.
- **Compromised device:** if the user's device has malware or a compromised
  browser profile, no extension can protect local data.
- **Local storage is not a backup:** clearing browser data or uninstalling the
  extension removes the word bank. Export a copy regularly.
- **Spreadsheet formulas:** the CSV export guards against formula injection, but
  always review files from untrusted sources before opening them.
- **Translation is not encryption:** do not type secrets or sensitive data into
  a translator or your word bank.

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
- No references to the removed native host.
- The public site references and pages.

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
- Do not add filesystem or native-messaging access. Export must stay
  user-initiated and go through the browser's download flow.
- Any new text from a page must be rendered with `textContent`.
- Any new storage field must be sanitized and length-limited in
  `src/wordbank.js`.
- Run `bash scripts/check.sh` before any PR.
