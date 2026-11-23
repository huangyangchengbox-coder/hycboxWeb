import * as THREE from 'three'
import { BALL } from './physics.js'
import { makeLabel } from './labels.js'

/**
 * 击球瞬间的受力分解（击球接触模型）。
 *
 * 口径与示意图一致（Velocity and Force Components）：
 *   (a) 速度分解：入射相对速度 v → 法向 v⊥（垂直拍面，压进拍线）+ 切向 v∥（沿拍面刷过）
 *   (b) 力分解：法向力 F_N（拍线弹性）+ 摩擦力 F_r（拍线咬球）→ 合力 F
 *   (c) 反作用：拍线给球的 F_N 与 F_r，以及旋转 ω
 *
 * 简化模型（教学口径，量级与实测一致）：
 * - 触球时长 dt = 4 ms，拍线恢复系数 e = 0.75，拍线-球摩擦系数上限 μ = 0.55
 * - 法向冲量 J_N = m(1+e)|v⊥|
 * - 制造转速 ω 所需切向冲量 J_t = (2/5)mRω；上限 J_t,max = μJ_N
 *   若 J_t > J_t,max → 拍面打滑，实际转速被摩擦上限截断（这正是"薄擦打滑"的物理原因）
 */

export const CONTACT_MODEL = {
  dt: 0.004,
  cor: 0.75,
  mu: 0.55
}

const M = BALL.mass
const R = BALL.radius

export function solveContact({ inVel, racketVel, normal, rpm = 0, mu = CONTACT_MODEL.mu }) {
  const n = normal.clone().normalize()
  const rel = inVel.clone().sub(racketVel)
  const vnSigned = rel.dot(n)
  const vNormal = n.clone().multiplyScalar(vnSigned)
  const vTang = rel.clone().sub(vNormal)
  const vn = Math.abs(vnSigned)
  const vt = vTang.length()

  const JN = M * (1 + CONTACT_MODEL.cor) * vn
  const FN = JN / CONTACT_MODEL.dt

  const omega = (Math.abs(rpm) * Math.PI * 2) / 60
  const JtNeed = 0.4 * M * R * omega
  const JtMax = mu * JN
  const Jt = Math.min(JtNeed, JtMax)
  const slip = JtNeed > JtMax * 1.005
  const Fr = Jt / CONTACT_MODEL.dt
  const F = Math.hypot(FN, Fr)

  const omegaOut = Jt / (0.4 * M * R)
  const rpmOut = (omegaOut * 60) / (Math.PI * 2)
  const muNeed = JN > 1e-6 ? JtNeed / JN : 0

  return {
    n,
    rel,
    vNormal,
    vTang,
    vn,
    vt,
    speed: rel.length(),
    JN,
    Jt,
    JtNeed,
    JtMax,
    FN,
    Fr,
    F,
    muNeed,
    muUsed: mu,
    slip,
    rpmOut,
    rpmSigned: rpm,
    contactMs: CONTACT_MODEL.dt * 1000,
    spinKind: rpm > 60 ? 'topspin' : rpm < -60 ? 'slice' : 'flat'
  }
}

const UP = new THREE.Vector3(0, 1, 0)
const hexOf = (color) => `#${color.toString(16).padStart(6, '0')}`

class Arrow3 {
  constructor({ color, text, thickness = 0.0085, headSize = 0.05, opacity = 0.95 }) {
    this.group = new THREE.Group()
    this.mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false })
    this.shaft = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, 1, 8), this.mat)
    this.cone = new THREE.Mesh(new THREE.ConeGeometry(headSize * 0.52, headSize, 12), this.mat)
    this.shaft.renderOrder = 9
    this.cone.renderOrder = 9
    this.label = makeLabel(text, { color: hexOf(color), scale: 0.0023 })
    this.label.material.depthTest = false
    this.group.add(this.shaft, this.cone, this.label)
    this.group.visible = false
  }

  set(origin, dir, length) {
    if (!dir || dir.lengthSq() < 1e-8 || length < 0.02) {
      this.group.visible = false
      return
    }
    const L = Math.max(0.07, length)
    const d = dir.clone().normalize()
    this.group.position.copy(origin)
    this.shaft.position.copy(d).multiplyScalar(L * 0.5)
    this.shaft.scale.set(1, L, 1)
    this.shaft.quaternion.setFromUnitVectors(UP, d)
    this.cone.position.copy(d).multiplyScalar(L - 0.018)
    this.cone.quaternion.setFromUnitVectors(UP, d)
    this.label.position.copy(d).multiplyScalar(L + 0.06)
    this.group.visible = true
  }

  dispose() {
    this.shaft.geometry.dispose()
    this.cone.geometry.dispose()
    this.mat.dispose()
    this.label.material.map?.dispose()
    this.label.material.dispose()
    this.group.removeFromParent()
  }
}

