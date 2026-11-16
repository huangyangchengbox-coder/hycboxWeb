/**
 * 切削发球生物力学 · 教学数据层。
 * 承接 3D 切削发球实验室（3d-切削发球v3.html）的 5 阶段教学体系与双轨坐标表。
 *
 * 坐标口径（本文件内的 z 为"参考坐标"：发球者站在 z=+12.1，网在 z=0，发向 -z）：
 * SliceServeMode 会把整个场景放进 rotation.y = π 的 wrapper，
 * 刚体旋转保持手性，参考坐标 → 世界坐标为 (x, y, z) → (-x, y, -z)。
 * 因此**本文件里的 deuce 指参考系的一区**，模式层负责与项目语义（世界 +x 为平分区）互换。
 */

/** 5 阶段教学文本：随左右手 / 发球区 / 平击切削自适应（移植自参考 getStageInfo）。 */
export function sliceStageInfo(stageIdx, { left = false, deuce = true, flat = false } = {}) {
  const handSign = left ? -1 : 1
  const tossClock = flat
    ? (left ? '11:30 方向（头顶正上方偏左前）' : '12:30 方向（头顶正上方偏右前）')
    : (left ? '10:00 - 10:30 方向（头顶偏左前方）' : '1:30 - 2:00 方向（头顶偏右前方）')
  const contactEdge = flat
    ? '拍面内旋正对球体后方 6 点钟（球心）'
    : (left ? '拍面边缘先导刷切球体左侧 9 点钟方向' : '拍面边缘先导刷切球体右侧 3 点钟方向')
  const curveDir = left ? '向接发球者左侧强烈拐弯' : '向接发球者右侧强烈拐弯'
  const followSide = left ? '先向左前方充分延伸，再收至右腰侧' : '先向右前方充分延伸，再收至左腰侧'
  const areaName = deuce ? '一区（右侧）' : '二区（左侧）'

  const stages = [
    {
      badge: '阶段 1 / 5 · 准备姿势',
      title: '1. 侧身站位与大陆式握拍',
      desc: `站在${areaName}底线后方，双脚呈侧身站立，前脚尖斜指向对侧网柱。采用大陆式握拍（如握锤子般），食指指关节置于拍柄 2 号棱上，锁死拍面侧面切击角度。`,
      force: flat ? '95% 向前直线撞击 + 5% 微量前旋' : '70% 向前穿透 + 30% 侧面摩擦',
      toss: tossClock,
      contact: '大陆式握拍锁定拍面边缘先导角度',
      mistake: '切忌使用正手东方式握拍！东方式握拍会使拍面天然朝下，无法从侧面削切球体。'
    },
    {
      badge: '阶段 2 / 5 · 抛球蓄力',
      title: flat ? '2. 头顶正上方偏前高点抛球' : `2. ${left ? '10点半' : '1点半'}钟方向偏侧抛球`,
      desc: flat
        ? '非持拍手平稳托举抛球至头顶偏前高点，追求最高击球点以获得下压过网角度。'
        : `非持拍手平稳托举抛球至【${tossClock}】，且进入底线内侧约 40 cm。偏持拍侧的抛球为球拍留出了从侧面切过球体的黄金空间。`,
      force: '重心向后脚转移，肩髋开始蓄力扭转',
      toss: tossClock,
      contact: '抛球高度稳定，最高点悬停约 0.15 秒',
      mistake: flat
        ? '抛球过靠后会导致击球点后仰下网。'
        : '抛球过于靠近头顶正中（12 点）会迫使你打出平击或上旋球，失去切削的外角拐弯角度。'
    },
    {
      badge: '阶段 3 / 5 · 奖杯姿势',
      title: '3. 奖杯姿势 (Trophy) 与拍头下坠搔背',
      desc: '抛球升至最高点时，双膝深屈蓄力，持拍手肘抬高，拍头垂直下坠至背部后方形成经典的"搔背"蓄力姿势。此时胸部向天空微仰打开，形成蓄势待发的弓形张力。',
      force: '下肢深屈膝蓄能 → 准备由下而上蹬地传递',
      toss: '球体处于最高点悬停瞬间',
      contact: '拍头深坠（Racquet Drop），拍框边缘朝上',
      mistake: '搔背时手肘塌陷过低，或身体过早转向正面面对球网，都会破坏切削发球的侧向鞭打发力。'
    },
    {
      badge: '阶段 4 / 5 · 核心切击',
      title: flat ? '4. 前臂内旋正击球心' : `4. 侧面刷切球体${left ? '9点钟' : '3点钟'}边缘`,
      desc: flat
        ? '蹬地转髋向上挥拍，前臂快速内旋（Pronation）让拍面正对球心后方直接撞击，将全部力量转化为向前的直线初速度。'
        : `蹬地转髋挥拍向上，保持侧身姿态多停留一瞬，用拍面快速摩擦包裹球的【${left ? '左侧9点钟' : '右侧3点钟'}边缘】（如同削苹果皮），切出强烈侧旋。`,
      force: flat ? '95% 向前穿透力（追求直线速度）' : '70% 向前穿透 + 30% 侧面切击摩擦',
      toss: flat ? '最高击球点约 2.75 m' : '切击高度约 2.65 m',
      contact: contactEdge,
      mistake: '"只切不打"会导致球速太慢下网！切削发球依然需要 70% 向前的穿透挥拍，让球带着前冲势头飞过球网。'
    },
    {
      badge: '阶段 5 / 5 · 随挥与马格努斯弧线',
      title: '5. 充分延伸随挥与落地外窜',
      desc: flat
        ? '击球后球拍顺势收向身体异侧，网球几乎无侧旋，沿直线高速过网并产生较高前冲弹跳。'
        : `击球后球拍${followSide}。高速侧旋触发马格努斯效应（红色力矢量），使球在空中${curveDir}，落地后低平向外侧窜出${deuce ? '大外角' : '追身/内角'}！`,
      force: flat ? '直线惯性飞行，高弹跳' : '马格努斯侧向压差力持续推动球体拐弯',
      toss: deuce ? '目标落点：外角边线附近' : '目标落点：追身/内角线附近',
      contact: followSide,
      mistake: '击球瞬间切忌立刻向异侧猛拉收拍，先向持拍侧前方充分延伸才能保证旋转与发球深度。'
    }
  ]
  return stages[Math.max(0, Math.min(4, stageIdx))]
}

