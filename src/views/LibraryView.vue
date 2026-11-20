<template>
  <div class="library">
    <!-- 左侧书架 -->
    <aside v-if="!current" class="shelf">
      <div class="brand">
        <span class="icon">📚</span>
        <div>
          <h1>图书文献</h1>
          <p class="sub">LIBRARY · {{ books.length }} 本 · {{ totalGB }} GB</p>
        </div>
      </div>

      <div class="filters">
        <input v-model.trim="keyword" class="search" type="text" placeholder="搜书名 / 作者…" />
        <div class="cats">
          <button
            type="button"
            class="chip"
            :class="{ on: categoryId === 'all' }"
            @click="categoryId = 'all'"
          >全部</button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            type="button"
            class="chip"
            :class="{ on: categoryId === cat.id }"
            :style="categoryId === cat.id ? { borderColor: cat.color, color: cat.color } : {}"
            @click="categoryId = cat.id"
          >{{ cat.icon }} {{ cat.name }}</button>
        </div>
        <div class="formats">
          <button type="button" class="chip sm" :class="{ on: formatId === 'all' }" @click="formatId = 'all'">全部格式</button>
          <button type="button" class="chip sm" :class="{ on: formatId === 'pdf' }" @click="formatId = 'pdf'">PDF</button>
          <button type="button" class="chip sm" :class="{ on: formatId === 'epub' }" @click="formatId = 'epub'">EPUB</button>
        </div>
      </div>

      <div class="cards">
        <button
          v-for="book in filtered"
          :key="book.id"
          type="button"
          class="card"
          @click="open(book)"
        >
          <div class="cover" :style="{ background: coverStyle(book) }">
            <span class="glyph">{{ catOf(book).icon }}</span>
            <span class="fmt">{{ book.format.toUpperCase() }}</span>
          </div>
          <div class="meta">
            <h3>{{ book.title }}</h3>
            <p class="author">{{ book.author || '佚名' }}</p>
            <p class="info">{{ catOf(book).name }} · {{ book.sizeMB }} MB</p>
          </div>
        </button>
        <p v-if="!filtered.length" class="empty">没有匹配的书</p>
      </div>

      <p class="foot">
        书籍经 <code>/book-files/</code> 流式读取（开发走 vite 中间件，线上由 nginx 静态服务提供，支持 Range 按需加载），文件不打包进站点仓库。
      </p>
    </aside>

    <!-- 详情 / 下载面板 -->
    <section v-else class="reader">
      <header class="bar">
        <button type="button" class="back" @click="close">← 书架</button>
        <div class="title">
          <h2>{{ current.title }}</h2>
          <p>{{ current.author || '佚名' }} · {{ current.format.toUpperCase() }} · {{ current.sizeMB }} MB</p>
        </div>
      </header>

      <div v-if="error" class="state error">{{ error }}</div>

      <div v-else class="download-panel">
        <div class="dl-cover" :style="{ background: coverStyle(current) }">
          <span class="glyph">{{ catOf(current).icon }}</span>
          <span class="fmt">{{ current.format.toUpperCase() }}</span>
        </div>

        <div class="dl-info">
          <h3>{{ current.title }}</h3>
          <p class="dl-author">{{ current.author || '佚名' }}</p>
          <dl class="dl-meta">
            <div><dt>分类</dt><dd>{{ catOf(current).name }}</dd></div>
            <div><dt>格式</dt><dd>{{ current.format.toUpperCase() }}</dd></div>
            <div><dt>大小</dt><dd>{{ current.sizeMB }} MB</dd></div>
          </dl>

          <div class="dl-actions">
            <a
              class="dl-btn primary"
              :href="bookUrl"
              :download="current.fileName"
              rel="noopener"
            >下载到本地</a>
            <button type="button" class="dl-btn" @click="copyLink">{{ copied ? '已复制 ✓' : '复制直链' }}</button>
            <a class="dl-btn ghost" :href="bookUrl" target="_blank" rel="noopener">新标签打开 ↗</a>
          </div>
          <p class="dl-hint">已下载原文件用本地阅读器打开。在线预览暂未开启。</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BOOK_CATEGORIES, BOOK_SHELF } from '../books/manifest.js'

