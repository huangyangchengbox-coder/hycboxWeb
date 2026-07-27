const TOKEN_KEY = 'hyc_admin_token'
const ADMIN_KEY = 'hyc_admin_info'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token || '')
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

export function setAdminInfo(info) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(info || {}))
}

export function getAdminInfo() {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}')
  } catch {
    return {}
  }
}

export async function login(username, password) {
  const { apiRequest } = await import('./client')
  const data = await apiRequest('/admin/login', {
    method: 'POST',
    body: { username, password, client: 'web' },
    auth: false
  })
  applyLoginData(data)
  return data
}

export function applyLoginData(data) {
  setToken(data.token)
  setAdminInfo(data)
}

/** 创建 Web 扫码登录票据 */
export async function createQrLogin() {
  const { apiRequest } = await import('./client')
  return apiRequest('/admin/qr-login/create', {
    method: 'POST',
    auth: false
  })
}

/** 轮询扫码登录状态 */
export async function pollQrLogin(ticket) {
  const { apiRequest } = await import('./client')
  return apiRequest(`/admin/qr-login/${encodeURIComponent(ticket)}`, {
    auth: false
  })
}

export function logout() {
  clearAuth()
}
