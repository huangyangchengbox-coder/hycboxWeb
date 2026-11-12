<template>
  <nav class="world-menu" :class="{ flow }">
    <span class="wm-brand">hycBox · v2</span>
    <router-link to="/cosmos" class="wm-link" active-class="active">宇宙探索</router-link>
    <router-link to="/wildlife" class="wm-link" active-class="active">动物世界</router-link>
    <router-link to="/micro" class="wm-link" active-class="active">微观奇境</router-link>
    <router-link to="/saltline" class="wm-link" active-class="active">盐线港口</router-link>
    <router-link to="/terrain" class="wm-link" active-class="active">地形岛</router-link>
    <router-link to="/spectra" class="wm-link" active-class="active">光谱</router-link>
    <router-link to="/formula" class="wm-link" active-class="active">公式像素</router-link>
    <router-link to="/kerr" class="wm-link" active-class="active">旋转黑洞</router-link>
    <div class="wm-extra"><slot /></div>
  </nav>
</template>

<script setup>
defineProps({
  flow: { type: Boolean, default: false }
})
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
  border-radius: 999px;
  padding: 0.32rem 0.8rem;
  color: rgba(255, 255, 255, 0.78);
  text-decoration: none;
  font-size: 14px;
  letter-spacing: 0.06em;
}

.wm-link.active {
  background: rgba(212, 180, 120, 0.22);
  color: #fff;
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
