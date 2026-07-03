// Bean CRUD + state transitions.
//
// Single-dose model (v0.8): several bags can be OPEN at once (state 'active'
// — the string is kept from v0.5–0.7 so existing data needs no migration).
// meta.activeBeanId now means "currently brewing": the one open bag the main
// screen and idle painting feature. Transitions that can invalidate the
// pointer run in ONE transaction spanning beans+meta.
import { uuid } from '../utils/uuid.js';
import { nowIso } from '../utils/format.js';
import { get, getAll, getAllByIndex, withTx, reqAsPromise } from './db.js';
import { getMeta } from './meta.js';

export const BEAN_STATE = {
  OPEN: 'active', // legacy string value — means "bag is open" since v0.8
  IN_STOCK: 'inStock',
  ARCHIVED: 'archived',
};

export async function addBean({ roastery, name, composition, origin, roastStyle, pricePerKg, purchasePlace }) {
  const bean = {
    id: uuid(),
    roastery: (roastery || '').trim(),
    name: (name || '').trim(),
    composition,
    origin: (origin || '').trim(),
    roastStyle,
    pricePerKg: typeof pricePerKg === 'number' && !Number.isNaN(pricePerKg) ? pricePerKg : null,
    purchasePlace: (purchasePlace || '').trim(),
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

export function getOpenBeans() {
  return getBeansByState(BEAN_STATE.OPEN);
}

// The bag currently being brewed (featured on main screen + painting).
export async function getCurrentBean() {
  const currentId = await getMeta('activeBeanId');
  if (!currentId) return null;
  return get('beans', currentId);
}

// Open a bag (from stock or archive) and make it the current brew.
export function openBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const bean = await reqAsPromise(beans.get(beanId));
    if (!bean) throw new Error(`Bean not found: ${beanId}`);
    bean.state = BEAN_STATE.OPEN;
    bean.dateArchived = null;
    beans.put(bean);
    meta.put({ key: 'activeBeanId', value: beanId });
    return bean;
  });
}

// Switch which OPEN bag is currently being brewed (bean bar tap).
export function selectCurrentBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const bean = await reqAsPromise(tx.objectStore('beans').get(beanId));
    if (!bean || bean.state !== BEAN_STATE.OPEN) {
      throw new Error(`Bean is not an open bag: ${beanId}`);
    }
    tx.objectStore('meta').put({ key: 'activeBeanId', value: beanId });
    return bean;
  });
}

// Shared: after a bag stops being open, re-point the current-brew pointer to
// another open bag (or null) inside the same transaction.
async function repointIfCurrent(tx, beanId) {
  const meta = tx.objectStore('meta');
  const pointer = await reqAsPromise(meta.get('activeBeanId'));
  if (!pointer || pointer.value !== beanId) return;
  const open = await reqAsPromise(
    tx.objectStore('beans').index('by_state').getAll(BEAN_STATE.OPEN),
  );
  const next = open.find((b) => b.id !== beanId);
  meta.put({ key: 'activeBeanId', value: next ? next.id : null });
}

// Archive keeps the bean forever ("finished").
export function archiveBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const bean = await reqAsPromise(beans.get(beanId));
    if (!bean) throw new Error(`Bean not found: ${beanId}`);
    bean.state = BEAN_STATE.ARCHIVED;
    bean.dateArchived = nowIso();
    beans.put(bean);
    await repointIfCurrent(tx, beanId);
    return bean;
  });
}

// Move an archived or open bean back to (sealed) stock.
export function restockBean(beanId) {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const bean = await reqAsPromise(beans.get(beanId));
    if (!bean) throw new Error(`Bean not found: ${beanId}`);
    bean.state = BEAN_STATE.IN_STOCK;
    bean.dateArchived = null;
    beans.put(bean);
    await repointIfCurrent(tx, beanId);
    return bean;
  });
}

// Boot-time self-check: the current-brew pointer must reference an existing
// OPEN bag; otherwise repoint to any open bag (or null). Multiple open bags
// are valid since v0.8 — beans are never demoted here.
export function verifyActiveBeanInvariant() {
  return withTx(['beans', 'meta'], async (tx) => {
    const beans = tx.objectStore('beans');
    const meta = tx.objectStore('meta');
    const pointer = await reqAsPromise(meta.get('activeBeanId'));
    const currentId = pointer ? pointer.value : null;
    const all = await reqAsPromise(beans.getAll());
    const current = all.find((b) => b.id === currentId);
    if (!current || current.state !== BEAN_STATE.OPEN) {
      const fallback = all.find((b) => b.state === BEAN_STATE.OPEN);
      meta.put({ key: 'activeBeanId', value: fallback ? fallback.id : null });
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
