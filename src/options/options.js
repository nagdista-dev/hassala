'use strict';

const bank = window.HassalaWordBank || null;
const DEFAULT_FOLDER_ID = bank ? bank.DEFAULT_FOLDER_ID : 'general';
const PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 120;
const FORMAT_EXTENSIONS = {
  markdown: '.md',
  text: '.txt',
  csv: '.csv',
  json: '.json',
};

const els = {
  version: document.getElementById('version'),
  navWordCount: document.getElementById('navWordCount'),
  navItems: [...document.querySelectorAll('.nav-item[data-section]')],
  brandLink: document.querySelector('[data-section-link]'),
  wordCount: document.getElementById('wordCount'),
  wordSearch: document.getElementById('wordSearch'),
  folderFilter: document.getElementById('folderFilter'),
  sortOrder: document.getElementById('sortOrder'),
  viewSummary: document.getElementById('viewSummary'),
  selectionInfo: document.getElementById('selectionInfo'),
  selectAllWords: document.getElementById('selectAllWords'),
  moveFolder: document.getElementById('moveFolder'),
  moveSelected: document.getElementById('moveSelected'),
  deleteSelected: document.getElementById('deleteSelected'),
  clearWords: document.getElementById('clearWords'),
  wordList: document.getElementById('wordList'),
  wordEmpty: document.getElementById('wordEmpty'),
  wordPager: document.getElementById('wordPager'),
  wordRange: document.getElementById('wordRange'),
  wordPageLabel: document.getElementById('wordPageLabel'),
  wordPrev: document.getElementById('wordPrev'),
  wordNext: document.getElementById('wordNext'),
  activeFolder: document.getElementById('activeFolder'),
  newFolderName: document.getElementById('newFolderName'),
  addFolder: document.getElementById('addFolder'),
  folderSummary: document.getElementById('folderSummary'),
  folderList: document.getElementById('folderList'),
  folderEmpty: document.getElementById('folderEmpty'),
  folderHint: document.getElementById('folderHint'),
  exportName: document.getElementById('exportName'),
  exportExtension: document.getElementById('exportExtension'),
  exportSelected: document.getElementById('exportSelected'),
  exportVisible: document.getElementById('exportVisible'),
  exportAll: document.getElementById('exportAll'),
  deleteAfterExport: document.getElementById('deleteAfterExport'),
  fabVisible: document.getElementById('fabVisible'),
  resetPanel: document.getElementById('resetPanel'),
  resetFab: document.getElementById('resetFab'),
  siteInput: document.getElementById('siteInput'),
  addSite: document.getElementById('addSite'),
  siteList: document.getElementById('siteList'),
  siteEmpty: document.getElementById('siteEmpty'),
  clearSites: document.getElementById('clearSites'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmTitle: document.getElementById('confirmTitle'),
  confirmBody: document.getElementById('confirmBody'),
  confirmOk: document.getElementById('confirmOk'),
  renameDialog: document.getElementById('renameDialog'),
  renameInput: document.getElementById('renameInput'),
  toast: document.getElementById('toast'),
};

const sitePolicy = window.__AET_SITE_POLICY__ || null;
let blockedSites = [];

let state = {
  words: [],
  folders: [],
  activeFolderId: DEFAULT_FOLDER_ID,
};
let folderFilterId = 'all';
let selectedIds = new Set();
let currentPage = 0;
let toastTimer = 0;
let searchTimer = 0;

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

/* ---------- Feedback and dialogs ---------- */

function showToast(text, kind = 'info', holdMs = 6500) {
  clearTimeout(toastTimer);
  if (!text) {
    els.toast.classList.remove('is-visible');
    return;
  }

  els.toast.textContent = text;
  els.toast.dataset.kind = kind;
  els.toast.classList.add('is-visible');

  toastTimer = setTimeout(() => {
    els.toast.classList.remove('is-visible');
  }, holdMs);
}

function askConfirm({
  title,
  body,
  confirmLabel = 'Delete',
  danger = true,
}) {
  els.confirmTitle.textContent = title;
  els.confirmBody.textContent = body;
  els.confirmOk.textContent = confirmLabel;
  els.confirmOk.className = danger ? 'btn danger' : 'btn primary';
  els.confirmDialog.returnValue = '';

  return new Promise((resolve) => {
    const onClose = () => {
      els.confirmDialog.removeEventListener('close', onClose);
      resolve(els.confirmDialog.returnValue === 'confirm');
    };

    els.confirmDialog.addEventListener('close', onClose);
    els.confirmDialog.showModal();
  });
}

function askFolderName(folder) {
  els.renameInput.value = folder.name;
  els.renameDialog.returnValue = '';

  return new Promise((resolve) => {
    const onClose = () => {
      els.renameDialog.removeEventListener('close', onClose);
      resolve(
        els.renameDialog.returnValue === 'save'
          ? els.renameInput.value.trim()
          : null,
      );
    };

    els.renameDialog.addEventListener('close', onClose);
    els.renameDialog.showModal();

    requestAnimationFrame(() => {
      els.renameInput.focus();
      els.renameInput.select();
    });
  });
}

function wireDialogCancelButtons() {
  for (const dialog of [els.confirmDialog, els.renameDialog]) {
    dialog.querySelectorAll('[data-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close('cancel'));
    });
  }
}

