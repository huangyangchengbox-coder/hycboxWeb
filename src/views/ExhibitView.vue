<template>
  <div class="exhibit">
    <WorldMenu flow />
    <iframe :key="src" class="frame" :src="src" :title="title" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'

const props = defineProps({
  file: { type: String, required: true },
  title: { type: String, required: true }
})

// 多个页面共用这个组件（地形岛 / 光谱 / 公式像素 / 旋转黑洞），
// 必须在 file 变化时重算，否则 iframe 会一直停在上一个页面。
const src = computed(() => `${import.meta.env.BASE_URL}${props.file}`)
</script>

<style scoped>
.exhibit {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #05070c;
}

.frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: 0;
  background: #05070c;
}
</style>
