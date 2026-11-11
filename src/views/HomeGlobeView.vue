<template>
  <div class="home-globe" :class="{ 'in-space': inSpace }">
    <canvas ref="canvasRef" class="earth-canvas" :class="{ hidden: inSpace }"></canvas>
    <div ref="hudRef" class="hud-container" :class="{ hidden: inSpace }"></div>

    <canvas ref="spaceCanvasRef" class="space-canvas" :class="{ active: inSpace }"></canvas>
    <div class="space-hud" :class="{ active: inSpace && !insideTarget }">
      <div
        v-for="lab in spaceLabels"
        :key="lab.id"
        class="galaxy-label"
        :class="{ clickable: lab.clickable }"
        :style="{
          transform: `translate3d(${lab.x}px, ${lab.y}px, 0) translate(14px, -50%)`,
          opacity: lab.opacity
        }"
        @click.stop="onLabelClick(lab)"
      >
        <div class="galaxy-name">{{ lab.name }}</div>
        <div class="galaxy-meta">
          <span>{{ lab.sub }}</span>
          <span class="dot">·</span>
          <span>{{ lab.distText }}</span>
        </div>
        <div v-if="lab.clickable" class="galaxy-hint">
          {{ lab.kind === 'blackhole' ? '点击坠入' : '点击进入' }}
        </div>
      </div>
    </div>

    <div
      class="earth-moon-hud"
      :class="{ active: !inSpace && !onMoon && loaderDone }"
    >
      <div
        v-for="lab in moonLabels"
        :key="lab.id"
        class="galaxy-label clickable"
        :style="{
          transform: `translate3d(${lab.x}px, ${lab.y}px, 0) translate(14px, -50%)`,
          opacity: lab.opacity
        }"
        @click.stop="enterMoon"
      >
        <div class="galaxy-name">{{ lab.name }}</div>
        <div class="galaxy-meta">
          <span>{{ lab.sub }}</span>
        </div>
        <div class="galaxy-hint">点击进入</div>
      </div>
    </div>

    <div v-if="onMoon" class="bh-overlay">
      <div class="bh-overlay-title">{{ moonMeta?.name || '月球' }}</div>
      <div class="bh-overlay-sub">{{ moonMeta?.note || '月球近景环视' }}</div>
      <button type="button" class="space-btn back" @click="leaveMoon">离开月球</button>
    </div>

    <div v-if="insideTarget" class="bh-overlay">
      <div class="bh-overlay-title">{{ divingTarget?.name || '目标' }}</div>
      <div class="bh-overlay-sub">
        {{
          insideKind === 'blackhole'
            ? `已进入视界示意区域 · ${divingTarget?.type || ''}`
            : `已进入星云示意内部 · ${divingTarget?.type || ''} ${divingTarget?.nameEn || ''}`
        }}
      </div>
      <button type="button" class="space-btn back" @click="exitInside">
        {{ insideKind === 'blackhole' ? '离开黑洞' : '离开星云' }}
      </button>
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
            {{
              onMoon
                ? '月球近景 · 拖拽环视月表'
                : insideKind === 'blackhole'
                  ? '黑洞内部示意 · 时空拉伸特效'
                  : insideKind === 'galaxy'
                    ? '星云内部示意 · 拖拽环视轮廓'
                    : spaceMode === 'blackholes'
                      ? '黑洞模式 · 点击黑洞坠入 · 拖拽环视'
                      : inSpace
                        ? '太空模式 · 点击星云进入 · 拖拽环视'
                        : '地球主页 · 点击月球进入 · 拖拽旋转'
            }}
          </div>
        </div>
      </div>
      <router-link
        v-if="!inSpace"
        :to="isLoggedIn ? '/cockpit' : '/login'"
        class="home-login"
      >
        {{ isLoggedIn ? '管理' : '登录' }}
      </router-link>
      <p v-if="error" class="home-error">{{ error }}</p>
    </div>

    <div v-if="loaderDone && !error" class="bottom-bar">
      <template v-if="!inSpace && !onMoon">
        <button type="button" class="space-btn" @click="enterSpace">进入太空</button>
        <router-link class="space-btn" to="/cosmos">COSMOS v2</router-link>
        <router-link class="space-btn" to="/micro">微观奇境</router-link>
      </template>
      <template v-else-if="inSpace && !insideTarget">
        <div class="btn-row">
          <button
            v-if="spaceMode === 'galaxies'"
            type="button"
            class="space-btn"
            @click="enterBlackholes"
          >
            黑洞
          </button>
          <button
            v-else
            type="button"
            class="space-btn back"
            @click="backToGalaxies"
          >
            返回星云
          </button>
          <button type="button" class="space-btn back" @click="leaveSpace">返回地球</button>
        </div>
        <p class="space-tip">
          {{
            spaceMode === 'blackholes'
              ? '点击黑洞或标签滑入视界 · 布局为示意'
              : '点击星云或标签进入内部 · 轮廓按经典形态示意'
          }}
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { getToken } from '../api/auth'
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
const spaceMode = ref('galaxies')
const spaceLabels = ref([])
const insideTarget = ref(false)
const insideKind = ref(null)
const divingTarget = ref(null)
const onMoon = ref(false)
const moonMeta = ref(null)
const moonLabels = ref([])
const isLoggedIn = ref(!!getToken())

