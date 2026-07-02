// Bean CRUD + state transitions. meta.activeBeanId is the source of truth for
// which bean is active; beans.state is denormalized for indexed queries. Every
// state transition runs in ONE transaction spanning beans+meta so the invariant
// "exactly one active bean" can never be observed broken.
import { uuid } from '../utils/uuid.js';
import { nowIso } from '../utils/format.js';
import { get, getAll, getAllByIndex, withTx, reqAsPromise } from './db.js';

export const BEAN_STATE = {
  ACTIVE: 'active',
  IN_STOCK: 'inStock',
  ARCHIVED: 'archived',
};

export async function addBean({ roastery, name, composition, origin, roastStyle }) {
  const bean = {
    id: uuid(),
    roastery: (roastery || '').trim(),
    name: (name || '').trim(),
    composition,
    origin: (origin || '').trim(),
    roastStyle,
    state: BEAN_STATE.IN_STOCK,
    dateAdded: nowIso(),
    dateArchived: null,
  };
  await withTx('beans', (tx) => {
    tx.objectStore('beans').put(bean);
  });
  return bean;
}

export function getBean(id) {
  return get('beans', id);
}

export function getAllBeans() {
  return getAll('beans');
}

export function getBeansByState(state) {
  return getAllByIndex('beans', 'by_state', state);
}

export async function getActiveBean() {
  const beans = await getBeansByState(BEAN_STATE.ACTIVE);
  return beans[0] || null;
}

// Atomically: demote current active bean (if any) to inStock, promote the new
// one, update the meta pointer. Aborts leave everything untouched.
export function setActiveBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const pointer = await reqAsPromise(meta.get('activeBeanId'));
    const currentId = pointer ? pointer.value : null;

    if (currentId && currentId !== beanId) {
      const current = await reqAsPromise(beans.get(currentId));
      if (current && current.state === BEAN_STATE.ACTIVE) {
        current.state = BEAN_STATE.IN_STOCK;
        beans.put(current);
      }
    }

    const next = await reqAsPromise(beans.get(beanId));
    if (!next) throw new Error(`Bean not found: ${beanId}`);
    next.state = BEAN_STATE.ACTIVE;
    next.dateArchived = null;
    beans.put(next);
    meta.put({ key: 'activeBeanId', value: beanId });
    return next;
  });
}

// Archive keeps the bean forever ("finished"). If it was active, the pointer is
// cleared in the same transaction — no orphaned activeBeanId possible.
export function archiveBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const bean = await reqAsPromise(beans.get(beanId));
    if (!bean) throw new Error(`Bean not found: ${beanId}`);
    bean.state = BEAN_STATE.ARCHIVED;
    bean.dateArchived = nowIso();
    beans.put(bean);
    const pointer = await reqAsPromise(meta.get('activeBeanId'));
    if (pointer && pointer.value === beanId) {
      meta.put({ key: 'activeBeanId', value: null });
    }
    return bean;
  });
}

// Move an archived (or active) bean back to stock.
export function restockBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const bean = await reqAsPromise(beans.get(beanId));
    if (!bean) throw new Error(`Bean not found: ${beanId}`);
    const wasActive = bean.state === BEAN_STATE.ACTIVE;
    bean.state = BEAN_STATE.IN_STOCK;
    bean.dateArchived = null;
    beans.put(bean);
    if (wasActive) {
      const pointer = await reqAsPromise(meta.get('activeBeanId'));
      if (pointer && pointer.value === beanId) {
        meta.put({ key: 'activeBeanId', value: null });
      }
    }
    return bean;
  });
}

// Boot-time self-check: meta.activeBeanId is ground truth; rewrite any bean
// whose denormalized state disagrees.
export function verifyActiveBeanInvariant() {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const pointer = await reqAsPromise(meta.get('activeBeanId'));
    const activeId = pointer ? pointer.value : null;
    const all = await reqAsPromise(beans.getAll());
    for (const bean of all) {
      if (bean.id === activeId && bean.state !== BEAN_STATE.ACTIVE) {
        bean.state = BEAN_STATE.ACTIVE;
        beans.put(bean);
      } else if (bean.id !== activeId && bean.state === BEAN_STATE.ACTIVE) {
        bean.state = BEAN_STATE.IN_STOCK;
        beans.put(bean);
      }
    }
    if (activeId && !all.some((b) => b.id === activeId)) {
      meta.put({ key: 'activeBeanId', value: null });
    }
  });
}

// Distinct previously-used values for form prefill (roastery/origin chips).
export async function distinctFieldValues(field) {
  const beans = await getAll('beans');
  const values = new Set();
  for (const bean of beans) {
    const v = (bean[field] || '').trim();
    if (v) values.add(v);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b));
}
