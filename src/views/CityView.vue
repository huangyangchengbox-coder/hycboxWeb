<template>
  <div class="city">
    <canvas ref="canvasRef" class="city-canvas"></canvas>
    <WorldMenu />

    <!-- 顶部标题 + 模式按钮 -->
    <header class="city-top">
      <div class="brand">
        <span class="kicker">LUMEN CITY TWIN</span>
        <h1>3D 智慧城市数字孪生</h1>
        <span class="sim">telemetry simulated</span>
      </div>
      <div class="top-modes">
        <button type="button" :class="{ on: xray }" @click="toggleXray">X-ray 透视地下</button>
        <button type="button" :class="{ on: !night }" @click="toggleNight">{{ night ? 'Daylight' : '夜景' }}</button>
        <button type="button" :class="{ on: tour }" @click="toggleTour">Auto tour</button>
        <button type="button" :class="{ on: showLabels }" @click="toggleLabels">Labels</button>
      </div>
    </header>

    <!-- 左侧图层开关 -->
    <aside class="layers">
      <div class="layers-head">
        <span>六张网</span>
        <button type="button" class="overview" :class="{ on: focusId === 'overview' }" @click="focus('overview')">总览</button>
      </div>
      <button
        v-for="(net, i) in nets"
        :key="net.id"
        type="button"
        class="layer"
        :class="{ on: focusId === net.id }"
        :style="{ '--c': net.color }"
        @click="focus(net.id)"
      >
        <span class="layer-icon">{{ net.icon }}</span>
        <span class="layer-text">
          <b>{{ net.name }}</b>
          <em>{{ net.en }}</em>
        </span>
        <span class="layer-key">{{ i + 1 }}</span>
      </button>
      <p class="layers-note">按键盘 1–6 切换，0 回总览</p>
    </aside>

    <!-- 右侧城市脉搏 / 单网详情 -->
    <aside class="pulse">
      <template v-if="focusId === 'overview'">
        <div class="pulse-head">
          <span class="kicker">CITY PULSE</span>
          <h2>城市脉搏</h2>
          <p class="clock">{{ clock }}</p>
        </div>
        <div class="kpi-grid">
          <div v-for="item in overviewKpis" :key="item.label" class="kpi" :style="{ '--c': item.color }">
            <span>{{ item.label }}</span>
            <b>{{ item.value }}<em>{{ item.unit }}</em></b>
          </div>
        </div>
        <CityTrend :values="overviewTrend" color="#5ec8ff" span="近 90 秒 · 综合指数" />
        <div class="net-list">
          <button v-for="net in nets" :key="net.id" type="button" @click="focus(net.id)">
            <i :style="{ background: net.color }"></i>
            <b>{{ net.name }}</b>
            <em>{{ net.tag }}</em>
          </button>
        </div>
      </template>

      <template v-else>
        <div class="pulse-head">
          <span class="kicker" :style="{ color: activeNet.color }">{{ activeNet.en.toUpperCase() }}</span>
          <h2>{{ activeNet.name }}</h2>
          <p class="net-tag">{{ activeNet.tag }}</p>
        </div>
        <p class="net-desc">{{ activeNet.desc }}</p>

        <div class="kpi-grid">
          <div v-for="item in detailKpis" :key="item.label" class="kpi" :style="{ '--c': activeNet.color }">
            <span>{{ item.label }}</span>
            <b>{{ item.value }}<em>{{ item.unit }}</em></b>
          </div>
        </div>

        <CityTrend :values="detailTrend" :color="activeNet.color" span="近 90 秒 · {{ activeNet.kpis[0].label }}" />

        <h3>设施清单</h3>
        <ul class="facilities">
          <li v-for="f in activeNet.facilities" :key="f.name">
            <i :style="{ background: activeNet.color }"></i>
            <span>{{ f.name }}</span>
          </li>
        </ul>

        <button type="button" class="accident" :class="{ running: accidentRunning }" @click="runAccident">
          {{ accidentRunning ? '处置中…（点击重置）' : '模拟事故' }}
        </button>
      </template>
    </aside>

    <!-- 底部：流速 + 事件日志 -->
    <footer class="city-foot">
      <div class="speed">
        <button type="button" @click="togglePause">{{ paused ? '▶' : '❚❚' }}</button>
        <label>流速 {{ speed.toFixed(1) }}×</label>
        <input type="range" min="0.2" max="3" step="0.1" :value="speed" @input="onSpeed" />
      </div>
      <div class="log">
        <div v-if="!log.length" class="log-idle">事件日志 · 空闲（点「模拟事故」看处置全过程）</div>
        <div v-for="(item, i) in log" :key="`${item.t}-${i}`" class="log-row" :style="{ color: item.color }">
          <span class="log-t">T+{{ item.t.toFixed(1) }}s</span>
          <span class="log-lvl">{{ item.lvl }}</span>
          <span class="log-msg">{{ item.msg }}</span>
        </div>
      </div>
    </footer>

    <!-- 悬浮读数 -->
    <div v-if="hover" class="tooltip" :style="{ left: hover.left + 'px', top: hover.top + 'px' }">
      <span class="tt-net" :style="{ color: netById(hover.net).color }">{{ netById(hover.net).name }}</span>
      <b>{{ hover.name }}</b>
      <span class="tt-val">{{ hover.value }} {{ hover.unit }}</span>
    </div>

    <p class="disclaimer">城市、楼宇、管线、车流与卫星全部由代码生成，无外部模型文件。所有读数均为本地模拟演示，不对应任何真实城市。</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import CityTrend from '../components/CityTrend.vue'
