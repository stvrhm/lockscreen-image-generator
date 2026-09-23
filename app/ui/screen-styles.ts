import { css } from 'remix/ui'

import { cluster, flow, region, wrapper } from './cube/index.ts'
import { theme } from './theme.ts'

export const pageStyle = [
  wrapper({ gutter: theme.space.lg, maxWidth: '76rem' }),
  region(theme.space.lg),
  flow({ flowSpace: '24px' }),
]

export const headingStyle = css({
  fontSize: theme.fontSize.h2,
  fontWeight: theme.fontWeight.semibold,
  letterSpacing: '-0.02em',
})

export const mutedStyle = css({
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
})

export const hintStyle = css({
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
})

export const headerRowStyle = [
  cluster({ gutter: theme.space.md }),
  css({
    alignItems: 'baseline',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  }),
]

export const actionsRowStyle = [
  cluster({ gutter: theme.space.sm }),
  css({
    flexWrap: 'wrap',
    '@media (max-width: 560px)': {
      '& > :first-child': { flex: '1 1 100%' },
    },
  }),
]

export const primaryButtonStyle = css({
  appearance: 'none',
  border: 0,
  borderRadius: theme.radius.sm,
  padding: `${theme.space.xs} ${theme.space.sm}`,
  fontWeight: theme.fontWeight.semibold,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'var(--text)',
  color: '#09090b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '2.875rem',
})

export const secondaryButtonStyle = css({
  appearance: 'none',
  borderRadius: theme.radius.sm,
  padding: `${theme.space.xs} ${theme.space.sm}`,
  fontWeight: theme.fontWeight.semibold,
  cursor: 'pointer',
  textDecoration: 'none',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  display: 'inline-flex',
  alignItems: 'center',
})

export const ghostButtonStyle = css({
  appearance: 'none',
  border: 0,
  background: 'transparent',
  color: 'var(--accent)',
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
  padding: '4px 0',
})
