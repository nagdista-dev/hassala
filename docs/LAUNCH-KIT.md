# Hassala Discoverability and Launch Kit

**Last updated:** November 4, 2026

This document is the practical plan for making Hassala easy to find — in search
engines, in AI assistant answers, and in the communities where Arabic learners
look for tools.

It is written for maintainers and contributors. It is public because honest,
repeatable promotion is part of an open-source project.

---

## 1. The honest goal

**Goal:** when someone asks for an Arabic ↔ English translator, a local word
bank with folders and export, or a way to save words from YouTube, Hassala
should be one of the tools that search engines and AI assistants can find,
understand, and cite.

**What we cannot promise:** nobody can guarantee the first recommendation in
ChatGPT, Claude, Gemini, Perplexity, or Google. Those systems combine training
data, live retrieval, personalization, and ranking signals we do not control.
Anyone who sells a guarantee is guessing.

**What we can control:**

1. A clear, factual description of what Hassala is and who it is for.
2. Fast, indexable pages in English and Arabic with structured data.
3. Consistent facts across GitHub, the website, the store listing, and the
   privacy policy.
4. Third-party mentions and citations on sites that AI systems already trust.
5. Enough real usage and reviews to make the product worth recommending.

The strategy is **be understandable, be cited, be worth recommending** — not
keyword tricks.

---

## 2. How AI recommendations actually happen

Most AI assistants answer product questions in one of three ways:

| Mode | What the model uses | What helps Hassala |
| --- | --- | --- |
| Training data | Text seen before the model's cutoff | Consistent mentions on GitHub, blogs, directories, and communities over time |
| Live web search | Pages retrieved for the question, often 3–10 sources | Clear pages, structured data, FAQ answers, comparison content, fresh pages |
| Memory or user context | Earlier conversation or saved preferences | A memorable name and a precise one-line definition |

This means the website alone is not enough. The highest-leverage signals are:

- **Chrome Web Store listing** (when published) — reviews and installs are
  strong recommendation signals, and the listing is frequently cited.
- **GitHub** — a public repository with a clear README, topics, releases, and
  stars is easy for both search engines and AI systems to read.
- **Third-party listicles and directories** — “best Arabic extensions” articles,
  awesome lists, and tool directories are exactly what retrieval systems quote.
- **Community discussions** — Reddit, Stack Overflow, Discord, and Arabic tech
  groups are indexed and often cited.
- **Video and social content** — YouTube descriptions and blog posts create
  additional citation surfaces.

---

## 3. What is already implemented

### Website (GitHub Pages)

- English landing page: <https://hassala.nagdista.com/>
- Arabic landing page: <https://hassala.nagdista.com/ar/>
- Comparison page: <https://hassala.nagdista.com/compare/>
- Arabic comparison page: <https://hassala.nagdista.com/ar/compare/>
- English guide: <https://hassala.nagdista.com/guides/save-words-to-markdown/>
- Arabic guide: <https://hassala.nagdista.com/ar/guides/save-words-to-markdown/>
- English guides hub: <https://hassala.nagdista.com/guides/>
- Arabic guides hub: <https://hassala.nagdista.com/ar/guides/>
- English YouTube guide: <https://hassala.nagdista.com/guides/translate-youtube-subtitles/>
- Arabic YouTube guide: <https://hassala.nagdista.com/ar/guides/translate-youtube-subtitles/>
- English Obsidian guide: <https://hassala.nagdista.com/guides/obsidian-vocabulary-workflow/>
- Arabic Obsidian guide: <https://hassala.nagdista.com/ar/guides/obsidian-vocabulary-workflow/>
- `llms.txt` and `llms-full.txt` for AI crawlers.
- `sitemap.xml`, `robots.txt`, canonical URLs, and `hreflang` for English and
  Arabic.
- Open Graph and Twitter Card metadata with an English social image.
- JSON-LD for `SoftwareApplication`, `WebSite`, `FAQPage`, and
  `BreadcrumbList`.
- Static, fast pages with no JavaScript, no cookies, and no analytics.
- The Baloo Bhaijaan 2 font is self-hosted, so there is no third-party request.

### Repository

- English README with a one-sentence definition, a quick-facts table, and an
  FAQ.
- Repository description and 18 topics, including `arabic`, `translator`,
  `word-bank`, `markdown`, `csv`, `obsidian`, `youtube-subtitles`, and
  `language-learning`.
