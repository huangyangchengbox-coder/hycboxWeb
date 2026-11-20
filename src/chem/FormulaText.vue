<script setup>
import { computed } from 'vue'
import { formulaParts } from './formula.js'

const props = defineProps({
  text: { type: String, required: true }
})

const parts = computed(() => formulaParts(props.text))
</script>

<template>
  <span class="chem-formula">
    <template v-for="(part, index) in parts" :key="index">
      <sub v-if="part.kind === 'sub'">{{ part.text }}</sub>
      <sup v-else-if="part.kind === 'sup'">{{ part.text }}</sup>
      <span v-else>{{ part.text }}</span>
    </template>
  </span>
</template>

<style scoped>
.chem-formula sub,
.chem-formula sup {
  font-size: 0.62em;
  line-height: 0;
}
</style>
