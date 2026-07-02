import { qs, el, clear } from '../utils/dom.js';
import { CONFIG } from '../constants.js';

let hideTimer = null;

export function showToast(message) {
  const root = qs('#toast-root');
  clear(root);
  const node = el('div', { class: 'toast' }, message);
  root.appendChild(node);
  // Force a frame so the opacity transition runs.
  requestAnimationFrame(() => node.classList.add('is-visible'));
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => node.classList.remove('is-visible'), CONFIG.toastMs);
}
