<template>
  <div class="lab" style="--lab-accent:#7dffe8">
    <canvas ref="canvasRef" class="lab-canvas"></canvas>
    <canvas v-show="modeId === 'fourier' || modeId === 'prob'" ref="plotRef" class="plot-layer"></canvas>
    <WorldMenu />

    <header class="lab-top">
      <div>
        <div class="lab-kicker">MATH</div>
        <div class="lab-title">数学</div>
      </div>
      <p class="lab-hint">{{ active.hint }}</p>
    </header>

    <nav class="lab-nav">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        :class="{ active: mode.id === modeId }"
        @click="changeMode(mode.id)"
      >
        <span class="en">{{ mode.en }}</span>
        <span class="zh">{{ mode.name }}</span>
      </button>
    </nav>

    <aside class="lab-panel">
      <template v-if="modeId === 'quiz'">
        <div class="lab-kicker">QUIZ</div>
        <h2>思维挑战</h2>
        <template v-if="!quizDone">
          <p>{{ quizIndex + 1 }} / {{ quiz.length }}　{{ currentQuiz.q }}</p>
          <button v-for="(option, index) in currentQuiz.options" :key="option" type="button" class="choice" :class="{ on: quizPick === index }" @click="answerQuiz(index)">{{ option }}</button>
          <p v-if="quizPick !== null" class="note">{{ currentQuiz.why }}</p>
        </template>
        <template v-else>
          <p>答对 {{ quizScore }} / {{ quiz.length }}。</p>
          <button type="button" class="solid" @click="resetQuiz">再来一次</button>
        </template>
      </template>

      <template v-else-if="modeId === 'fractal'">
        <div class="lab-kicker">z → z² + c</div>
        <h2>{{ fractalKind === 'julia' ? 'Julia 集' : fractalKind === 'koch' ? '科赫雪花' : fractalKind === 'sierpinski' ? '谢尔宾斯基' : 'Mandelbrot 集' }}</h2>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: fractalKind === 'mandel' }" @click="setKind('mandel')">Mandelbrot</button>
          <button type="button" class="chip" :class="{ on: fractalKind === 'julia' }" @click="setKind('julia')">Julia</button>
          <button type="button" class="chip" :class="{ on: fractalKind === 'koch' }" @click="setKind('koch')">雪花</button>
          <button type="button" class="chip" :class="{ on: fractalKind === 'sierpinski' }" @click="setKind('sierpinski')">三角</button>
        </div>
        <template v-if="fractalKind === 'mandel' || fractalKind === 'julia'">
          <p>滚轮以光标为中心缩放，拖拽平移。在 Mandelbrot 上单击，右侧画出这个 c 对应的 Julia 集。</p>
          <div class="chips">
            <button v-for="(item, index) in palettes" :key="item" type="button" class="chip" :class="{ on: palette === index }" @click="setPalette(index)">{{ item }}</button>
          </div>
          <label class="field">迭代 {{ iter }}
            <input v-model.number="iter" type="range" min="64" max="512" step="16" @input="scene?.setIter(iter)" />
          </label>
          <p>c = {{ juliaRe.toFixed(4) }} + {{ juliaIm.toFixed(4) }} i</p>
          <canvas ref="juliaRef" class="mini-chart"></canvas>
          <div class="chips">
            <button v-for="item in juliaPresets" :key="item.name" type="button" class="chip" @click="useJulia(item)">{{ item.name }}</button>
          </div>
          <p v-if="precisionLimit" class="warn">已经放大到双精度浮点的边界，再放大只会看到色块。</p>
          <p class="note">尘埃那一组 c = e^(iπ/3)，落在 Mandelbrot 集外面，Julia 集是散开的。</p>
        </template>
        <p v-else class="note">雪花每次把一条边换成四段；四面体每次挖掉中间。这里画到第 4 层，再往下只是更密的同一规则。</p>
      </template>

      <template v-else-if="modeId === 'surface'">
        <div class="lab-kicker">z = f(x, y)</div>
        <h2>{{ surfaceName }}</h2>
        <div class="chips">
          <button v-for="item in surfacePresets" :key="item.id" type="button" class="chip" :class="{ on: item.id === surfaceId }" @click="pickSurface(item.id)">{{ item.name }}</button>
        </div>
        <label class="field">自定义
          <input v-model="expression" type="text" placeholder="sin(x)*cos(y)" @change="applyExpr" />
        </label>
        <p v-if="exprError" class="warn">{{ exprError }}</p>
        <label class="field">a {{ coeff.a.toFixed(2) }}<input v-model.number="coeff.a" type="range" min="0.4" max="3" step="0.05" /></label>
        <label class="field">b {{ coeff.b.toFixed(2) }}<input v-model.number="coeff.b" type="range" min="0.4" max="3" step="0.05" /></label>
        <label class="field">c {{ coeff.c.toFixed(2) }}<input v-model.number="coeff.c" type="range" min="0.4" max="3" step="0.05" /></label>
        <label class="field">切面 x = {{ sliceX.toFixed(2) }}<input v-model.number="sliceX" type="range" min="-3" max="3" step="0.05" /></label>
        <canvas ref="sliceRef" class="mini-chart"></canvas>
        <p>沿这条切面，曲线在 y=0 处的斜率是 {{ slope.toFixed(2) }}，也就是 ∂z/∂y。</p>
        <p class="note">表达式只接受 x、y、pi、e 和 sin cos tan exp sqrt abs log。黄色线是一条等高线，粉色线是切面。</p>
      </template>

      <template v-else-if="modeId === 'linear'">
        <div class="lab-kicker">det = {{ eigen.det.toFixed(2) }}</div>
        <h2>{{ eigen.complex ? '把平面转了起来' : '沿两个方向拉伸' }}</h2>
        <div class="chips">
          <button v-for="item in matrixPresets" :key="item.id" type="button" class="chip" @click="applyPreset(item)">{{ item.name }}</button>
        </div>
        <label class="field">a {{ matrix.a.toFixed(2) }}<input v-model.number="matrix.a" type="range" min="-2" max="2" step="0.02" /></label>
        <label class="field">b {{ matrix.b.toFixed(2) }}<input v-model.number="matrix.b" type="range" min="-2" max="2" step="0.02" /></label>
        <label class="field">c {{ matrix.c.toFixed(2) }}<input v-model.number="matrix.c" type="range" min="-2" max="2" step="0.02" /></label>
        <label class="field">d {{ matrix.d.toFixed(2) }}<input v-model.number="matrix.d" type="range" min="-2" max="2" step="0.02" /></label>
        <p v-if="eigen.complex">特征值是复数，平面上没有被单独拉长的方向，网格在转。</p>
        <p v-else>特征值 {{ eigen.l1.toFixed(2) }} 和 {{ eigen.l2.toFixed(2) }}。金色线段是单位特征向量被矩阵作用之后的结果。</p>
        <p>青色方块是单位正方形变成的平行四边形，面积的绝对值就是 |det|。</p>
        <button type="button" class="chip" :class="{ on: cubeOn }" @click="cubeOn = !cubeOn">看立方体绕竖直轴</button>
        <label v-if="cubeOn" class="field">角度 {{ cubeAngle.toFixed(0) }}°
          <input v-model.number="cubeAngle" type="range" min="0" max="360" step="1" />
        </label>
      </template>

      <template v-else-if="modeId === 'fourier'">
        <div class="lab-kicker">{{ terms }} 项</div>
        <h2>{{ waveName }}</h2>
        <div class="chips">
          <button v-for="item in waves" :key="item.id" type="button" class="chip" :class="{ on: item.id === waveId }" @click="waveId = item.id">{{ item.name }}</button>
        </div>
        <label class="field">项数 {{ terms }}
          <input v-model.number="terms" type="range" min="1" max="64" step="1" />
        </label>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: toneOn }" @click="toggleTone">{{ toneOn ? '停止声音' : '听这个级数' }}</button>
          <button type="button" class="chip" @click="terms = 48">看 Gibbs 过冲</button>
        </div>
        <p v-if="waveId === 'square'">拐角处现在高出方波 {{ (overshoot * 100).toFixed(1) }}%。项数增加后，过冲会靠近 9%，并且变得更窄。</p>
        <p class="note">左边是旋转的圆周，右边青线是有限项和，白线是目标波形。声音用同样的正弦分量叠加。</p>
      </template>

      <template v-else>
        <div class="lab-kicker">PROB</div>
        <h2>{{ probTab === 'galton' ? '高尔顿钉板' : probTab === 'pi' ? '蒙特卡洛' : '正态分布' }}</h2>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: probTab === 'galton' }" @click="probTab = 'galton'">钉板</button>
          <button type="button" class="chip" :class="{ on: probTab === 'pi' }" @click="probTab = 'pi'">估算 π</button>
          <button type="button" class="chip" :class="{ on: probTab === 'normal' }" @click="probTab = 'normal'">正态</button>
        </div>
        <template v-if="probTab === 'galton'">
          <p>已经落下 {{ galton.total }} 个球。柱高是计数，白线是二项分布。</p>
          <div class="chips">
            <button type="button" class="solid" @click="galton.drop(1000)">再投 1000</button>
            <button type="button" class="chip" @click="galton.reset()">清空</button>
          </div>
        </template>
        <template v-else-if="probTab === 'pi'">
          <p>π ≈ {{ pi.estimate.toFixed(5) }}　样本 {{ pi.total.toLocaleString() }}</p>
          <div class="chips">
            <button type="button" class="solid" @click="pi.add(5000)">+5000</button>
            <button type="button" class="chip" @click="runToMillion">跑到 10⁶</button>
            <button type="button" class="chip" @click="pi.reset()">清空</button>
          </div>
        </template>
        <template v-else>
          <label class="field">μ {{ mu.toFixed(2) }}<input v-model.number="mu" type="range" min="-2" max="2" step="0.05" /></label>
          <label class="field">σ {{ sigma.toFixed(2) }}<input v-model.number="sigma" type="range" min="0.35" max="2" step="0.05" /></label>
          <p>色带从内到外大约盖住 68%、95%、99.7% 的概率。</p>
        </template>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { JULIA_PRESETS, MATH_QUIZ, MODES } from '../mathviz/catalog.js'
