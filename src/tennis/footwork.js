/**
 * 网球全场脚步：实战场景、步法百科、五步周期、三大区域。
 *
 * 坐标系（米）：
 *   x 横向，单打边线 ±4.115，双打边线 ±5.485
 *   y 纵向，球网 y = 0，发球线 y = ±6.40，底线 y = ±11.885
 *   演示都在己方半场，y > 0。
 */

export const SCENARIOS = [
  {
    id: 'baseline_rally',
    shortName: '底线横向拉锯',
    title: '场景一：底线横向拉锯',
    zone: '底线相持区',
    tag: '最常用 · 80% 回合',
    desc: '底线多拍相持里最经典的横向大角度移动。从底线中点分腿垫步启动，用交叉步快速横移抢占正手位，碎步调整间距后开放式站位击球，随后滑步回位。',
    coachTip: '横向启动的第一步务必先转髋并迈出外侧脚（或顺步交叉）。用小碎步横移长距离会严重拖慢到位速度。',
    duration: 6.5,
    ball: {
      start: { x: -2.2, y: -11.5 },
      bounce: { x: 3.3, y: 9.2 },
      hit: { x: 3.8, y: 11.6 },
      target: { x: -3.1, y: -10.8 }
    },
    keyframes: [
      { t: 0, x: 0, y: 12.1, facing: -Math.PI / 2, stepType: 'ready', label: '底线中点准备', footCue: '双脚与肩同宽，前脚掌微压蓄力' },
      { t: 0.14, x: 0, y: 12.1, facing: -Math.PI / 2, stepType: 'split', label: '分腿垫步', footCue: '对手触球瞬间，双脚微跳宽距落地' },
      { t: 0.34, x: 2.3, y: 12, facing: 0.15, stepType: 'crossover', label: '交叉步启动', footCue: '左脚跨过右脚，快速横向大步冲刺' },
      { t: 0.5, x: 3.5, y: 11.8, facing: -0.2, stepType: 'adjust', label: '碎步微调', footCue: '高频小碎步调整身体与来球间距' },
      { t: 0.62, x: 3.7, y: 11.7, facing: -0.45, stepType: 'hit', label: '开放式击球', footCue: '右脚外侧制动踩实，蹬地转髋挥拍' },
      { t: 0.84, x: 1.4, y: 12, facing: -Math.PI / 2, stepType: 'shuffle', label: '侧滑步回位', footCue: '右脚爆发蹬地，交叉接侧滑步回中' },
      { t: 1, x: 0.2, y: 12.1, facing: -Math.PI / 2, stepType: 'ready', label: '回位至角平分线', footCue: '回到偏正手侧的角平分线，准备下一拍' }
    ],
    stepsSummary: [
      { range: [0, 0.2], name: '1. 分腿垫步启动', badge: 'Split Step', detail: '对手挥拍触球瞬间双脚微跳分开落地，激活小腿与跟腱弹性。' },
      { range: [0.2, 0.44], name: '2. 交叉步大步横移', badge: 'Crossover Step', detail: '转髋并用左脚大步交叉跨出，迅速覆盖底线右侧空当。' },
      { range: [0.44, 0.56], name: '3. 碎步微调间距', badge: 'Adjustment Steps', detail: '接近击球点最后 1 米切高频小碎步，确保击球点在身体侧前方。' },
      { range: [0.56, 0.7], name: '4. 开放式制动击球', badge: 'Open Stance Load', detail: '右脚踩死制动形成支撑轴，自下而上蹬地转体发力。' },
      { range: [0.7, 1], name: '5. 蹬地侧滑步回位', badge: 'Recovery Shuffle', detail: '随挥同时右脚外蹬，保持面向球网滑步回位。' }
    ]
  },
  {
    id: 'serve_volley',
    shortName: '上网截击战术',
    title: '场景二：随球上网截击',
    zone: '过渡区 → 网前区',
    tag: '进攻压迫 · 节奏转换',
    desc: '底线打出深球压迫后顺势上网。快速冲过「无人区」，在对手即将触球前于发球线附近完成行进间分腿垫步急停，随后斜向前跨步封堵截击。',
    coachTip: '上网途中不能一味往前冲。必须在对手触球瞬间提前在发球线前后做急停分腿垫步，否则容易被对手打脚下球或变线穿越。',
    duration: 6.5,
    ball: {
      start: { x: 1.5, y: 11.2 },
      bounce: { x: -2.8, y: -11.2 },
      hit: { x: -1.4, y: 3.1 },
      target: { x: 2.9, y: -6.5 }
    },
    keyframes: [
      { t: 0, x: 1.2, y: 11.5, facing: -Math.PI / 2, stepType: 'hit', label: '底线随球进攻', footCue: '击出深球后重心顺势前压迈步' },
      { t: 0.25, x: 0.3, y: 7.6, facing: -Math.PI / 2, stepType: 'sprint', label: '快速穿越无人区', footCue: '前脚掌高速前冲跑，迅速缩短网前距离' },
      { t: 0.45, x: -0.3, y: 5.5, facing: -Math.PI / 2, stepType: 'split', label: '网前分腿急停', footCue: '对手触球瞬间双脚宽距落地，刹住前冲惯性' },
      { t: 0.65, x: -1.1, y: 3.6, facing: -1.9, stepType: 'crossover', label: '斜向前交叉跨步', footCue: '45° 斜向前交叉迈步，主动迎球封堵角度' },
      { t: 0.78, x: -1.3, y: 3.2, facing: -2, stepType: 'hit', label: '前跨步截击', footCue: '右脚前跨落地同时完成高位截击' },
      { t: 1, x: -0.5, y: 2.8, facing: -Math.PI / 2, stepType: 'shuffle', label: '网前小幅补位', footCue: '碎步调整至球网中央，准备封堵下一拍' }
    ],
    stepsSummary: [
      { range: [0, 0.16], name: '1. 随球顺势前压', badge: 'Follow Through', detail: '击出进攻性深球后，利用随挥惯性直接迈出第一步向前推进。' },
      { range: [0.16, 0.38], name: '2. 高速前冲通过过渡区', badge: 'Forward Sprint', detail: '大步幅快速前冲，尽快脱离底线与发球线之间的危险无人区。' },
      { range: [0.38, 0.56], name: '3. 行进间分腿急停', badge: 'Approach Split', detail: '对手击球瞬间双脚微跳宽距着地，把向前冲力转成多向爆发力。' },
      { range: [0.56, 0.82], name: '4. 45° 斜向前跨步截击', badge: '45° Lunge Step', detail: '不是纯左右横移，而是斜向前方跨步迎球，压缩对手穿越角度。' },
      { range: [0.82, 1], name: '5. 碎步封网补位', badge: 'Net Recovery', detail: '截击后迅速收脚，碎步回到球网中路偏球路一侧保持警戒。' }
    ]
  },
  {
    id: 'drop_shot_chase',
    shortName: '追击网前小球',
    title: '场景三：追击小球（短球防守）',
    zone: '底线 → 网前极限冲刺',
    tag: '爆发冲刺 · 制动控制',
    desc: '应对对手突然放出的网前小球。分腿垫步后立刻转为全速直线冲刺，接近来球时用高频刹车碎步降重心减速，挑高球或回放小球后迅速后撤回防。',
    coachTip: '追小球最怕跑到球前刹不住车，结果撞网或击球失控。最后两米必须用高频「刹车碎步」降速并沉下重心，让球拍从球下方切入。',
    duration: 6.8,
    ball: {
      start: { x: 2.5, y: -11 },
      bounce: { x: -2.4, y: 3.6 },
      hit: { x: -2.7, y: 2.3 },
      target: { x: 2.8, y: -11.4 }
    },
    keyframes: [
      { t: 0, x: 0.4, y: 12.1, facing: -Math.PI / 2, stepType: 'ready', label: '底线防守站位', footCue: '保持膝盖微屈，警惕对手放短球' },
      { t: 0.12, x: 0.4, y: 12.1, facing: -Math.PI / 2, stepType: 'split', label: '分腿垫步识别短球', footCue: '识别对手切球动作，双脚落地瞬间前倾' },
      { t: 0.42, x: -1.6, y: 5.5, facing: -1.85, stepType: 'sprint', label: '全速爆发冲刺', footCue: '大步幅高频摆臂直线全速冲刺' },
      { t: 0.56, x: -2.5, y: 2.9, facing: -1.85, stepType: 'brake', label: '刹车碎步降速', footCue: '高频小碎步急停制动，重心极度下沉' },
      { t: 0.66, x: -2.7, y: 2.4, facing: -1.9, stepType: 'hit', label: '前跨低重心救球', footCue: '右脚前跨支撑，低重心挑出后场过顶高球' },
      { t: 1, x: -0.4, y: 9.2, facing: -Math.PI / 2, stepType: 'backpedal', label: '侧身交叉步退防', footCue: '挑出高球争取时间，快速后撤回防中场' }
    ],
    stepsSummary: [
      { range: [0, 0.18], name: '1. 垫步与重心前倾', badge: 'Split & Lean', detail: '垫步落地同时躯干迅速前倾，利用重力加速度启动第一步。' },
      { range: [0.18, 0.48], name: '2. 直线爆发全速冲刺', badge: 'Explosive Sprint', detail: '沿最短直线路径全速冲向落点，前半程全力加速。' },
      { range: [0.48, 0.6], name: '3. 高频刹车碎步制动', badge: 'Braking Steps', detail: '触球前 1.5 米改用细密小碎步减速，避免身体惯性前冲失衡。' },
      { range: [0.6, 0.72], name: '4. 低重心前跨挑高球', badge: 'Low Lunge Lob', detail: '前脚大跨步稳住重心，在球二次落地前挑出深远过顶高球。' },
      { range: [0.72, 1], name: '5. 快速后撤重新布防', badge: 'Defensive Retreat', detail: '利用挑高球的滞空时间，迅速后撤退回底线区域准备下一拍。' }
    ]
  },
  {
    id: 'overhead_retreat',
    shortName: '高压球退步扣杀',
    title: '场景四：高压球退步（应对挑高球）',
    zone: '网前 → 中后场腾空',
    tag: '侧身交叉后退 · 剪刀腿',
    desc: '网前遭遇对手过顶挑高球时，不能直接倒退跑（既慢又容易绊倒）。必须先转髋撤步，用侧向交叉步高速后退到落点后方，起跳完成高压扣杀。',
    coachTip: '绝对不要面对球网直接向后倒退跑。一定侧身（左肩对网），用侧向交叉步后退，既能看清来球又能发挥最大后退速度。',
    duration: 6.8,
    ball: {
      start: { x: -2.2, y: -11.2 },
      bounce: { x: 1.4, y: 7.4 },
      hit: { x: 1.1, y: 6.2 },
      target: { x: -3.2, y: -7.5 }
    },
    keyframes: [
      { t: 0, x: -0.5, y: 2.5, facing: -Math.PI / 2, stepType: 'ready', label: '网前警戒站位', footCue: '位于发球线前，准备截击' },
      { t: 0.14, x: -0.5, y: 2.5, facing: -0.3, stepType: 'drop', label: '垫步接转髋撤步', footCue: '识别挑高球，右脚迅速后撤转成侧身' },
      { t: 0.42, x: 0.6, y: 5.2, facing: 0, stepType: 'crossover', label: '侧向交叉步后退', footCue: '保持侧身抬头盯球，左右脚交替交叉快速后退' },
      { t: 0.56, x: 1.1, y: 6.4, facing: -0.1, stepType: 'adjust', label: '碎步绕至球后方', footCue: '小碎步微调，确保击球点在右肩前上方' },
      { t: 0.68, x: 1, y: 6.1, facing: -0.8, stepType: 'hit', label: '腾空高压扣杀', footCue: '双脚蹬地起跳，空中剪刀腿转体扣杀' },
      { t: 1, x: 0.2, y: 4.5, facing: -Math.PI / 2, stepType: 'shuffle', label: '左脚落地缓冲回位', footCue: '左脚先落地缓冲，碎步恢复网前控制' }
    ],
    stepsSummary: [
      { range: [0, 0.2], name: '1. 转髋撤步', badge: 'Drop Step', detail: '持拍手同侧脚迅速向后撤步，让身体瞬间转成侧对球网。' },
      { range: [0.2, 0.48], name: '2. 侧向交叉步高速后退', badge: 'Side Crossover', detail: '保持侧身与举拍指球，用大步幅侧向交叉步快速退到球下方。' },
      { range: [0.48, 0.6], name: '3. 碎步微调抢占球后', badge: 'Positioning Steps', detail: '退到略超过来球落点的位置，留出向前上方发力的空间。' },
      { range: [0.6, 0.74], name: '4. 蹬地起跳剪刀腿扣杀', badge: 'Overhead Smash', detail: '右脚蹬地跃起，空中转体完成高压扣杀，左脚率先落地缓冲。' },
      { range: [0.74, 1], name: '5. 落地缓冲与重心恢复', badge: 'Landing Recovery', detail: '吸收落地冲击力后迅速回正身体，准备衔接下一拍。' }
    ]
  },
  {
    id: 'deep_ball_retreat',
    shortName: '底线深球后撤',
    title: '场景五：底线深球后撤（应对强烈上旋）',
    zone: '底线 → 底线后 2 米防守区',
    tag: '后撤让出击球点 · 蓄力反击',
    desc: '对手打出又深又重的强上旋砸向底线时，不要原地硬扛上升期（容易被顶住）。垫步后迅速侧身后撤，退到球弹跳顶点后方，让出舒适击球点再转守为攻。',
    coachTip: '面对底线重炮深球，「退一步海阔天空」。先做小步后撤接侧身步退到弹跳顶点后方，才能完整挥拍打出高质量上旋反击。',
    duration: 6.5,
    ball: {
      start: { x: 1.8, y: -11.5 },
      bounce: { x: -1.6, y: 11.3 },
      hit: { x: -2.2, y: 13.1 },
      target: { x: 2.6, y: -10.5 }
    },
    keyframes: [
      { t: 0, x: -0.3, y: 11.8, facing: -Math.PI / 2, stepType: 'ready', label: '底线标准站位', footCue: '准备迎接对手底线进攻' },
      { t: 0.14, x: -0.3, y: 11.8, facing: -Math.PI / 2, stepType: 'split', label: '分腿垫步判断深度', footCue: '预判来球过深且上旋强烈，准备后撤' },
      { t: 0.36, x: -1.4, y: 12.8, facing: -2.3, stepType: 'backpedal', label: '后撤步与侧身退步', footCue: '左脚后撤转髋，快速退至底线后方让出空间' },
      { t: 0.5, x: -2, y: 13.2, facing: -2.5, stepType: 'adjust', label: '后场碎步蓄力加载', footCue: '小碎步微调反手位间距，左脚后踩蓄力' },
      { t: 0.64, x: -2.1, y: 13, facing: -2.2, stepType: 'hit', label: '后脚蹬转上旋反击', footCue: '重心由后脚向前脚转移，挥拍打出深远上旋' },
      { t: 1, x: -0.2, y: 12, facing: -Math.PI / 2, stepType: 'shuffle', label: '前压回位至底线', footCue: '随挥顺势前压，侧滑步回到核心防守位' }
    ],
    stepsSummary: [
      { range: [0, 0.18], name: '1. 垫步识别深球轨迹', badge: 'Depth Recognition', detail: '对手触球瞬间完成分腿垫步，迅速判断来球弧度与深浅。' },
      { range: [0.18, 0.42], name: '2. 撤步转髋后退', badge: 'Backpedal & Drop', detail: '外侧脚迅速向斜后方撤步，退到底线后 1.5–2 米避开追身压迫。' },
      { range: [0.42, 0.55], name: '3. 碎步微调与后腿加载', badge: 'Rear Foot Load', detail: '小碎步稳住重心，把体重充分压在后侧支撑腿上准备发力。' },
      { range: [0.55, 0.7], name: '4. 蹬地前移重炮反击', badge: 'Transfer & Hit', detail: '后脚蹬地推动重心向前，在球下落至腰部舒适高度时充分挥拍。' },
      { range: [0.7, 1], name: '5. 前压收复底线失地', badge: 'Forward Recovery', detail: '击球后利用向前惯性顺势跨回底线，重新夺回场地位置优势。' }
    ]
  }
]

