<template>
  <nav class="world-menu" :class="{ flow }" @mouseleave="open = false">
    <span class="wm-brand">hycBox · v2</span>
    <router-link to="/games" class="wm-link" active-class="active">游戏厅</router-link>

    <div class="wm-drop" :class="{ open }" @mouseenter="open = true">
      <button type="button" class="wm-link wm-trigger" :class="{ active: isWorld }" @click="open = !open">
        互动世界
        <span class="caret">▾</span>
      </button>
      <div class="wm-panel">
        <router-link
          v-for="item in worlds"
          :key="item.id"
          :to="item.route"
          class="wm-item"
          active-class="active"
          @click="open = false"
        >
          <span class="wm-icon">{{ item.icon }}</span>
          <span>{{ item.name }}</span>
        </router-link>
      </div>
    </div>

    <router-link to="/home" class="wm-link" active-class="active">经典地球</router-link>
    <div class="wm-extra"><slot /></div>
  </nav>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { WORLDS } from '../games/catalog.js'

defineProps({
  flow: { type: Boolean, default: false }
})

const route = useRoute()
const worlds = WORLDS
const open = ref(false)
const isWorld = computed(() => worlds.some((item) => route.path === item.route))
</script>

<style scoped>
.world-menu {
  position: absolute;
  z-index: 6;
  top: 0;
  left: 0;
  right: 0;
  min-height: 48px;
  height: auto;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.9rem;
  background: rgba(0, 0, 0, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: auto;
}

.world-menu.flow {
  position: relative;
  flex: none;
}

.wm-brand {
  margin-right: 0.8rem;
  font-size: 12px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.72);
}

.wm-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0.32rem 0.8rem;
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  font: inherit;
  font-size: 14px;
  letter-spacing: 0.06em;
  cursor: pointer;
}

.wm-link.active {
  background: rgba(212, 180, 120, 0.22);
  color: #fff;
}

.wm-trigger:hover {
  color: #fff;
}

.caret {
  font-size: 0.62rem;
  opacity: 0.7;
}

.wm-drop {
  position: relative;
}

.wm-panel {
  display: none;
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  min-width: 11rem;
  padding: 0.4rem;
  border-radius: 12px;
  background: rgba(8, 18, 17, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}

.wm-drop.open .wm-panel {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.wm-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.42rem 0.6rem;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  font-size: 13px;
  white-space: nowrap;
}

.wm-item:hover,
.wm-item.active {
  background: rgba(216, 243, 74, 0.16);
  color: #eff9f2;
}

.wm-icon {
  font-size: 14px;
}

.wm-extra {
  margin-left: auto;
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

:slotted(a),
:slotted(button) {
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  font-size: 13px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
  cursor: pointer;
}
</style>
