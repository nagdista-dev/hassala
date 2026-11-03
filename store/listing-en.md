# Chrome Web Store Listing — English

## Name

**Hassala — Arabic Word Translator & Keeper**

## Short name

**Hassala**

## Short description (132 characters max)

Translate Arabic ↔ English instantly, save words to your personal word bank for review, and turn YouTube subtitles interactive.

## Suggested category

**Education** (or Productivity for a broader audience)

## Language

**Arabic** (with full English support)

## Full description

**Your words will not get lost. They get saved.**

Hassala is not just another translator. It is your **personal word bank**: it
translates a word, saves it to a Markdown file on your device, and brings it
back when you review.

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

Arabic translator, English Arabic dictionary, vocabulary, word bank, study,
YouTube subtitles, Obsidian, Markdown, language learning.

## Screenshot plan

1. **Popup:** an English word, its Arabic translation, and the “Add to Hassala”
   button.
2. **Floating panel:** translation over an article.
3. **YouTube:** interactive subtitle with a selected word.
4. **Settings:** word-bank file path and preview.
5. **Markdown file:** the saved word table.

Sizes: 1280×800 or 640×400.

## Links

- **Source code:** https://github.com/nagdista-dev/hassala
- **Privacy policy:**
  https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705
- **Support:** the **Support** tab on the Chrome Web Store listing, or
  https://github.com/nagdista-dev/hassala/issues
- **License:** MIT
