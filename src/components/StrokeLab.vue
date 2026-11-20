<template>
  <div class="stroke-lab">
    <!-- 顶部模块切换 -->
    <div class="module-tabs">
      <button
        v-for="tab in TABS"
        :key="tab.id"
        type="button"
        :class="{ on: tabId === tab.id }"
        @click="tabId = tab.id"
      >{{ tab.name }}</button>
    </div>

    <!-- 致命正手 -->
    <template v-if="tabId === 'forehand'">
      <div class="stat-row">
        <div v-for="item in fhStats" :key="item.label" class="stat" :style="{ borderLeftColor: item.color }">
          <span class="stat-label">{{ item.label }}</span>
          <b>{{ item.value }}<em>{{ item.unit }}</em></b>
          <span class="stat-note">{{ item.note }}</span>
        </div>
      </div>

      <div class="canvas-row">
        <div class="canvas-card">
          <div class="card-head">
            <span class="fig">FIG 1.1 · 身体动力学几何</span>
            <span class="h2">X-Factor 扭转滞后与雨刷挥拍轨迹</span>
          </div>
          <div ref="fhKinRef" class="canvas-wrap">
            <canvas ref="fhKinCanvas"></canvas>
            <div class="hud">
              <span class="cyan">髋肩分离角 <b>{{ fh.xFactor }}°</b></span>
              <span class="volt">拍头滞后角 <b>{{ fh.lag }}°</b></span>
              <span class="coral">雨刷仰角 <b>{{ fh.wiper }}°</b></span>
            </div>
          </div>
          <p class="caption">
            <b>几何原理：</b>现代致命正手是「双摆鞭打模型」。髋部先于肩部旋转，形成 <i>X-Factor</i> 弹性势能；
            随后的拍头下坠让球拍重心偏离前臂旋转轴，通过内旋前臂产生陡峭的雨刷式螺旋上升弧线。
          </p>
        </div>

        <div class="canvas-card wide">
          <div class="card-head">
            <span class="fig cyan">FIG 1.2 · 流体力学与弹道学</span>
            <span class="h2">马格努斯效应与急坠抛物线</span>
          </div>
          <div ref="fhTrajRef" class="canvas-wrap">
            <canvas ref="fhTrajCanvas"></canvas>
            <div class="vec-key">
              <span class="volt">→ 速度矢量 v</span>
              <span class="coral">↓ 马格努斯力 F_M</span>
              <span class="cyan">↻ 旋转角速度 ω</span>
            </div>
          </div>
          <div class="sliders">
            <div class="slider">
              <label>挥拍线速度 <b class="volt">{{ fhSpeed }} km/h</b></label>
              <input type="range" min="90" max="175" step="1" :value="fhSpeed" @input="onFh('speed', $event)" />
            </div>
            <div class="slider">
              <label>刷球仰角 <b class="cyan">{{ fhBrush }}°</b></label>
              <input type="range" class="cyan" min="10" max="50" step="1" :value="fhBrush" @input="onFh('brush', $event)" />
            </div>
            <div class="slider">
              <label>击球点高度 <b class="coral">{{ fhHeight.toFixed(2) }} m</b></label>
              <input type="range" class="coral" min="0.65" max="1.55" step="0.05" :value="fhHeight" @input="onFh('height', $event)" />
            </div>
          </div>
        </div>
      </div>

      <div class="cards">
        <article v-for="card in FH_CARDS" :key="card.tag" class="math-card">
          <span class="tag">{{ card.tag }}</span>
          <h3>{{ card.title }}</h3>
          <div class="formula">{{ card.formula }}</div>
          <p>{{ card.body }}</p>
        </article>
      </div>
    </template>

    <!-- 弹道反手 -->
    <template v-else-if="tabId === 'backhand'">
      <div class="type-switch">
        <div>
          <h3>弹道反手几何构型</h3>
          <p>切换单手反拍（大半径螺旋离心）与双手反拍（双杠杆闭合直线弹道）</p>
        </div>
        <div class="type-btns">
          <button
            v-for="item in bhTypeList"
            :key="item.id"
            type="button"
            :class="{ on: bhType === item.id }"
            :style="bhType === item.id ? { background: item.color, borderColor: item.color, color: '#0b1120' } : {}"
            @click="setBhType(item.id)"
          >{{ item.name }} · {{ item.en }}</button>
        </div>
      </div>

      <div class="stat-row">
        <div v-for="item in bhStats" :key="item.label" class="stat" :style="{ borderLeftColor: item.color }">
          <span class="stat-label">{{ item.label }}</span>
          <b>{{ item.value }}<em>{{ item.unit }}</em></b>
          <span class="stat-note">{{ item.note }}</span>
        </div>
      </div>

      <div class="canvas-row">
        <div class="canvas-card">
          <div class="card-head">
            <span class="fig cyan">FIG 2.1 · 俯视杠杆与球场切线</span>
            <span class="h2">{{ bh.cfg.title }}</span>
          </div>
          <div ref="bhGeoRef" class="canvas-wrap">
            <canvas ref="bhGeoCanvas"></canvas>
            <div class="hud">
              <span class="cyan">构型 <b>{{ bhType === '1hbh' ? '1HBH' : '2HBH' }}</b></span>
              <span class="volt">击球偏航角 <b>{{ bhYaw }}°</b></span>
              <span class="coral">击球点前移 <b>{{ bh.cfg.contactAdvance }}</b></span>
            </div>
          </div>
          <p class="caption" :class="bhType === '1hbh' ? 'cyan' : 'coral'">{{ bh.cfg.desc }}</p>
        </div>

        <div class="canvas-card wide">
          <div class="card-head">
            <span class="fig coral">FIG 2.2 · 弹道学与低平穿透曲线</span>
            <span class="h2">反手炮弹式平击 / 微上旋低空弹道</span>
          </div>
          <div ref="bhBalRef" class="canvas-wrap">
            <canvas ref="bhBalCanvas"></canvas>
            <div class="vec-key right">
              <span>最低过网余量 <b :class="bh.netClear >= 0 ? 'volt' : 'coral'">{{ bh.netClear >= 0 ? '+' : '' }}{{ bh.netClear.toFixed(2) }} m</b></span>
            </div>
          </div>
          <div class="sliders">
            <div class="slider">
              <label>转体扭矩输出 <b class="cyan">{{ bhPower }} km/h</b></label>
              <input type="range" class="cyan" min="90" max="165" step="1" :value="bhPower" @input="onBh('power', $event)" />
            </div>
            <div class="slider">
              <label>弹道出射仰角 <b class="volt">{{ bhLaunch.toFixed(1) }}°</b></label>
              <input type="range" min="5" max="22" step="0.5" :value="bhLaunch" @input="onBh('launch', $event)" />
            </div>
            <div class="slider">
              <label>线路几何（直→斜）<b class="coral">{{ bhYaw }}°</b></label>
              <input type="range" class="coral" min="0" max="24" step="1" :value="bhYaw" @input="onBh('yaw', $event)" />
            </div>
          </div>
        </div>
      </div>

      <div class="cards">
        <article v-for="card in BH_CARDS" :key="card.tag" class="math-card">
          <span class="tag">{{ card.tag }}</span>
          <h3>{{ card.title }}</h3>
          <div class="formula">{{ card.formula }}</div>
          <p>{{ card.body }}</p>
        </article>
      </div>
    </template>

    <!-- 几何对比 -->
    <template v-else>
      <div class="compare-wrap">
        <div class="compare-head">
          <span class="fig volt">BIOMECHANICAL & GEOMETRIC SYNTHESIS</span>
          <h3>致命正手 vs 弹道反手：数学物理特征对比</h3>
          <p>从转动惯量、击球点空间坐标到空气动力学轨迹的系统性参数对照</p>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>物理 / 几何维度</th>
                <th class="volt">致命正手</th>
                <th class="cyan">单手反拍</th>
                <th class="coral">双手反拍</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in COMPARE_ROWS" :key="row.dim">
                <td class="dim">{{ row.dim }}</td>
                <td :class="row.mono ? 'mono volt' : ''">{{ row.fh }}</td>
                <td :class="row.mono ? 'mono cyan' : ''">{{ row.h1 }}</td>
                <td :class="row.mono ? 'mono coral' : ''">{{ row.h2 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  BH_CARDS,
  BH_DEFAULTS,
  BH_TYPES,
  COMPARE_ROWS,
  FH_CARDS,
  FH_DEFAULTS,
  computeBackhand,
  computeForehand
} from '../tennis/stroke.js'

const TABS = [
  { id: 'forehand', name: '模块一：致命正手' },
  { id: 'backhand', name: '模块二：弹道反手' },
  { id: 'compare', name: '几何对比矩阵' }
]

const tabId = ref('forehand')

const emit = defineEmits(['stats'])

// 正手状态
const fhSpeed = ref(FH_DEFAULTS.speed)
const fhBrush = ref(FH_DEFAULTS.brush)
const fhHeight = ref(FH_DEFAULTS.height)
const fh = computed(() => computeForehand({ speed: fhSpeed.value, brush: fhBrush.value, height: fhHeight.value }))

const fhStats = computed(() => [
  { label: '球拍线速度', value: fh.value.speed, unit: ' km/h', note: '双摆末端角动量释放 v = ω·r', color: '#d8f34a' },
  { label: '上旋角速度', value: fh.value.rpm, unit: ' rpm', note: '刷球切向分力 F_t = F·sin α', color: '#5ec8ff' },
  { label: '过网安全高度', value: '+' + fh.value.netClear.toFixed(2), unit: ' m', note: '马格努斯下压加速度 a_M', color: '#ff8a80' },
  { label: '二跳弹射角', value: fh.value.bounceAngle, unit: '°', note: '强上旋产生向前向上的重炮二跳', color: '#ffcf8a' }
])

// 反手状态
const bhType = ref(BH_DEFAULTS.type)
const bhPower = ref(BH_DEFAULTS.power)
const bhLaunch = ref(BH_DEFAULTS.launch)
const bhYaw = ref(BH_DEFAULTS.yaw)
const bhTypeList = [BH_TYPES['1hbh'], BH_TYPES['2hbh']]
const bh = computed(() => computeBackhand({ type: bhType.value, power: bhPower.value, launch: bhLaunch.value, yaw: bhYaw.value }))

const bhStats = computed(() => [
  { label: '有效力臂半径', value: bh.value.radius.toFixed(2), unit: ' m', note: bh.value.cfg.radiusDesc, color: '#5ec8ff' },
  { label: '弹道出射仰角', value: bhLaunch.value.toFixed(1), unit: '°', note: '低平贴网弹道压缩对手反应时间', color: '#d8f34a' },
  { label: '球场几何射界', value: bh.value.courtDist.toFixed(2), unit: ' m', note: bhYaw.value > 10 ? `斜线几何增益 +${bh.value.diagonalGain.toFixed(2)} m` : '直线最短路径（高风险高收益）', color: '#ff8a80' },
  { label: '飞抵底线耗时', value: bh.value.flightTime.toFixed(2), unit: ' s', note: '高初速低弧度带来的穿透力', color: '#ffcf8a' }
])

// 画布
const fhKinRef = ref(null)
const fhKinCanvas = ref(null)
const fhTrajRef = ref(null)
const fhTrajCanvas = ref(null)
const bhGeoRef = ref(null)
const bhGeoCanvas = ref(null)
const bhBalRef = ref(null)
const bhBalCanvas = ref(null)

// 动画时间
let tFh = 0
let tBh = 0
const playing = ref(true)
const slowMo = ref(false)

function onFh(key, event) {
  const v = Number(event.target.value)
  if (key === 'speed') fhSpeed.value = v
  if (key === 'brush') fhBrush.value = v
  if (key === 'height') fhHeight.value = v
}

function onBh(key, event) {
  const v = Number(event.target.value)
  if (key === 'power') bhPower.value = v
  if (key === 'launch') bhLaunch.value = v
  if (key === 'yaw') bhYaw.value = v
}

function setBhType(id) {
  bhType.value = id
}

function setPlaying(v) {
  playing.value = v
}

function setSlow(v) {
  slowMo.value = v
}

/* —— 画布工具 —— */
function setup(canvas) {
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  const dpr = window.devicePixelRatio || 1
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w: rect.width, h: rect.height }
}