const route = useRoute()
const router = useRouter()

const books = BOOK_SHELF
const categories = BOOK_CATEGORIES
const keyword = ref('')
const categoryId = ref('all')
const formatId = ref('all')
const current = ref(null)
const error = ref('')
const copied = ref(false)

const totalGB = computed(() => (books.reduce((s, b) => s + b.sizeMB, 0) / 1024).toFixed(1))

const filtered = computed(() => books.filter((b) => {
  if (categoryId.value !== 'all' && b.category !== categoryId.value) return false
  if (formatId.value !== 'all' && b.format !== formatId.value) return false
  const kw = keyword.value.toLowerCase()
  if (kw && !(`${b.title} ${b.author}`.toLowerCase().includes(kw))) return false
  return true
}))

const catOf = (book) => categories.find((c) => c.id === book.category)
  || { id: 'other', name: '其它', icon: '📖', color: '#94a3b8' }

const coverStyle = (book) => {
  const color = catOf(book).color
  return `linear-gradient(150deg, ${color}33, ${color}12 55%), linear-gradient(210deg, rgba(10,18,24,0.9), rgba(10,18,24,0.98))`
}

const bookUrl = computed(() => current.value
  ? `${import.meta.env.BASE_URL}book-files/${encodeURIComponent(current.value.fileName)}`
  : '')

// ---- 打开 / 关闭 ----

/** 先用 1 字节 Range 探测文件可达（比 HEAD 便宜，顺带验证 Range 支持）。 */
async function probe(url) {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } })
    return res.status === 206 || res.status === 200
  } catch {
    return false
  }
}

async function open(book) {
  current.value = book
  error.value = ''
  router.replace({ query: { ...route.query, book: book.id } })
  const ok = await probe(bookUrl.value)
  if (!ok) {
    error.value = '书籍文件不可达：文件经 /book-files/ 流式读取，请确认书籍目录存在；' +
      '开发环境需 vite dev server 运行，线上环境需书库已上传至服务器静态目录。'
  }
}

/** 复制直链，方便贴到下载工具里。 */
async function copyLink() {
  const url = new URL(bookUrl.value, window.location.origin).href
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch {
    window.prompt('复制下面的链接：', url)
  }
}

function close() {
  current.value = null
  error.value = ''
  const query = { ...route.query }
  delete query.book
  router.replace({ query })
}

// ---- 深链与生命周期 ----

onMounted(() => {
  const id = route.query.book
  const book = books.find((b) => b.id === id)
  if (book) open(book)
})

watch(() => route.query.book, (id) => {
  if (!id && current.value) {
    current.value = null
    error.value = ''
  }
})
</script>

<style scoped>
.library {
  position: fixed;
  inset: 0;
  display: flex;
  background: #0b1218;
  color: #d5ebe0;
}