/** 阶段划分（progress 0-1 的分界），与参考 syncUI 一致。 */
export const SLICE_STAGE_EDGES = [0.16, 0.36, 0.52, 0.62, 1.01]
/** 各阶段跳转锚点（与参考 jumpToStage 一致）。 */
export const SLICE_STAGE_ANCHORS = [0.05, 0.28, 0.46, 0.56, 0.76]

/**
 * 双轨坐标表（参考坐标：发球者 z=+12.1，发向 -z；deuce 为参考系一区）。
 * slice / flat 各有：击球点 contact、过网点 netCross、落点 bounce、弹跳后 afterBounce。
 */
export function sliceCoords({ left = false, deuce = true } = {}) {
  const handSign = left ? -1 : 1
  const serverX = deuce ? 1.65 : -1.65
  const serverZ = 12.1
  const stanceBall = { x: serverX - 0.22 * handSign, y: 1.15, z: 11.75 }
  const sliceContact = { x: serverX + 0.42 * handSign, y: 2.65, z: 11.55 }
  const flatContact = { x: serverX + 0.08 * handSign, y: 2.75, z: 11.58 }

  let netCrossSlice, bounceSlice, afterBounceSlice
  let netCrossFlat, bounceFlat, afterBounceFlat

  if (deuce) {
    if (!left) {
      // 右手一区大外角：向边线强烈拐弯并外窜
      netCrossSlice = { x: -0.65, y: 1.2, z: 0 }
      bounceSlice = { x: -3.6, y: 0.065, z: -4.35 }
      afterBounceSlice = { x: -5.45, y: 0.52, z: -6.35 }
      netCrossFlat = { x: -0.3, y: 1.08, z: 0 }
      bounceFlat = { x: -2.1, y: 0.065, z: -5.25 }
      afterBounceFlat = { x: -3.15, y: 1.18, z: -8.6 }
    } else {
      // 左手一区中路内角：向中线拐弯
      netCrossSlice = { x: 0.35, y: 1.22, z: 0 }
      bounceSlice = { x: -0.35, y: 0.065, z: -4.85 }
      afterBounceSlice = { x: 0.85, y: 0.58, z: -7.2 }
      netCrossFlat = { x: 0.15, y: 1.08, z: 0 }
      bounceFlat = { x: -1.45, y: 0.065, z: -5.3 }
      afterBounceFlat = { x: -2.1, y: 1.18, z: -8.6 }
    }
  } else if (!left) {
    // 右手二区追身/内角：向中线拐弯挤压反手
    netCrossSlice = { x: -0.35, y: 1.22, z: 0 }
    bounceSlice = { x: 0.35, y: 0.065, z: -4.85 }
    afterBounceSlice = { x: -0.85, y: 0.58, z: -7.2 }
    netCrossFlat = { x: -0.15, y: 1.08, z: 0 }
    bounceFlat = { x: 1.45, y: 0.065, z: -5.3 }
    afterBounceFlat = { x: 2.1, y: 1.18, z: -8.6 }
  } else {
    // 左手二区大外角：向边线强烈拐弯并外窜
    netCrossSlice = { x: 0.65, y: 1.2, z: 0 }
    bounceSlice = { x: 3.6, y: 0.065, z: -4.35 }
    afterBounceSlice = { x: 5.45, y: 0.52, z: -6.35 }
    netCrossFlat = { x: 0.3, y: 1.08, z: 0 }
    bounceFlat = { x: 2.1, y: 0.065, z: -5.25 }
    afterBounceFlat = { x: 3.15, y: 1.18, z: -8.6 }
  }

  return {
    handSign, serverX, serverZ, stanceBall,
    sliceContact, flatContact,
    netCrossSlice, bounceSlice, afterBounceSlice,
    netCrossFlat, bounceFlat, afterBounceFlat
  }
}
