# Deploying Coffee Wall

The app is static files — any static host works. Service workers require
**HTTPS** (or `localhost`), so the iPad needs an HTTPS URL for the first
install. After that it runs fully offline.

## Option A: GitHub Pages (quickstart)

1. Push the repo to GitHub.
2. Repo → Settings → Pages → Source: `main` branch, `/ (root)`.
3. Wait for the deploy; the app is at `https://<user>.github.io/running-on-coffee/`.

All paths in the app are relative, so subpath hosting works out of the box.

## Option B: any static host

Upload the repo contents (everything except `.git`, `.claude`) to
Netlify/Vercel/nginx/a NAS with HTTPS. No build step, no server logic.

## Updating a deployed version

1. Make your changes.
2. **Bump `CACHE_VERSION` in `sw.js`** — mandatory for any change to be
   picked up; the service worker serves cache-first, so without a bump the
   iPad keeps running the old version forever.
3. Deploy.
4. On the iPad: open the app with network available; when the "Update ready —
   tap here to reload" toast appears, tap it (or close and reopen the app).

## iPad setup (one-time)

1. Open the deployed URL in **Safari** on the iPad (must be Safari).
2. Share button → **Add to Home Screen** → Add. Icon "Coffee" appears.
3. Launch from the Home Screen once **while online** — this installs the
   offline cache and requests persistent storage.
4. Check Settings (in the app): it should say "Storage is persistent".
   Then tap **Export data** once to confirm the backup path works.

### Kiosk hardening

- **Auto-Lock off:** iPad Settings → Display & Brightness → Auto-Lock → Never.
- **Guided Access** (locks the iPad to the app):
  Settings → Accessibility → Guided Access → on, set a passcode.
  Open Coffee Wall, triple-click the top button, tap Start.
  (To exit: triple-click again + passcode.)
- Mount in **landscape**. iOS does not enforce the manifest orientation for
  home-screen web apps — the layout is designed for landscape and will look
  wrong in portrait.
- Consider a wall power supply; the display never sleeps.

## Backups

Data lives only in the iPad's IndexedDB. Export monthly (the app shows a
red reminder in Settings after 30 days): Settings → Export data (JSON) →
share sheet → save to Files/AirDrop. To restore (new iPad, after a wipe):
Settings → Import data (JSON) → pick the backup file.

## Local development

```
python3 -m http.server 8790
```

Service worker note: after changing any file, bump `CACHE_VERSION` in
`sw.js` and reload twice (or use DevTools → Application → Service Workers →
"Update on reload") — otherwise you'll be testing stale cached code.
