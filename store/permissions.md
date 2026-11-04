# Chrome Web Store — Permission Justifications

This file is for the Chrome Web Store review form and for contributors.

## Single purpose

Hassala translates Arabic ↔ English words and keeps them in a private local word
bank with folders, so the user can review and export them later. Every feature
serves that single purpose: translation, word capture, organisation, and export.

## Permissions

### `storage`

**Why:** Save the user's word bank, folders, active folder, settings
(floating-button state, panel position, blocked sites), and the last 8 translated
words locally in `chrome.storage.local`.

**Data:** Words, folders, settings, and recent words only. No personal data.

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

## Permissions that are intentionally absent

- **`nativeMessaging`** — removed. There is no native host; words live in
  `chrome.storage.local`.
- **`downloads`** — not used. Export uses a temporary `Blob` URL and a normal
  `<a download>` click after the user presses export.
- **`tabs`, `history`, `bookmarks`, `cookies`** — not used.
- **Camera, microphone, location** — not used.

## Remote code

Hassala does **not** load or execute remote code. All JavaScript is bundled in
the extension package. There is no `eval`, no `new Function`, no inline script,
and no remotely hosted script.

## Data usage disclosure

- **Website content:** sent to Google/MyMemory only when the user requests a
  translation.
- **User settings and recent words:** stored locally.
- **Saved words and folders:** stored in `chrome.storage.local`.
- **Export:** the user chooses selected words/folder/all, a format
  (Markdown/TXT/CSV/JSON), and a filename; the browser downloads the file.
  Nothing is written to disk automatically.
- **No sale of data, no advertising, no analytics, no human review.**
- **No accounts or sign-in.**

## Saving and export note for reviewers

Saving does not require any external program. Clicking **Add to Hassala** stores the
word in `chrome.storage.local`. To get a file:

1. Open the extension Settings (Options).
2. Go to **Words**.
3. Select words, a folder, or all words.
4. Choose Markdown, TXT, CSV, or JSON and type a filename.
5. Click **Export**. The browser downloads the file normally.

The user can also delete selected words or clear the bank from the same screen.

## Privacy policy

https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705

## Contact

Use the **Support** tab on the Chrome Web Store listing,
[nagdista@gmail.com](mailto:nagdista@gmail.com?subject=Hassala%20feedback), or
open an issue at <https://github.com/nagdista-dev/hassala/issues>. You can
support development at <https://buymeacoffee.com/nagdista>.
