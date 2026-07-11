// Bean catalog: open bags on top, sealed stock below, finished beans at the
// bottom. Which open bag is being BREWED is chosen on the main screen.
import { el } from '../utils/dom.js';
import { STRINGS, COMPOSITIONS, ROAST_STYLES, CONFIG } from '../constants.js';
import {
  BEAN_STATE,
  getAllBeans,
  openBean,
  archiveBean,
  restockBean,
} from '../db/beans.js';
import { getMeta } from '../db/meta.js';
import { getAllPhotoUrls } from '../db/photos.js';
import { navigate } from './router.js';
import { showToast } from '../components/toast.js';

function beanLabel(bean) {
  return [bean.roastery, bean.name].filter(Boolean).join(' — ');
}

// Bag cut-out thumbnail, or the bean's initial as a quiet placeholder.
function beanThumb(bean, photoUrl) {
  if (photoUrl) return el('img', { class: 'bean-thumb', src: photoUrl, alt: '' });
  const initial = (beanLabel(bean).trim()[0] || '·').toUpperCase();
  return el('span', { class: 'bean-thumb bean-thumb-empty' }, initial);
}

function beanMeta(bean) {
  const comp = COMPOSITIONS.find((c) => c.id === bean.composition.type);
  const compLabel =
    bean.composition.type === 'arabicaRobusta' && bean.composition.ratio
      ? `Arabica–Robusta ${bean.composition.ratio}`
      : comp
        ? comp.label
        : '';
  const roast = ROAST_STYLES.find((r) => r.id === bean.roastStyle);
  const price = typeof bean.pricePerKg === 'number'
    ? `${CONFIG.currency} ${bean.pricePerKg.toFixed(2)} / kg`
    : '';
  return [bean.origin, compLabel, roast ? roast.label : '', price, bean.purchasePlace || '']
    .filter(Boolean)
    .join(' · ');
}

function beanRow(bean, photoUrl, actions) {
  return el(
    'li',
    { class: 'bean-row' },
    el(
      'button',
      {
        type: 'button',
        class: 'bean-row-info',
        onClick: () => navigate('history', { beanId: bean.id }),
      },
      beanThumb(bean, photoUrl),
      el('div', { class: 'bean-row-text' },
        el('div', { class: 'bean-row-name' }, beanLabel(bean)),
        el('div', { class: 'bean-row-meta' }, beanMeta(bean)),
      ),
    ),
    el('div', { class: 'bean-row-actions' }, actions),
  );
}

async function rerender() {
  await navigate('catalog');
}

export async function renderCatalog(container) {
  const [beans, currentId, photoUrls] = await Promise.all([
    getAllBeans(),
    getMeta('activeBeanId'),
    getAllPhotoUrls(),
  ]);
  beans.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));

  const open = beans.filter((b) => b.state === BEAN_STATE.OPEN);
  const stock = beans.filter((b) => b.state === BEAN_STATE.IN_STOCK);
  const archived = beans.filter((b) => b.state === BEAN_STATE.ARCHIVED);

  container.appendChild(
    el('button', { class: 'btn btn-primary btn-block', onClick: () => navigate('add-bean') },
      STRINGS.catalogAddBean),
  );

  if (beans.length === 0) {
    container.appendChild(
      el('div', { class: 'empty-state' }, el('p', {}, STRINGS.catalogEmpty)),
    );
    return;
  }

  container.appendChild(el('h2', { class: 'section-title' }, STRINGS.catalogOpenTitle));
  if (open.length > 0) {
    container.appendChild(
      el('div', { class: 'card' },
        el('ul', {},
          open.map((bean) =>
            beanRow(bean, photoUrls.get(bean.id), [
              bean.id === currentId
                ? el('span', { class: 'badge badge-active' }, STRINGS.badgeBrewing)
                : null,
              el('button', {
                class: 'btn',
                onClick: () => navigate('edit-bean', { beanId: bean.id }),
              }, STRINGS.actionEdit),
              el('button', {
                class: 'btn',
                onClick: async () => {
                  await restockBean(bean.id);
                  showToast(STRINGS.beanRestocked);
                  rerender();
                },
              }, STRINGS.actionRestock),
              el('button', {
                class: 'btn btn-danger',
                onClick: async () => {
                  await archiveBean(bean.id);
                  showToast(STRINGS.beanArchived);
                  rerender();
                },
              }, STRINGS.actionArchive),
            ]),
          ),
        ),
      ),
    );
  } else {
    container.appendChild(
      el('div', { class: 'card' },
        el('p', { class: 'settings-note' }, STRINGS.catalogNoOpen)),
    );
  }

  if (stock.length > 0) {
    container.appendChild(el('h2', { class: 'section-title' }, STRINGS.catalogStockTitle));
    container.appendChild(
      el('div', { class: 'card' },
        el('ul', {},
          stock.map((bean) =>
            beanRow(bean, photoUrls.get(bean.id), [
              el('button', {
                class: 'btn',
                onClick: () => navigate('edit-bean', { beanId: bean.id }),
              }, STRINGS.actionEdit),
              el('button', {
                class: 'btn',
                onClick: async () => {
                  await openBean(bean.id);
                  showToast(STRINGS.beanOpened);
                  rerender();
                },
              }, STRINGS.actionOpenBag),
              el('button', {
                class: 'btn btn-danger',
                onClick: async () => {
                  await archiveBean(bean.id);
                  showToast(STRINGS.beanArchived);
                  rerender();
                },
              }, STRINGS.actionArchive),
            ]),
          ),
        ),
      ),
    );
  }

  if (archived.length > 0) {
    container.appendChild(el('h2', { class: 'section-title' }, STRINGS.catalogArchivedTitle));
    container.appendChild(
      el('div', { class: 'card' },
        el('ul', {},
          archived.map((bean) =>
            beanRow(bean, photoUrls.get(bean.id), [
              el('span', { class: 'badge badge-archived' }, STRINGS.badgeArchived),
              el('button', {
                class: 'btn',
                onClick: () => navigate('edit-bean', { beanId: bean.id }),
              }, STRINGS.actionEdit),
              el('button', {
                class: 'btn',
                onClick: async () => {
                  await restockBean(bean.id);
                  showToast(STRINGS.beanRestocked);
                  rerender();
                },
              }, STRINGS.actionRestock),
            ]),
          ),
        ),
      ),
    );
  }
}
