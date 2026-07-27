import { getToken } from './auth'

const API_BASE = (import.meta.env.VITE_API_BASE || 'https://hychyr.top/api').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  const {
    method = 'GET',
    body,
    params,
    timeout = 60000,
    auth = true
  } = options

  let url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v))
      }
    })
    const q = qs.toString()
    if (q) url += (url.includes('?') ? '&' : '?') + q
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8'
  }
  if (auth) {
    const token = getToken()
    if (!token) {
      throw new Error('请先登录')
    }
    headers['X-Admin-Token'] = token
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.code !== 0) {
      throw new Error(json.message || `请求失败 (${res.status})`)
    }
    return json.data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('请求超时，请稍后再试')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export { API_BASE }
