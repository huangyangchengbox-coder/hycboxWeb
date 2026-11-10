/**
 * 银河系内著名星云示意。名称与距离取公开近似值，轮廓按各自经典形态绘制，不是照片。
 * distLy：距太阳大致光年。布局为对数压缩，便于同屏观看。
 */

export const NEBULAE = [
  { id: 'm42', name: '猎户座大星云', nameEn: 'M42', type: '发射星云', distLy: 1344, size: 1.45, aspect: 1.22, color: '#ff8aa8' },
  { id: 'm16', name: '创生之柱', nameEn: 'M16', type: '鹰状星云', distLy: 7000, size: 1.28, aspect: 0.7, color: '#8fd0b0' },
  { id: 'carina', name: '船底座星云', nameEn: 'NGC 3372', type: '发射星云', distLy: 7500, size: 1.55, aspect: 1.28, color: '#ff9a62' },
  { id: 'horse', name: '马头星云', nameEn: 'Barnard 33', type: '暗星云', distLy: 1375, size: 1.22, aspect: 0.82, color: '#e24a55' },
  { id: 'm1', name: '蟹状星云', nameEn: 'M1', type: '超新星遗迹', distLy: 6500, size: 1.15, aspect: 1.05, color: '#9ec4ff' },
  { id: 'm57', name: '环状星云', nameEn: 'M57', type: '行星状星云', distLy: 2300, size: 1.05, aspect: 1, color: '#7ee0c8' },
  { id: 'helix', name: '螺旋星云', nameEn: 'NGC 7293', type: '行星状星云', distLy: 655, size: 1.32, aspect: 1, color: '#ff8a9a' },
  { id: 'butterfly', name: '蝴蝶星云', nameEn: 'NGC 6302', type: '行星状星云', distLy: 3400, size: 1.25, aspect: 1.55, color: '#ffb060' },
  { id: 'catseye', name: '猫眼星云', nameEn: 'NGC 6543', type: '行星状星云', distLy: 3300, size: 1.08, aspect: 1, color: '#7dffc0' },
  { id: 'm27', name: '哑铃星云', nameEn: 'M27', type: '行星状星云', distLy: 1360, size: 1.12, aspect: 0.82, color: '#8fd0ff' },
  { id: 'm8', name: '礁湖星云', nameEn: 'M8', type: '发射星云', distLy: 4100, size: 1.38, aspect: 1.4, color: '#ff7aa8' },
  { id: 'm20', name: '三裂星云', nameEn: 'M20', type: '发射/反射', distLy: 5200, size: 1.18, aspect: 1.08, color: '#ff7090' },
  { id: 'rosette', name: '玫瑰星云', nameEn: 'NGC 2237', type: '发射星云', distLy: 5200, size: 1.3, aspect: 1, color: '#ff5a68' },
  { id: 'veil', name: '面纱星云', nameEn: 'Veil', type: '超新星遗迹', distLy: 2400, size: 1.42, aspect: 1.45, color: '#7ee8ff' },
  { id: 'flame', name: '火焰星云', nameEn: 'NGC 2024', type: '发射星云', distLy: 1400, size: 1.16, aspect: 0.72, color: '#ff8a3a' }
]

function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

export function layoutNebulae(list = NEBULAE) {
  return list.map((g, i) => {
    const ring = i < 8 ? 0 : 1
    const count = ring === 0 ? 8 : list.length - 8
    const idx = ring === 0 ? i : i - 8
    const a = (idx / count) * Math.PI * 2 + ring * 0.4
    const r = (ring === 0 ? 18 : 30) * (0.92 + hash01(g.id + 'j') * 0.16)
    const y = (hash01(g.id + 'y') - 0.5) * 10
    return {
      ...g,
      x: Math.cos(a) * r,
      y,
      z: Math.sin(a) * r,
      orbitSpeed: 0.0001 + hash01(g.id + 's') * 0.00018,
      orbitPhase: hash01(g.id + 'p') * Math.PI * 2 + i * 0.15
    }
  })
}

export function formatNebulaDist(distLy) {
  const ly = Number(distLy) || 0
  if (ly >= 1000) {
    const k = ly / 1000
    return `${k >= 10 ? Math.round(k) : k.toFixed(1)} 千光年`
  }
  return `${Math.round(ly)} 光年`
}

