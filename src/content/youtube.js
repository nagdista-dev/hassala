'use strict';

/**
 * YouTube subtitle replacement.
 *
 * YouTube keeps rendering its own captions (they are the timing source), but
 * they are made transparent while this script shows a clickable copy in the
 * same place. Clicking any word sends it to the floating translator panel.
 */

(() => {
  const ROOT_ID = 'aet-yt-caption-root';
  const PLAYER_SELECTOR = '#movie_player, .html5-video-player';
  const CAPTION_WINDOW = '.ytp-caption-window-container';
  const CAPTION_LINE = '.caption-visual-line';
  const CAPTION_SEGMENT = '.ytp-caption-segment';
  const FLOATING_ROOT_ID = 'aet-floating-root';
  const MAX_CAPTION_LINES = 2;
  const LETTER_RE =
    /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  const sitePolicy = globalThis.__AET_SITE_POLICY__ || null;
  const SITE_HOST = location.hostname || '';
  const FONT_URL = chrome.runtime.getURL(
    'src/fonts/BalooBhaijaan2-Variable.woff2',
  );

  const CSS = `
    @font-face {
      font-family: "Baloo Bhaijaan 2";
      src: url("${FONT_URL}") format("woff2");
      font-weight: 400 800;
      font-style: normal;
      font-display: swap;
    }

    #ytCaptionBox {
      position: absolute;
      left: 50%;
      bottom: max(64px, 9%);
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      width: max-content;
      max-width: min(88%, 1100px);
      pointer-events: none;
      text-align: center;
    }

    #ytLines {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      max-width: 100%;
    }

    .yt-line {
      display: inline-block;
      max-width: 100%;
      padding: 1px 8px;
      border-radius: 5px;
      background: rgba(8, 8, 8, 0.76);
      color: #fff;
      font-family: "Baloo Bhaijaan 2", "Noto Sans Arabic", "Segoe UI", Tahoma, sans-serif;
      font-size: clamp(18px, 1.75vw, 34px);
      font-weight: 500;
      line-height: 1.45;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.95);
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      /* YouTube sets user-select: none on the player, and user-select is
         inherited through shadow DOM. Re-enable selection on the caption
         itself so a word (or a dragged phrase) can be highlighted, while
         the word spans still handle a normal click for one-word lookup. */
      pointer-events: auto;
      user-select: text;
      -webkit-user-select: text;
    }

    .yt-word {
      display: inline;
      border-radius: 4px;
      transition:
        background-color 0.12s ease,
        color 0.12s ease;
    }

    .yt-word.is-clickable {
      pointer-events: auto;
      cursor: pointer;
    }

    .yt-word.is-clickable:hover {
      background: rgba(184, 134, 47, 0.82);
      color: #fff;
      box-shadow: 0 0 0 2px rgba(184, 134, 47, 0.82);
    }

    .yt-word.is-active {
      background: #b8862f;
      color: #fff;
      box-shadow: 0 0 0 2px #b8862f;
    }

    @media (prefers-reduced-motion: reduce) {
      .yt-word {
        transition: none;
      }
    }
  `;

  const HTML = `
    <div id="ytCaptionBox">
      <div id="ytLines"></div>
    </div>
  `;

  let player = null;
  let container = null;
  let host = null;
  let shadow = null;
  let linesEl = null;
  let observer = null;
  let syncTimer = 0;
  let lastKey = null;
  let hoverPausedVideo = null;
  let clickPaused = false;
  let selectionStart = null;
  let suppressClickUntil = 0;
  let started = false;
  let attachTimer = 0;
  let siteBlockedHere = false;
  let domReadyHooked = false;

  function normalize(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isVisible(element) {
    if (!element || !element.getClientRects().length) return false;

    const style = getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.visibility !== 'collapse' &&
      parseFloat(style.opacity) !== 0
    );
  }

  function readCaptionLines() {
    if (!container || !container.isConnected) return [];

    const lines = [];

    for (const element of container.querySelectorAll(CAPTION_LINE)) {
      if (!isVisible(element)) continue;

      const text = normalize(element.textContent);
      if (text) lines.push(text);
    }

    if (!lines.length) {
      const segments = Array.from(container.querySelectorAll(CAPTION_SEGMENT))
        .filter(isVisible)
        .map((element) => normalize(element.textContent))
        .filter(Boolean);

      if (segments.length) lines.push(segments.join(' '));
    }

    const unique = lines.filter(
      (line, index) => line && line !== lines[index - 1],
    );

    // Keep the newest two lines; a third line makes the overlay too tall.
    return unique.slice(-MAX_CAPTION_LINES);
  }

  function appendWords(lineElement, text) {
    const parts = text.split(/(\s+)/);

    for (const part of parts) {
      if (!part) continue;

      if (/^\s+$/.test(part)) {
        lineElement.appendChild(document.createTextNode(' '));
        continue;
      }

      const word = document.createElement('span');
      word.className = 'yt-word';
      word.textContent = part;

      const query = part.replace(
        /^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu,
        '',
      );
      if (query && LETTER_RE.test(query)) {
        word.dataset.word = query;
        word.classList.add('is-clickable');
        word.title = `Translate: ${query}`;
      }

      lineElement.appendChild(word);
    }
  }

  function render(lines) {
    if (!linesEl) return;
    linesEl.textContent = '';

    for (const text of lines) {
      const line = document.createElement('div');
      line.className = 'yt-line';
      line.dir = 'auto';
      appendWords(line, text);
      linesEl.appendChild(line);
    }
  }

  function setNativeHidden(hidden) {
    if (!player) return;
    player.classList.toggle('aet-yt-hide-captions', Boolean(hidden));
  }

  function syncFromNative() {
    if (!player || !host || !host.isConnected) return;

    const rect = player.getBoundingClientRect();
    const tooSmall =
      rect.width < 520 ||
      rect.height < 260 ||
      player.classList.contains('ytp-player-minimized');

    const lines = tooSmall ? [] : readCaptionLines();
    const key = lines.join('\n');

    if (key !== lastKey) {
      lastKey = key;
      render(lines);
    }

    setNativeHidden(lines.length > 0);
  }

  function scheduleSync() {
    if (syncTimer) return;

    syncTimer = setTimeout(() => {
      syncTimer = 0;
      syncFromNative();
    }, 50);
  }

  function translateWord(word) {
    const api = globalThis.__AET_FLOATING_API__;
    if (!api || typeof api.translate !== 'function') return false;

    api.translate(word);
    return true;
  }

  function pauseVideo() {
    const video = player?.querySelector('video') || document.querySelector('video');
    if (!video || video.paused) return null;

    try {
      video.pause();
      return video;
    } catch {
      // The player may be between videos.
      return null;
    }
  }

  function resumeHoverPause() {
    const video = hoverPausedVideo;
    hoverPausedVideo = null;

    if (!video || clickPaused) return;

    try {
      const played = video.play();
      if (played && typeof played.catch === 'function') {
        played.catch(() => {});
      }
    } catch {
      // The browser may block playback; the user can press play.
    }
  }

  function onWordHover(event) {
    const wordElement = event.target.closest?.('.yt-word.is-clickable');
    if (!wordElement || !linesEl.contains(wordElement)) return;
    if (clickPaused || hoverPausedVideo) return;

    // Hovering freezes the subtitle so it can be read. Leaving the subtitle
    // resumes playback, unless a word was clicked.
    hoverPausedVideo = pauseVideo();
  }

  function onLinesLeave(event) {
    if (event.relatedTarget && linesEl.contains(event.relatedTarget)) return;
    resumeHoverPause();
  }

  function onVideoPlay(event) {
    if (!(event.target instanceof HTMLMediaElement)) return;

    // Any real playback means the user (or YouTube) resumed on purpose, so
    // the next hover should be allowed to pause again.
    if (hoverPausedVideo === event.target) hoverPausedVideo = null;
    clickPaused = false;
  }

  function selectedCaptionText() {
    if (!shadow || typeof shadow.getSelection !== 'function') return '';

    try {
      const selection = shadow.getSelection();
      return selection ? normalize(selection.toString()) : '';
    } catch {
      return '';
    }
  }

  function onSelectionStart(event) {
    if (event.button !== 0) return;
    if (!event.target.closest?.('.yt-word, .yt-line')) return;
    selectionStart = { x: event.clientX, y: event.clientY };
  }

  function onSelectionEnd(event) {
    if (!selectionStart) return;

    const start = selectionStart;
    selectionStart = null;

    const distance = Math.hypot(
      event.clientX - start.x,
      event.clientY - start.y,
    );
    if (distance < 5) return;

    // The selection lives inside this shadow root, so window.getSelection()
    // cannot see it. Read the shadow selection directly and translate the
    // highlighted word or phrase when the mouse is released.
    const text = selectedCaptionText();
    if (!text || !LETTER_RE.test(text)) return;

    suppressClickUntil = Date.now() + 400;
    clickPaused = true;
    hoverPausedVideo = null;
    pauseVideo();
    translateWord(text);
  }

  function onWordClick(event) {
    const wordElement = event.target.closest?.('.yt-word.is-clickable');
    if (!wordElement || !linesEl.contains(wordElement)) return;

    // A drag selection already translated the highlighted phrase on pointerup.
    if (Date.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const word = wordElement.dataset.word;
    if (!word || !document.getElementById(FLOATING_ROOT_ID)) return;

    // Looking up a word freezes the video for good: moving the mouse away
    // must not resume it. Only the user (or YouTube) starts playback again.
    clickPaused = true;
    hoverPausedVideo = null;
    pauseVideo();

    if (!translateWord(word)) return;

    wordElement.classList.add('is-active');
    setTimeout(() => wordElement.classList.remove('is-active'), 900);
  }

  function bindEvents() {
    linesEl.addEventListener('click', onWordClick);
    linesEl.addEventListener('pointerdown', onSelectionStart);
    linesEl.addEventListener('pointerover', onWordHover);
    linesEl.addEventListener('pointerleave', onLinesLeave);
    player.addEventListener('play', onVideoPlay, true);

    // Clicks on the subtitle band must never toggle playback or the controls.
    for (const type of ['pointerdown', 'mousedown', 'click', 'dblclick', 'wheel']) {
      host.addEventListener(type, (event) => event.stopPropagation(), {
        passive: type === 'wheel',
      });
    }
  }

  function createHost() {
    if (!player) return;

    document.querySelectorAll(`#${ROOT_ID}`).forEach((element) => element.remove());

    host = document.createElement('div');
    host.id = ROOT_ID;
    host.style.cssText =
      'position:absolute;inset:0;z-index:58;pointer-events:none;display:block;';
    player.appendChild(host);

    shadow = host.attachShadow({ mode: 'open' });
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

    linesEl = shadow.getElementById('ytLines');
    bindEvents();
  }

  function detach() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = 0;
    }

    setNativeHidden(false);

    if (host) host.remove();

    host = null;
    shadow = null;
    linesEl = null;
    container = null;
    player = null;
    lastKey = null;
    hoverPausedVideo = null;
    clickPaused = false;
    selectionStart = null;
    suppressClickUntil = 0;
  }

  function attach() {
    const nextPlayer =
      document.querySelector('#movie_player') ||
      document.querySelector(PLAYER_SELECTOR);

    if (!nextPlayer) {
      detach();
      return;
    }

    if (nextPlayer !== player) {
      detach();
      player = nextPlayer;
      createHost();
    } else if (!host || !host.isConnected) {
      createHost();
    }

    const nextContainer = player.querySelector(CAPTION_WINDOW);
    if (nextContainer !== container) {
      if (observer) {
        observer.disconnect();
        observer = null;
      }

      container = nextContainer;
      lastKey = null;

      if (container) {
        observer = new MutationObserver(scheduleSync);
        observer.observe(container, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }

      scheduleSync();
    }
  }

  function onNavigateFinish() {
    hoverPausedVideo = null;
    clickPaused = false;
    attach();
    scheduleSync();
  }

  function onViewportChange() {
    scheduleSync();
  }

  function start() {
    if (started || siteBlockedHere) return;

    started = true;
    attach();
    attachTimer = setInterval(attach, 1000);

    // Pointerup can happen outside the caption band, so listen at document
    // level once. The handler only runs after a pointerdown inside the band.
    document.addEventListener('pointerup', onSelectionEnd, true);
    document.addEventListener('yt-navigate-finish', onNavigateFinish);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('fullscreenchange', onViewportChange);
  }

  function stop() {
    if (!started) {
      detach();
      return;
    }

    started = false;

    if (attachTimer) {
      clearInterval(attachTimer);
      attachTimer = 0;
    }

    document.removeEventListener('pointerup', onSelectionEnd, true);
    document.removeEventListener('yt-navigate-finish', onNavigateFinish);
    window.removeEventListener('resize', onViewportChange);
    window.removeEventListener('fullscreenchange', onViewportChange);
    detach();
  }

  function startWhenReady() {
    if (document.readyState === 'loading') {
      if (domReadyHooked) return;
      domReadyHooked = true;
      document.addEventListener(
        'DOMContentLoaded',
        () => {
          domReadyHooked = false;
          start();
        },
        { once: true },
      );
      return;
    }

    start();
  }

  function applyList(list) {
    siteBlockedHere = sitePolicy
      ? sitePolicy.isBlockedHost(SITE_HOST, list)
      : false;

    if (siteBlockedHere) {
      stop();
      return;
    }

    startWhenReady();
  }

  if (sitePolicy) {
    sitePolicy.readBlockedSites(applyList);
    sitePolicy.watchBlockedSites(applyList);
  } else {
    applyList([]);
  }
})();
