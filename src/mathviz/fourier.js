export function harmonics(kind, terms) {
  const list = []
  const n = Math.max(1, Math.min(64, Math.round(terms)))
  for (let k = 1; k <= n; k += 1) {
    if (kind === 'square' && k % 2 === 1) list.push({ k, amp: 1 / k })
    else if (kind === 'saw') list.push({ k, amp: (k % 2 ? 1 : -1) / k })
    else if (kind === 'tri' && k % 2 === 1) list.push({ k, amp: (((k - 1) / 2) % 2 ? -1 : 1) / (k * k) })
  }
  return list
}

export function partialSum(kind, terms, x) {
  let sum = 0
  for (const item of harmonics(kind, terms)) sum += item.amp * Math.sin(item.k * x)
  if (kind === 'square') return sum * 4 / Math.PI
  if (kind === 'saw') return (sum * 2) / Math.PI
  return (sum * 8) / (Math.PI * Math.PI)
}

export function targetWave(kind, x) {
  const a = ((x + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
  if (kind === 'square') return a >= 0 ? 1 : -1
  if (kind === 'saw') return a / Math.PI
  const u = Math.abs(a)
  const tent = u <= Math.PI / 2 ? (2 / Math.PI) * u : (2 / Math.PI) * (Math.PI - u)
  return (a < 0 ? -1 : 1) * tent
}

export function gibbsOvershoot(terms) {
  let max = 0
  for (let i = 1; i <= 240; i += 1) {
    const y = partialSum('square', terms, (i / 240) * Math.PI)
    if (y > max) max = y
  }
  return max - 1
}

export function drawFourier(ctx, w, h, { kind, terms, time }) {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(8, 12, 20, 0.2)'
  ctx.fillRect(0, 0, w, h)
  const circles = harmonics(kind, terms)
  const scale = kind === 'tri' ? 1.6 : 1
  const amp = Math.min(w * 0.22, h * 0.28) / (kind === 'square' ? 2.2 : 1.6)
  let x = w * 0.24
  let y = h * 0.42
  ctx.lineWidth = 1
  for (const item of circles) {
    const r = Math.abs(item.amp) * amp * scale
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'
    ctx.arc(x, y, Math.max(r, 0.4), 0, Math.PI * 2)
    ctx.stroke()
    const nx = x + r * Math.cos(item.k * time + (item.amp < 0 ? Math.PI : 0))
    const ny = y + r * Math.sin(item.k * time + (item.amp < 0 ? Math.PI : 0))
    ctx.beginPath()
    ctx.strokeStyle = '#7dffe8'
    ctx.moveTo(x, y)
    ctx.lineTo(nx, ny)
    ctx.stroke()
    x = nx
    y = ny
  }
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(255,224,138,0.8)'
  ctx.moveTo(x, y)
  ctx.lineTo(w * 0.46, y)
  ctx.stroke()

  const left = w * 0.48
  const mid = h * 0.42
  const waveW = w - left - 16
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.beginPath()
  ctx.moveTo(left, mid)
  ctx.lineTo(w - 12, mid)
  ctx.stroke()
  ctx.beginPath()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  for (let i = 0; i <= 180; i += 1) {
    const theta = (i / 180) * Math.PI * 2 - Math.PI
    const px = left + (i / 180) * waveW
    const py = mid - targetWave(kind, theta) * amp * 0.85
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.beginPath()
  ctx.strokeStyle = '#7dffe8'
  ctx.lineWidth = 1.7
  for (let i = 0; i <= 180; i += 1) {
    const theta = (i / 180) * Math.PI * 2 - Math.PI
    const px = left + (i / 180) * waveW
    const py = mid - partialSum(kind, terms, theta + time) * amp * 0.85
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

let audioCtx = null
let audioNodes = []

export function stopTone() {
  for (const node of audioNodes) {
    try { node.stop() } catch { /* already stopped */ }
  }
  audioNodes = []
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
}

export function playTone(kind, terms) {
  stopTone()
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return false
  audioCtx = new Ctx()
  const master = audioCtx.createGain()
  master.gain.value = 0.12
  master.connect(audioCtx.destination)
  const list = harmonics(kind, Math.min(terms, 20))
  const max = list.reduce((sum, item) => sum + Math.abs(item.amp), 0) || 1
  for (const item of list) {
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 196 * item.k
    gain.gain.value = Math.abs(item.amp) / max
    osc.connect(gain).connect(master)
    osc.start()
    audioNodes.push(osc)
  }
  return true
}
