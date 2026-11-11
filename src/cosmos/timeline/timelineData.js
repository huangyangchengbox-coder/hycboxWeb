/** 宇宙演化时间轴。时间为教学示意，锚点取 Planck 2018 及主流综述的公开近似。 */

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
const sup = (n) => String(n).split('').map((ch) => SUP[ch] || ch).join('')
const SEC_PER_YEAR = 365.25 * 86400

export const TIMELINE_ERAS = [
  {
    id: 'inflation',
    name: '暴胀',
    nameEn: 'INFLATION',
    kind: '宇宙起源',
    p: 0,
    logY: -43.5,
    timeAfter: '10⁻³⁶ 秒',
    timeAgo: '138 亿年前',
    headline: '空间在瞬间被拉伸了至少 10²⁶ 倍',
    body: '在极短的一瞬，宇宙经历了一次指数级膨胀。它抹平了空间的曲率，也把微观的量子涨落放大成日后所有结构的种子。',
    facts: [
      ['时间', '约 10⁻³⁶ 秒'],
      ['膨胀倍数', '至少 10²⁶ 倍'],
      ['留下的痕迹', '宇宙微波背景的均匀性']
    ],
    palette: {
      bg: '#000000', hot: '#fff4e0', cool: '#ffd9a0',
      webMix: 0, galaxyMix: 0, coreGlow: 2, starOpacity: 0, fieldOpacity: 1,
      camDist: 16, camHeight: 4, autoSpin: 0.05
    }
  },
  {
    id: 'plasma',
    name: '粒子时代',
    nameEn: 'PLASMA ERA',
    kind: '热汤',
    p: 0.08,
    logY: -7.5,
    timeAfter: '1 秒 ~ 3 分钟',
    timeAgo: '',
    headline: '宇宙是一锅夸克、电子与光子的热汤',
    body: '温度高到原子核无法束缚电子。大约 3 分钟后，氢和氦的原子核开始形成，物质与辐射反复碰撞，宇宙仍然不透明。',
    facts: [
      ['状态', '夸克、电子与光子'],
      ['约 3 分钟后', '氢氦原子核开始形成'],
      ['外观', '不透明的炽热等离子体']
    ],
    palette: {
      bg: '#0a0306', hot: '#ffb066', cool: '#ff8a4a',
      webMix: 0.05, galaxyMix: 0, coreGlow: 1.5, starOpacity: 0.05, fieldOpacity: 0.95,
      camDist: 22, camHeight: 6, autoSpin: 0.1
    }
  },
  {
    id: 'recombination',
    name: '复合 · 第一缕光',
    nameEn: 'RECOMBINATION',
    kind: '光子脱耦',
    p: 0.18,
    logY: Math.log10(3.8e5),
    timeAfter: '38 万年',
    timeAgo: '138 亿年前',
    headline: '电子终于被原子核捕获，光第一次自由穿行',
    body: '宇宙冷却到约 3000 K，自由电子与质子结合成中性氢。光子不再被反复散射，开始直线传播。这就是今天测到的宇宙微波背景。',
    facts: [
      ['温度', '约 3000 K'],
      ['今天的观测', '宇宙微波背景（CMB）'],
      ['温度起伏', '约十万分之一']
    ],
    palette: {
      bg: '#07030f', hot: '#ffd6a8', cool: '#c7b8ff',
      webMix: 0.15, galaxyMix: 0, coreGlow: 0.9, starOpacity: 0.08, fieldOpacity: 0.72,
      camDist: 30, camHeight: 8, autoSpin: 0.12
    }
  },
  {
    id: 'dark',
    name: '黑暗时代',
    nameEn: 'DARK AGES',
    kind: '中性氢',
    p: 0.28,
    logY: 8,
    timeAfter: '38 万年 ~ 2 亿年',
    timeAgo: '',
    headline: '没有恒星，只有中性氢与暗物质的引力',
    body: '宇宙几乎完全黑暗。暗物质先塌缩成骨架，气体沿着骨架汇聚，等待第一批恒星点亮。',
    facts: [
      ['光源', '几乎没有'],
      ['骨架', '暗物质先塌缩'],
      ['下一步', '气体沿骨架汇聚']
    ],
    palette: {
      bg: '#03030a', hot: '#8f6a52', cool: '#5b6a9c',
      webMix: 0.35, galaxyMix: 0, coreGlow: 0.15, starOpacity: 0.04, fieldOpacity: 0.16,
      camDist: 34, camHeight: 9, autoSpin: 0.14
    }
  },
  {
    id: 'firstlight',
    name: '第一代恒星',
    nameEn: 'FIRST LIGHT',
    kind: '再电离起点',
    p: 0.38,
    logY: 8.3,
    timeAfter: '约 2 亿年',
    timeAgo: '136 亿年前',
    headline: '第一批恒星点燃，宇宙重新被照亮',
    body: '第一代恒星质量可达太阳的数十到数百倍，寿命极短，以剧烈的超新星结束，并在爆发中锻造出更重的元素。观测上这一时刻约在 1.5 到 3 亿年之间。',
    facts: [
      ['质量', '可达太阳数十到数百倍'],
      ['结局', '短寿命，以超新星结束'],
      ['时间范围', '约 1.5–3 亿年']
    ],
    palette: {
      bg: '#04040d', hot: '#fff0c0', cool: '#a9c4ff',
      webMix: 0.55, galaxyMix: 0.08, coreGlow: 0.5, starOpacity: 0.28, fieldOpacity: 0.78,
      camDist: 32, camHeight: 9, autoSpin: 0.16
    }
  },
  {
    id: 'galaxies',
    name: '星系与黑洞',
    nameEn: 'GALAXY ASSEMBLY',
    kind: '宇宙网',
    p: 0.5,
    logY: 9,
    timeAfter: '约 10 亿年',
    timeAgo: '129 亿年前',
    headline: '恒星沿纤维汇聚，星系与超大质量黑洞一起成长',
    body: '星系沿宇宙网分布，网线之间是巨大的空洞。星系互相并合，越并越大；中心黑洞吸积物质时，可以成为极亮的类星体。',
    facts: [
      ['分布', '沿宇宙网，中间是空洞'],
      ['成长', '星系互相并合'],
      ['中心', '黑洞吸积时可成为类星体']
    ],
    palette: {
      bg: '#04050f', hot: '#ffe6b8', cool: '#9db8ff',
      webMix: 0.85, galaxyMix: 0.45, coreGlow: 0.6, starOpacity: 0.62, fieldOpacity: 0.9,
      camDist: 30, camHeight: 8, autoSpin: 0.18
    }
  },
  {
    id: 'solar',
    name: '太阳系诞生',
    nameEn: 'SOLAR SYSTEM',
    kind: '恒星形成',
    p: 0.62,
    logY: 9.96,
    timeAfter: '约 92 亿年',
    timeAgo: '46 亿年前',
    headline: '一团分子云塌缩，太阳与八大行星成形',
    body: '太阳是第二代以上的恒星。地球上的重元素来自更早恒星的爆发。46 亿年大约是 138 亿年的三分之一。',
    facts: [
      ['太阳', '第二代以上的恒星'],
      ['重元素', '来自更早的恒星'],
      ['比例', '46 亿年约为宇宙年龄的三分之一']
    ],
    palette: {
      bg: '#05060f', hot: '#ffd79a', cool: '#b9cdff',
      webMix: 0.95, galaxyMix: 0.75, coreGlow: 0.7, starOpacity: 0.78, fieldOpacity: 0.95,
      camDist: 26, camHeight: 7, autoSpin: 0.18
    }
  },
  {
    id: 'now',
    name: '今天的宇宙',
    nameEn: 'PRESENT DAY',
    kind: '现在',
    p: 0.78,
    logY: 10.14,
    timeAfter: '138 亿年',
    timeAgo: '现在',
    headline: '我们在这里，回望整条时间轴',
    body: '可观测宇宙的直径约 930 亿光年。星系之间正在加速远离，这股加速由暗能量主导。',
    facts: [
      ['可观测宇宙', '直径约 930 亿光年'],
      ['膨胀', '星系正在加速远离'],
      ['驱动', '暗能量']
    ],
    palette: {
      bg: '#05070f', hot: '#ffe0b0', cool: '#a8c0ff',
      webMix: 1, galaxyMix: 1, coreGlow: 0.5, starOpacity: 1, fieldOpacity: 1,
      camDist: 28, camHeight: 8, autoSpin: 0.2
    }
  },
  {
    id: 'future',
    name: '遥远的未来',
    nameEn: 'FAR FUTURE',
    kind: '热寂趋势',
    p: 1,
    logY: 14,
    timeAfter: '10¹⁴ 年之后',
    timeAgo: '',
    headline: '恒星逐一熄灭，只剩黑洞缓慢蒸发',
    body: '星系逐渐孤立，星光红移到不可见。最后的恒星大约在 10¹⁴ 年前后熄灭，黑洞则要在极漫长的时间里蒸发。',
    facts: [
      ['星系', '逐渐孤立并红移到不可见'],
      ['最后的恒星', '约 10¹⁴ 年前后熄灭'],
      ['黑洞', '在极漫长的时间里蒸发']
    ],
    palette: {
      bg: '#0a0206', hot: '#ff8f6a', cool: '#6b3a5c',
      webMix: 1, galaxyMix: 1, coreGlow: 0.15, starOpacity: 0.22, fieldOpacity: 0.42,
      camDist: 44, camHeight: 12, autoSpin: 0.06
    }
  }
]

