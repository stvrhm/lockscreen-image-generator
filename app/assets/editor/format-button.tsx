import { css, on, ref, type Handle } from 'remix/ui'
import * as popover from 'remix/ui/popover'

import { theme } from '../../ui/theme.ts'

const TOOLTIP_DELAY = 750

const TOOLTIP_CLOSE_DELAY = 500

let tooltipWarmUntil = 0

let activeTooltipHide: ((skipExitAnimation?: boolean) => void) | undefined

export function FormatButton(
  handle: Handle<{ label: string; symbol: string; onSelect: () => void }>,
) {
  let visible = false
  let immediate = false
  let immediateExit = false
  let tooltipSurface: (HTMLElement & { hidePopover?: () => void }) | null = null
  let showTimer: ReturnType<typeof setTimeout> | undefined
  let hideTimer: ReturnType<typeof setTimeout> | undefined
  let tooltipId = `format-tooltip-${handle.props.label.toLowerCase().replaceAll(' ', '-')}`

  function clearTimers() {
    if (showTimer) clearTimeout(showTimer)
    if (hideTimer) clearTimeout(hideTimer)
    showTimer = undefined
    hideTimer = undefined
  }

  function hide(skipExitAnimation = false) {
    clearTimers()
    immediateExit = skipExitAnimation
    visible = false
    tooltipSurface?.hidePopover?.()
    if (activeTooltipHide === hide) activeTooltipHide = undefined
    tooltipWarmUntil = Date.now() + TOOLTIP_CLOSE_DELAY
    handle.update()
  }

  function showImmediately(skipAnimation = false) {
    clearTimers()
    if (visible) return
    activeTooltipHide?.(true)
    immediate = skipAnimation
    immediateExit = false
    visible = true
    activeTooltipHide = hide
    tooltipWarmUntil = Date.now() + TOOLTIP_CLOSE_DELAY
    handle.update()
  }

  function showAfterHover() {
    clearTimers()
    let skipAnimation = tooltipWarmUntil > Date.now()
    let delay = skipAnimation ? 0 : TOOLTIP_DELAY
    showTimer = setTimeout(() => showImmediately(skipAnimation), delay)
  }

  function hideAfterHover() {
    clearTimers()
    hideTimer = setTimeout(hide, TOOLTIP_CLOSE_DELAY)
  }

  return () => {
    let { label, symbol, onSelect } = handle.props
    return (
      <popover.Context>
        <span
          mix={[
            tooltipTriggerStyle,
            popover.anchor({ placement: 'top', offset: 8 }),
            on('mouseenter', showAfterHover),
            on('mouseleave', hideAfterHover),
          ]}
        >
          <button
            type="button"
            aria-label={label}
            aria-describedby={tooltipId}
            mix={[
              formatButtonStyle,
              popover.focusOnHide(),
              on('click', onSelect),
              on('focus', () => showImmediately()),
              on('blur', () => hide()),
              on('pointerdown', () => hide()),
            ]}
          >
            {symbol}
          </button>
        </span>
        <span
          id={tooltipId}
          role="tooltip"
          mix={[
            tooltipStyle,
            immediate ? tooltipImmediateStyle : null,
            immediateExit ? tooltipImmediateExitStyle : null,
            ref((node) => {
              tooltipSurface = node as HTMLElement & { hidePopover?: () => void }
            }),
            popover.surface({
              open: visible,
              onHide: () => hide(),
              restoreFocusOnHide: false,
            }),
          ]}
        >
          {label}
        </span>
      </popover.Context>
    )
  }
}

export const formatButtonStyle = css({
  appearance: 'none',
  width: '2.75rem',
  minWidth: '2.25rem',
  flexShrink: 1,
  height: '2.625rem',
  display: 'inline-grid',
  placeItems: 'center',
  border: 0,
  borderRadius: '6px',
  background: 'transparent',
  color: 'var(--text-muted)',
  fontWeight: theme.fontWeight.bold,
  cursor: 'pointer',
  ':hover': { background: 'var(--surface-2)', color: 'var(--text)' },
  ':focus-visible': {
    outline: '2px solid var(--accent)',
    outlineOffset: '1px',
  },
})

const tooltipTriggerStyle = css({
  position: 'relative',
  display: 'inline-flex',
  minWidth: 0,
})

const tooltipStyle = css({
  position: 'fixed',
  inset: 'auto',
  margin: 0,
  overflow: 'visible',
  padding: '5px 8px',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'var(--shadow-soft)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.medium,
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  opacity: 0,
  transform: 'translateY(4px)',
  transition:
    'opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1), overlay 160ms ease-out, display 160ms ease-out',
  transitionBehavior: 'allow-discrete',
  '&:popover-open': {
    opacity: 1,
    transform: 'translate(0, 0)',
  },
  '&:not(:popover-open)': {
    pointerEvents: 'none',
  },
  '&[data-anchor-placement^="bottom"]': {
    transform: 'translateY(-4px)',
  },
  '&[data-anchor-placement^="left"]': {
    transform: 'translateX(4px)',
  },
  '&[data-anchor-placement^="right"]': {
    transform: 'translateX(-4px)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    width: '8px',
    height: '8px',
    left: '50%',
    bottom: '-5px',
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    background: 'var(--surface-3)',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="bottom"]::after': {
    top: '-5px',
    right: 'auto',
    bottom: 'auto',
    left: '50%',
    borderTop: '1px solid var(--border)',
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderBottom: 0,
    transform: 'translateX(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="left"]::after': {
    top: '50%',
    right: '-5px',
    bottom: 'auto',
    left: 'auto',
    borderTop: 0,
    borderLeft: 0,
    borderRight: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="right"]::after': {
    top: '50%',
    right: 'auto',
    bottom: 'auto',
    left: '-5px',
    borderTop: '1px solid var(--border)',
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderBottom: 0,
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'opacity 160ms ease-out, overlay 160ms ease-out, display 160ms ease-out',
    transform: 'none',
    '&:popover-open': { transform: 'none' },
    '&[data-anchor-placement^="bottom"]': { transform: 'none' },
    '&[data-anchor-placement^="left"]': { transform: 'none' },
    '&[data-anchor-placement^="right"]': { transform: 'none' },
  },
})

const tooltipImmediateStyle = css({
  '&:popover-open': {
    transition: 'none',
  },
})

const tooltipImmediateExitStyle = css({
  '&:not(:popover-open)': {
    transition: 'none',
  },
})
