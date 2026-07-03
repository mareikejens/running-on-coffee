// Half-star rating built from REAL buttons with visible glyph content.
// Each star is two buttons (left half = n−0.5, right half = n) that clip the
// star glyph — no empty transparent overlays, no clientX math. Empty
// absolutely-positioned buttons proved untappable on iOS Safari (v0.5 bug).
import { el } from '../utils/dom.js';

const STAR = '★';
const MAX = 5;

export function starRating(initialStars, onRate) {
  let stars = initialStars || 0;
  const halves = []; // 10 buttons, values 0.5 … 5.0

  const valueLabel = el('span', { class: 'stars-value' });

  function paint() {
    for (const btn of halves) {
      btn.classList.toggle('is-filled', Number(btn.dataset.value) <= stars);
    }
    valueLabel.textContent = stars ? stars.toFixed(1) : '';
  }

  function rate(next) {
    stars = next;
    paint(); // synchronous feedback, persistence in background
    Promise.resolve(onRate(next)).catch((err) =>
      console.error('Failed to save rating:', err),
    );
  }

  const cells = [];
  for (let n = 1; n <= MAX; n++) {
    const left = el('button', {
      type: 'button',
      class: 'star-half star-half-left',
      dataset: { value: String(n - 0.5) },
      'aria-label': `${n - 0.5} stars`,
      onClick: () => rate(n - 0.5),
    }, el('span', { class: 'star-glyph' }, STAR));
    const right = el('button', {
      type: 'button',
      class: 'star-half star-half-right',
      dataset: { value: String(n) },
      'aria-label': `${n} stars`,
      onClick: () => rate(n),
    }, el('span', { class: 'star-glyph' }, STAR));
    halves.push(left, right);
    cells.push(el('span', { class: 'star-cell' }, left, right));
  }

  paint();
  return el('div', { class: 'stars' }, cells, valueLabel);
}
