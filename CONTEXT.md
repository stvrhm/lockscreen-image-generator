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
A hardcoded boilerplate chip that inserts a text snippet into Notes. Optionally filtered by inferred (or overridden) platform; not derived from screen size; not user-editable for now.
_Avoid_: Tag (unless UI chrome), suggestion, template (unless we later mean a full Notes preset)

**Export size**:
The pixel dimensions of the wallpaper file. Either automatic (from Host CSS size × device pixel ratio) or a user-chosen custom size.
_Avoid_: Image size (alone), resolution (alone), quality (for dimensions), Size (the file-encoding preset)

**Export encoding**:
How the Wallpaper file is encoded. Two presets: **Quality** (= PNG, default) and **Size** (= JPEG at a fixed compression). No numeric quality slider. Distinct from Export size.
_Avoid_: Format (alone), quality slider, WebP

**Wallpaper**:
The downloadable or shareable lockscreen image produced from Label/Notes under fixed styling (no theming for now). The app offers Download and Share only; it cannot set the system wallpaper — the user finishes in Photos/Settings.
_Avoid_: Lockscreen (alone), PNG (as the concept), screenshot

**Start options**:
Home entry choices: **New** (fresh Device), **Continue** (last Draft on this Host; hidden if none), **Browse** (Devices on this Host only — edit, duplicate, or delete). Duplicate creates a new Device with copied Notes, platform, and export settings, a new id, and a distinct label (e.g. `Copy of …` or empty).
_Avoid_: Dashboard, home feed, team library
