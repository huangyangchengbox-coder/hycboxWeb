<template>
  <div class="cosmos" ref="rootRef">
    <canvas ref="canvasRef" class="cosmos-canvas"></canvas>
    <WorldMenu />
    <header class="cosmos-top">
      <div>
        <div class="cosmos-kicker">hycBox · v2</div>
        <div class="cosmos-title">COSMOS 3D</div>
      </div>
      <p class="cosmos-hint">{{ activeMode.hint }}</p>
      <div class="cosmos-top-actions">
        <button type="button" class="ghost" @click="toggleFull">全屏</button>
      </div>
    </header>

    <nav class="cosmos-nav">
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

    <div class="cosmos-labels">
      <button
        v-for="lab in labels"
        :key="lab.id"
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

    <aside v-if="selected" class="info-panel">
      <div class="info-en">{{ selected.nameEn }}</div>
      <h2>{{ selected.name }}</h2>
      <div class="info-kind">{{ selected.kind }}</div>
      <p>{{ selected.summary }}</p>
      <dl>
        <template v-for="row in selected.facts" :key="row[0]">
          <dt>{{ row[0] }}</dt>
          <dd>{{ row[1] }}</dd>
        </template>
      </dl>
      <div class="info-actions">
        <button type="button" class="solid" @click="focus">聚焦</button>
        <router-link v-if="selected.classic" class="solid linkish" to="/home">进入经典地球</router-link>
        <button v-if="selected.supernova" type="button" class="solid" @click="playBurst">播放爆发</button>
      </div>
    </aside>

    <footer v-if="modeId !== 'timeline'" class="cosmos-dock">
      <button type="button" class="ghost" @click="overview">返回全景</button>
      <button type="button" class="ghost" @click="togglePause">{{ paused ? '播放' : '暂停' }}</button>
      <div class="speeds">
        <button
          v-for="item in speeds"
          :key="item"
          type="button"
          class="ghost"
          :class="{ active: speed === item }"
          @click="setSpeed(item)"
        >
          {{ item }}×
        </button>
      </div>
      <button type="button" class="ghost" :class="{ active: quality === 'low' }" @click="toggleQuality">
        {{ quality === 'low' ? '低画质' : '高画质' }}
      </button>
      <span class="scale-note">尺度为艺术化示意</span>
    </footer>

    <TimelineDock
      v-if="modeId === 'timeline'"
      :eras="timelineEras"
      :era="activeEra"
      :progress="progress"
      :time-text="timeText"
      :playing="playing"
      :speed="timelineSpeed"
      :follow="follow"
      @update:progress="onScrub"
      @toggle-play="toggleTimeline"
      @seek-era="seekEra"
      @update:speed="setTimelineSpeed"
      @update:follow="setFollow"
      @reset-camera="resetTimelineCamera"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MODES } from '../cosmos/catalog.js'
import { CosmosScene } from '../cosmos/CosmosScene.js'
import { TIMELINE_ERAS, eraSample, readout } from '../cosmos/timeline/timelineData.js'
import WorldMenu from '../components/WorldMenu.vue'
import TimelineDock from '../components/cosmos/TimelineDock.vue'

const modes = MODES
const speeds = [0.2, 1, 4, 20]
const timelineEras = TIMELINE_ERAS
const canvasRef = ref(null)
const rootRef = ref(null)
const modeId = ref('planets')
const labels = ref([])
const selected = ref(null)
const paused = ref(false)
const speed = ref(1)
const quality = ref('high')
const progress = ref(0)
const playing = ref(false)
const timelineSpeed = ref(1)
const follow = ref(true)
const route = useRoute()
const router = useRouter()

const activeMode = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])
const activeEra = computed(() => eraSample(progress.value).a)
const timeText = computed(() => readout(progress.value))

let scene = null
let urlSync = false

function changeMode(id) {
  modeId.value = id
  selected.value = null
  labels.value = []
  scene?.setMode(id)
}

function select(id, fly) {
  scene?.selectById(id, fly)
}

