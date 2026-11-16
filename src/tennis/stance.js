/**
 * 网球四大击球站位的几何定义。
 *
 * 局部坐标（米），原点在击球点正下方：
 *   x  —— 横向，正为持拍手一侧（右手持拍 → 右侧为正）
 *   advance —— 朝球网方向的前伸量，正数表示更靠近球网
 *   yaw —— 脚尖指向，单位度，0 表示正对球网
 *
 * stanceAngle 是「双脚连线」相对底线的夹角，由两脚位置直接算出来，
 * 0° = 平行于底线（开放式），90° = 垂直于底线（中立式），>90° = 反向斜角（关闭式）。
 */

export const STANCES = [
  {
    id: 'open',
    name: '开放式站位',
    en: 'Open Stance',
    index: '01',
    subtitle: '最常用现代正手',
    badge: '现代正手首选',
    color: 0xccff00,
    hex: '#ccff00',
    scene: '处理中高球、底线快速防守反击、需要快速还原回位时。',
    logic: '双脚连线几乎平行于底线。右脚（后脚）作为主要承重支撑点，击球瞬间通过髋关节爆发性旋转释放能量。',
    pros: '准备时间极短，还原回位速度最快，便于制造强烈上旋。',
    cons: '对核心肌群与腿部蹬地力量要求较高，前向体重转移较少。',
    axisLabel: '平行于底线',
    power: '髋关节旋转 + 后腿蹬地',
    desc: '俯视视角中，底线是横向参考线。开放式站位下双脚连线平行于底线，来球从上方袭来，击球点在身体右侧前方。',
    feet: {
      left: { x: -0.28, advance: 0.05, yaw: 8 },
      right: { x: 0.28, advance: 0.05, yaw: -8 }
    },
    /** 髋部旋转幅度，3D 里用来带躯干。 */
    hipTurn: -0.55,
    /** 体重转移方向：从后脚指向前脚（1 = 全前，0 = 全留后）。 */
    weightShift: 0.25
  },
  {
    id: 'semi',
    name: '半开放式站位',
    en: 'Semi-Open Stance',
    index: '02',
    subtitle: '攻守平衡利器',
    badge: '攻守平衡利器',
    color: 0x00f0ff,
    hex: '#00f0ff',
    scene: '绝大多数正手底线相持、进攻性落地球、全能型选手标配。',
    logic: '右脚（后脚）略微向后撤退，双脚连线与底线呈约 45 度角。既保留髋部旋转发力，又能把部分体重向前推进。',
    pros: '攻守兼备，击球稳定性与力量兼顾，适应球速范围最广。',
    cons: '对步法调整的精确度要求高，介于开放与关闭之间。',
    axisLabel: '约 45° 倾斜角',
    power: '髋转动 + 前向体重转移',
    desc: '半开放式站位下，双脚连线与底线呈约 45° 斜角。前脚（左脚）略微靠前，兼顾旋转爆发与向前推击的稳定性。',
    feet: {
      left: { x: -0.2, advance: 0.25, yaw: 25 },
      right: { x: 0.2, advance: -0.15, yaw: -15 }
    },
    hipTurn: -0.42,
    weightShift: 0.5
  },
  {
    id: 'square',
    name: '中立 / 平行站位',
    en: 'Square Stance',
    index: '03',
    subtitle: '传统平击推进',
    badge: '传统平击推进',
    color: 0xffb800,
    hex: '#ffb800',
    scene: '追求极致平击穿透力、低球进攻、发球上网前的压迫。',
    logic: '前脚（左脚）脚尖指向网前，后脚脚尖指向边线。击球时体重从后脚完全平移至前脚，形成直线推进惯性。',
    pros: '击球线路极佳，向前发力充分，适合打平击与快节奏进攻。',
    cons: '引拍和步法调整时间长，击球后身体还原回位较慢。',
    axisLabel: '垂直于底线',
    power: '后脚至前脚的直线体重转移',
    desc: '中立站位下，双脚连线垂直于底线。左脚在前、右脚在后，击球时身体形成一条纵向推进直线。',
    feet: {
      left: { x: -0.04, advance: 0.44, yaw: 45 },
      right: { x: 0.04, advance: -0.4, yaw: -45 }
    },
    hipTurn: -0.3,
    weightShift: 0.85
  },
  {
    id: 'closed',
    name: '关闭式站位',
    en: 'Closed Stance',
    index: '04',
    subtitle: '防守与单反引拍',
    badge: '防守与单反引拍',
    color: 0xff3366,
    hex: '#ff3366',
    scene: '极度被动防守、单手反拍引拍蓄力、处理深区下旋球。',
    logic: '右脚（后脚）跨越到左脚前方，双脚连线与底线呈反向斜角。身体彻底背对球网，用强大的躯干扭转借力打力。',
    pros: '身位极度稳固，防守时抗冲击力强，单反引拍空间充裕。',
    cons: '击球视野受限，击球后身体极易失去平衡，还原极其困难。',
    axisLabel: '反向斜角（大于 90°）',
    power: '躯干深度扭转 + 弹力释放',
    desc: '关闭式站位下，后脚（右脚）跨至前脚前方。身体完全闭合，常用于单反引拍或深度被动防守。',
    feet: {
      left: { x: 0.16, advance: 0.18, yaw: 60 },
      right: { x: -0.16, advance: 0.52, yaw: -30 }
    },
    hipTurn: -0.15,
    weightShift: 0.35
  }
]

