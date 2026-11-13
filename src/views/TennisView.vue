<template>
  <div class="tennis">
    <canvas ref="canvasRef" class="tennis-canvas"></canvas>
    <WorldMenu />

    <aside class="shot-panel">
      <div class="kicker">TENNIS</div>
      <h1>网球世界</h1>
      <p class="sub">拖动旋转 · 滚轮缩放 · 空格暂停</p>
      <div class="shot-grid">
        <button
          v-for="item in shots"
          :key="item.id"
          type="button"
          :class="{ on: item.id === shotId }"
          @click="choose(item.id)"
        >{{ item.name }}</button>
      </div>
    </aside>

    <aside class="info-panel">
      <div class="kicker">{{ current.en }}</div>
      <h2>{{ current.name }}</h2>
      <p>{{ current.desc }}</p>
      <p class="phase">动作阶段：{{ phaseName }}</p>
      <ol>
        <li v-for="point in current.points" :key="point">{{ point }}</li>
      </ol>
      <p class="warn">{{ current.error }}</p>
      <p class="note">一种常见做法，不是唯一打法。球的飞行按重力示意，球本身放大了，方便看清。</p>
    </aside>

    <footer class="dock">
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
      <button type="button" @click="scene?.setCamera('side')">侧视</button>
      <button type="button" @click="scene?.setCamera('behind')">后视</button>
      <button type="button" @click="scene?.setCamera('top')">俯视</button>
    </footer>
    <p class="disclaimer">本模块为科普与教学示意，动作和弹道经过简化，不替代专业教练指导。场地线按 ITF 尺寸。</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import { SHOTS } from '../tennis/catalog.js'
import { TennisScene } from '../tennis/TennisScene.js'

const shots = SHOTS
const canvasRef = ref(null)
const shotId = ref('forehand')
const progress = ref(0)
const playing = ref(true)
const speed = ref(1)
const scrubbing = ref(false)
const phaseName = ref('准备引拍')
let scene = null

const current = computed(() => shots.find((item) => item.id === shotId.value) || shots[0])

function choose(id) {
  shotId.value = id
  scene?.setShot(id)
  playing.value = true
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

function onKey(event) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === ' ') {
    event.preventDefault()
    toggle()
  }
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  scene = new TennisScene(canvasRef.value)
  scene.onFrame = ({ progress: value, playing: isPlaying, phase }) => {
    if (!scrubbing.value) progress.value = value
    playing.value = isPlaying
    if (phase) phaseName.value = phase
  }
  if (reduced) {
    playing.value = false
    scene.setPlaying(false)
  }
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  scene?.dispose()
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

.shot-panel,
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

.shot-panel {
  top: 58px;
  left: 14px;
  width: 250px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.86);
}

.shot-panel h1 {
  margin: 6px 0;
  font-size: 22px;
  letter-spacing: 0.08em;
}

.sub,
.note {
  margin: 0;
  color: #a9c4b6;
  font-size: 12px;
  line-height: 1.6;
}

.shot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}

button {
  border: 1px solid #46685a;
  background: #18352d;
  color: #fff;
  border-radius: 8px;
  padding: 8px 6px;
  cursor: pointer;
  font-size: 13px;
}

button.on,
button:hover {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

.info-panel {
  top: 58px;
  right: 14px;
  width: 280px;
  max-height: calc(100% - 130px);
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 25, 25, 0.86);
}

.info-panel h2 {
  margin: 6px 0 8px;
  font-size: 20px;
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

.dock {
  left: 50%;
  bottom: 36px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  align-items: center;
  width: min(760px, calc(100% - 28px));
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(16, 45, 39, 0.9);
}

.dock input {
  flex: 1 1 140px;
  min-width: 120px;
}

.time {
  color: #d8f34a;
  font-size: 12px;
  min-width: 4.5em;
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

@media (max-width: 900px) {
  .shot-panel,
  .info-panel {
    width: calc(100% - 28px);
  }

  .info-panel {
    top: auto;
    bottom: 118px;
    max-height: 28%;
  }

  .shot-panel {
    width: min(250px, calc(100% - 28px));
  }
}
</style>
