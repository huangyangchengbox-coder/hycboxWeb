const SUP = {
  '-': '⁻',
  0: '⁰',
  1: '¹',
  2: '²',
  3: '³',
  4: '⁴',
  5: '⁵',
  6: '⁶',
  7: '⁷',
  8: '⁸',
  9: '⁹'
}

export const SCALE_MARKS = [
  {
    id: 'skin',
    p: 0,
    log: -2,
    name: '指尖',
    label: '约 10⁻² 米 · 1 cm',
    text: '从大约 1 厘米的指尖表面出发。颗粒只是皮肤的氛围，不是组织切片。'
  },
  {
    id: 'cell',
    p: 0.15,
    log: -4,
    name: '细胞',
    label: '约 10⁻⁴ 米 · 100 μm',
    text: '一颗细胞的全貌。人体细胞大小差很多，100 μm 只是这一站选用的数量级。'
  },
  {
    id: 'organelle',
    p: 0.35,
    log: -5,
    name: '细胞器',
    label: '约 10⁻⁵ 米 · 10 μm',
    text: '细胞核和线粒体进入视野。它们的相对大小做过艺术化调整。'
  },
  {
    id: 'bacteria',
    p: 0.55,
    log: -6,
    name: '细菌',
    label: '约 10⁻⁶ 米 · 1 μm',
    text: '一根细菌和线粒体常常处在同一个数量级，所以可以放在一起比较。细菌有细胞结构。'
  },
  {
    id: 'virus',
    p: 0.72,
    log: -7,
    name: '病毒',
    label: '约 10⁻⁷ 米 · 100 nm',
    text: '病毒通常比细菌小。它没有细胞结构，不能自己复制。这里不讲致病和传播。'
  },
  {
    id: 'helix',
    p: 0.86,
    log: -8,
    name: '螺旋与蛋白质',
    label: '约 10⁻⁸ 米 · 10 nm',
    text: 'B-DNA 双螺旋的直径大约 2 nm。蛋白质大小不一，这里只给一条侧影。'
  },
  {
    id: 'atom',
    p: 1,
    log: -10,
    name: '碳原子',
    label: '约 10⁻¹⁰ 米 · 0.1 nm',
    text: '电子云再次出现。这是概率密度的示意，不是一圈运行轨道。'
  }
]

function sup(value) {
  return String(value).replace(/./g, (ch) => SUP[ch] || ch)
}

export function nearestScaleMark(progress) {
  const p = Math.min(1, Math.max(0, progress))
  return SCALE_MARKS.reduce((best, mark) => (
    Math.abs(mark.p - p) < Math.abs(best.p - p) ? mark : best
  ), SCALE_MARKS[0])
}

export function scaleLabel(progress) {
  const p = Math.min(1, Math.max(0, progress))
  const near = nearestScaleMark(p)
  if (Math.abs(near.p - p) <= 0.02) return `${near.name} · ${near.label}`
  let index = 0
  while (index < SCALE_MARKS.length - 1 && p > SCALE_MARKS[index + 1].p) index += 1
  const left = SCALE_MARKS[index]
  const right = SCALE_MARKS[index + 1] || left
  const span = right.p - left.p || 1
  const log = left.log + (right.log - left.log) * ((p - left.p) / span)
  return `约 10${sup(Math.round(log))} 米`
}

export function trapWeight(progress, start, end, fade = 0.07) {
  if (progress < start - fade || progress > end + fade) return 0
  if (progress < start) return (progress - (start - fade)) / fade
  if (progress > end) return (end + fade - progress) / fade
  return 1
}
