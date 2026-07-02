// Minimal view switcher: shows one .view section, re-rendering it on entry.
// Views register a render(container) function; render runs on every navigation
// so data is always fresh (re-querying IndexedDB is cheap at this scale).
import { qs, clear } from '../utils/dom.js';

const views = new Map(); // name -> { sectionId, render }
let currentName = null;

export function registerView(name, sectionId, render) {
  views.set(name, { sectionId, render });
}

export async function navigate(name, params = {}) {
  const target = views.get(name);
  if (!target) throw new Error(`Unknown view: ${name}`);
  for (const [viewName, view] of views) {
    const section = qs(`#${view.sectionId}`);
    if (viewName !== name) section.hidden = true;
  }
  const section = qs(`#${target.sectionId}`);
  clear(section);
  await target.render(section, params);
  section.hidden = false;
  currentName = name;
  updateNavHighlight(name);
}

export function currentView() {
  return currentName;
}

function updateNavHighlight(name) {
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.classList.toggle('is-active', btn.dataset.nav === name);
  }
}