function focus() {
  scene?.focusSelected()
}

function overview() {
  scene?.overview(false)
}

function togglePause() {
  paused.value = !paused.value
  scene?.setPaused(paused.value)
}

function setSpeed(value) {
  speed.value = value
  scene?.setSpeed(value)
}

function toggleQuality() {
  quality.value = quality.value === 'low' ? 'high' : 'low'
  scene?.setQuality(quality.value)
}

function playBurst() {
  scene?.playSupernova()
}

function onScrub(value, detail = {}) {
  progress.value = value
  scene?.setScrubbing(!!detail.scrubbing)
  scene?.setTimelineProgress(value)
  if (detail.scrubbing) playing.value = false
}

function toggleTimeline() {
  playing.value = !playing.value
  scene?.setTimelinePlaying(playing.value)
  if (!scene?.timelinePlaying) playing.value = false
}

function setTimelineSpeed(value) {
  timelineSpeed.value = value
  scene?.setTimelineSpeed(value)
}

function setFollow(value) {
  follow.value = value
  scene?.setFollowCamera(value)
}

function seekEra(id) {
  const era = TIMELINE_ERAS.find((item) => item.id === id)
  if (!era) return
  if (modeId.value !== 'timeline') changeMode('timeline')
  playing.value = false
  scene?.setTimelinePlaying(false)
  progress.value = era.p
  scene?.setTimelineProgress(era.p)
  scene?.focusTimeline()
}

function resetTimelineCamera() {
  scene?.focusTimeline()
}

function toggleFull() {
  const el = rootRef.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

function onKey(e) {
  if (modeId.value !== 'timeline') return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (document.activeElement?.closest('button, a')) return
  const idx = TIMELINE_ERAS.findIndex((item) => item.id === activeEra.value.id)
  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault()
    const next = TIMELINE_ERAS[Math.min(TIMELINE_ERAS.length - 1, Math.max(0, idx + (e.key === 'ArrowLeft' ? -1 : 1)))]
    seekEra(next.id)
    return
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const step = e.key === 'ArrowLeft' ? -1 / 120 : 1 / 120
    onScrub(Math.min(1, Math.max(0, progress.value + step)), { scrubbing: false })
    playing.value = false
    scene?.setTimelinePlaying(false)
  } else if (e.key === 'Home') {
    e.preventDefault()
    seekEra(TIMELINE_ERAS[0].id)
  } else if (e.key === 'End') {
    e.preventDefault()
    seekEra(TIMELINE_ERAS[TIMELINE_ERAS.length - 1].id)
  } else if (e.key === ' ') {
    e.preventDefault()
    toggleTimeline()
  }
}

watch([modeId, () => activeEra.value.id], () => {
  if (!urlSync) return
  const query = { ...route.query, mode: modeId.value }
  if (modeId.value === 'timeline') query.era = activeEra.value.id
  else delete query.era
  const sameMode = route.query.mode === query.mode
  const sameEra = (route.query.era || '') === (query.era || '')
  if (sameMode && sameEra) return
  router.replace({ query })
})

