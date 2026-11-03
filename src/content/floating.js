'use strict';

/**
 * In-page translator.
 *
 * A small floating button is injected into every page. It opens a compact
 * panel that does everything the toolbar popup does, including saving words
 * to the user's Markdown word bank. Because the panel lives in the page, it stays open when the
 * keyboard layout changes (Win+Space) or when the browser is fullscreen.
 */

(() => {
  const ROOT_ID = 'aet-floating-root';
  const LOADED_FLAG = '__AET_FLOATING_LOADED_V2__';

  // When the extension is reloaded, old tabs can keep an orphaned copy of this
  // script in an isolated world that no longer has chrome.runtime. Refuse to
  // mount there; the background will inject a fresh copy into the live world.
  const runtime =
    typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id
      ? chrome.runtime
      : null;
  if (!runtime) return;
  if (window[LOADED_FLAG]) return;
  window[LOADED_FLAG] = true;

  const FONT_URL = runtime.getURL('src/fonts/BalooBhaijaan2-Variable.woff2');

  const ARABIC_RE =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LETTER_RE =
    /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const EMPTY_TEXT = 'اكتب كلمة… وهتلاقي معناها هنا.';
  const DEBOUNCE_MS = 350;
  const CLEAR_ANIMATION_MS = 300;

  // The blocklist is shared with youtube.js, the options page, and the
  // background worker. When the current site is blocked the panel is never
  // mounted, so the page keeps its normal behavior.
  const sitePolicy = globalThis.__AET_SITE_POLICY__ || null;
  const SITE_HOST = location.hostname || '';
  let siteBlocked = true;
  let sitePolicyKnown = false;
  let markSitePolicyReady = () => {};
  const sitePolicyReady = new Promise((resolve) => {
    markSitePolicyReady = resolve;
  });

  const CSS = `
    @font-face {
      font-family: "Baloo Bhaijaan 2";
      src: url("${FONT_URL}") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }

    :host {
      all: initial;
      --aet-bg: #f5e9d2;
      --aet-surface: #fffaf0;
      --aet-surface-2: #f9f0de;
      --aet-text: #2c2118;
      --aet-muted: #7f6b54;
      --aet-line: #e8d9bf;
      --aet-line-strong: #d3bb92;
      --aet-accent: #0f766e;
      --aet-accent-strong: #0a5d57;
      --aet-accent-soft: #dff0e8;
      --aet-accent-text: #0b5f58;
      --aet-on-accent: #ffffff;
      --aet-on-gold: #2c2118;
      --aet-gold: #b8862f;
      --aet-gold-soft: #f2e2bd;
      --aet-gold-strong: #8f6420;
      --aet-terracotta: #b4532a;
      --aet-danger: #a83a2d;
      --aet-danger-soft: #f9e5de;
      --aet-shadow: 0 18px 50px rgba(85, 55, 25, 0.22);
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: block;
      pointer-events: none;
      direction: rtl;
      color: var(--aet-text);
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --aet-bg: #121a18;
        --aet-surface: #1b2724;
        --aet-surface-2: #22302c;
        --aet-text: #f5ecd9;
        --aet-muted: #b8a88e;
        --aet-line: #33443e;
        --aet-line-strong: #4b5f56;
        --aet-accent: #2dd4bf;
        --aet-accent-strong: #14b8a6;
        --aet-accent-soft: #17362f;
        --aet-accent-text: #9af3e6;
        --aet-on-accent: #07211d;
        --aet-on-gold: #2c2118;
        --aet-gold: #e0b969;
        --aet-gold-soft: #3a2f1c;
        --aet-gold-strong: #f0d79a;
        --aet-terracotta: #e58a5e;
        --aet-danger: #ff9b8a;
        --aet-danger-soft: #3a211c;
        --aet-shadow: 0 20px 54px rgba(0, 0, 0, 0.55);
      }
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    [hidden] {
      display: none !important;
    }

    button {
      font: inherit;
      color: inherit;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 2px solid var(--aet-accent);
      outline-offset: 2px;
    }

    /* ---------- Selection translator ---------- */

    #selectionTranslate {
      position: fixed;
      top: -9999px;
      left: -9999px;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border: 1.5px solid var(--aet-gold);
      border-radius: 999px;
      background: linear-gradient(180deg, #14958a 0%, #0f766e 55%, #0a5d57 100%);
      color: var(--aet-on-accent);
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
      box-shadow:
        0 0 0 3px rgba(255, 250, 240, 0.55),
        0 8px 22px rgba(10, 93, 87, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.24);
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      animation: aetSelectIn 0.14s ease-out;
    }

    #selectionTranslate:hover {
      background: linear-gradient(180deg, #17a89b 0%, #11857c 55%, #0b6962 100%);
      transform: translateY(-1px);
      box-shadow:
        0 0 0 3px rgba(255, 250, 240, 0.7),
        0 10px 26px rgba(10, 93, 87, 0.42),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
    }

    #selectionTranslate:active {
      transform: scale(0.97);
    }

    #selectionTranslate svg {
      width: 15px;
      height: 15px;
      flex: none;
    }

    @keyframes aetSelectIn {
      from {
        opacity: 0;
        transform: translateY(3px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    /* ---------- Floating button ---------- */

    #fabWrap {
      position: fixed;
      right: 18px;
      bottom: 18px;
      width: 50px;
      height: 50px;
      pointer-events: none;
    }

    #fabWrap[hidden] {
      display: none;
    }

    /* The panel takes over while it is open. Keep the button in the layout
       (visibility, not display) so the panel can still anchor to its position. */
    #fabWrap.is-panel-open {
      visibility: hidden;
      opacity: 0;
      pointer-events: none;
    }

    #fab {
      position: relative;
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      padding: 0;
      border: 2px solid var(--aet-gold);
      border-radius: 16px;
      background: radial-gradient(circle at 30% 20%, #17b3a4 0%, #0f766e 48%, #0a5d57 100%);
      color: #fff;
      opacity: 0.9;
      box-shadow:
        0 0 0 3px rgba(255, 250, 240, 0.55),
        0 0 0 4px rgba(184, 134, 47, 0.35),
        0 12px 26px rgba(10, 93, 87, 0.38),
        inset 0 1px 0 rgba(255, 255, 255, 0.26);
      pointer-events: auto;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      transition:
        opacity 0.15s ease,
        transform 0.15s ease,
        box-shadow 0.15s ease;
    }

    #fab:hover {
      opacity: 1;
      transform: translateY(-1px);
      box-shadow:
        0 0 0 3px rgba(255, 250, 240, 0.7),
        0 0 0 5px rgba(184, 134, 47, 0.55),
        0 16px 32px rgba(10, 93, 87, 0.46),
        inset 0 1px 0 rgba(255, 255, 255, 0.32);
    }

    #fab:active {
      transform: scale(0.95);
    }

    #fab .fab-logo {
      color: #fff;
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
      transform: translateY(1px);
    }

    #fab .fab-badge {
      position: absolute;
      left: -5px;
      bottom: -5px;
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border: 2px solid var(--aet-surface);
      border-radius: 50%;
      background: var(--aet-terracotta);
      color: #fff;
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 8.5px;
      font-weight: 700;
      box-shadow: 0 1px 5px rgba(85, 55, 25, 0.34);
    }

    #fab .fab-spark {
      position: absolute;
      top: -7px;
      right: -6px;
      color: var(--aet-gold);
      font-size: 11px;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(85, 55, 25, 0.35);
      pointer-events: none;
    }

    #fabClose {
      position: absolute;
      top: -9px;
      left: -9px;
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 2px solid var(--aet-surface);
      border-radius: 50%;
      background: var(--aet-danger);
      color: #fff;
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 15px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transform: scale(0.72);
      pointer-events: none;
      box-shadow: 0 3px 10px rgba(85, 55, 25, 0.34);
      transition:
        opacity 0.12s ease,
        transform 0.12s ease,
        background-color 0.12s ease;
    }

    #fabWrap:hover #fabClose,
    #fabClose:focus-visible {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
    }

    #fabClose:hover {
      background: #8f2b20;
    }

    /* ---------- Panel ---------- */

    #panel {
      position: fixed;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 338px;
      max-width: calc(100vw - 24px);
      max-height: calc(100dvh - 24px);
      padding: 14px;
      overflow-y: auto;
      overscroll-behavior: contain;
      border: 1.5px solid var(--aet-gold);
      border-radius: 20px;
      background:
        linear-gradient(
            90deg,
            var(--aet-accent) 0 33%,
            var(--aet-gold) 33% 66%,
            var(--aet-terracotta) 66% 100%
          )
          top / 100% 4px no-repeat,
        radial-gradient(120% 80% at 100% 0%, rgba(184, 134, 47, 0.15) 0%, transparent 55%),
        radial-gradient(95% 70% at 0% 100%, rgba(15, 118, 110, 0.09) 0%, transparent 52%),
        repeating-linear-gradient(45deg, rgba(184, 134, 47, 0.035) 0 1px, transparent 1px 14px),
        repeating-linear-gradient(-45deg, rgba(184, 134, 47, 0.035) 0 1px, transparent 1px 14px),
        var(--aet-surface);
      color: var(--aet-text);
      box-shadow:
        var(--aet-shadow),
        inset 0 1px 0 rgba(255, 255, 255, 0.55);
      pointer-events: auto;
      animation: aet-panel-in 0.16s ease-out;
      scrollbar-width: thin;
      scrollbar-color: var(--aet-line-strong) transparent;
    }

    #panel::-webkit-scrollbar {
      width: 7px;
    }

    #panel::-webkit-scrollbar-track {
      background: transparent;
    }

    #panel::-webkit-scrollbar-thumb {
      border-radius: 999px;
      background: var(--aet-line-strong);
    }

    #panel::-webkit-scrollbar-thumb:hover {
      background: var(--aet-gold);
    }

    @keyframes aet-panel-in {
      from {
        opacity: 0;
        transform: translateY(5px) scale(0.985);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .head {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding-bottom: 9px;
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
    }

    .head.is-dragging {
      cursor: grabbing;
    }

    .head::before {
      content: "";
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--aet-gold), transparent);
      opacity: 0.55;
    }

    .head::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: -2px;
      width: 5px;
      height: 5px;
      background: var(--aet-gold);
      transform: translateX(-50%) rotate(45deg);
    }

    .head-title {
      display: flex;
      align-items: center;
      gap: 9px;
      min-width: 0;
    }

    .head-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: none;
    }

    .head-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .head-text strong {
      color: var(--aet-text);
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 15.5px;
      font-weight: 700;
      line-height: 1.35;
    }

    .head-text small {
      margin-top: 1px;
      color: var(--aet-gold-strong);
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.2px;
    }

    .mini-logo {
      display: grid;
      place-items: center;
      flex: none;
      width: 30px;
      height: 30px;
      border: 2px solid var(--aet-gold);
      border-radius: 10px;
      background: linear-gradient(145deg, var(--aet-accent) 0%, var(--aet-accent-strong) 100%);
      color: var(--aet-on-accent);
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 17px;
      font-weight: 700;
      line-height: 1;
      box-shadow:
        0 0 0 2px var(--aet-surface),
        0 0 0 3px var(--aet-gold-soft);
      transform: translateY(1px);
    }

    .icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 30px;
      height: 30px;
      padding: 0;
      border: 1px solid var(--aet-line-strong);
      border-radius: 10px;
      background: var(--aet-surface);
      color: var(--aet-gold-strong);
      font-size: 18px;
      line-height: 1;
      transition:
        color 0.15s ease,
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.12s ease;
    }

    .icon:hover {
      border-color: var(--aet-gold);
      background: var(--aet-gold-soft);
      color: var(--aet-gold-strong);
    }

    .icon svg {
      width: 16px;
      height: 16px;
      pointer-events: none;
    }

    .icon:active {
      transform: scale(0.94);
    }

    .icon.pinned {
      border-color: transparent;
      background: linear-gradient(145deg, var(--aet-gold) 0%, var(--aet-gold-strong) 100%);
      color: var(--aet-on-gold);
      box-shadow:
        0 0 0 2px var(--aet-surface),
        0 0 0 3px var(--aet-gold-soft),
        0 3px 8px rgba(85, 55, 25, 0.22);
    }

    .icon.pinned:hover {
      border-color: transparent;
      background: linear-gradient(145deg, var(--aet-gold) 0%, var(--aet-gold-strong) 100%);
      color: var(--aet-on-gold);
      filter: brightness(1.06);
    }

    .direction {
      display: flex;
      align-items: center;
      align-self: center;
      justify-content: center;
      gap: 6px;
      padding: 4px 12px;
      border: 1px solid rgba(184, 134, 47, 0.55);
      border-radius: 999px;
      background: linear-gradient(180deg, #f8ebcd 0%, #ecd3a0 100%);
      color: #5a3c12;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.6;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.7),
        0 2px 6px rgba(85, 55, 25, 0.08);
    }

    .direction::before {
      content: "✦";
      color: var(--aet-gold-strong);
      font-size: 9px;
      opacity: 0.85;
    }

    .field {
      position: relative;
      padding: 10px 12px 8px;
      border: 1.5px solid var(--aet-line-strong);
      border-radius: 14px;
      background: var(--aet-surface);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.6),
        0 2px 8px rgba(85, 55, 25, 0.06);
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
    }

    .field:focus-within {
      border-color: var(--aet-accent);
      box-shadow:
        0 0 0 3px rgba(15, 118, 110, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    textarea {
      display: block;
      width: 100%;
      min-height: 52px;
      max-height: 150px;
      padding: 0 0 2px 64px;
      border: 0;
      outline: 0;
      resize: none;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--aet-line-strong) transparent;
      background: transparent;
      color: var(--aet-text);
      font: inherit;
      font-size: 16.5px;
      font-weight: 600;
      line-height: 1.6;
      transition:
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    textarea::placeholder {
      color: var(--aet-muted);
      font-size: 13px;
      font-weight: 500;
      opacity: 0.75;
    }

    .clear {
      position: absolute;
      top: 7px;
      left: 7px;
      display: grid;
      place-items: center;
      width: 23px;
      height: 23px;
      padding: 0;
      border: 1px solid var(--aet-line);
      border-radius: 8px;
      background: var(--aet-surface-2);
      color: var(--aet-muted);
      font-size: 15px;
      line-height: 1;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        border-color 0.15s ease,
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .clear:hover {
      border-color: var(--aet-gold);
      background: var(--aet-gold-soft);
      color: var(--aet-gold-strong);
    }

    .clear.copy-source {
      left: 37px;
      color: var(--aet-accent-text);
    }

    .clear.copy-source:hover {
      border-color: var(--aet-accent);
      background: var(--aet-accent-soft);
      color: var(--aet-accent-text);
    }

    .clear.copy-source.copied {
      border-color: transparent;
      background: var(--aet-accent);
      color: var(--aet-on-accent);
    }

    .clear.copy-source.error {
      border-color: transparent;
      background: var(--aet-danger);
      color: #fff;
    }

    .result {
      position: relative;
      display: flex;
      align-items: center;
      min-height: 56px;
      padding: 12px 14px;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      border: 1.5px dashed var(--aet-line-strong);
      border-radius: 14px;
      background: transparent;
      color: var(--aet-muted);
      font-size: 12.5px;
      font-weight: 500;
      line-height: 1.7;
      text-align: start;
      transition:
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .result[data-state="ready"] {
      align-items: flex-start;
      border-style: solid;
      border-color: var(--aet-line-strong);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.5), transparent 60%),
        var(--aet-surface-2);
      color: var(--aet-text);
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 23px;
      font-weight: 700;
      line-height: 1.55;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.55),
        0 2px 8px rgba(85, 55, 25, 0.05);
    }

    .result[data-state="ready"][lang="en"] {
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
    }

    .result[data-state="ready"]::after {
      content: "✦";
      position: absolute;
      bottom: 6px;
      left: 9px;
      color: var(--aet-gold);
      font-size: 9px;
      opacity: 0.6;
      pointer-events: none;
    }

    .result[data-state="ready"][data-size="long"] {
      font-size: 19px;
    }

    .result[data-state="ready"][data-size="xlong"] {
      font-size: 16.5px;
      line-height: 1.6;
    }

    .result[data-state="ready"][data-size="huge"] {
      font-size: 15px;
      font-weight: 600;
      line-height: 1.65;
    }

    .result[data-state="loading"] {
      border-style: solid;
      border-color: var(--aet-line);
      background: var(--aet-surface-2);
      color: var(--aet-muted);
      font-size: 13px;
    }

    .result[data-state="error"] {
      border-style: solid;
      border-color: rgba(168, 58, 45, 0.35);
      background: var(--aet-danger-soft);
      color: var(--aet-danger);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.7;
    }

    .result.pop {
      animation: aet-pop 0.2s ease-out;
    }

    .foot {
      display: flex;
      gap: 8px;
      transition:
        opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* A soft save-and-clear beat: the word lifts away, the result and action
       row sink out, and the field border glows while the confirmation fades
       in. The actual reset happens after the fade-out, so nothing snaps. */
    #panel.is-clearing .field {
      border-color: var(--aet-accent);
      box-shadow:
        0 0 0 3px rgba(15, 118, 110, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
    }

    #panel.is-clearing textarea {
      opacity: 0;
      transform: translateY(-6px);
    }

    #panel.is-clearing .field .clear {
      opacity: 0;
    }

    #panel.is-clearing .result {
      opacity: 0;
      transform: translateY(6px) scale(0.985);
    }

    #panel.is-clearing .foot {
      opacity: 0;
      transform: translateY(4px);
    }

    .save {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 10px 12px;
      border: 1px solid var(--aet-gold);
      border-radius: 12px;
      background: linear-gradient(135deg, var(--aet-gold) 0%, var(--aet-gold-strong) 100%);
      color: var(--aet-on-gold);
      font-size: 12.5px;
      font-weight: 700;
      box-shadow:
        0 7px 16px rgba(143, 100, 32, 0.28),
        inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition:
        filter 0.15s ease,
        transform 0.12s ease,
        opacity 0.15s ease;
    }

    .save svg {
      width: 15px;
      height: 15px;
      flex: none;
    }

    .save:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    .save:active:not(:disabled) {
      transform: translateY(1px);
    }

    .save:disabled {
      opacity: 0.65;
      cursor: progress;
    }

    .save.ok {
      border-color: var(--aet-gold);
      background: linear-gradient(135deg, var(--aet-accent) 0%, var(--aet-accent-strong) 100%);
      color: var(--aet-on-accent);
    }

    .save.err {
      border-color: transparent;
      background: var(--aet-danger);
      box-shadow: none;
    }

    .copy {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 10px 12px;
      border: 1px solid var(--aet-line-strong);
      border-radius: 12px;
      background: var(--aet-surface);
      color: var(--aet-accent-text);
      font-size: 12px;
      font-weight: 600;
      transition:
        color 0.15s ease,
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.12s ease;
    }

    .copy svg {
      width: 15px;
      height: 15px;
      flex: none;
    }

    .copy.speak {
      width: 40px;
      padding: 0;
    }

    .copy:hover {
      border-color: var(--aet-gold);
      background: var(--aet-gold-soft);
      color: var(--aet-gold-strong);
    }

    .copy:active {
      transform: translateY(1px);
    }

    .copy.is-speaking {
      border-color: transparent;
      background: var(--aet-accent);
      color: var(--aet-on-accent);
      animation: aet-pulse 1.3s ease-in-out infinite;
    }

    .copy.error {
      border-color: var(--aet-danger);
      background: var(--aet-danger-soft);
      color: var(--aet-danger);
      animation: none;
    }

    .file-tools {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }

    .site-toggle {
      grid-column: 1 / -1;
    }

    .file-tool {
      display: inline-flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 10px;
      border: 1px dashed var(--aet-line-strong);
      border-radius: 11px;
      background: transparent;
      color: var(--aet-muted);
      font-size: 11.5px;
      font-weight: 600;
      transition:
        color 0.15s ease,
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.12s ease;
    }

    .file-tool svg {
      width: 14px;
      height: 14px;
      flex: none;
    }

    .file-tool:hover:not(:disabled) {
      border-color: var(--aet-gold);
      background: var(--aet-gold-soft);
      color: var(--aet-gold-strong);
    }

    .file-tool:active:not(:disabled) {
      transform: translateY(1px);
    }

    .file-tool:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    .file-status {
      margin: -2px 2px 0;
      color: var(--aet-muted);
      font-size: 11px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .file-status[data-kind="ok"] {
      color: var(--aet-accent-text);
    }

    .file-status[data-kind="error"] {
      color: var(--aet-danger);
    }

    .path-modal {
      position: fixed;
      inset: 0;
      z-index: 5;
      display: grid;
      place-items: center;
      padding: 16px;
      /* The shadow host is pointer-events: none so it never blocks the page.
         The modal must re-enable clicks for itself, otherwise clicks land on
         the YouTube player underneath and the save button does nothing. */
      pointer-events: auto;
    }

    .path-modal[hidden] {
      display: none;
    }

    .path-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(12, 10, 8, 0.54);
      backdrop-filter: blur(3px);
    }

    .path-card {
      position: relative;
      width: min(360px, calc(100vw - 24px));
      max-height: calc(100dvh - 32px);
      overflow: auto;
      padding: 16px;
      border: 1.5px solid var(--aet-gold);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 45%),
        var(--aet-surface);
      box-shadow:
        0 24px 60px rgba(0, 0, 0, 0.38),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      color: var(--aet-text);
    }

    .path-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .path-head strong {
      display: block;
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: 15px;
      line-height: 1.4;
    }

    .path-head small {
      display: block;
      margin-top: 2px;
      color: var(--aet-muted);
      font-size: 10.5px;
    }

    .path-close {
      width: 28px;
      height: 28px;
      font-size: 17px;
    }

    .path-label {
      display: block;
      margin-bottom: 6px;
      color: var(--aet-muted);
      font-size: 11px;
      font-weight: 700;
    }

    .path-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--aet-line-strong);
      border-radius: 11px;
      background: var(--aet-surface-2);
      color: var(--aet-text);
      font-family: "Baloo Bhaijaan 2", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 11.5px;
      direction: ltr;
    }

    .path-input:focus {
      outline: none;
      border-color: var(--aet-gold);
      box-shadow: 0 0 0 3px var(--aet-gold-soft);
    }

    .path-default {
      margin: 7px 0 0;
      color: var(--aet-muted);
      font-size: 10.5px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .path-status {
      min-height: 18px;
      margin: 10px 0 0;
      color: var(--aet-muted);
      font-size: 11px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .path-status[data-kind="ok"] {
      color: var(--aet-accent-text);
    }

    .path-status[data-kind="error"] {
      color: var(--aet-danger);
    }

    .path-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .path-btn {
      padding: 9px 12px;
      border: 1px solid var(--aet-line-strong);
      border-radius: 11px;
      background: var(--aet-surface);
      color: var(--aet-accent-text);
      font-size: 11.5px;
      font-weight: 700;
      transition:
        color 0.15s ease,
        border-color 0.15s ease,
        background 0.15s ease,
        transform 0.12s ease;
    }

    .path-btn:hover:not(:disabled) {
      border-color: var(--aet-gold);
      background: var(--aet-gold-soft);
      color: var(--aet-gold-strong);
    }

    .path-btn:active:not(:disabled) {
      transform: translateY(1px);
    }

    .path-btn:disabled {
      opacity: 0.6;
      cursor: progress;
    }

    .path-btn.primary {
      border-color: var(--aet-gold);
      background: linear-gradient(135deg, var(--aet-gold) 0%, var(--aet-gold-strong) 100%);
      color: var(--aet-on-gold);
    }

    .path-btn.primary:hover:not(:disabled) {
      filter: brightness(1.08);
      color: var(--aet-on-gold);
    }

    .path-btn.ghost {
      background: transparent;
      color: var(--aet-muted);
    }

    @keyframes aet-pulse {
      0%,
      100% {
        box-shadow: 0 0 0 0 rgba(15, 118, 110, 0.3);
      }
      50% {
        box-shadow: 0 0 0 6px rgba(15, 118, 110, 0);
      }
    }

    @keyframes aet-pop {
      from {
        opacity: 0;
        transform: translateY(3px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (prefers-color-scheme: dark) {
      #panel {
        background:
          linear-gradient(
              90deg,
              var(--aet-accent) 0 33%,
              var(--aet-gold) 33% 66%,
              var(--aet-terracotta) 66% 100%
            )
            top / 100% 4px no-repeat,
          radial-gradient(120% 80% at 100% 0%, rgba(224, 185, 105, 0.08) 0%, transparent 55%),
          radial-gradient(95% 70% at 0% 100%, rgba(45, 212, 191, 0.06) 0%, transparent 52%),
          repeating-linear-gradient(45deg, rgba(224, 185, 105, 0.025) 0 1px, transparent 1px 14px),
          repeating-linear-gradient(-45deg, rgba(224, 185, 105, 0.025) 0 1px, transparent 1px 14px),
          var(--aet-surface);
        box-shadow:
          var(--aet-shadow),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .field {
        background: var(--aet-surface);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.04),
          0 2px 8px rgba(0, 0, 0, 0.2);
      }

      .field:focus-within {
        box-shadow:
          0 0 0 3px rgba(45, 212, 191, 0.16),
          inset 0 1px 0 rgba(255, 255, 255, 0.04);
      }

      .direction {
        border-color: #5a4724;
        background: linear-gradient(180deg, #3a2f1c 0%, #2c2416 100%);
        color: var(--aet-gold-strong);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.06),
          0 2px 6px rgba(0, 0, 0, 0.2);
      }

      .result[data-state="ready"] {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 60%),
          var(--aet-surface-2);
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.04),
          0 2px 8px rgba(0, 0, 0, 0.2);
      }

      #fab {
        box-shadow:
          0 0 0 3px rgba(18, 26, 24, 0.6),
          0 0 0 4px rgba(224, 185, 105, 0.38),
          0 12px 26px rgba(0, 0, 0, 0.42),
          inset 0 1px 0 rgba(255, 255, 255, 0.18);
      }
    }

    @media (max-width: 380px) {
      #panel {
        width: calc(100vw - 20px);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }

    @media print {
      :host {
        display: none !important;
      }
    }
  `;

  const HTML = `
    <button id="selectionTranslate" class="selection-translate" type="button" title="ترجمة الكلام المحدد" aria-label="ترجمة الكلام المحدد" hidden>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.6"/>
        <path d="M3.6 12h16.8M12 3.4c2.5 2.5 3.8 5.4 3.8 8.6s-1.3 6.1-3.8 8.6c-2.5-2.5-3.8-5.4-3.8-8.6S9.5 5.9 12 3.4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <span>ترجمة</span>
    </button>

    <div id="fabWrap" style="visibility:hidden">
      <button id="fab" type="button" title="حصالة — كلماتك مش هتتوه" aria-label="فتح حصالة">
        <span class="fab-spark" aria-hidden="true">✦</span>
        <span class="fab-logo">ع</span>
        <span class="fab-badge">A</span>
      </button>
      <button id="fabClose" type="button" title="حذف الزرار العائم — ترجعه من أيقونة الإضافة" aria-label="حذف الزرار العائم">×</button>
    </div>

    <section id="panel" dir="rtl" hidden>
      <header class="head" id="panelHead">
        <div class="head-title">
          <span class="mini-logo">ع</span>
          <span class="head-text">
            <strong>حصالة</strong>
            <small>كلماتك مش هتتوه ✦</small>
          </span>
        </div>
        <div class="head-actions">
          <button id="pin" class="icon" type="button" title="تثبيت الصندوق — يفضل مفتوح لما تدوس بره" aria-label="تثبيت الصندوق" aria-pressed="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 4h6M10 4l.7 5.2-2.7 2.8v1.8h8v-1.8L13.3 9.2 14 4M12 13.8V21"/>
            </svg>
          </button>
          <button id="settings" class="icon" type="button" title="الإعدادات" aria-label="الإعدادات">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true">
              <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
              <circle cx="15" cy="7" r="2.2" />
              <circle cx="9" cy="17" r="2.2" />
            </svg>
          </button>
          <button id="close" class="icon" type="button" title="إغلاق" aria-label="إغلاق">×</button>
        </div>
      </header>

      <div id="direction" class="direction">من الإنجليزي للعربي</div>

      <div class="field">
        <textarea
          id="input"
          rows="2"
          dir="rtl"
          maxlength="200"
          placeholder="اكتب الكلمة هنا… إنجليزي أو عربي"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>
        <button id="clear" class="clear" type="button" title="مسح" aria-label="مسح" hidden>×</button>
        <button id="copySource" class="clear copy-source" type="button" title="انسخ الكلمة" aria-label="انسخ الكلمة" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div id="resultCard" class="result" data-state="empty" aria-live="polite">
        <span id="result">اكتب كلمة… وهتلاقي معناها هنا.</span>
      </div>

      <div class="foot">
        <button id="save" class="save" type="button" title="حفظ الكلمة والترجمة في حصالتك" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.6 4.4 7v10L12 21.4 19.6 17V7L12 2.6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M12 7.2 8 9.5v5l4 2.3 4-2.3v-5l-4-2.3Z" fill="currentColor" opacity=".85"/>
          </svg>
          <span id="saveLabel">أضف للحصالة</span>
        </button>
        <button id="speak" class="copy speak" type="button" title="سمّعني" aria-label="سمّعني" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 10v4h3l4 3V7l-4 3H5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            <path d="M15 9.5a4 4 0 0 1 0 5M17.4 7.1a7.4 7.4 0 0 1 0 9.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </button>
        <button id="copy" class="copy" type="button" title="انسخ الترجمة" hidden>انسخ</button>
      </div>

      <div class="file-tools">
        <button id="openFile" class="file-tool" type="button" title="افتح ملف الحفظ الحالي">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"/>
            <path d="M8 13h6M11 10l3 3-3 3"/>
          </svg>
          <span>افتح الملف</span>
        </button>
        <button id="pathSettings" class="file-tool" type="button" title="تغيير مسار ملف الحفظ">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h9M19 18h1"/>
            <circle cx="16" cy="6" r="2.2"/>
            <circle cx="10" cy="12" r="2.2"/>
            <circle cx="16" cy="18" r="2.2"/>
          </svg>
          <span>تغيير المسار</span>
        </button>
        <button id="siteToggle" class="file-tool site-toggle" type="button" title="تعطيل حصالة على هذا الموقع">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5"/>
            <path d="m6 18 12-12"/>
          </svg>
          <span>تعطيل هنا</span>
        </button>
      </div>
      <p id="fileStatus" class="file-status" role="status" aria-live="polite" hidden></p>
    </section>

    <div id="pathModal" class="path-modal" hidden>
      <div class="path-backdrop" data-path-close></div>
      <section class="path-card" role="dialog" aria-modal="true" aria-labelledby="pathTitle">
        <header class="path-head">
          <div>
            <strong id="pathTitle">مسار ملف الحفظ</strong>
            <small>اكتب المسار الكامل من الروت</small>
          </div>
          <button id="pathClose" class="icon path-close" type="button" title="إغلاق" aria-label="إغلاق">×</button>
        </header>

        <label class="path-label" for="pathInput">مسار ملف الحفظ</label>
        <input
          id="pathInput"
          class="path-input"
          type="text"
          dir="ltr"
          autocomplete="off"
          spellcheck="false"
          placeholder="/home/you/Documents/Hassala Words.md"
        />
        <p id="pathDefault" class="path-default" dir="auto"></p>
        <p id="pathStatus" class="path-status" role="status" aria-live="polite"></p>

        <div class="path-actions">
          <button id="pathSave" class="path-btn primary" type="button">احفظ المسار</button>
          <button id="pathUseDefault" class="path-btn" type="button">الافتراضي</button>
          <button id="pathOpenOptions" class="path-btn ghost" type="button">كل الإعدادات</button>
        </div>
      </section>
    </div>
  `;

  // A page can always see the host element, but a closed shadow root keeps the
  // translated text and controls out of the page's DOM. If an older copy left
  // a host behind, retire it without disconnecting it: an orphaned copy may
  // have a MutationObserver that reattaches its host when it notices removal.
  let host = document.getElementById(ROOT_ID);
  if (host && host.dataset.aetRuntime === '1') {
    host.removeAttribute('id');
    host.style.display = 'none';
    host.dataset.aetRetired = '1';
  } else if (host) {
    host.remove();
  }
  host = document.createElement('div');
  host.id = ROOT_ID;

  let shadow;
  try {
    shadow = host.attachShadow({ mode: 'closed' });
  } catch {
    host.remove();
    host = document.createElement('div');
    host.id = ROOT_ID;
    shadow = host.attachShadow({ mode: 'closed' });
  }

  shadow.innerHTML = HTML;

  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = CSS;
    shadow.append(style);
  }

  host.dataset.aetRuntime = '1';

  // A previous manual injection can leave a retired host or a duplicate with
  // the same id. Keep only the live host so toolbar events target it.
  for (const extra of document.querySelectorAll(`#${ROOT_ID}`)) {
    if (extra !== host) extra.remove();
  }

  const els = {
    selectionTranslate: shadow.getElementById('selectionTranslate'),
    fabWrap: shadow.getElementById('fabWrap'),
    fab: shadow.getElementById('fab'),
    fabClose: shadow.getElementById('fabClose'),
    panel: shadow.getElementById('panel'),
    panelHead: shadow.getElementById('panelHead'),
    pin: shadow.getElementById('pin'),
    settings: shadow.getElementById('settings'),
    close: shadow.getElementById('close'),
    direction: shadow.getElementById('direction'),
    input: shadow.getElementById('input'),
    clear: shadow.getElementById('clear'),
    copySource: shadow.getElementById('copySource'),
    resultCard: shadow.getElementById('resultCard'),
    result: shadow.getElementById('result'),
    save: shadow.getElementById('save'),
    saveLabel: shadow.getElementById('saveLabel'),
    speak: shadow.getElementById('speak'),
    copy: shadow.getElementById('copy'),
    openFile: shadow.getElementById('openFile'),
    pathSettings: shadow.getElementById('pathSettings'),
    siteToggle: shadow.getElementById('siteToggle'),
    fileStatus: shadow.getElementById('fileStatus'),
    pathModal: shadow.getElementById('pathModal'),
    pathClose: shadow.getElementById('pathClose'),
    pathInput: shadow.getElementById('pathInput'),
    pathDefault: shadow.getElementById('pathDefault'),
    pathStatus: shadow.getElementById('pathStatus'),
    pathSave: shadow.getElementById('pathSave'),
    pathUseDefault: shadow.getElementById('pathUseDefault'),
    pathOpenOptions: shadow.getElementById('pathOpenOptions'),
  };

  // Blocking is meaningful only for real web origins. On file:// and other
  // pages without a hostname the button would have nothing to add.
  if (els.siteToggle && (!sitePolicy || !SITE_HOST || !/^https?:$/.test(location.protocol))) {
    els.siteToggle.hidden = true;
  }

  let mode = 'en-ar';
  let requestSeq = 0;
  let debounceTimer = 0;
  let saveTimer = 0;
  let emptyNoticeTimer = 0;
  let clearAnimationTimer = 0;
  let sourceCopyTimer = 0;
  let fileStatusTimer = 0;
  let pathDefaultPath = '';
  let pathLastFocus = null;
  let siteDisableArmedUntil = 0;
  let siteDisableTimer = 0;
  let lastResult = '';
  let lastQuery = '';
  let lastFocus = null;
  let fabPosition = null;
  let panelPosition = null;
  let fabHidden = false;
  let panelPinned = false;
  let fabPrefsReady = false;
  let markFabPrefsReady = () => {};
  const fabPrefsLoaded = new Promise((resolve) => {
    markFabPrefsReady = resolve;
  });
  let drag = null;
  let panelDrag = null;
  let lastPointerUp = 0;
  let speaking = false;
  let composing = false;
  let pendingSelection = '';
  let selectionTimer = 0;

  const cache = new Map();
  const storage =
    typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null;

  function readRuntimeError() {
    try {
      return runtime && runtime.lastError ? runtime.lastError : null;
    } catch {
      // Chrome revokes the extension context when the extension is reloaded.
      // Reading lastError then throws; the page keeps working with local state.
      return null;
    }
  }

  function safeStorageSet(items) {
    if (!storage) return;

    try {
      storage.set(items, () => {
        // Reading the error marks it as handled and avoids Chrome's unchecked
        // runtime.lastError message after a reload.
        readRuntimeError();
      });
    } catch {
      // Extension reloaded while this page stayed open; local state still wins.
    }
  }

  /* ---------- Mount ---------- */

  function mount() {
    const fullscreen = document.fullscreenElement;
    let parent = document.documentElement || document.body;

    if (
      fullscreen &&
      !['VIDEO', 'IFRAME', 'IMG', 'CANVAS', 'SVG', 'AUDIO'].includes(
        fullscreen.tagName,
      )
    ) {
      parent = fullscreen;
    }

    if (parent && host.parentNode !== parent) parent.appendChild(host);
  }

  let mountObserver = null;

  function startMountObserver() {
    if (mountObserver) return;

    // Some pages replace the body (SPA navigation) or remove unknown nodes.
    mountObserver = new MutationObserver(() => {
      if (siteBlocked || host.isConnected) return;
      const parent =
        document.fullscreenElement || document.documentElement || document.body;
      if (parent) parent.appendChild(host);
    });

    try {
      mountObserver.observe(document.documentElement, { childList: true });
    } catch {
      mountObserver = null;
    }
  }

  function stopMountObserver() {
    if (!mountObserver) return;
    mountObserver.disconnect();
    mountObserver = null;
  }

  function applySiteBlocked(blocked) {
    const next = Boolean(blocked);
    const changed = next !== siteBlocked;
    siteBlocked = next;

    if (next) {
      closePanel();
      hideSelectionButton();
      stopSpeaking();
      cancelDebounce();
      requestSeq += 1;
      stopMountObserver();
      host.remove();
      return;
    }

    if (changed || !host.isConnected) {
      mount();
      startMountObserver();
    }
  }

  function finishSitePolicy(blocked) {
    sitePolicyKnown = true;
    applySiteBlocked(blocked);
    markSitePolicyReady();
  }

  // The UI is mounted only after the policy read. On a blocked site the host
  // stays detached, so no button, panel, or selection bubble ever appears.
  if (sitePolicy) {
    sitePolicy.readBlockedSites((list) => {
      finishSitePolicy(sitePolicy.isBlockedHost(SITE_HOST, list));
    });

    sitePolicy.watchBlockedSites((list) => {
      finishSitePolicy(sitePolicy.isBlockedHost(SITE_HOST, list));
    });
  } else {
    finishSitePolicy(false);
  }

  /* ---------- Floating button position ---------- */

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setFabPosition(x, y, persist) {
    const width = els.fabWrap.offsetWidth || els.fab.offsetWidth || 48;
    const height = els.fabWrap.offsetHeight || els.fab.offsetHeight || 48;
    const maxX = Math.max(6, window.innerWidth - width - 6);
    const maxY = Math.max(6, window.innerHeight - height - 6);
    const nextX = clamp(x, 6, maxX);
    const nextY = clamp(y, 6, maxY);

    els.fabWrap.style.left = `${nextX}px`;
    els.fabWrap.style.top = `${nextY}px`;
    els.fabWrap.style.right = 'auto';
    els.fabWrap.style.bottom = 'auto';

    fabPosition = { x: nextX, y: nextY };

    if (persist && storage) {
      safeStorageSet({ fabPos: fabPosition });
    }

    if (!els.panel.hidden) placePanel();
  }

  function resetFabPosition() {
    // Clearing the inline coordinates brings back the stylesheet position.
    fabPosition = null;
    els.fabWrap.style.left = '';
    els.fabWrap.style.top = '';
    els.fabWrap.style.right = '';
    els.fabWrap.style.bottom = '';
    if (!els.panel.hidden) placePanel();
  }

  function pulseFab() {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    try {
      els.fab.animate(
        [
          { transform: 'scale(1)' },
          { transform: 'scale(1.14)' },
          { transform: 'scale(1)' },
        ],
        { duration: 520, easing: 'ease-out' },
      );
    } catch {
      // The pulse is cosmetic only.
    }
  }

  function setPanelPinned(pinned, persist) {
    panelPinned = Boolean(pinned);
    els.pin.classList.toggle('pinned', panelPinned);
    els.pin.setAttribute('aria-pressed', String(panelPinned));
    els.pin.title = panelPinned
      ? 'إلغاء تثبيت الصندوق'
      : 'تثبيت الصندوق — يفضل مفتوح لما تدوس بره';
    els.pin.setAttribute(
      'aria-label',
      panelPinned ? 'إلغاء تثبيت الصندوق' : 'تثبيت الصندوق',
    );

    if (persist !== false && storage) {
      safeStorageSet({ panelPinned });
    }
  }

  function togglePanelPin() {
    setPanelPinned(!panelPinned, true);
  }

  function syncFabVisibility() {
    // The button disappears while the panel is open, then comes back when the
    // panel closes. fabHidden is the user's own preference (settings / ×), so
    // it wins and keeps the button hidden after the panel closes.
    els.fabWrap.classList.toggle('is-panel-open', !els.panel.hidden);
    els.fabWrap.hidden = fabHidden;
    els.fabWrap.style.visibility = '';
  }

  function setFabHidden(hidden, persist) {
    const next = Boolean(hidden);
    const changed = next !== fabHidden;
    fabHidden = next;
    syncFabVisibility();

    if (next) {
      closePanel();
    } else if (fabPosition) {
      setFabPosition(fabPosition.x, fabPosition.y, false);
    }

    if (persist !== false && changed && storage) {
      safeStorageSet({ fabHidden: next });
    }
  }

  function applyFabPreferences(data) {
    const pos = data && data.fabPos;
    if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      fabPosition = { x: pos.x, y: pos.y };
    }

    const panel = data && data.panelPos;
    if (panel && Number.isFinite(panel.x) && Number.isFinite(panel.y)) {
      panelPosition = { x: panel.x, y: panel.y };
    }

    setFabHidden(Boolean(data && data.fabHidden), false);
    setPanelPinned(Boolean(data && data.panelPinned), false);
  }

  function finishFabPrefs() {
    if (fabPrefsReady) return;
    fabPrefsReady = true;
    markFabPrefsReady();
  }

  function loadFabPreferences() {
    if (!storage) {
      els.fabWrap.style.visibility = '';
      finishFabPrefs();
      return;
    }

    try {
      storage.get(['fabPos', 'fabHidden', 'panelPos', 'panelPinned'], (data) => {
        if (!readRuntimeError()) {
          applyFabPreferences(data);
        } else {
          els.fabWrap.style.visibility = '';
        }
        finishFabPrefs();
      });
    } catch {
      els.fabWrap.style.visibility = '';
      finishFabPrefs();
    }
  }

  loadFabPreferences();

  // Hiding the button follows the user across tabs, and restoring it from the
  // toolbar brings it back everywhere. Position changes from the settings
  // page also apply to pages that are already open.
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;

      if (changes.fabHidden) {
        setFabHidden(Boolean(changes.fabHidden.newValue), false);
      }

      if (changes.panelPinned) {
        setPanelPinned(Boolean(changes.panelPinned.newValue), false);
      }

      if (changes.fabPos) {
        const pos = changes.fabPos.newValue;
        if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
          setFabPosition(pos.x, pos.y, false);
        } else {
          resetFabPosition();
        }
      }

      if (changes.panelPos) {
        const pos = changes.panelPos.newValue;
        panelPosition =
          pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)
            ? { x: pos.x, y: pos.y }
            : null;

        if (!els.panel.hidden) placePanel();
      }
    });
  }

  window.addEventListener(
    'resize',
    () => {
      if (fabPosition) setFabPosition(fabPosition.x, fabPosition.y, false);
      if (!els.panel.hidden) placePanel();
    },
    { passive: true },
  );

  /* ---------- Panel position ---------- */

  function placePanel() {
    if (els.panel.hidden) return;

    const margin = 12;
    const gap = 10;
    const panelRect = els.panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxLeft = Math.max(margin, viewportWidth - panelRect.width - margin);
    const maxTop = Math.max(margin, viewportHeight - panelRect.height - margin);

    let left;
    let top;

    if (panelPosition) {
      // A hand-placed panel stays where the user put it, even if the floating
      // button moves or is hidden.
      left = clamp(panelPosition.x, margin, maxLeft);
      top = clamp(panelPosition.y, margin, maxTop);
      panelPosition = { x: left, y: top };
    } else if (fabHidden) {
      // With no floating button there is nothing to anchor to, so open the
      // panel in the middle of the screen.
      left = clamp((viewportWidth - panelRect.width) / 2, margin, maxLeft);
      top = clamp((viewportHeight - panelRect.height) / 2, margin, maxTop);
    } else {
      const fabRect = els.fab.getBoundingClientRect();
      if (fabRect.left + fabRect.width / 2 > viewportWidth / 2) {
        left = fabRect.left - panelRect.width - gap;
      } else {
        left = fabRect.right + gap;
      }

      left = clamp(left, margin, maxLeft);
      top = clamp(fabRect.bottom - panelRect.height, margin, maxTop);
    }

    els.panel.style.left = `${Math.round(left)}px`;
    els.panel.style.top = `${Math.round(top)}px`;
    els.panel.style.right = 'auto';
    els.panel.style.bottom = 'auto';
  }

  /* ---------- Open / close ---------- */

  function normalizeSelection(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function selectedText() {
    try {
      const text = normalizeSelection(window.getSelection()?.toString());
      return text.length > 0 && text.length <= 200 ? text : '';
    } catch {
      return '';
    }
  }

  function hideSelectionButton() {
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      selectionTimer = 0;
    }
    pendingSelection = '';
    els.selectionTranslate.hidden = true;
  }

  function placeSelectionButton(rect) {
    const button = els.selectionTranslate;
    button.hidden = false;

    const size = button.getBoundingClientRect();
    const margin = 8;
    const gap = 8;

    let left = rect.right - size.width;
    let top = rect.bottom + gap;

    if (top + size.height > window.innerHeight - margin) {
      top = rect.top - size.height - gap;
    }
    if (top < margin) {
      top = clamp(
        rect.bottom + gap,
        margin,
        Math.max(margin, window.innerHeight - size.height - margin),
      );
    }

    left = clamp(
      left,
      margin,
      Math.max(margin, window.innerWidth - size.width - margin),
    );

    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
  }

  function refreshSelectionButton() {
    selectionTimer = 0;
    if (siteBlocked) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideSelectionButton();
      return;
    }

    const text = normalizeSelection(selection.toString());
    if (!text || !LETTER_RE.test(text)) {
      hideSelectionButton();
      return;
    }

    const anchor = selection.anchorNode;
    const root = anchor && anchor.getRootNode ? anchor.getRootNode() : null;
    if (root === shadow || (anchor && host.contains(anchor))) {
      hideSelectionButton();
      return;
    }

    const element =
      anchor && anchor.nodeType === Node.ELEMENT_NODE
        ? anchor
        : anchor && anchor.parentElement;
    if (
      element &&
      (element.closest('input, textarea, select') || element.isContentEditable)
    ) {
      hideSelectionButton();
      return;
    }

    const range = selection.getRangeAt(selection.rangeCount - 1);
    const rects = range.getClientRects();
    const rect = rects.length
      ? rects[rects.length - 1]
      : range.getBoundingClientRect();

    if (!rect || rect.width < 1 || rect.height < 1) {
      hideSelectionButton();
      return;
    }

    pendingSelection = text;
    placeSelectionButton(rect);
  }

  function scheduleSelectionButton() {
    if (siteBlocked) return;
    if (selectionTimer) clearTimeout(selectionTimer);
    selectionTimer = setTimeout(refreshSelectionButton, 20);
  }

  function translateSelectionText(text) {
    if (siteBlocked) return false;

    const value = normalizeSelection(text);
    if (!value || !LETTER_RE.test(value)) return false;

    hideSelectionButton();
    openPanel();
    els.input.value = value;
    onInput();
    cancelDebounce();
    translateNow();
    return true;
  }

  function openPanel() {
    if (siteBlocked) return;

    hideSelectionButton();

    if (!els.panel.hidden) {
      placePanel();
      syncFabVisibility();
      els.input.focus({ preventScroll: true });
      return;
    }

    lastFocus = document.activeElement;
    els.panel.hidden = false;
    placePanel();
    syncFabVisibility();

    requestAnimationFrame(() => {
      placePanel();

      if (!els.input.value.trim()) {
        const selected = selectedText();
        if (selected && LETTER_RE.test(selected)) {
          els.input.value = selected;
          onInput();
        }
      }

      els.input.focus({ preventScroll: true });
    });
  }

  function closePanel() {
    if (els.panel.hidden) return;
    closePathModal();
    hideSelectionButton();
    stopSpeaking();
    els.panel.hidden = true;
    syncFabVisibility();

    if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch {
        // The element may be gone.
      }
    }
  }

  function togglePanel(force) {
    const show = typeof force === 'boolean' ? force : els.panel.hidden;
    if (show) openPanel();
    else closePanel();
  }

  /* ---------- Language direction ---------- */

  function detectMode(text) {
    return ARABIC_RE.test(text) ? 'ar-en' : 'en-ar';
  }

  function setMode(next) {
    mode = next;
    els.direction.textContent =
      mode === 'en-ar'
        ? 'من الإنجليزي للعربي'
        : 'من العربي للإنجليزي';
  }

  /* ---------- Translation ---------- */

  function cancelDebounce() {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = 0;
    }
  }

  function autoGrowInput() {
    els.input.style.height = 'auto';
    els.input.style.height = `${Math.min(els.input.scrollHeight + 2, 150)}px`;
  }

  function resultSize(text) {
    if (text.length > 140) return 'huge';
    if (text.length > 90) return 'xlong';
    if (text.length > 45) return 'long';
    return '';
  }

  function onInput() {
    if (composing) return;
    cancelClearAnimation();

    const text = els.input.value;
    els.clear.hidden = !text;
    els.copySource.hidden = !text;
    els.input.dir = text && !ARABIC_RE.test(text) ? 'ltr' : 'rtl';
    autoGrowInput();

    if (!text.trim()) {
      cancelDebounce();
      requestSeq++;
      lastResult = '';
      lastQuery = '';
      setState('empty', EMPTY_TEXT);
      return;
    }

    const detected = detectMode(text);
    if (detected !== mode) setMode(detected);

    cancelDebounce();
    debounceTimer = setTimeout(translateNow, DEBOUNCE_MS);
  }

  // Clears the word, translation, and actions so the next word can be typed
  // straight away. `notice` keeps a short confirmation in the result card
  // after a save instead of dropping back to the generic empty text.
  function cancelClearAnimation() {
    if (!clearAnimationTimer) return;
    clearTimeout(clearAnimationTimer);
    clearAnimationTimer = 0;
    els.panel.classList.remove('is-clearing');
  }

  // Lets the old word and result fade away before the real reset, instead of
  // making the text vanish in a single frame. Typing during the short beat
  // cancels the animation and keeps whatever the user started writing.
  function animateResetInput(options) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      resetInput(options);
      return;
    }

    clearTimeout(clearAnimationTimer);
    els.panel.classList.remove('is-clearing');
    void els.panel.offsetWidth; // restart the transition from a clean state
    els.panel.classList.add('is-clearing');

    clearAnimationTimer = setTimeout(() => {
      clearAnimationTimer = 0;
      els.panel.classList.remove('is-clearing');
      resetInput(options);
    }, CLEAR_ANIMATION_MS);
  }

  function resetInput({ focus = false, notice = '' } = {}) {
    cancelClearAnimation();
    cancelDebounce();
    requestSeq++;
    clearTimeout(saveTimer);
    clearTimeout(emptyNoticeTimer);

    els.input.value = '';
    els.input.style.height = '';
    els.input.dir = 'rtl';
    els.clear.hidden = true;
    els.copySource.hidden = true;
    els.copySource.classList.remove('copied', 'error');
    els.copySource.title = 'انسخ الكلمة';
    lastResult = '';
    lastQuery = '';
    setState('empty', notice || EMPTY_TEXT);

    if (notice) {
      emptyNoticeTimer = setTimeout(() => {
        if (
          !els.input.value.trim() &&
          !lastQuery &&
          els.resultCard.dataset.state === 'empty'
        ) {
          els.result.textContent = EMPTY_TEXT;
        }
      }, 3200);
    }

    if (focus) els.input.focus({ preventScroll: true });
  }

  async function translateNow() {
    if (siteBlocked) return;

    const text = els.input.value.trim();
    cancelDebounce();
    const seq = ++requestSeq;

    if (!text) {
      setState('empty', EMPTY_TEXT);
      els.input.focus({ preventScroll: true });
      return;
    }

    if (!LETTER_RE.test(text)) {
      lastResult = '';
      lastQuery = '';
      setState('error', 'محتاج كلمة عربية أو إنجليزية عشان أقدر أترجمها.');
      return;
    }

    const detected = detectMode(text);
    if (detected !== mode) setMode(detected);

    const from = mode === 'ar-en' ? 'ar' : 'en';
    const to = from === 'ar' ? 'en' : 'ar';
    const key = `${from}:${text.toLowerCase()}`;

    lastQuery = text;
    stopSpeaking();

    const cached = cache.get(key);
    if (cached) {
      lastResult = cached.text;
      showResult(cached.text);
      return;
    }

    setState('loading', 'بندوّر عليها…');

    const response = await sendMessage({ type: 'translate', text, from, to });
    if (seq !== requestSeq) return;

    if (response && response.ok && response.text) {
      lastResult = response.text;
      cache.set(key, { text: response.text });
      if (cache.size > 100) cache.delete(cache.keys().next().value);
      showResult(response.text);
    } else {
      lastResult = '';
      lastQuery = '';
      setState('error', errorMessage(response && response.code));
    }
  }

  function errorMessage(code) {
    if (!navigator.onLine) {
      return 'مفيش اتصال بالإنترنت. اتأكد من الشبكة وجرّب تاني.';
    }

    switch (code) {
      case 'empty':
        return 'اكتب كلمة الأول.';
      case 'too_long':
        return 'النص طويل شوية. جرّب كلمة أو جملة قصيرة.';
      case 'timeout':
        return 'الترجمة خدت وقت أطول من المعتاد. جرّب تاني.';
      case 'rate':
        return 'الخدمة مشغولة شوية دلوقتي. استنى لحظة وجرّب تاني.';
      default:
        return 'مقدرتش أترجم الكلمة دلوقتي. جرّب تاني بعد لحظة.';
    }
  }

  function setState(state, text) {
    els.resultCard.dataset.state = state;
    els.result.textContent = text;

    if (state !== 'ready') {
      els.result.dir = 'rtl';
      els.resultCard.dataset.size = '';
      els.save.hidden = true;
      els.copy.hidden = true;
      hideSpeak();
      els.save.classList.remove('ok', 'err');
      els.save.disabled = false;
      els.saveLabel.textContent = 'أضف للحصالة';
    }
  }

  function showResult(text) {
    setState('ready', text);
    els.result.lang = mode === 'en-ar' ? 'ar' : 'en';
    els.result.dir = mode === 'en-ar' ? 'rtl' : 'ltr';
    els.resultCard.dataset.size = resultSize(text);
    els.resultCard.classList.remove('pop');
    void els.resultCard.offsetWidth;
    els.resultCard.classList.add('pop');
    els.save.hidden = false;
    els.copy.hidden = false;
    els.speak.hidden = false;
    resetSpeakButton();
    els.save.disabled = false;
    els.save.classList.remove('ok', 'err');
    els.saveLabel.textContent = 'أضف للحصالة';
  }

  /* ---------- Copy ---------- */

  async function copyResult() {
    if (!lastResult) return;
    const copied = await copyText(lastResult);
    els.copy.textContent = copied ? 'اتنسخت ✓' : 'مقدرتش أنسخ';
    setTimeout(() => {
      els.copy.textContent = 'انسخ';
    }, 1600);
  }

  async function copySourceText() {
    const value = els.input.value.trim();
    if (!value) return;

    const copied = await copyText(value);
    clearTimeout(sourceCopyTimer);

    els.copySource.classList.remove('copied', 'error');
    els.copySource.classList.add(copied ? 'copied' : 'error');
    els.copySource.title = copied ? 'اتنسخت ✓' : 'مقدرتش أنسخ';

    sourceCopyTimer = setTimeout(() => {
      els.copySource.classList.remove('copied', 'error');
      els.copySource.title = 'انسخ الكلمة';
    }, 1600);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const helper = document.createElement('textarea');
        helper.value = value;
        helper.setAttribute('readonly', '');
        helper.style.position = 'fixed';
        helper.style.opacity = '0';
        host.appendChild(helper);
        helper.select();
        const ok = document.execCommand('copy');
        helper.remove();
        return ok;
      } catch {
        return false;
      }
    }
  }

  /* ---------- Pronunciation ---------- */

  function hideSpeak() {
    stopSpeaking();
    els.speak.hidden = true;
    els.speak.classList.remove('is-speaking', 'error');
    els.speak.disabled = false;
    els.speak.title = 'سمّعني';
  }

  function resetSpeakButton() {
    speaking = false;
    els.speak.classList.remove('is-speaking', 'error');
    els.speak.disabled = false;
    els.speak.title = 'سمّعني';
  }

  async function speakResult() {
    if (!lastResult) return;

    if (speaking) {
      stopSpeaking();
      return;
    }

    const lang = mode === 'en-ar' ? 'ar' : 'en';
    speaking = true;
    els.speak.classList.remove('error');
    els.speak.classList.add('is-speaking');
    els.speak.title = 'وقف الصوت';

    const response = await sendMessage({
      type: 'tts',
      text: lastResult,
      lang,
    });

    if (!response || !response.ok) {
      resetSpeakButton();
      els.speak.classList.add('error');
      els.speak.title = 'الصوت مش متاح دلوقتي';
      setTimeout(() => {
        if (!speaking) {
          els.speak.classList.remove('error');
          els.speak.title = 'سمّعني';
        }
      }, 2200);
    }
  }

  function stopSpeaking() {
    if (!speaking) return;
    resetSpeakButton();
    sendMessage({ type: 'stopTts' });
  }

  runtime.onMessage.addListener((message) => {
    if (!message || message.type !== 'ttsState') return false;

    if (message.playing) {
      speaking = true;
      els.speak.hidden = false;
      els.speak.classList.remove('error');
      els.speak.classList.add('is-speaking');
      els.speak.title = 'وقف الصوت';
    } else {
      resetSpeakButton();
    }

    return false;
  });

  /* ---------- Hassala ---------- */

  function getStoredPath() {
    return new Promise((resolve) => {
      if (!storage) return resolve('');
      try {
        storage.get(['hassalaFile', 'obsidianFile'], (data) => {
          readRuntimeError();
          const current =
            data && typeof data.hassalaFile === 'string'
              ? data.hassalaFile.trim()
              : '';
          const legacy =
            data && typeof data.obsidianFile === 'string'
              ? data.obsidianFile.trim()
              : '';
          const value = current || legacy;
          if (!current && legacy) {
            storage.set({ hassalaFile: value }, () => {
              readRuntimeError();
              storage.remove('obsidianFile', () => readRuntimeError());
            });
          }
          resolve(value);
        });
      } catch {
        resolve('');
      }
    });
  }

  function setStoredPath(path) {
    return new Promise((resolve) => {
      if (!storage) return resolve();
      try {
        storage.set({ hassalaFile: path }, () => {
          readRuntimeError();
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  function removeStoredPath() {
    return new Promise((resolve) => {
      if (!storage) return resolve();
      try {
        storage.remove('hassalaFile', () => {
          readRuntimeError();
          resolve();
        });
      } catch {
        resolve();
      }
    });
  }

  function isTemporaryNativeFailure(code) {
    return code === 'native_missing' || code === 'timeout' || code === 'failed';
  }

  function nativeErrorMessage(code) {
    switch (code) {
      case 'native_missing':
        return 'الربط مش مفعّل. راجع تركيب Native Host في الإعدادات.';
      case 'file_missing':
        return 'الملف ده مش موجود. اتأكد من المسار الكامل، أو اعمله الأول.';
      case 'invalid_file':
        return 'المسار مش صح. اكتب مسار ملف كامل من الروت، ومن غير ما يكون فولدر.';
      case 'write_failed':
        return 'مقدرتش أعدّل الملف ده. اتأكد إن عندك صلاحية كتابة.';
      case 'open_failed':
        return 'مقدرتش أفتح الملف. اتأكد إن فيه تطبيق بيقرأ Markdown.';
      case 'config_error':
        return 'فيه مشكلة في إعدادات الملف الافتراضي.';
      case 'timeout':
        return 'الطلب خد وقت طويل. جرّب تاني.';
      default:
        return 'حصلت مشكلة. جرّب تاني.';
    }
  }

  function setFileStatus(text, kind = 'info') {
    clearTimeout(fileStatusTimer);
    els.fileStatus.hidden = !text;
    els.fileStatus.textContent = text || '';
    els.fileStatus.dataset.kind = kind;

    if (text) {
      fileStatusTimer = setTimeout(() => {
        els.fileStatus.hidden = true;
      }, 6000);
    }
  }

  function setPathStatus(text, kind = 'info') {
    els.pathStatus.textContent = text || '';
    els.pathStatus.dataset.kind = kind;
  }

  async function openCurrentFile() {
    if (els.openFile.disabled) return;

    els.openFile.disabled = true;
    setFileStatus('بيفتح الملف…', 'info');

    const response = await sendMessage({ type: 'openHassalaFile' }, 9000);
    els.openFile.disabled = false;

    if (response && response.ok) {
      setFileStatus(
        response.filePath
          ? `اتفتح الملف: ${response.filePath}`
          : 'اتفتح ملف الحفظ.',
        'ok',
      );
    } else {
      setFileStatus(
        nativeErrorMessage(response && response.code),
        'error',
      );
    }
  }

  async function openPathModal() {
    pathLastFocus = shadow.activeElement || els.pathSettings;
    els.pathModal.hidden = false;
    els.pathSave.disabled = false;
    els.pathUseDefault.disabled = false;
    els.pathInput.value = '';
    els.pathDefault.textContent = 'بنجيب المسار الحالي…';
    setPathStatus('', 'info');

    const stored = await getStoredPath();
    const info = await sendMessage({ type: 'hassalaInfo' }, 8000);

    if (els.pathModal.hidden) return;

    pathDefaultPath =
      info && info.ok && typeof info.filePath === 'string'
        ? info.filePath
        : '';

    els.pathDefault.textContent = pathDefaultPath
      ? `الافتراضي: ${pathDefaultPath}`
      : 'مفيش ملف افتراضي متظبط.';

    els.pathInput.value = stored || pathDefaultPath;
    window.setTimeout(() => {
      if (els.pathModal.hidden) return;
      els.pathInput.focus();
      els.pathInput.select();
    }, 30);
  }

  function closePathModal() {
    if (els.pathModal.hidden) return;

    els.pathModal.hidden = true;
    const target = pathLastFocus;
    pathLastFocus = null;

    if (target && typeof target.focus === 'function') {
      try {
        target.focus({ preventScroll: true });
      } catch {
        // The element may be gone.
      }
    }
  }

  async function savePathFromModal() {
    const raw = els.pathInput.value.trim();

    if (!raw) {
      await useDefaultPathFromModal();
      return;
    }

    if (!raw.startsWith('/') || raw.length > 4096) {
      setPathStatus(
        'اكتب مسار كامل من الروت، زي /home/you/Documents/Hassala Words.md.',
        'error',
      );
      return;
    }

    els.pathSave.disabled = true;
    setPathStatus('بنراجع الملف…', 'info');

    const check = await sendMessage({ type: 'hassalaCheckFile', file: raw }, 12000);
    els.pathSave.disabled = false;

    if (check && check.ok) {
      const finalPath = check.filePath || check.file || raw;
      await setStoredPath(finalPath);
      els.pathInput.value = finalPath;
      setPathStatus(
        `تم. الكلمات هتتحفظ في «${finalPath}» بالظبط.`,
        'ok',
      );
      setFileStatus('اتغير مسار الحفظ ✓', 'ok');
      return;
    }

    if (check && isTemporaryNativeFailure(check.code)) {
      await setStoredPath(raw);
      els.pathInput.value = raw;
      setPathStatus(
        `اتحفظ المسار «${raw}»، بس مش قادر أتأكد من الملف دلوقتي.`,
        'info',
      );
      setFileStatus('اتغير مسار الحفظ ✓', 'ok');
      return;
    }

    setPathStatus(nativeErrorMessage(check && check.code), 'error');
  }

  async function useDefaultPathFromModal() {
    await removeStoredPath();
    els.pathInput.value = pathDefaultPath || '';
    setPathStatus(
      pathDefaultPath
        ? `تمام — هنستخدم الملف الافتراضي «${pathDefaultPath}».`
        : 'تمام — مفيش اختيار مخصص، وهنستخدم الملف الافتراضي.',
      'ok',
    );
    setFileStatus('رجعنا للملف الافتراضي ✓', 'ok');
  }

  function resetSiteDisablePrompt() {
    siteDisableArmedUntil = 0;
    if (siteDisableTimer) {
      clearTimeout(siteDisableTimer);
      siteDisableTimer = 0;
    }
    const label = els.siteToggle && els.siteToggle.querySelector('span');
    if (label) label.textContent = 'تعطيل هنا';
  }

  function blockCurrentSite(site) {
    if (!storage || !sitePolicy) return;

    try {
      storage.get([sitePolicy.STORAGE_KEY], (data) => {
        if (readRuntimeError()) {
          setFileStatus('مقدرتش أقرأ إعدادات المواقع دلوقتي. جرّب تاني.', 'error');
          return;
        }

        const list = sitePolicy.sanitizeList(
          data && data[sitePolicy.STORAGE_KEY],
        );
        if (!list.includes(site)) list.push(site);

        storage.set(
          { [sitePolicy.STORAGE_KEY]: sitePolicy.sanitizeList(list) },
          () => {
            if (readRuntimeError()) {
              setFileStatus('مقدرتش أحفظ تعطيل الموقع. جرّب تاني.', 'error');
              return;
            }

            // Hide immediately; the storage listener would do the same.
            applySiteBlocked(true);
          },
        );
      });
    } catch {
      setFileStatus('مقدرتش أحفظ تعطيل الموقع. جرّب تاني.', 'error');
    }
  }

  function onSiteToggleClick() {
    if (siteBlocked || !sitePolicy || !storage) return;

    const site = sitePolicy.normalizeSite(SITE_HOST);
    if (!site) return;

    // A deliberate two-step action: the first click explains what will happen,
    // the second one blocks the site. This avoids a native confirm dialog that
    // YouTube can pause or obscure.
    if (Date.now() > siteDisableArmedUntil) {
      siteDisableArmedUntil = Date.now() + 5000;
      if (siteDisableTimer) clearTimeout(siteDisableTimer);
      const label = els.siteToggle.querySelector('span');
      if (label) label.textContent = 'متأكد؟';
      setFileStatus(
        `هتتعطّل حصالة على «${site}» وكل النطاقات الفرعية. اضغط تاني للتأكيد.`,
        'info',
      );
      siteDisableTimer = setTimeout(resetSiteDisablePrompt, 5000);
      return;
    }

    resetSiteDisablePrompt();
    blockCurrentSite(site);
  }

  async function saveToHassala() {
    if (siteBlocked) return;
    if (!lastResult || !lastQuery || els.save.disabled) return;

    const query = lastQuery;
    const translation = lastResult;

    els.save.disabled = true;
    els.save.classList.remove('ok', 'err');
    els.saveLabel.textContent = 'بيحوش…';

    const response = await sendMessage({
      type: 'saveToHassala',
      word: query,
      translation,
      mode,
    });

    if (response && response.ok) {
      const notice = response.duplicate
        ? 'كانت موجودة عندك ✓ اكتب الكلمة اللي بعدها'
        : 'اتحوشت ✓ اكتب الكلمة اللي بعدها';

      // Only clear when the field still holds the word that was saved. If the
      // user has already started the next word, leave their text alone.
      if (lastQuery === query && els.input.value.trim() === query) {
        animateResetInput({ focus: true, notice });
      } else {
        setFileStatus(notice, 'ok');
        els.save.disabled = false;
        els.save.classList.remove('ok', 'err');
        els.saveLabel.textContent = 'أضف للحصالة';
      }
      return;
    }

    els.save.classList.add('err');
    els.saveLabel.textContent =
      response && response.code === 'native_missing'
        ? 'الربط مش مفعّل'
        : response && response.code === 'invalid_file'
          ? 'راجع مسار الحصالة'
          : response && response.code === 'file_missing'
            ? 'الملف مش موجود'
            : 'مقدرتش أحوش';

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      els.save.disabled = false;
      els.save.classList.remove('ok', 'err');
      els.saveLabel.textContent = 'أضف للحصالة';
    }, 2400);
  }

  function sendMessage(payload, timeoutMs = 12000) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (response) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(response);
      };
      const timer = setTimeout(() => finish({ ok: false, code: 'timeout' }), timeoutMs);

      try {
        runtime.sendMessage(payload, (response) => {
          if (readRuntimeError()) finish({ ok: false, code: 'failed' });
          else finish(response);
        });
      } catch {
        finish({ ok: false, code: 'failed' });
      }
    });
  }

  /* ---------- Events ---------- */

  els.input.addEventListener('input', onInput);
  els.input.addEventListener('compositionstart', () => {
    composing = true;
  });
  els.input.addEventListener('compositionend', () => {
    composing = false;
    onInput();
  });

  // Events from inside the panel are retargeted to the shadow host once they
  // leave the closed shadow tree. Sites such as YouTube then think no text
  // field is focused and run their shortcuts (Space toggles playback, arrows
  // seek, letters like k/j/l jump around the player). The document_start
  // guard registers before page scripts, so it sees these keys first and
  // keeps them away from the page. Stopping propagation does not cancel the
  // browser's default action, so typing, caret movement, selection, undo,
  // and IME composition all keep their normal behaviour.
  function activePanelElement() {
    try {
      return shadow.activeElement;
    } catch {
      return null;
    }
  }

  function handlePanelKeydown(event) {
    if (event.isComposing || event.keyCode === 229) return;

    const target = activePanelElement();
    if (!target) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      if (!els.pathModal.hidden) closePathModal();
      else closePanel();
      return;
    }

    if (target === els.input && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      cancelDebounce();
      translateNow();
      return;
    }

    if (target === els.pathInput && event.key === 'Enter') {
      event.preventDefault();
      savePathFromModal();
    }
  }

  const keyboardGuard = globalThis.__AET_KEYBOARD_GUARD__;
  if (keyboardGuard) {
    keyboardGuard.mount({
      host,
      focused: () => activePanelElement() !== null,
      onKeyDown: handlePanelKeydown,
    });
  }

  // Fallback for tabs that were already open when the extension was updated
  // and therefore loaded the guard after the page's own listeners. The guard
  // stops the event before it reaches these listeners in the normal path.
  els.panel.addEventListener('keydown', (event) => {
    handlePanelKeydown(event);
    event.stopPropagation();
  });
  els.pathModal.addEventListener('keydown', (event) => {
    handlePanelKeydown(event);
    event.stopPropagation();
  });

  els.clear.addEventListener('click', () => {
    resetInput({ focus: true });
  });

  els.copySource.addEventListener('click', copySourceText);
  els.copy.addEventListener('click', copyResult);
  els.speak.addEventListener('click', speakResult);
  els.save.addEventListener('click', saveToHassala);
  els.openFile.addEventListener('click', openCurrentFile);
  els.pathSettings.addEventListener('click', openPathModal);
  if (els.siteToggle) els.siteToggle.addEventListener('click', onSiteToggleClick);
  els.pathClose.addEventListener('click', closePathModal);
  els.pathSave.addEventListener('click', savePathFromModal);
  els.pathUseDefault.addEventListener('click', useDefaultPathFromModal);
  els.pathOpenOptions.addEventListener('click', () => {
    sendMessage({ type: 'openOptions' }, 4000);
    closePathModal();
  });
  els.pathModal.addEventListener('click', (event) => {
    if (event.target.closest('[data-path-close]')) closePathModal();
  });
  els.pin.addEventListener('click', togglePanelPin);
  els.settings.addEventListener('click', () => {
    sendMessage({ type: 'openOptions' }, 4000);
  });
  els.close.addEventListener('click', closePanel);

  // Keep page shortcuts and page click handlers away from our UI.
  for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick', 'wheel']) {
    host.addEventListener(type, (event) => event.stopPropagation(), {
      passive: type === 'wheel',
    });
  }

  document.addEventListener(
    'pointerdown',
    (event) => {
      if (els.panel.hidden || panelPinned) return;
      if (event.composedPath().includes(host)) return;
      closePanel();
    },
    true,
  );

  /* ---------- Selection bubble ---------- */

  els.selectionTranslate.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  els.selectionTranslate.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  els.selectionTranslate.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (pendingSelection) translateSelectionText(pendingSelection);
    else hideSelectionButton();
  });

  document.addEventListener(
    'mouseup',
    (event) => {
      if (event.button !== 0) return;
      if (event.composedPath().includes(host)) return;
      scheduleSelectionButton();
    },
    true,
  );

  document.addEventListener(
    'keyup',
    (event) => {
      if (event.composedPath().includes(host)) return;
      if (
        event.key === 'Shift' ||
        event.shiftKey ||
        event.key.startsWith('Arrow')
      ) {
        scheduleSelectionButton();
      }
    },
    true,
  );

  document.addEventListener(
    'mousedown',
    (event) => {
      if (event.composedPath().includes(els.selectionTranslate)) return;
      hideSelectionButton();
    },
    true,
  );

  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) hideSelectionButton();
  });

  window.addEventListener('scroll', hideSelectionButton, true);
  window.addEventListener('resize', hideSelectionButton);

  /* ---------- Floating button drag / click ---------- */

  els.fab.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;

    const rect = els.fab.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };

    try {
      els.fab.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }

    event.preventDefault();
  });

  els.fab.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (!drag.moved) return;

    setFabPosition(drag.left + dx, drag.top + dy, false);
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const moved = drag.moved;
    drag = null;
    lastPointerUp = Date.now();

    if (moved && fabPosition && storage) {
      safeStorageSet({ fabPos: fabPosition });
    }

    if (!moved) togglePanel();
  }

  els.fab.addEventListener('pointerup', endDrag);
  els.fab.addEventListener('pointercancel', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
    lastPointerUp = Date.now();
  });

  // Keyboard activation (Enter/Space) fires click without a pointerup.
  els.fab.addEventListener('click', () => {
    if (Date.now() - lastPointerUp < 400) return;
    togglePanel();
  });

  // Hiding is deliberate: it closes the panel and is remembered on every tab.
  els.fabClose.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    setFabHidden(true, true);
  });

  /* ---------- Panel drag ---------- */

  function savePanelPosition() {
    if (!panelPosition || !storage) return;

    const position = { x: panelPosition.x, y: panelPosition.y };
    safeStorageSet({ panelPos: position });
  }

  els.panelHead.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('button, input, textarea, select, a')) return;

    const rect = els.panel.getBoundingClientRect();
    panelDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
    };

    try {
      els.panelHead.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is best-effort.
    }

    els.panelHead.classList.add('is-dragging');
    event.preventDefault();
  });

  els.panelHead.addEventListener('pointermove', (event) => {
    if (!panelDrag || event.pointerId !== panelDrag.pointerId) return;

    const rect = els.panel.getBoundingClientRect();
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    const left = clamp(
      panelDrag.left + event.clientX - panelDrag.startX,
      margin,
      maxLeft,
    );
    const top = clamp(
      panelDrag.top + event.clientY - panelDrag.startY,
      margin,
      maxTop,
    );

    panelPosition = { x: left, y: top };
    els.panel.style.left = `${Math.round(left)}px`;
    els.panel.style.top = `${Math.round(top)}px`;
    els.panel.style.right = 'auto';
    els.panel.style.bottom = 'auto';
  });

  function endPanelDrag(event) {
    if (!panelDrag || event.pointerId !== panelDrag.pointerId) return;
    panelDrag = null;
    els.panelHead.classList.remove('is-dragging');
    savePanelPosition();
  }

  els.panelHead.addEventListener('pointerup', endPanelDrag);
  els.panelHead.addEventListener('pointercancel', endPanelDrag);

  /* ---------- Fullscreen ---------- */

  function syncFullscreenParent() {
    if (siteBlocked) return;

    const fullscreen = document.fullscreenElement;
    let parent = document.documentElement;

    if (fullscreen) {
      const tag = fullscreen.tagName;
      // Elements like <video> and <iframe> do not render normal children.
      if (!['VIDEO', 'IFRAME', 'IMG', 'CANVAS', 'SVG', 'AUDIO'].includes(tag)) {
        parent = fullscreen;
      }
    }

    if (parent && host.parentNode !== parent) {
      parent.appendChild(host);
    }

    requestAnimationFrame(() => {
      if (fabPosition) setFabPosition(fabPosition.x, fabPosition.y, false);
      if (!els.panel.hidden) placePanel();
    });
  }

  document.addEventListener('fullscreenchange', syncFullscreenParent, true);

  /* ---------- Toolbar button ---------- */

  function toggleFromToolbar() {
    if (siteBlocked) return;

    // A hidden floating button is brought back by the toolbar icon. The next
    // toolbar click behaves normally and opens the panel.
    if (fabHidden) {
      setFabHidden(false, true);
      pulseFab();
      return;
    }

    // The toolbar click should open the panel, not close an open one.
    if (els.panel.hidden) {
      openPanel();
    } else {
      els.input.focus({ preventScroll: true });
    }
  }

  // Messaging is the only path from the background to this panel.
  runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'toggleFloatingPanel') return false;

    sitePolicyReady.then(() => {
      if (siteBlocked) {
        sendResponse({ ok: false, code: 'site_blocked' });
        return;
      }

      const respond = () => {
        toggleFromToolbar();
        sendResponse({ ok: true, open: !els.panel.hidden });
      };

      if (fabPrefsReady) respond();
      else fabPrefsLoaded.then(respond);
    });
    return true;
  });

  // YouTube (and any other in-page helper) uses the isolated-world API above;
  // there is deliberately no page-visible translate event.

  // YouTube runs in the same isolated world. A direct function call is safer
  // than a DOM event because the page cannot reach this object.
  globalThis.__AET_FLOATING_API__ = {
    translate: translateSelectionText,
    toggle: toggleFromToolbar,
  };

  // The page is ready; let the background know it can send the toggle message.
  try {
    runtime.sendMessage({ type: 'floatingReady' }, () => {
      readRuntimeError();
    });
  } catch {
    // The extension was reloaded; this page needs a refresh.
  }
})();