/* ---------- Section navigation ---------- */

function validSection(name) {
  return els.navItems.some((item) => item.dataset.section === name);
}

function switchSection(name, { updateHash = true } = {}) {
  const target = validSection(name) ? name : 'words';

  for (const item of els.navItems) {
    const active = item.dataset.section === target;
    item.classList.toggle('is-active', active);
    if (active) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }

  for (const panel of document.querySelectorAll('.panel[data-panel]')) {
    const active = panel.dataset.panel === target;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  }

  if (updateHash) {
    try {
      history.replaceState(null, '', `#${target}`);
    } catch {
      // Hash updates are best-effort.
    }
  }
}

/* ---------- Helpers ---------- */

function bankErrorMessage(code) {
  switch (code) {
    case 'invalid':
      return 'The word or translation is incomplete.';
    case 'invalid_name':
      return 'Enter a valid folder name.';
    case 'duplicate_name':
      return 'A folder with that name already exists.';
    case 'folder_limit':
      return 'You reached the maximum number of folders.';
    case 'folder_missing':
      return 'That folder no longer exists. Refresh the page and try again.';
    case 'protected_folder':
      return 'The default folder cannot be deleted. You can rename it.';
    case 'word_limit':
      return 'You reached the maximum number of words. Export and delete some words.';
    case 'storage_full':
      return 'Storage is full. Export and delete some words, then try again.';
    case 'storage_error':
      return 'Could not reach local storage. Try reloading the page.';
    default:
      return 'Something went wrong. Try again.';
  }
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return count === 1 ? singular : pluralForm;
}

function formatCount(count) {
  return Number(count).toLocaleString('en-US');
}

function folderById(id) {
  return state.folders.find((folder) => folder.id === id) || null;
}

function generalFolderName() {
  const folder = folderById(DEFAULT_FOLDER_ID);
  return folder ? folder.name : 'General';
}

function setTextDirection(element, text) {
  element.dir = 'auto';
  if (/[\u0600-\u06FF]/.test(text)) element.lang = 'ar';
}

function folderCounts() {
  const counts = new Map();
  for (const entry of state.words) {
    counts.set(entry.folderId, (counts.get(entry.folderId) || 0) + 1);
  }
  return counts;
}

function visibleWords() {
  const query = els.wordSearch.value.trim().toLocaleLowerCase();

  const list = state.words.filter((entry) => {
    if (folderFilterId !== 'all' && entry.folderId !== folderFilterId) {
      return false;
    }
    if (!query) return true;

    return (
      entry.word.toLocaleLowerCase().includes(query) ||
      entry.translation.toLocaleLowerCase().includes(query)
    );
  });

  if (els.sortOrder.value === 'az') {
    return [...list].sort((a, b) =>
      a.word.localeCompare(b.word, undefined, { sensitivity: 'base' }),
    );
  }
  if (els.sortOrder.value === 'za') {
    return [...list].sort((a, b) =>
      b.word.localeCompare(a.word, undefined, { sensitivity: 'base' }),
    );
  }

  return list;
}

function wordsForFolder(folderId) {
  return state.words.filter((entry) => entry.folderId === folderId);
}

function getExportFormat() {
  const checked = document.querySelector(
    'input[name="exportFormat"]:checked',
  );
  return checked ? checked.value : 'markdown';
}

function updateExportExtension() {
  const format = getExportFormat();
  els.exportExtension.textContent = FORMAT_EXTENSIONS[format] || '.md';
}