/**
 * 3D 受力矢量图层：拍面、接触点、速度/力分解箭头、虚线平行四边形、旋转弧。
 * 全部世界坐标构建，update() 每帧只改变换，不重建几何。
 */
export class BallForceRig {
  constructor() {
    this.group = new THREE.Group()
    this.group.visible = false
    this.ballPos = new THREE.Vector3()

    // 拍面示意（击球瞬间的拍线平面）
    this.faceMat = new THREE.MeshBasicMaterial({
      color: 0x9be8ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    this.face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.44), this.faceMat)
    this.face.renderOrder = 5
    this.faceEdgeMat = new THREE.LineBasicMaterial({ color: 0x9be8ff, transparent: true, opacity: 0.45 })
    this.faceEdge = new THREE.LineSegments(new THREE.EdgesGeometry(this.face.geometry), this.faceEdgeMat)
    this.faceEdge.renderOrder = 5
    this.face.add(this.faceEdge)
    this.group.add(this.face)

    // 接触点
    this.dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })
    )
    this.dot.renderOrder = 9
    this.group.add(this.dot)

    // 速度分解 (a)
    this.vArrow = new Arrow3({ color: 0xeafff2, text: 'v' })
    this.vnArrow = new Arrow3({ color: 0x38bdf8, text: 'v⊥' })
    this.vtArrow = new Arrow3({ color: 0x22d3ee, text: 'v∥' })

    // 力分解 (b)
    this.fArrow = new Arrow3({ color: 0xfb923c, text: 'F' })
    this.fnArrow = new Arrow3({ color: 0xef4444, text: 'F_N' })
    this.frArrow = new Arrow3({ color: 0xfacc15, text: 'F_r' })

    Object.values(this.arrows()).forEach((arrow) => this.group.add(arrow.group))

    // 虚线：把分量箭头尖端连到合矢量尖端
    this.guideMat = new THREE.LineDashedMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.55,
      dashSize: 0.035,
      gapSize: 0.025
    })
    this.guides = [0, 1, 2, 3].map(() => {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
      const line = new THREE.Line(geometry, this.guideMat)
      line.renderOrder = 8
      this.group.add(line)
      return line
    })

    // 旋转弧 ω
    this.omegaGroup = new THREE.Group()
    this.omegaMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false })
    this.omegaArc = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.008, 8, 40, Math.PI * 1.4), this.omegaMat)
    this.omegaArc.renderOrder = 9
    this.omegaHead = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.07, 10), this.omegaMat)
    this.omegaHead.renderOrder = 9
    this.omegaArc.add(this.omegaHead)
    this.omegaLabel = makeLabel('ω', { color: '#c084fc', scale: 0.0023 })
    this.omegaGroup.add(this.omegaArc, this.omegaLabel)
    this.group.add(this.omegaGroup)
  }

  arrows() {
    return {
      v: this.vArrow,
      vn: this.vnArrow,
      vt: this.vtArrow,
      f: this.fArrow,
      fn: this.fnArrow,
      fr: this.frArrow
    }
  }

  /**
   * @param {object} p
   * @param {THREE.Vector3} p.origin 击球点（拍线平面中心）
   * @param {THREE.Vector3} p.normal 拍面法线（指向球侧）
   * @param {object} p.profile solveContact() 的返回值
   */
  update({ origin, normal, profile }) {
    const n = normal.clone().normalize()
    const rel = profile.rel
    let vtDir
    if (profile.vTang.lengthSq() > 1e-6) {
      vtDir = profile.vTang.clone().normalize()
    } else {
      const fallback = new THREE.Vector3(0, 1, 0).projectOnPlane(n)
      if (fallback.lengthSq() < 1e-6) fallback.set(1, 0, 0)
      vtDir = fallback.normalize()
    }

    // 拍面（稍退后一点，避免与真实拍线共面闪烁）
    this.face.position.copy(origin).addScaledVector(n, -0.006)
    this.face.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)

    // 球心（球贴在拍面前）
    this.ballPos.copy(origin).addScaledVector(n, BALL.visualRadius * 1.1)
    this.dot.position.copy(origin)

    // 箭头长度按 √(分量/合量) 压缩：法向与切向量级差一个数量级时仍能同时看清
    const vRef = Math.max(profile.speed, 1)
    const vBase = 0.36
    const vnLen = vBase * Math.sqrt(profile.vn / vRef)
    const vtLen = vBase * Math.sqrt(profile.vt / vRef)
    this.vArrow.set(this.ballPos, rel, vBase)
    const vnDir = profile.vNormal.clone().normalize()
    this.vnArrow.set(this.ballPos, vnDir, vnLen)
    this.vtArrow.set(this.ballPos, vtDir, vtLen)

    // 力：法向反作用沿 +n，摩擦沿切向反方向（μ 咬球，抵消相对滑动）
    const fRef = Math.max(profile.F, 1)
    const fBase = 0.32
    const fnDir = n.clone()
    const frDir = vtDir.clone().multiplyScalar(-1)
    const fDir = fnDir.clone().multiplyScalar(profile.FN).addScaledVector(frDir, profile.Fr).normalize()
    const fnLen = fBase * Math.sqrt(profile.FN / fRef)
    const frLen = fBase * Math.sqrt(profile.Fr / fRef)

    this.fnArrow.set(this.ballPos, fnDir, fnLen)
    this.frArrow.set(this.ballPos, frDir, frLen)
    this.fArrow.set(this.ballPos, fDir, fBase)

    // 虚线闭合平行四边形
    const vTips = {
      v: this.ballPos.clone().addScaledVector(rel.clone().normalize(), vBase),
      vn: this.ballPos.clone().addScaledVector(vnDir, vnLen),
      vt: this.ballPos.clone().addScaledVector(vtDir, vtLen)
    }
    this.#guide(0, vTips.vn, vTips.v)
    this.#guide(1, vTips.vt, vTips.v)

    const fTips = {
      fn: this.ballPos.clone().addScaledVector(fnDir, fnLen),
      fr: this.ballPos.clone().addScaledVector(frDir, frLen)
    }
    const fEnd = this.ballPos.clone().addScaledVector(fDir, fBase)
    this.#guide(2, fTips.fn, fEnd)
    this.#guide(3, fTips.fr, fEnd)

    // ω 弧：绕世界 X 轴（上旋 +x / 下旋 -x），半径略大于球
    this.omegaGroup.position.copy(this.ballPos)
    const axis = new THREE.Vector3(profile.rpmSigned >= 0 ? 1 : -1, 0, 0)
    this.omegaGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis)
    const spinLabel = profile.spinKind === 'flat'
      ? 'ω ≈ 0（平击）'
      : `ω ${Math.round(profile.rpmOut)} rpm（${profile.spinKind === 'topspin' ? '上旋' : '下旋'}）`
    this.omegaLabel.material.map?.dispose()
    this.omegaLabel.material.dispose()
    const label = makeLabel(spinLabel, { color: '#c084fc', scale: 0.0021 })
    label.material.depthTest = false
    this.omegaGroup.remove(this.omegaLabel)
    this.omegaLabel = label
    this.omegaGroup.add(label)
    label.position.set(0, 0.2, 0)
    this.omegaGroup.visible = profile.spinKind !== 'flat'
  }

  #guide(index, from, to) {
    const line = this.guides[index]
    const pos = line.geometry.attributes.position
    pos.setXYZ(0, from.x, from.y, from.z)
    pos.setXYZ(1, to.x, to.y, to.z)
    pos.needsUpdate = true
    line.geometry.computeBoundingSphere()
    line.computeLineDistances()
  }

  setVisible(value) {
    this.group.visible = Boolean(value)
  }

  dispose() {
    Object.values(this.arrows()).forEach((arrow) => arrow.dispose())
    this.face.geometry.dispose()
    this.faceMat.dispose()
    this.faceEdge.geometry.dispose()
    this.faceEdgeMat.dispose()
    this.dot.geometry.dispose()
    this.dot.material.dispose()
    this.guides.forEach((line) => line.geometry.dispose())
    this.guideMat.dispose()
    this.omegaArc.geometry.dispose()
    this.omegaHead.geometry.dispose()
    this.omegaMat.dispose()
    this.omegaLabel.material.map?.dispose()
    this.omegaLabel.material.dispose()
    this.group.removeFromParent()
  }
}
