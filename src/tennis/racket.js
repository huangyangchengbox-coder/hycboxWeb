import * as THREE from 'three'

function ellipseCurve(rx, ry) {
  const points = []
  const steps = 64
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(a) * rx, Math.sin(a) * ry, 0))
  }
  return new THREE.CatmullRomCurve3(points, true)
}

/**
 * 参数化球拍。1 单位 = 1 米，真实拍长约 68–69 cm。
 * headArea 用平方英寸（95–110），pattern 是 [竖线, 横线] 条数。
 * 原点在拍柄末端，拍身沿 +X 延伸，拍面在 XY 平面、法线朝 Z。
 */
export function buildRacket({
  headArea = 100,
  pattern = [16, 19],
  frameColor = 0x14212e,
  accent = 0xd8f34a,
  thickness = 0.022,
  length = 0.685,
  showSweet = false
} = {}) {
  const group = new THREE.Group()
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }

  const inches = Math.sqrt(headArea / Math.PI)
  const rx = inches * 0.0254 * 0.93
  const ry = inches * 0.0254 * 1.17
  const hoopCenter = length - ry

  const frameMat = track(new THREE.MeshStandardMaterial({
    color: frameColor,
    metalness: 0.42,
    roughness: 0.32
  }))
  const accentMat = track(new THREE.MeshStandardMaterial({ color: accent, roughness: 0.34 }))
  const gripMat = track(new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.86 }))
  const stringMat = track(new THREE.LineBasicMaterial({ color: 0xf2fbf2, transparent: true, opacity: 0.82 }))

  const gripLen = hoopCenter - ry * 1.1
  const grip = new THREE.Mesh(track(new THREE.CylinderGeometry(0.0135, 0.0155, gripLen, 10)), gripMat)
  grip.rotation.z = -Math.PI / 2
  grip.position.x = gripLen / 2
  group.add(grip)

  const shaftStart = gripLen * 0.98
  const shaftLen = hoopCenter - ry - shaftStart + 0.02
  const shaft = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.0115, 0.0145, Math.max(0.04, shaftLen), 8)),
    accentMat
  )
  shaft.rotation.z = -Math.PI / 2
  shaft.position.x = shaftStart + Math.max(0.04, shaftLen) / 2
  group.add(shaft)

  const hoopGroup = new THREE.Group()
  hoopGroup.position.x = hoopCenter
  group.add(hoopGroup)

  const curve = ellipseCurve(rx, ry)
  const hoop = new THREE.Mesh(
    track(new THREE.TubeGeometry(curve, 72, thickness / 2, 6, true)),
    frameMat
  )
  hoopGroup.add(hoop)

  const throat = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.05, thickness)), frameMat)
  throat.position.set(-ry * 0.96, 0, 0)
  hoopGroup.add(throat)

  const [mains, crosses] = pattern
  const pts = []
  const inset = 0.055
  for (let i = 0; i < mains; i += 1) {
    const k = mains === 1 ? 0 : (i / (mains - 1)) * 2 - 1
    const x = k * rx * (1 - inset)
    const h = Math.sqrt(Math.max(0, 1 - k * k * 0.98)) * ry * (1 - inset)
    pts.push(x, -h, 0, x, h, 0)
  }
  for (let i = 0; i < crosses; i += 1) {
    const k = crosses === 1 ? 0 : (i / (crosses - 1)) * 2 - 1
    const y = k * ry * (1 - inset)
    const w = Math.sqrt(Math.max(0, 1 - k * k * 0.98)) * rx * (1 - inset)
    pts.push(-w, y, 0, w, y, 0)
  }
  const stringGeo = track(new THREE.BufferGeometry())
  stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  const strings = new THREE.LineSegments(stringGeo, stringMat)
  hoopGroup.add(strings)

  const sweet = new THREE.Mesh(
    track(new THREE.CircleGeometry(1, 32)),
    track(new THREE.MeshBasicMaterial({
      color: 0xd8f34a,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    }))
  )
  sweet.scale.set(rx * 0.36, ry * 0.32, 1)
  sweet.position.y = ry * 0.06
  sweet.visible = showSweet
  hoopGroup.add(sweet)

  const sweetSpot = new THREE.Object3D()
  sweetSpot.position.y = ry * 0.06
  hoopGroup.add(sweetSpot)

  return {
    group,
    strings,
    hoopGroup,
    sweet,
    sweetSpot,
    head: { rx, ry },
    length,
    hoopCenter,
    setPocket(z) {
      strings.position.z = z
      const stretch = 1 + Math.abs(z) * 1.8
      strings.scale.set(stretch, stretch, 1)
    },
    setSweet(on) {
      sweet.visible = on
    },
    dispose() {
      disposables.forEach((item) => item.dispose())
      group.removeFromParent()
    }
  }
}

/** 甜区偏移造成的出球速度损失（教学示意口径，8 cm 内基本无损）。 */
export function sweetSpotFactor(offsetMeters, headRx = 0.11) {
  const k = Math.min(1, offsetMeters / (headRx * 1.05))
  return Math.max(0.42, 1 - 0.62 * k * k)
}
