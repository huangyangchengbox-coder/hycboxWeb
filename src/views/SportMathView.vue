<template>
  <div class="smath">
    <canvas ref="canvasRef" class="smath-canvas"></canvas>
    <WorldMenu />

    <header class="smath-top">
      <div>
        <div class="smath-kicker">SPORTS × MATH</div>
        <div class="smath-title">运动数学</div>
      </div>
      <p class="smath-hint">{{ activeTheme.hint }}</p>
    </header>

    <nav class="smath-nav">
      <button
        v-for="theme in themes"
        :key="theme.id"
        type="button"
        class="nav-item"
        :class="{ active: theme.id === themeId }"
        @click="changeTheme(theme.id)"
      >
        <span class="nav-icon">{{ theme.icon }}</span>
        <span class="nav-text">
          <span class="nav-en">{{ theme.en }}</span>
          <span class="nav-zh">{{ theme.name }}</span>
        </span>
      </button>
    </nav>

    <aside class="panel">
      <div class="panel-kicker">{{ activeTheme.icon }} {{ activeTheme.en }}</div>
      <h2>{{ activeTheme.name }}</h2>

      <!-- 公式卡 -->
      <div class="formula-card" v-for="(f, i) in activeTheme.formulas" :key="themeId + i">
        <div class="formula-body" v-html="f.html"></div>
        <div class="formula-caption">{{ f.caption }}</div>
      </div>

      <!-- 投篮参数 -->
      <template v-if="themeId === 'shot'">
        <p class="lead">{{ activeTheme.text }}</p>
        <label class="slider">
          <span>出手速度 <b>{{ shotParams.v0.toFixed(1) }}</b> m/s</span>
          <input type="range" min="4" max="12" step="0.1" v-model.number="shotParams.v0" />
        </label>
        <label class="slider">
          <span>出手角度 <b>{{ shotParams.angle }}</b>°</span>
          <input type="range" min="30" max="70" step="1" v-model.number="shotParams.angle" />
        </label>
        <label class="slider">
          <span>出手高度 <b>{{ shotParams.h0.toFixed(1) }}</b> m</span>
          <input type="range" min="1.4" max="2.6" step="0.05" v-model.number="shotParams.h0" />
        </label>
        <div v-if="shotResult.reachable" class="verdict" :class="shotResult.hit ? 'good' : 'bad'">
          {{ shotResult.hit
            ? '空心命中！'
            : (shotResult.missBy > 0 ? '过头 ' : '差远了 ') + Math.abs(shotResult.missBy).toFixed(2) + ' m' }}
        </div>
        <div v-else class="verdict bad">这个速度连筐的高度都够不到</div>
        <dl>
          <dt>峰值高度</dt><dd>{{ shotResult.maxH?.toFixed(2) }} m</dd>
          <dt>飞行时间</dt><dd>{{ shotResult.flight?.toFixed(2) }} s</dd>
          <dt>最省力出手角</dt><dd>{{ windowBest ? `${windowBest.angle}°（${windowBest.lo.toFixed(1)} m/s 起）` : '—' }}</dd>
        </dl>
        <button type="button" class="solid" @click="playShot">出手（空格）</button>
      </template>

      <!-- 任意球参数 -->
      <template v-else-if="themeId === 'curve'">
        <p class="lead">{{ activeTheme.text }}</p>
        <label class="slider">
          <span>球速 <b>{{ curveParams.v0 }}</b> m/s（约 {{ (curveParams.v0 * 3.6).toFixed(0) }} km/h）</span>
          <input type="range" min="16" max="34" step="0.5" v-model.number="curveParams.v0" />
        </label>
        <label class="slider">
          <span>侧旋转速 <b>{{ curveParams.spin.toFixed(1) }}</b> 转/秒</span>
          <input type="range" min="0" max="12" step="0.5" v-model.number="curveParams.spin" />
        </label>
        <label class="slider">
          <span>起脚仰角 <b>{{ curveParams.rise }}°</b></span>
          <input type="range" min="4" max="26" step="1" v-model.number="curveParams.rise" />
        </label>
        <div class="verdict" :class="curveResult.goal ? 'good' : 'bad'">
          {{ curveResult.goal
            ? (Math.abs(curveResult.endZ) > 0.6 ? '绕过人墙，拐进门网！' : '越顶吊射进门（几乎没拐）')
            : curveResult.wallHit ? '打在人墙上：过墙时高度不够、侧偏也不够'
            : !curveResult.reachedWall ? '球没飞到人墙就落地了（提高球速或仰角）'
            : curveResult.cleared ? '绕过了人墙，但没进（偏 ' + Math.abs(curveResult.endZ).toFixed(1) + ' m）'
            : '被人墙拦下' }}
        </div>
        <dl>
          <dt>落点侧偏</dt><dd>{{ curveResult.endZ.toFixed(2) }} m</dd>
          <dt>进门参考转速</dt><dd>{{ minSpin === null ? '当前速度进不了' : `约 ${minSpin.toFixed(1)} 转/秒起` }}</dd>
        </dl>
        <button type="button" class="solid" @click="playCurve">罚这脚（空格）</button>
      </template>

      <!-- 短跑 -->
      <template v-else-if="themeId === 'sprint'">
        <p class="lead">{{ activeTheme.text }}</p>
        <div class="verdict" :class="sprintDone ? 'good' : ''">
          {{ sprintState.t <= 0 ? '按发令枪开始（空格）' : sprintDone ? `冲线！${profile.totalTime.toFixed(2)} s（含反应 0.146 s）` : `${sprintState.d.toFixed(1)} m 处，瞬时 ${sprintState.v.toFixed(1)} m/s` }}
        </div>
        <dl>
          <dt>总成绩</dt><dd>{{ profile.totalTime.toFixed(2) }} s（示意口径）</dd>
          <dt>平均速度</dt><dd>{{ (100 / profile.totalTime).toFixed(2) }} m/s</dd>
          <dt>峰值速度</dt><dd>{{ Math.max(...profile.marks.map(m => m.v)).toFixed(1) }} m/s @ 60–80 m</dd>
        </dl>
        <button type="button" class="solid" @click="playSprint">{{ sprintPlaying ? '重新发令' : '发令枪' }}</button>
      </template>

      <!-- 心率 -->
      <template v-else>
        <p class="lead">{{ activeTheme.text }}</p>
        <label class="slider">
          <span>年龄 <b>{{ heartAge }}</b> 岁 → HR<sub>max</sub> ≈ {{ hrMaxVal }}</span>
          <input type="range" min="14" max="75" step="1" v-model.number="heartAge" />
        </label>
        <label class="slider">
          <span>静息心率 <b>{{ rhr }}</b> bpm</span>
          <input type="range" min="40" max="90" step="1" v-model.number="rhr" />
        </label>
        <ul class="zones">
          <li v-for="(z, i) in zones" :key="z.id">
            <span class="zone-dot" :style="{ background: z.color }"></span>
            <b>{{ z.name }}：{{ zoneTargets[i][0] }}–{{ zoneTargets[i][1] }} bpm</b>
            <span class="zone-desc">{{ z.desc }}</span>
          </li>
        </ul>
      </template>

      <!-- 2D 平面图 -->
      <div class="chart-block">
        <div class="chart-title">平面模拟</div>
        <canvas ref="chartRef" class="chart-canvas"></canvas>
        <div class="chart-caption" v-if="themeId === 'shot'">同一速度下 30°–70° 的轨迹族；顶行绿点 = 当前速度能命中的角度</div>
        <div class="chart-caption" v-else-if="themeId === 'curve'">俯视图：不同转速的侧偏曲线，终点落在门框线内才算进球</div>
        <div class="chart-caption" v-else-if="themeId === 'sprint'">v–t 曲线：阶梯是分段平均速度；虚线是全程平均速度</div>
        <div class="chart-caption" v-else>Karvonen 公式下五个区间的目标心率带（bpm）</div>
      </div>

      <p class="note">{{ activeTheme.note }}</p>
    </aside>

    <footer class="dock">
      <template v-if="themeId === 'sprint'">
        <button type="button" @click="playSprint">{{ sprintPlaying ? '重新发令' : '发令枪' }}</button>
        <button type="button" @click="stopSprint">暂停</button>
      </template>
      <template v-else-if="themeId === 'shot'">
        <button type="button" @click="playShot">出手</button>
        <button type="button" @click="setBestWindow">跳到最宽窗口</button>
      </template>
      <template v-else-if="themeId === 'curve'">
        <button type="button" @click="playCurve">罚球</button>
        <button type="button" @click="flatShot">对比：完全不转的球</button>
      </template>
      <span class="hint-text">拖动旋转 · 滚轮缩放 · 空格播放</span>
    </footer>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { HEART_ZONES, THEMES } from '../sportmath/formulas.js'
