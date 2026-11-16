/**
 * 网球规格、类型与品牌数据。
 * 尺寸/质量/弹跳/变形都取 ITF 标准（Type 2 常规球）。
 */

export const ITF_SPEC = {
  diameter: [6.54, 6.68], // cm
  mass: [56.0, 59.4], // g
  rebound: [135, 147], // cm，从 254 cm 落到混凝土地面
  deformForward: [0.56, 0.74], // cm，8.165 kg 载荷
  deformSide: [0.80, 1.08],
  dropHeight: 254
}

/** 球的类型。 */
export const BALL_TYPES = [
  {
    id: 'pressurized',
    name: '有压球',
    en: 'Pressurized',
    color: '#d8f34a',
    accent: 0xd8f34a,
    seam: 0xf7ffe6,
    felt: 0xd9ff2e,
    tag: '罐装 · 比赛用',
    desc: '中空橡胶内胆充入约 0.8–0.9 bar 超压气体，靠气压回弹。出厂密封在加压铁罐里，开罐后气压缓慢泄漏，2 至 4 周内手感开始变"死"。',
    pros: '弹性充沛、手感清脆、击球反馈好，是巡回赛与俱乐部的标准用球。',
    cons: '寿命短。开罐即开始衰减，打两三次后弹跳明显下降。',
    core: 'hollow',
    pressure: '约 0.8–0.9 bar 超压',
    life: '开封后约 2–4 周',
    rebound: 145,
    seamColor: 0xf8ffe8
  },
  {
    id: 'pressureless',
    name: '无压球',
    en: 'Pressureless',
    color: '#5ec8ff',
    accent: 0x5ec8ff,
    seam: 0xdff2ff,
    felt: 0xbfe066,
    tag: '厚壁 · 训练用',
    desc: '不加压，靠橡胶壳本身的厚度与材质回弹。壁更厚、更硬，因此弹跳几乎不随时间衰减，常被用作发球机球与训练球。',
    pros: '寿命长，一桶能用很久；弹跳稳定，适合发球机和多球训练。',
    cons: '手感偏硬、声音闷，高速击球时"发飘"感更明显，不适合正式比赛。',
    core: 'solid',
    pressure: '无超压',
    life: '数月到一年',
    rebound: 138,
    felt: 0xc8e06a,
    seamColor: 0xeaf6ff
  },
  {
    id: 'transition',
    name: '过渡球',
    en: 'Transition / Stage',
    color: '#ff8a4c',
    accent: 0xff8a4c,
    seam: 0xffe8d8,
    felt: 0xffb46b,
    tag: '青少年教学 · 红橙绿',
    desc: 'ITF Play & Stay 体系把球按速度分三级：红球最慢最大（约慢 75%）、橙球中速（约慢 50%）、绿球接近常规（约慢 25%）。球速降低让孩子有时间完成完整挥拍。',
    pros: '降低球速与弹跳高度，让初学者能在合适高度击球，技术动作更容易成型。',
    cons: '只用于教学进阶，不用于正式比赛。',
    core: 'hollow',
    pressure: '低压',
    life: '约 1–2 个月',
    rebound: 110,
    felt: 0xffc078,
    seamColor: 0xfff0e0
  },
  {
    id: 'highaltitude',
    name: '高原球',
    en: 'High Altitude',
    color: '#c5a3ff',
    accent: 0xc5a3ff,
    seam: 0xece0ff,
    felt: 0xd6c8ff,
    tag: '高海拔 · 低气压',
    desc: '海拔 1200 m 以上空气稀薄，常规球飞行阻力小、速度更快、弧线更平。高原球用更软的内胆与更厚的毡面来补偿，让飞行时间回到接近海平面的水平。',
    pros: '在高海拔场地恢复正常弹道，避免球"飞得又快又远"。',
    cons: '只适用于高原，低海拔用会明显发闷。',
    core: 'hollow',
    pressure: '较低超压',
    life: '开封后约 2–4 周',
    rebound: 132,
    felt: 0xd8ccff,
    seamColor: 0xf4eeff
  }
]

/** 毡面类型，对应不同场地的磨损与滑动。 */
export const FELTS = [
  { id: 'extra-duty', name: '超耐用毡', note: '硬地首选，绒毛密实、耐磨，使用寿命最长' },
  { id: 'regular', name: '常规毡', note: '硬地 / 室内通用，速度与磨损平衡' },
  { id: 'clay', name: '红土毡', note: '绒毛更松、更易吸附红土，落地后球速衰减明显' },
  { id: 'grass', name: '草地毡', note: '绒毛紧实低矮，弹跳低平、球滑行快，需配加压球' }
]

