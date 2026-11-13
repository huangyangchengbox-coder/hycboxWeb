import * as THREE from 'three'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/** Canvas 文字标签，正反面都朝相机。scale 是每像素对应的世界米数。 */
export function makeLabel(text, {
  color = '#f2fbf2',
  bg = 'rgba(6, 20, 17, 0.8)',
  font = 44,
  padding = 16,
  scale = 0.0052
} = {}) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const fontSpec = `600 ${font}px "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.font = fontSpec
  const width = Math.ceil(ctx.measureText(text).width) + padding * 2
  const height = font + padding * 2
  canvas.width = width
  canvas.height = height
  ctx.font = fontSpec
  if (bg) {
    ctx.fillStyle = bg
    roundRect(ctx, 0, 0, width, height, 14)
    ctx.fill()
  }
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, width / 2, height / 2 + 2)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }))
  sprite.scale.set(width * scale, height * scale, 1)
  return sprite
}

/** 一条带两端短垂线的尺寸线。 */
export function dimensionLine(from, to, {
  color = 0xf2fbf2,
  tick = 0.22,
  normal = new THREE.Vector3(0, 0, 1)
} = {}) {
  const group = new THREE.Group()
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 })
  const dir = new THREE.Vector3().subVectors(to, from).normalize()
  const perp = new THREE.Vector3().crossVectors(normal, dir).normalize().multiplyScalar(tick)

  const points = [from.clone(), to.clone()]
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  group.add(new THREE.Line(geometry, mat))

  for (const point of [from, to]) {
    const tickGeo = new THREE.BufferGeometry().setFromPoints([
      point.clone().add(perp),
      point.clone().sub(perp)
    ])
    group.add(new THREE.Line(tickGeo, mat))
  }
  return group
}
