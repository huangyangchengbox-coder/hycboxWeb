import { apiRequest } from './client'

/** Cloudflare Workers AI 状态与模型列表 */
export function getCloudflareAiStatus() {
  return apiRequest('/admin/cloudflare-ai/status')
}

/** 对话（多轮 messages 或单轮 prompt） */
export function chatCloudflareAi(payload) {
  return apiRequest('/admin/cloudflare-ai/chat', {
    method: 'POST',
    body: payload,
    timeout: 100000
  })
}