import { CityTwin } from '../city/CityTwin.js'
import { LEVEL_COLORS, LEVEL_NAMES, NETS, kpisAt, netById, scriptState, trendAt } from '../city/catalog.js'

const canvasRef = ref(null)
const nets = NETS
const focusId = ref('overview')
const night = ref(true)
const xray = ref(false)
const tour = ref(false)
const showLabels = ref(true)
const paused = ref(false)
const speed = ref(1)
const elapsed = ref(0)
const clock = ref('20:40')
const hover = ref(null)
const log = ref([])
const accidentNet = ref('')
const accidentRunning = ref(false)

let twin = null
let tourTimer = null
let hoverTimer = null

const activeNet = computed(() => netById(focusId.value))

const overviewKpis = ref([])
const overviewTrend = ref([])
const detailKpis = ref([])
const detailTrend = ref([])

function refresh() {
  const t = elapsed.value
  overviewTrend.value = trendAt({ id: 'overview', kpis: [{ base: 88 }] }, t)
  const pulse = 88 + Math.sin(t * 0.06) * 3.4 + Math.sin(t * 0.23) * 1.6
  overviewKpis.value = [
    { label: '六网在线', value: 6, unit: '/6', color: '#d8f34a' },
    { label: '城市综合指数', value: pulse.toFixed(1), unit: '', color: '#5ec8ff' },
    { label: '告警数', value: accidentRunning.value ? 1 : 0, unit: '条', color: accidentRunning.value ? '#ff5a4d' : '#4ade80' },
    { label: '活跃设施', value: NETS.reduce((n, x) => n + x.facilities.length, 0), unit: '个', color: '#ffd166' }
  ]

  if (focusId.value !== 'overview') {
    detailKpis.value = kpisAt(activeNet.value, t)
    detailTrend.value = trendAt(activeNet.value, t)
  }

  const total = 20 * 60 + 40 + t * 6
  const hh = String(Math.floor((total / 60) % 24)).padStart(2, '0')
  const mm = String(Math.floor(total % 60)).padStart(2, '0')
  clock.value = `${hh}:${mm}`
}

function focus(id) {
  focusId.value = id
  twin?.focus(id)
  if (id !== 'overview' && accidentNet.value && accidentNet.value !== id) {
    log.value = []
    accidentNet.value = ''
    accidentRunning.value = false
    twin?.stopAccident()
  }
  refresh()
}

function toggleXray() {
  xray.value = !xray.value
  twin?.setXray(xray.value)
}

function toggleNight() {
  night.value = !night.value
  twin?.setNight(night.value)
}

function toggleLabels() {
  showLabels.value = !showLabels.value
  twin?.setLabels(showLabels.value)
}

function togglePause() {
  paused.value = !paused.value
  twin?.setPaused(paused.value)
}

function onSpeed(e) {
  speed.value = Number(e.target.value)
  twin?.setSpeed(speed.value)
}

function toggleTour() {
  tour.value = !tour.value
  if (tour.value) {
    let i = 0
    const ids = NETS.map((n) => n.id)
    tourTimer = setInterval(() => {
      focus(ids[i % ids.length])
      i += 1
    }, 9000)
    focus(ids[0])
  } else {
    clearInterval(tourTimer)
    tourTimer = null
  }
}

