<template>
  <div class="tennis">
    <canvas ref="canvasRef" class="tennis-canvas"></canvas>
    <WorldMenu />

    <aside class="mode-panel">
      <div class="kicker">TENNIS</div>
      <h1>网球世界</h1>
      <p class="sub">{{ current.hint }}</p>
      <div class="mode-list">
        <button
          v-for="item in modes"
          :key="item.id"
          type="button"
          :class="{ on: item.id === modeId }"
          @click="chooseMode(item.id)"
        >
          <span class="mode-name">{{ item.name }}</span>
          <span class="mode-en">{{ item.en }}</span>
        </button>
      </div>
    </aside>

    <!-- A 技巧实验室 -->
    <aside v-if="modeId === 'lab'" class="info-panel">
      <div class="kicker">{{ shot.en }}</div>
      <h2>{{ shot.name }}</h2>
      <div class="shot-grid">
        <button
          v-for="item in shots"
          :key="item.id"
          type="button"
          :class="{ on: item.id === shotId }"
          @click="chooseShot(item.id)"
        >{{ item.name }}</button>
      </div>
      <p>{{ shot.desc }}</p>
      <p class="phase">动作阶段：{{ phaseName }}</p>
      <ol>
        <li v-for="point in shot.points" :key="point">{{ point }}</li>
      </ol>
      <p class="warn">{{ shot.error }}</p>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: surfaceId === item }"
          @click="setSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <p class="net" :class="{ hit: labNet.hit }">{{ labNet.text }}</p>
      <p class="note">一种常见做法，不是唯一打法。球的飞行按重力示意，球本身放大了，方便看清。</p>
    </aside>

    <!-- B 旋转的科学 -->
    <aside v-else-if="modeId === 'spin'" class="info-panel">
      <div class="kicker">SPIN SCIENCE</div>
      <h2>上旋为什么不一样</h2>
      <p>三颗球同一初速、同一出射角，只有旋转不同。马格努斯力让上旋往下压、下旋往上托。</p>
      <div class="slider">
        <label>转速 {{ spinData.rpm }} rpm</label>
        <input
          type="range"
          min="0"
          max="4000"
          step="100"
          :value="spinData.rpm"
          @input="onRpm"
        />
      </div>
      <table class="data">
        <thead>
          <tr><th>类型</th><th>过网</th><th>落点</th><th>弹起</th></tr>
        </thead>
        <tbody>
          <tr v-for="lane in spinData.lanes" :key="lane.id">
            <td :style="{ color: lane.color }">{{ lane.name }}</td>
            <td>{{ lane.netHeight === null ? '—' : lane.netHeight.toFixed(2) + ' m' }}</td>
            <td>{{ lane.landZ === null ? '—' : landText(lane.landZ) }}</td>
            <td>{{ lane.bounceHeight ? lane.bounceHeight.toFixed(2) + ' m' : '—' }}</td>
          </tr>
        </tbody>
      </table>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: spinData.surfaceId === item }"
          @click="setSpinSurface(item)"
        >{{ surfaceName(item) }}</button>
        <button type="button" class="chip" :class="{ on: spinData.showForces }" @click="toggleForces">力矢量</button>
      </div>
      <p class="note">{{ spinData.surf?.note }}。弹跳参数为教学示意值，非 ITF 实测。</p>
      <p class="note">转速参考：职业顶尖正手 3000+ rpm，业余多在 1000–2000 rpm。</p>
    </aside>

    <!-- C 球场与规则 -->
    <aside v-else-if="modeId === 'court'" class="info-panel">
      <div class="kicker">COURT &amp; RULES</div>
      <h2>场地多大、怎么算分</h2>
      <div class="chips">
        <button
          v-for="item in surfaceList"
          :key="item"
          type="button"
          class="chip"
          :class="{ on: courtData.surfaceId === item }"
          @click="setCourtSurface(item)"
        >{{ surfaceName(item) }}</button>
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: !courtData.singles }" @click="setSingles(false)">双打线</button>
        <button type="button" class="chip" :class="{ on: courtData.singles }" @click="setSingles(true)">单打线</button>
        <button type="button" class="chip" @click="nextServe">下一发球位</button>
      </div>
      <p class="serve">{{ serveText }}</p>
      <div class="score">
        <div class="score-row">
          <span class="who">A</span>
          <span class="pts">{{ pointLabel('a') }}</span>
          <span class="games">{{ score.games.a }}</span>
          <button type="button" @click="scoreA">A 得分</button>
        </div>
        <div class="score-row">
          <span class="who">B</span>
          <span class="pts">{{ pointLabel('b') }}</span>
          <span class="games">{{ score.games.b }}</span>
          <button type="button" @click="scoreB">B 得分</button>
        </div>
        <p v-if="score.advantage" class="adv">{{ score.advantage === 'a' ? 'A 占先' : 'B 占先' }}</p>
        <p v-if="score.tiebreak" class="adv">抢七中</p>
        <button type="button" class="reset" @click="resetScore">重置比分</button>
      </div>
      <p class="log">{{ score.log[score.log.length - 1] }}</p>
      <ul class="rules">
        <li v-for="rule in rules" :key="rule.q"><b>{{ rule.q }}</b>：{{ rule.a }}</li>
      </ul>
    </aside>

    <!-- D 历史长廊 -->
    <aside v-else-if="modeId === 'history'" class="info-panel">
      <div class="kicker">HISTORY</div>
      <h2>这项运动怎么来的</h2>
      <p class="year">{{ historyData.item.year }}</p>
      <p>{{ historyData.item.text }}</p>
      <p class="note">同期球拍：{{ historyData.racketName }}</p>
      <div class="timeline">
        <button
          v-for="(item, index) in timeline"
          :key="item.year"
          type="button"
          class="tick"
          :class="{ on: index === historyData.index }"
          @click="selectYear(index)"
        >{{ item.year }}</button>
      </div>
      <h3>中国节点</h3>
      <ul class="rules">
        <li v-for="item in china" :key="item.year"><b>{{ item.year }}</b>：{{ item.text }}</li>
      </ul>
      <p class="note">球拍进化：木拍 → 金属 → 碳纤维；球从白色改为荧光黄，是为了电视转播辨识度。</p>
    </aside>

    <!-- E 装备解剖 -->
    <aside v-else-if="modeId === 'gear'" class="info-panel">
      <div class="kicker">GEAR LAB</div>
      <h2>拍子参数意味着什么</h2>
      <div class="slider">
        <label>拍面 {{ gearData.gear.headArea }} in²</label>
        <input type="range" min="95" max="110" step="1" :value="gearData.gear.headArea" @input="onGear('headArea', $event)" />
      </div>
      <div class="slider">
        <label>重量 {{ gearData.gear.weight }} g</label>
        <input type="range" min="260" max="340" step="5" :value="gearData.gear.weight" @input="onGear('weight', $event)" />
      </div>
      <div class="slider">
        <label>平衡点 {{ gearData.gear.balance }} cm（头轻 ↔ 头重）</label>
        <input type="range" min="29" max="38" step="1" :value="gearData.gear.balance" @input="onGear('balance', $event)" />
      </div>
      <div class="slider">
        <label>穿线磅数 {{ gearData.gear.tension }} lbs</label>
        <input type="range" min="45" max="60" step="1" :value="gearData.gear.tension" @input="onGear('tension', $event)" />
      </div>
      <div class="chips">
        <button type="button" class="chip" :class="{ on: isPattern(16, 19) }" @click="setPattern([16, 19])">16×19</button>
        <button type="button" class="chip" :class="{ on: isPattern(18, 20) }" @click="setPattern([18, 20])">18×20</button>
      </div>
      <div class="slider">
        <label>击球点偏离甜区 {{ (gearData.offset * 100).toFixed(0) }} cm</label>
        <input type="range" min="0" max="14" step="1" :value="Math.round(gearData.offset * 100)" @input="onOffset" />
      </div>
      <p class="phase">出球速度保留约 {{ (gearData.factor * 100).toFixed(0) }}%</p>
      <p class="note">{{ gearData.balanceNote }}。拍面越大甜区越大、容错高，控制略降；低磅弹性大、高磅控制好。</p>
      <p class="note">ITF 限制：拍面长 ≤ 73.66 cm、宽 ≤ 31.75 cm。</p>
    </aside>

    <!-- F 训练挑战 -->
    <aside v-else class="info-panel">
      <div class="kicker">TRAINING</div>
      <h2>训练挑战</h2>
      <template v-if="!finished">
        <p class="quiz-index">第 {{ quizIndex + 1 }} / {{ quiz.length }} 题</p>
        <p class="quiz-q">{{ currentQuiz.q }}</p>
        <div class="quiz-options">
          <button
            v-for="(option, index) in currentQuiz.options"
            :key="option"
            type="button"
            :class="{ on: picked === index, right: picked !== null && index === currentQuiz.answer, wrong: picked === index && index !== currentQuiz.answer }"
            :disabled="picked !== null"
            @click="pick(index)"
          >{{ option }}</button>
        </div>
        <p v-if="picked !== null" class="why">{{ currentQuiz.why }}</p>
        <button v-if="picked !== null" type="button" class="reset" @click="nextQuiz">
          {{ quizIndex + 1 >= quiz.length ? '看结果' : '下一题' }}
        </button>
      </template>
      <template v-else>
        <p class="score-big">{{ correct }} / {{ quiz.length }}</p>
        <p class="note">{{ resultText }}</p>
        <button type="button" class="reset" @click="restartQuiz">再来一轮</button>
      </template>
    </aside>

    <footer v-if="modeId === 'lab'" class="dock">
      <button type="button" @click="toggle">{{ playing ? '暂停' : '播放' }}</button>
      <button type="button" @click="replay">重播</button>
      <input
        type="range"
        min="0"
        max="1000"
        :value="Math.round(progress * 1000)"
        @pointerdown="scrubbing = true"
        @pointerup="scrubbing = false"
        @change="scrubbing = false"
        @input="onScrub"
      />
      <span class="time">{{ phaseName }}</span>
      <button type="button" :class="{ on: speed === 0.5 }" @click="setSpeed(0.5)">0.5×</button>
      <button type="button" :class="{ on: speed === 1 }" @click="setSpeed(1)">1×</button>
      <button type="button" @click="scene?.setCamera('arena')">全场</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('behind')">后视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <button type="button" @click="scene?.setCamera('racket')">拍面特写</button>
    </footer>

    <footer v-else class="dock dock-thin">
      <button type="button" @click="scene?.setCamera('overview')">全景</button>
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
      <span class="hint-text">拖动旋转 · 滚轮缩放</span>
    </footer>

    <p class="disclaimer">本模块为科普与教学示意，动作参数与场地弹跳经简化，不替代专业教练指导。场地线按 ITF 尺寸。</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import { MODES, SHOTS, shotById } from '../tennis/catalog.js'
