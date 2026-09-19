import { css, type MixInput } from 'remix/ui'

import { cubeVars, dataAttrs, type CubeValue } from './helpers.ts'

type CubeMix = MixInput<Element>

interface FlowOptions { flowSpace?: CubeValue }
interface ClusterOptions { gutter?: CubeValue; alignment?: string; justification?: string }
interface GridOptions { gutter?: CubeValue; minItemSize?: CubeValue; equalHeight?: boolean }
interface SidebarOptions {
  gutter?: CubeValue
  sidebarWidth?: CubeValue
  contentMinWidth?: CubeValue
  direction?: 'rtl' | 'stack-to-row'
}
interface SwitcherOptions { gutter?: CubeValue; targetWidth?: CubeValue }
interface WrapperOptions { gutter?: CubeValue; maxWidth?: CubeValue }
interface RepelOptions { gutter?: CubeValue; alignment?: string }

const flowStyle = css({ '& > * + *': { marginBlockStart: 'var(--flow-space, 1em)' } })
const clusterStyle = css({
  alignItems: 'var(--cluster-alignment, center)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gutter, var(--space-md))',
  justifyContent: 'var(--cluster-justification, flex-start)',
})
const gridStyle = css({
  display: 'grid',
  gap: 'var(--gutter, var(--space-xl))',
  gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min-item-size, 16rem), 1fr))',
  '&[data-equal-height]': { gridAutoRows: '1fr' },
})
const sidebarStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gutter, var(--space-xl))',
  '& > :first-child': { flexBasis: 'var(--sidebar-width, 20rem)', flexGrow: 1 },
  '& > :last-child': { flexBasis: 0, flexGrow: 999, minInlineSize: 'var(--sidebar-content-min-width, 50%)' },
  '&[data-direction="stack-to-row"]': {
    flexDirection: 'column',
    '& > :first-child': { flexBasis: 'auto', flexGrow: 0 },
    '& > :last-child': { flexBasis: 'auto', flexGrow: 0, minInlineSize: 'auto' },
    '@media (max-width: 560px)': {
      flexDirection: 'row',
      alignItems: 'flex-start',
      '& > :first-child': { flexBasis: 'auto' },
      '& > :last-child': { flexBasis: 0, flexGrow: 1, minInlineSize: 0 },
    },
  },
})
const switcherStyle = css({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gutter, var(--space-xl))',
  '& > *': { flexBasis: 'calc((var(--switcher-target-width, 40rem) - 100%) * 999)', flexGrow: 1 },
  '& > :nth-child(n + 3)': { flexBasis: '100%' },
})
const repelStyle = css({
  alignItems: 'var(--repel-alignment, center)',
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--gutter, var(--space-lg))',
  justifyContent: 'space-between',
})
const wrapperStyle = css({
  marginInline: 'auto',
  maxInlineSize: 'var(--wrapper-max-width, 100%)',
  paddingInline: 'var(--gutter, var(--space-lg))',
  width: '100%',
})

export function flow(options: FlowOptions = {}): CubeMix {
  return [flowStyle, cubeVars({ '--flow-space': options.flowSpace })]
}

export function stack(options: FlowOptions = {}): CubeMix {
  return flow(options)
}

export function cluster(options: ClusterOptions = {}): CubeMix {
  return [clusterStyle, cubeVars({ '--gutter': options.gutter, '--cluster-alignment': options.alignment, '--cluster-justification': options.justification })]
}

export function grid(options: GridOptions = {}): CubeMix {
  return [gridStyle, cubeVars({ '--gutter': options.gutter, '--grid-min-item-size': options.minItemSize }), dataAttrs({ 'data-equal-height': options.equalHeight ? '' : undefined })]
}

export function sidebar(options: SidebarOptions = {}): CubeMix {
  return [sidebarStyle, cubeVars({ '--gutter': options.gutter, '--sidebar-width': options.sidebarWidth, '--sidebar-content-min-width': options.contentMinWidth }), dataAttrs({ 'data-direction': options.direction })]
}

export function switcher(options: SwitcherOptions = {}): CubeMix {
  return [switcherStyle, cubeVars({ '--gutter': options.gutter, '--switcher-target-width': options.targetWidth })]
}

export function repel(options: RepelOptions = {}): CubeMix {
  return [repelStyle, cubeVars({ '--gutter': options.gutter, '--repel-alignment': options.alignment })]
}

export function wrapper(options: WrapperOptions = {}): CubeMix {
  return [wrapperStyle, cubeVars({ '--gutter': options.gutter, '--wrapper-max-width': options.maxWidth })]
}
