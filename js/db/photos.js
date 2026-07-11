// Bag photos: one processed image blob per bean, keyed by beanId.
// Object URLs are cached per bean so re-rendering views doesn't leak URLs;
// the cache is invalidated on write/delete/import.
import { nowIso } from '../utils/format.js';
import { get, getAll, withTx } from './db.js';

const urlCache = new Map(); // beanId -> object URL

export async function setPhoto(beanId, blob) {
  await withTx('photos', (tx) => {
    tx.objectStore('photos').put({ beanId, blob, updatedAt: nowIso() });
  });
  invalidatePhotoUrl(beanId);
}

export function getPhotoRow(beanId) {
  return get('photos', beanId);
}

export async function deletePhoto(beanId) {
  await withTx('photos', (tx) => {
    tx.objectStore('photos').delete(beanId);
  });
  invalidatePhotoUrl(beanId);
}

export function getAllPhotoRows() {
  return getAll('photos');
}

// Object URL for a bean's photo, or null. Cached until the photo changes.
export async function getPhotoUrl(beanId) {
  if (urlCache.has(beanId)) return urlCache.get(beanId);
  const row = await getPhotoRow(beanId);
  const url = row && row.blob ? URL.createObjectURL(row.blob) : null;
  urlCache.set(beanId, url);
  return url;
}

// Object URLs for every bean that has a photo: Map beanId -> url.
export async function getAllPhotoUrls() {
  const rows = await getAllPhotoRows();
  const map = new Map();
  for (const row of rows) {
    if (!urlCache.has(row.beanId)) {
      urlCache.set(row.beanId, row.blob ? URL.createObjectURL(row.blob) : null);
    }
    const url = urlCache.get(row.beanId);
    if (url) map.set(row.beanId, url);
  }
  return map;
}

export function invalidatePhotoUrl(beanId) {
  const url = urlCache.get(beanId);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(beanId);
}

export function clearPhotoUrlCache() {
  for (const url of urlCache.values()) {
    if (url) URL.revokeObjectURL(url);
  }
  urlCache.clear();
}
