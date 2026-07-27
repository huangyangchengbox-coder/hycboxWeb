/**
 * deploy 脚本共用：SSH 口令必须来自环境变量，禁止写死仓库。
 * 用法：set HYC_SSH_PASSWORD=xxx && node deploy/deploy-web.js
 */
function requireEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    console.error(`缺少环境变量 ${name}`)
    process.exit(1)
  }
  return String(value).trim()
}

module.exports = {
  HOST: process.env.HYC_SSH_HOST || 'hychyr.top',
  USER: process.env.HYC_SSH_USER || 'root',
  get PASSWORD() {
    return requireEnv('HYC_SSH_PASSWORD')
  },
  requireEnv
}
