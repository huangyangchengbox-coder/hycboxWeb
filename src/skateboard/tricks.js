/**
 * 动作力学库 —— 关键帧表。
 *
 * 每个动作 = 一串关键帧（pose 标量 + 板姿态 + 该时刻的受力快照）。
 * 受力快照为阶段示意值（倍数表示 N/mg），界面会标注"阶段示意"。
 * 时间轴拖到哪一帧，骨架 / 板 / 矢量 / 遥测全部由同一 t 驱动。
 *
 * 姿态标量：
 *   crouch     蹲深 0（站直）–1（深蹲）
 *   bodyPitch  躯干前后倾（正 = 后仰）
 *   bodyRoll   躯干左右倾（正 = 向板尾侧倾）
 *   armSpread  双臂展开度 0–1
 *   boardY     板整体抬升 m（腾空）
 *   boardPitch 板俯仰 rad（正 = 板头上抬）
 *   boardRoll  板左右压板 rad
 */

export const TRICKS = [
  {
    id: 'ollie',
    name: 'Ollie 豚跳',
    icon: '🚀',
    duration: 1.4,
    board: 'street',
    headline: '板不是"粘"在脚上的 —— 是前脚摩擦力把它带上去的',
    phases: [
      { t: 0.0, name: '① 蹲身蓄力', note: '重心下沉，腿部储存弹性势能；支撑力略大于体重' },
      { t: 0.45, name: '② 爆发起跳', note: '蹬伸跳起，重心获得向上速度 —— 超重，支撑力远大于 mg' },
      { t: 0.7, name: '③ 点尾 + 搓板', note: '后踝压板尾（杠杆击地反弹），前脚向前上方搓板，靠鞋-砂纸摩擦力把板"拽"起来并调平' },
      { t: 0.95, name: '④ 收板缓冲', note: '双脚压板随落，屈膝卸掉落地冲击' }
    ],
    keyPoint: '❌ "跳起来板会粘在脚上" —— 板不会自己跟人，是前脚鞋面摩擦力把板带上去的；点尾只负责让板尾击地反弹，板的高度主要来自人先跳起来。',
    keys: [
      { t: 0.0, crouch: 0.12, bodyPitch: 0, bodyRoll: 0, armSpread: 0.3, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '静止', note: '准备姿态' },
      { t: 0.3, crouch: 0.72, bodyPitch: 0.08, bodyRoll: 0, armSpread: 0.35, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.18, force: 'N ≈ 1.2mg', note: '下蹲减速段反而增载（超重）' },
      { t: 0.55, crouch: 0.05, bodyPitch: -0.05, bodyRoll: 0, armSpread: 0.55, boardY: 0.06, boardPitch: 0.02, boardRoll: 0, loadFactor: 2.6, force: 'N ≈ 2.6mg（爆发）', note: '蹬伸末期，人与板共同上升' },
      { t: 0.72, crouch: 0.1, bodyPitch: -0.08, bodyRoll: 0, armSpread: 0.7, boardY: 0.3, boardPitch: -0.42, boardRoll: 0, loadFactor: 0, force: '腾空', note: '点尾瞬间：板尾击地反弹，板绕后桥翻转' },
      { t: 0.85, crouch: 0.14, bodyPitch: -0.02, bodyRoll: 0, armSpread: 0.7, boardY: 0.44, boardPitch: 0.1, boardRoll: 0, loadFactor: 0, force: '腾空 · 搓板', note: '前脚向前上方搓板：摩擦力沿板面向前上，板被"拽"起并调平' },
      { t: 1.0, crouch: 0.2, bodyPitch: 0, bodyRoll: 0, armSpread: 0.5, boardY: 0.3, boardPitch: 0, boardRoll: 0, loadFactor: 0, force: '腾空 · 调平', note: '板已平，准备接板' },
      { t: 1.12, crouch: 0.55, bodyPitch: 0.06, bodyRoll: 0, armSpread: 0.4, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 2.2, force: '落地冲击 N ≈ 2.2mg', note: '双脚压板随落' },
      { t: 1.4, crouch: 0.12, bodyPitch: 0, bodyRoll: 0, armSpread: 0.3, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '回稳', note: '屈膝卸力后回到准备姿态' }
    ]
  },
  {
    id: 'manual',
    name: 'Manual 翘尾平衡',
    icon: '⚖️',
    duration: 2.0,
    board: 'street',
    headline: '平衡不是"不动"，是让力矩 τ 永远在零附近小幅波动',
    phases: [
      { t: 0.0, name: '进入', note: '重心后移越过后桥，前轮抬起' },
      { t: 0.6, name: '维持', note: '微调重心让 τ 在 ±小范围波动 —— 这就是"平衡"的物理含义' },
      { t: 1.5, name: '退出', note: '重心前移回轴距区间，前轮落地' }
    ],
    keyPoint: '支点在后桥：τ = mg·d。d 偏大板就翘过头，偏小板就落回去 —— 滑手做的其实是"高频重心伺服"。',
    keys: [
      { t: 0.0, crouch: 0.15, bodyPitch: 0, bodyRoll: 0, armSpread: 0.3, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '静止', note: '准备' },
      { t: 0.35, crouch: 0.22, bodyPitch: 0.12, bodyRoll: 0, armSpread: 0.6, boardY: 0, boardPitch: 0.34, boardRoll: 0, loadFactor: 1.0, force: '支点 = 后桥', note: '重心后移，前轮抬起' },
      { t: 0.8, crouch: 0.24, bodyPitch: 0.14, bodyRoll: 0, armSpread: 0.65, boardY: 0, boardPitch: 0.42, boardRoll: 0, loadFactor: 1.0, force: 'τ ≈ +3 N·m', note: '微翘维持' },
      { t: 1.1, crouch: 0.2, bodyPitch: 0.1, bodyRoll: 0, armSpread: 0.65, boardY: 0, boardPitch: 0.36, boardRoll: 0, loadFactor: 1.0, force: 'τ ≈ −1 N·m', note: '微落修正' },
      { t: 1.45, crouch: 0.23, bodyPitch: 0.13, bodyRoll: 0, armSpread: 0.6, boardY: 0, boardPitch: 0.4, boardRoll: 0, loadFactor: 1.0, force: 'τ ≈ +2 N·m', note: '再翘' },
      { t: 1.8, crouch: 0.15, bodyPitch: 0, bodyRoll: 0, armSpread: 0.35, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '双桥支撑', note: '重心回轴距区间' },
      { t: 2.0, crouch: 0.15, bodyPitch: 0, bodyRoll: 0, armSpread: 0.3, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '回稳', note: '' }
    ]
  },
  {
    id: 'carve',
    name: 'Carve 深压弯',
    icon: '🌀',
    duration: 1.6,
    board: 'surfskate',
    headline: '压得多不是风格，是几何必需 —— 合力线必须落进支撑基面',
    phases: [
      { t: 0.0, name: '引弯', note: '重心下沉，开始向弯内倾身' },
      { t: 0.5, name: '满压', note: '倾角最大：重力与离心力的合力必须落在两轮连线（支撑基面）之内' },
      { t: 1.1, name: '出弯', note: '回正，离心力随速度与半径回落' }
    ],
    keyPoint: '速度越快（Fc 越大）必须倾得越多 —— 不是为了帅，是让重力与离心力的合力作用线落进支撑基面，否则向弯外翻倒。',
    keys: [
      { t: 0.0, crouch: 0.18, bodyPitch: 0, bodyRoll: 0, armSpread: 0.4, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '直线', note: '准备入弯' },
      { t: 0.5, crouch: 0.5, bodyPitch: 0, bodyRoll: 0.38, armSpread: 0.75, boardY: 0, boardPitch: 0, boardRoll: 0.24, loadFactor: 1.15, force: 'Fc = 0.87 Fmax', note: '满压：合力线贴近支撑基面边缘' },
      { t: 0.9, crouch: 0.48, bodyPitch: 0, bodyRoll: 0.36, armSpread: 0.75, boardY: 0, boardPitch: 0, boardRoll: 0.22, loadFactor: 1.12, force: 'Fc = 0.85 Fmax', note: '保持' },
      { t: 1.6, crouch: 0.18, bodyPitch: 0, bodyRoll: 0, armSpread: 0.4, boardY: 0, boardPitch: 0, boardRoll: 0, loadFactor: 1.0, force: '回稳', note: '出弯回正' }
    ]
  },
  {
    id: 'pumping',
    name: 'Pumping 泵速',
    icon: '🌊',
    duration: 2.5,
    loop: true,
    board: 'surfskate',
    headline: '不蹬地也能加速 —— 相位对了，侧向蹬踏就有向前的分量',
    phases: [
      { t: 0.0, name: '左压', note: '向板尾侧压板，前桥左偏' },
      { t: 0.62, name: '换向', note: '身体重心横向切换（相位差是关键）' },
      { t: 1.25, name: '右压', note: '向板头侧压板，前桥右偏' },
      { t: 1.87, name: '换向', note: '蹬踏时机与板的偏转同步 → 推进' }
    ],
    keyPoint: 'F_pump ≈ |sin(lean)| · η · 180 N。陆冲前桥转角增益 1.35（双翘只有 0.55），所以同样的压板动作，陆冲能把更多蹬踏力变成前进的分量。',
    keys: [
      { t: 0.0, crouch: 0.25, bodyPitch: 0, bodyRoll: -0.3, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: -0.16, loadFactor: 1.05, force: 'F_pump = 62 N', note: '左压发力' },
      { t: 0.31, crouch: 0.3, bodyPitch: 0, bodyRoll: -0.1, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: -0.05, loadFactor: 1.0, force: 'F_pump = 20 N', note: '换向中' },
      { t: 0.62, crouch: 0.28, bodyPitch: 0, bodyRoll: 0.12, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.06, loadFactor: 1.0, force: 'F_pump = 25 N', note: '' },
      { t: 0.93, crouch: 0.3, bodyPitch: 0, bodyRoll: 0.26, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.14, loadFactor: 1.05, force: 'F_pump = 55 N', note: '' },
      { t: 1.25, crouch: 0.25, bodyPitch: 0, bodyRoll: 0.3, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.16, loadFactor: 1.05, force: 'F_pump = 62 N', note: '右压发力' },
      { t: 1.56, crouch: 0.3, bodyPitch: 0, bodyRoll: 0.1, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.05, loadFactor: 1.0, force: 'F_pump = 20 N', note: '换向中' },
      { t: 1.87, crouch: 0.28, bodyPitch: 0, bodyRoll: -0.12, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: -0.06, loadFactor: 1.0, force: 'F_pump = 25 N', note: '' },
      { t: 2.18, crouch: 0.3, bodyPitch: 0, bodyRoll: -0.26, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: -0.14, loadFactor: 1.05, force: 'F_pump = 55 N', note: '' },
      { t: 2.5, crouch: 0.25, bodyPitch: 0, bodyRoll: -0.3, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: -0.16, loadFactor: 1.05, force: '循环', note: '回到左压' }
    ]
  },
  {
    id: 'powerslide',
    name: 'Powerslide 漂移',
    icon: '💨',
    duration: 1.5,
    board: 'longboard',
    headline: '主动突破抓地 → 横滑减速 → 回正',
    phases: [
      { t: 0.0, name: '预备', note: '重心略降，准备转板' },
      { t: 0.4, name: '横滑', note: '板横转近 90°，轮组横向滑动 —— 动摩擦力做功，急速减速' },
      { t: 1.0, name: '回正', note: '速度降下来后转回正向，重新建立抓地' }
    ],
    keyPoint: '漂移时轮子从"滚动摩擦"切换到"滑动摩擦"——这正是减速的来源。速度没降下来就回正，会瞬间恢复抓地把你弹翻。',
    keys: [
      { t: 0.0, crouch: 0.25, bodyPitch: 0, bodyRoll: 0.15, armSpread: 0.5, boardY: 0, boardPitch: 0, boardRoll: 0.08, loadFactor: 1.0, force: '抓地', note: '预备' },
      { t: 0.45, crouch: 0.4, bodyPitch: 0, bodyRoll: 0.3, armSpread: 0.85, boardY: 0, boardPitch: 0, boardRoll: 0.1, boardYaw: 1.25, loadFactor: 1.0, force: '动摩擦（横滑）', note: '板横转，胎痕出现' },
      { t: 0.95, crouch: 0.38, bodyPitch: 0, bodyRoll: 0.28, armSpread: 0.85, boardY: 0, boardPitch: 0, boardRoll: 0.1, boardYaw: 1.25, loadFactor: 1.0, force: '动摩擦（横滑）', note: '滑行减速' },
      { t: 1.25, crouch: 0.25, bodyPitch: 0, bodyRoll: 0, armSpread: 0.5, boardY: 0, boardPitch: 0, boardRoll: 0, boardYaw: 0, loadFactor: 1.0, force: '回正', note: '转回正向' },
      { t: 1.5, crouch: 0.2, bodyPitch: 0, bodyRoll: 0, armSpread: 0.4, boardY: 0, boardPitch: 0, boardRoll: 0, boardYaw: 0, loadFactor: 1.0, force: '回稳', note: '' }
    ]
  },
  {
    id: 'wheelbite',
    name: 'Wheelbite 轮咬（警示）',
    icon: '⚠️',
    duration: 1.2,
    board: 'cruiser',
    headline: '轮被板缘咬死的一瞬间，惯性把你向前抛出',
    phases: [
      { t: 0.0, name: '大倾角下压', note: '小鱼板：倾角超 24°，前承重超 72%，轮距板缘间隙小' },
      { t: 0.45, name: '咬死', note: '轮接触板缘 → 瞬间抱死 → 板停轮不停' },
      { t: 0.7, name: '前抛', note: '动能没有消失，全部变成把你抛出去的力（预测线示意）' }
    ],
    keyPoint: '轮咬四因子：倾角 × 前承重 × 轮径-板缘间隙 × 桥回弹。小鱼板间隙最小且无弹性回弹，风险四板最高；陆冲前桥弹性回弹反而显著降险。现实中这一下足以让人飞出——请佩戴头盔与护具。',
    keys: [
      { t: 0.0, crouch: 0.2, bodyPitch: 0, bodyRoll: 0.1, armSpread: 0.45, boardY: 0, boardPitch: 0, boardRoll: 0.12, loadFactor: 1.0, force: '压板中', note: '倾角渐大' },
      { t: 0.4, crouch: 0.3, bodyPitch: 0, bodyRoll: 0.3, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.3, loadFactor: 1.1, force: '临界', note: '轮距板缘只剩几毫米' },
      { t: 0.5, crouch: 0.35, bodyPitch: 0, bodyRoll: 0.32, armSpread: 0.6, boardY: 0, boardPitch: 0, boardRoll: 0.32, loadFactor: 1.1, force: '轮咬！', note: '轮被板缘咬死，板瞬间停转' },
      { t: 0.8, crouch: 0.35, bodyPitch: -0.5, bodyRoll: 0.32, armSpread: 0.9, boardY: 0, boardPitch: -0.18, boardRoll: 0.32, loadFactor: 1.0, force: '前抛', note: '身体被向前上方抛出（虚线为轨迹预测示意）' },
      { t: 1.2, crouch: 0.35, bodyPitch: -0.5, bodyRoll: 0.32, armSpread: 0.9, boardY: 0, boardPitch: -0.18, boardRoll: 0.32, loadFactor: 1.0, force: '—', note: '' }
    ]
  }
]

