# Test Device Lockscreens

Internal tool for labeling a test phone with an identifying lockscreen wallpaper so anyone who picks up that physical unit can tell what it is for. Work is local on the Host (usually one Device per Host); there is no shared team catalog and no server Device store.

## Language

**Device**:
A labeled wallpaper project stored on the Host (identity, label, platform, notes, export settings). Typically one active Device per Host; Browse holds revisions and duplicates, not a team inventory. Devices can be deleted from Browse; with none left, Continue is hidden.
_Avoid_: Phone (alone), handset, unit, server record

**Host**:
The phone currently running the installed app — usually the same physical phone the Wallpaper is for. Its screen metrics drive automatic export size; its platform is inferred for preview chrome (with override if wrong).
_Avoid_: Client, browser, device (for this meaning)

**Draft**:
In-progress Device state on this Host. Continue always resumes the last Draft here with no network round trip.
_Avoid_: Unsaved session, temporary file

**Label**:
The Device’s stable display name — used in Browse, duplicate naming, and download filenames. It appears on the Wallpaper only when Notes are empty; identity text on the Wallpaper is written in Notes (typically as a Heading). Distinct from Notes.
_Avoid_: Title, name (alone), heading

**Notes**:
The free-form Markdown body that appears on the wallpaper. A New Device starts with Notes pre-filled from Phone info; inserted Phone info becomes ordinary Notes text. Notes are not a list of blocks. Drag-and-drop block editing is out of scope for now.
_Avoid_: Description, content blocks, text modules (as the stored shape)

**Heading**:
A Notes line marked `#` (large) or `##` (medium) that renders bigger than body text on the Wallpaper. The only way text size varies; there is no per-Device text size setting. When Notes are too tall to fit, all lines shrink together, keeping Headings proportionally larger.
_Avoid_: Title, text size setting, font size (as a user concept)

**Phone info**:
Details about the Host detected from the browser: the phone model and Detected OS, each omitted when unavailable. Read fresh from the Host whenever needed, never stored; a New Device's Label and Notes are pre-filled from it (model as a `#` Heading, OS beneath), and it can be re-inserted into Notes from the editor. Inserted text is a snapshot, not a live field. On iPhones the model is never detectable, so it appears only as "iPhone".
_Avoid_: Device info (a Device is the wallpaper project, not the phone), Shortcut, Host details, suggestion

**Detected OS**:
The operating-system name and version inferred from the Host browser when the browser exposes useful information. It is a best-effort hint, not verified device identity; unavailable values are omitted, and versions a browser is known to freeze or fake are never shown. Part of Phone info.
_Avoid_: Verified OS, device model, raw user agent

**Export size**:
The pixel dimensions of the wallpaper file. Either automatic (from Host CSS size × device pixel ratio) or a user-chosen custom size.
_Avoid_: Image size (alone), resolution (alone), quality (for dimensions), Size (the file-encoding preset)

**Export encoding**:
How the Wallpaper file is encoded. Two presets: **Quality** (= PNG, default) and **Size** (= JPEG at a fixed compression). No numeric quality slider. Distinct from Export size.
_Avoid_: Format (alone), quality slider, WebP

**Wallpaper**:
The downloadable or shareable lockscreen image produced from Label/Notes under fixed styling (no theming for now). The app offers **Save to Photos** (the system share sheet, falling back to a download where sharing files is unsupported) and a plain Download; a web app cannot write to Photos directly or set the system wallpaper — the user finishes in the share sheet and Photos/Settings. Saving a Wallpaper also saves its Device, unless the user dismisses the share sheet; **Save Device** stores the Device alone.
_Avoid_: Lockscreen (alone), PNG (as the concept), screenshot

**Start options**:
Home entry choices: **New** (fresh Device, Label and Notes pre-filled from Phone info), **Continue** (last Draft on this Host; hidden if none), **Browse** (Devices on this Host only — edit, duplicate, or delete). Duplicate creates a new Device with copied Notes, platform, and export settings, a new id, and a distinct label (e.g. `Copy of …` or empty).
_Avoid_: Dashboard, home feed, team library
