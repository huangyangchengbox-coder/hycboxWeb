<template>
  <div class="login-page">
    <div class="login-shell">
      <div class="card login-card">
        <h1>hycBox</h1>
        <p class="subtitle">管理端 · 账号密码登录</p>
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

      <div class="card qr-card">
        <h2>小程序扫码登录</h2>
        <p class="subtitle">使用已登录的管理员小程序扫码并确认</p>
        <div class="qr-box">
          <img v-if="qrImageSrc" :src="qrImageSrc" alt="扫码登录" class="qr-image" />
          <div v-else class="qr-placeholder">{{ qrLoading ? '生成二维码…' : '二维码加载失败' }}</div>
        </div>
        <p class="qr-status">{{ qrStatusText }}</p>
        <button type="button" class="btn btn-secondary qr-refresh" :disabled="qrLoading" @click="refreshQr">
          {{ qrLoading ? '刷新中…' : '刷新二维码' }}
        </button>
        <p v-if="qrError" class="error-msg">{{ qrError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyLoginData, createQrLogin, login, pollQrLogin } from '../api/auth'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const qrLoading = ref(false)
const qrError = ref('')
const qrTicket = ref('')
const qrExpireAt = ref(0)
const qrImageBase64 = ref('')
const qrStatus = ref('pending')
const pollTimer = ref(null)

const qrImageSrc = computed(() => (
  qrImageBase64.value ? `data:image/png;base64,${qrImageBase64.value}` : ''
))

const qrStatusText = computed(() => {
  if (qrLoading.value) return '正在生成二维码…'
  if (qrError.value) return '请刷新二维码后重试'
  switch (qrStatus.value) {
    case 'scanned':
      return '已在小程序打开，请在手机上确认登录'
    case 'confirmed':
      return '登录成功，正在跳转…'
    case 'expired':
      return '二维码已过期，请点击刷新'
    case 'consumed':
      return '二维码已使用，请刷新后重试'
    default:
      return '请使用管理员小程序扫描二维码'
  }
})

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function startPolling() {
  stopPolling()
  if (!qrTicket.value) return
  pollTimer.value = setInterval(async () => {
    if (!qrTicket.value) return
    if (qrExpireAt.value && Date.now() > qrExpireAt.value) {
      qrStatus.value = 'expired'
      stopPolling()
      return
    }
    try {
      const data = await pollQrLogin(qrTicket.value)
      qrStatus.value = data.status || 'pending'
      if (data.status === 'confirmed' && data.login) {
        stopPolling()
        applyLoginData(data.login)
        const redirect = route.query.redirect || '/home'
        router.replace(String(redirect))
        return
      }
      if (data.status === 'expired' || data.status === 'consumed') {
        stopPolling()
      }
    } catch (e) {
      qrError.value = e.message || '轮询失败'
    }
  }, 2000)
}

async function refreshQr() {
  stopPolling()
  qrLoading.value = true
  qrError.value = ''
  qrStatus.value = 'pending'
  qrImageBase64.value = ''
  qrTicket.value = ''
  try {
    const data = await createQrLogin()
    qrTicket.value = data.ticket
    qrExpireAt.value = Number(data.expireAt) || 0
    qrImageBase64.value = data.qrImageBase64 || ''
    startPolling()
  } catch (e) {
    qrError.value = e.message || '二维码生成失败'
  } finally {
    qrLoading.value = false
  }
}

async function onSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value, password.value)
    const redirect = route.query.redirect || '/home'
    router.replace(String(redirect))
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  refreshQr()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-shell {
  width: 100%;
  max-width: 880px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.login-card,
.qr-card {
  width: 100%;
}

h1,
h2 {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
}

h2 {
  font-size: 1.1rem;
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

.qr-box {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  border: 1px dashed var(--border);
  border-radius: 12px;
  background: #fafafa;
  margin-bottom: 0.75rem;
}

.qr-image {
  width: 200px;
  height: 200px;
  object-fit: contain;
}

.qr-placeholder {
  color: var(--muted);
  font-size: 0.9rem;
}

.qr-status {
  margin: 0 0 0.75rem;
  color: var(--muted);
  font-size: 0.85rem;
  min-height: 1.2rem;
}

.qr-refresh {
  width: 100%;
}
</style>
