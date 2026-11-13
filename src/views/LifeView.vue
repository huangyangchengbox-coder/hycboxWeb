<template>
  <div class="life">
    <canvas ref="canvasRef" class="life-canvas"></canvas>
    <WorldMenu />

    <aside class="side">
      <div class="kicker">LIFE · 38 亿年</div>
      <h1>生命演化</h1>
      <p class="sub">一条时间轴，从最早的细胞到我们。点击节点或下方刻度切换。</p>

      <div class="tabs">
        <button type="button" :class="{ on: view === 'timeline' }" @click="setView('timeline')">演化长河</button>
        <button type="button" :class="{ on: view === 'mechanism' }" @click="setView('mechanism')">演化机制</button>
        <button type="button" :class="{ on: view === 'extinction' }" @click="setView('extinction')">大灭绝</button>
      </div>

      <div class="ticks">
        <button
          v-for="(item, index) in milestones"
          :key="item.id"
          type="button"
          class="tick"
          :class="{ on: index === current.index, past: index < current.index }"
          :title="item.title"
          @click="pick(index)"
        >
          <span class="tick-icon">{{ item.icon }}</span>
          <span class="tick-label">{{ item.label }}</span>
        </button>
      </div>
    </aside>

    <aside class="info">
      <template v-if="view === 'timeline'">
        <div class="kicker">{{ current.item.era }} · {{ current.item.en }}</div>
        <h2>{{ current.item.title }}</h2>
        <p class="era-badge">{{ current.item.label }} · {{ current.item.tag }}</p>
        <p>{{ current.item.text }}</p>
        <ul class="facts">
          <li v-for="fact in current.item.facts" :key="fact">{{ fact }}</li>
        </ul>
        <div class="nav-row">
          <button type="button" :disabled="current.index === 0" @click="pick(current.index - 1)">← 更早</button>
          <span class="pos">{{ current.index + 1 }} / {{ current.total }}</span>
          <button type="button" :disabled="current.index === current.total - 1" @click="pick(current.index + 1)">更晚 →</button>
        </div>
      </template>

      <template v-else-if="view === 'mechanism'">
        <div class="kicker">MECHANISMS</div>
        <h2>演化是怎么发生的</h2>
        <p>演化不是“为了适应而改变”，而是先有变异、再被环境筛选。下面五条是主要机制。</p>
        <details v-for="item in mechanisms" :key="item.id" class="mech" :open="openMech === item.id" @toggle="onToggleMech(item.id, $event)">
          <summary>
            <span class="mech-icon">{{ item.icon }}</span>
            <span class="mech-title">{{ item.title }}</span>
            <span class="mech-en">{{ item.en }}</span>
          </summary>
          <p>{{ item.text }}</p>
          <ul class="facts">
            <li v-for="point in item.points" :key="point">{{ point }}</li>
          </ul>
          <p class="misread">{{ item.misread }}</p>
        </details>
      </template>

      <template v-else-if="view === 'extinction'">
        <div class="kicker">MASS EXTINCTIONS</div>
        <h2>五次大灭绝</h2>
        <p>灭绝不是演化的失败，而是筛选压力的极端形式。每一次之后，幸存者的辐射演化都重塑了生态。</p>
        <ol class="ext-list">
          <li v-for="item in extinctions" :key="item.id">
            <div class="ext-head">
              <b>{{ item.name }}</b>
              <span class="ext-ma">{{ item.ma }} 百万年前</span>
            </div>
            <p class="ext-loss">{{ item.loss }} · {{ item.cause }}</p>
            <p class="ext-note">{{ item.note }}</p>
          </li>
        </ol>
        <h3>常见误区</h3>
        <ul class="facts">
          <li v-for="item in myths" :key="item.myth">
            <b>{{ item.myth }}</b> —— {{ item.fact }}
          </li>
        </ul>
      </template>

      <template v-else>
        <div class="kicker">MOLECULES TO CELLS</div>
        <h2>微观奇境</h2>
        <p>生命演化的分子基础在微观世界。原子、分子、DNA、细胞各有独立的可交互展台。</p>
        <router-link class="jump" to="/micro">进入微观奇境 →</router-link>
      </template>
    </aside>

    <footer class="dock">
      <button type="button" @click="pick(0)">最早</button>
      <button type="button" @click="pick(current.total - 1)">今天</button>
      <button type="button" @click="autoplay = !autoplay">{{ autoplay ? '暂停巡览' : '自动巡览' }}</button>
      <span class="hint">拖动旋转 · 滚轮缩放</span>
    </footer>

    <p class="disclaimer">
      年代采用主流学界口径，部分节点存在争议；模型为示意，不按真实比例。演化没有终点与等级。
    </p>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { EXTINCTIONS, MECHANISMS, MILESTONES, MYTHS } from '../life/catalog.js'