onMounted(() => {
  scene = new CosmosScene(canvasRef.value, {
    onSelect: (meta) => {
      selected.value = meta
    },
    onLabels: (list) => {
      labels.value = list
    },
    onTimelineProgress: (value) => {
      progress.value = value
    },
    onTimelineEnd: () => {
      playing.value = false
    },
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  scene.init()
  const qEra = String(route.query.era || '')
  const qMode = String(route.query.mode || '')
  if (TIMELINE_ERAS.some((item) => item.id === qEra)) seekEra(qEra)
  else if (modes.some((item) => item.id === qMode)) changeMode(qMode)
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
.cosmos {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000106;
  color: #e8eef8;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.cosmos-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.cosmos-top,
.cosmos-nav,
.info-panel,
.cosmos-dock,
.obj-label {
  position: absolute;
  z-index: 2;
}

.cosmos-top {
  top: 48px;
  left: 196px;
  right: 0;
  display: flex;
  align-items: flex-end;
  gap: 1.5rem;
  padding: 1.1rem 1.4rem 0.6rem;
  pointer-events: none;
}

.cosmos-kicker {
  font-size: 11px;
  letter-spacing: 0.22em;
  color: rgba(255, 196, 120, 0.85);
}

.cosmos-title {
  font-size: 22px;
  font-weight: 560;
  letter-spacing: 0.18em;
}

.cosmos-hint {
  margin: 0 0 0.2rem;
  color: rgba(232, 238, 248, 0.62);
  font-size: 13px;
}

.cosmos-top-actions {
  margin-left: auto;
  display: flex;
  gap: 0.5rem;
  pointer-events: auto;
}

.cosmos-nav {
  top: 48px;
  left: 0;
  bottom: 0;
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1.1rem 0.7rem;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.18));
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-item {
  text-align: left;
  background: transparent;
  color: inherit;
  border: 0;
  border-left: 2px solid transparent;
  padding: 0.55rem 0.7rem;
  cursor: pointer;
}

.nav-item.active {
  border-left-color: #7ec8ff;
  background: rgba(126, 200, 255, 0.08);
}

.nav-en {
  display: block;
  font-size: 10px;
  letter-spacing: 0.16em;
  color: rgba(255, 196, 120, 0.8);
}

.nav-zh {
  display: block;
  margin-top: 0.15rem;
  font-size: 14px;
}

.obj-label {
  margin-left: 10px;
  margin-top: -10px;
  background: rgba(0, 0, 0, 0.35);
  color: rgba(255, 255, 255, 0.88);
  border: 0;
  border-radius: 999px;
  padding: 0.15rem 0.45rem;
  font-size: 11px;
  letter-spacing: 0.04em;
  cursor: pointer;
}

.obj-label.selected {
  background: rgba(126, 200, 255, 0.28);
}

.info-panel {
  top: 4.6rem;
  right: 1rem;
  width: min(320px, calc(100% - 2rem));
  max-height: calc(100% - 8rem);
  overflow: auto;
  padding: 1rem 1rem 0.9rem;
  background: rgba(6, 10, 18, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  backdrop-filter: blur(8px);
}

.info-en {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgba(255, 196, 120, 0.85);
}

.info-panel h2 {
  margin: 0.2rem 0 0;
  font-size: 26px;
  font-weight: 560;
}

.info-kind {
  margin-top: 0.2rem;
  color: #9eb6d4;
  font-size: 13px;
}

.info-panel p {
  line-height: 1.55;
  color: rgba(232, 238, 248, 0.86);
}

.info-panel dl {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.35rem 0.6rem;
  margin: 0;
  font-size: 13px;
}

.info-panel dt {
  color: rgba(232, 238, 248, 0.48);
}

.info-panel dd {
  margin: 0;
}

.info-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.9rem;
}

.cosmos-dock {
  left: 196px;
  right: 1rem;
  bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
}

.ghost,
.solid {
  border-radius: 999px;
  padding: 0.38rem 0.75rem;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  text-decoration: none;
}

.ghost {
  background: rgba(0, 0, 0, 0.4);
  color: #e8eef8;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.ghost.active,
.solid {
  background: rgba(126, 200, 255, 0.2);
  color: white;
  border: 1px solid rgba(126, 200, 255, 0.45);
}

.speeds {
  display: flex;
  gap: 0.3rem;
}

.scale-note {
  margin-left: auto;
  font-size: 12px;
  color: rgba(232, 238, 248, 0.45);
}

@media (max-width: 800px) {
  .cosmos-nav {
    top: auto;
    bottom: 4.2rem;
    width: 100%;
    height: auto;
    flex-direction: row;
    overflow: auto;
    border-right: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(0, 0, 0, 0.55);
  }

  .cosmos-top,
  .cosmos-dock {
    left: 0.6rem;
  }

  .cosmos-hint,
  .scale-note {
    display: none;
  }
}
</style>
