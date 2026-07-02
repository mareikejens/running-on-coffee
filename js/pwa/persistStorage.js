// Ask the browser to protect IndexedDB from eviction. Result is stored in meta
// so settings can show a warning if persistence was denied.
import { setMeta } from '../db/meta.js';

export async function requestPersistentStorage() {
  if (!navigator.storage || !navigator.storage.persist) {
    await setMeta('storagePersisted', false);
    return false;
  }
  try {
    const already = await navigator.storage.persisted();
    const granted = already || (await navigator.storage.persist());
    await setMeta('storagePersisted', granted);
    return granted;
  } catch (e) {
    await setMeta('storagePersisted', false);
    return false;
  }
}
