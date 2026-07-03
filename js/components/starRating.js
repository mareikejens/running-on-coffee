// Half-star precision rating with wet-finger-sized targets. Each star is one
// large button; tapping its left half = n−0.5, right half = n. The fill is an
// accent overlay clipped to a percentage width — updating it touches only one
// inline style.
import { el } from '../utils/dom.js';

const STAR = '★';
const MAX = 5;

export function starRating(initialStars, onRate) {
  let stars = initialStars || 0;

  const fillRow = el('div', { class: 'stars-fill' }, STAR.repeat(MAX));
  const baseRow = el('div', { class: 'stars-base' }, STAR.repeat(MAX));

  function paint() {
    fillRow.style.width = `${(stars / MAX) * 100}%`;
  }
  paint();

  const hitAreas = [];
  for (let n = 1; n <= MAX; n++) {
    hitAreas.push(
      el('button', {
        type: 'button',
        class: 'star-hit',
        'aria-label': `${n} stars`,
        onClick: async (event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const leftHalf = event.clientX - rect.left < rect.width / 2;
          const next = leftHalf ? n - 0.5 : n;
          stars = next;
          paint();
          await onRate(next);
        },
      }),
    );
  }

  return el('div', { class: 'stars' },
    el('div', { class: 'stars-visual' }, baseRow, fillRow),
    el('div', { class: 'stars-hits' }, hitAreas),
  );
}