/** 步型 → 颜色，2D 与 3D 共用。 */
export const STEP_STYLE = {
  ready: { name: '准备', color: '#f2fbf2' },
  split: { name: '分腿垫步', color: '#d8f34a' },
  crossover: { name: '交叉步', color: '#38bdf8' },
  adjust: { name: '碎步调整', color: '#c084fc' },
  hit: { name: '击球', color: '#34d399' },
  shuffle: { name: '侧滑步', color: '#38bdf8' },
  sprint: { name: '冲刺', color: '#fb923c' },
  brake: { name: '刹车', color: '#f43f5e' },
  backpedal: { name: '后撤步', color: '#f43f5e' },
  drop: { name: '转髋撤步', color: '#f43f5e' }
}

/** 五步闭环周期。 */
export const CYCLE_PHASES = [
  { idx: '01', name: '预判启动', en: 'Split', icon: '⚡', color: '#d8f34a', text: '对手触球瞬间双脚微跳落地，前脚掌着地，膝盖微屈降低重心，解除静止惯性。' },
  { idx: '02', name: '爆发跑动', en: 'Move', icon: '🏃', color: '#38bdf8', text: '转髋迈出第一步。远距离用交叉步或冲刺跑，中短距离用侧滑步快速抢占线路。' },
  { idx: '03', name: '碎步微调', en: 'Adjust', icon: '👣', color: '#c084fc', text: '接近来球最后 1.5 米转高频小碎步，精确校准身体与来球的横向、前后间距。' },
  { idx: '04', name: '制动击球', en: 'Load & Hit', icon: '🎾', color: '#34d399', text: '外侧腿踩实地面建立稳定底座，蹬地转髋由下而上发力。' },
  { idx: '05', name: '蹬地回位', en: 'Recover', icon: '🔄', color: '#fbbf24', text: '随挥结束同时外侧脚爆发蹬地，交叉步接侧滑步回到对手击球角度的平分线。' }
]

