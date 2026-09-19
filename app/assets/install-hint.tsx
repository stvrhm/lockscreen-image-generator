import { clientEntry, css, on, type Handle } from 'remix/ui'

import { strings } from '../strings.ts'

const DISMISS_KEY = 'tdl:install-hint-dismissed'

export const InstallHint = clientEntry(
  import.meta.url,
  function InstallHint(handle: Handle) {
    let visible = false

    handle.queueTask(() => {
      if (shouldShow()) {
        visible = true
        handle.update()
      }
    })

    function dismiss() {
      try {
        localStorage.setItem(DISMISS_KEY, '1')
      } catch {
        // ignore
      }
      visible = false
      handle.update()
    }

    return () => {
      if (!visible) return null

      return (
        <aside mix={cardStyle} aria-label={strings.install.title}>
          <div mix={textStyle}>
            <p mix={titleStyle}>{strings.install.title}</p>
            <p mix={bodyStyle}>{strings.install.body}</p>
          </div>
          <button type="button" mix={[dismissStyle, on('click', dismiss)]}>
            {strings.install.dismiss}
          </button>
        </aside>
      )
    }
  },
)

function shouldShow(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false

  let nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return false

  let isIOS =
    /iphone|ipad|ipod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  if (!isIOS) return false

  try {
    if (localStorage.getItem(DISMISS_KEY)) return false
  } catch {
    // still show
  }
  return true
}

const cardStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '16px',
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
})

const textStyle = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
})

const titleStyle = css({
  margin: 0,
  fontSize: '15px',
  fontWeight: 600,
})

const bodyStyle = css({
  margin: 0,
  fontSize: '14px',
  color: 'var(--text-muted)',
  lineHeight: 1.45,
})

const dismissStyle = css({
  alignSelf: 'flex-start',
  appearance: 'none',
  border: 0,
  borderRadius: '8px',
  padding: '10px 14px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'var(--accent)',
  color: '#0b1220',
})
