<template>
  <div class="wild">
    <canvas ref="canvasRef" class="wild-canvas"></canvas>
    <WorldMenu>
      <button type="button" class="wm-link ghost" @click="backEarth">返回地球</button>
      <button type="button" class="wm-link ghost" @click="toggleMotion">{{ reduced ? '恢复动效' : '减少动效' }}</button>
      <router-link class="wm-link ghost" to="/home">经典地球</router-link>
    </WorldMenu>

    <header class="wild-top">
      <div>
        <div class="kicker">WILDLIFE WORLD</div>
        <h1>{{ title }}</h1>
      </div>
      <p>{{ subtitle }}</p>
      <div class="stats">
        <span>{{ habitats.length }} 个生态区</span>
        <span>{{ animals.length }} 个物种</span>
        <span>示意图，非摄影</span>
      </div>
    </header>

    <nav class="wild-nav">
      <button type="button" class="nav-item" :class="{ active: view === 'earth' }" @click="backEarth">
        <span class="nav-en">EARTH</span>
        <span class="nav-zh">地球入口</span>
      </button>
      <button
        v-for="item in habitats"
        :key="item.id"
        type="button"
        class="nav-item"
        :class="{ active: view === item.id }"
        @click="openHabitat(item.id)"
      >
        <span class="nav-en">{{ item.en }}</span>
        <span class="nav-zh">{{ item.name }}</span>
      </button>
    </nav>

    <div class="wild-labels">
      <button
        v-for="lab in labels"
        :key="lab.id"
        type="button"
        class="pin"
        :class="{ selected: lab.selected }"
        :style="{ transform: `translate(${lab.x}px, ${lab.y}px)` }"
        @click.stop="onLabel(lab)"
      >
        {{ lab.name }}
      </button>
    </div>

    <aside v-if="panel" class="dossier">
      <template v-if="panel.type === 'animal'">
        <img :src="portrait(panel)" alt="" class="portrait" />
        <div class="en">{{ panel.nameEn }}</div>
        <h2>{{ panel.name }}</h2>
        <div class="latin">{{ panel.scientificName }}</div>
        <p>{{ panel.summary }}</p>
        <dl>
          <dt>分类</dt><dd>{{ categoryName(panel.category) }}</dd>
          <dt>栖息地</dt><dd>{{ panel.habitatName }} · {{ panel.sub }}</dd>
          <dt>分布</dt><dd>{{ panel.range }}</dd>
          <dt>食性</dt><dd>{{ dietName(panel.diet) }} · {{ panel.activity }}</dd>
          <dt>体型</dt><dd>{{ panel.size }}</dd>
          <dt>寿命</dt><dd>{{ panel.lifespan }}</dd>
          <dt>保护</dt><dd>{{ panel.status }}</dd>
          <dt>来源</dt><dd>{{ panel.source }}。{{ panel.fact }}</dd>
          <dt>图片</dt><dd>{{ panel.credit }}</dd>
        </dl>
        <button type="button" class="solid" @click="focusCurrent">聚焦</button>
      </template>
      <template v-else>
        <div class="en">{{ panel.en }}</div>
        <h2>{{ panel.name }}</h2>
        <p>{{ panel.summary }}</p>
        <div class="chips">
          <span v-for="sub in panel.subs" :key="sub">{{ sub }}</span>
        </div>
      </template>
    </aside>

    <section class="gallery">
      <div class="filters">
        <input v-model="keyword" type="search" placeholder="搜索中文名、英文名或学名" />
        <select v-model="category">
          <option value="">全部类别</option>
          <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <select v-model="diet">
          <option value="">全部食性</option>
          <option v-for="item in diets" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </div>
      <div class="cards">
        <button
          v-for="item in filtered"
          :key="item.id"
          type="button"
          class="card"
          @click="openAnimal(item)"
        >
          <img :src="portrait(item)" alt="" />
          <strong>{{ item.name }}</strong>
          <span>{{ item.nameEn }}</span>
          <em>{{ item.habitatName }} · {{ categoryName(item.category) }}</em>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import { CATEGORIES, DIETS, HABITATS, allAnimals } from '../wildlife/habitats.js'
import { WildlifeScene } from '../wildlife/WildlifeScene.js'

const habitats = HABITATS
const animals = allAnimals()
const categories = CATEGORIES
const diets = DIETS
const canvasRef = ref(null)
const labels = ref([])
const view = ref('earth')
const panel = ref(null)
const keyword = ref('')
const category = ref('')
const diet = ref('')
const reduced = ref(false)
const portraits = new Map()

const title = computed(() => (view.value === 'earth' ? '探索地球 · 发现生命' : panel.value?.name || '生态区域'))
const subtitle = computed(() => (
  view.value === 'earth'
    ? '从地球进入海洋、草原、雨林、极地等区域，再查看物种资料。'
    : '单击动物打开百科，双击或聚焦可以靠近。分布按真实范围区分。'
))

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return animals.filter((item) => {
    if (view.value !== 'earth' && item.habitatId !== view.value) return false
    if (category.value && item.category !== category.value) return false
    if (diet.value && item.diet !== diet.value) return false
    if (!q) return true
    return [item.name, item.nameEn, item.scientificName].join(' ').toLowerCase().includes(q)
  })
})

let scene = null

function categoryName(id) {
  return categories.find((item) => item.id === id)?.name || id
}

function dietName(id) {
  return diets.find((item) => item.id === id)?.name || id
}

