import { USERS } from '../constants.js';
import { getAll, withTx, reqAsPromise } from './db.js';
import { getMeta, setMeta } from './meta.js';

// Idempotent: inserts any of the three fixed users that are missing.
export async function seedUsers() {
  await withTx('users', async (tx) => {
    const store = tx.objectStore('users');
    const existing = await reqAsPromise(store.getAll());
    const existingIds = new Set(existing.map((u) => u.id));
    for (const user of USERS) {
      if (!existingIds.has(user.id)) store.put(user);
    }
  });
}

export function getAllUsers() {
  return getAll('users');
}

export async function getLastActiveUserId() {
  return (await getMeta('lastActiveUserId')) || USERS[0].id;
}

export function setLastActiveUserId(userId) {
  return setMeta('lastActiveUserId', userId);
}
