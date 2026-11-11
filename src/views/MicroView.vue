<template>
  <div class="micro" ref="rootRef">
    <canvas ref="canvasRef" class="micro-canvas"></canvas>
    <WorldMenu>
      <router-link class="wm-link" to="/home">经典地球</router-link>
    </WorldMenu>

    <header class="micro-top">
      <div>
        <div class="micro-kicker">MICROCOSM</div>
        <div class="micro-title">微观奇境</div>
      </div>
      <p class="micro-hint">{{ activeMode.hint }}</p>
    </header>

    <nav class="micro-nav">
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

    <div class="micro-labels">
      <button
        v-for="lab in labels"
        :key="lab.id + lab.name"
        type="button"
        class="obj-label"
        :class="{ selected: lab.selected }"
        :style="{ transform: `translate(${lab.x}px, ${lab.y}px)` }"
        @click.stop="select(lab.id, false)"
        @dblclick.stop="select(lab.id, true)"
      >
        {{ lab.name }}
      </button>
    </div>

    <aside class="info-panel">
      <template v-if="modeId === 'quiz'">
        <div class="info-en">QUIZ</div>
        <h2>知识挑战</h2>
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
        </template>
        <template v-else>
          <p>答对 {{ quizScore }} / {{ quiz.length }}。</p>
          <p v-if="quizScore + 1 >= quiz.length">徽章：尺度观察员。这是站内练习，不是证书。</p>
          <p v-else>可以回到原子、DNA 和尺度之旅再看一遍。</p>
          <button type="button" class="solid" @click="resetQuiz">再来一次</button>
        </template>
      </template>

      <template v-else-if="modeId === 'atom'">
        <div class="info-en">ATOM</div>
        <h2>{{ currentAtom.name }}</h2>
        <p>{{ currentAtom.text }}</p>
        <div class="chips">
          <button
            v-for="item in atoms"
            :key="item.id"
            type="button"
            class="chip"
            :class="{ on: item.id === elementId }"
            @click="elementId = item.id"
          >{{ item.id }}</button>
        </div>
        <div v-if="elementId === 'C'" class="chips">
          <button v-for="mass in [12, 13, 14]" :key="mass" type="button" class="chip" :class="{ on: carbonMass === mass }" @click="carbonMass = mass">C-{{ mass }}</button>
        </div>
        <button v-if="elementId === 'Na'" type="button" class="solid" @click="sodiumIon = !sodiumIon">{{ sodiumIon ? '看回钠原子' : '失去一个电子，变成 Na⁺' }}</button>
        <p v-if="isotopeText">{{ isotopeText }}</p>
        <dl>
          <dt>质子</dt><dd>{{ currentAtom.z }}</dd>
          <dt>中子</dt><dd>{{ neutronCount }}</dd>
          <dt>电子排布</dt><dd>{{ shellText }}</dd>
          <dt>电荷</dt><dd>{{ sodiumIon && elementId === 'Na' ? '+1' : '0' }}</dd>
        </dl>
        <p class="note">电子云是概率密度的示意，不是运行轨道。壳层数字只表示电子怎么分层计数。</p>
      </template>

      <template v-else-if="modeId === 'molecule'">
        <div class="info-en">{{ currentMolecule.formula }}</div>
        <h2>{{ currentMolecule.name }}</h2>
        <p>{{ currentMolecule.text }}</p>
        <div class="chips">
          <button
            v-for="item in molecules"
            :key="item.id"
            type="button"
            class="chip"
            :class="{ on: item.id === moleculeId }"
            @click="moleculeId = item.id"
          >{{ item.name }}</button>
        </div>
        <button v-if="moleculeId === 'water'" type="button" class="solid" @click="hydrogen = !hydrogen">{{ hydrogen ? '看单个水分子' : '看氢键网络' }}</button>
        <p v-if="picked">{{ picked.summary }}</p>
        <p class="note">
          键长和键角做了简化，配色是 CPK 惯例。
          <a :href="currentMolecule.href" target="_blank" rel="noopener noreferrer">PubChem</a>
        </p>
      </template>

      <template v-else-if="modeId === 'dna'">
        <div class="info-en">B-DNA</div>
        <h2>生命密码</h2>
        <p>右手双螺旋。每圈大约 10 个碱基对，螺距按 3.4 nm 的比例排列。A-T 两条氢键，G-C 三条，所以 G-C 更稳。</p>
        <p>人类基因组大约 30 亿个碱基对，拉直约 2 米，装在直径大约 6 μm 的细胞核里。</p>
        <div class="info-actions">
          <button type="button" class="solid" @click="playDna('replicate')">复制示意</button>
          <button type="button" class="solid" @click="playDna('transcribe')">转录示意</button>
          <button type="button" class="ghost" @click="playDna('rest')">回到双链</button>
        </div>
        <p class="note">解旋酶和聚合酶没有做成模型。动画只表示双链分开、各自配上新链，以及 DNA 到 mRNA 这一步。</p>
        <a class="text-link" href="https://pdb101.rcsb.org/" target="_blank" rel="noopener noreferrer">结构可以到 PDB-101 继续看</a>
      </template>

      <template v-else-if="modeId === 'cell'">
        <div class="info-en">CELL</div>
        <h2>{{ plantCell ? '植物细胞' : '动物细胞' }}</h2>
        <p>{{ picked ? picked.summary : '点一个细胞器。细胞膜是半透明的壳，里面的颗粒在做布朗运动示意。' }}</p>
        <button type="button" class="solid" @click="plantCell = !plantCell">{{ plantCell ? '看动物细胞' : '看植物细胞' }}</button>
        <p v-if="plantCell">多出来的是细胞壁、叶绿体和中央液泡。共有的细胞器会变暗。</p>
        <router-link class="text-link" to="/wildlife">这些细胞组成了什么？去动物世界</router-link>
        <p class="note">细胞器的大小做过艺术化调整，不是显微测量。</p>
      </template>

      <template v-else-if="modeId === 'virus'">
        <div class="info-en">STRUCTURE</div>
        <h2>病毒与蛋白质</h2>
        <p>病毒没有细胞结构，必须借宿主细胞才能复制。这一页只讲形状，不讲致病、传播或疫苗。</p>
        <div class="chips">
          <button type="button" class="chip" :class="{ on: virusView === 'capsid' }" @click="showVirus('capsid')">衣壳</button>
          <button type="button" class="chip" :class="{ on: virusView === 'fold' }" @click="showVirus('fold')">折叠</button>
          <button type="button" class="chip" :class="{ on: virusView === 'antibody' }" @click="showVirus('antibody')">抗体</button>
          <button type="button" class="chip" :class="{ on: virusView === 'binding' }" @click="showVirus('binding')">结合</button>
        </div>
        <button v-if="virusView === 'fold' || virusView === 'binding'" type="button" class="solid" @click="playVirus">{{ reduced ? '看结果' : '播放示意' }}</button>
        <p class="note">折叠动画不是真实路径。刺突靠近受体，只说明形状可以契合。</p>
      </template>

      <template v-else>
        <div class="info-en">SCALE</div>
        <h2>{{ scaleMark.name }}</h2>
        <p>{{ scaleMark.text }}</p>
        <p>{{ scaleText }}</p>
        <p class="note">滑杆上的位置是叙事刻度，不是均匀的对数尺。锚点上的单位换算是固定文案。</p>
      </template>
    </aside>

    <footer v-if="modeId === 'scale'" class="scale-dock">
      <div class="scale-head">
        <span>{{ scaleText }}</span>
        <button type="button" class="ghost" @click="toggleScale">{{ scalePlaying ? '暂停' : (reduced ? '下一站' : '播放') }}</button>
        <button type="button" class="ghost" :class="{ active: follow }" @click="follow = !follow">{{ follow ? '跟随镜头' : '自由视角' }}</button>
      </div>
      <input
        class="scale-range"
        type="range"
        min="0"
        max="1000"
        :value="Math.round(progress * 1000)"
        :aria-valuetext="scaleText"
        @input="onScaleInput"
      />
    </footer>

    <footer class="micro-note">模型、键长和大小都是科普示意，不是科研级结构。分子请以 PubChem / PDB 为准。</footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { MICRO_QUIZ, MODES } from '../micro/catalog.js'
