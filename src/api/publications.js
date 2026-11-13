import { getToken } from './auth'
import { API_BASE, apiRequest } from './client'

/** 当前管理员的发布（不含已删除） */
export function listMyPublications(page = 1, pageSize = 50) {
  return apiRequest('/admin/publications', {
    params: { page, pageSize }
  })
}

export function createPublication(payload) {
  return apiRequest('/publications', {
    method: 'POST',
    body: payload
  })
}

export function deletePublication(id) {
  return apiRequest(`/publications/${id}`, {
    method: 'DELETE'
  })
}

export function listCommunities() {
  return apiRequest('/community/list', { auth: false })
}

/** 管理员上传物品图，返回可访问的 url */
export async function uploadImage(file) {
  const token = getToken()
  if (!token) {
    throw new Error('请先登录')
  }
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'X-Admin-Token': token
    },
    body: form
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.code !== 0 || !json.data?.url) {
    throw new Error(json.message || '上传失败')
  }
  return json.data.url
}
