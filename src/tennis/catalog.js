/** ITF 球场尺寸，单位米。标注和白线都从这里取。 */
export const MODES = [
  { id: 'lab', en: 'TECHNIQUE LAB', name: '技巧实验室', hint: '正手 / 反手 / 发球 / 截击 · 拖动绕看，空格慢放' },
  { id: 'spin', en: 'SPIN SCIENCE', name: '旋转的科学', hint: '上旋 / 平击 / 下旋 · 三条轨迹并排对比' },
  { id: 'court', en: 'COURT & RULES', name: '球场与规则', hint: '尺寸标注 · 四种场地 · 计分演示' },
  { id: 'history', en: 'HISTORY', name: '历史长廊', hint: '1873 → 今天 · 球拍与球的进化' },
  { id: 'gear', en: 'GEAR LAB', name: '装备解剖', hint: '球拍参数实时改几何' },
  { id: 'train', en: 'TRAINING', name: '训练挑战', hint: '判断题 · 记没记住' }
]

export const COURT = {
  length: 23.77,
  singlesWidth: 8.23,
  doublesWidth: 10.97,
  serviceLineFromNet: 6.4,
  netCenterHeight: 0.914,
  netPostHeight: 1.07,
  postOutset: 0.914,
  lineWidth: 0.05
}

export const PHASES = [
  { t: 0, name: '准备引拍' },
  { t: 0.28, name: '挥拍加速' },
  { t: 0.52, name: '击球瞬间' },
  { t: 0.68, name: '随挥还原' }
]

const BASE = {
  bodyX: 0,
  torsoY: 0,
  torsoX: 0,
  shX: 0.25,
  shY: 0.68,
  shZ: -0.35,
  leftY: -0.55,
  leftZ: 0.25,
  legL: 0,
  legR: 0
}

function pose(patch) {
  return { ...BASE, ...patch }
}

function shot(data) {
  const keys = data.keys.map((key, index) => ({
    ...key,
    ease: index === 0 ? 'decel' : index === 1 ? 'accel' : index === 2 ? 'decel' : 'smooth'
  }))
  return {
    duration: 1.7,
    contactAt: 0.52,
    bounce: 0.62,
    flex: 1,
    spin: 0,
    approach: { x: 0, y: 1.7, z: 6 },
    ...data,
    keys
  }
}

