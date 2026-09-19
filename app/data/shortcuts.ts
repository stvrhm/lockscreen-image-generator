import type { Platform } from './devices.ts'

export interface Shortcut {
  id: string
  label: string
  insert: string
  platforms?: Platform[]
}

export const SHORTCUTS: Shortcut[] = [
  {
    id: 'env-staging',
    label: 'Staging',
    insert: '**Staging**',
  },
  {
    id: 'env-prod',
    label: 'Production',
    insert: '**Production**',
  },
  {
    id: 'do-not-reset',
    label: 'Do not reset',
    insert: 'Do not factory reset',
  },
  {
    id: 'qa',
    label: 'QA',
    insert: 'QA device',
  },
  {
    id: 'build',
    label: 'Build',
    insert: 'Build: `',
  },
  {
    id: 'ios-only',
    label: 'TestFlight',
    insert: 'TestFlight build',
    platforms: ['ios'],
  },
  {
    id: 'android-only',
    label: 'Internal track',
    insert: 'Play internal track',
    platforms: ['android'],
  },
]

export function shortcutsFor(platform: Platform): Shortcut[] {
  return SHORTCUTS.filter(
    (shortcut) => !shortcut.platforms || shortcut.platforms.includes(platform),
  )
}
