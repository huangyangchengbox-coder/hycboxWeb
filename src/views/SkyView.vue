<template>
  <div class="lab" style="--lab-accent:#9ecbff">
    <canvas ref="canvasRef" class="lab-canvas"></canvas>
    <WorldMenu />

    <header class="lab-top">
      <div>
        <div class="lab-kicker">SKY</div>
        <div class="lab-title">天象</div>
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
        <h2>天文挑战</h2>
        <template v-if="!quizDone">
          <p>{{ quizIndex + 1 }} / {{ quiz.length }}　{{ currentQuiz.q }}</p>
          <button
            v-for="(option, index) in currentQuiz.options"
            :key="option"
            type="button"
            class="choice"
            :class="{ on: quizPick === index }"
            @click="answerQuiz(index)"
          >{{ option }}</button>
          <p v-if="quizPick !== null" class="note">{{ currentQuiz.why }}</p>
        </template>
        <template v-else>
          <p>答对 {{ quizScore }} / {{ quiz.length }}。</p>
          <button type="button" class="solid" @click="resetQuiz">再来一次</button>
        </template>
      </template>

      <template v-else-if="modeId === 'moon'">
        <div class="lab-kicker">MOON</div>
        <h2>{{ sky.phase }}</h2>
        <p>月球被太阳照亮的一半始终朝着太阳。我们看见的圆缺，是这条明暗界线对着地球的角度，不是地球的影子。</p>
        <dl>
          <dt>日期</dt><dd>{{ sky.date.text }}</dd>
          <dt>可见比例</dt><dd>{{ Math.round(sky.illum * 100) }}%</dd>
          <dt>月出推迟</dt><dd>每天大约 50 分钟</dd>
        </dl>
        <p class="note">月球相对恒星每天东移约 13°，所以下一次升起来会晚大约 50 分钟。镜头放在地月之间，月面明暗来自太阳光。</p>
      </template>

      <template v-else-if="modeId === 'eclipse'">
        <div class="lab-kicker">ECLIPSE</div>
        <h2>{{ sky.eclipse.solar ? '日食几何' : sky.eclipse.lunar ? '月食几何' : '这一天对不齐' }}</h2>
        <p>日食在朔，月食在望，而且还得让月球靠近黄白交点。白道倾斜 {{ incl }}°，所以多数月份三者只是擦肩而过。</p>
        <div class="chips">
          <button
            v-for="item in eclipses"
            :key="item.id"
            type="button"
            class="chip"
            :class="{ on: alignId === item.id }"
            @click="playEclipse(item)"
          >{{ item.name }}</button>
        </div>
        <p v-if="activeEclipse">{{ activeEclipse.note }}</p>
        <p class="note">点著名食相时，日期拨到当天，并把月球拨到交点上。这是对齐演示：简化历本身大约差一天，真实天空还要算交点进动。</p>
      </template>

      <template v-else-if="modeId === 'season'">
        <div class="lab-kicker">SEASONS</div>
        <h2>直射点 {{ sky.dec.toFixed(1) }}°</h2>
        <p>地轴倾斜 {{ tilt }}°，而且倾的方向在公转时几乎不变。于是太阳直射点在南北回归线之间来回走。</p>
        <dl>
          <dt>观测纬度</dt><dd>{{ lat.toFixed(0) }}°</dd>
          <dt>正午太阳</dt><dd>{{ sky.noon.alt.toFixed(1) }}° · 向{{ sky.noon.facing }}</dd>
          <dt>影长 / 杆长</dt><dd>{{ sky.noon.shadow == null ? '太阳在地平线下' : sky.noon.shadow.toFixed(2) }}</dd>
        </dl>
        <p>橙色点是近日点（约 1 月 4 日），蓝色点是远日点（约 7 月 4 日）。北半球的冬天反而离太阳更近。</p>
        <p class="note">图上把离心率放大到 0.16，真实只有约 0.0167，日地距离全年只差约 3%。四季的原因是倾角，不是距离。</p>
      </template>

      <template v-else-if="modeId === 'terms'">
        <div class="lab-kicker">{{ sky.term.date }}</div>
        <h2>{{ sky.term.name }}</h2>
        <p>太阳黄经 {{ sky.lon.toFixed(1) }}°。节气是黄道上每隔 15° 的刻度，跟月相无关，所以是纯阳历。</p>
        <dl>
          <dt>物候</dt><dd>{{ sky.term.phenology }}</dd>
          <dt>习俗</dt><dd>{{ sky.term.custom }}</dd>
          <dt>常年日期</dt><dd>{{ sky.term.date }}</dd>
        </dl>
        <div class="chips">
          <button v-for="term in terms" :key="term.name" type="button" class="chip" :class="{ on: term.name === sky.term.name }" @click="goTerm(term)">{{ term.name }}</button>
        </div>
        <p class="note">黄经按 15° 等分，没有做岁差修正。日期是公历常年近似。</p>
      </template>

      <template v-else>
        <div class="lab-kicker">DAYLIGHT</div>
        <h2>{{ lat.toFixed(0) }}° 的白昼</h2>
        <p>这一天大约 {{ sky.daylight.toFixed(1) }} 小时。公式是 24/π · arccos(−tan φ · tan δ)，δ 是当天太阳赤纬。</p>
        <canvas ref="dayChart" class="mini-chart"></canvas>
        <dl>
          <dt>赤纬 δ</dt><dd>{{ sky.dec.toFixed(1) }}°</dd>
          <dt>正午高度</dt><dd>{{ sky.noon.alt.toFixed(1) }}°</dd>
        </dl>
        <p>北京正午时，标准时（不计夏令时）：</p>
        <dl>
          <template v-for="city in clocks" :key="city.name">
            <dt>{{ city.name }}</dt><dd>{{ city.text }}</dd>
          </template>
        </dl>
        <p class="note">同一时刻，经度每差 15°，地方时大约差 1 小时。曲线是整年白昼，竖线是当前日期。</p>
      </template>
    </aside>

    <div v-if="modeId !== 'quiz'" class="lab-dock">
      <button type="button" class="chip" :class="{ on: playing }" @click="playing = !playing">{{ playing ? '暂停' : '播放' }}</button>
      <label>日期 {{ sky.date.text }}
        <input v-model.number="day" type="range" min="0" max="9862" step="0.25" />
      </label>
      <label v-if="modeId === 'season' || modeId === 'clock'">纬度 {{ lat.toFixed(0) }}°
        <input v-model.number="lat" type="range" min="-80" max="80" step="1" />
      </label>
      <button v-if="alignId" type="button" class="ghost" @click="clearAlign">退出食相对齐</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { MODES, SKY_QUIZ } from '../skywatch/catalog.js'
