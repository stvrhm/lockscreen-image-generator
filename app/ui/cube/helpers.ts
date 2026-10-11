import { type ElementProps, type MixInput, attrs, css } from 'remix/component'

export type CubeMix = MixInput<Element>
export type CubeValue = string | number

type CubeVars = Record<`--${string}`, CubeValue | null | undefined>
type DataAttrs = Record<`data-${string}`, string | null | undefined | false>

export function cubeVars(vars: CubeVars): CubeMix {
  const styles: Record<string, CubeValue> = {}
  for (const [name, value] of Object.entries(vars)) {
    if (value != null) {
      styles[name] = value
    }
  }
  return Object.keys(styles).length === 0 ? [] : css(styles)
}

export function dataAttrs(attributes: DataAttrs): CubeMix {
  const next: Record<string, string> = {}
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== false && value != null) {
      next[name] = value
    }
  }
  return Object.keys(next).length === 0 ? [] : attrs(next as Partial<ElementProps>)
}
