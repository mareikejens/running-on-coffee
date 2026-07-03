// Inactivity → idle "painting"; any tap wakes.
//
// v0.9: a single 2-minute setTimeout proved unreliable on the iPad — iOS can
// suspend or clamp long one-shot timers in standalone web apps, so the
// painting never appeared. Instead, a short self-rescheduling watchdog
// compares WALL-CLOCK time against the last activity timestamp: even if the
// process is frozen for a while, the first tick after resume does the right
// arithmetic. On visibilitychange→visible we check immediately, so a woken
// iPad shows the painting at once when the timeout passed while asleep.
//
// While idle, the content is nudged a few pixels every few minutes (discrete
// transform change, no animation loop) against burn-in.
import { CONFIG } from '../constants.js';
import { qs } from '../utils/dom.js';
import { renderIdle } from '../views/idleView.js';
import { navigate } from '../views/router.js';

let lastActivity = Date.now();
let idle = false;
let checkTimer = null;
let shiftTimer = null;
let shiftIndex = 0;

// Diagnostics shown in Settings — makes "the painting didn't appear" debuggable.
const diag = {
  bootedAt: Date.now(),
  idleShownCount: 0,
  lastIdleAt: null,
  lastError: null,
};

const SHIFTS = [
  [0, 0], [1, -1], [-1, 1], [1, 1], [-1, -1], [0, 1], [1, 0], [-1, 0], [0, -1],
];

function overlay() {
  return qs('#idle-overlay');
}

function scheduleCheck() {
  clearTimeout(checkTimer);
  checkTimer = setTimeout(check, CONFIG.idleCheckMs);
}

async function check() {
  if (!idle && Date.now() - lastActivity >= CONFIG.idleTimeoutMs) {
    await enterIdle();
  }
  scheduleCheck();
}

async function enterIdle() {
  if (idle) return;
  idle = true;
  const node = overlay();
  try {
    await renderIdle(node);
  } catch (err) {
    // Never leave an invisible full-screen overlay up on a render failure.
    idle = false;
    diag.lastError = String(err);
    console.error('Idle render failed:', err);
    return;
  }
  node.hidden = false;
  // Force a style flush so the opacity transition reliably runs (rAF timing
  // differs across engines; a reflow read is deterministic).
  node.getBoundingClientRect();
  node.classList.add('is-idle');
  diag.idleShownCount += 1;
  diag.lastIdleAt = Date.now();
  shiftIndex = 0;
  clearInterval(shiftTimer);
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
  idle = false;
  clearInterval(shiftTimer);
  const node = overlay();
  // Hide instantly — waking must feel immediate.
  node.classList.remove('is-idle');
  node.hidden = true;
  // Swallow the click that follows the waking pointerdown so it can't hit a
  // star/button that is now under the finger.
  document.addEventListener('click', swallowClick, { capture: true, once: true });
  // Wake always lands on the primary screen with fresh data.
  navigate('main');
}

function swallowClick(event) {
  event.stopPropagation();
  event.preventDefault();
}

function onActivity() {
  lastActivity = Date.now();
  if (idle) wake();
}

export function startIdleController() {
  // pointerdown covers touch + mouse; keydown for dev keyboards.
  document.addEventListener('pointerdown', onActivity, { capture: true, passive: true });
  document.addEventListener('keydown', onActivity, { capture: true, passive: true });
  // Resuming from sleep/background: decide immediately whether to paint.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  scheduleCheck();
}

// Exposed for testing/manual triggering.
export function forceIdle() {
  return enterIdle();
}

export function getIdleDiagnostics() {
  return {
    ...diag,
    idleActive: idle,
    secondsSinceActivity: Math.round((Date.now() - lastActivity) / 1000),
  };
}
