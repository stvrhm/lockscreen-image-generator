import type { NotesEdit } from './set-heading.ts'

/**
 * Inserts whole lines at the Notes cursor, replacing any selection. Line
 * breaks are added only where needed so the inserted lines sit on lines of
 * their own; the cursor ends right after them.
 */
export function insertLines({ text, start, end }: NotesEdit, lines: string): NotesEdit {
  let before = text.slice(0, start)
  let after = text.slice(end)
  let lead = before && !before.endsWith('\n') ? '\n' : ''
  let trail = after && !after.startsWith('\n') ? '\n' : ''
  let cursor = before.length + lead.length + lines.length
  return { text: before + lead + lines + trail + after, start: cursor, end: cursor }
}
