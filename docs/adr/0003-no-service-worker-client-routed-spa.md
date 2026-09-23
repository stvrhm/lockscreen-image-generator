# No service worker; screens routed in the browser on remix/spa

The PWA exists so the app can be installed on every test phone, nobody has to remember the URL, and each deploy reaches every Host with an update toast. Offline launch is not a requirement. We ship no service worker: the app is installable from the manifest alone and always loads from the network, so every launch is current. Updates are detected by polling `version.json` against the build id seen at load; applying one is a reload. `dist/sw.js` remains only as a one-shot cleanup worker that unregisters itself and deletes the old `tdl-*` caches on Hosts that installed an earlier build, and nothing may register it. Screens are routed in the browser by `remix/spa`: the server and the static build serve assets and one neutral shell document with an empty body, and each browser route action resolves its data and renders exactly one screen, so development and production run the same routing code.

## Considered Options

- A precaching service worker for offline launch was removed. It called `skipWaiting()` during install, which broke the waiting-worker state the update toast depended on, and its cache-first navigation could pin an installed Host to a stale release.
- Prerendering one screen into `index.html` and re-deriving the route from `window.location` after hydration was replaced. Every deep link shipped Home's markup, the route table existed twice, and two screens could render into the same document.
- Deleting `sw.js` outright was rejected because Hosts still controlled by the old worker would never recover.

## Reintroducing offline support

Only with a new ADR, and only if the service worker precaches a build atomically, deletes only its own `tdl-*` caches, caches only known assets, and has tests that upgrade a Host from one build to the next.
