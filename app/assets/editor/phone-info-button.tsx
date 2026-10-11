import { type Handle, attrs, css } from 'remix/component'
import * as popover from '@remix-run/ui/popover'

import {
  type PhoneInfo,
  phoneInfoItems,
  phoneInfoNotes,
  readPhoneInfo,
} from '../../data/phone-info.ts'
import { strings } from '../../strings.ts'
import { Button } from '../../ui/button.tsx'
import { Icon } from '../../ui/icon.tsx'
import { theme } from '../../ui/theme.ts'

/**
 * Toolbar button whose overlay (re-)inserts the Host's Phone info into Notes,
 * read fresh each time it opens. `onAdd` receives Notes lines in the pre-fill
 * format and owns focus afterwards.
 */
// oxlint-disable jsx-a11y/prefer-tag-over-role -- A dialog popover must use a controlled div; native dialog state conflicts with showPopover().
export function PhoneInfoButton(handle: Handle<{ onAdd: (lines: string) => void }>) {
  let info: PhoneInfo | undefined,
    open = false,
    reads = 0,
    restoreFocus = true

  function show() {
    open = true
    restoreFocus = true
    info = undefined
    const read = ++reads
    handle.update()
    void readPhoneInfo().then((result) => {
      if (read !== reads || handle.signal.aborted) {
        return
      }
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
    const items = info ? rows(info) : []
    const allLines = info ? phoneInfoNotes(info) : ''
    return (
      <popover.Context>
        <Button
          variant="toolbar"
          size="icon"
          label={strings.editor.phoneInfo}
          mix={[
            triggerStyle,
            attrs({
              'aria-controls': 'phone-info-overlay',
              'aria-expanded': open ? 'true' : 'false',
              'aria-haspopup': 'dialog',
            }),
            popover.anchor({ offset: 8, placement: 'bottom-end' }),
            popover.focusOnHide(),
          ]}
          onClick={() => (open ? hide() : show())}
        >
          <Icon name="information-circle" />
        </Button>
        <div
          id="phone-info-overlay"
          role="dialog"
          aria-labelledby="phone-info-title"
          tabIndex={-1}
          mix={[
            panelStyle,
            popover.focusOnShow(),
            popover.surface({ onHide: hide, open, restoreFocusOnHide: restoreFocus }),
          ]}
        >
          <p id="phone-info-title" mix={titleStyle}>
            {strings.editor.phoneInfo}
          </p>
          {!info && <p mix={[mutedStyle, stackGapStyle]}>{strings.editor.phoneInfoDetecting}</p>}
          {info && items.length === 0 && (
            <p mix={[mutedStyle, stackGapStyle]}>{strings.editor.phoneInfoEmpty}</p>
          )}
          {info && items.length > 0 && (
            <>
              <ul mix={[listStyle, stackGapStyle]}>
                {items.map((item) => (
                  <li key={item.name} mix={rowStyle}>
                    <span mix={rowTextStyle}>
                      <span mix={mutedStyle}>{item.name}</span>
                      <span mix={valueStyle}>{item.value}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      shape="pill"
                      label={`${strings.editor.phoneInfoAdd} ${item.name}`}
                      onClick={() => add(item.line)}
                    >
                      {strings.editor.phoneInfoAdd}
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                shape="pill"
                mix={[addAllStyle, stackGapStyle]}
                onClick={() => add(allLines)}
              >
                {strings.editor.phoneInfoAddAll}
              </Button>
            </>
          )}
        </div>
      </popover.Context>
    )
  }
}
// oxlint-enable jsx-a11y/prefer-tag-over-role

function rows(info: PhoneInfo) {
  return phoneInfoItems(info).map((item) => Object.assign({}, item, { name: itemNames[item.kind] }))
}

const itemNames = {
    model: strings.editor.phoneInfoModel,
    os: strings.editor.phoneInfoOS,
  },
  triggerStyle = css({
    fontSize: '1.125rem',
    fontWeight: theme.fontWeight.medium,
    marginInlineStart: 'auto',
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
    width: 'min(18rem, calc(100vw - 32px))',
  }),
  titleStyle = css({
    fontSize: theme.fontSize.small,
    fontWeight: theme.fontWeight.semibold,
    margin: 0,
  }),
  mutedStyle = css({
    color: 'var(--text-muted)',
    fontSize: theme.fontSize.small,
    margin: 0,
  }),
  listStyle = css({
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['3xs'],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  }),
  rowStyle = css({
    alignItems: 'center',
    display: 'flex',
    gap: theme.space.xs,
    justifyContent: 'space-between',
  }),
  rowTextStyle = css({
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  }),
  valueStyle = css({
    fontWeight: theme.fontWeight.semibold,
    overflowWrap: 'anywhere',
  }),
  addAllStyle = css({ width: '100%' }),
  stackGapStyle = css({ marginTop: theme.space.xs })
