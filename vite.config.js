import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createReadStream, statSync } from 'node:fs'
import { join, normalize, resolve } from 'node:path'

/**
 * 书籍文件静态服务中间件（仅开发服务器）。
 * - 目录由 BOOK_DIR 环境变量指定（默认 D:/play_joy/book），文件不进仓库。
 * - 路径 /book-files/<urlencoded 文件名>
 * - 实现 HTTP Range（206）：浏览器原生 PDF 查看器靠它按需加载
 *   几百 MB 的大部头，不做 Range 会把整个文件吞进内存。
 */
function bookFilesPlugin() {
  const bookDir = resolve(process.env.BOOK_DIR || 'D:/play_joy/book')
  return {
    name: 'serve-book-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        // 同时接受 /book-files/ 与 /web/book-files/（后者与生产 base 对齐）
        const prefix = url.startsWith('/web/book-files/') ? '/web/book-files/' : '/book-files/'
        if (!url.startsWith(prefix)) return next()
        const rel = decodeURIComponent(url.slice(prefix.length))
        // 防目录穿越
        const file = normalize(join(bookDir, rel))
        if (!file.startsWith(normalize(bookDir))) {
          res.statusCode = 403
          return res.end('Forbidden')
        }
        let stat
        try {
          stat = statSync(file)
          if (!stat.isFile()) throw new Error('not a file')
        } catch {
          res.statusCode = 404
          return res.end('Book not found')
        }
        const type = file.toLowerCase().endsWith('.epub')
          ? 'application/epub+zip'
          : 'application/pdf'
        const headers = {
          'Content-Type': type,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        }
        const range = req.headers.range
        if (range) {
          const m = range.match(/bytes=(\d*)-(\d*)/)
          if (m) {
            const start = m[1] ? parseInt(m[1], 10) : 0
            const end = m[2] ? Math.min(parseInt(m[2], 10), stat.size - 1) : stat.size - 1
            if (start >= stat.size || start > end) {
              res.statusCode = 416
              res.setHeader('Content-Range', `bytes */${stat.size}`)
              return res.end()
            }
            res.statusCode = 206
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
            res.setHeader('Content-Length', end - start + 1)
            Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
            return createReadStream(file, { start, end }).pipe(res)
          }
        }
        res.setHeader('Content-Length', stat.size)
        Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v))
        return createReadStream(file).pipe(res)
      })
    }
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), bookFilesPlugin()],
    base: env.VITE_BASE || '/web/',
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'https://hychyr.top',
          changeOrigin: true
        },
        '/api-trial': {
          target: 'https://hychyr.top',
          changeOrigin: true
        }
      }
    }
  }
})
