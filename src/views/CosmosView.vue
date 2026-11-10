<template>
  <div class="cosmos" ref="rootRef">
    <canvas ref="canvasRef" class="cosmos-canvas"></canvas>
    <WorldMenu>
      <router-link class="wm-link" to="/home">经典地球</router-link>
    </WorldMenu>

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

    <footer class="cosmos-dock">
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
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { MODES } from '../cosmos/catalog.js'
import { CosmosScene } from '../cosmos/CosmosScene.js'
import WorldMenu from '../components/WorldMenu.vue'

const modes = MODES
const speeds = [0.2, 1, 4, 20]
const canvasRef = ref(null)
const rootRef = ref(null)
const modeId = ref('planets')
const labels = ref([])
const selected = ref(null)
const paused = ref(false)
const speed = ref(1)
const quality = ref('high')

const activeMode = computed(() => modes.find((item) => item.id === modeId.value) || modes[0])

let scene = null

function changeMode(id) {
  modeId.value = id
  selected.value = null
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

function toggleFull() {
  const el = rootRef.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen()
  else el.requestFullscreen?.()
}

onMounted(() => {
  scene = new CosmosScene(canvasRef.value, {
    onSelect: (meta) => {
      selected.value = meta
    },
    onLabels: (list) => {
      labels.value = list
    }
  })
  scene.init()
})

onUnmounted(() => {
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
