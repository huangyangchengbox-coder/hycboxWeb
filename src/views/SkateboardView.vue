<template>
  <div class="skate" ref="rootRef">
    <canvas ref="canvasRef" class="skate-canvas"></canvas>
    <WorldMenu>
      <router-link class="wm-link" to="/tennis">网球世界</router-link>
    </WorldMenu>

    <header class="skate-top">
      <div>
        <div class="skate-kicker">SKATEBOARD · 力学</div>
        <div class="skate-title">滑板世界</div>
      </div>
      <p class="skate-hint">{{ activeMode.hint }}</p>
      <div class="cams">
        <button
          v-for="cam in cameras"
          :key="cam.id"
          type="button"
          class="cam-btn"
          :class="{ on: camId === cam.id }"
          @click="setCam(cam.id)"
        >{{ cam.name }}</button>
      </div>
    </header>

    <nav class="skate-nav">
      <button
        v-for="mode in modes"
        :key="mode.id"
        type="button"
        class="nav-item"
        :class="{ active: mode.id === modeId }"
        @click="changeMode(mode.id)"
      >
        <span class="nav-en">{{ mode.en }}</span>
        <span class="nav-zh">{{ mode.name }}</span>
      </button>
    </nav>

    <aside class="info-panel">
      <!-- ============ 受力实验室 ============ -->
      <template v-if="modeId === 'force'">
        <div class="info-en">FORCE LAB</div>
        <h2>受力实验室</h2>
        <p class="panel-hint">拖动滑块，看重心垂线、支点与受力矢量如何联动。重心垂线落在两轮连线内 = 稳定。</p>

        <div class="sliders">
          <label class="slider">
            <span>重心前后<span class="val">{{ fmt(comX, 2) }}</span></span>
            <input type="range" min="-1" max="1" step="0.01" v-model.number="comX" />
            <span class="slider-ends"><i>板尾</i><i>板头</i></span>
          </label>
          <label class="slider">
            <span>左右压板<span class="val">{{ leanDeg }}°</span></span>
            <input type="range" min="-1" max="1" step="0.01" v-model.number="leanY" />
            <span class="slider-ends"><i>左压</i><i>右压</i></span>
          </label>
          <label class="slider">
            <span>滑行速度<span class="val">{{ speed }} km/h</span></span>
            <input type="range" min="0" max="40" step="1" v-model.number="speed" />
            <span class="slider-ends"><i>0</i><i>40</i></span>
          </label>
        </div>

        <div class="presets">
          <button
            v-for="p in presets"
            :key="p.id"
            type="button"
            class="preset"
            @click="applyPreset(p)"
          >
            <span class="preset-icon">{{ p.icon }}</span>{{ p.name }}
          </button>
        </div>

        <div class="alert" :class="alert.tone">{{ alert.text }}</div>

        <div class="tele">
          <div class="load-bar">
            <span class="lb-front">N₁ 前 {{ Math.round(payload.n1 * 100) }}%</span>
            <div class="lb-track"><div class="lb-fill" :style="{ width: payload.n1 * 100 + '%' }"></div></div>
            <span class="lb-rear">{{ Math.round(payload.n2 * 100) }}% N₂ 后</span>
          </div>
          <table class="data">
            <tbody>
              <tr><th>俯仰角</th><td>{{ fmt(payload.pitchDeg, 1) }}°</td></tr>
              <tr><th>支点力矩 τ</th><td>{{ fmt(payload.torque, 1) }} N·m</td></tr>
              <tr><th>转弯半径 R</th><td>{{ payload.radius > 500 ? '≈ 直线' : fmt(payload.radius, 2) + ' m' }}</td></tr>
              <tr><th>离心力 Fc</th><td>{{ fmt(payload.fc, 0) }} N</td></tr>
              <tr><th>抓地余量</th><td :class="{ hot: payload.gripRatio > 0.85 }">{{ Math.round(payload.gripRatio * 100) }}%</td></tr>
              <tr><th>泵速推力</th><td>{{ fmt(payload.pumpForce, 0) }} N</td></tr>
              <tr><th>轮咬风险</th><td :class="{ hot: payload.biteRisk > 0.55 }">{{ Math.round(payload.biteRisk * 100) }}%</td></tr>
            </tbody>
          </table>
        </div>

        <details class="formulas">
          <summary>力学公式（悬停查看对应矢量）</summary>
          <div class="formula" v-for="f in formulas" :key="f.id">
            <code :style="{ color: f.color }">{{ f.formula }}</code>
            <p>{{ f.note }}</p>
          </div>
        </details>
      </template>

      <!-- ============ 四种板型 ============ -->
      <template v-else-if="modeId === 'boards'">
        <div class="info-en">BOARD TYPES</div>
        <h2>四种板型</h2>
        <p class="panel-hint">俯视视角下四板按真实比例并排。轴距决定支撑区宽度——"长板为什么稳"不用讲，看支撑区就懂。</p>
        <div class="board-list">
          <button
            v-for="b in boards"
            :key="b.id"
            type="button"
            class="board-card"
            :class="{ on: payload.boardId === b.id }"
            @click="pickBoard(b.id)"
          >
            <span class="bc-icon">{{ b.icon }}</span>
            <span class="bc-name" :style="{ color: b.color }">{{ b.name }}</span>
            <span class="bc-style">{{ b.style }}</span>
          </button>
        </div>
        <table class="data" v-if="activeBoard">
          <tbody>
            <tr><th>板长 / 轴距</th><td>{{ activeBoard.length }} / {{ activeBoard.wheelbase }} cm</td></tr>
            <tr><th>翘角 头/尾</th><td>{{ activeBoard.kickNose }}° / {{ activeBoard.kickTail }}°</td></tr>
            <tr><th>桥</th><td>{{ activeBoard.truck }}</td></tr>
            <tr><th>转角增益</th><td>前 {{ activeBoard.frontTurnGain }} / 后 {{ activeBoard.rearTurnGain }}</td></tr>
            <tr><th>轮径 / 硬度</th><td>{{ activeBoard.wheelDia }} mm / {{ activeBoard.wheelDurometer }}A</td></tr>
            <tr><th>摩擦系数 μ</th><td>{{ activeBoard.friction }}（示意）</td></tr>
            <tr><th>泵速效率</th><td>{{ Math.round(activeBoard.pumpEfficiency * 100) }}%</td></tr>
          </tbody>
        </table>
        <p class="note" v-if="activeBoard">{{ activeBoard.weakness }}</p>
        <p class="note">四板参数为常见规格中值，不同品牌差异较大；切到"受力实验室"可在同一滑块下对比四板手感。</p>
      </template>

      <!-- ============ 动作力学库 ============ -->
      <template v-else-if="modeId === 'tricks'">
        <div class="info-en">TRICK LAB</div>
        <h2>动作力学库</h2>
        <div class="trick-list">
          <button
            v-for="t in tricks"
            :key="t.id"
            type="button"
            class="trick-btn"
            :class="{ on: trickId === t.id }"
            @click="playTrick(t.id)"
          >{{ t.icon }} {{ t.name }}</button>
        </div>
        <template v-if="activeTrick">
          <h3 class="trick-headline">{{ activeTrick.headline }}</h3>
          <div class="phase" v-for="p in activeTrick.phases" :key="p.t" :class="{ on: inPhase(p) }">
            <div class="phase-name">{{ p.name }}</div>
            <p>{{ p.note }}</p>
          </div>
          <div class="alert warn">{{ activeTrick.keyPoint }}</div>
          <div class="phase-live" v-if="payload.trick">
            <div class="phase-name">当前：{{ payload.trick.phaseName }}</div>
            <p><b>{{ payload.trick.force }}</b> <span v-if="payload.trick.force">·</span> {{ payload.trick.phaseNote }}</p>
            <p class="muted">受力为阶段示意值（N 以 mg 倍数表示）</p>
          </div>
        </template>
      </template>

      <!-- ============ 转向与泵速 ============ -->
      <template v-else-if="modeId === 'turn'">
        <div class="info-en">TURN & PUMP</div>
        <h2>转向与泵速</h2>
        <p class="panel-hint">同一压板倾角下，桥的转角增益决定一切。切板型对比 R 与 F_pump 的变化；俯视视角可看转弯弧线。</p>
        <label class="slider">
          <span>压板倾角<span class="val">{{ leanDeg }}°</span></span>
          <input type="range" min="-1" max="1" step="0.01" v-model.number="leanY" />
        </label>
        <table class="data" v-if="activeBoard">
          <tbody>
            <tr><th>前桥偏转 δf</th><td>{{ fmt(payload.dF, 1) }}°</td></tr>
            <tr><th>后桥偏转 δr</th><td>{{ fmt(payload.dR, 1) }}°</td></tr>
            <tr><th>转弯半径 R</th><td>{{ payload.radius > 500 ? '≈ 直线' : fmt(payload.radius, 2) + ' m' }}</td></tr>
            <tr><th>离心力 Fc</th><td>{{ fmt(payload.fc, 0) }} N（{{ speed }} km/h）</td></tr>
            <tr><th>抓地极限 Fmax</th><td>{{ fmt(payload.fmax, 0) }} N（μ = {{ activeBoard.friction }}）</td></tr>
            <tr><th>泵速推力</th><td>{{ fmt(payload.pumpForce, 0) }} N（效率 {{ Math.round(activeBoard.pumpEfficiency * 100) }}%）</td></tr>
          </tbody>
        </table>
        <div class="turn-note">
          <p><b>压弯内倾的几何必需：</b>速度越快，离心力越大，必须倾得越多——让重力与离心力的<b>合力线</b>落进两轮连线（支撑基面）之内，否则向弯外翻倒。</p>
          <p><b>泵速的本质：</b>F_pump ≈ |sin(lean)| · η · 180 N。陆冲前桥转角增益 {{ boardById('surfskate').frontTurnGain }}（双翘仅 {{ boardById('street').frontTurnGain }}），同样的压板动作，推进效率天差地别。</p>
        </div>
        <div class="board-list mini">
          <button v-for="b in boards" :key="b.id" type="button" class="preset" @click="pickBoard(b.id)">
            <span class="preset-icon">{{ b.icon }}</span>{{ b.name }}
          </button>
        </div>
      </template>

      <!-- ============ 安全与极限 ============ -->
      <template v-else-if="modeId === 'safety'">
        <div class="info-en">SAFETY</div>
        <h2>安全与极限</h2>
        <div class="alert danger">⚠️ 轮咬可致严重摔伤，现实滑行请佩戴头盔与护具。</div>
        <div class="block">
          <h3>轮咬 Wheelbite</h3>
          <p>大倾角 + 前承重过大时，轮子被板缘卡死 → 板停轮不停 → 惯性把人向前抛出。</p>
          <p class="mono">风险度 = f(倾角 > 24°, 前承重 > 72%, 轮径-板缘间隙, 桥回弹)</p>
          <p>小鱼板间隙最小且无弹性回弹，风险四板最高；陆冲前桥弹性回弹反而显著降险。</p>
          <button type="button" class="preset danger-btn" @click="playTrick('wheelbite')">
            <span class="preset-icon">⚠️</span>观看轮咬慢放（0.25×）
          </button>
        </div>
        <div class="block">
          <h3>漂移 Powerslide</h3>
          <p>轮子从滚动摩擦切换到滑动摩擦——动摩擦做功就是减速的来源。速度没降下来就回正，会瞬间恢复抓地把人弹翻。公路上请勿模仿。</p>
        </div>
        <div class="block">
          <h3>护具</h3>
          <p>头盔是唯一不可替代件：头部没有"第二次"。护腕 / 护膝 / 护肘吸收首次冲击；摔倒时顺势滚动卸力，不要用手直撑。</p>
        </div>
        <div class="block">
          <h3>轮 × 地面</h3>
          <p>硬轮（95A+）光滑面易漂移；软轮（78–85A）粗糙面抓地强。μ 为教学示意值，非实测。</p>
        </div>
      </template>

      <!-- ============ 力学挑战 ============ -->
      <template v-else>
        <div class="info-en">QUIZ</div>
        <h2>力学挑战</h2>
        <template v-if="!quizDone">
          <p class="quiz-q">{{ quizIndex + 1 }} / {{ quiz.length }}　{{ currentQuiz.q }}</p>
          <button
            v-for="(option, index) in currentQuiz.options"
            :key="option"
            type="button"
            class="choice"
            :class="{ on: quizPick === index, wrong: quizPick === index && index !== currentQuiz.answer }"
            @click="answerQuiz(index)"
          >{{ option }}</button>
          <p v-if="quizPick !== null" class="quiz-why">{{ currentQuiz.why }}</p>
          <button v-if="quizPick !== null" type="button" class="next-btn" @click="nextQuiz">
            {{ quizIndex + 1 === quiz.length ? '查看结果' : '下一题 →' }}
          </button>
        </template>
        <template v-else>
          <p class="quiz-score">答对 {{ quizCorrect.length }} / {{ quiz.length }}</p>
          <p class="panel-hint">{{ quizScoreText }}</p>
          <button type="button" class="next-btn" @click="resetQuiz">再来一次</button>
        </template>
      </template>
    </aside>

    <!-- 底部时间轴（动作播放时） -->
    <footer class="timeline" v-if="modeId === 'tricks' && activeTrick">
      <button type="button" class="tl-play" @click="togglePlay">{{ playing ? '⏸' : '▶' }}</button>
      <input
        class="tl-range"
        type="range"
        min="0"
        :max="activeTrick.duration"
        step="0.001"
        :value="trickT"
        @input="onScrub($event)"
      />
      <span class="tl-time">{{ fmt(trickT, 2) }} / {{ fmt(activeTrick.duration, 2) }}s</span>
      <div class="tl-speed">
        <button
          v-for="s in [0.25, 0.5, 1]"
          :key="s"
          type="button"
          class="speed-btn"
          :class="{ on: timeScale === s }"
          @click="setSpeed(s)"
        >{{ s }}×</button>
      </div>
    </footer>

    <p class="disclaimer">
      受力为静态教学模型（示意参数，非实测）；动态与腾空阶段为阶段示意值。本模块为科普演示，不替代专业教练指导；公共道路滑行属危险行为。
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import { MODES, PRESETS, ALERTS, FORMULAS } from '../skateboard/catalog.js'
import { BOARDS, boardById } from '../skateboard/boards.js'
import { TRICKS, trickById } from '../skateboard/tricks.js'
import { QUIZ } from '../skateboard/quiz.js'
import { SkateScene } from '../skateboard/SkateScene.js'

