'use strict';

/**
 * Keyboard isolation for the floating panel.
 *
 * The panel lives in a closed shadow root. Outside that root every keyboard
 * event is retargeted to the host element, so sites such as YouTube cannot see
 * that a textarea is focused and run their player shortcuts (Space pauses,
 * arrows seek). Listeners registered at document_idle are too late because the
 * page has usually registered its own window-capture handlers first.
 *
 * This file runs at document_start, before page scripts. It stays dormant
 * until floating.js mounts and then keeps page shortcuts from receiving keys
 * that belong to the panel. The browser still performs the normal editing
 * action: stopping propagation does not cancel the default action, so typing,
 * caret movement, selection, undo, and IME composition keep working.
 */
(() => {
  if (globalThis.__AET_KEYBOARD_GUARD__) return;

  const KEY_EVENTS = ['keydown', 'keypress', 'keyup'];
  let host = null;
  let focused = null;
  let onKeyDown = null;

  function isPanelEvent(event) {
    return Boolean(host && event.target === host);
  }

  function isPanelFocused() {
    if (!host || !host.isConnected || typeof focused !== 'function') {
      return false;
    }

    try {
      return Boolean(focused());
    } catch {
      return false;
    }
  }

  function handle(event) {
    if (!isPanelEvent(event) || !isPanelFocused()) return;

    try {
      if (event.type === 'keydown' && event.isTrusted && onKeyDown) {
        onKeyDown(event);
      }
    } finally {
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }

  for (const type of KEY_EVENTS) {
    window.addEventListener(type, handle, true);
  }

  globalThis.__AET_KEYBOARD_GUARD__ = {
    mount(options) {
      host = options.host;
      focused = options.focused;
      onKeyDown = options.onKeyDown;
    },
  };
})();
