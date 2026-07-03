// Screen Wake Lock (iOS 16.4+): keeps the display on so the idle painting is
// actually visible. Progressive enhancement — the primary defence is still
// Auto-Lock = Never in iPad settings (see DEPLOY.md). The lock is released
// by the OS whenever the app is hidden, so we re-acquire on visibility.
let lock = null;

async function acquire() {
  if (!('wakeLock' in navigator)) return;
  try {
    lock = await navigator.wakeLock.request('screen');
  } catch (err) {
    // Denied (low battery, setting) — non-fatal, Auto-Lock covers us.
    lock = null;
  }
}

export function startWakeLock() {
  acquire();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !lock) acquire();
  });
}
