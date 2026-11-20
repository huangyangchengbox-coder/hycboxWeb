/**
 * 上传本地书库（D:/play_joy/book，由 BOOK_DIR 覆盖）到服务器 /opt/hycbox-books/
 * 并同步 nginx 配置（含 /web/book-files/ alias）。
 *
 * 特性：
 * - 断点续传：远端同名文件且字节数一致则跳过，可反复执行
 * - 磁盘预检：服务器剩余空间不足 1.2×总量时中止
 * - 完成后 curl Range 验证 206
 *
 * 用法：node deploy/deploy-books.cjs
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, PORT, USER, PASSWORD, PUBLIC_HOST } = require('./ssh-env.cjs')

const BOOK_DIR = process.env.BOOK_DIR || 'D:/play_joy/book'
const REMOTE_DIR = '/opt/hycbox-books'
const NGINX_CONF_LOCAL = path.join(__dirname, '..', '..', 'hycBoxServer', 'deploy', 'nginx-hychyr.top.conf')

function exec(conn, cmd, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      const timer = setTimeout(() => reject(new Error(`命令超时: ${cmd}`)), timeoutMs)
      stream.on('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
      }).on('data', (d) => {
        out += d
        process.stdout.write(d)
      }).stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function sftpStat(sftp, remotePath) {
  return new Promise((resolve) => {
    sftp.stat(remotePath, (err, stats) => resolve(err ? null : stats))
  })
}

function uploadFile(sftp, localPath, remotePath, size) {
  return new Promise((resolve, reject) => {
    let lastPct = 0
    const rs = fs.createReadStream(localPath)
    const ws = sftp.createWriteStream(remotePath)
    ws.on('close', resolve)
    ws.on('error', reject)
    rs.on('error', reject)
    let sent = 0
    rs.on('data', (chunk) => {
      sent += chunk.length
      const pct = Math.floor((sent / size) * 100)
      if (pct !== lastPct && pct % 10 === 0) {
        lastPct = pct
        process.stdout.write(`  ${path.basename(localPath).slice(0, 24)}… ${pct}%\n`)
      }
    })
    rs.pipe(ws)
  })
}

function statLocalFileSafe(localPath) {
  try {
    return fs.statSync(localPath).size
  } catch {
    return null
  }
}

async function main() {
  // 1. 收集本地书籍
  const files = fs.readdirSync(BOOK_DIR)
    .filter((name) => /\.(pdf|epub)$/i.test(name))
    .map((name) => ({ name, size: statLocalFileSafe(path.join(BOOK_DIR, name)) }))
    .filter((f) => f.size !== null)
  if (!files.length) throw new Error(`书库目录无 pdf/epub 文件: ${BOOK_DIR}`)
  const totalMB = files.reduce((s, f) => s + f.size, 0) / 1048576
  console.log(`本地书籍 ${files.length} 册，共 ${totalMB.toFixed(1)} MB\n`)

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })
  console.log('SSH 连接成功\n')

  // 2. 磁盘预检
  const dfOut = await exec(conn, `df -BM --output=avail ${REMOTE_DIR} 2>/dev/null || df -BM /opt | tail -1`)
  const availMB = Number((dfOut.match(/(\d+)M\s*$/i) || [])[1] || 0)
  if (availMB && availMB < totalMB * 1.2) {
    throw new Error(`服务器剩余空间不足：可用 ${availMB}MB，需要约 ${Math.ceil(totalMB * 1.2)}MB`)
  }
  console.log(`磁盘可用 ${availMB}MB ✓\n`)

  // 3. 建目录 + 逐册上传（断点续传）
  await exec(conn, `mkdir -p ${REMOTE_DIR}`)
  const sftp = await new Promise((resolve, reject) => conn.sftp((err, s) => err ? reject(err) : resolve(s)))
  let done = 0, skipped = 0
  const startTime = Date.now()
  for (const f of files) {
    const remotePath = `${REMOTE_DIR}/${f.name}`
    const stats = await sftpStat(sftp, remotePath)
    if (stats && stats.size === f.size) {
      skipped++
      console.log(`跳过（已存在）: ${f.name}`)
      continue
    }
    if (stats && stats.size !== f.size) {
      console.log(`远端不完整(${stats.size}/${f.size})，重传: ${f.name}`)
      await new Promise((resolve, reject) => sftp.unlink(remotePath, (e) => e ? reject(e) : resolve()))
    }
    const t0 = Date.now()
    await uploadFile(sftp, path.join(BOOK_DIR, f.name), remotePath, f.size)
    // 校验远端大小
    const check = await sftpStat(sftp, remotePath)
    if (!check || check.size !== f.size) {
      throw new Error(`上传校验失败: ${f.name}`)
    }
    done++
    console.log(`完成 ${(f.size / 1048576).toFixed(0)}MB / ${((Date.now() - t0) / 1000).toFixed(0)}s: ${f.name}`)
  }
  const mins = ((Date.now() - startTime) / 60000).toFixed(1)
  console.log(`\n上传完成：新传 ${done} 册，跳过 ${skipped} 册，耗时 ${mins} 分钟`)

  // 4. 同步 nginx 配置并 reload
  console.log('\n同步 nginx 配置…')
  await new Promise((resolve, reject) => {
    const ws = sftp.createWriteStream('/etc/nginx/conf.d/hychyr.top.conf')
    ws.on('close', resolve)
    ws.on('error', reject)
    fs.createReadStream(NGINX_CONF_LOCAL).pipe(ws)
  })
  await exec(conn, 'nginx -t && systemctl reload nginx')

  // 5. Range 验证（取最小一册验证 206）
  const smallest = files.reduce((a, b) => (b.size < a.size ? b : a))
  const probe = encodeURIComponent(smallest.name)
  const verify = await exec(conn,
    `curl -s -o /dev/null -w "%{http_code} %{size_download}" -H "Host: ${PUBLIC_HOST}" ` +
    `-H "Range: bytes=0-1023" "http://127.0.0.1/web/book-files/${probe}"`)
  console.log(`\nRange 验证: ${smallest.name.slice(0, 30)}… → ${verify}`)
  if (!verify.startsWith('206')) {
    throw new Error(`Range 验证失败（期望 206，实际 ${verify.split(' ')[0]}）`)
  }
  console.log(`\n线上书库就绪: https://${PUBLIC_HOST}/web/library`)
  conn.end()
}

main().catch((e) => {
  console.error('\n部署失败:', e.message)
  process.exit(1)
})
