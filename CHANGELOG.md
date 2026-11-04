# Changelog

All notable changes to Hassala are documented here. The project follows
[Semantic Versioning](https://semver.org/).

## [2.0.4] — 2026-11-04

### Local word bank and export (breaking)

- **Words are now stored in `chrome.storage.local` only.** The extension never
  writes to the user's filesystem on its own.
- Removed the native messaging host, the Python writer, the installer scripts,
  and the `nativeMessaging` permission. `native/` and `tests/` were deleted.
- Removed the file-path setting, the built-in file browser, “Open file”, and
  “Change path” from the popup, floating panel, and Settings.
- Added `src/wordbank.js`: a shared module for storage, folders, dedupe,
  sanitization, export builders, and filename cleanup. It is loaded by the
  background worker, popup, options page, and floating panel.
- Added word folders with a protected default folder General, a selectable save
  target, rename/delete, and safe migration of a deleted folder's words back to
  General.
- Added search, selection, move, delete, clear-folder, and clear-all controls to
  Settings.
- Added export as Markdown (`.md`), plain text (`.txt`), CSV (`.csv`, UTF-8 BOM +
  formula-injection guard), and JSON (`.json`), with a custom filename and
  optional delete-after-export.
- Added a folder selector and word count to the toolbar popup and floating panel.
- Updated permissions to `storage`, `scripting`, `activeTab`, and `offscreen`
  only. Export uses a temporary `Blob` URL and a normal download link, so no
  `downloads` permission is needed.
- Updated README, docs, store copy, and the public site to describe the local
  word bank and export workflow.

### Compact toolbar popup

- Reduced the popup to 340 px wide: about 265 px tall when empty and about
  345 px with a translation and recent words, so it no longer covers the page.
- Moved the word-bank/export action into the header as a book icon with a word
  count badge, and kept the save button and folder selector in one compact dock
  that only appears when there is a translation to save.
- Replaced the sliders icon with a solid, recognizable gear and gave the folder,
  word-bank, copy, and clear-history actions expressive icons.
- Unified the header controls: the book and gear now share the same gold stroke,
  and the smaller count badge uses the same warm gold, so the top row reads as
  one calm cluster.
- Replaced the popup's browser prompt with an inline **New folder** form: a
  60-character limit, a live counter, Enter to create, and Escape or Cancel to
  return to the save dock.
- Kept every action: translate, listen, copy, save, folder selection, new
  folder, word bank/export, and recent words.
- Fixed the language layout: English always sits on the left and Arabic on the
  right, while the arrow flips to show the translation direction.
- Moved recent words into one horizontally scrollable row instead of a tall
  block.

### Floating panel

- Rebuilt the header as one calm row: pin, **Words** with a count badge,
  Settings gear, and close. The old bottom Words button is gone.
- Replaced the sliders glyph with the same solid gear used in the popup and
  gave the book, gear, and badge the same warm gold treatment.
- Kept the save-folder selector, word count, drag handle, and close behavior
  working with no extra height.
- After a successful save, an unpinned panel now steps aside like it does when
  you click outside. Pinning keeps it open for the next word, and typing during
  the short confirmation cancels the close.

### Settings redesign

- Rebuilt the Settings page around five focused sections: Words, Folders,
  Export, Translator, and Site rules.
- Added a 100-word paged library with search, folder filter, A → Z / Z → A
  sorting, selection across pages, and clear result counts.
- Moved folder management, export, floating-button controls, and site rules into
  separate sections instead of one long page.
- Replaced browser prompts and confirms with accessible dialogs and added a
  single polite toast for feedback.
- Added a collapsed **Help & feedback** menu with email, Buy Me a Coffee, and
  GitHub links so it stays out of the learner's way.
- Added the Hassala tricolor ribbon and a subtle woven background, brand marks
  inside dialogs, and a diamond motif in empty states so the whole page carries
  the same identity as the popup and floating panel.
- Made long folder names safe everywhere: names stay capped at 60 characters
  and truncate with an ellipsis in folder rows, word tags, selects, dialogs, and
  toasts, while the full name stays available in tooltips.
- Added a live character counter under the folder-name field and reflowed folder
  rows on narrow screens so a 60-character unbroken name never creates
  horizontal scrolling.

### Open source

- The repository is now **public** on GitHub under the MIT license. Anyone can
  read the code, fork it, and contribute.
- Updated README, CONTRIBUTING, and the installation guide with GitHub and
  release download steps instead of the old private-repository instructions.
- Added issue templates (bug / feature) and a pull request template.
- Added `CODE_OF_CONDUCT.md`, adapted from Contributor Covenant 2.1.
- Updated security reporting to use GitHub Security Advisories.

### Calmer save transition

- After a successful save, the word, translation, and save button fade out over
  300 ms instead of disappearing instantly.
- The floating panel and popup share the same motion: the word rises, the result
  sinks, and the input border glows with Hassala's accent color during the
  transition.
- The confirmation message appears after the fade completes, with the same soft
  motion, and focus returns to the input.
- If you start typing during the animation, Hassala cancels it immediately and
  keeps your new text.
- When the system “Reduce Motion” setting is enabled, the input clears
  immediately without a transition.

## [2.0.3] — 2026-11-03

### Clear the input after saving

- After a word is saved successfully, the floating panel and popup clear the
  word and translation automatically and return focus to the input so you can
  type the next word right away.
- A short confirmation appears in place of the translation: “Saved ✓ Type the
  next word” or “Already in your word bank ✓ Type the next word” for duplicates.
- If saving fails, the input and translation stay as they are so nothing is
  lost.
- If you start typing the next word before saving finishes, Hassala does not
  erase what you typed.

## [2.0.2] — 2026-11-03

### Keyboard fix

- Fixed an issue that made typing inside the floating panel unreliable:
  **Space** played or paused the YouTube video, and the arrow keys affected the
  video instead of moving the caret.
- Added `src/content/keyboard-guard.js`, loaded at `document_start` before page
  scripts, so site shortcuts do not receive keys typed in the panel while it is
  in edit mode.
- Space types once as expected, and the arrow keys move the caret with all their
  modifiers: `Shift` for selection, `Ctrl`/`Alt` for word navigation,
  `Home`/`End`, and RTL Arabic text.
- `Enter` still translates, `Shift+Enter` inserts a new line, `Escape` closes
  the panel or the path dialog, and `Tab` moves focus normally.
- IME input (Arabic/English) works, and `Enter` during composition does not
  trigger a translation by mistake.
- Page and YouTube shortcuts still work when focus leaves the panel.

## [2.0.1] — 2026-11-03

### Identity and typography

- Adopted **Baloo Bhaijaan 2** as the primary font for Arabic and English in
  the popup, floating panel, settings, and YouTube subtitles.
- Bundled the font with the extension (self-hosted) under the SIL OFL license,
  with no network download.
- Added a simplified toolbar icon (16/32) with clear contrast in the toolbar,
  plus a separate detailed icon for the extensions page and store.
- Added a new Social Preview image with Hassala branding.

### Storage and file handling

- Migrated the old `obsidianFile` key to `hassalaFile` in background, popup,
  floating, and options, and removed the old key after migration.
- **Create the default file automatically on first save** if it does not exist:
  `~/Documents/Hassala Words.md`.
- Custom paths must already be existing `.md` files; the extension does not
  create files in arbitrary custom locations.
- Fixed the version number display in Settings.

### Security

- Validate `sender.id` before executing any message in the background worker.
- Explicit CSP: `script-src 'self'; object-src 'self'`.
- Reduced `web_accessible_resources` to the font file only.
- Moved the page UI into a **closed Shadow DOM** so the page cannot read the
  translation or input elements.
- Replaced the translation DOM event with an object in the isolated world
  between YouTube and the floating panel, so the page cannot fire a fake
  translation event.
- Hardened the native host:
  - Write/open existing `.md` files only.
  - Reject long paths, directories, and non-regular files.
  - Resolve `realpath` before validation to prevent symlink escapes.
  - Escape `&`, `<`, `>`, `|`, and `\` before writing.
  - Bound message size and field lengths.
  - Restrict `allowed_origins` to a single extension ID.

### Native host and installation

- Renamed the host to `com.hassala.writer` and the file to
  `native/hassala_writer.py`.
- Added a new `install.sh`: extension ID format validation, safe JSON writing,
  `--uninstall` support, and cleanup of old registrations without any personal
  name.
- Added `native/install.ps1` and `native/hassala_writer.bat` for Windows.
- Added support for Brave, Chrome, Chromium, and Edge on Linux, macOS, and
  Windows.
- Added full native host tests: saving, duplicates, old-table migration,
  browsing, path rejection, and `.md`-only writes.

### Organization and documentation

- Moved the code into `src/` with separate `content/`, `popup/`, `options/`,
  `offscreen/`, `icons/`, and `fonts/` folders.
- Moved documentation into `docs/` and added `docs/ARCHITECTURE.md` and
  `docs/STORE-RELEASE.md`.
- Added `scripts/check.sh` and `scripts/check_refs.py` to check the project
  before every commit.
- Added `scripts/package-testers.sh` to build a complete tester package with
  the native host and guide, so saving works without cloning the repository.
- Added CI in `.github/workflows/check.yml`.
- Added `.gitignore` rules for `TODO.md`, `dist/`, `__pycache__`, secrets, and
  the local `native/config.json`.
- Removed personal names and home paths from LICENSE and the documentation.

## [2.0.0] — 2026-11-03

### Rebrand

- Renamed the extension to **Hassala — Arabic Word Translator & Keeper**.
- New tagline: **Your words won't get lost. They get saved.**
- Updated the popup, floating panel, and settings with the new name.
- Changed the default save path to `~/Documents/Hassala Words.md`.
- Added README, PRIVACY, ROADMAP, CONTRIBUTING, and LICENSE.
- Added Chrome Web Store copy (Arabic/English) and a permission justification
  file.
- Added native host registration for Brave, Chrome, Chromium, and Edge.
- Added a ZIP packaging script for releases.

## [1.10.0]

- Added the ability to disable Hassala on selected sites, with subdomain
  support.
- Improved the blocked-site message in the toolbar popup.

## [1.9.4]

- Wrapped storage writes and read `runtime.lastError` after reloading the
  extension.

## [1.9.3]

- Made subtitle words selectable with the mouse and added translation for the
  selected phrase.

## [1.9.2]

- Fixed clicks in the save-path dialog inside the floating panel.

## [1.9.1]

- Added panel pinning and keyboard arrow protection.

## [1.9.0]

- Rebuilt word saving around a full path from the root.

## [1.0.0]

- First release: Arabic ↔ English translation, pronunciation, YouTube
  subtitles, and Markdown saving.
