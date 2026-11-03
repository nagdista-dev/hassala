# Chrome Web Store — Permission Justifications

This file is for the Chrome Web Store review form and for contributors.

## Single purpose

Hassala translates Arabic ↔ English words and saves them to a local Markdown
word bank for later review. Every feature serves that single purpose:
translation, word capture, and review.

## Permissions

### `storage`

**Why:** Save the user's settings (word-bank file path, floating-button state,
panel position, blocked sites) and the last 8 translated words locally in
`chrome.storage.local`.

**Data:** Settings and recent words only. No personal data.

### `nativeMessaging`

**Why:** Write saved words to the user's chosen Markdown file through a local
native messaging host. The host is installed by the user and accepts messages
only from this extension (`allowed_origins` contains one extension ID).

**Data:** The source word and its translation. The data stays on the user's
device; it is not uploaded anywhere.

### `scripting`

**Why:** Inject the floating translator UI into the current tab when the user
clicks the toolbar icon, including after the extension is reloaded.

**Data:** No browsing data is collected.

### `activeTab`

**Why:** Act on the current tab when the user explicitly requests a translation
from the toolbar icon.

**Data:** Only the active tab requested by the user.

### `offscreen`

**Why:** Play pronunciation audio without opening a visible window.

**Data:** The word or translation the user asks to hear.

### Host permissions

- `https://clients5.google.com/*`
- `https://translate.googleapis.com/*`
- `https://translate.google.com/*`
- `https://api.mymemory.translated.net/*`

**Why:** Send the text the user asked to translate to translation providers and
receive the translation. Google is tried first; MyMemory is the fallback. The
TTS endpoints are used only when the user presses the pronunciation button.

**Data:** The text selected or typed for translation. No account, location, or
browsing history is sent.

### Content script matches (`<all_urls>`)

**Why:** The floating button, selection-translation UI, and site-blocking
behavior must work on any page the user chooses to read. The content script
reads the user's site-block list so Hassala can stay disabled on chosen sites.
The YouTube-specific script runs only on YouTube.

**Data:** The selected text only when the user explicitly asks for a
translation. No page content is collected automatically.

## Remote code

Hassala does **not** load or execute remote code. All JavaScript is bundled in
the extension package. There is no `eval`, no `new Function`, no inline script,
and no remotely hosted script.

## Data usage disclosure

- **Website content:** sent to Google/MyMemory only when the user requests a
  translation.
- **User settings and recent words:** stored locally.
- **Saved words:** written to a local Markdown file via the native host.
- **No sale of data, no advertising, no analytics, no human review.**
- **No accounts or sign-in.**

## Native host note for reviewers

The native host is optional for translation and subtitles. It is required only
for the “Save to Hassala” feature, which appends to a Markdown file chosen by
the user. The host source is in `native/hassala_writer.py`; installation
instructions are in `native/install.sh`, `native/install.ps1`, and
`docs/INSTALL.md` in the public repository:
<https://github.com/nagdista-dev/hassala>.

Reviewer setup (Linux/macOS):

```bash
bash native/install.sh
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File native\install.ps1 -ExtensionId <id>
```

After registration, reload the extension and open Settings to confirm the
connection status. The default word bank is `~/Documents/Hassala Words.md` and
is created automatically on first save.

## Privacy policy

https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705

## Contact

Use the **Support** tab on the Chrome Web Store listing, or open an issue at
<https://github.com/nagdista-dev/hassala/issues>.
