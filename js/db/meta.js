// App-level key-value store.
import { get, put } from './db.js';

export async function getMeta(key) {
  const row = await get('meta', key);
  return row ? row.value : null;
}

export async function setMeta(key, value) {
  await put('meta', { key, value });
}
