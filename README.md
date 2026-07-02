# Coffee Wall

A coffee bean tracking PWA for the wall-mounted kitchen iPad. Mareike, Frenzi,
and guests rate beans per milk type and track their grind settings.

- **Target:** iPad Pro 9.7" (A9X), iOS 16 Safari, landscape 1024×768, installed
  as a Home Screen PWA.
- **Stack:** Vanilla HTML/CSS/JS, native ES modules, no build step. IndexedDB
  for data, service worker for offline (from v0.4).
- **Principle:** Simplicity wins over polish, every time.

## Run locally

```
python3 -m http.server 8790
```

Then open http://localhost:8790 — any static file server works.

## Project layout

- `index.html` — single-page shell; views are sections toggled by `js/views/router.js`
- `js/constants.js` — all UI strings and tunable config in one place
- `js/db/` — IndexedDB layer (schema in `db.js`, one module per entity)
- `js/views/` — view renderers
- `css/` — tokens-first light theme ("paper & ink")

See `DEPLOY.md` (from v0.5) for hosting and iPad kiosk setup, and
`KNOWN_ISSUES.md` for the on-device test checklist.
