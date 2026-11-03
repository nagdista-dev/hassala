# Chrome Web Store Listing — English

## Name

**Hassala — Arabic Word Translator & Keeper**

## Short name

**Hassala**

## Short description (132 characters max)

Arabic ↔ English translator for Chrome that saves words to a local Markdown word bank. Interactive YouTube subtitles. No account.

## Suggested category

**Education** (or Productivity for a broader audience)

## Language

**Arabic** (with full English support)

## Full description

**Your words will not get lost. They get saved.**

**In one sentence:** Hassala is a free, open-source Chrome extension that
translates Arabic ↔ English and saves every word to a Markdown word bank on
your device.

Hassala is not just another translator. It is your **personal word bank**: it
translates a word, saves it to a Markdown file you can open in Obsidian,
Logseq, VS Code, or any text editor, and brings it back when you review.

### Why people choose Hassala

- **Translate without breaking flow:** a floating translator on any page, plus
  selected-text translation and interactive YouTube subtitles.
- **Keep what you look up:** one click saves the word and translation, and
  duplicate detection keeps the list clean.
- **Own the file:** a plain Markdown file on your device, with no account and no
  proprietary database.
- **Study anywhere:** open the same file in Obsidian, Logseq, Typora, VS Code,
  or a printed sheet.

### What Hassala does

- **Instant Arabic ↔ English translation:** type a word or select text on any
  page and the translation appears automatically, with no button to press.
- **Save to your word bank:** one click writes the word and translation to a
  Markdown file you choose by its full path. Duplicates are skipped, so nothing
  gets lost or repeated.
- **Ready for the next word:** after a successful save the input clears
  automatically, focus returns to it, and a short confirmation appears.
- **Interactive YouTube subtitles:** hover a word to pause the video, click it
  to translate, or drag across a phrase to translate the whole phrase.
- **Floating button on every page:** translate while reading or studying
  without leaving the page.
- **Draggable panel:** move it anywhere on screen and pin it open when needed.
- **Site blocking:** disable Hassala on any site you choose.
- **Pronunciation and copy:** hear the word or translation, and copy either one.
- **Arabic-first typography:** Baloo Bhaijaan 2 is bundled with the extension,
  so the interface looks the same on every device.
- **Privacy first:** no accounts, no tracking, no analytics. Your words stay on
  your device.

### Getting started

1. Install the extension.
2. Click the Hassala icon or the floating button.
3. Type an Arabic or English word and press **Enter**.
4. Click **Add to Hassala** to save it to your Markdown word bank. The input
   clears automatically so you can type the next word.

### Your word bank file

- Words are saved to one Markdown file whose full path you choose.
- The file can live anywhere on your device; it does not have to be inside
  Obsidian.
- Default path: `~/Documents/Hassala Words.md`. It is created automatically on
  your first save if it does not exist.
- Open it with any Markdown app: Obsidian, Logseq, Typora, VS Code, and more.

### Important note about saving

Saving to a Markdown file requires a small **native host** installed once on
your device (a local Python program). Translation, subtitles, and the floating
panel work without it, but the **Add to Hassala** button needs the host to
write the file.

Setup steps are on the support page:

- **Linux/macOS:** `bash native/install.sh`
- **Windows:** `native\install.ps1 -ExtensionId <id>`

The host writes only to the file you chose and runs locally with no network
access.

### Privacy

- Text you translate is sent to translation providers (Google and MyMemory) to
  return a translation.
- Saved words are written locally to your device.
- No accounts, no tracking, no data selling.
- Full policy: https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705

### Language support

- Arabic-first interface with full RTL support.
- Arabic ↔ English translation.

## Suggested keywords

Arabic translator Chrome extension, translate Arabic to English, Arabic English
dictionary, save words to Markdown, vocabulary builder, Obsidian vocabulary,
YouTube Arabic subtitles, language learning, word bank, study tool.

## Screenshot plan

1. **Popup:** an English word, its Arabic translation, and the “Add to Hassala”
   button.
2. **Floating panel:** translation over an article.
3. **YouTube:** interactive subtitle with a selected word.
4. **Settings:** word-bank file path and preview.
5. **Markdown file:** the saved word table.

Sizes: 1280×800 or 640×400.

## Links

- **Website:** https://nagdista-dev.github.io/hassala/
- **Source code:** https://github.com/nagdista-dev/hassala
- **Privacy policy:**
  https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705
- **Support:** the **Support** tab on the Chrome Web Store listing, or
  https://github.com/nagdista-dev/hassala/issues
- **License:** MIT
