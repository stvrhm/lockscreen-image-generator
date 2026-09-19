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
npm run typecheck
```

## Building Features

Refer to ./.agents/skills/remix/SKILL.md

Domain language: `CONTEXT.md`. ADRs: `docs/adr/`.

## Starter Layout

- `app/actions/controller.tsx` owns the top-level route actions (assets + home shell)
- `app/ui/app-shell.tsx` / `app/ui/document.tsx` render the PWA document and shell
- `app/assets/` contains the browser entry, install hint, and main client app
- `app/data/` owns IndexedDB Devices, Host metrics, Shortcuts, Wallpaper export
- `app/routes.ts` defines the shared route contract (assets + home only)
- `app/router.ts` wires routes and the custom render middleware
- `app/assets.ts` owns the server-side asset pipeline
- Root `public/` contains static files (manifest, icons, Netlify headers)
- `scripts/build.tsx` emits the static `dist/` PWA with service worker

## Route Ownership

- Start from `app/routes.ts` and map each route to the narrowest owner on disk.
- Put top-level route actions in `app/actions/controller.tsx`.
- Client navigation (New / Continue / Browse / Edit) lives in `app/assets/app.tsx`.
- Move shared UI to `app/ui/`, not `app/actions/`.

## Build-Out Notes

- Prefer putting code in the narrowest owner before introducing shared modules.
- Avoid generic dumping-ground directories like `app/lib/` or `app/components/`.
- Devices are Host-local (IndexedDB). Do not reintroduce a shared server Device store without an ADR.
