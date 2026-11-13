<template>
  <div class="games" :class="{ playing: mode === 'play' }">
    <WorldMenu />

    <div class="stage">
      <iframe
        v-if="mode === 'play'"
        :key="'play-' + current.id"
        class="frame"
        :src="frameSrc"
        :title="current.name"
        allow="autoplay; fullscreen; gamepad; pointer-lock; accelerometer; gyroscope"
        allowfullscreen
      />
      <div v-else class="shelf">
        <header class="shelf-head">
          <div class="kicker">GAMES</div>
          <h1>游戏厅</h1>
          <p class="sub">{{ games.length }} 个程序化生成的 3D 小游戏，以及站内 {{ worlds.length }} 个知识展馆。</p>
          <div class="tabs">
            <button type="button" :class="{ on: tab === 'games' }" @click="tab = 'games'">小游戏 · {{ games.length }}</button>
            <button type="button" :class="{ on: tab === 'worlds' }" @click="tab = 'worlds'">知识展馆 · {{ worlds.length }}</button>
          </div>
        </header>

        <template v-if="tab === 'games'">
          <div class="filters">
            <button
              v-for="item in categories"
              :key="item.id"
              type="button"
              class="chip"
              :class="{ on: cat === item.id }"
              @click="cat = item.id"
            >{{ item.name }} · {{ countOf(item.id) }}</button>
          </div>

          <ul class="cards">
            <li v-for="item in visibleGames" :key="item.id" class="card">
              <span class="icon">{{ item.icon }}</span>
              <div class="card-body">
                <div class="card-top">
                  <h2>{{ item.name }}</h2>
                </div>
                <div class="en">{{ item.en }}</div>
                <p>{{ item.desc }}</p>
                <p class="keys">{{ item.keys.join(' · ') }}</p>
              </div>
              <div class="card-foot">
                <span class="tag">{{ item.tag }}</span>
                <button type="button" class="play" @click="open(item.id)">开始</button>
              </div>
            </li>
          </ul>
        </template>

        <ul v-else class="cards world-cards">
          <li v-for="item in worlds" :key="item.id" class="card world">
            <span class="icon">{{ item.icon }}</span>
            <div class="card-body">
              <div class="card-top">
                <h2>{{ item.name }}</h2>
              </div>
              <div class="en">{{ item.en }}</div>
              <p>{{ item.desc }}</p>
            </div>
            <router-link class="play" :to="item.route">进入</router-link>
          </li>
        </ul>
      </div>
    </div>

    <footer v-if="mode === 'play'" class="dock">
      <button type="button" @click="back">← 返回游戏厅</button>
      <span class="now">{{ current.icon }} {{ current.name }}</span>
      <span class="keys">{{ current.keys.join(' · ') }}</span>
      <button type="button" @click="reload">重新加载</button>
      <button type="button" @click="fullscreen">全屏</button>
    </footer>

    <p v-if="mode === 'shelf'" class="disclaimer">
      小游戏源码分别来自 claude-opus-5-5-demo、fable52 系列与本地实验目录，此处仅作集成展示。《穿越火线》《QQ 飞车》为同人致敬作品，与原厂无关。
    </p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WorldMenu from '../components/WorldMenu.vue'
import { CATEGORIES, GAMES, WORLDS, gameById } from '../games/catalog.js'

const route = useRoute()
const router = useRouter()

const games = GAMES
const worlds = WORLDS
const categories = CATEGORIES
const tab = ref('games')
const cat = ref('all')
const mode = ref('shelf')
const current = ref(GAMES[0])
const nonce = ref(0)

const base = import.meta.env.BASE_URL

const visibleGames = computed(() => (cat.value === 'all' ? games : games.filter((item) => item.cat === cat.value)))
const frameSrc = computed(() => `${base}${current.value.file}${nonce.value ? `?r=${nonce.value}` : ''}`)

function countOf(id) {
  return id === 'all' ? games.length : games.filter((item) => item.cat === id).length
}