const modes = MODES
const presets = PRESETS
const formulas = FORMULAS
const boards = BOARDS
const tricks = TRICKS
const quiz = QUIZ

const cameras = [
  { id: 'side', name: '侧视' },
  { id: 'top', name: '俯视' },
  { id: 'low', name: '贴地' },
  { id: 'com', name: '重心' }
]

const canvasRef = ref(null)
const rootRef = ref(null)
const modeId = ref('force')
const camId = ref('side')
const comX = ref(0)
const leanY = ref(0)
const speed = ref(0)
const playing = ref(true)
const timeScale = ref(1)
const trickT = ref(0)
const trickId = ref('ollie')

const payload = reactive({
  boardId: 'street', n1: 0.5, n2: 0.5, pitchDeg: 0, torque: 0,
  radius: Infinity, fc: 0, fmax: 700, gripRatio: 0, pumpForce: 0,
  biteRisk: 0, stance: 'dual', alertId: 'stable', dF: 0, dR: 0,
  trick: null, loadFactor: null
})

const quizIndex = ref(0)
const quizPick = ref(null)
const quizDone = ref(false)
const quizCorrect = ref([])
const currentQuiz = computed(() => quiz[quizIndex.value])
const quizScoreText = computed(() => {
  const n = quizCorrect.value.length
  if (n >= 9) return '力学满分滑手 —— 重心、力矩、摩擦，全都拿捏了。'
  if (n >= 6) return '不错的体感！回去再拖几个滑块，把"为什么"补上。'
  return '先去"受力实验室"拖一拖重心，再来挑战。'
})

