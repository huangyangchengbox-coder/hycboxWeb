<template>
  <div class="cameras">
    <header class="cam-head">
      <div>
        <h1>萤石摄像头</h1>
        <p class="sub">登录后可查看家庭摄像头实时画面 · EZOPEN 取流（服务端代理密钥）</p>
      </div>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" @click="loadAll" :disabled="loading">
          {{ loading ? '加载中…' : '刷新画面' }}
        </button>
      </div>
    </header>

    <div v-if="error" class="alert">{{ error }}</div>

    <div class="notice">
      萤石试用版账号同时最多约 2 路实时画面；若出现 9048/9049，请先在手机萤石云 App 退出预览，或升级企业版套餐解除并发限制。
    </div>

    <div class="grid">
      <section v-for="dev in devices" :key="dev.deviceSerial" class="card camera-card">
        <div class="card-head">
          <div class="title-wrap">
            <span class="dot" :class="dev.online ? 'on' : 'off'"></span>
            <div>
              <h2>{{ dev.deviceName }}</h2>
              <p class="meta">{{ dev.deviceSerial }} · {{ dev.deviceType || 'IPC' }}</p>
            </div>
          </div>
          <span class="badge" :class="dev.online ? 'ok' : 'bad'">
            {{ dev.online ? '在线' : '离线' }}
          </span>
        </div>

        <div class="player-shell">
          <div :id="playerId(dev.deviceSerial)" class="player"></div>
          <div v-if="skipped[dev.deviceSerial]" class="player-mask idle">
            <span>为避免超出萤石试用版并发上限，此路暂未加载</span>
          </div>
          <div v-else-if="!ready[dev.deviceSerial] && !failed[dev.deviceSerial]" class="player-mask">
            <span class="spinner"></span>
            <span>正在建立视频连接…</span>
          </div>
          <div v-if="failed[dev.deviceSerial]" class="player-mask err">
            <span>画面加载失败：{{ failed[dev.deviceSerial] }}</span>
          </div>
        </div>

        <div class="card-foot">
          <span class="hint">EZUIKit · {{ dev.online ? '实时预览' : '设备离线' }}</span>
          <button v-if="skipped[dev.deviceSerial]" class="btn btn-secondary btn-sm" @click="loadOne(dev)">
            加载此路
          </button>
          <button v-else class="btn btn-secondary btn-sm" @click="retry(dev)">重连</button>
        </div>
      </section>
    </div>

    <div v-if="!loading && !devices.length && !error" class="empty">暂无可用摄像头设备</div>

    <p class="note">
      画面由萤石开放平台 EZOPEN 协议提供；AppKey / AppSecret 仅保存在服务端，前端只拿到短期取流凭证。
    </p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { getEzvizDevices, getEzvizLive } from '../api/ezviz'

const devices = ref([])
const loading = ref(false)
const error = ref('')
const ready = reactive({})
const failed = reactive({})
const skipped = reactive({})
const players = new Map()
// 萤石试用版套餐并发上限约 2 路，默认只自动加载前两路
const DEFAULT_LIVE_LIMIT = 2
let disposed = false

function playerId(serial) {
  return `ezviz-player-${serial}`
}