import { compileExpr } from '../mathviz/expr.js'
import { drawFourier, gibbsOvershoot, playTone, stopTone } from '../mathviz/fourier.js'
import { eigen2, MATRIX_PRESETS } from '../mathviz/linalg.js'
import { MathScene } from '../mathviz/MathScene.js'
import { binomPmf, createGalton, createPiSampler, normalPdf } from '../mathviz/prob.js'
import '../styles/lab.css'

const modes = MODES
const quiz = MATH_QUIZ
const juliaPresets = JULIA_PRESETS
const palettes = ['海岸', '熔岩', '极光']
const matrixPresets = MATRIX_PRESETS
const waves = [
  { id: 'square', name: '方波' },
  { id: 'saw', name: '锯齿' },
  { id: 'tri', name: '三角' }
]
const surfacePresets = [
  { id: 'wave', name: '波纹', fn: (x, y, a, b, c) => a * Math.sin(b * x) * Math.cos(c * y) },
  { id: 'saddle', name: '鞍面', fn: (x, y, a, b, c) => a * ((b * x) ** 2 - (c * y) ** 2) * 0.25 },
  { id: 'ripple', name: '涡旋', fn: (x, y, a, b) => a * Math.sin(b * Math.hypot(x, y)) },
  { id: 'gauss', name: '高斯包', fn: (x, y, a, b) => a * Math.exp(-b * (x * x + y * y) / 2) }
]

