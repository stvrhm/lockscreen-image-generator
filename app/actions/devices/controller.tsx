import { parseSafe, type Issue } from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { redirect } from 'remix/response/redirect'
import { createController } from 'remix/router'

import {
  createDevice,
  deleteDevice,
  findDevice,
  labelSchema,
  notesSchema,
  platformSchema,
  updateDevice,
} from '../../data/devices.ts'
import { routes } from '../../routes.ts'
import { DeviceFormPage } from './device-form-page.tsx'

const deviceFormSchema = f.object({
  label: f.field(labelSchema),
  platform: f.field(platformSchema),
  notes: f.field(notesSchema),
})

function issuesByField(issues: readonly Issue[]) {
  let errors: Record<string, string> = {}
  for (let issue of issues) {
    let key = issue.path?.[0]
    if (typeof key === 'string' && !(key in errors)) errors[key] = issue.message
  }
  return errors
}

export default createController(routes.devices, {
  actions: {
    new(context) {
      return context.render(
        <DeviceFormPage mode="create" actionHref={routes.devices.create.href()} />,
      )
    },

    async create(context) {
      let formData = context.get(FormData)
      let parsed = parseSafe(deviceFormSchema, formData)
      if (!parsed.success) {
        return context.render(
          <DeviceFormPage
            mode="create"
            actionHref={routes.devices.create.href()}
            values={Object.fromEntries(formData) as Record<string, string>}
            errors={issuesByField(parsed.issues)}
          />,
          { status: 400 },
        )
      }

      await createDevice(parsed.value)
      return redirect(routes.home.href(), 303)
    },

    async edit(context) {
      let device = await findDevice(context.params.deviceId)
      if (!device) return new Response('Not Found', { status: 404 })

      return context.render(
        <DeviceFormPage
          mode="edit"
          actionHref={routes.devices.update.href({ deviceId: device.id })}
          values={device}
        />,
      )
    },

    async update(context) {
      let device = await findDevice(context.params.deviceId)
      if (!device) return new Response('Not Found', { status: 404 })

      let formData = context.get(FormData)
      let parsed = parseSafe(deviceFormSchema, formData)
      if (!parsed.success) {
        return context.render(
          <DeviceFormPage
            mode="edit"
            actionHref={routes.devices.update.href({ deviceId: device.id })}
            values={{ ...device, ...(Object.fromEntries(formData) as Record<string, string>) }}
            errors={issuesByField(parsed.issues)}
          />,
          { status: 400 },
        )
      }

      await updateDevice(device.id, parsed.value)
      return redirect(routes.home.href(), 303)
    },

    async destroy(context) {
      await deleteDevice(context.params.deviceId)
      return redirect(routes.home.href(), 303)
    },
  },
})
