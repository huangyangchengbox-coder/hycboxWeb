<template>
  <div class="page">
    <section class="card">
      <h2>图片 AI 生成</h2>
      <form @submit.prevent="onGenerate">
        <div class="form-group">
          <label>描述 prompt <span class="req">*</span></label>
          <textarea v-model.trim="form.prompt" placeholder="描述你想生成的图片内容…" required />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>模型</label>
            <select v-model="form.model">
              <option value="agnes-image-2.0-flash">agnes-image-2.0-flash</option>
              <option value="agnes-image-2.1-flash">agnes-image-2.1-flash</option>
            </select>
          </div>
          <div class="form-group">
            <label>尺寸 size</label>
            <select v-model="form.size">
              <option value="512x512">512×512</option>
              <option value="1024x1024">1024×1024</option>
              <option value="1024x1792">1024×1792</option>
              <option value="1792x1024">1792×1024</option>
            </select>
          </div>
          <div class="form-group">
            <label>数量 n</label>
            <select v-model.number="form.n">
              <option :value="1">1</option>
              <option :value="2">2</option>
            </select>
          </div>
        </div>
        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '生成中…' : '开始生成' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </section>

    <section class="card history">
      <div class="history-head">
        <h2>历史记录</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingList" @click="loadHistory">刷新</button>
      </div>
      <p v-if="loadingList" class="muted">加载中…</p>
      <p v-else-if="!jobs.length" class="muted">暂无记录</p>
      <div v-else class="gallery">
        <article v-for="job in jobs" :key="job.id" class="job-card">
          <div class="thumb-wrap">
            <img v-if="mediaUrl(job)" :src="mediaUrl(job)" :alt="job.prompt" loading="lazy" />
            <div v-else class="thumb-placeholder">{{ statusLabel(job.status) }}</div>
          </div>
          <div class="job-meta">
            <span :class="['status-tag', job.status]">{{ statusLabel(job.status) }}</span>
            <p class="prompt">{{ job.prompt }}</p>
            <p class="detail">{{ job.model }} · {{ job.reqSize || form.size }} · n={{ job.reqN ?? 1 }}</p>
            <p class="time">{{ job.createdAt || '-' }}</p>
            <p v-if="job.errorMsg" class="error-msg">{{ job.errorMsg }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { createImage, listJobs, mediaUrl, statusLabel } from '../api/aiMedia'

const form = reactive({
  prompt: '',
  model: 'agnes-image-2.0-flash',
  size: '1024x1024',
  n: 1
})

const loading = ref(false)
const loadingList = ref(false)
const error = ref('')
const jobs = ref([])

async function loadHistory() {
  loadingList.value = true
  try {
    const data = await listJobs('image')
    jobs.value = data?.list || []
  } catch (e) {
    error.value = e.message
  } finally {
    loadingList.value = false
  }
}

async function onGenerate() {
  if (!form.prompt) {
    error.value = '请输入描述'
    return
  }
  error.value = ''
  loading.value = true
  try {
    await createImage({
      prompt: form.prompt,
      model: form.model,
      size: form.size,
      n: form.n
    })
    form.prompt = ''
    await loadHistory()
  } catch (e) {
    error.value = e.message || '生成失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.req {
  color: var(--danger);
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.history-head h2 {
  margin: 0;
}

.muted {
  color: var(--muted);
  font-size: 0.9rem;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.job-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
}

.thumb-wrap {
  aspect-ratio: 1;
  background: #eef2f1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-placeholder {
  color: var(--muted);
  font-size: 0.875rem;
}

.job-meta {
  padding: 0.75rem;
}

.prompt {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.875rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.detail,
.time {
  margin: 0.15rem 0;
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