const route = useRoute()
const router = useRouter()
const canvasRef = ref(null)
const plotRef = ref(null)
const juliaRef = ref(null)
const sliceRef = ref(null)
const modeId = ref('fractal')
const fractalKind = ref('mandel')
const iter = ref((navigator.hardwareConcurrency || 8) <= 4 ? 128 : 220)
const palette = ref(0)
const juliaRe = ref(-0.7)
const juliaIm = ref(0.27)
const precisionLimit = ref(false)
const surfaceId = ref('wave')
const expression = ref('sin(x)*cos(y)')
const exprError = ref('')
const customFn = ref(null)
const coeff = reactive({ a: 1, b: 1, c: 1 })
const sliceX = ref(0)
const matrix = reactive({ a: 1, b: 0.6, c: 0, d: 1 })
const cubeOn = ref(false)
const cubeAngle = ref(30)
const waveId = ref('square')
const terms = ref(7)
const toneOn = ref(false)
const probTab = ref('galton')
const mu = ref(0)
const sigma = ref(1)
const quizIndex = ref(0)
const quizScore = ref(0)
const quizPick = ref(null)
const quizDone = ref(false)

const galton = createGalton(12)
const pi = createPiSampler()
let scene = null
let plotTimer = 0
let piTimer = 0

const active = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const currentQuiz = computed(() => quiz[quizIndex.value])
const surfacePreset = computed(() => surfacePresets.find((item) => item.id === surfaceId.value) || surfacePresets[0])
const surfaceName = computed(() => (customFn.value ? '自定义曲面' : surfacePreset.value.name))
const eigen = computed(() => eigen2(matrix.a, matrix.b, matrix.c, matrix.d))
const waveName = computed(() => waves.find((item) => item.id === waveId.value)?.name || '方波')
const overshoot = computed(() => (waveId.value === 'square' ? gibbsOvershoot(terms.value) : 0))

function heightAt(x, y) {
  const fn = customFn.value || surfacePreset.value.fn
  return fn(x, y, coeff.a, coeff.b, coeff.c)
}

