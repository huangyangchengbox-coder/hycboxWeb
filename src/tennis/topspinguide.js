/**
 * 上旋发球实验室 · 教学数据层。
 * 与 sliceguide.js 同构：5 阶段教学文本 + 阶段边界/锚点 + 双轨坐标表。
 *
 * 坐标口径（沿用 SliceServeMode 的参考系：发球者 z=+12.1，发向 -z，
 * wrapper rotation.y = π → 世界 (x,y,z)→(-x,y,-z)；deuce 指参考系一区，
 * 模式层与项目语义取反）。
 *
 * 兼容说明：坐标表沿用切削模式的字段名（sliceContact 等），在 TopspinServeMode
 * 内这些字段语义为"上旋"——这样 flightCurve/bounceCurve/ballPositionAt 可直接复用。
 */

/** 5 阶段教学文本：随左右手 / 发球区自适应。 */
export function topspinStageInfo(stageIdx, { left = false, deuce = true } = {}) {
  const areaName = deuce ? '一区（右侧）' : '二区（左侧）'
  const tossClock = left ? '11:30 - 12:00（头顶正上方略偏左后）' : '12:00 - 12:30（头顶正上方略偏右后）'
  const followSide = left ? '收向右腰侧，跨步进场' : '收向左腰侧，跨步进场'

  const stages = [
    {
      badge: '阶段 1 / 5 · 准备姿势',
      title: '1. 侧身站位与大陆式握拍',
      desc: `站在${areaName}底线后方，侧身站立，双肩连线指向球网。握拍必须用大陆式：像握锤子一样握住拍柄，虎口 V 字对准拍柄上方的棱（2 号棱），食指第一指节扣在拍柄右上斜面。上旋与切削、平击共用这一种握拍——这正是它成为"发球万能握拍"的原因。`,
      force: '重心落在前脚掌，双膝微屈待发',
      toss: tossClock,
      contact: '大陆式握拍：拍面可在垂直平面内自由翻转',
      mistake: '用正手东方式握拍发上旋会让拍面天生朝地，根本没法从下往上刷球的背面——这是上旋发球学不会的头号原因。'
    },
    {
      badge: '阶段 2 / 5 · 抛球蓄力',
      title: `2. ${tossClock.split('（')[0]}抛球——比切削更靠后`,
      desc: `非持拍手把球垂直托举到头顶略偏后方（约头顶正上方${left ? '11:30-12:00' : '12:00-12:30'}钟方向），击球点允许落在头顶连线的后侧约一个球的位置。靠后的抛球给拍头留出"从下向上迎球刷球"的上升通道——这是上旋与平击抛球位置的本质区别。`,
      force: '重心后移，双膝深屈，肩髋反向扭转蓄力',
      toss: tossClock,
      contact: '抛球垂直稳定，允许比平击略靠后',
      mistake: '抛球太靠前（为追求速度）会让挥拍轨迹变成从上往下砸，球只能打平击——想刷上旋根本没有刷球路径。'
    },
    {
      badge: '阶段 3 / 5 · 深蹲搔背',
      title: '3. 奖杯姿势 → 全幅搔背与背弓',
      desc: '屈膝比平击更深，整条脊柱向后弯成弓形，拍头沿背部下垂、拍框几乎指向地面。此时持拍肩低于抛球肩，形成"拉弓"式的弹性势能——上旋发球的旋转动能大半来自这一段深度蓄力。',
      force: '下肢弹性势能满格，等待蹬地释放',
      toss: '球体悬停于最高点，约在头顶后上方',
      contact: '拍头深坠指向地面（比平击低 15° 左右）',
      mistake: '搔背不彻底（拍头没落到最低）会导致刷球行程不足，球只有速度没有旋转——上旋发球变成"发飘的平击"。'
    },
    {
      badge: '阶段 4 / 5 · 核心刷球',
      title: '4. 从 7 点钟向上刷到 12/1 点钟',
      desc: `蹬地起跳的同时，拍头沿着球的背面从 7 点钟位置向上推刷过 12 点钟甚至 1 点钟位置——像"把球向上擦出去"。接触点在球的后下方（约 6-7 点钟），拍面在接触瞬间仍略微朝后下方，随后前臂内旋 + 手腕屈伸让拍头"追着球往上跑"。摩擦方向就是旋转方向：刷得越高，上旋越强。`,
      force: '60% 向前穿透 + 40% 向上摩擦（平击约为 90%/10%）',
      toss: `刷击高度约 2.6 m，比平击略低、更贴头顶后方`,
      contact: '球体后下方 6-7 点钟位置（看 3D 受力点标记）',
      mistake: '以为上旋是"拍面朝上托球"——错！拍面接触瞬间几乎垂直朝后，上旋来自拍头沿球面向上的相对运动，不是拍面仰角。'
    },
    {
      badge: '阶段 5 / 5 · 随挥与马格努斯急坠',
      title: '5. 随挥收向异侧 + 前冲高弹跳',
      desc: `击球后球拍顺着惯性${followSide}。强烈上旋让球顶面气压低、底面气压高——马格努斯力向下压（红色矢量），于是球可以大胆打高过网弧线（净空 1.4-1.6 m 也不会出界），在发球区内急坠落地；落地后旋转摩擦地面，球向前上方"蹿"起高弹跳，直逼接发者肩部。`,
      force: '马格努斯力方向向下：过网高却压得住落点',
      toss: deuce ? '目标落点：发球区深区，压底线附近' : '目标落点：发球区深区或追身位',
      contact: followSide,
      mistake: '看到弧线高就慌着减速——上旋发球的自信恰恰来自马格努斯下压：弧线越高、下坠越急，落点越深越安全。'
    }
  ]
  return stages[Math.max(0, Math.min(4, stageIdx))]
}