import { curveTrajectory, judgeShot, minSpinForGoal, hrMax, shotWindow, targetHR } from '../sportmath/physics.js'
import { sprintProfile } from '../sportmath/formulas.js'
import { MathScene } from '../sportmath/MathScene.js'
import { drawCurveTop, drawHeartZones, drawShotFamily, drawSprintVT } from '../sportmath/charts.js'

const route = useRoute()
const router = useRouter()
const themes = THEMES
const zones = HEART_ZONES
const canvasRef = ref(null)
const chartRef = ref(null)
const themeId = ref('shot')
const shotParams = reactive({ v0: 7.3, angle: 50, h0: 2.0 })
const curveParams = reactive({ v0: 28, spin: 6, rise: 15 })
const shotResult = ref({ reachable: false })
const curveResult = reactive({ cleared: false, wallHit: false, goal: false, endZ: 0 })
const heartAge = ref(30)
const rhr = ref(60)
const sprintState = reactive({ t: 0, d: 0, v: 0 })
const sprintDone = ref(false)
const sprintPlaying = ref(false)
let scene = null
let urlSync = false

const activeTheme = computed(() => themes.find((t) => t.id === themeId.value) || themes[0])
const profile = computed(() => sprintProfile())
const hrMaxVal = computed(() => hrMax(heartAge.value))
const zoneTargets = computed(() =>
  zones.map((z) => [targetHR(hrMaxVal.value, rhr.value, z.lo), targetHR(hrMaxVal.value, rhr.value, z.hi)])
)
const windowBest = computed(() => shotWindowBest.value)
const shotWindowBest = ref(null)
const minSpin = ref(null)

