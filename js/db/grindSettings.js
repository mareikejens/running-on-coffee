// One grind setting per user × bean (unique composite index). Upsert semantics.
import { uuid } from '../utils/uuid.js';
import { nowIso } from '../utils/format.js';
import { CONFIG } from '../constants.js';
import { getAllByIndex, withTx, reqAsPromise } from './db.js';

export function clampGrind(value) {
  const clamped = Math.min(CONFIG.grindMax, Math.max(CONFIG.grindMin, value));
  return Math.round(clamped * 10) / 10; // avoid float drift, keep one decimal
}

export async function getGrind(beanId, userId) {
  const rows = await getAllByIndex('grindSettings', 'by_bean_user', [beanId, userId]);
  return rows[0] || null;
}

export async function setGrind(beanId, userId, value) {
  const clamped = clampGrind(value);
  return withTx('grindSettings', async (tx) => {
    const store = tx.objectStore('grindSettings');
    const existing = await reqAsPromise(store.index('by_bean_user').get([beanId, userId]));
    const row = existing
      ? { ...existing, value: clamped, updatedAt: nowIso() }
      : { id: uuid(), beanId, userId, value: clamped, updatedAt: nowIso() };
    store.put(row);
    return row;
  });
}

export function getGrindsForBean(beanId) {
  return getAllByIndex('grindSettings', 'by_bean', beanId);
}
