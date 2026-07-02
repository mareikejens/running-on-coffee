// Comments are append-only rows per user × bean.
import { uuid } from '../utils/uuid.js';
import { nowIso } from '../utils/format.js';
import { getAllByIndex, withTx } from './db.js';

export async function addComment(beanId, userId, text, source) {
  const row = {
    id: uuid(),
    beanId,
    userId,
    text: text.trim(),
    source, // 'chip' | 'keyboard' ('speech' reserved post-MVP)
    createdAt: nowIso(),
  };
  await withTx('comments', (tx) => {
    tx.objectStore('comments').put(row);
  });
  return row;
}

// Newest first.
export async function getCommentsForBean(beanId) {
  const rows = await getAllByIndex('comments', 'by_bean', beanId);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
