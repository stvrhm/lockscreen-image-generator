# Keep Notes as Markdown with snapshot device shortcuts

The Notes editor uses an accessible textarea with Slack-like formatting affordances, while continuing to store one Markdown body and preserving explicit Save. Device shortcuts insert labeled snapshots of useful measured or best-effort detected Host information rather than live fields, because this preserves the existing wallpaper/export model and avoids hidden synchronization or contenteditable serialization; OS metadata is shown only when the browser provides a plausible parsed value.

## Considered Options

- A `contenteditable` rich-text document with a new serialized format was rejected because it would change the Notes domain and complicate paste, selection, preview, and export behavior.
- Live-linked device fields were rejected because existing Notes should remain stable when a Device setting changes.
- Raw user-agent text and unconditional OS/device-model output were rejected because browsers reduce or spoof that data and it is not verified identity.
