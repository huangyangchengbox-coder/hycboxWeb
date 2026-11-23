<template>
  <div ref="wrapRef" class="cfc" :style="{ height: height + 'px' }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import * as THREE from 'three'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { solveContact } from '../tennis/ballforce.js'

/**
 * 击球瞬间的二维受力分解图（侧视，球拍面在左、球在右）。
 *
 * 与 3D 图层（ballforce.js 的 BallForceRig）用同一套接触模型 solveContact：
 *   (a) 速度：入射相对速度 v → 法向 v⊥（压进拍线）+ 切向 v∥（沿拍面刷过），虚线闭合平行四边形
 *   (b) 力：法向力 F_N（拍线弹性）+ 摩擦力 F_r（拍线咬球）→ 合力 F
 *   (c) 旋转：ω 弧标出旋转方向，标注转速
 *
 * 速度矢量按线性比例绘制（分解严格闭合）；力矢量按 √ 压缩，
 * 否则 F_r 只有 F_N 的几十分之一，画出来就看不见了。
 */
const props = defineProps({
  cases: { type: Array, default: () => [] },
  height: { type: Number, default: 200 },
  /** 竖向堆叠（用于信息栏里的三球对比），默认横向并排 */
  stack: { type: Boolean, default: false },
  /** 紧凑模式：单行读数、更小字号 */
  dense: { type: Boolean, default: false }
})

const wrapRef = ref(null)
const canvasRef = ref(null)

const KMH = 3.6

function profileOf(item) {
  return solveContact({
    inVel: new THREE.Vector3(...item.inVel),
    racketVel: new THREE.Vector3(...item.racketVel),
    normal: new THREE.Vector3(...item.normal),
    rpm: item.rpm || 0,
    ...(item.mu === undefined ? {} : { mu: item.mu })
  })
}

