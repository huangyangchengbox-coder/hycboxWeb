<template>
  <div class="lab chem" :class="{ 'show-table': modeId === 'table' }" style="--lab-accent:#d7b4ff">
    <canvas ref="canvasRef" class="lab-canvas"></canvas>
    <WorldMenu />

    <header class="lab-top">
      <div>
        <div class="lab-kicker">CHEM</div>
        <div class="lab-title">化学</div>
      </div>
      <p class="lab-hint">{{ active.hint }}</p>
    </header>

    <div v-if="stageFormulas.length" class="formula-stage">
      <div class="formula-caption">{{ stageCaption }}</div>
      <div class="formula-line">
        <FormulaText v-for="item in stageFormulas" :key="item" :text="item" />
      </div>
    </div>

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

    <div v-if="modeId === 'table'" class="ptable">
      <button type="button" class="marker" style="grid-column:3;grid-row:6">镧系</button>
      <button type="button" class="marker" style="grid-column:3;grid-row:7">锕系</button>
      <button
        v-for="el in elements"
        :key="el.z"
        type="button"
        class="cell"
        :class="{ on: el.z === current.z, dim: dimmed(el) }"
        :style="{ gridColumn: el.col, gridRow: el.row, background: el.color }"
        @click="currentZ = el.z"
      >
        <small>{{ el.z }}</small>
        <b>{{ el.symbol }}</b>
      </button>
    </div>

    <aside class="lab-panel">
      <template v-if="modeId === 'quiz'">
        <div class="lab-kicker">QUIZ</div>
        <h2>化学挑战</h2>
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

      <template v-else-if="modeId === 'table'">
        <div class="lab-kicker">{{ current.categoryLabel }}</div>
        <h2>{{ current.name }} {{ current.symbol }}</h2>
        <label class="field">查找
          <input v-model="query" type="search" placeholder="符号或中文名" />
        </label>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: onlyMetal }" @click="onlyMetal = !onlyMetal">金属</button>
          <button type="button" class="chip" :class="{ on: onlyGas }" @click="onlyGas = !onlyGas">气体</button>
          <button type="button" class="chip" :class="{ on: onlyLiquid }" @click="onlyLiquid = !onlyLiquid">液体</button>
          <button type="button" class="chip" :class="{ on: onlyRadio }" @click="onlyRadio = !onlyRadio">放射性</button>
        </div>
        <dl>
          <dt>原子序数</dt><dd>{{ current.z }}</dd>
          <dt>原子量</dt><dd>{{ current.mass }}</dd>
          <dt>常温状态</dt><dd>{{ current.state }}</dd>
          <dt>壳层电子</dt><dd>{{ current.shellText }}</dd>
        </dl>
        <p>{{ current.note }}</p>
        <div v-if="commonFormulas.length" class="formula-row">
          <span>常见化学式</span>
          <FormulaText v-for="item in commonFormulas" :key="item" :text="item" />
        </div>
        <p class="note">玻尔模型只表示电子分层计数，不是运行轨道。原子量是常见近似值。104 号以后用元素符号。</p>
      </template>

      <template v-else-if="modeId === 'bond'">
        <div class="lab-kicker">Δχ {{ delta.toFixed(2) }}</div>
        <h2>{{ story.name }}</h2>
        <p>{{ story.text }}</p>
        <label class="field">电负性差
          <input v-model.number="delta" type="range" min="0" max="3.3" step="0.02" />
        </label>
        <canvas ref="morseRef" class="mini-chart"></canvas>
        <p class="note">曲线是莫尔斯势的形状示意，黄点是当前模型里的核间距。真实键长还取决于原子半径，不只由电负性差决定。</p>
      </template>

      <template v-else-if="modeId === 'shape'">
        <FormulaText class="eq" :text="shape.formula" />
        <h2>{{ shape.name }}</h2>
        <p>{{ shape.why }}</p>
        <div class="chips">
          <button v-for="item in shapes" :key="item.id" type="button" class="chip" :class="{ on: item.id === shapeId }" @click="shapeId = item.id">{{ item.name }}</button>
        </div>
        <dl>
          <dt>键角</dt><dd>{{ shape.angle }}</dd>
          <dt>理想角</dt><dd>{{ shape.ideal }}</dd>
          <dt>偶极</dt><dd>{{ shape.dipole ? '有' : '没有净偶极' }}</dd>
        </dl>
        <p class="note">淡蓝色气球是孤对电子。黄色箭头是偶极方向，从正指向负的示意。</p>
      </template>

      <template v-else-if="modeId === 'react'">
        <div class="lab-kicker">{{ pose.name }}</div>
        <h2>{{ reaction.name }}</h2>
        <p class="eq"><FormulaText :text="reaction.equation" /></p>
        <div class="chips">
          <button v-for="item in reactions" :key="item.id" type="button" class="chip" :class="{ on: item.id === reactionId }" @click="reactionId = item.id">{{ item.name }}</button>
        </div>
        <label class="field">进程 {{ reactionT.toFixed(2) }}
          <input v-model.number="reactionT" type="range" min="0" max="1" step="0.01" />
        </label>
        <dl>
          <template v-for="pair in reaction.counts" :key="pair[0]">
            <dt>{{ pair[0] }}</dt><dd>始终 {{ pair[1] }} 个</dd>
          </template>
        </dl>
        <p v-if="reactionId === 'neutral'">指示剂示意 pH {{ (1 + reactionT * 12).toFixed(1) }}。这不是真实滴定曲线。</p>
        <p>{{ reaction.note }}</p>
      </template>

      <template v-else>
        <FormulaText class="eq" :text="crystal.formula" />
        <h2>{{ crystal.name }}</h2>
        <p>{{ crystal.text }}</p>
        <div class="chips">
          <button v-for="item in crystals" :key="item.id" type="button" class="chip" :class="{ on: item.id === crystalId }" @click="crystalId = item.id">{{ item.name }}</button>
        </div>
        <label class="field">{{ crystalId === 'graphite' || crystalId === 'ice' ? '层间距' : '重复次数' }}
          <input v-model.number="crystalParam" type="range" min="1" max="4" step="0.05" />
        </label>
        <p class="note">和微观奇境里的球棍模型同一套想法：球是原子，棍是键或离子之间的吸引。</p>
      </template>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { CHEM_QUIZ, MODES } from '../chem/catalog.js'
