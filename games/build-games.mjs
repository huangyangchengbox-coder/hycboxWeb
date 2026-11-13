/**
 * 游戏厅的构建脚本。
 *
 * 两类来源：
 *  1) games/<id>/src + index 模板 —— 用 esbuild 打包成一个内联 HTML（原 claude-opus 三个游戏）。
 *  2) 外部单文件 demo —— 从各处的 HTML 抽出来，把 CDN 上的 three 换成本地依赖再内联。
 *
 * 输出到 public/minigames/<id>/，随 Vite 一起发布。
 * 注意：输出目录不能叫 public/games，否则和前端路由 /games 撞车，nginx 会返回 403。
 *
 * 用法：node games/build-games.mjs [--dev]
 */
import * as esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outRoot = path.join(root, 'public', 'minigames')
const dev = process.argv.includes('--dev')

const DEMO_ROOT = 'D:/codes/network'
const PLAY_ROOT = 'D:/play_joy'

/* ---------------- 工具 ---------------- */

function writeOut(id, html, extra = []) {
  const outDir = path.join(outRoot, id)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  for (const [rel, from] of extra) {
    const target = path.join(outDir, rel)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    const stat = fs.statSync(from)
    if (stat.isDirectory()) fs.cpSync(from, target, { recursive: true })
    else fs.copyFileSync(from, target)
  }
  const size = extra.reduce((sum, [rel]) => {
    const p = path.join(outDir, rel)
    const stat = fs.statSync(p)
    return sum + (stat.isDirectory() ? dirSize(p) : stat.size)
  }, html.length)
  console.log(`${id.padEnd(24)} ${(size / 1024 / 1024).toFixed(2)} MB`)
}

function dirSize(dir) {
  let total = 0
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    total += entry.isDirectory() ? dirSize(p) : fs.statSync(p).size
  }
  return total
}