import { LifeScene } from '../life/LifeScene.js'

const route = useRoute()
const router = useRouter()

const milestones = MILESTONES
const mechanisms = MECHANISMS
const extinctions = EXTINCTIONS
const myths = MYTHS

const canvasRef = ref(null)
const view = ref('timeline')
const current = reactive({ index: 0, item: MILESTONES[0], total: MILESTONES.length })
const openMech = ref('selection')
const autoplay = ref(false)

let scene = null
let autoplayTimer = 0

function setView(next) {
  view.value = next
  const target = next === 'timeline' ? { path: '/life' } : { path: '/life', query: { view: next } }
  if (route.query.view !== (next === 'timeline' ? undefined : next)) {
    router.replace(target)
  }
}

function pick(index) {
  scene?.select(index)
}

function onToggleMech(id, event) {
  if (event.target.open) openMech.value = id
}

watch(autoplay, (on) => {
  clearInterval(autoplayTimer)
  if (!on) return
  autoplayTimer = setInterval(() => {
    const next = (current.index + 1) % milestones.length
    scene?.select(next)
  }, 2600)
})

onMounted(() => {
  const initialView = typeof route.query.view === 'string' ? route.query.view : 'timeline'
  const valid = ['timeline', 'mechanism', 'extinction']
  if (valid.includes(initialView)) view.value = initialView

  // 同一个页面内切换 ?view= 时要跟着换页签，否则从菜单点过来不会变
  watch(
    () => route.query.view,
    (next) => {
      const target = typeof next === 'string' && valid.includes(next) ? next : 'timeline'
      if (target !== view.value) view.value = target
    }
  )

  scene = new LifeScene(canvasRef.value, milestones)
  scene.onSelect = ({ index, item, total }) => {
    current.index = index
    current.item = item
    current.total = total
  }
  scene.select(0, true)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  clearInterval(autoplayTimer)
  window.removeEventListener('keydown', onKey)
  scene?.dispose()
  scene = null
})

function onKey(event) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === 'ArrowLeft') pick(current.index - 1)
  if (event.key === 'ArrowRight') pick(current.index + 1)
}
</script>