import { ELEMENTS } from '../chem/elements.js'
import { COMMON_FORMULAS } from '../chem/formula.js'
import FormulaText from '../chem/FormulaText.vue'
import { bondStory, buildCrystal, CRYSTALS, reactionFrame, REACTIONS, SHAPES } from '../chem/structures.js'
import { ChemScene } from '../chem/ChemScene.js'
import '../styles/lab.css'

const modes = MODES
const elements = ELEMENTS
const shapes = SHAPES
const reactions = REACTIONS
const crystals = CRYSTALS
const quiz = CHEM_QUIZ

const route = useRoute()
const router = useRouter()
const canvasRef = ref(null)
const morseRef = ref(null)
const modeId = ref('table')
const currentZ = ref(6)
const query = ref('')
const onlyMetal = ref(false)
const onlyGas = ref(false)
const onlyLiquid = ref(false)
const onlyRadio = ref(false)
const delta = ref(2.1)
const shapeId = ref('h2o')
const reactionId = ref('burn')
const reactionT = ref(0)
const crystalId = ref('nacl')
const crystalParam = ref(3)
const quizIndex = ref(0)
const quizScore = ref(0)
const quizPick = ref(null)
const quizDone = ref(false)

let scene = null

const active = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const current = computed(() => elements.find((item) => item.z === currentZ.value) || elements[5])
const story = computed(() => bondStory(delta.value))
const shape = computed(() => shapes.find((item) => item.id === shapeId.value) || shapes[0])
const reaction = computed(() => reactions.find((item) => item.id === reactionId.value) || reactions[0])
const pose = computed(() => reactionFrame(reaction.value, reactionT.value))
const crystal = computed(() => crystals.find((item) => item.id === crystalId.value) || crystals[0])
const currentQuiz = computed(() => quiz[quizIndex.value])
const commonFormulas = computed(() => COMMON_FORMULAS[current.value.z] || [])
const stageFormulas = computed(() => {
  if (modeId.value === 'shape') return [shape.value.formula]
  if (modeId.value === 'react') return [reaction.value.equation]
  if (modeId.value === 'crystal') return [crystal.value.formula]
  if (modeId.value === 'bond') return story.value.examples
  return []
})
const stageCaption = computed(() => {
  if (modeId.value === 'shape') return shape.value.name
  if (modeId.value === 'react') return reaction.value.name
  if (modeId.value === 'crystal') return crystal.value.name
  if (modeId.value === 'bond') return story.value.name
  return ''
})

function dimmed(el) {
  if (query.value) {
    const q = query.value.trim().toLowerCase()
    if (!el.symbol.toLowerCase().includes(q) && !el.name.includes(query.value.trim())) return true
  }
  if (onlyMetal.value && !el.metal) return true
  if (onlyGas.value && el.state !== '气') return true
  if (onlyLiquid.value && el.state !== '液') return true
  if (onlyRadio.value && !el.radioactive) return true
  return false
}

