import { css } from 'remix/ui'

import { cluster, flow, region, wrapper } from './cube/index.ts'
import { theme } from './theme.ts'

export const pageStyle = [
  wrapper({ gutter: theme.space.lg, maxWidth: '76rem' }),
  region(theme.space.lg),
  flow({ flowSpace: theme.space['lg-xl'] }),
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