const TEX = 360

function freshCanvas() {
  const c = document.createElement('canvas')
  c.width = TEX
  c.height = TEX
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, TEX, TEX)
  return { c, ctx }
}

function blob(ctx, x, y, rx, ry, rot, inner, mid, outer) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot || 0)
  const R = Math.max(rx, ry)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R)
  g.addColorStop(0, inner)
  g.addColorStop(mid ? 0.45 : 1, mid || outer || 'rgba(0,0,0,0)')
  if (mid) g.addColorStop(1, outer || 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function fadeEdge(ctx) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-in'
  const g = ctx.createRadialGradient(TEX / 2, TEX / 2, TEX * 0.18, TEX / 2, TEX / 2, TEX * 0.52)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.72, 'rgba(0,0,0,0.92)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, TEX, TEX)
  ctx.restore()
}

function specks(ctx, n, color, spread = 0.32) {
  ctx.save()
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i * 0.17
    const r = TEX * (0.04 + ((i * 37) % 100) / 100 * spread)
    const x = TEX / 2 + Math.cos(a) * r
    const y = TEX / 2 + Math.sin(a * 1.07) * r * 0.85
    ctx.globalAlpha = 0.35 + ((i * 13) % 10) / 18
    ctx.beginPath()
    ctx.arc(x, y, i % 7 === 0 ? 1.8 : 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function paintOrion(ctx) {
  blob(ctx, TEX * 0.58, TEX * 0.5, TEX * 0.32, TEX * 0.28, 0.35, 'rgba(255,90,130,0.8)', 'rgba(160,30,70,0.35)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.22, TEX * 0.34, TEX * 0.2, TEX * 0.1, -0.9, 'rgba(255,170,190,0.85)', null, 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.78, TEX * 0.42, TEX * 0.14, TEX * 0.08, 0.8, 'rgba(255,140,160,0.55)', null, 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.46, TEX * 0.72, TEX * 0.16, TEX * 0.12, 0.2, 'rgba(90,210,150,0.55)', null, 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.16, TEX * 0.55, TEX * 0.12, TEX * 0.1, 0, 'rgba(70,140,255,0.45)', null, 'rgba(0,0,0,0)')
  ctx.fillStyle = 'rgba(12,6,10,0.88)'
  ctx.beginPath()
  ctx.moveTo(TEX * 0.08, TEX * 0.42)
  ctx.quadraticCurveTo(TEX * 0.28, TEX * 0.48, TEX * 0.22, TEX * 0.66)
  ctx.quadraticCurveTo(TEX * 0.12, TEX * 0.58, TEX * 0.08, TEX * 0.42)
  ctx.fill()
  blob(ctx, TEX * 0.52, TEX * 0.46, TEX * 0.055, TEX * 0.045, 0, 'rgba(255,255,255,1)', 'rgba(190,230,255,0.55)', 'rgba(0,0,0,0)')
  specks(ctx, 28, 'rgba(255,230,240,0.9)', 0.26)
}

function paintPillars(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.55, TEX * 0.46, TEX * 0.42, 0, 'rgba(120,210,160,0.95)', 'rgba(255,190,90,0.45)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.38, TEX * 0.3, TEX * 0.22, TEX * 0.18, 0, 'rgba(255,220,140,0.55)', null, 'rgba(0,0,0,0)')
  const columns = [
    { x: 0.3, top: 0.22, bot: 0.96, w: 0.07 },
    { x: 0.5, top: 0.1, bot: 0.98, w: 0.085 },
    { x: 0.7, top: 0.3, bot: 0.9, w: 0.055 }
  ]
  for (const col of columns) {
    const x = TEX * col.x
    const top = TEX * col.top
    const bot = TEX * col.bot
    const w = TEX * col.w
    ctx.beginPath()
    ctx.moveTo(x - w, bot)
    ctx.quadraticCurveTo(x - w * 0.4, (top + bot) / 2, x - w * 0.2, top + w)
    ctx.quadraticCurveTo(x, top - w * 0.2, x + w * 0.35, top + w * 0.6)
    ctx.quadraticCurveTo(x + w * 0.5, (top + bot) / 2, x + w * 0.85, bot)
    ctx.closePath()
    ctx.lineWidth = 7
    ctx.strokeStyle = 'rgba(255,214,120,0.95)'
    ctx.stroke()
    ctx.fillStyle = 'rgba(6,5,4,0.96)'
    ctx.fill()
  }
}

function paintCarina(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.52, TEX * 0.4, TEX * 0.32, 0.1, 'rgba(255,120,50,0.85)', 'rgba(140,30,20,0.35)', 'rgba(0,0,0,0)')
  const puffs = [
    [0.28, 0.4, 0.16, 0.1, -0.4],
    [0.72, 0.42, 0.16, 0.11, 0.5],
    [0.38, 0.68, 0.18, 0.1, -0.2],
    [0.64, 0.66, 0.14, 0.09, 0.3]
  ]
  for (const [x, y, rx, ry, rot] of puffs) {
    blob(ctx, TEX * x, TEX * y, TEX * rx, TEX * ry, rot, 'rgba(255,180,90,0.7)', null, 'rgba(0,0,0,0)')
  }
  ctx.fillStyle = 'rgba(4,3,6,0.95)'
  ctx.beginPath()
  ctx.ellipse(TEX * 0.48, TEX * 0.4, TEX * 0.055, TEX * 0.08, -0.15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillRect(TEX * 0.455, TEX * 0.46, TEX * 0.05, TEX * 0.11)
  ctx.beginPath()
  ctx.ellipse(TEX * 0.48, TEX * 0.58, TEX * 0.045, TEX * 0.03, 0, 0, Math.PI * 2)
  ctx.fill()
  specks(ctx, 30, 'rgba(255,230,190,0.9)', 0.3)
}

function paintHorsehead(ctx) {
  blob(ctx, TEX * 0.62, TEX * 0.5, TEX * 0.4, TEX * 0.48, 0, 'rgba(190,36,48,0.92)', 'rgba(120,16,28,0.45)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.78, TEX * 0.32, TEX * 0.16, TEX * 0.2, 0.2, 'rgba(255,90,80,0.55)', null, 'rgba(0,0,0,0)')
  ctx.fillStyle = 'rgba(5,4,8,0.98)'
  ctx.beginPath()
  ctx.moveTo(TEX * 0.4, TEX)
  ctx.lineTo(TEX * 0.7, TEX)
  ctx.lineTo(TEX * 0.62, TEX * 0.62)
  ctx.lineTo(TEX * 0.72, TEX * 0.46)
  ctx.lineTo(TEX * 0.56, TEX * 0.2)
  ctx.lineTo(TEX * 0.48, TEX * 0.1)
  ctx.lineTo(TEX * 0.42, TEX * 0.26)
  ctx.lineTo(TEX * 0.36, TEX * 0.28)
  ctx.lineTo(TEX * 0.18, TEX * 0.38)
  ctx.lineTo(TEX * 0.1, TEX * 0.46)
  ctx.lineTo(TEX * 0.1, TEX * 0.54)
  ctx.lineTo(TEX * 0.22, TEX * 0.56)
  ctx.lineTo(TEX * 0.3, TEX * 0.5)
  ctx.lineTo(TEX * 0.36, TEX * 0.6)
  ctx.lineTo(TEX * 0.38, TEX)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(200,40,52,0.96)'
  ctx.beginPath()
  ctx.ellipse(TEX * 0.24, TEX * 0.5, TEX * 0.07, TEX * 0.022, -0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.arc(TEX * 0.4, TEX * 0.36, 3.2, 0, Math.PI * 2)
  ctx.fill()
  blob(ctx, TEX * 0.28, TEX * 0.78, TEX * 0.035, TEX * 0.035, 0, 'rgba(255,255,255,1)', 'rgba(255,200,140,0.4)', 'rgba(0,0,0,0)')
}

function paintCrab(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.28, TEX * 0.22, 0.15, 'rgba(80,120,180,0.28)', null, 'rgba(0,0,0,0)')
  ctx.lineCap = 'round'
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2
    const r1 = TEX * (0.08 + (i % 5) * 0.015)
    const r2 = TEX * (0.2 + (i % 8) * 0.018)
    ctx.beginPath()
    ctx.moveTo(TEX * 0.5 + Math.cos(a) * TEX * 0.03, TEX * 0.5 + Math.sin(a) * TEX * 0.02)
    ctx.quadraticCurveTo(
      TEX * 0.5 + Math.cos(a + 0.55) * r1,
      TEX * 0.5 + Math.sin(a) * r1 * 0.72,
      TEX * 0.5 + Math.cos(a) * r2,
      TEX * 0.5 + Math.sin(a) * r2 * 0.78
    )
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,150,90,0.55)' : 'rgba(190,220,255,0.7)'
    ctx.lineWidth = i % 4 === 0 ? 2.2 : 1.15
    ctx.stroke()
  }
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.035, TEX * 0.035, 0, 'rgba(255,255,255,0.95)', null, 'rgba(0,0,0,0)')
}

function paintRing(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.34, TEX * 0.3, 0, 'rgba(40,80,90,0.18)', null, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.translate(TEX / 2, TEX / 2)
  ctx.scale(1.12, 1)
  ctx.beginPath()
  ctx.arc(0, 0, TEX * 0.2, 0, Math.PI * 2)
  ctx.lineWidth = TEX * 0.075
  const g = ctx.createLinearGradient(-TEX * 0.2, 0, TEX * 0.2, 0)
  g.addColorStop(0, 'rgba(90,220,190,0.15)')
  g.addColorStop(0.35, 'rgba(170,255,220,0.95)')
  g.addColorStop(0.7, 'rgba(80,160,255,0.75)')
  g.addColorStop(1, 'rgba(90,220,190,0.2)')
  ctx.strokeStyle = g
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(0, 0, TEX * 0.2, 0, Math.PI * 2)
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(255,255,230,0.8)'
  ctx.stroke()
  ctx.restore()
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.018, TEX * 0.018, 0, 'rgba(255,255,255,0.95)', null, 'rgba(0,0,0,0)')
}

