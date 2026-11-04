# Installation and Usage Guide — Hassala

**Last updated:** November 4, 2026

This guide walks you through installing and using **Hassala**, whether you are a
regular user, a developer installing from GitHub, or a tester using a ZIP
package. There is no native host to install and no Python requirement.

---

## 1. Before you start

### Requirements

- A Chromium-based browser:
  - Google Chrome 109 or newer
  - Brave
  - Microsoft Edge
  - Chromium
- Write permission in the folder where you install the extension (only to load
  it; Hassala does not write there).

### Where to get Hassala

Hassala is **open source** on GitHub:
<https://github.com/nagdista-dev/hassala>. There are three installation paths:

1. **From source (GitHub):** for developers and contributors, or anyone who
   wants the latest code.
2. **From a ZIP:** download `hassala-2.0.4-testers.zip` from
   [Releases](https://github.com/nagdista-dev/hassala/releases). It contains the
   extension and the documentation.
3. **From the Chrome Web Store:** for regular users after the store release.

Regular users will install from the Chrome Web Store after release and do not
need GitHub at all.

> **Note:** There is also `hassala-2.0.4.zip`, the Chrome Web Store package. It
> contains only `manifest.json` and `src/`, and is the file you upload to the
> store.

---

## 2. Install from ZIP (easiest for testers)

1. Download `hassala-2.0.4-testers.zip` from
   [Releases](https://github.com/nagdista-dev/hassala/releases).
2. Extract it to a stable folder, for example:

   ```text
   Linux/macOS:  ~/Hassala
   Windows:      %USERPROFILE%\Hassala
   ```

3. Make sure the paths look like this:

   ```text
   ~/Hassala/manifest.json
   ~/Hassala/src/background.js
   ~/Hassala/src/wordbank.js
   ~/Hassala/src/fonts/BalooBhaijaan2-Variable.woff2
   ~/Hassala/docs/INSTALL.md
   ```

   If you see an extra folder inside `Hassala` (for example,
   `hassala-2.0.4/`), move its contents up one level.

4. Open the extensions page for your browser:

   | Browser | Address |
   | --- | --- |
   | Chrome | `chrome://extensions` |
   | Brave | `brave://extensions` |
   | Edge | `edge://extensions` |
   | Chromium | `chromium://extensions` |

5. Enable **Developer mode** in the top-right corner.
6. Click **Load unpacked**.
7. Select the `Hassala` folder that contains `manifest.json` directly.
8. The extension appears. Click **Pin** from the puzzle menu 🧩 so the icon stays
   in the toolbar.
9. Start translating and saving. No further setup is required.

> **Important:** if you move or rename the unpacked folder, Chrome may treat it
> as a new extension and assign a new ID. Your words are stored per extension
> ID, so export a backup before moving an unpacked install.

---

## 3. Install from source

```bash
git clone https://github.com/nagdista-dev/hassala.git
cd hassala
```

Then:

1. Open the extensions page.
2. Enable Developer mode.
3. Click **Load unpacked** and select the `hassala` folder.
4. Pin the extension.

> If you want to contribute code, read [CONTRIBUTING.md](../CONTRIBUTING.md)
> first. The project is open source under the MIT license.

---

## 4. Daily usage

### Translation

- **From the popup:** click the Hassala icon in the toolbar.
- **From the page:** click the floating button.
- **From a selection:** select text on any page and click **Translate**.
- Type Arabic or English; the direction is detected automatically.
- **Enter** translates immediately, and **Esc** closes the floating panel or
  clears the popup input.

### Saving

1. Choose the target folder from the selector next to the save button. The
   default is **General**.
2. After the translation appears, click **Add to Hassala**.
3. After a successful save, the word and translation fade out, the input clears,
   and a confirmation appears in place of the translation, ready for the next
   word.
4. Duplicates are prevented automatically by the word + translation pair.

### Folders

- Open the word bank from the popup (**Words**), the floating panel, or
  Settings.
- Create folders such as `English` or `Programming`.
- Choose the folder new words go to; the selection is remembered.
- Rename folders or delete them. Deleting a folder moves its words back to
  **General** instead of losing them.
- Drag-free move: select words, then choose **Move selected**.

### Export

1. Open the word bank.
2. Select individual words, or choose the current folder / all words.
3. Pick a format: **Markdown**, **TXT**, **CSV**, or **JSON**.
4. Type the filename if you want a custom one.
5. Click **Export**.
6. Optionally enable **Delete exported words from the extension afterwards** to
   remove the exported words from local storage after the download starts.

### Delete and clear

- Select words and click **Delete selected**.
- Clear the current folder or the whole bank from Settings.
- Export first if you want a copy; deletion is permanent.

### YouTube

1. Turn on **CC**.
2. Hover a word → the video pauses.
3. Click a word → translate it.
4. Drag across a sentence → translate the whole sentence.

### Floating button and sites

- From the popup: show or hide the floating button.
- From Settings: disable Hassala on a site or an entire domain.
- Blocked sites take effect immediately, and the native YouTube captions return.

---

## 5. Your word bank

### Where words live

Words are stored in `chrome.storage.local` inside the extension:

```text
wordBank       -> [{ id, word, translation, folderId }]
wordFolders    -> [{ id, name }]
activeFolderId -> the folder new words are saved into
```

Nothing is written to your disk automatically. Hassala has no filesystem access
and does not use a native host.

### Limits

- 10,000 words.
- 200 folders.
- 200 characters per word or translation.
- 60 characters per folder name.

### Exported Markdown

```markdown
| Word | Translation |
| --- | --- |
| hello | مرحبًا |
| book | كتاب |
```

- Markdown cells are escaped, so words containing `<` or `|` do not break the
  table.
- CSV includes a UTF-8 BOM for Excel and guards against formula injection.
- JSON contains an array of `{ word, translation }` objects.
- The export filename is sanitized and always gets the correct extension.

---

## 6. Verify that everything works

1. **Translation:** type `hello` in the popup; “مرحبًا” should appear.
2. **Saving:** click **Add to Hassala**; the confirmation appears, the input clears,
   and focus returns to it.
3. **Duplicates:** type `hello` again and save; the duplicate confirmation
   appears.
4. **Word bank:** open **Words** and check that `hello` is listed.
5. **Export:** export as Markdown, open the file, and check the row.
6. **YouTube:** play a video with CC and click a word.
7. **Floating button:** open any page and check that the button appears.

---

## 7. Uninstall

### Extension

- On the extensions page, click **Remove** on Hassala.

### Data

- Export a backup first if you want to keep your words.
- Removing the extension deletes its `chrome.storage.local` data, including
  words, folders, settings, and history.
- Exported files remain wherever you saved them.

---

## 8. Troubleshooting

### “Could not save”

- Local storage may be full → export your words and delete some.
- Try reloading the extension.
- Check that the extension has the `storage` permission (it is required).

### “Your word bank is at its limit”

- You reached the 10,000-word limit → export and remove words you no longer
  need.

### A word is not saved again

- The word + translation pair already exists. Search for it in the word bank.
  Duplicates are intentional.

### Export does nothing

- Choose **All words** or select at least one word.
- Make sure the filename is not empty and does not contain path separators
  (Hassala sanitizes it, but a valid name is clearer).

### CSV looks wrong in Excel

- Use the CSV export; it includes a UTF-8 BOM so Excel reads Arabic correctly.
- If needed, import it explicitly as UTF-8.

### Translation is not working

- Check your internet connection.
- Try another word.
- The translation service may be temporarily unavailable; try again later.

### YouTube is not interactive

- Turn on CC.
- Refresh the page.
- Make sure YouTube is not in the blocked sites list.

### Floating button is missing

- From the popup: enable the floating button.
- From Settings: check blocked sites.
- Some internal browser pages (`chrome://`, the extension store) do not allow
  content scripts for security reasons.

---

## 9. Publishing to the Chrome Web Store

Before publishing:

1. `bash scripts/check.sh`
2. `bash scripts/package.sh`
3. Upload `dist/hassala-2.0.4.zip`.
4. Fill in the store listing from `store/listing-ar.md` and
   `store/listing-en.md`.
5. Add the public privacy policy URL.
6. Upload screenshots.
7. Review `store/permissions.md` to justify each permission.

Full details are in [STORE-RELEASE.md](STORE-RELEASE.md).