export const trickById = (id) => TRICKS.find((t) => t.id === id) || TRICKS[0]

const lerp = (a, b, k) => a + (b - a) * k
const ease = (k) => k * k * (3 - 2 * k)

/** 关键帧采样（smoothstep 缓动，与网球模块同思路）。 */
export function sampleTrick(trick, t) {
  const keys = trick.keys
  const T = Math.max(0, Math.min(trick.duration, t))
  let a = keys[0]
  let b = keys[keys.length - 1]
  for (let i = 0; i < keys.length - 1; i++) {
    if (T >= keys[i].t && T <= keys[i + 1].t) {
      a = keys[i]
      b = keys[i + 1]
      break
    }
  }
  const k = ease((T - a.t) / Math.max(1e-6, b.t - a.t))
  const out = { t: T, phaseNote: a.note || '', force: a.force || '', phaseName: '' }
  for (const key of ['crouch', 'bodyPitch', 'bodyRoll', 'armSpread', 'boardY', 'boardPitch', 'boardRoll', 'boardYaw', 'loadFactor']) {
    out[key] = lerp(a[key] ?? 0, b[key] ?? 0, k)
  }
  // 阶段名
  for (let i = trick.phases.length - 1; i >= 0; i--) {
    if (T >= trick.phases[i].t) {
      out.phaseName = trick.phases[i].name
      out.phaseNote = trick.phases[i].note
      break
    }
  }
  if (trick.loop && T >= trick.duration) out.t = T % trick.duration
  return out
}
