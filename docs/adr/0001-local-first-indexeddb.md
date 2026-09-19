# Local-first Device storage on the Host (IndexedDB)

The app is shifting from a shared server `db/devices.json` catalog to an installable PWA used on the test phone itself. We store Devices only on the Host in IndexedDB: no team sync, no server Device CRUD. Continue/Browse never need a network round trip. Sharing with colleagues, if ever needed, is via the Wallpaper image (or a later parked “share project” file) — not a live shared database.
