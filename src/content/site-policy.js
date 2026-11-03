'use strict';

/**
 * Shared per-site blocklist policy.
 *
 * Loaded before floating.js and youtube.js in the page, imported by the
 * background service worker, and included by the options page. Keeping the
 * normalization/matching here means every surface agrees on what "example.com"
 * covers (the domain itself and all of its subdomains).
 */
(() => {
  if (globalThis.__AET_SITE_POLICY__) return;

  const STORAGE_KEY = 'blockedSites';
  const MAX_SITE_LENGTH = 253;

  /**
   * Turn user input into a bare lowercase hostname.
   *
   * Accepted forms:
   *   example.com
   *   www.example.com        -> example.com
   *   *.example.com          -> example.com
   *   https://example.com/x  -> example.com
   *   example.com:8080       -> example.com
   *   127.0.0.1              -> 127.0.0.1
   *   localhost              -> localhost
   *
   * Returns '' for anything that is not a usable site.
   */
  function normalizeSite(raw) {
    let value = String(raw ?? '')
      .trim()
      .toLowerCase();

    if (!value) return '';

    value = value.replace(/^\*\./, '');

    // A non-HTTP scheme (chrome://, javascript:, data:, ...) is not a site the
    // content script can run on. Reject it instead of guessing a hostname.
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
      return '';
    }

    if (!/^https?:\/\//i.test(value)) {
      value = value.replace(/^\/\//, '');
      value = `https://${value}`;
    }

    let hostname;
    try {
      hostname = new URL(value).hostname;
    } catch {
      return '';
    }

    hostname = hostname
      .toLowerCase()
      .replace(/\.+$/, '')
      .replace(/^www\./, '');

    if (!hostname || hostname.length > MAX_SITE_LENGTH) return '';

    // IPv6 literals keep their brackets so suffix matching is never applied.
    if (hostname.startsWith('[')) return hostname;

    if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(hostname)) return '';

    // A single label like "com" would block an entire TLD; only localhost is
    // allowed without a dot.
    if (!hostname.includes('.') && hostname !== 'localhost') return '';

    return hostname;
  }

  function sanitizeList(value) {
    if (!Array.isArray(value)) return [];

    const sites = [];
    for (const item of value) {
      const site = normalizeSite(item);
      if (site && !sites.includes(site)) sites.push(site);
    }

    sites.sort();
    return sites;
  }

  function isBlockedHost(hostname, list) {
    const host = normalizeSite(hostname);
    if (!host || !Array.isArray(list)) return false;

    for (const item of list) {
      const site = normalizeSite(item);
      if (!site) continue;
      if (host === site) return true;

      // "example.com" covers "www.example.com" and "m.example.com" too.
      if (!site.startsWith('[') && host.endsWith(`.${site}`)) return true;
    }

    return false;
  }

  function readBlockedSites(callback) {
    const done = typeof callback === 'function' ? callback : () => {};

    try {
      chrome.storage.local.get([STORAGE_KEY], (data) => {
        if (chrome.runtime.lastError) {
          done([]);
          return;
        }

        done(sanitizeList(data && data[STORAGE_KEY]));
      });
    } catch {
      done([]);
    }
  }

  function watchBlockedSites(callback) {
    if (typeof callback !== 'function') return;

    try {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes[STORAGE_KEY]) return;
        callback(sanitizeList(changes[STORAGE_KEY].newValue));
      });
    } catch {
      // Storage events are unavailable in a stale extension context.
    }
  }

  globalThis.__AET_SITE_POLICY__ = {
    STORAGE_KEY,
    normalizeSite,
    sanitizeList,
    isBlockedHost,
    readBlockedSites,
    watchBlockedSites,
  };
})();
