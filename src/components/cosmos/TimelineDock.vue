<template>
  <div class="tl">
    <aside class="tl-card" aria-live="polite">
      <div class="tl-en">{{ era.nameEn }}</div>
      <h2>{{ era.name }}</h2>
      <div class="tl-kind">{{ era.kind }}</div>
      <p class="tl-when">{{ era.timeAfter }} · 大爆炸后</p>
      <p v-if="era.timeAgo" class="tl-ago">距今 {{ era.timeAgo }}</p>
      <p class="tl-headline">{{ era.headline }}</p>
      <p class="tl-body">{{ era.body }}</p>
      <dl>
        <template v-for="row in era.facts" :key="row[0]">
          <dt>{{ row[0] }}</dt>
          <dd>{{ row[1] }}</dd>
        </template>
      </dl>
      <p class="tl-note">时间为示意，取值按主流宇宙学模型。</p>
    </aside>

    <div class="tl-dock">
      <div class="tl-head">
        <span class="tl-time">{{ timeText }}</span>
        <button type="button" class="tl-btn" @click="$emit('toggle-play')">{{ playing ? '暂停' : '播放' }}</button>
        <div class="tl-speeds">
          <button
            v-for="item in speeds"
            :key="item"
            type="button"
            class="tl-btn"
            :class="{ on: item === speed }"
            @click="$emit('update:speed', item)"
          >{{ item }}×</button>
        </div>
        <button type="button" class="tl-btn" :class="{ on: follow }" @click="$emit('update:follow', !follow)">
          {{ follow ? '跟随镜头' : '自由视角' }}
        </button>
        <button type="button" class="tl-btn" @click="$emit('reset-camera')">返回机位</button>
      </div>
      <div
        ref="trackRef"
        class="tl-track"
        @pointerdown="onDown"
      >
        <div class="tl-fill" :style="{ width: `${shown * 100}%` }"></div>
        <button
          v-for="item in eras"
          :key="item.id"
          type="button"
          class="tl-tick"
          :class="{ current: item.id === era.id }"
          :style="{ left: `${item.p * 100}%` }"
          :title="`${item.name} · ${item.timeAfter}`"
          @pointerdown.stop
          @click="$emit('seek-era', item.id)"
        >
          <i></i>
          <span>{{ item.name }}</span>
        </button>
        <div
          class="tl-thumb"
          :style="{ left: `${shown * 100}%` }"
          role="slider"
          tabindex="0"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="Math.round(shown * 100)"
          :aria-valuetext="`${era.name}，${timeText}`"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  eras: { type: Array, required: true },
  era: { type: Object, required: true },
  progress: { type: Number, default: 0 },
  timeText: { type: String, default: '' },
  playing: { type: Boolean, default: false },
  speed: { type: Number, default: 1 },
  follow: { type: Boolean, default: true }
})
const emit = defineEmits(['update:progress', 'toggle-play', 'seek-era', 'update:speed', 'update:follow', 'reset-camera'])

const speeds = [0.5, 1, 2]
const trackRef = ref(null)
const local = ref(props.progress)
const dragging = ref(false)
const shown = computed(() => (dragging.value ? local.value : props.progress))

watch(() => props.progress, (value) => {
  if (!dragging.value) local.value = value
})

function ratioFromEvent(e) {
  const rect = trackRef.value.getBoundingClientRect()
  return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
}

