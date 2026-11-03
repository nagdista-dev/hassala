'use strict';

const els = {
  input: document.getElementById('input'),
  settings: document.getElementById('settings'),
  clear: document.getElementById('clear'),
  copySource: document.getElementById('copySource'),
  copy: document.getElementById('copy'),
  provider: document.getElementById('provider'),
  result: document.getElementById('result'),
  resultCard: document.getElementById('resultCard'),
  saveHassala: document.getElementById('saveHassala'),
  saveLabel: document.getElementById('saveLabel'),
  openFile: document.getElementById('openFile'),
  pathSettings: document.getElementById('pathSettings'),
  fileStatus: document.getElementById('fileStatus'),
  pathModal: document.getElementById('pathModal'),
  pathClose: document.getElementById('pathClose'),
  pathInput: document.getElementById('pathInput'),
  pathDefault: document.getElementById('pathDefault'),
  pathStatus: document.getElementById('pathStatus'),
  pathSave: document.getElementById('pathSave'),
  pathUseDefault: document.getElementById('pathUseDefault'),
  pathOpenOptions: document.getElementById('pathOpenOptions'),
  speak: document.getElementById('speak'),
  speakLabel: document.getElementById('speakLabel'),
  directionText: document.getElementById('directionText'),
  historySection: document.getElementById('historySection'),
  history: document.getElementById('history'),
  clearHistory: document.getElementById('clearHistory'),
};

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LETTER_RE = /[A-Za-z\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EMPTY_MESSAGE = 'اكتب كلمة… وهتلاقي معناها هنا.';
const MAX_HISTORY = 8;
const DEBOUNCE_MS = 350;

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
let fileStatusTimer = 0;
let pathDefaultPath = '';
let pathLastFocus = null;
let speaking = false;
let history = [];
const cache = new Map();

/* ---------- Setup ---------- */

init();

async function init() {
  bindEvents();
  await restoreState();
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
  els.openFile.addEventListener('click', openCurrentFile);
  els.pathSettings.addEventListener('click', openPathModal);
  els.pathClose.addEventListener('click', closePathModal);
  els.pathSave.addEventListener('click', savePathFromModal);
  els.pathUseDefault.addEventListener('click', useDefaultPathFromModal);
  els.pathOpenOptions.addEventListener('click', () => {
    closePathModal();
    openOptions();
  });
  els.pathInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      savePathFromModal();
    }
  });
  els.pathModal.addEventListener('click', (event) => {
    if (event.target.closest('[data-path-close]')) closePathModal();
  });
  els.pathModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePathModal();
    }
    event.stopPropagation();
  });
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

  els.directionText.textContent =
    mode === 'en-ar'
      ? 'من الإنجليزي للعربي'
      : 'من العربي للإنجليزي';

  saveMode();
}

function saveMode() {
  if (!storage) return;
  storage.set({ mode }).catch(() => {});
}

/* ---------- Input ---------- */

