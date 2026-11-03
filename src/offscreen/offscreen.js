'use strict';

/**
 * Offscreen document: plays pronunciation audio without being tied to a page
 * or to the popup. The page CSP cannot block audio played from here.
 */

let currentAudio = null;
let currentUrl = null;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.target !== 'offscreen') return false;

  if (message.type === 'play') {
    play(message.audio, message.mime)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        stop();
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }

  if (message.type === 'stop') {
    stop();
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

async function play(base64, mime) {
  stop();

  if (typeof base64 !== 'string' || !base64) {
    throw new Error('missing audio');
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mime || 'audio/mpeg' });
  currentUrl = URL.createObjectURL(blob);
  currentAudio = new Audio(currentUrl);

  currentAudio.onended = () => {
    notify(false);
    cleanup();
  };

  currentAudio.onerror = () => {
    notify(false);
    cleanup();
  };

  await currentAudio.play();
  notify(true);
}

function stop() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {
      // Ignore a partially-created audio element.
    }
  }

  cleanup();
  notify(false);
}

function cleanup() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = null;
  }
  currentAudio = null;
}

function notify(playing) {
  try {
    chrome.runtime.sendMessage({ type: 'ttsState', playing }, () => {
      void chrome.runtime.lastError;
    });
  } catch {
    // The extension may be reloading.
  }
}