import { ATOMS, isotopeNote } from '../micro/atoms.js'
import { MOLECULES } from '../micro/molecules.js'
import { SCALE_MARKS, nearestScaleMark, scaleLabel } from '../micro/scaleJourney.js'
import { MicroScene } from '../micro/MicroScene.js'

const modes = MODES
const atoms = ATOMS
const molecules = MOLECULES
const quiz = MICRO_QUIZ
const canvasRef = ref(null)
const rootRef = ref(null)
const modeId = ref('atom')
const labels = ref([])
const picked = ref(null)
const elementId = ref('C')
const carbonMass = ref(12)
const sodiumIon = ref(false)
const moleculeId = ref('water')
const hydrogen = ref(false)
const plantCell = ref(false)
const virusView = ref('capsid')
const progress = ref(0)
const scalePlaying = ref(false)
const follow = ref(true)
const quizIndex = ref(0)
const quizScore = ref(0)
const quizDone = ref(false)
const quizPick = ref(null)
const reduced = ref(false)
const route = useRoute()
const router = useRouter()
let scene = null
let urlSync = false

const activeMode = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const currentAtom = computed(() => atoms.find((item) => item.id === elementId.value) || atoms[0])
const neutronCount = computed(() => Math.max(0, (elementId.value === 'C' ? carbonMass.value : currentAtom.value.mass) - currentAtom.value.z))
const shellText = computed(() => (sodiumIon.value && elementId.value === 'Na' ? [2, 8] : currentAtom.value.shells).join('-'))
const isotopeText = computed(() => isotopeNote(elementId.value, carbonMass.value))
const currentMolecule = computed(() => molecules.find((item) => item.id === moleculeId.value) || molecules[0])
const scaleMark = computed(() => nearestScaleMark(progress.value))
const scaleText = computed(() => scaleLabel(progress.value))
const currentQuiz = computed(() => quiz[quizIndex.value])