export const SHOTS = [
  shot({
    id: 'forehand',
    en: 'FOREHAND',
    name: '正手击球',
    desc: '侧身引拍，转体带动手臂，向前上方挥拍。',
    points: [
      '先转肩再出手，拍头留在手后面。',
      '击球点在身体前侧，拍面略微朝下，从球的下方向上刷。',
      '重心移到前脚，随挥收到另一侧肩上。'
    ],
    error: '只用手臂甩拍时，球缺少旋转，也更容易伤到肘和肩。',
    place: { x: 0.35, z: -10.7 },
    contact: { x: 0.9, y: 1.05, z: -9.55 },
    velocity: { x: 1.2, y: 4.2, z: 15.4 },
    spin: 1800,
    keys: [
      { t: 0, pose: pose({ bodyX: -0.05, torsoY: -0.08, legR: 0.08 }) },
      { t: 0.36, pose: pose({ bodyX: -0.12, torsoY: -0.68, shX: -0.22, shY: -1.18, shZ: -0.55, leftY: -0.95, leftZ: -0.1, legR: 0.2 }) },
      { t: 0.52, pose: pose({ bodyX: 0.04, torsoY: 0.18, shX: 0, shY: 0.16, shZ: -0.12, leftY: -0.25, leftZ: 0.35, legL: 0.16 }) },
      { t: 0.7, pose: pose({ bodyX: 0.08, torsoY: 0.65, shX: 0.58, shY: 1.68, shZ: 0.32, leftY: 0.15, leftZ: 0.42, legL: 0.08 }) },
      { t: 1, pose: pose({ torsoY: 0.12, shX: 0.3, shY: 0.85, shZ: -0.2 }) }
    ]
  }),
  shot({
    id: 'backhand',
    en: 'BACKHAND',
    name: '双手反拍',
    desc: '双手握拍，肩部转动，向前穿过击球区域。',
    points: [
      '双手一起转肩，拍头不要掉到膝盖下面。',
      '击球点比正手更靠前，拍面在击球时基本垂直。',
      '转髋带动手臂，随挥伸向来球的方向。'
    ],
    error: '只动手腕、肩不转时，拍面容易打开，球出浅。',
    place: { x: -0.35, z: -10.7 },
    contact: { x: -0.75, y: 1.02, z: -9.5 },
    velocity: { x: 0.3, y: 5.2, z: 16 },
    spin: 1400,
    flex: 0.85,
    keys: [
      { t: 0, pose: pose({ bodyX: 0.06, torsoY: 0.2, shY: 0.4, leftY: -0.2, leftZ: 0.55 }) },
      { t: 0.36, pose: pose({ bodyX: 0.12, torsoY: 0.72, shX: -0.1, shY: 1.15, shZ: -0.4, leftY: 0.35, leftZ: 0.85, legL: 0.12 }) },
      { t: 0.52, pose: pose({ torsoY: -0.05, shX: 0.05, shY: -0.15, shZ: -0.08, leftY: -0.35, leftZ: 0.5, legR: 0.14 }) },
      { t: 0.7, pose: pose({ bodyX: -0.08, torsoY: -0.62, shX: 0.35, shY: -1.35, shZ: 0.2, leftY: -0.7, leftZ: 0.25 }) },
      { t: 1, pose: pose({ torsoY: -0.15, shY: -0.2, shZ: -0.25 }) }
    ]
  }),
  shot({
    id: 'serve',
    en: 'SERVE',
    name: '发球',
    desc: '抛球、屈膝、蹬地、转肩，在最高点击球。',
    points: [
      '抛球落在身体前上方，不要抛到脑后。',
      '击球点尽量高，拍面在击球瞬间朝向发球区。',
      '平击发球轨迹低，落点要进对角发球区。'
    ],
    error: '击球点偏低或脚踩进线内，球既没有速度，也会脚误。',
    place: { x: 0.7, z: -12.15 },
    contact: { x: 0.35, y: 2.45, z: -11.35 },
    approach: { x: 0.35, y: 0.4, z: -12.15 },
    velocity: { x: 1.2, y: 1.8, z: 22.8 },
    spin: 900,
    bounce: 0.7,
    flex: 1.15,
    keys: [
      { t: 0, pose: pose({ torsoX: 0.08, shY: 0.35, shZ: 0.15, legL: 0.2, legR: 0.2 }) },
      { t: 0.34, pose: pose({ torsoX: -0.32, torsoY: -0.35, shX: -0.35, shY: -0.85, shZ: 1.15, leftZ: -0.4, legL: 0.32, legR: 0.32 }) },
      { t: 0.52, pose: pose({ torsoX: 0.12, shX: 0.1, shY: 0.05, shZ: 1.35, leftZ: -0.9, legL: -0.05 }) },
      { t: 0.72, pose: pose({ torsoX: 0.4, torsoY: 0.45, shX: 0.7, shY: 1.1, shZ: 0.35 }) },
      { t: 1, pose: pose({ torsoX: 0.12, shY: 0.5, shZ: -0.1 }) }
    ]
  }),
  shot({
    id: 'volley',
    en: 'VOLLEY',
    name: '网前截击',
    desc: '紧凑引拍，身体迎前，稳定拍面完成挡击。',
    points: [
      '引拍很短，拍头停在肩膀前面。',
      '拍面在击球时保持稳定，不从下往上刷。',
      '身体迎着来球压过去，重心落在前脚。'
    ],
    error: '引拍过大就会错过短球，拍面一翻球就出界。',
    place: { x: 0.2, z: -2.5 },
    contact: { x: 0.55, y: 1.25, z: -1.7 },
    approach: { x: 0.2, y: 1.15, z: 5 },
    velocity: { x: 2.16, y: 3.12, z: 9.43 },
    spin: 500,
    bounce: 0.55,
    duration: 1.6,
    flex: 0.35,
    keys: [
      { t: 0, pose: pose({ torsoX: 0.1, shY: 0.35, shZ: -0.15, legL: 0.16 }) },
      { t: 0.36, pose: pose({ torsoX: 0.16, torsoY: -0.28, shX: -0.1, shY: -0.25, shZ: -0.05, legL: 0.24 }) },
      { t: 0.52, pose: pose({ torsoX: 0.2, torsoY: 0.12, shY: 0.22, shZ: 0.02, legL: 0.1 }) },
      { t: 1, pose: pose({ torsoX: 0.12, shY: 0.4, shZ: -0.12 }) }
    ]
  }),
  shot({
    id: 'smash',
    en: 'SMASH',
    name: '高压球',
    desc: '侧身移动，举拍过头，在身体前上方击球。',
    points: [
      '非持拍手指向来球，帮助判断落点。',
      '击球点在身体前上方，不要等球落到头顶。',
      '扣下去之后拍头收到身体另一侧。'
    ],
    error: '退到球的正下方再打，拍面容易打到球的后部，球下网。',
    place: { x: 0.2, z: -7.4 },
    contact: { x: 0.15, y: 2.35, z: -6.5 },
    approach: { x: 0.1, y: 3.4, z: -2 },
    velocity: { x: 1.19, y: 1.57, z: 15.82 },
    spin: 700,
    bounce: 0.58,
    flex: 1.2,
    keys: [
      { t: 0, pose: pose({ torsoY: -0.25, shZ: 0.85, leftZ: -0.7 }) },
      { t: 0.34, pose: pose({ torsoX: -0.28, torsoY: -0.4, shX: -0.2, shY: -0.7, shZ: 1.25, leftZ: -1.15 }) },
      { t: 0.52, pose: pose({ torsoX: 0.22, shX: 0.35, shY: 0.25, shZ: 1.05, leftZ: -0.4 }) },
      { t: 0.72, pose: pose({ torsoX: 0.38, torsoY: 0.4, shX: 0.75, shY: 1.2, shZ: 0.2 }) },
      { t: 1, pose: pose({ shY: 0.55, shZ: 0.05 }) }
    ]
  }),
  shot({
    id: 'slice',
    en: 'SLICE',
    name: '切削球',
    desc: '拍头略高，从后上向前下方切过球体。',
    points: [
      '拍面打开，拍头从球的后上方向前下方切。',
      '随挥短，不要再向上刷。',
      '切削球过网后弧线更平，落地后向前冲得少。'
    ],
    error: '切得太薄、拍面开太大，球会飘出底线。',
    place: { x: 0.3, z: -10.6 },
    contact: { x: 0.7, y: 1.15, z: -9.6 },
    velocity: { x: 1.37, y: 4.16, z: 15.26 },
    spin: -1700,    bounce: 0.42,
    flex: 0.7,
    keys: [
      { t: 0, pose: pose({ torsoY: -0.12, shX: -0.15, shZ: 0.05 }) },
      { t: 0.36, pose: pose({ torsoY: -0.5, shX: -0.55, shY: -0.95, shZ: 0.35, legR: 0.1 }) },
      { t: 0.52, pose: pose({ torsoY: 0.08, shX: -0.1, shY: 0.2, shZ: -0.15 }) },
      { t: 0.7, pose: pose({ torsoY: 0.28, shX: 0.15, shY: 0.7, shZ: -0.35 }) },
      { t: 1, pose: pose({ shY: 0.55, shZ: -0.2 }) }
    ]
  }),
  shot({
    id: 'topspin',
    en: 'TOPSPIN',
    name: '上旋球',
    desc: '由低向高刷球，拍头加速上行制造上旋。',
    points: [
      '挥拍路线从低到高，拍面在击球时略微关闭。',
      '上旋让球过网后下压，所以可以打出更高的过网高度。',
      '落地后球会向前跳，红土上这个差别更明显。'
    ],
    error: '只往上捞、没有向前送拍，球会停在网上。',
    place: { x: 0.35, z: -10.7 },
    contact: { x: 0.85, y: 0.95, z: -9.5 },
    velocity: { x: 0.9, y: 5.6, z: 14.2 },
    spin: 3200,
    bounce: 0.74,
    flex: 1.25,
    keys: [
      { t: 0, pose: pose({ torsoY: -0.15, shX: 0.45, shZ: -0.55 }) },
      { t: 0.36, pose: pose({ torsoY: -0.78, shX: 0.15, shY: -1.25, shZ: -0.72, legR: 0.18 }) },
      { t: 0.52, pose: pose({ torsoY: 0.16, shX: -0.05, shY: 0.28, shZ: 0.15, legL: 0.14 }) },
      { t: 0.7, pose: pose({ torsoY: 0.72, shX: 0.35, shY: 1.75, shZ: 0.55 }) },
      { t: 1, pose: pose({ torsoY: 0.2, shY: 0.9, shZ: 0.05 }) }
    ]
  }),
  shot({
    id: 'drop',
    en: 'DROP',
    name: '放小球',
    desc: '轻柔触球，减少力量，控制球的落点。',
    points: [
      '拍面打开，触球时间短，把来球的速度卸掉。',
      '随挥很短，球刚好过网。',
      '落点靠近球网，第二次弹起很低。'
    ],
    error: '发力没收住，小球会变成长球，落在对方舒服的击球点。',
    place: { x: 0.15, z: -9.2 },
    contact: { x: 0.4, y: 1.05, z: -8.3 },
    approach: { x: 0.1, y: 1.4, z: 4 },
    velocity: { x: 1.44, y: 4.2, z: 10.4 },
    spin: -900,
    bounce: 0.35,
    flex: 0.45,
    keys: [
      { t: 0, pose: pose({ torsoX: 0.06, shY: 0.45 }) },
      { t: 0.36, pose: pose({ torsoY: -0.22, shX: -0.08, shY: -0.15, shZ: -0.05 }) },
      { t: 0.52, pose: pose({ torsoX: 0.1, torsoY: 0.06, shY: 0.18, shZ: -0.02 }) },
      { t: 1, pose: pose({ shY: 0.5, shZ: -0.2 }) }
    ]
  })
]