export const ERA_ANCHORS = TIMELINE_ERAS.map(({ id, p, logY }) => ({ id, p, logY }))

export function eraSample(p) {
  const clamped = Math.min(1, Math.max(0, p))
  let i = 0
  while (i < TIMELINE_ERAS.length - 1 && clamped >= TIMELINE_ERAS[i + 1].p) i += 1
  const a = TIMELINE_ERAS[i]
  const b = TIMELINE_ERAS[Math.min(TIMELINE_ERAS.length - 1, i + 1)]
  const span = b.p - a.p || 1
  const t = Math.min(1, Math.max(0, (clamped - a.p) / span))
  return { a, b, t, p: clamped }
}

export function progressToLogYears(p) {
  const { a, b, t } = eraSample(p)
  return a.logY + (b.logY - a.logY) * t
}

export function logYearsToProgress(logY) {
  const anchors = ERA_ANCHORS
  for (let i = 0; i < anchors.length - 1; i += 1) {
    const lo = Math.min(anchors[i].logY, anchors[i + 1].logY)
    const hi = Math.max(anchors[i].logY, anchors[i + 1].logY)
    if (logY >= lo && logY <= hi) {
      const span = anchors[i + 1].logY - anchors[i].logY || 1
      return anchors[i].p + (anchors[i + 1].p - anchors[i].p) * ((logY - anchors[i].logY) / span)
    }
  }
  return logY < anchors[0].logY ? 0 : 1
}