<style scoped>
.life {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #08131a;
  color: #eaf6f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.life-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.side,
.info,
.dock,
.disclaimer {
  position: absolute;
  z-index: 2;
}

.kicker {
  color: #7cf2b0;
  letter-spacing: 0.15em;
  font-size: 10.5px;
}

.side {
  top: 58px;
  left: 14px;
  width: 300px;
  max-height: calc(100% - 132px);
  overflow: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  background: rgba(5, 22, 26, 0.88);
}

.side h1 {
  margin: 5px 0 6px;
  font-size: 21px;
  letter-spacing: 0.06em;
}

.sub {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: #9fbdb6;
}

.tabs {
  display: flex;
  gap: 5px;
  margin: 12px 0 10px;
}

.tabs button {
  flex: 1;
  border: 1px solid #2f5a52;
  background: #102c29;
  color: #cfe8df;
  border-radius: 8px;
  padding: 6px 4px;
  font-size: 11.5px;
  cursor: pointer;
}

.tabs button.on {
  background: #7cf2b0;
  border-color: #7cf2b0;
  color: #06251a;
  font-weight: 600;
}

.ticks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tick {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.03);
  color: #b8d4cc;
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.tick:hover {
  background: rgba(124, 242, 176, 0.12);
}

.tick.past {
  color: #7f9c95;
}

.tick.on {
  border-color: #7cf2b0;
  background: rgba(124, 242, 176, 0.16);
  color: #eafff6;
}

.tick-icon {
  font-size: 14px;
}

.tick-label {
  font-size: 11px;
  opacity: 0.85;
  margin-left: auto;
}

.info {
  top: 58px;
  right: 14px;
  width: 330px;
  max-height: calc(100% - 132px);
  overflow: auto;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  background: rgba(5, 22, 26, 0.9);
}

.info h2 {
  margin: 5px 0 6px;
  font-size: 19px;
  line-height: 1.35;
}

.info h3 {
  margin: 14px 0 6px;
  font-size: 13px;
  color: #7cf2b0;
}

.info p,
.info li {
  font-size: 12.5px;
  line-height: 1.72;
  color: #cfe4de;
}

.era-badge {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 0 8px !important;
  border-radius: 999px;
  background: rgba(124, 242, 176, 0.16);
  color: #7cf2b0 !important;
  font-size: 11px !important;
}

.facts {
  margin: 8px 0;
  padding-left: 1.1rem;
}

.facts li {
  margin-bottom: 3px;
}

.nav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.nav-row button {
  flex: 1;
  border: 1px solid #2f5a52;
  background: #102c29;
  color: #cfe8df;
  border-radius: 8px;
  padding: 7px 6px;
  font-size: 12px;
  cursor: pointer;
}

.nav-row button:disabled {
  opacity: 0.35;
  cursor: default;
}

.pos {
  font-size: 11px;
  color: #7cf2b0;
  white-space: nowrap;
}

.mech {
  margin: 8px 0;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.mech summary {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  list-style: none;
}

.mech summary::-webkit-details-marker {
  display: none;
}

.mech-icon {
  font-size: 15px;
}

.mech-title {
  font-size: 13px;
  color: #eaf6f2;
}

.mech-en {
  margin-left: auto;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: rgba(159, 189, 182, 0.75);
}

.misread {
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(255, 180, 120, 0.12);
  color: #ffd0a8 !important;
  font-size: 11.5px !important;
}

.ext-list {
  margin: 8px 0;
  padding-left: 1.1rem;
}

.ext-list li {
  margin-bottom: 10px;
}

.ext-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ext-head b {
  font-size: 13px;
  color: #eaf6f2;
}

.ext-ma {
  font-size: 10.5px;
  color: #7cf2b0;
}

.ext-loss {
  margin: 2px 0 !important;
  font-size: 11.5px !important;
  color: #ffbe8a !important;
}

.ext-note {
  margin: 0 !important;
  font-size: 11.5px !important;
  color: #a8c4bc !important;
}

.jump {
  display: inline-block;
  margin-top: 10px;
  padding: 8px 14px;
  border-radius: 9px;
  background: #7cf2b0;
  color: #06251a;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
}

.dock {
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: min(600px, calc(100% - 28px));
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(10, 34, 32, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.11);
}

.dock button {
  border: 1px solid #2f5a52;
  background: #102c29;
  color: #cfe8df;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
}

.dock button:hover {
  background: #7cf2b0;
  color: #06251a;
  border-color: #7cf2b0;
}

.hint {
  font-size: 11px;
  color: #8fada6;
}

.disclaimer {
  left: 14px;
  right: 14px;
  bottom: 8px;
  margin: 0;
  text-align: center;
  font-size: 10.5px;
  color: rgba(159, 189, 182, 0.8);
}

@media (max-width: 980px) {
  .side {
    width: calc(100% - 28px);
    max-height: 38%;
  }

  .info {
    width: calc(100% - 28px);
    top: auto;
    bottom: 108px;
    max-height: 32%;
  }
}
</style>
