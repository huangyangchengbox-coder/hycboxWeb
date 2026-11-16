import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BOARDS, boardById } from './boards.js'
import { buildBoard } from './boardModel.js'
import { buildSkater, poseSkater } from './skater.js'
import { ForceArrow, PivotRing, LeverLine, TurnArc } from './vectors.js'
import { solve } from './physics.js'
import { trickById, sampleTrick } from './tricks.js'

const DEG = Math.PI / 180
const V = (x, y, z) => new THREE.Vector3(x, y, z)

/** 相机预设：side=教学主视角，top=俯视（转向/对比），low=贴地（轮咬/漂移），com=重心视角。 */
export const CAMERA_PRESETS = {
  side: { pos: V(2.6, 1.15, 2.6), target: V(0, 0.42, 0) },
  top: { pos: V(0.001, 4.4, 0.02), target: V(0, 0, 0) },
  low: { pos: V(1.8, 0.22, 1.15), target: V(0, 0.16, 0) },
  com: { pos: V(0.75, 1.0, 1.1), target: V(0, 0.75, 0) }
}

export class SkateScene {
  constructor(canvas) {
    this.canvas = canvas
    this.disposed = false
    this.onFrame = null

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b1120)
    this.scene.fog = new THREE.FogExp2(0x0b1120, 0.055)

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.05, 120)
    this.camera.position.copy(CAMERA_PRESETS.side.pos)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.buildLights()
    this.buildGround()

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.495
    this.controls.minDistance = 0.6
    this.controls.maxDistance = 12
    this.controls.target.copy(CAMERA_PRESETS.side.target)

    this.camGoal = new THREE.Vector3()
    this.targetGoal = new THREE.Vector3()
    this.camBlend = 0

    // ---- 控制状态 ----
    this.boardId = 'street'
    this.board = null
    this.mode = 'force'
    this.control = { comX: 0, leanY: 0, speed: 0 }
    this.trickId = null
    this.trickT = 0
    this.playing = true
    this.timeScale = 1

    // ---- 滑手 ----
    this.skater = buildSkater()
    this.scene.add(this.skater.group)

    // ---- 矢量组 ----
    this.vec = {
      g: new ForceArrow({ color: '#facc15', label: '重力 mg' }),
      n1: new ForceArrow({ color: '#22d3ee', label: 'N₁ 前轮' }),
      n2: new ForceArrow({ color: '#7f6ce0', label: 'N₂ 后轮' }),
      fc: new ForceArrow({ color: '#f87171', label: '离心 Fc' }),
      pump: new ForceArrow({ color: '#4ade80', label: '泵速推力' })
    }
    for (const key of Object.keys(this.vec)) this.scene.add(this.vec[key].group)
    this.pivotRing = new PivotRing()
    this.lever = new LeverLine()
    this.arc = new TurnArc()
    this.scene.add(this.pivotRing.mesh, this.lever.group, this.arc.group)
    this.vecScale = 0.55 / 800 // 力(N) → 长度(m) 的固定比例尺

    this.setBoard(this.boardId)
    this.setMode('force')

    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.onVisible = () => {
      if (this.disposed || document.hidden) return
      cancelAnimationFrame(this.frameId)
      this.last = performance.now()
      this.frameId = requestAnimationFrame(this.frame)
    }
    document.addEventListener('visibilitychange', this.onVisible)
    this.resize()
    this.last = performance.now()
    this.frame = (now) => this.animate(now)
    this.frameId = requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) window.__skate = this
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x8fb4ff, 0x0e1626, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 2.1)
    key.position.set(3.2, 5.5, 2.8)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -2.5
    key.shadow.camera.right = 2.5
    key.shadow.camera.top = 2.5
    key.shadow.camera.bottom = -2.5
    key.shadow.camera.far = 12
    key.shadow.bias = -0.0008
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0x22d3ee, 0.5)
    rim.position.set(-4, 2.5, -3)
    this.scene.add(rim)
  }

  buildGround() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x141c2e, roughness: 0.92 })
    const ground = new THREE.Mesh(new THREE.CircleGeometry(7, 48), mat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.scene.add(ground)

    const grid = new THREE.GridHelper(14, 56, 0x22d3ee, 0x1c2a44)
    grid.material.transparent = true
    grid.material.opacity = 0.16
    grid.position.y = 0.002
    this.scene.add(grid)

    // 滑行参考线（+x 前进方向）
    const laneMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    const laneGeo = new THREE.BufferGeometry().setFromPoints([V(-2.4, 0.004, 0), V(2.4, 0.004, 0)])
    this.scene.add(new THREE.Line(laneGeo, laneMat))
  }

  // ---- 对外 API ----

  setBoard(id) {
    this.boardId = id
    this.board?.dispose()
    this.board = buildBoard(boardById(id))
    this.scene.add(this.board.group)
  }

  /** 模式切换：boards 模式下主体隐藏、显示四板对比；其余模式共用主场景。 */
  setMode(mode) {
    this.mode = mode
    const comparison = mode === 'boards'
    if (comparison) {
      if (!this.comparison) {
        this.comparison = []
        const gap = 0.62
        const startX = -((BOARDS.length - 1) * gap) / 2
        BOARDS.forEach((cfg, i) => {
          const b = buildBoard(cfg)
          b.group.position.set(startX + i * gap, 0.012, 0)
          this.scene.add(b.group)
          this.comparison.push(b)
        })
      }
      this.comparison.forEach((b) => (b.group.visible = true))
      this.board.group.visible = false
      this.skater.group.visible = false
      this.hideVectors()
    } else {
      this.comparison?.forEach((b) => (b.group.visible = false))
      this.board.group.visible = true
      this.skater.group.visible = true
    }
    if (mode !== 'force' && mode !== 'safety' && mode !== 'quiz') this.stopTrick()
    if (mode === 'tricks' && !this.trickId) this.playTrick('ollie')
  }

  setControl(patch) {
    Object.assign(this.control, patch)
    this.stopTrick()
  }

  playTrick(id) {
    this.trickId = id
    this.trickT = 0
    this.playing = true
    const trick = trickById(id)
    if (trick.board !== this.boardId) this.setBoard(trick.board)
  }

  stopTrick() {
    this.trickId = null
    this.trickT = 0
    this.playing = false
  }

  setTimeline(t) {
    this.trickT = t
  }

  setPlaying(v) {
    this.playing = v
  }

  setTimeScale(v) {
    this.timeScale = v
  }

  applyCamera(name, immediate = false) {
    const preset = CAMERA_PRESETS[name]
    if (!preset) return
    this.camGoal.copy(preset.pos)
    this.targetGoal.copy(preset.target)
    if (immediate) {
      this.camera.position.copy(this.camGoal)
      this.controls.target.copy(this.targetGoal)
      this.camBlend = 0
      this.controls.update()
      return
    }
    this.camBlend = 1
  }

  hideVectors() {
    for (const key of Object.keys(this.vec)) this.vec[key].hide()
    this.pivotRing.hide()
    this.lever.hide()
    this.arc.hide()
  }

  // ---- 每帧 ----

  animate(now) {
    if (this.disposed || document.hidden) return
    this.frameId = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    if (this.mode !== 'boards') this.updateMain(dt)
    this.controls.update()
    if (this.camBlend > 0) {
      this.camera.position.lerp(this.camGoal, 0.1)
      this.controls.target.lerp(this.targetGoal, 0.1)
      this.camBlend *= 0.92
      if (this.camBlend < 0.02) this.camBlend = 0
    }
    this.renderer.render(this.scene, this.camera)
  }

  updateMain(dt) {
    const cfg = boardById(this.boardId)
    const pose = { crouch: 0.16, bodyPitch: 0, bodyRoll: 0, armSpread: 0.3 }
    let boardY = 0
    let boardPitch = 0
    let boardRoll = 0
    let boardYaw = 0
    let result = null
    let trickInfo = null
    let loadFactor = null

    if (this.trickId) {
      // 动作播放：关键帧驱动一切
      const trick = trickById(this.trickId)
      if (this.playing) {
        this.trickT += dt * this.timeScale
        if (trick.loop) this.trickT %= trick.duration
        else if (this.trickT >= trick.duration) {
          this.trickT = trick.duration // 非循环动作停在末帧
          this.playing = false
        }
      }
      const s = sampleTrick(trick, this.trickT)
      trickInfo = s
      loadFactor = s.loadFactor
      pose.crouch = s.crouch
      pose.bodyPitch = s.bodyPitch
      pose.bodyRoll = s.bodyRoll
      pose.armSpread = s.armSpread
      boardY = s.boardY
      boardPitch = s.boardPitch
      boardRoll = s.boardRoll
      boardYaw = s.boardYaw
      // 静态解算仍给出基础遥测（trick 时标注"阶段示意值"）
      result = solve(this.control, cfg)
      this.updateBoard(cfg, boardY, boardPitch, boardRoll, boardYaw, result, s)
      this.updateSkaterPose(cfg, pose)
      this.updateVectorsTrick(cfg, s, result)
    } else {
      // 受力实验室：滑块实时解算
      result = solve(this.control, cfg)
      boardPitch = (result.pitchDeg * DEG) * 0.9
      boardRoll = (result.leanDeg * DEG) * 0.3
      boardYaw = this.mode === 'turn' ? -result.leanDeg * DEG * 0.12 : 0
      pose.bodyRoll = result.leanDeg * DEG * 0.55
      pose.crouch = 0.16 + Math.min(0.12, Math.abs(result.leanDeg) / 35 * 0.12)
      loadFactor = null
      this.updateBoard(cfg, boardY, boardPitch, boardRoll, boardYaw, result, null)
      this.updateSkaterPose(cfg, pose)
      this.updateVectorsStatic(cfg, result)
    }

    // 轮子转动：rotateY 是局部系增量旋转（局部 y 即轮轴方向），不干扰 rotation.x 的定轴
    const v = this.trickId ? 0 : result.v
    const spin = (v / this.board.wheelRadius) * dt
    for (const wheel of this.board.wheels) wheel.rotateY(spin)

    this.emit({
      boardId: this.boardId,
      trick: trickInfo,
      loadFactor,
      ...result
    })
  }

  /** 摆板：位置 + 姿态。静态翘板时旋转绕支点（桥）而非板中心。 */
  updateBoard(cfg, boardY, boardPitch, boardRoll, boardYaw, result, trickSample) {
    const g = this.board.group
    let pivotX = 0
    if (!trickSample && result.stance !== 'dual') {
      pivotX = result.pivot / 100 // cm → m，支点在 ±轴距/2
    }
    const theta = boardPitch
    // 板 group 原点在板中心；绕支点旋转时位置补偿：pos = pivot − R·(−pivot)
    g.rotation.set(boardRoll, boardYaw, theta)
    g.position.set(pivotX * (1 - Math.cos(theta)), boardY - pivotX * Math.sin(theta), 0)
  }

  updateSkaterPose(cfg, pose) {
    const wb = cfg.wheelbase / 100
    const deckTop = 0.055
    const g = this.board.group
    const pitch = g.rotation.z
    const comCm = this.trickId ? 0 : solve(this.control, cfg).comCm
    const comX = comCm / 100
    // 踝位置：踩板面，随板俯仰抬升（绕板中心的近似）
    const ankleFX = wb * 0.36
    const ankleRX = -wb * 0.4
    const ankleF = V(ankleFX, deckTop + Math.sin(pitch) * ankleFX, 0.045)
    const ankleR = V(ankleRX, deckTop + Math.sin(pitch) * ankleRX, -0.045)
    ankleF.applyEuler(g.rotation).add(g.position)
    ankleR.applyEuler(g.rotation).add(g.position)
    poseSkater(this.skater, { ankleF, ankleR, comX, pose })
  }

  /** 静态模式矢量。 */
  updateVectorsStatic(cfg, r) {
    const comX = r.comCm / 100
    const comY = 0.92 - 0.34 * 0.16
    const mgLen = 0.8
    const scaleF = (len) => (len / r.mg) * mgLen

    this.vec.g.show()
    this.vec.g.set(V(comX, comY, 0), V(0, -1, 0), mgLen)

    // 支撑力：双支撑时前后轮各一根；越支点时只有支点一根
    const frontX = (cfg.wheelbase / 2) / 100
    const rearX = -frontX
    if (r.stance === 'dual') {
      this.vec.n1.show()
      this.vec.n1.set(V(frontX, 0.02, 0), V(0, 1, 0), scaleF(r.mg * r.n1))
      this.vec.n2.show()
      this.vec.n2.set(V(rearX, 0.02, 0), V(0, 1, 0), scaleF(r.mg * r.n2))
    } else {
      this.vec.n1.hide()
      this.vec.n2.show()
      this.vec.n2.set(V(rearX, 0.02, 0), V(0, 1, 0), scaleF(r.mg))
    }

    // 力矩三件套：支点光圈 + 力臂紫线
    if (r.stance !== 'dual') {
      this.pivotRing.set(r.pivot / 100)
      this.lever.set(r.pivot / 100, comX, comY * 0.55)
    } else {
      this.pivotRing.hide()
      this.lever.hide()
    }

    // 离心力 / 抓地
    if (r.fc > 1) {
      this.vec.fc.show()
      this.vec.fc.set(V(comX, comY, 0), V(0, 0, r.leanDeg >= 0 ? 1 : -1), scaleF(r.fc))
      this.arc.set(r.radius, r.leanDeg)
    } else {
      this.vec.fc.hide()
      this.arc.hide()
    }

    // 泵速推力
    if (r.pumpForce > 8) {
      this.vec.pump.show()
      this.vec.pump.set(V(frontX, 0.1, 0), V(1, 0, 0), scaleF(r.pumpForce))
    } else {
      this.vec.pump.hide()
    }
  }

  /** 动作播放矢量：G 恒定，N 按阶段示意倍数。 */
  updateVectorsTrick(cfg, s, r) {
    const comX = 0
    const comY = 0.9
    const mgLen = 0.8
    const frontX = (cfg.wheelbase / 2) / 100
    const rearX = -frontX

    this.vec.g.show()
    this.vec.g.set(V(comX, comY, 0), V(0, -1, 0), mgLen)

    const nLen = Math.max(0.1, s.loadFactor * mgLen)
    if (s.loadFactor > 0.05) {
      this.vec.n1.show()
      this.vec.n1.set(V(frontX, 0.02, 0), V(0, 1, 0), nLen)
      this.vec.n2.show()
      this.vec.n2.set(V(rearX, 0.02, 0), V(0, 1, 0), nLen)
    } else {
      this.vec.n1.hide()
      this.vec.n2.hide()
    }
    this.pivotRing.hide()
    this.lever.hide()
    this.vec.fc.hide()
    this.vec.pump.hide()
    this.arc.hide()
    void r
  }

  emit(payload) {
    this.onFrame?.(payload)
  }

  resize() {
    const width = this.canvas.clientWidth || 1
    const height = this.canvas.clientHeight || 1
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('resize', this.onResize)
    this.board?.dispose()
    this.comparison?.forEach((b) => b.dispose())
    this.skater.dispose()
    for (const key of Object.keys(this.vec)) this.vec[key].dispose()
    this.pivotRing.dispose()
    this.lever.dispose()
    this.arc.dispose()
    this.controls.dispose()
    this.renderer.dispose()
  }
}
