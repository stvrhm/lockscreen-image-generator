import { css, on, type Handle } from 'remix/ui'

import { theme } from '../../ui/theme.ts'

export function SegmentButton(
  handle: Handle<{ active: boolean; label: string; onSelect: () => void }>,
) {
  return () => {
    let { active, label, onSelect } = handle.props
    return (
      <button
        type="button"
        mix={[segmentButtonStyle, active ? segmentActiveStyle : null, on('click', onSelect)]}
        aria-pressed={active}
      >
        {label}
      </button>
    )
  }
}

const segmentButtonStyle = css({
  appearance: 'none',
  border: 0,
  background: 'var(--surface)',
  color: 'var(--text-muted)',
  minHeight: '2.75rem',
  padding: `${theme.space['2xs']} ${theme.space.xs}`,
  fontWeight: theme.fontWeight.semibold,
  cursor: 'pointer',
})

const segmentActiveStyle = css({
  background: 'var(--surface-3)',
  color: 'var(--text)',
  boxShadow: 'inset 0 0 0 1px var(--border)',
})
