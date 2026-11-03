'use strict';

const els = {
  connection: document.getElementById('connection'),
  notePath: document.getElementById('notePath'),
  pickFile: document.getElementById('pickFile'),
  savePath: document.getElementById('savePath'),
  openFile: document.getElementById('openFile'),
  useDefault: document.getElementById('useDefault'),
  hassalaStatus: document.getElementById('hassalaStatus'),
  filePreview: document.getElementById('filePreview'),
  fabVisible: document.getElementById('fabVisible'),
  fabStatus: document.getElementById('fabStatus'),
  resetPanel: document.getElementById('resetPanel'),
  resetFab: document.getElementById('resetFab'),
  positionStatus: document.getElementById('positionStatus'),
  siteInput: document.getElementById('siteInput'),
  addSite: document.getElementById('addSite'),
  siteList: document.getElementById('siteList'),
  siteEmpty: document.getElementById('siteEmpty'),
  siteStatus: document.getElementById('siteStatus'),
  clearSites: document.getElementById('clearSites'),
  version: document.getElementById('version'),

  browserModal: document.getElementById('browserModal'),
  browserClose: document.getElementById('browserClose'),
  browserUp: document.getElementById('browserUp'),
  browserPath: document.getElementById('browserPath'),
  browserHidden: document.getElementById('browserHidden'),
  browserList: document.getElementById('browserList'),
  browserEmpty: document.getElementById('browserEmpty'),
  browserStatus: document.getElementById('browserStatus'),
  browserCancel: document.getElementById('browserCancel'),
};

const MAX_FULL_PATH = 4096;
const FOLDER_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2.5h6.5A2.5 2.5 0 0 1 21 10v7.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z"/></svg>';
const FILE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h5M9 12h6M9 16h4"/></svg>';

let defaultFilePath = '';
let vaultPath = '';
let browserPath = '';
let browserRequestSeq = 0;
let browserLastFocus = null;

const sitePolicy = window.__AET_SITE_POLICY__ || null;
let blockedSites = [];

/* ---------- Storage ---------- */

function getStorage(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(keys, (data) => {
        if (chrome.runtime.lastError) resolve({});
        else resolve(data || {});
      });
    } catch {
      resolve({});
    }
  });
}

function setStorage(values) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set(values, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

function removeStorage(keys) {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(keys, () => {
        void chrome.runtime.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

async function getStoredNotePath() {
  const data = await getStorage(['hassalaFile', 'obsidianFile']);
  const current =
    typeof data.hassalaFile === 'string' ? data.hassalaFile.trim() : '';
  const legacy =
    typeof data.obsidianFile === 'string' ? data.obsidianFile.trim() : '';
  const value = current || legacy;

  if (!current && legacy) {
    await setStorage({ hassalaFile: value });
    await removeStorage('obsidianFile');
  }

  return value;
}

/* ---------- Helpers ---------- */

function askBackground(payload, timeoutMs = 12000) {
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
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) finish({ ok: false, code: 'failed' });
        else finish(response || { ok: false, code: 'empty' });
      });
    } catch {
      finish({ ok: false, code: 'failed' });
    }
  });
}

function trimTrailingSlashes(value) {
  return String(value || '').replace(/\/+$/, '') || '/';
}

function normalizeAbsolutePath(raw) {
  const value = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\\/g, '/');

  if (!value || value.length > MAX_FULL_PATH) return null;
  if (!value.startsWith('/') || value.endsWith('/')) return null;

  const parts = value.split('/');
  const resolved = [];

  for (const part of parts) {
    if (!part || part === '.') continue;

    if (part === '..') {
      if (!resolved.length) return null;
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  if (!resolved.length) return null;
  return `/${resolved.join('/')}`;
}

// The storage value is always an absolute path from the filesystem root.
function resolveNotePath(raw) {
  const value = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\\/g, '/');

  if (!value) return '';
  if (!value.startsWith('/')) return null;
  return normalizeAbsolutePath(value);
}

// Only used to migrate values saved by older versions, which were relative to
// the configured vault. New selections are always absolute.
function resolveStoredNotePath(raw) {
  const value = String(raw || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .replace(/\\/g, '/');

  if (!value) return '';
  if (value.startsWith('/')) return normalizeAbsolutePath(value);
  if (value.startsWith('~') || !vaultPath) return null;

  const relative = value.replace(/^\/+/, '');
  const parts = relative.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) return null;

  return normalizeAbsolutePath(`${trimTrailingSlashes(vaultPath)}/${relative}`);
}

