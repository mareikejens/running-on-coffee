// One shared grind setting per bean — the house dials in together (since
// v0.12). Stored as a row with the reserved userId 'house' in the existing
// grindSettings store, so no schema migration is needed; pre-v0.12 per-user
// rows are still read as a fallback (latest updated wins) until the house
// row is written for that bean.
import { uuid } from '../utils/uuid.js';
import { nowIso } from '../utils/format.js';
import { CONFIG } from '../constants.js';
import { getAllByIndex, withTx, reqAsPromise } from './db.js';

export const HOUSE_USER_ID = 'house';

export function clampGrind(value) {
  const clamped = Math.min(CONFIG.grindMax, Math.max(CONFIG.grindMin, value));
  return Math.round(clamped * 10) / 10; // avoid float drift, keep one decimal
}

export async function getGrind(beanId) {
  const rows = await getAllByIndex('grindSettings', 'by_bean', beanId);
  const house = rows.find((r) => r.userId === HOUSE_USER_ID);
  if (house) return house;
  // Legacy per-user rows: the most recently touched one is the best guess.
  rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return rows[0] || null;
}

export async function setGrind(beanId, value) {
  const clamped = clampGrind(value);
  return withTx('grindSettings', async (tx) => {
    const store = tx.objectStore('grindSettings');
    const existing = await reqAsPromise(
      store.index('by_bean_user').get([beanId, HOUSE_USER_ID]),
    );
    const row = existing
      ? { ...existing, value: clamped, updatedAt: nowIso() }
      : { id: uuid(), beanId, userId: HOUSE_USER_ID, value: clamped, updatedAt: nowIso() };
    store.put(row);
    return row;
  });
}

export function getGrindsForBean(beanId) {
  return getAllByIndex('grindSettings', 'by_bean', beanId);
}