function runAccident() {
  if (accidentRunning.value) {
    twin?.stopAccident()
    accidentRunning.value = false
    accidentNet.value = ''
    log.value = []
    return
  }
  const id = focusId.value
  accidentNet.value = id
  accidentRunning.value = true
  log.value = []
  twin?.triggerAccident(id)
}

const ACCIDENT_DURATION = { t: 0 }

function onKey(e) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (e.key >= '1' && e.key <= '6') {
    const net = NETS[Number(e.key) - 1]
    if (net) focus(net.id)
  }
  if (e.key === '0') focus('overview')
}

onMounted(() => {
  twin = new CityTwin(canvasRef.value)
  twin.onFocus = (id) => {
    focusId.value = id
  }
  twin.onFrame = ({ elapsed: t, accident }) => {
    elapsed.value = t
    if (t % 0.25 < 0.05) refresh()

    if (accident && accidentRunning.value) {
      // 直接读 twin 里维护的事故计时，避免依赖帧时间戳
      const net = netById(accident.net)
      const st = scriptState(net, accident.t ?? 0)
      const next = st.done.map((step) => ({
        t: step.t,
        lvl: LEVEL_NAMES[step.lvl],
        msg: step.msg,
        color: LEVEL_COLORS[step.lvl]
      }))
      if (next.length !== log.value.length) log.value = next
      if (st.finished && !st.finishedHandled) {
        st.finishedHandled = true
      }
    }
  }
  twin.onAccident = () => {
    if (twin.accident) twin.accident.t = 0
  }
  twin.onXray = (v) => {
    xray.value = v
  }

  // 悬停读数
  twin.hoverCb = (hit) => {
    if (!hit) {
      hover.value = null
      return
    }
    const net = netById(hit.net)
    const k = kpisAt(net, elapsed.value)[0]
    hover.value = {
      net: hit.net,
      name: hit.name,
      value: k.value,
      unit: k.unit,
      left: hit.client?.x ?? 0,
      top: hit.client?.y ?? 0
    }
  }

  refresh()
  window.addEventListener('keydown', onKey)
  if (import.meta.env.DEV) window.__cityTwin = twin
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(tourTimer)
  clearTimeout(hoverTimer)
  twin?.dispose()
  twin = null
})
</script>

<style scoped>
.city {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05070d;
  color: #e8f2f8;
  font-family: "Inter", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.city-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.city-top,
.layers,
.pulse,
.city-foot,
.tooltip,
.disclaimer {
  position: absolute;
  z-index: 3;
}

.city-top {
  top: 60px;
  left: 16px;
  right: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}

.brand .kicker,
.kicker {
  font-size: 9.5px;
  letter-spacing: 0.18em;
  color: #5ec8ff;
}

.brand h1 {
  margin: 2px 0 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.sim {
  font-size: 9px;
  color: #7f9a91;
  font-family: ui-monospace, monospace;
}

.top-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  pointer-events: auto;
}

.top-modes button {
  padding: 5px 10px;
  font-size: 10.5px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(8, 18, 28, 0.82);
  color: #a9c4b6;
  cursor: pointer;
  backdrop-filter: blur(8px);
}

.top-modes button.on {
  border-color: rgba(94, 200, 255, 0.7);
  background: rgba(94, 200, 255, 0.18);
  color: #cdefff;
}

.layers {
  top: 132px;
  left: 16px;
  width: 196px;
  padding: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(6, 14, 24, 0.88);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layers-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding-bottom: 6px;
  margin-bottom: 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  color: #8fa9a0;
}

.overview {
  padding: 3px 8px;
  font-size: 9.5px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  color: #a9c4b6;
  cursor: pointer;
}

.overview.on {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
  font-weight: 700;
}

.layer {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 7px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4b6;
  cursor: pointer;
  text-align: left;
}

.layer.on {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 16%, transparent);
}

.layer-icon {
  font-size: 13px;
  line-height: 1;
}

.layer-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.layer-text b {
  font-size: 10.5px;
  color: #e8f2f8;
}

.layer-text em {
  font-style: normal;
  font-size: 8.5px;
  color: #7f9a91;
}

.layer.on .layer-text b {
  color: var(--c);
}

.layer-key {
  font-size: 8.5px;
  color: #6b8a80;
  font-family: ui-monospace, monospace;
}

