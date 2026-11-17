import * as THREE from 'three'
import { SliceServeMode } from './SliceServeMode.js'
import { disposeTree } from '../mode.js'
import {
  topspinStageInfo,
  topspinCoords,
  TOPSPIN_STAGE_EDGES,
  TOPSPIN_STAGE_ANCHORS,
  GRIP_INFO
} from '../topspinguide.js'

/**
 * 上旋发球实验室。
 * 继承切削发球模式的骨架姿态引擎、拖尾、双轨对比与相机系统；
 * 重写为上旋专项：
 *  - 受力点分析：球后下方接触点标记、沿球面向上的摩擦箭头、马格努斯力向下矢量
 *  - 拍面方向分析：接触前后拍面朝向（法线箭头连续内旋）+ 7→12 点钟刷球弧线
 *  - 握拍 3D 特写：八棱拍柄 + 手 + V 字虎口 + 棱编号，大陆式/东方式对比
 */

const DEG = Math.PI / 180
const COLORS = {
  topspin: 0x4ade80,
  flat: 0x38bdf8,
  magnus: 0xf43f5e,
  axis: 0xfacc15,
  brush: 0xfde047,
  contact: 0xff3b30,
  gripBevel: 0x94a3b8,
  gripActive: 0x4ade80
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

export class TopspinServeMode extends SliceServeMode {
  constructor(stage) {
    super(stage)
    this.id = 'topspinserve'
    this.serveKind = 'topspin' // 'topspin' | 'flat' | 'compare'
    this.gripKind = 'continental' // 'continental' | 'eastern'
    this.helpers = { clock: true, ribbon: true, normal: true, vectors: true, trajectory: true, brush: true, grip: false }

    // 覆盖父类的切削数据：重建为上旋坐标与图层
    this.buildGripModel()
    this.buildTopspinGuides()
    this.rebuild()
    this.applyFrame(0)
  }

  // ---------- 上旋专属图层 ----------

  buildTopspinGuides() {
    // 接触点标记（挂球组，不随 mesh 自转）
    this.contactDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 12, 10),
      this.basic(COLORS.contact, { transparent: true, opacity: 0.55 })
    )
    this.contactDot.position.set(0, -0.45 * 0.115, 0.89 * 0.115)
    this.ball.group.add(this.contactDot)

    // 摩擦方向箭头：沿球面向上（接触窗口显示）
    this.brushArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0.78, 0.63).normalize(),
      new THREE.Vector3(),
      0.4,
      COLORS.brush,
      0.1,
      0.07
    )
    this.groups.vectors.add(this.brushArrow)

    // 7→12 点钟刷球弧线（定位在击球点，阶段 4 高亮）
    this.brushPath = this.#brushCurve()
    this.groups.trajectory.add(this.brushPath)

    // 拍面朝向历史（接触前朝后下 → 接触后朝前上）：两条小法线示意
    this.faceBefore = new THREE.ArrowHelper(new THREE.Vector3(0, -0.4, -0.9).normalize(), new THREE.Vector3(), 0.34, 0x38bdf8, 0.08, 0.055)
    this.faceAfter = new THREE.ArrowHelper(new THREE.Vector3(0, 0.55, 0.83).normalize(), new THREE.Vector3(), 0.34, 0x4ade80, 0.08, 0.055)
    this.groups.vectors.add(this.faceBefore, this.faceAfter)
  }

  /** 刷球弧线：以击球点为球心、半径略大于球，从后下 7 点扫到顶上 12 点。 */
  #brushCurve() {
    const pts = []
    const R = 0.17
    for (let a = -78; a <= 102; a += 6) {
      const rad = a * DEG
      // 在 y-z 平面：a=90° 是正上，a=-90° 是正下；背面偏 +z
      pts.push(new THREE.Vector3(0.02, Math.sin(rad) * R, Math.cos(rad) * R * 0.62 + 0.055))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.014, 8, false),
      this.basic(COLORS.brush)
    )
    mesh.visible = false
    return mesh
  }

  // ---------- 握拍 3D 特写 ----------

  #labelSprite(text, color, scale = 1) {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.font = '700 34px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 64, 32)
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false })
    )
    sprite.scale.set(0.34 * scale, 0.17 * scale, 1)
    return sprite
  }

  buildGripModel() {
    const root = (this.gripRoot = new THREE.Group())
    // 世界系：场地右后角（不随 wrapper π 旋转，避免镜像混淆）
    root.position.set(9.2, 1.32, 7.4)
    root.rotation.y = -0.85 // 面向场内
    this.add(root)
    root.visible = false

    const assembly = (this.gripAssembly = new THREE.Group())
    root.add(assembly)

    const gripMat = this.std(0x64748b, { roughness: 0.85 })
    // 拍柄：八棱柱，轴沿 -z（水平握持），截面八边形在 x-y 平面
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8, 1), gripMat)
    handle.rotation.x = Math.PI / 2
    handle.position.z = -0.36
    assembly.add(handle)

    // 棱编号标签（截面端面上方一圈）
    this.bevelSprites = []
    for (let n = 1; n <= 8; n += 1) {
      const rad = (n - 1) * 45 * DEG
      const sprite = this.#labelSprite(String(n), '#e2e8f0', 0.8)
      sprite.position.set(Math.sin(rad) * 0.135, Math.cos(rad) * 0.135, 0.06)
      assembly.add(sprite)
      this.bevelSprites.push(sprite)
    }

    // 拍颈 + 拍面示意（薄板，展示"拍面朝向"）
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.22), this.std(0x0f172a))
    neck.position.z = -0.82
    assembly.add(neck)
    this.facePlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.5, 0.02),
      this.basic(0x4ade80, { transparent: true, opacity: 0.42, side: THREE.DoubleSide })
    )
    this.facePlate.position.z = -0.98
    assembly.add(this.facePlate)
    // 东方式警示描边（切换握拍时显示：拍面天生朝下）
    this.faceWarn = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.52, 0.022),
      this.basic(0xf43f5e, { transparent: true, opacity: 0 })
    )
    this.faceWarn.position.z = -0.978
    assembly.add(this.faceWarn)

    // 手：掌块 + 四指环绕 + 拇指
    const skinMat = this.std(0xf1c27d, { roughness: 0.5 })
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.3), skinMat)
    palm.position.set(0.05, 0.1, -0.42)
    assembly.add(palm)
    for (let i = 0; i < 4; i += 1) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.24, 4, 8), skinMat)
      finger.rotation.x = Math.PI / 2
      finger.position.set(-0.02 - (i % 2) * 0.02, -0.09 + i * 0.06, -0.34)
      assembly.add(finger)
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.2, 4, 8), skinMat)
    thumb.rotation.z = Math.PI / 2.3
    thumb.position.set(-0.02, 0.02, -0.5)
    assembly.add(thumb)

    // V 字虎口（两条黄色小柱呈 V 形，指示 V 字落点）
    this.vGroup = new THREE.Group()
    for (const sx of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), this.basic(0xfacc15))
      bar.rotation.z = 0.5 * sx
      bar.position.set(0.055 * sx, 0.17, -0.5)
      this.vGroup.add(bar)
    }
    assembly.add(this.vGroup)
    this.vLabel = this.#labelSprite('V 字虎口', '#facc15')
    this.vLabel.position.set(0, 0.42, -0.5)
    assembly.add(this.vLabel)

    // 当前棱高亮球（setGripKind 时移动）
    this.bevelHighlight = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), this.basic(COLORS.gripActive))
    assembly.add(this.bevelHighlight)

    // 说明标签
    this.gripTitle = this.#labelSprite('大陆式握拍 · 2 号棱', '#4ade80', 1.3)
    this.gripTitle.position.set(0, 0.78, -0.55)
    assembly.add(this.gripTitle)

    this.setGripKind(this.gripKind)
  }

  setGripKind(kind) {
    this.gripKind = kind
    const info = GRIP_INFO.grips[kind]
    if (!info) return
    // 旋转截面：让目标棱朝上偏右（教学视角）
    // 棱 n 的截面角 = (n-1)*45°（1 号棱朝上）。大陆式 2 号棱 → 柄顺时针转 45°，东方式 3 号 → 90°
    const bevelIdx = info.bevel - 1
    this.gripAssembly.rotation.z = -bevelIdx * 45 * DEG * 0.85
    // V 字角度：东方式更贴右斜下
    this.vGroup.rotation.z = -info.vAngle * 0.5
    this.vGroup.position.y = -info.vAngle * 0.1
    // 高亮球 + 标签
    const rad = bevelIdx * 45 * DEG
    this.bevelHighlight.position.set(Math.sin(rad) * 0.135, Math.cos(rad) * 0.135, 0.06)
    this.gripTitle.material.map.dispose()
    const newTitle = this.#labelSprite(kind === 'continental' ? '大陆式握拍 · V 字对 2 号棱 ✓' : '东方式正手 · V 字对 3 号棱 ✗', kind === 'continental' ? '#4ade80' : '#f43f5e', 1.15)
    newTitle.position.copy(this.gripTitle.position)
    assemblySwap(this.gripAssembly, this.gripTitle, newTitle)
    this.gripTitle = newTitle
    // 警示面：东方式时拍面天生朝下 → 红色描边 + 拍面下倾
    this.faceWarn.material.opacity = kind === 'eastern' ? 0.75 : 0
    this.facePlate.rotation.x = kind === 'eastern' ? 0.5 : 0
    this.faceWarn.rotation.x = this.facePlate.rotation.x
    this.forceUI = true
    this.emitState(this.progress)
  }

  // ---------- 状态重建 ----------

  rebuild() {
    const C = topspinCoords({ left: this.left, deuce: this.refDeuce() })
    this.C = C
    const flatOnly = this.serveKind === 'flat'

    // 目标热区跟随上旋深区落点
    this.targetZone.position.set(C.bounceSlice.x * 0.92, 0.008, C.bounceSlice.z - 0.3)
    this.targetRing.position.set(C.bounceSlice.x, 0.01, C.bounceSlice.z)

    // 时钟盘：上旋主标记在 12 点（头顶），3 点/9 点为切削对照
    const clock = this.groups.clock
    while (clock.children.length) {
      const child = clock.children[0]
      clock.remove(child)
      disposeTree(child)
    }
    const center = new THREE.Vector3(C.serverX, 2.72, 11.6)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.5, 44),
      this.basic(0x94a3b8, { side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    )
    ring.position.copy(center)
    clock.add(ring)
    const marks = [
      { deg: 90, color: 0x4ade80, size: 0.07 }, // 12 点：上旋抛球位（主）
      { deg: this.left ? 105 : 75, color: 0x38bdf8, size: 0.045 }, // 12:30/11:30：平击位（对照）
      { deg: this.left ? 135 : 45, color: 0x94a3b8, size: 0.04 } // 1:30/10:30：切削位（对照）
    ]
    for (const m of marks) {
      const pt = new THREE.Vector3(center.x + Math.cos(m.deg * DEG) * 0.48, center.y + Math.sin(m.deg * DEG) * 0.48, center.z)
      const dot = new THREE.Mesh(new THREE.SphereGeometry(m.size, 12, 10), this.basic(m.color))
      dot.position.copy(pt)
      clock.add(dot)
      clock.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([center, pt]),
        this.basic(m.color, { transparent: true, opacity: 0.6 })
      ))
    }

    // 轨迹：上旋实线（高弧线 + 前冲弹跳）与平击虚线对比
    const traj = this.groups.trajectory
    // 先摘下刷球弧线（避免被清理逻辑 dispose 后重复挂载）
    traj.remove(this.brushPath)
    while (traj.children.length) {
      const child = traj.children[0]
      traj.remove(child)
      disposeTree(child)
    }
    // 保留刷球弧线（重建后重新挂）
    traj.add(this.brushPath)
    if (this.serveKind !== 'flat') {
      traj.add(this.tubeOf(this.#flightCurve(C, 'topspin'), 0.025, COLORS.topspin))
      traj.add(this.tubeOf(this.#bounceCurve(C, 'topspin'), 0.022, 0xfacc15))
    }
    if (this.serveKind === 'flat' || this.serveKind === 'compare') {
      const pts = this.#flightCurve(C, 'flat').getPoints(72)
      const dashed = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: COLORS.flat, dashSize: 0.35, gapSize: 0.2 })
      )
      dashed.computeLineDistances()
      traj.add(dashed)
    }

    // 刷球弧线定位到击球点
    this.brushPath.position.set(C.sliceContact.x, C.sliceContact.y, C.sliceContact.z)

    // 球颜色
    this.ball.setColor(flatOnly ? 0x9fc8ff : 0xd9ff00)
    this.ghost.group.visible = this.serveKind === 'compare'
    this.ribbonMat.color.setHex(flatOnly ? COLORS.flat : COLORS.magnus)
    this.normalArrow.setColor(new THREE.Color(flatOnly ? COLORS.flat : COLORS.topspin))
  }

  /** 上旋飞行弧线：更高过网（1.5m）、中段更高、深落点。复用切削函数签名。 */
  #flightCurve(C, kind) {
    const contact = kind === 'flat' ? C.flatContact : C.sliceContact
    const net = kind === 'flat' ? C.netCrossFlat : C.netCrossSlice
    const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
    const midY = kind === 'flat' ? 1.95 : 2.35
    return new THREE.CatmullRomCurve3([
      v3(contact),
      new THREE.Vector3(lerp(contact.x, net.x, 0.46), midY, lerp(contact.z, net.z, 0.5)),
      v3(net),
      new THREE.Vector3(lerp(net.x, bounce.x, 0.55), 0.95, lerp(net.z, bounce.z, 0.55)),
      v3(bounce)
    ])
  }

  #bounceCurve(C, kind) {
    const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
    const after = kind === 'flat' ? C.afterBounceFlat : C.afterBounceSlice
    const peakY = kind === 'flat' ? 0.85 : 1.15 // 上旋落地前冲高弹跳
    return new THREE.CatmullRomCurve3([
      v3(bounce),
      new THREE.Vector3(lerp(bounce.x, after.x, 0.5), peakY, lerp(bounce.z, after.z, 0.5)),
      v3(after)
    ])
  }

  // ---------- 上旋姿态引擎 ----------

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
    let wristRoll = 0.2

    if (t < 0.16) {
      const k = smoothstep(0, 0.16, t)
      kneeBend = 0.1 * k
      rShoulderX = lerp(0.55, 0.35, k)
      tShoulderX = lerp(0.55, 0.45, k)
    } else if (t < 0.36) {
      const k = smoothstep(0.16, 0.36, t)
      kneeBend = lerp(0.1, 0.34, k) // 上旋屈膝更深
      tShoulderX = lerp(0.45, 2.85, k)
      tShoulderZ = -0.12 * k // 抛球更靠头顶正上
      tElbowX = lerp(-0.4, -0.05, k)
      rShoulderX = lerp(0.35, -0.85, k)
      rShoulderZ = -0.5 * k
      rElbowX = lerp(-0.6, -1.6, k)
    } else if (t < 0.52) {
      const k = smoothstep(0.36, 0.52, t)
      kneeBend = lerp(0.34, 0.5, k) // 全幅深蹲
      torsoArch = -0.32 * k // 背弓更深
      tShoulderX = 2.85
      tShoulderZ = -0.12
      rShoulderX = lerp(-0.85, 1.95, k)
      rShoulderZ = lerp(-0.5, -0.6, k)
      rElbowX = lerp(-1.6, -2.52, k) // 搔背更深
      wristRoll = lerp(0.2, -0.55, k) // 拍面逐渐转向后下
    } else if (t < 0.62) {
      const k = smoothstep(0.52, 0.56, t)
      const postK = smoothstep(0.56, 0.62, t)
      kneeBend = lerp(0.5, -0.12, k) // 蹬地起跳
      torsoArch = lerp(-0.32, 0.18, k)
      bodyYaw = lerp(1.15, 0.45, k) * handSign
      tShoulderX = lerp(2.85, 0.55, k)
      rShoulderX = lerp(1.95, 2.9, k) - 0.3 * postK
      rShoulderZ = -0.24
      rElbowX = lerp(-2.52, -0.08, k)
      // 核心：拍面从后下（-0.55）连续内旋刷过球 → 前上（+0.6）
      wristRoll = lerp(-0.55, -0.05, k) + lerp(-0.05, 0.62, postK)
    } else {
      const k = smoothstep(0.62, 0.86, t)
      kneeBend = lerp(-0.12, 0.14, k)
      bodyYaw = lerp(0.45, -0.22, k) * handSign
      rShoulderX = lerp(2.6, 0.3, k)
      rShoulderZ = lerp(-0.3, 0.5, k) // 随挥收向异侧腰
      rElbowX = lerp(-0.08, -1.05, k)
      wristRoll = lerp(0.62, 0.35, k)
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

    // 球位置与自转（上旋：绕横轴向前滚转）
    const ballKind = flat ? 'flat' : 'topspin'
    const pos = ballPositionAt(t, C, ballKind)
    this.ball.group.position.copy(pos)
    if (this.serveKind === 'compare') {
      this.ghost.group.position.copy(ballPositionAt(t, C, 'flat'))
    }
    if (t >= 0.56) {
      const ft = (t - 0.56) * 26
      if (flat) this.ball.mesh.rotation.set(-ft * 4, 0, 0)
      else this.ball.mesh.rotation.set(-ft * 12, 0, 0) // 上旋：顶部向前滚
    } else {
      this.ball.mesh.rotation.set(0, 0, 0)
    }

    // 击球瞬间高亮
    const isContact = t >= 0.53 && t <= 0.6
    this.contactGlow.material.opacity = isContact ? 0.92 : 0
    this.contactGlow.lookAt(this.camera.position)
    this.stringMat.color.setHex(isContact ? COLORS.contact : flat ? COLORS.flat : COLORS.topspin)
    this.stringMat.opacity = isContact ? 0.78 : 0.35
    this.normalArrow.visible = this.helpers.normal && t >= 0.42 && t <= 0.72

    // 受力点标记：阶段 4 前后显示
    this.contactDot.visible = this.helpers.brush && t >= 0.46 && t <= 0.68
    this.contactDot.material.opacity = isContact ? 1 : 0.55
    this.contactDot.scale.setScalar(isContact ? 1.6 : 1)

    // 刷球弧线：阶段 4 高亮
    this.brushPath.visible = this.helpers.brush && t >= 0.5 && t <= 0.66

    // 摩擦方向箭头（接触窗口）
    const showBrush = this.helpers.vectors && !flat && t >= 0.5 && t <= 0.64
    this.brushArrow.visible = showBrush
    if (showBrush) {
      this.brushArrow.position.copy(pos)
      this.brushArrow.setDirection(new THREE.Vector3(0, 0.78, 0.63).normalize())
    }

    // 拍面朝向历史：接触前（蓝·朝后下）与接触后（绿·朝前上）
    const showFace = this.helpers.brush && t >= 0.44 && t <= 0.7
    this.faceBefore.visible = showFace && t < 0.56
    this.faceAfter.visible = showFace && t >= 0.56
    if (showFace) {
      this.faceBefore.position.copy(pos)
      this.faceAfter.position.copy(pos)
    }

    // 马格努斯矢量（向下压）+ 旋转轴（水平横轴）
    const showVec = this.helpers.vectors && !flat && t >= 0.56 && t <= 0.88
    this.axisArrow.visible = showVec
    this.magnusArrow.visible = showVec
    if (showVec) {
      const axisDir = new THREE.Vector3(-handSign, 0, 0) // 上旋：绕横轴
      this.axisArrow.setDirection(axisDir)
      this.axisArrow.position.copy(pos).addScaledVector(axisDir, -0.28)
      this.magnusArrow.setDirection(new THREE.Vector3(0, -1, 0)) // 马格努斯向下压
      this.magnusArrow.position.copy(pos)
    }

    this.updateRibbon(t)
    this.emitState(t)
  }

  emitState(t) {
    let idx = TOPSPIN_STAGE_EDGES.findIndex((edge) => t < edge)
    if (idx === -1) idx = 4
    const info = topspinStageInfo(idx, { left: this.left, deuce: this.deuce })
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
        grip: this.gripKind,
        info
      })
    } else {
      this.onData?.({ stageIdx: idx, progress: t, playing: this.playing })
    }
  }

  // ---------- 对外 API 覆盖 ----------

  setServeKind(kind) {
    this.serveKind = kind
    this.forceUI = true
    this.rebuild()
    this.applyFrame(this.progress)
  }

  setGripVisible(on) {
    this.helpers.grip = on
    this.gripRoot.visible = on
    if (on) this.setCamera('grip', true)
    else this.setCamera(this.lastCamId || 'free', true)
    this.forceUI = true
    this.emitState(this.progress)
  }

  jumpKeyframe(key) {
    this.playing = false
    this.forceUI = true
    this.ribbonPts.length = 0
    this.progress = key === 'trophy' ? 0.44 : 0.56
    this.applyFrame(this.progress)
  }

  jumpStage(idx) {
    this.progress = TOPSPIN_STAGE_ANCHORS[idx] ?? 0.05
    this.forceUI = true
    this.ribbonPts.length = 0
    if (idx === 3) this.playing = false // 刷球帧暂停逐帧观察
    this.applyFrame(this.progress)
  }

  cameraPresets() {
    const presets = super.cameraPresets()
    // 握拍特写机位（世界系：模型在 (9.2, 1.32, 7.4)）
    presets.grip = {
      pos: new THREE.Vector3(9.2, 1.85, 9.4),
      target: new THREE.Vector3(9.2, 1.25, 7.4)
    }
    return presets
  }

  dispose() {
    disposeTree(this.gripRoot)
    this.remove(this.gripRoot)
    super.dispose()
  }
}

