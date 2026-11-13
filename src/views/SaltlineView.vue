<template>
  <div class="salt">
    <iframe class="frame" :src="src" title="盐线港口" allow="fullscreen" />
    <WorldMenu />
  </div>
</template>

<script setup>
import WorldMenu from '../components/WorldMenu.vue'

const src = `${import.meta.env.BASE_URL}exhibits/saltline/index.html`
</script>

<style scoped>
.salt {
  position: relative;
  height: 100%;
  background: #0b0d0f;
}

.frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #0b0d0f;
}
</style>
