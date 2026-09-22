import { css, on, type Handle } from 'remix/ui'
import { animateEntrance, animateExit, animateLayout, spring } from 'remix/ui/animation'

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

let nextToastId = 0
let subscribers = new Set<ToastSubscriber>()
let pendingToasts: ToastRecord[] = []

export function toast(options: ToastOptions): string {
  let record: ToastRecord = { ...options, id: `toast-${++nextToastId}` }
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
  let pending = pendingToasts
  pendingToasts = []
  pending.forEach(subscriber)
  return () => subscribers.delete(subscriber)
}

declare global {
  interface Window {
    __tdlUpdateAvailable?: boolean
  }
}

// No service worker mediates releases, so the newest build is whatever the
// network serves. Reloading is the whole update step.
function updateToLatest() {
  window.location.reload()
}

export function ToastViewport(handle: Handle) {
  let items: ToastRecord[] = []
  let timers = new Map<string, number>()
  let updateToastShown = false
  let reduceMotion = false

  function dismiss(id: string) {
    let timer = timers.get(id)
    if (timer !== undefined) window.clearTimeout(timer)
    timers.delete(id)
    items = items.filter((item) => item.id !== id)
    handle.update()
  }

  function scheduleDismiss(item: ToastRecord) {
    if (item.duration === null) return
    let duration = item.duration ?? 6000
    timers.set(
      item.id,
      window.setTimeout(() => dismiss(item.id), Math.max(1000, duration)),
    )
  }

  function addItem(item: ToastRecord) {
    items = [...items.filter((existing) => existing.id !== item.id), item]
    scheduleDismiss(item)
    handle.update()
  }

  function showUpdateToast() {
    if (updateToastShown) return
    updateToastShown = true
    toast({
      title: 'Update available',
      description: 'A newer version of Lockscreens is ready.',
      action: { label: 'Update', onClick: updateToLatest },
      duration: null,
    })
  }

  handle.queueTask(() => {
    let unsubscribe = subscribe(addItem)
    let onUpdateAvailable = () => showUpdateToast()
    let motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches
      handle.update()
    }
    reduceMotion = motionPreference.matches
    motionPreference.addEventListener('change', onMotionPreferenceChange)
    window.addEventListener('tdl:update-available', onUpdateAvailable)

    if (window.__tdlUpdateAvailable) showUpdateToast()

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
              ? animateEntrance({ opacity: 0, duration: 120 })
              : animateEntrance({
                  opacity: 0,
                  transform: 'translateY(8px) scale(0.98)',
                  ...spring('snappy'),
                }),
            reduceMotion
              ? animateExit({ opacity: 0, duration: 100 })
              : animateExit({
                  opacity: 0,
                  transform: 'translateY(4px) scale(0.99)',
                  duration: 120,
                  easing: 'ease-in',
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
            <button
              type="button"
              mix={[
                actionStyle,
                on('click', () => {
                  dismiss(item.id)
                  void item.action?.onClick()
                }),
              ]}
            >
              {item.action.label}
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Dismiss notification"
            mix={[dismissStyle, on('click', () => dismiss(item.id))]}
          >
            ×
          </button>
        </article>
      ))}
    </div>
  )
}

const viewportStyle = css({
  position: 'fixed',
  zIndex: 100,
  inset: 'auto 0 calc(env(safe-area-inset-bottom) + var(--space-sm))',
  display: 'grid',
  justifyItems: 'center',
  gap: 'var(--space-xs)',
  paddingInline: 'var(--space-sm)',
  pointerEvents: 'none',
})

const toastStyle = css({
  width: 'min(100%, 440px)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-xs)',
  padding: 'var(--space-xs) var(--space-sm)',
  border: '1px solid var(--toast-border, var(--border))',
  borderRadius: 'var(--radius)',
  background: 'var(--toast-background, var(--surface-2))',
  color: 'var(--text)',
  boxShadow: '0 16px 45px rgba(0, 0, 0, 0.32)',
  pointerEvents: 'auto',
})

const variantStyles: Record<ToastVariant, ReturnType<typeof css>> = {
  default: css({}),
  success: css({
    '--toast-border': 'rgba(74, 222, 128, 0.45)',
    '--toast-background': 'rgba(20, 83, 45, 0.92)',
  }),
  error: css({
    '--toast-border': 'rgba(248, 113, 113, 0.5)',
    '--toast-background': 'rgba(127, 29, 29, 0.94)',
  }),
}

const copyStyle = css({
  minWidth: 0,
  flex: '1 1 auto',
  '& strong': { display: 'block', fontWeight: 'var(--font-weight-semibold)' },
  '& p': { margin: '0.2em 0 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-small)' },
})

const actionStyle = css({
  flex: '0 0 auto',
  minHeight: '2.75rem',
  padding: '0.45em 0.8em',
  border: 0,
  borderRadius: 'var(--radius-sm, 8px)',
  background: 'var(--accent)',
  color: 'var(--page)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
  '&:hover': { background: 'var(--accent-strong)' },
})

const dismissStyle = css({
  flex: '0 0 auto',
  width: '2.75rem',
  height: '2.75rem',
  padding: 0,
  border: 0,
  background: 'transparent',
  color: 'var(--text-muted)',
  fontSize: '1.4rem',
  lineHeight: 1,
  cursor: 'pointer',
  '&:hover': { color: 'var(--text)' },
})
