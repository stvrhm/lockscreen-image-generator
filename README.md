# Test Device Lockscreens

A small internal tool for labeling shared/pooled test devices (iOS and
Android) with an identifying lockscreen wallpaper — so anyone who picks up a
physical device can tell what it's for.

For each device you record a label, platform, and free-form notes (Markdown:
`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``), see a live phone-frame
preview as you type, and export a ready-to-use lockscreen PNG (1284×2778,
sized for export at iPhone resolution) with one click. Devices are listed on
the home page with search-by-label, and can be edited or deleted.

## Stack

Built on [Remix](https://www.npmjs.com/package/remix) (the server-driven UI
framework, not React Router's old Remix) with server-rendered actions,
client-hydrated islands for interactive widgets, and a JSON file
(`db/devices.json`) as the entire persistence layer — this is a small internal
tool, not a production data store.

## App Shape

- `app/actions/controller.tsx` owns the top-level route actions (home page).
- `app/actions/devices/controller.tsx` owns device CRUD actions (new, create,
  edit, update, destroy).
- `app/actions/devices/device-form-page.tsx` renders the add/edit device page.
- `app/actions/devices/public/device-form-widget.tsx` is the hydrated form
  widget: live phone-frame preview, Markdown-aware text layout, and
  client-side canvas rendering for the exported PNG.
- `app/actions/home-page.tsx` renders the device list with search.
- `app/actions/public/` contains other browser-hydrated bits (delete
  confirmation button) and the client runtime entry.
- `app/data/devices.ts` is the data-access layer over `db/devices.json`.
- `app/routes.ts` defines the shared route contract used by server and
  browser modules for type-safe hrefs.
- `app/router.ts` wires routes to handlers and installs the standard Remix UI
  renderer used by actions.
- `app/assets.ts` owns the server-side asset pipeline used by the asset route
  and render middleware.
- Root `public/` contains static files served unchanged from the app root.

## Commands

```sh
npm i
npm run dev        # dev server with auto-restart
npm run hmr        # dev server with hot module reloading
npm run start      # production server
npm test
npm run typecheck
```
