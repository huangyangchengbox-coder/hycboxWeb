/**
 * 书目清单生成脚本。
 * 扫描 BOOK_DIR（默认 D:/play_joy/book）下的 .pdf/.epub，
 * 从文件名清洗出 标题 / 作者 / 分类，写出 src/books/manifest.js。
 *
 * 书籍文件本体不进仓库，由开发中间件或 nginx 直接服务；
 * 重新扫描：node scripts/build-books-manifest.mjs
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const BOOK_DIR = process.env.BOOK_DIR || 'D:/play_joy/book'
const OUT_FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'books', 'manifest.js')

/** 分类关键词（按优先级，第一个命中的生效）。 */
const CATEGORY_RULES = [
  { id: 'dragonfly', name: '蜻蜓图鉴', icon: '🜲', color: '#22d3ee', keys: ['蜻蜓', '蜻蟌', '豆娘', 'Dragonflies'] },
  { id: 'insect', name: '昆虫自然', icon: '🐛', color: '#84cc16', keys: ['昆虫记', '昆虫', '大自然'] },
  { id: 'animal', name: '动物百科', icon: '🐼', color: '#f59e0b', keys: ['动物生活', '动物百科', 'DK'] },
  { id: 'tennis', name: '网球', icon: '🎾', color: '#d8f34a', keys: ['网球'] },
  { id: 'history', name: '历史漫画', icon: '📜', color: '#f43f5e', keys: ['历史是一群喵'] }
]

const CATEGORY_FALLBACK = { id: 'other', name: '其它', icon: '📖', color: '#94a3b8' }

/** 个别书籍的手动元数据修正（按文件名子串匹配）。 */
const MANUAL_FIXES = [
  { match: '昆虫记', author: '让-亨利·法布尔（Jean-Henri Fabre）' }
]

function categorize(title) {
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((k) => title.includes(k))) return rule
  }
  return CATEGORY_FALLBACK
}

/** 从文件名清洗标题与作者。文件名形如：
 *  《书名 (作者... ) (z-library.sk, 1lib.sk, z-lib.sk).pdf》
 */
function parseFileName(base) {
  let title = base
  let author = ''
  // 去掉 z-library 水印括号
  title = title.replace(/[(（][^()（）]*z-lib[^()（）]*[)）]/g, '').trim()
  // 依次尝试括号组：第一个能清洗出作者的生效（支持一层嵌套括号）
  const groupRe = /[(（]((?:[^()（）]|[(（][^()（）]*[)）]){2,80})[)）]/g
  let m
  while ((m = groupRe.exec(title))) {
    if (author) { title = title.slice(0, m.index); break }
    const cleaned = m[1]
      .trim()
      .split(/,\s*/)
      .map((s) => s.trim())
      .filter((s) => !/^(author|artist|editor|translator|译者|等|et al\.?)$/i.test(s)
        && !/^\d{4}$/.test(s)
        && !/^(套装|全\d+卷|共\d+册|\(?\s*etc\.?\s*\)?)/i.test(s))
    if (cleaned.length) {
      author = cleaned.slice(0, 3).join(' · ')
      title = title.slice(0, m.index)
    }
  }
  // 标题残留清理：卷数/套装等括号、空括号、多余空白
  title = title
    .replace(/[(（]\s*(etc\.?|套装[^)）]*|全\d+卷[^)）]*|共\d+册[^)）]*)\s*[)）]/gi, '')
    .replace(/[(（]\s*[)）]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s·-]+$/, '')
    .trim()
  if (!title) title = base
  return { title, author }
}

const files = readdirSync(BOOK_DIR)
  .filter((f) => /\.(pdf|epub)$/i.test(f))
  .map((name) => {
    const full = join(BOOK_DIR, name)
    const stat = statSync(full)
    const ext = name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'
    const base = name.replace(/\.(pdf|epub)$/i, '')
    const { title, author } = parseFileName(base)
    const fix = MANUAL_FIXES.find((fx) => base.includes(fx.match))
    const cat = categorize(title)
    return {
      id: `${ext}-${stat.mtimeMs.toFixed(0)}`,
      title,
      author: fix?.author || author,
      format: ext,
      sizeMB: Math.round(stat.size / 1048576),
      category: cat.id,
      fileName: name
    }
  })
  .sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title, 'zh'))

const code = `/**
 * 图书文献 · 书目清单（自动生成，勿手改）。
 * 由 scripts/build-books-manifest.mjs 扫描本地书库生成。
 * 文件通过 /book-files/<fileName> 访问（开发：vite 中间件；生产：nginx alias）。
 */
export const BOOK_SHELF = ${JSON.stringify(files, null, 2)}

export const BOOK_CATEGORIES = ${JSON.stringify(
  [...new Set(files.map((f) => f.category))].map((id) => {
    const rule = CATEGORY_RULES.find((r) => r.id === id) || CATEGORY_FALLBACK
    return { id: rule.id, name: rule.name, icon: rule.icon, color: rule.color }
  }),
  null,
  2
)}
`
mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, code, 'utf8')
console.log(`✓ ${files.length} 本书 → ${OUT_FILE}`)
for (const f of files) console.log(`  [${f.format}] ${f.sizeMB}MB ${f.title} — ${f.author || '（作者未标注）'}`)
