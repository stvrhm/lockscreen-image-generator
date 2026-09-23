# Test Device Lockscreens Agent Guide

This app was scaffolded with `remix new` and rebuilt as a local-first PWA.
Use these conventions when continuing to build it out.

## Commands

```sh
npm i
npm run dev
npm run hmr
npm run build
npm run preview
npm start
npm test
npm run test:e2e   # Playwright, phone viewport; first run: npx playwright install chromium
npm run typecheck
```

## Building Features

Refer to ./.agents/skills/remix/SKILL.md

Domain language: `CONTEXT.md`. ADRs: `docs/adr/`.

## Layout

This is a client-rendered app on `remix/spa`. The server and the static build
only serve assets and one neutral shell document; all screen routing happens in
the browser, so development and production run the same routing code.

- `app/routes.ts` defines the shared route contract: `assets` plus the `screens` route map
- `app/assets/browser-router.tsx` is the app's only screen router (`createRouter` + `render`/`run` from `remix/spa`)
- `app/assets/controller.tsx` owns the screen actions; each resolves its data and returns exactly one screen
- `app/assets/screens/` holds one file per screen (`Home`, `BrowseDevices`, `Editor`, plus `LoadingScreen` and `NotFoundScreen`); `app/assets/editor/` holds the Editor's subcomponents; styles live with their single owner, and only styles used by several screens go in `app/ui/screen-styles.ts`
- `app/assets/device-store.ts` injects the Device reads the screen routes need, so the route contract is testable
- `app/assets/entry.tsx` is the browser entrypoint and calls `run()`
- `app/ui/document.tsx` renders the shell document; its `<body>` is empty by design
- `app/ui/app-frame.tsx` is the chrome shared by every screen, applied by the SPA render middleware
- `app/actions/controller.tsx` serves assets; `app/actions/screens/controller.tsx` serves the shell for every screen URL
- `app/data/` owns IndexedDB Devices, Host metrics, Shortcuts, Wallpaper export
- `app/router.tsx` wires the server router; unknown URLs get the shell with a 404, matching Netlify
- `app/assets.ts` owns the server-side asset pipeline
- Root `public/` contains static files (manifest, icons, Netlify headers)
- `scripts/build.tsx` emits the static `dist/`, plus `version.json` and a cleanup service worker

## Route Ownership

- Start from `app/routes.ts` and map each route to the narrowest owner on disk.
- Screen routes are browser-owned: add their actions to `app/assets/controller.tsx`.
- Server-owned routes (assets, shell) belong in `app/actions/`. That tree is
  deliberately absent from the asset server's allow list, so browser code
  cannot import it — this is why screen controllers live under `app/assets/`.
- A screen never inspects `window.location` or decides which screen it is. Its
  action resolves the data and renders one screen; missing data returns a
  redirect response.
- Navigate with `navigate()` or a plain anchor. Do not use `window.location.*`
  or `data-rmx-document`, which force a document load through the static shell.
- Move shared UI to `app/ui/`, not `app/actions/`.

## PWA Notes

- There is no service worker. The app is installable from the manifest alone and
  always loads from the network, so every launch is current. `dist/sw.js` is a
  one-shot cleanup worker for devices that installed an older build; nothing may
  register it.
- Updates are detected by polling `version.json` against the build id seen at
  load. Applying an update is a reload.
- Reintroducing offline support means making precaching atomic, scoping cache
  deletion to `tdl-*`, caching only known assets, and testing upgrades across
  two build versions.
- The reasoning is recorded in `docs/adr/0003-no-service-worker-client-routed-spa.md`.

## Build-Out Notes

- Prefer putting code in the narrowest owner before introducing shared modules.
- Avoid generic dumping-ground directories like `app/lib/` or `app/components/`.
- Devices are Host-local (IndexedDB). Do not reintroduce a shared server Device store without an ADR.