import { SURFACES } from '../tennis/court.js'
import { TIMELINE, CHINA } from '../tennis/history.js'
import { QUIZ } from '../tennis/quiz.js'
import { RULES, emptyScore, nextScore } from '../tennis/rules.js'
import { TennisStage } from '../tennis/stage.js'
import { LabMode } from '../tennis/modes/LabMode.js'
import { SpinMode } from '../tennis/modes/SpinMode.js'
import { CourtMode } from '../tennis/modes/CourtMode.js'
import { HistoryMode } from '../tennis/modes/HistoryMode.js'
import { GearMode } from '../tennis/modes/GearMode.js'
import { TrainMode } from '../tennis/modes/TrainMode.js'

const modes = MODES
const shots = SHOTS
const surfaceList = Object.keys(SURFACES)
const timeline = TIMELINE
const china = CHINA
const rules = RULES
const quiz = QUIZ

const canvasRef = ref(null)
const modeId = ref('lab')
const shotId = ref('forehand')
const progress = ref(0)
const playing = ref(true)
const speed = ref(1)
const phaseName = ref('准备引拍')
const surfaceId = ref('hard')
const scrubbing = ref(false)
const labNet = reactive({ hit: false, text: '' })
const spinData = reactive({ rpm: 2500, surfaceId: 'hard', showForces: true, lanes: [], surf: SURFACES.hard })
const courtData = reactive({ surfaceId: 'hard', singles: false })
const historyData = reactive({ index: 6, item: TIMELINE[6], racketName: '木拍 · 1920s' })
const gearData = reactive({
  gear: { headArea: 100, weight: 300, balance: 33, pattern: [16, 19], tension: 53 },
  offset: 0,
  factor: 1,
  balanceNote: ''
})
const score = reactive(emptyScore())
const serveText = ref('')
const quizIndex = ref(0)
const picked = ref(null)
const correct = ref(0)
const finished = ref(false)

