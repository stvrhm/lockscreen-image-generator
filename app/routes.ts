import { get, route } from 'remix/routes'

export let routes = route({
  assets: get('/assets/*path'),
  home: '/',
  newDevice: get('/devices/new'),
  continueDevice: get('/devices/continue'),
  browseDevices: get('/devices'),
  editDevice: get('/devices/:id/edit'),
})
