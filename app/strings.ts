// UI copy for Test Device Lockscreens.
export const strings = {
  appName: 'Test Device Lockscreens',
  appShortName: 'Lockscreens',
  appTagline: 'Label this phone’s lockscreen',

  loading: {
    title: 'Preparing Lockscreens',
    body: 'Opening your local workspace…',
  },

  start: {
    title: 'Make a lockscreen that identifies this Host',
    subtitle: 'Create a Wallpaper, download it, and set it from Photos. Everything stays on this Host.',
    new: 'Create a lockscreen',
    continue: 'Continue your Draft',
    browse: 'Browse saved Devices',
    continueHint: 'Your last Draft is saved on this Host.',
    steps: [
      { title: 'Add a Label', body: 'Give this Host a name people can recognize.' },
      { title: 'Add Notes', body: 'Write the details that should appear on the Wallpaper.' },
      { title: 'Download', body: 'Save it, then choose Use as Wallpaper in Photos.' },
    ],
  },

  browse: {
    title: 'On this phone',
    empty: 'No devices yet. Start a new one.',
    edit: 'Edit',
    duplicate: 'Duplicate',
    delete: 'Delete',
    back: 'Back',
    confirmDelete: 'Delete this device?',
  },

  editor: {
    titleNew: 'New device',
    titleEdit: 'Edit device',
    label: 'Label',
    notes: 'Notes',
    notesHint: 'Supports **bold**, *italic*, `code`, ~~strike~~',
    platform: 'Platform',
    platformInferred: 'Inferred from this phone',
    platformOverride: 'Override',
    shortcuts: 'Shortcuts',
    exportSize: 'Export size',
    exportSizeAuto: 'Auto',
    exportSizeCustom: 'Custom',
    width: 'Width',
    height: 'Height',
    encoding: 'File',
    encodingQuality: 'Quality',
    encodingSize: 'Size',
    encodingQualityHint: 'PNG — sharpest',
    encodingSizeHint: 'JPEG — smaller file',
    save: 'Save',
    download: 'Download',
    share: 'Share',
    applyHint: 'After download or share: Photos → Use as Wallpaper',
    preview: 'Live preview',
    back: 'Back',
    saved: 'Saved',
  },

  install: {
    title: 'Keep Lockscreens on this Host',
    body:
      'Add the app to your Home Screen for quick access, offline use, and more reliable Drafts.',
    steps: 'Tap Share, then “Add to Home Screen”.',
    dismiss: 'Maybe later',
  },
} as const
