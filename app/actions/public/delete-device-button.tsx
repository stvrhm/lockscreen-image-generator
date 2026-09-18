// Small hydrated confirm-before-delete control used on the device list rows.
import { clientEntry, css, on, type Handle, type SerializableProps } from 'remix/ui'

export interface DeleteDeviceButtonProps extends SerializableProps {
  actionHref: string
  label: string
}

export const DeleteDeviceButton = clientEntry(
  import.meta.url,
  function DeleteDeviceButton(handle: Handle<DeleteDeviceButtonProps>) {
    return () => {
      let { actionHref, label } = handle.props

      return (
        <form
          method="post"
          action={actionHref}
          mix={on('submit', (event) => {
            if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) {
              event.preventDefault()
            }
          })}
        >
          <input type="hidden" name="_method" value="delete" />
          <button type="submit" mix={buttonStyle}>
            Delete
          </button>
        </form>
      )
    }
  },
)

const buttonStyle = css({
  appearance: 'none',
  border: '1px solid #e5484d',
  borderRadius: '6px',
  background: 'transparent',
  color: '#e5484d',
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  '&:hover': { background: 'rgba(229, 72, 77, 0.1)' },
})
