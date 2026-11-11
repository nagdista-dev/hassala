# Hassala Worldwide Marketing Plan

**Version:** 1.0 · **Started:** November 4, 2026
**Owner:** Hassala maintainers
**Status:** In execution

This is the single plan for the brand, images, website, SEO, and distribution.
Every asset must follow the same identity: **one mark, one palette, one
lockup, one Arabic ↔ English story**.

---

## 1. North star

Make Hassala the first tool an Arabic or English learner thinks of when they
need to **translate a word and keep it**.

The product promise, in one sentence:

> **Hassala is a free, open-source Chrome extension that translates Arabic ↔
> English and keeps every word in a private word bank inside the extension.**

The visual promise, in one image:

> **A jar full of letters** — Arabic and English letters collected in one
> safe, personal place.

What we can control:

1. A distinctive, consistent identity across every surface.
2. Clear, real product images in search results and store listings.
3. Fast English and Arabic pages that explain the product in plain language.
4. Consistent facts across the site, GitHub, the store, and AI-readable files.
5. Third-party mentions, reviews, and community participation over time.

What we cannot promise: a guaranteed first answer in Google, ChatGPT, Claude,
Gemini, or Perplexity. We optimize for being **findable, understandable, and
worth recommending** — not for tricks.

---

## 2. Brand system (must be identical everywhere)

### 2.1 The mark: the letter jar

- **Concept:** a cream apothecary jar with a gold lid, holding the letters
  **A** (English, left) and **ح** (Arabic, right), plus smaller letters
  (**b**, **ع**) at the bottom to show a growing collection.
- **Meaning:** Hassala is a piggy bank for words. You put letters in; they stay
  safe and become yours.
- **Why it is bilingual:** Latin letters are always on the left, Arabic letters
  always on the right — the same rule as the translator UI.
- **Why it is distinctive:** the jar silhouette, gold lid, cream body, and the
  teal/gold/terracotta palette are recognizable at 16 px and at 1024 px.

### 2.2 The lockup

Every hero image, store screenshot, social card, and site header uses the same
lockup:

```
[letter jar]  Hassala  حصالة
              Arabic ↔ English · private word bank
```

- English name and Arabic name are always both present on marketing assets.
- The mark is never stretched, recolored, rotated, or given a different lid.
- Clear space around the lockup: at least 25% of the mark's width.
- Minimum mark size: 24 px for the full mark, 16 px for the small variant.

### 2.3 Palette

| Token | Hex | Use |
| --- | --- | --- |
| Teal | `#0f6b63` | Primary brand, buttons, Arabic UI |
| Deep teal | `#0a4e48` | Gradients, dark text |
| Cream | `#fbf3e4` | Jar body, cards, page background |
| Warm white | `#fffdf8` | Surfaces |
| Gold | `#c99a3f` | Lid, highlights, savings accents |
| Terracotta | `#b45a38` | Small letters, warm accents |
| Ink | `#3d2e26` | Text |

### 2.4 Typography

- **Baloo Bhaijaan 2** for everything: English, Arabic, display, and UI.
- ExtraBold for headlines, Bold for labels, Medium/Regular for body.
- No second display font. No system-font fallback in exported images.

### 2.5 Signatures

Every image carries at least two of these:

1. The letter-jar mark.
2. The tricolor ribbon: teal → gold → terracotta.
3. The `Arabic ↔ English` pill with the arrow.
4. A cream paper texture with a faint diagonal weave.
5. The warm gold/teal shadow language.

No old piggy-bank icon, no old `ع + A` badge, no unrelated gradients.

---

## 3. Image system

### 3.1 Templates

Create one reusable composition template per aspect ratio. Every template uses
the same background, ribbon, lockup, caption style, and pill.

| Template | Size | Use |
| --- | --- | --- |
| Store screenshot | 1280×800 | Chrome Web Store, site gallery |
| Small promo tile | 440×280 | Store small tile |
| Marquee tile | 1400×560 | Store large tile, GitHub social |
| Social card | 1280×640 | Open Graph, Twitter, link previews |
| Video cover | 1280×720 | YouTube demo, README poster |
| Feature card | 1200×760 | Website feature sections |

### 3.2 The five store screenshots

All five use the **real extension UI**, not abstract art:

1. **Translate anything** — popup with `curious → فضولي`, save dock, recent
   words. Caption: “Translate a word. Keep it.”