/** 全场三大区域。 */
export const ZONES = [
  {
    id: 'baseline',
    name: '底线防守与相持区',
    range: 'ZONE 01 · 底线及底线后',
    lead: '左右横向主导',
    color: '#60a5fa',
    desc: '球速快、变线多，移动距离最长。既要大范围覆盖，又要在击球瞬间保持下肢绝对稳定。',
    points: [
      '主用步法：分腿垫步 + 交叉步启动 + 开放式站位蹬转 + 滑步回位。',
      '战术红线：回位位置不是永远在底线中点，而是对手可能回球角度的角平分线。'
    ],
    foot: '重心：低且稳',
    rhythm: '步频：快 → 慢（蓄力）→ 快'
  },
  {
    id: 'transition',
    name: '过渡区（无人区）',
    range: 'ZONE 02 · 发球线与底线之间',
    lead: "No Man's Land",
    color: '#f43f5e',
    desc: '球场最危险的区域。对手的深球很容易直接砸到脚下，让你发不出力，只能被迫半截击。',
    points: [
      '核心铁律：绝不在此区域停留等待。要么随球快速前冲进网前，要么迅速后撤退回底线。',
      '急停分腿：上网途中当对手即将触球，必须在过渡区提前做行进间分腿垫步急停。'
    ],
    foot: '停留时间：越短越好',
    rhythm: '方向：纵向果断前压或后撤'
  },
  {
    id: 'net',
    name: '网前截击与高压区',
    range: 'ZONE 03 · 发球线至球网',
    lead: '斜向前压主导',
    color: '#34d399',
    desc: '反应时间不足 0.4 秒，没有时间做大幅度引拍和长距离跑动，讲究简练与向前封堵角度。',
    points: [
      '主用步法：宽站位分腿垫步 + 斜向前跨步 / 侧向交叉步拦截。',
      '斜向前压原则：截击移动不是纯左右横移，而是 45 度斜向前方迎球，封死对手穿越角度。'
    ],
    foot: '重心：前倾蓄势',
    rhythm: '步幅：短促、爆发力强'
  }
]

