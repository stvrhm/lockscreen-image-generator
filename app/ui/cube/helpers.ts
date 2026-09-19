import { attrs, css, type ElementProps, type MixInput } from 'remix/ui'

export type CubeMix = MixInput<Element>
export type CubeValue = string | number

type CubeVars = Record<`--${string}`, CubeValue | null | undefined>
type DataAttrs = Record<`data-${string}`, string | null | undefined | false>

export function cubeVars(vars: CubeVars): CubeMix {
  let styles: Record<string, CubeValue> = {}
  for (let [name, value] of Object.entries(vars)) {
    if (value != null) styles[name] = value
  }
  return Object.keys(styles).length === 0 ? [] : css(styles)
}

export function dataAttrs(attributes: DataAttrs): CubeMix {
  let next: Record<string, string> = {}
  for (let [name, value] of Object.entries(attributes)) {
    if (value !== false && value != null) next[name] = value
  }
  return Object.keys(next).length === 0 ? [] : attrs(next as Partial<ElementProps>)
}
