# Privacy Policy — Hassala

**Last updated:** November 4, 2026

**Public store policy:**
<https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>

Hassala is a browser extension for Arabic ↔ English translation that keeps words
in a private word bank inside the extension. This policy explains what data
the extension handles, where it goes, and how you can control it.

## 1. Data the extension handles

- **Text you type or select for translation:** the word or sentence you ask to
  translate.
- **Saved words:** the source word, its translation, and its folder, stored in
  `chrome.storage.local`. No direction or date is stored per word.
- **Folders:** folder names and which folder new words are saved into.
- **Settings:** the floating button state, panel position, active folder, and
  blocked sites.
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

## 3. Saved words and export

When you click **Add to Hassala**, the extension stores the word and translation in
`chrome.storage.local`. Nothing is written to your filesystem at that moment.
Hassala has no native host, no filesystem permission, and no background file
writer.

When you explicitly export from **Words**:

1. Hassala builds the file in memory from the words you selected.
2. You choose the format (Markdown, TXT, CSV, or JSON) and the filename.
3. The browser downloads the file through a temporary `Blob` URL and a normal
   download link.

You can delete the exported words from local storage afterwards, or keep them.
The extension never uploads your word bank anywhere.

## 4. Sharing

- Text is shared only with the translation providers listed above, as needed.
- No analytics, tracking, advertising, or data sales.
- No accounts or sign-in.
- Exported files go only where you save them on your device.

## 5. Retention and control

- Saved words, folders, settings, and recent words live in
  `chrome.storage.local`.
- Translation and audio caches are in memory and are cleared automatically.
- You can delete selected words, clear a folder, or clear the whole word bank
  from Settings at any time.
- You can clear the word history from the extension settings or clear the
  extension's data from your browser.
- Uninstalling the extension removes its local storage. Export a backup first if
  the words matter to you.

## 6. Permissions

- **`storage`** — save words, folders, settings, and recent words locally.
- **`scripting`** — inject the translator UI when you click the toolbar icon.
- **`activeTab`** — act on the current tab when you request a translation.
- **`offscreen`** — play pronunciation audio without opening a window.
- **Host permissions** — connect only to the translation providers above.

There is no `nativeMessaging`, no `downloads`, no `tabs`, no `history`, no
`bookmarks`, and no filesystem access.

## 7. Security

- All translation requests use HTTPS.
- The extension does not load remote code.
- Exported Markdown escapes HTML-sensitive characters, CSV cells are protected
  against formula injection, and filenames are sanitized.
- Exports happen only after an explicit user click.
- Local storage operations are serialized to avoid lost updates.

Read [SECURITY.md](SECURITY.md) for the full threat model.

## 8. Children

Hassala is not directed to children under 13 and does not knowingly collect
personal data from them.

## 9. Changes to this policy

If this policy changes, the date above will be updated and the change will be
documented in the repository. Continued use of the extension after an update
means you accept the new policy.

## 10. Contact

Email [nagdista@gmail.com](mailto:nagdista@gmail.com?subject=Hassala%20feedback),
open an issue at <https://github.com/nagdista-dev/hassala/issues>, or use the
**Support** tab on the Chrome Web Store listing. For security reports, use
**Security → Report a vulnerability** on GitHub instead of a public issue.
