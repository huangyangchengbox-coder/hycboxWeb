import * as THREE from 'three'

let glowTex = null
let glowRefs = 0

function makeGlow() {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.28, 'rgba(255,255,255,0.72)')
  g.addColorStop(0.62, 'rgba(255,220,180,0.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.userData.shared = true
  return tex
}

export function retainGlowTexture() {
  if (!glowTex) glowTex = makeGlow()
  glowRefs += 1
  return glowTex
}

export function releaseGlowTexture() {
  glowRefs = Math.max(0, glowRefs - 1)
  if (glowRefs === 0 && glowTex) {
    glowTex.dispose()
    glowTex = null
  }
}