function paintHelix(ctx) {
  ctx.save()
  ctx.translate(TEX / 2, TEX / 2)
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * TEX * 0.16, Math.sin(a) * TEX * 0.15)
    ctx.lineTo(Math.cos(a) * TEX * 0.3, Math.sin(a) * TEX * 0.28)
    ctx.strokeStyle = i % 2 ? 'rgba(255,120,140,0.55)' : 'rgba(120,220,255,0.45)'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.ellipse(0, 0, TEX * 0.26, TEX * 0.24, 0.15, 0, Math.PI * 2)
  ctx.lineWidth = TEX * 0.07
  ctx.strokeStyle = 'rgba(255,90,110,0.75)'
  ctx.stroke()
  ctx.beginPath()
  ctx.ellipse(0, 0, TEX * 0.16, TEX * 0.15, 0.15, 0, Math.PI * 2)
  ctx.lineWidth = TEX * 0.045
  ctx.strokeStyle = 'rgba(120,230,220,0.9)'
  ctx.stroke()
  ctx.restore()
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.04, TEX * 0.04, 0, 'rgba(255,255,255,0.95)', 'rgba(180,255,240,0.3)', 'rgba(0,0,0,0)')
}

function paintButterfly(ctx) {
  const wing = (dir) => {
    ctx.save()
    ctx.translate(TEX / 2, TEX / 2)
    ctx.scale(dir, 1)
    const g = ctx.createLinearGradient(0, 0, TEX * 0.42, 0)
    g.addColorStop(0, 'rgba(255,255,240,0.95)')
    g.addColorStop(0.35, 'rgba(255,170,70,0.9)')
    g.addColorStop(1, 'rgba(180,30,40,0.15)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(10, -4)
    ctx.bezierCurveTo(TEX * 0.12, -TEX * 0.22, TEX * 0.32, -TEX * 0.26, TEX * 0.4, -TEX * 0.06)
    ctx.bezierCurveTo(TEX * 0.28, -TEX * 0.02, TEX * 0.16, TEX * 0.02, 12, 4)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(10, 6)
    ctx.bezierCurveTo(TEX * 0.16, TEX * 0.12, TEX * 0.34, TEX * 0.24, TEX * 0.38, TEX * 0.06)
    ctx.bezierCurveTo(TEX * 0.22, TEX * 0.08, TEX * 0.12, TEX * 0.04, 10, 6)
    ctx.fill()
    ctx.restore()
  }
  wing(1)
  wing(-1)
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.035, TEX * 0.06, 0, 'rgba(255,255,255,1)', 'rgba(255,220,160,0.4)', 'rgba(0,0,0,0)')
  ctx.strokeStyle = 'rgba(20,8,10,0.75)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(TEX * 0.22, TEX * 0.5)
  ctx.lineTo(TEX * 0.78, TEX * 0.5)
  ctx.stroke()
}

