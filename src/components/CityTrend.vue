<template>
  <div class="trend">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
      <defs>
        <linearGradient :id="gid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.42" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path v-if="area" :d="area" :fill="`url(#${gid})`" />
      <path :d="line" fill="none" :stroke="color" stroke-width="1.6" stroke-linejoin="round" />
      <circle :cx="last.x" :cy="last.y" r="2.4" :fill="color" />
    </svg>
    <span class="span">{{ span }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  values: { type: Array, default: () => [] },
  color: { type: String, default: '#5ec8ff' },
  span: { type: String, default: '近 90 秒' }
})

const W = 220
const H = 54

const gid = `tg-${Math.random().toString(36).slice(2, 8)}`

const range = computed(() => {
  const v = props.values
  if (!v.length) return { min: 0, max: 1 }
  const min = Math.min(...v)
  const max = Math.max(...v)
  const pad = (max - min) * 0.12 || 1
  return { min: min - pad, max: max + pad }
})

function px(i) {
  const n = props.values.length
  return n <= 1 ? 0 : (i / (n - 1)) * W
}

function py(value) {
  const { min, max } = range.value
  const k = (value - min) / (max - min || 1)
  return H - 4 - k * (H - 8)
}

const line = computed(() => props.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' '))

const area = computed(() => {
  if (!props.values.length) return ''
  const d = props.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')
  return `${d} L${W},${H} L0,${H} Z`
})

const last = computed(() => {
  const n = props.values.length
  if (!n) return { x: 0, y: 0 }
  return { x: px(n - 1), y: py(props.values[n - 1]) }
})
</script>

<style scoped>
.trend {
  position: relative;
  height: 54px;
  margin: 6px 0;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

.span {
  position: absolute;
  right: 2px;
  top: -2px;
  font-size: 9px;
  color: #7f9a91;
}
</style>
