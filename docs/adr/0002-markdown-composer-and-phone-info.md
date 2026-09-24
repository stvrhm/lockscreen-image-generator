# Keep Notes as Markdown with snapshot Phone info

The Notes editor uses an accessible textarea with Slack-like formatting affordances, while continuing to store one Markdown body and preserving explicit Save. Phone info (phone model and OS version) is inserted as snapshot text rather than live fields — pre-filled into a New Device's Notes and re-insertable from an editor overlay — because this preserves the existing wallpaper/export model and avoids hidden synchronization or contenteditable serialization. This replaced an earlier set of composer shortcuts (canvas size, pixel density, OS), whose size details proved useless on a wallpaper.

Browsers hide or fake these values, so detection is deliberately conservative: the iPhone model is never exposed to the web (not even via screen size, which matches several models), so iOS shows only "iPhone" for the user to edit; Safari 26+ freezes the OS version in its user agent, so the iOS version comes from the Safari version instead; Chromium on Android reports a fixed "Android 10" and model "K", so the real values come from User-Agent Client Hints and are omitted when unavailable rather than falling back to the frozen ones.

## Considered Options

- A `contenteditable` rich-text document with a new serialized format was rejected because it would change the Notes domain and complicate paste, selection, preview, and export behavior.
- Live-linked device fields were rejected because existing Notes should remain stable when a Device setting changes.
- Raw user-agent text and unconditional OS/device-model output were rejected because browsers reduce or spoof that data and it is not verified identity.
- Guessing the iPhone model from screen size and pixel ratio was rejected because one size maps to several models and the lookup table would go stale.
- Mapping Android model codes (e.g. `SM-S911B`) to marketing names was rejected for the same staleness reason; codes also distinguish regional variants, which suits test devices.