function changeMode(id) {
  modeId.value = id
  picked.value = null
  labels.value = []
  scene?.setMode(id)
  if (id === 'atom') syncAtom()
  if (id === 'molecule') syncMolecule()
  if (id === 'scale') scene?.setScaleProgress(progress.value)
}

function syncAtom() {
  const mass = elementId.value === 'C' ? carbonMass.value : currentAtom.value.mass
  const ion = elementId.value === 'Na' && sodiumIon.value
  scene?.setAtom({
    ...currentAtom.value,
    neutrons: mass - currentAtom.value.z,
    shells: ion ? [2, 8] : currentAtom.value.shells,
    charge: ion ? '+1' : '0'
  })
}

function syncMolecule() {
  scene?.showMolecule(moleculeId.value, hydrogen.value)
}

function select(id, focus) {
  scene?.selectById(id, focus)
}

function playDna(action) {
  scene?.setDnaAction(action)
  scene?.setDnaPlaying(false)
  if (reduced.value) {
    scene?.setDnaOpen(action === 'rest' ? 0 : action === 'transcribe' ? 0.55 : 1)
    return
  }
  if (action !== 'rest') scene?.setDnaPlaying(true)
}

function showVirus(id) {
  virusView.value = id
  scene?.setVirusView(id)
  scene?.setVirusPlaying(false)
}

function playVirus() {
  if (reduced.value) {
    scene?.setVirusAmount(1)
    return
  }
  scene?.setVirusPlaying(true)
}

function onScaleInput(event) {
  const value = Number(event.target.value) / 1000
  progress.value = value
  scalePlaying.value = false
  scene?.setScalePlaying(false)
  scene?.setScaleProgress(value)
}

function toggleScale() {
  if (reduced.value) {
    const next = SCALE_MARKS.find((mark) => mark.p > progress.value + 0.01) || SCALE_MARKS[0]
    progress.value = next.p
    scene?.setScaleProgress(next.p)
    return
  }
  scalePlaying.value = !scalePlaying.value
  scene?.setScalePlaying(scalePlaying.value)
}

function answerQuiz(index) {
  if (quizPick.value !== null) return
  quizPick.value = index
  if (index === currentQuiz.value.answer) quizScore.value += 1
  window.setTimeout(() => {
    quizPick.value = null
    if (quizIndex.value + 1 >= quiz.length) quizDone.value = true
    else quizIndex.value += 1
  }, 450)
}

function resetQuiz() {
  quizIndex.value = 0
  quizScore.value = 0
  quizDone.value = false
  quizPick.value = null
}

function onKey(event) {
  if (modeId.value !== 'scale') return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (document.activeElement?.closest('button, a')) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    const step = event.key === 'ArrowLeft' ? -0.02 : 0.02
    const value = Math.min(1, Math.max(0, progress.value + step))
    progress.value = value
    scalePlaying.value = false
    scene?.setScalePlaying(false)
    scene?.setScaleProgress(value)
  } else if (event.key === 'Home') {
    event.preventDefault()
    progress.value = 0
    scene?.setScaleProgress(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    progress.value = 1
    scene?.setScaleProgress(1)
  } else if (event.key === ' ') {
    event.preventDefault()
    toggleScale()
  }
}

watch([elementId, carbonMass, sodiumIon], () => {
  if (elementId.value !== 'Na') sodiumIon.value = false
  if (modeId.value === 'atom') syncAtom()
})

watch([moleculeId, hydrogen], () => {
  if (moleculeId.value !== 'water') hydrogen.value = false
  if (modeId.value === 'molecule') syncMolecule()
})

watch(plantCell, (value) => scene?.setPlant(value))
watch(follow, (value) => scene?.setFollow(value))

