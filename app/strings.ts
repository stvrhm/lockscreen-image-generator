// UI copy for Test Device Lockscreens.
export const strings = {
  appName: 'Test Device Lockscreens',
  appShortName: 'Lockscreens',
  appTagline: 'Label this phone’s lockscreen',

  start: {
    title: 'Device lockscreens',
    subtitle: 'Everything stays on this phone.',
    new: 'New',
    continue: 'Continue',
    browse: 'Browse',
    continueHint: 'Resume the last draft on this phone',
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
    title: 'Add to Home Screen',
    body:
      'Tap Share, then “Add to Home Screen”. The installed app works offline and keeps drafts more reliably.',
    dismiss: 'Got it',
  },
} as const
