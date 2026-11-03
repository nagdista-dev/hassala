# Installation and Usage Guide — Hassala

**Last updated:** November 3, 2026

This guide walks you through installing and using **Hassala**, whether you are a
regular user, a developer installing from GitHub, or a tester using a ZIP
package.

---

## 1. Before you start

### Requirements

- A Chromium-based browser:
  - Google Chrome 109 or newer
  - Brave
  - Microsoft Edge
  - Chromium
- **Python 3.9+** if you want to save words to a Markdown file (native host).
- Write permission in the folder where you install the extension.

### Where to get Hassala

Hassala is **open source** on GitHub:
<https://github.com/nagdista-dev/hassala>. There are three installation paths:

1. **From source (GitHub):** for developers and contributors, or anyone who
   wants the latest code.
2. **From a ZIP:** download `hassala-2.0.4-testers.zip` from
   [Releases](https://github.com/nagdista-dev/hassala/releases). This is the
   complete package: extension + native host + guide.
3. **From the Chrome Web Store:** for regular users after the store release.

Regular users will install from the Chrome Web Store after release and do not
need GitHub at all.

> **Note:** There is also `hassala-2.0.4.zip`, the Chrome Web Store package
> (extension only). Use it to upload to the store, or if you will get the native
> host from the repository yourself.

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
   ~/Hassala/src/fonts/BalooBhaijaan2-Variable.woff2
   ~/Hassala/native/install.sh
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
9. To enable saving, continue with **Install the native host** below. The
   package includes a ready-to-use `native/` folder.

> **Important:** keep the folder where it is. If you move or rename it, Chrome
> treats it as a new extension, the extension ID changes, and the old native
> host registration will no longer work.

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

## 4. Install the native host (Markdown saving)

Saving to a Markdown file requires a small **Native Messaging Host**. The
translator, subtitles, and floating panel work without it, but **Add to
Hassala** will not work.

### 4.1 Linux and macOS

From the extracted `Hassala` folder (the one containing `manifest.json` and
`native/`):

```bash
bash native/install.sh
```

The script:

- Checks that Python is available.
- Computes the extension ID from the folder path if one is not provided.
- Registers the host for Brave, Chrome, Chromium, and Edge.
- Removes old registrations from previous versions.
- Prints the host name, ID, and path.

Then:

1. Go back to the extensions page.
2. Click **Reload** on Hassala.
3. Open Settings and confirm the status is **Connected**.

#### Chrome Web Store build

The Chrome Web Store build has a fixed extension ID. You can find it on the
extension page or at `chrome://extensions`. Register the host with that ID:

```bash
HASSALA_EXT_ID=<extension-id> bash native/install.sh
```

#### Unregister

```bash
bash native/install.sh --uninstall
```

### 4.2 Windows

#### Requirements

- Python 3.9+ from [python.org](https://www.python.org/downloads/windows/).
- Enable **Add Python to PATH** during installation.
- Verify PowerShell:

  ```powershell
  python --version
  ```

#### Steps

1. Open the extensions page (`chrome://extensions` or `edge://extensions`).
2. Enable Developer mode.
3. Copy the **ID** shown below the Hassala card.
4. From the `Hassala` folder, run:

   ```powershell
   powershell -ExecutionPolicy Bypass -File native\install.ps1 -ExtensionId <id>
   ```

5. Return to the extensions page and click **Reload**.
6. Open Settings and confirm the status is **Connected**.

#### Unregister

```powershell
powershell -ExecutionPolicy Bypass -File native\install.ps1 -Uninstall
```

#### Manual registration (if PowerShell is disabled)

1. Create this folder:

   ```text
   %LOCALAPPDATA%\Hassala
   ```

2. Create `com.hassala.writer.json` with:

   ```json
   {
     "name": "com.hassala.writer",
     "description": "Hassala word bank writer (Markdown)",
     "path": "C:\\Users\\<you>\\Hassala\\native\\hassala_writer.bat",
     "type": "stdio",
     "allowed_origins": ["chrome-extension://<extension-id>/"]
   }
   ```

   Replace `<you>` and `<extension-id>` with the real values.

3. Register the manifest for each browser:

   ```bat
   reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\Chromium\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   reg add "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.hassala.writer" /ve /t REG_SZ /d "%LOCALAPPDATA%\Hassala\com.hassala.writer.json" /f
   ```

4. Reload the extension.

> **Note:** On Windows the host uses `hassala_writer.bat` to launch Python.
> Python must be on `PATH`.

---

## 5. Daily usage

### Translation

- **From the popup:** click the Hassala icon in the toolbar.
- **From the page:** click the floating button.
- **From a selection:** select text on any page and click **Translate**.
- Type Arabic or English; the direction is detected automatically.
- **Enter** translates immediately, and **Esc** closes the floating panel or
  clears the popup input.

### Saving

1. After the translation appears, click **Add to Hassala**.
2. After a successful save, the word and translation fade out, the input clears,
   and a confirmation appears in place of the translation, ready for the next
   word.
3. On first use, if the default file does not exist, Hassala creates it
   automatically.
4. If you choose a custom path, it must already be an existing `.md` file.
5. Duplicates are prevented automatically.

### Open the file and change the path

- **Open file:** opens the current file with the default Markdown app.
- **Change path:** opens a quick dialog with the current and default paths.
- **Settings:** choose a file with the built-in browser, or type a full path.

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

## 6. Your word bank file

### Default file

```text
~/Documents/Hassala Words.md
```

- It is created automatically on first save if it does not exist.
- To change it, choose an existing `.md` file from Settings.
- A custom path must already exist; this prevents the extension from creating
  files in arbitrary locations.

### File format

```markdown
---
tags:
  - english
  - vocabulary
  - hassala
---

| # | English | Arabic |
| --- | --- | --- |
| 1 | hello | مرحبًا |
| 2 | book | كتاب |
```

- English is always in the first column and Arabic in the second.
- The counter increases with every new row.
- Duplicates are prevented by the word + translation pair.
- Dangerous Markdown characters are escaped, so words containing `<` or `|` do
  not break the table.

---

## 7. Verify that everything works

1. **Translation:** type `hello` in the popup; “مرحبًا” should appear.
2. **Saving:** click **Add to Hassala**; you should see the saved confirmation,
   the input should clear, and focus should return to it.
3. **Duplicates:** type `hello` again and save; you should see the duplicate
   confirmation.
4. **File:** open the file and check that a `hello` row exists.
5. **YouTube:** play a video with CC and click a word.
6. **Floating button:** open any page and check that the button appears.

---

## 8. Uninstall

### Extension

- On the extensions page, click **Remove** on Hassala.

### Native host

```bash
# Linux/macOS
bash native/install.sh --uninstall

# Windows
powershell -ExecutionPolicy Bypass -File native\install.ps1 -Uninstall
```

### Data

- Delete the word bank file from its location.
- Clear the extension's browser data if you want to remove settings and history.

---

## 9. Troubleshooting

### “Connection is not enabled”

- The native host is not registered → run `install.sh` / `install.ps1`.
- The extension ID changed after moving the folder → re-register the host.
- Python is missing → install it and register again.
- Reload the extension after registration.

### “File not found”

- The custom path does not exist → choose an existing `.md` file.
- Or use the default file, which is created automatically.

### “Could not save”

- The file is not writable → check file permissions.
- The path is wrong → open Settings and review the preview.
- Try a test file in `~/Documents`.

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

## 10. Publishing to the Chrome Web Store

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
