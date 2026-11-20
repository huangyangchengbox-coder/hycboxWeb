import * as THREE from 'three'

function fallbackTexture(color, srgb) {
  const canvas = document.createElement('canvas')
  canvas.width = 4
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export async function loadTexture(loader, url, { srgb = false, fallback = '#7d8490' } = {}) {
  try {
    const texture = await loader.loadAsync(url)
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace
    return texture
  } catch (error) {
    console.warn('[globe] texture failed, using fallback', url)
    return fallbackTexture(fallback, srgb)
  }
}
