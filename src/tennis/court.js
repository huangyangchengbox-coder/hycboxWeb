import * as THREE from 'three'
import { COURT } from './catalog.js'

export const SURFACES = {
  hard: {
    id: 'hard',
    name: '硬地',
    court: 0x2e7d32,
    apron: 0x1c5c48,
    outer: 0x2b6cb0,
    roughness: 0.8,
    restitution: 0.76,
    friction: 0.5,
    note: '弹跳规律、速度中等，最常见的训练基准'
  },
  clay: {
    id: 'clay',
    name: '红土',
    court: 0xa8492a,
    apron: 0x8c3d24,
    outer: 0x4a2f27,
    roughness: 0.96,
    restitution: 0.82,
    friction: 0.72,
    note: '球速最慢但弹跳最高，上旋收益最大'
  },
  grass: {
    id: 'grass',
    name: '草地',
    court: 0x2f6b34,
    apron: 0x27592c,
    outer: 0x1f4a26,
    roughness: 0.88,
    restitution: 0.62,
    friction: 0.3,
    note: '球速最快、弹跳最低且带滑，低平发球收益最大'
  },
  carpet: {
    id: 'carpet',
    name: '室内地毯',
    court: 0x54606b,
    apron: 0x424c56,
    outer: 0x2c343c,
    roughness: 0.7,
    restitution: 0.7,
    friction: 0.42,
    note: '弹跳低平、节奏快'
  }
}

export function netTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 64, 64)
  ctx.strokeStyle = 'rgba(246, 250, 246, 0.95)'
  ctx.lineWidth = 5
  ctx.strokeRect(0, 0, 64, 64)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(58, 7)
  return tex
}

