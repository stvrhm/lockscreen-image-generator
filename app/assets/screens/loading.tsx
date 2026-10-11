import { css } from 'remix/component'

import { flow, wrapper } from '../../ui/cube/index.ts'
import { theme } from '../../ui/theme.ts'
import { strings } from '../../strings.ts'
import { mutedStyle } from '../../ui/screen-styles.ts'

/** Shown by the SPA runtime while the first route resolves. */
export function LoadingScreen() {
  return () => (
    <output mix={loadingStyle} aria-live="polite">
      <div mix={loadingMarkStyle} aria-hidden="true" />
      <div mix={loadingCopyStyle}>
        <p mix={loadingTitleStyle}>{strings.loading.title}</p>
        <p mix={mutedStyle}>{strings.loading.body}</p>
      </div>
    </output>
  )
}

const loadingStyle = [
    wrapper({ gutter: theme.space.lg, maxWidth: '52rem' }),
    css({
      alignContent: 'center',
      display: 'grid',
      gap: theme.space.xs,
      minHeight: 'min(70dvh, 32rem)',
      placeItems: 'center',
      textAlign: 'center',
    }),
  ],
  loadingMarkStyle = css({
    '@media (prefers-reduced-motion: reduce)': {
      animation: 'none',
      background: 'var(--accent)',
      borderColor: 'var(--accent)',
    },
    animation: 'loading-spin 0.85s linear infinite',
    border: '3px solid rgba(94, 184, 255, 0.2)',
    borderRadius: '50%',
    borderTopColor: 'var(--accent)',
    height: '34px',
    width: '34px',
  }),
  loadingCopyStyle = flow({ flowSpace: theme.space.xs }),
  loadingTitleStyle = css({
    fontSize: theme.fontSize.h3,
    fontWeight: theme.fontWeight.bold,
  })
