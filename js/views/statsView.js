// Insights: per-user favorites per milk type across all beans ever rated
// (archived included — history never dies), plus a few house stats.
import { el } from '../utils/dom.js';
import { STRINGS, MILK_TYPES } from '../constants.js';
import { getAllBeans } from '../db/beans.js';
import { getAllCurrentRatings } from '../db/ratings.js';
import { getAllUsers } from '../db/users.js';

const STAT_USERS = ['mareike', 'frenzi']; // guest is a shared pseudo-user

function starsText(stars) {
  return '★'.repeat(Math.floor(stars)) + (stars % 1 ? '½' : '');
}

export async function renderStats(container) {
  const [beans, ratings, users] = await Promise.all([
    getAllBeans(),
    getAllCurrentRatings(),
    getAllUsers(),
  ]);

  const beanById = new Map(beans.map((b) => [b.id, b]));
  const beanLabel = (id) => {
    const bean = beanById.get(id);
    return bean ? [bean.roastery, bean.name].filter(Boolean).join(' — ') : '?';
  };
  const nameOf = (id) => {
    const user = users.find((u) => u.id === id);
    return user ? user.displayName : id;
  };

  if (ratings.length === 0) {
    container.appendChild(
      el('div', { class: 'empty-state' }, el('p', {}, STRINGS.statsEmpty)),
    );
    return;
  }

  const columns = el('div', { class: 'history-columns' });

  // Per-user favorites: best current rating per milk type.
  for (const userId of STAT_USERS) {
    const mine = ratings.filter((r) => r.userId === userId);
    const card = el('div', { class: 'card history-col' },
      el('h3', { class: 'section-title' }, STRINGS.statsUserTitle(nameOf(userId))),
    );
    let any = false;
    for (const milk of MILK_TYPES) {
      const best = mine
        .filter((r) => r.milkType === milk.id)
        .sort((a, b) => b.stars - a.stars || b.createdAt.localeCompare(a.createdAt))[0];
      if (!best) continue;
      any = true;
      card.appendChild(
        el('div', { class: 'stat-line' },
          el('span', { class: 'stat-milk' }, milk.label),
          el('span', { class: 'stat-bean' }, beanLabel(best.beanId)),
          el('span', { class: 'stat-stars' }, starsText(best.stars)),
        ),
      );
    }
    if (!any) card.appendChild(el('p', { class: 'settings-note' }, STRINGS.statsUserEmpty));
    columns.appendChild(card);
  }
  container.appendChild(columns);

  // House stats.
  const ratedBeanIds = new Set(ratings.map((r) => r.beanId));
  const top = ratings.slice().sort((a, b) => b.stars - a.stars || b.createdAt.localeCompare(a.createdAt))[0];
  const topMilk = MILK_TYPES.find((m) => m.id === top.milkType);
  container.appendChild(
    el('div', { class: 'card stats-house' },
      el('h3', { class: 'section-title' }, STRINGS.statsHouseTitle),
      el('div', { class: 'stat-line' },
        el('span', { class: 'stat-milk' }, STRINGS.statsHouseChampion),
        el('span', { class: 'stat-bean' },
          `${beanLabel(top.beanId)} (${nameOf(top.userId)}, ${topMilk ? topMilk.label : top.milkType})`),
        el('span', { class: 'stat-stars' }, starsText(top.stars)),
      ),
      el('div', { class: 'stat-line' },
        el('span', { class: 'stat-milk' }, STRINGS.statsHouseTried),
        el('span', { class: 'stat-bean' }, String(beanById.size)),
        el('span', { class: 'stat-stars' }, ''),
      ),
      el('div', { class: 'stat-line' },
        el('span', { class: 'stat-milk' }, STRINGS.statsHouseRated),
        el('span', { class: 'stat-bean' }, String(ratedBeanIds.size)),
        el('span', { class: 'stat-stars' }, ''),
      ),
    ),
  );
}
