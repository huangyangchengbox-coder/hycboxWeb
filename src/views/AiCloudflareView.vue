<template>
  <div class="cf-page">
    <section class="hero card">
      <div class="hero-copy">
        <p class="eyebrow">Cloudflare · Workers AI</p>
        <h1>Workers AI 对话</h1>
        <p class="lead">
          通过 Cloudflare REST API 调用账户内模型。密钥仅保存在服务端，前端不落 Token。
        </p>
        <a
          class="docs"
          href="https://developers.cloudflare.com/workers-ai/get-started/rest-api/"
          target="_blank"
          rel="noopener noreferrer"
        >
          查看官方 Quick Start →
        </a>
      </div>
      <div class="hero-meta">
        <div class="meta-item">
          <span class="k">状态</span>
          <span :class="['v', configured ? 'ok' : 'bad']">{{ configured ? '已配置' : '未配置' }}</span>
        </div>
        <div class="meta-item">
          <span class="k">模型</span>
          <select v-model="model" :disabled="sending || !models.length">
            <option v-for="m in models" :key="m.id" :value="m.id">{{ m.label }}</option>
          </select>
        </div>
      </div>
    </section>

    <section class="chat card">
      <div ref="listEl" class="messages">
        <div v-if="!messages.length" class="empty">
          <p>从下方输入开始对话</p>
          <p class="hint">示例：Where did the phrase Hello World come from?</p>
        </div>
        <article
          v-for="(m, i) in messages"
          :key="i"
          :class="['bubble', m.role]"
        >
          <header>{{ m.role === 'user' ? '你' : 'Workers AI' }}</header>
          <pre>{{ m.content }}</pre>
        </article>
        <article v-if="sending" class="bubble assistant pending">
          <header>Workers AI</header>
          <p>思考中…</p>
        </article>
      </div>

      <form class="composer" @submit.prevent="onSend">
        <textarea
          v-model.trim="draft"
          rows="3"
          placeholder="输入问题，Enter 发送 · Shift+Enter 换行"
          :disabled="sending || !configured"
          @keydown="onKeydown"
        />
        <div class="actions">
          <button type="button" class="btn btn-secondary btn-sm" :disabled="sending || !messages.length" @click="onClear">
            清空
          </button>
          <button class="btn" type="submit" :class="{ 'is-busy': sending }" :disabled="sending || !configured || !draft">
            {{ sending ? '生成中…' : '发送' }}
          </button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-else-if="!configured" class="error-msg">
          服务端未配置 HYCBOX_CF_ACCOUNT_ID / HYCBOX_CF_API_TOKEN
        </p>
      </form>
    </section>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { chatCloudflareAi, getCloudflareAiStatus } from '../api/cloudflareAi'

const configured = ref(false)
const models = ref([])
const model = ref('@cf/meta/llama-3.1-8b-instruct')
const draft = ref('')
const messages = ref([])
const sending = ref(false)
const error = ref('')
const listEl = ref(null)

async function loadStatus() {
  error.value = ''
  try {
    const data = await getCloudflareAiStatus()
    configured.value = !!data?.configured
    models.value = data?.models || []
    if (models.value.length && !models.value.some((m) => m.id === model.value)) {
      model.value = models.value[0].id
    }
  } catch (e) {
    error.value = e.message || '加载状态失败'
  }
}

async function scrollBottom() {
  await nextTick()
  const el = listEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function onClear() {
  messages.value = []
  error.value = ''
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

async function onSend() {
  if (sending.value || !configured.value || !draft.value) return
  const text = draft.value
  draft.value = ''
  error.value = ''
  messages.value = [...messages.value, { role: 'user', content: text }]
  await scrollBottom()
  sending.value = true
  try {
    const payloadMessages = messages.value.map((m) => ({
      role: m.role,
      content: m.content
    }))
    const data = await chatCloudflareAi({
      model: model.value,
      messages: payloadMessages
    })
    messages.value = [
      ...messages.value,
      { role: 'assistant', content: data?.response || '(空回复)' }
    ]
    await scrollBottom()
  } catch (e) {
    error.value = e.message || '调用失败'
    // 失败时保留用户输入便于重试
    draft.value = text
    messages.value = messages.value.slice(0, -1)
  } finally {
    sending.value = false
  }
}

onMounted(loadStatus)
</script>

<style scoped>
.cf-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  max-width: 960px;
}

.hero {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 1.25rem;
  background:
    radial-gradient(ellipse 80% 70% at 0% 0%, rgba(246, 130, 31, 0.14), transparent 55%),
    linear-gradient(160deg, #fffaf3 0%, #ffffff 48%, #f8fafc 100%);
  border: 1px solid #f1e4d4;
}

.eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c2410c;
  font-weight: 700;
}

.hero h1 {
  margin: 0 0 0.5rem;
  font-size: 1.55rem;
  letter-spacing: -0.02em;
  color: #1c1917;
}

.lead {
  margin: 0 0 0.75rem;
  color: #57534e;
  line-height: 1.55;
  font-size: 0.92rem;
}

.docs {
  color: #ea580c;
  font-weight: 600;
  font-size: 0.875rem;
}

.docs:hover {
  text-decoration: underline;
}

.hero-meta {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  justify-content: center;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #f5e6d3;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.meta-item .k {
  font-size: 0.72rem;
  color: #78716c;
}

.meta-item .v.ok {
  color: #15803d;
  font-weight: 700;
}

.meta-item .v.bad {
  color: #b91c1c;
  font-weight: 700;
}

.meta-item select {
  width: 100%;
}

.chat {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  padding: 0;
  overflow: hidden;
}

.messages {
  flex: 1;
  overflow: auto;
  padding: 1.1rem 1.15rem;
  background:
    linear-gradient(#f8fafc, #f8fafc),
    repeating-linear-gradient(
      -12deg,
      transparent,
      transparent 11px,
      rgba(15, 23, 42, 0.015) 11px,
      rgba(15, 23, 42, 0.015) 12px
    );
  max-height: 56vh;
}

.empty {
  text-align: center;
  color: #78716c;
  padding: 3rem 1rem;
}

.empty .hint {
  margin-top: 0.5rem;
  font-size: 0.82rem;
  color: #a8a29e;
}

.bubble {
  max-width: 86%;
  margin-bottom: 0.85rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: #fff;
}

.bubble header {
  font-size: 0.72rem;
  font-weight: 700;
  color: #78716c;
  margin-bottom: 0.35rem;
}

.bubble pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.92rem;
  line-height: 1.55;
  color: #1c1917;
}

.bubble.user {
  margin-left: auto;
  background: #fff7ed;
  border-color: #fed7aa;
}

.bubble.assistant {
  margin-right: auto;
  background: #fff;
}

.bubble.pending {
  opacity: 0.75;
}

.composer {
  border-top: 1px solid var(--border);
  padding: 0.9rem 1rem 1rem;
  background: #fff;
}

.composer textarea {
  width: 100%;
  resize: vertical;
  min-height: 72px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.65rem;
}

@media (max-width: 800px) {
  .hero {
    grid-template-columns: 1fr;
  }
}
</style>
