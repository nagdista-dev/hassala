# Chrome Web Store Release — Hassala

**Last updated:** November 3, 2026

This is the complete release checklist. Follow it in order before every release,
and again after each update.

---

## 0. Before you start

### Developer account

- [ ] Google Chrome Web Store Developer account is active.
- [ ] One-time registration fee is paid.
- [ ] The account email is verified.
- [ ] Two-factor authentication is enabled on the Google account.
- [ ] Payment and address details are up to date (the store requires them for
      publishing).

### Required assets

| Asset | Size | Location |
| --- | --- | --- |
| Store icon | 128×128 PNG | `src/icons/icon128.png` |
| 512 icon (optional) | 512×512 PNG | `assets/icon-1024.png` after resizing |
| Screenshots | 1280×800 or 640×400 | Captured manually |
| Small promo tile | 440×280 | Optional |
| Large promo tile | 1400×560 | Optional |
| Video | YouTube URL | Optional |

### Public links

- **Privacy policy (public):**
  <https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705>
- **Repository:** <https://github.com/nagdista-dev/hassala> — public and open
  source.
- **Support:** the **Support** tab on the store listing, or
  [GitHub Issues](https://github.com/nagdista-dev/hassala/issues).

> **Important:** the privacy policy must remain publicly accessible. If the Gist
> changes, update the link in the store listing and in `store/listing-*.md`.

---

## 1. Prepare the release

### Version number

- [ ] `manifest.json` has a new version (for example, `2.0.4`).
- [ ] `src/options/options.html` shows the same version.
- [ ] `CHANGELOG.md` has an entry for the version.
- [ ] `docs/ROADMAP.md` is up to date.
- [ ] No stale version number remains anywhere.

### Checks

```bash
bash scripts/check.sh
```

It must pass:

- JavaScript: `node --check` for every file.
- Python: `py_compile` for every file.
- JSON: `jq empty` for every file.
- Shell: `bash -n`.
- References: every file referenced by the manifest and HTML exists.
- Security: no `eval`, no `new Function`, no inline script, no personal name or
  home path.
- Native host: all tests.

### Package

```bash
bash scripts/package.sh
```

- [ ] The package is named `dist/hassala-<version>.zip`.
- [ ] It contains only `manifest.json` + `src/`.
- [ ] It does not contain `docs/`, `native/`, `tests/`, `store/`, `.git`,
      `TODO.md`, `dist/`, `__pycache__`, or any personal file.
- [ ] The new icon is present, with no trace of the old icon.
- [ ] The font is present: `src/fonts/BalooBhaijaan2-Variable.woff2` + `OFL.txt`.
- [ ] The size is below the store limit (currently 2 GB, but keep it light).

### Verify the package

```bash
unzip -l dist/hassala-2.0.4.zip
sha256sum dist/hassala-2.0.4.zip
```

- [ ] Record the SHA256 in a safe place.
- [ ] Load the same ZIP as **Load unpacked** in a clean browser profile.
- [ ] Test translation, saving, duplicates, YouTube, the floating button, and
      Settings.

---

## 2. Clean-browser test

Create a new profile (not your daily profile) and test:

1. **Load unpacked** from the extracted package folder.
2. Confirm the icon is visible and clear in the toolbar.
3. Type `hello` → “مرحبًا” should appear.
4. Click **Add to Hassala** → `~/Documents/Hassala Words.md` should be created
   if missing, the row should be written, the input should clear, and the
   confirmation should appear.
5. Type `hello` again and save → the duplicate confirmation should appear.
6. Open YouTube with a video that has CC → test hover-to-pause and
   click-to-translate.
7. Open a normal page → test the floating button and selection translation.
8. In Settings → test changing the path, blocking a site, and clearing history.
9. Reload the extension → confirm settings and the path are still there.
10. Close and reopen the browser → confirm everything still works.

### Migration test from an older version

If you have an older version registered:

- [ ] Install the old version, choose a path, and translate a word.
- [ ] Install `2.0.4` over it (same unpacked folder or Reload).
- [ ] Confirm the old path moved to `hassalaFile`, and saving still works.
- [ ] Confirm the `obsidianFile` key is removed after migration.

---

## 3. Store listing

### Basic information

- **Name:** Hassala — Arabic Word Translator & Keeper
- **Short name:** Hassala
- **Category:** Education
- **Primary language:** Arabic
- **Short description:** from `store/listing-ar.md` (Arabic) or
  `store/listing-en.md` (English)
- **Full description:** from `store/listing-ar.md` or `store/listing-en.md`
- **Keywords:** from `store/listing-ar.md` or `store/listing-en.md`

### Images

- [ ] Clear 128×128 icon.
- [ ] Five screenshots at the required size.
- [ ] Popup screenshot with a translation and the save button.
- [ ] Floating panel screenshot over a real page.
- [ ] YouTube screenshot with interactive subtitles.
- [ ] Settings screenshot.
- [ ] Markdown file screenshot after saving.
- [ ] No personal data, email, or home path in any screenshot.

### Privacy and permissions

- [ ] The public privacy policy link works.
- [ ] Every permission has a justification in `store/permissions.md`.
- [ ] **Single purpose** is clearly stated.
- [ ] **Remote code** declaration: “No”.
- [ ] Data usage declaration: translation on request only, local storage, no
      selling.
- [ ] The native host is explained as optional and installed locally.

### Reviewer notes

Copy this into the reviewer notes field:

```text
Hassala translates Arabic <-> English and saves words to a local Markdown file.

How to test translation:
1. Click the Hassala toolbar icon or the floating button on any page.
2. Type "hello" and press Enter. The Arabic translation appears automatically.

How to test saving:
Saving uses an optional local native messaging host (Python 3) because Chrome
extensions cannot write to arbitrary files. Translation, YouTube subtitles, and
the floating panel work without it.
- Linux/macOS: run `bash native/install.sh` from the extension folder.
- Windows: run `native\install.ps1` with the extension ID.
- Then open Settings and confirm the connection status is "connected".
- Click "Add to Hassala"; a row is appended to ~/Documents/Hassala Words.md.

No remote code is loaded. All JavaScript is bundled. No analytics, accounts,
or tracking. Privacy policy:
https://gist.github.com/nagdista-dev/282cc2ce8fe35c5fb7199f7ffd2cd705
```

> **Note:** If the reviewer cannot install Python, state in the description that
> saving is optional and the other features work without it. This reduces the
> risk of rejection for an untestable feature.

---

## 4. Upload

1. Open the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Click **New item** (or **Upload new package** for an update).
3. Upload `dist/hassala-<version>.zip`.
4. Fill in every field.
5. Review **Privacy practices**.
6. Click **Submit for review**.
7. Watch the account email.

### After approval

- [ ] The extension appears in the store.
- [ ] Test installing from the store in a clean profile.
- [ ] Record the published extension ID.
- [ ] Update `native/install.sh` / `install.ps1` with the published ID if
      needed.
- [ ] Update `README.md` and `docs/INSTALL.md` with the store link.
- [ ] Create a `v<version>` release in the public repository with the ZIP and
      SHA256.

---

## 5. Rejections and common issues

| Cause | Fix |
| --- | --- |
| Unjustified permission | Review `store/permissions.md` and explain each permission in the form |
| Privacy policy unavailable | Make sure the Gist is public and opens in another browser |
| Remote code | Confirm there are no external scripts or `eval` |
| Native host cannot be tested | Explain that it is optional, include install steps, and note that saving is not core |
| Misleading description | Describe exactly what the extension does and do not hide that saving needs a host |
| Unclear icon | Use the new `icon128.png` |
| Undeclared user data | Review the Data usage section of the form |

If a feature causes a rejection, you can publish a temporary build without it,
but fixing the cause and resubmitting is better.

---

## 6. Public repository

- The repository is **Public** on GitHub:
  <https://github.com/nagdista-dev/hassala>.
- The project is open source under the MIT license, and anyone can open an
  issue or pull request.
- Testers download the ZIP from
  [Releases](https://github.com/nagdista-dev/hassala/releases).
- Never commit:
  - `native/config.json`, which contains a personal path.
  - `.env`, keys, or tokens.
  - `dist/` or `TODO.md`.
  - Any screenshot with personal data.
- The public privacy policy lives in a separate Gist and is also available in
  [PRIVACY.md](PRIVACY.md).

### How to publish a new version

1. Make sure `bash scripts/check.sh` passes.
2. Build both packages:

   ```bash
   bash scripts/package.sh
   bash scripts/package-testers.sh
   ```

3. Create a tag and push the changes:

   ```bash
   git tag v<version>
   git push origin main --tags
   ```

4. On GitHub → **Releases** → **Draft a new release**, choose the tag, and
   upload `hassala-<version>.zip` and `hassala-<version>-testers.zip` with the
   SHA256 files.
5. Write release notes from `CHANGELOG.md`, and update `manifest.json` and
   `options.html`.

> Anyone with the release link can download the package; no GitHub account is
> required.

### Cleaning history

If a personal name or email ever enters a commit:

```bash
git filter-branch --force --env-filter '
export GIT_AUTHOR_NAME="Hassala Maintainers"
export GIT_AUTHOR_EMAIL="hassala-maintainers@users.noreply.github.com"
export GIT_COMMITTER_NAME="Hassala Maintainers"
export GIT_COMMITTER_EMAIL="hassala-maintainers@users.noreply.github.com"
' --tag-name-filter cat -- --all
```

Or use `git-filter-repo` (faster and cleaner). Then:

```bash
git push --force --all
git push --force --tags
```

> **Warning:** this rewrites history. Anyone with an old clone must clone again.
> Do not do it without a backup.

---

## 7. Releases

- **SemVer:** `MAJOR.MINOR.PATCH`.
- **MAJOR:** a change to saving, permissions, or identity.
- **MINOR:** a compatible new feature.
- **PATCH:** small fixes.
- Every release needs:
  - An entry in `CHANGELOG.md`.
  - A new ZIP.
  - A GitHub release (public).
  - A SHA256.
  - Updated `manifest.json` and `options.html`.

---

## 8. Rollback

If a release has a problem:

1. In the Developer Dashboard, **Unpublish** the current version.
2. Upload a previous version (reusing the same version number is not allowed;
   use a new number).
3. Test the previous version in a clean profile.
4. Publish it.
5. Document the issue in `CHANGELOG.md`.

---

## 9. Privacy and security before every release

- [ ] No tracking or analytics.
- [ ] No new network requests without documentation.
- [ ] No new permissions without justification.
- [ ] No remote code.
- [ ] The native host still accepts only the extension ID.
- [ ] The native host still rejects anything that is not `.md`.
- [ ] Only the default file is created automatically.
- [ ] Characters are escaped before writing.
- [ ] The privacy policy is up to date.
- [ ] `bash scripts/check.sh` passes.

---

## 10. References

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [Prepare your extension for distribution](https://developer.chrome.com/docs/webstore/prepare)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish)
- [Native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
