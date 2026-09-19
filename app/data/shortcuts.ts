export interface ShortcutContext {
  width: number
  height: number
  pixelRatio: number
  detectedOS?: string
}

export interface Shortcut {
  id: string
  label: string
  insert: string
}

export function shortcutsFor(context: ShortcutContext): Shortcut[] {
  let shortcuts: Shortcut[] = [
    {
      id: 'canvas-size',
      label: 'Canvas size',
      insert: `**Canvas:** ${context.width} × ${context.height}px`,
    },
    {
      id: 'pixel-density',
      label: 'Pixel density',
      insert: `**Pixel density:** ${context.pixelRatio}×`,
    },
  ]
  if (context.detectedOS) {
    shortcuts.push({
      id: 'detected-os',
      label: 'Detected OS',
      insert: `**Detected OS:** ${context.detectedOS}`,
    })
  }
  return shortcuts
}
