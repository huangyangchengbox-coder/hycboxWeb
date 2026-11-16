import * as THREE from 'three'

/**
 * 3D 受力矢量：箭杆圆柱 + 箭头圆锥 + 名称标签（Canvas Sprite，只建一次）。
 * set(origin, dir, len) 每帧更新变换，不重建几何 —— 保证 60 fps 下 6–8 个矢量无压力。
 * 长度统一乘 scale（比例尺固定并标注在 UI），保证矢量之间可比。
 */

function makeLabel(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(8, 12, 20, 0.9)'
  ctx.strokeText(text, 128, 32)
  ctx.fillStyle = color
  ctx.fillText(text, 128, 32)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  sprite.scale.set(0.62, 0.155, 1)
  sprite.renderOrder = 10
  return sprite
}

const UP = new THREE.Vector3(0, 1, 0)

export class ForceArrow {
  constructor({ color, label }) {
    this.color = color
    this.group = new THREE.Group()
    this.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.92 })
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), this.material)
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 12), this.material)
    this.group.add(this.shaft, this.cone)
    this.label = makeLabel(label, color)
    this.group.add(this.label)
    this.minLen = 0.12
    this.hidden = false
  }

  /** origin 起点；dir 方向（会归一化）；len 视觉长度。 */
  set(origin, dir, len) {
    const L = Math.max(this.minLen, len)
    const d = dir.clone().normalize()
    this.group.position.copy(origin)
    this.shaft.position.copy(d).multiplyScalar(L / 2)
    this.shaft.scale.set(1, L, 1)
    this.shaft.quaternion.setFromUnitVectors(UP, d)
    this.cone.position.copy(d).multiplyScalar(L + 0.055)
    this.cone.quaternion.setFromUnitVectors(UP, d)
    this.label.position.copy(d).multiplyScalar(L + 0.24)
    this.group.visible = !this.hidden
  }

  show() { this.hidden = false; this.group.visible = true }
  hide() { this.hidden = true; this.group.visible = false }
  dispose() {
    this.material.dispose()
    this.shaft.geometry.dispose()
    this.cone.geometry.dispose()
    this.label.material.map?.dispose()
    this.label.material.dispose()
    this.group.removeFromParent()
  }
}

/** 支点光圈（力矩可视化）。 */
export class PivotRing {
  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.9 })
    )
    this.mesh.rotation.x = Math.PI / 2
    this.mesh.visible = false
  }
  set(pos) {
    this.mesh.position.set(pos, 0.012, 0)
    this.mesh.visible = true
  }
  hide() { this.mesh.visible = false }
  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
    this.mesh.removeFromParent()
  }
}

/** 力臂连线（支点 → 重心垂足，紫色）。 */
export class LeverLine {
  constructor() {
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 1)])
    this.material = new THREE.LineDashedMaterial({ color: 0xc084fc, dashSize: 0.05, gapSize: 0.035, linewidth: 2 })
    this.line = new THREE.Line(geo, this.material)
    this.line.computeLineDistances()
    this.label = makeLabel('d', '#c084fc')
    this.label.scale.set(0.3, 0.08, 1)
    this.group = new THREE.Group()
    this.group.add(this.line, this.label)
    this.group.visible = false
  }
  set(x0, x1, y) {
    const pos = this.line.geometry.attributes.position
    pos.setXYZ(0, x0, 0.02, 0)
    pos.setXYZ(1, x1, 0.02, 0)
    pos.needsUpdate = true
    this.line.computeLineDistances()
    this.label.position.set((x0 + x1) / 2, y + 0.1, 0)
    this.group.visible = true
  }
  hide() { this.group.visible = false }
  dispose() {
    this.line.geometry.dispose()
    this.material.dispose()
    this.label.material.map?.dispose()
    this.label.material.dispose()
    this.group.removeFromParent()
  }
}

/** 转弯弧线（俯视）：R 半径的圆弧，R 太大退化为直线示意。 */
export class TurnArc {
  constructor() {
    this.material = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 })
    this.geometry = new THREE.BufferGeometry()
    this.line = new THREE.Line(this.geometry, this.material)
    this.label = makeLabel('R', '#38bdf8')
    this.label.scale.set(0.3, 0.08, 1)
    this.group = new THREE.Group()
    this.group.add(this.line, this.label)
    this.group.visible = false
  }
  /** radius m；lean 压板方向（正 = 向右压/向 -z 弯）。 */
  set(radius, lean) {
    const R = Math.min(radius, 14)
    const pts = []
    const sign = lean >= 0 ? 1 : -1
    const cx = 0
    const cz = sign * R
    const span = Math.min(Math.PI / 2.2, 2.2 / Math.max(R, 0.6))
    for (let i = 0; i <= 40; i++) {
      const a = -Math.PI / 2 + (i / 40) * span * (sign > 0 ? 1 : -1)
      pts.push(new THREE.Vector3(cx + Math.sin(a) * R, 0.015, cz - Math.cos(a) * R * sign))
    }
    this.geometry.setFromPoints(pts)
    this.label.position.set(pts[Math.floor(pts.length / 2)].x, 0.05, pts[Math.floor(pts.length / 2)].z + sign * -0.25)
    this.group.visible = true
  }
  hide() { this.group.visible = false }
  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.label.material.map?.dispose()
    this.label.material.dispose()
    this.group.removeFromParent()
  }
}
