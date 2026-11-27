<template>
  <div class="site-clock" :title="titleText">
    <span class="clock-pulse" aria-hidden="true"></span>
    <span class="clock-time">{{ timeText }}</span>
    <span class="clock-meta">
      <span class="clock-date">{{ dateText }}</span>
      <span class="clock-zone">本地 · UTC{{ utcOffset }}</span>
    </span>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const now = ref(new Date())
let kickTimer = null
let tickTimer = null

onMounted(() => {
  // 对齐到下一秒再开始走，避免刚进页面就连跳两次秒
  const delay = 1000 - now.value.getMilliseconds()
  kickTimer = window.setTimeout(() => {
    now.value = new Date()
    tickTimer = window.setInterval(() => { now.value = new Date() }, 1000)
  }, delay)
})

onUnmounted(() => {
  if (kickTimer) window.clearTimeout(kickTimer)
  if (tickTimer) window.clearInterval(tickTimer)
})

const pad = (n) => String(n).padStart(2, '0')
const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const timeText = computed(() => {
  const d = now.value
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
})

const dateText = computed(() => {
  const d = now.value
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`
})

const utcOffset = computed(() => {
  const minutes = -now.value.getTimezoneOffset()
  const sign = minutes >= 0 ? '+' : '-'
  const abs = Math.abs(minutes)
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
})

const titleText = computed(() => {
  const d = now.value
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${WEEK[d.getDay()]} ${timeText.value}（本机时间 UTC${utcOffset.value}）`
})
</script>

<style scoped>
.site-clock {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.2rem 0.6rem;
  border: 1px solid rgba(158, 203, 255, 0.18);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(158, 203, 255, 0.09), rgba(143, 227, 173, 0.05));
  backdrop-filter: blur(6px);
  user-select: none;
  white-space: nowrap;
  line-height: 1;
}

.clock-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #8fe3ad;
  box-shadow: 0 0 8px rgba(143, 227, 173, 0.9);
  animation: clock-blink 2s ease-in-out infinite;
}

@keyframes clock-blink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.8); }
}

.clock-time {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  color: #d8f34a;
  text-shadow: 0 0 10px rgba(216, 243, 74, 0.35);
}

.clock-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 9px;
  color: rgba(255, 255, 255, 0.55);
}

.clock-zone {
  color: rgba(158, 203, 255, 0.55);
  font-size: 8px;
  letter-spacing: 0.04em;
}

@media (max-width: 980px) {
  .clock-meta { display: none; }
}

@media (max-width: 640px) {
  .clock-time { font-size: 12px; }
  .site-clock { padding: 0.18rem 0.45rem; }
}

@media (prefers-reduced-motion: reduce) {
  .clock-pulse { animation: none; }
}
</style>