function setStatus(element, text, kind = 'info') {
  element.textContent = text;
  element.dataset.kind = kind;
}

function setConnection(state, text) {
  els.connection.dataset.state = state;
  els.connection.textContent = text;
}

function updatePreview() {
  const raw = els.notePath.value.trim();
  const resolved = raw ? resolveNotePath(raw) : '';

  els.filePreview.textContent = raw
    ? resolved || raw
    : defaultFilePath || '…';
}

function nativeErrorMessage(code) {
  switch (code) {
    case 'native_missing':
      return 'الربط مش مفعّل. راجع خطوات تركيب Native Host في README، وبعدها جرّب تاني.';
    case 'vault_missing':
      return 'ملف الإعدادات الافتراضي مش موجود. اختار ملف بنفسك.';
    case 'vault_readonly':
      return 'المكان ده مش قابل للكتابة.';
    case 'outside_root':
      return 'المسار ده بره المكان المسموح.';
    case 'not_directory':
      return 'المسار ده مش فولدر.';
    case 'unreadable':
      return 'مقدرتش أقرا الفولدر ده.';
    case 'file_missing':
      return 'الملف ده مش موجود. اتأكد من المسار الكامل، أو اعمله الأول وارجع اختاره.';
    case 'invalid_file':
      return 'المسار مش صح. اكتب مسار ملف كامل من الروت، ومن غير ما يكون فولدر.';
    case 'invalid_path':
      return 'المسار مش صح.';
    case 'config_error':
      return 'فيه مشكلة في config.json بتاع الحفظ.';
    case 'write_failed':
      return 'مقدرتش أكتب في الملف ده. اتأكد إنه موجود وإن عندك صلاحية تعديله.';
    case 'open_failed':
      return 'مقدرتش أفتح الملف. اتأكد إن فيه تطبيق بيقرأ Markdown.';
    case 'timeout':
      return 'الطلب خد وقت طويل. جرّب تاني.';
    default:
      return 'حصلت مشكلة. جرّب تاني.';
  }
}

function isTemporaryNativeFailure(code) {
  return code === 'native_missing' || code === 'timeout' || code === 'failed';
}

/* ---------- Hassala target ---------- */

async function refreshInfo(quiet = false) {
  const response = await askBackground({ type: 'hassalaInfo' });

  if (response && response.ok) {
    vaultPath = typeof response.vault === 'string' ? response.vault : vaultPath;
    defaultFilePath =
      (typeof response.filePath === 'string' && response.filePath) ||
      resolveStoredNotePath(response.file) ||
      '';
    setConnection('ok', 'متصل');

    if (!quiet) {
      setStatus(
        els.hassalaStatus,
        defaultFilePath
          ? `الملف الافتراضي دلوقتي: «${defaultFilePath}».`
          : 'مفيش ملف افتراضي متظبط. اختار ملف بنفسك.',
        'ok',
      );
    }
  } else {
    setConnection(
      'error',
      response && response.code === 'native_missing' ? 'مش متصل' : 'فيه مشكلة',
    );

    if (!quiet) {
      setStatus(
        els.hassalaStatus,
        nativeErrorMessage(response && response.code),
        'error',
      );
    }
  }

  updatePreview();
}

async function savePath() {
  const raw = els.notePath.value.trim();

  if (!raw) {
    await useDefaultPath();
    return;
  }

  const path = resolveNotePath(raw);
  if (!path) {
    setStatus(
      els.hassalaStatus,
      'اكتب مسار كامل من الروت، زي /home/you/Documents/Hassala Words.md.',
      'error',
    );
    return;
  }

  els.notePath.value = path;
  els.savePath.disabled = true;
  const check = await askBackground({ type: 'hassalaCheckFile', file: path });
  els.savePath.disabled = false;

  if (check && check.ok) {
    const finalPath = check.filePath || check.file || path;
    els.notePath.value = finalPath;
    await setStorage({ hassalaFile: finalPath });
    updatePreview();
    setStatus(
      els.hassalaStatus,
      `تم. الكلمات هتتحفظ في «${finalPath}» بالظبط.`,
      'ok',
    );
    return;
  }

  if (check && isTemporaryNativeFailure(check.code)) {
    await setStorage({ hassalaFile: path });
    updatePreview();
    setStatus(
      els.hassalaStatus,
      `اتحفظ المسار «${path}»، بس مش قادر أتأكد من الملف دلوقتي.`,
      'info',
    );
    return;
  }

  const previous = await getStoredNotePath();
  els.notePath.value = previous;
  updatePreview();
  setStatus(
    els.hassalaStatus,
    nativeErrorMessage(check && check.code),
    'error',
  );
}

