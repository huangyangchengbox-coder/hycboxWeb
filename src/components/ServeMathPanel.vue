<template>
  <section class="math-sheet" :class="{ collapsed }">
    <header class="sheet-head">
      <div class="head-left">
        <span class="badge">运动生物力学 · 抛体运动仿真</span>
        <h2>网球发球过网轨迹数学模型</h2>
        <p class="sub">抛物线模型，忽略空气阻力，g = 9.8 m/s²</p>
      </div>
      <div class="head-right">
        <div class="net-toggle">
          <span>底线至球网：</span>
          <button type="button" :class="{ on: state.netDist === 11.885 }" @click="setNetDist(11.885)">标准 11.885 m</button>
          <button type="button" :class="{ on: state.netDist === 12 }" @click="setNetDist(12)">图示近似 12.0 m</button>
        </div>
        <button type="button" class="collapse-btn" :aria-expanded="!collapsed" @click="collapsed = !collapsed">
          {{ collapsed ? '展开图表' : '收起' }}
        </button>
      </div>
    </header>

    <div v-show="!collapsed" class="sheet-body">
      <!-- 图例 -->
      <div class="legend-bar">
        <span><i class="dot red"></i>击球点 (0, h₀)</span>
        <span><i class="line amber"></i>贴网极限轨迹（擦网顶最近落点）</span>
        <span><i class="line emerald"></i>最远落点轨迹（压发球线）</span>
        <span><i class="line blue"></i>自定义发球角轨迹</span>
        <span class="hint">移动鼠标到坐标系内可探查任意距离处的高度与净空</span>
      </div>

      <div ref="wrapRef" class="canvas-wrap">
        <canvas ref="canvasRef" @mousemove="onMove" @mouseleave="onLeave"></canvas>
        <div v-show="hover.on" class="tooltip" :style="{ left: hover.left + 'px', top: hover.top + 'px' }">
          <div class="tt-head"><span>水平距离 x</span><b>{{ hover.x.toFixed(2) }} m</b></div>
          <div class="tt-row"><span class="amber">● 最远落点线高度</span><b>{{ hover.yFar }}</b></div>
          <div class="tt-row"><span class="amber">● 贴网极限线高度</span><b>{{ hover.yNear }}</b></div>
          <div class="tt-row"><span class="blue">● 自定义角线高度</span><b>{{ hover.yCustom }}</b></div>
          <div class="tt-foot">{{ hover.note }}</div>
        </div>
      </div>

      <!-- 三张关键数据卡 -->
      <div class="cards">
        <article class="card base">
          <div class="card-head">
            <span class="tag red">击球基准条件</span>
            <span class="mono dim">(0, h₀)</span>
          </div>
          <div class="big-row">
            <b class="big">{{ result.h0.toFixed(2) }}</b>
            <span>m 击球点高度</span>
          </div>
          <p class="note">{{ h0Text }}</p>
          <dl class="kv">
            <div><dt>发球初速度 v</dt><dd>{{ state.speedKmh }} km/h ({{ result.v.toFixed(2) }} m/s)</dd></div>
            <div><dt>有效落点窗口长度</dt><dd class="indigo">{{ result.windowLen.toFixed(2) }} m</dd></div>
          </dl>
        </article>

        <article class="card near">
          <div class="card-head">
            <span class="tag amber">① 贴网极限最近落点</span>
            <span class="mono amber">θ = {{ nearAngle }}</span>
          </div>
          <div class="grid2">
            <div class="cell amber-cell">
              <span class="cell-label">落点距球网</span>
              <b>{{ near ? near.distFromNet.toFixed(2) + ' m' : '—' }}</b>
              <span class="cell-foot">{{ near ? '总距底线 ' + near.landX.toFixed(2) + ' m' : '速度不足' }}</span>
            </div>
            <div class="cell">
              <span class="cell-label">过网离地 / 净空</span>
              <b>0.914 m</b>
              <span class="cell-foot amber">离网净空 Δh = 0.00 m</span>
            </div>
          </div>
          <p class="note">球下沿刚好擦过 0.914 m 网顶，这是当前身高与球速下进入发球区的理论最近落点。</p>
        </article>

        <article class="card far">
          <div class="card-head">
            <span class="tag emerald">② 压发球线最远落点</span>
            <span class="mono emerald">θ = {{ farAngle }}</span>
          </div>
          <div class="grid2">
            <div class="cell emerald-cell">
              <span class="cell-label">过网离地高度 y_net</span>
              <b>{{ far ? far.yAtNet.toFixed(3) + ' m' : '—' }}</b>
              <span class="cell-foot">落点距网 6.40 m</span>
            </div>
            <div class="cell clearance" :class="{ bad: far && !far.clearsNet }">
              <span class="cell-label">最远落点离网净空 Δh</span>
              <b>{{ far ? (far.clearance >= 0 ? '+' : '') + far.clearance.toFixed(3) + ' m' : '—' }}</b>
              <span class="cell-foot">{{ far && far.clearsNet ? '安全过网（有效入界）' : '球速过低，无法过网' }}</span>
            </div>
          </div>
          <p class="note">{{ farNote }}</p>
        </article>
      </div>

      <div class="lower">
        <!-- 控制台 -->
        <div class="controls">
          <div class="controls-head">
            <h3>球员身高与发球参数</h3>
            <button type="button" class="reset" @click="resetDefaults">恢复默认 168 cm</button>
          </div>

          <div class="field">
            <label>
              1. 球员身高
              <b>{{ state.heightCm }} cm</b>
            </label>
            <div class="presets">
              <button
                v-for="h in HEIGHT_PRESETS"
                :key="h"
                type="button"
                :class="{ on: state.heightCm === h }"
                @click="setHeight(h)"
              >{{ h }}<em v-if="h === 168">默认</em></button>
            </div>
            <input type="range" min="150" max="215" step="1" :value="state.heightCm" @input="onInput('heightCm', $event, true)" />
          </div>

          <div class="pair">
            <div class="field">
              <label>击球姿态 / 起跳增量 <b>+{{ state.jumpCm }} cm</b></label>
              <input type="range" min="0" max="45" step="1" :value="state.jumpCm" @input="onInput('jumpCm', $event, true)" />
              <div class="scale"><span>站立</span><span>常规跳发 +15</span><span>职业起跳 +35</span></div>
            </div>
            <div class="field">
              <label>静态击球高度系数 <b>{{ state.reachRatio.toFixed(3) }} × 身高</b></label>
              <input type="range" min="1.40" max="1.55" step="0.002" :value="state.reachRatio" @input="onInput('reachRatio', $event, false)" />
              <div class="scale"><span>屈膝 1.40</span><span>舒展 1.48</span><span>伸展 1.55</span></div>
            </div>
          </div>

          <div class="field">
            <label>2. 发球初速度 v <b>{{ state.speedKmh }} km/h（{{ result.v.toFixed(2) }} m/s）</b></label>
            <div class="quick">
              <button type="button" @click="setSpeed(110)">二发 110</button>
              <button type="button" @click="setSpeed(140)">进阶 140</button>
              <button type="button" @click="setSpeed(180)">一发 180</button>
              <button type="button" @click="setSpeed(210)">职业 210</button>
            </div>
            <input type="range" min="70" max="230" step="1" :value="state.speedKmh" @input="onInput('speedKmh', $event, true)" />
          </div>

          <div class="field">
            <label>
              <i class="dot-inline blue"></i>
              3. 自定义发射角 θ（蓝线对照）
              <b class="blue">{{ state.customAngleDeg.toFixed(2) }}°</b>
              <span class="status" :class="result.custom.statusType">{{ result.custom.status }}</span>
            </label>
            <input type="range" min="-12" max="4" step="0.05" :value="state.customAngleDeg" @input="onInput('customAngleDeg', $event, false)" />
            <div class="scale">
              <span>向下扣压 −12°</span>
              <span>过网 {{ result.custom.yAtNet.toFixed(2) }} m · 落点距网 {{ result.custom.distFromNet.toFixed(2) }} m</span>
              <span>向上挑高 +4°</span>
            </div>
          </div>
        </div>

        <!-- 公式与对照表 -->
        <div class="side">
          <h3>抛物线轨迹数学模型</h3>
          <div class="formula">
            <div class="eq">y(x) = h₀ + x·tanθ − g x² / (2v² cos²θ)</div>
            <div class="eq-sub">代入：y = {{ result.h0.toFixed(2) }} + x·tanθ − 9.8x² / ({{ (2 * result.v * result.v).toFixed(1) }}·cos²θ)</div>
          </div>
          <ul class="notes">
            <li><b>坐标系：</b>底线发球点正下方地面为原点 (0,0)，x 为纵向水平距离，y 为球心离地高度。</li>
            <li><b>过网约束：</b>网高 0.914 m，距底线 {{ state.netDist }} m；有效发球须 y(x_net) ≥ 0.914 m 且落点 ≤ 发球线。</li>
            <li><b>身高影响：</b>击球点越高，向下俯冲的裕度越大，贴网落点更靠前，压发球线的过网净空也更大。</li>
          </ul>

          <h4>不同身高过网窗口对比<span>点击行切换身高</span></h4>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>身高</th><th>击球 h₀</th><th class="amber">贴网最近落点</th><th class="emerald">最远落点净空</th></tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in compareRows"
                  :key="row.heightCm"
                  :class="{ on: row.heightCm === state.heightCm }"
                  @click="setHeight(row.heightCm)"
                >
                  <td>
                    {{ row.heightCm }} cm
                    <em v-if="row.heightCm === 168">默认</em>
                  </td>
                  <td class="mono">{{ row.h0.toFixed(2) }} m</td>
                  <td class="mono amber">{{ row.near ? row.near.distFromNet.toFixed(2) + ' m' : '—' }}</td>
                  <td class="mono" :class="row.far && row.far.clearsNet ? 'emerald' : 'rose'">
                    {{ row.far ? (row.far.clearsNet ? '+' + (row.far.clearance * 100).toFixed(1) + ' cm' : '下网') : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  COMPARE_HEIGHTS,
  HEIGHT_PRESETS,
  NET_HEIGHT,
  SERVICE_BOX_LEN,
  SERVE_DEFAULTS,
  compareHeights,
  computeServe,
  trajectoryY
} from '../tennis/servemath.js'

const emit = defineEmits(['change'])

const collapsed = ref(false)
const wrapRef = ref(null)
const canvasRef = ref(null)
const ctxRef = ref(null)

const state = reactive({ ...SERVE_DEFAULTS })
const hover = reactive({ on: false, x: 0, left: 0, top: 0, yFar: '—', yNear: '—', yCustom: '—', note: '' })

const result = ref(computeServe(state))
const compareRows = computed(() => compareHeights(state, COMPARE_HEIGHTS))

const nearAngle = computed(() => (result.value.near ? `${result.value.near.thetaDeg.toFixed(2)}°` : '—'))
const farAngle = computed(() => (result.value.far ? `${result.value.far.thetaDeg.toFixed(2)}°` : '—'))
const near = computed(() => result.value.near)
const far = computed(() => result.value.far)

const h0Text = computed(() => {
  const { heightCm, reachRatio, jumpCm, h0 } = result.value
  return jumpCm > 0
    ? `身高 ${heightCm}cm × ${reachRatio.toFixed(2)} + 起跳 ${(jumpCm / 100).toFixed(2)}m = ${h0.toFixed(2)}m`
    : `身高 ${heightCm}cm × ${reachRatio.toFixed(3)} ≈ ${h0.toFixed(2)}m（站立舒展击球）`
})

const farNote = computed(() => {
  const item = result.value.far
  if (!item) return '当前球速不足以把球送到发球线。'
  if (item.clearsNet) {
    return `瞄准发球线最远端（距网 6.40 m）时，球经球网上方的净空高度为 ${(item.clearance * 100).toFixed(1)} cm。`
  }
  return '当前球速下即使瞄准发球线最远端，过网高度仍低于 0.914 m，请提高球速或击球点。'
})

/* —— 绘图 —— */
const plot = { left: 68, right: 45, top: 26, bottom: 72, width: 0, height: 0, maxX: 20.5, minY: -0.48, maxY: 3.35 }

function toX(m) {
  return plot.left + (m / plot.maxX) * plot.width
}

function toY(m) {
  return plot.top + ((plot.maxY - m) / (plot.maxY - plot.minY)) * plot.height
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function callout(ctx, x, y, text, bg, fg, align = 'center') {
  ctx.font = '600 10.5px "PingFang SC", "Microsoft YaHei", sans-serif'
  const padX = 6
  const boxH = 18
  const boxW = ctx.measureText(text).width + padX * 2
  let drawX = x - boxW / 2
  if (align === 'right') drawX = x - boxW
  if (align === 'left') drawX = x
  drawX = Math.max(plot.left + 2, Math.min(drawX, plot.left + plot.width - boxW - 2))
  ctx.fillStyle = bg
  roundRect(ctx, drawX, y - boxH / 2, boxW, boxH, 4)
  ctx.fill()
  ctx.strokeStyle = fg
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.fillStyle = fg
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, drawX + boxW / 2, y)
}

function dimensionArrow(ctx, x1, x2, y, label) {
  ctx.strokeStyle = '#64748b'
  ctx.fillStyle = '#94a3b8'
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
  const s = 4.5
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x1 + s, y - 3)
  ctx.lineTo(x1 + s, y + 3)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x2, y)
  ctx.lineTo(x2 - s, y - 3)
  ctx.lineTo(x2 - s, y + 3)
  ctx.closePath()
  ctx.fill()

  const midX = (x1 + x2) / 2
  ctx.font = '600 10px "PingFang SC", "Microsoft YaHei", sans-serif'
  const w = ctx.measureText(label).width
  ctx.fillStyle = 'rgba(8, 26, 25, 0.92)'
  ctx.fillRect(midX - w / 2 - 4, y - 8, w + 8, 15)
  ctx.fillStyle = '#a9c4b6'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, midX, y)
}