/** 阶段边界与跳转锚点（progress 0-1，时间轴分配与切削同构）。 */
export const TOPSPIN_STAGE_EDGES = [0.16, 0.36, 0.5, 0.62, 1.01]
export const TOPSPIN_STAGE_ANCHORS = [0.05, 0.28, 0.44, 0.56, 0.78]

/**
 * 双轨坐标表（字段名沿用切削接口；slice* 字段语义 = 上旋轨）。
 * 上旋特征：击球点更靠后/贴头顶、过网更高（1.5m）、弧线更高、落点更深、
 * 落地后前冲高弹跳（peakY 0.95 vs 切削 0.4）。
 */
export function topspinCoords({ left = false, deuce = true } = {}) {
  const handSign = left ? -1 : 1
  const serverX = deuce ? 1.65 : -1.65
  const serverZ = 12.1
  const stanceBall = { x: serverX - 0.22 * handSign, y: 1.15, z: 11.75 }
  // 上旋击球点：头顶正上方略偏后（z 比切削大 → 更靠后）
  const sliceContact = { x: serverX + 0.1 * handSign, y: 2.6, z: 11.72 }
  const flatContact = { x: serverX + 0.15 * handSign, y: 2.75, z: 11.58 }

  let netCrossSlice, bounceSlice, afterBounceSlice
  let netCrossFlat, bounceFlat, afterBounceFlat

  if (deuce) {
    // 右手一区：发向对角深区，弧线高、急坠、落地前冲
    netCrossSlice = { x: -0.45, y: 1.52, z: 0 }
    bounceSlice = { x: -2.9, y: 0.065, z: -5.35 }
    afterBounceSlice = { x: -3.7, y: 1.05, z: -8.9 }
    netCrossFlat = { x: -0.3, y: 1.08, z: 0 }
    bounceFlat = { x: -2.1, y: 0.065, z: -5.25 }
    afterBounceFlat = { x: -3.15, y: 1.18, z: -8.6 }
  } else {
    // 右手二区：同样压深区，弧线偏中路
    netCrossSlice = { x: -0.2, y: 1.5, z: 0 }
    bounceSlice = { x: 0.5, y: 0.065, z: -5.3 }
    afterBounceSlice = { x: 1.0, y: 1.0, z: -8.8 }
    netCrossFlat = { x: -0.15, y: 1.08, z: 0 }
    bounceFlat = { x: 1.45, y: 0.065, z: -5.3 }
    afterBounceFlat = { x: 2.1, y: 1.18, z: -8.6 }
  }

  const coords = {
    handSign, serverX, serverZ, stanceBall,
    sliceContact, flatContact,
    netCrossSlice, bounceSlice, afterBounceSlice,
    netCrossFlat, bounceFlat, afterBounceFlat
  }
  // 左手持拍：落点全部镜像（生物力学镜像，与切削模式的四分支口径一致）
  if (left) {
    for (const key of ['netCrossSlice', 'bounceSlice', 'afterBounceSlice', 'netCrossFlat', 'bounceFlat', 'afterBounceFlat']) {
      coords[key] = { ...coords[key], x: -coords[key].x }
    }
  }
  return coords
}

