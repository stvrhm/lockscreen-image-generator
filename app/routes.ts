import { get, resources, route } from 'remix/routes'

export const routes = route({
  assets: get('/assets/*path'),
  home: '/',
  devices: resources('devices', {
    only: ['new', 'create', 'edit', 'update', 'destroy'],
    param: 'deviceId',
  }),
})
