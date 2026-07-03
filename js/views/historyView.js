// Per-bean history: the dial-in journey (all rating changes, oldest first)
// plus all comments (newest first). Reached from the main screen or catalog.
import { el } from '../utils/dom.js';
import { STRINGS, MILK_TYPES } from '../constants.js';
import { getBean, getCurrentBean } from '../db/beans.js';
import { getRatingHistory } from '../db/ratings.js';
import { getCommentsForBean } from '../db/comments.js';
import { getAllUsers } from '../db/users.js';
import { formatDate } from '../utils/format.js';
import { navigate } from './router.js';

function starsText(stars) {
  return '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '');
}

export async function renderHistory(container, params = {}) {
  const bean = params.beanId ? await getBean(params.beanId) : await getCurrentBean();

  if (!bean) {
    container.appendChild(
      el('div', { class: 'empty-state' },
        el('p', {}, STRINGS.historyNoBean),
        el('button', { class: 'btn btn-primary', onClick: () => navigate('catalog') },
          STRINGS.mainGoToBeans),
      ),
    );
    return;
  }

  const [ratings, comments, users] = await Promise.all([
    getRatingHistory(bean.id),
    getCommentsForBean(bean.id),
    getAllUsers(),
  ]);

  const userName = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.displayName : id;
  };
  const milkLabel = (id) => {
    const milk = MILK_TYPES.find((m) => m.id === id);
    return milk ? milk.label : id;
  };

  container.appendChild(
    el('div', { class: 'history-header' },
      el('button', { class: 'btn', onClick: () => navigate('main') }, STRINGS.historyBack),
      el('div', { class: 'history-bean' },
        el('div', { class: 'bean-row-name' }, [bean.roastery, bean.name].filter(Boolean).join(' — ')),
        el('div', { class: 'bean-row-meta' }, bean.origin || ''),
      ),
    ),
  );

  const columns = el('div', { class: 'history-columns' });

  // Ratings journey — oldest first so the dial-in reads top to bottom.
  const ratingsCol = el('div', { class: 'card history-col' },
    el('h3', { class: 'section-title' }, STRINGS.historyRatingsTitle),
  );
  if (ratings.length === 0) {
    ratingsCol.appendChild(el('p', { class: 'settings-note' }, STRINGS.historyNoRatings));
  } else {
    for (const row of ratings) {
      ratingsCol.appendChild(
        el('div', { class: 'history-row' },
          el('span', { class: 'history-stars' }, starsText(row.stars)),
          el('span', { class: 'history-what' }, `${userName(row.userId)} · ${milkLabel(row.milkType)}`),
          el('span', { class: 'history-when' }, formatDate(row.createdAt)),
        ),
      );
    }
  }

  // Comments — newest first.
  const commentsCol = el('div', { class: 'card history-col' },
    el('h3', { class: 'section-title' }, STRINGS.historyCommentsTitle),
  );
  if (comments.length === 0) {
    commentsCol.appendChild(el('p', { class: 'settings-note' }, STRINGS.historyNoComments));
  } else {
    for (const row of comments) {
      commentsCol.appendChild(
        el('div', { class: 'history-comment' },
          el('div', { class: 'history-comment-text' }, `“${row.text}”`),
          el('div', { class: 'history-when' }, `${userName(row.userId)} · ${formatDate(row.createdAt)}`),
        ),
      );
    }
  }

  columns.appendChild(ratingsCol);
  columns.appendChild(commentsCol);
  container.appendChild(columns);
}
