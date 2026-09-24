import type { Handle } from 'remix/ui'

import { Button } from '../../ui/button.tsx'

export function SegmentButton(
  handle: Handle<{ active: boolean; label: string; onSelect: () => void }>,
) {
  return () => {
    let { active, label, onSelect } = handle.props
    return (
      <Button variant="segment" pressed={active} onClick={onSelect}>
        {label}
      </Button>
    )
  }
}
