<template>
  <div class="layout" :class="{ immersive: isImmersive }">
    <header v-if="!isImmersive" class="header">
      <div class="brand">
        <span class="logo">hyc</span>
        <span>hycBox</span>
      </div>
      <nav class="nav">
        <template v-if="isLoggedIn">
          <div
            class="nav-dropdown"
            :class="{ open: openMenu === 'cockpit', active: isCockpitActive }"
            @mouseenter="openMenu = 'cockpit'"
            @mouseleave="closeIf('cockpit')"
          >
            <button type="button" class="nav-link nav-trigger">
              驾驶舱
              <span class="caret">▾</span>
            </button>
            <div class="dropdown-panel">
              <router-link to="/cockpit" class="dropdown-item" active-class="active" @click="openMenu = ''">
                小区数据仓
              </router-link>
              <router-link to="/nation-cockpit" class="dropdown-item" active-class="active" @click="openMenu = ''">
                物流中国仓
              </router-link>
            </div>
          </div>

          <div
            class="nav-dropdown"
            :class="{ open: openMenu === 'ai', active: isAiActive }"
            @mouseenter="openMenu = 'ai'"
            @mouseleave="closeIf('ai')"
          >
            <button type="button" class="nav-link nav-trigger">
              Web AI
              <span class="caret">▾</span>
            </button>
            <div class="dropdown-panel">
              <router-link to="/ai-image" class="dropdown-item" active-class="active" @click="openMenu = ''">
                Agnes AI · 图片
              </router-link>
              <router-link to="/ai-video" class="dropdown-item" active-class="active" @click="openMenu = ''">
                Agnes AI · 视频
              </router-link>
              <router-link to="/ai-cloudflare" class="dropdown-item" active-class="active" @click="openMenu = ''">
                Cloudflare Workers AI
              </router-link>
              <router-link to="/ai-nvidia-nim" class="dropdown-item" active-class="active" @click="openMenu = ''">
                NVIDIA NIM AI
              </router-link>
            </div>
          </div>

          <router-link to="/hub-entries" class="nav-link" active-class="active">首页入口</router-link>
          <router-link to="/publish" class="nav-link" active-class="active">发布管理</router-link>
        </template>
        <router-link v-else to="/login" class="nav-link nav-login">登录</router-link>
      </nav>
      <div v-if="isLoggedIn" class="user">
        <span class="name">{{ displayName }}</span>
        <button class="btn btn-secondary btn-sm" @click="onLogout">退出</button>
      </div>
    </header>
    <main class="main" :class="{ wide: isWide, immersive: isImmersive }" @mouseenter="openMenu = ''">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAdminInfo, getToken, logout } from '../api/auth'

const router = useRouter()
const route = useRoute()
const openMenu = ref('')
const isLoggedIn = computed(() => !!getToken())
const displayName = computed(() => getAdminInfo().displayName || getAdminInfo().username || '管理员')
const isWide = computed(() => route.name === 'cockpit' || route.name === 'nation-cockpit')
const isImmersive = computed(() => route.meta.immersive === true || route.name === 'home')
const isCockpitActive = computed(() => route.name === 'cockpit' || route.name === 'nation-cockpit')
const isAiActive = computed(() =>
  route.name === 'ai-image'
  || route.name === 'ai-video'
  || route.name === 'ai-cloudflare'
  || route.name === 'ai-nvidia-nim'
)

function closeIf(key) {
  if (openMenu.value === key) openMenu.value = ''
}

function onLogout() {
  logout()
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
}

.layout.immersive {
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
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
  align-items: center;
}

.nav-link {
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  color: var(--muted);
  border: none;
  background: transparent;
  cursor: pointer;
  font: inherit;
}

.nav-link.active,
.nav-link:hover,
.nav-login {
  color: var(--accent-dark);
  background: #ecfdf5;
}

.nav-login {
  margin-left: auto;
}

.nav-dropdown.active > .nav-trigger,
.nav-dropdown.open > .nav-trigger {
  color: var(--accent-dark);
  background: #ecfdf5;
}

.nav-dropdown {
  position: relative;
}

.nav-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.caret {
  font-size: 0.65rem;
  opacity: 0.7;
}

.dropdown-panel {
  display: none;
  position: absolute;
  top: calc(100% - 2px);
  left: 0;
  min-width: 10rem;
  padding: 0.4rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
  z-index: 40;
}

.nav-dropdown.open .dropdown-panel,
.nav-dropdown:hover .dropdown-panel {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.dropdown-item {
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  color: var(--muted);
  white-space: nowrap;
}

.dropdown-item:hover,
.dropdown-item.active {
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

.main.immersive {
  max-width: none;
  margin: 0;
  padding: 0;
  height: 100vh;
}
</style>
