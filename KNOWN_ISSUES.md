# Known issues / on-device test checklist

Things that can only be verified on the physical iPad (iOS 16.7, Safari 16).
Simulation covers everything else. Check these during the on-device session.

## On-device test script (run in order)

1. Open the deployed URL in Safari → Add to Home Screen → launch once online.
2. App Settings → confirm "Storage is persistent" (else note it and export now).
3. Add a real bean, make it active, set both grinds, rate, add a note.
4. Force-quit the app → relaunch → data still there.
5. Enable Airplane Mode → force-quit → relaunch → app fully works offline.
6. Wait 2 minutes untouched → idle painting appears → tap → main screen,
   and the wake tap did NOT change any rating.
7. Settings → Export → share sheet → save to Files. Open the file — sane JSON.
8. Restart the iPad → launch → data still there. Disable Airplane Mode.
9. Set up Guided Access + Auto-Lock Never per DEPLOY.md. Mount. Done.

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
  with actual (wet) fingers. Half-star input: left half of a star = n−0.5,
  right half = n. Verify this feels natural on real touch hardware.
- [ ] **Offline first Home-Screen launch** — cache-first serving was verified
  in simulation (file removed from disk still served; cache version bump
  correctly replaced the old cache). The full "airplane mode → cold launch
  from Home Screen" path can only be tested on the device.
- [ ] **Add to Home Screen** — verify the icon (apple-touch-icon 180px), the
  standalone window (no Safari chrome), and that landscape layout is correct.
  Note: iOS does not enforce the manifest `orientation` field — physically
  mount the iPad in landscape.
- [ ] **Idle screen on device** — 2-minute timeout, wake on tap, and the
  burn-in pixel shift (every 4 min) verified in simulation; confirm smooth
  fade-in on real A9X hardware (it's opacity-only, should be fine).
- [ ] **iOS PWA + IndexedDB quirk history** — older iOS versions had
  IndexedDB bugs in standalone mode; iOS 16.7 is believed fine, but the first
  on-device session should include: add data → force-quit → relaunch → data
  still present, and a device restart for good measure.

## Notes

- Data added during development/testing lives only in the developing browser's
  IndexedDB — the iPad starts clean.
