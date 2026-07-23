<template>
  <div class="layout">
    <header class="header">
      <div class="brand">
        <span class="logo">hyc</span>
        <span>hycBox</span>
      </div>
      <nav class="nav">
        <router-link to="/cockpit" class="nav-link" active-class="active">小区数据仓</router-link>
        <router-link to="/ai-image" class="nav-link" active-class="active">图片 AI</router-link>
        <router-link to="/ai-video" class="nav-link" active-class="active">视频 AI</router-link>
      </nav>
      <div class="user">
        <span class="name">{{ displayName }}</span>
        <button class="btn btn-secondary btn-sm" @click="onLogout">退出</button>
      </div>
    </header>
    <main class="main" :class="{ wide: isWide }">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminInfo, logout } from '../api/auth'

const router = useRouter()
const route = useRoute()
const displayName = computed(() => getAdminInfo().displayName || getAdminInfo().username || '管理员')
const isWide = computed(() => route.name === 'cockpit')

function onLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.85rem 1.5rem;
  background: #fff;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  background: var(--accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
}

.nav {
  display: flex;
  gap: 0.5rem;
  flex: 1;
  flex-wrap: wrap;
}

.nav-link {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  color: var(--muted);
}

.nav-link.active,
.nav-link:hover {
  color: var(--accent-dark);
  background: #ecfdf5;
}

.user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.name {
  font-size: 0.875rem;
  color: var(--muted);
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}

.main {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem;
}

.main.wide {
  max-width: 1400px;
}
</style>
