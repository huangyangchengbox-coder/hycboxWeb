<template>
  <div class="foot-demo">
    <div class="demo-head">
      <div class="head-left">
        <span class="badge">INTERACTIVE FOOTWORK ENGINE</span>
        <h2>{{ scenario.title }}</h2>
        <p class="sub">{{ scenario.desc }}</p>
      </div>
      <div class="head-right">
        <span class="zone">{{ scenario.zone }}</span>
        <span class="tag">{{ scenario.tag }}</span>
      </div>
    </div>

    <div class="legend">
      <span><i class="dot ball"></i>来球轨迹</span>
      <span><i class="dot attack"></i>进攻跑位</span>
      <span><i class="dot recover"></i>回位路线</span>
      <span><b class="lr">L</b><b class="lr r">R</b>左右脚足印</span>
      <button type="button" class="fp-toggle" :class="{ on: showMarks }" @click="showMarks = !showMarks">
        👣 保留足印：{{ showMarks ? '开启' : '关闭' }}
      </button>
    </div>

    <div class="stage">
      <div ref="wrapRef" class="canvas-wrap">
        <canvas ref="canvasRef" @click="onCanvasClick"></canvas>
        <div class="phase-bar">
          <span class="phase-chip">{{ state.label }}</span>
          <span class="cue">{{ state.footCue }}</span>
        </div>
      </div>

      <aside class="steps">
        <div class="steps-head">
          <h3>脚步节奏拆解</h3>
          <span>点击可跳转 · 共 {{ scenario.stepsSummary.length }} 拍</span>
        </div>
        <button
          v-for="(step, i) in scenario.stepsSummary"
          :key="step.badge"
          type="button"
          class="step"
          :class="{ on: i === activeStep }"
          @click="jumpTo(step.range[0] + 0.02)"
        >
          <div class="step-top">
            <b>{{ step.name }}</b>
            <em>{{ step.badge }}</em>
          </div>
          <p>{{ step.detail }}</p>
        </button>

        <div class="coach">
          <span>⚡ 职业教练提示</span>
          <p>{{ scenario.coachTip }}</p>
        </div>

        <dl class="stats">
          <div><dt>总周期</dt><dd>{{ scenario.duration.toFixed(1) }} s</dd></div>
          <div><dt>移动距离</dt><dd>{{ travel.toFixed(2) }} m</dd></div>
          <div><dt>足印数</dt><dd>{{ marks.length }}</dd></div>
        </dl>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { footprintsUpTo, hitTimeOf, sampleScenario, scenarioById, stepIndexAt, STEP_STYLE, travelOf } from '../tennis/footwork.js'

const props = defineProps({
  scenarioId: { type: String, default: 'baseline_rally' },
  progress: { type: Number, default: 0 },
  showFootprints: { type: Boolean, default: true }
})

const emit = defineEmits(['jump'])

const wrapRef = ref(null)
const canvasRef = ref(null)
const showMarks = ref(props.showFootprints)

const scenario = computed(() => scenarioById(props.scenarioId))
const travel = computed(() => travelOf(scenario.value))
const state = computed(() => sampleScenario(scenario.value, props.progress))
const marks = computed(() => (showMarks.value ? footprintsUpTo(scenario.value, props.progress) : []))
const activeStep = computed(() => stepIndexAt(scenario.value, props.progress))

const W = 420
const H = 580
const MIN_X = -6.8
const MAX_X = 6.8
const MIN_Y = -12.8
const MAX_Y = 14.4

function wx(x) {
  return ((x - MIN_X) / (MAX_X - MIN_X)) * W
}

function wy(y) {
  return ((y - MIN_Y) / (MAX_Y - MIN_Y)) * H
}

function courtRect() {
  return {
    x: wx(-5.485),
    y: wy(-11.885),
    w: wx(5.485) - wx(-5.485),
    h: wy(11.885) - wy(-11.885)
  }
}

