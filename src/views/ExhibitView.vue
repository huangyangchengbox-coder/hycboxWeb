<template>
  <div class="exhibit">
    <WorldMenu flow />
    <iframe class="frame" :src="src" :title="title" />
  </div>
</template>

<script setup>
import WorldMenu from '../components/WorldMenu.vue'

const props = defineProps({
  file: { type: String, required: true },
  title: { type: String, required: true }
})

const src = `${import.meta.env.BASE_URL}${props.file}`
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
