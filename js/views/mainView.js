// The primary kitchen screen: active bean with its bag cut-out, one shared
// grind dial and notes card, and per-user star ratings behind the name tabs —
// only taste stays personal (since v0.12).
import { el } from '../utils/dom.js';
import { STRINGS, MILK_TYPES } from '../constants.js';
import { getCurrentBean, getOpenBeans, selectCurrentBean } from '../db/beans.js';
import { getAllUsers, getLastActiveUserId, setLastActiveUserId } from '../db/users.js';
import { getGrind, setGrind } from '../db/grindSettings.js';
import { addRating, getCurrentRatings } from '../db/ratings.js';
import { getPhotoUrl, getAllPhotoUrls } from '../db/photos.js';
import { CONFIG } from '../constants.js';
import { userSwitcher } from '../components/userSwitcher.js';
import { stepper } from '../components/stepper.js';
import { starRating } from '../components/starRating.js';
import { commentsCard } from './commentChipsView.js';
import { navigate } from './router.js';

// Hero: the bag cut-out (when photographed) floats on an accent halo beside
// the bean name — the same bag you see in the painting and on the shelf.
function beanHero(bean, photoUrl) {
  return el('div', { class: `main-bean${photoUrl ? ' has-photo' : ''}` },
    photoUrl
      ? el('div', { class: 'main-bean-photo' }, el('img', { src: photoUrl, alt: '' }))
      : null,
    el('div', { class: 'main-bean-text' },
      el('div', { class: 'main-bean-name' }, [bean.roastery, bean.name].filter(Boolean).join(' — ')),
      el('div', { class: 'main-bean-origin' }, bean.origin || ''),
    ),
    el('button', {
      type: 'button',
      class: 'btn main-history-btn',
      onClick: () => navigate('history', { beanId: bean.id }),
    }, STRINGS.historyButton),
  );
}

// Ratings are the one thing that stays personal — the user tabs live inside
// this card and only swap the star rows.
function ratingsCard(bean, users, initialUserId, onUserChange) {
  const rowsBox = el('div', { class: 'rating-rows' });

  async function renderRows(userId) {
    const ratings = await getCurrentRatings(bean.id, userId);
    rowsBox.replaceChildren(
      ...MILK_TYPES.map((milk) =>
        el('div', { class: 'rating-row' },
          el('span', { class: 'rating-label' }, milk.label),
          starRating(ratings[milk.id] ? ratings[milk.id].stars : 0, (stars) =>
            addRating(bean.id, userId, milk.id, stars),
          ),
        ),
      ),
    );
  }

  renderRows(initialUserId);

  return el('div', { class: 'card main-card ratings-card' },
    el('h3', { class: 'section-title' }, STRINGS.ratingsTitle),
    userSwitcher(users, initialUserId, (userId) => {
      onUserChange(userId);
      renderRows(userId);
    }),
    rowsBox,
  );
}

// One-tap switcher between open bags. Always visible once anything is open —
// the trailing "+ Open bag" chip makes the multi-bag feature discoverable.
function beanBar(openBeans, currentId, photoUrls) {
  return el('div', { class: 'bean-bar' },
    openBeans.map((bean) =>
      el('button', {
        type: 'button',
        class: `bean-bar-chip${bean.id === currentId ? ' is-selected' : ''}`,
        onClick: async () => {
          if (bean.id === currentId) return;
          await selectCurrentBean(bean.id);
          navigate('main');
        },
      },
        photoUrls.get(bean.id)
          ? el('img', { class: 'bean-bar-thumb', src: photoUrls.get(bean.id), alt: '' })
          : null,
        el('span', { class: 'bean-bar-label' },
          [bean.roastery, bean.name].filter(Boolean).join(' — ')),
      ),
    ),
    el('button', {
      type: 'button',
      class: 'bean-bar-chip bean-bar-add',
      onClick: () => navigate('catalog'),
    }, STRINGS.beanBarOpenAnother),
  );
}

export async function renderMain(container) {
  const [bean, openBeans] = await Promise.all([getCurrentBean(), getOpenBeans()]);

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

  openBeans.sort((a, b) => a.dateAdded.localeCompare(b.dateAdded));

  const [users, lastUserId, grindRow, photoUrl, photoUrls] = await Promise.all([
    getAllUsers(),
    getLastActiveUserId(),
    getGrind(bean.id),
    getPhotoUrl(bean.id),
    getAllPhotoUrls(),
  ]);
  // Keep the fixed display order from constants, not store order.
  users.sort((a, b) => {
    const order = ['mareike', 'frenzi', 'guest'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  // Notes are shared but signed — attribute them to whoever is on the tabs.
  let activeUserId = users.some((u) => u.id === lastUserId) ? lastUserId : users[0].id;

  const grindCard = el('div', { class: 'card main-card' },
    el('h3', { class: 'section-title' }, STRINGS.grindTitle),
    stepper(grindRow ? grindRow.value : CONFIG.grindDefault, (next) =>
      setGrind(bean.id, next),
    ),
    el('p', { class: 'card-note' }, STRINGS.grindSharedNote),
  );

  const leftColumn = el('div', { class: 'main-column' },
    grindCard,
    commentsCard(bean.id, () => activeUserId),
  );

  const rightColumn = ratingsCard(bean, users, activeUserId, (userId) => {
    activeUserId = userId;
    setLastActiveUserId(userId);
  });

  container.appendChild(beanBar(openBeans, bean.id, photoUrls));
  container.appendChild(beanHero(bean, photoUrl));
  container.appendChild(el('div', { class: 'main-panel' }, leftColumn, rightColumn));
}
