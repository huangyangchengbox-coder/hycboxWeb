import { harmonics } from './fourier.js'
import { binomPmf } from './prob.js'

function num(value, digits = 2) {
  if (!Number.isFinite(value)) return '—'
  const n = Number(value)
  const text = n.toFixed(digits)
  return text.replace(/\.?0+$/, '') || '0'
}

function complex(re, im) {
  const sign = im < 0 ? '−' : '+'
  return `${num(re)} ${sign} ${num(Math.abs(im))}i`
}

function orbit(cre, cim, steps) {
  let re = 0
  let im = 0
  const path = [{ re, im, escaped: false }]
  for (let i = 0; i < steps; i += 1) {
    const nextRe = re * re - im * im + cre
    const nextIm = 2 * re * im + cim
    re = nextRe
    im = nextIm
    const escaped = re * re + im * im > 4
    path.push({ re, im, escaped })
    if (escaped) break
  }
  return path
}

function fractalFrame(state) {
  if (state.kind === 'koch' || state.kind === 'sierpinski') {
    const step = Math.floor(state.t / 0.9) % 5
    const count = state.kind === 'koch' ? 3 * 4 ** step : 4 ** step
    const rule = state.kind === 'koch' ? '一条边换成四段' : '每个四面体再分出四个'
    return {
      caption: state.kind === 'koch' ? '科赫雪花' : '谢尔宾斯基',
      step,
      lines: [[
        { text: state.kind === 'koch' ? '边数 = 3 × ' : '个数 = ' },
        { text: '4', sup: String(step), on: true },
        { text: ` = ${count}` }
      ]],
      foot: `${rule}。现在是第 ${step} 步。`
    }
  }
  const path = orbit(state.cRe, state.cIm, 7)
  const step = Math.floor(state.t / 0.7) % path.length
  const point = path[Math.min(step, path.length - 1)]
  const magnitude = Math.hypot(point.re, point.im)
  return {
    caption: state.kind === 'julia' ? 'Julia 迭代' : 'Mandelbrot 迭代',
    step,
    lines: [[
      { text: 'z', sub: String(step), on: true },
      { text: ' = ' },
      { text: 'z', sub: step ? String(step - 1) : '0' },
      { text: '² + c' }
    ], [
      { text: complex(point.re, point.im), live: true }
    ]],
    foot: point.escaped
      ? `|z| = ${num(magnitude)}，已经逃出 |z| > 2`
      : `c = ${complex(state.cRe, state.cIm)}，|z| = ${num(magnitude)}`
  }
}

function surfaceLine(state) {
  const a = num(state.a)
  const b = num(state.b)
  const c = num(state.c)
  if (state.custom) return [{ text: 'z = ' }, { text: state.expression || 'f(x, y)', on: true }]
  if (state.surfaceId === 'saddle') {
    return [{ text: 'z = ' }, { text: a, on: true }, { text: '/4 · ((' }, { text: b }, { text: 'x)² − (' }, { text: c }, { text: 'y)²)' }]
  }
  if (state.surfaceId === 'ripple') {
    return [{ text: 'z = ' }, { text: a, on: true }, { text: ' sin(' }, { text: b }, { text: ' √(x² + y²))' }]
  }
  if (state.surfaceId === 'gauss') {
    return [{ text: 'z = ' }, { text: a, on: true }, { text: ' exp(−' }, { text: b }, { text: '(x² + y²) / 2)' }]
  }
  return [
    { text: 'z = ' }, { text: a, on: true },
    { text: ' sin(' }, { text: b }, { text: 'x) cos(' }, { text: c }, { text: 'y)' }
  ]
}

function surfaceFrame(state) {
  const hs = [0.8, 0.4, 0.2, 0.1, 0.05]
  const step = Math.floor(state.t / 0.85) % hs.length
  const h = hs[step]
  const quote = state.height
    ? (state.height(state.sliceX, h) - state.height(state.sliceX, -h)) / (2 * h)
    : state.slope
  return {
    caption: '差分逼近偏导',
    step,
    lines: [
      surfaceLine(state),
      [
        { text: '[f(x, h) − f(x, −h)] / 2h' },
        { text: ' → ', on: true },
        { text: '∂z/∂y' }
      ]
    ],
    foot: `h = ${num(h)}，差分 = ${num(quote)}，切面斜率 ${num(state.slope)}`
  }
}

function linearFrame(state) {
  const theta = state.t * 0.85
  const x = Math.cos(theta)
  const y = Math.sin(theta)
  const { a, b, c, d } = state.matrix
  const xp = a * x + b * y
  const yp = c * x + d * y
  const eigen = state.eigen
  const foot = eigen?.complex
    ? `det = ${num(eigen.det)}。特征值是复数，这个向量的方向在转。`
    : `det = ${num(eigen?.det)}，λ₁ = ${num(eigen?.l1)}，λ₂ = ${num(eigen?.l2)}`
  return {
    caption: 'A v，v 正在绕圈',
    step: Math.floor(theta / (Math.PI / 2)),
    product: {
      a: num(a), b: num(b), c: num(c), d: num(d),
      x: num(x), y: num(y), xp: num(xp), yp: num(yp)
    },
    foot
  }
}