export function formatCosmicTime(logY) {
  if (logY < -7.5) {
    const logSec = logY + Math.log10(SEC_PER_YEAR)
    let exp = Math.floor(logSec)
    if (logSec - exp > 0.999) exp += 1
    return `10${sup(exp)} 秒`
  }
  const years = 10 ** logY
  if (years < 1) {
    const sec = years * SEC_PER_YEAR
    if (sec < 90) return `${Math.max(1, Math.round(sec))} 秒`
    if (sec < 5400) return `${Math.round(sec / 60)} 分钟`
    if (sec < 86400 * 2) return `${(sec / 3600).toFixed(1)} 小时`
    if (sec < 86400 * 365) return `${Math.round(sec / 86400)} 天`
    return `${(years * 10).toFixed(1)} 年`
  }
  if (years < 1e4) return `${Math.round(years)} 年`
  if (years < 1e8) return `${(years / 1e4).toFixed(years < 1e6 ? 1 : 0)} 万年`
  if (years < 1e12) return `${(years / 1e8).toFixed(years < 1e10 ? 2 : 0)} 亿年`
  return `10${sup(Math.floor(logY))} 年`
}

export function readout(p) {
  const { a, t } = eraSample(p)
  if (t < 0.035) return `${a.timeAfter} · 大爆炸后`
  return `${formatCosmicTime(progressToLogYears(p))} · 大爆炸后`
}
