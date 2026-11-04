'use strict';

/**
 * In-page translator.
 *
 * A small floating button is injected into every page. It opens a compact
 * panel that does everything the toolbar popup does, including saving words
 * to the local word bank. Because the panel lives in the page, it stays open
 * when the keyboard layout changes (Win+Space) or when the browser is fullscreen.
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
  const bank = globalThis.HassalaWordBank || null;

  const ARABIC_RE =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LETTER_RE =
    /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const EMPTY_TEXT = 'Type a word… and its meaning will appear here.';
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
      direction: ltr;
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

    .words-bank {
      position: relative;
    }

    .word-count {
      position: absolute;
      top: -4px;
      right: -4px;
      display: grid;
      place-items: center;
      min-width: 13px;
      height: 13px;
      padding: 0 3px;
      border: 1.5px solid var(--aet-surface);
      border-radius: 999px;
      background: var(--aet-gold);
      color: var(--aet-on-gold);
      font-size: 8px;
      font-weight: 800;
      line-height: 1;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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

    .save-folder {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 9px;
      border: 1px dashed var(--aet-line-strong);
      border-radius: 11px;
      background: var(--aet-surface-2);
    }

    .save-folder span {
      flex: none;
      color: var(--aet-muted);
      font-size: 10.5px;
      font-weight: 600;
      white-space: nowrap;
    }

    .folder-select {
      flex: 0 1 150px;
      min-width: 0;
      max-width: 150px;
      padding: 5px 7px;
      overflow: hidden;
      border: 1px solid var(--aet-line-strong);
      border-radius: 8px;
      outline: none;
      background: var(--aet-surface);
      color: var(--aet-text);
      font: inherit;
      font-size: 10.5px;
      direction: ltr;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
    }

    .folder-select:focus {
      border-color: var(--aet-gold);
      box-shadow: 0 0 0 2px var(--aet-gold-soft);
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

    @media (max-width: 320px) {
      .save-folder {
        align-items: stretch;
        flex-direction: column;
        gap: 6px;
      }

      .folder-select {
        flex: 1 1 auto;
        width: 100%;
        max-width: none;
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
    <button id="selectionTranslate" class="selection-translate" type="button" title="Translate selected text" aria-label="Translate selected text" hidden>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.6"/>
        <path d="M3.6 12h16.8M12 3.4c2.5 2.5 3.8 5.4 3.8 8.6s-1.3 6.1-3.8 8.6c-2.5-2.5-3.8-5.4-3.8-8.6S9.5 5.9 12 3.4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <span>Translate</span>
    </button>

    <div id="fabWrap" style="visibility:hidden">
      <button id="fab" type="button" title="Hassala — keep every word" aria-label="Open Hassala">
        <span class="fab-spark" aria-hidden="true">✦</span>
        <span class="fab-logo">ع</span>
        <span class="fab-badge">A</span>
      </button>
      <button id="fabClose" type="button" title="Hide floating button — restore it from the extension icon" aria-label="Hide floating button">×</button>
    </div>

    <section id="panel" dir="ltr" hidden>
      <header class="head" id="panelHead">
        <div class="head-title">
          <span class="mini-logo">ع</span>
          <span class="head-text">
            <strong>Hassala</strong>
            <small>Keep every word ✦</small>
          </span>
        </div>
        <div class="head-actions">
          <button id="pin" class="icon" type="button" title="Pin panel — keep it open after saving or clicking outside" aria-label="Pin panel" aria-pressed="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 4h6M10 4l.7 5.2-2.7 2.8v1.8h8v-1.8L13.3 9.2 14 4M12 13.8V21"/>
            </svg>
          </button>
          <button id="wordsBank" class="icon words-bank" type="button" title="My words and export" aria-label="My words and export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15.5H6.5A2.5 2.5 0 0 0 4 21V5.5Z"/>
              <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20"/>
              <path d="M8 7h7M8 10.5h5"/>
            </svg>
            <span id="wordCount" class="word-count">0</span>
          </button>
          <button id="settings" class="icon" type="button" title="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 0 0-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 0 0-2.282.819l-.922 1.597a1.875 1.875 0 0 0 .432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 0 0 0 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 0 0-.432 2.385l.922 1.597a1.875 1.875 0 0 0 2.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 0 0 2.28-.819l.923-1.597a1.875 1.875 0 0 0-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 0 0 0-1.139c-.016-.2.059-.352.153-.43l.84-.692a1.875 1.875 0 0 0 .433-2.385l-.922-1.597a1.875 1.875 0 0 0-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 0 0-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 0 0-1.85-1.567h-1.843ZM12 15.75a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" clip-rule="evenodd"/>
            </svg>
          </button>
          <button id="close" class="icon" type="button" title="Close" aria-label="Close">×</button>
        </div>
      </header>

      <div id="direction" class="direction">English → Arabic</div>

      <div class="field">
        <textarea
          id="input"
          rows="2"
          dir="auto"
          maxlength="200"
          placeholder="Type a word… English or Arabic"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
        ></textarea>
        <button id="clear" class="clear" type="button" title="Clear" aria-label="Clear text" hidden>×</button>
        <button id="copySource" class="clear copy-source" type="button" title="Copy word" aria-label="Copy word" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" stroke-width="1.8"/>
            <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div id="resultCard" class="result" data-state="empty" aria-live="polite">
        <span id="result">Type a word… and its meaning will appear here.</span>
      </div>

      <div class="foot">
        <button id="save" class="save" type="button" title="Save the word and translation to your word bank" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2.6 4.4 7v10L12 21.4 19.6 17V7L12 2.6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M12 7.2 8 9.5v5l4 2.3 4-2.3v-5l-4-2.3Z" fill="currentColor" opacity=".85"/>
          </svg>
          <span id="saveLabel">Add to Hassala</span>
        </button>
        <button id="speak" class="copy speak" type="button" title="Listen" aria-label="Listen" hidden>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 10v4h3l4 3V7l-4 3H5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
            <path d="M15 9.5a4 4 0 0 1 0 5M17.4 7.1a7.4 7.4 0 0 1 0 9.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          </svg>
        </button>
        <button id="copy" class="copy" type="button" title="Copy translation" hidden>Copy</button>
      </div>

      <div class="save-folder">
        <span>Save new words to</span>
        <select id="folderSelect" class="folder-select" aria-label="Word save folder"></select>
      </div>

      <div class="file-tools">
        <button id="siteToggle" class="file-tool site-toggle" type="button" title="Disable Hassala on this site">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5"/>
            <path d="m6 18 12-12"/>
          </svg>
          <span>Disable here</span>
        </button>
      </div>
      <p id="fileStatus" class="file-status" role="status" aria-live="polite" hidden></p>
    </section>
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
    folderSelect: shadow.getElementById('folderSelect'),
    wordsBank: shadow.getElementById('wordsBank'),
    wordCount: shadow.getElementById('wordCount'),
    siteToggle: shadow.getElementById('siteToggle'),
    fileStatus: shadow.getElementById('fileStatus'),
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
  let autoCloseTimer = 0;
  let emptyNoticeTimer = 0;
  let clearAnimationTimer = 0;
  let sourceCopyTimer = 0;
  let fileStatusTimer = 0;
  let bankFolders = [];
  let activeFolderId = bank ? bank.DEFAULT_FOLDER_ID : 'general';
  let bankWordCount = 0;
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
    if (panelPinned) cancelAutoClose();
    els.pin.classList.toggle('pinned', panelPinned);
    els.pin.setAttribute('aria-pressed', String(panelPinned));
    els.pin.title = panelPinned
      ? 'Unpin panel'
      : 'Pin panel — keep it open after saving or clicking outside';
    els.pin.setAttribute(
      'aria-label',
      panelPinned ? 'Unpin panel' : 'Pin panel',
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

      if (
        changes[bank ? bank.FOLDERS_KEY : 'wordFolders'] ||
        changes[bank ? bank.ACTIVE_FOLDER_KEY : 'activeFolderId']
      ) {
        loadBankFolders();
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

    cancelAutoClose();
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
    loadBankFolders();

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
    cancelAutoClose();
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

  // After a save, the unpinned panel steps out of the way like it does when
  // clicking outside. Pinning keeps it open for learners who want to keep
  // translating, and typing during the short confirmation cancels the close.
  function cancelAutoClose() {
    if (!autoCloseTimer) return;
    clearTimeout(autoCloseTimer);
    autoCloseTimer = 0;
  }

  function scheduleAutoCloseAfterSave() {
    cancelAutoClose();
    if (panelPinned) return;

    autoCloseTimer = setTimeout(() => {
      autoCloseTimer = 0;
      if (panelPinned || els.panel.hidden) return;
      if (els.input.value.trim()) return;
      closePanel();
    }, 700);
  }

  /* ---------- Language direction ---------- */

  function detectMode(text) {
    return ARABIC_RE.test(text) ? 'ar-en' : 'en-ar';
  }

  function setMode(next) {
    mode = next;
    els.direction.textContent =
      mode === 'en-ar'
        ? 'English → Arabic'
        : 'Arabic → English';
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
    cancelAutoClose();
    cancelClearAnimation();

    const text = els.input.value;
    els.clear.hidden = !text;
    els.copySource.hidden = !text;
    els.input.dir = text ? (ARABIC_RE.test(text) ? 'rtl' : 'ltr') : 'auto';
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
    els.input.dir = 'auto';
    els.clear.hidden = true;
    els.copySource.hidden = true;
    els.copySource.classList.remove('copied', 'error');
    els.copySource.title = 'Copy word';
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
      setState('error', 'Enter an Arabic or English word to translate.');
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

    setState('loading', 'Looking it up…');

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
      return 'No internet connection. Check your network and try again.';
    }

    switch (code) {
      case 'empty':
        return 'Type a word first.';
      case 'too_long':
        return 'That text is a little long. Try a word or a short phrase.';
      case 'timeout':
        return 'Translation took longer than usual. Try again.';
      case 'rate':
        return 'The service is a little busy. Wait a moment and try again.';
      default:
        return 'Could not translate right now. Try again in a moment.';
    }
  }

  function setState(state, text) {
    els.resultCard.dataset.state = state;
    els.result.textContent = text;

    if (state !== 'ready') {
      els.result.dir = 'ltr';
      els.resultCard.dataset.size = '';
      els.save.hidden = true;
      els.copy.hidden = true;
      hideSpeak();
      els.save.classList.remove('ok', 'err');
      els.save.disabled = false;
      els.saveLabel.textContent = 'Add to Hassala';
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
    els.saveLabel.textContent = 'Add to Hassala';
  }

  /* ---------- Copy ---------- */

  async function copyResult() {
    if (!lastResult) return;
    const copied = await copyText(lastResult);
    els.copy.textContent = copied ? 'Copied ✓' : 'Could not copy';
    setTimeout(() => {
      els.copy.textContent = 'Copy';
    }, 1600);
  }

  async function copySourceText() {
    const value = els.input.value.trim();
    if (!value) return;

    const copied = await copyText(value);
    clearTimeout(sourceCopyTimer);

    els.copySource.classList.remove('copied', 'error');
    els.copySource.classList.add(copied ? 'copied' : 'error');
    els.copySource.title = copied ? 'Copied ✓' : 'Could not copy';

    sourceCopyTimer = setTimeout(() => {
      els.copySource.classList.remove('copied', 'error');
      els.copySource.title = 'Copy word';
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
    els.speak.title = 'Listen';
  }

  function resetSpeakButton() {
    speaking = false;
    els.speak.classList.remove('is-speaking', 'error');
    els.speak.disabled = false;
    els.speak.title = 'Listen';
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
    els.speak.title = 'Stop audio';

    const response = await sendMessage({
      type: 'tts',
      text: lastResult,
      lang,
    });

    if (!response || !response.ok) {
      resetSpeakButton();
      els.speak.classList.add('error');
      els.speak.title = 'Audio is unavailable right now';
      setTimeout(() => {
        if (!speaking) {
          els.speak.classList.remove('error');
          els.speak.title = 'Listen';
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
      els.speak.title = 'Stop audio';
    } else {
      resetSpeakButton();
    }

    return false;
  });

  /* ---------- Hassala word bank ---------- */

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

  function bankErrorMessage(code) {
    switch (code) {
      case 'storage_full':
        return 'Storage is full. Export your words and delete some.';
      case 'word_limit':
        return 'Your word bank is at its limit. Export and delete some words.';
      default:
        return 'Could not save the word. Try again.';
    }
  }

  async function loadBankFolders() {
    if (!bank) return;

    try {
      const state = await bank.read();
      bankFolders = state.folders;
      activeFolderId = state.activeFolderId;
      bankWordCount = state.words.length;
      renderWordCount();
      renderFolderSelect();
    } catch (error) {
      setFileStatus(bankErrorMessage(error && error.code), 'error');
    }
  }

  function renderWordCount() {
    if (!els.wordCount) return;

    const wordsLabel =
      bankWordCount === 1 ? '1 word' : `${bankWordCount} words`;
    els.wordCount.textContent = String(bankWordCount);
    if (els.wordsBank) {
      els.wordsBank.title = `My words and export (${wordsLabel})`;
      els.wordsBank.setAttribute(
        'aria-label',
        `My words and export (${wordsLabel})`,
      );
    }
  }

  function renderFolderSelect() {
    const previous = els.folderSelect.value;
    els.folderSelect.replaceChildren();

    for (const folder of bankFolders) {
      const option = document.createElement('option');
      option.value = folder.id;
      option.textContent = folder.name;
      option.dir = 'auto';
      option.title = folder.name;
      els.folderSelect.append(option);
    }

    const target = bankFolders.some((folder) => folder.id === previous)
      ? previous
      : activeFolderId;

    els.folderSelect.value = bankFolders.some(
      (folder) => folder.id === target,
    )
      ? target
      : bankFolders[0]?.id || '';

    updateFolderSelectLabel();
  }

  function updateFolderSelectLabel() {
    const selected = bankFolders.find(
      (folder) => folder.id === els.folderSelect.value,
    );
    const name = selected ? selected.name : 'General';
    els.folderSelect.title = `New words go to “${name}”`;
    els.folderSelect.setAttribute('aria-label', `Word save folder: ${name}`);
  }

  async function changeActiveFolder() {
    if (!bank) return;

    const folderId = els.folderSelect.value;
    try {
      await bank.setActiveFolder(folderId);
      activeFolderId = folderId;
      updateFolderSelectLabel();
      const folder = bankFolders.find((item) => item.id === folderId);
      setFileStatus(
        `New words will be saved to “${folder ? folder.name : 'General'}”.`,
        'ok',
      );
    } catch (error) {
      setFileStatus(bankErrorMessage(error && error.code), 'error');
      await loadBankFolders();
    }
  }

  function openWordsPage() {
    sendMessage({ type: 'openOptions' }, 4000);
  }

  function resetSiteDisablePrompt() {
    siteDisableArmedUntil = 0;
    if (siteDisableTimer) {
      clearTimeout(siteDisableTimer);
      siteDisableTimer = 0;
    }
    const label = els.siteToggle && els.siteToggle.querySelector('span');
    if (label) label.textContent = 'Disable here';
  }

  function blockCurrentSite(site) {
    if (!storage || !sitePolicy) return;

    try {
      storage.get([sitePolicy.STORAGE_KEY], (data) => {
        if (readRuntimeError()) {
          setFileStatus('Could not read site settings right now. Try again.', 'error');
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
              setFileStatus('Could not save the site block. Try again.', 'error');
              return;
            }

            // Hide immediately; the storage listener would do the same.
            applySiteBlocked(true);
          },
        );
      });
    } catch {
      setFileStatus('Could not save the site block. Try again.', 'error');
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
      if (label) label.textContent = 'Sure?';
      setFileStatus(
        `Hassala will be disabled on “${site}” and its subdomains. Click again to confirm.`,
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
    els.saveLabel.textContent = 'Saving…';

    const response = await sendMessage({
      type: 'saveToHassala',
      word: query,
      translation,
      folderId: els.folderSelect.value || activeFolderId,
    });

    if (response && response.ok) {
      if (typeof response.count === 'number') {
        bankWordCount = response.count;
        renderWordCount();
      }

      const notice = response.duplicate
        ? 'Already in your word bank ✓ Type the next word'
        : 'Saved ✓ Type the next word';

      // Only clear when the field still holds the word that was saved. If the
      // user has already started the next word, leave their text alone.
      if (lastQuery === query && els.input.value.trim() === query) {
        animateResetInput({ focus: true, notice });
        scheduleAutoCloseAfterSave();
      } else {
        setFileStatus(notice, 'ok');
        els.save.disabled = false;
        els.save.classList.remove('ok', 'err');
        els.saveLabel.textContent = 'Add to Hassala';
      }
      return;
    }

    els.save.classList.add('err');
    els.saveLabel.textContent =
      response && response.code === 'storage_full'
        ? 'Storage is full'
        : response && response.code === 'word_limit'
          ? 'Word bank is full'
          : 'Could not save';

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      els.save.disabled = false;
      els.save.classList.remove('ok', 'err');
      els.saveLabel.textContent = 'Add to Hassala';
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
      closePanel();
      return;
    }

    if (target === els.input && event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      cancelDebounce();
      translateNow();
      return;
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

  els.clear.addEventListener('click', () => {
    resetInput({ focus: true });
  });

  els.copySource.addEventListener('click', copySourceText);
  els.copy.addEventListener('click', copyResult);
  els.speak.addEventListener('click', speakResult);
  els.save.addEventListener('click', saveToHassala);
  els.wordsBank.addEventListener('click', openWordsPage);
  if (els.folderSelect) {
    els.folderSelect.addEventListener('change', changeActiveFolder);
  }
  if (els.siteToggle) els.siteToggle.addEventListener('click', onSiteToggleClick);
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
