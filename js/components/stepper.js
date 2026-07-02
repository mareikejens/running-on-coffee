// Large +/− stepper for grind values. The value updates synchronously so rapid
// tapping never loses increments (<100ms perceived); persistence via onChange
// runs in the background — IndexedDB writes serialize, last write wins.
import { el } from '../utils/dom.js';
import { CONFIG } from '../constants.js';
import { formatGrind } from '../utils/format.js';

function clamp(value) {
  const clamped = Math.min(CONFIG.grindMax, Math.max(CONFIG.grindMin, value));
  return Math.round(clamped * 10) / 10;
}

export function stepper(initialValue, onChange) {
  let value = clamp(initialValue);
  const display = el('div', { class: 'stepper-value' }, formatGrind(value));

  function step(direction) {
    value = clamp(value + direction * CONFIG.grindStep);
    display.textContent = formatGrind(value);
    Promise.resolve(onChange(value)).catch((err) =>
      console.error('Failed to save grind setting:', err),
    );
  }

  return el('div', { class: 'stepper' },
    el('button', { type: 'button', class: 'stepper-btn', onClick: () => step(-1) }, '−'),
    display,
    el('button', { type: 'button', class: 'stepper-btn', onClick: () => step(1) }, '+'),
  );
}
