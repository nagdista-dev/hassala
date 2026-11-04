'use strict';

const bank = window.HassalaWordBank || null;

const els = {
  input: document.getElementById('input'),
  settings: document.getElementById('settings'),
  clear: document.getElementById('clear'),
  copySource: document.getElementById('copySource'),
  copy: document.getElementById('copy'),
  copyLabel: document.getElementById('copyLabel'),
  provider: document.getElementById('provider'),
  result: document.getElementById('result'),
  resultCard: document.getElementById('resultCard'),
  saveDock: document.getElementById('saveDock'),
  saveHassala: document.getElementById('saveHassala'),
  saveLabel: document.getElementById('saveLabel'),
  folderSelect: document.getElementById('folderSelect'),
  newFolderQuick: document.getElementById('newFolderQuick'),
  myWords: document.getElementById('myWords'),
  wordCount: document.getElementById('wordCount'),
  fileStatus: document.getElementById('fileStatus'),
  speak: document.getElementById('speak'),
  speakLabel: document.getElementById('speakLabel'),
  direction: document.getElementById('direction'),
  historySection: document.getElementById('historySection'),
  history: document.getElementById('history'),
  clearHistory: document.getElementById('clearHistory'),
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LETTER_RE = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EMPTY_MESSAGE = 'Type a word to see its meaning.';
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 350;
const CLEAR_ANIMATION_MS = 300;

const storage =
  typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.local : null;

let mode = 'en-ar';
let requestSeq = 0;
let debounceTimer = 0;
let composing = false;
let lastResult = '';
let lastQuery = '';
let copyTimer = 0;
let sourceCopyTimer = 0;
let saveTimer = 0;
let emptyNoticeTimer = 0;
let clearAnimationTimer = 0;
let fileStatusTimer = 0;
let speaking = false;
let history = [];
let bankState = {
  words: [],
  folders: [],
  activeFolderId: bank ? bank.DEFAULT_FOLDER_ID : 'general',
};
const cache = new Map();

/* ---------- Setup ---------- */

init();

async function init() {
  bindEvents();
  await restoreState();
  await refreshBank(true);
  setMode(mode);
  renderHistory();
  showEmpty();
  els.input.focus();
}

function bindEvents() {
  els.input.addEventListener('input', onInput);
  els.input.addEventListener('keydown', onInputKeydown);
  els.input.addEventListener('compositionstart', () => {
    composing = true;
  });
  els.input.addEventListener('compositionend', () => {
    composing = false;
    onInput();
  });
  els.clear.addEventListener('click', () => clearInput(true));
  els.copySource.addEventListener('click', copySourceText);
  els.copy.addEventListener('click', copyResult);
  els.speak.addEventListener('click', speakResult);
  els.saveHassala.addEventListener('click', saveToHassala);
  els.myWords.addEventListener('click', openWordsPage);
  els.folderSelect.addEventListener('change', changeActiveFolder);
  els.newFolderQuick.addEventListener('click', createFolderQuick);
  els.settings.addEventListener('click', openOptions);
  els.clearHistory.addEventListener('click', clearHistory);
}

async function restoreState() {
  if (!storage) return;

  try {
    const data = await storage.get(['history', 'mode']);

    if (data.mode === 'ar-en' || data.mode === 'en-ar') {
      mode = data.mode;
    }

    if (Array.isArray(data.history)) {
      history = data.history.filter(isValidEntry).slice(0, MAX_HISTORY);
    }
  } catch {
    // Storage is a nice-to-have; never break the popup over it.
  }
}

/* ---------- Language direction ---------- */

function detectMode(text) {
  return ARABIC_RE.test(text) ? 'ar-en' : 'en-ar';
}

function setMode(next) {
  mode = next;

  const isEnglishToArabic = mode === 'en-ar';
  els.direction.dataset.mode = mode;
  els.direction.setAttribute(
    'aria-label',
    isEnglishToArabic ? 'English to Arabic' : 'Arabic to English',
  );

  saveMode();
}

function saveMode() {
  if (!storage) return;
  storage.set({ mode }).catch(() => {});
}

/* ---------- Input ---------- */

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
    showEmpty();
    return;
  }

  const detected = detectMode(text);
  if (detected !== mode) setMode(detected);

  cancelDebounce();
  debounceTimer = setTimeout(translateCurrent, DEBOUNCE_MS);
}

function onInputKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    cancelDebounce();
    translateCurrent();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    clearInput(true);
  }
}

function cancelDebounce() {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = 0;
  }
}

function autoGrowInput() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight + 2, 180)}px`;
}

function resultSize(text) {
  if (text.length > 140) return 'huge';
  if (text.length > 90) return 'xlong';
  if (text.length > 45) return 'long';
  return '';
}

function cancelClearAnimation() {
  if (!clearAnimationTimer) return;
  clearTimeout(clearAnimationTimer);
  clearAnimationTimer = 0;
  document.body.classList.remove('is-clearing');
}

// Lets the old word and result fade away before the real reset. Typing during
// the short beat cancels the animation and keeps whatever the user typed.
function animateClearInput(notice) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    clearInput(true, notice);
    return;
  }

  clearTimeout(clearAnimationTimer);
  document.body.classList.remove('is-clearing');
  void document.body.offsetWidth; // restart the transition from a clean state
  document.body.classList.add('is-clearing');

  clearAnimationTimer = setTimeout(() => {
    clearAnimationTimer = 0;
    document.body.classList.remove('is-clearing');
    clearInput(true, notice);
  }, CLEAR_ANIMATION_MS);
}

function clearInput(focus, notice = '') {
  cancelClearAnimation();
  cancelDebounce();
  requestSeq++;
  clearTimeout(saveTimer);
  clearTimeout(emptyNoticeTimer);

  els.input.value = '';
  els.input.style.height = '';
  els.input.dir = 'ltr';
  els.clear.hidden = true;
  els.copySource.hidden = true;
  els.copySource.classList.remove('copied', 'is-error');
  els.copySource.title = 'Copy word';
  lastResult = '';
  lastQuery = '';
  showEmpty(notice || EMPTY_MESSAGE);

  if (notice) {
    emptyNoticeTimer = setTimeout(() => {
      if (
        !els.input.value.trim() &&
        !lastQuery &&
        els.resultCard.dataset.state === 'empty'
      ) {
        els.result.textContent = EMPTY_MESSAGE;
      }
    }, 3200);
  }

  if (focus) els.input.focus();
}

/* ---------- Translation ---------- */

async function translateCurrent() {
  const text = els.input.value.trim();
  cancelDebounce();
  const seq = ++requestSeq;

  if (!text) {
    lastResult = '';
    lastQuery = '';
    showEmpty();
    els.input.focus();
    return;
  }

  if (!LETTER_RE.test(text)) {
    lastResult = '';
    lastQuery = '';
    showError('Enter an Arabic or English word to translate.');
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
    showResult(cached.text, cached.provider);
    remember({ text, result: cached.text, mode });
    return;
  }

  setLoading();

  const response = await sendMessage({ type: 'translate', text, from, to });

  if (seq !== requestSeq) return;

  if (response && response.ok && response.text) {
    lastResult = response.text;
    cache.set(key, { text: response.text, provider: response.provider });
    if (cache.size > 120) cache.delete(cache.keys().next().value);

    showResult(response.text, response.provider);
    remember({ text, result: response.text, mode });
  } else {
    lastResult = '';
    lastQuery = '';
    showError(errorMessage(response && response.code));
  }
}

function sendMessage(payload, timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({ ok: false, code: 'failed' });
      return;
    }

    let settled = false;
    const finish = (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    };
    const timer = setTimeout(() => finish({ ok: false, code: 'timeout' }), timeoutMs);

    try {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          finish({ ok: false, code: 'failed' });
        } else {
          finish(response);
        }
      });
    } catch {
      finish({ ok: false, code: 'failed' });
    }
  });
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

/* ---------- Card states ---------- */

function setCardState(state) {
  els.resultCard.dataset.state = state;
}

function showEmpty(message = EMPTY_MESSAGE) {
  clearTimeout(emptyNoticeTimer);
  els.resultCard.classList.remove('is-loading');
  setCardState('empty');
  els.result.textContent = message;
  els.result.dir = 'ltr';
  els.result.dataset.size = '';
  els.result.classList.remove('pop');
  els.copy.hidden = true;
  els.provider.hidden = true;
  els.provider.textContent = '';
  hideSave();
  hideSpeak();
}

function setLoading() {
  hideSave();
  hideSpeak();
  els.resultCard.classList.remove('is-loading');

  setCardState('loading');
  els.result.textContent = 'Looking it up…';
  els.result.dir = 'ltr';
  els.result.dataset.size = '';
  els.result.classList.remove('pop');
  els.copy.hidden = true;
  els.provider.hidden = true;
  els.provider.textContent = '';
}

function showResult(text, provider) {
  els.resultCard.classList.remove('is-loading');
  setCardState('ready');
  els.result.textContent = text;
  els.result.lang = mode === 'en-ar' ? 'ar' : 'en';
  els.result.dir = mode === 'en-ar' ? 'rtl' : 'ltr';
  els.result.dataset.size = resultSize(text);
  els.result.classList.remove('pop');
  void els.result.offsetWidth; // restart the entrance animation
  els.result.classList.add('pop');

  els.provider.textContent = provider || '';
  els.provider.hidden = !provider;
  els.copy.hidden = false;
  els.copyLabel.textContent = 'Copy';
  els.copy.classList.remove('copied');

  els.saveDock.hidden = false;
  els.saveHassala.hidden = false;
  resetSaveButton();
  els.speak.hidden = false;
  resetSpeakButton();
}

function showError(message) {
  els.resultCard.classList.remove('is-loading');
  setCardState('error');
  els.result.textContent = message;
  els.result.dir = 'ltr';
  els.result.dataset.size = '';
  els.result.classList.remove('pop');
  els.copy.hidden = true;
  els.provider.hidden = true;
  els.provider.textContent = '';
  hideSave();
  hideSpeak();
}

function hideSave() {
  clearTimeout(saveTimer);
  els.saveDock.hidden = true;
  els.saveHassala.hidden = true;
  els.saveHassala.disabled = false;
  els.saveHassala.classList.remove('is-saved', 'is-error');
  els.saveLabel.textContent = 'Add to Hassala';
}

function resetSaveButton() {
  clearTimeout(saveTimer);
  els.saveHassala.disabled = false;
  els.saveHassala.classList.remove('is-saved', 'is-error');
  els.saveLabel.textContent = 'Add to Hassala';
}

function hideSpeak() {
  stopSpeaking();
  els.speak.hidden = true;
  els.speak.classList.remove('is-speaking', 'is-error');
  els.speak.disabled = false;
  els.speakLabel.textContent = 'Listen';
}

function resetSpeakButton() {
  speaking = false;
  els.speak.classList.remove('is-speaking', 'is-error');
  els.speak.disabled = false;
  els.speakLabel.textContent = 'Listen';
}

/* ---------- Copy ---------- */

async function copyResult() {
  if (!lastResult) return;

  const copied = await copyText(lastResult);
  if (!copied) {
    flashCopy('Could not copy');
    return;
  }

  flashCopy('Copied ✓');
}

async function copySourceText() {
  const value = els.input.value.trim();
  if (!value) return;

  const copied = await copyText(value);
  clearTimeout(sourceCopyTimer);

  els.copySource.classList.remove('copied', 'is-error');
  els.copySource.classList.add(copied ? 'copied' : 'is-error');
  els.copySource.title = copied ? 'Copied ✓' : 'Could not copy';

  sourceCopyTimer = setTimeout(() => {
    els.copySource.classList.remove('copied', 'is-error');
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
      document.body.appendChild(helper);
      helper.select();
      const ok = document.execCommand('copy');
      helper.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function flashCopy(label) {
  clearTimeout(copyTimer);

  els.copyLabel.textContent = label;
  els.copy.classList.add('copied');

  copyTimer = setTimeout(() => {
    els.copyLabel.textContent = 'Copy';
    els.copy.classList.remove('copied');
  }, 1600);
}

/* ---------- Pronunciation ---------- */

async function speakResult() {
  if (!lastResult) return;

  if (speaking) {
    stopSpeaking();
    return;
  }

  const lang = mode === 'en-ar' ? 'ar' : 'en';
  speaking = true;
  els.speak.classList.remove('is-error');
  els.speak.classList.add('is-speaking');
  els.speakLabel.textContent = 'Stop';

  const response = await sendMessage({
    type: 'tts',
    text: lastResult,
    lang,
  });

  if (!response || !response.ok) {
    resetSpeakButton();
    els.speak.classList.add('is-error');
    els.speakLabel.textContent = 'Audio unavailable';
    setTimeout(() => {
      if (!speaking) {
        els.speak.classList.remove('is-error');
        els.speakLabel.textContent = 'Listen';
      }
    }, 2200);
  }
}

function stopSpeaking() {
  if (!speaking) return;
  resetSpeakButton();
  sendMessage({ type: 'stopTts' });
}

chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'ttsState') return false;

  if (message.playing) {
    speaking = true;
    els.speak.hidden = false;
    els.speak.classList.remove('is-error');
    els.speak.classList.add('is-speaking');
    els.speakLabel.textContent = 'Stop';
  } else {
    resetSpeakButton();
  }

  return false;
});

window.addEventListener('pagehide', () => {
  if (speaking) sendMessage({ type: 'stopTts' });
});

/* ---------- Save to Hassala ---------- */

function openOptions() {
  try {
    chrome.runtime.openOptionsPage(() => window.close());
  } catch {
    window.close();
  }
}

async function saveToHassala() {
  if (!lastResult || !lastQuery || els.saveHassala.disabled) return;

  const query = lastQuery;
  const translation = lastResult;

  clearTimeout(saveTimer);
  els.saveHassala.disabled = true;
  els.saveHassala.classList.remove('is-saved', 'is-error');
  els.saveLabel.textContent = 'Saving…';

  const response = await sendMessage({
    type: 'saveToHassala',
    word: query,
    translation,
    folderId: els.folderSelect.value || bankState.activeFolderId,
  });

  if (response && response.ok) {
    if (typeof response.count === 'number') {
      renderWordCount(response.count);
    } else {
      refreshBank(true);
    }

    const notice = response.duplicate
      ? 'Already in your word bank ✓ Type the next word'
      : 'Saved ✓ Type the next word';

    // Only clear when the field still holds the word that was saved. If the
    // user has already started the next word, leave their text alone.
    if (lastQuery === query && els.input.value.trim() === query) {
      animateClearInput(notice);
    } else {
      setFileStatus(notice, 'ok');
      resetSaveButton();
    }
    return;
  }

  els.saveHassala.classList.add('is-error');
  els.saveLabel.textContent = saveErrorMessage(response && response.code);

  saveTimer = setTimeout(resetSaveButton, 2400);
}

function saveErrorMessage(code) {
  switch (code) {
    case 'storage_full':
      return 'Storage is full — export and delete some words';
    case 'word_limit':
      return 'Your word bank is at its limit';
    case 'invalid':
      return 'The word is incomplete';
    default:
      return 'Could not save';
  }
}

/* ---------- Word bank & folders ---------- */

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
    case 'invalid_name':
      return 'Enter a valid folder name.';
    case 'duplicate_name':
      return 'A folder with that name already exists.';
    case 'folder_limit':
      return 'You reached the maximum number of folders.';
    case 'storage_full':
      return 'Storage is full. Export your words and delete some.';
    default:
      return 'Could not save the change. Try again.';
  }
}

async function refreshBank(quiet = false) {
  if (!bank) return;

  try {
    bankState = await bank.read();
  } catch (error) {
    if (!quiet) setFileStatus(bankErrorMessage(error && error.code), 'error');
    return;
  }

  renderFolderOptions();
  renderWordCount(bankState.words.length);
}

function renderWordCount(count) {
  const total = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const wordsLabel = total === 1 ? '1 word' : `${total} words`;

  els.wordCount.textContent = String(total);
  els.myWords.title = `My words and export (${wordsLabel})`;
  els.myWords.setAttribute(
    'aria-label',
    `My words and export (${wordsLabel})`,
  );
}

function renderFolderOptions() {
  const previous = els.folderSelect.value;
  els.folderSelect.replaceChildren();

  for (const folder of bankState.folders) {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    els.folderSelect.append(option);
  }

  const target = bankState.folders.some(
    (folder) => folder.id === previous,
  )
    ? previous
    : bankState.activeFolderId;

  els.folderSelect.value = bankState.folders.some(
    (folder) => folder.id === target,
  )
    ? target
    : bankState.folders[0]?.id || '';
}

async function changeActiveFolder() {
  if (!bank) return;

  const folderId = els.folderSelect.value;
  try {
    await bank.setActiveFolder(folderId);
    bankState.activeFolderId = folderId;
    const folder = bankState.folders.find((item) => item.id === folderId);
    setFileStatus(
      `New words will be saved to “${folder ? folder.name : 'General'}”.`,
      'ok',
    );
  } catch (error) {
    setFileStatus(bankErrorMessage(error && error.code), 'error');
    await refreshBank(true);
  }
}

async function createFolderQuick() {
  if (!bank) return;

  const name = window.prompt('New folder name:');
  if (name === null) return;

  const clean = name.trim();
  if (!clean) {
    setFileStatus('Enter a valid folder name.', 'error');
    return;
  }

  try {
    const result = await bank.createFolder(clean);
    if (!result.ok) {
      setFileStatus(bankErrorMessage(result.code), 'error');
      return;
    }

    await refreshBank(true);
    els.folderSelect.value = result.folder.id;
    setFileStatus(
      `Created “${result.folder.name}”; it is now your save folder.`,
      'ok',
    );
  } catch (error) {
    setFileStatus(bankErrorMessage(error && error.code), 'error');
  }
}

function openWordsPage() {
  openOptions();
}

/* ---------- History ---------- */

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry.text === 'string' &&
    typeof entry.result === 'string' &&
    (entry.mode === 'ar-en' || entry.mode === 'en-ar')
  );
}

function remember(entry) {
  const key = `${entry.mode}:${entry.text.toLowerCase()}`;

  history = history.filter(
    (item) => `${item.mode}:${item.text.toLowerCase()}` !== key,
  );
  history.unshift(entry);
  history = history.slice(0, MAX_HISTORY);

  renderHistory();
  persistHistory();
}

function persistHistory() {
  if (!storage) return;
  storage.set({ history }).catch(() => {});
}

function renderHistory() {
  els.history.replaceChildren();

  if (!history.length) {
    els.historySection.hidden = true;
    return;
  }

  els.historySection.hidden = false;

  for (const entry of history) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dir = 'auto';
    chip.textContent = entry.text;
    chip.title = `${entry.text} ← ${entry.result}`;
    chip.addEventListener('click', () => useHistoryEntry(entry));
    els.history.append(chip);
  }
}

function useHistoryEntry(entry) {
  els.input.value = entry.text;
  els.input.dir = detectMode(entry.text) === 'ar-en' ? 'rtl' : 'ltr';
  els.clear.hidden = false;
  els.copySource.hidden = false;
  autoGrowInput();
  setMode(entry.mode);
  translateCurrent();
}

async function clearHistory() {
  history = [];
  renderHistory();

  if (storage) {
    try {
      await storage.remove('history');
    } catch {
      // Ignore storage failures.
    }
  }
}

/* ---------- Misc ---------- */

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    const wordsKey = bank ? bank.WORDS_KEY : 'wordBank';
    const foldersKey = bank ? bank.FOLDERS_KEY : 'wordFolders';
    const activeKey = bank ? bank.ACTIVE_FOLDER_KEY : 'activeFolderId';

    if (changes[wordsKey] || changes[foldersKey] || changes[activeKey]) {
      refreshBank(true);
    }
  });
}

window.addEventListener('online', () => {
  if (lastQuery && !lastResult) translateCurrent();
});