/**
 * 握拍 3D 特写数据：拍柄八棱编号（从拍面朝向看，顶棱为 1，顺时针 2-8）
 * 与三种握拍的要领/错误。bevel 是棱对应的拍面转向。
 */
export const GRIP_INFO = {
  bevels: [
    { n: 1, label: '1 号棱（正上）' },
    { n: 2, label: '2 号棱（右斜上）' },
    { n: 3, label: '3 号棱（右斜下）' },
    { n: 4, label: '4 号棱（正右）' },
    { n: 5, label: '5 号棱（正下）' },
    { n: 6, label: '6 号棱（左斜下）' },
    { n: 7, label: '7 号棱（左斜上）' },
    { n: 8, label: '8 号棱（正左）' }
  ],
  grips: {
    continental: {
      name: '大陆式握拍（发球标准）',
      bevel: 2,
      vAngle: -0.22, // V 字（虎口）朝向：相对拍面竖直面的偏转
      points: [
        '虎口 V 字卡在拍柄 2 号棱上（右手）',
        '食指第一指节扣住右斜面，拇指绕柄自然扣压',
        '拍面与掌心垂直——手腕可以像门铰链一样自由内旋',
        '发球全程不换握：切削、平击、上旋、截击通用'
      ],
      why: '发球需要前臂内旋（pronation）让拍头加速翻过头顶。大陆式握拍给手腕留出了这个旋转自由度，其它握拍会把腕关节锁死在"打正手"的平面上。'
    },
    eastern: {
      name: '东方式正手握拍（对比：错误的发球握拍）',
      bevel: 3,
      vAngle: 0.5,
      points: [
        '虎口 V 字落在 3 号棱（右下斜面）',
        '掌心几乎与击球面平行——这是为地面正手设计的握法',
        '发球时拍面天生朝下倾斜约 20°',
        '想打出上旋只能靠手臂"托"球，旋转量和稳定性都崩'
      ],
      why: '把这只手摆到发球搔背位：拍面朝向地面而不是球——用它发球等于端着一口平底锅从下往上兜球。'
    }
  }
}

/** 受力点分析卡片数据：接触点 / 摩擦方向 / 马格努斯三要素。 */
export const FORCE_POINTS = [
  {
    id: 'contact',
    name: '受力点 · 球后下方 6-7 点钟',
    color: '#f43f5e',
    desc: '接触瞬间拍头正从球的下方迎上来，接触点位于球的后下侧（面对来拍方向的 6-7 点钟）。这里同时受到三组作用：拍面推力（向前）、沿球面向上的摩擦（制造上旋）、以及拍线形变回弹（弹性储能释放）。'
  },
  {
    id: 'brush',
    name: '拍面方向 · 接触瞬间朝后下',
    color: '#38bdf8',
    desc: '拍面在接触瞬间并不朝上——它几乎垂直、略微朝后下。上旋来自拍头沿球面向上的相对运动（刷），不是拍面仰角。看 3D 里拍面法线箭头：接触前朝后下，接触后 0.1 s 内内旋翻转为朝前上。'
  },
  {
    id: 'magnus',
    name: '马格努斯力 · 向下压',
    color: '#facc15',
    desc: '上旋（球顶向前转）+ 前进速度 → ω×v 指向下方：球被"压"回场地。这解释了上旋发球的自由度——可以打过网 1.5 m 的安全高度，马格努斯力仍把球拽进发球区；落地后旋转又把弹跳顶向前上方。'
  }
]
