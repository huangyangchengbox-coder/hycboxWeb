<template>
  <Teleport to="body">
    <div v-if="visible" class="fly-layer" aria-hidden="true">
      <div class="fly-trail" :style="trailStyle"></div>
      <div class="fly-card" :style="cardStyle">
        <span class="fly-tag">生成任务</span>
        <p class="fly-text">{{ text }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, onUnmounted, reactive, ref } from 'vue'

const props = defineProps({
  /** 飞入卡片展示文案 */
  text: { type: String, default: '' }
})

const emit = defineEmits(['done'])

const visible = ref(false)
const cardStyle = reactive({})
const trailStyle = reactive({})
let timer = 0

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = 0
  }
}

/**
 * 从 fromEl 弹出缩小，再流到 toEl（历史列表区域）。
 * @param {HTMLElement|null} fromEl
 * @param {HTMLElement|null} toEl
 * @returns {Promise<void>}
 */
function play(fromEl, toEl) {
  return new Promise((resolve) => {
    clearTimer()
    if (!fromEl || !toEl) {
      emit('done')
      resolve()
      return
    }
    const from = fromEl.getBoundingClientRect()
    const to = toEl.getBoundingClientRect()
    const endW = Math.min(280, Math.max(180, to.width * 0.42))
    const endH = 72
    const endLeft = to.left + 12
    const endTop = to.top + 48

    Object.assign(cardStyle, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${Math.min(from.height, 120)}px`,
      transform: 'scale(1)',
      opacity: '1'
    })
    Object.assign(trailStyle, {
      left: `${from.left + from.width / 2}px`,
      top: `${from.top + Math.min(from.height, 120) / 2}px`,
      height: '0px',
      opacity: '0'
    })
    visible.value = true

    nextTick(() => {
      // 先轻微弹出
      requestAnimationFrame(() => {
        Object.assign(cardStyle, {
          transform: 'scale(1.06)',
          transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)'
        })
        // 再缩小并流向下方
        timer = setTimeout(() => {
          const midX = from.left + from.width / 2
          const midY = (from.top + endTop) / 2
          const dist = Math.max(40, endTop - from.top)
          Object.assign(trailStyle, {
            left: `${midX - 6}px`,
            top: `${from.top + 24}px`,
            height: `${dist}px`,
            opacity: '0.85',
            transition: 'height 520ms cubic-bezier(0.4, 0, 0.2, 1), opacity 520ms ease'
          })
          Object.assign(cardStyle, {
            left: `${endLeft}px`,
            top: `${endTop}px`,
            width: `${endW}px`,
            height: `${endH}px`,
            transform: 'scale(0.92)',
            opacity: '0.95',
            transition:
              'left 560ms cubic-bezier(0.4, 0.05, 0.2, 1), top 560ms cubic-bezier(0.55, 0.05, 0.2, 1.15), width 560ms ease, height 560ms ease, transform 560ms ease, opacity 200ms ease 420ms'
          })
          timer = setTimeout(() => {
            visible.value = false
            Object.assign(cardStyle, { transition: 'none' })
            Object.assign(trailStyle, { transition: 'none', opacity: '0', height: '0px' })
            emit('done')
            resolve()
          }, 620)
        }, 180)
      })
    })
  })
}

onUnmounted(clearTimer)

defineExpose({ play })
</script>

<style scoped>
.fly-layer {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
}

.fly-trail {
  position: fixed;
  width: 12px;
  border-radius: 999px;
  background: linear-gradient(
    180deg,
    rgba(45, 212, 191, 0.05) 0%,
    rgba(16, 185, 129, 0.55) 45%,
    rgba(14, 165, 233, 0.35) 100%
  );
  filter: blur(0.5px);
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.35);
  transform-origin: top center;
}

.fly-card {
  position: fixed;
  box-sizing: border-box;
  padding: 0.65rem 0.8rem;
  border-radius: 12px;
  background: linear-gradient(145deg, #ecfdf5 0%, #e0f2fe 100%);
  border: 1px solid rgba(16, 185, 129, 0.45);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.fly-tag {
  align-self: flex-start;
  font-size: 0.7rem;
  font-weight: 600;
  color: #0f766e;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}

.fly-text {
  margin: 0;
  font-size: 0.85rem;
  color: #134e4a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
</style>
