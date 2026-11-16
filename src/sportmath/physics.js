import { CURVE_CONST, SHOT_CONST } from './formulas.js'

/**
 * 抛体（忽略空气阻力）：
 * 返回参数化轨迹点 + 下落到筐口平面时的水平距离与时间。
 */
export function shotTrajectory(v0, angleDeg, h0) {
  const g = SHOT_CONST.g
  const th = (angleDeg * Math.PI) / 180
  const vz = v0 * Math.sin(th)
  const vh = v0 * Math.cos(th)
  // 球心到达筐口平面（y = rimHeight）的时间：解二次方程
  const disc = vz * vz + 2 * g * (h0 - SHOT_CONST.rimHeight)
  if (disc < 0) return null // 全程够不到筐的高度
  const tHit = (vz + Math.sqrt(disc)) / g
  const points = []
  const tEnd = Math.max(tHit, 0.1) * 1.15 // 多画一点飞过头的部分
  for (let i = 0; i <= 120; i += 1) {
    const t = (i / 120) * tEnd
    const y = h0 + vz * t - 0.5 * g * t * t
    if (y < 0.05) break
    points.push([vh * t, y, 0])
  }
  return {
    points,
    tHit,
    xHit: vh * tHit,
    maxH: h0 + (vz * vz) / (2 * g),
    // 命中判定：球心过筐口平面时与筐心的水平距离 < 筐半径 - 球半径
    clearance: SHOT_CONST.rimRadius - SHOT_CONST.ballRadius
  }
}

/** 判定一次出手是否空心命中：返回 { hit, missBy }。 */
export function judgeShot(v0, angleDeg, h0, dist) {
  const traj = shotTrajectory(v0, angleDeg, h0)
  if (!traj) return { hit: false, missBy: Infinity, traj }
  const missBy = traj.xHit - dist
  return { hit: Math.abs(missBy) <= traj.clearance, missBy, traj }
}

/**
 * 全参数扫描：在 (角度, 速度) 网格上判命中。
 * 每个角度给出命中速度区间 [lo, hi]（命中窗口），
 * best = 所需速度最小（最省力）的角度——教科书结论约为 45°+修正项。
 */
export function shotWindow(h0, dist) {
  const rows = []
  for (let a = 30; a <= 70; a += 2) {
    let lo = null
    let hi = null
    for (let v = 4; v <= 14; v += 0.05) {
      const { hit } = judgeShot(v, a, h0, dist)
      if (hit) {
        if (lo === null) lo = v
        hi = v
      } else if (lo !== null) {
        break // 命中区间连续：出区间即停
      }
    }
    rows.push({ angle: a, lo, hi })
  }
  // 最省力角度：首个命中速度 vmin 最小
  let best = null
  for (const r of rows) {
    if (r.lo === null) continue
    const width = r.hi - r.lo
    if (!best || r.lo < best.lo) best = { angle: r.angle, lo: r.lo, hi: r.hi, width }
  }
  return { rows, best }
}

/**
 * 任意球：固定步长积分重力 + 线性阻力 + 马格努斯侧向力。
 * 坐标系：x 前方（球门方向），y 竖直，z 横向（侧偏）。
 * 返回轨迹、是否绕过人墙、是否进门。
 */
export function curveTrajectory(v0, spinRps, riseDeg) {
  const { ballMass, dragK, magnusS } = CURVE_CONST
  const m = ballMass
  const th = (riseDeg * Math.PI) / 180
  // 初速：主要沿 x，带一点起脚仰角
  const v = { x: v0 * Math.cos(th), y: v0 * Math.sin(th), z: 0 }
  const p = { x: 0, y: 0.11, z: 0 }
  const omega = spinRps * 2 * Math.PI // rad/s，绕竖直轴（右侧旋）
  const g = 9.81
  const dt = 1 / 240
  const points = []
  let wallPassed = false
  let wallCleared = false
  let result = { goal: false, crossbar: false, wallHit: false, reachedWall: false, endX: 0, endY: 0, endZ: 0 }
  for (let i = 0; i < 2400; i += 1) {
    const speed = Math.hypot(v.x, v.y, v.z)
    // 马格努斯：ω=(0,ω,0)，v=(vx,vy,vz) → ω×v = (ω·vz, 0, −ω·vx)
    const fMx = magnusS * omega * v.z
    const fMz = -magnusS * omega * v.x
    v.x += (fMx / m - dragK * speed * v.x) * dt
    v.y += (-g - dragK * speed * v.y) * dt
    v.z += (fMz / m - dragK * speed * v.z) * dt
    p.x += v.x * dt
    p.y += v.y * dt
    p.z += v.z * dt
    if (i % 3 === 0) points.push([p.x, p.y, p.z])
    // 人墙判定：x 越过人墙时，高度低于墙高且 |z| 在墙宽内 → 打墙（轨迹终止）
    if (!wallPassed && p.x >= CURVE_CONST.wallDist) {
      wallPassed = true
      result.reachedWall = true
      wallCleared = p.y > CURVE_CONST.wallHeight || Math.abs(p.z) > CURVE_CONST.wallWidth / 2
      if (!wallCleared) {
        result.wallHit = true
        result.endX = p.x
        result.endY = Math.max(0, p.y)
        result.endZ = p.z
        break
      }
    }
    // 进门判定：x 到门线时，|z| < 半门宽 且 y < 门高
    if (p.x >= CURVE_CONST.goalDist) {
      result.goal = Math.abs(p.z) < CURVE_CONST.goalWidth / 2 && p.y < CURVE_CONST.goalHeight && p.y > 0
      result.crossbar = p.y >= CURVE_CONST.goalHeight
      result.endX = p.x
      result.endY = p.y
      result.endZ = p.z
      break
    }
    // 地面停滚 / 越过门后
    if (p.y < 0 || p.x > CURVE_CONST.goalDist + 6) {
      result.endX = p.x
      result.endY = Math.max(0, p.y)
      result.endZ = p.z
      break
    }
  }
  result.wallCleared = wallCleared
  result.points = points
  return result
}

/**
 * 找到"真拐弯进门"的最低转速（绕侧偏移 ≥ 0.6 m，排除越顶吊射直进）。
 */
export function minSpinForGoal(v0, riseDeg) {
  for (let spin = 0; spin <= 14; spin += 0.25) {
    const r = curveTrajectory(v0, spin, riseDeg)
    if (r.wallCleared && r.goal && Math.abs(r.endZ) >= 0.6) return spin
  }
  return null
}

/** Karvonen 目标心率。 */
export function targetHR(hrMax, rhr, intensity) {
  return Math.round((hrMax - rhr) * intensity + rhr)
}

export function hrMax(age) {
  return Math.round(220 - age)
}