/** 六大核心步法百科。 */
export const ENCYCLOPEDIA = [
  {
    id: 'split-step',
    category: 'start',
    cnName: '分腿垫步',
    enName: 'Split Step',
    tag: '所有移动的起点',
    color: '#d8f34a',
    summary: '对手球拍触球前的瞬间，双脚小幅跳起并在触球时刻宽距落地，通过肌肉预拉伸实现多方向零延迟启动。',
    mechanics: [
      '落地宽度略宽于肩，前脚掌着地，脚后跟微微离地保持弹性。',
      '膝盖微屈、髋部下沉、上身略前倾，重心置于两脚之间。',
      '落地时机要卡在对手触球瞬间，利用跟腱牵张反射。'
    ],
    mistake: '跳得太高（对手击球后脚还在空中），或落地后双脚并拢过窄、脚跟踩死。'
  },
  {
    id: 'crossover-step',
    category: 'move',
    cnName: '交叉步',
    enName: 'Crossover Step',
    tag: '长距离覆盖',
    color: '#38bdf8',
    summary: '来球角度大、距离远时，通过髋部转动让远端脚跨过近端脚向目标方向迈出大步。是底线大范围救球和回位的第一步。',
    mechanics: [
      '顺势转髋，外侧脚爆发蹬地，内侧脚跨出大步切入跑动路线。',
      '跑动中保持头部稳定盯球，手臂自然摆动维持平衡。',
      '击球后的回位第一步同样用交叉步迅速脱离边线。'
    ],
    mistake: '上半身僵着正面朝网不愿转髋，导致交叉步迈不开、步幅过小。'
  },
  {
    id: 'shuffle-step',
    category: 'move',
    cnName: '侧滑步',
    enName: 'Shuffle Step',
    tag: '中短距离 · 回位',
    color: '#5ec8ff',
    summary: '身体正面朝向球网，双脚横向快速滑移，两脚不交叉。广泛用于中短距离微调站位和击球后的稳健回位。',
    mechanics: [
      '保持低重心，双脚维持与肩同宽或更宽的支撑面。',
      '远离移动方向的脚推地，同侧脚向目标方向滑出，避免双脚在空中碰撞。',
      '优点是随时可以急停转分腿垫步，应对对手突然变线。'
    ],
    mistake: '滑动时身体上下起伏大（像在跳），导致视线晃动、重心不稳。'
  },
  {
    id: 'adjustment-steps',
    category: 'start',
    cnName: '碎步调整',
    enName: 'Adjustment Steps',
    tag: '击球前最后 1.5 米',
    color: '#c084fc',
    summary: '大步跑动接近来球后，在击球前最后 1–1.5 米切为高频细小的脚步微调，精确校准与来球的横向和前后间距。',
    mechanics: [
      '步幅小、频率极高，脚掌快速轻点地面，让身体处于随时可制动状态。',
      '按球速和弹跳微调前后站位，确保在身体侧前方的舒适点触球。',
      '调整完的最后一小步，就是支撑腿的蓄力制动。'
    ],
    mistake: '大步跑到位置后双脚「死站」等球。球一旦有不规则旋转或深浅偏差就被挤住。'
  },
  {
    id: 'drop-backpedal',
    category: 'defense',
    cnName: '后撤步与转身退步',
    enName: 'Drop Step & Backpedal',
    tag: '应对深球与挑高球',
    color: '#f43f5e',
    summary: '针对底线深重上旋或网前过顶挑高的向后移动。短距离用后撤步，长距离高压退步必须先转髋撤步再侧身交叉后退。',
    mechanics: [
      '短距离后撤：小步后退，重心略前倾，防止向后仰倒。',
      '长距离后退：先撤持拍侧脚转成侧身，再用侧向交叉步高速后退。',
      '退步时眼睛始终锁定来球，不要低头盲跑。'
    ],
    mistake: '面对挑高球正面直接倒退跑，速度慢，还容易踩到脚跟向后摔倒。'
  },
  {
    id: 'brake-recovery',
    category: 'defense',
    cnName: '制动刹车与蹬地回位',
    enName: 'Braking & Recovery Step',
    tag: '急停变向 · 场地转换',
    color: '#fbbf24',
    summary: '高速跑动后的急停制动（硬地多用宽站位外侧脚踏步，红土可用可控滑步），以及击球完成瞬间的爆发性蹬地回位第一步。',
    mechanics: [
      '制动：外侧脚斜向切入地面，降低重心，用股四头肌与臀大肌离心收缩吸收惯性。',
      '回位第一步：随挥收拍同时，外侧支撑脚用力向外蹬地，把身体推回场地中央。',
      '回位与击球是一个连贯动作，不要等挥拍完全静止再慢慢走回去。'
    ],
    mistake: '击球后身体惯性又冲出好几步才停，白白浪费回位时间。'
  }
]

