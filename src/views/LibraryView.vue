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
        书籍文件位于本地书库（BOOK_DIR），经 <code>/book-files/</code> 流式读取，不打包进站点仓库。
      </p>
    </aside>

    <!-- 阅读器 -->
    <section v-else class="reader">
      <header class="bar">
        <button type="button" class="back" @click="close">← 书架</button>
        <div class="title">
          <h2>{{ current.title }}</h2>
          <p>{{ current.author || '佚名' }} · {{ current.format.toUpperCase() }} · {{ current.sizeMB }} MB</p>
        </div>
        <div class="tools">
          <template v-if="current.format === 'epub'">
            <select v-if="toc.length" class="toc" @change="jumpTo($event.target.value)">
              <option value="">目录…</option>
              <option v-for="item in toc" :key="item.href" :value="item.href">{{ item.label.trim() }}</option>
            </select>
            <button type="button" @click="fontSizeDown">A−</button>
            <button type="button" @click="fontSizeUp">A+</button>
            <button type="button" @click="epubPrev">上一页</button>
            <button type="button" @click="epubNext">下一页</button>
            <span v-if="progress" class="progress">{{ Math.round(progress * 100) }}%</span>
          </template>
          <a v-if="current.format === 'pdf'" class="ext" :href="bookUrl" target="_blank" rel="noopener">新标签打开 ↗</a>
        </div>
      </header>

      <div v-if="error" class="state error">{{ error }}</div>

      <!-- PDF：浏览器原生查看器（支持 Range 按需加载大部头） -->
      <iframe
        v-else-if="current.format === 'pdf' && ready"
        class="pdf-frame"
        :src="bookUrl"
        title="PDF 阅读器"
      ></iframe>

      <!-- EPUB：epub.js 渲染 -->
      <div v-else-if="current.format === 'epub' && ready" class="epub-host" ref="epubHost"></div>

      <div v-else class="state">加载中…</div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
const ready = ref(false)
const error = ref('')
const epubHost = ref(null)
const toc = ref([])
const progress = ref(0)

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

let epubBook = null
let epubRendition = null
let epubFontSize = 100

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
  ready.value = false
  error.value = ''
  progress.value = 0
  toc.value = []
  router.replace({ query: { ...route.query, book: book.id } })
  const ok = await probe(bookUrl.value)
  if (!ok) {
    error.value = '书籍文件不可达：本页面通过本地书库中间件（/book-files/）读取文件，' +
      '请确认书籍目录存在且 dev server 正在运行；生产环境需在 nginx 配置对应的静态目录。'
    return
  }
  if (book.format === 'epub') {
    if (book.sizeMB > 150
      && !window.confirm(`《${book.title}》有 ${book.sizeMB} MB，EPUB 需整体载入内存，打开可能需要等待且占用较大。继续？`)) {
      close()
      return
    }
    await openEpub()
  } else {
    ready.value = true
  }
}

async function openEpub() {
  try {
    const ePub = (await import('epubjs')).default
    epubBook = ePub(bookUrl.value)
    await epubBook.ready
    const nav = epubBook.navigation
    toc.value = nav ? (nav.toc || []) : []
    epubRendition = epubBook.renderTo(epubHost.value, {
      width: '100%',
      height: '100%',
      spread: 'auto'
    })
    epubRendition.themes.fontSize(`${epubFontSize}%`)
    epubRendition.on('relocated', (loc) => {
      if (loc && loc.start) progress.value = loc.start.percentage || 0
    })
    await epubRendition.display()
    ready.value = true
  } catch (e) {
    console.error(e)
    error.value = `EPUB 打开失败：${e.message || e}`
  }
}

function close() {
  destroyEpub()
  current.value = null
  ready.value = false
  error.value = ''
  const query = { ...route.query }
  delete query.book
  router.replace({ query })
}

function destroyEpub() {
  try { epubRendition?.destroy() } catch { /* ignore */ }
  try { epubBook?.destroy() } catch { /* ignore */ }
  epubRendition = null
  epubBook = null
  toc.value = []
}

// ---- EPUB 工具 ----

function epubNext() { epubRendition?.next() }
function epubPrev() { epubRendition?.prev() }
function jumpTo(href) { if (href) epubRendition?.display(href) }
function fontSizeUp() {
  epubFontSize = Math.min(180, epubFontSize + 10)
  epubRendition?.themes.fontSize(`${epubFontSize}%`)
}
function fontSizeDown() {
  epubFontSize = Math.max(70, epubFontSize - 10)
  epubRendition?.themes.fontSize(`${epubFontSize}%`)
}

// ---- 深链与生命周期 ----

onMounted(() => {
  const id = route.query.book
  const book = books.find((b) => b.id === id)
  if (book) open(book)
})

watch(() => route.query.book, (id) => {
  if (!id && current.value) {
    destroyEpub()
    current.value = null
    ready.value = false
  }
})

function onKey(event) {
  if (!current.value || current.value.format !== 'epub') return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  if (event.key === 'ArrowRight') { event.preventDefault(); epubNext() }
  if (event.key === 'ArrowLeft') { event.preventDefault(); epubPrev() }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  destroyEpub()
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
.tools button,
.tools .ext {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  padding: 5px 10px;
  color: #d5ebe0;
  cursor: pointer;
  font-size: 12.5px;
  text-decoration: none;
}
.tools button:hover,
.tools .ext:hover { border-color: rgba(216, 243, 74, 0.5); }
.tools .toc {
  max-width: 180px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 7px;
  padding: 5px 7px;
  color: #d5ebe0;
  font-size: 12px;
}
.progress {
  font-size: 12px;
  color: #eaff8a;
  min-width: 38px;
  text-align: right;
}
.pdf-frame {
  flex: 1;
  border: 0;
  background: #1a1f26;
}
.epub-host {
  flex: 1;
  min-height: 0;
  background: #f5f2ea;
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

@media (max-width: 760px) {
  .shelf { width: 100%; border-right: 0; }
  .cards { grid-template-columns: 1fr 1fr; }
}
</style>