/* ---------- Word bank rendering ---------- */

async function loadWords(quiet = false) {
  if (!bank) {
    showToast('Could not load the word bank. Reload the page.', 'error');
    return;
  }

  try {
    state = await bank.read();
  } catch (error) {
    console.warn('Word bank read failed:', error);
    if (!quiet) {
      showToast(bankErrorMessage(error && error.code), 'error');
    }
    return;
  }

  const validIds = new Set(state.words.map((entry) => entry.id));
  selectedIds = new Set([...selectedIds].filter((id) => validIds.has(id)));

  if (
    folderFilterId !== 'all' &&
    !state.folders.some((folder) => folder.id === folderFilterId)
  ) {
    folderFilterId = 'all';
  }

  renderFolders();
  renderWords();
}

function fillFolderSelect(select, selectedValue) {
  const previous = selectedValue || select.value;
  select.replaceChildren();

  for (const folder of state.folders) {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.name;
    option.dir = 'auto';
    option.title = folder.name;
    select.append(option);
  }

  select.value = state.folders.some((folder) => folder.id === previous)
    ? previous
    : state.folders[0]?.id || '';

  const selected = state.folders.find((folder) => folder.id === select.value);
  select.title = selected ? `Selected folder: ${selected.name}` : '';
}

function renderFolders() {
  const counts = folderCounts();
  const total = state.words.length;

  els.wordCount.textContent = `${formatCount(total)} ${plural(total, 'word')}`;
  els.wordCount.dataset.state = total ? 'ok' : 'idle';
  els.navWordCount.textContent = formatCount(total);

  fillFolderSelect(els.activeFolder, state.activeFolderId);
  fillFolderSelect(els.moveFolder, els.moveFolder.value || state.activeFolderId);

  renderFolderFilter(counts);
  renderFolderList(counts);

  const folderTotal = state.folders.length;
  els.folderSummary.textContent = `${formatCount(folderTotal)} ${plural(
    folderTotal,
    'folder',
  )}`;

  updateFolderHint();
}

function updateFolderHint() {
  if (!els.folderHint) return;

  const length = els.newFolderName ? els.newFolderName.value.length : 0;
  const lead = length
    ? `${formatCount(length)}/60 characters used.`
    : 'Folder names can be up to 60 characters.';

  els.folderHint.textContent = `${lead} Deleting a folder moves its words back to “${generalFolderName()}”; it never deletes the words.`;
}

function renderFolderFilter(counts) {
  els.folderFilter.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = `All words (${formatCount(state.words.length)})`;
  els.folderFilter.append(allOption);

  for (const folder of state.folders) {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = `${folder.name} (${formatCount(
      counts.get(folder.id) || 0,
    )})`;
    option.dir = 'auto';
    option.title = folder.name;
    els.folderFilter.append(option);
  }

  const known =
    folderFilterId === 'all' ||
    state.folders.some((folder) => folder.id === folderFilterId);

  if (!known) folderFilterId = 'all';
  els.folderFilter.value = folderFilterId;
  els.folderFilter.title =
    els.folderFilter.selectedOptions[0]?.textContent || '';
}

function renderFolderList(counts) {
  els.folderList.replaceChildren();

  if (!state.folders.length) {
    els.folderEmpty.hidden = false;
    return;
  }

  els.folderEmpty.hidden = true;

  for (const folder of state.folders) {
    const count = counts.get(folder.id) || 0;
    const isActive = folder.id === state.activeFolderId;
    const isProtected = folder.id === DEFAULT_FOLDER_ID;

    const row = document.createElement('li');
    row.className = 'folder-row';
    row.dataset.folderId = folder.id;
    row.classList.toggle('is-active', isActive);

    const main = document.createElement('div');
    main.className = 'folder-main';

    const name = document.createElement('span');
    name.className = 'folder-name';
    setTextDirection(name, folder.name);
    name.textContent = folder.name;
    name.title = folder.name;

    const meta = document.createElement('span');
    meta.className = 'folder-meta';
    meta.textContent = `${formatCount(count)} ${plural(count, 'word')}`;

    main.append(name, meta);

    if (isActive) {
      const badge = document.createElement('span');
      badge.className = 'folder-badge';
      badge.textContent = 'Saving here';
      main.append(badge);
    }

    const actions = document.createElement('div');
    actions.className = 'folder-actions';

    const view = document.createElement('button');
    view.type = 'button';
    view.className = 'btn small ghost';
    view.dataset.action = 'view';
    view.textContent = 'View';
    view.setAttribute('aria-label', `View words in ${folder.name}`);

    const rename = document.createElement('button');
    rename.type = 'button';
    rename.className = 'btn small ghost';
    rename.dataset.action = 'rename';
    rename.textContent = 'Rename';
    rename.setAttribute('aria-label', `Rename ${folder.name}`);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn small ghost danger';
    remove.dataset.action = 'delete';
    remove.textContent = 'Delete';
    remove.disabled = isProtected;
    remove.setAttribute('aria-label', `Delete ${folder.name}`);
    if (isProtected) {
      remove.title = 'The default folder is protected.';
      remove.setAttribute(
        'aria-label',
        `${folder.name} is the default folder and cannot be deleted`,
      );
    }

    actions.append(view);
    if (!isActive) {
      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'btn small';
      save.dataset.action = 'save';
      save.textContent = 'Save here';
      save.setAttribute(
        'aria-label',
        `Save new words to ${folder.name}`,
      );
      actions.append(save);
    }
    actions.append(rename, remove);
    row.append(main, actions);
    els.folderList.append(row);
  }
}

