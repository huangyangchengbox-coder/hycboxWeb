/** 尺度与轨道为艺术化示意，事实字段取公开近似值。 */

export const MODES = [
  { id: 'planets', en: 'PLANETS', name: '行星世界', hint: '太阳与八大行星 · 单击选中，双击飞近' },
  { id: 'nebulae', en: 'NEBULAE', name: '星云世界', hint: '按经典轮廓绘制的星云示意' },
  { id: 'deep', en: 'DEEP SPACE', name: '深空世界', hint: '黑洞、星系与高能天体 · 视觉为近似' },
  { id: 'events', en: 'EVENTS', name: '宇宙奇观', hint: '彗星、超新星与流星 · 可暂停时间' },
  { id: 'explore', en: 'EXPLORATION', name: '太空探索', hint: '空间站、旅行者与火星车示意' },
  { id: 'exo', en: 'ALIEN WORLDS', name: '外星世界', hint: '系外行星类型示意，并非实拍地貌' }
]

const artistic = '三维距离与大小为示意，不是真实比例。'

export const COSMIC_OBJECTS = [
  {
    id: 'sun', mode: 'planets', name: '太阳', nameEn: 'Sun', kind: '恒星',
    summary: '太阳系中心的 G 型主序星，八大行星绕它公转。',
    facts: [['分类', 'G2V 恒星'], ['半径', '约 69.6 万 km'], ['表面温度', '约 5500 °C'], ['说明', artistic]],
    radius: 3.2, color: '#ffd27a', emissive: '#ffb020', emissiveIntensity: 1.2, glow: 8, light: 4,
    spin: 0.05
  },
  {
    id: 'mercury', mode: 'planets', name: '水星', nameEn: 'Mercury', kind: '类地行星',
    summary: '最靠近太阳的行星，几乎没有大气，昼夜温差极大。',
    facts: [['与太阳距离', '约 0.39 AU'], ['半径', '约 2440 km'], ['表面', '陨石坑密布'], ['说明', artistic]],
    radius: 0.38, color: '#c4b8a8', orbit: 8, orbitSpeed: 0.42, phase: 0.4, spin: 0.15
  },
  {
    id: 'venus', mode: 'planets', name: '金星', nameEn: 'Venus', kind: '类地行星',
    summary: '浓厚二氧化碳大气造成极端温室效应。',
    facts: [['与太阳距离', '约 0.72 AU'], ['半径', '约 6052 km'], ['表面温度', '约 460 °C'], ['说明', artistic]],
    radius: 0.72, color: '#e6d2a2', orbit: 11.2, orbitSpeed: 0.28, phase: 1.2, spin: 0.04, atmosphere: '#f0d8a0'
  },
  {
    id: 'earth', mode: 'planets', name: '地球', nameEn: 'Earth', kind: '类地行星',
    summary: '目前已知唯一存在生命的行星。可进入经典地球页面近观。',
    facts: [['与太阳距离', '1 AU'], ['半径', '约 6371 km'], ['卫星', '月球'], ['说明', artistic]],
    radius: 0.78, color: '#2f6fbe', orbit: 15, orbitSpeed: 0.2, phase: 2.1, spin: 0.35, texture: 'earth', atmosphere: '#8ec8ff', classic: true
  },
  {
    id: 'moon', mode: 'planets', name: '月球', nameEn: 'Moon', kind: '卫星',
    summary: '地球唯一的天然卫星。近观月表可从经典地球页进入。',
    facts: [['与地球距离', '约 38.4 万 km'], ['半径', '约 1737 km'], ['说明', artistic]],
    radius: 0.22, color: '#d5d2cc', parent: 'earth', orbit: 1.7, orbitSpeed: 1.1, phase: 0.6, spin: 0.2, texture: 'moon', classic: true
  },
  {
    id: 'mars', mode: 'planets', name: '火星', nameEn: 'Mars', kind: '类地行星',
    summary: '红色来自表面铁氧化物，有奥林帕斯山等巨型火山。',
    facts: [['与太阳距离', '约 1.52 AU'], ['半径', '约 3390 km'], ['卫星', '火卫一、火卫二'], ['说明', artistic]],
    radius: 0.55, color: '#c4552a', orbit: 19.2, orbitSpeed: 0.15, phase: 3.4, spin: 0.32, texture: 'mars'
  },
  {
    id: 'jupiter', mode: 'planets', name: '木星', nameEn: 'Jupiter', kind: '气态巨行星',
    summary: '太阳系最大行星，云带与大红斑是最显著的特征。',
    facts: [['与太阳距离', '约 5.2 AU'], ['半径', '约 6.99 万 km'], ['云顶温度', '约 -110 °C'], ['说明', artistic]],
    radius: 1.7, color: '#d9b48a', orbit: 26, orbitSpeed: 0.08, phase: 0.9, spin: 0.7, texture: 'jupiter'
  },
  {
    id: 'saturn', mode: 'planets', name: '土星', nameEn: 'Saturn', kind: '气态巨行星',
    summary: '以宽阔的冰岩环系统著称。',
    facts: [['与太阳距离', '约 9.5 AU'], ['半径', '约 5.82 万 km'], ['特征', '行星环'], ['说明', artistic]],
    radius: 1.45, color: '#ead7a6', orbit: 33.5, orbitSpeed: 0.055, phase: 4.2, spin: 0.6, texture: 'saturn', ring: true
  },
  {
    id: 'uranus', mode: 'planets', name: '天王星', nameEn: 'Uranus', kind: '冰巨行星',
    summary: '自转轴几乎躺在公转轨道面上，呈青绿色。',
    facts: [['与太阳距离', '约 19.2 AU'], ['半径', '约 2.54 万 km'], ['说明', artistic]],
    radius: 1.05, color: '#9ee7e0', orbit: 41, orbitSpeed: 0.035, phase: 1.7, spin: 0.3, tilt: 1.4
  },
  {
    id: 'neptune', mode: 'planets', name: '海王星', nameEn: 'Neptune', kind: '冰巨行星',
    summary: '太阳系最外侧的大行星，大气中有高速风暴。',
    facts: [['与太阳距离', '约 30 AU'], ['半径', '约 2.46 万 km'], ['说明', artistic]],
    radius: 1.02, color: '#3d5bff', orbit: 48.5, orbitSpeed: 0.026, phase: 5.1, spin: 0.32
  },

  {
    id: 'm42', mode: 'nebulae', name: '猎户座大星云', nameEn: 'M42', kind: '发射星云',
    summary: '猎户座中最亮的恒星形成区，中心有四合星。',
    facts: [['距离', '约 1344 光年'], ['外形', '亮核与不对称双翼'], ['说明', '轮廓为示意，不是照片']],
    radius: 2.4, nebula: 'm42', position: [-10, 1, 4], aspect: 1.22
  },
  {
    id: 'm16', mode: 'nebulae', name: '创生之柱', nameEn: 'M16', kind: '鹰状星云',
    summary: '鹰状星云中的气体尘埃柱，新恒星在柱尖形成。',
    facts: [['距离', '约 7000 光年'], ['外形', '三根暗柱'], ['说明', '轮廓为示意，不是照片']],
    radius: 2.2, nebula: 'm16', position: [-2, -1, -8], aspect: 0.7
  },
  {
    id: 'horse', mode: 'nebulae', name: '马头星云', nameEn: 'Barnard 33', kind: '暗星云',
    summary: '猎户座里一块马头形的暗尘埃，衬在发射星云前。',
    facts: [['距离', '约 1375 光年'], ['外形', '马头剪影'], ['说明', '轮廓为示意，不是照片']],
    radius: 2.1, nebula: 'horse', position: [8, 2, 2], aspect: 0.82
  },
  {
    id: 'm57', mode: 'nebulae', name: '环状星云', nameEn: 'M57', kind: '行星状星云',
    summary: '天琴座中的行星状星云，看起来像一枚烟圈。',
    facts: [['距离', '约 2300 光年'], ['外形', '椭圆环'], ['说明', '轮廓为示意，不是照片']],
    radius: 1.8, nebula: 'm57', position: [14, -1, -6], aspect: 1
  },
  {
    id: 'butterfly', mode: 'nebulae', name: '蝴蝶星云', nameEn: 'NGC 6302', kind: '行星状星云',
    summary: '双极喷流形成的翅膀状行星状星云。',
    facts: [['距离', '约 3400 光年'], ['外形', '双极翼'], ['说明', '轮廓为示意，不是照片']],
    radius: 2.3, nebula: 'butterfly', position: [-14, 0, -4], aspect: 1.55
  },
  {
    id: 'catseye', mode: 'nebulae', name: '猫眼星云', nameEn: 'NGC 6543', kind: '行星状星云',
    summary: '多层同心环结构，中心像一只眼睛。',
    facts: [['距离', '约 3300 光年'], ['外形', '同心环'], ['说明', '轮廓为示意，不是照片']],
    radius: 1.7, nebula: 'catseye', position: [4, 3, 10], aspect: 1
  },
  {
    id: 'm1', mode: 'nebulae', name: '蟹状星云', nameEn: 'M1', kind: '超新星遗迹',
    summary: '1054 年超新星留下的遗迹，中心有脉冲星。',
    facts: [['距离', '约 6500 光年'], ['外形', '纤维状'], ['说明', '轮廓为示意，不是照片']],
    radius: 2, nebula: 'm1', position: [12, -2, 8], aspect: 1.05
  },

  {
    id: 'bh', mode: 'deep', name: '恒星级黑洞', nameEn: 'Black Hole', kind: '黑洞',
    summary: '吸积盘与暗核为艺术化近似，不是对引力透镜的严格模拟。',
    facts: [['类型', '示意黑洞'], ['可见结构', '事件视界、吸积盘'], ['说明', '物理现象与视觉近似已区分']],
    radius: 1.1, color: '#000000', position: [0, 0, 0], blackhole: true
  },
  {
    id: 'mw', mode: 'deep', name: '银河系', nameEn: 'Milky Way', kind: '棒旋星系',
    summary: '我们所在的星系。旋臂为结构示意，不是实测星图。',
    facts: [['类型', '棒旋星系'], ['直径', '约 10 万光年'], ['说明', '旋臂为示意结构']],
    radius: 6, position: [-16, 0, 6], galaxy: 'mw'
  },
  {
    id: 'm31', mode: 'deep', name: '仙女座星系', nameEn: 'Andromeda', kind: '螺旋星系',
    summary: '距离银河系最近的大型星系，正在与银河系靠近。',
    facts: [['距离', '约 250 万光年'], ['类型', '螺旋星系'], ['说明', '形态为示意']],
    radius: 5, position: [16, 1, -4], galaxy: 'm31', color: '#c5d4ff'
  },
  {
    id: 'pulsar', mode: 'deep', name: '脉冲星', nameEn: 'Pulsar', kind: '中子星',
    summary: '快速自转的中子星，磁极方向扫过时形成脉冲。',
    facts: [['类型', '中子星'], ['表现', '周期性射电脉冲'], ['说明', artistic]],
    radius: 0.35, color: '#d7ecff', emissive: '#9fd0ff', emissiveIntensity: 1, position: [6, 2, 12], spin: 2.4, glow: 1.4
  },
  {
    id: 'quasar', mode: 'deep', name: '类星体', nameEn: 'Quasar', kind: '活动星系核',
    summary: '遥远星系中心超大质量黑洞吸积时放出的强烈辐射。',
    facts: [['类型', '活动星系核'], ['说明', '亮度与喷流为示意']],
    radius: 0.45, color: '#ffe1a8', emissive: '#ffbf66', emissiveIntensity: 1, position: [-6, -1, -12], glow: 2.2
  },

  {
    id: 'comet', mode: 'events', name: '彗星', nameEn: 'Comet', kind: '彗星',
    summary: '冰尘天体靠近太阳时升华出彗发和彗尾。彗尾示意背向太阳。',
    facts: [['结构', '彗核、彗发、彗尾'], ['说明', '轨道与尾迹为艺术化动画']],
    radius: 0.28, color: '#f4f7ff', comet: true, orbit: 7.5, orbitSpeed: 0.32, phase: 0.8
  },
  {
    id: 'supernova', mode: 'events', name: '超新星', nameEn: 'Supernova', kind: '恒星爆发',
    summary: '大质量恒星核心坍缩后的爆发。可播放膨胀与冲击波。',
    facts: [['过程', '膨胀、冲击波、遗迹'], ['说明', '时间轴为教学示意，不是实时模拟']],
    radius: 0.8, color: '#ffd0a0', position: [-6, 0, 0], supernova: true
  },
  {
    id: 'meteors', mode: 'events', name: '流星雨', nameEn: 'Meteor Shower', kind: '流星',
    summary: '彗星留下的尘埃进入大气时划出的光迹。此处为深空粒子示意。',
    facts: [['成因', '尘埃体高速进入大气'], ['说明', artistic]],
    radius: 0.2, color: '#fff6d8', position: [8, 2, 4], meteors: true
  },

  {
    id: 'explore-earth', mode: 'explore', name: '近地轨道', nameEn: 'Low Earth Orbit', kind: '地球',
    summary: '空间站所在的近地区域示意。完整地球见经典地球页。',
    facts: [['关联', '国际空间站'], ['说明', artistic]],
    radius: 1.15, color: '#2f6fbe', position: [-6, 0, 0], texture: 'earth', atmosphere: '#8ec8ff', classic: true
  },
  {
    id: 'iss', mode: 'explore', name: '国际空间站', nameEn: 'ISS', kind: '载人航天',
    summary: '近地轨道上的国际合作空间站，约 90 分钟绕地球一圈。',
    facts: [['轨道', '近地轨道'], ['周期', '约 90 分钟'], ['说明', '模型为简化示意']],
    radius: 0.22, color: '#e8eef8', parent: 'explore-earth', orbit: 2.15, orbitSpeed: 0.9, phase: 0.2, craft: 'iss'
  },
  {
    id: 'perseverance', mode: 'explore', name: '毅力号', nameEn: 'Perseverance', kind: '火星车',
    summary: 'NASA 火星车，在杰泽罗撞击坑寻找古代生命痕迹。',
    facts: [['任务', '火星 2020'], ['着陆', '杰泽罗撞击坑'], ['说明', '车体为示意方块']],
    radius: 0.18, color: '#d7d2c8', position: [5.2, 0.7, 0.4], craft: 'rover'
  },
  {
    id: 'explore-mars', mode: 'explore', name: '火星表面', nameEn: 'Mars', kind: '行星',
    summary: '毅力号工作的火星示意球体。',
    facts: [['探测器', '毅力号'], ['说明', artistic]],
    radius: 1.05, color: '#c4552a', position: [6, 0, 0], texture: 'mars'
  },
  {
    id: 'voyager', mode: 'explore', name: '旅行者一号', nameEn: 'Voyager 1', kind: '深空探测器',
    summary: '1977 年发射，已进入星际空间，仍在传回信号。',
    facts: [['发射', '1977'], ['状态', '星际空间'], ['说明', '轨道为飞越示意']],
    radius: 0.16, color: '#f0f3f8', position: [0, 1, 14], craft: 'probe', drift: true
  },

  {
    id: 'kepler442b', mode: 'exo', name: '开普勒-442b', nameEn: 'Kepler-442b', kind: '超级地球',
    summary: '位于宜居带附近的超级地球候选体，地貌为想象示意。',
    facts: [['类型', '超级地球'], ['宿主星', '开普勒-442'], ['说明', '表面为艺术化，不是实测']],
    radius: 1.15, color: '#3f8f6a', position: [-9, 0, 0], texture: 'earth'
  },
  {
    id: 'lava', mode: 'exo', name: '熔岩行星', nameEn: 'Lava World', kind: '熔岩行星',
    summary: '以 55 Cancri e 一类近星行星为原型的熔岩世界示意。',
    facts: [['参考', '55 Cancri e'], ['表面', '可能有熔岩'], ['说明', '地貌为想象']],
    radius: 0.9, color: '#ff6a2a', emissive: '#ff3b00', emissiveIntensity: 0.45, position: [-3, 0, 2]
  },
  {
    id: 'ice', mode: 'exo', name: '冰封星球', nameEn: 'Ice World', kind: '冰行星',
    summary: '全球被冰覆盖的寒冷行星示意。',
    facts: [['表面', '冰壳'], ['说明', '地貌为想象']],
    radius: 1, color: '#d5f3ff', position: [3, 0.4, -1], texture: 'ice'
  },
  {
    id: 'ocean', mode: 'exo', name: '海洋星球', nameEn: 'Ocean World', kind: '海洋行星',
    summary: '以 K2-18b 一类可能富含水的行星为灵感的海洋世界。',
    facts: [['参考', 'K2-18b'], ['表面', '深色海洋与云'], ['说明', '地貌为想象']],
    radius: 1.2, color: '#14506e', position: [9, -0.2, 1], texture: 'ocean', atmosphere: '#b7e4ff'
  }
]

export function objectsIn(mode) {
  return COSMIC_OBJECTS.filter((item) => item.mode === mode)
}

export function findObject(id) {
  return COSMIC_OBJECTS.find((item) => item.id === id) || null
}