function drawCourt(ctx) {
  ctx.fillStyle = '#142d46'
  ctx.fillRect(0, 0, W, H)

  const r = courtRect()
  ctx.fillStyle = '#24588c'
  ctx.fillRect(r.x, r.y, r.w, r.h)

  // 过渡区
  const tTop = wy(6.4)
  const tBot = wy(11.885)
  ctx.fillStyle = 'rgba(244, 63, 94, 0.07)'
  ctx.fillRect(wx(-4.115), tTop, wx(4.115) - wx(-4.115), tBot - tTop)

  ctx.save()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.13)'
  ctx.font = '600 9px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('过渡区 · 快速通过', wx(0), wy(9.15))
  ctx.fillText('网前截击区', wx(0), wy(3.2))
  ctx.fillText('底线相持区', wx(0), wy(12.9))
  ctx.restore()

  // 白线
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
  ctx.lineWidth = 1.6
  ctx.strokeRect(r.x, r.y, r.w, r.h)

  ctx.beginPath()
  for (const x of [-4.115, 4.115]) {
    ctx.moveTo(wx(x), wy(-11.885))
    ctx.lineTo(wx(x), wy(11.885))
  }
  for (const y of [-6.4, 6.4]) {
    ctx.moveTo(wx(-4.115), wy(y))
    ctx.lineTo(wx(4.115), wy(y))
  }
  ctx.moveTo(wx(0), wy(-6.4))
  ctx.lineTo(wx(0), wy(6.4))
  ctx.stroke()

  // 球网
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(wx(-6.2), wy(0) + 2)
  ctx.lineTo(wx(6.2), wy(0) + 2)
  ctx.stroke()

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(wx(-6.2), wy(0))
  ctx.lineTo(wx(6.2), wy(0))
  ctx.stroke()

  ctx.fillStyle = '#0f172a'
  for (const x of [-6.2, 6.2]) {
    ctx.beginPath()
    ctx.arc(wx(x), wy(0), 3.4, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawRoutes(ctx) {
  const sc = scenario.value
  const kfs = sc.keyframes
  let hitIndex = kfs.findIndex((k) => k.stepType === 'hit')
  if (hitIndex < 0) hitIndex = Math.floor(kfs.length * 0.65)

  ctx.save()
  ctx.lineWidth = 2.2
  ctx.setLineDash([5, 4])

  ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)'
  ctx.beginPath()
  for (let i = 0; i <= hitIndex; i += 1) {
    const x = wx(kfs[i].x)
    const y = wy(kfs[i].y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
  ctx.beginPath()
  for (let i = hitIndex; i < kfs.length; i += 1) {
    const x = wx(kfs[i].x)
    const y = wy(kfs[i].y)
    if (i === hitIndex) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawMarks(ctx) {
  const list = marks.value
  list.forEach((fp, i) => {
    const px = wx(fp.x)
    const py = wy(fp.y)
    const recent = i >= list.length - 4
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(fp.angle + Math.PI / 2)

    if (fp.type === 'split') {
      ctx.strokeStyle = 'rgba(216, 243, 74, 0.8)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(0, 0, 9, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = fp.type === 'split'
      ? '#d8f34a'
      : fp.foot === 'L'
        ? 'rgba(244, 63, 94, 0.9)'
        : 'rgba(56, 189, 248, 0.9)'
    ctx.globalAlpha = recent || fp.type === 'split' ? 1 : 0.55

    ctx.beginPath()
    ctx.ellipse(0, 0, 3.4, 6.2, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.rotate(-(fp.angle + Math.PI / 2))
    ctx.globalAlpha = 1
    ctx.fillStyle = fp.type === 'split' ? '#0f172a' : '#ffffff'
    ctx.font = '700 6.5px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(fp.foot, 0, 0)
    ctx.restore()
  })
}

function drawPlayer(ctx) {
  const s = state.value
  const px = wx(s.x)
  const py = wy(s.y)

  ctx.save()
  ctx.translate(px, py)

  if (s.stepType === 'split') {
    const pulse = 15 + Math.sin(props.progress * Math.PI * 25) * 5
    ctx.strokeStyle = 'rgba(216, 243, 74, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, pulse, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(216, 243, 74, 0.16)'
    ctx.fill()
  }

  if (s.stepType === 'hit') {
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(0, 0, 18, 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.rotate(s.facing + Math.PI / 2)

  const phase = props.progress * 38
  const lOff = s.stepType === 'split' ? 0 : Math.sin(phase) * 5
  const rOff = s.stepType === 'split' ? 0 : -Math.sin(phase) * 5
  const stance = s.stepType === 'split' ? 9 : 6

  ctx.fillStyle = '#f8fafc'
  for (const [off, width] of [[-stance, lOff], [stance, rOff]]) {
    ctx.beginPath()
    ctx.ellipse(off, width, 2.8, 4.8, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // 躯干
  ctx.fillStyle = '#0ea5e9'
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(0, 0, 9.5, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // 球拍
  const swing = s.stepType === 'hit' ? -0.65 : 0.25
  ctx.save()
  ctx.translate(8.5, -1.6)
  ctx.rotate(swing)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(4.8, -8.8)
  ctx.stroke()
  ctx.strokeStyle = '#d8f34a'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.ellipse(6.8, -12.6, 3.6, 5.2, 0.35, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // 头
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(0, 0, 4.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawBall(ctx) {
  const sc = scenario.value
  const b = sc.ball
  const tHit = hitTimeOf(sc)
  const tBounce = tHit * 0.72
  const p = props.progress

  // 参考虚线
  ctx.save()
  ctx.strokeStyle = 'rgba(216, 243, 74, 0.28)'
  ctx.lineWidth = 1.2
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(wx(b.start.x), wy(b.start.y))
  ctx.lineTo(wx(b.bounce.x), wy(b.bounce.y))
  ctx.lineTo(wx(b.hit.x), wy(b.hit.y))
  ctx.lineTo(wx(b.target.x), wy(b.target.y))
  ctx.stroke()
  ctx.restore()

  if (p >= tBounce) {
    ctx.strokeStyle = 'rgba(216, 243, 74, 0.75)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(wx(b.bounce.x), wy(b.bounce.y), 6, 0, Math.PI * 2)
    ctx.stroke()
  }

  let bx
  let by
  let scale = 1
  if (p <= tBounce) {
    const lt = tBounce > 0 ? p / tBounce : 0
    bx = b.start.x + (b.bounce.x - b.start.x) * lt
    by = b.start.y + (b.bounce.y - b.start.y) * lt
    scale = 1 + Math.sin(lt * Math.PI) * 0.45
  } else if (p <= tHit) {
    const lt = (p - tBounce) / Math.max(1e-4, tHit - tBounce)
    bx = b.bounce.x + (b.hit.x - b.bounce.x) * lt
    by = b.bounce.y + (b.hit.y - b.bounce.y) * lt
    scale = 1 + Math.sin(lt * Math.PI * 0.6) * 0.25
  } else {
    const lt = (p - tHit) / Math.max(1e-4, 1 - tHit)
    bx = b.hit.x + (b.target.x - b.hit.x) * lt
    by = b.hit.y + (b.target.y - b.hit.y) * lt
    scale = 1 + Math.sin(lt * Math.PI) * 0.45
  }

  const px = wx(bx)
  const py = wy(by)

  ctx.save()
  ctx.fillStyle = 'rgba(216, 243, 74, 0.32)'
  ctx.beginPath()
  ctx.arc(px, py, 6.5 * scale, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#d8f34a'
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(px, py, 3.8 * scale, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
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

  drawCourt(ctx)
  drawRoutes(ctx)
  drawMarks(ctx)
  drawPlayer(ctx)
  drawBall(ctx)
}

function jumpTo(value) {
  emit('jump', value)
}

function onCanvasClick(event) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const ratio = (event.clientY - rect.top) / rect.height
  // 点上半区靠后、下半区靠前，粗略按纵向位置映射进度
  emit('jump', Math.min(0.98, Math.max(0.02, ratio)))
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

watch(() => [props.scenarioId, props.progress, showMarks.value], schedule)

onMounted(() => {
  draw()
  schedule()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(schedule)
    if (wrapRef.value) ro.observe(wrapRef.value)
  }
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
})

defineExpose({ STEP_STYLE })
</script>

<style scoped>
.foot-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}

.demo-head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
}

.badge {
  display: inline-block;
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 2px 8px;
  border-radius: 999px;
}

.demo-head h2 {
  margin: 4px 0 0;
  font-size: 16px;
  color: #f4faf6;
}

.sub {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: #8fa9a0;
  max-width: 620px;
}

.head-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.zone {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(216, 243, 74, 0.15);
  color: #d8f34a;
}

.tag {
  font-size: 9.5px;
  color: #7f9a91;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  padding: 5px 8px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
  color: #a9c4b6;
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.legend i.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.legend i.ball {
  background: #d8f34a;
}

.legend i.attack {
  background: #22d3ee;
}

.legend i.recover {
  background: #fbbf24;
}

.lr {
  font-size: 8.5px;
  padding: 0 3px;
  border-radius: 3px;
  background: rgba(244, 63, 94, 0.25);
  color: #fda4af;
}

.lr.r {
  background: rgba(56, 189, 248, 0.25);
  color: #7dd3fc;
}

.fp-toggle {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 9.5px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #a9c4b6;
  cursor: pointer;
}

.fp-toggle.on {
  color: #d8f34a;
  border-color: rgba(216, 243, 74, 0.4);
}

.stage {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 0.88fr) minmax(0, 1fr);
  gap: 10px;
}

.canvas-wrap {
  position: relative;
  align-self: start;
  justify-self: center;
  width: 100%;
  max-width: calc((100vh - 260px) * 0.724);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #142d46;
  line-height: 0;
}

.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: pointer;
}

.phase-bar {
  position: absolute;
  top: 6px;
  left: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 9.5px;
  pointer-events: none;
}

.phase-chip {
  padding: 2px 7px;
  border-radius: 5px;
  background: #d8f34a;
  color: #10241b;
  font-weight: 700;
}

.cue {
  color: #7dd3fc;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-height: 0;
  overflow: auto;
}

.steps-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.steps-head h3 {
  margin: 0;
  font-size: 11px;
  color: #f2fbf2;
}

.steps-head span {
  font-size: 9px;
  color: #7f9a91;
}

.step {
  text-align: left;
  padding: 5px 7px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4b6;
  cursor: pointer;
}

.step.on {
  border-color: rgba(216, 243, 74, 0.55);
  background: linear-gradient(135deg, rgba(216, 243, 74, 0.14), rgba(56, 189, 248, 0.1));
}

.step-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.step-top b {
  font-size: 10.5px;
  color: #e6f4ec;
}

.step-top em {
  font-style: normal;
  font-size: 8.5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #7dd3fc;
}

.step p {
  margin: 2px 0 0;
  font-size: 9.5px;
  line-height: 1.5;
  color: #8fa9a0;
}

.coach {
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.coach span {
  font-size: 9.5px;
  font-weight: 700;
  color: #fbbf24;
}

.coach p {
  margin: 2px 0 0;
  font-size: 9.5px;
  line-height: 1.55;
  color: #cfe6da;
}

.stats {
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 4px 2px;
}

.stats div {
  display: flex;
  flex-direction: column;
}

.stats dt {
  font-size: 9px;
  color: #7f9a91;
}

.stats dd {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  color: #d8f34a;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

@media (max-width: 1180px) {
  .stage {
    grid-template-columns: 1fr;
  }

  .canvas-wrap {
    max-width: 340px;
    margin: 0 auto;
  }
}
</style>