export const WIKI_FILTERS = [
  { id: 'all', name: '全部步法' },
  { id: 'start', name: '启动与调整' },
  { id: 'move', name: '高速覆盖' },
  { id: 'defense', name: '后撤与制动' }
]

export function scenarioById(id) {
  return SCENARIOS.find((item) => item.id === id) || SCENARIOS[0]
}

function ease(k) {
  // EaseInOutQuad，和原示例一致
  return k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2
}

/** 关键帧之间平滑插值出球员状态。 */
export function sampleScenario(scenario, t) {
  const kfs = scenario.keyframes
  const clamped = Math.max(0, Math.min(1, t))
  for (let i = 0; i < kfs.length - 1; i += 1) {
    const a = kfs[i]
    const b = kfs[i + 1]
    if (clamped >= a.t && clamped <= b.t) {
      const span = Math.max(1e-5, b.t - a.t)
      const lt = (clamped - a.t) / span
      const e = ease(lt)
      const nearEnd = lt >= 0.85
      return {
        x: a.x + (b.x - a.x) * e,
        y: a.y + (b.y - a.y) * e,
        facing: a.facing + (b.facing - a.facing) * e,
        stepType: nearEnd ? b.stepType : a.stepType,
        label: nearEnd ? b.label : a.label,
        footCue: nearEnd ? b.footCue : a.footCue,
        localT: lt
      }
    }
  }
  const last = kfs[kfs.length - 1]
  return { ...last, localT: 1 }
}