.layers-note {
  margin: 4px 0 0;
  font-size: 9px;
  color: #5d7a71;
  line-height: 1.4;
}

.pulse {
  top: 132px;
  right: 16px;
  width: 290px;
  max-height: calc(100% - 230px);
  overflow: auto;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(6, 14, 24, 0.9);
  backdrop-filter: blur(10px);
}

.pulse-head h2 {
  margin: 3px 0 2px;
  font-size: 17px;
}

.pulse-head .clock {
  margin: 0;
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #7f9a91;
}

.net-tag {
  margin: 2px 0 0;
  font-size: 9.5px;
  color: #8fa9a0;
}

.net-desc {
  margin: 7px 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: #a9c4b6;
}

.kpi-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin: 7px 0;
}

.kpi {
  padding: 6px 8px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-left: 2px solid var(--c);
  background: rgba(255, 255, 255, 0.035);
}

.kpi span {
  display: block;
  font-size: 9px;
  color: #8fa9a0;
}

.kpi b {
  font-family: ui-monospace, monospace;
  font-size: 15px;
  color: #f2fbff;
}

.kpi b em {
  font-style: normal;
  font-size: 9px;
  color: #7f9a91;
  margin-left: 2px;
}

.net-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 7px;
}

.net-list button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.025);
  color: #a9c4b6;
  cursor: pointer;
  text-align: left;
}

.net-list button i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.net-list button b {
  font-size: 10px;
  color: #dcecf4;
  white-space: nowrap;
}

.net-list button em {
  font-style: normal;
  font-size: 8.5px;
  color: #6f8a81;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pulse h3 {
  margin: 9px 0 4px;
  font-size: 10.5px;
  color: #8fa9a0;
  letter-spacing: 0.06em;
}

.facilities {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.facilities li {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 9.5px;
  color: #b6cec4;
}

.facilities li i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.accident {
  width: 100%;
  margin-top: 9px;
  padding: 7px;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 8px;
  border: 1px solid rgba(255, 90, 77, 0.55);
  background: rgba(255, 90, 77, 0.14);
  color: #ffb4a8;
  cursor: pointer;
}

.accident.running {
  border-color: rgba(255, 184, 0, 0.6);
  background: rgba(255, 184, 0, 0.16);
  color: #ffd79a;
}

.city-foot {
  left: 16px;
  right: 16px;
  bottom: 34px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(6, 14, 24, 0.88);
  backdrop-filter: blur(10px);
}

.speed {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 0 0 auto;
}

.speed button {
  width: 26px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #dcecf4;
  cursor: pointer;
  font-size: 10px;
}

.speed label {
  font-size: 9.5px;
  color: #8fa9a0;
  white-space: nowrap;
}

.speed input {
  width: 92px;
  height: 12px;
  accent-color: #5ec8ff;
}

.log {
  flex: 1;
  min-width: 220px;
  max-height: 62px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.log-idle {
  font-size: 9.5px;
  color: #5d7a71;
}

.log-row {
  display: flex;
  gap: 6px;
  font-size: 9.5px;
  line-height: 1.45;
}

.log-t {
  flex: 0 0 auto;
  font-family: ui-monospace, monospace;
  opacity: 0.75;
}

.log-lvl {
  flex: 0 0 auto;
  font-weight: 700;
}

.log-msg {
  color: #c4d8d0;
}

.tooltip {
  transform: translate(12px, -50%);
  pointer-events: none;
  padding: 5px 8px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(4, 10, 16, 0.94);
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 9.5px;
  max-width: 200px;
}

.tt-net {
  font-size: 8.5px;
  letter-spacing: 0.06em;
}

.tooltip b {
  font-size: 10.5px;
  color: #f2fbff;
}

.tt-val {
  font-family: ui-monospace, monospace;
  color: #d8f34a;
}

.disclaimer {
  left: 16px;
  right: 16px;
  bottom: 8px;
  margin: 0;
  text-align: center;
  font-size: 9.5px;
  color: rgba(143, 169, 160, 0.85);
}

@media (max-width: 1180px) {
  .pulse {
    top: auto;
    bottom: 152px;
    max-height: 42%;
    left: 16px;
    right: 16px;
    width: auto;
  }

  .layers {
    top: 118px;
    width: 168px;
  }
}

@media (max-width: 900px) {
  .layers {
    display: none;
  }

  .brand h1 {
    font-size: 17px;
  }

  .city-top {
    top: 56px;
  }
}
</style>
