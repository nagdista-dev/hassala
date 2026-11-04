<p align="center">
  <img src="assets/social-preview-en.png" width="100%" alt="Hassala — Arabic ↔ English translator and local word bank" />
</p>

<p align="center">
  <img alt="Manifest V3" src="https://img.shields.io/badge/Manifest-V3-0f766e" />
  <img alt="Chrome / Brave / Edge" src="https://img.shields.io/badge/Chrome-Brave%20%7C%20Edge-4285F4" />
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-b8862f" />
  <img alt="Version" src="https://img.shields.io/badge/version-2.0.4-0f766e" />
  <a href="https://github.com/nagdista-dev/hassala/actions/workflows/check.yml"><img alt="Check" src="https://github.com/nagdista-dev/hassala/actions/workflows/check.yml/badge.svg" /></a>
  <a href="https://github.com/nagdista-dev/hassala/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/nagdista-dev/hassala?style=flat" /></a>
  <a href="https://nagdista-dev.github.io/hassala/"><img alt="Website" src="https://img.shields.io/badge/website-live-0f766e" /></a>
</p>

---

## What is Hassala?

**Hassala** is a browser extension for Arabic ↔ English that turns every word you
translate into part of your **personal word bank**. Type a word, select it on
any page, or click it in a YouTube subtitle — the translation appears instantly.
If you like it, one click saves it **inside the extension**, ready for review
later.

Hassala is not just a translator that opens and closes. It is a place where your
words are kept:

> **Hassala** = a container for your words. Every important word is saved, and
> every review gets easier.

The extension UI is English-first with full Arabic and RTL support, and the
documentation is available in English and Arabic. The project is built for
Arabic speakers learning English and English speakers learning Arabic.

> **In one sentence:** Hassala is a free, open-source Chrome extension that
> translates Arabic ↔ English and keeps your saved words in a private local word
> bank with folders and one-click export.

Words are stored only in `chrome.storage.local`. Hassala never writes to your
filesystem on its own, and it does not need a native host, Python, or any
external installer. When you want a copy, you choose the words, the format, and
the filename, and the browser downloads the file normally.

