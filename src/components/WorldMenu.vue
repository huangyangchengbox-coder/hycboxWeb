<template>
  <nav class="world-menu" :class="{ flow }" @mouseleave="open = ''">
    <router-link to="/home" class="wm-brand" title="主页">hycBox · v2</router-link>

    <div
      v-for="mod in modules"
      :key="mod.id"
      class="wm-drop"
      :class="{ open: open === mod.id }"
      @mouseenter="hover(mod.id)"
    >
      <template v-if="mod.children.length">
        <button
          type="button"
          class="wm-link wm-trigger"
          :class="{ active: active === mod.id }"
          @click="toggle(mod.id)"
        >
          {{ mod.name }}
          <span class="caret">▾</span>
        </button>
        <div class="wm-panel">
          <div class="wm-panel-head">
            <span class="wm-panel-title">{{ mod.icon }} {{ mod.name }}</span>
            <span class="wm-panel-hint">{{ mod.hint }}</span>
          </div>
          <router-link
            v-for="child in mod.children"
            :key="child.route"
            :to="child.route"
            class="wm-item"
            @click="open = ''"
          >
            <span class="wm-item-name">{{ child.name }}</span>
            <span class="wm-item-desc">{{ child.desc }}</span>
          </router-link>
        </div>
      </template>
      <router-link
        v-else
        :to="mod.route"
        class="wm-link"
        :class="{ active: active === mod.id }"
      >{{ mod.name }}</router-link>
    </div>

    <div class="wm-extra"><slot /></div>
  </nav>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { SITE_MODULES, moduleOfPath } from '../site/modules.js'

defineProps({
  flow: { type: Boolean, default: false }
})

const route = useRoute()
const modules = SITE_MODULES
const open = ref('')

const active = computed(() => moduleOfPath(route.path))

function hover(id) {
  open.value = id
}

function toggle(id) {
  open.value = open.value === id ? '' : id
}
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
  gap: 0.2rem;
  padding: 0 0.9rem;
  background: rgba(0, 0, 0, 0.62);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: auto;
  backdrop-filter: blur(6px);
}

.world-menu.flow {
  position: relative;
  flex: none;
}

.wm-brand {
  margin-right: 0.7rem;
  font-size: 12px;
  letter-spacing: 0.16em;
  color: rgba(255, 255, 255, 0.72);
  text-decoration: none;
}

.wm-brand:hover {
  color: #fff;
}

.wm-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: none;
  background: transparent;
  border-radius: 999px;
  padding: 0.32rem 0.78rem;
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  font: inherit;
  font-size: 14px;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition: color 0.12s, background 0.12s;
}

.wm-link:hover {
  color: #fff;
}

.wm-link.active {
  background: rgba(212, 180, 120, 0.24);
  color: #fff;
}

.caret {
  font-size: 0.6rem;
  opacity: 0.7;
}

.wm-drop {
  position: relative;
}

.wm-panel {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 17rem;
  padding: 0.45rem;
  border-radius: 12px;
  background: rgba(8, 18, 17, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5);
}

.wm-drop.open .wm-panel {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.wm-panel-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem 0.6rem 0.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 0.2rem;
}

.wm-panel-title {
  font-size: 12.5px;
  color: #fff;
  letter-spacing: 0.08em;
}

.wm-panel-hint {
  font-size: 11px;
  color: rgba(169, 196, 182, 0.85);
}

.wm-item {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  padding: 0.42rem 0.6rem;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.86);
  text-decoration: none;
}

.wm-item:hover {
  background: rgba(216, 243, 74, 0.14);
}

.wm-item-name {
  font-size: 13px;
}

.wm-item-desc {
  font-size: 11px;
  color: rgba(169, 196, 182, 0.8);
  line-height: 1.5;
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

@media (max-width: 860px) {
  .wm-brand {
    display: none;
  }

  .wm-link {
    font-size: 13px;
    padding: 0.28rem 0.6rem;
  }

  .wm-panel {
    min-width: 15rem;
  }
}
</style>
