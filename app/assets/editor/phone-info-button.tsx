import { css, on, type Handle } from 'remix/ui'
import * as popover from 'remix/ui/popover'

import {
  phoneInfoItems,
  phoneInfoNotes,
  readPhoneInfo,
  type PhoneInfo,
} from '../../data/phone-info.ts'
import { strings } from '../../strings.ts'
import { theme } from '../../ui/theme.ts'
import { formatButtonStyle } from './format-button.tsx'

/**
 * Toolbar button whose overlay (re-)inserts the Host's Phone info into Notes,
 * read fresh each time it opens. `onAdd` receives Notes lines in the pre-fill
 * format and owns focus afterwards.
 */
export function PhoneInfoButton(handle: Handle<{ onAdd: (lines: string) => void }>) {
  let open = false
  let info: PhoneInfo | undefined
  let restoreFocus = true
  let reads = 0

  function show() {
    open = true
    restoreFocus = true
    info = undefined
    let read = ++reads
    handle.update()
    void readPhoneInfo().then((result) => {
      if (read !== reads || handle.signal.aborted) return
      info = result
      handle.update()
    })
  }

  function hide() {
    open = false
    handle.update()
  }

  function add(lines: string) {
    // Focus goes to Notes, not back to this button.
    restoreFocus = false
    hide()
    handle.props.onAdd(lines)
  }

  return () => {
    let items = info ? rows(info) : []
    let allLines = info ? phoneInfoNotes(info) : ''
    return (
      <popover.Context>
        <button
          type="button"
          aria-label={strings.editor.phoneInfo}
          aria-haspopup="dialog"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls="phone-info-overlay"
          mix={[
            formatButtonStyle,
            triggerStyle,
            popover.anchor({ placement: 'bottom-end', offset: 8 }),
            popover.focusOnHide(),
            on('click', () => (open ? hide() : show())),
          ]}
        >
          ⓘ
        </button>
        <div
          id="phone-info-overlay"
          role="dialog"
          aria-labelledby="phone-info-title"
          tabIndex={-1}
          mix={[
            panelStyle,
            popover.focusOnShow(),
            popover.surface({ open, onHide: hide, restoreFocusOnHide: restoreFocus }),
          ]}
        >
          <p id="phone-info-title" mix={titleStyle}>
            {strings.editor.phoneInfo}
          </p>
          {!info ? (
            <p mix={mutedStyle}>{strings.editor.phoneInfoDetecting}</p>
          ) : items.length === 0 ? (
            <p mix={mutedStyle}>{strings.editor.phoneInfoEmpty}</p>
          ) : (
            <>
              <ul mix={listStyle}>
                {items.map((item) => (
                  <li key={item.name} mix={rowStyle}>
                    <span mix={rowTextStyle}>
                      <span mix={mutedStyle}>{item.name}</span>
                      <span mix={valueStyle}>{item.value}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={`${strings.editor.phoneInfoAdd} ${item.name}`}
                      mix={[addButtonStyle, on('click', () => add(item.line))]}
                    >
                      {strings.editor.phoneInfoAdd}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                mix={[addButtonStyle, addAllStyle, on('click', () => add(allLines))]}
              >
                {strings.editor.phoneInfoAddAll}
              </button>
            </>
          )}
        </div>
      </popover.Context>
    )
  }
}

function rows(info: PhoneInfo) {
  return phoneInfoItems(info).map((item) => ({ ...item, name: itemNames[item.kind] }))
}

const itemNames = {
  model: strings.editor.phoneInfoModel,
  os: strings.editor.phoneInfoOS,
}

const triggerStyle = css({
  marginInlineStart: 'auto',
  fontSize: '1.125rem',
  fontWeight: theme.fontWeight.medium,
  '&[aria-expanded="true"]': { background: 'var(--surface-2)', color: 'var(--text)' },
})

const panelStyle = css({
  position: 'fixed',
  inset: 'auto',
  margin: 0,
  width: 'min(18rem, calc(100vw - 32px))',
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
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space.xs,
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

const mutedStyle = css({
  margin: 0,
  fontSize: theme.fontSize.small,
  color: 'var(--text-muted)',
})

const listStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.space['3xs'],
  margin: 0,
  padding: 0,
  listStyle: 'none',
})

const rowStyle = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.space.xs,
})

const rowTextStyle = css({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
})

const valueStyle = css({
  fontWeight: theme.fontWeight.semibold,
  overflowWrap: 'anywhere',
})

const addButtonStyle = css({
  appearance: 'none',
  flex: '0 0 auto',
  minHeight: '40px',
  padding: '6px 12px',
  border: '1px solid var(--border)',
  borderRadius: '999px',
  background: 'transparent',
  color: 'var(--text)',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  ':hover': { background: 'var(--surface-2)' },
  ':focus-visible': { outline: '2px solid var(--accent)', outlineOffset: '1px' },
})

const addAllStyle = css({ alignSelf: 'stretch' })
