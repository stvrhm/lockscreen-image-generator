import type { NotesEdit } from './set-heading.ts'

/**
 * Inserts whole lines at the Notes cursor, replacing any selection. Line
 * breaks are added only where needed so the inserted lines sit on lines of
 * their own; the cursor ends right after them.
 */
export function insertLines({ text, start, end }: NotesEdit, lines: string): NotesEdit {
  const before = text.slice(0, start)
  const after = text.slice(end)
  const lead = before && !before.endsWith('\n') ? '\n' : ''
  const trail = after && !after.startsWith('\n') ? '\n' : ''
  const cursor = before.length + lead.length + lines.length
  return { end: cursor, start: cursor, text: before + lead + lines + trail + after }
}