function arrow(ctx, x1, y1, x2, y2, color, width = 2, head = 7) {
  if (Math.hypot(x2 - x1, y2 - y1) < 2) return
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - head * Math.cos(a - Math.PI / 6), y2 - head * Math.sin(a - Math.PI / 6))
  ctx.lineTo(x2 - head * Math.cos(a + Math.PI / 6), y2 - head * Math.sin(a + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function dashed(ctx, x1, y1, x2, y2, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.restore()
}

function arcArrow(ctx, cx, cy, r, color, dirSign, label, width = 1.8) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  const start = -Math.PI * 0.85
  const sweep = Math.PI * 1.5
  ctx.beginPath()
  if (dirSign > 0) ctx.arc(cx, cy, r, start, start + sweep)
  else ctx.arc(cx, cy, r, start + sweep, start, true)
  ctx.stroke()

  // 弧末端箭头（顺时针终点在 start+sweep，逆时针终点回到 start）
  const endAngle = dirSign > 0 ? start + sweep : start
  const ex = cx + Math.cos(endAngle) * r
  const ey = cy + Math.sin(endAngle) * r
  // 切线方向：顺时针为 +90°，逆时针为 -90°
  const tangent = endAngle + (dirSign > 0 ? Math.PI / 2 : -Math.PI / 2)
  const hx = ex - Math.cos(tangent) * 6
  const hy = ey - Math.sin(tangent) * 6
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(hx - Math.sin(tangent) * 4, hy + Math.cos(tangent) * 4)
  ctx.lineTo(hx + Math.sin(tangent) * 4, hy - Math.cos(tangent) * 4)
  ctx.closePath()
  ctx.fill()

  if (label) {
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = color
    ctx.fillText(label, cx - r - 2, cy - r - 2)
  }
  ctx.restore()
}

/**
 * 把标签放在箭头末端或中点旁边，沿垂直方向错开，避免同向箭头（F 与 F_N）
 * 的文字堆在一起。back 是从末端回退的距离，side 选垂直方向的正负侧。
 */
function labelAt(ctx, txt, tip, dir, color, { back = 0, side = 1, off = 7 } = {}) {
  const px = -dir.y * side
  const py = dir.x * side
  const tx = tip.x - dir.x * back + px * off
  const ty = tip.y - dir.y * back + py * off
  ctx.fillStyle = color
  ctx.fillText(txt, tx, ty + 3)
}

function drawPanel(ctx, box, item, dense) {
  const { x, y, w, h } = box
  const p = item.p
  const color = item.color || '#d8f34a'

  // 面板底与边框
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.015)'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
  ctx.restore()

  const titleH = dense ? 13 : 17
  const footH = dense ? 12 : 26

  ctx.save()
  ctx.fillStyle = color
  ctx.font = `bold ${dense ? 9 : 10}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textAlign = 'left'
  ctx.fillText(item.label, x + 7, y + (dense ? 10 : 12))
  ctx.restore()

  const inner = {
    x: x + 8,
    y: y + titleH,
    w: w - 16,
    h: h - titleH - footH
  }
  const cx = inner.x + inner.w * 0.52
  const cy = inner.y + inner.h * 0.5
  const maxLen = Math.max(24, Math.min(inner.w * 0.44, inner.h * 0.56))

  // 世界 → 屏幕：(前向 z, 向上 y) → (右, 上)，画布 y 向下
  const kv = maxLen / Math.max(p.speed, 1)

  // 拍面：过接触点，垂直于法线
  const nScreen = new THREE.Vector2(p.n.z, -p.n.y).normalize()
  const tScreen = new THREE.Vector2(-nScreen.y, nScreen.x)
  const faceHalf = Math.min(inner.w, inner.h) * 0.48
  const f1 = { x: cx - tScreen.x * faceHalf, y: cy - tScreen.y * faceHalf }
  const f2 = { x: cx + tScreen.x * faceHalf, y: cy + tScreen.y * faceHalf }

  ctx.save()
  ctx.strokeStyle = 'rgba(155,232,255,0.85)'
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(f1.x, f1.y)
  ctx.lineTo(f2.x, f2.y)
  ctx.stroke()

  // 拍线短线（画在拍面背侧）
  ctx.strokeStyle = 'rgba(155,232,255,0.32)'
  ctx.lineWidth = 1
  for (let i = -4; i <= 4; i += 1) {
    if (i === 0) continue
    const bx = cx + tScreen.x * (faceHalf * i) / 4.4
    const by = cy + tScreen.y * (faceHalf * i) / 4.4
    ctx.beginPath()
    ctx.moveTo(bx, by)
    ctx.lineTo(bx - nScreen.x * 7, by - nScreen.y * 7)
    ctx.stroke()
  }
  ctx.restore()

  // 球
  const br = dense ? 9.5 : 11
  const bx = cx + nScreen.x * br
  const by = cy + nScreen.y * br
  ctx.save()
  ctx.fillStyle = 'rgba(216,243,74,0.16)'
  ctx.strokeStyle = '#d8f34a'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(bx, by, br, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  // 球缝
  ctx.strokeStyle = 'rgba(255,255,255,0.34)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.ellipse(bx, by, br * 0.98, br * 0.34, -0.6, 0, Math.PI * 2)
  ctx.stroke()
  // 接触点
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, cy, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  /* ---- (a) 速度分解：线性比例，平行四边形严格闭合 ---- */
  const rel = p.rel
  const vTip = { x: bx + rel.z * kv, y: by - rel.y * kv }

  const proj = rel.dot(p.n)
  const sign = proj < 0 ? -1 : 1
  const vnVec = { x: nScreen.x * sign, y: nScreen.y * sign }
  const vnLen = Math.abs(proj) * kv
  const vnTip = { x: bx + vnVec.x * vnLen, y: by + vnVec.y * vnLen }

  const tang = rel.clone().sub(p.n.clone().multiplyScalar(proj))
  const vtLen = tang.length() * kv
  const vtDir = tang.lengthSq() > 1e-8
    ? { x: tang.z / tang.length(), y: -tang.y / tang.length() }
    : { x: -nScreen.y, y: nScreen.x }
  const vtTip = { x: bx + vtDir.x * vtLen, y: by + vtDir.y * vtLen }

  dashed(ctx, vnTip.x, vnTip.y, vTip.x, vTip.y, 'rgba(148,163,184,0.55)')
  dashed(ctx, vtTip.x, vtTip.y, vTip.x, vTip.y, 'rgba(148,163,184,0.55)')

  arrow(ctx, bx, by, vTip.x, vTip.y, '#eafff2', 2, 6.5)
  arrow(ctx, bx, by, vnTip.x, vnTip.y, '#38bdf8', 2, 6)
  arrow(ctx, bx, by, vtTip.x, vtTip.y, '#22d3ee', 2, 6)

  if (!dense) {
    const vDir = { x: (vTip.x - bx) / Math.max(1e-6, Math.hypot(vTip.x - bx, vTip.y - by)), y: (vTip.y - by) / Math.max(1e-6, Math.hypot(vTip.x - bx, vTip.y - by)) }
    ctx.save()
    ctx.font = '9.5px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textAlign = 'left'
    labelAt(ctx, 'v', vTip, vDir, '#eafff2', { back: -2, side: -1 })
    labelAt(ctx, 'v⊥', vnTip, vnVec, '#38bdf8', { back: vnLen * 0.45, side: 1 })
    labelAt(ctx, 'v∥', vtTip, vtDir, '#22d3ee', { back: 2, side: -1 })
    ctx.restore()
  }

  /* ---- (b) 力分解：√ 压缩，保证被 F_N 压住的分量也看得见 ---- */
  // 力矢量用 ³√ 压缩：F_r 常常只有 F_N 的几十分之一，线性或 √ 都会把它压成一点
  const fMax = Math.max(p.F, 1)
  const kf = (value) => maxLen * Math.cbrt(Math.max(value, 0) / fMax)

  const fnLen = kf(p.FN)
  const frLen = kf(p.Fr)
  const fnTip = { x: bx + nScreen.x * fnLen, y: by + nScreen.y * fnLen }
  const frTip = { x: bx - vtDir.x * frLen, y: by - vtDir.y * frLen }
  const combined = new THREE.Vector2(
    nScreen.x * p.FN - vtDir.x * p.Fr,
    nScreen.y * p.FN - vtDir.y * p.Fr
  )
  if (combined.lengthSq() > 1e-9) combined.normalize()
  const fLen = kf(p.F)
  const fTip = { x: bx + combined.x * fLen, y: by + combined.y * fLen }

  // 合力先画粗橙线，再把 F_N / F_r 叠在上面：F ≈ F_N 时仍能看出「红线在橙鞘里」
  arrow(ctx, bx, by, fTip.x, fTip.y, '#fb923c', 4.2, 8)
  arrow(ctx, bx, by, frTip.x, frTip.y, '#facc15', 2, 6)
  arrow(ctx, bx, by, fnTip.x, fnTip.y, '#ef4444', 2.2, 6)

  if (!dense) {
    const fDir = { x: combined.x, y: combined.y }
    const frDir2 = { x: -vtDir.x, y: -vtDir.y }
    ctx.save()
    ctx.font = '9.5px ui-monospace, SFMono-Regular, Menlo, monospace'
    ctx.textAlign = 'left'
    labelAt(ctx, 'F_N', fnTip, nScreen, '#ef4444', { back: fnLen * 0.42, side: -1 })
    labelAt(ctx, 'F_r', frTip, frDir2, '#facc15', { back: 0, side: 1, off: 8 })
    labelAt(ctx, 'F', fTip, fDir, '#fb923c', { back: -4, side: 1 })
    ctx.restore()
  }

  /* ---- (c) 旋转 ω ---- */
  if (p.spinKind !== 'flat') {
    const dir = p.rpmSigned > 0 ? 1 : -1
    arcArrow(ctx, bx, by, br * 0.62, '#c084fc', dir, null, dense ? 1.3 : 1.6)
  }

  /* ---- 读数 ---- */
  ctx.save()
  ctx.font = `${dense ? 8 : 9}px ui-monospace, SFMono-Regular, Menlo, monospace`
  ctx.textAlign = 'left'
  const ly = y + h - (dense ? 3 : 15)
  ctx.fillStyle = 'rgba(207,230,218,0.92)'
  if (dense) {
    ctx.fillText(
      `v ${Math.round(p.speed * KMH)} · v⊥ ${Math.round(p.vn * KMH)} · F_N ${Math.round(p.FN)}N · ω ${Math.round(p.rpmOut)}`,
      x + 7,
      ly
    )
  } else {
    ctx.fillText(
      `v ${Math.round(p.speed * KMH)} km/h   v⊥ ${Math.round(p.vn * KMH)}   v∥ ${Math.round(p.vt * KMH)}`,
      x + 7,
      ly - 11
    )
    ctx.fillStyle = p.slip ? '#ffd79a' : 'rgba(207,230,218,0.92)'
    ctx.fillText(
      `F_N ${Math.round(p.FN)} N   F_r ${Math.round(p.Fr)} N   F ${Math.round(p.F)} N   μ ${p.muNeed.toFixed(2)}${p.slip ? ' 打滑' : ''}`,
      x + 7,
      ly
    )
  }
  ctx.restore()
}

function draw() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap || !props.cases.length) return
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const pw = Math.round(rect.width * dpr)
  const ph = Math.round(rect.height * dpr)
  if (canvas.width !== pw || canvas.height !== ph) {
    canvas.width = pw
    canvas.height = ph
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, rect.width, rect.height)

  const items = props.cases.map((item) => ({ ...item, p: profileOf(item) }))
  const dense = props.dense
  const cols = props.stack ? 1 : items.length
  const rows = props.stack ? items.length : 1
  const gap = dense ? 3 : 6
  const cellW = (rect.width - gap * (cols - 1)) / cols
  const cellH = (rect.height - gap * (rows - 1)) / rows

  items.forEach((item, index) => {
    const cx = (index % cols) * (cellW + gap)
    const cy = Math.floor(index / cols) * (cellH + gap)
    drawPanel(ctx, { x: cx, y: cy, w: cellW, h: cellH }, item, dense)
  })
}

let ro = null
onMounted(() => {
  draw()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => draw())
    ro.observe(wrapRef.value)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

watch(
  () => [props.cases, props.height, props.stack, props.dense],
  () => requestAnimationFrame(draw),
  { deep: true }
)
</script>

<style scoped>
.cfc {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(3, 14, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.cfc canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
</style>