/** 击球关键帧的时刻。 */
export function hitTimeOf(scenario) {
  const kf = scenario.keyframes.find((k) => k.stepType === 'hit')
  return kf ? kf.t : 0.62
}

/**
 * 生成到 t 时刻为止的足印。2D canvas 和 3D 场景共用这份结果。
 * 返回 [{ x, y, foot: 'L'|'R', angle, type }]
 */
export function footprintsUpTo(scenario, t, { steps = 220 } = {}) {
  const marks = []
  let lastDist = 0
  let nextFoot = 'L'
  let prev = null
  let splitMarked = false

  for (let i = 0; i <= steps; i += 1) {
    const time = (i / steps) * Math.max(0, Math.min(1, t))
    const s = sampleScenario(scenario, time)

    if (!prev) {
      prev = { x: s.x, y: s.y }
      pushPair(marks, s.x, s.y, s.facing, 'ready', 0.24)
      continue
    }

    const dist = Math.hypot(s.x - prev.x, s.y - prev.y)
    lastDist += dist
    prev = { x: s.x, y: s.y }

    if (s.stepType === 'split') {
      if (!splitMarked && s.localT > 0.35 && s.localT < 0.6) {
        pushPair(marks, s.x, s.y, s.facing, 'split', 0.38)
        splitMarked = true
      }
      continue
    }
    splitMarked = false

    let stride = 0.65
    if (s.stepType === 'adjust' || s.stepType === 'brake') stride = 0.34
    if (s.stepType === 'crossover' || s.stepType === 'sprint') stride = 0.85

    if (lastDist >= stride) {
      lastDist = 0
      const perp = s.facing + Math.PI / 2
      const lateral = nextFoot === 'L' ? -0.22 : 0.22
      marks.push({
        x: s.x + Math.cos(perp) * lateral,
        y: s.y + Math.sin(perp) * lateral,
        foot: nextFoot,
        angle: s.facing,
        type: s.stepType
      })
      nextFoot = nextFoot === 'L' ? 'R' : 'L'
    }
  }
  return marks
}

function pushPair(marks, cx, cy, facing, type, spread) {
  const perp = facing + Math.PI / 2
  marks.push(
    { x: cx - Math.cos(perp) * spread, y: cy - Math.sin(perp) * spread, foot: 'L', angle: facing, type },
    { x: cx + Math.cos(perp) * spread, y: cy + Math.sin(perp) * spread, foot: 'R', angle: facing, type }
  )
}

/** 当前进度落在哪一段步法拆解里。 */
export function stepIndexAt(scenario, t) {
  return scenario.stepsSummary.findIndex((s) => t >= s.range[0] && t <= s.range[1])
}

/** 移动距离合计，给面板显示。 */
export function travelOf(scenario) {
  const kfs = scenario.keyframes
  let total = 0
  for (let i = 1; i < kfs.length; i += 1) {
    total += Math.hypot(kfs[i].x - kfs[i - 1].x, kfs[i].y - kfs[i - 1].y)
  }
  return total
}
