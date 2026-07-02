// Inactivity → idle "painting"; any tap wakes. While idle, the content is
// nudged a few pixels every few minutes (discrete transform change, no
// animation loop) to avoid burn-in on the always-on display.
import { CONFIG } from '../constants.js';
import { qs } from '../utils/dom.js';
import { renderIdle } from '../views/idleView.js';

let idleTimer = null;
let shiftTimer = null;
let shiftIndex = 0;
let idle = false;

const SHIFTS = [
  [0, 0], [1, -1], [-1, 1], [1, 1], [-1, -1], [0, 1], [1, 0], [-1, 0], [0, -1],
];

function overlay() {
  return qs('#idle-overlay');
}

function armTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(enterIdle, CONFIG.idleTimeoutMs);
}

async function enterIdle() {
  if (idle) return;
  idle = true;
  const node = overlay();
  await renderIdle(node);
  node.hidden = false;
  // Next frame so the opacity transition runs (transform/opacity only).
  requestAnimationFrame(() => node.classList.add('is-idle'));
  shiftIndex = 0;
  shiftTimer = setInterval(applyBurnInShift, CONFIG.burnInShiftMs);
}

function applyBurnInShift() {
  const content = overlay().querySelector('.idle-content');
  if (!content) return;
  shiftIndex = (shiftIndex + 1) % SHIFTS.length;
  const [dx, dy] = SHIFTS[shiftIndex];
  const px = CONFIG.burnInShiftPx;
  content.style.transform = `translate(${dx * px}px, ${dy * px}px)`;
}

function wake() {
  if (idle) {
    idle = false;
    clearInterval(shiftTimer);
    const node = overlay();
    // Hide instantly — waking must feel immediate.
    node.classList.remove('is-idle');
    node.hidden = true;
  }
  armTimer();
}

export function startIdleController() {
  // pointerdown covers touch + mouse; keydown for dev keyboards.
  document.addEventListener('pointerdown', wake, { capture: true, passive: true });
  document.addEventListener('keydown', wake, { capture: true, passive: true });
  armTimer();
}

// Exposed for testing/manual triggering.
export function forceIdle() {
  clearTimeout(idleTimer);
  return enterIdle();
}
