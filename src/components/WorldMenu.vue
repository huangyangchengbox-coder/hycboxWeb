<template>
  <nav class="world-menu">
    <span class="wm-brand">hycBox · v2</span>
    <router-link to="/cosmos" class="wm-link" active-class="active">宇宙探索</router-link>
    <router-link to="/wildlife" class="wm-link" active-class="active">动物世界</router-link>
    <div class="wm-extra"><slot /></div>
  </nav>
</template>

<style scoped>
.world-menu {
  position: absolute;
  z-index: 6;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.9rem;
  background: rgba(0, 0, 0, 0.55);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: auto;
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
