/**
 * 发球过网轨迹的解析解（抛物线模型，忽略空气阻力）。
 *
 * 移植自「网球发球过网轨迹数学模型图示」：
 *   y(x) = h0 + x·tanθ − g·x² / (2 v² cos²θ)
 *
 * 用 1/cos²θ = 1 + tan²θ 把「过某点」的条件化成关于 u = tanθ 的一元二次方程：
 *   A·u² + B·u + C = 0,  A = g·x²/(2v²),  B = −x,  C = (y − h0) + A
 * 发球只取较低弹道的那个根，于是「贴网过去」「压发球线」「自定义角度」都能直接算。
 */

export const G = 9.8
export const NET_HEIGHT = 0.914
export const SERVICE_BOX_LEN = 6.4
export const BALL_RADIUS = 0.0335

/** 默认发球参数。身高 168 cm × 1.476 ≈ 2.48 m 击球点。 */
export const SERVE_DEFAULTS = {
  heightCm: 168,
  jumpCm: 0,
  reachRatio: 1.476,
  speedKmh: 140,
  netDist: 11.885,
  customAngleDeg: -5.2
}

export const HEIGHT_PRESETS = [160, 168, 175, 185, 195, 205]
export const COMPARE_HEIGHTS = [160, 168, 175, 185, 195, 205]

/** 击球点高度：身高级别 × 舒展系数 + 起跳增量。 */
export function contactHeight({ heightCm, reachRatio = SERVE_DEFAULTS.reachRatio, jumpCm = 0 }) {
  return (heightCm * reachRatio + jumpCm) / 100
}

/** 给定击球点、初速、发射角，求水平距离 x 处的高度。 */
export function trajectoryY(x, h0, v, thetaRad) {
  const cosT = Math.cos(thetaRad)
  const tanT = Math.tan(thetaRad)
  return h0 + x * tanT - (G * x * x) / (2 * v * v * cosT * cosT)
}

/** 求让轨迹通过 (targetX, targetY) 的较低弹道发射角（弧度）。速度不足返回 null。 */
export function solveAngleForPoint(h0, v, targetX, targetY) {
  const A = (G * targetX * targetX) / (2 * v * v)
  const B = -targetX
  const C = targetY - h0 + A
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  const u = (-B - Math.sqrt(disc)) / (2 * A)
  return Math.atan(u)
}

/** 给定发射角，求落地点距击球点的水平距离。 */
export function solveLandingX(h0, v, thetaRad) {
  const cosT = Math.cos(thetaRad)
  const sinT = Math.sin(thetaRad)
  const vy0 = v * sinT
  const vx0 = v * cosT
  const disc = vy0 * vy0 + 2 * G * h0
  if (disc < 0) return 0
  return vx0 * ((vy0 + Math.sqrt(disc)) / G)
}

/**
 * 一次算全：贴网极限、压发球线最远、自定义角度。
 * netDist 为底线到球网的水平距离（11.885 标准值，或 12.0 图示近似值）。
 */
export function computeServe(state) {
  const heightCm = state.heightCm ?? SERVE_DEFAULTS.heightCm
  const reachRatio = state.reachRatio ?? SERVE_DEFAULTS.reachRatio
  const jumpCm = state.jumpCm ?? SERVE_DEFAULTS.jumpCm
  const speedKmh = state.speedKmh ?? SERVE_DEFAULTS.speedKmh
  const netDist = state.netDist ?? SERVE_DEFAULTS.netDist
  const customAngleDeg = state.customAngleDeg ?? SERVE_DEFAULTS.customAngleDeg

  const h0 = contactHeight({ heightCm, reachRatio, jumpCm })
  const v = speedKmh / 3.6
  const serviceLineX = netDist + SERVICE_BOX_LEN

  // ① 贴网极限：球心刚好擦过网带（球下沿贴网顶）的最近落点
  let near = null
  const nearTheta = solveAngleForPoint(h0, v, netDist, NET_HEIGHT)
  if (nearTheta !== null) {
    const landX = solveLandingX(h0, v, nearTheta)
    near = {
      thetaRad: nearTheta,
      thetaDeg: (nearTheta * 180) / Math.PI,
      yAtNet: NET_HEIGHT,
      clearance: 0,
      landX,
      distFromNet: landX - netDist,
      isInBounds: landX <= serviceLineX
    }
  }

  // ② 压发球线最远落点：落点正好在发球线上
  let far = null
  const farTheta = solveAngleForPoint(h0, v, serviceLineX, 0)
  if (farTheta !== null) {
    const yAtNet = trajectoryY(netDist, h0, v, farTheta)
    const clearance = yAtNet - NET_HEIGHT
    far = {
      thetaRad: farTheta,
      thetaDeg: (farTheta * 180) / Math.PI,
      yAtNet,
      clearance,
      landX: serviceLineX,
      distFromNet: SERVICE_BOX_LEN,
      clearsNet: clearance >= 0
    }
  }

  // ③ 自定义角度对照线
  const customTheta = (customAngleDeg * Math.PI) / 180
  const customYAtNet = trajectoryY(netDist, h0, v, customTheta)
  const customLandX = solveLandingX(h0, v, customTheta)
  let status = '界内有效'
  let statusType = 'valid'
  if (customYAtNet < NET_HEIGHT) {
    status = '下网（未过网）'
    statusType = 'net'
  } else if (customLandX > serviceLineX) {
    status = '出界（超出发球线）'
    statusType = 'out'
  }
  const custom = {
    thetaRad: customTheta,
    thetaDeg: customAngleDeg,
    yAtNet: customYAtNet,
    clearance: customYAtNet - NET_HEIGHT,
    landX: customLandX,
    distFromNet: customLandX - netDist,
    status,
    statusType
  }

  // 有效落点窗口：贴网落点到发球线之间的长度
  const windowLen = near && far && far.clearsNet ? Math.max(0, far.landX - near.landX) : 0

  return {
    heightCm,
    reachRatio,
    jumpCm,
    speedKmh,
    netDist,
    customAngleDeg,
    h0,
    v,
    serviceLineX,
    near,
    far,
    custom,
    windowLen
  }
}

/** 不同身高的对照数据，给表格用。 */
export function compareHeights(state, heights = COMPARE_HEIGHTS) {
  return heights.map((heightCm) => ({ heightCm, ...computeServe({ ...state, heightCm }) }))
}

/* —— 下面是「发球计算」模式在用的旧接口，保持兼容 —— */

export const SM = {
  gravity: G,
  netHeight: NET_HEIGHT,
  serviceDepth: SERVICE_BOX_LEN,
  ballRadius: BALL_RADIUS,
  reach: 0.6
}

export const SPEED_STEPS = [
  { id: 'fast', name: '平击快发', speed: 30, color: '#ff6b5a' },
  { id: 'first', name: '一发', speed: 26, color: '#ffa94c' },
  { id: 'second', name: '二发', speed: 22, color: '#5ec8ff' },
  { id: 'kick', name: '上旋 / 切削', speed: 18, color: '#7cf2b0' }
]

/** 用 tanθ 形式求高度，给「发球计算」的图表用。 */
export function heightAt({ speed, h0, tan, d }) {
  return h0 + d * tan - (G * d * d * (1 + tan * tan)) / (2 * speed * speed)
}

/** 求通过 (d, y) 的较低弹道 tanθ。 */
export function tanThrough({ speed, h0, d, y }) {
  const A = (G * d * d) / (2 * speed * speed)
  const B = -d
  const C = y - h0 + A
  const disc = B * B - 4 * A * C
  if (disc < 0) return null
  return (-B - Math.sqrt(disc)) / (2 * A)
}
