<script setup>
import { computed, ref } from 'vue'
import { MATCHES, MATCH_FILTERS, biliUrl, matchKindLabel } from '../tennis/matches.js'

const filter = ref('all')
const visible = computed(() =>
  filter.value === 'all'
    ? MATCHES
    : MATCHES.filter((item) => item.event.includes(filter.value))
)

const surfaceName = { grass: '草地', clay: '红土', hard: '硬地' }
</script>

<template>
  <section class="match-archive">
    <header class="archive-head">
      <div>
        <div class="kicker">CLASSIC MATCHES · 录像馆</div>
        <h2>经典战役</h2>
        <p class="archive-sub">
          十场三巨头时代的标志性对决。点「观看比赛」直达清单里的 YouTube 地址；
          搜索页与频道链接也按原清单保留。国内网络打不开时，用「B站搜索」找同一场。
        </p>
      </div>
      <div class="archive-count"><b>{{ visible.length }}</b><span>场对决</span></div>
    </header>

    <div class="archive-filters">
      <button
        v-for="item in MATCH_FILTERS"
        :key="item.id"
        type="button"
        :class="{ on: filter === item.id }"
        @click="filter = item.id"
      >{{ item.name }}</button>
    </div>

    <div class="match-grid">
      <article v-for="m in visible" :key="m.id" class="match-card">
        <div class="card-top">
          <span class="year">{{ m.year }}</span>
          <span class="surface" :class="m.surface">{{ surfaceName[m.surface] }}</span>
        </div>
        <div class="event">{{ m.event }}</div>
        <h3>{{ m.players }}</h3>
        <p class="note">{{ m.note }}</p>
        <div class="card-links">
          <a :href="m.url" target="_blank" rel="noopener noreferrer" class="go">
            {{ m.kind === 'watch' ? '▶ ' : m.kind === 'channel' ? '📺 ' : '🔍 ' }}{{ matchKindLabel(m.kind) }}
          </a>
          <a :href="biliUrl(m)" target="_blank" rel="noopener noreferrer" class="alt">B站搜索</a>
        </div>
      </article>
    </div>

    <p class="archive-foot">
      链接来自外部站点，内容由各平台提供；部分条目为搜索结果页而非直链，需自行选择版本。
    </p>
  </section>
</template>

<style scoped>
.match-archive {
  position: absolute;
  left: 232px;
  top: 58px;
  bottom: 92px;
  right: 14px;
  z-index: 3;
  overflow: auto;
  padding: 16px 20px 22px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  background: rgba(5, 20, 24, 0.94);
  backdrop-filter: blur(8px);
  color: #e6f4ec;
  font-size: 13px;
}

.archive-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.kicker {
  color: #d8f34a;
  letter-spacing: 0.16em;
  font-size: 11px;
}

.archive-head h2 {
  margin: 6px 0 4px;
  font-size: 24px;
  letter-spacing: 0.06em;
}

.archive-sub {
  max-width: 720px;
  margin: 0;
  color: #a9c4b6;
  font-size: 12px;
  line-height: 1.65;
}

.archive-count {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 0 0 auto;
  color: #a9c4b6;
  font-size: 11px;
}

.archive-count b {
  color: #d8f34a;
  font-size: 30px;
  line-height: 1;
}

.archive-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 14px 0 12px;
}

.archive-filters button {
  padding: 5px 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  color: #a9c4b6;
  font-size: 12px;
  transition: all 0.18s;
}

.archive-filters button:hover {
  border-color: rgba(216, 243, 74, 0.5);
  color: #eafff2;
}

.archive-filters button.on {
  border-color: #d8f34a;
  background: rgba(216, 243, 74, 0.16);
  color: #d8f34a;
}

.match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 10px;
}

.match-card {
  display: flex;
  flex-direction: column;
  min-height: 168px;
  padding: 13px 14px 11px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-left: 3px solid rgba(216, 243, 74, 0.65);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015));
  transition: transform 0.18s, border-color 0.18s;
}

.match-card:hover {
  transform: translateY(-2px);
  border-color: rgba(216, 243, 74, 0.4);
  border-left-color: #d8f34a;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.year {
  color: #d8f34a;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1;
}

.surface {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  letter-spacing: 0.08em;
}

.surface.grass { background: rgba(132, 204, 96, 0.18); color: #a9e08a; }
.surface.clay { background: rgba(235, 146, 92, 0.2); color: #f4b184; }
.surface.hard { background: rgba(96, 165, 250, 0.18); color: #93c5fd; }

.event {
  margin-top: 8px;
  color: #7fd8c6;
  font-size: 11px;
  letter-spacing: 0.1em;
}

.match-card h3 {
  margin: 3px 0 6px;
  font-size: 15px;
  line-height: 1.35;
}

.note {
  flex: 1;
  margin: 0 0 10px;
  color: #a9c4b6;
  font-size: 11.5px;
  line-height: 1.55;
}

.card-links {
  display: flex;
  gap: 7px;
}

.card-links a {
  flex: 1;
  padding: 6px 8px;
  border-radius: 8px;
  text-align: center;
  font-size: 11.5px;
  text-decoration: none;
  transition: background 0.18s;
}

.card-links .go {
  border: 1px solid rgba(216, 243, 74, 0.45);
  background: rgba(216, 243, 74, 0.12);
  color: #e8ff9a;
}

.card-links .go:hover { background: rgba(216, 243, 74, 0.24); }

.card-links .alt {
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #a9c4b6;
}

.card-links .alt:hover { background: rgba(255, 255, 255, 0.12); color: #e6f4ec; }

.archive-foot {
  margin: 14px 0 0;
  color: #77948a;
  font-size: 11px;
}

@media (max-width: 900px) {
  .match-archive { left: 14px; right: 14px; top: 52px; }
  .archive-head h2 { font-size: 20px; }
  .match-grid { grid-template-columns: 1fr; }
}
</style>
