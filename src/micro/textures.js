import * as THREE from 'three'

let soft = null

export function getSoftTexture() {
  if (soft) return soft
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  glow.addColorStop(0, 'rgba(255,255,255,1)')
  glow.addColorStop(0.35, 'rgba(255,255,255,0.7)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 64, 64)
  soft = new THREE.CanvasTexture(canvas)
  soft.userData.shared = true
  return soft
}

export function disposeSoftTexture() {
  soft?.dispose()
  soft = null
}
