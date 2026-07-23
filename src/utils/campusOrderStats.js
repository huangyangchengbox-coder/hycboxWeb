/**
 * 将驾驶舱房间状态按楼栋聚合，供 3D 园区着色。
 * key = `${phaseId}_${buildingId}`
 */

/**
 * @param {Array<{phaseId?:string,buildingId?:string,status?:string,quantity?:number}>} rooms
 * @returns {Record<string, { pending: number, completed: number, quantity: number }>}
 */
export function aggregateBuildingOrderStats(rooms) {
  const map = {}
  for (const room of rooms || []) {
    const phaseId = room.phaseId
    const buildingId = room.buildingId
    if (!phaseId || buildingId == null || buildingId === '') continue
    const key = `${phaseId}_${buildingId}`
    if (!map[key]) {
      map[key] = { pending: 0, completed: 0, quantity: 0 }
    }
    const st = room.status
    if (st === 'pending') map[key].pending += 1
    else if (st === 'completed') map[key].completed += 1
    map[key].quantity += Number(room.quantity) || 0
  }
  return map
}

/** 有待派送优先黄；仅已配送绿；无单灰 */
export function buildingStatusTone(stat) {
  if (!stat) return 'empty'
  if (stat.pending > 0) return 'pending'
  if (stat.completed > 0) return 'completed'
  return 'empty'
}

export const BUILDING_TONE_COLOR = {
  pending: 0xfbbf24,
  completed: 0x34d399,
  empty: 0xcbd5e1
}
