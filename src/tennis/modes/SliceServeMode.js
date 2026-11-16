import * as THREE from 'three'
import { buildCourt } from '../court.js'
import { buildBall } from '../ball.js'
import { TennisMode, disposeTree } from '../mode.js'
import { sliceStageInfo, sliceCoords, SLICE_STAGE_EDGES, SLICE_STAGE_ANCHORS } from '../sliceguide.js'

/**
 * 切削发球生物力学实验室。
 * 移植自 3D 切削发球实验室（3d-切削发球v3.html）：5 阶段动作分解、
 * 拍头实时拖尾、3D 时钟抛球盘、拍面法线、马格努斯矢量与旋转轴、
 * 切削/平击双轨对比、左右手持拍镜像、一区/二区战术落点。
 *
 * 坐标约定：球员/球/图层全部放在 rotation.y = π 的 wrapper 内，内部沿用
 * 参考坐标（发球者 z=+12.1 面朝 -z）。刚体旋转保持手性，参考系 deuce
 * 映射到世界 ad 侧 —— 所以本模式的 courtSide（项目语义）与内部取反。
 */

const DEG = Math.PI / 180
const COLORS = {
  slice: 0xccff00,
  flat: 0x38bdf8,
  magnus: 0xf43f5e,
  axis: 0xfacc15,
  contact: 0xff3b30
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

function v3(p) {
  return new THREE.Vector3(p.x, p.y, p.z)
}

/** 参考坐标点列 → CatmullRom 控制点（插值中间点用 lerp），flat 用不同过网高度。 */
function flightCurve(C, kind) {
  const contact = kind === 'flat' ? C.flatContact : C.sliceContact
  const net = kind === 'flat' ? C.netCrossFlat : C.netCrossSlice
  const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
  const midY = kind === 'flat' ? 1.95 : 2.15
  return new THREE.CatmullRomCurve3([
    v3(contact),
    new THREE.Vector3(lerp(contact.x, net.x, 0.46), midY, lerp(contact.z, net.z, 0.5)),
    v3(net),
    new THREE.Vector3(lerp(net.x, bounce.x, 0.55), 0.72, lerp(net.z, bounce.z, 0.55)),
    v3(bounce)
  ])
}

function bounceCurve(C, kind) {
  const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
  const after = kind === 'flat' ? C.afterBounceFlat : C.afterBounceSlice
  const peakY = kind === 'flat' ? 0.85 : 0.4
  return new THREE.CatmullRomCurve3([
    v3(bounce),
    new THREE.Vector3(lerp(bounce.x, after.x, 0.5), peakY, lerp(bounce.z, after.z, 0.5)),
    v3(after)
  ])
}

/** 球位置：四段时间轴（托举 → 抛球上升 → 飞行 → 弹跳后），progress 0-1。 */
function ballPositionAt(t, C, kind) {
  const contact = kind === 'flat' ? C.flatContact : C.sliceContact
  if (t < 0.16) {
    const k = smoothstep(0, 0.16, t)
    const a = v3(C.stanceBall)
    const b = new THREE.Vector3(C.serverX - 0.16 * C.handSign, 1.25, 11.68)
    return a.lerp(b, k)
  }
  if (t < 0.56) {
    const k = (t - 0.16) / 0.4
    const start = new THREE.Vector3(C.serverX - 0.16 * C.handSign, 1.25, 11.68)
    const pos = start.lerp(v3(contact), k)
    pos.y += Math.sin(k * Math.PI) * 0.28
    return pos
  }
  if (t < 0.84) {
    return flightCurve(C, kind).getPoint((t - 0.56) / 0.28)
  }
  return bounceCurve(C, kind).getPoint((t - 0.84) / 0.16)
}

export class SliceServeMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'sliceserve'
    this.serveKind = 'slice' // 'slice' | 'flat' | 'compare'
    this.left = false
    this.deuce = true // 项目语义：true = 平分区（世界 +x）
    this.progress = 0
    this.playing = true
    this.speed = 0.5
    this.helpers = { clock: true, ribbon: true, normal: true, vectors: true, trajectory: true }
    this.stageIdx = -1

    this.wrapper = new THREE.Group()
    this.wrapper.rotation.y = Math.PI // 参考坐标 → 项目世界（发球侧在 -z）
    this.add(this.wrapper)

    this.court = buildCourt({ surface: 'hard' })
    this.add(this.court.group)

    this.buildPlayer()
    this.buildBalls()
    this.buildGuides()
    this.rebuild()
    this.applyFrame(0)
  }

  // ---------- 场景构建 ----------

  buildPlayer() {
    const skinMat = this.std(0xf1c27d, { roughness: 0.48 })
    const shirtMat = this.std(0x0284c7, { roughness: 0.55 })
    const shortsMat = this.std(0x0f172a, { roughness: 0.7 })
    const jointMat = this.std(0x38bdf8, { roughness: 0.25 })
    const shoeMat = this.std(0xccff00, { roughness: 0.4 })
    this.mats = { skinMat, shirtMat, shortsMat, jointMat, shoeMat }

    const limb = (rTop, rBot, len, mat) => {
      const geo = new THREE.CylinderGeometry(rTop, rBot, len, 14)
      geo.translate(0, -len / 2, 0)
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      return mesh
    }
    const joint = (r) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 12), jointMat)
      mesh.castShadow = true
      return mesh
    }

    const p = (this.player = {})
    p.root = new THREE.Group()
    this.wrapper.add(p.root)

    p.hips = new THREE.Group()
    p.hips.position.set(0, 0.98, 0)
    p.root.add(p.hips)
    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.22), shortsMat)
    pelvis.castShadow = true
    p.hips.add(pelvis)

    p.torso = new THREE.Group()
    p.torso.position.set(0, 0.08, 0)
    p.hips.add(p.torso)
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.16, 0.52, 14), shirtMat)
    chest.position.y = 0.26
    chest.castShadow = true
    p.torso.add(chest)

    p.head = new THREE.Group()
    p.head.position.set(0, 0.58, 0)
    p.torso.add(p.head)
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 18, 14), skinMat)
    skull.position.y = 0.12
    skull.castShadow = true
    p.head.add(skull)
    const headband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.128, 0.128, 0.035, 18),
      this.basic(0xccff00)
    )
    headband.position.y = 0.15
    p.head.add(headband)

    // 持拍臂（+x 侧；左手持拍用 root.scale.x = -1 生物力学镜像）
    p.rShoulder = new THREE.Group()
    p.rShoulder.position.set(0.24, 0.48, 0)
    p.torso.add(p.rShoulder)
    p.rShoulder.add(joint(0.065), limb(0.055, 0.048, 0.3, skinMat))
    p.rElbow = new THREE.Group()
    p.rElbow.position.set(0, -0.3, 0)
    p.rShoulder.add(p.rElbow)
    p.rElbow.add(joint(0.052), limb(0.046, 0.038, 0.28, skinMat))
    p.rWrist = new THREE.Group()
    p.rWrist.position.set(0, -0.28, 0)
    p.rElbow.add(p.rWrist)
    p.rWrist.add(joint(0.04))

    // 球拍
    const racket = new THREE.Group()
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, 0.2, 10), this.std(0xf8fafc, { roughness: 0.8 }))
    grip.position.y = 0.08
    racket.add(grip)
    for (const side of [-1, 1]) {
      const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.16, 8), this.std(0x0f172a))
      throat.position.set(0.045 * side, 0.24, 0)
      throat.rotation.z = -0.28 * side
      racket.add(throat)
    }
    const frameGeo = new THREE.TorusGeometry(0.145, 0.014, 10, 28)
    frameGeo.scale(0.82, 1.18, 1)
    const frame = new THREE.Mesh(frameGeo, this.std(0xf43f5e, { metalness: 0.45, roughness: 0.28 }))
    frame.position.y = 0.46
    frame.castShadow = true
    racket.add(frame)
    this.stringMat = this.basic(0x38bdf8, { transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    const stringsGeo = new THREE.CircleGeometry(0.14, 20)
    stringsGeo.scale(0.82, 1.18, 1)
    const strings = new THREE.Mesh(stringsGeo, this.stringMat)
    strings.position.y = 0.46
    racket.add(strings)
    // 拍面法线箭头（展示拍面是"侧切"还是"正压"）
    this.normalArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0.46, 0), 0.38, COLORS.flat, 0.09, 0.06)
    racket.add(this.normalArrow)
    // 拍头顶点定位器（拖尾采样点）
    p.tipMarker = new THREE.Object3D()
    p.tipMarker.position.set(0, 0.62, 0)
    racket.add(p.tipMarker)
    racket.rotation.x = Math.PI / 2
    p.rWrist.add(racket)
    p.racket = racket

    // 抛球臂（-x 侧）
    p.tShoulder = new THREE.Group()
    p.tShoulder.position.set(-0.24, 0.48, 0)
    p.torso.add(p.tShoulder)
    p.tShoulder.add(joint(0.065), limb(0.055, 0.048, 0.3, skinMat))
    p.tElbow = new THREE.Group()
    p.tElbow.position.set(0, -0.3, 0)
    p.tShoulder.add(p.tElbow)
    p.tElbow.add(joint(0.052), limb(0.046, 0.038, 0.28, skinMat))

    // 双腿
    p.frontHip = new THREE.Group()
    p.frontHip.position.set(-0.12, -0.05, 0)
    p.hips.add(p.frontHip)
    p.frontHip.add(limb(0.08, 0.065, 0.46, shortsMat))
    p.frontKnee = new THREE.Group()
    p.frontKnee.position.set(0, -0.46, 0)
    p.frontHip.add(p.frontKnee)
    p.frontKnee.add(joint(0.062), limb(0.06, 0.045, 0.45, skinMat))
    const shoeF = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoeMat)
    shoeF.position.set(0, -0.46, -0.05)
    p.frontKnee.add(shoeF)
    p.backHip = new THREE.Group()
    p.backHip.position.set(0.12, -0.05, 0)
    p.hips.add(p.backHip)
    p.backHip.add(limb(0.08, 0.065, 0.46, shortsMat))
    p.backKnee = new THREE.Group()
    p.backKnee.position.set(0, -0.46, 0)
    p.backHip.add(p.backKnee)
    p.backKnee.add(joint(0.062), limb(0.06, 0.045, 0.45, skinMat))
    const shoeB = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoeMat)
    shoeB.position.set(0, -0.46, -0.05)
    p.backKnee.add(shoeB)
  }

  buildBalls() {
    this.ball = buildBall({ color: 0xd9ff00 })
    this.wrapper.add(this.ball.group)
    this.ghost = buildBall({ color: 0x38bdf8 })
    this.ghost.mesh.material.transparent = true
    this.ghost.mesh.material.opacity = 0.8
    this.ghost.mesh.castShadow = false
    this.ghost.group.visible = false
    this.wrapper.add(this.ghost.group)
    // 击球瞬间红光高亮环
    this.contactGlow = new THREE.Mesh(
      new THREE.RingGeometry(0.085, 0.15, 28),
      this.basic(COLORS.contact, { side: THREE.DoubleSide, transparent: true, opacity: 0 })
    )
    this.ball.group.add(this.contactGlow)
  }

  buildGuides() {
    // 目标热区 + 靶心环（参考坐标，进 wrapper）
    this.targetZone = new THREE.Mesh(
      new THREE.PlaneGeometry(1.65, 2.3),
      this.basic(0xccff00, { transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    )
    this.targetZone.rotation.x = -Math.PI / 2
    this.wrapper.add(this.targetZone)
    this.targetRing = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.38, 30),
      this.basic(0xccff00, { side: THREE.DoubleSide })
    )
    this.targetRing.rotation.x = -Math.PI / 2
    this.wrapper.add(this.targetRing)

    // 图层分组（ribbon 顶点是世界坐标，必须挂在世界系；其余在 wrapper 内跟随参考坐标）
    this.groups = { clock: new THREE.Group(), ribbon: new THREE.Group(), vectors: new THREE.Group(), trajectory: new THREE.Group() }
    this.add(this.groups.ribbon)
    for (const key of ['clock', 'vectors', 'trajectory']) this.wrapper.add(this.groups[key])

    // 马格努斯力 + 旋转轴矢量（世界系跟随球）
    this.axisArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.52, COLORS.axis, 0.11, 0.07)
    this.magnusArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(), 0.62, COLORS.magnus, 0.15, 0.1)
    this.groups.vectors.add(this.axisArrow, this.magnusArrow)

    // 拍头拖尾 ribbon（世界坐标构建）
    this.ribbonGeo = new THREE.BufferGeometry()
    this.ribbonMat = this.basic(COLORS.magnus, { side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
    this.ribbonMesh = new THREE.Mesh(this.ribbonGeo, this.ribbonMat)
    this.ribbonMesh.frustumCulled = false
    this.groups.ribbon.add(this.ribbonMesh)
    this.ribbonPts = []
  }

  // ---------- 状态重建 ----------

  /** 参考系 deuce：项目 deuce（世界 +x）映射为参考 ad（刚体 π 旋转翻 x）。 */
  refDeuce() {
    return !this.deuce
  }

  rebuild() {
    const C = sliceCoords({ left: this.left, deuce: this.refDeuce() })
    this.C = C
    const flatOnly = this.serveKind === 'flat'

    // 目标热区跟随切削落点
    this.targetZone.position.set(C.bounceSlice.x * 0.92, 0.008, C.bounceSlice.z - 0.25)
    this.targetRing.position.set(C.bounceSlice.x, 0.01, C.bounceSlice.z)

    // 时钟盘
    const clock = this.groups.clock
    while (clock.children.length) {
      const child = clock.children[0]
      clock.remove(child)
      disposeTree(child)
    }
    const center = new THREE.Vector3(C.serverX, 2.68, 11.56)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.5, 44),
      this.basic(0x94a3b8, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    )
    ring.position.copy(center)
    clock.add(ring)
    const marks = [
      { deg: 90, color: 0x38bdf8, size: 0.045 },
      { deg: this.left ? 135 : 45, color: 0xccff00, size: 0.068 },
      { deg: this.left ? 155 : 25, color: 0xfacc15, size: 0.045 },
      { deg: this.left ? 180 : 0, color: 0xf43f5e, size: 0.055 }
    ]
    for (const m of marks) {
      const rad = m.deg * DEG
      const pt = new THREE.Vector3(center.x + Math.cos(rad) * 0.48, center.y + Math.sin(rad) * 0.48, center.z)
      const dot = new THREE.Mesh(new THREE.SphereGeometry(m.size, 12, 10), this.basic(m.color))
      dot.position.copy(pt)
      clock.add(dot)
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([center, pt]),
        this.basic(m.color, { transparent: true, opacity: 0.65 })
      )
      clock.add(line)
    }

    // 轨迹预测线
    const traj = this.groups.trajectory
    while (traj.children.length) {
      const child = traj.children[0]
      traj.remove(child)
      disposeTree(child)
    }
    if (this.serveKind === 'slice' || this.serveKind === 'compare') {
      traj.add(this.tubeOf(flightCurve(C, 'slice'), 0.025, COLORS.slice))
      traj.add(this.tubeOf(bounceCurve(C, 'slice'), 0.022, 0xfacc15))
    }
    if (this.serveKind === 'flat' || this.serveKind === 'compare') {
      if (this.serveKind === 'flat') {
        traj.add(this.tubeOf(flightCurve(C, 'flat'), 0.024, COLORS.flat))
        traj.add(this.tubeOf(bounceCurve(C, 'flat'), 0.02, 0xfacc15))
      } else {
        const pts = flightCurve(C, 'flat').getPoints(72)
        const dashed = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineDashedMaterial({ color: COLORS.flat, dashSize: 0.35, gapSize: 0.2 })
        )
        dashed.computeLineDistances()
        traj.add(dashed)
      }
    }

    // 球颜色与可见性
    this.ball.setColor(flatOnly ? 0x9fc8ff : 0xd9ff00)
    this.ghost.group.visible = this.serveKind === 'compare'
    this.ribbonMat.color.setHex(flatOnly ? COLORS.flat : COLORS.magnus)
    this.normalArrow.setColor(new THREE.Color(flatOnly ? COLORS.flat : COLORS.slice))
  }

  tubeOf(curve, radius, color) {
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 56, radius, 8, false),
      this.basic(color)
    )
    return mesh
  }

  // ---------- 生物力学姿态引擎（移植参考 updateAnimation 的关节插值） ----------

  applyFrame(t) {
    const C = this.C
    const flat = this.serveKind === 'flat'
    const handSign = this.left ? -1 : 1
    const p = this.player

    let bodyYaw = 1.15 * handSign
    let kneeBend = 0
    let torsoArch = 0
    let rShoulderX = 0.4
    let rShoulderZ = -0.25
    let rElbowX = -0.6
    let tShoulderX = 0.5
    let tShoulderZ = 0.2
    let tElbowX = -0.4
    let wristRoll = flat ? 0 : 0.48

    if (t < 0.16) {
      const k = smoothstep(0, 0.16, t)
      kneeBend = 0.08 * k
      rShoulderX = lerp(0.55, 0.35, k)
      tShoulderX = lerp(0.55, 0.45, k)
    } else if (t < 0.36) {
      const k = smoothstep(0.16, 0.36, t)
      kneeBend = lerp(0.08, 0.28, k)
      tShoulderX = lerp(0.45, 2.75, k)
      tShoulderZ = flat ? -0.05 * k : -0.18 * k
      tElbowX = lerp(-0.4, -0.05, k)
      rShoulderX = lerp(0.35, -0.8, k)
      rShoulderZ = -0.45 * k
      rElbowX = lerp(-0.6, -1.5, k)
    } else if (t < 0.52) {
      const k = smoothstep(0.36, 0.52, t)
      kneeBend = lerp(0.28, 0.44, k)
      torsoArch = -0.24 * k
      tShoulderX = 2.75
      tShoulderZ = flat ? -0.05 : -0.18
      rShoulderX = lerp(-0.8, 1.92, k)
      rShoulderZ = lerp(-0.45, -0.55, k)
      rElbowX = lerp(-1.5, -2.38, k)
    } else if (t < 0.6) {
      const k = smoothstep(0.52, 0.56, t)
      const postK = smoothstep(0.56, 0.6, t)
      kneeBend = lerp(0.44, -0.09, k)
      torsoArch = lerp(-0.24, 0.15, k)
      bodyYaw = lerp(1.15, flat ? 0.25 : 0.55, k) * handSign
      tShoulderX = lerp(2.75, 0.55, k)
      rShoulderX = lerp(1.92, 2.85, k) - 0.35 * postK
      rShoulderZ = flat ? -0.08 : -0.22
      rElbowX = lerp(-2.38, -0.1, k)
      wristRoll = flat ? -0.18 : 0.54
    } else {
      const k = smoothstep(0.6, 0.85, t)
      kneeBend = lerp(-0.09, 0.14, k)
      bodyYaw = lerp(flat ? 0.25 : 0.55, -0.15, k) * handSign
      rShoulderX = lerp(2.5, 0.35, k)
      rShoulderZ = flat ? lerp(-0.08, 0.55, k) : lerp(-0.36, 0.45, k)
      rElbowX = lerp(-0.1, -0.95, k)
      tShoulderX = lerp(0.55, -0.3, k)
    }

    p.root.position.set(C.serverX, 0, C.serverZ)
    p.root.scale.x = this.left ? -1 : 1
    p.root.rotation.y = bodyYaw
    p.hips.position.y = 0.98 - kneeBend * 0.26
    p.frontHip.rotation.x = kneeBend * 1.1
    p.frontKnee.rotation.x = -kneeBend * 1.9
    p.backHip.rotation.x = kneeBend * 1.1
    p.backKnee.rotation.x = -kneeBend * 1.9
    p.torso.rotation.x = torsoArch
    p.rShoulder.rotation.set(rShoulderX, 0, rShoulderZ)
    p.rElbow.rotation.x = rElbowX
    p.rWrist.rotation.y = wristRoll
    p.tShoulder.rotation.set(tShoulderX, 0, tShoulderZ)
    p.tElbow.rotation.x = tElbowX

    // 球位置与自转
    const ballKind = flat ? 'flat' : 'slice'
    const pos = ballPositionAt(t, C, ballKind)
    this.ball.group.position.copy(pos)
    if (this.serveKind === 'compare') {
      this.ghost.group.position.copy(ballPositionAt(t, C, 'flat'))
    }
    if (t >= 0.56) {
      const ft = (t - 0.56) * 26
      if (flat) this.ball.mesh.rotation.set(-ft * 4, 0, 0)
      else this.ball.mesh.rotation.set(0.18, ft * 15 * handSign, -0.22 * handSign)
    } else {
      this.ball.mesh.rotation.set(0, 0, 0)
    }

    // 击球瞬间：拍面高亮 + 红光环
    const isContact = t >= 0.53 && t <= 0.6
    this.contactGlow.material.opacity = isContact ? 0.92 : 0
    this.contactGlow.lookAt(this.camera.position)
    this.stringMat.color.setHex(isContact ? COLORS.contact : flat ? COLORS.flat : COLORS.slice)
    this.stringMat.opacity = isContact ? 0.78 : 0.35
    this.normalArrow.visible = this.helpers.normal && t >= 0.42 && t <= 0.7

    // 马格努斯矢量与旋转轴
    const showVec = this.helpers.vectors && !flat && t >= 0.56 && t <= 0.88
    this.axisArrow.visible = showVec
    this.magnusArrow.visible = showVec
    if (showVec) {
      const axisDir = new THREE.Vector3(-0.18 * handSign, 0.98, 0).normalize()
      this.axisArrow.setDirection(axisDir)
      this.axisArrow.position.copy(pos).addScaledVector(axisDir, -0.25)
      this.magnusArrow.setDirection(new THREE.Vector3(-handSign, 0, 0))
      this.magnusArrow.position.copy(pos)
    }

    this.updateRibbon(t)
    this.emitState(t)
  }

  /** 拍头拖尾：挥拍窗口 (0.34-0.85) 内采样 tip/throat 世界坐标构建丝带。 */
  updateRibbon(t) {
    if (t < 0.34 || t > 0.85 || !this.helpers.ribbon) {
      this.ribbonPts.length = 0
      this.ribbonGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3))
      return
    }
    this.player.root.updateMatrixWorld(true)
    const tip = new THREE.Vector3()
    this.player.tipMarker.getWorldPosition(tip)
    const throat = new THREE.Vector3(0, 0.32, 0)
    this.player.racket.localToWorld(throat)
    this.ribbonPts.push({ tip, base: throat, time: t })
    while (this.ribbonPts.length > 44 || (this.ribbonPts.length && Math.abs(t - this.ribbonPts[0].time) > 0.25)) {
      this.ribbonPts.shift()
    }
    if (this.ribbonPts.length < 2) return
    const verts = []
    for (let i = 0; i < this.ribbonPts.length - 1; i++) {
      const a = this.ribbonPts[i]
      const b = this.ribbonPts[i + 1]
      verts.push(
        a.base.x, a.base.y, a.base.z, a.tip.x, a.tip.y, a.tip.z, b.tip.x, b.tip.y, b.tip.z,
        a.base.x, a.base.y, a.base.z, b.tip.x, b.tip.y, b.tip.z, b.base.x, b.base.y, b.base.z
      )
    }
    this.ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  }

  emitState(t) {
    let idx = SLICE_STAGE_EDGES.findIndex((edge) => t < edge)
    if (idx === -1) idx = 4
    const info = sliceStageInfo(idx, { left: this.left, deuce: this.deuce, flat: this.serveKind === 'flat' })
    if (idx !== this.stageIdx || this.forceUI) {
      this.stageIdx = idx
      this.forceUI = false
      this.onData?.({
        stageIdx: idx,
        progress: t,
        mode: this.serveKind,
        left: this.left,
        deuce: this.deuce,
        playing: this.playing,
        speed: this.speed,
        info
      })
    } else {
      this.onData?.({ stageIdx: idx, progress: t, playing: this.playing })
    }
  }

  // ---------- 对外 API（View 调用） ----------

  setServeKind(kind) {
    this.serveKind = kind
    this.forceUI = true
    this.rebuild()
    this.applyFrame(this.progress)
  }

  setHandedness(left) {
    this.left = left
    this.forceUI = true
    this.ribbonPts.length = 0
    this.rebuild()
    this.applyFrame(this.progress)
  }

  setCourtSide(deuce) {
    this.deuce = deuce
    this.forceUI = true
    this.ribbonPts.length = 0
    this.rebuild()
    this.applyFrame(this.progress)
  }

  setPlaying(v) {
    this.playing = v
    this.emitState(this.progress)
  }

  setSpeed(v) {
    this.speed = v
  }

  setProgress(t) {
    this.progress = Math.max(0, Math.min(1, t))
    this.ribbonPts.length = 0
    this.applyFrame(this.progress)
  }

  stepFrame(dir) {
    this.setProgress(this.progress + dir * 0.01)
  }

  jumpStage(idx) {
    this.progress = SLICE_STAGE_ANCHORS[idx] ?? 0.05
    this.forceUI = true
    this.ribbonPts.length = 0
    if (idx === 3) this.playing = false // 切击帧暂停逐帧观察
    this.applyFrame(this.progress)
  }

  jumpKeyframe(key) {
    this.playing = false
    this.forceUI = true
    this.ribbonPts.length = 0
    this.progress = key === 'trophy' ? 0.46 : 0.56
    this.applyFrame(this.progress)
  }

  toggleHelper(type) {
    this.helpers[type] = !this.helpers[type]
    if (type === 'normal') {
      this.normalArrow.visible = this.helpers.normal
    } else if (this.groups[type]) {
      this.groups[type].visible = this.helpers[type]
    }
  }

  onEnter() {
    this.setCamera('free', true)
    this.forceUI = true
    this.emitState(this.progress)
  }

  update(dt) {
    if (!this.playing) return
    this.progress += dt * 0.24 * this.speed
    if (this.progress > 1) {
      this.progress = 0
      this.ribbonPts.length = 0
    }
    this.applyFrame(this.progress)
  }

  cameraPresets() {
    const C = this.C
    // 参考坐标 → 世界（R_y(π)：x、z 取反）
    const W = (p) => new THREE.Vector3(-p.x, p.y, -p.z)
    const contact = W(C.sliceContact)
    const bounce = W(C.bounceSlice)
    const server = W({ x: C.serverX, y: 0, z: C.serverZ })
    const handSign = this.left ? -1 : 1
    return {
      free: {
        pos: server.clone().add(new THREE.Vector3(-3.8 * handSign, 4.0, -16.5)),
        target: new THREE.Vector3(-0.2, 1.4, -5.0)
      },
      server: {
        pos: server.clone().add(new THREE.Vector3(0.2 * handSign, 2.35, 3.1)),
        target: new THREE.Vector3(bounce.x * 0.35, 1.3, -1.5)
      },
      receiver: {
        pos: new THREE.Vector3(bounce.x, 1.65, 12.8),
        target: new THREE.Vector3(server.x, 1.65, -10.5)
      },
      contact: {
        pos: contact.clone().add(new THREE.Vector3(-1.15 * handSign, 0.2, 1.1)),
        target: contact.clone()
      },
      side: {
        pos: server.clone().add(new THREE.Vector3(-3.8 * handSign, 1.85, 0)),
        target: new THREE.Vector3(server.x, 1.65, server.z)
      },
      top: {
        pos: new THREE.Vector3(0, 23, -3),
        target: new THREE.Vector3(0, 0, -2)
      }
    }
  }

  defaultCamera() {
    return 'free'
  }

  dispose() {
    this.ball.dispose()
    this.ghost.dispose()
    this.court.dispose()
    super.dispose()
  }
}