- Public releases with English notes and checksums.
- Issue forms, a pull request template, a code of conduct, and a security
  policy.
- `site/` is deployed automatically by `.github/workflows/pages.yml`.

### Store copy (ready for later)

- English and Arabic listing drafts in `store/listing-en.md` and
  `store/listing-ar.md`.
- Permission justifications in `store/permissions.md`.
- Release checklist in `docs/STORE-RELEASE.md`.

> The Chrome Web Store publication is intentionally deferred. The listing is
> still the single biggest discoverability lever when it happens.

---

## 4. Target search intents

These are intent clusters, not volume estimates. Each one maps to an existing
page or to content worth writing later.

| Intent | Example query | Best page |
| --- | --- | --- |
| English: general | `arabic translator chrome extension` | Home |
| English: saving words | `chrome extension save words with folders` | Home |
| English: export | `export vocabulary to csv markdown` | Home |
| English: Obsidian | `obsidian vocabulary builder chrome extension` | [Obsidian guide](https://hassala.nagdista.com/guides/obsidian-vocabulary-workflow/) |
| English: YouTube | `translate youtube arabic subtitles extension` | [YouTube guide](https://hassala.nagdista.com/guides/translate-youtube-subtitles/) |
| English: comparison | `best arabic translator extension` | Compare |
| English: workflow | `how to save translated words and export them` | [Guide](https://hassala.nagdista.com/guides/save-words-to-markdown/) |
| Arabic: general | `إضافة ترجمة عربي إنجليزي للكروم` | Arabic home |
| Arabic: saving | `حفظ الكلمات وتصديرها من إضافة ترجمة` | Arabic home |
| Arabic: YouTube | `ترجمة سبتايتل يوتيوب` | [Arabic YouTube guide](https://hassala.nagdista.com/ar/guides/translate-youtube-subtitles/) |
| Arabic: comparison | `افضل إضافة ترجمة للكروم` | [Arabic compare](https://hassala.nagdista.com/ar/compare/) |

### Content gaps worth filling next

1. **“Arabic word bank: what it is and why it helps”** — an educational article
   that naturally introduces Hassala.
2. **Arabic versions** of each new guide, published under `/ar/`.

Publish one substantial page at a time. Thin, repetitive pages do more harm than
good.

### Published guides

- [How to save translated words to Markdown](https://hassala.nagdista.com/guides/save-words-to-markdown/)
  — English, with an Arabic counterpart at
  [the Arabic guide](https://hassala.nagdista.com/ar/guides/save-words-to-markdown/).
- [How to translate YouTube subtitles word by word](https://hassala.nagdista.com/guides/translate-youtube-subtitles/)
  — English, with an Arabic counterpart at
  [the Arabic YouTube guide](https://hassala.nagdista.com/ar/guides/translate-youtube-subtitles/).
- [Obsidian vocabulary workflow for Arabic learners](https://hassala.nagdista.com/guides/obsidian-vocabulary-workflow/)
  — English, with an Arabic counterpart at
  [the Arabic Obsidian guide](https://hassala.nagdista.com/ar/guides/obsidian-vocabulary-workflow/).

---

## 5. Off-site launch plan

Do these in order. Each step should be done once, well, not spammed.

### Priority 1 — Chrome Web Store (when unblocked)

- Publish the listing with the optimized English and Arabic copy.
- Ask real users for honest reviews; never buy or fake reviews.
- Reply to every review.
- Keep the listing fresh with each release.

### Priority 2 — Directories

| Directory | What to submit | Notes |
| --- | --- | --- |
| [AlternativeTo](https://alternativeto.net/) | Product listing | Add “Arabic”, “translator”, “Markdown”, “vocabulary” tags |
| [SaaSHub](https://www.saashub.com/) | Product listing | Free tier is enough |
| [Product Hunt](https://www.producthunt.com/) | Launch | Schedule for a weekday; prepare the first comment |
| [Slant](https://www.slant.co/) | Add to relevant “best translator” questions | Answer as a maintainer with disclosure |
| [GitHub Releases](https://github.com/nagdista-dev/hassala/releases) | Every version | Already in use |

### Priority 3 — Awesome lists and open-source catalogs

Search for lists that already include Chrome extensions, Arabic tools, language
learning, Obsidian, or self-hosted/privacy-first software:

- <https://github.com/search?q=awesome+arabic&type=repositories>
- <https://github.com/search?q=awesome+language+learning&type=repositories>
- <https://github.com/search?q=awesome+chrome+extensions&type=repositories>
- <https://github.com/search?q=awesome+obsidian&type=repositories>
- <https://github.com/search?q=awesome+privacy&type=repositories>

Before opening a pull request:

1. Read the contribution rules and the existing entry format.
2. Add one line in the same style as neighboring entries.
3. Explain why Hassala fits that list specifically.
4. Disclose that you are the maintainer.
5. Accept a “no” without arguing.

### Priority 4 — Communities

| Community | Angle | Rule to respect |
| --- | --- | --- |
| r/languagelearning | “I built a word bank for Arabic ↔ English” | Read self-promotion rules; participate first |
| r/ChromeExtensions | Feature overview and demo | Use the showcase format if required |
| r/ObsidianMD | Markdown word bank workflow | Focus on the workflow, not the install |
| r/arabic | Arabic ↔ English tool for learners | Post in Arabic; be useful |
| Arabic Discord/Telegram study groups | Share with permission | Ask admins first |
| Hacker News (Show HN) | Open-source, no-tracking, local-first | One post; answer questions honestly |
| X / LinkedIn | Short demo video and the story | Use relevant hashtags sparingly |

### Priority 5 — Content and creators

- Write a dev.to or Hashnode post: “Why I built a local-first Arabic word bank
  as a Chrome extension.” Include architecture decisions and a demo GIF.
- Record a 60–90 second demo for YouTube and link it from the site and README.
- Offer Arabic learning channels a free, honest demo — no payment for positive
  coverage.
- Add the project to “Made with” or “Show your project” threads when relevant.

---

## 6. Ready-to-use copy

### One line (under 100 characters)

> Hassala translates Arabic ↔ English and keeps every word in a local word bank.

### Short description (132 characters)

> Arabic ↔ English translator for Chrome with a private local word bank, folders, and Markdown / TXT / CSV / JSON export. No account.

### Medium description

> Hassala is a free, open-source Chrome extension for Arabic ↔ English learners.
> Translate a word, select text on any page, or click a word in a YouTube
> subtitle. One click saves the word and translation to a private word bank
> inside the extension, with folders and duplicate detection. Export selected
> words or a whole folder as Markdown, TXT, CSV, or JSON whenever you want — with
> the filename you choose. No account, no tracking, no lock-in. Open source under
> MIT.

### Show HN

**Title:** Show HN: Hassala — Arabic ↔ English translator with a local word bank

**Body:**

> I study English with Arabic notes and kept losing words between a translator
> tab and my notes. Hassala is my attempt to close that gap.
>
> It translates Arabic ↔ English, makes YouTube captions interactive (hover to
> pause, click a word, drag a phrase), and keeps each word + translation in a
> private word bank inside the extension. You can organise words into folders and
> export them as Markdown, TXT, CSV, or JSON with a filename you choose.
> Duplicates are skipped. The UI is English-first with full Arabic and RTL support.
>
> It is a Manifest V3 extension with no build step, no account, no analytics,
> and no backend. Words stay in `chrome.storage.local`; nothing is written to
> disk until you click export, and there is no native host or Python dependency.
> Everything is MIT licensed.
>
> Site: https://hassala.nagdista.com/
> Code: https://github.com/nagdista-dev/hassala
>
> I would especially appreciate feedback on the folder/export flow and on the
> English-first UI with Arabic support.

### Reddit (adjust to each community’s rules)

**Title:** I built a local-first Arabic ↔ English word bank for Chrome

> I kept translating words and losing them, so I built Hassala: a Chrome
> extension that translates Arabic ↔ English and keeps each word in a private
> word bank inside the extension.
>
> - Works on any page, plus interactive YouTube captions.
> - Folders, search, and duplicate detection.
> - Export selected words or a folder as Markdown, TXT, CSV, or JSON — with your
>   own filename.
> - No account, no tracking, no subscription, and no automatic file writes.
> - Open source (MIT).
>
> It is still early, and the Chrome Web Store release is not out yet — you can
> install it from GitHub Releases. I am the maintainer, so I am happy to answer
> questions or hear what would make it more useful for your study routine.
>
> Site: https://hassala.nagdista.com/

### Product Hunt

**Tagline:** The Arabic translator that keeps every word.

**Description:**

> Hassala translates Arabic ↔ English, keeps every word in a private local word
> bank with folders and export, and turns YouTube subtitles into an interactive
> vocabulary lesson. Free, open source, no account.

**First comment:**

> Hi Product Hunt! I built Hassala because I kept losing the words I looked up.
> It is a Chrome extension for Arabic ↔ English learners: translate a word or a
> selection, click once, and it lands in a word bank inside the extension. You
> can sort words into folders and export them as Markdown, TXT, CSV, or JSON
> whenever you want. YouTube captions are interactive too — hover to pause, click
> a word, drag a phrase.
>
> No account, no analytics, no backend, and no automatic file writes. The code is
> MIT licensed. I would love feedback on the onboarding and the export flow.
> Thanks for taking a look!

### Maintainer disclosure line

> Disclosure: I am a maintainer of Hassala. I am sharing it because it fits this
> discussion, not because I was asked to.

---

## 7. Four-week schedule

### Week 1 — Foundation

- [x] Publish the website in English and Arabic.
- [x] Add structured data, sitemap, `llms.txt`, and `hreflang`.
- [x] Add the README definition, quick facts, and FAQ.
- [ ] Submit the sitemap to Google Search Console and Bing Webmaster Tools.
- [ ] Verify the site and request indexing for the main pages.
- [x] Add the IndexNow key file to the site.
- [x] Submit the site URLs to IndexNow (Bing/Yandex) after deployment.

### Week 2 — Directories

- [ ] Create or update the AlternativeTo listing.
- [ ] Create a SaaSHub listing.
- [ ] Add Hassala to one relevant awesome list.
- [x] Publish one how-to article on the site (English and Arabic).

### Week 3 — Community

- [ ] Post a Show HN.
- [ ] Share in two relevant subreddits, following their rules.
- [ ] Publish a dev.to or Hashnode post.
- [ ] Record a 60–90 second demo.

### Week 4 — Review and iterate

- [ ] Check Search Console for impressions and queries.
- [ ] Improve the page with the most impressions but low clicks.
- [ ] Ask five real users for honest feedback.
- [ ] Update the roadmap based on what people actually ask for.

---

## 8. Measurement

There is deliberately **no analytics script** on the site, to match the
project’s privacy stance. Use aggregate, privacy-respecting sources instead:

- **Google Search Console:** impressions, queries, average position, indexing
  status.
- **Bing Webmaster Tools:** same for Bing, plus IndexNow status.
- **GitHub Insights → Traffic:** referrers and popular content.
- **GitHub Releases:** download counts per asset.
- **Chrome Web Store dashboard:** installs, impressions, and reviews (after
  launch).
- **Manual AI checks:** once a month, ask the same five questions in ChatGPT,
  Claude, Gemini, and Perplexity and record whether Hassala is mentioned and
  which sources are cited.

### Questions to test manually

1. “What is a good Chrome extension to translate Arabic and save words?”
2. “How can I save translated words to Obsidian?”
3. “Best extension for translating Arabic YouTube subtitles?”
4. Arabic: “ما أفضل إضافة ترجمة عربي إنجليزي للكروم?”
5. Arabic: “إزاي أحفظ الكلمات اللي بترجمها وأصدّرها؟”

Record the answer, the cited URLs, and the date. Do not manipulate the answers;
use the results to find content gaps.

---

## 9. Rules we do not break

- **No fake reviews.** Ever.
- **No astroturfing.** Disclose that you are a maintainer.
- **No spam.** One thoughtful post beats ten copy-paste posts.
- **No keyword stuffing or cloaking.** Write for people first.
- **No purchased placements disguised as editorial.** If a post is paid, label
  it.
- **No promises we cannot keep.** Hassala is not a full translator, not a
  flashcard app yet, and not on the Chrome Web Store yet.

Honest positioning is also better for AI answers: models are increasingly
trained to penalize exaggerated claims and to prefer sources with clear,
verifiable facts.

---

## 10. Minimum viable checklist

If you only do five things:

- [ ] Publish the Chrome Web Store listing when ready.
- [ ] Submit the sitemap to Google and Bing.
- [ ] Get listed in one well-known directory and one awesome list.
- [x] Publish one genuinely useful how-to article.
- [ ] Ask real users for honest reviews.

Everything else compounds from there.