export function shotById(id) {
  return SHOTS.find((item) => item.id === id) || SHOTS[0]
}

export function phaseAt(t) {
  let name = PHASES[0].name
  for (const phase of PHASES) {
    if (t >= phase.t) name = phase.name
  }
  return name
}

/** 触球前后拍头滞后，击中后拍面和拍弦按阻尼正弦回弹。 */
export function racketFlex(swingT, contactAt, amount = 1) {
  const u = swingT - contactAt
  if (u < -0.18) {
    return { elbow: 0.42 * amount, face: -0.22 * amount, string: 0 }
  }
  if (u < 0) {
    const p = (u + 0.18) / 0.18
    const e = p * p * (3 - 2 * p)
    return {
      elbow: 0.42 * amount * (1 - e),
      face: -0.32 * amount * (1 - e),
      string: -0.03 * amount * (1 - e)
    }
  }
  const decay = Math.exp(-u * 6.8)
  const wave = Math.sin(u * 28) * decay
  return {
    elbow: -0.1 * amount * decay,
    face: 0.7 * amount * wave,
    string: -0.09 * amount * wave
  }
}

export function samplePose(keys, t) {
  let a = keys[0]
  let b = keys[keys.length - 1]
  for (let i = 0; i < keys.length - 1; i += 1) {
    if (t >= keys[i].t && t <= keys[i + 1].t) {
      a = keys[i]
      b = keys[i + 1]
      break
    }
  }
  const span = Math.max(1e-4, b.t - a.t)
  const k = Math.min(1, Math.max(0, (t - a.t) / span))
  // accel 段用于引拍切向击球：起步慢、拍头加速冲过触球点，像鞭子甩出去
  // decel 段用于随挥收拍：出速快、末端自然卸力
  let e = k * k * (3 - 2 * k)
  if (a.ease === 'accel') e = k * k * (2 - k) * 0.85 + k * 0.15
  if (a.ease === 'decel') e = 1 - (1 - k) * (1 - k)
  const out = {}
  for (const key of Object.keys(a.pose)) {
    const from = a.pose[key]
    const to = b.pose[key] ?? from
    out[key] = from + (to - from) * e
  }
  return out
}