function onInput() {
  if (composing) return;

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

function clearInput(focus, notice = '') {
  cancelDebounce();
  requestSeq++;
  clearTimeout(saveTimer);
  clearTimeout(emptyNoticeTimer);

  els.input.value = '';
  els.input.style.height = '';
  els.input.dir = 'rtl';
  els.clear.hidden = true;
  els.copySource.hidden = true;
  els.copySource.classList.remove('copied', 'is-error');
  els.copySource.title = 'انسخ الكلمة';
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
    showError('محتاج كلمة عربية أو إنجليزية عشان أقدر أترجمها.');
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

/* ---------- Card states ---------- */

function setCardState(state) {
  els.resultCard.dataset.state = state;
}

function showEmpty(message = EMPTY_MESSAGE) {
  clearTimeout(emptyNoticeTimer);
  els.resultCard.classList.remove('is-loading');
  setCardState('empty');
  els.result.textContent = message;
  els.result.dir = 'rtl';
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
  els.result.textContent = 'بندوّر عليها…';
  els.result.dir = 'rtl';
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
  els.copy.textContent = 'انسخ';
  els.copy.classList.remove('copied');

  els.saveHassala.hidden = false;
  resetSaveButton();
  els.speak.hidden = false;
  resetSpeakButton();
}

function showError(message) {
  els.resultCard.classList.remove('is-loading');
  setCardState('error');
  els.result.textContent = message;
  els.result.dir = 'rtl';
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
  els.saveHassala.hidden = true;
  els.saveHassala.disabled = false;
  els.saveHassala.classList.remove('is-saved', 'is-error');
  els.saveLabel.textContent = 'أضف للحصالة';
}

function resetSaveButton() {
  clearTimeout(saveTimer);
  els.saveHassala.disabled = false;
  els.saveHassala.classList.remove('is-saved', 'is-error');
  els.saveLabel.textContent = 'أضف للحصالة';
}

function hideSpeak() {
  stopSpeaking();
  els.speak.hidden = true;
  els.speak.classList.remove('is-speaking', 'is-error');
  els.speak.disabled = false;
  els.speakLabel.textContent = 'سمّعني';
}

function resetSpeakButton() {
  speaking = false;
  els.speak.classList.remove('is-speaking', 'is-error');
  els.speak.disabled = false;
  els.speakLabel.textContent = 'سمّعني';
}

/* ---------- Copy ---------- */

async function copyResult() {
  if (!lastResult) return;

  const copied = await copyText(lastResult);
  if (!copied) {
    flashCopy('مقدرتش أنسخ');
    return;
  }

  flashCopy('اتنسخت ✓');
}

async function copySourceText() {
  const value = els.input.value.trim();
  if (!value) return;

  const copied = await copyText(value);
  clearTimeout(sourceCopyTimer);

  els.copySource.classList.remove('copied', 'is-error');
  els.copySource.classList.add(copied ? 'copied' : 'is-error');
  els.copySource.title = copied ? 'اتنسخت ✓' : 'مقدرتش أنسخ';

  sourceCopyTimer = setTimeout(() => {
    els.copySource.classList.remove('copied', 'is-error');
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

  els.copy.textContent = label;
  els.copy.classList.add('copied');

  copyTimer = setTimeout(() => {
    els.copy.textContent = 'انسخ';
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
  els.speakLabel.textContent = 'وقف';

  const response = await sendMessage({
    type: 'tts',
    text: lastResult,
    lang,
  });

  if (!response || !response.ok) {
    resetSpeakButton();
    els.speak.classList.add('is-error');
    els.speakLabel.textContent = 'الصوت مش متاح';
    setTimeout(() => {
      if (!speaking) {
        els.speak.classList.remove('is-error');
        els.speakLabel.textContent = 'سمّعني';
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
    els.speakLabel.textContent = 'وقف';
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
      clearInput(true, notice);
    } else {
      setFileStatus(notice, 'ok');
      resetSaveButton();
    }
    return;
  }

  els.saveHassala.classList.add('is-error');
  els.saveLabel.textContent =
    response && response.code === 'native_missing'
      ? 'الربط مش مفعّل'
      : response && response.code === 'invalid_file'
        ? 'راجع مسار الحصالة'
        : response && response.code === 'file_missing'
          ? 'الملف مش موجود'
          : 'مقدرتش أحوش';

  saveTimer = setTimeout(resetSaveButton, 2400);
}

/* ---------- File tools ---------- */

function isTemporaryNativeFailure(code) {
  return code === 'native_missing' || code === 'timeout' || code === 'failed';
}

function nativeErrorMessage(code) {
  switch (code) {
    case 'native_missing':
      return 'الربط مش مفعّل. راجع تركيب Native Host في الإعدادات.';
    case 'file_missing':
      return 'الملف ده مش موجود. احفظ كلمة الأول أو اختار ملف موجود.';
    case 'invalid_file':
      return 'المسار مش صح. اكتب مسار ملف كامل من الروت، ومن غير ما يكون فولدر.';
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

async function getStoredPath() {
  if (!storage) return '';
  try {
    const data = await storage.get(['hassalaFile', 'obsidianFile']);
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
      await storage.set({ hassalaFile: value });
      await storage.remove('obsidianFile');
    }
    return value;
  } catch {
    return '';
  }
}

async function setStoredPath(path) {
  if (!storage) return;
  try {
    await storage.set({ hassalaFile: path });
  } catch {
    // Best-effort.
  }
}

async function removeStoredPath() {
  if (!storage) return;
  try {
    await storage.remove('hassalaFile');
  } catch {
    // Best-effort.
  }
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
    setFileStatus(nativeErrorMessage(response && response.code), 'error');
  }
}

async function openPathModal() {
  pathLastFocus = document.activeElement;
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
    info && info.ok && typeof info.filePath === 'string' ? info.filePath : '';

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
      target.focus();
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
    setPathStatus(`تم. الكلمات هتتحفظ في «${finalPath}» بالظبط.`, 'ok');
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

window.addEventListener('online', () => {
  if (lastQuery && !lastResult) translateCurrent();
});
