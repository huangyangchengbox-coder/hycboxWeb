/**
 * 运动数学实验室 · 公式与教学数据。
 * 公式用 HTML sub/sup 渲染；变量说明逐条对应。
 * 所有物理系数为教学示意口径，界面会标注。
 */

export const THEMES = [
  {
    id: 'shot',
    name: '投篮抛体',
    en: 'PROJECTILE',
    icon: '🏀',
    hint: '速度、角度、出手高度 → 抛物线与命中窗口',
    formulas: [
      {
        html: 'x(t) = v<sub>0</sub>cos θ · t',
        caption: '水平方向匀速（忽略空气阻力）',
        vars: [['v₀', '出手速度 (m/s)'], ['θ', '出手角度'], ['t', '飞行时间 (s)']]
      },
      {
        html: 'y(t) = h<sub>0</sub> + v<sub>0</sub>sin θ · t − ½g t<sup>2</sup>',
        caption: '竖直方向匀加速：重力一直在往回拉',
        vars: [['h₀', '出手高度 (m)'], ['g', '9.81 m/s²']]
      },
      {
        html: 'x<sub>hit</sub> = (v<sub>0</sub>cos θ / g)(v<sub>0</sub>sin θ + √(v<sub>0</sub><sup>2</sup>sin<sup>2</sup>θ + 2g·(h<sub>0</sub> − h<sub>rim</sub>)))',
        caption: '球下落到筐口平面时的水平距离——就是“飞多远才落筐”',
        vars: [['h_rim', '篮筐高度 3.05 m']]
      },
      {
        html: 'θ* ≈ 45° + ½·arctan(h<sub>0</sub>−h<sub>rim</sub> / d)',
        caption: '从更高处投更远的目标，最佳角会略高于 45°；同一角度下，速度有个“容错区间”，这就是命中窗口',
        vars: [['d', '出手点到筐心的水平距离']]
      }
    ],
    text: '罚球线到筐心约 4.2 m，出手高约 2.0 m。职业投手实际出手角多在 50°–55°：入筐窗口（球心能落入筐口的容差）最大，速度误差的惩罚最小。拖动速度与角度，右下的平面图会画出整族轨迹和落筐区间。',
    note: '忽略空气阻力和球的后旋（后旋会让碰筐的球更“友好”地弹向筐内）。'
  },
  {
    id: 'curve',
    name: '任意球弧线',
    en: 'MAGNUS',
    icon: '⚽',
    hint: '马格努斯力让球在空中画弧绕过人墙',
    formulas: [
      {
        html: 'F<sub>M</sub> = S (ω × v)',
        caption: '旋转的球带动周围空气不对称流动，产生垂直于速度的侧向力',
        vars: [['ω', '旋转角速度矢量'], ['S', '升力系数（示意）'], ['v', '球速']]
      },
      {
        html: 'a<sub>侧</sub> = F<sub>M</sub> / m',
        caption: '侧向加速度正比于 转速 × 速度：转得越快、飞得越快，弯得越狠',
        vars: [['m', '球的质量 0.43 kg']]
      },
      {
        html: 'y<sub>偏</sub> ≈ ½ a<sub>侧</sub> t<sup>2</sup>',
        caption: '飞行时间越长，偏移按平方放大——所以弧线球“越飞越歪”',
        vars: [['t', '已飞行时间']]
      }
    ],
    text: '任意球主罚点距球门 25 m，人墙按规则退 9.15 m。无旋转的球要么打人墙要么打飞；带上足够侧旋，球可以先绕出人墙外侧、再弯回门框内。拖动转速看弯多少。',
    note: '马格努斯系数 S 取示意值（真实值与转速、表面纹理、雷诺数都有关）；同时计入了线性空气阻力。'
  },
  {
    id: 'sprint',
    name: '百米分段',
    en: 'SPRINT SPLITS',
    icon: '🏃',
    hint: '平均速度 vs 瞬时速度，加速度怎么看',
    formulas: [
      {
        html: 'v̄ = d / t',
        caption: '平均速度：整段距离除以整段时间。9.58 s 跑完 100 m → 10.44 m/s',
        vars: [['d', '距离'], ['t', '总时间']]
      },
      {
        html: 'a = Δv / Δt',
        caption: '加速度看 v-t 曲线的斜率：起跑段最陡（4 m/s² 量级），到最高速后斜率归零',
        vars: [['Δv', '速度变化'], ['Δt', '时间变化']]
      },
      {
        html: 't<sub>总</sub> = t<sub>反应</sub> + Σ (d<sub>i</sub> / v<sub>i</sub>)',
        caption: '总成绩里藏着 0.15 s 左右的反应时间——它不算进任何一段跑动里',
        vars: [['t反应', '枪响到起跑的延迟']]
      }
    ],
    text: '右侧 v-t 曲线用博尔特 2009 柏林 9.58 s 的公开分段研究（示意口径）绘制：最高速度出现在 60–80 m 段（约 12 m/s），最后 20 m 是轻微的降速段——不是“冲刺更快”，而是疲劳让速度守不住。',
    note: '分段数据为公开研究的示意口径，非逐帧实测。'
  },
  {
    id: 'heart',
    name: '心率区间',
    en: 'HEART ZONES',
    icon: '❤️',
    hint: '训练强度怎么用数学划定',
    formulas: [
      {
        html: 'HR<sub>max</sub> ≈ 220 − 年龄',
        caption: '最常用的经验公式——个体差异很大（±12 次），只做起点',
        vars: [['HRmax', '最大心率估计']]
      },
      {
        html: 'THR = HRR × 强度% + RHR',
        caption: 'Karvonen 公式：用“储备心率”把静息心率算进去，更贴近个人',
        vars: [['HRR', '= HRmax − RHR（储备）'], ['RHR', '静息心率'], ['THR', '目标心率']]
      },
      {
        html: 'W×T = 训练负荷',
        caption: '负荷不只是强度：训练量 = 强度 × 时间。急升负荷是受伤的头号数学信号',
        vars: [['T', '持续时间']]
      }
    ],
    text: '五个训练区间是百分比的乘法：Z2 燃脂（60–70% 储备心率）讲究“能说完整句子”，Z4 阈值（80–90%）是乳酸拐点附近的节奏。拖动年龄与静息心率，看每个区间的目标心率带。',
    note: '220−年龄 误差可达 ±12 次/分；慢病患者、服药人群请以医嘱为准，本页不构成训练建议。'
  },
  {
    id: 'theory',
    name: '力学详解',
    en: 'DEEP DIVE',
    icon: '🧪',
    hint: '马格努斯力、阻力、牛顿第二定律——五项运动的完整力学推导',
    formulas: [
      {
        html: 'F⃗_M = ½ ρ A C_L v² · (ω⃗ × v⃗) / |ω⃗ × v⃗|',
        caption: '马格努斯力的升力系数形式与完整矢量表达：大小 = ½ρAC_Lv²，方向沿 ω×v（垂直于旋转轴与速度所成的平面）',
        vars: [['C_L', '升力系数（随转速参数变化）'], ['A = πR²', '迎风截面积']]
      },
      {
        html: 'm·dv⃗/dt = F⃗_g + F⃗_D + F⃗_M',
        caption: '牛顿第二定律的三力形式：重力 F_g = mg、空气阻力 F_D = −½ρC_DAv·v⃗、马格努斯力，三项相加积分即得三维飞行轨迹',
        vars: [['C_D', '阻力系数']]
      },
      {
        html: 'Δy = ½ a_y t²，a_y = F_M,y / m',
        caption: '侧向偏移的简化模型：侧向力近似恒定时，偏移随飞行时间平方增长——飞得越久歪得越明显',
        vars: [['t', '已飞行时间']]
      }
    ],
    text: '选择一项运动，右侧给出它的完整力学推导：分阶段公式、真实参数表、以及“空中偏转 vs 落地弹跳”这类关键区别。3D 受力分解台按公式实时计算三个力的矢量长度，拖动球速与转速看力怎么变。',
    note: '公式为标准空气动力学形式；C_L、C_D 与功率参数为教学示意口径，界面逐处标注。'
  }
]

