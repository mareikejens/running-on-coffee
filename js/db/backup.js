// JSON export/import. Import validates the ENTIRE payload before touching the
// database, then rewrites all stores in one transaction — a malformed file can
// never leave the DB partially written.
import { DB_VERSION, STRINGS } from '../constants.js';
import { getAll, withTx, reqAsPromise } from './db.js';
import { setMeta } from './meta.js';
import { clearPhotoUrlCache } from './photos.js';
import { nowIso } from '../utils/format.js';

// Plain JSON stores; photos hold blobs and get base64 treatment separately.
const STORES = ['beans', 'grindSettings', 'ratings', 'comments', 'users', 'meta'];

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(',');
  const type = dataUrl.slice(5, dataUrl.indexOf(';'));
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportAll() {
  const payload = {
    app: 'coffeewall',
    schemaVersion: DB_VERSION,
    exportedAt: nowIso(),
  };
  for (const store of STORES) {
    payload[store] = await getAll(store);
  }
  // Bag photos ride along as data URLs so one JSON file restores everything.
  const photoRows = await getAll('photos');
  payload.photos = await Promise.all(
    photoRows.map(async (row) => ({
      beanId: row.beanId,
      updatedAt: row.updatedAt,
      dataUrl: await blobToDataUrl(row.blob),
    })),
  );
  return payload;
}

function isIsoDateString(v) {
  return typeof v === 'string' && !Number.isNaN(Date.parse(v));
}

// Throws with a reason string on any structural problem.
export function validateBackup(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('not an object');
  if (payload.app !== 'coffeewall') throw new Error('missing app marker');
  if (typeof payload.schemaVersion !== 'number' || payload.schemaVersion > DB_VERSION) {
    throw new Error(`unsupported schemaVersion ${payload.schemaVersion}`);
  }
  for (const store of STORES) {
    if (!Array.isArray(payload[store])) throw new Error(`missing store array: ${store}`);
  }
  for (const bean of payload.beans) {
    if (typeof bean.id !== 'string' || !bean.id) throw new Error('bean without id');
    if (!['active', 'inStock', 'archived'].includes(bean.state)) {
      throw new Error(`bean ${bean.id} has invalid state`);
    }
    if (!isIsoDateString(bean.dateAdded)) throw new Error(`bean ${bean.id} has invalid dateAdded`);
  }
  const beanIds = new Set(payload.beans.map((b) => b.id));
  for (const row of payload.grindSettings) {
    if (typeof row.id !== 'string' || !beanIds.has(row.beanId)) {
      throw new Error('grind setting with missing/unknown bean');
    }
    if (typeof row.value !== 'number') throw new Error('grind setting without numeric value');
  }
  for (const row of payload.ratings) {
    if (typeof row.id !== 'string' || !beanIds.has(row.beanId)) {
      throw new Error('rating with missing/unknown bean');
    }
    if (typeof row.stars !== 'number' || !isIsoDateString(row.createdAt)) {
      throw new Error('rating with invalid stars/createdAt');
    }
  }
  for (const row of payload.comments) {
    if (typeof row.id !== 'string' || !beanIds.has(row.beanId)) {
      throw new Error('comment with missing/unknown bean');
    }
  }
  for (const row of payload.users) {
    if (typeof row.id !== 'string') throw new Error('user without id');
  }
  for (const row of payload.meta) {
    if (typeof row.key !== 'string') throw new Error('meta row without key');
  }
  // photos arrived in schema v2 — absent in older backups, which stay valid.
  for (const row of payload.photos || []) {
    if (typeof row.beanId !== 'string' || !beanIds.has(row.beanId)) {
      throw new Error('photo with missing/unknown bean');
    }
    if (typeof row.dataUrl !== 'string' || !row.dataUrl.startsWith('data:image/')) {
      throw new Error(`photo for bean ${row.beanId} has invalid image data`);
    }
  }
  return true;
}

// Full replace: clear every store, then write the payload's rows — atomically.
export async function importAll(payload) {
  validateBackup(payload);
  // Decode photo data URLs BEFORE the transaction — IndexedDB transactions
  // auto-commit if you await non-IDB work inside them.
  const photoRows = (payload.photos || []).map((row) => ({
    beanId: row.beanId,
    updatedAt: row.updatedAt,
    blob: dataUrlToBlob(row.dataUrl),
  }));
  await withTx([...STORES, 'photos'], async (tx) => {
    for (const storeName of STORES) {
      const store = tx.objectStore(storeName);
      await reqAsPromise(store.clear());
      for (const row of payload[storeName]) store.put(row);
    }
    const photos = tx.objectStore('photos');
    await reqAsPromise(photos.clear());
    for (const row of photoRows) photos.put(row);
  });
  clearPhotoUrlCache();
}

export async function exportToFile() {
  const payload = await exportAll();
  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `coffeewall-backup-${date}.json`;
  const file = new File([json], filename, { type: 'application/json' });

  // Share sheet where available (iPad), download link fallback (desktop dev).
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: STRINGS.appTitle });
      await setMeta('lastExportAt', nowIso());
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false; // user cancelled the sheet
      // fall through to download
    }
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  await setMeta('lastExportAt', nowIso());
  return true;
}

export function importFromFile(file) {
  return file.text().then((text) => {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      throw new Error('invalid JSON');
    }
    return importAll(payload);
  });
}
