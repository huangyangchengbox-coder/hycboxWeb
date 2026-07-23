<template>
  <div class="home-globe" :class="{ 'in-space': inSpace }">
    <canvas ref="canvasRef" class="earth-canvas" :class="{ hidden: inSpace }"></canvas>
    <div ref="hudRef" class="hud-container" :class="{ hidden: inSpace }"></div>

    <canvas ref="spaceCanvasRef" class="space-canvas" :class="{ active: inSpace }"></canvas>
    <div class="space-hud" :class="{ active: inSpace }">
      <div
        v-for="lab in spaceLabels"
        :key="lab.id"
        class="galaxy-label"
        :style="{
          transform: `translate3d(${lab.x}px, ${lab.y}px, 0) translate(14px, -50%)`,
          opacity: lab.opacity
        }"
      >
        <div class="galaxy-name">{{ lab.name }}</div>
        <div class="galaxy-meta">
          <span>{{ lab.type }}</span>
          <span class="dot">·</span>
          <span>{{ formatDist(lab.distMly) }}</span>
        </div>
      </div>
    </div>

    <div ref="loaderRef" class="loader" :class="{ done: loaderDone }">
      <div class="loader-bg-glow"></div>
      <div class="loader-grid"></div>
      <div class="loader-content">
        <div class="spinner-outer"></div>
        <div class="spinner-inner"></div>
        <div class="loader-counter">
          <span class="loader-percent">
            <span ref="progressValRef">0</span>
            <span class="loader-percent-symbol">%</span>
          </span>
        </div>
        <div class="loader-title">System Boot</div>
        <div ref="messageValRef" class="loader-message">Initializing WebGPU Renderer</div>
        <div class="loader-bar-bg">
          <div ref="progressBarRef" class="loader-bar-fill"></div>
        </div>
      </div>
    </div>

    <div class="home-chrome" :class="{ space: inSpace }">
      <div class="home-brand">
        <span class="home-logo">hyc</span>
        <div>
          <div class="home-title">hycBox</div>
          <div class="home-sub">
            {{ inSpace ? '太空模式 · 已知星系示意 · 拖拽环视' : '地球主页 · 拖拽旋转 · 滚轮缩放' }}
          </div>
        </div>
      </div>
      <nav v-if="!inSpace" class="home-nav">
        <router-link to="/cockpit">小区数据仓</router-link>
        <router-link to="/nation-cockpit">物流中国仓</router-link>
        <router-link to="/ai-image">图片 AI</router-link>
        <router-link to="/ai-video">视频 AI</router-link>
      </nav>
      <p v-if="error" class="home-error">{{ error }}</p>
    </div>

    <div v-if="loaderDone && !error" class="bottom-bar">
      <button v-if="!inSpace" type="button" class="space-btn" @click="enterSpace">进入太空</button>
      <button v-else type="button" class="space-btn back" @click="leaveSpace">返回地球</button>
      <p v-if="inSpace" class="space-tip">布局为对数压缩示意，距离仅供对照</p>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { mountGlobeApp } from '../globe/bootstrap.js'
import { SpaceScene } from '../globe/SpaceScene.js'

const canvasRef = ref(null)
const spaceCanvasRef = ref(null)
const hudRef = ref(null)
const loaderRef = ref(null)
const progressValRef = ref(null)
const messageValRef = ref(null)
const progressBarRef = ref(null)
const loaderDone = ref(false)
const error = ref('')
const inSpace = ref(false)
const spaceLabels = ref([])

let disposeGlobe = null
let spaceScene = null

function formatDist(distMly) {
  if (!distMly) return '本星系'
  if (distMly < 1) return `${(distMly * 1000).toFixed(0)} 千光年`
  if (distMly < 100) return `${distMly.toFixed(1)} 百万光年`
  return `${Math.round(distMly)} 百万光年`
}

async function enterSpace() {
  if (inSpace.value || !spaceCanvasRef.value) return
  inSpace.value = true
  await nextTick()
  if (spaceScene) {
    spaceScene.dispose()
    spaceScene = null
  }
  spaceScene = new SpaceScene(spaceCanvasRef.value, {
    onLabelsUpdate: (labels) => {
      spaceLabels.value = labels
    }
  })
  spaceScene.init()
}

function leaveSpace() {
  inSpace.value = false
  spaceLabels.value = []
  if (spaceScene) {
    spaceScene.dispose()
    spaceScene = null
  }
}

onMounted(async () => {
  await nextTick()
  try {
    const { dispose } = mountGlobeApp({
      canvas: canvasRef.value,
      hudContainer: hudRef.value,
      loaderEl: loaderRef.value,
      progressValEl: progressValRef.value,
      messageValEl: messageValRef.value,
      progressBarEl: progressBarRef.value
    })
    disposeGlobe = dispose
    const el = loaderRef.value
    if (el) {
      const obs = new MutationObserver(() => {
        if (el.style.display === 'none' || el.style.opacity === '0') {
          loaderDone.value = true
          obs.disconnect()
        }
      })
      obs.observe(el, { attributes: true, attributeFilter: ['style'] })
    }
  } catch (e) {
    console.error(e)
    error.value = e?.message || '地球引擎初始化失败'
    loaderDone.value = true
  }
})

