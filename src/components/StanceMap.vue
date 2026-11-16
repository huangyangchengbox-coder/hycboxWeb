<template>
  <div class="stance-map">
    <div class="map-head">
      <span class="badge">TOP-DOWN FOOTWORK SCHEMA</span>
      <div class="key">
        <span><i class="dot l"></i>左脚 L</span>
        <span><i class="dot r"></i>右脚 R</span>
      </div>
    </div>

    <div ref="wrapRef" class="canvas-wrap">
      <canvas ref="canvasRef"></canvas>
    </div>

    <div class="stats">
      <span>双脚连线：<b>{{ angleLabel }}</b></span>
      <span>站位角 <b>{{ angle.toFixed(0) }}°</b> · 间距 <b>{{ width.toFixed(2) }} m</b></span>
    </div>

    <div class="foot-notes">
      <span>躯干转动轴：<b>{{ stance.axisLabel }}</b></span>
      <span>爆发力来源：<b>{{ stance.power }}</b></span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { stanceAngle, stanceAngleLabel, stanceWidth, weightArrow } from '../tennis/stance.js'

const props = defineProps({
  stance: { type: Object, required: true }
})

const wrapRef = ref(null)
const canvasRef = ref(null)

const W = 380
const H = 300
const CX = W / 2
const CY = H * 0.56
const SCALE = 210

const angle = computed(() => stanceAngle(props.stance))
const angleLabel = computed(() => stanceAngleLabel(props.stance))
const width = computed(() => stanceWidth(props.stance))

function toPx(x, z) {
  return { x: CX + x * SCALE, y: CY + z * SCALE }
}