function paintCatseye(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.22, TEX * 0.2, 0, 'rgba(40,120,80,0.25)', null, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.translate(TEX / 2, TEX / 2)
  const rings = [0.07, 0.12, 0.18, 0.26, 0.34]
  rings.forEach((r, i) => {
    ctx.beginPath()
    ctx.ellipse(0, 0, TEX * r * 1.08, TEX * r, 0.35, 0, Math.PI * 2)
    ctx.strokeStyle = i % 2 ? 'rgba(150,255,190,0.85)' : 'rgba(230,255,210,0.55)'
    ctx.lineWidth = i === 2 ? 7 : 3
    ctx.stroke()
  })
  ctx.restore()
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.028, TEX * 0.028, 0, 'rgba(255,255,255,1)', 'rgba(180,255,200,0.45)', 'rgba(0,0,0,0)')
}

function paintDumbbell(ctx) {
  blob(ctx, TEX * 0.5, TEX * 0.28, TEX * 0.24, TEX * 0.16, 0, 'rgba(170,230,255,0.95)', 'rgba(70,120,220,0.45)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.5, TEX * 0.72, TEX * 0.24, TEX * 0.16, 0, 'rgba(150,190,255,0.95)', 'rgba(80,70,180,0.4)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.5, TEX * 0.5, TEX * 0.08, TEX * 0.22, 0, 'rgba(245,255,255,0.9)', 'rgba(120,180,255,0.35)', 'rgba(0,0,0,0)')
  specks(ctx, 16, 'rgba(255,255,255,0.85)', 0.12)
}

