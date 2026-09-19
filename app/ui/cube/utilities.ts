import { css, type MixInput } from 'remix/ui'

type CubeMix = MixInput<Element>
const regionStyle = css({ paddingBlock: 'var(--region-space, var(--space-xl))' })

export function region(space?: string): CubeMix {
  return [regionStyle, space ? css({ '--region-space': space }) : []]
}