export function stanceById(id) {
  return STANCES.find((item) => item.id === id) || STANCES[0]
}

const rad = (deg) => (deg * Math.PI) / 180

/**
 * 双脚相对击球点的世界偏移。
 * 世界坐标里 z 轴指向球网为负，所以 advance 需要取负。
 */
export function footPositions(stance) {
  const { left, right } = stance.feet
  return {
    left: { x: left.x, z: -left.advance, yaw: left.yaw },
    right: { x: right.x, z: -right.advance, yaw: right.yaw }
  }
}

/**
 * 双脚连线与底线的夹角（度）。
 * 底线平行于 x 轴：0° 平行（开放），约 45° 斜角（半开放），
 * 90° 垂直（中立），大于 90° 反向斜角（关闭式，后脚跨到前脚前方）。
 */
export function stanceAngle(stance) {
  const f = footPositions(stance)
  const dx = f.right.x - f.left.x
  const dz = f.right.z - f.left.z
  return Math.abs((Math.atan2(dz, dx) * 180) / Math.PI)
}

/** 站位角归类，用来给面板显示。 */
export function stanceAngleLabel(stance) {
  const a = stanceAngle(stance)
  if (a < 12) return `平行于底线（${a.toFixed(0)}°）`
  if (a < 62) return `约 ${a.toFixed(0)}° 斜角`
  if (a < 88) return `接近垂直（${a.toFixed(0)}°）`
  if (a < 100) return `垂直于底线（${a.toFixed(0)}°）`
  return `反向斜角（${a.toFixed(0)}°）`
}

/** 两脚间距（米）。 */
export function stanceWidth(stance) {
  const f = footPositions(stance)
  return Math.hypot(f.right.x - f.left.x, f.right.z - f.left.z)
}

/** 体重转移箭头的起止点：后脚 → 前脚。 */
export function weightArrow(stance) {
  const f = footPositions(stance)
  const back = stance.feet.right.advance > stance.feet.left.advance ? f.left : f.right
  const front = back === f.right ? f.left : f.right
  const t = stance.weightShift
  return {
    from: { x: back.x, z: back.z },
    to: { x: back.x + (front.x - back.x) * t, z: back.z + (front.z - back.z) * t }
  }
}

/** 击球点相对身体的重心位置，即两脚中点。 */
export function contactCenter(stance) {
  const f = footPositions(stance)
  return { x: (f.left.x + f.right.x) / 2, z: (f.left.z + f.right.z) / 2 }
}

export const STANCE_TIPS = '时间充裕、追求平击穿透选中立或半开放；时间紧迫、追求上旋和快速防守选开放式；侧身切削或单反防守选关闭式。'

export { rad }
