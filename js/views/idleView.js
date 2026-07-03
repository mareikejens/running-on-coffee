// The "painting" — what the kitchen sees 95% of the time. Typography only,
// zero animation. Shows the active bean and both flatmates' current grind
// and ratings. Re-rendered fresh each time idle begins.
import { el, clear } from '../utils/dom.js';
import { STRINGS, MILK_TYPES, ROAST_STYLES } from '../constants.js';
import { getCurrentBean, getOpenBeans } from '../db/beans.js';
import { getGrindsForBean } from '../db/grindSettings.js';
import { getCurrentRatingsForBean } from '../db/ratings.js';
import { formatGrind } from '../utils/format.js';

const PAINTING_USERS = ['mareike', 'frenzi']; // guests don't hang in the painting

function starsText(stars) {
  return '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '');
}

function userColumn(displayName, grindRow, userRatings) {
  const ratingLines = MILK_TYPES
    .filter((milk) => userRatings && userRatings[milk.id])
    .map((milk) =>
      el('div', { class: 'idle-rating-line' },
        el('span', { class: 'idle-rating-milk' }, milk.label),
        el('span', { class: 'idle-rating-stars' }, starsText(userRatings[milk.id].stars)),
      ),
    );

  return el('div', { class: 'idle-user' },
    el('div', { class: 'idle-user-name' }, displayName),
    el('div', { class: 'idle-user-grind' },
      grindRow ? formatGrind(grindRow.value) : '—',
      el('span', { class: 'idle-user-grind-label' }, STRINGS.idleGrindLabel),
    ),
    ratingLines.length > 0
      ? ratingLines
      : el('div', { class: 'idle-rating-line idle-rating-none' }, STRINGS.idleNotRated),
  );
}

export async function renderIdle(container) {
  clear(container);
  const bean = await getCurrentBean();

  if (!bean) {
    container.appendChild(
      el('div', { class: 'idle-content' },
        el('div', { class: 'idle-kicker' }, STRINGS.appTitle),
        el('div', { class: 'idle-bean-name idle-empty' }, STRINGS.idleNoBean),
      ),
    );
    return;
  }

  const [grinds, ratings, openBeans] = await Promise.all([
    getGrindsForBean(bean.id),
    getCurrentRatingsForBean(bean.id),
    getOpenBeans(),
  ]);
  const otherOpen = openBeans
    .filter((b) => b.id !== bean.id)
    .map((b) => [b.roastery, b.name].filter(Boolean).join(' — '));
  const grindByUser = {};
  for (const row of grinds) grindByUser[row.userId] = row;

  const roast = ROAST_STYLES.find((r) => r.id === bean.roastStyle);
  const metaLine = [bean.origin, roast ? roast.label : ''].filter(Boolean).join(' · ');

  const names = { mareike: 'Mareike', frenzi: 'Frenzi' };

  container.appendChild(
    el('div', { class: 'idle-content' },
      el('div', { class: 'idle-kicker' }, STRINGS.idleKicker),
      el('div', { class: 'idle-bean-name' },
        [bean.roastery, bean.name].filter(Boolean).join(' — ')),
      metaLine ? el('div', { class: 'idle-bean-meta' }, metaLine) : null,
      el('div', { class: 'idle-divider' }),
      el('div', { class: 'idle-users' },
        PAINTING_USERS.map((userId) =>
          userColumn(names[userId], grindByUser[userId], ratings[userId]),
        ),
      ),
      otherOpen.length > 0
        ? el('div', { class: 'idle-also-open' }, STRINGS.idleAlsoOpen(otherOpen.join(' · ')))
        : null,
    ),
  );
}
