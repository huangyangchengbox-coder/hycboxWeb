import * as THREE from 'three'

/**
 * 参数化网球：真实比例（半径 3.335 cm），带两条弯曲接缝。
 * 支持毡面颜色、接缝颜色、剖面展示（切开看内胆）。
 */
export function buildSpecBall({
  radius = 0.03335,
  felt = 0xd9ff2e,
  seamColor = 0xf7ffe6,
  cutaway = false,
  showCore = true
} = {}) {
  const group = new THREE.Group()
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }

  // 毡面：两个半球 + 中空内胆（剖面时可看到）
  const feltMat = track(new THREE.MeshStandardMaterial({
    color: felt,
    roughness: 0.94,
    metalness: 0,
    emissive: new THREE.Color(felt).multiplyScalar(0.06)
  }))

  const geo = track(new THREE.SphereGeometry(radius, 48, 36))
  const shell = new THREE.Mesh(geo, feltMat)
  shell.castShadow = true
  group.add(shell)

  // 接缝：网球标志性的「两条弯曲缝线」，沿球面走成 S 形
  const seamMat = track(new THREE.MeshStandardMaterial({
    color: seamColor,
    roughness: 0.62,
    metalness: 0.05
  }))
  const seams = new THREE.Group()

  // 两条缝线各占球面一半：绕 y 轴半圈，同时纬度按正弦起伏
  for (const flip of [0, Math.PI]) {
    const pts = []
    const steps = 160
    for (let i = 0; i <= steps; i += 1) {
      const u = (i / steps) * Math.PI * 2
      // 纬度角在 ±38° 之间正弦摆动，形成典型的网球 S 缝
      const lat = Math.sin(u + flip) * 0.66
      const lon = u * 0.5 + flip
      const cy = Math.sin(lat)
      const cr = Math.cos(lat)
      pts.push(new THREE.Vector3(
        Math.cos(lon) * cr * radius * 1.002,
        cy * radius * 1.002,
        Math.sin(lon) * cr * radius * 1.002
      ))
    }
    const curve = new THREE.CatmullRomCurve3(pts, false)
    const tube = new THREE.Mesh(
      track(new THREE.TubeGeometry(curve, 240, radius * 0.019, 5, false)),
      seamMat
    )
    seams.add(tube)
  }
  group.add(seams)

  // 剖面：用裁剪平面切掉 1/4
  const cutPlaneA = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const cutPlaneB = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0)

  // 内胆（有压球：中空 + 内层；无压球：厚壁）
  const coreGroup = new THREE.Group()
  const coreGeo = track(new THREE.SphereGeometry(radius * 0.86, 40, 28))
  const coreMat = track(new THREE.MeshStandardMaterial({
    color: 0x2b3520,
    roughness: 0.95,
    side: THREE.DoubleSide
  }))
  const core = new THREE.Mesh(coreGeo, coreMat)
  coreGroup.add(core)
  group.add(coreGroup)

  // 剖面壁厚：两个正交切面上的环形盖片，露出「毡面 / 橡胶壳 / 内胆」三层
  const capGroup = new THREE.Group()
  const capMatFelt = track(new THREE.MeshStandardMaterial({ color: felt, roughness: 0.94, side: THREE.DoubleSide }))
  const capMatShell = track(new THREE.MeshStandardMaterial({ color: 0xe8f0c0, roughness: 0.85, side: THREE.DoubleSide }))
  const capMatCore = track(new THREE.MeshStandardMaterial({ color: 0x2b3520, roughness: 0.95, side: THREE.DoubleSide }))

  const capRings = []
  for (const rot of [0, Math.PI / 2]) {
    // 毡面层
    const r1 = new THREE.Mesh(track(new THREE.RingGeometry(radius * 0.955, radius, 48, 1, 0, Math.PI / 2)), capMatFelt)
    // 橡胶壳层
    const r2 = new THREE.Mesh(track(new THREE.RingGeometry(radius * 0.87, radius * 0.955, 48, 1, 0, Math.PI / 2)), capMatShell)
    // 内胆层
    const r3 = new THREE.Mesh(track(new THREE.CircleGeometry(radius * 0.87, 48, 0, Math.PI / 2)), capMatCore)
    for (const r of [r1, r2, r3]) {
      r.rotation.y = rot
      r.visible = false
      capGroup.add(r)
      capRings.push(r)
    }
  }
  group.add(capGroup)

  function update({ feltColor, seamHex, isCutaway, wallRatio }) {
    if (feltColor !== undefined) {
      feltMat.color.setHex(feltColor)
      feltMat.emissive.setHex(feltColor).multiplyScalar(0.06)
      capMatFelt.color.setHex(feltColor)
    }
    if (seamHex !== undefined) seamMat.color.setHex(seamHex)
    if (isCutaway !== undefined) {
      if (isCutaway) {
        feltMat.clippingPlanes = [cutPlaneA, cutPlaneB]
        seamMat.clippingPlanes = [cutPlaneA, cutPlaneB]
        coreMat.clippingPlanes = [cutPlaneA, cutPlaneB]
        capRings.forEach((r) => { r.visible = true })
        coreGroup.visible = true
      } else {
        feltMat.clippingPlanes = null
        seamMat.clippingPlanes = null
        coreMat.clippingPlanes = null
        capRings.forEach((r) => { r.visible = false })
        coreGroup.visible = false
      }
      feltMat.clipShadows = true
      feltMat.needsUpdate = true
      seamMat.needsUpdate = true
      coreMat.needsUpdate = true
    }
    if (wallRatio !== undefined) {
      core.scale.setScalar(1 - wallRatio * 0.5)
    }
  }

  update({ feltColor: felt, seamHex: seamColor, isCutaway: cutaway })

  return {
    group,
    shell,
    seams,
    core,
    capRings,
    cutPlanes: [cutPlaneA, cutPlaneB],
    update,
    dispose() {
      disposables.forEach((item) => item.dispose())
      group.removeFromParent()
    }
  }
}

/** 品牌铭文（用 canvas 贴图贴在球面上）。 */
export function buildBrandStamp(text, color = '#14212e') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 128)
  ctx.fillStyle = color
  ctx.font = '700 64px "Inter", "PingFang SC", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