function renderWords() {
  const all = visibleWords();
  const pageCount = Math.max(1, Math.ceil(all.length / PAGE_SIZE));

  if (currentPage >= pageCount) currentPage = pageCount - 1;
  if (currentPage < 0) currentPage = 0;

  const start = currentPage * PAGE_SIZE;
  const pageWords = all.slice(start, start + PAGE_SIZE);
  const folders = new Map(state.folders.map((folder) => [folder.id, folder]));

  els.wordList.replaceChildren();

  if (!all.length) {
    els.wordEmpty.hidden = false;
    els.wordEmpty.textContent = state.words.length
      ? 'No words match your search or the selected folder.'
      : 'No words here yet. Save a word from the extension and it will appear here.';
    els.wordPager.hidden = true;
  } else {
    els.wordEmpty.hidden = true;

    const fragment = document.createDocumentFragment();
    for (const entry of pageWords) {
      fragment.append(makeWordRow(entry, folders));
    }
    els.wordList.append(fragment);

    els.wordPager.hidden = all.length <= PAGE_SIZE;
    els.wordRange.textContent = `Showing ${formatCount(
      start + 1,
    )}–${formatCount(start + pageWords.length)} of ${formatCount(
      all.length,
    )} ${plural(all.length, 'word')}`;
    els.wordPageLabel.textContent = `${currentPage + 1} / ${pageCount}`;
    els.wordPrev.disabled = currentPage === 0;
    els.wordNext.disabled = currentPage >= pageCount - 1;
  }

  els.viewSummary.textContent =
    all.length === state.words.length
      ? `${formatCount(all.length)} ${plural(all.length, 'word')}`
      : `${formatCount(all.length)} of ${formatCount(state.words.length)} ${plural(
          state.words.length,
          'word',
        )}`;

  const allPageSelected =
    pageWords.length > 0 && pageWords.every((entry) => selectedIds.has(entry.id));
  const somePageSelected = pageWords.some((entry) => selectedIds.has(entry.id));

  els.selectAllWords.checked = allPageSelected;
  els.selectAllWords.indeterminate = somePageSelected && !allPageSelected;
  els.selectAllWords.disabled = pageWords.length === 0;

  els.exportVisible.disabled = all.length === 0;
  els.exportAll.disabled = state.words.length === 0;
  els.exportVisible.textContent = all.length
    ? `Export visible (${formatCount(all.length)})`
    : 'Export visible';
  els.exportAll.textContent = state.words.length
    ? `Export all (${formatCount(state.words.length)})`
    : 'Export all';

  const filteredView =
    folderFilterId !== 'all' || els.wordSearch.value.trim().length > 0;
  els.clearWords.disabled = all.length === 0;
  els.clearWords.textContent = filteredView
    ? `Clear shown (${formatCount(all.length)})`
    : `Clear all words (${formatCount(state.words.length)})`;

  updateSelectionState();
}