/** 把 HTML 里的 importmap + module script 换成打包后的单段 module script。 */
async function bundleHtmlModule(html, { entryName = 'demo', alias = {} } = {}) {
  const importmapRe = /<script\s+type="importmap"[^>]*>[\s\S]*?<\/script>\s*/i
  const moduleRe = /<script\s+type="module"[^>]*>([\s\S]*?)<\/script>/i
  const moduleMatch = html.match(moduleRe)
  if (!moduleMatch) throw new Error('找不到 module script')

  let code = moduleMatch[1]
  // 外部 URL 的 three / addons 换成裸模块名，交给 esbuild 从本地 node_modules 解析
  code = code
    .replace(/from\s+['"]https:\/\/[^'"]*\/build\/three\.module\.js['"]/g, "from 'three'")
    .replace(/import\s+\*\s+as\s+THREE\s+from\s+['"]https:\/\/[^'"]*\/build\/three\.module\.js['"]/g, "import * as THREE from 'three'")
    .replace(/from\s+['"]https:\/\/[^'"]*\/examples\/jsm\/([^'"]+)['"]/g, "from 'three/addons/$1'")
    .replace(/from\s+['"]https:\/\/unpkg\.com\/three@[^'"]*\/examples\/jsm\/([^'"]+)['"]/g, "from 'three/addons/$1'")

  const tmp = path.join(root, 'games', `.tmp-${entryName}.js`)
  fs.writeFileSync(tmp, code)
  try {
    const result = await esbuild.build({
      entryPoints: [tmp],
      bundle: true,
      format: 'esm',
      minify: !dev,
      write: false,
      // 部分 demo 用了顶层 await，需要 es2022
      target: ['es2022'],
      legalComments: 'none',
      logLevel: 'warning',
      absWorkingDir: root,
      alias
    })
    const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
    return html
      .replace(importmapRe, '')
      .replace(moduleRe, () => `<script type="module">${js}</script>`)
  } finally {
    fs.rmSync(tmp, { force: true })
  }
}

/** 把 CDN 上的 three r128 全局脚本换成本地 vendor 文件。 */
function localizeR128(html) {
  const map = [
    ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', './vendor/three.min.js'],
    ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/', './vendor/examples/js/']
  ]
  let out = html
  for (const [from, to] of map) out = out.split(from).join(to)
  return out
}

/** 把 Tailwind CDN 换成本地保存的浏览器版，避免国内访问不了 cdn.tailwindcss.com。 */
function localizeTailwind(html) {
  return html.split('https://cdn.tailwindcss.com').join('./vendor/tailwind.js')
}

/**
 * r128 的本地依赖：目录里 build/three.min.js 摊平成 vendor/three.min.js，
 * 因为 demo 里写的是 <script src="./vendor/three.min.js">。
 */
function r128VendorExtra() {
  const base = path.join(here, 'vendor', 'three-r128')
  return [
    ['vendor/three.min.js', path.join(base, 'build', 'three.min.js')],
    ['vendor/examples', path.join(base, 'examples')]
  ]
}

function tailwindVendorExtra() {
  return [['vendor/tailwind.js', path.join(here, 'vendor', 'fur-ui', 'tailwind.js')]]
}

/* ---------------- 1) 原三个游戏（模板 + esbuild） ---------------- */

const TEMPLATED = [
  {
    id: 'pelican-bike',
    entry: path.join(here, 'pelican-bike', 'src', 'main.js'),
    template: path.join(here, 'pelican-bike', 'index.template.html'),
    inject(html, js) {
      return html.replace('<!--OG_IMAGE-->', '').replace('/*APP_JS*/', () => js)
    }
  },
  {
    id: 'cf-transport-ship',
    entry: path.join(here, 'cf-transport-ship', 'src', 'main.js'),
    template: path.join(here, 'cf-transport-ship', 'src', 'index.html'),
    inject(html, js) {
      const css = fs.readFileSync(path.join(here, 'cf-transport-ship', 'src', 'style.css'), 'utf8')
      return html.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js)
    }
  },
  {
    id: 'qq-speed',
    entry: path.join(here, 'qq-speed', 'src', 'main.js'),
    template: path.join(here, 'qq-speed', 'src', 'index.html'),
    inject(html, js) {
      return html.replace('<!--APP_SCRIPT-->', () => `<script>${js}</script>`)
    }
  }
]

async function buildTemplated(game) {
  const result = await esbuild.build({
    entryPoints: [game.entry],
    bundle: true,
    format: 'iife',
    minify: !dev,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'warning',
    absWorkingDir: root
  })
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
  const html = game.inject(fs.readFileSync(game.template, 'utf8'), js)
  writeOut(game.id, html)
}

/* ---------------- 2) 外部 demo：需要重新打包的 module HTML ---------------- */

const MODULE_DEMOS = [
  { id: 'animal-building', src: `${DEMO_ROOT}/animal_3d_html/3d-building.html` },
  { id: 'animal-lab', src: `${DEMO_ROOT}/animal_3d_html/Animal-v0.html` },
  { id: 'animal-deer', src: `${DEMO_ROOT}/animal_3d_html/deer_梅花鹿.html` },
  { id: 'animal-elephant', src: `${DEMO_ROOT}/animal_3d_html/elephant_亚洲象.html` },
  { id: 'animal-giraffe', src: `${DEMO_ROOT}/animal_3d_html/giraffe_长颈鹿.html` },
  { id: 'animal-lion', src: `${DEMO_ROOT}/animal_3d_html/lion_雄狮.html` },
  { id: 'animal-panda', src: `${DEMO_ROOT}/animal_3d_html/panda_大熊猫.html` },
  { id: 'animal-fox', src: `${DEMO_ROOT}/animal_3d_html/procedural_3d_fox.html` },
  { id: 'animal-tiger', src: `${DEMO_ROOT}/animal_3d_html/tiger_孟加拉虎.html` },
  { id: 'animal-wolf', src: `${DEMO_ROOT}/animal_3d_html/wolf_灰狼.html` },
  { id: 'sublevel-07', src: `${DEMO_ROOT}/fable52-fps-repro/demos/04-fps/index.html` },
  { id: 'material-lab', src: `${DEMO_ROOT}/fable52-fps-repro/demos/02-materials/index.html` },
  { id: 'model-lab', src: `${DEMO_ROOT}/fable52-fps-repro/demos/03-models/index.html` }
]

/* ---------------- 3) 直接拷贝的单文件 demo ---------------- */

const PLAIN_DEMOS = [
  { id: 'animal-engine', src: `${DEMO_ROOT}/animal_3d_html/Animal-v1.html` },
  { id: 'audio-lab', src: `${DEMO_ROOT}/fable52-fps-repro/demos/01-audio/index.html` },
  { id: 'audio-lab-1h', src: `${DEMO_ROOT}/fable52-fps-repro/demos/01-audio-1h/index.html` },
  { id: 'deepseek-slider', src: `${PLAY_ROOT}/deepseek-slider/滑动变祖器 v2.html` }
]

/* ---------------- 4) 需要本地 r128 的旧版 demo ---------------- */

const R128_DEMOS = [
  { id: 'city-twin', src: `${PLAY_ROOT}/3d_html/city.html` },
  { id: 'fur-viewer', src: `${DEMO_ROOT}/animal_3d_html/realistic_3d_animal_viewer_shell_fur_pbr_anatomy.html` }
]

/* ---------------- 5) 带图片资源 ---------------- */

const ASSET_DEMOS = [
  {
    id: 'liang-slider',
    src: `${DEMO_ROOT}/liang-slider/index.html`,
    extra: [['liang-shen.png', `${DEMO_ROOT}/liang-slider/liang-shen.png`]]
  }
]

/* ---------------- 6) 已有构建产物的完整工程 ---------------- */

const PREBUILT = [
  {
    id: 'osaka-city',
    dist: `${DEMO_ROOT}/fable52-gta6/dist`,
    note: 'OSAKA CITY 开放世界：先在该目录跑 npm install && npm run build'
  }
]

/* ---------------- 执行 ---------------- */

for (const game of TEMPLATED) {
  await buildTemplated(game)
}

for (const demo of MODULE_DEMOS) {
  try {
    const html = fs.readFileSync(demo.src, 'utf8')
    const bundled = await bundleHtmlModule(html, { entryName: demo.id })
    writeOut(demo.id, bundled)
  } catch (error) {
    console.error(`${demo.id.padEnd(24)} 失败：${error.message}`)
  }
}

for (const demo of PLAIN_DEMOS) {
  writeOut(demo.id, fs.readFileSync(demo.src, 'utf8'), demo.extra || [])
}

for (const demo of R128_DEMOS) {
  let html = localizeR128(fs.readFileSync(demo.src, 'utf8'))
  const extra = r128VendorExtra()
  if (html.includes('cdn.tailwindcss.com')) {
    html = localizeTailwind(html)
    extra.push(...tailwindVendorExtra())
  }
  writeOut(demo.id, html, extra)
}

for (const demo of ASSET_DEMOS) {
  writeOut(demo.id, fs.readFileSync(demo.src, 'utf8'), demo.extra)
}

for (const demo of PREBUILT) {
  if (!fs.existsSync(path.join(demo.dist, 'index.html'))) {
    console.error(`${demo.id.padEnd(24)} 跳过：${demo.note}`)
    continue
  }
  const html = fs.readFileSync(path.join(demo.dist, 'index.html'), 'utf8')
  writeOut(demo.id, html, [['assets', path.join(demo.dist, 'assets')]])
  for (const dir of ['osaka', 'people', 'music', 'sirens']) {
    const from = path.join(demo.dist, dir)
    if (fs.existsSync(from)) {
      fs.cpSync(from, path.join(outRoot, demo.id, dir), { recursive: true })
    }
  }
  for (const file of ['manifest.webmanifest']) {
    const from = path.join(demo.dist, file)
    if (fs.existsSync(from)) fs.cpSync(from, path.join(outRoot, demo.id, file))
  }
}