/** 参考坐标 → Vector3（复用切削模块的工具，本文件内私有）。 */
function v3(p) {
  return new THREE.Vector3(p.x, p.y, p.z)
}

function ballPositionAt(t, C, kind) {
  return sliceBall(t, C, kind)
}

// 切削模块的 ballPositionAt 未导出，这里内联同构实现（四段时间轴：托举 → 抛球 → 飞行 → 弹跳）。
function sliceBall(t, C, kind) {
  const contact = kind === 'flat' ? C.flatContact : C.sliceContact
  if (t < 0.16) {
    const k = smoothstep(0, 0.16, t)
    const a = new THREE.Vector3(C.stanceBall.x, C.stanceBall.y, C.stanceBall.z)
    const b = new THREE.Vector3(C.serverX - 0.16 * C.handSign, 1.25, 11.68)
    return a.lerp(b, k)
  }
  if (t < 0.56) {
    const k = (t - 0.16) / 0.4
    const start = new THREE.Vector3(C.serverX - 0.16 * C.handSign, 1.25, 11.68)
    const pos = start.lerp(new THREE.Vector3(contact.x, contact.y, contact.z), k)
    pos.y += Math.sin(k * Math.PI) * 0.28
    return pos
  }
  if (t < 0.84) {
    return sliceFlightCurve(C, kind).getPoint((t - 0.56) / 0.28)
  }
  return sliceBounceCurve(C, kind).getPoint((t - 0.84) / 0.16)
}