function makeWordRow(entry, folders) {
  const row = document.createElement('div');
  row.className = 'word-row';
  row.setAttribute('role', 'listitem');
  if (selectedIds.has(entry.id)) row.classList.add('is-selected');

  const checkLabel = document.createElement('label');
  checkLabel.className = 'word-check';
  checkLabel.title = 'Select word';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = selectedIds.has(entry.id);
  checkbox.setAttribute('aria-label', `Select ${entry.word}`);
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) selectedIds.add(entry.id);
    else selectedIds.delete(entry.id);

    row.classList.toggle('is-selected', checkbox.checked);
    updateSelectionState();

    const pageWords = visibleWords().slice(
      currentPage * PAGE_SIZE,
      (currentPage + 1) * PAGE_SIZE,
    );
    els.selectAllWords.checked =
      pageWords.length > 0 &&
      pageWords.every((item) => selectedIds.has(item.id));
    els.selectAllWords.indeterminate =
      pageWords.some((item) => selectedIds.has(item.id)) &&
      !els.selectAllWords.checked;
  });

  checkLabel.append(checkbox);

  const text = document.createElement('div');
  text.className = 'word-text';

  const source = document.createElement('span');
  source.className = 'word-source';
  setTextDirection(source, entry.word);
  source.textContent = entry.word;

  const arrow = document.createElement('span');
  arrow.className = 'word-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';

  const target = document.createElement('span');
  target.className = 'word-target';
  setTextDirection(target, entry.translation);
  target.textContent = entry.translation;

  text.append(source, arrow, target);

  const meta = document.createElement('div');
  meta.className = 'word-meta';

  const folder = folders.get(entry.folderId);
  const folderTag = document.createElement('span');
  folderTag.className = 'word-folder-tag';
  const folderTagName = folder ? folder.name : generalFolderName();
  setTextDirection(folderTag, folderTagName);
  folderTag.textContent = folderTagName;
  folderTag.title = folderTagName;

  meta.append(folderTag);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'word-delete';
  remove.title = 'Delete word';
  remove.setAttribute('aria-label', `Delete ${entry.word}`);
  remove.textContent = '×';
  remove.addEventListener('click', () => deleteSingleWord(entry));

  row.append(checkLabel, text, meta, remove);
  return row;
}

function updateSelectionState() {
  const count = selectedIds.size;

  els.selectionInfo.textContent = count
    ? `${formatCount(count)} selected`
    : 'No words selected';

  els.exportSelected.textContent = count
    ? `Export selected (${formatCount(count)})`
    : 'Export selected';

  els.exportSelected.disabled = count === 0;
  els.moveSelected.disabled = count === 0;
  els.deleteSelected.disabled = count === 0;
  els.moveSelected.textContent = count ? `Move (${formatCount(count)})` : 'Move';
  els.deleteSelected.textContent = count
    ? `Delete (${formatCount(count)})`
    : 'Delete selected';
}

/* ---------- Folder actions ---------- */

async function addFolder() {
  if (!bank || els.addFolder.disabled) return;

  const name = els.newFolderName.value.trim();
  if (!name) {
    showToast('Enter a folder name first.', 'error');
    els.newFolderName.focus();
    return;
  }

  els.addFolder.disabled = true;
  let result;
  try {
    result = await bank.createFolder(name);
  } catch (error) {
    result = { ok: false, code: error && error.code };
  }
  els.addFolder.disabled = false;

  if (!result || !result.ok) {
    showToast(bankErrorMessage(result && result.code), 'error');
    return;
  }

  els.newFolderName.value = '';
  folderFilterId = result.folder.id;
  currentPage = 0;
  selectedIds.clear();
  await loadWords(true);
  showToast(
    `Created “${result.folder.name}” and set it as your save folder.`,
    'ok',
  );
  els.newFolderName.focus();
}

async function setActiveFolder(folder) {
  if (!bank || !folder || folder.id === state.activeFolderId) return;

  try {
    await bank.setActiveFolder(folder.id);
    state.activeFolderId = folder.id;
    renderFolders();
    showToast(`New words will be saved to “${folder.name}”.`, 'ok');
  } catch (error) {
    showToast(bankErrorMessage(error && error.code), 'error');
    await loadWords(true);
  }
}

async function renameFolder(folder) {
  if (!bank || !folder) return;

  const name = await askFolderName(folder);
  if (name === null) return;
  if (!name) {
    showToast('Folder name cannot be empty.', 'error');
    return;
  }

  let result;
  try {
    result = await bank.renameFolder(folder.id, name);
  } catch (error) {
    result = { ok: false, code: error && error.code };
  }

  if (!result || !result.ok) {
    showToast(bankErrorMessage(result && result.code), 'error');
    return;
  }

  await loadWords(true);
  showToast(`Folder renamed to “${result.folder.name}”.`, 'ok');
}

