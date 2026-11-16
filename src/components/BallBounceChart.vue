<template>
  <div class="bounce-chart">
    <div class="chart-head">
      <span>落球弹跳对比 · 从 254 cm 落到混凝土</span>
      <span class="hint">ITF 标准回弹 135–147 cm</span>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" role="img" aria-label="三种球的弹跳高度对比">
      <!-- 网格 -->
      <g class="grid">
        <line v-for="g in GRID" :key="g" :x1="LEFT" :x2="RIGHT" :y1="sy(g)" :y2="sy(g)" />
      </g>

      <!-- 标准区间 -->
      <rect
        :x="LEFT"
        :y="sy(147)"
        :width="RIGHT - LEFT"
        :height="sy(135) - sy(147)"
        class="band"
      />
      <text class="band-label" :x="RIGHT - 6" :y="sy(141) + 3" text-anchor="end">ITF 合格区间 135–147 cm</text>

      <!-- 标准线 -->
      <line class="ref" :x1="LEFT" :x2="RIGHT" :y1="sy(135)" :y2="sy(135)" />
      <line class="ref" :x1="LEFT" :x2="RIGHT" :y1="sy(147)" :y2="sy(147)" />

      <!-- 落球高度虚线 -->
      <line class="drop" :x1="LEFT" :x2="RIGHT" :y1="sy(254)" :y2="sy(254)" />
      <text class="drop-label" :x="LEFT + 5" :y="sy(254) - 5">落球高度 254 cm</text>

      <!-- 每种球：一根柱子 + 弹跳高度 -->
      <g v-for="(item, i) in items" :key="item.id">
        <rect
          :x="barX(i)"
          :y="sy(item.rebound)"
          :width="BAR_W"
          :height="sy(0) - sy(item.rebound)"
          :fill="item.hex"
          opacity="0.28"
          rx="3"
        />
        <rect
          :x="barX(i)"
          :y="sy(item.rebound)"
          :width="BAR_W"
          height="3"
          :fill="item.hex"
          rx="1.5"
        />
        <text class="bar-value" :x="barX(i) + BAR_W / 2" :y="sy(item.rebound) - 6" text-anchor="middle" :fill="item.hex">
          {{ item.rebound }} cm
        </text>
        <text class="bar-name" :x="barX(i) + BAR_W / 2" :y="sy(0) + 14" text-anchor="middle">{{ item.short }}</text>
        <text class="bar-note" :x="barX(i) + BAR_W / 2" :y="sy(0) + 25" text-anchor="middle">{{ item.note }}</text>
      </g>

      <!-- 轴 -->
      <line class="axis" :x1="LEFT" :x2="RIGHT" :y1="sy(0)" :y2="sy(0)" />
      <line class="axis" :x1="LEFT" :x2="LEFT" :y1="sy(0)" :y2="sy(254) - 10" />
      <g v-for="g in GRID" :key="`t${g}`">
        <text class="axis-label" :x="LEFT - 5" :y="sy(g) + 3" text-anchor="end">{{ g }}</text>
      </g>
      <text class="axis-title" :x="LEFT" :y="sy(254) - 22">回弹高度 cm</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] }
})

const W = 300
const H = 186
const LEFT = 30
const RIGHT = W - 8
const TOP = 16
const BOTTOM = H - 32
const MAX = 254
const BAR_W = 26

const GRID = [0, 50, 100, 150, 200, 250]

function sy(v) {
  const k = Math.min(MAX, Math.max(0, v)) / MAX
  return BOTTOM - k * (BOTTOM - TOP)
}

const items = computed(() => props.items || [])

function barX(i) {
  const span = (RIGHT - LEFT) / Math.max(1, items.value.length)
  return LEFT + span * i + (span - BAR_W) / 2
}
</script>

<style scoped>
.bounce-chart {
  margin: 8px 0;
  padding: 7px 8px 4px;
  border-radius: 11px;
  background: rgba(4, 18, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 10px;
  color: #d8f34a;
  margin-bottom: 3px;
}

.hint {
  font-size: 9px;
  color: #7f9a91;
}

svg {
  display: block;
  width: 100%;
  height: auto;
}

.grid line {
  stroke: rgba(255, 255, 255, 0.07);
  stroke-width: 0.6;
}

.band {
  fill: rgba(52, 211, 153, 0.12);
}

.band-label {
  fill: #6ee7b7;
  font-size: 7.5px;
}

.ref {
  stroke: rgba(52, 211, 153, 0.5);
  stroke-width: 0.7;
  stroke-dasharray: 3 3;
}

.drop {
  stroke: rgba(255, 138, 76, 0.45);
  stroke-width: 0.7;
  stroke-dasharray: 4 3;
}

.drop-label {
  fill: #ffb08a;
  font-size: 7.5px;
}

.bar-value {
  font-size: 8px;
  font-weight: 700;
}

.bar-name {
  fill: #e6f4ec;
  font-size: 8px;
  font-weight: 600;
}

.bar-note {
  fill: #7f9a91;
  font-size: 7px;
}

.axis {
  stroke: rgba(255, 255, 255, 0.35);
  stroke-width: 0.8;
}

.axis-label {
  fill: #8fa9a0;
  font-size: 7px;
}

.axis-title {
  fill: #a9c4b6;
  font-size: 7.5px;
}
</style>
