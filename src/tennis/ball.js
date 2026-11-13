import * as THREE from 'three'
import { BALL } from './physics.js'

/** 带缝线的网球，返回 { mesh, dispose, setColor }。 */
export function buildBall({ radius = BALL.visualRadius, color = 0xd9ff00, seam = 0xf7ffe6 } = {}) {
  const group = new THREE.Group()
  const geo = new THREE.SphereGeometry(radius, 20, 16)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: 0x2d3c00 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  group.add(mesh)

  const seamGeo = new THREE.TorusGeometry(radius * 0.995, radius * 0.045, 6, 24)
  const seamMat = new THREE.MeshBasicMaterial({ color: seam })
  const seamMesh = new THREE.Mesh(seamGeo, seamMat)
  seamMesh.rotation.y = Math.PI / 2.6
  group.add(seamMesh)

  return {
    group,
    mesh,
    radius,
    setColor(value) {
      mat.color.setHex(value)
    },
    dispose() {
      geo.dispose()
      mat.dispose()
      seamGeo.dispose()
      seamMat.dispose()
      group.removeFromParent()
    }
  }
}

/** 地面投影圆斑。 */
export function buildBlob(radius = BALL.visualRadius * 1.15) {
  const geo = new THREE.CircleGeometry(radius, 20)
  const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.012
  return {
    mesh,
    update(x, y, z) {
      mesh.position.set(x, 0.012, z)
      const k = Math.max(0.4, Math.min(1.25, 1.25 - y * 0.12))
      mesh.scale.setScalar(k)
      mat.opacity = 0.34 * k
    },
    dispose() {
      geo.dispose()
      mat.dispose()
      mesh.removeFromParent()
    }
  }
}

/** 一条按时间生长的轨迹线。 */
export function buildTrail({ max = 420, color = 0xeaff66, opacity = 0.72, width = 1 } = {}) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(max * 3), 3))
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  const line = new THREE.Line(geo, mat)
  line.frustumCulled = false
  line.linewidth = width

  return {
    line,
    /** 用轨迹点数组填充到 index 为止。 */
    fill(points, index) {
      const attr = geo.attributes.position
      const count = Math.min(index + 1, max, points.length)
      for (let i = 0; i < count; i += 1) {
        const point = points[i]
        attr.setXYZ(i, point.x, point.y, point.z)
      }
      attr.needsUpdate = true
      geo.setDrawRange(0, Math.max(0, count))
    },
    clear() {
      geo.setDrawRange(0, 0)
    },
    dispose() {
      geo.dispose()
      mat.dispose()
      line.removeFromParent()
    }
  }
}

/** 落地 / 击球光环。 */
export function buildRings(count = 6, inner = 0.08, outer = 0.16) {
  const rings = []
  for (let i = 0; i < count; i += 1) {
    const geo = new THREE.RingGeometry(inner, outer, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    rings.push({ mesh, geo, mat })
  }

  return {
    meshes: rings.map((item) => item.mesh),
    reset() {
      rings.forEach((item) => {
        item.mesh.visible = false
      })
    },
    show(slot, { x, y, z, vertical, color, p, max }) {
      const item = rings[slot]
      if (!item) return
      item.mesh.visible = true
      item.mesh.position.set(x, y, z)
      item.mesh.rotation.set(vertical ? 0 : -Math.PI / 2, 0, 0)
      item.mesh.scale.setScalar(1 + p * max)
      item.mat.color.setHex(color)
      item.mat.opacity = (1 - p) * 0.8
    },
    dispose() {
      rings.forEach((item) => {
        item.geo.dispose()
        item.mat.dispose()
        item.mesh.removeFromParent()
      })
    }
  }
}
