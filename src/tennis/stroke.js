/**
 * 致命正手 / 弹道反手：生物力学与弹道几何的解析模型。
 *
 * 正手用「双摆鞭打 + 马格努斯下压」：
 *   v = ω·r                    拍头线速度
 *   rpm ≈ f(v, 刷球仰角 α)      竖线 snap-back 把向上矢量转成转速
 *   F_M = ½·C_L·ρ·A·v²          与重力叠加，过网后陡降
 * 反手用「单轴离心 / 闭合三角 + 低平弹道」：
 *   L_diag = √(23.77² + 8.23²)  斜线比直线多出容错纵深
 *   出射角小 → 过网余量小、飞行时间短
 */

export const COURT_GEO = {
  length: 23.77,
  width: 8.23,
  netDist: 11.885,
  netHeight: 0.914,
  postHeight: 1.07
}

export const FH_DEFAULTS = {
  speed: 135, // km/h 拍头线速度
  brush: 32, // 刷球仰角（度）
  height: 1.05 // 击球点高度（米）
}

export const BH_DEFAULTS = {
  type: '1hbh',
  power: 128, // km/h 出球速度
  launch: 11.5, // 出射仰角
  yaw: 14 // 线路偏角（0 = 直线，越大越斜）
}

/** 用固定步长积一条弹道，返回过网高度与落点（含空气阻力与马格努斯下压）。 */
function flyForehand({ height, v0, launchRad, magnusAcc }) {
  const drag = (0.5 * 1.2 * Math.PI * 0.0335 * 0.0335 * 0.55) / 0.057
  const dt = 1 / 240
  let x = 0
  let y = height
  let vx = v0 * Math.cos(launchRad)
  let vy = v0 * Math.sin(launchRad)
  let yNet = null
  let landX = null

  for (let i = 0; i < 6000; i += 1) {
    const sp = Math.hypot(vx, vy)
    vx += -drag * sp * vx * dt
    vy += (-9.81 - magnusAcc - drag * sp * vy) * dt
    const px = x
    const py = y
    x += vx * dt
    y += vy * dt

    if (yNet === null && x >= COURT_GEO.netDist) {
      const k = (COURT_GEO.netDist - px) / Math.max(1e-6, x - px)
      yNet = py + (y - py) * k
    }
    if (y <= 0 && i > 4) {
      const k = py / Math.max(1e-6, py - y)
      landX = px + (x - px) * k
      break
    }
  }
  return { yNet: yNet ?? y, landX: landX ?? x }
}

/**
 * 正手：从挥拍速度与刷球角推出转速，再反解「落在界内」所需的出射角。
 * 转速越高，马格努斯下压越强，就越能允许更高的出射角——这正是上旋能安全过高的原因。
 */
export function computeForehand({ speed = FH_DEFAULTS.speed, brush = FH_DEFAULTS.brush, height = FH_DEFAULTS.height } = {}) {
  const rpm = Math.round(speed * 18.5 * Math.sin((brush * Math.PI) / 180) * 1.9 + 800)
  const magnusAcc = (rpm / 3500) * 6.8
  const v0 = speed / 3.6

  // 目标落点：距对方底线内 1.2 m（教练常用的深球落点）
  const targetX = COURT_GEO.length - 1.2

  // 二分找出让落点正好压在 targetX 的出射角
  let lo = 0.02
  let hi = 0.62
  let launchRad = 0.1
  for (let i = 0; i < 26; i += 1) {
    launchRad = (lo + hi) / 2
    const shot = flyForehand({ height, v0, launchRad, magnusAcc })
    if (shot.landX > targetX) hi = launchRad
    else lo = launchRad
  }
  const shot = flyForehand({ height, v0, launchRad, magnusAcc })
  const launchDeg = +((launchRad * 180) / Math.PI).toFixed(1)
  const netClear = +(shot.yNet - COURT_GEO.netHeight).toFixed(2)
  const bounceAngle = +(26 + (rpm / 4500) * 22).toFixed(1)

  // X-Factor 与拍头滞后随刷球角变化：刷得越陡，滞后与分离角越大
  const xFactor = Math.round(28 + brush * 0.34)
  const lag = Math.round(52 + brush * 0.7)
  const wiper = Math.round(brush * 0.95)

  return {
    speed,
    brush,
    height,
    rpm,
    launchDeg,
    netClear,
    yNet: shot.yNet,
    landX: shot.landX,
    bounceAngle,
    magnusAcc,
    xFactor,
    lag,
    wiper
  }
}

