import { attrs, css, type Handle } from 'remix/ui'
import * as popover from 'remix/ui/popover'

import { strings } from '../../strings.ts'
import { Button } from '../../ui/button.tsx'
import { theme } from '../../ui/theme.ts'

/**
 * Icon beside the Notes label. Opens a dialog of the authoring rules.
 * Placement is the popover primitive's default.
 */
export function FormattingHelpButton(handle: Handle) {
  let open = false

  function show() {
    open = true
    handle.update()
  }

  function hide() {
    open = false
    handle.update()
  }

  return () => (
    <popover.Context>
      <Button
        variant="toolbar"
        size="icon"
        label={strings.editor.formattingHelp}
        mix={[
          triggerStyle,
          attrs({
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': 'formatting-help',
          }),
          popover.anchor({}),
          popover.focusOnHide(),
        ]}
        onClick={() => (open ? hide() : show())}
      >
        ⓘ
      </Button>
      <div
        id="formatting-help"
        role="dialog"
        aria-labelledby="formatting-help-title"
        tabIndex={-1}
        mix={[
          panelStyle,
          popover.focusOnShow(),
          popover.surface({
            open,
            onHide: hide,
            restoreFocusOnHide: true,
            // The button toggles the dialog itself. Treating that click as an
            // outside click as well would close and immediately reopen it.
            closeOnAnchorClick: false,
          }),
        ]}
      >
        <p id="formatting-help-title" mix={titleStyle}>
          {strings.editor.formattingHelp}
        </p>
        <ul mix={listStyle}>
          {strings.editor.formattingHelpRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </popover.Context>
  )
}

const triggerStyle = css({
  fontSize: '1.125rem',
  fontWeight: theme.fontWeight.medium,
})

const panelStyle = css({
  position: 'fixed',
  inset: 'auto',
  margin: 0,
  width: 'min(22rem, calc(100vw - 32px))',
  padding: theme.space.sm,
  border: '1px solid var(--border)',
  borderRadius: theme.radius.md,
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'var(--shadow-soft)',
  outline: 'none',
  opacity: 0,
  transform: 'translateY(-4px)',
  transition:
    'opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1), overlay 160ms ease-out, display 160ms ease-out',
  transitionBehavior: 'allow-discrete',
  '&:popover-open': {
    opacity: 1,
    transform: 'translate(0, 0)',
  },
  '&[data-anchor-placement^="top"]': { transform: 'translateY(4px)' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'opacity 160ms ease-out, overlay 160ms ease-out, display 160ms ease-out',
    transform: 'none',
    '&:popover-open': { transform: 'none' },
    '&[data-anchor-placement^="top"]': { transform: 'none' },
  },
})

const titleStyle = css({
  margin: 0,
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
})

const listStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.space['2xs'],
  margin: `${theme.space.xs} 0 0`,
  padding: 0,
  paddingInlineStart: '1.1em',
  fontSize: theme.fontSize.small,
  lineHeight: theme.leading.standard,
})
