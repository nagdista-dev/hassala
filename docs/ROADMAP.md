# Hassala Roadmap

The goal: make **Hassala** the best Arabic word bank — a tool that translates,
saves, and brings the right word back at the right time, on any page or video.

## Current state — 2.0.4

- [x] Instant Arabic ↔ English translation with automatic direction detection.
- [x] Translate selected text on any page.
- [x] Interactive YouTube subtitles (hover to pause, selection, translation).
- [x] Floating button and draggable, pinnable panel.
- [x] Save words to a Markdown file with duplicate prevention.
- [x] Auto-clear the input after saving and get ready for the next word.
- [x] Calm fade-out transition, respecting the system “Reduce Motion” setting.
- [x] Isolate page shortcuts from the floating panel while typing.
- [x] Choose the word bank file by full path with a built-in file browser.
- [x] Create the default file automatically on first save if it does not exist.
- [x] Disable Hassala on selected sites.
- [x] Pronunciation, copy buttons, recent-word history, and RTL/LTR alignment.
- [x] Bundle **Baloo Bhaijaan 2** for Arabic and English across the UI.
- [x] Simple, high-contrast toolbar icon at 16/32 px.
- [x] Rename the project to **Hassala** and organize files under `src/`.
- [x] Harden the native host (`.md` only, path rejection, Markdown escaping).
- [x] Native host tests, full project checks, and CI.
- [x] Installation, privacy, security, and architecture documentation.
- [x] Open-source the project on GitHub under the MIT license.
- [x] Add issue templates, a pull request template, and a code of conduct.
- [ ] Publish the release on the Chrome Web Store.
- [ ] Final screenshots for the store listing.

## Next release — 2.1

- [ ] Improve the Hassala UI: show the saved-word count and today's progress.
- [ ] Add a “Review my words” button that opens the saved words inside the
  extension.
- [ ] Export the word bank as CSV and formatted Markdown.
- [ ] Improve error messages when the native host is not installed.
- [ ] Add Chrome Web Store packaging and a privacy policy URL.
- [ ] Clearer onboarding and settings for new users.

## 3.0 — Smart review

- [ ] Spaced repetition using a Leitner-style schedule.
- [ ] Flashcards inside the extension.
- [ ] Short quizzes on saved words.
- [ ] Optional daily reminder.
- [ ] Statistics: new words, review words, streak.

## Longer-term ideas

- [ ] Support languages beyond Arabic and English.
- [ ] AI-powered example sentences and context (optional).
- [ ] Optional cloud sync with privacy first.
- [ ] A mobile or web companion for Hassala.
- [ ] Direct integration with Obsidian, Logseq, and Anki.
- [ ] Pronunciation dictionary for different dialects.
- [ ] Exam study mode (TOEFL/IELTS/high-school).

## Guiding principles

- **Privacy first:** no accounts, no tracking, and words stay on your device.
- **Arabic first:** the interface, direction, font, and design are Arabic-first.
- **Simplicity:** translation and saving in as few steps as possible.