function redrawChart() {
  const canvas = chartRef.value
  if (!canvas) return
  if (themeId.value === 'shot') {
    const win = shotWindow(shotParams.h0, 4.225)
    shotWindowBest.value = win.best
    drawShotFamily(canvas, { ...shotParams, windowRows: win.rows, best: win.best })
  } else if (themeId.value === 'curve') {
    const family = []
    for (const spin of [0, Math.round(curveParams.spin / 2), curveParams.spin]) {
      family.push({ spin, ...curveTrajectory(curveParams.v0, spin, curveParams.rise) })
    }
    drawCurveTop(canvas, family, 9.15, 25, 7.32)
  } else if (themeId.value === 'sprint') {
    drawSprintVT(canvas, profile.value, sprintState.t)
  } else {
    drawHeartZones(canvas, hrMaxVal.value, rhr.value, zones, zoneTargets.value)
  }
}

function changeTheme(id) {
  themeId.value = id
  scene?.setTheme(id)
  if (id === 'curve') {
    minSpin.value = minSpinForGoal(curveParams.v0, curveParams.rise)
  }
  nextTick(redrawChart)
}

function playShot() {
  scene?.playShot()
}

function playCurve() {
  scene?.playCurve()
}

function playSprint() {
  sprintDone.value = false
  sprintState.t = 0
  sprintState.d = 0
  sprintState.v = 0
  sprintPlaying.value = true
  scene?.playSprint()
}

function stopSprint() {
  sprintPlaying.value = false
  scene?.stopSprint()
}

function setBestWindow() {
  const win = shotWindow(shotParams.h0, 4.225)
  if (!win.best) return
  shotParams.angle = win.best.angle
  shotParams.v0 = Math.round(((win.best.lo + win.best.hi) / 2) * 10) / 10
}

function flatShot() {
  curveParams.spin = 0
  nextTick(() => {
    playCurve()
    nextTick(redrawChart)
  })
}

function onKey(event) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  if (event.key === ' ') {
    event.preventDefault()
    if (themeId.value === 'shot') playShot()
    else if (themeId.value === 'curve') playCurve()
    else if (themeId.value === 'sprint') playSprint()
  }
}

