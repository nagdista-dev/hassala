'use strict';

importScripts('content/site-policy.js', 'wordbank.js');

/**
 * Service worker: fetches translations, opens the in-page translator, and keeps
 * saved words in the extension's local storage. It never writes to the user's
 * filesystem; exports are downloaded only when the user asks for them.
 *
 * Translation providers, in order:
 *   1. Google's lightweight dictionary endpoint (fast, no key).
 *   2. MyMemory (fallback, no key).
 */

const TIMEOUT_MS = 8000;
const TRANSLATE_TIMEOUT_MS = 4500;
const MAX_TEXT_LENGTH = 200;
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_LIMIT = 400;

const translationCache = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return false;
  // Only this extension's own pages and content scripts may use the bridge.
  // Websites cannot call chrome.runtime.sendMessage, but this keeps the
  // boundary explicit if another extension or future surface is added.
  if (!sender || sender.id !== chrome.runtime.id) return false;

  if (message.type === 'translate') {
    handleTranslate(message)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, code: 'failed' }));
    return true;
  }

  if (message.type === 'saveToHassala') {
    saveToHassala(message)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, code: 'failed' }));
    return true;
  }

  if (message.type === 'openOptions') {
    openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'tts') {
    handleTts(message)
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false, code: 'tts_failed' }));
    return true;
  }

  if (message.type === 'stopTts') {
    stopTts()
      .then(sendResponse)
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // The floating panel announces itself; nothing to do.
  return false;
});

/* ---------- Toolbar button ---------- */

chrome.action.onClicked.addListener((tab) => {
  openTranslator(tab).catch(() => {});
});

async function openTranslator(tab) {
  if (!tab || typeof tab.id !== 'number' || !isScriptable(tab.url)) {
    flashUnavailable(tab, 'This page does not allow translation — try a regular web page');
    return;
  }

  if (await isTabBlocked(tab.url)) {
    flashUnavailable(
      tab,
      'Hassala is disabled on this site — you can re-enable it in Settings',
    );
    return;
  }

  let injected = false;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await sendTabMessage(tab.id, {
        type: 'toggleFloatingPanel',
      });
      if (response && response.ok) return;
      if (response && response.code === 'site_blocked') {
        flashUnavailable(
          tab,
          'Hassala is disabled on this site — you can re-enable it in Settings',
        );
        return;
      }
    } catch {
      // The content script may be missing or orphaned after an extension
      // reload. Inject one fresh copy, then keep retrying the normal message
      // path. No page-visible DOM event is used.
      if (!injected) {
        injected = true;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'src/content/keyboard-guard.js',
              'src/content/site-policy.js',
              'src/wordbank.js',
              'src/content/floating.js',
            ],
          });
        } catch {
          // The page may forbid injection.
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  flashUnavailable(
    tab,
    'Reload the page once (F5) to make Hassala work',
  );
}

function isScriptable(url) {
  return typeof url === 'string' && /^(https?|file):/i.test(url);
}

function isTabBlocked(url) {
  const policy = globalThis.__AET_SITE_POLICY__;
  if (!policy || typeof url !== 'string') return Promise.resolve(false);

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    return Promise.resolve(false);
  }

  if (!hostname) return Promise.resolve(false);

  return new Promise((resolve) => {
    policy.readBlockedSites((list) => {
      resolve(policy.isBlockedHost(hostname, list));
    });
  });
}

function flashUnavailable(tab, message) {
  chrome.action.setBadgeBackgroundColor({ color: '#a32a1a' });
  chrome.action.setBadgeText({ text: '!' });
  setActionTitle(
    tab,
    message || 'This page does not allow translation — try a regular web page',
  );

  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
    setActionTitle(tab, 'Hassala');
  }, 2200);
}

