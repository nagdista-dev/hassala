# Privacy Policy — Hassala

**Last updated:** November 3, 2026

**Public store policy:**
<https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>

Hassala is an Arabic-first browser extension for translating words and saving
them to a word bank on your device. This policy explains what data the extension
handles, where it goes, and how you can control it.

## 1. Data the extension handles

- **Text you type or select for translation:** the word or sentence you ask to
  translate.
- **Saved words:** the source word and its translation, written to a Markdown
  file on your device.
- **Settings:** your word bank file path, floating button state, panel position,
  and blocked sites.
- **Recent words:** the last 8 words are stored locally in the browser for quick
  access.
- **Translation cache:** kept in service-worker memory and cleared when the
  browser closes or the worker stops.
- **Audio cache:** temporary pronunciation audio in service-worker memory,
  cleared automatically.

Hassala does **not** collect your name, email, phone number, location, browsing
history, or any other personal data.

## 2. How text is used

Text you ask to translate is sent directly to translation providers:

- **Google Translate endpoints** (`translate.googleapis.com` and
  `clients5.google.com`)
- **MyMemory** (`api.mymemory.translated.net`) as a fallback
- **Google Translate TTS** (`translate.googleapis.com` and
  `translate.google.com`) when you press the pronunciation button

Hassala has no backend server and does not retain your text.

## 3. Saved words

When you click **Add to Hassala**, the extension sends the word and translation
to a small native messaging host on your device. The host appends them to one
Markdown file whose full path you chose. Everything stays local. The host does
not upload your words, rejects non-Markdown files, and does not create custom
files that do not already exist. The only file it may create automatically is
the default `~/Documents/Hassala Words.md`.

## 4. Sharing

- Text is shared only with the translation providers listed above, as needed.
- No analytics, tracking, advertising, or data sales.
- No accounts or sign-in.

## 5. Retention and control

- Settings and recent words live in `chrome.storage.local`.
- Translation and audio caches are in memory and are cleared automatically.
- Your Markdown word bank stays on your device until you delete it.
- You can clear the word history from the extension settings or clear the
  extension's data from your browser.

## 6. Permissions

- **`storage`** — save settings and recent words locally.
- **`nativeMessaging`** — write your Markdown word bank through the local host.
- **`scripting`** — inject the translator UI when you click the toolbar icon.
- **`activeTab`** — act on the current tab when you request a translation.
- **`offscreen`** — play pronunciation audio without opening a window.
- **Host permissions** — connect only to the translation providers above.

## 7. Security

- All translation requests use HTTPS.
- The native host accepts messages only from this extension via
  `allowed_origins`.
- The host rejects non-Markdown paths, refuses to create custom files that do
  not exist, and verifies that the selected file exists and is writable.
- Dangerous Markdown/HTML characters are escaped before writing.
- The extension does not load remote code.

Read [SECURITY.md](SECURITY.md) for the full threat model.

## 8. Children

Hassala is not directed to children under 13 and does not knowingly collect
personal data from them.

## 9. Changes to this policy

If this policy changes, the date above will be updated and the change will be
documented in the repository. Continued use of the extension after an update
means you accept the new policy.

## 10. Contact

Open an issue at <https://github.com/nagdista-dev/hassala/issues>, or use the
**Support** tab on the Chrome Web Store listing. For security reports, use
**Security → Report a vulnerability** on GitHub instead of a public issue.
