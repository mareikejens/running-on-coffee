# Known issues / on-device test checklist

Things that can only be verified on the physical iPad (iOS 16.7, Safari 16).
Simulation covers everything else. Check these during the on-device session.

## Must verify on device

- [ ] **Persistent storage grant** — `navigator.storage.persist()` returns
  `false` in desktop dev browsers. On iOS, Home-Screen web apps get their own
  storage partition; verify Settings shows "Storage is persistent" after first
  launch from the Home Screen. If not granted, the red warning in Settings is
  the intended fallback (export regularly).
- [ ] **Export via share sheet** — desktop dev falls back to `<a download>`.
  On iPad, `navigator.share({files})` should open the share sheet with the
  JSON backup. Verify saving to Files works. If share fails, the download
  fallback behavior inside a standalone PWA is untested.
- [ ] **JSON import file picker** — verify `<input type="file">` opens the
  Files picker inside the standalone PWA and a previously exported backup
  restores fully.
- [ ] **Real A9X performance** — all interactions tested at 4–6× CPU throttle
  in desktop Chrome, but real-device rendering may differ.
- [ ] **Touch precision** — chip/stepper/star targets sized ≥48–60px; verify
  with actual (wet) fingers.

## Notes

- Data added during development/testing lives only in the developing browser's
  IndexedDB — the iPad starts clean.