function drawArc(ctx, h0, v, theta, color, width, stopAtNet) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  const step = 0.05
  let started = false
  for (let x = 0; x <= plot.maxX; x += step) {
    const y = trajectoryY(x, h0, v, theta)
    if (stopAtNet && x >= result.value.netDist && y < NET_HEIGHT) break
    if (y < 0) {
      const prevX = x - step
      const prevY = trajectoryY(prevX, h0, v, theta)
      const exactX = prevX + (prevY / (prevY - y)) * step
      ctx.lineTo(toX(exactX), toY(0))
      break
    }
    const px = toX(x)
    const py = toY(y)
    if (!started) {
      ctx.moveTo(px, py)
      started = true
    } else {
      ctx.lineTo(px, py)
    }
  }
  ctx.stroke()
}

function draw() {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const ctx = ctxRef.value || canvas.getContext('2d')
  ctxRef.value = ctx

  const dpr = window.devicePixelRatio || 1
  const W = wrap.clientWidth
  const H = wrap.clientHeight
  if (!W || !H) return
  canvas.width = W * dpr
  canvas.height = H * dpr
  canvas.style.width = `${W}px`
  canvas.style.height = `${H}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const r = result.value
  const maxY = Math.max(3.25, Math.ceil((r.h0 + 0.55) * 2) / 2)
  plot.left = W < 520 ? 46 : 66
  plot.top = 26
  plot.bottom = 70
  plot.width = W - plot.left - (W < 520 ? 24 : 42)
  plot.height = H - plot.top - plot.bottom
  plot.maxX = r.netDist + SERVICE_BOX_LEN + 2.2
  plot.maxY = maxY

  ctx.clearRect(0, 0, W, H)

  const xNet = toX(r.netDist)
  const xService = toX(r.netDist + SERVICE_BOX_LEN)
  const y0 = toY(0)
  const yNet = toY(NET_HEIGHT)

  // 发球区高亮
  ctx.fillStyle = 'rgba(250, 226, 130, 0.2)'
  ctx.fillRect(xNet, yNet, xService - xNet, y0 - yNet)

  // 网格
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
  ctx.lineWidth = 1
  ctx.font = '10.5px Inter, "PingFang SC", sans-serif'
  ctx.fillStyle = '#7f9a91'
  for (let y = -0.5; y <= plot.maxY + 0.01; y += 0.5) {
    if (y < plot.minY) continue
    const py = toY(y)
    ctx.beginPath()
    ctx.moveTo(plot.left, py)
    ctx.lineTo(plot.left + plot.width, py)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(y.toFixed(1), plot.left - 7, py)
  }
  for (let x = 0; x <= plot.maxX; x += 2.5) {
    const px = toX(x)
    ctx.beginPath()
    ctx.moveTo(px, plot.top)
    ctx.lineTo(px, plot.top + plot.height)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(x.toFixed(1), px, plot.top + plot.height + 7)
  }

  // 外框
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(plot.left, plot.top, plot.width, plot.height)

  // 轴名
  ctx.fillStyle = '#a9c4b6'
  ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('水平距离 (m)', plot.left + plot.width / 2, H - 12)
  ctx.save()
  ctx.translate(13, plot.top + plot.height / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('高度 (m)', 0, 0)
  ctx.restore()

  // 地面
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(toX(0), y0)
  ctx.lineTo(plot.left + plot.width, y0)
  ctx.stroke()

  // 网顶水平线
  ctx.strokeStyle = 'rgba(226, 240, 232, 0.75)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(toX(0), yNet)
  ctx.lineTo(xService, yNet)
  ctx.stroke()

  // 球网垂直虚线 + 网柱
  ctx.strokeStyle = 'rgba(240, 250, 244, 0.55)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(xNet, plot.top)
  ctx.lineTo(xNet, plot.top + plot.height)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.strokeStyle = '#f2fbf2'
  ctx.lineWidth = 3.2
  ctx.beginPath()
  ctx.moveTo(xNet, y0)
  ctx.lineTo(xNet, yNet)
  ctx.stroke()

  ctx.fillStyle = '#f2fbf2'
  ctx.beginPath()
  ctx.arc(xNet, yNet, 3.6, 0, Math.PI * 2)
  ctx.fill()

  ctx.font = '600 10.5px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#dff3e6'
  ctx.fillText('网顶高度', xNet + 6, yNet - 18)
  ctx.fillStyle = '#9fe4ff'
  ctx.fillText('0.914 m', xNet + 6, yNet - 6)

  // 发球线
  ctx.strokeStyle = '#7cf2b0'
  ctx.lineWidth = 1.6
  ctx.setLineDash([6, 3, 2, 3])
  ctx.beginPath()
  ctx.moveTo(xService, plot.top)
  ctx.lineTo(xService, plot.top + plot.height)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#7cf2b0'
  ctx.font = '600 10.5px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.fillText('发球线', xService + 5, y0 - 20)
  ctx.font = '10px "PingFang SC", sans-serif'
  ctx.fillStyle = '#9fd6b8'
  ctx.fillText('(距网 6.4 m)', xService + 5, y0 - 8)

  // 尺寸标注
  const dimY = toY(-0.24)
  dimensionArrow(ctx, toX(0), xNet, dimY, `底线至球网 ${r.netDist} m`)
  dimensionArrow(ctx, xNet, xService, dimY, '发球区 6.4 m')

  // 三条轨迹
  drawArc(ctx, r.h0, r.v, r.custom.thetaRad, '#60a5fa', 2, r.custom.statusType === 'net')
  if (r.near) {
    drawArc(ctx, r.h0, r.v, r.near.thetaRad, '#f5b942', 2.4, false)
    const px = toX(r.near.landX)
    ctx.fillStyle = '#f5b942'
    ctx.beginPath()
    ctx.arc(px, y0, 4.2, 0, Math.PI * 2)
    ctx.fill()
    callout(ctx, px, y0 + 15, `贴网最近落点：距网 ${r.near.distFromNet.toFixed(2)} m`, 'rgba(69, 41, 6, 0.95)', '#fbd38d')
  }
  if (r.far) {
    drawArc(ctx, r.h0, r.v, r.far.thetaRad, '#34d399', 2.4, false)
    ctx.fillStyle = '#34d399'
    ctx.beginPath()
    ctx.arc(xService, y0, 4.2, 0, Math.PI * 2)
    ctx.fill()
    if (r.far.clearsNet) {
      const yFarNet = toY(r.far.yAtNet)
      ctx.strokeStyle = '#34d399'
      ctx.lineWidth = 2.6
      ctx.beginPath()
      ctx.moveTo(xNet, yNet)
      ctx.lineTo(xNet, yFarNet)
      ctx.stroke()
      ctx.fillStyle = '#6ee7b7'
      ctx.beginPath()
      ctx.arc(xNet, yFarNet, 3.6, 0, Math.PI * 2)
      ctx.fill()
      callout(
        ctx,
        xNet - 8,
        yFarNet - 14,
        `最远落点过网 ${r.far.yAtNet.toFixed(2)} m（净空 +${(r.far.clearance * 100).toFixed(1)} cm）`,
        'rgba(6, 60, 46, 0.95)',
        '#6ee7b7',
        'right'
      )
    }
  }

  // 击球点
  const xs = toX(0)
  const ys = toY(r.h0)
  ctx.fillStyle = '#ff6b5a'
  ctx.beginPath()
  ctx.arc(xs, ys, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.fillStyle = '#ff9f92'
  ctx.font = '600 11px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(`击球点 (${r.heightCm}cm)`, xs + 9, ys - 11)
  ctx.font = '600 10.5px Inter, "PingFang SC", sans-serif'
  ctx.fillText(`(0, ${r.h0.toFixed(2)} m)`, xs + 9, ys + 3)

  // 悬停探测线
  if (hover.on) {
    const hx = toX(hover.x)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.7)'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(hx, plot.top)
    ctx.lineTo(hx, plot.top + plot.height)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function onMove(event) {
  const canvas = canvasRef.value
  const wrap = wrapRef.value
  if (!canvas || !wrap) return
  const rect = canvas.getBoundingClientRect()
  const mx = event.clientX - rect.left
  const my = event.clientY - rect.top
  const inside = mx >= plot.left && mx <= plot.left + plot.width && my >= plot.top && my <= plot.top + plot.height
  if (!inside) {
    if (hover.on) {
      hover.on = false
      draw()
    }
    return
  }
  const x = ((mx - plot.left) / plot.width) * plot.maxX
  hover.x = x
  hover.on = true

  const r = result.value
  const pick = (theta) => {
    const y = trajectoryY(x, r.h0, r.v, theta)
    return y >= 0 ? `${y.toFixed(3)} m` : '已落地'
  }
  hover.yFar = r.far ? pick(r.far.thetaRad) : '—'
  hover.yNear = r.near ? pick(r.near.thetaRad) : '—'
  hover.yCustom = pick(r.custom.thetaRad)

  const dn = x - r.netDist
  hover.note = Math.abs(dn) < 0.25
    ? '球网位置（网高 0.914 m）'
    : dn < 0
      ? `距球网还有 ${Math.abs(dn).toFixed(2)} m`
      : `已过球网 ${dn.toFixed(2)} m`

  const ttW = 200
  hover.left = mx + ttW + 20 > rect.width ? Math.max(8, mx - ttW - 12) : mx + 14
  hover.top = Math.max(8, Math.min(my - 20, rect.height - 130))
  draw()
}

function onLeave() {
  if (!hover.on) return
  hover.on = false
  draw()
}

/* —— 状态更新 —— */
function refresh() {
  result.value = computeServe(state)
  emit('change', { ...state })
  draw()
}

function onInput(key, event, integer) {
  const raw = event.target.value
  state[key] = integer ? Number.parseInt(raw, 10) : Number.parseFloat(raw)
  refresh()
}

function setHeight(h) {
  state.heightCm = h
  refresh()
}

function setSpeed(s) {
  state.speedKmh = s
  refresh()
}

function setNetDist(d) {
  state.netDist = d
  refresh()
}

function resetDefaults() {
  Object.assign(state, SERVE_DEFAULTS)
  refresh()
}

function onResize() {
  draw()
}

let observer = null

onMounted(() => {
  refresh()
  if (typeof ResizeObserver !== 'undefined' && wrapRef.value) {
    observer = new ResizeObserver(() => draw())
    observer.observe(wrapRef.value)
  }
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  observer?.disconnect()
})

watch(collapsed, (value) => {
  if (!value) requestAnimationFrame(draw)
})

defineExpose({ resetDefaults, setHeight })
</script>

<style scoped>
.math-sheet {
  position: absolute;
  left: 232px;
  right: 322px;
  top: 58px;
  bottom: 92px;
  z-index: 3;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(5, 22, 22, 0.94);
  backdrop-filter: blur(8px);
  overflow: hidden;
  color: #e6f4ec;
}

.math-sheet.collapsed {
  bottom: auto;
}

.sheet-head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.badge {
  display: inline-block;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: #9fe4ff;
  background: rgba(94, 200, 255, 0.14);
  padding: 2px 8px;
  border-radius: 999px;
}

.sheet-head h2 {
  margin: 4px 0 0;
  font-size: 18px;
  letter-spacing: 0.03em;
}

.sub {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8fa9a0;
}

.head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.net-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: #8fa9a0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9px;
  padding: 3px 5px;
}

.net-toggle button {
  padding: 3px 8px;
  font-size: 10.5px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #a9c4b6;
  cursor: pointer;
}

.net-toggle button.on {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
  font-weight: 600;
}

.collapse-btn {
  padding: 5px 11px;
  font-size: 11px;
  border-radius: 8px;
  border: 1px solid #46685a;
  background: #18352d;
  color: #d8f34a;
  cursor: pointer;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 10px 16px 14px;
}

.legend-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10.5px;
  color: #a9c4b6;
}

.legend-bar span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.legend-bar i.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #ff6b5a;
}

.legend-bar i.line {
  width: 18px;
  height: 2px;
  border-radius: 1px;
}

.legend-bar i.amber {
  background: #f5b942;
}

.legend-bar i.emerald {
  background: #34d399;
}

.legend-bar i.blue {
  background: #60a5fa;
}

.legend-bar .hint {
  margin-left: auto;
  color: #7f9a91;
}

.canvas-wrap {
  position: relative;
  height: 300px;
  border-radius: 12px;
  background: rgba(4, 18, 18, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.tooltip {
  position: absolute;
  z-index: 5;
  min-width: 190px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(2, 12, 12, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 10.5px;
  color: #d5ebe0;
  pointer-events: none;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.tt-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 4px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
  color: #ffd166;
  font-weight: 600;
}

.tt-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  line-height: 1.7;
}

.tt-row b {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.tt-foot {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  color: #8fa9a0;
}

.amber {
  color: #fbbf58;
}

.emerald {
  color: #6ee7b7;
}

.blue {
  color: #7db6f5;
}

.rose {
  color: #ff9f92;
}

.indigo {
  color: #b9a7f5;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 10px 0;
}

.card {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.card:near {
  border-color: rgba(245, 185, 66, 0.4);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 2px 7px;
  border-radius: 5px;
}

.tag.red {
  background: rgba(255, 107, 90, 0.16);
  color: #ff9f92;
}

.tag.amber {
  background: rgba(245, 185, 66, 0.16);
  color: #fbbf58;
}

.tag.emerald {
  background: rgba(52, 211, 153, 0.16);
  color: #6ee7b7;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10.5px;
}

.dim {
  color: #7f9a91;
}

.big-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.big {
  font-size: 26px;
  font-weight: 800;
  color: #f4faf6;
}

.big-row span {
  font-size: 11px;
  color: #a9c4b6;
}

.note {
  margin: 6px 0 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: #8fa9a0;
}

.kv {
  margin: 8px 0 0;
  padding: 7px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 10.5px;
}

.kv div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  line-height: 1.9;
}

.kv dt {
  color: #8fa9a0;
}

.kv dd {
  margin: 0;
  font-weight: 700;
  color: #e6f4ec;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 7px 9px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.cell b {
  font-size: 17px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.cell-label {
  font-size: 10px;
  color: #8fa9a0;
}

.cell-foot {
  font-size: 10px;
  color: #7f9a91;
}

.amber-cell {
  background: rgba(245, 185, 66, 0.1);
  border-color: rgba(245, 185, 66, 0.32);
}

.amber-cell b {
  color: #fbbf58;
}

.emerald-cell {
  background: rgba(52, 211, 153, 0.1);
  border-color: rgba(52, 211, 153, 0.3);
}

.emerald-cell b {
  color: #6ee7b7;
}

.clearance {
  background: rgba(16, 122, 87, 0.45);
  border-color: rgba(52, 211, 153, 0.45);
}

.clearance b,
.clearance .cell-foot,
.clearance .cell-label {
  color: #eafff5;
}

.clearance.bad {
  background: rgba(140, 40, 40, 0.5);
  border-color: rgba(255, 120, 110, 0.5);
}

.cell-foot.amber {
  color: #fbbf58;
  font-weight: 700;
}

.lower {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 14px;
}

.controls-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 6px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.controls h3,
.side h3 {
  margin: 0;
  font-size: 13px;
  color: #f2fbf2;
}

.reset {
  padding: 3px 9px;
  font-size: 10px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #a9c4b6;
  cursor: pointer;
}

.field {
  margin-bottom: 10px;
}

.field > label {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #cfe6da;
  margin-bottom: 4px;
}

.field > label b {
  color: #f4faf6;
  font-size: 11.5px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.presets button {
  padding: 2px 7px;
  font-size: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #a9c4b6;
  cursor: pointer;
}

.presets button.on {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
  font-weight: 700;
}

.presets em {
  font-style: normal;
  font-size: 9px;
  margin-left: 2px;
  opacity: 0.7;
}

.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.quick button {
  padding: 2px 7px;
  font-size: 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #a9c4b6;
  cursor: pointer;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

input[type='range'] {
  width: 100%;
  height: 16px;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type='range']::-webkit-slider-runnable-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
}

input[type='range']::-webkit-slider-thumb {
  appearance: none;
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border-radius: 50%;
  background: #d8f34a;
  border: 2px solid #0b2220;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.scale {
  display: flex;
  justify-content: space-between;
  gap: 6px;
  font-size: 9.5px;
  color: #7f9a91;
  margin-top: 2px;
}

.scale span:nth-child(2) {
  color: #b9d4c6;
}

.status {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
}

.status.valid {
  background: rgba(52, 211, 153, 0.18);
  color: #6ee7b7;
}

.status.net {
  background: rgba(255, 107, 90, 0.2);
  color: #ff9f92;
}

.status.out {
  background: rgba(245, 185, 66, 0.2);
  color: #fbbf58;
}

.side {
  padding-left: 14px;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.formula {
  margin: 8px 0;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.formula .eq {
  font-family: "Cambria Math", "Times New Roman", serif;
  font-size: 14px;
  color: #eaff8a;
}

.formula .eq-sub {
  margin-top: 4px;
  font-size: 10px;
  color: #8fa9a0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.notes {
  margin: 8px 0;
  padding-left: 0;
  list-style: none;
  font-size: 10.5px;
  line-height: 1.7;
  color: #a9c4b6;
}

.notes li {
  position: relative;
  padding-left: 11px;
  margin-bottom: 5px;
}

.notes li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #d8f34a;
}

.notes b {
  color: #dff3e6;
}

.side h4 {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin: 10px 0 5px;
  font-size: 11px;
  color: #cfe6da;
}

.side h4 span {
  font-size: 9.5px;
  color: #7f9a91;
}

.table-wrap {
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
}

thead {
  background: rgba(255, 255, 255, 0.06);
  color: #a9c4b6;
}

th,
td {
  padding: 5px 6px;
  text-align: left;
}

tbody tr {
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

tbody tr:hover {
  background: rgba(255, 255, 255, 0.04);
}

tbody tr.on {
  background: rgba(216, 243, 74, 0.12);
  color: #f4faf6;
  font-weight: 700;
}

td em {
  font-style: normal;
  font-size: 9px;
  padding: 0 3px;
  margin-left: 3px;
  border-radius: 3px;
  background: rgba(216, 243, 74, 0.22);
  color: #d8f34a;
}

@media (max-width: 1320px) {
  .math-sheet {
    right: 14px;
  }

  .cards {
    grid-template-columns: 1fr;
  }

  .lower {
    grid-template-columns: 1fr;
  }

  .side {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding-top: 10px;
  }
}

@media (max-width: 1100px) {
  .math-sheet {
    left: 14px;
  }

  .canvas-wrap {
    height: 240px;
  }
}

@media (max-width: 980px) {
  .math-sheet {
    top: 58px;
    bottom: 96px;
  }

  .canvas-wrap {
    height: 200px;
  }

  .pair {
    grid-template-columns: 1fr;
  }
}
</style>