async function useDefaultPath() {
  await removeStorage('hassalaFile');
  els.notePath.value = '';
  updatePreview();
  setStatus(
    els.hassalaStatus,
    `تمام — هنستخدم الملف الافتراضي${
      defaultFilePath ? ` «${defaultFilePath}»` : ''
    }.`,
    'ok',
  );
}

async function commitSelectedFile(path) {
  let full = resolveNotePath(path);

  if (!full) {
    setStatus(
      els.hassalaStatus,
      'الملف ده مش مسار كامل صح. اختار ملف تاني.',
      'error',
    );
    return;
  }

  const check = await askBackground({ type: 'hassalaCheckFile', file: full });

  if (check && check.ok) {
    full = check.filePath || check.file || full;
  } else if (check && !isTemporaryNativeFailure(check.code)) {
    setStatus(
      els.hassalaStatus,
      nativeErrorMessage(check.code),
      'error',
    );
    return;
  }

  els.notePath.value = full;
  await setStorage({ hassalaFile: full });
  updatePreview();
  setStatus(
    els.hassalaStatus,
    `تم. الكلمات هتتحفظ في «${full}» بالظبط.`,
    'ok',
  );
}

async function openCurrentFile() {
  if (els.openFile.disabled) return;

  els.openFile.disabled = true;
  setStatus(els.hassalaStatus, 'بيفتح الملف…', 'info');

  const response = await askBackground({ type: 'openHassalaFile' }, 9000);
  els.openFile.disabled = false;

  if (response && response.ok) {
    setStatus(
      els.hassalaStatus,
      response.filePath
        ? `اتفتح الملف: ${response.filePath}`
        : 'اتفتح ملف الحفظ.',
      'ok',
    );
  } else {
    setStatus(
      els.hassalaStatus,
      nativeErrorMessage(response && response.code),
      'error',
    );
  }
}

/* ---------- File browser ---------- */

function startDirectory() {
  const current = els.notePath.value.trim();
  const source = current.startsWith('/') ? current : defaultFilePath;

  if (!source || !source.startsWith('/')) return '';

  const clean = source.replace(/\/+$/, '');
  if (!clean) return '/';

  if (/\.md$/i.test(clean)) {
    const slash = clean.lastIndexOf('/');
    return slash <= 0 ? '/' : clean.slice(0, slash);
  }

  return clean;
}

function openBrowser() {
  browserLastFocus = document.activeElement;
  browserPath = startDirectory();

  els.browserModal.hidden = false;
  document.body.classList.add('modal-open');
  loadBrowser(browserPath);
  window.setTimeout(() => els.browserClose.focus(), 30);
}

function closeBrowser() {
  if (els.browserModal.hidden) return;

  browserRequestSeq += 1;
  els.browserModal.hidden = true;
  document.body.classList.remove('modal-open');

  if (browserLastFocus && typeof browserLastFocus.focus === 'function') {
    try {
      browserLastFocus.focus();
    } catch {
      // The element may be gone.
    }
  }
  browserLastFocus = null;
}

async function loadBrowser(path) {
  const seq = ++browserRequestSeq;
  els.browserList.replaceChildren();
  els.browserEmpty.hidden = true;
  els.browserUp.disabled = true;
  setStatus(els.browserStatus, 'بنجيب المحتويات…', 'info');

  const response = await askBackground({
    type: 'hassalaBrowse',
    path: path || '',
    files: true,
    showHidden: els.browserHidden.checked,
  });

  if (seq !== browserRequestSeq) return;

  if (!response || !response.ok) {
    setStatus(
      els.browserStatus,
      nativeErrorMessage(response && response.code),
      'error',
    );
    els.browserEmpty.hidden = true;
    return;
  }

  browserPath = response.path || path || '';
  els.browserPath.textContent = browserPath || '…';
  els.browserPath.title = browserPath;
  els.browserUp.disabled = !response.parent;
  els.browserUp.dataset.parent = response.parent || '';
  setStatus(els.browserStatus, '', 'info');

  renderBrowserEntries(response);
}

