# Test Device Lockscreens

Installable PWA for labeling a test phone with an identifying lockscreen
wallpaper. Open it from the home screen on the phone itself, edit Label + Notes,
and download or share a wallpaper sized for this Host. Devices live in IndexedDB
on the phone — there is no shared server catalog.

## Stack

[Remix](https://www.npmjs.com/package/remix) 3 (server-driven UI in `dev`, static
client build for production). Deploy `dist/` to Netlify.

## Commands

```sh
npm i
npm run dev       # Remix server with Node --watch (full restarts)
npm run hmr       # Remix UI/module HMR (preferred for UI work)
npm run build     # icons + static dist/ + service worker
npm run preview   # serve dist/ locally
npm start         # production Remix server (optional)
npm test
npm run typecheck
```

Deploy:

```sh
npm run build && netlify deploy --prod --dir=dist
```

## App Shape

- `app/ui/app-shell.tsx` — document shell + install hint + client app
- `app/assets/app.tsx` — New / Continue / Browse + editor (IndexedDB)
- `app/data/devices.ts` — Device persistence in IndexedDB
- `app/data/wallpaper.ts` — canvas export (PNG Quality / JPEG Size)
- `app/data/shortcuts.ts` — hardcoded Notes insert chips
- `scripts/build.tsx` — static build + `sw.js`
- `public/manifest.webmanifest` — PWA manifest

Domain language: see `CONTEXT.md`. Storage decision: `docs/adr/0001-local-first-indexeddb.md`.
