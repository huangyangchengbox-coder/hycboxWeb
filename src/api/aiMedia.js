import { apiRequest } from './client'

export function createImage(payload) {
  return apiRequest('/admin/ai-media/images', {
    method: 'POST',
    body: payload,
    timeout: 20000
  })
}

export function createVideo(payload) {
  return apiRequest('/admin/ai-media/videos', {
    method: 'POST',
    body: payload,
    timeout: 20000
  })
}

export function listJobs(type, page = 1, pageSize = 20) {
  return apiRequest('/admin/ai-media', {
    params: { type, page, pageSize }
  })
}

export function getJob(id) {
  return apiRequest(`/admin/ai-media/${id}`)
}

export function refreshVideo(id) {
  return apiRequest(`/admin/ai-media/${id}/refresh`, {
    method: 'POST',
    body: {},
    timeout: 30000
  })
}

export function mediaUrl(job) {
  return job?.resultUrl || job?.remoteUrl || ''
}

export function statusLabel(status) {
  const map = {
    pending: '排队中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败'
  }
  return map[status] || status || '-'
}

export function isRunning(status) {
  return status === 'pending' || status === 'running'
}