export const BH_TYPES = {
  '1hbh': {
    id: '1hbh',
    name: '单手反拍',
    en: '1HBH',
    color: '#00f0ff',
    radius: 1.42,
    radiusDesc: '肩关节单一支点全臂展离心摆动',
    title: '单反 C 型离心引拍与肩胛反向展开角',
    hudMode: '构型：1HBH 单轴离心',
    contactAdvance: '+48cm',
    spinAcc: 4.2,
    desc: '非持拍手向后反向伸展形成「动态平衡翼」，锁定躯干过度旋转，使持拍臂以肩关节为圆心做大半径 R ≈ 1.42 m 圆弧加速，击球点位于身体前侧更远处。'
  },
  '2hbh': {
    id: '2hbh',
    name: '双手反拍',
    en: '2HBH',
    color: '#ff3366',
    radius: 1.14,
    radiusDesc: '双肩加握把构成的闭合刚体等腰三角形',
    title: '双反闭合三角杠杆与核心扭矩耦合',
    hudMode: '构型：2HBH 闭合双杠杆',
    contactAdvance: '+28cm',
    spinAcc: 2.6,
    desc: '双臂与双肩构成稳固的刚性几何三角形，转体角动量直接耦合至拍面。紧凑半径 R ≈ 1.14 m 带来极高的挥拍启动加速度与抗扭稳定性。'
  }
}

/** 反手：从速度、出射角、线路角推出几何距离、飞行时间与过网余量。 */
export function computeBackhand({ type = BH_DEFAULTS.type, power = BH_DEFAULTS.power, launch = BH_DEFAULTS.launch, yaw = BH_DEFAULTS.yaw } = {}) {
  const cfg = BH_TYPES[type] || BH_TYPES['1hbh']
  const yawRad = (yaw * Math.PI) / 180
  const courtDist = COURT_GEO.length / Math.cos(yawRad)
  const netDist = COURT_GEO.netDist / Math.cos(yawRad)
  const v0 = power / 3.6
  const launchRad = (launch * Math.PI) / 180
  const flightTime = courtDist / Math.max(0.1, v0 * Math.cos(launchRad))
  const tNet = netDist / Math.max(0.1, v0 * Math.cos(launchRad))
  const yNet = 0.98 + v0 * Math.sin(launchRad) * tNet - 0.5 * (9.81 + cfg.spinAcc) * tNet * tNet
  const netClear = yNet - COURT_GEO.netHeight

  return {
    type,
    power,
    launch,
    yaw,
    radius: cfg.radius,
    courtDist,
    flightTime,
    netClear,
    diagonalGain: courtDist - COURT_GEO.length,
    cfg
  }
}

/** 对角线几何：斜线比直线多出的着陆纵深。 */
export const DIAGONAL = Math.hypot(COURT_GEO.length, COURT_GEO.width)

