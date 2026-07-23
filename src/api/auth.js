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
  setToken(data.token)
  setAdminInfo(data)
  return data
}

export function logout() {
  clearAuth()
}
