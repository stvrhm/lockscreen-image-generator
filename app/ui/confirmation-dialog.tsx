import { css, on, ref, type Handle, type RemixNode } from 'remix/component'

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
    let { id, open, title, description, onDismiss, children } = handle.props
    if (!open) return null
    handle.queueTask(() => {
      if (!dialog || dialog.open) return
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
            if (event.target === event.currentTarget) onDismiss()
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
  width: 'min(30rem, calc(100vw - 2rem))',
  maxWidth: 'none',
  padding: theme.space.lg,
  border: '1px solid var(--border)',
  borderRadius: theme.radius.lg,
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'var(--shadow-soft)',
  '&::backdrop': { background: 'rgba(0, 0, 0, 0.68)' },
  '& h2': { marginBlock: 0, fontSize: theme.fontSize.h3 },
  '& p': { color: 'var(--text-muted)' },
})

const actionsStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: theme.space.xs,
  marginBlockStart: theme.space.lg,
})
