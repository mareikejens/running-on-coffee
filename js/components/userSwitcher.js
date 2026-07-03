// Large always-visible user tabs. Calls onSelect(userId) on tap.
import { el } from '../utils/dom.js';

export function userSwitcher(users, selectedId, onSelect) {
  const wrap = el('div', { class: 'user-switcher' });
  for (const user of users) {
    const btn = el('button', {
      type: 'button',
      class: `user-tab${user.id === selectedId ? ' is-selected' : ''}`,
      dataset: { userId: user.id },
      onClick: () => {
        for (const sibling of wrap.children) sibling.classList.remove('is-selected');
        btn.classList.add('is-selected');
        onSelect(user.id);
      },
    }, user.displayName);
    wrap.appendChild(btn);
  }
  return wrap;
}