function onDown(e) {
  dragging.value = true
  trackRef.value.setPointerCapture?.(e.pointerId)
  local.value = ratioFromEvent(e)
  emit('update:progress', local.value, { scrubbing: true })
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onMove(e) {
  if (!dragging.value) return
  local.value = ratioFromEvent(e)
  emit('update:progress', local.value, { scrubbing: true })
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', onUp)
  const near = props.eras.reduce((best, era) => (
    Math.abs(era.p - local.value) < Math.abs(best.p - local.value) ? era : best
  ), props.eras[0])
  const snapped = Math.abs(near.p - local.value) < 0.02 ? near.p : local.value
  local.value = snapped
  emit('update:progress', snapped, { scrubbing: false })
}
</script>

<style scoped>
.tl {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}

.tl-card {
  position: absolute;
  top: 4.6rem;
  right: 1rem;
  width: min(320px, calc(100% - 210px));
  max-height: calc(100% - 11rem);
  overflow: auto;
  padding: 1rem 1rem 0.85rem;
  background: rgba(6, 10, 18, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  pointer-events: auto;
}

.tl-en {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: rgba(255, 196, 120, 0.85);
}

.tl-card h2 {
  margin: 0.2rem 0 0;
  font-size: 24px;
  font-weight: 560;
}

.tl-kind,
.tl-ago {
  margin: 0.25rem 0 0;
  color: #9eb6d4;
  font-size: 13px;
}

.tl-when {
  margin: 0.35rem 0 0;
  color: #d7e4ff;
  font-size: 13px;
}

.tl-headline {
  margin: 0.7rem 0 0;
  line-height: 1.5;
}

.tl-body {
  margin: 0.45rem 0 0;
  color: rgba(232, 238, 248, 0.86);
  line-height: 1.55;
  font-size: 14px;
}

.tl-card dl {
  display: grid;
  grid-template-columns: 5.6rem 1fr;
  gap: 0.35rem 0.6rem;
  margin: 0.8rem 0 0;
  font-size: 13px;
}

.tl-card dt {
  color: rgba(232, 238, 248, 0.48);
}

.tl-card dd {
  margin: 0;
}

.tl-note {
  margin: 0.8rem 0 0;
  color: rgba(232, 238, 248, 0.48);
  font-size: 12px;
}

.tl-dock {
  position: absolute;
  left: 196px;
  right: 1rem;
  bottom: 0.8rem;
  pointer-events: auto;
}

.tl-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
}

.tl-time {
  min-width: 9rem;
  color: #d7e4ff;
  font-size: 13px;
}

.tl-btn {
  border-radius: 999px;
  padding: 0.38rem 0.75rem;
  font-size: 12px;
  letter-spacing: 0.04em;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.4);
  color: #e8eef8;
  border: 1px solid rgba(255, 255, 255, 0.14);
}

.tl-btn.on {
  border-color: rgba(126, 200, 255, 0.8);
  background: rgba(126, 200, 255, 0.16);
}

.tl-speeds {
  display: flex;
  gap: 0.3rem;
}

.tl-track {
  position: relative;
  height: 46px;
  border-radius: 999px;
  background: rgba(8, 12, 20, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  touch-action: none;
  cursor: pointer;
}

.tl-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255, 214, 160, 0.35), rgba(126, 168, 255, 0.28));
}

.tl-tick {
  position: absolute;
  top: 0;
  width: 18px;
  height: 46px;
  margin-left: -9px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(232, 238, 248, 0.72);
  cursor: pointer;
}

.tl-tick i {
  display: block;
  width: 7px;
  height: 7px;
  margin: 8px auto 0;
  border-radius: 50%;
  background: #d7e4ff;
}

.tl-tick span {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  white-space: nowrap;
  transform: translateX(-40%);
}

.tl-tick.current span,
.tl-tick.current i {
  color: #ffe0a8;
  background: #ffe0a8;
}

.tl-tick.current span {
  background: transparent;
  color: #ffe0a8;
}

.tl-thumb {
  position: absolute;
  top: 16px;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  border-radius: 50%;
  background: #fff6e4;
  box-shadow: 0 0 0 4px rgba(255, 214, 160, 0.25);
  pointer-events: none;
}

@media (max-width: 800px) {
  .tl-card {
    top: auto;
    right: 0.6rem;
    left: 0.6rem;
    bottom: 7.2rem;
    width: auto;
    max-height: 34vh;
  }

  .tl-dock {
    left: 0.6rem;
    right: 0.6rem;
  }

  .tl-tick span {
    display: none;
  }

  .tl-tick.current span {
    display: block;
  }

  .tl-body {
    display: none;
  }
}
</style>