onUnmounted(() => {
  leaveSpace()
  disposeGlobe?.()
  disposeGlobe = null
})
</script>

<style scoped>
.home-globe {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
  color: #fff;
}

.earth-canvas,
.space-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

.earth-canvas.hidden {
  visibility: hidden;
  pointer-events: none;
}

.space-canvas {
  opacity: 0;
  pointer-events: none;
  z-index: 5;
}

.space-canvas.active {
  opacity: 1;
  pointer-events: auto;
}

.hud-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.hud-container.hidden {
  display: none;
}

.space-hud {
  position: absolute;
  inset: 0;
  z-index: 22;
  pointer-events: none;
  opacity: 0;
}

.space-hud.active {
  opacity: 1;
}

.galaxy-label {
  position: absolute;
  left: 0;
  top: 0;
  white-space: nowrap;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.galaxy-name {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.88);
}

.galaxy-meta {
  margin-top: 2px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 6px;
}

.galaxy-meta .dot {
  color: rgba(255, 255, 255, 0.2);
}

.home-chrome {
  position: absolute;
  z-index: 30;
  left: 0;
  right: 0;
  top: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 85%);
}

.home-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  pointer-events: auto;
}

.home-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: #0d9488;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.home-title {
  font-weight: 700;
  letter-spacing: 0.04em;
}

.home-sub {
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.home-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  pointer-events: auto;
  justify-content: flex-end;
}

.home-nav a {
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.home-nav a:hover,
.home-nav a.router-link-active {
  color: #fff;
  background: rgba(13, 148, 136, 0.35);
  border-color: rgba(45, 212, 191, 0.4);
}

.home-error {
  position: absolute;
  left: 1.5rem;
  bottom: -2.5rem;
  color: #fecaca;
  font-size: 0.85rem;
  pointer-events: auto;
}

.bottom-bar {
  position: absolute;
  z-index: 35;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 1.5rem calc(1.25rem + env(safe-area-inset-bottom));
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.72), transparent 90%);
  pointer-events: none;
}

.space-btn {
  pointer-events: auto;
  min-width: 10rem;
  padding: 0.7rem 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 0.9rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}

.space-btn:hover {
  background: rgba(13, 148, 136, 0.35);
  border-color: rgba(45, 212, 191, 0.55);
  transform: translateY(-1px);
}

.space-btn.back {
  background: rgba(15, 23, 42, 0.55);
}

.space-tip {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* Loader */
.loader {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  overflow: hidden;
  background: #000;
  transition: opacity 1.2s ease-in-out, filter 1.2s ease-in-out;
}

.loader.done {
  pointer-events: none;
}

.loader-bg-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at center,
    rgba(15, 23, 42, 0.4) 0%,
    rgba(0, 0, 0, 0.9) 60%,
    #000 100%
  );
}

.loader-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 4rem 4rem;
  mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, #000 70%, transparent 100%);
}

.loader-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.spinner-outer,
.spinner-inner {
  position: absolute;
  top: 50%;
  left: 50%;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
}

.spinner-outer {
  width: 8rem;
  height: 8rem;
  margin-top: -4rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top-color: rgba(255, 255, 255, 0.8);
  border-right-color: rgba(255, 255, 255, 0.3);
  border-bottom-color: transparent;
  border-left-color: transparent;
  animation: spin-cw 8s linear infinite;
}

.spinner-inner {
  width: 10rem;
  height: 10rem;
  margin-top: -4rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom-color: rgba(255, 255, 255, 0.4);
  animation: spin-ccw 12s linear infinite;
}

@keyframes spin-cw {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes spin-ccw {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
}

.loader-counter {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 3rem;
}

.loader-percent {
  font-size: 1.5rem;
  font-weight: 300;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.9);
}

.loader-percent-symbol {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 0.25rem;
}

.loader-title {
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 0.5rem;
}

.loader-message {
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.8);
  height: 1rem;
}

.loader-bar-bg {
  width: 16rem;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin-top: 1.5rem;
  position: relative;
  overflow: hidden;
}

.loader-bar-fill {
  position: absolute;
  inset: 0 auto 0 0;
  width: 0%;
  background: rgba(255, 255, 255, 0.8);
  transition: width 0.2s ease-out;
}
</style>

<style>
.beacon-point {
  position: absolute;
  left: 0;
  top: 0;
  transform: translate3d(0, 0, 0) translate(-50%, -50%);
  opacity: 0;
  display: none;
  pointer-events: none;
  z-index: 20;
  width: 2rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
}

.beacon-core {
  position: relative;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.4);
  background: #fff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.7);
  z-index: 20;
}

.beacon-ping {
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.1);
  animation: ping-anim 3s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.beacon-ring {
  position: absolute;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes ping-anim {
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.label-box {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  display: none;
  pointer-events: none;
  z-index: 20;
  white-space: nowrap;
  user-select: none;
}

.label-align {
  display: flex;
  flex-direction: column;
}

.label-align-start {
  align-items: flex-start;
}

.label-align-end {
  align-items: flex-end;
}

.label-title {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 700;
  letter-spacing: 0.2em;
  font-size: 11px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
}

.label-sub {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.label-dot {
  color: rgba(255, 255, 255, 0.2);
}

.lil-gui {
  font-family: monospace !important;
  z-index: 40 !important;
}
</style>
