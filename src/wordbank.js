'use strict';

/**
 * Hassala's local word bank.
 *
 * Everything here lives in chrome.storage.local. The module never touches the
 * filesystem: exports are plain strings that the options page hands to the
 * browser's normal download flow after an explicit user click.
 *
 * Storage layout:
 *   wordBank       -> [{ id, word, translation, folderId }]
 *   wordFolders    -> [{ id, name }]
 *   activeFolderId -> id of the folder new words are saved into
 *
 * Only the word and its translation are stored for each entry. Direction and
 * dates are intentionally not persisted.
 */

const HassalaWordBank = (() => {
  const WORDS_KEY = 'wordBank';
  const FOLDERS_KEY = 'wordFolders';
  const ACTIVE_FOLDER_KEY = 'activeFolderId';
  const DEFAULT_FOLDER_ID = 'general';
  const DEFAULT_FOLDER_NAME = 'General';
  const MAX_WORDS = 10000;
  const MAX_FOLDERS = 200;
  const MAX_FIELD = 200;
  const MAX_FOLDER_NAME = 60;
  const MAX_FILE_NAME = 80;
  const CONTROL_AND_BIDI =
    /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

  let queue = Promise.resolve();

  function normalizeField(value, max = MAX_FIELD) {
    return String(value ?? '')
      .replace(CONTROL_AND_BIDI, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function createId(prefix = 'w') {
    try {
      if (globalThis.crypto && globalThis.crypto.randomUUID) {
        return `${prefix}_${globalThis.crypto.randomUUID()}`;
      }
    } catch {
      // Fall through to the timestamp-based id.
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
  }

  function sanitizeId(value, prefix = 'w') {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value)
      ? value
      : createId(prefix);
  }

  function storageError(error) {
    const message = String(error?.message || error || '');
    const wrapped = new Error(message || 'storage_error');
    wrapped.code = /quota|QUOTA_BYTES|exceeded/i.test(message)
      ? 'storage_full'
      : 'storage_error';
    return wrapped;
  }

  function storageGet(keys) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(keys, (data) => {
          const error = chrome.runtime.lastError;
          if (error) reject(storageError(error));
          else resolve(data || {});
        });
      } catch (error) {
        reject(storageError(error));
      }
    });
  }

  function storageSet(values) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set(values, () => {
          const error = chrome.runtime.lastError;
          if (error) reject(storageError(error));
          else resolve();
        });
      } catch (error) {
        reject(storageError(error));
      }
    });
  }

  function storageRemove(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.remove(key, () => {
          const error = chrome.runtime.lastError;
          if (error) reject(storageError(error));
          else resolve();
        });
      } catch (error) {
        reject(storageError(error));
      }
    });
  }

  /**
   * Serialize read-modify-write operations so two fast saves cannot overwrite
   * each other.
   */
  function enqueue(task) {
    const run = queue.then(task, task);
    queue = run.catch(() => {});
    return run;
  }

  /* ---------- Sanitizing ---------- */

  function defaultFolder() {
    return {
      id: DEFAULT_FOLDER_ID,
      name: DEFAULT_FOLDER_NAME,
    };
  }

  function sanitizeFolderName(value) {
    return normalizeField(value, MAX_FOLDER_NAME);
  }

  function sanitizeFolder(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const name = sanitizeFolderName(raw.name);
    if (!name) return null;

    return {
      id: sanitizeId(raw.id, 'f'),
      name,
    };
  }

  function sanitizeFolders(value) {
    const list = [];
    const seenIds = new Set();
    const seenNames = new Set();

    if (Array.isArray(value)) {
      for (const raw of value) {
        const folder = sanitizeFolder(raw);
        if (!folder) continue;

        const nameKey = folder.name.toLocaleLowerCase();
        if (seenIds.has(folder.id) || seenNames.has(nameKey)) continue;

        seenIds.add(folder.id);
        seenNames.add(nameKey);
        list.push(folder);
        if (list.length >= MAX_FOLDERS) break;
      }
    }

    if (!seenIds.has(DEFAULT_FOLDER_ID)) {
      list.unshift(defaultFolder());
    }

    return list;
  }

  function sanitizeEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const word = normalizeField(raw.word);
    const translation = normalizeField(raw.translation);
    if (!word || !translation) return null;

    return {
      id: sanitizeId(raw.id),
      word,
      translation,
      folderId:
        typeof raw.folderId === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(raw.folderId)
          ? raw.folderId
          : DEFAULT_FOLDER_ID,
    };
  }

  function sanitizeWords(value) {
    const list = [];
    const seenIds = new Set();

    if (!Array.isArray(value)) return list;

    for (const raw of value) {
      const entry = sanitizeEntry(raw);
      if (!entry || seenIds.has(entry.id)) continue;

      seenIds.add(entry.id);
      list.push(entry);
      if (list.length >= MAX_WORDS) break;
    }

    return list;
  }

  function resolveFolderId(value, folders) {
    const list = sanitizeFolders(folders);
    const exists = list.some((folder) => folder.id === value);
    return exists ? value : DEFAULT_FOLDER_ID;
  }

  /* ---------- Local storage ---------- */

  async function read() {
    const data = await storageGet([
      WORDS_KEY,
      FOLDERS_KEY,
      ACTIVE_FOLDER_KEY,
    ]);

    const folders = sanitizeFolders(data[FOLDERS_KEY]);
    const words = sanitizeWords(data[WORDS_KEY]).map((entry) => ({
      ...entry,
      folderId: resolveFolderId(entry.folderId, folders),
    }));

    return {
      words,
      folders,
      activeFolderId: resolveFolderId(data[ACTIVE_FOLDER_KEY], folders),
    };
  }

  function hasArabic(value) {
    return /[\u0600-\u06FF]/.test(value);
  }

  function hasLatin(value) {
    return /[A-Za-z]/.test(value);
  }

  /**
   * Compare the English/Arabic pair without storing a direction. If one side is
   * Arabic and the other is English, the pair is normalized with the Arabic
   * side first so
   * saving it from the opposite direction still counts as a duplicate.
   */
  function pairKey(entry) {
    const first = entry.word.toLocaleLowerCase();
    const second = entry.translation.toLocaleLowerCase();

    if (hasArabic(first) && hasLatin(second)) return `${first}\u0000${second}`;
    if (hasArabic(second) && hasLatin(first)) return `${second}\u0000${first}`;

    return [first, second].sort().join('\u0000');
  }

  function addToWords(words, input) {
    const entry = sanitizeEntry({
      id: createId(),
      word: input && input.word,
      translation: input && input.translation,
      folderId: input && input.folderId,
    });

    if (!entry) return { ok: false, code: 'invalid' };

    const key = pairKey(entry);
    const existing = words.find((item) => pairKey(item) === key);

    if (existing) {
      return {
        ok: true,
        duplicate: true,
        entry: existing,
        words,
      };
    }

    if (words.length >= MAX_WORDS) {
      return { ok: false, code: 'word_limit' };
    }

    return {
      ok: true,
      duplicate: false,
      entry,
      words: [entry, ...words],
    };
  }

  async function add(input) {
    return enqueue(async () => {
      const state = await read();
      const folderId = resolveFolderId(
        (input && input.folderId) || state.activeFolderId,
        state.folders,
      );

      const result = addToWords(state.words, { ...input, folderId });
      if (!result.ok) return result;

      if (!result.duplicate) {
        await storageSet({ [WORDS_KEY]: result.words });
      }

      return {
        ok: true,
        duplicate: result.duplicate,
        entry: result.entry,
        count: result.words.length,
        folderId,
      };
    });
  }

  async function removeWords(ids) {
    const wanted = new Set(
      Array.isArray(ids)
        ? ids.filter(
            (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id),
          )
        : [],
    );

    if (!wanted.size) return { ok: true, removed: 0, count: null };

    return enqueue(async () => {
      const state = await read();
      const next = state.words.filter((entry) => !wanted.has(entry.id));
      const removed = state.words.length - next.length;

      if (removed) await storageSet({ [WORDS_KEY]: next });
      return { ok: true, removed, count: next.length };
    });
  }

  async function moveWords(ids, folderId) {
    const wanted = new Set(
      Array.isArray(ids)
        ? ids.filter(
            (id) => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id),
          )
        : [],
    );

    return enqueue(async () => {
      const state = await read();
      const target = resolveFolderId(folderId, state.folders);
      let moved = 0;

      const next = state.words.map((entry) => {
        if (!wanted.has(entry.id) || entry.folderId === target) return entry;
        moved += 1;
        return { ...entry, folderId: target };
      });

      if (moved) await storageSet({ [WORDS_KEY]: next });
      return { ok: true, moved, folderId: target, count: next.length };
    });
  }

  async function clear(folderId = '') {
    return enqueue(async () => {
      const state = await read();
      const target =
        typeof folderId === 'string' && folderId
          ? resolveFolderId(folderId, state.folders)
          : '';

      const next = target
        ? state.words.filter((entry) => entry.folderId !== target)
        : [];
      const removed = state.words.length - next.length;

      if (removed) {
        if (next.length) await storageSet({ [WORDS_KEY]: next });
        else await storageRemove(WORDS_KEY);
      }

      return { ok: true, removed, count: next.length };
    });
  }

  async function createFolder(name) {
    const cleanName = sanitizeFolderName(name);
    if (!cleanName) return { ok: false, code: 'invalid_name' };

    return enqueue(async () => {
      const state = await read();
      const duplicate = state.folders.some(
        (folder) =>
          folder.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
      );
      if (duplicate) return { ok: false, code: 'duplicate_name' };
      if (state.folders.length >= MAX_FOLDERS) {
        return { ok: false, code: 'folder_limit' };
      }

      const folder = {
        id: createId('f'),
        name: cleanName,
      };
      const folders = [...state.folders, folder];

      await storageSet({
        [FOLDERS_KEY]: folders,
        [ACTIVE_FOLDER_KEY]: folder.id,
      });

      return {
        ok: true,
        folder,
        folders,
        activeFolderId: folder.id,
      };
    });
  }

  async function renameFolder(folderId, name) {
    const cleanName = sanitizeFolderName(name);
    if (!cleanName) return { ok: false, code: 'invalid_name' };

    return enqueue(async () => {
      const state = await read();
      const target = state.folders.find((folder) => folder.id === folderId);
      if (!target) return { ok: false, code: 'folder_missing' };

      const duplicate = state.folders.some(
        (folder) =>
          folder.id !== folderId &&
          folder.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase(),
      );
      if (duplicate) return { ok: false, code: 'duplicate_name' };

      const folders = state.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: cleanName } : folder,
      );

      await storageSet({ [FOLDERS_KEY]: folders });
      return { ok: true, folder: { ...target, name: cleanName }, folders };
    });
  }

  async function deleteFolder(folderId) {
    if (folderId === DEFAULT_FOLDER_ID) {
      return { ok: false, code: 'protected_folder' };
    }

    return enqueue(async () => {
      const state = await read();
      if (!state.folders.some((folder) => folder.id === folderId)) {
        return { ok: false, code: 'folder_missing' };
      }

      const folders = state.folders.filter(
        (folder) => folder.id !== folderId,
      );
      let moved = 0;

      const words = state.words.map((entry) => {
        if (entry.folderId !== folderId) return entry;
        moved += 1;
        return { ...entry, folderId: DEFAULT_FOLDER_ID };
      });

      const activeFolderId =
        state.activeFolderId === folderId
          ? DEFAULT_FOLDER_ID
          : state.activeFolderId;

      await storageSet({
        [FOLDERS_KEY]: folders,
        [WORDS_KEY]: words,
        [ACTIVE_FOLDER_KEY]: activeFolderId,
      });

      return {
        ok: true,
        removedFolder: folderId,
        moved,
        folders,
        activeFolderId,
      };
    });
  }

  async function setActiveFolder(folderId) {
    return enqueue(async () => {
      const state = await read();
      const target = resolveFolderId(folderId, state.folders);
      await storageSet({ [ACTIVE_FOLDER_KEY]: target });
      return { ok: true, activeFolderId: target };
    });
  }

  /* ---------- Export ---------- */

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function exportStamp(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}_${pad(date.getHours())}${pad(date.getMinutes())}`;
  }

  function escapeMarkdown(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\|/g, '\\|')
      .replace(/`/g, '\\`')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_');
  }

  function csvCell(value) {
    let text = String(value ?? '');
    // Stop spreadsheet apps from treating cell text as a formula.
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  }

  function sanitizeFileName(value, extension) {
    let base = normalizeField(value, MAX_FILE_NAME)
      .replace(/[\\/:*?"<>|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    base = base.replace(new RegExp(`\\.${extension}$`, 'i'), '').trim();
    if (!base || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(base)) {
      base = `hassala-words-${exportStamp()}`;
    }

    return `${base}.${extension}`;
  }

  function buildExport(words, format, fileName = '') {
    const list = sanitizeWords(words);
    const kind = ['markdown', 'text', 'csv', 'json'].includes(format)
      ? format
      : 'markdown';

    if (kind === 'csv') {
      const header = ['Word', 'Translation'];
      const rows = list.map((entry) => [
        csvCell(entry.word),
        csvCell(entry.translation),
      ]);
      const text = [header.map(csvCell).join(','), ...rows.map((row) => row.join(','))]
        .join('\n')
        .concat('\n');

      return {
        // The BOM makes Excel read Arabic (and other UTF-8) correctly.
        text: `\ufeff${text}`,
        mime: 'text/csv;charset=utf-8',
        filename: sanitizeFileName(fileName, 'csv'),
      };
    }

    if (kind === 'json') {
      return {
        text: JSON.stringify(
          list.map((entry) => ({
            word: entry.word,
            translation: entry.translation,
          })),
          null,
          2,
        ),
        mime: 'application/json;charset=utf-8',
        filename: sanitizeFileName(fileName, 'json'),
      };
    }

    if (kind === 'text') {
      const lines = list.map(
        (entry) => `${entry.word} — ${entry.translation}`,
      );

      return {
        text: `${lines.join('\n')}\n`,
        mime: 'text/plain;charset=utf-8',
        filename: sanitizeFileName(fileName, 'txt'),
      };
    }

    const rows = list.map(
      (entry) =>
        `| ${escapeMarkdown(entry.word)} | ${escapeMarkdown(
          entry.translation,
        )} |`,
    );

    const lines = [
      '# Hassala — My words',
      '',
      '| Word | Translation |',
      '| --- | --- |',
      ...rows,
      '',
    ];

    return {
      text: lines.join('\n'),
      mime: 'text/markdown;charset=utf-8',
      filename: sanitizeFileName(fileName, 'md'),
    };
  }

  return Object.freeze({
    WORDS_KEY,
    FOLDERS_KEY,
    ACTIVE_FOLDER_KEY,
    DEFAULT_FOLDER_ID,
    MAX_WORDS,
    MAX_FIELD,
    normalizeField,
    sanitizeFolders,
    resolveFolderId,
    read,
    add,
    removeWords,
    moveWords,
    clear,
    createFolder,
    renameFolder,
    deleteFolder,
    setActiveFolder,
    buildExport,
  });
})();

globalThis.HassalaWordBank = HassalaWordBank;