let scene = null
let scrubbing = false

const activeMode = computed(() => modes.find((m) => m.id === modeId.value))
const activeBoard = computed(() => boardById(payload.boardId))
const activeTrick = computed(() => (trickId.value ? trickById(trickId.value) : null))
const alert = computed(() => ALERTS[payload.alertId] || ALERTS.stable)
const leanDeg = computed(() => Math.round(leanY.value * 35))

const fmt = (v, digits = 1) => {
  if (!Number.isFinite(v)) return '—'
  return v.toFixed(digits)
}

// 滑块 → 场景（受控值变化即退出动作播放）
watch([comX, leanY, speed], () => {
  scene?.setControl({ comX: comX.value, leanY: leanY.value, speed: speed.value })
})

function applyPreset(p) {
  comX.value = p.comX
  leanY.value = p.leanY
  speed.value = p.speed
  scene?.setControl({ comX: p.comX, leanY: p.leanY, speed: p.speed })
}

function setCam(id) {
  camId.value = id
  scene?.applyCamera(id)
}

function changeMode(id) {
  modeId.value = id
  scene?.setMode(id)
  if (id === 'boards') setCam('top')
  else if (id === 'force') setCam('side')
}

function pickBoard(id) {
  payload.boardId = id
  if (modeId.value === 'boards') {
    // 对比模式下只高亮，不切主场景
    return
  }
  scene?.setBoard(id)
}

