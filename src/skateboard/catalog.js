/** 模块目录：模式、动作预设、状态文案。 */

export const MODES = [
  { id: 'force', en: 'FORCE LAB', name: '受力实验室', hint: '拖动重心与倾角 · 实时受力矢量' },
  { id: 'boards', en: 'BOARD TYPES', name: '四种板型', hint: '四板等比俯视对比 · 参数即手感' },
  { id: 'tricks', en: 'TRICK LAB', name: '动作力学库', hint: 'Ollie 四阶段 · 拖时间轴逐帧看' },
  { id: 'turn', en: 'TURN & PUMP', name: '转向与泵速', hint: '桥灵敏度 · 卡宾压弯 · 陆冲推进' },
  { id: 'safety', en: 'SAFETY', name: '安全与极限', hint: '轮咬 · 漂移 · 护具' },
  { id: 'quiz', en: 'QUIZ', name: '力学挑战', hint: '判断题 · 出题自受力模型' }
]

/** 6 个动作预设（对应 2.5D 仿真的 presetGrid）。 */
export const PRESETS = [
  { id: 'neutral', icon: '🧍', name: '静止站立', comX: 0, leanY: 0, speed: 0, desc: '双桥均匀承重，重心垂线落在轴距正中' },
  { id: 'manual', icon: '⚖️', name: '翘尾 Manual', comX: -0.62, leanY: 0, speed: 14, desc: '重心越过后桥，前轮抬起' },
  { id: 'olliePrep', icon: '🚀', name: 'Ollie 蓄力', comX: -0.45, leanY: 0, speed: 12, desc: '重心后移蓄力，准备点板（完整动作见"动作力学库"）' },
  { id: 'carve', icon: '🌀', name: '深度卡宾', comX: 0.1, leanY: 0.85, speed: 26, desc: '大倾角压弯，离心力逼近抓地上限' },
  { id: 'pumping', icon: '🌊', name: '陆冲泵速', comX: 0, leanY: 0.55, speed: 16, desc: 'Rail-to-Rail 节奏压板，向前推进' },
  { id: 'wheelbite', icon: '⚠️', name: '轮咬失控', comX: 0.55, leanY: 0.92, speed: 18, desc: '大倾角 + 前承重过大 → 轮被板缘咬死' }
]

/** 六分支状态文案（沿用 2.5D 仿真的 alert 体系）。 */
export const ALERTS = {
  stable: { tone: 'ok', text: '稳定滑行 —— 重心垂线落在支撑区（两轮连线）内，双桥分担体重。' },
  manual: { tone: 'warn', text: '翘尾 Manual —— 重心越过后桥，后桥成为唯一支点，力矩把你"翘"起来。维持平衡靠微调重心，让 τ 在零附近小幅波动。' },
  nose: { tone: 'warn', text: '翘头 Nose Manual —— 重心越过前桥，前翻风险。板头方向没有支点保护，新手务必避免。' },
  'grip-limit': { tone: 'warn', text: '逼近抓地极限 —— 离心力已达抓地上限 85% 以上。再加速或再压板，轮胎将突破静摩擦。' },
  drift: { tone: 'danger', text: '漂移 Powerslide —— 离心力突破抓地上限，轮组横向滑动。这是可控的减速技术，但速度与倾角必须匹配。' },
  pumping: { tone: 'ok', text: '泵速推进 —— 左右压板让前桥偏转，身体的斜向蹬踏被分解出向前分量。能量来自腿做功。' },
  bite: { tone: 'danger', text: '⚠️ 轮咬风险 —— 大倾角 + 前承重过大，轮子被板缘卡死。现实中这意味着向前飞出，务必佩戴护具！' }
}

/** 遥测表：哪些指标在什么状态下高亮。 */
export const TELEMETRY = [
  { key: 'load', name: '承重比', unit: '', hint: '前轮 N₁ / 后轮 N₂，由重心位置按杠杆分配' },
  { key: 'pitch', name: '俯仰角', unit: '°', hint: '板面抬起角度，受板尾翘角限制' },
  { key: 'torque', name: '支点力矩', unit: 'N·m', hint: 'τ = mg·d，力臂越长翘得越高' },
  { key: 'radius', name: '转弯半径', unit: 'm', hint: 'R = WB / sin(δf − δr)' },
  { key: 'fc', name: '离心力', unit: 'N', hint: 'Fc = mv²/R，指向弯外' },
  { key: 'grip', name: '抓地余量', unit: '', hint: 'Fc / μmg，超过 100% 即漂移' },
  { key: 'pump', name: '泵速推力', unit: 'N', hint: '|sin(lean)| × 效率 × 180 N' },
  { key: 'bite', name: '轮咬风险', unit: '%', hint: '倾角 × 前承重 × 轮径间隙 × 桥回弹' }
]

/** 力学公式条（与画布矢量颜色联动）。 */
export const FORMULAS = [
  { id: 'load', color: '#22d3ee', formula: 'N₁ + N₂ = mg', note: '支撑力守恒：两根青色箭头总长始终等于黄色重力箭头' },
  { id: 'torque', color: '#c084fc', formula: 'τ = mg · d', note: '杠杆力矩：支点光圈到重心垂足的距离 d 越长，紫线越长、板翘越高' },
  { id: 'turn', color: '#38bdf8', formula: 'R = WB / sin(Δδ)', note: '桥转角差决定转弯半径，俯视图中的蓝色弧线' },
  { key: 'fc', id: 'fc', color: '#f87171', formula: 'Fc = mv²/R', note: '离心力随速度平方增长，红色箭头' },
  { id: 'grip', color: '#4ade80', formula: 'F_max = μ·m·g', note: '抓地上限：绿色弧线刻度，Fc 越过即漂移' },
  { id: 'pump', color: '#4ade80', formula: 'F_pump ≈ |sin(lean)| · η · 180 N', note: '泵速推进，陆冲效率 η 远高于双翘' }
]
