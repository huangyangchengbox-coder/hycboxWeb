/**
 * 把 games/ 下的三个单文件游戏用 esbuild 打成一个内联 HTML，
 * 输出到 public/minigames/<id>/index.html，随 Vite 一起发布。
 *
 * 注意：输出目录不能叫 public/games，否则和前端路由 /games 撞车，
 * nginx 会把 /web/games 当成真实目录返回 403。
 *
 * 用法：node games/build-games.mjs
 * npm run dev / npm run build 会自动先跑这一步（见 package.json 的 dev / build）。
 */
import * as esbuild from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outRoot = path.join(root, 'public', 'minigames')

const GAMES = [
  {
    id: 'pelican-bike',
    entry: path.join(here, 'pelican-bike', 'src', 'main.js'),
    template: path.join(here, 'pelican-bike', 'index.template.html'),
    // 模板里 <script>/*APP_JS*/</script> 的位置
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
      return html
        .replace('/*__CSS__*/', () => css)
        .replace('/*__JS__*/', () => js)
    }
  },
  {
    id: 'qq-speed',
    entry: path.join(here, 'qq-speed', 'src', 'main.js'),
    template: path.join(here, 'qq-speed', 'src', 'index.html'),
    // 模板里只有 <!--APP_SCRIPT--> 占位符，需要自己补 <script>
    inject(html, js) {
      return html.replace('<!--APP_SCRIPT-->', () => `<script>${js}</script>`)
    }
  }
]

const dev = process.argv.includes('--dev')

async function buildGame(game) {
  const result = await esbuild.build({
    entryPoints: [game.entry],
    bundle: true,
    format: 'iife',
    minify: !dev,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
    logLevel: 'warning',
    // three / lil-gui 从 hycBoxWeb 的 node_modules 解析
    absWorkingDir: root
  })

  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script')
  const template = fs.readFileSync(game.template, 'utf8')
  const html = game.inject(template, js)

  const outDir = path.join(outRoot, game.id)
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(path.join(outDir, 'index.html'), html)
  console.log(`${game.id.padEnd(18)} dist ${(html.length / 1024).toFixed(0)} KB (js ${(js.length / 1024).toFixed(0)} KB)`)
}

for (const game of GAMES) {
  await buildGame(game)
}
