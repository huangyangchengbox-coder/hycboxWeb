/**
 * 构建并上传 hycBoxWeb 静态资源到生产服务器 /opt/hycbox-web/
 * 用法：npm run build && set HYC_SSH_PASSWORD=xxx && node deploy/deploy-web.js
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env.cjs')

const LOCAL_DIST = path.join(__dirname, '..', 'dist')
const REMOTE_DIR = '/opt/hycbox-web'

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
      }).on('data', (d) => {
        out += d
        process.stdout.write(d)
      }).stderr.on('data', (d) => process.stderr.write(d))
    })
  })
}

function uploadFile(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const rs = fs.createReadStream(localPath)
    const ws = sftp.createWriteStream(remotePath)
    ws.on('close', resolve)
    ws.on('error', reject)
    rs.pipe(ws)
  })
}

async function uploadDir(sftp, localDir, remoteDir) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true })
  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name)
    const remotePath = `${remoteDir}/${entry.name}`
    if (entry.isDirectory()) {
      await new Promise((resolve, reject) => {
        sftp.mkdir(remotePath, (err) => {
          if (err && err.code !== 4) return reject(err)
          resolve()
        })
      })
      await uploadDir(sftp, localPath, remotePath)
    } else {
      console.log(`  upload ${entry.name}`)
      await uploadFile(sftp, localPath, remotePath)
    }
  }
}

const NGINX_WEB_BLOCK = `
    location /web/ {
        alias /opt/hycbox-web/;
        index index.html;
        try_files $uri $uri/ @web_spa;
    }
    location @web_spa {
        rewrite ^ /web/index.html last;
    }
`

async function ensureNginxWeb(conn) {
  const confPath = '/etc/nginx/conf.d/hychyr.top.conf'
  const check = await exec(conn, `grep -q 'location /web/' ${confPath} && echo yes || echo no`)
  if (check.trim().includes('yes')) {
    console.log('nginx /web/ 已配置，跳过')
    return
  }
  console.log('写入 nginx /web/ 配置…')
  const block = NGINX_WEB_BLOCK.trim()
  await exec(conn, `python3 - <<'PY'
from pathlib import Path
p = Path('${confPath}')
text = p.read_text(encoding='utf-8')
block = '''${block}'''
marker = '    location /uploads/ {'
if 'location /web/' not in text:
    text = text.replace(marker, block + '\\n\\n' + marker, 2)
    p.write_text(text, encoding='utf-8')
    print('nginx conf updated')
else:
    print('already has /web/')
PY
nginx -t && systemctl reload nginx`)
}

async function main() {
  if (!fs.existsSync(LOCAL_DIST)) {
    throw new Error(`找不到 ${LOCAL_DIST}，请先 npm run build`)
  }

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  console.log('SSH 连接成功\n')
  await exec(conn, `rm -rf ${REMOTE_DIR} && mkdir -p ${REMOTE_DIR}`)

  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err)
      try {
        console.log('上传 dist …')
        await uploadDir(sftp, LOCAL_DIST, REMOTE_DIR)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  await ensureNginxWeb(conn)
  await exec(conn, `curl -s -o /dev/null -w "web:%{http_code}\\n" http://127.0.0.1/web/ || true`)

  conn.end()
  console.log(`\n部署完成: http://${HOST}/web/`)
}

main().catch((e) => {
  console.error('部署失败:', e.message)
  process.exit(1)
})
