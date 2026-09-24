import { css, type MixInput } from 'remix/ui'

type CubeMix = MixInput<Element>
const regionStyle = css({ paddingBlock: 'var(--region-space, var(--space-xl))' })

export function region(space?: string): CubeMix {
  return [regionStyle, space ? css({ '--region-space': space }) : []]
}

export function visuallyHidden(): CubeMix {
  return css({
    border: '0',
    clip: 'rect(0 0 0 0)',
    height: '0',
    margin: '0',
    overflow: 'hidden',
    padding: '0',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px',
  })
}