/** 建一块 1:1 的球场（1 单位 = 1 米），球网在 z = 0，底线在 z = ±11.885。 */
export function buildCourt({
  surface = 'hard',
  outer = true,
  apron = true,
  net = true,
  lines = true,
  receiveShadow = true
} = {}) {
  const group = new THREE.Group()
  const halfL = COURT.length / 2
  const halfD = COURT.doublesWidth / 2
  const halfS = COURT.singlesWidth / 2
  const service = COURT.serviceLineFromNet
  const look = SURFACES[surface] || SURFACES.hard
  const disposables = []

  const track = (item) => {
    disposables.push(item)
    return item
  }

  const courtMat = track(new THREE.MeshStandardMaterial({ color: look.court, roughness: look.roughness }))
  const apronMat = track(new THREE.MeshStandardMaterial({ color: look.apron, roughness: Math.min(1, look.roughness + 0.04) }))
  const outerMat = track(new THREE.MeshStandardMaterial({ color: look.outer, roughness: 0.94 }))
  const lineMat = track(new THREE.MeshStandardMaterial({ color: 0xf4fff6, roughness: 0.5 }))
  const postMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.5 }))
  const tapeMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 }))

  if (outer) {
    const plane = new THREE.Mesh(track(new THREE.PlaneGeometry(72, 86)), outerMat)
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.05
    plane.receiveShadow = receiveShadow
    group.add(plane)
  }

  if (apron) {
    const plane = new THREE.Mesh(
      track(new THREE.PlaneGeometry(COURT.doublesWidth + 6.4, COURT.length + 7.6)),
      apronMat
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -0.03
    plane.receiveShadow = receiveShadow
    group.add(plane)
  }

  const court = new THREE.Mesh(
    track(new THREE.PlaneGeometry(COURT.doublesWidth + 1.4, COURT.length + 1.6)),
    courtMat
  )
  court.rotation.x = -Math.PI / 2
  court.position.y = -0.012
  court.receiveShadow = receiveShadow
  group.add(court)

  const lineGroup = new THREE.Group()
  group.add(lineGroup)
  if (lines) {
    const addLine = (x, z, w, d) => {
      const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(w, 0.02, d)), lineMat)
      mesh.position.set(x, 0.004, z)
      lineGroup.add(mesh)
    }
    addLine(0, halfL, COURT.doublesWidth, COURT.lineWidth)
    addLine(0, -halfL, COURT.doublesWidth, COURT.lineWidth)
    addLine(-halfD, 0, COURT.lineWidth, COURT.length)
    addLine(halfD, 0, COURT.lineWidth, COURT.length)
    addLine(-halfS, 0, COURT.lineWidth * 0.82, COURT.length)
    addLine(halfS, 0, COURT.lineWidth * 0.82, COURT.length)
    addLine(0, service, COURT.singlesWidth, COURT.lineWidth)
    addLine(0, -service, COURT.singlesWidth, COURT.lineWidth)
    addLine(0, 0, COURT.lineWidth, service * 2)
  }

  const postX = halfD + COURT.postOutset
  const netW = postX * 2
  const h = COURT.netPostHeight
  const sag = (nx) => (COURT.netPostHeight - COURT.netCenterHeight) * (1 - nx * nx)

  for (const x of [-postX, postX]) {
    const post = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.07, 0.07, h + 0.08, 14)),
      postMat
    )
    post.position.set(x, (h + 0.08) / 2, 0)
    post.castShadow = receiveShadow
    group.add(post)
  }

  let netMesh = null
  let tapeMesh = null
  let netBase = null
  let tapeBase = null

  if (net) {
    const netGeo = track(new THREE.PlaneGeometry(netW, h, 48, 12))
    const pos = netGeo.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const nx = pos.getX(i) / postX
      const y = pos.getY(i) + h / 2
      const top = h - sag(nx)
      pos.setY(i, -h / 2 + (y / h) * top)
    }
    netGeo.computeVertexNormals()
    const tex = netTexture()
    disposables.push(tex)
    const netMat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      roughness: 0.65,
      depthWrite: false
    })
    track(netMat)
    netMesh = new THREE.Mesh(netGeo, netMat)
    netMesh.position.y = h / 2
    netMesh.castShadow = receiveShadow
    group.add(netMesh)

    const tapeGeo = track(new THREE.BoxGeometry(netW, 0.055, 0.035, 48, 1, 1))
    const ta = tapeGeo.attributes.position
    for (let i = 0; i < ta.count; i += 1) {
      const nx = ta.getX(i) / postX
      ta.setY(i, ta.getY(i) + h - sag(nx))
    }
    tapeMesh = new THREE.Mesh(tapeGeo, tapeMat)
    group.add(tapeMesh)

    netBase = Float32Array.from(netGeo.attributes.position.array)
    tapeBase = Float32Array.from(tapeGeo.attributes.position.array)
  }

  function setSurface(id) {
    const next = SURFACES[id] || SURFACES.hard
    courtMat.color.setHex(next.court)
    courtMat.roughness = next.roughness
    apronMat.color.setHex(next.apron)
    outerMat.color.setHex(next.outer)
  }

  /** 球网触球凹陷：since 秒后的阻尼正弦。 */
  function deform(hit, since) {
    if (!netMesh) return
    const netAttr = netMesh.geometry.attributes.position
    const tapeAttr = tapeMesh.geometry.attributes.position
    netAttr.array.set(netBase)
    tapeAttr.array.set(tapeBase)
    if (hit && since >= 0 && since < 0.9) {
      const wave = Math.sin(since * 26) * Math.exp(-since * 5.1)
      const netArr = netAttr.array
      for (let i = 0; i < netAttr.count; i += 1) {
        const bx = netBase[i * 3]
        const by = netBase[i * 3 + 1] + h / 2
        const bz = netBase[i * 3 + 2]
        const d2 = (bx - hit.x) ** 2 + (by - hit.y) ** 2
        netArr[i * 3 + 2] = bz + 0.46 * Math.exp(-d2 * 1.15) * wave
      }
      const tapeArr = tapeAttr.array
      for (let i = 0; i < tapeAttr.count; i += 1) {
        const bx = tapeBase[i * 3]
        const bz = tapeBase[i * 3 + 2]
        const influence = Math.exp(-((bx - hit.x) ** 2) * 0.85) * 0.5
        tapeArr[i * 3 + 2] = bz + 0.3 * influence * wave
      }
      const glow = Math.max(0, 1 - since * 3.4)
      tapeMat.emissive.setRGB(glow * 0.8, glow * 0.5, 0)
    } else if (hit) {
      tapeMat.emissive.setRGB(0, 0, 0)
    }
    netAttr.needsUpdate = true
    tapeAttr.needsUpdate = true
  }

  function dispose() {
    disposables.forEach((item) => item.dispose())
  }

  return { group, setSurface, deform, dispose, lineGroup, netMesh, tapeMesh }
}
