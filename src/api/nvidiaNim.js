import { apiRequest } from './client'

/** NVIDIA NIM 状态与模型列表 */
export function getNvidiaNimStatus() {
  return apiRequest('/admin/nvidia-nim/status')
}

/** 对话（多轮 messages 或单轮 prompt） */
export function chatNvidiaNim(payload) {
  return apiRequest('/admin/nvidia-nim/chat', {
    method: 'POST',
    body: payload,
    timeout: 100000
  })
}
