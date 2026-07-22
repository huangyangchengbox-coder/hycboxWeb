<template>
  <div class="login-page">
    <div class="card login-card">
      <h1>慧优果管理端</h1>
      <p class="subtitle">登录后使用图片 / 视频 AI 功能</p>
      <form @submit.prevent="onSubmit">
        <div class="form-group">
          <label>账号</label>
          <input v-model.trim="username" type="text" autocomplete="username" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn login-btn" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../api/auth'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    const redirect = route.query.redirect || '/ai-image'
    router.replace(String(redirect))
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-card {
  width: 100%;
  max-width: 400px;
}

h1 {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
}

.subtitle {
  margin: 0 0 1.25rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.login-btn {
  width: 100%;
  margin-top: 0.5rem;
}
</style>
