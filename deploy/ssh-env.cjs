/**
 * deploy 脚本共用。口令从环境变量或 deploy/ssh.local.env 读取，不写进可提交代码。
 * 用法：node deploy/deploy-web.cjs
 */
const fs = require('fs')
const path = require('path')

function loadLocalEnv() {
  const file = path.join(__dirname, 'ssh.local.env')
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadLocalEnv()

function requireEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    console.error(`缺少 ${name}，请写入 deploy/ssh.local.env 或环境变量`)
    process.exit(1)
  }
  return String(value).trim()
}

module.exports = {
  PUBLIC_HOST: process.env.HYC_PUBLIC_HOST || 'hychyr.top',
  HOST: process.env.HYC_SSH_HOST || '8.152.99.189',
  PORT: Number(process.env.HYC_SSH_PORT || 22),
  USER: process.env.HYC_SSH_USER || 'root',
  get PASSWORD() {
    return requireEnv('HYC_SSH_PASSWORD')
  },
  requireEnv
}