/* ---- 书架 ---- */
.shelf {
  width: min(360px, 100%);
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 18px;
  gap: 12px;
  overflow: hidden;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.brand .icon { font-size: 30px; }
.brand h1 {
  margin: 0;
  font-size: 19px;
  color: #f2fbf2;
}
.brand .sub {
  margin: 2px 0 0;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(213, 235, 224, 0.55);
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.search {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  padding: 8px 11px;
  color: #e6f4ec;
  font-size: 13px;
  outline: none;
}
.search:focus { border-color: rgba(216, 243, 74, 0.5); }
.cats {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.formats {
  display: flex;
  gap: 5px;
}
.chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 5px 11px;
  color: #a9c4b6;
  font-size: 12px;
  cursor: pointer;
}
.chip.sm { padding: 4px 9px; font-size: 11px; }
.chip.on {
  background: rgba(216, 243, 74, 0.14);
  border-color: rgba(216, 243, 74, 0.55);
  color: #eaff8a;
}
.cards {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-content: start;
  padding-right: 2px;
}
.card {
  display: flex;
  flex-direction: column;
  text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 8px;
  cursor: pointer;
  color: inherit;
  transition: border-color 0.15s, transform 0.15s;
}
.card:hover {
  border-color: rgba(216, 243, 74, 0.45);
  transform: translateY(-2px);
}
.cover {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.glyph { font-size: 34px; }
.fmt {
  position: absolute;
  right: 6px;
  bottom: 6px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(0, 0, 0, 0.45);
  border-radius: 4px;
  padding: 2px 5px;
}
.meta h3 {
  margin: 8px 0 2px;
  font-size: 12.5px;
  line-height: 1.4;
  color: #e6f4ec;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.author {
  margin: 0;
  font-size: 10.5px;
  color: rgba(213, 235, 224, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.info {
  margin: 3px 0 0;
  font-size: 10px;
  color: rgba(213, 235, 224, 0.42);
}
.empty {
  grid-column: 1 / -1;
  text-align: center;
  color: rgba(213, 235, 224, 0.45);
  padding: 24px 0;
}
.foot {
  margin: 0;
  font-size: 10.5px;
  line-height: 1.6;
  color: rgba(213, 235, 224, 0.4);
}
.foot code { color: rgba(216, 243, 74, 0.75); }

/* ---- 阅读器 ---- */
.reader {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}
.back {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 6px 12px;
  color: #d5ebe0;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
}
.back:hover { border-color: rgba(216, 243, 74, 0.5); }
.title { flex: 1; min-width: 0; }
.title h2 {
  margin: 0;
  font-size: 15px;
  color: #f2fbf2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title p {
  margin: 1px 0 0;
  font-size: 11px;
  color: rgba(213, 235, 224, 0.55);
}
.tools {
  display: flex;
  align-items: center;
  gap: 6px;
}
.state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: rgba(213, 235, 224, 0.6);
  padding: 24px;
  text-align: center;
  line-height: 1.7;
}
.state.error {
  color: #fda4af;
  max-width: 520px;
  margin: 0 auto;
}

/* ---- 下载面板 ---- */
.download-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 28px;
  flex-wrap: wrap;
}

.dl-cover {
  position: relative;
  width: 160px;
  height: 224px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  flex: 0 0 auto;
}

.dl-cover .glyph {
  font-size: 52px;
  opacity: 0.9;
}

.dl-cover .fmt {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #eaff8a;
}

.dl-info {
  max-width: 420px;
  min-width: 260px;
}

.dl-info h3 {
  margin: 0 0 4px;
  font-size: 20px;
  line-height: 1.35;
  color: #f2fbf2;
}

.dl-author {
  margin: 0 0 14px;
  font-size: 12.5px;
  color: rgba(213, 235, 224, 0.6);
}

.dl-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 22px;
  margin: 0 0 18px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dl-meta dt {
  font-size: 10.5px;
  color: rgba(213, 235, 224, 0.5);
}

.dl-meta dd {
  margin: 1px 0 0;
  font-size: 13px;
  color: #f2fbf2;
}

.dl-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.dl-btn {
  display: inline-block;
  padding: 9px 16px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #d5ebe0;
  font-size: 13px;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.dl-btn:hover {
  border-color: rgba(216, 243, 74, 0.55);
  background: rgba(216, 243, 74, 0.1);
}

.dl-btn.primary {
  background: #d8f34a;
  border-color: #d8f34a;
  color: #10241b;
  font-weight: 700;
}

.dl-btn.primary:hover {
  background: #e8ff6e;
}

.dl-btn.ghost {
  color: rgba(213, 235, 224, 0.72);
}

.dl-hint {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: rgba(213, 235, 224, 0.45);
}

@media (max-width: 760px) {
  .shelf { width: 100%; border-right: 0; }
  .cards { grid-template-columns: 1fr 1fr; }
  .download-panel { gap: 18px; padding: 18px; }
  .dl-cover { width: 110px; height: 154px; }
  .dl-cover .glyph { font-size: 36px; }
}
</style>
