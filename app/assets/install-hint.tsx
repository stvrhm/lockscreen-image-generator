import { css, type Handle } from 'remix/ui'

import { Button } from '../ui/button.tsx'
import { flow, repel } from '../ui/cube/index.ts'
import { strings } from '../strings.ts'

const DISMISS_KEY = 'tdl:install-hint-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallHint(handle: Handle) {
  let visible = false
  let installPrompt: BeforeInstallPromptEvent | null = null
  let platform: 'ios' | 'android' = 'ios'

  handle.queueTask(() => {
    if (isAndroid()) {
      window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener)
    }

    if (shouldShowIOS()) {
      platform = 'ios'
      visible = true
      handle.update()
    }
  })

  function onBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
    if (wasDismissed()) return

    event.preventDefault()
    installPrompt = event
    platform = 'android'
    visible = true
    handle.update()
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
    visible = false
    handle.update()
  }

  async function install() {
    if (!installPrompt) return

    let prompt = installPrompt
    installPrompt = null
    visible = false
    handle.update()
    await prompt.prompt()
  }

  return () => {
    if (!visible) return null

    return (
      <aside mix={cardStyle} aria-label={strings.install.title}>
        <div mix={installIconStyle} aria-hidden="true">
          ＋
        </div>
        <div mix={textStyle}>
          <p mix={titleStyle}>{strings.install.title}</p>
          <p mix={bodyStyle}>
            {platform === 'android' ? strings.install.androidBody : strings.install.body}
          </p>
          <p mix={stepsStyle}>
            {platform === 'android' ? strings.install.androidSteps : strings.install.steps}
          </p>
        </div>
        {platform === 'android' ? (
          <Button variant="accent" mix={installAlignStyle} onClick={() => void install()}>
            {strings.install.install}
          </Button>
        ) : null}
        <Button variant="accent" mix={installAlignStyle} onClick={dismiss}>
          {strings.install.dismiss}
        </Button>
      </aside>
    )
  }
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false
  return /android/i.test(navigator.userAgent)
}

function shouldShowIOS(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false

  let nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return false

  let isIOS =
    /iphone|ipad|ipod/i.test(nav.userAgent) ||
    (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  if (!isIOS) return false

  return !wasDismissed()
}

function wasDismissed(): boolean {
  try {
    return Boolean(localStorage.getItem(DISMISS_KEY))
  } catch {
    return false
  }
}

const cardStyle = [
  repel({ gutter: '12px', alignment: 'flex-start' }),
  css({
    padding: '16px',
    background: 'linear-gradient(135deg, rgba(94, 184, 255, 0.1), var(--surface) 48%)',
    border: '1px solid rgba(94, 184, 255, 0.3)',
    borderRadius: 'var(--radius)',
  }),
]

const installIconStyle = css({
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
  width: '30px',
  height: '30px',
  borderRadius: '9px',
  background: 'rgba(94, 184, 255, 0.16)',
  color: 'var(--accent)',
  fontSize: '22px',
  lineHeight: 1,
  fontWeight: 400,
})

const textStyle = flow({ flowSpace: '6px' })

const titleStyle = css({
  fontSize: '15px',
  fontWeight: 600,
})

const bodyStyle = css({
  fontSize: '14px',
  color: 'var(--text-muted)',
  lineHeight: 1.45,
})

const stepsStyle = css({
  color: 'var(--accent)',
  fontSize: '13px',
  fontWeight: 600,
  lineHeight: 1.4,
})

const installAlignStyle = css({ alignSelf: 'flex-start' })