function renderBrowserEntries(data) {
  const fragment = document.createDocumentFragment();

  for (const dir of data.dirs || []) {
    fragment.append(
      makeBrowserRow('folder', dir.name, 'مجلد', () => loadBrowser(dir.path)),
    );
  }

  for (const file of data.files || []) {
    fragment.append(
      makeBrowserRow('file', file.name, 'Markdown', () =>
        chooseExistingFile(file),
      ),
    );
  }

  els.browserList.replaceChildren(fragment);

  const hasDirs = (data.dirs || []).length > 0;
  const hasFiles = (data.files || []).length > 0;
  els.browserEmpty.hidden = hasDirs || hasFiles;
}

function makeBrowserRow(kind, name, meta, onActivate) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = kind === 'file' ? 'browser-row is-file' : 'browser-row';

  const icon = document.createElement('span');
  icon.className = 'browser-row-icon';
  icon.innerHTML = kind === 'file' ? FILE_SVG : FOLDER_SVG;

  const label = document.createElement('span');
  label.className = 'browser-row-name';
  label.textContent = name;

  const metaEl = document.createElement('span');
  metaEl.className = 'browser-row-meta';
  metaEl.textContent = meta;

  row.append(icon, label, metaEl);
  row.addEventListener('click', onActivate);
  return row;
}

async function chooseExistingFile(file) {
  const full = resolveNotePath((file && file.path) || '');

  if (!full) {
    setStatus(
      els.browserStatus,
      'الملف ده مش مسار كامل صح.',
      'error',
    );
    return;
  }

  closeBrowser();
  await commitSelectedFile(full);
}

/* ---------- Blocked sites ---------- */

function renderBlockedSites(value) {
  blockedSites = sitePolicy ? sitePolicy.sanitizeList(value) : [];

  if (els.siteList) els.siteList.textContent = '';
  if (els.siteEmpty) els.siteEmpty.hidden = blockedSites.length > 0;
  if (els.clearSites) els.clearSites.disabled = blockedSites.length === 0;

  if (!els.siteList) return;

  for (const site of blockedSites) {
    const row = document.createElement('li');
    row.className = 'site-row';

    const name = document.createElement('span');
    name.className = 'site-name';
    name.dir = 'ltr';
    name.textContent = site;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'site-remove';
    remove.title = `تفعيل حصالة على ${site}`;
    remove.setAttribute('aria-label', `إزالة ${site} من المواقع المتعطلة`);
    remove.textContent = '×';
    remove.addEventListener('click', () => removeBlockedSite(site));

    row.append(name, remove);
    els.siteList.appendChild(row);
  }
}

async function loadBlockedSites() {
  if (!sitePolicy) {
    if (els.addSite) els.addSite.disabled = true;
    setStatus(
      els.siteStatus,
      'مقدرتش أحمّل إعدادات المواقع. أعد تحميل الصفحة.',
      'error',
    );
    return;
  }

  const data = await getStorage('blockedSites');
  renderBlockedSites(data.blockedSites);
}

async function addBlockedSite() {
  if (!sitePolicy) return;

  const site = sitePolicy.normalizeSite(els.siteInput.value);
  if (!site) {
    setStatus(
      els.siteStatus,
      'اكتب دومين صحيح، زي example.com أو https://example.com.',
      'error',
    );
    els.siteInput.focus();
    return;
  }

  const data = await getStorage('blockedSites');
  const list = sitePolicy.sanitizeList(data.blockedSites);

  if (list.includes(site)) {
    setStatus(els.siteStatus, `«${site}» متضاف بالفعل.`, 'info');
    els.siteInput.select();
    return;
  }

  list.push(site);
  await setStorage({ blockedSites: sitePolicy.sanitizeList(list) });
  els.siteInput.value = '';
  renderBlockedSites(list);
  setStatus(
    els.siteStatus,
    `تم تعطيل حصالة على «${site}» وكل النطاقات الفرعية.`,
    'ok',
  );
  els.siteInput.focus();
}

async function removeBlockedSite(site) {
  if (!sitePolicy) return;

  const data = await getStorage('blockedSites');
  const list = sitePolicy
    .sanitizeList(data.blockedSites)
    .filter((item) => item !== site);

  await setStorage({ blockedSites: list });
  renderBlockedSites(list);
  setStatus(els.siteStatus, `تم تفعيل حصالة على «${site}» تاني.`, 'ok');
}