function open(id) {
  current.value = gameById(id)
  mode.value = 'play'
  nonce.value += 1
  if (route.query.play !== id) {
    router.replace({ path: '/games', query: { play: id } })
  }
}

function back() {
  mode.value = 'shelf'
  if (route.query.play) router.replace({ path: '/games' })
}

function reload() {
  nonce.value += 1
}

function fullscreen() {
  const el = document.querySelector('.games .frame')
  if (el?.requestFullscreen) el.requestFullscreen()
  else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen()
}

function onKey(event) {
  if (event.key === 'Escape' && mode.value === 'play' && !document.fullscreenElement) {
    back()
  }
}

onMounted(() => {
  const id = typeof route.query.play === 'string' ? route.query.play : ''
  if (id && GAMES.some((item) => item.id === id)) {
    current.value = gameById(id)
    mode.value = 'play'
  }
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.games {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #06100f;
  color: #eff9f2;
  font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.stage {
  flex: 1;
  min-height: 0;
  margin-top: 48px;
  overflow: auto;
}

.games.playing .stage {
  padding-bottom: 54px;
}

.frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #05070c;
}

.shelf {
  padding: 26px 20px 90px;
}

.shelf-head {
  max-width: 1180px;
  margin: 0 auto 12px;
}

.kicker {
  color: #d8f34a;
  letter-spacing: 0.16em;
  font-size: 11px;
}

.shelf-head h1 {
  margin: 6px 0 8px;
  font-size: 26px;
  letter-spacing: 0.08em;
}

.sub {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: #a9c4b6;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.tabs button {
  border: 1px solid #46685a;
  background: #18352d;
  color: #fff;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 12.5px;
  cursor: pointer;
}

.tabs button.on {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
  font-weight: 600;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 1180px;
  margin: 0 auto 14px;
}

.chip {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.04);
  color: #cfe4da;
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 11.5px;
  cursor: pointer;
}

.chip.on {
  border-color: #d8f34a;
  background: rgba(216, 243, 74, 0.18);
  color: #d8f34a;
}

.cards {
  list-style: none;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(255px, 1fr));
  gap: 12px;
  max-width: 1180px;
  margin: 0 auto;
  padding: 0;
}

.world-cards {
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
}

.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(10, 30, 27, 0.9);
  transition: border-color 0.15s, transform 0.15s;
}

.card:hover {
  border-color: rgba(216, 243, 74, 0.45);
  transform: translateY(-1px);
}

.icon {
  font-size: 22px;
  line-height: 1;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card h2 {
  margin: 0;
  font-size: 15px;
  line-height: 1.35;
}

.tag {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  background: rgba(216, 243, 74, 0.16);
  color: #d8f34a;
}

.en {
  font-size: 9.5px;
  letter-spacing: 0.13em;
  color: rgba(169, 196, 182, 0.75);
}

.card p {
  margin: 0;
  font-size: 12px;
  line-height: 1.65;
  color: #cfe4da;
}

.keys {
  font-size: 11px !important;
  color: rgba(169, 196, 182, 0.85) !important;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}

.play {
  display: block;
  text-align: center;
  text-decoration: none;
  border: 1px solid #d8f34a;
  background: #d8f34a;
  color: #10241b;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.play:hover {
  background: #e8ff6a;
}

.card.world .play {
  margin-top: auto;
}

.dock {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  z-index: 5;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: min(880px, calc(100% - 24px));
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(8, 26, 23, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.dock button {
  border: 1px solid #46685a;
  background: #18352d;
  color: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  cursor: pointer;
}

.dock button:hover {
  background: #d8f34a;
  color: #10241b;
  border-color: #d8f34a;
}

.now {
  font-size: 12px;
  color: #d8f34a;
}

.keys {
  font-size: 11px;
  color: #a9c4b6;
}

.disclaimer {
  margin: 0;
  padding: 10px 16px;
  text-align: center;
  font-size: 11px;
  color: rgba(169, 196, 182, 0.85);
}

@media (max-width: 720px) {
  .shelf {
    padding: 18px 14px 80px;
  }

  .dock .keys {
    display: none;
  }
}
</style>