function portrait(item) {
  if (portraits.has(item.id)) return portraits.get(item.id)
  const c = document.createElement('canvas')
  c.width = 240
  c.height = 150
  const ctx = c.getContext('2d')
  const grd = ctx.createLinearGradient(0, 0, 0, 150)
  grd.addColorStop(0, '#163226')
  grd.addColorStop(1, '#07140f')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 240, 150)
  ctx.fillStyle = item.color || '#d4b483'
  ctx.beginPath()
  if (item.shape === 'tall') ctx.ellipse(120, 90, 28, 48, 0, 0, Math.PI * 2)
  else if (item.shape === 'bird') ctx.ellipse(120, 78, 46, 22, -0.3, 0, Math.PI * 2)
  else if (item.shape === 'whale' || item.shape === 'shark' || item.shape === 'snake') ctx.ellipse(120, 78, 70, 24, 0, 0, Math.PI * 2)
  else ctx.ellipse(120, 82, 48, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '12px sans-serif'
  ctx.fillText('示意图', 16, 24)
  const url = c.toDataURL('image/png')
  portraits.set(item.id, url)
  return url
}

function backEarth() {
  view.value = 'earth'
  panel.value = null
  scene?.showEarth(false)
}

function openHabitat(id) {
  view.value = id
  scene?.showHabitat(id, false)
}

function openAnimal(item) {
  view.value = item.habitatId
  scene?.focusAnimal(item.id)
}

function onLabel(lab) {
  if (lab.kind === 'habitat') openHabitat(lab.id)
  else {
    const item = animals.find((animal) => animal.id === lab.id)
    if (item) openAnimal(item)
  }
}

function focusCurrent() {
  if (panel.value?.type === 'animal') scene?.focusAnimal(panel.value.id)
}

function toggleMotion() {
  reduced.value = !reduced.value
  scene?.setReduced(reduced.value)
}

onMounted(() => {
  scene = new WildlifeScene(canvasRef.value, {
    onSelect: (meta) => {
      panel.value = meta
      if (meta?.type === 'habitat') view.value = meta.id
      if (meta?.type === 'animal') view.value = meta.habitatId
      if (!meta) view.value = 'earth'
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
.wild {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #07140f;
  color: #e7f2ea;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.wild-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wild-top,
.wild-nav,
.dossier,
.gallery,
.pin {
  position: absolute;
  z-index: 2;
}

.wild-top {
  top: 56px;
  left: 196px;
  right: 340px;
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  pointer-events: none;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #d4b483;
}

.wild-top h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 560;
}

.wild-top p {
  margin: 0 0 0.2rem;
  color: rgba(231, 242, 234, 0.7);
  font-size: 13px;
}

.stats {
  margin-left: auto;
  display: flex;
  gap: 0.7rem;
  font-size: 12px;
  color: #d4b483;
}

.wild-nav {
  top: 48px;
  bottom: 168px;
  left: 0;
  width: 180px;
  overflow: auto;
  padding: 0.7rem;
  background: linear-gradient(90deg, rgba(7, 20, 15, 0.86), rgba(7, 20, 15, 0.2));
}

.nav-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  color: inherit;
  border: 0;
  border-left: 2px solid transparent;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
}

.nav-item.active {
  border-left-color: #d4b483;
  background: rgba(212, 180, 131, 0.1);
}

.nav-en {
  display: block;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #d4b483;
}

.nav-zh {
  font-size: 14px;
}

.pin {
  margin-left: 8px;
  background: rgba(7, 20, 15, 0.55);
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  font-size: 11px;
  cursor: pointer;
}

.pin.selected {
  background: rgba(212, 180, 131, 0.45);
}

.dossier {
  top: 108px;
  right: 0.8rem;
  width: min(320px, calc(100% - 1.6rem));
  max-height: calc(100% - 300px);
  overflow: auto;
  padding: 0.9rem;
  background: rgba(8, 22, 16, 0.82);
  border: 1px solid rgba(212, 180, 131, 0.28);
  border-radius: 14px;
}

.portrait {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
}

.en,
.latin {
  color: #d4b483;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.dossier h2 {
  margin: 0.15rem 0;
  font-size: 24px;
}

.dossier p {
  line-height: 1.5;
}

.dossier dl {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  gap: 0.35rem 0.5rem;
  font-size: 13px;
}

.dossier dt {
  color: rgba(231, 242, 234, 0.5);
}

.dossier dd {
  margin: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chips span {
  border: 1px solid rgba(212, 180, 131, 0.4);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 12px;
}

.solid,
.ghost {
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.solid {
  background: rgba(212, 180, 131, 0.22);
  border-color: rgba(212, 180, 131, 0.5);
}

.gallery {
  left: 180px;
  right: 0;
  bottom: 0;
  height: 168px;
  padding: 0.45rem 0.7rem 0.6rem;
  background: linear-gradient(180deg, transparent, rgba(7, 20, 15, 0.92) 28%);
}

.filters {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.filters input,
.filters select {
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
}

.cards {
  display: flex;
  gap: 0.5rem;
  overflow: auto;
}

.card {
  flex: 0 0 140px;
  text-align: left;
  background: rgba(8, 22, 16, 0.8);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.35rem;
  cursor: pointer;
}

.card img {
  width: 100%;
  height: 62px;
  object-fit: cover;
  border-radius: 6px;
}

.card strong,
.card span,
.card em {
  display: block;
}

.card span,
.card em {
  font-style: normal;
  font-size: 11px;
  color: rgba(231, 242, 234, 0.62);
}

:deep(.world-menu) {
  background: rgba(7, 20, 15, 0.72);
}

@media (max-width: 800px) {
  .wild-top,
  .gallery {
    left: 0;
    right: 0;
  }

  .wild-nav {
    display: none;
  }

  .stats,
  .wild-top p {
    display: none;
  }
}
</style>
