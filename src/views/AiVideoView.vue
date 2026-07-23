<template>
  <div class="page">
    <section class="card">
      <h2>视频 AI 生成</h2>
      <form @submit.prevent="onGenerate">
        <div class="form-group">
          <label>描述 prompt <span class="req">*</span></label>
          <textarea
            ref="promptEl"
            v-model.trim="form.prompt"
            placeholder="描述你想生成的视频内容…"
            required
            :disabled="submitting"
          />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>模型</label>
            <select v-model="form.model" :disabled="submitting">
              <option value="agnes-video-v2.0">agnes-video-v2.0</option>
            </select>
          </div>
          <div class="form-group">
            <label>时长 seconds</label>
            <select v-model="form.seconds" :disabled="submitting">
              <option value="4">4 秒</option>
              <option value="5">5 秒</option>
              <option value="8">8 秒</option>
              <option value="10">10 秒</option>
            </select>
          </div>
          <div class="form-group">
            <label>尺寸 size</label>
            <select v-model="form.size" :disabled="submitting">
              <option value="720x1280">720×1280（竖屏）</option>
              <option value="1280x720">1280×720（横屏）</option>
              <option value="1088x832">1088×832</option>
            </select>
          </div>
        </div>
        <button class="btn" type="submit" :class="{ 'is-busy': submitting }" :disabled="submitting">
          {{ submitting ? '提交中…' : '开始生成' }}
        </button>
        <p class="hint">提交后立即返回任务，后台生成；本页最多轮询 10 分钟，下次进入可看结果。</p>
        <p v-if="error" class="error-msg">{{ error }}</p>
      </form>
    </section>

    <section ref="historyEl" class="card history">
      <div class="history-head">
        <h2>历史记录</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingList || submitting" @click="loadHistory">刷新</button>
      </div>
      <p v-if="loadingList && !jobs.length" class="muted">加载中…</p>
      <p v-else-if="!jobs.length" class="muted">暂无记录</p>
      <div v-else class="video-list">
        <article
          v-for="job in jobs"
          :key="job.id"
          :class="['job-card', { 'is-entering': job.id === enteringId }]"
        >
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

    <TaskFlyBurst ref="flyRef" :text="flyText" />
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { createVideo, getJob, listJobs, mediaUrl, statusLabel } from '../api/aiMedia'
import { createJobPoller } from '../api/jobPoller'
import TaskFlyBurst from '../components/TaskFlyBurst.vue'

const form = reactive({
  prompt: '',
  model: 'agnes-video-v2.0',
  seconds: '5',
  size: '720x1280'
})

const submitting = ref(false)
const loadingList = ref(false)
const error = ref('')
const jobs = ref([])
const historyEl = ref(null)
const promptEl = ref(null)
const flyRef = ref(null)
const flyText = ref('')
const enteringId = ref('')
let enteringTimer = 0

const poller = createJobPoller(
  () => jobs.value,
  (id) => getJob(id),
  (next) => { jobs.value = next }
)

async function pushJobToList(job, previewText) {
  if (!job?.id) return
  flyText.value = previewText || job.prompt || '生成任务'
  await nextTick()
  await flyRef.value?.play(promptEl.value, historyEl.value)
  enteringId.value = job.id
  jobs.value = [job, ...jobs.value.filter((j) => j.id !== job.id)]
  clearTimeout(enteringTimer)
  enteringTimer = setTimeout(() => {
    enteringId.value = ''
  }, 700)
  await nextTick()
  historyEl.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

async function loadHistory() {
  loadingList.value = true
  try {
    const data = await listJobs('video')
    jobs.value = data?.list || []
    poller.start()
  } catch (e) {
    error.value = e.message
  } finally {
    loadingList.value = false
  }
}

async function onGenerate() {
  if (submitting.value) return
  if (!form.prompt) {
    error.value = '请输入描述'
    return
  }
  error.value = ''
  const promptSnapshot = form.prompt
  submitting.value = true
  try {
    const job = await createVideo({
      prompt: form.prompt,
      model: form.model,
      seconds: form.seconds,
      size: form.size
    })
    await pushJobToList(job, promptSnapshot)
    form.prompt = ''
    poller.start()
  } catch (e) {
    error.value = e.message || '提交失败'
    await loadHistory()
  } finally {
    submitting.value = false
  }
}

onMounted(loadHistory)
onUnmounted(() => {
  poller.stop()
  clearTimeout(enteringTimer)
})
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

.hint {
  margin: 0.75rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
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