function setActionTitle(tab, title) {
  if (tab && typeof tab.id === 'number') {
    chrome.action.setTitle({ tabId: tab.id, title });
  } else {
    chrome.action.setTitle({ title });
  }
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/* ---------- Translation ---------- */

async function handleTranslate({ text, from, to }) {
  const query = String(text ?? '').replace(/\s+/g, ' ').trim();

  if (!query) return { ok: false, code: 'empty' };
  if (query.length > MAX_TEXT_LENGTH) return { ok: false, code: 'too_long' };
  if (from !== 'ar' && from !== 'en') return { ok: false, code: 'failed' };
  if (to !== (from === 'ar' ? 'en' : 'ar')) return { ok: false, code: 'failed' };

  const key = `${from}:${to}:${query.toLowerCase()}`;
  const cached = readCache(key);
  if (cached) {
    return { ok: true, text: cached.text, provider: cached.provider, cached: true };
  }

  const result = await translateQuery(query, from, to);
  if (!result) return { ok: false, code: 'failed' };

  writeCache(key, result);
  return { ok: true, text: result.text, provider: result.provider };
}

async function translateQuery(text, from, to) {
  // The two Google endpoints are asked at the same time. The first valid
  // answer wins, so a single slow endpoint cannot stall the whole request.
  const google = await firstValidTranslation(
    [
      googleSingleTranslate(text, from, to),
      googleDictTranslate(text, from, to),
    ],
    text,
    to,
  );

  if (google) return { text: google, provider: 'Google' };

  try {
    const fallback = await myMemoryTranslate(text, from, to);
    if (isValidTranslation(fallback, text, to)) {
      return { text: fallback.trim(), provider: 'MyMemory' };
    }
  } catch {
    // No usable provider.
  }

  return null;
}

function firstValidTranslation(promises, source, to) {
  return new Promise((resolve) => {
    let remaining = promises.length;
    let done = false;

    if (remaining === 0) {
      resolve('');
      return;
    }

    for (const promise of promises) {
      Promise.resolve(promise)
        .then((value) => {
          remaining -= 1;

          if (!done && isValidTranslation(value, source, to)) {
            done = true;
            resolve(value.trim());
            return;
          }

          if (remaining === 0 && !done) {
            done = true;
            resolve('');
          }
        })
        .catch(() => {
          remaining -= 1;
          if (remaining === 0 && !done) {
            done = true;
            resolve('');
          }
        });
    }
  });
}

async function googleSingleTranslate(text, from, to) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', from);
  url.searchParams.set('tl', to);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  const data = await requestJson(url.toString(), TRANSLATE_TIMEOUT_MS);
  if (!Array.isArray(data?.[0])) return '';

  return data[0]
    .map((part) => (Array.isArray(part) && typeof part[0] === 'string' ? part[0] : ''))
    .join('')
    .trim();
}

async function googleDictTranslate(text, from, to) {
  const url = new URL('https://clients5.google.com/translate_a/t');
  url.searchParams.set('client', 'dict-chrome-ex');
  url.searchParams.set('sl', from);
  url.searchParams.set('tl', to);
  url.searchParams.set('q', text);

  const data = await requestJson(url.toString(), TRANSLATE_TIMEOUT_MS);
  return extractGoogleText(data);
}

function extractGoogleText(data) {
  if (typeof data === 'string') return data.trim();
  if (!Array.isArray(data) || data.length === 0) return '';

  // With an explicit source language the payload is ["translation"].
  // With auto-detection it can be [["translation", "detected-lang"]].
  if (Array.isArray(data[0])) return extractGoogleText(data[0]);

  return typeof data[0] === 'string' ? data[0].trim() : '';
}

async function myMemoryTranslate(text, from, to) {
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', text);
  url.searchParams.set('langpair', `${from}|${to}`);

  const data = await requestJson(url.toString(), TRANSLATE_TIMEOUT_MS);
  if (!data || data.responseStatus !== 200) return '';

  const raw = data.responseData?.translatedText;
  if (typeof raw !== 'string') return '';

  return decodeEntities(raw).trim();
}

function isValidTranslation(value, source, to) {
  if (typeof value !== 'string') return false;

  const text = value.replace(/\s+/g, ' ').trim();
  if (!text || text.length > 1200) return false;
  if (/<\s*\/?\s*[a-z][^>]*>/i.test(text)) return false;
  if (/MYMEMORY WARNING|TOO MANY REQUESTS|REQUEST LIMIT/i.test(text)) return false;

  const normalize = (input) =>
    input
      .toLowerCase()
      .replace(/[\u0640\u064b-\u065f\u0670]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, '');

  // Google sometimes echoes the query instead of translating it. Treat that
  // as a failed attempt so the other provider gets a chance.
  if (normalize(text) === normalize(source)) return false;

  // A translation must at least keep some letters/numbers. Punctuation-only
  // responses are never useful.
  if (!/[\p{L}\p{N}]/u.test(text)) return false;

  return text;
}

function readCache(key) {
  const entry = translationCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    translationCache.delete(key);
    return null;
  }

  return entry;
}

function writeCache(key, result) {
  translationCache.set(key, {
    text: result.text,
    provider: result.provider,
    savedAt: Date.now(),
  });

  while (translationCache.size > CACHE_LIMIT) {
    translationCache.delete(translationCache.keys().next().value);
  }
}

async function requestJson(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const isHex = code[1]?.toLowerCase() === 'x';
      const number = parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(number)) {
        try {
          return String.fromCodePoint(number);
        } catch {
          return match;
        }
      }
      return match;
    }

    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

