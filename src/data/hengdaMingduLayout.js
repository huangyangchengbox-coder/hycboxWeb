/**
 * 宜昌·恒大名都园区近似落位。
 * 二期按「恒大名都·御峰」总平图排布（北上、西=东城大道、南=东方大道）。
 * 坐标系：+x 东，+z 南；原点约在二期中心水景附近（米）。
 */

export const HENGDA_COMMUNITY_ID = 'hengda_mingdu'

/** 每层视觉高度（米） */
export const FLOOR_HEIGHT_M = 3

/**
 * 二期楼栋中心落位（对照总平：北排 19–22，中北 23–24，中排 25–28，南排 29–31）。
 * 图上 25-1/25-2 对应数据里同一栋「25号楼」的双单元。
 */
const PHASE2_POSITIONS = {
  // 北沿（未售白楼一带）
  19: { x: -95, z: -110 },
  20: { x: -45, z: -110 },
  21: { x: 5, z: -110 },
  22: { x: 55, z: -105 },
  // 中北
  23: { x: -25, z: -55 },
  24: { x: 35, z: -50 },
  // 中排（在售蓝楼）
  25: { x: -85, z: 5 },
  26: { x: -35, z: 5 },
  27: { x: 15, z: 8 },
  28: { x: 65, z: 10 },
  // 南排（靠近东方大道）
  29: { x: -55, z: 75 },
  30: { x: -5, z: 78 },
  31: { x: 45, z: 80 },
  // 总平未标号：13–18 暂靠西侧商业街内侧，便于后续再校准
  13: { x: -130, z: -80 },
  14: { x: -130, z: -40 },
  15: { x: -130, z: 0 },
  16: { x: -130, z: 40 },
  17: { x: -130, z: 80 },
  18: { x: -130, z: 120 },
  // 配套/独立楼，靠东南配套区
  B3: { x: 95, z: 95 }
}

/** 一期：东方大道以南（相对二期原点偏南） */
const PHASE1_POSITIONS = {
  1: { x: -80, z: 160 },
  2: { x: -40, z: 160 },
  3: { x: 0, z: 160 },
  4: { x: 40, z: 160 },
  5: { x: 80, z: 160 },
  6: { x: -60, z: 200 },
  7: { x: -20, z: 200 },
  8: { x: 20, z: 200 },
  10: { x: 60, z: 200 }
}

/** 三期：缩略图在西侧规划地（东城大道以西一带） */
const PHASE3_POSITIONS = {
  11: { x: -200, z: -40 },
  12: { x: -200, z: 10 },
  33: { x: -200, z: 60 },
  34: { x: -240, z: -20 },
  36: { x: -240, z: 30 },
  40: { x: -240, z: 80 }
}

const PHASE_POSITIONS = {
  phase1: PHASE1_POSITIONS,
  phase2: PHASE2_POSITIONS,
  phase3: PHASE3_POSITIONS
}

/** 兼容旧网格：无显式坐标时的兜底原点 */
const PHASE_ORIGIN = {
  phase1: { x: -40, z: 180 },
  phase2: { x: 0, z: 0 },
  phase3: { x: -220, z: 20 }
}

const PHASE_GRID = {
  phase1: [
    ['1', '2', '3', '4', '5'],
    ['6', '7', '8', '10']
  ],
  phase2: [
    ['19', '20', '21', '22'],
    ['23', '24'],
    ['25', '26', '27', '28'],
    ['29', '30', '31']
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
  const width = 14 + units * 6
  const depth = 12 + Math.min(rooms, 4) * 1.5
  return { width, depth }
}

function resolvePosition(phaseId, buildingId, colIdx, rowIdx) {
  const table = PHASE_POSITIONS[phaseId]
  const fixed = table?.[String(buildingId)]
  if (fixed) return { x: fixed.x, z: fixed.z }
  const origin = PHASE_ORIGIN[phaseId] || { x: 0, z: 0 }
  return {
    x: origin.x + colIdx * COL_GAP,
    z: origin.z + rowIdx * ROW_GAP
  }
}

/**
 * 将接口返回的 phases 合并为 3D 可用的楼栋列表。
 * @param {Array<{id:string,name:string,buildings:Array}>} phases
 */
export function buildCampusLayout(phases) {
  const list = []
  const phaseList = Array.isArray(phases) ? phases : []

  for (const phase of phaseList) {
    const phaseId = phase.id
    const grid = PHASE_GRID[phaseId]
    const byId = new Map((phase.buildings || []).map((b) => [String(b.id), b]))
    const placed = new Set()

    if (grid) {
      grid.forEach((row, rowIdx) => {
        row.forEach((bid, colIdx) => {
          const building = byId.get(String(bid))
          if (!building) return
          const { width, depth } = footprint(building)
          const floors = Number(building.maxFloor) || 1
          const pos = resolvePosition(phaseId, building.id, colIdx, rowIdx)
          list.push({
            key: `${phaseId}_${building.id}`,
            phaseId,
            phaseName: phase.name || phaseId,
            buildingId: String(building.id),
            name: building.name || `${building.id}号楼`,
            x: pos.x,
            z: pos.z,
            width,
            depth,
            height: floors * FLOOR_HEIGHT_M,
            floors
          })
          placed.add(String(building.id))
          byId.delete(String(bid))
        })
      })
    }

    // 有显式坐标但未进网格的楼（如二期 13–18、B3）
    const table = PHASE_POSITIONS[phaseId] || {}
    for (const [bid, pos] of Object.entries(table)) {
      if (placed.has(bid)) continue
      const building = byId.get(bid)
      if (!building) continue
      const { width, depth } = footprint(building)
      const floors = Number(building.maxFloor) || 1
      list.push({
        key: `${phaseId}_${building.id}`,
        phaseId,
        phaseName: phase.name || phaseId,
        buildingId: String(building.id),
        name: building.name || `${building.id}号楼`,
        x: pos.x,
        z: pos.z,
        width,
        depth,
        height: floors * FLOOR_HEIGHT_M,
        floors
      })
      byId.delete(bid)
    }

    let extra = 0
    for (const building of byId.values()) {
      const { width, depth } = footprint(building)
      const floors = Number(building.maxFloor) || 1
      const col = extra % 4
      const row = Math.floor(extra / 4) + (grid ? grid.length : 0)
      const pos = resolvePosition(phaseId, building.id, col, row)
      list.push({
        key: `${phaseId}_${building.id}`,
        phaseId,
        phaseName: phase.name || phaseId,
        buildingId: String(building.id),
        name: building.name || `${building.id}号楼`,
        x: pos.x,
        z: pos.z,
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

/** 二期总平图（相对园区本地坐标的铺图参数，单位米） */
export const PHASE2_PLAN_OVERLAY = {
  url: `${import.meta.env.BASE_URL}geo/hengda-phase2-plan.png`,
  /** 图中心对齐本地坐标原点附近略偏南（水景+南排之间） */
  centerX: 0,
  centerZ: -10,
  /** 图宽约覆盖东城大道到东侧规划路 */
  widthM: 360,
  heightM: 320,
  opacity: 0.82
}