/** 100m 分段示意数据（口径：柏林 2009 公开分段研究）。 */
export const SPRINT_SPLITS = [
  { from: 0, to: 10, v: 5.30 },
  { from: 10, to: 20, v: 10.20 },
  { from: 20, to: 30, v: 11.10 },
  { from: 30, to: 40, v: 11.60 },
  { from: 40, to: 50, v: 11.90 },
  { from: 50, to: 60, v: 12.10 },
  { from: 60, to: 70, v: 12.30 },
  { from: 70, to: 80, v: 12.20 },
  { from: 80, to: 90, v: 11.95 },
  { from: 90, to: 100, v: 11.70 }
]

/** 五个训练区间。强度为 Karvonen 储备心率百分比。 */
export const HEART_ZONES = [
  { id: 'z1', name: 'Z1 恢复', lo: 0.50, hi: 0.60, color: '#7dffe8', desc: '热身与恢复走，几乎不喘' },
  { id: 'z2', name: 'Z2 燃脂', lo: 0.60, hi: 0.70, color: '#7cf2b0', desc: '能说完整句子的有氧底座' },
  { id: 'z3', name: 'Z3 有氧', lo: 0.70, hi: 0.80, color: '#ffd166', desc: ' tempo 前的节奏，句子开始断' },
  { id: 'z4', name: 'Z4 阈值', lo: 0.80, hi: 0.90, color: '#ff9f4a', desc: '乳酸拐点附近，只能蹦短语' },
  { id: 'z5', name: 'Z5 无氧', lo: 0.90, hi: 1.00, color: '#ff5d86', desc: '冲刺区间，几秒到几十秒' }
]

/** 篮球场景常量（真实规格）。 */
export const SHOT_CONST = {
  rimHeight: 3.05,
  rimRadius: 0.2286,
  ballRadius: 0.12,
  freeThrowDist: 4.225,
  threeDist: 6.75,
  g: 9.81
}

/** 足球场景常量。 */
export const CURVE_CONST = {
  goalDist: 25,
  wallDist: 9.15,
  wallHeight: 1.82,
  wallWidth: 1.1,
  goalWidth: 7.32,
  goalHeight: 2.44,
  ballMass: 0.43,
  dragK: 0.008,
  magnusS: 0.0029
}

/** 从分段速度表计算累计时间与瞬时速度点。 */
export function sprintProfile() {
  let t = 0.146 // 反应时间
  const points = [{ d: 0, t: 0, v: 0 }]
  const marks = []
  for (const seg of SPRINT_SPLITS) {
    const dt = (seg.to - seg.from) / seg.v
    marks.push({ from: seg.from, to: seg.to, v: seg.v, tStart: t, tEnd: t + dt })
    points.push({ d: seg.to, t: t + dt, v: seg.v })
    t += dt
  }
  return { totalTime: t, marks, points }
}