2. **Your word bank** — Settings → Words with 8 real words and folders.
   Caption: “Every word, in one private place.”
3. **Folders that fit your life** — Settings → Folders with General, Reading,
   Academic, Programming, Work. Caption: “Reading, exams, work — separate.”
4. **Export anywhere** — Settings → Export with Markdown selected and the
   filename field. Caption: “Take your words with you.”
5. **Learn from YouTube** — a realistic video page with interactive caption
   words and the real floating panel. Caption: “Subtitles become a lesson.”

Rules:

- No fake browser chrome that hides the UI.
- No text smaller than 18 px at 1280×800.
- Every screenshot shows the new letter-jar mark.
- Arabic is right-aligned; English is left-aligned; only the arrow flips.
- No personal data, no real account names, no third-party logos.

### 3.3 Promo and social

- **Small tile:** jar + wordmark + “Arabic ↔ English word bank” + a small popup
  crop.
- **Marquee:** headline, three proof points, popup + options screens, jar.
- **Social EN:** “Translate Arabic ↔ English. Keep every word.” + real popup.
- **Social AR:** “ترجم عربي ↔ إنجليزي. واحتفظ بكل كلمة.” + real popup.
- **Video cover:** “Hassala — your words, kept.” + jar + floating panel.

### 3.4 Image QA

- [ ] One mark only: the letter jar, in every image.
- [ ] One palette: no purple, blue, or neon.
- [ ] One font: Baloo Bhaijaan 2 everywhere.
- [ ] English left, Arabic right; arrow direction matches the sentence.
- [ ] Text is legible at 50% zoom.
- [ ] No clipped panels, cut letters, or stretched screenshots.
- [ ] Every image has alt text and a descriptive filename.
- [ ] File sizes are optimized (PNG for UI, WebP/PNG for the site).

---

## 4. Website integration

- [ ] Replace every favicon and app icon with the letter-jar set:
      `favicon.svg`, `favicon.ico` (16/32/48), `apple-touch-icon.png` (180),
      `icon192.png`, `icon512.png`, `icon-maskable-512.png`.
- [ ] Update `site/site.webmanifest` with the new names, colors, and icons.
- [ ] Add the new hero image and a five-image feature gallery to both homepages.
- [ ] Add `<picture>`/`srcset` where useful; keep layout stable with width and
      height attributes.
- [ ] Add descriptive alt text and captions in English and Arabic.
- [ ] Update Open Graph and Twitter images for both languages.
- [ ] Add `ImageObject` schema and keep `SoftwareApplication` facts identical.
- [ ] Check mobile layout, RTL layout, and reduced-motion behavior.
- [ ] Run `bash scripts/check.sh` and the site link/JSON-LD checks.

---

## 5. SEO and entity signals

### 5.1 Target intents

| Intent | Example query | Page |
| --- | --- | --- |
| Brand | `Hassala`, `Hassala extension`, `حصالة` | Home |
| Category | `Arabic English translator Chrome extension` | Home |
| Arabic category | `إضافة ترجمة عربي إنجليزي كروم` | Arabic home |
| Word bank | `save translated words Chrome`, `word bank extension` | Home / guide |
| YouTube | `translate YouTube subtitles Arabic` | YouTube guide |
| Export | `export vocabulary to Markdown`, `CSV word list` | Markdown guide |
| Comparison | `Hassala vs Google Translate`, `best Arabic translator extension` | Compare |

### 5.2 On-page

- [ ] Titles and descriptions lead with the exact product category and both
      names: **Hassala** and **حصالة**.
- [ ] One clear H1 per page; the first paragraph defines the product.
- [ ] FAQ blocks answer the questions an AI assistant would ask.
- [ ] JSON-LD: `SoftwareApplication`, `WebSite`, `Organization`, `FAQPage`,
      `HowTo`, `BreadcrumbList`, `ImageObject`.
- [ ] Canonical, `hreflang`, `x-default`, and sitemap entries for every page.
- [ ] `llms.txt` and `llms-full.txt` describe the product, features, links, and
      limits in plain text.
- [ ] A press page with ready-to-use facts, images, and contact details.
- [ ] A “What is Hassala?” page that answers the entity question directly.

### 5.3 Off-page consistency

- [ ] GitHub description, homepage, topics, README first screen, and release
      notes all use the same one-sentence definition.
