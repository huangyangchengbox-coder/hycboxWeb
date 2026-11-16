import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CURVE_CONST, SHOT_CONST, SPRINT_SPLITS, sprintProfile } from './formulas.js'
import { curveTrajectory, shotTrajectory } from './physics.js'
import { THEORIES, forceCalc } from './theory.js'

const CAMERAS = {
  shot: { pos: [6.2, 3.4, 9.5], target: [2.6, 1.8, 0] },
  curve: { pos: [-7, 5.2, 14], target: [12, 1.2, 0] },
  sprint: { pos: [-6, 5.5, 20], target: [30, 0.8, 0] },
  heart: { pos: [0, 0.6, 4.6], target: [0, 0, 0] },
  theory: { pos: [3.2, 2.4, 5.2], target: [0, 1.1, 0] }
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opts.glow ?? 0.25,
    roughness: opts.roughness ?? 0.5,
    transparent: opts.opacity !== undefined,
    opacity: opts.opacity ?? 1,
    depthWrite: opts.opacity === undefined || opts.opacity >= 1,
    side: opts.opacity !== undefined && opts.opacity < 1 ? THREE.DoubleSide : THREE.FrontSide
  })
}

function lineMat(color, opacity = 0.9) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity })
}

/** 受力分解台的三力箭头（箭杆 + 锥形箭头），长度实时驱动。 */
function makeForceArrow(color) {
  const group = new THREE.Group()
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 1, 8),
    mat(color, { glow: 0.85 })
  )
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10), mat(color, { glow: 0.9 }))
  group.add(shaft, head)
  group.userData = { shaft, head }
  group.visible = false
  return group
}

/** 把箭头摆到起点 origin、指向 dir、长度 len（内部箭杆已按 -len 对齐）。 */
function aimArrow(group, origin, dir, len) {
  const { shaft, head } = group.userData
  const d = dir.clone().normalize()
  const shaftLen = Math.max(0.001, len - 0.14)
  shaft.scale.y = shaftLen
  head.position.y = shaftLen / 2 + 0.07
  group.position.copy(origin)
  // 箭头默认朝 +y，转到 d 方向
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
  group.visible = len > 0.03
}