const slope = computed(() => {
  const eps = 0.05
  return (heightAt(sliceX.value, eps) - heightAt(sliceX.value, -eps)) / (2 * eps)
})

function changeMode(id) {
  modeId.value = id
  if (id !== 'fourier') {
    stopTone()
    toneOn.value = false
  }
  router.replace({ query: { ...route.query, mode: id } })
}

function setKind(kind) {
  fractalKind.value = kind
  scene?.setFractalKind(kind)
}

function setPalette(index) {
  palette.value = index
  scene?.setPalette(index)
}

function useJulia(item) {
  juliaRe.value = item.re
  juliaIm.value = item.im
  scene?.setJuliaC(item.re, item.im)
  setKind('julia')
  drawJuliaThumb()
}

function pickSurface(id) {
  surfaceId.value = id
  customFn.value = null
  exprError.value = ''
}

function applyExpr() {
  try {
    customFn.value = compileExpr(expression.value)
    exprError.value = ''
    surfaceId.value = 'custom'
  } catch (error) {
    exprError.value = error.message || '这个式子没法算'
    customFn.value = null
  }
}

function applyPreset(item) {
  matrix.a = item.m[0]
  matrix.b = item.m[1]
  matrix.c = item.m[2]
  matrix.d = item.m[3]
}

function answerQuiz(index) {
  if (quizPick.value !== null) return
  quizPick.value = index
  if (index === currentQuiz.value.answer) quizScore.value += 1
  setTimeout(() => {
    quizPick.value = null
    if (quizIndex.value + 1 >= quiz.length) quizDone.value = true
    else quizIndex.value += 1
  }, 900)
}

function resetQuiz() {
  quizIndex.value = 0
  quizScore.value = 0
  quizPick.value = null
  quizDone.value = false
}

