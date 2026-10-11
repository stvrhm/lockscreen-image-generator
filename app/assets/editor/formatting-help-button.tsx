import { type Handle, attrs, css } from 'remix/component'
import * as popover from '@remix-run/ui/popover'

import { strings } from '../../strings.ts'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/icon.tsx'
import { theme } from '../../ui/theme.ts'

/**
 * Icon beside the Notes label. Opens a dialog of the authoring rules.
 * Placement is the popover primitive's default.
 */
// oxlint-disable jsx-a11y/prefer-tag-over-role -- The help surface uses the popover API, separate from native dialog state.
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
            'aria-controls': 'formatting-help',
            'aria-expanded': open ? 'true' : 'false',
            'aria-haspopup': 'dialog',
          }),
          popover.anchor({}),
          popover.focusOnHide(),
        ]}
        onClick={() => (open ? hide() : show())}
      >
        <Icon name="question-mark-circle" />
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
            // Outside click as well would close and immediately reopen it.
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
// oxlint-enable jsx-a11y/prefer-tag-over-role

const triggerStyle = css({
  fontSize: '1.125rem',
  fontWeight: theme.fontWeight.medium,
}),

 panelStyle = css({
  '&:popover-open': {
    opacity: 1,
    transform: 'translate(0, 0)',
  },
  '&[data-anchor-placement^="top"]': { transform: 'translateY(4px)' },
  '@media (prefers-reduced-motion: reduce)': {
    '&:popover-open': { transform: 'none' },
    '&[data-anchor-placement^="top"]': { transform: 'none' },
    transform: 'none',
    transition: 'opacity 160ms ease-out, overlay 160ms ease-out, display 160ms ease-out',
  },
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  borderRadius: theme.radius.md,
  boxShadow: 'var(--shadow-soft)',
  color: 'var(--text)',
  inset: 'auto',
  margin: 0,
  opacity: 0,
  outline: 'none',
  padding: theme.space.sm,
  position: 'fixed',
  transform: 'translateY(-4px)',
  transition:
    'opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1), overlay 160ms ease-out, display 160ms ease-out',
  transitionBehavior: 'allow-discrete',
  width: 'min(22rem, calc(100vw - 32px))',
}),

 titleStyle = css({
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
  margin: 0,
}),

 listStyle = css({
  display: 'flex',
  flexDirection: 'column',
  fontSize: theme.fontSize.small,
  gap: theme.space['2xs'],
  lineHeight: theme.leading.standard,
  margin: `${theme.space.xs} 0 0`,
  padding: 0,
  paddingInlineStart: '1.1em',
})