function paintLagoon(ctx) {
  blob(ctx, TEX * 0.48, TEX * 0.5, TEX * 0.4, TEX * 0.26, -0.1, 'rgba(255,90,140,0.7)', 'rgba(160,30,70,0.25)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.62, TEX * 0.46, TEX * 0.1, TEX * 0.14, 0.2, 'rgba(255,220,180,0.8)', null, 'rgba(0,0,0,0)')
  ctx.strokeStyle = 'rgba(8,4,12,0.9)'
  ctx.lineWidth = TEX * 0.055
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(TEX * 0.16, TEX * 0.4)
  ctx.bezierCurveTo(TEX * 0.38, TEX * 0.62, TEX * 0.55, TEX * 0.32, TEX * 0.84, TEX * 0.58)
  ctx.stroke()
  specks(ctx, 22, 'rgba(255,220,230,0.8)', 0.3)
}

function paintTrifid(ctx) {
  blob(ctx, TEX * 0.48, TEX * 0.54, TEX * 0.26, TEX * 0.26, 0, 'rgba(255,80,120,0.85)', 'rgba(140,20,50,0.2)', 'rgba(0,0,0,0)')
  blob(ctx, TEX * 0.72, TEX * 0.32, TEX * 0.14, TEX * 0.12, -0.4, 'rgba(120,170,255,0.75)', null, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.translate(TEX * 0.48, TEX * 0.54)
  ctx.fillStyle = 'rgba(6,4,10,0.9)'
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(TEX * 0.3, TEX * 0.028)
    ctx.lineTo(TEX * 0.3, -TEX * 0.028)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  blob(ctx, TEX * 0.48, TEX * 0.54, TEX * 0.03, TEX * 0.03, 0, 'rgba(255,255,255,0.9)', null, 'rgba(0,0,0,0)')
}

function paintRosette(ctx) {
  ctx.save()
  ctx.translate(TEX / 2, TEX / 2)
  ctx.beginPath()
  ctx.arc(0, 0, TEX * 0.3, 0, Math.PI * 2)
  ctx.arc(0, 0, TEX * 0.14, 0, Math.PI * 2, true)
  ctx.fillStyle = 'rgba(210,30,50,0.35)'
  ctx.fill()
  ctx.restore()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const rad = TEX * 0.24
    blob(
      ctx,
      TEX / 2 + Math.cos(a) * rad,
      TEX / 2 + Math.sin(a) * rad,
      TEX * 0.12,
      TEX * 0.08,
      a,
      'rgba(255,60,80,0.92)',
      'rgba(180,20,40,0.35)',
      'rgba(0,0,0,0)'
    )
  }
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(TEX / 2, TEX / 2, TEX * 0.11, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  specks(ctx, 16, 'rgba(255,255,255,0.9)', 0.08)
}

function paintVeil(ctx) {
  const arcs = [
    { y: 0.32, color: 'rgba(120,230,255,0.9)', w: 5, bend: -0.18 },
    { y: 0.42, color: 'rgba(255,140,160,0.75)', w: 3.2, bend: -0.1 },
    { y: 0.55, color: 'rgba(170,255,230,0.8)', w: 4, bend: 0.05 },
    { y: 0.66, color: 'rgba(255,180,120,0.65)', w: 2.6, bend: 0.12 },
    { y: 0.48, color: 'rgba(200,220,255,0.55)', w: 1.6, bend: -0.22 }
  ]
  ctx.lineCap = 'round'
  for (const arc of arcs) {
    ctx.beginPath()
    ctx.moveTo(TEX * 0.08, TEX * (arc.y + 0.12))
    ctx.bezierCurveTo(
      TEX * 0.3,
      TEX * (arc.y + arc.bend),
      TEX * 0.62,
      TEX * (arc.y - 0.08),
      TEX * 0.92,
      TEX * (arc.y + 0.04)
    )
    ctx.strokeStyle = arc.color
    ctx.lineWidth = arc.w
    ctx.shadowColor = arc.color
    ctx.shadowBlur = 10
    ctx.stroke()
  }
  ctx.shadowBlur = 0
}

function paintFlame(ctx) {
  const g = ctx.createLinearGradient(0, TEX * 0.1, 0, TEX * 0.95)
  g.addColorStop(0, 'rgba(255,220,120,0.2)')
  g.addColorStop(0.35, 'rgba(255,120,30,0.92)')
  g.addColorStop(1, 'rgba(120,20,10,0.15)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(TEX * 0.5, TEX * 0.04)
  ctx.bezierCurveTo(TEX * 0.78, TEX * 0.22, TEX * 0.84, TEX * 0.48, TEX * 0.62, TEX * 0.78)
  ctx.quadraticCurveTo(TEX * 0.7, TEX * 0.92, TEX * 0.52, TEX * 0.96)
  ctx.quadraticCurveTo(TEX * 0.3, TEX * 0.92, TEX * 0.38, TEX * 0.78)
  ctx.bezierCurveTo(TEX * 0.16, TEX * 0.48, TEX * 0.24, TEX * 0.2, TEX * 0.5, TEX * 0.04)
  ctx.fill()
  ctx.strokeStyle = 'rgba(18,6,4,0.88)'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(TEX * 0.48, TEX * 0.86)
  ctx.quadraticCurveTo(TEX * 0.42, TEX * 0.55, TEX * 0.5, TEX * 0.28)
  ctx.moveTo(TEX * 0.48, TEX * 0.7)
  ctx.quadraticCurveTo(TEX * 0.62, TEX * 0.5, TEX * 0.58, TEX * 0.32)
  ctx.moveTo(TEX * 0.46, TEX * 0.62)
  ctx.quadraticCurveTo(TEX * 0.32, TEX * 0.48, TEX * 0.36, TEX * 0.3)
  ctx.stroke()
  blob(ctx, TEX * 0.5, TEX * 0.82, TEX * 0.06, TEX * 0.04, 0, 'rgba(255,255,220,0.9)', null, 'rgba(0,0,0,0)')
}

const PAINTERS = {
  m42: paintOrion,
  m16: paintPillars,
  carina: paintCarina,
  horse: paintHorsehead,
  m1: paintCrab,
  m57: paintRing,
  helix: paintHelix,
  butterfly: paintButterfly,
  catseye: paintCatseye,
  m27: paintDumbbell,
  m8: paintLagoon,
  m20: paintTrifid,
  rosette: paintRosette,
  veil: paintVeil,
  flame: paintFlame
}

/** 返回该星云的画布贴图（透明底，轮廓按经典形态） */
export function paintNebulaCanvas(id) {
  const { c, ctx } = freshCanvas()
  const paint = PAINTERS[id] || paintOrion
  paint(ctx)
  if (id !== 'horse' && id !== 'm16' && id !== 'veil') fadeEdge(ctx)
  return c
}
