import { css, type Handle, type RemixNode } from 'remix/component'

import { theme } from './theme.ts'

/** A non-interactive label for a status or category. */
export function Badge(handle: Handle<{ children?: RemixNode }>) {
  return () => <span mix={badgeStyle}>{handle.props.children}</span>
}

const badgeStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  border: '1px solid var(--border)',
  borderRadius: theme.radius.full,
  padding: '0.75ex 1.5ex',
  color: 'var(--text-muted)',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
  lineHeight: 1,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
})
