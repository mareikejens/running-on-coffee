// IndexedDB connection + promise wrappers. The ONLY file that knows the schema version.
import { DB_NAME, DB_VERSION } from '../constants.js';

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion < 1) {
        const beans = db.createObjectStore('beans', { keyPath: 'id' });
        beans.createIndex('by_state', 'state');
        beans.createIndex('by_roastery', 'roastery');
        beans.createIndex('by_dateAdded', 'dateAdded');

        const grinds = db.createObjectStore('grindSettings', { keyPath: 'id' });
        grinds.createIndex('by_bean_user', ['beanId', 'userId'], { unique: true });
        grinds.createIndex('by_bean', 'beanId');

        const ratings = db.createObjectStore('ratings', { keyPath: 'id' });
        ratings.createIndex('by_bean_user_milk', ['beanId', 'userId', 'milkType']);
        ratings.createIndex('by_bean', 'beanId');

        const comments = db.createObjectStore('comments', { keyPath: 'id' });
        comments.createIndex('by_bean', 'beanId');
        comments.createIndex('by_bean_user', ['beanId', 'userId']);

        db.createObjectStore('users', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Database open blocked by another tab'));
  });
  return dbPromise;
}

export function reqAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

// Convenience single-store operations
export async function get(storeName, key) {
  const db = await openDB();
  return reqAsPromise(db.transaction(storeName).objectStore(storeName).get(key));
}

export async function getAll(storeName) {
  const db = await openDB();
  return reqAsPromise(db.transaction(storeName).objectStore(storeName).getAll());
}

export async function getAllByIndex(storeName, indexName, query) {
  const db = await openDB();
  const index = db.transaction(storeName).objectStore(storeName).index(indexName);
  return reqAsPromise(index.getAll(query));
}

export async function put(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, 'readwrite');
  tx.objectStore(storeName).put(value);
  await txDone(tx);
  return value;
}

// Multi-store readwrite transaction helper: fn receives the tx, may return a promise.
export async function withTx(storeNames, fn) {
  const db = await openDB();
  const tx = db.transaction(storeNames, 'readwrite');
  const result = await fn(tx);
  await txDone(tx);
  return result;
}
