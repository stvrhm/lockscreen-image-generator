import { css } from 'remix/ui'

import { flow, wrapper } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import { strings } from '../../strings.ts'
import { mutedStyle } from '../../ui/screen-styles.ts'

/** Shown by the SPA runtime while the first route resolves. */
export function LoadingScreen() {
  return () => (
    <div mix={loadingStyle} role="status" aria-live="polite">
      <div mix={loadingMarkStyle} aria-hidden="true" />
      <div mix={loadingCopyStyle}>
        <p mix={loadingTitleStyle}>{strings.loading.title}</p>
        <p mix={mutedStyle}>{strings.loading.body}</p>
      </div>
    </div>
  )
}

const loadingStyle = [
  wrapper({ gutter: theme.space.lg, maxWidth: '52rem' }),
  css({
    minHeight: 'min(70dvh, 32rem)',
    display: 'grid',
    placeItems: 'center',
    alignContent: 'center',
    gap: theme.space.xs,
    textAlign: 'center',
  }),
]

const loadingMarkStyle = css({
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  border: '3px solid rgba(94, 184, 255, 0.2)',
  borderTopColor: 'var(--accent)',
  animation: 'loading-spin 0.85s linear infinite',
  '@media (prefers-reduced-motion: reduce)': {
    animation: 'none',
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
})

const loadingCopyStyle = flow({ flowSpace: theme.space.xs })

const loadingTitleStyle = css({
  fontSize: theme.fontSize.h3,
  fontWeight: theme.fontWeight.bold,
})
