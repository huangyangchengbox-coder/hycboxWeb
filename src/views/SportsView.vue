<template>
  <div class="sports">
    <canvas ref="canvasRef" class="sports-canvas"></canvas>
    <WorldMenu />

    <aside class="side">
      <div class="kicker">SPORTS · 场地与物理</div>
      <h1>运动科学</h1>
      <p class="sub">七种运动的场地按同一比例并排。点一个进入详细数据。</p>

      <div class="list">
        <button
          v-for="(item, index) in sports"
          :key="item.id"
          type="button"
          class="item"
          :class="{ on: index === current.index }"
          @click="pick(index)"
        >
          <span class="item-icon">{{ item.icon }}</span>
          <span class="item-name">{{ item.name }}</span>
          <span class="item-tag">{{ item.tag }}</span>
        </button>
      </div>
    </aside>

    <aside class="info">
      <div class="kicker">{{ current.sport.tag }} · {{ current.sport.en }}</div>
      <h2>{{ current.sport.icon }} {{ current.sport.name }}</h2>

      <div class="block">
        <h3>场地</h3>
        <p>{{ current.sport.venueText }}</p>
      </div>

      <div class="block" v-if="current.sport.ball">
        <h3>球</h3>
        <table class="data">
          <tbody>
            <tr><th>速度</th><td>{{ current.sport.ball.speed }}</td></tr>
            <tr><th>旋转</th><td>{{ current.sport.ball.spin }}</td></tr>
            <tr><th>重量</th><td>{{ current.sport.ball.weight }}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="block">
        <h3>规则</h3>
        <ol class="rules">
          <li v-for="rule in current.sport.rules" :key="rule">{{ rule }}</li>
        </ol>
      </div>

      <div class="block">
        <h3>物理</h3>
        <p class="physics">{{ current.sport.physics }}</p>
      </div>

      <div class="block">
        <h3>技术要点</h3>
        <ul class="rules">
          <li v-for="skill in current.sport.skills" :key="skill">{{ skill }}</li>
        </ul>
      </div>

      <router-link v-if="current.sport.route && current.sport.id === 'tennis'" class="jump" :to="current.sport.route">
        进入网球世界（可交互挥拍） →
      </router-link>
      <p v-else class="jump-hint">该项目的 3D 场地已在上方等高亮显示，按同一比例与其他项目对比。</p>
    </aside>

    <footer class="dock">
      <button type="button" @click="pick(0)">第一个</button>
      <button type="button" :disabled="current.index === 0" @click="pick(current.index - 1)">← 上一个</button>
      <span class="pos">{{ current.index + 1 }} / {{ current.total }}</span>
      <button type="button" :disabled="current.index === current.total - 1" @click="pick(current.index + 1)">下一个 →</button>
      <button type="button" @click="overview">全览</button>
    </footer>

    <p class="disclaimer">
      场地尺寸取自各项目国际联合会公开规格；球速、转速与弹跳为教学示意值，非实测。足球场与跑道为显示需要按比例缩小。
    </p>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { SPORTS, sportById } from '../sports/catalog.js'
import { SportsScene } from '../sports/SportsScene.js'

const route = useRoute()
const router = useRouter()

const sports = SPORTS
const canvasRef = ref(null)
const current = reactive({ index: 0, sport: SPORTS[0], total: SPORTS.length })
let scene = null

function pick(index) {
  scene?.select(index)
}

function overview() {
  if (!scene) return
  scene.camGoal = null
  scene.lookGoal = null
  scene.camera.position.set(0, 62, 96)
  scene.camera.lookAt(0, 0, 0)
}

onMounted(() => {
  scene = new SportsScene(canvasRef.value, sports)
  scene.onSelect = ({ index, sport, total }) => {
    current.index = index
    current.sport = sport
    current.total = total
  }

  const initial = typeof route.query.game === 'string' ? route.query.game : ''
  const start = initial ? sports.findIndex((item) => item.id === initial) : 0
  scene.select(start >= 0 ? start : 0)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
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
.sports {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0b1a14;
  color: #eaf6f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.sports-canvas {
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
  color: #d8f34a;
  letter-spacing: 0.15em;
  font-size: 10.5px;
}

.side {
  top: 58px;
  left: 14px;
  width: 224px;
  max-height: calc(100% - 132px);
  overflow: auto;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  background: rgba(6, 24, 18, 0.9);
}

.side h1 {
  margin: 5px 0 6px;
  font-size: 20px;
  letter-spacing: 0.06em;
}

.sub {
  margin: 0 0 10px;
  font-size: 11.5px;
  line-height: 1.6;
  color: #a3c0b2;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.item {
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.03);
  color: #c5ddd2;
  border-radius: 8px;
  padding: 6px 8px;
  font-size: 12.5px;
  cursor: pointer;
  text-align: left;
}

.item:hover {
  background: rgba(216, 243, 74, 0.12);
}

.item.on {
  border-color: #d8f34a;
  background: rgba(216, 243, 74, 0.16);
  color: #f2ffe0;
}

.item-icon {
  font-size: 14px;
}

.item-tag {
  margin-left: auto;
  font-size: 10px;
  color: rgba(163, 192, 178, 0.8);
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
  background: rgba(6, 24, 18, 0.92);
}

.info h2 {
  margin: 5px 0 10px;
  font-size: 19px;
}

.info h3 {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: #d8f34a;
}

.block {
  margin-bottom: 12px;
}

.info p {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.72;
  color: #cde4d9;
}

.physics {
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(216, 243, 74, 0.09);
  color: #e2f7cf !important;
}

.data {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}

.data th {
  width: 3.2em;
  padding: 3px 4px 3px 0;
  text-align: left;
  font-weight: 500;
  color: #93b3a5;
  vertical-align: top;
}

.data td {
  padding: 3px 0;
  color: #cde4d9;
}

.rules {
  margin: 0;
  padding-left: 1.1rem;
}

.rules li {
  font-size: 12px;
  line-height: 1.7;
  color: #cde4d9;
  margin-bottom: 2px;
}

.jump {
  display: inline-block;
  margin-top: 4px;
  padding: 8px 14px;
  border-radius: 9px;
  background: #d8f34a;
  color: #10241b;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
}

.jump-hint {
  margin: 4px 0 0 !important;
  font-size: 11.5px !important;
  color: #8fada1 !important;
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
  width: min(620px, calc(100% - 28px));
  padding: 9px 12px;
  border-radius: 14px;
  background: rgba(12, 38, 30, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.11);
}

.dock button {
  border: 1px solid #3d5f4e;
  background: #14302a;
  color: #cfe8df;
  border-radius: 8px;
  padding: 6px 11px;
  font-size: 12px;
  cursor: pointer;
}

.dock button:hover:not(:disabled) {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

.dock button:disabled {
  opacity: 0.35;
  cursor: default;
}

.pos {
  font-size: 11px;
  color: #d8f34a;
  white-space: nowrap;
}

.disclaimer {
  left: 14px;
  right: 14px;
  bottom: 8px;
  margin: 0;
  text-align: center;
  font-size: 10.5px;
  color: rgba(163, 192, 178, 0.8);
}

@media (max-width: 980px) {
  .side {
    width: calc(100% - 28px);
    max-height: 34%;
  }

  .info {
    width: calc(100% - 28px);
    top: auto;
    bottom: 108px;
    max-height: 30%;
  }
}
</style>