function arrow(ctx, x1, y1, x2, y2, color, width = 2, head = 7) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
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

/* —— FIG 1.1 正手动力链 —— */
function drawFhKin(t) {
  const s = setup(fhKinCanvas.value)
  if (!s) return
  const { ctx, w, h } = s
  ctx.clearRect(0, 0, w, h)

  const cx = w * 0.46
  const cy = h * 0.54
  const sc = Math.min(w, h) / 360
  const phase = (t % 3.2) / 3.2

  // 极坐标背景
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let r = 45; r <= 145; r += 33) {
    ctx.beginPath()
    ctx.arc(cx, cy, r * sc, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(cx - 155 * sc, cy)
  ctx.lineTo(cx + 155 * sc, cy)
  ctx.moveTo(cx, cy - 155 * sc)
  ctx.lineTo(cx, cy + 155 * sc)
  ctx.stroke()
  ctx.restore()

  const hipAngle = -0.65 + Math.sin(phase * Math.PI * 1.15) * 1.25
  const shoulderLag = Math.sin(phase * Math.PI) * 0.65
  const shoulderAngle = hipAngle - shoulderLag
  const armAngle = shoulderAngle - 0.35 + Math.pow(phase, 1.8) * 2.1
  const wristLag = Math.sin(Math.min(1, phase * 1.4) * Math.PI) * 1.28
  const racquetAngle = armAngle - wristLag

  // 雨刷轨迹包络
  ctx.save()
  ctx.beginPath()
  let started = false
  for (let p = 0.15; p <= 0.92; p += 0.02) {
    const hA = -0.65 + Math.sin(p * Math.PI * 1.15) * 1.25
    const sA = hA - Math.sin(p * Math.PI) * 0.65
    const aA = sA - 0.35 + Math.pow(p, 1.8) * 2.1
    const wL = Math.sin(Math.min(1, p * 1.4) * Math.PI) * 1.28
    const rA = aA - wL
    const sx = cx + Math.cos(sA) * 38 * sc
    const sy = cy + Math.sin(sA) * 38 * sc
    const hx = sx + Math.cos(aA) * 52 * sc
    const hy = sy + Math.sin(aA) * 52 * sc
    const tx = hx + Math.cos(rA) * 68 * sc
    const ty = hy + Math.sin(rA) * 68 * sc
    if (!started) {
      ctx.moveTo(tx, ty)
      started = true
    } else {
      ctx.lineTo(tx, ty)
    }
  }
  ctx.strokeStyle = 'rgba(216,243,74,0.26)'
  ctx.lineWidth = 4 * sc
  ctx.stroke()
  ctx.restore()

  // 髋（青）
  const hipW = 32 * sc
  ctx.save()
  ctx.strokeStyle = '#5ec8ff'
  ctx.lineWidth = 5 * sc
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - Math.cos(hipAngle) * hipW, cy - Math.sin(hipAngle) * hipW)
  ctx.lineTo(cx + Math.cos(hipAngle) * hipW, cy + Math.sin(hipAngle) * hipW)
  ctx.stroke()

  // X-Factor 扇形
  const shW = 40 * sc
  ctx.fillStyle = 'rgba(94,200,255,0.14)'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.arc(cx, cy, 42 * sc, Math.min(hipAngle, shoulderAngle), Math.max(hipAngle, shoulderAngle))
  ctx.closePath()
  ctx.fill()

  // 肩（珊瑚）
  const sx2 = cx + Math.cos(shoulderAngle) * shW
  const sy2 = cy + Math.sin(shoulderAngle) * shW
  ctx.strokeStyle = '#ff3366'
  ctx.lineWidth = 6 * sc
  ctx.beginPath()
  ctx.moveTo(cx - Math.cos(shoulderAngle) * shW, cy - Math.sin(shoulderAngle) * shW)
  ctx.lineTo(sx2, sy2)
  ctx.stroke()

  // 手臂
  const handX = sx2 + Math.cos(armAngle) * 52 * sc
  const handY = sy2 + Math.sin(armAngle) * 52 * sc
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 4 * sc
  ctx.beginPath()
  ctx.moveTo(sx2, sy2)
  ctx.lineTo(handX, handY)
  ctx.stroke()

  // 拍头滞后扇形
  const tipX = handX + Math.cos(racquetAngle) * 68 * sc
  const tipY = handY + Math.sin(racquetAngle) * 68 * sc
  ctx.fillStyle = 'rgba(216,243,74,0.18)'
  ctx.beginPath()
  ctx.moveTo(handX, handY)
  ctx.arc(handX, handY, 34 * sc, Math.min(armAngle, racquetAngle), Math.max(armAngle, racquetAngle))
  ctx.closePath()
  ctx.fill()

  // 球拍
  ctx.strokeStyle = '#d8f34a'
  ctx.lineWidth = 3.5 * sc
  ctx.beginPath()
  ctx.moveTo(handX, handY)
  ctx.lineTo(tipX, tipY)
  ctx.stroke()

  const headCx = handX + Math.cos(racquetAngle) * 52 * sc
  const headCy = handY + Math.sin(racquetAngle) * 52 * sc
  ctx.save()
  ctx.translate(headCx, headCy)
  ctx.rotate(racquetAngle)
  ctx.strokeStyle = '#d8f34a'
  ctx.fillStyle = 'rgba(216,243,74,0.15)'
  ctx.lineWidth = 2.5 * sc
  ctx.beginPath()
  ctx.ellipse(0, 0, 18 * sc, 11 * sc, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.restore()

  // 关节点
  for (const pt of [
    { x: cx, y: cy, c: '#ffffff', r: 5 },
    { x: sx2, y: sy2, c: '#ff3366', r: 4.5 },
    { x: handX, y: handY, c: '#5ec8ff', r: 4.5 },
    { x: tipX, y: tipY, c: '#d8f34a', r: 5 }
  ]) {
    ctx.fillStyle = pt.c
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, pt.r * sc, 0, Math.PI * 2)
    ctx.fill()
  }

  // 球沿挥拍路线进拍面中心，击球相位与拍头重合，然后沿拍面方向离开
  const hitPhase = 0.58
  const hitHip = -0.65 + Math.sin(hitPhase * Math.PI * 1.15) * 1.25
  const hitSh = hitHip - Math.sin(hitPhase * Math.PI) * 0.65
  const hitArm = hitSh - 0.35 + Math.pow(hitPhase, 1.8) * 2.1
  const hitRac = hitArm - Math.sin(Math.min(1, hitPhase * 1.4) * Math.PI) * 1.28
  const hitHandX = cx + Math.cos(hitSh) * 40 * sc + Math.cos(hitArm) * 52 * sc
  const hitHandY = cy + Math.sin(hitSh) * 40 * sc + Math.sin(hitArm) * 52 * sc
  const hitX = hitHandX + Math.cos(hitRac) * 52 * sc
  const hitY = hitHandY + Math.sin(hitRac) * 52 * sc
  const fromX = hitX + 84 * sc
  const fromY = hitY + 36 * sc
  let ballX
  let ballY
  if (phase <= hitPhase) {
    const u = phase / hitPhase
    const e = u * u * (3 - 2 * u)
    ballX = fromX + (hitX - fromX) * e
    ballY = fromY + (hitY - fromY) * e
  } else {
    const u = (phase - hitPhase) / (1 - hitPhase)
    ballX = hitX + Math.cos(hitRac) * 96 * sc * u
    ballY = hitY + Math.sin(hitRac) * 96 * sc * u
  }
  const isImpact = Math.abs(phase - hitPhase) < 0.05
  ctx.fillStyle = isImpact ? '#f7fff2' : '#d8f34a'
  ctx.beginPath()
  ctx.arc(ballX, ballY, (isImpact ? 8 : 6) * sc, 0, Math.PI * 2)
  ctx.fill()
  if (isImpact) {
    ctx.strokeStyle = '#d8f34a'
    ctx.lineWidth = 2 * sc
    ctx.beginPath()
    ctx.arc(ballX, ballY, 13 * sc, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#9ca3af'
  ctx.font = `${10 * sc}px ui-monospace, monospace`
  ctx.fillText('击球点', hitX - 18 * sc, hitY + 20 * sc)
  ctx.restore()
}

/* —— FIG 1.2 正手弹道 —— */
function drawFhTraj(t) {
  const s = setup(fhTrajCanvas.value)
  if (!s) return
  const { ctx, w, h } = s
  ctx.clearRect(0, 0, w, h)

  const padL = 34
  const padR = 22
  const padT = 26
  const padB = 32
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const maxX = 25.5
  const maxY = 3.8
  const px = (xm) => padL + ((xm + 0.8) / maxX) * plotW
  const py = (ym) => h - padB - (ym / maxY) * plotH

  const groundY = py(0)
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padL, groundY)
  ctx.lineTo(w - padR, groundY)
  ctx.stroke()

  const marks = [
    { x: 0, label: '底线 0m', color: 'rgba(255,255,255,0.28)' },
    { x: 11.885, label: '球网 0.914m', color: '#5ec8ff' },
    { x: 23.77, label: '对方底线', color: 'rgba(255,255,255,0.28)' }
  ]
  for (const m of marks) {
    ctx.strokeStyle = m.color
    ctx.setLineDash(m.x === 11.885 ? [] : [3, 3])
    ctx.beginPath()
    ctx.moveTo(px(m.x), groundY)
    ctx.lineTo(px(m.x), m.x === 11.885 ? py(0.914) : padT)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = m.x === 11.885 ? '#5ec8ff' : '#9ca3af'
    ctx.font = '9.5px ui-monospace, monospace'
    ctx.fillText(m.label, px(m.x) - 24, groundY + 13)
  }

  const r = fh.value
  const v0 = r.speed / 3.6
  const launchRad = (r.launchDeg * Math.PI) / 180
  const vx0 = v0 * Math.cos(launchRad)
  const vy0 = v0 * Math.sin(launchRad)
  const g = 9.81

  // 无旋转对比
  ctx.save()
  ctx.strokeStyle = 'rgba(156,163,175,0.35)'
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 1.5
  ctx.beginPath()
  let began = false
  for (let dt = 0; dt <= 1.6; dt += 0.02) {
    const x = vx0 * dt
    const y = r.height + vy0 * dt - 0.5 * g * dt * dt
    if (y < 0 || x > 24.8) break
    if (!began) {
      ctx.moveTo(px(x), py(y))
      began = true
    } else {
      ctx.lineTo(px(x), py(y))
    }
  }
  ctx.stroke()
  ctx.restore()

  // 上旋轨迹（含二跳）
  const traj = []
  let bounceX = null
  let bounceVx = 0
  let bounceVy = 0
  let bounceT = 0
  for (let dt = 0; dt <= 1.8; dt += 0.012) {
    if (bounceX === null) {
      const x = vx0 * dt
      const y = r.height + vy0 * dt - 0.5 * (g + r.magnusAcc) * dt * dt
      if (y <= 0 && dt > 0.05) {
        bounceX = x
        bounceT = dt
        const vyImpact = Math.abs(vy0 - (g + r.magnusAcc) * dt)
        bounceVx = vx0 * 0.86 + (r.rpm / 3500) * 3.5
        bounceVy = vyImpact * 0.78
        traj.push({ x, y: 0, phase: 'bounce' })
      } else {
        traj.push({ x, y, phase: 'flight' })
      }
    } else {
      const dt2 = dt - bounceT
      const x = bounceX + bounceVx * dt2
      const y = bounceVy * dt2 - 0.5 * g * dt2 * dt2
      if (y < 0 || x > 24.8) break
      traj.push({ x, y, phase: 'kick' })
    }
  }

  ctx.save()
  ctx.strokeStyle = '#d8f34a'
  ctx.lineWidth = 2.8
  ctx.shadowColor = 'rgba(216,243,74,0.4)'
  ctx.shadowBlur = 8
  ctx.beginPath()
  traj.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(px(pt.x), py(pt.y))
    else ctx.lineTo(px(pt.x), py(pt.y))
  })
  ctx.stroke()
  ctx.restore()

  if (bounceX !== null) {
    const inCourt = bounceX <= 23.77
    ctx.fillStyle = inCourt ? '#d8f34a' : '#ff6b5a'
    ctx.beginPath()
    ctx.arc(px(bounceX), groundY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = 'bold 10.5px ui-monospace, monospace'
    ctx.fillText(`${inCourt ? 'IN' : 'OUT'} (${bounceX.toFixed(1)}m)`, px(bounceX) - 26, groundY - 9)
  }

  // 动画球
  const idx = Math.floor(((t % 2.4) / 2.4) * Math.max(1, traj.length - 1))
  const cur = traj[idx]
  if (cur) {
    const cxp = px(cur.x)
    const cyp = py(cur.y)
    ctx.fillStyle = '#d8f34a'
    ctx.beginPath()
    ctx.arc(cxp, cyp, 6.5, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#5ec8ff'
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(cxp, cyp, 11, -Math.PI * 0.8, Math.PI * 0.2)
    ctx.stroke()

    if (cur.phase === 'flight') {
      const len = 16 + (r.rpm / 4500) * 22
      arrow(ctx, cxp, cyp + 7, cxp, cyp + 7 + len, '#ff3366', 2.2, 6)
      ctx.fillStyle = '#ff3366'
      ctx.font = 'bold 9.5px ui-monospace, monospace'
      ctx.fillText('F_M', cxp + 7, cyp + 14 + len * 0.5)
    }
  }
}

/* —— FIG 2.1 反手几何 —— */
function drawBhGeo(t) {
  const s = setup(bhGeoCanvas.value)
  if (!s) return
  const { ctx, w, h } = s
  ctx.clearRect(0, 0, w, h)

  const is1 = bhType.value === '1hbh'
  const phase = (t % 2.8) / 2.8
  const splitX = w * 0.44

  // 左：杠杆几何
  const gx = splitX * 0.48
  const gy = h * 0.55
  const sc = Math.min(splitX, h) / 260
  const radius = (is1 ? 92 : 72) * sc

  ctx.save()
  ctx.strokeStyle = is1 ? 'rgba(94,200,255,0.22)' : 'rgba(255,51,102,0.22)'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.arc(gx, gy, radius, -Math.PI * 0.85, Math.PI * 0.35)
  ctx.stroke()
  ctx.setLineDash([])

  const prog = Math.sin(phase * Math.PI * 0.85)
  const torso = -0.4 + prog * 0.85
  const arm = -2.1 + prog * 2.5

  const shR = 26 * sc
  const sLeadX = gx + Math.cos(torso) * shR
  const sLeadY = gy + Math.sin(torso) * shR
  const sTrailX = gx - Math.cos(torso) * shR
  const sTrailY = gy - Math.sin(torso) * shR

  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 5 * sc
  ctx.beginPath()
  ctx.moveTo(sTrailX, sTrailY)
  ctx.lineTo(sLeadX, sLeadY)
  ctx.stroke()

  if (is1) {
    const handX = sLeadX + Math.cos(arm) * 44 * sc
    const handY = sLeadY + Math.sin(arm) * 44 * sc
    const tipX = handX + Math.cos(arm - 0.15) * 48 * sc
    const tipY = handY + Math.sin(arm - 0.15) * 48 * sc
    const balA = arm + Math.PI * 0.85
    const balX = sTrailX + Math.cos(balA) * 42 * sc
    const balY = sTrailY + Math.sin(balA) * 42 * sc

    ctx.strokeStyle = '#5ec8ff'
    ctx.lineWidth = 3 * sc
    ctx.beginPath()
    ctx.moveTo(sTrailX, sTrailY)
    ctx.lineTo(balX, balY)
    ctx.stroke()

    ctx.strokeStyle = '#d8f34a'
    ctx.lineWidth = 3.5 * sc
    ctx.beginPath()
    ctx.moveTo(sLeadX, sLeadY)
    ctx.lineTo(handX, handY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()

    ctx.fillStyle = '#5ec8ff'
    ctx.font = `${9.5 * sc}px ui-monospace, monospace`
    ctx.fillText('R=1.42m', (sLeadX + tipX) * 0.5 - 14, (sLeadY + tipY) * 0.5 - 10)
    ctx.fillText('平衡翼', balX - 16, balY + 13)
  } else {
    const handX = gx + Math.cos(arm) * 46 * sc
    const handY = gy + Math.sin(arm) * 46 * sc
    const tipX = handX + Math.cos(arm) * 46 * sc
    const tipY = handY + Math.sin(arm) * 46 * sc

    ctx.fillStyle = 'rgba(255,51,102,0.22)'
    ctx.strokeStyle = '#ff3366'
    ctx.lineWidth = 3 * sc
    ctx.beginPath()
    ctx.moveTo(sLeadX, sLeadY)
    ctx.lineTo(handX, handY)
    ctx.lineTo(sTrailX, sTrailY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    ctx.strokeStyle = '#d8f34a'
    ctx.lineWidth = 3.5 * sc
    ctx.beginPath()
    ctx.moveTo(handX, handY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()

    ctx.fillStyle = '#ff3366'
    ctx.font = `${9.5 * sc}px ui-monospace, monospace`
    ctx.fillText('刚体三角', handX - 18, handY - 11)
  }
  ctx.restore()

  // 右：微型俯视球场切线
  const cw = (w - splitX) * 0.62
  const ch = h * 0.76
  const x0 = splitX + ((w - splitX) - cw) * 0.55
  const y0 = (h - ch) * 0.5

  ctx.save()
  ctx.fillStyle = 'rgba(94,200,255,0.04)'
  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineWidth = 1.4
  ctx.fillRect(x0, y0, cw, ch)
  ctx.strokeRect(x0, y0, cw, ch)

  const netY = y0 + ch * 0.5
  const srvTop = y0 + ch * 0.23
  const srvBot = y0 + ch * 0.77
  ctx.beginPath()
  ctx.moveTo(x0, srvTop)
  ctx.lineTo(x0 + cw, srvTop)
  ctx.moveTo(x0, srvBot)
  ctx.lineTo(x0 + cw, srvBot)
  ctx.moveTo(x0 + cw * 0.5, srvTop)
  ctx.lineTo(x0 + cw * 0.5, srvBot)
  ctx.stroke()

  ctx.strokeStyle = '#5ec8ff'
  ctx.lineWidth = 2.4
  ctx.beginPath()
  ctx.moveTo(x0 - 5, netY)
  ctx.lineTo(x0 + cw + 5, netY)
  ctx.stroke()

  const ox = x0 + cw * 0.16
  const oy = y0 + ch * 0.94
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  ctx.moveTo(ox, oy)
  ctx.lineTo(ox, y0 + ch * 0.06)
  ctx.stroke()
  ctx.setLineDash([])

  const yawRad = (bhYaw.value * Math.PI) / 180
  const ty = y0 + ch * 0.06
  const dy = oy - ty
  const tx = Math.min(x0 + cw * 0.95, ox + Math.tan(yawRad) * dy)
  arrow(ctx, ox, oy, tx, ty, '#d8f34a', 2.4, 8)

  ctx.fillStyle = '#d8f34a'
  ctx.font = '9.5px ui-monospace, monospace'
  ctx.fillText(`θ=${bhYaw.value}°`, ox + 7, oy - 22)
  ctx.restore()
}

/* —— FIG 2.2 反手弹道 —— */
function drawBhBal(t) {
  const s = setup(bhBalCanvas.value)
  if (!s) return
  const { ctx, w, h } = s
  ctx.clearRect(0, 0, w, h)

  const padL = 32
  const padR = 20
  const padT = 26
  const padB = 32
  const plotW = w - padL - padR
  const plotH = h - padT - padB
  const maxX = 26
  const maxY = 3.2
  const px = (xm) => padL + ((xm + 0.5) / maxX) * plotW
  const py = (ym) => h - padB - (ym / maxY) * plotH

  const groundY = py(0)
  ctx.strokeStyle = '#374151'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(padL, groundY)
  ctx.lineTo(w - padR, groundY)
  ctx.stroke()

  const yawRad = (bhYaw.value * Math.PI) / 180
  const courtLen = 23.77 / Math.cos(yawRad)
  const netDist = 11.885 / Math.cos(yawRad)

  const marks = [
    { x: 0, label: '击球点', color: 'rgba(255,255,255,0.28)', net: false },
    { x: netDist, label: '球网', color: '#5ec8ff', net: true },
    { x: courtLen, label: `底线 ${courtLen.toFixed(1)}m`, color: 'rgba(255,255,255,0.28)', net: false }
  ]
  for (const m of marks) {
    ctx.strokeStyle = m.color
    ctx.setLineDash(m.net ? [] : [3, 3])
    ctx.beginPath()
    ctx.moveTo(px(m.x), groundY)
    ctx.lineTo(px(m.x), m.net ? py(0.914) : padT)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = m.net ? '#5ec8ff' : '#9ca3af'
    ctx.font = '9.5px ui-monospace, monospace'
    ctx.fillText(m.label, px(m.x) - 20, groundY + 13)
  }

  const r = bh.value
  const v0 = r.power / 3.6
  const launchRad = (r.launch * Math.PI) / 180
  const vx0 = v0 * Math.cos(launchRad)
  const vy0 = v0 * Math.sin(launchRad)

  const pts = []
  let landX = null
  for (let dt = 0; dt <= 1.5; dt += 0.01) {
    const x = vx0 * dt
    const y = 0.98 + vy0 * dt - 0.5 * (9.81 + r.cfg.spinAcc) * dt * dt
    if (y <= 0 && dt > 0.05) {
      landX = x
      pts.push({ x, y: 0 })
      break
    }
    pts.push({ x, y })
  }

  const main = bhType.value === '1hbh' ? '#5ec8ff' : '#ff3366'
  ctx.save()
  ctx.strokeStyle = main
  ctx.lineWidth = 2.8
  ctx.shadowColor = main
  ctx.shadowBlur = 10
  ctx.beginPath()
  pts.forEach((p, i) => {
    if (i === 0) ctx.moveTo(px(p.x), py(p.y))
    else ctx.lineTo(px(p.x), py(p.y))
  })
  ctx.stroke()
  ctx.restore()

  if (landX !== null) {
    const inCourt = landX <= courtLen
    ctx.fillStyle = inCourt ? '#d8f34a' : '#ff3366'
    ctx.beginPath()
    ctx.arc(px(landX), groundY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = 'bold 10.5px ui-monospace, monospace'
    ctx.fillText(`${inCourt ? 'IN' : 'OUT'} (${landX.toFixed(1)}m)`, px(landX) - 26, groundY - 9)
  }

  const idx = Math.floor(((t % 1.8) / 1.8) * Math.max(1, pts.length - 1))
  const cur = pts[idx]
  const next = pts[Math.min(pts.length - 1, idx + 2)] || cur
  if (cur && next) {
    const cx = px(cur.x)
    const cy = py(cur.y)
    ctx.fillStyle = '#d8f34a'
    ctx.beginPath()
    ctx.arc(cx, cy, 6, 0, Math.PI * 2)
    ctx.fill()
    const ang = Math.atan2(py(next.y) - cy, px(next.x) - cx)
    arrow(ctx, cx, cy, cx + Math.cos(ang) * 30, cy + Math.sin(ang) * 30, '#d8f34a', 2, 6)
  }
}

/* —— 动画循环 —— */
let raf = 0
let last = 0

function loop(now) {
  raf = requestAnimationFrame(loop)
  if (!last) last = now
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  if (tabId.value === 'forehand') {
    if (playing.value) tFh += dt * (slowMo.value ? 0.25 : 1)
    drawFhKin(tFh)
    drawFhTraj(tFh)
  } else if (tabId.value === 'backhand') {
    if (playing.value) tBh += dt * (slowMo.value ? 0.25 : 1)
    drawBhGeo(tBh)
    drawBhBal(tBh)
  }
}

function redraw() {
  if (tabId.value === 'forehand') {
    drawFhKin(tFh)
    drawFhTraj(tFh)
  } else if (tabId.value === 'backhand') {
    drawBhGeo(tBh)
    drawBhBal(tBh)
  }
}

let ro = null

watch([tabId, fh, bh, bhType], () => {
  emit('stats', { fh: fh.value, bh: bh.value, tab: tabId.value })
  requestAnimationFrame(redraw)
})

watch(
  [fh, bh],
  () => emit('stats', { fh: fh.value, bh: bh.value, tab: tabId.value }),
  { immediate: true }
)

onMounted(() => {
  raf = requestAnimationFrame(loop)
  redraw()
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => redraw())
    for (const el of [fhKinRef.value, fhTrajRef.value, bhGeoRef.value, bhBalRef.value]) {
      if (el) ro.observe(el)
    }
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
})

defineExpose({ fh, bh, setPlaying, setSlow, tab: tabId })
</script>

<style scoped>
.stroke-lab {
  position: absolute;
  left: 232px;
  top: 58px;
  bottom: 92px;
  right: 14px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 20, 24, 0.94);
  backdrop-filter: blur(8px);
  overflow: auto;
  color: #e6f4ec;
}

.module-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.module-tabs button {
  flex: 1;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: #8fa9a0;
  cursor: pointer;
}

.module-tabs button.on {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 6px 9px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left-width: 3px;
  background: rgba(255, 255, 255, 0.04);
}

.stat-label {
  font-size: 9.5px;
  color: #8fa9a0;
}

.stat b {
  font-size: 19px;
  font-weight: 800;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #f4faf6;
}

.stat b em {
  font-style: normal;
  font-size: 10px;
  font-weight: 600;
  color: #8fa9a0;
  margin-left: 2px;
}

.stat-note {
  font-size: 9px;
  color: #6f8a81;
  line-height: 1.4;
}

.canvas-row {
  display: grid;
  grid-template-columns: minmax(0, 0.78fr) minmax(0, 1fr);
  gap: 10px;
}

.canvas-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.fig {
  font-size: 8.5px;
  letter-spacing: 0.08em;
  color: #d8f34a;
}

.fig.cyan {
  color: #5ec8ff;
}

.fig.coral {
  color: #ff8a80;
}

.fig.volt {
  color: #d8f34a;
}

.h2 {
  font-size: 11.5px;
  font-weight: 700;
  color: #f4faf6;
}

.canvas-wrap {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: rgba(3, 14, 18, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.07);
  height: 220px;
  flex: none;
}

.canvas-wrap canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.hud {
  position: absolute;
  left: 6px;
  right: 6px;
  bottom: 5px;
  display: flex;
  justify-content: space-between;
  gap: 6px;
  padding: 2px 7px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  font-size: 8.5px;
  color: #8fa9a0;
}

.hud b {
  color: #e6f4ec;
}

.cyan {
  color: #5ec8ff;
}

.volt {
  color: #d8f34a;
}

.coral {
  color: #ff8a80;
}

.vec-key {
  position: absolute;
  top: 5px;
  left: 7px;
  display: flex;
  flex-wrap: wrap;
  gap: 3px 9px;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.7);
  font-size: 8.5px;
}

.vec-key.right {
  left: auto;
  right: 7px;
  color: #8fa9a0;
}

.vec-key b {
  color: #e6f4ec;
}

.caption {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.55;
  color: #8fa9a0;
}

.caption b {
  color: #d8f34a;
}

.caption.cyan b {
  color: #5ec8ff;
}

.caption.coral b {
  color: #ff8a80;
}

.caption i {
  font-style: normal;
  color: #e6f4ec;
}

.sliders {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.slider label {
  display: flex;
  justify-content: space-between;
  gap: 4px;
  font-size: 9.5px;
  color: #8fa9a0;
  margin-bottom: 2px;
}

.slider input {
  width: 100%;
  height: 12px;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.slider input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
}

.slider input::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  margin-top: -4px;
  border-radius: 50%;
  background: #d8f34a;
  border: 2px solid #0b2220;
}

.slider input.cyan::-webkit-slider-thumb {
  background: #5ec8ff;
}

.slider input.coral::-webkit-slider-thumb {
  background: #ff8a80;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.math-card {
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.math-card .tag {
  font-size: 8.5px;
  letter-spacing: 0.06em;
  color: #d8f34a;
}

.math-card h3 {
  margin: 2px 0 4px;
  font-size: 11px;
  color: #f4faf6;
}

.math-card .formula {
  margin-bottom: 4px;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9.5px;
  color: #5ec8ff;
  text-align: center;
}

.math-card p {
  margin: 0;
  font-size: 9.5px;
  line-height: 1.55;
  color: #a9c4b6;
}

.type-switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 3px solid #5ec8ff;
}

.type-switch h3 {
  margin: 0;
  font-size: 11.5px;
  color: #f4faf6;
}

.type-switch p {
  margin: 1px 0 0;
  font-size: 9px;
  color: #8fa9a0;
}

.type-btns {
  display: flex;
  gap: 4px;
}

.type-btns button {
  padding: 4px 9px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #a9c4b6;
  cursor: pointer;
}

.compare-wrap {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.compare-head h3 {
  margin: 3px 0 2px;
  font-size: 14px;
  color: #f4faf6;
}

.compare-head p {
  margin: 0 0 8px;
  font-size: 10px;
  color: #8fa9a0;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10px;
}

th {
  padding: 6px 8px;
  text-align: left;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  color: #8fa9a0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

th.volt {
  color: #d8f34a;
}

th.cyan {
  color: #5ec8ff;
}

th.coral {
  color: #ff8a80;
}

td {
  padding: 6px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: #cfe6da;
  vertical-align: top;
  line-height: 1.5;
}

td.dim {
  font-weight: 600;
  color: #f4faf6;
  white-space: nowrap;
}

td.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 9.5px;
}

td.mono.volt {
  color: #d8f34a;
}

td.mono.cyan {
  color: #5ec8ff;
}

td.mono.coral {
  color: #ff8a80;
}

@media (max-width: 1320px) {
  .stroke-lab {
    right: 14px;
  }

  .canvas-row {
    grid-template-columns: 1fr;
  }

  .stat-row,
  .cards {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 980px) {
  .stroke-lab {
    left: 14px;
    bottom: 96px;
  }

  .stat-row,
  .cards,
  .sliders {
    grid-template-columns: 1fr;
  }
}
</style>
