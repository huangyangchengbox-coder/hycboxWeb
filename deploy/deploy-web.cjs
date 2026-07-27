/**
 * 构建并上传 hycBoxWeb 静态资源
 * 正式：/opt/hycbox-web/ → https://hychyr.top/web/
 * 体验：/opt/hycbox-web-trial/ → https://trial.hychyr.top/web/
 *
 * 用法：
 *   npm run build && set HYC_SSH_PASSWORD=xxx && npm run deploy
 *   npm run build:trial && set HYC_SSH_PASSWORD=xxx && npm run deploy:trial
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, USER, PASSWORD } = require('./ssh-env.cjs')

const isTrial = process.argv.includes('--trial')
const LOCAL_DIST = path.join(__dirname, '..', 'dist')
const REMOTE_DIR = isTrial ? '/opt/hycbox-web-trial' : '/opt/hycbox-web'
const PUBLIC_URL = isTrial ? 'https://hychyr.top/web-trial/' : `https://${HOST}/web/`
const NGINX_CONF_LOCAL = path.join(__dirname, '..', '..', 'hycBoxServer', 'deploy', 'nginx-hychyr.top.conf')

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

function uploadContent(conn, content, remotePath) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err)
      const ws = sftp.createWriteStream(remotePath)
      ws.on('close', resolve)
      ws.on('error', reject)
      ws.end(content)
    })
  })
}

async function syncNginx(conn) {
  if (!fs.existsSync(NGINX_CONF_LOCAL)) {
    console.log('未找到 nginx 配置文件，跳过同步')
    return
  }
  console.log('同步 nginx 配置（含 trial.hychyr.top）…')
  const content = fs.readFileSync(NGINX_CONF_LOCAL, 'utf8')
  await uploadContent(conn, content, '/etc/nginx/conf.d/hychyr.top.conf')
  await exec(conn, 'nginx -t && systemctl reload nginx')
}

/** 体验实例：对外域名与小程序码 env 对齐 trial 子域 */
async function patchTrialServerEnv(conn) {
  if (!isTrial) return
  const envPath = '/opt/hycbox-trial/server.env'
  await exec(conn, `
if [ -f ${envPath} ]; then
  grep -q '^HYCBOX_PUBLIC_BASE_URL=' ${envPath} \\
    && sed -i 's|^HYCBOX_PUBLIC_BASE_URL=.*|HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api-trial|' ${envPath} \\
    || echo 'HYCBOX_PUBLIC_BASE_URL=https://hychyr.top/api-trial' >> ${envPath}
  grep -q '^HYCBOX_UPLOAD_PUBLIC_URL=' ${envPath} \\
    && sed -i 's|^HYCBOX_UPLOAD_PUBLIC_URL=.*|HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads-trial|' ${envPath} \\
    || echo 'HYCBOX_UPLOAD_PUBLIC_URL=https://hychyr.top/uploads-trial' >> ${envPath}
  grep -q '^HYCBOX_WX_MP_ENV_VERSION=' ${envPath} \\
    && sed -i 's|^HYCBOX_WX_MP_ENV_VERSION=.*|HYCBOX_WX_MP_ENV_VERSION=trial|' ${envPath} \\
    || echo 'HYCBOX_WX_MP_ENV_VERSION=trial' >> ${envPath}
  systemctl restart hycbox-trial || true
  systemctl is-active hycbox-trial || true
  echo "trial server.env patched"
else
  echo "skip: ${envPath} missing"
fi
`.trim())
}

async function main() {
  if (!fs.existsSync(LOCAL_DIST)) {
    throw new Error(`找不到 ${LOCAL_DIST}，请先 npm run ${isTrial ? 'build:trial' : 'build'}`)
  }

  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  console.log(`SSH 连接成功（${isTrial ? '体验' : '正式'}）\n`)
  await exec(conn, `rm -rf ${REMOTE_DIR} && mkdir -p ${REMOTE_DIR}`)

  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err)
      try {
        console.log(`上传 dist → ${REMOTE_DIR} …`)
        await uploadDir(sftp, LOCAL_DIST, REMOTE_DIR)
        resolve()
      } catch (e) {
        reject(e)
      }
    })
  })

  await syncNginx(conn)
  await patchTrialServerEnv(conn)

  const hostHeader = HOST
  const webPath = isTrial ? '/web-trial/' : '/web/'
  await exec(conn, `curl -s -o /dev/null -w "web:%{http_code}\\n" -H "Host: ${hostHeader}" http://127.0.0.1${webPath} || true`)
  await exec(conn, `curl -s -o /dev/null -w "api:%{http_code}\\n" -H "Host: ${hostHeader}" http://127.0.0.1${isTrial ? '/api-trial/health' : '/api/health'} || true`)

  conn.end()
  console.log(`\n部署完成: ${PUBLIC_URL}`)
  if (isTrial) {
    console.log('提示：请用 https://hychyr.top/web-trial/ （证书覆盖主域名）')
    console.log('trial.hychyr.top 会跳转到上述地址；子域证书办好后再改回独立站')
  }
}

main().catch((e) => {
  console.error('部署失败:', e.message)
  process.exit(1)
})
