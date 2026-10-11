import { type Handle, css } from 'remix/component'

import { Button } from './button.tsx'
import { animateEntrance, animateExit, animateLayout, spring } from '@remix-run/ui/animation'

const DEFAULT_TOAST_DURATION_MS = 6000,
 MINIMUM_TOAST_DURATION_MS = 1000

export type ToastVariant = 'default' | 'success' | 'error'

export interface ToastAction {
  label: string
  onClick: () => void | Promise<void>
}

export interface ToastOptions {
  title: string
  description?: string
  action?: ToastAction
  variant?: ToastVariant
  duration?: number | null
}

interface ToastRecord extends ToastOptions {
  id: string
}

type ToastSubscriber = (toast: ToastRecord) => void

let nextToastId = 0,
 subscribers = new Set<ToastSubscriber>(),
 pendingToasts: ToastRecord[] = []

export function toast(options: ToastOptions): string {
  const record: ToastRecord = { ...options, id: `toast-${++nextToastId}` }
  if (subscribers.size === 0) {
    pendingToasts.push(record)
  } else {
    subscribers.forEach((subscriber) => subscriber(record))
  }
  return record.id
}

export const showToast = toast

function subscribe(subscriber: ToastSubscriber) {
  subscribers.add(subscriber)
  const pending = pendingToasts
  pendingToasts = []
  pending.forEach(subscriber)
  return () => subscribers.delete(subscriber)
}

declare global {
  interface Window {
    tdlUpdateAvailable?: boolean
  }
}

// No service worker mediates releases, so the newest build is whatever the
// Network serves. Reloading is the whole update step.
function updateToLatest() {
  // Assigning the current URL forces a new document request in installed
  // Safari PWAs, where `location.reload()` can leave the stale client visible.
  window.location.assign(window.location.href)
}

export function ToastViewport(handle: Handle) {
  let items: ToastRecord[] = [],
   timers = new Map<string, number>(),
   pendingActions = new Set<string>(),
   reduceMotion = false,
   updateToastShown = false

  function dismiss(id: string) {
    const timer = timers.get(id)
    if (timer !== undefined) {window.clearTimeout(timer)}
    timers.delete(id)
    items = items.filter((item) => item.id !== id)
    handle.update()
  }

  function scheduleDismiss(item: ToastRecord) {
    if (item.duration === null) {return}
  const duration = item.duration ?? DEFAULT_TOAST_DURATION_MS
    timers.set(
      item.id,
    window.setTimeout(() => dismiss(item.id), Math.max(MINIMUM_TOAST_DURATION_MS, duration)),
    )
  }

  function addItem(item: ToastRecord) {
    items = [...items.filter((existing) => existing.id !== item.id), item]
    scheduleDismiss(item)
    handle.update()
  }

  function showUpdateToast() {
    if (updateToastShown) {return}
    updateToastShown = true
    toast({
      action: { label: 'Update', onClick: updateToLatest },
      description: 'A newer version of Lockscreens is ready.',
      duration: null,
      title: 'Update available',
    })
  }

  handle.queueTask(() => {
    const unsubscribe = subscribe(addItem)
    const onUpdateAvailable = () => showUpdateToast()
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches
      handle.update()
    }
    reduceMotion = motionPreference.matches
    motionPreference.addEventListener('change', onMotionPreferenceChange)
    window.addEventListener('tdl:update-available', onUpdateAvailable)

    if (window.tdlUpdateAvailable) {showUpdateToast()}

    handle.signal.addEventListener(
      'abort',
      () => {
        unsubscribe()
        window.removeEventListener('tdl:update-available', onUpdateAvailable)
        motionPreference.removeEventListener('change', onMotionPreferenceChange)
        timers.forEach((timer) => window.clearTimeout(timer))
        timers.clear()
      },
      { once: true },
    )
  })

  return () => (
    <div mix={viewportStyle} aria-label="Notifications" aria-live="polite">
      {items.map((item) => (
        <article
          key={item.id}
          mix={[
            toastStyle,
            variantStyles[item.variant ?? 'default'],
            reduceMotion
              ? animateEntrance({ duration: 120, opacity: 0 })
              : animateEntrance({
                  opacity: 0,
                  transform: 'translateY(8px) scale(0.98)',
                  ...spring('snappy'),
                }),
            reduceMotion
              ? animateExit({ duration: 100, opacity: 0 })
              : animateExit({
                  duration: 120,
                  easing: 'ease-in',
                  opacity: 0,
                  transform: 'translateY(4px) scale(0.99)',
                }),
            reduceMotion
              ? animateLayout(false)
              : animateLayout({ duration: 180, easing: 'ease-out' }),
          ]}
        >
          <div mix={copyStyle}>
            <strong>{item.title}</strong>
            {item.description ? <p>{item.description}</p> : null}
          </div>
          {item.action ? (
            <Button
              variant="accent"
              size="sm"
              mix={actionButtonStyle}
              disabled={pendingActions.has(item.id)}
              onClick={() => {
                pendingActions.add(item.id)
                handle.update()
                void item.action?.onClick()
              }}
            >
              {pendingActions.has(item.id) ? 'Updating…' : item.action.label}
            </Button>
          ) : null}
          <Button
            variant="toolbar"
            size="icon"
            label="Dismiss notification"
            mix={dismissGlyphStyle}
            onClick={() => dismiss(item.id)}
          >
            ×
          </Button>
        </article>
      ))}
    </div>
  )
}

const viewportStyle = css({
  display: 'grid',
  gap: 'var(--space-xs)',
  inset: 'auto 0 calc(env(safe-area-inset-bottom) + var(--space-sm))',
  justifyItems: 'center',
  paddingInline: 'var(--space-sm)',
  pointerEvents: 'none',
  position: 'fixed',
  zIndex: 100,
}),

 toastStyle = css({
  alignItems: 'center',
  background: 'var(--toast-background, var(--surface-2))',
  border: '1px solid var(--toast-border, var(--border))',
  borderRadius: 'var(--radius)',
  boxShadow: '0 16px 45px rgba(0, 0, 0, 0.32)',
  color: 'var(--text)',
  display: 'flex',
  gap: 'var(--space-xs)',
  padding: 'var(--space-xs) var(--space-sm)',
  pointerEvents: 'auto',
  width: 'min(100%, 440px)',
}),

 variantStyles: Record<ToastVariant, ReturnType<typeof css>> = {
  default: css({}),
  error: css({
    '--toast-border': 'rgba(248, 113, 113, 0.5)',
    '--toast-background': 'rgba(127, 29, 29, 0.94)',
  }),
  success: css({
    '--toast-border': 'rgba(74, 222, 128, 0.45)',
    '--toast-background': 'rgba(20, 83, 45, 0.92)',
  }),
},

 copyStyle = css({
  '& p': { color: 'var(--text-muted)', fontSize: 'var(--font-size-small)', margin: '0.2em 0 0' },
  '& strong': { display: 'block', fontWeight: 'var(--font-weight-semibold)' },
  flex: '1 1 auto',
  minWidth: 0,
}),

 actionButtonStyle = css({
  flexShrink: 0,
  whiteSpace: 'nowrap',
}),

 dismissGlyphStyle = css({ flex: '0 0 auto', fontSize: '1.4rem' })
