import { type Handle, type RemixNode, css, on, ref } from 'remix/component'

import { theme } from './theme.ts'

/** A native, modal dialog with a small composable content/action surface. */
export function ConfirmationDialog(
  handle: Handle<{
    id: string
    open: boolean
    title: string
    description: string
    onDismiss: () => void
    children?: RemixNode
  }>,
) {
  let dialog: HTMLDialogElement | null = null

  return () => {
    const { id, open, title, description, onDismiss, children } = handle.props
    if (!open) {
      return null
    }
    handle.queueTask(() => {
      if (!dialog || dialog.open) {
        return
      }
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[autofocus], button, a[href]')?.focus()
    })
    return (
      <dialog
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        mix={[
          dialogStyle,
          ref((node) => {
            dialog = node as HTMLDialogElement | null
          }),
          on('cancel', (event) => {
            event.preventDefault()
            onDismiss()
          }),
          on('click', (event) => {
            if (event.target === event.currentTarget) {
              onDismiss()
            }
          }),
        ]}
      >
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-description`}>{description}</p>
        <div mix={actionsStyle}>{children}</div>
      </dialog>
    )
  }
}

const dialogStyle = css({
    '& h2': { fontSize: theme.fontSize.h3, marginBlock: 0 },
    '& p': { color: 'var(--text-muted)' },
    '&::backdrop': { background: 'rgba(0, 0, 0, 0.68)' },
    background: 'var(--surface-3)',
    border: '1px solid var(--border)',
    borderRadius: theme.radius.lg,
    boxShadow: 'var(--shadow-soft)',
    color: 'var(--text)',
    maxWidth: 'none',
    padding: theme.space.lg,
    width: 'min(30rem, calc(100vw - 2rem))',
  }),
  actionsStyle = css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.space.xs,
    justifyContent: 'flex-end',
    marginBlockStart: theme.space.lg,
  })