import { clocksAtBeijingNoon, daylightSeries, dayOfDate, describe, SOLAR_TERMS } from '../skywatch/astro.js'
import { SkyScene } from '../skywatch/SkyScene.js'
import '../styles/lab.css'

const modes = MODES
const quiz = SKY_QUIZ
const terms = SOLAR_TERMS
const eclipses = [
  { id: '2009', name: '2009 长江', align: 'solar', day: dayOfDate(2009, 7, 22), note: '全食带经过长江流域。模型里已把月球拨到交点上。' },
  { id: '2020', name: '2020 环食', align: 'solar', day: dayOfDate(2020, 6, 21), note: '环食带横贯我国南方。这里演示的是三点一线，不是食分地图。' },
  { id: '2022', name: '2022 月全食', align: 'lunar', day: dayOfDate(2022, 11, 8), note: '望日，地球影子罩住月球。' },
  { id: '2024', name: '2024 北美', align: 'solar', day: dayOfDate(2024, 4, 8), note: '全食带穿过北美。镜头改到月球背后看日面。' }
]
const clocks = clocksAtBeijingNoon()
const tilt = '23.4'
const incl = '5.1'

const route = useRoute()
const router = useRouter()
const canvasRef = ref(null)
const dayChart = ref(null)
const modeId = ref('moon')
const day = ref(dayOfDate(2026, 11, 20))
const lat = ref(31)
const playing = ref(false)
const align = ref(null)
const alignId = ref('')
const quizIndex = ref(0)
const quizScore = ref(0)
const quizPick = ref(null)
const quizDone = ref(false)

let scene = null
let timer = 0

const active = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const sky = computed(() => describe(day.value, lat.value, align.value))
const currentQuiz = computed(() => quiz[quizIndex.value])
const activeEclipse = computed(() => eclipses.find((item) => item.id === alignId.value))

function changeMode(id) {
  modeId.value = id
  if (id !== 'eclipse') clearAlign()
  router.replace({ query: { ...route.query, mode: id } })
}

function playEclipse(item) {
  align.value = item.align
  alignId.value = item.id
  day.value = item.day
  playing.value = false
}

function clearAlign() {
  align.value = null
  alignId.value = ''
}

function goTerm(term) {
  const base = term.date.startsWith('01') || term.date.startsWith('02') ? 2026 : 2026
  const [m, d] = term.date.split('-').map(Number)
  const year = m <= 2 && term.lon >= 285 ? 2027 : base
  day.value = dayOfDate(year, m, d)
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

function drawDaylight() {
  const canvas = dayChart.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 280
  const h = canvas.clientHeight || 120
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255,255,255,0.04)'
  ctx.fillRect(0, 0, w, h)
  const series = daylightSeries(lat.value)
  const xOf = (d) => 8 + (d / 365) * (w - 16)
  const yOf = (hour) => h - 8 - (hour / 24) * (h - 20)
  ctx.strokeStyle = 'rgba(255,255,255,0.16)'
  ctx.beginPath()
  ctx.moveTo(8, yOf(12))
  ctx.lineTo(w - 8, yOf(12))
  ctx.stroke()
  ctx.strokeStyle = '#9ecbff'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  series.xs.forEach((x, i) => {
    const px = xOf(x)
    const py = yOf(series.ys[i])
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
  const cursor = ((day.value % 365) + 365) % 365
  ctx.strokeStyle = '#ffe08a'
  ctx.beginPath()
  ctx.moveTo(xOf(cursor), 8)
  ctx.lineTo(xOf(cursor), h - 8)
  ctx.stroke()
}

watch([day, lat, align], () => {
  scene?.setDay(day.value)
  scene?.setLatitude(lat.value)
  scene?.setAlign(align.value)
  drawDaylight()
})

watch(modeId, (id) => scene?.setMode(id))

watch(playing, (on) => {
  window.clearInterval(timer)
  if (!on) return
  timer = window.setInterval(() => {
    day.value = (day.value + 0.35) % 9862
  }, 50)
})

onMounted(() => {
  const queryMode = typeof route.query.mode === 'string' ? route.query.mode : ''
  if (modes.some((item) => item.id === queryMode)) modeId.value = queryMode
  scene = new SkyScene(canvasRef.value)
  scene.setDay(day.value)
  scene.setMode(modeId.value)
  scene.setLatitude(lat.value)
  drawDaylight()
})

onUnmounted(() => {
  window.clearInterval(timer)
  scene?.dispose()
  scene = null
})
</script>