let scene = null

const current = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const shot = computed(() => SHOTS.find((item) => item.id === shotId.value) || SHOTS[0])
const currentQuiz = computed(() => quiz[quizIndex.value])
const resultText = computed(() => {
  const rate = correct.value / quiz.length
  if (rate === 1) return '全对。规则和技术要点都记住了。'
  if (rate >= 0.7) return '大部分对了。再回技巧实验室和球场与规则看一遍细节。'
  if (rate >= 0.4) return '对了一半左右。建议先看计分演示和旋转对比。'
  return '先把技巧实验室的击球帧和球场规则的计分板过一遍再来。'
})

function surfaceName(id) {
  return SURFACES[id]?.name || id
}

function pointLabel(who) {
  const mine = score.points[who]
  const other = score.points[who === 'a' ? 'b' : 'a']
  if (score.tiebreak) return `${mine}`
  if (mine >= 3 && other >= 3) {
    if (score.advantage === who) return 'AD'
    return '40'
  }
  return ['0', '15', '30', '40'][Math.min(mine, 3)]
}

function chooseShot(id) {
  shotId.value = id
  if (scene instanceof LabMode) scene.setShot(id)
  playing.value = true
  if (scene instanceof LabMode) scene.setPlaying(true)
}

function chooseMode(id) {
  modeId.value = id
  const next = createMode(id)
  scene = next
  wire(next)
  stage.load(next)
  if (next instanceof LabMode) next.reportNetInfo()
  syncPlaying()
}