function playTrick(id) {
  trickId.value = id
  trickT.value = 0
  playing.value = true
  if (modeId.value !== 'tricks') changeMode('tricks')
  scene?.setMode('tricks')
  scene?.playTrick(id)
  scene?.setPlaying(true)
  playing.value = true
  timeScale.value = id === 'wheelbite' ? 0.25 : timeScale.value === 0.25 ? 1 : timeScale.value
  scene?.setTimeScale(timeScale.value)
}

function togglePlay() {
  playing.value = !playing.value
  scene?.setPlaying(playing.value)
}

function onScrub(e) {
  scrubbing = true
  trickT.value = Number(e.target.value)
  scene?.setTimeline(trickT.value)
  scene?.setPlaying(false)
  playing.value = false
  requestAnimationFrame(() => (scrubbing = false))
}

function setSpeed(v) {
  timeScale.value = v
  scene?.setTimeScale(v)
}

function inPhase(p, i) {
  if (!payload.trick) return false
  const idx = activeTrick.value.phases.indexOf(p)
  const next = activeTrick.value.phases[idx + 1]
  return payload.trick.t >= p.t && (!next || payload.trick.t < next.t)
}

function answerQuiz(index) {
  if (quizPick.value !== null) return
  quizPick.value = index
  if (index === currentQuiz.value.answer) quizCorrect.value.push(quizIndex.value)
}

