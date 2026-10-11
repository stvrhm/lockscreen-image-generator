import { type Handle, css } from 'remix/component'

import type { IconName } from '../assets/icons/icon-name.ts'

export type { IconName } from '../assets/icons/icon-name.ts'

export interface IconProps {
  name: IconName
  label?: string
}

const iconStyle = css({
  display: 'inline-block',
  flex: 'none',
  height: '1em',
  verticalAlign: '-0.125em',
  width: '1em',
})

/** An external sprite icon, decorative unless an accessible label is supplied. */
export function Icon(handle: Handle<IconProps>) {
  const preload = globalThis.document.querySelector<HTMLLinkElement>('link[data-icon-sprite]')
  if (!preload) {
    throw new Error('The icon sprite preload is missing from the app shell')
  }
  const spriteHref = preload.href

  return () => {
    const { name, label } = handle.props
    return (
      <svg
        aria-hidden={label ? undefined : 'true'}
        aria-label={label}
        role={label ? 'img' : undefined}
        viewBox="0 0 24 24"
        focusable="false"
        mix={iconStyle}
      >
        <use href={`${spriteHref}#${name}`} />
      </svg>
    )
  }
}