async function deleteFolder(folder) {
  if (!bank || !folder) return;

  if (folder.id === DEFAULT_FOLDER_ID) {
    showToast(
      `The “${folder.name}” folder is the default folder and cannot be deleted. You can rename it.`,
      'error',
    );
    return;
  }

  const count = wordsForFolder(folder.id).length;
  const generalName = generalFolderName();
  const confirmed = await askConfirm({
    title: `Delete “${folder.name}”?`,
    body: count
      ? `${formatCount(count)} ${plural(
          count,
          'word',
        )} will move to “${generalName}”. The words themselves are not deleted.`
      : 'This empty folder will be removed.',
    confirmLabel: 'Delete folder',
  });
  if (!confirmed) return;

  let result;
  try {
    result = await bank.deleteFolder(folder.id);
  } catch (error) {
    result = { ok: false, code: error && error.code };
  }

  if (!result || !result.ok) {
    showToast(bankErrorMessage(result && result.code), 'error');
    return;
  }

  if (folderFilterId === folder.id) folderFilterId = 'all';
  currentPage = 0;
  selectedIds.clear();
  await loadWords(true);
  showToast(
    result.moved
      ? `Folder deleted; ${formatCount(result.moved)} ${plural(
          result.moved,
          'word',
        )} moved to “${generalName}”.`
      : 'Folder deleted.',
    'ok',
  );
}

async function onFolderAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const row = button.closest('[data-folder-id]');
  if (!row) return;

  const folder = folderById(row.dataset.folderId);
  if (!folder) return;

  switch (button.dataset.action) {
    case 'view':
      folderFilterId = folder.id;
      currentPage = 0;
      selectedIds.clear();
      renderFolders();
      renderWords();
      switchSection('words');
      break;
    case 'save':
      await setActiveFolder(folder);
      break;
    case 'rename':
      await renameFolder(folder);
      break;
    case 'delete':
      await deleteFolder(folder);
      break;
    default:
      break;
  }
}

async function changeActiveFolder() {
  const folderId = els.activeFolder.value;
  const folder = folderById(folderId);
  if (folder) await setActiveFolder(folder);
}

/* ---------- Word actions ---------- */

async function deleteSingleWord(entry) {
  if (!bank) return;

  const confirmed = await askConfirm({
    title: 'Delete this word?',
    body: `“${entry.word} — ${entry.translation}” will be removed from the extension. Export first if you need a copy.`,
    confirmLabel: 'Delete word',
  });
  if (!confirmed) return;

  try {
    const result = await bank.removeWords([entry.id]);
    selectedIds.delete(entry.id);
    await loadWords(true);
    showToast(
      result.removed
        ? 'Word deleted from the extension.'
        : 'That word was already gone.',
      'ok',
    );
  } catch (error) {
    showToast(bankErrorMessage(error && error.code), 'error');
  }
}

async function deleteSelectedWords() {
  if (!bank || selectedIds.size === 0) return;

  const count = selectedIds.size;
  const confirmed = await askConfirm({
    title: `Delete ${formatCount(count)} ${plural(count, 'word')}?`,
    body: 'They will be removed from the extension. Export them first if you need a copy.',
    confirmLabel: 'Delete selected',
  });
  if (!confirmed) return;

  try {
    const result = await bank.removeWords([...selectedIds]);
    selectedIds.clear();
    await loadWords(true);
    showToast(
      `${formatCount(result.removed)} ${plural(
        result.removed,
        'word',
      )} deleted from the extension.`,
      'ok',
    );
  } catch (error) {
    showToast(bankErrorMessage(error && error.code), 'error');
  }
}

async function moveSelectedWords() {
  if (!bank || selectedIds.size === 0) return;

  const folderId = els.moveFolder.value;
  const folder = folderById(folderId);
  if (!folder) return;

  try {
    const result = await bank.moveWords([...selectedIds], folderId);
    await loadWords(true);
    showToast(
      result.moved
        ? `Moved ${formatCount(result.moved)} ${plural(
            result.moved,
            'word',
          )} to “${folder.name}”.`
        : `The selected words are already in “${folder.name}”.`,
      'ok',
    );
  } catch (error) {
    showToast(bankErrorMessage(error && error.code), 'error');
  }
}

