# Contributing to Hassala

Thanks for wanting to help! Hassala is an Arabic ↔ English project, and every
contribution — code, translation, design, or documentation — is welcome.

> **Note:** Hassala is open source and public on
> [GitHub](https://github.com/nagdista-dev/hassala). Anyone can open an issue,
> fork the repository, and send a pull request without an invitation.

---

## Before you start

- Read [README.md](README.md) and [docs/ROADMAP.md](docs/ROADMAP.md).
- Open an **Issue** first for a large change so we can agree on the direction.
- For a small bug fix, you can create a branch and open a PR right away.
- Do not add personal data (name, email, home path, token, or screenshots with
  private information).

---

## Development environment

### Requirements

- Node.js 18+ (for JavaScript syntax checks only; there is no build step).
- Python 3.9+ (only for the helper/check scripts in `scripts/`).
- `jq` (JSON validation).
- `zip` (packaging).

### Workflow

1. **Fork** the repository on GitHub, then clone your fork:

   ```bash
   git clone https://github.com/<your-username>/hassala.git
   cd hassala
   ```

2. Create a branch from `main`:

   ```bash
   git checkout -b feature/my-change
   ```

3. Keep the change focused and match the existing code style.
4. Run the full check suite:

   ```bash
   bash scripts/check.sh
   ```

5. If the change is visual, test it in Brave or Chrome with **Load unpacked**
   on the project folder.
6. Open a PR that explains:
   - The problem.
   - The solution.
   - How you tested it.
   - A screenshot if the change is visual.

---

## Project structure

```text
manifest.json          # Entry point
src/
  background.js        # Translation, saving, audio, messaging
  wordbank.js          # Local storage, folders, export builders
  content/             # Floating panel, site policy, YouTube
  popup/               # Toolbar UI
  options/             # Word bank, folders, export, settings
  offscreen/           # Audio playback
  fonts/               # Baloo Bhaijaan 2 + OFL
  icons/               # Extension and toolbar icons
docs/                  # Install, privacy, security, architecture, release
store/                 # Chrome Web Store copy
scripts/               # Checks, packaging, icon generation
```

---

## Code rules

- **Manifest V3**, no build step, and no external libraries.
- The UI is English-first, with Arabic content RTL and English content LTR.
- New copy should be clear and consistent with the project's tone.
- **Never** use `eval`, `new Function`, or remote code loading.
- **Never** add tracking, analytics, or new external requests without an
  explicit discussion.
- Any text that comes from a page must be rendered with `textContent`, not
  `innerHTML`.
- Any change to the word bank must preserve:
  - `chrome.storage.local` as the only storage location.
  - Duplicate prevention by the word + translation pair.
  - The protected default folder General.
  - Sanitization and length limits in `src/wordbank.js`.
  - User-initiated export only.
- Do not add filesystem access, `nativeMessaging`, or automatic file writes.
- Any new permission must be documented in `store/permissions.md`,
  `docs/PRIVACY.md`, and `docs/SECURITY.md`.
- Any new storage field must be sanitized and length-limited in
  `src/wordbank.js`, and documented in `docs/ARCHITECTURE.md`.

---

## Checks before a PR

```bash
bash scripts/check.sh
```

The checks verify:

- JavaScript, Python, JSON, and shell syntax.
- Every file referenced by the manifest and HTML exists.
- No stale paths or remote code.
- No personal names or home paths in the extension code.
- No references to the removed native host.
- The public site pages and references.

### Packaging

```bash
bash scripts/package.sh
unzip -l dist/hassala-<version>.zip
```

---

## Reporting a bug

Open an issue with:

- Browser and operating system versions.
- Extension version (from Settings).
- Steps to reproduce.
- Expected behavior and actual behavior.
- A screenshot or screen recording if possible.
- If the issue is about saving: does the word appear in **My words & export**?
  Is local storage full? Does the export work?

### Security issues

- Use **Security → Report a vulnerability** in GitHub (Security Advisories) for
  a private report.
- If advisories are unavailable, contact a maintainer on GitHub without posting
  sensitive details.
- **Do not disclose the details publicly** before a fix is available.
- Include the version, browser, operating system, reproduction steps, and
  impact.

---

## License

By submitting a PR, you agree that your contribution is released under the
project's MIT license. See [LICENSE](LICENSE).
