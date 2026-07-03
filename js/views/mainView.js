// The primary kitchen screen: active bean → tap your name → grind or stars.
import { el } from '../utils/dom.js';
import { STRINGS, MILK_TYPES } from '../constants.js';
import { getActiveBean } from '../db/beans.js';
import { getAllUsers, getLastActiveUserId, setLastActiveUserId } from '../db/users.js';
import { getGrind, setGrind } from '../db/grindSettings.js';
import { addRating, getCurrentRatings } from '../db/ratings.js';
import { CONFIG } from '../constants.js';
import { userSwitcher } from '../components/userSwitcher.js';
import { stepper } from '../components/stepper.js';
import { starRating } from '../components/starRating.js';
import { commentsCard } from './commentChipsView.js';
import { navigate } from './router.js';

function beanHeader(bean) {
  return el('div', { class: 'main-bean' },
    el('div', { class: 'main-bean-name' }, [bean.roastery, bean.name].filter(Boolean).join(' — ')),
    el('div', { class: 'main-bean-origin' },
      bean.origin || '',
      el('button', {
        type: 'button',
        class: 'history-link',
        onClick: () => navigate('history', { beanId: bean.id }),
      }, STRINGS.historyButton),
    ),
  );
}

// The per-user panel re-renders on user switch; bean header and switcher stay.
async function renderUserPanel(panel, bean, userId) {
  const [grindRow, ratings] = await Promise.all([
    getGrind(bean.id, userId),
    getCurrentRatings(bean.id, userId),
  ]);

  const grindCard = el('div', { class: 'card main-card' },
    el('h3', { class: 'section-title' }, STRINGS.grindTitle),
    stepper(grindRow ? grindRow.value : CONFIG.grindDefault, (next) =>
      setGrind(bean.id, userId, next),
    ),
  );

  const ratingRows = MILK_TYPES.map((milk) =>
    el('div', { class: 'rating-row' },
      el('span', { class: 'rating-label' }, milk.label),
      starRating(ratings[milk.id] ? ratings[milk.id].stars : 0, (stars) =>
        addRating(bean.id, userId, milk.id, stars),
      ),
    ),
  );

  const ratingsCard = el('div', { class: 'card main-card' },
    el('h3', { class: 'section-title' }, STRINGS.ratingsTitle),
    ratingRows,
  );

  const leftColumn = el('div', { class: 'main-column' },
    grindCard,
    commentsCard(bean.id, userId),
  );

  panel.replaceChildren(leftColumn, ratingsCard);
}

export async function renderMain(container) {
  const bean = await getActiveBean();

  if (!bean) {
    container.appendChild(
      el('div', { class: 'empty-state' },
        el('p', {}, STRINGS.mainNoActiveBean),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('catalog') },
          STRINGS.mainGoToBeans),
      ),
    );
    return;
  }

  const [users, lastUserId] = await Promise.all([getAllUsers(), getLastActiveUserId()]);
  // Keep the fixed display order from constants, not store order.
  users.sort((a, b) => {
    const order = ['mareike', 'frenzi', 'guest'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  const panel = el('div', { class: 'main-panel' });

  container.appendChild(beanHeader(bean));
  container.appendChild(
    userSwitcher(users, lastUserId, (userId) => {
      setLastActiveUserId(userId);
      renderUserPanel(panel, bean, userId);
    }),
  );
  container.appendChild(panel);

  await renderUserPanel(panel, bean, lastUserId);
}