function changeMode(id) {
  modeId.value = id
  router.replace({ query: { ...route.query, mode: id } })
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

function drawMorse() {
  const canvas = morseRef.value
  if (!canvas) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 280
  const h = canvas.clientHeight || 120
  canvas.width = Math.floor(w * dpr)
  canvas.height = Math.floor(h * dpr)
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const re = 1.45
  const well = (r) => (1 - Math.exp(-1.5 * (r - re))) ** 2
  const xOf = (r) => 12 + ((r - 0.7) / 2.4) * (w - 24)
  const yOf = (v) => h - 16 - v * (h - 28)
  ctx.strokeStyle = '#d7b4ff'
  ctx.beginPath()
  for (let i = 0; i <= 80; i += 1) {
    const r = 0.7 + (2.4 * i) / 80
    const x = xOf(r)
    const y = yOf(well(r))
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  const rNow = 1.05 + delta.value * 0.28
  ctx.fillStyle = '#ffe08a'
  ctx.beginPath()
  ctx.arc(xOf(rNow), yOf(well(rNow)), 4, 0, Math.PI * 2)
  ctx.fill()
}

function syncScene() {
  if (!scene) return
  scene.setMode(modeId.value)
  if (modeId.value === 'table' || modeId.value === 'quiz') scene.setElement(current.value.shells)
  else if (modeId.value === 'bond') scene.setBond(delta.value)
  else if (modeId.value === 'shape') scene.showStructure(shape.value, true)
  else if (modeId.value === 'react') {
    scene.showReaction(reaction.value)
    scene.setReactionPose(pose.value)
  } else scene.showStructure(buildCrystal(crystalId.value, crystalParam.value), true)
  requestAnimationFrame(() => {
    scene?.resize()
    drawMorse()
  })
}

watch([modeId, currentZ, delta, shapeId, reactionId, crystalId, crystalParam], syncScene)
watch(reactionT, () => {
  if (modeId.value === 'react') scene?.setReactionPose(pose.value)
})

onMounted(() => {
  const queryMode = typeof route.query.mode === 'string' ? route.query.mode : ''
  if (modes.some((item) => item.id === queryMode)) modeId.value = queryMode
  scene = new ChemScene(canvasRef.value)
  syncScene()
})

onUnmounted(() => {
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.show-table .lab-canvas {
  left: auto;
  top: auto;
  right: 0.7rem;
  bottom: 0.7rem;
  width: min(320px, calc(100% - 1.4rem));
  height: 220px;
  z-index: 3;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.show-table .lab-panel {
  max-height: calc(100% - 280px);
}

.ptable {
  position: absolute;
  z-index: 2;
  left: 188px;
  right: 348px;
  top: 108px;
  bottom: 12px;
  display: grid;
  grid-template-columns: repeat(18, minmax(0, 1fr));
  grid-template-rows: repeat(10, minmax(0, 1fr));
  gap: 3px;
}

.cell,
.marker {
  border: 0;
  border-radius: 4px;
  color: #14080a;
  cursor: pointer;
  padding: 0;
  min-width: 0;
}

.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.cell small {
  font-size: 9px;
  opacity: 0.7;
}

.cell b {
  font-size: 13px;
  font-weight: 650;
}

.cell.dim {
  filter: grayscale(0.7);
  opacity: 0.28;
}

.cell.on {
  outline: 2px solid #fff;
}

.marker {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(244, 251, 255, 0.72);
  font-size: 11px;
}

.eq {
  display: block;
  margin: 0.1rem 0 0.2rem;
  font-size: 15px;
  letter-spacing: 0.02em;
}

.formula-stage {
  position: absolute;
  z-index: 2;
  left: 196px;
  right: 348px;
  top: 118px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.28rem;
  pointer-events: none;
}

.formula-caption {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: rgba(215, 180, 255, 0.85);
}

.formula-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.45rem 0.7rem;
}

.formula-line :deep(.chem-formula) {
  padding: 0.28rem 0.8rem;
  border-radius: 12px;
  background: rgba(8, 12, 20, 0.78);
  border: 1px solid rgba(215, 180, 255, 0.32);
  font-size: clamp(18px, 2.2vw, 30px);
}

.formula-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.35rem 0.7rem;
  margin: 0.35rem 0 0.5rem;
  font-size: 16px;
}

.formula-row > span {
  width: 100%;
  color: rgba(244, 251, 255, 0.48);
  font-size: 12px;
}

@media (max-width: 860px) {
  .ptable {
    left: 8px;
    right: 8px;
    top: 96px;
    bottom: 42vh;
  }

  .formula-stage {
    left: 8px;
    right: 8px;
    top: 96px;
  }

  .show-table .lab-canvas {
    display: none;
  }
}
</style>
