# Local-first Device storage on the Host (IndexedDB)

The app is shifting from a shared server `db/devices.json` catalog to an installable PWA used on the test phone itself. We store Devices only on the Host in IndexedDB: no team sync, no server Device CRUD. Continue/Browse never need a network round trip. Sharing with colleagues is via an exported Device project file or the rendered Wallpaper image — not a live shared database. Import creates a new local Device with its own identity.

The project file is a manual transfer format, not automatic backup or sync. If the browser evicts storage, an exported project file can be imported again; without one, the local Device must be recreated. `navigator.storage.persist()` is requested as a best effort and its result is not checked.