/** 大满贯官方用球 + 主流品牌。 */
export const BRANDS = [
  {
    id: 'wilson',
    name: 'Wilson',
    cn: '威尔胜',
    accent: 0xff3b30,
    hex: '#ff3b30',
    felt: 0xd9ff2e,
    model: 'US Open',
    event: '美网官方用球',
    note: '美网自 1979 年起使用 Wilson，常规毡面偏硬，硬地上速度中等偏快。'
  },
  {
    id: 'dunlop',
    name: 'Dunlop',
    cn: '邓禄普',
    accent: 0xffb800,
    hex: '#ffb800',
    felt: 0xd9ff2e,
    model: 'Australian Open',
    event: '澳网官方用球',
    note: '澳网用球毡面相对厚实，室内硬地上飞行稳定，是 ATP 巡回赛常见选择。'
  },
  {
    id: 'babolat',
    name: 'Babolat',
    cn: '百保力',
    accent: 0x5ec8ff,
    hex: '#5ec8ff',
    felt: 0xd4f24a,
    model: 'Roland Garros',
    event: '法网官方用球',
    note: '法网球为红土专门调校：毡面更松、球更"吃"红土，落地后速度衰减明显。'
  },
  {
    id: 'slazenger',
    name: 'Slazenger',
    cn: '史莱辛格',
    accent: 0x1ba55c,
    hex: '#1ba55c',
    felt: 0xe4f55a,
    model: 'Wimbledon',
    event: '温网官方用球',
    note: '温网用球是全世界唯一仍配白球的赛事，毡面紧实低矮，草地球速最快。'
  },
  {
    id: 'head',
    name: 'Head',
    cn: '海德',
    accent: 0xff6b5a,
    hex: '#ff6b5a',
    felt: 0xd9ff2e,
    model: 'Tour / ATP',
    event: 'ATP 巡回赛用球',
    note: 'Head Tour 是 ATP 多站赛事用球，硬地球速偏快，手感清脆。'
  },
  {
    id: 'yonex',
    name: 'Yonex',
    cn: '尤尼克斯',
    accent: 0x9b7bff,
    hex: '#9b7bff',
    felt: 0xd9ff2e,
    model: 'Tour / Pro',
    event: '巡回赛与训练',
    note: 'Yonex 球毡面一致性口碑好，Pro 版偏硬，适合大力量击球。'
  },
  {
    id: 'tecnifibre',
    name: 'Tecnifibre',
    cn: '泰克尼',
    accent: 0xffd166,
    hex: '#ffd166',
    felt: 0xd9ff2e,
    model: 'X-One',
    event: '俱乐部与训练',
    note: 'X-One 定位俱乐部与训练，球感偏软，冬天手感更友好。'
  },
  {
    id: 'prince',
    name: 'Prince',
    cn: '王子',
    accent: 0x7cf2b0,
    hex: '#7cf2b0',
    felt: 0xd9ff2e,
    model: 'Tour',
    event: '俱乐部用球',
    note: 'Prince Tour 以耐用见长，适合高频训练的球筐使用。'
  }
]

export const STRUCTURE_LAYERS = [
  { id: 'felt', name: '毡面', en: 'Felt', color: '#d9ff2e', note: '羊毛与尼龙混纺，决定摩擦力与旋转咬合，也决定耐磨寿命。' },
  { id: 'shell', name: '橡胶壳', en: 'Rubber shell', color: '#c8d94a', note: '提供主要弹性。有压球壳薄、无压球壳厚，厚度差直接影响手感软硬。' },
  { id: 'core', name: '中空内胆', en: 'Hollow core', color: '#ff8a4c', note: '有压球充气提供超压；无压球靠橡胶回弹所以壁更厚、几乎不留空腔。' },
  { id: 'seam', name: '接缝', en: 'Seam', color: '#f7ffe6', note: '两块毡面的接合线，也是旋转时最有辨识度的视觉特征。' }
]

export function ballTypeById(id) {
  return BALL_TYPES.find((item) => item.id === id) || BALL_TYPES[0]
}

export function brandById(id) {
  return BRANDS.find((item) => item.id === id) || BRANDS[0]
}

/** 品牌 + 类型合成一份渲染参数（毡面颜色以类型为准，接缝用品牌色）。 */
export function compositeBall(typeId, brandId) {
  const type = ballTypeById(typeId)
  const brand = brandById(brandId)
  return {
    type,
    brand,
    felt: type.felt,
    accent: brand.accent,
    seam: brand.accent,
    hex: brand.hex
  }
}
