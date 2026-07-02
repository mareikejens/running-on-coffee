// Bean catalog: active bean on top, stock below, finished beans at the bottom.
import { el } from '../utils/dom.js';
import { STRINGS, COMPOSITIONS, ROAST_STYLES } from '../constants.js';
import {
  BEAN_STATE,
  getAllBeans,
  setActiveBean,
  archiveBean,
  restockBean,
} from '../db/beans.js';
import { navigate } from './router.js';
import { showToast } from '../components/toast.js';

function beanLabel(bean) {
  return [bean.roastery, bean.name].filter(Boolean).join(' — ');
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
  return [bean.origin, compLabel, roast ? roast.label : ''].filter(Boolean).join(' · ');
}

function beanRow(bean, actions) {
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
      el('div', { class: 'bean-row-name' }, beanLabel(bean)),
      el('div', { class: 'bean-row-meta' }, beanMeta(bean)),
    ),
    el('div', { class: 'bean-row-actions' }, actions),
  );
}

async function rerender() {
  await navigate('catalog');
}

export async function renderCatalog(container) {
  const beans = await getAllBeans();
  beans.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));

  const active = beans.filter((b) => b.state === BEAN_STATE.ACTIVE);
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

  container.appendChild(el('h2', { class: 'section-title' }, STRINGS.catalogActiveTitle));
  if (active.length > 0) {
    container.appendChild(
      el('div', { class: 'card' },
        el('ul', {},
          active.map((bean) =>
            beanRow(bean, [
              el('span', { class: 'badge badge-active' }, STRINGS.badgeActive),
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
        el('p', { class: 'settings-note' }, STRINGS.catalogNoActive)),
    );
  }

  if (stock.length > 0) {
    container.appendChild(el('h2', { class: 'section-title' }, STRINGS.catalogStockTitle));
    container.appendChild(
      el('div', { class: 'card' },
        el('ul', {},
          stock.map((bean) =>
            beanRow(bean, [
              el('button', {
                class: 'btn',
                onClick: async () => {
                  await setActiveBean(bean.id);
                  showToast(STRINGS.beanActivated);
                  rerender();
                },
              }, STRINGS.actionMakeActive),
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
            beanRow(bean, [
              el('span', { class: 'badge badge-archived' }, STRINGS.badgeArchived),
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