function sliceFlightCurve(C, kind) {
  const contact = kind === 'flat' ? C.flatContact : C.sliceContact
  const net = kind === 'flat' ? C.netCrossFlat : C.netCrossSlice
  const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
  const midY = kind === 'flat' ? 1.95 : 2.35
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(contact.x, contact.y, contact.z),
    new THREE.Vector3(lerp(contact.x, net.x, 0.46), midY, lerp(contact.z, net.z, 0.5)),
    new THREE.Vector3(net.x, net.y, net.z),
    new THREE.Vector3(lerp(net.x, bounce.x, 0.55), 0.95, lerp(net.z, bounce.z, 0.55)),
    new THREE.Vector3(bounce.x, bounce.y, bounce.z)
  ])
}

function sliceBounceCurve(C, kind) {
  const bounce = kind === 'flat' ? C.bounceFlat : C.bounceSlice
  const after = kind === 'flat' ? C.afterBounceFlat : C.afterBounceSlice
  const peakY = kind === 'flat' ? 0.85 : 1.15
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(bounce.x, bounce.y, bounce.z),
    new THREE.Vector3(lerp(bounce.x, after.x, 0.5), peakY, lerp(bounce.z, after.z, 0.5)),
    new THREE.Vector3(after.x, after.y, after.z)
  ])
}

function assemblySwap(parent, oldChild, newChild) {
  parent.remove(oldChild)
  parent.add(newChild)
}
