/** 恒大名都户型不排这些层，与后端房间主数据一致 */
const SKIP_FLOORS = new Set([4, 13, 14, 24])

export function skippedFloors(communityId) {
  if (!communityId || communityId === 'hengda_mingdu') return SKIP_FLOORS
  return new Set()
}

export function floorsOf(maxFloor, communityId) {
  const skip = skippedFloors(communityId)
  const floors = []
  const top = Number(maxFloor) || 1
  for (let floor = top; floor >= 1; floor -= 1) {
    if (!skip.has(floor)) floors.push(floor)
  }
  return floors
}

export function roomNoOf(floor, index) {
  return `${floor}${String(index).padStart(2, '0')}`
}

/** 1、2、15 栋每层 4 户（两前两后），其余楼栋每层至少 3 户（前二后一） */
const FOUR_HOUSE_BUILDINGS = new Set(['1', '2', '15'])

export function householdsPerFloor(building) {
  const id = String(building?.buildingId || building?.id || '')
  return FOUR_HOUSE_BUILDINGS.has(id) ? 4 : 3
}

/**
 * 一层户位按整栋排，不按单元重复。
 * 3 户：正面左、正面右、背面居中。4 户：正面两户、背面两户。
 */
export function homeSlots(count) {
  const n = Math.max(1, Number(count) || 1)
  if (n >= 4) {
    return [
      { apartment: 1, t: 0.27, face: 'front', side: 'left' },
      { apartment: 2, t: 0.73, face: 'front', side: 'right' },
      { apartment: 3, t: 0.27, face: 'rear', side: 'left' },
      { apartment: 4, t: 0.73, face: 'rear', side: 'right' }
    ].slice(0, n)
  }
  if (n === 3) {
    return [
      { apartment: 1, t: 0.27, face: 'front', side: 'left' },
      { apartment: 2, t: 0.73, face: 'front', side: 'right' },
      { apartment: 3, t: 0.5, face: 'rear', side: 'left' }
    ]
  }
  if (n === 2) {
    return [
      { apartment: 1, t: 0.32, face: 'front', side: 'left' },
      { apartment: 2, t: 0.68, face: 'front', side: 'right' }
    ]
  }
  return [{ apartment: 1, t: 0.5, face: 'front', side: 'left' }]
}

export function unitOfHome(slot, units) {
  const n = Math.max(1, Number(units) || 1)
  if (n <= 1 || slot?.side !== 'right') return 1
  return 2
}

function hashString(text) {
  let h = 2166136261
  const src = String(text || 'preview')
  for (let i = 0; i < src.length; i += 1) {
    h ^= src.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function listHouseholds(building, phase, communityId) {
  const units = Math.max(1, Number(building.units) || 1)
  const slots = homeSlots(householdsPerFloor(building))
  const homes = []
  for (const floor of floorsOf(building.maxFloor, communityId)) {
    for (const slot of slots) {
      const unit = unitOfHome(slot, units)
      homes.push({
        phaseId: phase.id,
        phaseName: phase.name || phase.id,
        buildingId: String(building.id),
        buildingName: building.name || `${building.id}号楼`,
        unit,
        floor,
        roomNo: roomNoOf(floor, slot.apartment),
        face: slot.face
      })
    }
  }
  return homes
}

/**
 * 没有真实到户订单时，按发布 id 稳定撒一批示意户。
 * 只覆盖少数楼栋，方便总览上看出黄/绿，点进去能对上同一批格子。
 */
export function buildDemoRooms(phases, communityId, seedText) {
  const rand = mulberry32(hashString(seedText || communityId || 'preview'))
  const buildings = []
  for (const phase of phases || []) {
    for (const building of phase.buildings || []) {
      buildings.push({ phase, building })
    }
  }
  if (!buildings.length) return []

  const picked = buildings
    .map((item) => ({ item, n: rand() }))
    .sort((a, b) => a.n - b.n)
    .slice(0, Math.min(8, buildings.length))
    .map((row) => row.item)

  const rooms = []
  for (const { phase, building } of picked) {
    const homes = listHouseholds(building, phase, communityId)
    if (!homes.length) continue
    const pendingTarget = 3 + Math.floor(rand() * 5)
    const completedTarget = 2 + Math.floor(rand() * 4)
    const order = homes
      .map((home) => ({ home, n: rand() }))
      .sort((a, b) => a.n - b.n)
      .map((row) => row.home)
    const take = Math.min(order.length, pendingTarget + completedTarget)
    for (let i = 0; i < take; i += 1) {
      const home = order[i]
      const status = i < pendingTarget ? 'pending' : 'completed'
      rooms.push({
        ...home,
        roomId: `${home.phaseId}_${home.buildingId}_${home.unit}_${home.roomNo}`,
        status,
        quantity: 1 + Math.floor(rand() * 3),
        simulated: true
      })
    }
  }
  return rooms
}

export function roomsOfBuilding(rooms, phaseId, buildingId) {
  return (rooms || []).filter(
    (room) => room.phaseId === phaseId && String(room.buildingId) === String(buildingId)
  )
}

/** 一层一行：每格一户，户数按整栋计算 */
export function buildFloorRows(building, communityId, roomStatuses) {
  const units = Math.max(1, Number(building.units) || 1)
  const slots = homeSlots(householdsPerFloor(building))
  const byKey = new Map()
  for (const room of roomStatuses || []) {
    byKey.set(`${room.unit}_${room.roomNo}`, room)
  }
  return floorsOf(building.maxFloor, communityId).map((floor) => ({
    floor,
    units: [{
      unit: 0,
      cells: slots.map((slot) => {
        const unit = unitOfHome(slot, units)
        const roomNo = roomNoOf(floor, slot.apartment)
        const hit = byKey.get(`${unit}_${roomNo}`)
        return {
          key: `${unit}_${roomNo}`,
          unit,
          floor,
          roomNo,
          face: slot.face,
          status: hit?.status || 'empty',
          quantity: hit?.quantity || 0,
          simulated: !!hit?.simulated
        }
      })
    }]
  }))
}
