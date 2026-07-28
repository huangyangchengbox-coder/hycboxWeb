<template>
  <div class="page">
    <section class="card">
      <div class="head">
        <div>
          <h2>小程序首页入口</h2>
          <p class="sub">控制用户端「备忘录」首页是否显示业务入口；与小程序管理员开关共用同一配置。</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="loading || saving" @click="load">
          刷新
        </button>
      </div>

      <p v-if="loading" class="muted">加载中…</p>
      <p v-else-if="error" class="error-msg">{{ error }}</p>

      <ul v-else class="entry-list">
        <li v-for="item in entries" :key="item.key" class="entry-row">
          <div class="entry-main">
            <div class="entry-title">{{ item.title }}</div>
            <div class="entry-desc">{{ item.desc }}</div>
          </div>
          <label class="switch" :class="{ disabled: saving }">
            <input
              type="checkbox"
              :checked="form[item.key]"
              :disabled="saving"
              @change="onToggle(item.key, $event.target.checked)"
            />
            <span class="slider" />
          </label>
        </li>
      </ul>

      <p v-if="!loading && updatedAt" class="foot muted">最近更新：{{ updatedAt }}</p>
      <p v-if="toast" class="toast">{{ toast }}</p>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getHubEntries, updateHubEntries } from '../api/hubEntries'

const entries = [
  { key: 'flash', title: '小区闪送', desc: '邻里相间，闪电配送' },
  { key: 'express', title: '物流中国', desc: '快速记录，全国发货' },
  { key: 'village', title: '村村送', desc: '选点定位，上门配送' }
]

const form = reactive({
  flash: false,
  express: false,
  village: false
})

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const toast = ref('')
const updatedAt = ref('')
let toastTimer = 0

async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await getHubEntries()
    applyData(data)
  } catch (err) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function applyData(data) {
  if (!data) return
  form.flash = !!data.flash
  form.express = !!data.express
  form.village = !!data.village
  updatedAt.value = data.updatedAt || ''
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 1800)
}

async function onToggle(key, value) {
  const prev = form[key]
  form[key] = value
  saving.value = true
  error.value = ''
  try {
    const data = await updateHubEntries({ [key]: value })
    applyData(data)
    showToast(value ? `已显示「${labelOf(key)}」` : `已隐藏「${labelOf(key)}」`)
  } catch (err) {
    form[key] = prev
    error.value = err?.message || '保存失败'
  } finally {
    saving.value = false
  }
}

function labelOf(key) {
  return entries.find((e) => e.key === key)?.title || key
}

onMounted(load)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

h2 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
}

.sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  max-width: 36rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border);
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-title {
  font-weight: 600;
}

.entry-desc {
  margin-top: 0.2rem;
  font-size: 0.875rem;
  color: var(--muted);
}

.switch {
  position: relative;
  display: inline-block;
  width: 2.75rem;
  height: 1.55rem;
  flex-shrink: 0;
  cursor: pointer;
}

.switch.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: #d1d5db;
  border-radius: 999px;
  transition: background 0.15s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 1.2rem;
  height: 1.2rem;
  left: 0.18rem;
  top: 0.175rem;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.15s;
}

.switch input:checked + .slider {
  background: var(--accent);
}

.switch input:checked + .slider::before {
  transform: translateX(1.15rem);
}

.foot {
  margin: 1rem 0 0;
  font-size: 0.85rem;
}

.muted {
  color: var(--muted);
}

.error-msg {
  color: var(--danger);
  font-size: 0.9rem;
}

.toast {
  margin: 0.75rem 0 0;
  font-size: 0.9rem;
  color: var(--accent-dark);
}
</style>