function drawJuliaThumb() {
  const canvas = juliaRef.value
  if (!canvas || (fractalKind.value !== 'mandel' && fractalKind.value !== 'julia')) return
  const w = 180
  const h = 120
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(w, h)
  const data = image.data
  const cre = juliaRe.value
  const cim = juliaIm.value
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      let zr = (x / w - 0.5) * 3.2
      let zi = (y / h - 0.5) * 2.2
      let n = 0
      for (; n < 40; n += 1) {
        const zr2 = zr * zr - zi * zi + cre
        zi = 2 * zr * zi + cim
        zr = zr2
        if (zr * zr + zi * zi > 4) break
      }
      const p = (y * w + x) * 4
      const t = n / 40
      data[p] = n >= 39 ? 8 : 40 + t * 180
      data[p + 1] = n >= 39 ? 12 : 80 + t * 140
      data[p + 2] = n >= 39 ? 20 : 120
      data[p + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
}

function drawSlice() {
  const canvas = sliceRef.value
  if (!canvas || modeId.value !== 'surface') return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 280
  const h = canvas.clientHeight || 120
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const samples = []
  for (let i = 0; i <= 64; i += 1) {
    const y = -3 + (6 * i) / 64
    samples.push(heightAt(sliceX.value, y))
  }
  const xOf = (i) => 8 + (i / 64) * (w - 16)
  const yOf = (z) => h / 2 - z * 16
  ctx.strokeStyle = '#7dffe8'
  ctx.beginPath()
  samples.forEach((z, i) => {
    const px = xOf(i)
    const py = yOf(z)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
  const mid = 32
  const z0 = samples[mid]
  ctx.strokeStyle = '#ff7ad9'
  ctx.beginPath()
  ctx.moveTo(xOf(mid) - 28, yOf(z0) + slope.value * 7)
  ctx.lineTo(xOf(mid) + 28, yOf(z0) - slope.value * 7)
  ctx.stroke()
}

function drawPlot(time) {
  const canvas = plotRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 640
  const h = canvas.clientHeight || 420
  if (canvas.width !== Math.floor(w * dpr)) {
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
  }
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  if (modeId.value === 'fourier') {
    drawFourier(ctx, w, h, { kind: waveId.value, terms: terms.value, time: time * 0.0012 })
    return
  }
  if (probTab.value === 'galton') drawGalton(ctx, w, h)
  else if (probTab.value === 'pi') drawPi(ctx, w, h)
  else drawNormal(ctx, w, h)
}

function drawGalton(ctx, w, h) {
  galton.tick()
  const rows = galton.rows
  const left = 40
  const top = 30
  const pegW = (w - 80) / rows
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col <= row; col += 1) {
      const x = w / 2 + (col - row / 2) * pegW
      const y = top + row * 18
      ctx.beginPath()
      ctx.arc(x, y, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = '#7dffe8'
  for (const ball of galton.balls) {
    if (!ball.alive) continue
    const row = Math.min(rows - 1, ball.step)
    const shown = Math.round(ball.col * row / rows)
    const x = w / 2 + (shown - row / 2) * pegW
    const y = top + ball.y * 18
    ctx.beginPath()
    ctx.arc(x, y, 3.2, 0, Math.PI * 2)
    ctx.fill()
  }
  const max = Math.max(1, ...galton.bins)
  const base = h - 28
  galton.bins.forEach((count, index) => {
    const bh = (count / max) * 120
    const x = left + ((w - 80) * index) / rows
    ctx.fillStyle = 'rgba(125,255,232,0.75)'
    ctx.fillRect(x, base - bh, (w - 80) / rows - 3, bh)
    const theory = binomPmf(rows, index) * galton.total
    const th = (theory / max) * 120
    ctx.fillStyle = '#ffe08a'
    ctx.fillRect(x, base - th, (w - 80) / rows - 3, 2)
  })
}

function drawPi(ctx, w, h) {
  const size = Math.min(w, h) - 40
  const x0 = 20
  const y0 = 20
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.strokeRect(x0, y0, size, size)
  ctx.beginPath()
  ctx.arc(x0, y0 + size, size, -Math.PI / 2, 0)
  ctx.stroke()
  const dots = pi.dots
  for (let i = 0; i < dots.length; i += 3) {
    ctx.fillStyle = dots[i + 2] ? '#7dffe8' : 'rgba(255,255,255,0.35)'
    ctx.fillRect(x0 + dots[i] * size, y0 + (1 - dots[i + 1]) * size, 1.6, 1.6)
  }
}

function drawNormal(ctx, w, h) {
  const xOf = (x) => w / 2 + x * 48
  const yOf = (p) => h - 30 - p * 220
  ctx.fillStyle = 'rgba(125,255,232,0.18)'
  for (const band of [1, 2, 3]) {
    ctx.globalAlpha = 0.25
    ctx.fillRect(xOf(mu.value - band * sigma.value), 20, xOf(mu.value + band * sigma.value) - xOf(mu.value - band * sigma.value), h - 50)
  }
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.strokeStyle = '#7dffe8'
  for (let i = 0; i <= 120; i += 1) {
    const x = -4 + (8 * i) / 120
    const px = xOf(x)
    const py = yOf(normalPdf(x, mu.value, sigma.value))
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
}

function runToMillion() {
  window.clearInterval(piTimer)
  piTimer = window.setInterval(() => {
    pi.add(100000)
    if (pi.total >= 1000000) window.clearInterval(piTimer)
  }, 30)
}

function toggleTone() {
  if (toneOn.value) {
    stopTone()
    toneOn.value = false
    return
  }
  toneOn.value = playTone(waveId.value, terms.value)
}

function syncSurface() {
  if (modeId.value !== 'surface') return
  scene?.setSurface((x, z) => heightAt(x, z), sliceX.value)
  drawSlice()
}

watch(modeId, (id) => {
  scene?.setMode(id)
  if (id === 'surface') syncSurface()
})
watch([surfaceId, coeff, sliceX, customFn], syncSurface, { deep: true })
watch(matrix, () => scene?.setMatrix(matrix.a, matrix.b, matrix.c, matrix.d), { deep: true })
watch([cubeOn, cubeAngle], () => scene?.setCube(cubeOn.value, cubeAngle.value))
watch([juliaRe, juliaIm, fractalKind], drawJuliaThumb)

onMounted(() => {
  const queryMode = typeof route.query.mode === 'string' ? route.query.mode : ''
  if (modes.some((item) => item.id === queryMode)) modeId.value = queryMode
  scene = new MathScene(canvasRef.value, {
    onPick: ({ re, im }) => {
      juliaRe.value = re
      juliaIm.value = im
      drawJuliaThumb()
    },
    onFractal: (info) => {
      precisionLimit.value = info.limit
    }
  })
  scene.setMode(modeId.value)
  scene.setIter(iter.value)
  scene.setMatrix(matrix.a, matrix.b, matrix.c, matrix.d)
  scene.setSurface((x, z) => heightAt(x, z), sliceX.value)
  galton.drop(400)
  pi.add(800)
  drawJuliaThumb()
  const loop = (time) => {
    if (modeId.value === 'fourier' || modeId.value === 'prob') drawPlot(time)
    plotTimer = requestAnimationFrame(loop)
  }
  plotTimer = requestAnimationFrame(loop)
})

onUnmounted(() => {
  cancelAnimationFrame(plotTimer)
  window.clearInterval(piTimer)
  stopTone()
  scene?.dispose()
  scene = null
})
</script>