function createMode(id) {
  if (id === 'spin') return new SpinMode(stage)
  if (id === 'court') return new CourtMode(stage)
  if (id === 'history') return new HistoryMode(stage)
  if (id === 'gear') return new GearMode(stage)
  if (id === 'train') return new TrainMode(stage)
  return new LabMode(stage)
}

function wire(node) {
  if (!node) return
  if (node instanceof LabMode) {
    node.onFrame = ({ progress: value, playing: isPlaying, phase }) => {
      if (!scrubbing.value) progress.value = value
      playing.value = isPlaying
      if (phase) phaseName.value = phase
      shotId.value = node.shot.id
    }
    node.onNetChange = ({ hit, clear, landing }) => {
      labNet.hit = hit
      if (hit) {
        labNet.text = '过网高度不够，球会触网弹回'
      } else if (clear !== null && clear !== undefined) {
        const land = landing ? `，落点距底线约 ${Math.abs(11.885 - landing.z).toFixed(1)} 米` : ''
        labNet.text = `过网高度约 ${(0.914 + clear).toFixed(2)} 米${land}`
      } else {
        labNet.text = ''
      }
    }
  }
  if (node instanceof SpinMode) {
    node.onFrame = () => {}
    node.onData = (data) => {
      spinData.rpm = data.rpm
      spinData.surfaceId = data.surfaceId
      spinData.showForces = data.showForces
      spinData.lanes = data.lanes
      spinData.surf = data.surf
    }
  }
  if (node instanceof CourtMode) {
    node.onFrame = () => {}
    node.onData = (data) => {
      courtData.surfaceId = data.surfaceId
      courtData.singles = data.singles
    }
    node.onServe = (info) => {
      serveText.value = `第 ${info.index + 1} 个发球位：${info.side === 'deuce' ? '右半区（平分侧）' : '左半区（占先侧）'}，目标是斜对角发球区`
    }
  }
  if (node instanceof HistoryMode) {
    node.onData = (data) => {
      historyData.index = data.index
      historyData.item = data.item
      historyData.racketName = data.racketName
    }
  }
  if (node instanceof GearMode) {
    node.onData = (data) => {
      gearData.gear = data.gear
      gearData.offset = data.offset
      gearData.factor = data.factor
      gearData.balanceNote = data.balanceNote
    }
  }
}

let stage = null

function syncPlaying() {
  if (modeId.value === 'lab') scene?.setPlaying(playing.value)
}

function toggle() {
  playing.value = !playing.value
  scene?.setPlaying(playing.value)
}

function replay() {
  scene?.setProgress(0)
  playing.value = true
  scene?.setPlaying(true)
}

function setSpeed(value) {
  speed.value = value
  scene?.setSpeed(value)
}

function onScrub(event) {
  const value = Number(event.target.value) / 1000
  progress.value = value
  scene?.setProgress(value)
  playing.value = false
}