let disposeGlobe = null
let globeApi = null
let spaceScene = null

async function enterSpace() {
  if (inSpace.value || onMoon.value || !spaceCanvasRef.value) return
  if (onMoon.value) leaveMoon()
  inSpace.value = true
  spaceMode.value = 'galaxies'
  insideTarget.value = false
  insideKind.value = null
  divingTarget.value = null
  await nextTick()
  if (spaceScene) {
    spaceScene.dispose()
    spaceScene = null
  }
  spaceScene = new SpaceScene(spaceCanvasRef.value, {
    onLabelsUpdate: (labels) => {
      spaceLabels.value = labels
    },
    onModeChange: (mode) => {
      spaceMode.value = mode
    },
    onDiveChange: (_diving, meta, phase, kind) => {
      if (phase === 'start') {
        divingTarget.value = meta
        insideKind.value = kind
        insideTarget.value = false
      } else if (phase === 'inside') {
        divingTarget.value = meta
        insideKind.value = kind
        insideTarget.value = true
      } else {
        insideTarget.value = false
        insideKind.value = null
        divingTarget.value = null
      }
    }
  })
  spaceScene.init()
}

function enterMoon() {
  if (inSpace.value || onMoon.value) return
  globeApi?.enterMoon?.()
}

function leaveMoon() {
  globeApi?.exitMoon?.(false)
  onMoon.value = false
  moonMeta.value = null
}

function enterBlackholes() {
  spaceScene?.setMode('blackholes')
}

function backToGalaxies() {
  spaceScene?.setMode('galaxies')
}

function onLabelClick(lab) {
  if (!lab?.clickable) return
  if (lab.kind === 'blackhole') spaceScene?.enterBlackholeById(lab.id)
  else if (lab.kind === 'galaxy') spaceScene?.enterGalaxyById(lab.id)
}

function exitInside() {
  spaceScene?.exitInside(false)
  insideTarget.value = false
  insideKind.value = null
  divingTarget.value = null
}

function leaveSpace() {
  inSpace.value = false
  spaceMode.value = 'galaxies'
  spaceLabels.value = []
  insideTarget.value = false
  insideKind.value = null
  divingTarget.value = null
  if (spaceScene) {
    spaceScene.dispose()
    spaceScene = null
  }
}

onMounted(async () => {
  await nextTick()
  try {
    globeApi = mountGlobeApp({
      canvas: canvasRef.value,
      hudContainer: hudRef.value,
      loaderEl: loaderRef.value,
      progressValEl: progressValRef.value,
      messageValEl: messageValRef.value,
      progressBarEl: progressBarRef.value,
      onEarthLabels: (locations) => {
        moonLabels.value = (locations || []).filter((l) => l.kind === 'moon')
      },
      onMoonChange: (phase, meta) => {
        if (phase === 'start') {
          moonMeta.value = meta
          onMoon.value = false
        } else if (phase === 'inside') {
          moonMeta.value = meta
          onMoon.value = true
        } else {
          onMoon.value = false
          moonMeta.value = null
        }
      }
    })
    disposeGlobe = globeApi.dispose
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
  leaveMoon()
  disposeGlobe?.()
  disposeGlobe = null
  globeApi = null
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

.earth-moon-hud {
  position: absolute;
  inset: 0;
  z-index: 22;
  pointer-events: none;
  opacity: 0;
}

.earth-moon-hud.active {
  opacity: 1;
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

.galaxy-label.clickable {
  pointer-events: auto;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
}

.galaxy-label.clickable:hover {
  background: rgba(120, 180, 255, 0.18);
}

.galaxy-hint {
  margin-top: 3px;
  font-size: 9px;
  letter-spacing: 0.12em;
  color: rgba(255, 180, 120, 0.75);
}

.btn-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  pointer-events: auto;
}

.bh-overlay {
  position: absolute;
  inset: 0;
  z-index: 36;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom));
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 20%, rgba(0, 0, 0, 0.55) 100%);
}

.bh-overlay-title {
  font-size: 1.1rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 220, 180, 0.9);
  margin-bottom: 0.35rem;
}

.bh-overlay-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  margin-bottom: 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.bh-overlay .space-btn {
  pointer-events: auto;
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

.home-login {
  margin-left: auto;
  flex-shrink: 0;
  padding: 0.5rem 1.1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  color: #fff;
  background: rgba(13, 148, 136, 0.55);
  border: 1px solid rgba(45, 212, 191, 0.55);
  pointer-events: auto;
  z-index: 40;
}

.home-login:hover {
  background: rgba(13, 148, 136, 0.8);
  border-color: rgba(45, 212, 191, 0.85);
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

a.space-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-sizing: border-box;
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