/** 画一只脚：胶囊形脚掌 + 脚跟圆点 + 脚尖方向指示。 */
function drawFoot(ctx, px, py, yawDeg, color, label) {
  ctx.save()
  ctx.translate(px, py)
  ctx.rotate((yawDeg * Math.PI) / 180)

  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.beginPath()
  ctx.ellipse(0, 0, 15, 31, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0

  // 脚尖
  ctx.fillStyle = 'rgba(7, 11, 20, 0.55)'
  ctx.beginPath()
  ctx.ellipse(0, -19, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // 脚跟
  ctx.beginPath()
  ctx.ellipse(0, 20, 7, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.rotate((-yawDeg * Math.PI) / 180)
  ctx.fillStyle = '#e6f4ec'
  ctx.font = '600 10px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, 0, 44)
  ctx.restore()
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  const stance = props.stance
  const color = stance.hex
  const f = {
    left: { x: stance.feet.left.x, z: -stance.feet.left.advance, yaw: stance.feet.left.yaw },
    right: { x: stance.feet.right.x, z: -stance.feet.right.advance, yaw: stance.feet.right.yaw }
  }
  const lp = toPx(f.left.x, f.left.z)
  const rp = toPx(f.right.x, f.right.z)

  // 底线参考线
  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 2
  ctx.setLineDash([7, 6])
  ctx.beginPath()
  ctx.moveTo(26, CY + 66)
  ctx.lineTo(W - 26, CY + 66)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#7f9a91'
  ctx.font = '9px "PingFang SC", sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('底线 Baseline', W - 26, CY + 80)
  ctx.restore()

  // 球网方向提示
  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)'
  ctx.font = '600 9px "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('↑ 球网方向', CX, 20)
  ctx.restore()

  // 来球箭头
  ctx.save()
  const incomingX = CX - 62
  ctx.strokeStyle = '#00f0ff'
  ctx.fillStyle = '#00f0ff'
  ctx.lineWidth = 2.2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.moveTo(incomingX, 34)
  ctx.lineTo(incomingX, 84)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(incomingX, 94)
  ctx.lineTo(incomingX - 5, 79)
  ctx.lineTo(incomingX + 5, 79)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 0.7
  ctx.font = '9px "PingFang SC", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('来球', incomingX + 10, 52)
  ctx.restore()

  // 双脚连线（延伸成一条站位参考轴）
  ctx.save()
  ctx.strokeStyle = color
  ctx.globalAlpha = 0.42
  ctx.lineWidth = 1.4
  ctx.setLineDash([4, 4])
  const dx = rp.x - lp.x
  const dz = rp.y - lp.y
  const len = Math.hypot(dx, dz) || 1
  const ux = dx / len
  const uy = dz / len
  ctx.beginPath()
  ctx.moveTo(lp.x - ux * 34, lp.y - uy * 34)
  ctx.lineTo(rp.x + ux * 34, rp.y + uy * 34)
  ctx.stroke()
  ctx.restore()

  // 体重转移箭头
  const shift = weightArrow(stance)
  const from = toPx(shift.from.x, shift.from.z)
  const to = toPx(shift.to.x, shift.to.z)
  ctx.save()
  ctx.strokeStyle = "rgba(255, 179, 0, 0.9)"
  ctx.fillStyle = "rgba(255, 179, 0, 0.9)"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
  const a = Math.atan2(to.y - from.y, to.x - from.x)
  ctx.beginPath()
  ctx.moveTo(to.x, to.y)
  ctx.lineTo(to.x - Math.cos(a - 0.4) * 8, to.y - Math.sin(a - 0.4) * 8)
  ctx.lineTo(to.x - Math.cos(a + 0.4) * 8, to.y - Math.sin(a + 0.4) * 8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // 击球点（重心）
  const mid = toPx((f.left.x + f.right.x) / 2, (f.left.z + f.right.z) / 2)
  ctx.save()
  ctx.strokeStyle = '#ff3366'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(mid.x, mid.y, 6, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(mid.x - 10, mid.y)
  ctx.lineTo(mid.x + 10, mid.y)
  ctx.moveTo(mid.x, mid.y - 10)
  ctx.lineTo(mid.x, mid.y + 10)
  ctx.stroke()
  ctx.restore()

  // 两只脚（左脚 volt，右脚 cyan）
  drawFoot(ctx, lp.x, lp.y, f.left.yaw, '#ccff00', '左脚 L')
  drawFoot(ctx, rp.x, rp.y, f.right.yaw, '#00f0ff', '右脚 R')
}

let raf = 0
function schedule() {
  if (raf) cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    raf = 0
    draw()
  })
}

let ro = null
watch(() => props.stance, schedule)

onMounted(() => {
  draw()
  schedule()
  if (typeof ResizeObserver !== 'undefined' && wrapRef.value) {
    ro = new ResizeObserver(schedule)
    ro.observe(wrapRef.value)
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
})
</script>

<style scoped>
.stance-map {
  margin: 8px 0;
  padding: 8px;
  border-radius: 12px;
  background: rgba(4, 16, 20, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.map-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}

.badge {
  font-size: 8.5px;
  letter-spacing: 0.09em;
  color: #d8f34a;
  background: rgba(216, 243, 74, 0.12);
  border: 1px solid rgba(216, 243, 74, 0.3);
  padding: 1px 6px;
  border-radius: 4px;
}

.key {
  display: flex;
  gap: 8px;
  font-size: 9px;
  color: #8fa9a0;
}

.key span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.key i.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.key i.l {
  background: #ccff00;
}

.key i.r {
  background: #00f0ff;
}

.canvas-wrap {
  border-radius: 9px;
  overflow: hidden;
  background: rgba(7, 11, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.07);
  line-height: 0;
}

.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: auto;
}

.stats,
.foot-notes {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 10px;
  padding: 4px 6px;
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.5);
  font-size: 9.5px;
  color: #8fa9a0;
}

.stats {
  margin-top: 5px;
}

.stats b,
.foot-notes b {
  color: #e6f4ec;
}

.foot-notes {
  margin-top: 3px;
  font-size: 9px;
}
</style>