**Website:** [nagdista-dev.github.io/hassala](https://nagdista-dev.github.io/hassala/)
— English and Arabic, with comparison pages and an
[`llms.txt`](https://nagdista-dev.github.io/hassala/llms.txt) reference for AI
assistants.

**Guides:**

- [How to save translated words and export them](https://nagdista-dev.github.io/hassala/guides/save-words-to-markdown/)
  ([Arabic](https://nagdista-dev.github.io/hassala/ar/guides/save-words-to-markdown/))
- [Translating YouTube subtitles word by word](https://nagdista-dev.github.io/hassala/guides/translate-youtube-subtitles/)
  ([Arabic](https://nagdista-dev.github.io/hassala/ar/guides/translate-youtube-subtitles/))
- [Obsidian vocabulary workflow](https://nagdista-dev.github.io/hassala/guides/obsidian-vocabulary-workflow/)
  ([Arabic](https://nagdista-dev.github.io/hassala/ar/guides/obsidian-vocabulary-workflow/))

| Quick fact | Detail |
| --- | --- |
| **Type** | Manifest V3 extension for Chrome, Brave, Edge, and Chromium |
| **Languages** | Arabic ↔ English; English-first UI with full Arabic and RTL support |
| **Saves to** | `chrome.storage.local` inside the extension — not your filesystem |
| **Export** | Markdown `.md`, plain text `.txt`, CSV `.csv`, JSON `.json` |
| **Account** | Not required — no tracking, no analytics, no data selling |
| **Price and license** | Free and open source under the MIT license |
| **Availability** | [GitHub Releases](https://github.com/nagdista-dev/hassala/releases); Chrome Web Store coming soon |

---

## Features

- **Automatic translation:** no “Translate” button. Translation starts 350 ms
  after you stop typing, and **Enter** translates immediately.
- **Automatic direction:** English → Arabic by default; Arabic input switches
  the direction automatically.
- **Translate any selection:** select text on a page, click the **Translate**
  button that appears next to it, and the panel opens with the translation.
- **Interactive YouTube subtitles:** Hassala replaces the native captions and
  shows a maximum of two lines. Hover a word to pause the video, click a word to
  translate it, or drag across a phrase to translate the whole phrase.
- **Floating button on every page:** works inside the page, including
  fullscreen, and keeps working when you change keyboard layouts. Hide or
  restore it from the toolbar popup.
- **Draggable translator panel:** drag it by its header, place it anywhere, and
  your position is saved. If the floating button is hidden, the panel opens in
  the center of the screen.
- **Pin the panel:** keep it open when you click outside it. The pinned state is
  remembered.
- **Block sites:** disable Hassala on any site or domain, and re-enable it at
  any time from Settings.
- **Local word bank:** one click saves the word and translation inside the
  extension, with duplicate prevention.
- **Folders:** create folders such as `English` or `Programming`, choose the
  folder new words go to, move words between folders, rename folders, and delete
  them safely (their words move back to `General`).
- **Export on your terms:** pick selected words, a folder, or everything; choose
  Markdown, TXT, CSV, or JSON; type the filename; then download. Nothing leaves
  the extension until you click **Export**.
- **Delete and clear controls:** remove selected words, clear a folder, or wipe
  the whole bank after exporting.
- **Duplicate detection:** if the word and translation already exist, Hassala
  shows “Already in your word bank ✓” and does not add another entry.
- **Auto-clear after saving:** after a successful save, the word and translation
  fade out gently, the input clears, and focus returns to the input for the next
  word.
- **Pronunciation:** hear the word or translation in the appropriate language.
- **Copy original or translation:** two separate buttons.
- **Consistent typography:** **Baloo Bhaijaan 2** is bundled for both Arabic and
  English across the interface.
- **Correct alignment:** Arabic is always right-aligned and English is always
  left-aligned.
- **Privacy first:** no accounts, no tracking, no analytics. Your words stay in
  local extension storage until you export or delete them.

---

## Install

> **Hassala is open source** under the MIT license. You can read the code, fork
> it, and contribute. Download the latest release from
> [GitHub Releases](https://github.com/nagdista-dev/hassala/releases), or build
> from source.

### Option 1: Chrome Web Store (coming soon)

1. Open the extension page on the Chrome Web Store.
2. Click **Add to Chrome**.
3. Confirm the permissions.
4. Pin the extension from the puzzle menu 🧩.

> The store release is still being prepared. Until then, use Option 2 or 3.

### Option 2: Download a release (recommended for testers)

1. Download `hassala-2.0.4-testers.zip` from
   [Releases](https://github.com/nagdista-dev/hassala/releases). It contains the
   extension and its documentation; there is nothing else to install.
2. Extract it to a stable folder, for example:
   - Linux/macOS: `~/Hassala`
   - Windows: `%USERPROFILE%\Hassala`
3. Make sure `manifest.json` is directly inside that folder, not in a nested
   folder.
4. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
   - Edge: `edge://extensions`
   - Chromium: `chromium://extensions`
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `Hassala` folder.
7. Pin the extension from the puzzle menu 🧩.
8. Open Settings and start saving words. No further setup is required.

> **Note:** if you move or rename the unpacked folder, the extension ID changes,
> but your words stay in `chrome.storage.local` as long as the extension is not
> removed.

### Option 3: From source

```bash
git clone https://github.com/nagdista-dev/hassala.git
cd hassala
```

Then follow the **Load unpacked** steps above and select the `hassala` folder
that contains `manifest.json`. If you want to contribute, read
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## Usage

### Quick translation

- Click the extension icon in the toolbar, or
- click the **floating button** on the page, or
- select text on a page and click the **Translate** button next to it.
- Type a word in Arabic or English; the translation appears automatically.
- **Enter** translates immediately, and **Esc** closes the floating panel or
  clears the popup input.
- The speaker button pronounces the result.
- The last 8 words appear in the popup, and you can clear the history there.

### Save a word

- After the translation appears, click **Add to Hassala**.
- The folder selector next to the save button shows where the new word will go.
  Change it at any time; the choice is remembered.
- After a successful save, the word and translation fade out (300 ms), the input
  clears, and a confirmation message appears in place of the translation. If you
  start typing during the animation, Hassala stops it and keeps your new text.
- If the pair already exists, you see **Already in your word bank ✓** and no new
  entry is added.
- Create a new folder quickly from the **New folder** button in the popup or the
  folder selector in Settings.

### Word bank, folders, and export

Open your word bank from the popup (**Words**), the floating panel, or the
extension settings.

- **Browse and search:** filter by folder, search words and translations, and
  sort by newest.
- **Select:** tick individual words, select a whole page, or select everything
  currently visible.
- **Move:** send selected words to another folder.
- **Delete:** remove selected words, clear a folder, or clear the whole bank.
  Export first if you want a copy.
- **Export:** choose a format and filename, then export the selected words, the
  current folder, or all words.
- **Delete after export:** optionally remove the exported words from local
  storage once the download starts.

### Export formats

| Format | Extension | What you get |
| --- | --- | --- |
| **Markdown** | `.md` | A two-column table with the word and its translation — ready for Obsidian, Logseq, or any Markdown app |
| **Plain text** | `.txt` | One `word — translation` pair per line |
| **CSV** | `.csv` | Two columns, UTF-8 with BOM so Excel reads Arabic correctly; cells are protected against formula injection |
| **JSON** | `.json` | An array of `{ word, translation }` objects for backups or scripts |

The export filename is sanitized automatically: path separators and reserved
Windows names are rejected, and the correct extension is added.

### YouTube

1. Turn on **CC**.
2. Hover any word in the subtitle to pause the video.
3. Click a word to translate it and keep the video paused.
4. To translate a phrase, drag across the words and release.

### Settings

- **Word bank:** word count, folder list, search, selection, move, delete, and
  clear.
- **Export:** format, filename, scope, and optional delete-after-export.
- **Save folder:** the folder new words go to by default.
- **Floating button:** show or hide.
- **Blocked sites:** add a domain or URL and restore any site at any time.
- **Storage:** words live in `chrome.storage.local`; the limit is 10,000 words
  and 200 folders.

---

## Your word bank

Words are stored in the extension itself, as structured records:

```text
wordBank       -> [{ id, word, translation, folderId }]
wordFolders    -> [{ id, name }]
activeFolderId -> the folder new words are saved into
```

- Nothing is written to your disk automatically. Hassala has no filesystem
  access and no native host.
- The built-in folder **General** is protected and always available. Deleting
  any other folder moves its words back to General instead of losing them.
- Duplicates are prevented by the word + translation pair, regardless of
  direction. Saving `hello → مرحبًا` and then `مرحبًا → hello` counts as the same
  pair.
- Words and translations are capped at 200 characters, folder names at 60, and
  the bank at 10,000 words / 200 folders.
- Exported Markdown looks like this:

```markdown
| Word | Translation |
| --- | --- |
| hello | مرحبًا |
| book | كتاب |
```

- Exporting downloads a normal file through the browser. You can open it in
  Obsidian, Logseq, Typora, VS Code, Excel, or any text editor.
- If you uninstall the extension, Chrome removes its local storage. Export a
  backup first if the words matter to you.

---

## Privacy

- Text is sent directly to translation providers: Google (two endpoints in
  parallel), then MyMemory as a fallback. Pronunciation uses Google TTS.
- No accounts, no tracking, and no data sent anywhere else.
- History, settings, folders, and saved words are stored locally in
  `chrome.storage.local`; the translation cache lives only in service-worker
  memory.
- Exports are created in memory and downloaded only after you click export.
- Hassala has no backend server, no analytics, and no data selling.
- Read the full policy in [docs/PRIVACY.md](docs/PRIVACY.md).
- Public store policy:
  <https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>.

---

## Security

- **No remote code:** all code is inside the package, with no `eval` and no
  remotely loaded scripts.
- **Least-privilege permissions:** `storage`, `scripting`, `activeTab`, and
  `offscreen`, plus host permissions for translation services only. There is no
  `nativeMessaging`, no file-system permission, and no downloads permission.
- **No filesystem writes:** the extension never appends to files on its own.
  Export uses a temporary `Blob` URL and a normal `<a download>` click.
- **Sanitized exports:** Markdown cells are escaped, CSV cells are protected
  against formula injection, and filenames are cleaned before download.
- **No tracking:** no analytics, telemetry, or ads.
- **HTTPS:** all translation connections use HTTPS.

Read [docs/SECURITY.md](docs/SECURITY.md) for the full threat model and how to
report a vulnerability. Please use **Security → Report a vulnerability** on
GitHub for private reports.

---

## Troubleshooting

| Problem | Likely cause | Fix |
| --- | --- | --- |
| “Storage is full” when saving | Local storage is full | Export your words, then delete some from Settings |
| “Your word bank is at its limit” | 10,000-word limit reached | Export and remove words you no longer need |
| A word is not saved again | The pair already exists | Search for it in the word bank; duplicates are intentional |
| Export button does nothing | No words selected / empty folder | Choose “All words” or select at least one word |
| Downloaded CSV looks wrong in Excel | Excel opened it with the wrong encoding | Use the CSV export (it includes a UTF-8 BOM) or import it as UTF-8 |
| Translation is stuck | Network or translation service issue | Try again, or switch network/VPN |
| Floating button is missing | Hidden from the popup, or the site is blocked | Enable it from the popup and check blocked sites |
| YouTube is not interactive | CC is off, or the page needs a refresh | Turn on CC and refresh the page |
| Font looks wrong | The extension needs a reload after an update | Reload it from the extensions page |

---

## FAQ

### What is Hassala?

Hassala is a free, open-source Chrome extension for Arabic ↔ English
translation and vocabulary saving. It translates words and phrases, keeps each
saved word and translation in a local word bank with folders, exports them in
several formats on demand, and makes YouTube subtitles interactive. It does not
require an account.

### Is Hassala free?

Yes. Hassala is free and open source under the MIT license. There is no
subscription, no account, and no paid tier.

### Does Hassala work with Chrome, Brave, and Edge?

Yes. It is a Manifest V3 extension that runs on Chrome, Brave, Edge, and
Chromium on Linux, macOS, and Windows.

### Where are my saved words stored?

In `chrome.storage.local`, inside the extension. They are not written to your
filesystem unless you explicitly export them. Hassala does not use a native
host or Python.

### Can Hassala export to Obsidian?

Yes. Export as Markdown (`.md`) and put the downloaded file anywhere you like —
including an Obsidian vault. CSV and JSON are also available for spreadsheets,
backups, or scripts.

### Can I choose the export filename?

Yes. In the word bank, type the filename (without or with the extension),
choose the format, and click export. Hassala adds the correct extension and
removes unsafe characters.

### Do I need an account?

No. There are no accounts, no sign-in, no analytics, and no tracking. Settings
and the last 8 words are stored locally in `chrome.storage.local`.

### Does Hassala work on YouTube?

Yes. With captions enabled, Hassala replaces the native caption layer with
interactive subtitles. Hover a word to pause, click a word to translate it, or
drag across a phrase to translate the whole phrase.

### Does saving require a native host?

No. Saved words live in extension storage. Export is a normal browser download
that happens only after you click the export button. There is nothing to
install, and the extension never writes to your files directly.

### Is Hassala available on the Chrome Web Store?

Not yet. The store release is being prepared. You can install Hassala today
from [GitHub Releases](https://github.com/nagdista-dev/hassala/releases) using
the tester package and **Load unpacked**.

### What languages does Hassala support?

Hassala translates between Arabic and English. The interface is English-first
with full Arabic and RTL support, and the documentation is available in English
and Arabic.

---

## Project structure

```text
.
├── .github/                   # CI, issue templates, and PR template
├── manifest.json              # Manifest V3
├── src/
│   ├── background.js          # Translation, audio, saving, messaging
│   ├── wordbank.js            # Shared local storage, folders, export builders
│   ├── content/
│   │   ├── floating.js        # Floating panel and selection translation (Shadow DOM)
│   │   ├── keyboard-guard.js  # Keeps typing keys away from page shortcuts
│   │   ├── site-policy.js     # Domain normalization and blocked sites
│   │   ├── youtube.js         # Interactive subtitles
│   │   └── youtube.css        # Hides the native caption layer
│   ├── popup/                 # Toolbar popup
│   ├── options/               # Word bank, folders, export, and settings
│   ├── offscreen/             # Audio playback
│   ├── fonts/                 # Baloo Bhaijaan 2 + OFL license
│   └── icons/                 # Extension and toolbar icons
├── docs/                      # Privacy, security, install, architecture, release
├── site/                      # Public website (GitHub Pages)
├── store/                     # Chrome Web Store copy
├── scripts/                   # Packaging and project checks
├── assets/                    # Store icon and social preview
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
└── README.md
```

---

## Development

- Manifest V3, no build step, no external libraries.
- Translation lives in `src/background.js`; the UI lives in
  `src/content/floating.js`, `src/popup/popup.js`, and
  `src/options/options.js`; local storage, folders, and export logic live in
  `src/wordbank.js`.
- The UI font **Baloo Bhaijaan 2** is bundled in `src/fonts/` under the SIL OFL.
- Run every check before committing:

```bash
bash scripts/check.sh
```

- Build the Chrome Web Store package:

```bash
bash scripts/package.sh
# dist/hassala-2.0.4.zip
```

- Build the tester package:

```bash
bash scripts/package-testers.sh
# dist/hassala-2.0.4-testers.zip
```

- There is no native host and no Python dependency. `scripts/check.sh` validates
  JavaScript, JSON, shell scripts, references, and the public site.

---

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Highlights:

- Spaced repetition review.
- Flashcards and short quizzes.
- Import from CSV / JSON backups.
- Anki export.
- More language pairs.
- Statistics and daily challenges.
- A web/mobile companion for Hassala.

---

## Contributing

Hassala is open source, and every contribution is welcome — code, translation,
design, or documentation.

- Open an **Issue** if you find a bug or have an idea.
- **Fork** the repository and send a **Pull Request** for any change. Read
  [CONTRIBUTING.md](CONTRIBUTING.md) before you start.
- Run `bash scripts/check.sh` before opening a PR.
- For security issues, follow [SECURITY.md](SECURITY.md) and do not disclose
  details publicly before a fix is available.
- All project interactions follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## Feedback and support

Hassala is maintained by one person, and every message is read.

- **Questions, ideas, or complaints:**
  [nagdista@gmail.com](mailto:nagdista@gmail.com?subject=Hassala%20feedback)
- **Support the project:**
  [Buy Me a Coffee — nagdista](https://buymeacoffee.com/nagdista)
- **Code, releases, and issues:**
  [github.com/nagdista-dev/hassala](https://github.com/nagdista-dev/hassala)
  — a star helps other learners find the project.

For reproducible bugs or feature requests, opening a
[GitHub issue](https://github.com/nagdista-dev/hassala/issues) is the most
useful path. For anything private, email is always welcome.

---

## Spread the word

Hassala grows through honest recommendations. If it saves you time:

- **Star the repository** so more Arabic learners can find it.
- **Share the website:** <https://nagdista-dev.github.io/hassala/>.
- **Write about your workflow** — a blog post, a note, or a short video.
- **Suggest it in a relevant community or awesome list**, following that
  community's rules.

Writers and creators can use [docs/LAUNCH-KIT.md](docs/LAUNCH-KIT.md) for
ready-to-use facts, descriptions, and outreach templates.

---

## License

[MIT](LICENSE) © 2026 Hassala contributors

The **Baloo Bhaijaan 2** font is licensed under the
[SIL Open Font License 1.1](src/fonts/OFL.txt).
