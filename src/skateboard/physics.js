/**
 * 滑板受力解算 —— 承接 2.5D 仿真（code_artifact-滑板受力.html）的 updatePhysics 六分支模型。
 *
 * 全部为静态（准静态）力学，教学示意口径：
 *   承重分配   N1 = mg·d2/L,  N2 = mg·d1/L          （杠杆原理，重心在轴距区间内）
 *   越支点力矩 τ = mg·d                              （重心垂足越过桥 → 单桥支点）
 *   转向几何   δf = lean·gainF,  R = WB/sin(δf−δr)    （简化单轨模型，忽略轮胎侧偏）
 *   离心 vs 抓地  Fc = mv²/R ≤ μmg
 *   泵速推进   Fpump ≈ |sin(lean)| · eff · 180 N
 *   轮咬风险   连续风险度（倾角 / 前承重 / 轮径-板缘间隙 / 桥回弹 四因子）
 */

const G = 9.81
const RIDER_MASS = 64 // 滑手质量 kg（教学示意值）
const LEAN_MAX_DEG = 35 // 压板倾角满量程
const LEVER_ARM_MAX_CM = 40 // 力臂换算满翘的基准（对应仿真 leverArm 上限）

export function solve(state, board) {
  const m = RIDER_MASS + board.mass
  const mg = m * G

  const wb = board.wheelbase // cm
  const frontX = wb / 2
  const rearX = -wb / 2
  // 重心水平偏移：comX ∈ [-1, 1] 映射到板长一半的范围（后端 ↔ 前端）
  const comCm = state.comX * (board.length / 2)

  // ---- 1. 承重分配与支点判定（三分支）----
  let stance = 'dual' // dual | manual（翘尾） | nose（翘头）
  let n1 = 0.5 // 前轮承重比例
  let n2 = 0.5
  let pivot = null // 支点位置 cm（null = 双桥支撑）
  let leverArm = 0 // 重心垂足到支点的水平距离 cm
  let torque = 0 // N·m
  let pitchDeg = 0 // 板俯仰角（正 = 翘尾 / 板头上抬；负 = 翘头）
  const maxPitch = board.kickTail + 8

  if (comCm >= rearX && comCm <= frontX) {
    // 情况 A：双桥支撑，杠杆分配
    n1 = (comCm - rearX) / wb
    n2 = 1 - n1
  } else if (comCm < rearX) {
    // 情况 B：重心越过后桥 → 翘尾（Manual）
    stance = 'manual'
    pivot = rearX
    leverArm = rearX - comCm
    torque = (mg * leverArm) / 100
    n1 = 0
    n2 = 1
    pitchDeg = Math.min(maxPitch, (leverArm / LEVER_ARM_MAX_CM) * maxPitch)
  } else {
    // 情况 C：重心越过前桥 → 翘头（Nose Manual，前翻风险）
    stance = 'nose'
    pivot = frontX
    leverArm = comCm - frontX
    torque = (mg * leverArm) / 100
    n1 = 1
    n2 = 0
    pitchDeg = -Math.min(maxPitch, (leverArm / LEVER_ARM_MAX_CM) * maxPitch)
  }

  // ---- 2. 转向几何与离心/抓地 ----
  const leanDeg = state.leanY * LEAN_MAX_DEG
  const dF = leanDeg * board.frontTurnGain // 前桥偏转角
  const dR = -leanDeg * board.rearTurnGain // 后桥偏转角
  const delta = ((dF - dR) * Math.PI) / 180
  const v = Math.max(0, state.speed) / 3.6 // km/h → m/s
  const radius = delta > 1e-4 ? wb / 100 / Math.sin(delta) : Infinity // m
  const fc = radius < 1e6 ? (m * v * v) / radius : 0 // 离心力 N
  const fmax = board.friction * mg // 抓地上限 N
  const drift = fc > fmax && state.speed > 5

  // ---- 3. 泵速推进 ----
  const pumpForce = Math.abs(Math.sin((leanDeg * Math.PI) / 180)) * board.pumpEfficiency * 180

  // ---- 4. 轮咬风险度（0–100%，连续判定）----
  // 因子：倾角（>24° 起险）× 前承重（>72% 起险）× 轮径/板缘间隙 × 桥回弹（陆冲弹性回弹显著降险）
  const leanFactor = smoothstep(24, 32, Math.abs(leanDeg))
  const loadFactor = smoothstep(0.72, 0.85, n1)
  const clearance = Math.max(0.05, (board.width - board.wheelDia / 10) / board.width) // 间隙占比
  const clearanceFactor = 1.15 - clearance * 1.6
  const reboundRelief = 1 - board.truckRebound * 0.55
  const biteRisk = Math.min(
    1,
    Math.max(0, leanFactor * loadFactor * clearanceFactor * reboundRelief)
  )
  const bite = biteRisk > 0.55

  // ---- 5. 状态汇总（UI 分支文案在 catalog.js ALERTS）----
  let alertId = 'stable'
  if (bite) alertId = 'bite'
  else if (drift) alertId = 'drift'
  else if (stance === 'manual') alertId = 'manual'
  else if (stance === 'nose') alertId = 'nose'
  else if (fc > fmax * 0.85) alertId = 'grip-limit'
  else if (pumpForce > 5) alertId = 'pumping'

  return {
    mass: m,
    mg,
    comCm,
    stance,
    n1,
    n2,
    pivot,
    leverArm,
    torque,
    pitchDeg,
    leanDeg,
    dF,
    dR,
    radius,
    fc,
    fmax,
    gripRatio: fmax > 0 ? fc / fmax : 0,
    drift,
    pumpForce,
    biteRisk,
    bite,
    alertId,
    v
  }
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