function setSurface(id) {
  surfaceId.value = id
  if (scene instanceof LabMode) scene.setSurface(id)
}

function setSpinSurface(id) {
  if (scene instanceof SpinMode) scene.setSurface(id)
}

function setCourtSurface(id) {
  if (scene instanceof CourtMode) scene.setSurface(id)
}

function onRpm(event) {
  const value = Number(event.target.value)
  if (scene instanceof SpinMode) scene.setRpm(value)
}

function toggleForces() {
  if (scene instanceof SpinMode) scene.toggleForces()
}

function setSingles(value) {
  if (scene instanceof CourtMode) scene.setSingles(value)
}

function nextServe() {
  if (scene instanceof CourtMode) {
    const next = (scene.serveIndex + 1) % 4
    scene.setServe(next)
  }
}

function scoreFor(who) {
  const result = nextScore(score, who)
  score.points = result.points
  score.games = result.games
  score.advantage = result.advantage ?? null
  score.tiebreak = result.tiebreak ?? false
  score.log = result.log
}

function scoreA() {
  scoreFor('a')
}

function scoreB() {
  scoreFor('b')
}

function resetScore() {
  const fresh = emptyScore()
  score.points = fresh.points
  score.games = fresh.games
  score.advantage = null
  score.tiebreak = false
  score.log = fresh.log
}

function selectYear(index) {
  if (scene instanceof HistoryMode) scene.select(index)
}

function onGear(key, event) {
  if (!(scene instanceof GearMode)) return
  scene.setGear({ [key]: Number(event.target.value) })
}

function setPattern(pattern) {
  if (scene instanceof GearMode) scene.setPattern(pattern)
}

function isPattern(a, b) {
  const gear = gearData.gear.pattern
  return gear[0] === a && gear[1] === b
}

function onOffset(event) {
  if (scene instanceof GearMode) scene.setOffset(Number(event.target.value) / 100)
}

function pick(index) {
  if (picked.value !== null) return
  picked.value = index
  if (index === currentQuiz.value.answer) correct.value += 1
}

function nextQuiz() {
  if (quizIndex.value + 1 >= quiz.length) {
    finished.value = true
    return
  }
  quizIndex.value += 1
  picked.value = null
}

function restartQuiz() {
  quizIndex.value = 0
  picked.value = null
  correct.value = 0
  finished.value = false
}

function landText(z) {
  const fromBaseline = Math.abs(11.885 - z)
  return `${fromBaseline.toFixed(1)} m`
}

function onKey(event) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === ' ' && modeId.value === 'lab') {
    event.preventDefault()
    toggle()
  }
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  stage = new TennisStage(canvasRef.value)
  const first = createMode('lab')
  scene = first
  wire(first)
  stage.load(first)
  first.reportNetInfo()
  if (reduced) {
    playing.value = false
    first.setPlaying(false)
  }
  window.addEventListener('keydown', onKey)
  if (import.meta.env.DEV) window.__tennis = first
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  stage?.dispose()
  stage = null
  scene = null
})
</script>

<style scoped>
.tennis {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #071719;
  color: #eff9f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.tennis-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.mode-panel,
.info-panel,
.dock,
.disclaimer {
  position: absolute;
  z-index: 2;
}

.kicker {
  color: #d8f34a;
  letter-spacing: 0.16em;
  font-size: 11px;
}

.mode-panel {
  top: 58px;
  left: 14px;
  width: 208px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.86);
}

.mode-panel h1 {
  margin: 6px 0;
  font-size: 21px;
  letter-spacing: 0.08em;
}

.mode-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.mode-list button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 7px 9px;
  text-align: left;
}

.mode-name {
  font-size: 13px;
}

.mode-en {
  font-size: 9px;
  letter-spacing: 0.1em;
  opacity: 0.62;
}

.sub,
.note {
  margin: 0;
  color: #a9c4b6;
  font-size: 12px;
  line-height: 1.6;
}

button {
  border: 1px solid #46685a;
  background: #18352d;
  color: #fff;
  border-radius: 8px;
  padding: 7px 8px;
  cursor: pointer;
  font-size: 12px;
}

button.on,
button:hover {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

button:disabled {
  cursor: default;
}

.info-panel {
  top: 58px;
  right: 14px;
  width: 296px;
  max-height: calc(100% - 132px);
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.88);
}

