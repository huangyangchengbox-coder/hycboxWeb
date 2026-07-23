import { apiRequest } from './client'

/** 管理员发布列表 */
export function listPublications(page = 1, pageSize = 50) {
  return apiRequest('/admin/publications', {
    params: { page, pageSize }
  })
}

/** 驾驶舱房间配送状态 */
export function getDeliveryMap(publicationId) {
  return apiRequest('/admin/cockpit/delivery-map', {
    params: { publicationId }
  })
}

/** 小区期数与楼栋骨架 */
export function getPhases(communityId) {
  return apiRequest('/community/phases', {
    params: { communityId },
    auth: false
  })
}

/** 某栋某单元全部房间 */
export function getRooms(communityId, phaseId, buildingId, unit) {
  return apiRequest('/community/rooms', {
    params: { communityId, phaseId, buildingId, unit },
    auth: false
  })
}