- [ ] Store listing (when published) uses the same screenshots and facts.
- [ ] Directory and community copy uses the same short/medium/long description.
- [ ] Submit the sitemap through IndexNow after deployment (Bing/Yandex).
- [ ] Prepare exact copy for Search Console, Bing Webmaster Tools,
      AlternativeTo, SaaSHub, Product Hunt, Reddit, and awesome lists.

---

## 6. Distribution

### 6.1 Owned

- GitHub Releases (primary download until the store is live).
- GitHub Pages (English + Arabic).
- README, release notes, and pinned repository social preview.
- YouTube demo and short vertical clips.

### 6.2 Earned

- Arabic learning communities, r/learn_arabic, r/Arabic, r/languagelearning,
  r/chrome_extensions.
- “Best Arabic Chrome extensions” listicles and tool directories.
- Open-source showcases and awesome lists.
- Comments and answers where the product genuinely solves the question.

### 6.3 Paid (only if it proves itself)

- Small, targeted tests on Reddit or Arabic learner newsletters.
- No broad ads until installs, reviews, and retention are healthy.

---

## 7. Measurement

Track weekly:

- Search impressions and clicks for brand and category queries.
- Store listing views, installs, and reviews (when live).
- GitHub stars, release downloads, and referrers.
- Site traffic by page and language.
- Which images appear in search/store previews.

Review monthly:

- Double down on the two channels that produce real installs.
- Remove channels that produce traffic but no retention.
- Refresh the screenshots and the first paragraph every quarter.

---

## 8. Execution checklist

### Phase 0 — Plan and guardrails

- [x] Write this plan.
- [x] Add it to `TODO.md`.
- [ ] Freeze the brand rules and share them in `assets/brand/README.md`.

### Phase 1 — One identity

- [ ] Finalize the letter-jar mark (A + ح inside a cream jar with a gold lid).
- [ ] Generate the full icon set, favicon, maskable icon, and master PNG.
- [ ] Replace the mark in the popup, Settings, floating panel, and FAB.
- [ ] Create the English/Arabic lockup and the `Arabic ↔ English` pill.
- [ ] Update the site header, manifest, and social metadata.
- [ ] Verify the mark at 16, 24, 32, 48, 128, 512, and 1024 px.

### Phase 2 — Image production

- [ ] Capture the real popup, Words, Folders, Export, and floating-panel UI.
- [ ] Build the five 1280×800 store screenshots.
- [ ] Build the 440×280 small tile and the 1400×560 marquee.
- [ ] Build the English and Arabic 1280×640 social cards.
- [ ] Build the 1280×720 video cover and a README poster.
- [ ] Run the image QA checklist.

### Phase 3 — Website

- [ ] Add the new icons, favicons, manifest, and theme colors.
- [ ] Add the hero image and the five-image gallery to both homepages.
- [ ] Add alt text, captions, `ImageObject` schema, and OG/Twitter images.
- [ ] Add a press page and a “What is Hassala?” page in both languages.
- [ ] Update the sitemap and `llms.txt` / `llms-full.txt`.
- [ ] Run the site checks and a mobile/RTL review.

### Phase 4 — Discoverability

- [ ] Update titles, descriptions, JSON-LD, README, and GitHub metadata.
- [ ] Submit the sitemap through IndexNow.
- [ ] Prepare exact copy for account-gated directories and communities.
- [ ] Publish the release assets and verify GitHub Pages.
- [ ] Record a short demo video and publish it.

### Phase 5 — Measurement and iteration

- [ ] Set up Search Console and Bing Webmaster Tools (account-gated).
- [ ] Track the first 30 days of impressions, clicks, installs, and reviews.
- [ ] Refresh the weakest image or page every month.
- [ ] Keep the brand rules and the facts identical everywhere.

---

## 9. Non-negotiables

1. **One mark.** The letter jar, everywhere. No alternate logos.
2. **One story.** Arabic ↔ English words, stored privately, exported freely.
3. **Real UI.** Screenshots show the product, not abstract art.
4. **Both languages.** Every hero asset names Hassala and حصالة.
5. **No fake claims.** No “#1” badge, no invented reviews, no guaranteed rank.
6. **Privacy first.** No accounts, no tracking, no analytics in the extension.
7. **Respect the learner.** Calm colors, readable type, no clutter.
