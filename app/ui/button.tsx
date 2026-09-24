import { css, on, type Handle, type RemixNode } from 'remix/ui'

import { theme } from './theme.ts'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'link'
  | 'destructive'
  | 'accent'
  | 'toolbar'
  | 'segment'

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export type ButtonShape = 'default' | 'pill'

const baseStyle = css({
  '--button-bg': 'transparent',
  '--button-fg': 'var(--text)',
  '--button-border': '0',
  appearance: 'none',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.4em',
  margin: 0,
  maxWidth: '100%',
  border: 'var(--button-border)',
  borderRadius: theme.radius.sm,
  background: 'var(--button-bg)',
  color: 'var(--button-fg)',
  font: 'inherit',
  fontWeight: theme.fontWeight.semibold,
  lineHeight: 1,
  textAlign: 'center',
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': {
    background: 'var(--button-bg-hover, var(--button-bg))',
    color: 'var(--button-fg-hover, var(--button-fg))',
  },
  '&:focus-visible': {
    outline: '2px solid var(--accent)',
    outlineOffset: '1px',
  },
  '&:disabled, &[aria-disabled="true"]': {
    cursor: 'not-allowed',
    opacity: 0.55,
  },
  '&[aria-pressed="true"], &[aria-expanded="true"]': {
    background: 'var(--button-bg-pressed, var(--button-bg))',
    color: 'var(--button-fg-pressed, var(--button-fg))',
    boxShadow: 'var(--button-ring, none)',
  },
})

const variantStyle = {
  primary: css({
    '--button-bg': 'var(--text)',
    '--button-fg': '#09090b',
    '--button-bg-hover': '#ffffff',
    minHeight: '2.875rem',
    padding: `${theme.space.xs} ${theme.space.sm}`,
  }),
  secondary: css({
    '--button-bg': 'var(--surface-2)',
    '--button-fg': 'var(--text)',
    '--button-bg-hover': 'var(--surface-3)',
    boxShadow: 'inset 0 0 0 1px var(--border)',
    minHeight: '2.875rem',
    padding: `${theme.space.xs} ${theme.space.sm}`,
  }),
  outline: css({
    '--button-bg': 'transparent',
    '--button-fg': 'var(--text)',
    '--button-bg-hover': 'var(--surface-2)',
    boxShadow: 'inset 0 0 0 1px var(--border)',
    minHeight: '2.875rem',
    padding: `${theme.space.xs} ${theme.space.sm}`,
  }),
  ghost: css({
    '--button-bg': 'transparent',
    '--button-fg': 'var(--accent)',
    '--button-fg-hover': 'var(--accent-strong)',
    minHeight: 0,
    padding: '4px 0',
    fontWeight: 600,
  }),
  link: css({
    '--button-bg': 'transparent',
    '--button-fg': 'var(--accent)',
    '--button-fg-hover': 'var(--accent-strong)',
    justifyContent: 'flex-start',
    minHeight: 0,
    padding: 0,
    fontWeight: 600,
    textDecoration: 'underline',
  }),
  destructive: css({
    '--button-bg': 'transparent',
    '--button-fg': 'var(--danger)',
    '--button-bg-hover': 'rgba(240, 113, 120, 0.12)',
    boxShadow: 'inset 0 0 0 1px var(--danger)',
    minHeight: '2.875rem',
    padding: `${theme.space.xs} ${theme.space.sm}`,
  }),
  accent: css({
    '--button-bg': 'var(--accent)',
    '--button-fg': 'var(--page)',
    '--button-bg-hover': 'var(--accent-strong)',
    minHeight: '2.75rem',
    padding: '0.45em 0.8em',
  }),
  toolbar: css({
    '--button-bg': 'transparent',
    '--button-fg': 'var(--text-muted)',
    '--button-bg-hover': 'var(--surface-2)',
    '--button-fg-hover': 'var(--text)',
    '--button-bg-pressed': 'var(--surface-2)',
    '--button-fg-pressed': 'var(--text)',
    '--button-ring': 'inset 0 0 0 1px var(--text)',
    borderRadius: '6px',
    fontWeight: theme.fontWeight.bold,
  }),
  segment: css({
    '--button-bg': 'var(--surface)',
    '--button-fg': 'var(--text-muted)',
    '--button-fg-hover': 'var(--text)',
    '--button-bg-pressed': 'var(--surface-3)',
    '--button-fg-pressed': 'var(--text)',
    '--button-ring': 'inset 0 0 0 1px var(--border)',
    borderRadius: 0,
    minHeight: '2.75rem',
    padding: `${theme.space['2xs']} ${theme.space.xs}`,
  }),
} as const

const sizeStyle = {
  default: css({}),
  sm: css({
    minHeight: '2.5rem',
    padding: '6px 12px',
    fontSize: '13px',
  }),
  lg: css({
    minHeight: '3rem',
  }),
  icon: css({
    width: '2.75rem',
    minWidth: '2.25rem',
    height: '2.625rem',
    minHeight: 0,
    flexShrink: 1,
    padding: 0,
    lineHeight: 1,
    textBoxTrim: 'trim-both',
    textBoxEdge: 'cap alphabetic',
  }),
} as const

const pillStyle = css({ borderRadius: theme.radius.full })

export function buttonVariants(
  options: { variant?: ButtonVariant; size?: ButtonSize; shape?: ButtonShape } = {},
) {
  let variant = options.variant ?? 'primary'
  let size = options.size ?? 'default'
  return [
    baseStyle,
    variantStyle[variant],
    sizeStyle[size],
    options.shape === 'pill' ? pillStyle : null,
  ]
}

export function Button(
  handle: Handle<{
    children?: RemixNode
    variant?: ButtonVariant
    size?: ButtonSize
    shape?: ButtonShape
    href?: string
    type?: 'button' | 'submit' | 'reset'
    pressed?: boolean
    disabled?: boolean
    label?: string
    onClick?: () => void
    mix?: unknown
  }>,
) {
  return () => {
    let { children, variant, size, shape, href, type, pressed, disabled, label, onClick, mix } =
      handle.props
    let styles = [
      buttonVariants({ variant, size, shape }),
      ...(Array.isArray(mix) ? mix : mix == null ? [] : [mix]),
      onClick ? on<HTMLElement>('click', onClick) : null,
    ]
    if (href) {
      return (
        <a href={href} aria-label={label} mix={styles}>
          {children}
        </a>
      )
    }
    return (
      <button
        type={type ?? 'button'}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed === undefined ? undefined : pressed ? 'true' : 'false'}
        mix={styles}
      >
        {children}
      </button>
    )
  }
}