/** 三张物理卡。 */
export const FH_CARDS = [
  {
    tag: '01 / 马格努斯下压力方程',
    title: '为什么大力轰击不会出界？',
    formula: 'F_M = S·(ω × v) = ½·C_L·ρ·A·v²',
    body: '网球高速前旋时，球体上方气流与表面逆向摩擦减速（高压区），下方顺向加速（低压区）。伯努利压力差产生向下的马格努斯力，与重力叠加，使球在过网后呈非对称陡峭下坠，牢牢锁在底线内。'
  },
  {
    tag: '02 / 动量矩守恒与鞭打效应',
    title: '从核心肌群到拍头的角速度放大',
    formula: 'L = I₁ω₁ + I₂ω₂ ⇒ v_tip = ω_arm·R + ω_wrist·r',
    body: '生物力学动力链遵循「近端制动、远端加速」。骨盆与躯干达到峰值角速度后骤然制动，转动惯量 I 逐级减小，能量集中传到质量最轻的拍头，实现 130+ km/h 的末端爆发。'
  },
  {
    tag: '03 / 碰撞切向变形与咬球角',
    title: '拍面倾斜角与线床弹性回弹',
    formula: 'ω_ball ≈ 5·v_swing·sin(α) / (2·R_ball) · η_string',
    body: '击球瞬间只有 4–5 ms。竖线在切向摩擦下横向位移并瞬间回弹（snap-back），把挥拍的向上矢量转成每分钟 3000–4500 转的强烈自旋。'
  }
]

export const BH_CARDS = [
  {
    tag: '01 / 单反离心力矩与大半径几何',
    title: '单支点圆弧加速原理',
    formula: 'τ = r × F = I_shoulder·α  |  F_c = m·ω²·R',
    body: '单手反拍以主导肩关节为单一几何支点，大臂、前臂与球拍近似伸展成一条直线，最大化旋转半径 R。C 型引拍把重力势能转成流畅的圆周动能。'
  },
  {
    tag: '02 / 双反闭合三角形刚体结构',
    title: '双臂三角框架与核心耦合',
    formula: 'K_stiffness = K_L + K_R ⇒ Δθ_face → 0',
    body: '双手反拍在双肩与握把之间构成稳定的等腰几何三角形。非惯用手主导发力（类似左手正手），双支点大幅提高拍面抗扭刚度，面对高弹跳重球也能打出精准直线。'
  },
  {
    tag: '03 / 球场几何切线与勾股定理优势',
    title: '斜线大角度 vs 直线奇袭',
    formula: `L_diag = √(23.77² + 8.23²) = ${DIAGONAL.toFixed(2)}m > 23.77m`,
    body: `单打球场长 23.77 m、宽 8.23 m。斜线对角击球不仅多出 +${(DIAGONAL - COURT_GEO.length).toFixed(2)} m 的着陆纵深，而且球网中央 0.914 m 比网柱 1.07 m 低 15.6 cm，几何容错率最高。`
  }
]

/** 正手 vs 单反 vs 双反 的全维度对比。 */
export const COMPARE_ROWS = [
  { dim: '核心运动学模型', fh: '多节段开放式双摆鞭打 (Whip-Lag)', h1: '单轴大半径离心圆弧 (Single Pendulum)', h2: '双臂闭合三角形刚体旋转 (Closed Triangle)' },
  { dim: '挥拍轨迹几何', fh: '陡峭雨刷螺旋线', h1: '垂直平面 C 型大圆弧', h2: '扁平椭圆贯穿线', mono: true },
  { dim: '典型上旋转速 ω', fh: '3,000 – 4,800 rpm（强马格努斯下坠）', h1: '2,200 – 3,400 rpm（中高弧线重上旋）', h2: '1,600 – 2,600 rpm（低平穿透弹道）', mono: true },
  { dim: '出射仰角', fh: '14° – 22°（高过网安全余量）', h1: '12° – 18°（优雅高抛物线）', h2: '7° – 13°（贴网炮弹式平射）', mono: true },
  { dim: '击球点空间位置', fh: '体侧前方约 30–45 cm，开放/半开放站位', h1: '最靠前（前脚前方 45–60 cm），侧身闭合站位', h2: '靠近身体重心（前脚旁 20–35 cm），抗挤压强' },
  { dim: '战术几何优势', fh: '内角倒地正手撕开大斜线角度', h1: '大半径释放极端斜线角度与切削变化', h2: '高点借力反击、接发抢攻与变直线奇袭' }
]
