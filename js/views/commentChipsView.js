// Notes card for the main screen: preset chips (one tap = saved) plus a
// keyboard fallback input. Speech input is a post-MVP enhancement.
import { el } from '../utils/dom.js';
import { STRINGS, COMMENT_CHIPS } from '../constants.js';
import { addComment } from '../db/comments.js';
import { showToast } from '../components/toast.js';

export function commentsCard(beanId, userId) {
  const input = el('input', {
    class: 'form-input',
    type: 'text',
    placeholder: STRINGS.commentPlaceholder,
    autocomplete: 'off',
  });

  async function saveComment(text, source) {
    if (!text.trim()) return;
    await addComment(beanId, userId, text, source);
    showToast(STRINGS.commentSaved);
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

  const form = el('form', {
    class: 'comment-form',
    onSubmit: (e) => {
      e.preventDefault();
      saveComment(input.value, 'keyboard');
      input.value = '';
    },
  }, input, el('button', { type: 'submit', class: 'btn' }, STRINGS.commentAdd));

  return el('div', { class: 'card main-card' },
    el('h3', { class: 'section-title' }, STRINGS.commentsTitle),
    chips,
    form,
  );
}