watch(shotParams, () => {
  scene?.setShot({ ...shotParams })
  const j = judgeShot(shotParams.v0, shotParams.angle, shotParams.h0, 4.225)
  shotResult.value = { reachable: !!j.traj, hit: j.hit, missBy: j.missBy, ...(j.traj ? { maxH: j.traj.maxH, flight: j.traj.tHit } : {}) }
  redrawChart()
}, { deep: true })

watch(curveParams, () => {
  scene?.setCurveShot({ ...curveParams })
  minSpin.value = minSpinForGoal(curveParams.v0, curveParams.rise)
  redrawChart()
}, { deep: true })

watch([heartAge, rhr], redrawChart)

watch(sprintState, () => {
  if (themeId.value === 'sprint') redrawChart()
})

watch(themeId, (id) => {
  if (!urlSync) return
  router.replace({ query: { ...route.query, theme: id } })
})

onMounted(() => {
  scene = new MathScene(canvasRef.value, {
    onShot: (data) => {
      shotResult.value = data
    },
    onCurve: (data) => {
      Object.assign(curveResult, data)
    },
    onSprint: (data) => {
      sprintState.t = data.t
      sprintState.d = data.d
      sprintState.v = data.v
      if (data.done) {
        sprintDone.value = true
        sprintPlaying.value = false
        redrawChart()
      }
    },
    getBpm: () => heartZoneBpm()
  })
  scene.init()
  // 首屏把 View 参数同步给 3D 场景（避免两侧数据源不一致）
  scene.setShot({ ...shotParams })
  scene.setCurveShot({ ...curveParams })
  const q = String(route.query.theme || '')
  if (themes.some((t) => t.id === q)) {
    themeId.value = q
    scene.setTheme(q)
  }
  // 初始化读数
  const j = judgeShot(shotParams.v0, shotParams.angle, shotParams.h0, 4.225)
  shotResult.value = { reachable: !!j.traj, hit: j.hit, missBy: j.missBy, ...(j.traj ? { maxH: j.traj.maxH, flight: j.traj.tHit } : {}) }
  minSpin.value = minSpinForGoal(curveParams.v0, curveParams.rise)
  nextTick(redrawChart)
  urlSync = true
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})

function heartZoneBpm() {
  // 给 3D 心脏一个合理的展示节律：Z3 中值
  return Math.round(hrMaxVal.value * 0.75)
}