function fourierFrame(state) {
  const all = harmonics(state.waveId, Math.min(state.terms, 9))
  const count = Math.max(1, all.length)
  const step = Math.floor(state.t / 0.55) % (count + 1)
  const shown = all.slice(0, Math.max(1, step))
  const factor = state.waveId === 'square' ? '4/π' : state.waveId === 'saw' ? '2/π' : '8/π²'
  const pieces = [{ text: `${factor} (` }]
  shown.forEach((item, index) => {
    if (index) pieces.push({ text: item.amp < 0 ? ' − ' : ' + ' })
    const amp = Math.abs(item.amp)
    const den = Math.round(1 / amp)
    const coeff = Math.abs(amp - 1) < 1e-6 ? '' : (Math.abs(amp - 1 / den) < 1e-6 ? `1/${den} ` : `${num(amp, 2)} `)
    pieces.push({
      text: `${coeff}sin ${item.k === 1 ? 'x' : `${item.k}x`}`,
      on: index === shown.length - 1
    })
  })
  pieces.push({ text: ' )' })
  return {
    caption: `傅里叶，亮起的是第 ${shown.length} 项`,
    step,
    lines: [pieces],
    foot: state.waveId === 'square'
      ? '方波只留下奇数项，系数是 1、1/3、1/5……'
      : '项在一项一项加上，和就越来越像目标波形。'
  }
}

function probFrame(state) {
  if (state.probTab === 'pi') {
    return {
      caption: '蒙特卡洛',
      step: Math.floor(state.t) % 2,
      lines: [[
        { text: 'π ≈ 4 × ' },
        { text: String(state.piInside || 0), on: true },
        { text: ' / ' },
        { text: String(state.piTotal || 0) },
        { text: ' = ' },
        { text: num(state.piEstimate || 0, 5), live: true }
      ]],
      foot: '正方形里的点，落进四分之一圆的比例乘 4。'
    }
  }
  if (state.probTab === 'normal') {
    const x = Math.sin(state.t * 0.7) * 2.4 * state.sigma + state.mu
    const density = Math.exp(-0.5 * ((x - state.mu) / state.sigma) ** 2) / (state.sigma * Math.sqrt(2 * Math.PI))
    return {
      caption: '正态密度',
      step: Math.floor(state.t / 0.5) % 4,
      lines: [[
        { text: 'φ(x) = 1 / (σ √(2π)) exp( −(x − μ)² / 2σ² )' }
      ]],
      foot: `μ = ${num(state.mu)}，σ = ${num(state.sigma)}，x = ${num(x)}，φ = ${num(density, 3)}`
    }
  }
  const n = 12
  const k = Math.floor(state.t / 0.45) % (n + 1)
  const chance = binomPmf(n, k)
  return {
    caption: '钉板落到第 k 格',
    step: k,
    lines: [[
      { text: 'P(X = ' },
      { text: String(k), on: true },
      { text: ') = C(12, ' },
      { text: String(k) },
      { text: ') / 2' },
      { text: '12', sup: true },
      { text: ` = ${num(chance, 3)}` }
    ]],
    foot: '每个钉子向左或向右，十二次之后堆成钟形。'
  }
}

const QUIZ = [
  {
    caption: 'Julia 连通的条件',
    lines: [[{ text: 'c ∈ 曼德博集', on: true }, { text: ' ⇔ Julia 集连成一块' }]],
    foot: 'c 跑到集合外面，对应的 Julia 集就碎成尘埃。'
  },
  {
    caption: '行列式是面积',
    lines: [[{ text: 'det = 0', on: true }, { text: ' ⇒ 平行四边形的面积变成 0' }]],
    foot: '有一个方向被压没了，变换就不能再倒回去。'
  },
  {
    caption: 'Gibbs 过冲',
    lines: [[{ text: '拐角高出约 ' }, { text: '9%', on: true }, { text: '，项数增加也不会消失' }]],
    foot: '过冲会变窄，高度却靠近 9%。'
  },
  {
    caption: '钉板的计数',
    lines: [[{ text: 'X ~ 二项分布(n, 1/2)', on: true }]],
    foot: '钉子很多的时候，柱状图接近正态钟形。'
  },
  {
    caption: '用面积比估计 π',
    lines: [[{ text: 'π ≈ 4 × ' }, { text: '圆内点数 / 总点数', on: true }]],
    foot: '四分之一单位圆的面积正好是 π/4。'
  },
  {
    caption: '特征向量',
    lines: [[{ text: 'A v = λ v', on: true }]],
    foot: '方向留在原来的直线上，长度乘以特征值。'
  }
]

export function formulaFrame(state) {
  if (state.mode === 'fractal') return fractalFrame(state)
  if (state.mode === 'surface') return surfaceFrame(state)
  if (state.mode === 'linear') return linearFrame(state)
  if (state.mode === 'fourier') return fourierFrame(state)
  if (state.mode === 'prob') return probFrame(state)
  const card = QUIZ[state.quizIndex] || QUIZ[0]
  const step = Math.floor(state.t / 1.2) % 2
  return { ...card, step, lines: card.lines.map((line) => line.map((part) => ({ ...part, on: part.on && step === 1 }))) }
}
