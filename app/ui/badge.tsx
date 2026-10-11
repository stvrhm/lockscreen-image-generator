import { type Handle, type RemixNode, css } from 'remix/component'

import { theme } from './theme.ts'

/** A non-interactive label for a status or category. */
export function Badge(handle: Handle<{ children?: RemixNode }>) {
  return () => <span mix={badgeStyle}>{handle.props.children}</span>
}

const badgeStyle = css({
  alignItems: 'center',
  border: '1px solid var(--border)',
  borderRadius: theme.radius.full,
  color: 'var(--text-muted)',
  display: 'inline-flex',
  fontSize: theme.fontSize.small,
  fontWeight: theme.fontWeight.semibold,
  letterSpacing: '0.06em',
  lineHeight: 1,
  padding: '0.75ex 1.5ex',
  textTransform: 'uppercase',
})
