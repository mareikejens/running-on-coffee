// The "painting" — what the kitchen sees 95% of the time. Zero animation.
// Shows the bag cut-out (when one was photographed) floating beside the
// current bean's name and both flatmates' verdicts. Grind numbers live on
// the main screen only — the painting is for recognizing and remembering
// the bean, not for dialing it in.
import { el, clear } from '../utils/dom.js';
import { STRINGS, MILK_TYPES, ROAST_STYLES } from '../constants.js';
import { getCurrentBean, getOpenBeans } from '../db/beans.js';
import { getCurrentRatingsForBean } from '../db/ratings.js';
import { getPhotoUrl } from '../db/photos.js';

const PAINTING_USERS = ['mareike', 'frenzi']; // guests don't hang in the painting

function starsText(stars) {
  return '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '');
}

function userColumn(displayName, userRatings) {
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

  const [ratings, openBeans, photoUrl] = await Promise.all([
    getCurrentRatingsForBean(bean.id),
    getOpenBeans(),
    getPhotoUrl(bean.id),
  ]);
  const otherOpen = openBeans
    .filter((b) => b.id !== bean.id)
    .map((b) => [b.roastery, b.name].filter(Boolean).join(' — '));

  const roast = ROAST_STYLES.find((r) => r.id === bean.roastStyle);
  const metaLine = [bean.origin, roast ? roast.label : ''].filter(Boolean).join(' · ');

  const names = { mareike: 'Mareike', frenzi: 'Frenzi' };

  const textBlock = el('div', { class: 'idle-text' },
    el('div', { class: 'idle-kicker' }, STRINGS.idleKicker),
    el('div', { class: 'idle-bean-name' },
      [bean.roastery, bean.name].filter(Boolean).join(' — ')),
    metaLine ? el('div', { class: 'idle-bean-meta' }, metaLine) : null,
    el('div', { class: 'idle-divider' }),
    el('div', { class: 'idle-users' },
      PAINTING_USERS.map((userId) => userColumn(names[userId], ratings[userId])),
    ),
    otherOpen.length > 0
      ? el('div', { class: 'idle-also-open' }, STRINGS.idleAlsoOpen(otherOpen.join(' · ')))
      : null,
  );

  // With a photo: bag cut-out beside the text, a two-part composition.
  // Without: the text keeps the original centered layout.
  container.appendChild(
    el('div', { class: `idle-content${photoUrl ? ' has-photo' : ''}` },
      photoUrl
        ? el('div', { class: 'idle-photo' }, el('img', { src: photoUrl, alt: '' }))
        : null,
      textBlock,
    ),
  );
}