// 把萤石 SDK 的取流错误翻译成可操作的提示
function formatStreamError(err) {
  let code = ''
  let msg = ''
  if (typeof err === 'string') {
    msg = err
    code = (err.match(/errorCode["':\s]+(\d+)/) || [])[1] || ''
  } else if (err && typeof err === 'object') {
    code = String(err.errorCode ?? err.code ?? '')
    msg = err.errorMsg || err.msg || err.message || ''
  }
  if (code === '9048' || code === '9049') {
    return `萤石试用版并发/带宽已达上限（${code}）。请先在手机萤石云 App 退出其它设备的实时预览，再点“重连”；若仍失败，需到开放平台升级企业版套餐或为设备购买单通道并发。`
  }
  if (code === '5404') return '设备当前不在线，请检查摄像头网络后重试'
  if (code === '5507') return '该设备使用物联网卡，不支持开放平台取流，请更换普通网络'
  if (code === '5202' || code === '5011') return '设备视频已加密，请先在萤石云 App 或开放平台关闭视频加密'
  return msg || `取流失败${code ? `（错误码 ${code}）` : ''}`
}

function destroyPlayer(serial) {
  const p = players.get(serial)
  if (!p) return
  try {
    if (typeof p.destroy === 'function') p.destroy()
    else if (typeof p.stop === 'function') p.stop()
  } catch (e) {
    console.warn('销毁播放器失败', serial, e)
  }
  players.delete(serial)
}

async function initPlayer(dev) {
  const serial = dev.deviceSerial
  failed[serial] = ''
  ready[serial] = false
  destroyPlayer(serial)

  if (!dev.online) {
    failed[serial] = '设备离线'
    return
  }

  try {
    // 动态 import：避免管理端首屏加载体积过大
    const { EZUIKitPlayer } = await import('ezuikit-js')
    if (disposed) return
    const data = await getEzvizLive(serial)
    if (disposed || !document.getElementById(playerId(serial))) return

    const shell = document.getElementById(playerId(serial)).parentElement
    const width = Math.max(320, Math.floor(shell.clientWidth))
    const height = Math.round(width * 9 / 16)

    const player = new EZUIKitPlayer({
      id: playerId(serial),
      accessToken: data.accessToken,
      url: data.url,
      template: 'pcLive',
      width,
      height,
      muted: true,
      autoplay: true,
      handleSuccess: () => {
        ready[serial] = true
        failed[serial] = ''
      },
      handleError: (err) => {
        ready[serial] = false
        failed[serial] = formatStreamError(err)
      }
    })
    players.set(serial, player)
  } catch (e) {
    failed[serial] = e?.message || '取流失败'
  }
}

async function loadAll() {
  loading.value = true
  error.value = ''
  devices.value.forEach((d) => destroyPlayer(d.deviceSerial))
  players.clear()
  try {
    devices.value = await getEzvizDevices()
    // 只自动播放前 DEFAULT_LIVE_LIMIT 路，其余暂缓，避免触发试用版并发上限
    devices.value.forEach((dev, i) => {
      skipped[dev.deviceSerial] = i >= DEFAULT_LIVE_LIMIT
      ready[dev.deviceSerial] = false
      failed[dev.deviceSerial] = ''
    })
    await Promise.all(
      devices.value
        .filter((dev) => !skipped[dev.deviceSerial])
        .map((dev) => initPlayer(dev))
    )
  } catch (e) {
    error.value = e?.message || '摄像头列表加载失败'
  } finally {
    loading.value = false
  }
}

function retry(dev) {
  skipped[dev.deviceSerial] = false
  initPlayer(dev)
}

function loadOne(dev) {
  // 手动加载时，若已到上限则先停掉一路，保证不超并发
  const active = devices.value.filter(
    (d) => !skipped[d.deviceSerial] && players.has(d.deviceSerial)
  )
  if (active.length >= DEFAULT_LIVE_LIMIT) {
    const victim = active[active.length - 1]
    destroyPlayer(victim.deviceSerial)
    ready[victim.deviceSerial] = false
    failed[victim.deviceSerial] = ''
    skipped[victim.deviceSerial] = true
  }
  skipped[dev.deviceSerial] = false
  initPlayer(dev)
}

let resizeTimer = null
function onResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    devices.value.forEach((dev) => {
      if (ready[dev.deviceSerial]) initPlayer(dev)
    })
  }, 500)
}

onMounted(() => {
  loadAll()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  disposed = true
  clearTimeout(resizeTimer)
  window.removeEventListener('resize', onResize)
  devices.value.forEach((d) => destroyPlayer(d.deviceSerial))
  players.clear()
})
</script>

<style scoped>
.cameras { max-width: 1200px; margin: 0 auto; }
.cam-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem; }
.cam-head h1 { margin: 0 0 0.35rem; font-size: 1.4rem; }
.sub { margin: 0; color: var(--muted); font-size: 0.88rem; }
.actions { display: flex; gap: 0.5rem; }
.alert { padding: 0.85rem 1rem; margin-bottom: 1rem; border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c; border-radius: 10px; font-size: 0.88rem; }
.notice { padding: 0.7rem 1rem; margin-bottom: 1rem; border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 10px; font-size: 0.82rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 1rem; }
.camera-card { overflow: hidden; display: flex; flex-direction: column; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.9rem 1rem; }
.title-wrap { display: flex; align-items: center; gap: 0.6rem; min-width: 0; }
.title-wrap h2 { margin: 0; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { margin: 0.15rem 0 0; font-size: 0.75rem; color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; }
.dot.on { background: #16a34a; }
.dot.off { background: #9ca3af; }
.badge { padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; white-space: nowrap; }
.badge.ok { background: #dcfce7; color: #166534; }
.badge.bad { background: #f3f4f6; color: #4b5563; }
.player-shell { position: relative; width: 100%; aspect-ratio: 16 / 9; background: #0b1220; overflow: hidden; }
.player { width: 100%; height: 100%; }
.player-mask { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem; color: #cbd5e1; font-size: 0.82rem; background: rgba(11, 18, 32, 0.92); }
.player-mask.err { color: #fca5a5; padding: 1rem; text-align: center; line-height: 1.5; }
.player-mask.idle { color: #94a3b8; padding: 1rem; text-align: center; }
.spinner { width: 22px; height: 22px; border: 2px solid rgba(255,255,255,0.15); border-top-color: #5eead4; border-radius: 50%; animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.card-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.7rem 1rem; }
.hint { font-size: 0.75rem; color: var(--muted); }
.empty { padding: 2rem; color: var(--muted); text-align: center; }
.note { margin-top: 1.25rem; font-size: 0.78rem; color: var(--muted); }
</style>
