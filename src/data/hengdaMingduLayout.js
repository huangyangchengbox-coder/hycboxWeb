/**
 * 宜昌·恒大名都园区近似落位（非测绘坐标，后续可按总平图校准）。
 * 用于程序化生成 3D 楼栋盒子；与 buildings.json 的 phaseId/buildingId 对齐。
 */

export const HENGDA_COMMUNITY_ID = 'hengda_mingdu'

/** 每层视觉高度（米） */
export const FLOOR_HEIGHT_M = 3

/** 各期在园区坐标系中的原点（米） */
const PHASE_ORIGIN = {
  phase1: { x: -95, z: -10 },
  phase2: { x: 5, z: -20 },
  phase3: { x: 110, z: 15 }
}

/**
 * 期数内楼栋相对排布：每行若干栋，间距约 28m。
 * key = buildingId
 */
const PHASE_GRID = {
  phase1: [
    ['1', '2', '3', '4', '5'],
    ['6', '7', '8', '10']
  ],
  phase2: [
    ['13', '14', '15', '16', '17', '18'],
    ['19', '20', '21', '22', '23', '24'],
    ['25', '26', '27', '28', '29', '30'],
    ['31', 'B3']
  ],
  phase3: [
    ['11', '12', '33'],
    ['34', '36', '40']
  ]
}

const COL_GAP = 28
const ROW_GAP = 36

function footprint(building) {
  const units = Number(building.units) || 1
  const rooms = Number(building.roomsPerFloor) || 2
  // 多单元略宽，层内多户略深
  const width = 14 + units * 6
  const depth = 12 + Math.min(rooms, 4) * 1.5
  return { width, depth }
}

/**
 * 将接口返回的 phases 合并为 3D 可用的楼栋列表。
 * @param {Array<{id:string,name:string,buildings:Array}>} phases
 * @returns {Array<{key:string,phaseId:string,phaseName:string,buildingId:string,name:string,x:number,z:number,width:number,depth:number,height:number,floors:number}>}
 */
export function buildCampusLayout(phases) {
  const list = []
  const phaseList = Array.isArray(phases) ? phases : []

  for (const phase of phaseList) {
    const phaseId = phase.id
    const origin = PHASE_ORIGIN[phaseId] || { x: 0, z: 0 }
    const grid = PHASE_GRID[phaseId]
    const byId = new Map((phase.buildings || []).map((b) => [String(b.id), b]))

    if (grid) {
      grid.forEach((row, rowIdx) => {
        row.forEach((bid, colIdx) => {
          const building = byId.get(String(bid))
          if (!building) return
          const { width, depth } = footprint(building)
          const floors = Number(building.maxFloor) || 1
          list.push({
            key: `${phaseId}_${building.id}`,
            phaseId,
            phaseName: phase.name || phaseId,
            buildingId: String(building.id),
            name: building.name || `${building.id}号楼`,
            x: origin.x + colIdx * COL_GAP,
            z: origin.z + rowIdx * ROW_GAP,
            width,
            depth,
            height: floors * FLOOR_HEIGHT_M,
            floors
          })
          byId.delete(String(bid))
        })
      })
    }

    // 网格未收录的楼栋：追加到该期末尾，避免漏楼
    let extra = 0
    for (const building of byId.values()) {
      const { width, depth } = footprint(building)
      const floors = Number(building.maxFloor) || 1
      const col = extra % 4
      const row = Math.floor(extra / 4) + (grid ? grid.length : 0)
      list.push({
        key: `${phaseId}_${building.id}`,
        phaseId,
        phaseName: phase.name || phaseId,
        buildingId: String(building.id),
        name: building.name || `${building.id}号楼`,
        x: origin.x + col * COL_GAP,
        z: origin.z + row * ROW_GAP,
        width,
        depth,
        height: floors * FLOOR_HEIGHT_M,
        floors
      })
      extra += 1
    }
  }

  return list
}