export class MathScene {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.hooks = hooks
    this.mode = 'shot'
    this.flying = false
    this.flyT = 0
    this.shotBall = { v0: 8, angle: 52, h0: 2.0 }
    this.curveShot = { v0: 24, spin: 7, rise: 12 }
    this.sprintT = 0
    this.sprintPlaying = false
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#060d0b')
    this.scene.fog = new THREE.Fog('#0a1712', 30, 90)
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 200)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.scene.add(new THREE.AmbientLight('#e8fff2', 0.6))
    const key = new THREE.DirectionalLight('#f7ffe0', 1.4)
    key.position.set(6, 10, 6)
    this.scene.add(key)
    const rim2 = new THREE.PointLight('#d8f34a', 10, 40)
    rim2.position.set(-6, 4, 6)
    this.scene.add(rim2)

    this.groups = { shot: this.#buildShot(), curve: this.#buildCurve(), sprint: this.#buildSprint(), heart: this.#buildHeart(), theory: this.#buildTheory() }
    for (const g of Object.values(this.groups)) this.scene.add(g)

    this.#resize()
    this._onResize = () => this.#resize()
    window.addEventListener('resize', this._onResize)
    this.setTheme('shot')
    this.clock = new THREE.Clock()
    this.#loop()
  }

  // ---------- 投篮：半场 ----------
  #buildShot() {
    const g = new THREE.Group()
    const C = SHOT_CONST
    // 地板（半场 15 × 5.9 可视即可）
    const floor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, 7), mat('#17453a', { glow: 0.06, roughness: 0.9 }))
    floor.position.set(3.5, -0.05, 0)
    g.add(floor)
    // 场地线：罚球圈 + 三分弧
    const lineCirc = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.03, 6, 48), mat('#e8fff2', { glow: 0.5 }))
    lineCirc.rotation.x = Math.PI / 2
    lineCirc.position.set(0, 0.02, 0)
    g.add(lineCirc)
    const threeArc = new THREE.Mesh(new THREE.TorusGeometry(C.threeDist, 0.03, 6, 48, Math.PI), mat('#e8fff2', { glow: 0.4 }))
    threeArc.rotation.x = Math.PI / 2
    threeArc.rotation.z = -Math.PI / 2
    threeArc.position.set(0, 0.02, 0)
    g.add(threeArc)
    // 篮板 + 筐
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.05, 1.8), mat('#bfe8ff', { glow: 0.3, opacity: 0.5 }))
    back.position.set(C.freeThrowDist + 0.45, C.rimHeight + 0.35, 0)
    g.add(back)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, C.rimHeight + 0.9, 10), mat('#5a7d72', { glow: 0.1 }))
    pole.position.set(C.freeThrowDist + 0.75, (C.rimHeight + 0.9) / 2, 0)
    g.add(pole)
    const rim = new THREE.Mesh(new THREE.TorusGeometry(C.rimRadius, 0.02, 8, 32), mat('#ff7a3c', { glow: 0.8 }))
    rim.rotation.x = Math.PI / 2
    rim.position.set(C.freeThrowDist, C.rimHeight, 0)
    g.add(rim)
    // 网（线框锥）
    const netPts = []
    for (let i = 0; i <= 10; i += 1) {
      const k = i / 10
      const r = C.rimRadius * (1 - k * 0.45)
      const y = C.rimHeight - k * 0.4
      for (let j = 0; j < 12; j += 1) {
        const a1 = (j / 12) * Math.PI * 2
        const a2 = ((j + 1) / 12) * Math.PI * 2
        netPts.push(C.freeThrowDist + Math.cos(a1) * r, y, Math.sin(a1) * r, C.freeThrowDist + Math.cos(a2) * r, y, Math.sin(a2) * r)
      }
    }
    const netGeo = new THREE.BufferGeometry()
    netGeo.setAttribute('position', new THREE.Float32BufferAttribute(netPts, 3))
    const net = new THREE.LineSegments(netGeo, lineMat('#ffffff', 0.35))
    g.add(net)
    // 出手点标记
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat('#d8f34a', { glow: 0.9 }))
    spot.position.set(0, this.shotBall.h0, 0)
    spot.userData.label = '出手点'
    g.add(spot)
    // 轨迹（动态更新）+ 抛物线参考
    this.shotPath = new THREE.Line(new THREE.BufferGeometry(), lineMat('#d8f34a', 0.95))
    g.add(this.shotPath)
    this.shotBallMesh = new THREE.Mesh(new THREE.SphereGeometry(C.ballRadius, 16, 12), mat('#ff9f4a', { glow: 0.5 }))
    g.add(this.shotBallMesh)
    // 最佳角虚线（45°参考）
    this.shotRef = new THREE.Line(new THREE.BufferGeometry(), lineMat('#7dffe8', 0.25))
    g.add(this.shotRef)
    return g
  }

  #updateShot() {
    const { v0, angle, h0 } = this.shotBall
    const traj = shotTrajectory(v0, angle, h0)
    const C = SHOT_CONST
    if (traj) {
      // 轨迹整体前移 0（球出手在 x=0），筐在 x=freeThrowDist
      const pts = traj.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
      this.shotPath.geometry.dispose()
      this.shotPath.geometry = new THREE.BufferGeometry().setFromPoints(pts)
      // 命中与飞行动画数据
      this.shotFly = { traj, pts, hit: Math.abs(traj.xHit - C.freeThrowDist) <= traj.clearance, missBy: traj.xHit - C.freeThrowDist }
    } else {
      this.shotFly = null
      this.shotPath.geometry.dispose()
      this.shotPath.geometry = new THREE.BufferGeometry()
    }
    // 停在出手点
    this.shotBallMesh.position.set(0, h0, 0)
    this.flying = false
    this.hooks.onShot?.(this.#shotResult())
  }

  #shotResult() {
    const C = SHOT_CONST
    const fly = this.shotFly
    if (!fly) return { reachable: false }
    return {
      reachable: true,
      hit: fly.hit,
      missBy: fly.missBy,
      xHit: fly.traj.xHit,
      maxH: fly.traj.maxH,
      flight: fly.traj.tHit,
      rimX: C.freeThrowDist
    }
  }

  #playShot(dt) {
    if (!this.shotFly) return
    const { traj } = this.shotFly
    const T = traj.tHit * 1.05
    this.flyT += dt / Math.max(T, 0.01)
    if (this.flyT >= 1) {
      this.flyT = 0
      this.flying = false
      return
    }
    const t = this.flyT * T
    const th = (this.shotBall.angle * Math.PI) / 180
    const x = this.shotBall.v0 * Math.cos(th) * t
    const y = this.shotBall.h0 + this.shotBall.v0 * Math.sin(th) * t - 0.5 * SHOT_CONST.g * t * t
    this.shotBallMesh.position.set(x, Math.max(y, 0.12), 0)
  }

  // ---------- 任意球 ----------
  #buildCurve() {
    const g = new THREE.Group()
    const C = CURVE_CONST
    // 草地
    const field = new THREE.Mesh(new THREE.BoxGeometry(C.goalDist + 14, 0.1, 16), mat('#1c5c34', { glow: 0.08, roughness: 0.95 }))
    field.position.set((C.goalDist + 10) / 2 - 2, -0.05, 0)
    g.add(field)
    // 草地条纹
    for (let i = 0; i < 8; i += 1) {
      if (i % 2) continue
      const strip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.02, 16), mat('#227040', { glow: 0.06, roughness: 0.95 }))
      strip.position.set(i * 4 + 2, 0.005, 0)
      g.add(strip)
    }
    // 球门
    const postMat = mat('#ffffff', { glow: 0.6 })
    for (const z of [-C.goalWidth / 2, C.goalWidth / 2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, C.goalHeight, 10), postMat)
      post.position.set(C.goalDist, C.goalHeight / 2, z)
      g.add(post)
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, C.goalWidth, 10), postMat)
    bar.rotation.x = Math.PI / 2
    bar.position.set(C.goalDist, C.goalHeight, 0)
    g.add(bar)
    // 人墙（4 个胶囊体）
    this.wall = new THREE.Group()
    for (let i = 0; i < 4; i += 1) {
      const guy = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, C.wallHeight - 0.5, 6, 12), mat('#ff5d86', { glow: 0.3 }))
      guy.position.set(C.wallDist, C.wallHeight / 2 - 0.05, (i - 1.5) * 0.55)
      this.wall.add(guy)
    }
    g.add(this.wall)
    // 球
    this.curveBallMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat('#ffffff', { glow: 0.4 }))
    g.add(this.curveBallMesh)
    // 旋转指示环
    this.spinRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 24), mat('#7dffe8', { glow: 0.9 }))
    this.spinRing.rotation.x = Math.PI / 2
    g.add(this.spinRing)
    // 轨迹
    this.curvePath = new THREE.Line(new THREE.BufferGeometry(), lineMat('#ffd166', 0.95))
    g.add(this.curvePath)
    // 目标门线区
    const goalZone = new THREE.Mesh(new THREE.PlaneGeometry(C.goalWidth, C.goalHeight), mat('#7dffe8', { glow: 0.25, opacity: 0.08 }))
    goalZone.position.set(C.goalDist, C.goalHeight / 2, 0)
    goalZone.rotation.y = Math.PI / 2
    g.add(goalZone)
    return g
  }

  #updateCurve() {
    const { v0, spin, rise } = this.curveShot
    const r = curveTrajectory(v0, spin, rise)
    this.curveFly = { r, t: 0 }
    const pts = r.points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
    this.curvePath.geometry.dispose()
    this.curvePath.geometry = new THREE.BufferGeometry().setFromPoints(pts)
    this.curveBallMesh.position.set(0, 0.11, 0)
    this.spinRing.position.set(0, 0.11, 0)
    this.spinRing.visible = spin > 0.2
    this.hooks.onCurve?.({
      cleared: r.wallCleared,
      wallHit: r.wallHit,
      goal: r.goal,
      endZ: r.endZ ?? 0,
      endY: r.endY ?? 0
    })
  }

  #playCurve(dt) {
    const fly = this.curveFly
    if (!fly || !fly.r.points.length) return
    fly.t += dt * 0.9
    const idx = Math.min(fly.r.points.length - 1, Math.floor(fly.t * 60))
    const [x, y, z] = fly.r.points[idx]
    this.curveBallMesh.position.set(x, y, z)
    this.spinRing.position.set(x, y, z)
    this.spinRing.rotation.z += dt * this.curveShot.spin * 4
    if (idx >= fly.r.points.length - 1) this.flying = false
  }

  // ---------- 短跑 ----------
  #buildSprint() {
    const g = new THREE.Group()
    // 跑道
    const track = new THREE.Mesh(new THREE.BoxGeometry(110, 0.1, 4.5), mat('#8a4a3c', { glow: 0.06, roughness: 0.9 }))
    track.position.set(50, -0.05, 0)
    g.add(track)
    // 分道线 + 每 10m 标记
    for (let i = 0; i <= 100; i += 10) {
      const mark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 4.5), mat('#ffffff', { glow: 0.5 }))
      mark.position.set(i, 0.01, 0)
      g.add(mark)
    }
    for (const z of [-2.25, 2.25]) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(110, 0.02, 0.08), mat('#ffffff', { glow: 0.4 }))
      lane.position.set(50, 0.01, z)
      g.add(lane)
    }
    // 终点线（醒目）
    const finish = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 4.5), mat('#d8f34a', { glow: 0.8 }))
    finish.position.set(100, 0.02, 0)
    g.add(finish)
    // 跑者（胶囊小人）
    this.runner = new THREE.Group()
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 6, 12), mat('#ffd166', { glow: 0.5 }))
    body.position.y = 0.9
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat('#ff9f4a', { glow: 0.5 }))
    head.position.y = 1.45
    this.runner.add(body, head)
    g.add(this.runner)
    // 速度指示（身后的速度条）
    this.speedBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1, 0.08), mat('#7dffe8', { glow: 0.9 }))
    this.speedBar.position.set(0, 0.5, 1.4)
    g.add(this.speedBar)
    // 分段速度柱状阵列
    this.splitBars = []
    for (let i = 0; i < SPRINT_SPLITS.length; i += 1) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.55), mat('#7cf2b0', { glow: 0.6 }))
      bar.position.set(i * 10 + 5, 0.05, -3.4)
      g.add(bar)
      this.splitBars.push(bar)
    }
    this.sprintProfile = sprintProfile()
    return g
  }

  #updateSprint(dt) {
    if (!this.sprintPlaying) return
    this.sprintT += dt
    const total = this.sprintProfile.totalTime
    const t = Math.min(this.sprintT, total - 0.146)
    // 由时间反推距离：找分段
    let d = 0
    let vNow = 0
    if (t <= 0) {
      d = 0
      vNow = 0
    } else {
      for (const m of this.sprintProfile.marks) {
        if (t >= m.tStart && t <= m.tEnd) {
          d = m.from + (t - m.tStart) * m.v
          vNow = m.v
          break
        }
      }
    }
    this.runner.position.set(d, 0, 0)
    // 身体前倾随速度减小
    const lean = Math.max(0, 0.5 - (vNow / 12.3) * 0.5)
    this.runner.rotation.z = lean
    this.speedBar.scale.y = Math.max(0.1, vNow / 12.3)
    this.speedBar.position.y = (vNow / 12.3) * 0.5
    // 分段柱实时高亮
    const segIdx = Math.min(SPRINT_SPLITS.length - 1, Math.floor(d / 10))
    this.splitBars.forEach((bar, i) => {
      bar.scale.y = 0.1 + (SPRINT_SPLITS[i].v / 12.3) * 1.6
      bar.position.y = bar.scale.y / 2
      bar.material.emissiveIntensity = i === segIdx && this.sprintPlaying ? 0.9 : 0.35
    })
    this.hooks.onSprint?.({ t: this.sprintT, d, v: vNow, done: this.sprintT >= total })
    if (this.sprintT >= total) this.sprintPlaying = false
  }

  // ---------- 心率 ----------
  #buildHeart() {
    const g = new THREE.Group()
    // 程序化心形：Shape 轮廓 → 挤出
    const s = new THREE.Shape()
    s.moveTo(0, 0.5)
    s.bezierCurveTo(0, 0.78, -0.36, 0.78, -0.36, 0.5)
    s.bezierCurveTo(-0.36, 0.28, -0.12, 0.12, 0, -0.05)
    s.bezierCurveTo(0.12, 0.12, 0.36, 0.28, 0.36, 0.5)
    s.bezierCurveTo(0.36, 0.78, 0, 0.78, 0, 0.5)
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.24, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 4 })
    geo.center()
    this.heart = new THREE.Mesh(geo, mat('#ff4f6e', { glow: 0.7, roughness: 0.35 }))
    this.heart.rotation.z = Math.PI // 心形是倒的，转正
    g.add(this.heart)
    // 血管装饰（两根管子）
    const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.5, 10), mat('#b6304a', { glow: 0.4 }))
    aorta.position.set(-0.12, 0.52, 0)
    aorta.rotation.z = 0.25
    g.add(aorta)
    // 心电环（随 bpm 转动的光环）
    this.ecgRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.012, 6, 48), mat('#7dffe8', { glow: 0.9 }))
    this.ecgRing.rotation.x = Math.PI / 2.6
    g.add(this.ecgRing)
    return g
  }

  #updateHeart(dt, time) {
    // 心跳缩放：双峰（lub-dub）
    const bpm = this.hooks.getBpm?.() ?? 60
    const period = 60 / Math.max(30, bpm)
    const phase = (time % period) / period
    const beat = Math.max(0, Math.sin(phase * Math.PI * 2)) * 0.06 + Math.max(0, Math.sin((phase - 0.14) * Math.PI * 2)) * 0.04
    this.heart.scale.setScalar(1 + beat)
    this.heart.position.y = beat * 0.4
    this.ecgRing.rotation.z += dt * (bpm / 60) * 1.2
    this.ecgRing.scale.setScalar(1 + beat * 0.3)
  }

  // ---------- 受力分解台（力学详解） ----------
  #buildTheory() {
    const g = new THREE.Group()
    // 展台
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.1, 48), mat('#142e26', { glow: 0.08, roughness: 0.95 }))
    floor.position.y = -0.05
    g.add(floor)
    const grid = new THREE.PolarGridHelper(3.2, 12, 5, 48, 0x2c5a4a, 0x1d3f34)
    grid.position.y = 0.012
    g.add(grid)
    // 球（半径随所选运动变化，最小可视 0.1）
    this.theoryBall = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), mat('#d8f34a', { glow: 0.35 }))
    this.theoryBall.position.y = 1.1
    g.add(this.theoryBall)
    // 球面缝线（两条环，让自转可见）
    this.theorySeam1 = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.008, 6, 40), mat('#10241b', { glow: 0.05 }))
    this.theorySeam2 = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.008, 6, 40), mat('#10241b', { glow: 0.05 }))
    this.theorySeam2.rotation.x = Math.PI / 2
    const seams = new THREE.Group()
    seams.add(this.theorySeam1, this.theorySeam2)
    this.theoryBall.add(seams)
    // 三力箭头：重力红 / 阻力蓝 / 马格努斯绿 + 速度白 + ω 轴黄
    this.theoryArrows = {
      fg: makeForceArrow('#ff5d86'),
      fd: makeForceArrow('#5da8ff'),
      fm: makeForceArrow('#7cf2b0'),
      v: makeForceArrow('#e8fff2')
    }
    for (const a of Object.values(this.theoryArrows)) g.add(a)
    this.omegaAxis = makeForceArrow('#d8f34a')
    g.add(this.omegaAxis)
    // 悬浮标签（Sprite 文本）
    this.theoryLabels = {}
    for (const [key, text, color] of [
      ['fg', '重力 Fg', '#ff5d86'],
      ['fd', '阻力 FD', '#5da8ff'],
      ['fm', 'Magnus FM', '#7cf2b0'],
      ['v', 'v', '#e8fff2']
    ]) this.theoryLabels[key] = this.#makeLabel(text, color, g)
    // 当前状态
    this.theoryState = { theoryId: 'tennis', v: 45, rpm: 2000 }
    this.theoryResult = null
    return g
  }

  #makeLabel(text, color, parent) {
    const canvas = document.createElement('canvas')
    canvas.width = 192
    canvas.height = 48
    const ctx = canvas.getContext('2d')
    ctx.font = '600 26px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 96, 24)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }))
    sprite.scale.set(0.9, 0.225, 1)
    parent.add(sprite)
    return sprite
  }

  #updateTheory() {
    const cfg = THEORIES.find((t) => t.id === this.theoryState.theoryId)?.live
    if (!cfg) return
    const r = forceCalc(cfg, this.theoryState.v, this.theoryState.rpm)
    this.theoryResult = { ...r, cfg }
    // 球体尺寸随真实半径（可视下限 0.1 m，放大倍数让羽毛球不至于看不见）
    const visR = Math.max(0.14, Math.min(cfg.R * 2.2, 0.34))
    this.theoryBall.scale.setScalar(visR / 0.24)
    this.theoryBall.material.color.set(THEORIES.find((t) => t.id === this.theoryState.theoryId)?.color || '#d8f34a')
    // 归一：最大力 → 1.7 单位
    const maxF = Math.max(r.fg, r.fd, r.fm, 0.001)
    const scale = (f) => (f / maxF) * 1.7
    const origin = this.theoryBall.position
    // 重力：向下
    aimArrow(this.theoryArrows.fg, origin, new THREE.Vector3(0, -1, 0), scale(r.fg))
    this.theoryLabels.fg.position.set(origin.x, origin.y - scale(r.fg) / 2 - 0.28, origin.z)
    // 阻力：水平向后（−x）
    aimArrow(this.theoryArrows.fd, origin, new THREE.Vector3(-1, 0, 0), scale(r.fd))
    this.theoryLabels.fd.position.set(origin.x - scale(r.fd) / 2 - 0.2, origin.y + 0.3, origin.z)
    // 马格努斯：侧旋（ω 竖直轴）→ 侧向 +z；后旋（ω 横轴）→ 升力 +y
    const fmLen = scale(r.fm)
    if (cfg.fmDir === 'up') {
      aimArrow(this.theoryArrows.fm, origin, new THREE.Vector3(0, 1, 0), fmLen)
      this.theoryLabels.fm.position.set(origin.x + 0.5, origin.y + fmLen / 2 + 0.18, origin.z)
      this.omegaAxisDir = new THREE.Vector3(1, 0, 0.35)
    } else {
      aimArrow(this.theoryArrows.fm, origin, new THREE.Vector3(0, 0, 1), fmLen)
      this.theoryLabels.fm.position.set(origin.x, origin.y + 0.28, origin.z + fmLen / 2 + 0.22)
      this.omegaAxisDir = new THREE.Vector3(0.2, 1, 0)
    }
    // 速度箭头（固定 1.4，代表大小不与力同尺度）
    aimArrow(this.theoryArrows.v, origin, new THREE.Vector3(1, 0.12, 0), 1.4)
    this.theoryLabels.v.position.set(origin.x + 0.9, origin.y + 0.36, origin.z)
    // ω 轴（转速为 0 时隐藏）
    aimArrow(this.omegaAxis, origin, this.omegaAxisDir, Math.min(1.1, this.theoryState.rpm / cfg.rpmMax * 1.1 + 0.15))
    this.theoryLabels.fm.visible = r.fm > maxF * 0.04
    this.hooks.onTheory?.({ fg: r.fg, fd: r.fd, fm: r.fm, CL: r.CL, S: r.S, drift: r.drift, fdX: r.fdX, fmX: r.fmX })
  }

  #tickTheory(dt, time) {
    // 球自转：侧旋绕竖直轴，后旋绕横轴
    const w = (this.theoryState.rpm * 2 * Math.PI) / 60
    const visSpin = Math.min(w / 40, 3.5) // 视觉降速
    if (this.omegaAxisDir && this.omegaAxisDir.y > 0.5) {
      this.theoryBall.rotateY(visSpin * dt)
    } else if (this.omegaAxisDir) {
      this.theoryBall.rotateZ(visSpin * dt)
    }
    // 电梯球分支：低转速时球轻微抖动（涡脱落示意）
    const cfg = this.theoryResult?.cfg
    if (cfg && this.theoryState.rpm < cfg.rpmMax * 0.15 && cfg.fmDir === 'side') {
      this.theoryBall.position.x = Math.sin(time * 5.2) * 0.05
      this.theoryBall.position.z = Math.sin(time * 3.7) * 0.05
    } else {
      this.theoryBall.position.x = 0
      this.theoryBall.position.z = 0
    }
    // 标签跟随悬浮呼吸
    this.theoryBall.position.y = 1.1 + Math.sin(time * 1.6) * 0.03
  }

  setTheory(params) {
    Object.assign(this.theoryState, params)
    if (this.mode === 'theory') this.#updateTheory()
  }

  // ---------- 公共 ----------
  setTheme(id) {
    this.mode = id
    Object.entries(this.groups).forEach(([name, group]) => {
      group.visible = name === id
    })
    const cam = CAMERAS[id]
    this.camera.position.set(...cam.pos)
    this.controls.target.set(...cam.target)
    if (id === 'shot') this.#updateShot()
    if (id === 'curve') this.#updateCurve()
    if (id === 'theory') this.#updateTheory()
  }

  setShot(params) {
    Object.assign(this.shotBall, params)
    if (this.mode === 'shot') this.#updateShot()
  }

  playShot() {
    if (!this.shotFly?.reachable) return
    this.flyT = 0
    this.flying = true
  }

  setCurveShot(params) {
    Object.assign(this.curveShot, params)
    if (this.mode === 'curve') this.#updateCurve()
  }

  playCurve() {
    if (!this.curveFly) return
    this.curveFly.t = 0
    this.flying = true
  }

  playSprint() {
    this.sprintT = 0
    this.sprintPlaying = true
  }

  stopSprint() {
    this.sprintPlaying = false
  }

  #resize() {
    const parent = this.canvas.parentElement
    const width = parent?.clientWidth || window.innerWidth
    const height = parent?.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  #loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.elapsedTime
    if (this.mode === 'shot' && this.flying) this.#playShot(dt)
    if (this.mode === 'curve') {
      if (this.flying) this.#playCurve(dt)
      this.wall.children.forEach((guy, i) => {
        guy.position.y += Math.sin(time * 6 + i) * 0.0008 // 人墙轻微起跳感
      })
    }
    if (this.mode === 'sprint') this.#updateSprint(dt)
    if (this.mode === 'heart') this.#updateHeart(dt, time)
    if (this.mode === 'theory') this.#tickTheory(dt, time)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(() => this.#loop())
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this._onResize)
    this.scene.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => m.dispose?.())
    })
    this.controls.dispose()
    this.renderer.dispose()
  }
}
