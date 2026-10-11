import { type Handle, attrs, css, on, ref } from 'remix/component'
import * as popover from '@remix-run/ui/popover'

import { Button } from '../../ui/button.tsx'
import { theme } from '../../ui/theme.ts'

const TOOLTIP_DELAY = 750,

 TOOLTIP_CLOSE_DELAY = 500

let tooltipWarmUntil = 0,

 activeTooltipHide: ((skipExitAnimation?: boolean) => void) | undefined

export function FormatButton(
  handle: Handle<{
    label: string
    symbol: string
    pressed: boolean
    onSelect: () => void
    onArm?: () => void
  }>,
) {
  let visible = false,
   immediate = false,
   immediateExit = false,
   tooltipSurface: (HTMLElement & { hidePopover?: () => void }) | null = null,
   showTimer: ReturnType<typeof setTimeout> | undefined,
   hideTimer: ReturnType<typeof setTimeout> | undefined,
   tooltipId = `format-tooltip-${handle.props.label.toLowerCase().replaceAll(' ', '-')}`

  function clearTimers() {
    if (showTimer) {clearTimeout(showTimer)}
    if (hideTimer) {clearTimeout(hideTimer)}
    showTimer = undefined
    hideTimer = undefined
  }

  function hide(skipExitAnimation = false) {
    clearTimers()
    immediateExit = skipExitAnimation
    visible = false
    tooltipSurface?.hidePopover?.()
    if (activeTooltipHide === hide) {activeTooltipHide = undefined}
    tooltipWarmUntil = Date.now() + TOOLTIP_CLOSE_DELAY
    handle.update()
  }

  function showImmediately(skipAnimation = false) {
    clearTimers()
    if (visible) {return}
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
    const skipAnimation = tooltipWarmUntil > Date.now()
    const delay = skipAnimation ? 0 : TOOLTIP_DELAY
    showTimer = setTimeout(() => showImmediately(skipAnimation), delay)
  }

  function hideAfterHover() {
    clearTimers()
    hideTimer = setTimeout(hide, TOOLTIP_CLOSE_DELAY)
  }

  return () => {
    const { label, symbol, pressed, onSelect, onArm } = handle.props
    return (
      <popover.Context>
        <span
          mix={[
            tooltipTriggerStyle,
            popover.anchor({ offset: 8, placement: 'top' }),
            on('mouseenter', showAfterHover),
            on('mouseleave', hideAfterHover),
          ]}
        >
          <Button
            variant="toolbar"
            size="icon"
            label={label}
            pressed={pressed}
            onClick={onSelect}
            mix={[
              attrs({ 'aria-describedby': tooltipId }),
              popover.focusOnHide(),
              // Keyboard focus only: a tap or click also focuses the button, and
              // Opening the tooltip between that focus and the click swallows
              // The click, so the first tap would do nothing.
              on<HTMLButtonElement>('focus', (event) => {
                if (event.currentTarget.matches(':focus-visible')) {showImmediately()}
              }),
              on<HTMLButtonElement>('blur', () => hide()),
              on<HTMLButtonElement>('pointerdown', () => {
                onArm?.()
                hide()
              }),
            ]}
          >
            {symbol}
          </Button>
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
              onHide: () => hide(),
              open: visible,
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

const tooltipTriggerStyle = css({
  display: 'inline-flex',
  minWidth: 0,
  position: 'relative',
}),

 tooltipStyle = css({
  '&::after': {
    background: 'var(--surface-3)',
    borderBottom: '1px solid var(--border)',
    borderRight: '1px solid var(--border)',
    bottom: '-5px',
    content: '""',
    height: '8px',
    left: '50%',
    position: 'absolute',
    transform: 'translateX(-50%) rotate(45deg)',
    width: '8px',
  },
  '&:not(:popover-open)': {
    pointerEvents: 'none',
  },
  '&:popover-open': {
    opacity: 1,
    transform: 'translate(0, 0)',
  },
  '&[data-anchor-placement^="bottom"]': {
    transform: 'translateY(-4px)',
  },
  '&[data-anchor-placement^="bottom"]::after': {
    borderBottom: 0,
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderTop: '1px solid var(--border)',
    bottom: 'auto',
    left: '50%',
    right: 'auto',
    top: '-5px',
    transform: 'translateX(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="left"]': {
    transform: 'translateX(4px)',
  },
  '&[data-anchor-placement^="left"]::after': {
    borderBottom: '1px solid var(--border)',
    borderLeft: 0,
    borderRight: '1px solid var(--border)',
    borderTop: 0,
    bottom: 'auto',
    left: 'auto',
    right: '-5px',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '&[data-anchor-placement^="right"]': {
    transform: 'translateX(-4px)',
  },
  '&[data-anchor-placement^="right"]::after': {
    borderBottom: 0,
    borderLeft: '1px solid var(--border)',
    borderRight: 0,
    borderTop: '1px solid var(--border)',
    bottom: 'auto',
    left: '-5px',
    right: 'auto',
    top: '50%',
    transform: 'translateY(-50%) rotate(45deg)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    '&:popover-open': { transform: 'none' },
    '&[data-anchor-placement^="bottom"]': { transform: 'none' },
    '&[data-anchor-placement^="left"]': { transform: 'none' },
    '&[data-anchor-placement^="right"]': { transform: 'none' },
    transform: 'none',
    transition: 'opacity 160ms ease-out, overlay 160ms ease-out, display 160ms ease-out',
  },
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  borderRadius: '6px',
  boxShadow: 'var(--shadow-soft)',
  color: 'var(--text)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.medium,
  inset: 'auto',
  lineHeight: 1.2,
  margin: 0,
  opacity: 0,
  overflow: 'visible',
  padding: '5px 8px',
  pointerEvents: 'none',
  position: 'fixed',
  transform: 'translateY(4px)',
  transition:
    'opacity 160ms ease-out, transform 160ms cubic-bezier(0.19, 1, 0.22, 1), overlay 160ms ease-out, display 160ms ease-out',
  transitionBehavior: 'allow-discrete',
  whiteSpace: 'nowrap',
}),

 tooltipImmediateStyle = css({
  '&:popover-open': {
    transition: 'none',
  },
}),

 tooltipImmediateExitStyle = css({
  '&:not(:popover-open)': {
    transition: 'none',
  },
})
