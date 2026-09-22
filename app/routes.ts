import { get, route } from 'remix/routes'

export let routes = route({
  // Served by the Node asset pipeline. Never resolved by the browser router:
  // module URLs are fetched by the browser itself, not navigated to.
  assets: get('/assets/*path'),

  // Browser-owned screens. The SPA router in `app/assets/browser-router.ts`
  // resolves these; the server only ever returns the shell document for them,
  // so development and production run the same routing code.
  screens: {
    home: '/',
    newDevice: get('/devices/new'),
    continueDevice: get('/devices/continue'),
    browseDevices: get('/devices'),
    editDevice: get('/devices/:id/edit'),
  },
})