function onResize() {
  redrawChart()
}

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.smath {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #060d0b;
  color: #eaf6f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.smath-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.smath-top,
.smath-nav,
.panel,
.dock {
  position: absolute;
  z-index: 2;
}

.smath-top {
  top: 48px;
  left: 208px;
  right: 380px;
  display: flex;
  align-items: flex-end;
  gap: 1.2rem;
  padding: 1rem 1.2rem 0;
  pointer-events: none;
}

.smath-kicker {
  font-size: 11px;
  letter-spacing: 0.18em;
  color: #d8f34a;
}

.smath-title {
  font-size: 22px;
  letter-spacing: 0.18em;
}

.smath-hint {
  color: rgba(234, 246, 242, 0.62);
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 0.2rem;
}

.smath-nav {
  top: 48px;
  left: 0;
  bottom: 0;
  width: 192px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 1rem 0.7rem;
  background: linear-gradient(90deg, rgba(6, 16, 12, 0.82), rgba(6, 16, 12, 0.12));
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-align: left;
  background: transparent;
  color: inherit;
  border: 0;
  border-left: 2px solid transparent;
  padding: 0.5rem 0.6rem;
  cursor: pointer;
}

.nav-item.active {
  border-left-color: #d8f34a;
  background: rgba(216, 243, 74, 0.09);
}

.nav-icon {
  font-size: 18px;
}

.nav-en {
  display: block;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #9fb8ac;
}

.nav-zh {
  display: block;
  font-size: 13px;
  margin-top: 1px;
}

.panel {
  top: 4.6rem;
  right: 0.8rem;
  width: min(348px, calc(100% - 2rem));
  max-height: calc(100% - 9.5rem);
  overflow: auto;
  padding: 0.9rem 1rem 1rem;
  background: rgba(8, 18, 14, 0.86);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}

.panel-kicker {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: #d8f34a;
}

.panel h2 {
  margin: 0.15rem 0 0.5rem;
  font-size: 22px;
  font-weight: 560;
}

.lead {
  font-size: 12.5px;
  line-height: 1.65;
  color: #cde4d9;
  margin: 0.4rem 0 0.6rem;
}

.formula-card {
  margin: 0.4rem 0;
  padding: 0.55rem 0.7rem;
  background: rgba(216, 243, 74, 0.06);
  border: 1px solid rgba(216, 243, 74, 0.18);
  border-radius: 10px;
}

.formula-body {
  font-family: "Cambria Math", "Times New Roman", serif;
  font-size: 14.5px;
  color: #eefad8;
  line-height: 1.55;
}

.formula-body :deep(sub) {
  font-size: 10px;
}

.formula-body :deep(sup) {
  font-size: 10px;
}

.formula-caption {
  margin-top: 0.25rem;
  font-size: 11px;
  color: rgba(205, 228, 217, 0.66);
}

.slider {
  display: block;
  margin: 0.55rem 0;
}

.slider span {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #cde4d9;
}

.slider b {
  color: #d8f34a;
}

.slider input {
  width: 100%;
  margin-top: 4px;
}

.verdict {
  margin: 0.5rem 0;
  padding: 0.45rem 0.7rem;
  border-radius: 9px;
  font-size: 12.5px;
  line-height: 1.5;
  background: rgba(125, 255, 232, 0.1);
  color: #b9f4e6;
  border: 1px solid rgba(125, 255, 232, 0.25);
}

.verdict.good {
  background: rgba(124, 242, 176, 0.16);
  border-color: rgba(124, 242, 176, 0.5);
  color: #d3ffe6;
}

.verdict.bad {
  background: rgba(255, 93, 134, 0.1);
  border-color: rgba(255, 93, 134, 0.35);
  color: #ffc4d4;
}

dl {
  display: grid;
  grid-template-columns: 5.4rem 1fr;
  gap: 0.28rem 0.5rem;
  margin: 0.6rem 0;
  font-size: 12px;
}

dt {
  color: rgba(234, 246, 242, 0.5);
}

dd {
  margin: 0;
}

.solid {
  border-radius: 999px;
  padding: 0.4rem 1rem;
  font-size: 12.5px;
  cursor: pointer;
  color: #10241b;
  background: #d8f34a;
  border: 1px solid #d8f34a;
  font-weight: 600;
}

.chart-block {
  margin: 0.7rem 0 0.4rem;
  padding: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  background: rgba(4, 10, 8, 0.7);
}

.chart-title {
  font-size: 10.5px;
  letter-spacing: 0.15em;
  color: #9fb8ac;
  margin-bottom: 4px;
}

.chart-canvas {
  width: 100%;
  height: 158px;
  display: block;
}

.chart-caption {
  margin-top: 4px;
  font-size: 10.5px;
  color: rgba(205, 228, 217, 0.55);
  line-height: 1.5;
}

.zones {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}

.zones li {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 0 0.45rem;
  font-size: 11.5px;
  line-height: 1.55;
  margin-bottom: 0.3rem;
}

.zone-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  margin-top: 5px;
}

.zones b {
  color: #eaf6f2;
  font-weight: 600;
}

.zone-desc {
  display: block;
  color: rgba(205, 228, 217, 0.6);
  grid-column: 2;
}

.note {
  color: rgba(205, 228, 217, 0.5);
  font-size: 11px;
  line-height: 1.55;
  margin: 0.4rem 0 0;
}

.dock {
  left: 208px;
  right: 380px;
  bottom: 1.4rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(10, 26, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
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

.dock button:hover {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

.hint-text {
  font-size: 11px;
  color: rgba(205, 228, 217, 0.5);
}

@media (max-width: 900px) {
  .smath-nav {
    top: auto;
    bottom: 4.4rem;
    width: 100%;
    height: auto;
    flex-direction: row;
    overflow: auto;
    border-right: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .nav-item {
    flex-direction: column;
    align-items: center;
    border-left: 0;
    border-bottom: 2px solid transparent;
  }

  .nav-item.active {
    border-bottom-color: #d8f34a;
  }

  .smath-top,
  .dock {
    left: 0.6rem;
    right: 0.6rem;
  }

  .smath-hint {
    display: none;
  }

  .panel {
    top: auto;
    bottom: 8rem;
    max-height: 36%;
  }
}
</style>
