import { apiRequest } from './client'

/** 小程序首页业务入口显隐 */
export function getHubEntries() {
  return apiRequest('/admin/hub-entries')
}

export function updateHubEntries(payload) {
  return apiRequest('/admin/hub-entries', {
    method: 'PUT',
    body: payload || {}
  })
}