.info-panel h2 {
  margin: 6px 0 8px;
  font-size: 20px;
}

.info-panel h3 {
  margin: 12px 0 6px;
  font-size: 14px;
  color: #d8f34a;
}

.info-panel p,
.info-panel li {
  font-size: 13px;
  line-height: 1.7;
  color: #d5ebe0;
}

.phase {
  color: #d8f34a;
}

.warn {
  color: #ffb4a8;
}

ol {
  margin: 8px 0;
  padding-left: 1.2rem;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0;
}

.shot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 8px 0;
}

.shot-grid button {
  padding: 6px 4px;
  font-size: 12px;
}

.chip {
  padding: 5px 9px;
  font-size: 11px;
}

.net {
  margin-top: 6px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.18);
  color: #b8f5c8;
  font-size: 12px;
}

.net.hit {
  background: rgba(245, 158, 11, 0.2);
  color: #ffd79a;
}

.slider {
  margin: 8px 0;
}

.slider label {
  display: block;
  font-size: 12px;
  color: #d8f34a;
  margin-bottom: 4px;
}

.slider input,
.dock input {
  width: 100%;
}

table.data {
  width: 100%;
  margin: 8px 0;
  border-collapse: collapse;
  font-size: 12px;
}

table.data th,
table.data td {
  padding: 4px 2px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

table.data th {
  color: #a9c4b6;
  font-weight: 500;
}

.serve {
  font-size: 12px;
  color: #d8f34a;
}

.score {
  margin: 10px 0;
  padding: 8px;
  border-radius: 10px;
  background: rgba(216, 243, 74, 0.08);
}

.score-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 13px;
}

.score-row .who {
  width: 18px;
  color: #d8f34a;
}

.score-row .pts {
  width: 34px;
  font-weight: 600;
}

.score-row .games {
  width: 24px;
  opacity: 0.7;
}

.adv {
  color: #ffd79a;
  font-size: 12px;
}

.reset {
  width: 100%;
  margin-top: 6px;
}

.log {
  font-size: 12px;
  color: #a9c4b6;
  min-height: 2.4em;
}

.rules {
  margin: 6px 0;
  padding-left: 1.1rem;
}

.rules li {
  font-size: 12px;
  line-height: 1.65;
}

.year {
  font-size: 28px;
  margin: 4px 0;
  color: #d8f34a;
  letter-spacing: 0.04em;
}

.timeline {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 10px 0;
}

.tick {
  padding: 4px 6px;
  font-size: 11px;
}

.quiz-index {
  color: #a9c4b6;
  font-size: 12px;
}

.quiz-q {
  font-size: 14px;
  color: #fff;
}

.quiz-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
}

.quiz-options button {
  text-align: left;
  white-space: normal;
  line-height: 1.5;
}

.quiz-options button.right {
  background: #2f8f52;
  border-color: #2f8f52;
  color: #f4fff6;
}

.quiz-options button.wrong {
  background: #8f3a2f;
  border-color: #8f3a2f;
}

.why {
  font-size: 12px;
  color: #d8f34a;
}

.score-big {
  font-size: 34px;
  color: #d8f34a;
  margin: 8px 0;
}

.dock {
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  align-items: center;
  width: min(860px, calc(100% - 28px));
  padding: 9px 12px;
  border-radius: 16px;
  background: rgba(16, 45, 39, 0.9);
}

.dock-thin {
  width: min(520px, calc(100% - 28px));
}

.dock input {
  flex: 1 1 130px;
  min-width: 110px;
}

.time {
  color: #d8f34a;
  font-size: 12px;
  min-width: 4.5em;
}

.hint-text {
  color: #a9c4b6;
  font-size: 11px;
}

.disclaimer {
  left: 14px;
  right: 14px;
  bottom: 8px;
  margin: 0;
  text-align: center;
  font-size: 11px;
  color: rgba(169, 196, 182, 0.9);
}

@media (max-width: 980px) {
  .info-panel {
    width: calc(100% - 28px);
    left: 14px;
    right: 14px;
    top: auto;
    bottom: 112px;
    max-height: 34%;
  }

  .mode-panel {
    width: min(190px, calc(100% - 28px));
  }

  .mode-name {
    font-size: 12px;
  }
}
</style>
