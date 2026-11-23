<template>
  <div class="solar">
    <WorldMenu />

    <header class="solar-top">
      <div>
        <div class="solar-kicker">COSMOS / SOLAR SYSTEM</div>
        <div class="solar-title">太阳系漫游</div>
      </div>
      <div class="solar-actions">
        <button type="button" @click="focusBody = ''">全景</button>
        <button type="button" @click="toggleFullscreen">全屏</button>
        <a href="https://www.3dsolarsystem.net/" target="_blank" rel="noopener noreferrer">新窗口打开 ↗</a>
      </div>
    </header>

    <div class="solar-chips">
      <button
        v-for="body in bodies"
        :key="body.id"
        type="button"
        class="chip"
        :class="{ on: focusBody === body.id }"
        @click="focusBody = body.id"
      >{{ body.name }}</button>
    </div>

    <div class="solar-frame-wrap">
      <iframe
        ref="frameRef"
        :key="iframeSrc"
        class="solar-frame"
        :src="iframeSrc"
        title="交互式 3D 太阳系模拟器"
        allow="fullscreen; accelerometer; gyroscope"
        allowfullscreen
      />
    </div>

    <footer class="solar-foot">
      <p class="credit">
        Interactive solar system by
        <a href="https://www.3dsolarsystem.net/" target="_blank" rel="noopener noreferrer">3D Solar System</a>
      </p>
      <p class="note">
        艺术化教学演示：天体大小、距离与时间经过压缩，不是实时星历，也不能指定日期。
        拖动旋转、滚轮缩放、点击星球聚焦；右上角可切换比例与速度。
      </p>
      <div class="expeditions">
        <span>第一人称漫游：</span>
        <a
          v-for="item in expeditions"
          :key="item.href"
          :href="`https://www.3dsolarsystem.net/${item.href}`"
          target="_blank"
          rel="noopener noreferrer"
        >{{ item.name }}</a>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'

const bodies = [
  { id: 'Sun', name: '太阳' },
  { id: 'Mercury', name: '水星' },
  { id: 'Venus', name: '金星' },
  { id: 'Earth', name: '地球' },
  { id: 'Moon', name: '月球' },
  { id: 'Mars', name: '火星' },
  { id: 'Jupiter', name: '木星' },
  { id: 'Saturn', name: '土星' },
  { id: 'Uranus', name: '天王星' },
  { id: 'Neptune', name: '海王星' }
]

const expeditions = [
  { name: '月球行走', href: 'moon.html' },
  { name: '火星行走', href: 'mars-expedition.html' },
  { name: '金星行走', href: 'venus-expedition.html' },
  { name: '水星行走', href: 'mercury-expedition.html' },
  { name: '木星下降', href: 'jupiter-expedition.html' },
  { name: '土星环飞行', href: 'saturn-expedition.html' },
  { name: '天王星环飞行', href: 'uranus-expedition.html' },
  { name: '海王星风暴', href: 'neptune-expedition.html' }
]

const focusBody = ref('Earth')
const frameRef = ref(null)
// 官方支持 /?focus=Earth 直接聚焦某个天体；嵌入默认 low 画质，
// 否则它会在 Web Worker 里生成大量柯伊伯带粒子，首屏要等很久
const iframeSrc = computed(() => {
  const base = 'https://www.3dsolarsystem.net/?quality=low'
  return focusBody.value ? `${base}&focus=${encodeURIComponent(focusBody.value)}` : base
})

function toggleFullscreen() {
  const el = frameRef.value
  if (!el) return
  if (document.fullscreenElement) document.exitFullscreen?.()
  else el.requestFullscreen?.()
}
</script>

<style scoped>
.solar {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 18px 26px 14px;
  background: radial-gradient(ellipse at 50% 0%, #101a2e 0%, #080b12 58%, #050609 100%);
  color: #e6f4ec;
  overflow: hidden;
}

.solar-top {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex: none;
  padding-left: 148px;
}

.solar-kicker {
  color: #6f92b8;
  font-size: 10px;
  letter-spacing: 0.26em;
}

.solar-title {
  margin-top: 3px;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.solar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.solar-actions button,
.solar-actions a {
  padding: 5px 10px;
  border: 1px solid rgba(158, 203, 255, 0.28);
  border-radius: 5px;
  background: rgba(158, 203, 255, 0.07);
  color: #c9ddf2;
  font-size: 12px;
  text-decoration: none;
  cursor: pointer;
}

.solar-actions button:hover,
.solar-actions a:hover {
  background: rgba(158, 203, 255, 0.18);
}

.solar-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: none;
  margin: 12px 0 10px;
  padding-left: 148px;
}

.chip {
  padding: 4px 11px;
  border: 1px solid rgba(158, 203, 255, 0.2);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  color: #a9c4d6;
  font-size: 12px;
  cursor: pointer;
}

.chip.on {
  border-color: #9ecbff;
  background: rgba(158, 203, 255, 0.18);
  color: #eaf4ff;
}

.solar-frame-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  margin-left: 148px;
  border: 1px solid rgba(158, 203, 255, 0.16);
  border-radius: 10px;
  overflow: hidden;
  background: #05070c;
}

.solar-frame {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  background: #05070c;
}

.solar-foot {
  flex: none;
  margin-left: 148px;
  padding-top: 9px;
}

.credit {
  margin: 0;
  color: #7f9bb4;
  font-size: 11px;
}

.credit a {
  color: #9ecbff;
}

.note {
  margin: 5px 0 0;
  color: #8ea9b6;
  font-size: 11px;
  line-height: 1.5;
}

.expeditions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-top: 6px;
  color: #6f92b8;
  font-size: 11px;
}

.expeditions a {
  color: #b4cee2;
  text-decoration: none;
}

.expeditions a:hover {
  color: #9ecbff;
  text-decoration: underline;
}

@media (max-width: 900px) {
  .solar {
    padding: 12px 14px;
  }

  .solar-top,
  .solar-chips,
  .solar-frame-wrap,
  .solar-foot {
    padding-left: 0;
    margin-left: 0;
  }

  .solar-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .solar-title {
    font-size: 18px;
  }
}
</style>
