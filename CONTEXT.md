# Test Device Lockscreens

Internal tool for labeling a test phone with an identifying lockscreen wallpaper so anyone who picks up that physical unit can tell what it is for. Work is local on the Host (usually one Device per Host); there is no shared team catalog and no server Device store.

## Language

**Device**:
A labeled wallpaper project stored on the Host (identity, label, platform, notes, export settings). Typically one active Device per Host; Browse holds revisions and duplicates, not a team inventory. Devices can be deleted from Browse; with none left, Continue is hidden.
_Avoid_: Phone (alone), handset, unit, server record

**Host**:
The phone currently running the installed app — usually the same physical phone the Wallpaper is for. Its screen metrics drive automatic export size; its platform is inferred for preview chrome and Shortcut filtering (with override if wrong).
_Avoid_: Client, browser, device (for this meaning)

**Draft**:
In-progress Device state on this Host. Continue always resumes the last Draft here with no network round trip.
_Avoid_: Unsaved session, temporary file

**Label**:
The Device’s stable display name — used in Browse, duplicate naming, download filenames, and as primary identity text on the Wallpaper. Distinct from Notes.
_Avoid_: Title, name (alone), heading

**Notes**:
The free-form Markdown body that appears on the wallpaper. Inserted shortcuts become part of Notes; Notes are not a list of blocks. Drag-and-drop block editing is out of scope for now.
_Avoid_: Description, content blocks, text modules (as the stored shape)

**Shortcut**:
An optional composer action that inserts a labeled Markdown snapshot into Notes. Shortcuts may use measured Host details or best-effort detected OS metadata; they are not live-linked fields and are not user-editable for now.
_Avoid_: Tag (unless UI chrome), suggestion, template (unless we later mean a full Notes preset)

**Detected OS**:
The operating-system name and version inferred from the Host browser when the browser exposes useful information. It is a best-effort hint, not verified device identity; unavailable values are omitted.
_Avoid_: Verified OS, device model, raw user agent

**Export size**:
The pixel dimensions of the wallpaper file. Either automatic (from Host CSS size × device pixel ratio) or a user-chosen custom size.
_Avoid_: Image size (alone), resolution (alone), quality (for dimensions), Size (the file-encoding preset)

**Export encoding**:
How the Wallpaper file is encoded. Two presets: **Quality** (= PNG, default) and **Size** (= JPEG at a fixed compression). No numeric quality slider. Distinct from Export size.
_Avoid_: Format (alone), quality slider, WebP

**Wallpaper**:
The downloadable or shareable lockscreen image produced from Label/Notes under fixed styling (no theming for now). The app offers **Save to Photos** (the system share sheet, falling back to a download where sharing files is unsupported) and a plain Download; a web app cannot write to Photos directly or set the system wallpaper — the user finishes in the share sheet and Photos/Settings. Saving a Wallpaper also saves its Device; **Save Device** stores the Device alone.
_Avoid_: Lockscreen (alone), PNG (as the concept), screenshot

**Start options**:
Home entry choices: **New** (fresh Device), **Continue** (last Draft on this Host; hidden if none), **Browse** (Devices on this Host only — edit, duplicate, or delete). Duplicate creates a new Device with copied Notes, platform, and export settings, a new id, and a distinct label (e.g. `Copy of …` or empty).
_Avoid_: Dashboard, home feed, team library