/* ---------- Hassala ---------- */

async function saveToHassala({ word, translation, folderId }) {
  const bank = globalThis.HassalaWordBank;
  if (!bank) return { ok: false, code: 'storage_error' };

  const cleanWord = bank.normalizeField(word);
  const cleanTranslation = bank.normalizeField(translation);

  if (!cleanWord || !cleanTranslation) {
    return { ok: false, code: 'empty' };
  }

  try {
    const result = await bank.add({
      word: cleanWord,
      translation: cleanTranslation,
      folderId: typeof folderId === 'string' ? folderId : '',
    });

    if (!result.ok) return result;

    return {
      ok: true,
      duplicate: Boolean(result.duplicate),
      count: result.count,
      folderId: result.folderId,
      id: result.entry?.id || '',
    };
  } catch (error) {
    console.warn('Hassala storage:', error);
    return {
      ok: false,
      code: error?.code === 'storage_full' ? 'storage_full' : 'storage_error',
    };
  }
}

function openOptionsPage() {
  try {
    chrome.runtime.openOptionsPage(() => void chrome.runtime.lastError);
  } catch {
    // The options page is best-effort.
  }
}

function normalizeField(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

/* ---------- Pronunciation ---------- */

const TTS_ENDPOINTS = [
  'https://translate.googleapis.com/translate_tts',
  'https://translate.google.com/translate_tts',
];
const TTS_CACHE_LIMIT = 60;
const ttsCache = new Map();
let offscreenCreation = null;

async function handleTts({ text, lang }) {
  const cleanText = normalizeField(text);

  if (!cleanText) return { ok: false, code: 'empty' };
  if (lang !== 'ar' && lang !== 'en') return { ok: false, code: 'invalid_lang' };
  if (!chrome.offscreen) return { ok: false, code: 'tts_unavailable' };

  try {
    const audio = await fetchTtsAudio(cleanText, lang);
    await ensureOffscreen();

    const response = await sendOffscreen({
      target: 'offscreen',
      type: 'play',
      audio: audio.base64,
      mime: audio.mime,
    });

    if (!response || response.ok !== true) {
      return { ok: false, code: 'tts_failed' };
    }

    return { ok: true };
  } catch (error) {
    console.warn('TTS failed:', error);
    return { ok: false, code: 'tts_failed' };
  }
}

async function stopTts() {
  if (!chrome.offscreen) return { ok: true };

  try {
    const url = chrome.runtime.getURL('src/offscreen/offscreen.html');
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [url],
    });

    if (!contexts.length) return { ok: true };

    await sendOffscreen({ target: 'offscreen', type: 'stop' });
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

async function fetchTtsAudio(text, lang) {
  const key = `${lang}:${text.toLowerCase()}`;
  const cached = ttsCache.get(key);
  if (cached) return cached;

  let lastError = null;

  for (const endpoint of TTS_ENDPOINTS) {
    try {
      const url = new URL(endpoint);
      url.searchParams.set('ie', 'UTF-8');
      url.searchParams.set('client', 'tw-ob');
      url.searchParams.set('tl', lang);
      url.searchParams.set('q', text);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      let response;
      let buffer;
      try {
        response = await fetch(url.toString(), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        buffer = await response.arrayBuffer();
      } finally {
        clearTimeout(timer);
      }

      if (buffer.byteLength < 500) throw new Error('empty audio');

      const audio = {
        base64: arrayBufferToBase64(buffer),
        mime: response.headers.get('content-type') || 'audio/mpeg',
      };

      ttsCache.set(key, audio);
      if (ttsCache.size > TTS_CACHE_LIMIT) {
        ttsCache.delete(ttsCache.keys().next().value);
      }

      return audio;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('TTS request failed');
}

async function ensureOffscreen() {
  if (!chrome.offscreen) throw new Error('Offscreen API unavailable');

  const url = chrome.runtime.getURL('src/offscreen/offscreen.html');

  if (chrome.runtime.getContexts) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [url],
    });
    if (contexts.length) return;
  }

  if (!offscreenCreation) {
    offscreenCreation = chrome.offscreen
      .createDocument({
        url: 'src/offscreen/offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Play pronunciation audio for translated words',
      })
      .catch((error) => {
        if (!/single offscreen|already exists/i.test(String(error))) {
          throw error;
        }
      })
      .finally(() => {
        offscreenCreation = null;
      });
  }

  await offscreenCreation;
}

function sendOffscreen(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      resolve({ ok: false, error: String(error) });
    }
  });
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(index, index + chunkSize),
    );
  }

  return btoa(binary);
}
