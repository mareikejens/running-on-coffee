// Registers the service worker and surfaces waiting updates as a tappable
// toast. In practice on the kiosk iPad: deploy, then pull down to reload once.
import { STRINGS } from '../constants.js';
import { qs, el, clear } from '../utils/dom.js';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('sw.js');
    registration.addEventListener('updatefound', () => {
      const incoming = registration.installing;
      if (!incoming) return;
      incoming.addEventListener('statechange', () => {
        // New worker installed while an old one controls the page = update ready.
        if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast();
        }
      });
    });
  } catch (err) {
    // Offline-first still works via cache from a previous registration;
    // log, don't break boot.
    console.error('Service worker registration failed:', err);
  }
}

function showUpdateToast() {
  const root = qs('#toast-root');
  clear(root);
  const node = el('button', {
    type: 'button',
    class: 'toast toast-action',
    onClick: () => location.reload(),
  }, STRINGS.updateReady);
  root.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
}
