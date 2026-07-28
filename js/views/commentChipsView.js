// Shared notes card for the main screen: one card for the whole house, every
// note signed with its author (whoever is selected on the ratings tabs).
// Preset chips (one tap = saved), keyboard fallback, and the most recent notes
// shown right here — a saved note must be visible without leaving the screen.
import { el, clear } from '../utils/dom.js';
import { STRINGS, COMMENT_CHIPS, CONFIG } from '../constants.js';
import { addComment, getCommentsForBean } from '../db/comments.js';
import { getAllUsers } from '../db/users.js';
import { formatDate } from '../utils/format.js';
import { showToast } from '../components/toast.js';
import { speechButton } from '../components/speechInput.js';

// getUserId is a callback, not a value — the author is whoever is on the
// tabs at the moment the note is saved, without re-rendering this card.
export function commentsCard(beanId, getUserId) {
  const input = el('input', {
    class: 'form-input',
    type: 'text',
    placeholder: STRINGS.commentPlaceholder,
    autocomplete: 'off',
  });

  const recentList = el('div', { class: 'recent-notes' });

  async function refreshRecent() {
    const [rows, users] = await Promise.all([getCommentsForBean(beanId), getAllUsers()]);
    const nameOf = (id) => {
      const user = users.find((u) => u.id === id);
      return user ? user.displayName : id;
    };
    clear(recentList);
    for (const row of rows.slice(0, CONFIG.recentNotesShown)) {
      recentList.appendChild(
        el('div', { class: 'recent-note' },
          el('span', { class: 'recent-note-author' }, nameOf(row.userId)),
          el('span', { class: 'recent-note-text' }, `“${row.text}”`),
          el('span', { class: 'recent-note-meta' }, formatDate(row.createdAt)),
        ),
      );
    }
    if (rows.length > CONFIG.recentNotesShown) {
      recentList.appendChild(
        el('div', { class: 'recent-note-more' },
          STRINGS.notesMore(rows.length - CONFIG.recentNotesShown)),
      );
    }
  }

  async function saveComment(text, source) {
    if (!text.trim()) return;
    await addComment(beanId, getUserId(), text, source);
    showToast(STRINGS.commentSaved);
    refreshRecent();
  }

  const chips = el('div', { class: 'chip-row' },
    COMMENT_CHIPS.map((text) =>
      el('button', {
        type: 'button',
        class: 'chip',
        onClick: () => saveComment(text, 'chip'),
      }, text),
    ),
  );

  // Speech fills the input for review before saving; track the exact text so
  // an unedited submission is recorded with source 'speech'.
  let lastSpeechText = null;
  const mic = speechButton((text) => {
    input.value = text;
    lastSpeechText = text;
    input.focus();
  });

  const form = el('form', {
    class: 'comment-form',
    onSubmit: (e) => {
      e.preventDefault();
      const source = input.value === lastSpeechText ? 'speech' : 'keyboard';
      saveComment(input.value, source);
      input.value = '';
      lastSpeechText = null;
    },
  }, input, mic, el('button', { type: 'submit', class: 'btn' }, STRINGS.commentAdd));

  refreshRecent();

  return el('div', { class: 'card main-card' },
    el('h3', { class: 'section-title' }, STRINGS.commentsTitle),
    recentList,
    chips,
    form,
  );
}
