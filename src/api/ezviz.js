import { apiRequest } from './client'

export function getEzvizDevices() {
  return apiRequest('/admin/ezviz/devices')
}

export function getEzvizLive(deviceSerial) {
  return apiRequest('/admin/ezviz/live', { params: { deviceSerial } })
}