async function clearBlockedSites() {
  if (blockedSites.length === 0) return;

  const confirmed = window.confirm(
    'تفعيل حصالة على كل المواقع تاني؟ هتمسح كل المواقع المتعطلة.',
  );
  if (!confirmed) return;

  await removeStorage('blockedSites');
  renderBlockedSites([]);
  setStatus(els.siteStatus, 'حصالة اتفعّلت على كل المواقع تاني.', 'ok');
}

/* ---------- Floating button & positions ---------- */

async function toggleFab() {
  const visible = els.fabVisible.checked;
  await setStorage({ fabHidden: !visible });

  setStatus(
    els.fabStatus,
    visible
      ? 'الزرار العائم رجع هيظهر في الصفحات المفتوحة.'
      : 'الزرار العائم اتخفى. تقدر ترجّعه بأيقونة الإضافة من شريط المتصفح.',
    'ok',
  );
}

async function resetPanelPosition() {
  await removeStorage('panelPos');
  setStatus(
    els.positionStatus,
    'مكان صندوق الترجمة رجع للافتراضي. لو الصندوق مفتوح، هيتحرك على طول.',
    'ok',
  );
}

async function resetFabPosition() {
  await removeStorage('fabPos');
  setStatus(
    els.positionStatus,
    'الزرار العائم رجع لمكانه الأصلي في الصفحات المفتوحة.',
    'ok',
  );
}

/* ---------- Init ---------- */

async function init() {
  try {
    els.version.textContent = chrome.runtime.getManifest().version;
  } catch {
    // Keep the version in the markup.
  }

  const data = await getStorage(['fabHidden']);
  const stored = await getStoredNotePath();

  els.fabVisible.checked = !data.fabHidden;
  await refreshInfo(false);

  if (stored) {
    const full = resolveStoredNotePath(stored);

    if (full) {
      els.notePath.value = full;
      if (full !== stored) await setStorage({ hassalaFile: full });
    } else {
      els.notePath.value = stored;
    }
  }

  updatePreview();

  const current = els.notePath.value.trim();
  if (current.startsWith('/')) {
    const check = await askBackground({ type: 'hassalaCheckFile', file: current });

    if (check && check.ok) {
      const finalPath = check.filePath || check.file || current;
      if (finalPath !== current) {
        els.notePath.value = finalPath;
        await setStorage({ hassalaFile: finalPath });
        updatePreview();
      }
      setStatus(
        els.hassalaStatus,
        `الكلمات هتتحفظ في «${els.notePath.value}» بالظبط.`,
        'ok',
      );
    } else if (check && check.code === 'file_missing') {
      setStatus(
        els.hassalaStatus,
        'الملف المحفوظ مش موجود دلوقتي. اختار ملف تاني أو اعمله الأول.',
        'error',
      );
    }
  }

  await loadBlockedSites();
}

els.savePath.addEventListener('click', savePath);
els.openFile.addEventListener('click', openCurrentFile);
els.useDefault.addEventListener('click', useDefaultPath);
els.pickFile.addEventListener('click', openBrowser);
els.fabVisible.addEventListener('change', toggleFab);
els.resetPanel.addEventListener('click', resetPanelPosition);
els.resetFab.addEventListener('click', resetFabPosition);
els.addSite.addEventListener('click', addBlockedSite);
els.clearSites.addEventListener('click', clearBlockedSites);
els.siteInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addBlockedSite();
  }
});

els.notePath.addEventListener('input', updatePreview);
els.notePath.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    savePath();
  }
});

els.browserClose.addEventListener('click', closeBrowser);
els.browserCancel.addEventListener('click', closeBrowser);
els.browserModal.addEventListener('click', (event) => {
  if (event.target.closest('[data-browser-close]')) closeBrowser();
});

els.browserUp.addEventListener('click', () => {
  const parent = els.browserUp.dataset.parent;
  if (parent) loadBrowser(parent);
});
els.browserHidden.addEventListener('change', () => {
  if (!els.browserModal.hidden) loadBrowser(browserPath);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !els.browserModal.hidden) {
    event.preventDefault();
    closeBrowser();
  }
});

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.blockedSites) return;
    renderBlockedSites(changes.blockedSites.newValue);
  });
}

init();