watch([modeId, elementId, moleculeId], () => {
  if (!urlSync) return
  const query = { mode: modeId.value }
  if (modeId.value === 'atom') query.el = elementId.value
  if (modeId.value === 'molecule') query.mol = moleculeId.value
  const same = route.query.mode === query.mode
    && (route.query.el || '') === (query.el || '')
    && (route.query.mol || '') === (query.mol || '')
  if (same) return
  router.replace({ query })
})

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scene = new MicroScene(canvasRef.value, {
    reducedMotion: reduced.value,
    onSelect: (meta) => {
      picked.value = meta
    },
    onLabels: (list) => {
      labels.value = list
    },
    onScaleProgress: (value) => {
      progress.value = value
    },
    onScaleEnd: () => {
      scalePlaying.value = false
    }
  })
  scene.init()
  const queryMode = String(route.query.mode || '')
  const queryElement = String(route.query.el || '')
  const queryMolecule = String(route.query.mol || '')
  if (atoms.some((item) => item.id === queryElement)) elementId.value = queryElement
  if (molecules.some((item) => item.id === queryMolecule)) moleculeId.value = queryMolecule
  if (modes.some((item) => item.id === queryMode)) changeMode(queryMode)
  else syncAtom()
  urlSync = true
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.micro {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05020a;
  color: #f4fbff;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.micro-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.micro-top,
.micro-nav,
.info-panel,
.micro-note,
.scale-dock,
.obj-label {
  position: absolute;
  z-index: 2;
}

.micro-top {
  top: 48px;
  left: 196px;
  right: 340px;
  display: flex;
  align-items: flex-end;
  gap: 1.2rem;
  padding: 1rem 1.2rem 0;
  pointer-events: none;
}

.micro-kicker,
.nav-en,
.info-en {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #ff8ad4;
}

.micro-title {
  font-size: 22px;
  letter-spacing: 0.18em;
}

.micro-hint,
.note {
  color: rgba(244, 251, 255, 0.62);
  font-size: 13px;
  line-height: 1.5;
}

.micro-nav {
  top: 48px;
  left: 0;
  bottom: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 1rem 0.7rem;
  background: linear-gradient(90deg, rgba(8, 0, 16, 0.78), rgba(8, 0, 16, 0.12));
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-item {
  text-align: left;
  background: transparent;
  color: inherit;
  border: 0;
  border-left: 2px solid transparent;
  padding: 0.5rem 0.7rem;
  cursor: pointer;
}

.nav-item.active {
  border-left-color: #7dffe8;
  background: rgba(125, 255, 232, 0.08);
}

.nav-zh {
  display: block;
  margin-top: 0.12rem;
  font-size: 14px;
}

.obj-label {
  margin-left: 8px;
  margin-top: -12px;
  border: 0;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  background: rgba(8, 0, 16, 0.55);
  color: #f4fbff;
  font-size: 11px;
  cursor: pointer;
}

.obj-label.selected {
  background: rgba(255, 79, 163, 0.4);
}

.info-panel {
  top: 4.6rem;
  right: 0.8rem;
  width: min(320px, calc(100% - 2rem));
  max-height: calc(100% - 8.5rem);
  overflow: auto;
  padding: 0.9rem 1rem 1rem;
  background: rgba(10, 4, 18, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.info-panel h2 {
  margin: 0.15rem 0 0.4rem;
  font-size: 24px;
  font-weight: 560;
}

.info-panel p,
.info-panel dd {
  line-height: 1.5;
}

.info-panel dl {
  display: grid;
  grid-template-columns: 4.6rem 1fr;
  gap: 0.28rem 0.5rem;
  margin: 0.6rem 0;
  font-size: 13px;
}

.info-panel dt {
  color: rgba(244, 251, 255, 0.48);
}

.info-panel dd {
  margin: 0;
}

.chips,
.info-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.45rem 0;
}

.chip,
.choice,
.ghost,
.solid {
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  font-size: 12px;
  cursor: pointer;
  color: #f4fbff;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.chip.on,
.choice.on,
.ghost.active,
.solid {
  background: rgba(125, 255, 232, 0.16);
  border-color: rgba(125, 255, 232, 0.55);
}

.choice {
  display: block;
  width: 100%;
  text-align: left;
  margin-top: 0.35rem;
}

.text-link {
  display: inline-block;
  margin-top: 0.45rem;
  color: #ffe08a;
  font-size: 13px;
}

.scale-dock {
  left: 196px;
  right: 1rem;
  bottom: 2.2rem;
}

.scale-head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.35rem;
}

.scale-range {
  width: 100%;
}

.micro-note {
  left: 196px;
  right: 1rem;
  bottom: 0.45rem;
  font-size: 12px;
  color: rgba(244, 251, 255, 0.48);
}

@media (max-width: 800px) {
  .micro-nav {
    top: auto;
    bottom: 4.6rem;
    width: 100%;
    height: auto;
    flex-direction: row;
    overflow: auto;
    border-right: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .micro-top,
  .scale-dock,
  .micro-note {
    left: 0.6rem;
    right: 0.6rem;
  }

  .micro-hint {
    display: none;
  }

  .info-panel {
    top: auto;
    bottom: 8.2rem;
    max-height: 32vh;
  }
}
</style>