async function clearWordsScope() {
  if (!bank) return;

  const words = visibleWords();
  if (!words.length) return;

  const query = els.wordSearch.value.trim();
  const folder =
    folderFilterId === 'all' ? null : folderById(folderFilterId);
  const filters = [];

  if (folder) filters.push(`folder “${folder.name}”`);
  if (query) filters.push(`search “${query}”`);

  const count = words.length;
  const scope = filters.length
    ? `currently shown (${filters.join(', ')})`
    : 'in your word bank';
  const confirmed = await askConfirm({
    title: `Clear ${formatCount(count)} ${plural(count, 'word')}?`,
    body: `Clear ${formatCount(count)} ${plural(
      count,
      'word',
    )} ${scope}? This cannot be undone. Export them first if you need a copy.`,
    confirmLabel: 'Clear words',
  });
  if (!confirmed) return;

  try {
    const result = await bank.removeWords(words.map((entry) => entry.id));
    selectedIds.clear();
    currentPage = 0;
    await loadWords(true);
    showToast(
      result.removed
        ? `Deleted ${formatCount(result.removed)} ${plural(
            result.removed,
            'word',
          )} from the extension.`
        : 'There were no words to delete.',
      'ok',
    );
  } catch (error) {
    showToast(bankErrorMessage(error && error.code), 'error');
  }
}

/* ---------- Export ---------- */

function downloadTextFile(file) {
  const blob = new Blob([file.text], { type: file.mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = file.filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();

  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportWords(words, label) {
  if (!bank) return;
  if (!words.length) {
    showToast('There are no words in this scope to export.', 'error');
    return;
  }

  let file;
  try {
    file = bank.buildExport(words, getExportFormat(), els.exportName.value);
    downloadTextFile(file);
  } catch (error) {
    console.warn('Export failed:', error);
    showToast('Could not prepare the export file. Try again.', 'error');
    return;
  }

  const count = words.length;
  let deleted = 0;

  if (els.deleteAfterExport.checked) {
    try {
      const result = await bank.removeWords(words.map((entry) => entry.id));
      deleted = result.removed;
      for (const entry of words) selectedIds.delete(entry.id);
      await loadWords(true);
    } catch (error) {
      showToast(
        `Downloaded “${file.filename}”, but could not delete the words from the extension. ${bankErrorMessage(
          error && error.code,
        )}`,
        'error',
        10000,
      );
      return;
    }
  }

  showToast(
    deleted
      ? `Downloaded “${file.filename}” (${formatCount(
          count,
        )} ${plural(count, 'word')}) and deleted ${formatCount(
          deleted,
        )} from the extension.`
      : `Downloaded “${file.filename}” (${formatCount(count)} ${plural(
          count,
          'word',
        )}) from ${label}.`,
    'ok',
    10000,
  );
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
    remove.title = `Enable Hassala on ${site}`;
    remove.setAttribute('aria-label', `Remove ${site} from disabled sites`);
    remove.textContent = '×';
    remove.addEventListener('click', () => removeBlockedSite(site));

    row.append(name, remove);
    els.siteList.appendChild(row);
  }
}

async function loadBlockedSites() {
  if (!sitePolicy) {
    if (els.addSite) els.addSite.disabled = true;
    showToast('Could not load site settings. Reload the page.', 'error');
    return;
  }

  const data = await getStorage('blockedSites');
  renderBlockedSites(data.blockedSites);
}

async function addBlockedSite() {
  if (!sitePolicy) return;

  const site = sitePolicy.normalizeSite(els.siteInput.value);
  if (!site) {
    showToast(
      'Enter a valid domain, such as example.com or https://example.com.',
      'error',
    );
    els.siteInput.focus();
    return;
  }

  const data = await getStorage('blockedSites');
  const list = sitePolicy.sanitizeList(data.blockedSites);

  if (list.includes(site)) {
    showToast(`“${site}” is already blocked.`, 'info');
    els.siteInput.select();
    return;
  }

  list.push(site);
  await setStorage({ blockedSites: sitePolicy.sanitizeList(list) });
  els.siteInput.value = '';
  renderBlockedSites(list);
  showToast(
    `Hassala is now disabled on “${site}” and its subdomains.`,
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
  showToast(`Hassala is enabled again on “${site}”.`, 'ok');
}

async function clearBlockedSites() {
  if (blockedSites.length === 0) return;

  const confirmed = await askConfirm({
    title: 'Enable Hassala everywhere?',
    body: 'This clears every blocked site. Hassala will be active on all sites again.',
    confirmLabel: 'Enable on all sites',
    danger: false,
  });
  if (!confirmed) return;

  await removeStorage('blockedSites');
  renderBlockedSites([]);
  showToast('Hassala is enabled on all sites again.', 'ok');
}

/* ---------- Floating button & positions ---------- */

async function toggleFab() {
  const visible = els.fabVisible.checked;
  await setStorage({ fabHidden: !visible });

  showToast(
    visible
      ? 'The floating button will appear on open pages again.'
      : 'The floating button is hidden. You can bring it back from the extension icon in the browser toolbar.',
    'ok',
  );
}

async function resetPanelPosition() {
  await removeStorage('panelPos');
  showToast(
    'The translation panel is back in its default position. If it is open, it will move right away.',
    'ok',
  );
}

async function resetFabPosition() {
  await removeStorage('fabPos');
  showToast(
    'The floating button is back in its original position on open pages.',
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

  wireDialogCancelButtons();
  updateExportExtension();

  const data = await getStorage(['fabHidden']);
  els.fabVisible.checked = !data.fabHidden;

  const hash = location.hash.replace('#', '');
  switchSection(validSection(hash) ? hash : 'words', { updateHash: false });

  await loadWords();
  await loadBlockedSites();
}

/* ---------- Events ---------- */

for (const item of els.navItems) {
  item.addEventListener('click', () => switchSection(item.dataset.section));
}

if (els.brandLink) {
  els.brandLink.addEventListener('click', (event) => {
    event.preventDefault();
    switchSection('words');
  });
}

els.addFolder.addEventListener('click', addFolder);
els.newFolderName.addEventListener('input', updateFolderHint);
els.newFolderName.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    addFolder();
  }
});
els.activeFolder.addEventListener('change', changeActiveFolder);
els.folderList.addEventListener('click', onFolderAction);

els.wordSearch.addEventListener('input', () => {
  currentPage = 0;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderWords, SEARCH_DEBOUNCE_MS);
});
els.wordSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    clearTimeout(searchTimer);
    currentPage = 0;
    renderWords();
  }
});

