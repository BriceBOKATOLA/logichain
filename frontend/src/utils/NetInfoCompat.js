import { API_BASE_URL } from '../config/env';

// Try to use native NetInfo if available in node_modules (works if user installed it),
// otherwise provide a tiny fallback: use navigator.onLine (web) and a periodic HTTP
// ping to the backend `/health` endpoint to detect connectivity changes in React Native.
let NativeNetInfo = null;
try {
  NativeNetInfo = require('@react-native-community/netinfo');
} catch {
  // Le paquet natif n'est pas installé : on bascule sur l'implémentation
  // de repli définie plus bas.
  NativeNetInfo = null;
}

if (NativeNetInfo && NativeNetInfo.addEventListener) {
  module.exports = NativeNetInfo;
} else {
  let current = { isConnected: true };
  let pollInterval = null;
  const listeners = new Set();

  async function httpPing() {
    // Try backend health endpoint first; fall back to a lightweight public URL.
    const urls = [`${API_BASE_URL.replace(/\/api\/v1$/, '')}/health`, 'https://www.google.com/generate_204'];
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-store' });
        if (res && (res.status === 200 || res.status === 204)) return { isConnected: true };
      } catch {
        // URL injoignable : on tente la suivante.
      }
    }
    return { isConnected: false };
  }

  async function startPolling() {
    if (pollInterval) return;
    current =
      typeof navigator !== 'undefined' && 'onLine' in navigator
        ? { isConnected: !!navigator.onLine }
        : await httpPing();
    pollInterval = setInterval(async () => {
      const next =
        typeof navigator !== 'undefined' && 'onLine' in navigator
          ? { isConnected: !!navigator.onLine }
          : await httpPing();
      if (next.isConnected !== current.isConnected) {
        current = next;
        listeners.forEach((h) => {
          try {
            h(current);
          } catch {
            // Un abonné qui lève ne doit pas empêcher les autres d'être notifiés.
          }
        });
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  module.exports = {
    addEventListener(handler) {
      listeners.add(handler);
      (async () => {
        const s =
          typeof navigator !== 'undefined' && 'onLine' in navigator
            ? { isConnected: !!navigator.onLine }
            : await httpPing();
        current = s;
        try {
          handler(s);
        } catch {
          // Idem : l'erreur d'un abonné ne doit pas casser l'abonnement.
        }
      })();
      startPolling();
      return () => {
        listeners.delete(handler);
        if (listeners.size === 0) stopPolling();
      };
    },
    async fetch() {
      return typeof navigator !== 'undefined' && 'onLine' in navigator
        ? { isConnected: !!navigator.onLine }
        : await httpPing();
    },
  };
}
