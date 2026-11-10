/**
 * 上传 nginx 配置并 reload（含 /web/ SPA）
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/setup-nginx-web.cjs
 */
const { Client } = require('ssh2')
const fs = require('fs')
const path = require('path')
const { HOST, PORT, USER, PASSWORD } = require('./ssh-env.cjs')

const NGINX_CONF = path.join(__dirname, '..', '..', 'hycBoxServer', 'deploy', 'nginx-hychyr.top.conf')

function exec(conn, cmd) {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err)
      let out = ''
      stream.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(out.slice(-800) || `exit ${code}`))
      }).on('data', (d) => { out += d; process.stdout.write(d) })
        .stderr.on('data', (d) => process.stderr.write(d))
    })
  })
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

async function main() {
  const conn = new Client()
  await new Promise((resolve, reject) => {
    conn.on('keyboard-interactive', (n, i, l, p, f) => f(p.map(() => PASSWORD)))
    conn.on('ready', resolve).on('error', reject)
    conn.connect({ host: HOST, port: PORT, username: USER, password: PASSWORD, tryKeyboard: true, readyTimeout: 30000 })
  })

  const content = fs.readFileSync(NGINX_CONF, 'utf8')
  await uploadContent(conn, content, '/etc/nginx/conf.d/hychyr.top.conf')
  await exec(conn, 'nginx -t && systemctl reload nginx')
  await exec(conn, 'curl -s -o /dev/null -w "web:%{http_code}\\n" http://127.0.0.1/web/')
  conn.end()
  console.log('nginx 已更新')
}

main().catch((e) => { console.error(e.message); process.exit(1) })