els.folderFilter.addEventListener('change', () => {
  folderFilterId = els.folderFilter.value;
  currentPage = 0;
  selectedIds.clear();
  renderFolders();
  renderWords();
});

els.sortOrder.addEventListener('change', () => {
  currentPage = 0;
  renderWords();
});

els.selectAllWords.addEventListener('change', () => {
  const pageWords = visibleWords().slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  );

  if (els.selectAllWords.checked) {
    for (const entry of pageWords) selectedIds.add(entry.id);
  } else {
    for (const entry of pageWords) selectedIds.delete(entry.id);
  }
  renderWords();
});

els.wordPrev.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage -= 1;
    renderWords();
  }
});

els.wordNext.addEventListener('click', () => {
  const all = visibleWords();
  if ((currentPage + 1) * PAGE_SIZE < all.length) {
    currentPage += 1;
    renderWords();
  }
});

document.querySelectorAll('input[name="exportFormat"]').forEach((input) => {
  input.addEventListener('change', updateExportExtension);
});

els.exportSelected.addEventListener('click', () => {
  exportWords(
    state.words.filter((entry) => selectedIds.has(entry.id)),
    'selected words',
  );
});
els.exportVisible.addEventListener('click', () => {
  const folder =
    folderFilterId === 'all' ? null : folderById(folderFilterId);
  exportWords(
    visibleWords(),
    folder ? `folder “${folder.name}”` : 'visible words',
  );
});
els.exportAll.addEventListener('click', () => {
  exportWords(state.words, 'all words');
});

els.moveSelected.addEventListener('click', moveSelectedWords);
els.deleteSelected.addEventListener('click', deleteSelectedWords);
els.clearWords.addEventListener('click', clearWordsScope);

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

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;

    if (changes.blockedSites) {
      renderBlockedSites(changes.blockedSites.newValue);
    }

    if (
      changes[bank?.WORDS_KEY || 'wordBank'] ||
      changes[bank?.FOLDERS_KEY || 'wordFolders'] ||
      changes[bank?.ACTIVE_FOLDER_KEY || 'activeFolderId']
    ) {
      loadWords(true);
    }
  });
}

init();