function nextQuiz() {
  if (quizIndex.value + 1 >= quiz.length) {
    quizDone.value = true
    return
  }
  quizIndex.value += 1
  quizPick.value = null
}

function resetQuiz() {
  quizIndex.value = 0
  quizPick.value = null
  quizDone.value = false
  quizCorrect.value = []
}

function onKey(e) {
  if (!scene) return
  if (e.code === 'Space' && modeId.value === 'tricks') {
    e.preventDefault()
    togglePlay()
  } else if (e.code === 'ArrowLeft' && modeId.value === 'tricks') {
    trickT.value = Math.max(0, trickT.value - 1 / 60)
    scene?.setTimeline(trickT.value)
  } else if (e.code === 'ArrowRight' && modeId.value === 'tricks') {
    trickT.value = Math.min(activeTrick.value.duration, trickT.value + 1 / 60)
    scene?.setTimeline(trickT.value)
  }
}

onMounted(() => {
  scene = new SkateScene(canvasRef.value)
  scene.onFrame = (p) => {
    Object.assign(payload, p)
    if (!scrubbing && p.trick) trickT.value = p.trick.t
    if (!p.trick) playing.value = scene?.playing ?? false
  }
  scene.applyCamera('side', true)
  window.addEventListener('keydown', onKey)
  if (import.meta.env.DEV) window.__skateView = scene
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.skate {
  position: fixed;
  inset: 0;
  background: #0b1120;
  color: #f1f5f9;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.skate-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

.skate-top {
  position: absolute;
  z-index: 5;
  top: 52px;
  left: 1.1rem;
  right: 1.1rem;
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  pointer-events: none;
}
.skate-kicker { font-size: 11px; letter-spacing: 0.2em; color: rgba(56, 189, 248, 0.8); }
.skate-title { font-size: 26px; font-weight: 700; letter-spacing: 0.04em; }
.skate-hint { margin: 0 0 4px; flex: 1; font-size: 13px; color: rgba(148, 163, 184, 0.9); }
.cams { display: flex; gap: 6px; pointer-events: auto; }
.cam-btn {
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: rgba(19, 28, 49, 0.72);
  color: rgba(226, 232, 240, 0.82);
  border-radius: 999px;
  padding: 5px 13px;
  font-size: 12px;
  cursor: pointer;
}
.cam-btn.on { background: rgba(56, 189, 248, 0.22); color: #7dd3fc; border-color: rgba(56, 189, 248, 0.6); }

.skate-nav {
  position: absolute;
  z-index: 5;
  left: 1.1rem;
  top: 122px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  border: 1px solid rgba(42, 59, 99, 0.7);
  background: rgba(19, 28, 49, 0.78);
  border-radius: 10px;
  padding: 7px 14px;
  cursor: pointer;
  text-align: left;
  min-width: 148px;
}
.nav-en { font-size: 10px; letter-spacing: 0.14em; color: rgba(56, 189, 248, 0.75); }
.nav-zh { font-size: 14px; color: rgba(226, 232, 240, 0.9); }
.nav-item.active { border-color: rgba(34, 211, 238, 0.65); background: rgba(34, 211, 238, 0.12); }
.nav-item.active .nav-zh { color: #67e8f9; }

.info-panel {
  position: absolute;
  z-index: 5;
  right: 1.1rem;
  top: 96px;
  bottom: 64px;
  width: 340px;
  overflow-y: auto;
  background: rgba(15, 23, 42, 0.86);
  border: 1px solid rgba(42, 59, 99, 0.8);
  border-radius: 14px;
  padding: 16px 18px 20px;
  backdrop-filter: blur(6px);
}
.info-panel::-webkit-scrollbar { width: 5px; }
.info-panel::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 3px; }
.info-en { font-size: 10px; letter-spacing: 0.18em; color: rgba(56, 189, 248, 0.8); }
.info-panel h2 { margin: 2px 0 10px; font-size: 20px; }
.panel-hint { font-size: 12.5px; line-height: 1.65; color: rgba(148, 163, 184, 0.95); margin: 0 0 12px; }

.sliders { display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px; }
.slider { display: block; font-size: 12.5px; color: rgba(203, 213, 225, 0.9); }
.slider .val { float: right; color: #67e8f9; font-variant-numeric: tabular-nums; }
.slider input[type="range"] { width: 100%; accent-color: #22d3ee; margin: 4px 0 0; }
.slider-ends { display: flex; justify-content: space-between; font-size: 10px; color: rgba(100, 116, 139, 0.8); }
.slider-ends i { font-style: normal; }

.presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.preset {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border: 1px solid rgba(42, 59, 99, 0.8);
  background: rgba(26, 38, 66, 0.7);
  color: rgba(226, 232, 240, 0.88);
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}
.preset:hover { border-color: rgba(34, 211, 238, 0.6); }
.preset-icon { font-size: 13px; }
.danger-btn { border-color: rgba(248, 113, 113, 0.5); color: #fca5a5; }

.alert { border-radius: 9px; padding: 9px 12px; font-size: 12.5px; line-height: 1.6; margin-bottom: 12px; }
.alert.ok { background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.35); color: #bbf7d0; }
.alert.warn { background: rgba(250, 204, 21, 0.09); border: 1px solid rgba(250, 204, 21, 0.35); color: #fde68a; }
.alert.danger { background: rgba(248, 113, 113, 0.12); border: 1px solid rgba(248, 113, 113, 0.45); color: #fecaca; }

.tele .load-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; font-size: 11.5px; color: rgba(148, 163, 184, 0.9); }
.lb-track { flex: 1; height: 10px; border-radius: 5px; background: rgba(30, 41, 59, 0.9); overflow: hidden; border: 1px solid rgba(42, 59, 99, 0.8); }
.lb-fill { height: 100%; background: linear-gradient(90deg, #7f6ce0, #22d3ee); }
.lb-front { color: #67e8f9; white-space: nowrap; }
.lb-rear { color: #a5b4fc; white-space: nowrap; }

table.data { width: 100%; border-collapse: collapse; font-size: 12.5px; }
table.data th, table.data td { padding: 5px 4px; border-bottom: 1px solid rgba(42, 59, 99, 0.55); text-align: left; }
table.data th { color: rgba(148, 163, 184, 0.85); font-weight: 500; width: 42%; }
table.data td { color: rgba(241, 245, 249, 0.92); font-variant-numeric: tabular-nums; }
td.hot { color: #fca5a5; font-weight: 600; }

.formulas { margin-top: 12px; font-size: 12px; }
.formulas summary { cursor: pointer; color: rgba(56, 189, 248, 0.85); }
.formula { margin: 8px 0; }
.formula code { font-size: 12px; font-family: ui-monospace, Menlo, Consolas, monospace; }
.formula p { margin: 2px 0 0; color: rgba(148, 163, 184, 0.85); font-size: 11.5px; line-height: 1.55; }

.board-list { display: flex; flex-direction: column; gap: 7px; margin-bottom: 12px; }
.board-list.mini { flex-direction: row; flex-wrap: wrap; }
.board-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  border: 1px solid rgba(42, 59, 99, 0.8);
  background: rgba(26, 38, 66, 0.6);
  border-radius: 10px;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
}
.board-card.on { border-color: rgba(34, 211, 238, 0.6); background: rgba(34, 211, 238, 0.08); }
.bc-icon { font-size: 16px; }
.bc-name { font-size: 13.5px; font-weight: 600; }
.bc-style { font-size: 11.5px; line-height: 1.5; color: rgba(148, 163, 184, 0.9); }
.note { font-size: 11.5px; line-height: 1.6; color: rgba(148, 163, 184, 0.85); }

.trick-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.trick-btn {
  border: 1px solid rgba(42, 59, 99, 0.8);
  background: rgba(26, 38, 66, 0.7);
  color: rgba(226, 232, 240, 0.88);
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  cursor: pointer;
}
.trick-btn.on { border-color: rgba(34, 211, 238, 0.65); background: rgba(34, 211, 238, 0.12); color: #67e8f9; }
.trick-headline { font-size: 13.5px; color: #fde68a; margin: 4px 0 10px; line-height: 1.55; }
.phase { border-left: 2px solid rgba(42, 59, 99, 0.9); padding: 4px 10px; margin-bottom: 8px; opacity: 0.6; }
.phase.on { border-left-color: #22d3ee; opacity: 1; }
.phase-name { font-size: 12.5px; font-weight: 600; color: rgba(241, 245, 249, 0.92); }
.phase p { margin: 2px 0 0; font-size: 12px; line-height: 1.55; color: rgba(148, 163, 184, 0.95); }
.phase-live { background: rgba(34, 211, 238, 0.07); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 9px; padding: 9px 12px; margin-top: 10px; }
.phase-live p { margin: 3px 0 0; font-size: 12.5px; color: rgba(226, 232, 240, 0.9); }
.muted { color: rgba(100, 116, 139, 0.85); font-size: 11px !important; }

.turn-note p { font-size: 12.5px; line-height: 1.7; color: rgba(203, 213, 225, 0.92); margin: 0 0 10px; }
.block h3 { font-size: 14px; margin: 12px 0 6px; color: #7dd3fc; }
.block p { margin: 0 0 8px; font-size: 12.5px; line-height: 1.7; color: rgba(203, 213, 225, 0.92); }
.mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11.5px !important; color: #a5b4fc !important; }

.quiz-q { font-size: 14px; line-height: 1.65; margin: 0 0 12px; }
.choice {
  display: block;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(42, 59, 99, 0.8);
  background: rgba(26, 38, 66, 0.6);
  color: rgba(226, 232, 240, 0.9);
  border-radius: 9px;
  padding: 8px 12px;
  font-size: 12.5px;
  margin-bottom: 7px;
  cursor: pointer;
  line-height: 1.5;
}
.choice.on { border-color: rgba(34, 211, 238, 0.6); }
.choice.wrong { border-color: rgba(248, 113, 113, 0.6); background: rgba(248, 113, 113, 0.08); }
.quiz-why { font-size: 12px; line-height: 1.65; color: rgba(148, 163, 184, 0.95); margin: 8px 0; }
.next-btn {
  border: 1px solid rgba(34, 211, 238, 0.5);
  background: rgba(34, 211, 238, 0.1);
  color: #67e8f9;
  border-radius: 8px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
}
.quiz-score { font-size: 18px; font-weight: 600; color: #7dd3fc; margin: 6px 0; }

.timeline {
  position: absolute;
  z-index: 6;
  left: 50%;
  transform: translateX(-50%);
  bottom: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(42, 59, 99, 0.8);
  border-radius: 12px;
  padding: 8px 14px;
  backdrop-filter: blur(6px);
}
.tl-play { border: none; background: none; color: #67e8f9; font-size: 15px; cursor: pointer; }
.tl-range { width: 320px; accent-color: #22d3ee; }
.tl-time { font-size: 11.5px; color: rgba(148, 163, 184, 0.9); font-variant-numeric: tabular-nums; }
.tl-speed { display: flex; gap: 4px; }
.speed-btn {
  border: 1px solid rgba(42, 59, 99, 0.8);
  background: none;
  color: rgba(148, 163, 184, 0.85);
  border-radius: 6px;
  padding: 3px 7px;
  font-size: 11px;
  cursor: pointer;
}
.speed-btn.on { color: #67e8f9; border-color: rgba(34, 211, 238, 0.6); }

.disclaimer {
  position: absolute;
  z-index: 5;
  left: 1.1rem;
  bottom: 10px;
  margin: 0;
  font-size: 10.5px;
  color: rgba(100, 116, 139, 0.75);
  max-width: 46%;
}

@media (max-width: 900px) {
  .skate-nav { flex-direction: row; flex-wrap: wrap; top: 108px; right: 1.1rem; }
  .nav-item { min-width: 0; flex: 1 1 40%; }
  .info-panel { top: 178px; right: 0.6rem; left: 0.6rem; width: auto; bottom: 56px; }
  .skate-hint { display: none; }
  .tl-range { width: 180px; }
  .disclaimer { max-width: 90%; }
}
</style>
