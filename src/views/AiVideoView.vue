<template>
  <div class="page">
    <section class="card">
      <h2>视频 AI 生成</h2>
      <form @submit.prevent="onGenerate">
        <div class="form-group">
          <label>描述 prompt <span class="req">*</span></label>
          <textarea v-model.trim="form.prompt" placeholder="描述你想生成的视频内容…" required />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>模型</label>
            <select v-model="form.model">
              <option value="agnes-video-v2.0">agnes-video-v2.0</option>
            </select>
          </div>
          <div class="form-group">
            <label>时长 seconds</label>
            <select v-model="form.seconds">
              <option value="4">4 秒</option>
              <option value="5">5 秒</option>
              <option value="8">8 秒</option>
              <option value="10">10 秒</option>
            </select>
          </div>
          <div class="form-group">
            <label>尺寸 size</label>
            <select v-model="form.size">
              <option value="720x1280">720×1280（竖屏）</option>
              <option value="1280x720">1280×720（横屏）</option>
              <option value="1088x832">1088×832</option>
            </select>
          </div>
        </div>
        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? '提交中…' : '开始生成' }}
        </button>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </section>

    <section class="card history">
      <div class="history-head">
        <h2>历史记录</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingList" @click="loadHistory">刷新</button>
      </div>
      <p v-if="loadingList && !jobs.length" class="muted">加载中…</p>
      <p v-else-if="!jobs.length" class="muted">暂无记录</p>
      <div v-else class="video-list">
        <article v-for="job in jobs" :key="job.id" class="job-card">
          <div class="player-wrap">
            <video
              v-if="mediaUrl(job) && job.status === 'succeeded'"
              :src="mediaUrl(job)"
              controls
              preload="metadata"
            />
            <div v-else class="player-placeholder">{{ statusLabel(job.status) }}</div>
          </div>
          <div class="job-meta">
            <span :class="['status-tag', job.status]">{{ statusLabel(job.status) }}</span>
            <p class="prompt">{{ job.prompt }}</p>
            <p class="detail">
              {{ job.model }} · {{ job.reqSeconds || form.seconds }}s · {{ job.reqSize || form.size }}
            </p>
            <p class="time">{{ job.createdAt || '-' }}</p>
            <p v-if="job.errorMsg" class="error-msg">{{ job.errorMsg }}</p>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import {
  createVideo,
  getJob,
  isRunning,
  listJobs,
  mediaUrl,
  refreshVideo,
  statusLabel
} from '../api/aiMedia'

const form = reactive({
  prompt: '',
  model: 'agnes-video-v2.0',
  seconds: '5',
  size: '720x1280'
})

const loading = ref(false)
const loadingList = ref(false)
const error = ref('')
const jobs = ref([])
let pollTimer = null

async function loadHistory() {
  loadingList.value = true
  try {
    const data = await listJobs('video')
    jobs.value = data?.list || []
    schedulePoll()
  } catch (e) {
    error.value = e.message
  } finally {
    loadingList.value = false
  }
}

function schedulePoll() {
  clearPoll()
  const running = jobs.value.filter((j) => isRunning(j.status))
  if (!running.length) return
  pollTimer = setInterval(() => pollRunning(running.map((j) => j.id)), 5000)
}

function clearPoll() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

async function pollRunning(ids) {
  for (const id of ids) {
    const idx = jobs.value.findIndex((j) => j.id === id)
    if (idx < 0 || !isRunning(jobs.value[idx].status)) continue
    try {
      let updated
      try {
        updated = await refreshVideo(id)
      } catch {
        updated = await getJob(id)
      }
      if (updated) {
        jobs.value[idx] = updated
      }
    } catch {
      /* 轮询失败忽略，下次再试 */
    }
  }
  if (!jobs.value.some((j) => isRunning(j.status))) {
    clearPoll()
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
    await createVideo({
      prompt: form.prompt,
      model: form.model,
      seconds: form.seconds,
      size: form.size
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
onUnmounted(clearPoll)
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

.video-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.job-card {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
}

@media (max-width: 768px) {
  .job-card {
    grid-template-columns: 1fr;
  }
}

.player-wrap {
  background: #111;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-wrap video {
  width: 100%;
  max-height: 280px;
}

.player-placeholder {
  color: #cbd5e1;
  font-size: 0.875rem;
}

.job-meta {
  padding: 0.75rem 0.75rem 0.75rem 0;
}

.prompt {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.875rem;
}

.detail,
.time {
  margin: 0.15rem 0;
  font-size: 0.75rem;
  color: var(--muted);
}
</style>
