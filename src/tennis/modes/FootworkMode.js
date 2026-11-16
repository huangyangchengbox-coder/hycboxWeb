import * as THREE from 'three'
import { COURT } from '../catalog.js'
import { buildCourt } from '../court.js'
import { buildPlayer } from '../player.js'
import { buildRacket } from '../racket.js'
import { buildBall } from '../ball.js'
import { makeLabel } from '../labels.js'
import { TennisMode, disposeTree } from '../mode.js'
import { SCENARIOS, footprintsUpTo, hitTimeOf, sampleScenario, scenarioById, STEP_STYLE } from '../footwork.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

/**
 * 脚步 3D 演示：与 2D 俯视图共用 footwork.js 的场景数据。
 * 文档坐标 (x, y) 映射到世界坐标：x → x，y → −(y)（因为 y=0 是球网，y>0 是己方半场即 z<0）。
 */
export class FootworkMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'footwork'
    this.scenario = scenarioById('baseline_rally')
    this.progress = 0
    this.playing = true
    this.speed = 1
    this.showMarks = true
    this.build()
    this.applyScenario(this.scenario, true)
  }

  build() {
    this.court = buildCourt({ surface: 'hard' })
    this.add(this.court.group)

    this.player = buildPlayer()
    this.add(this.player.group)

    this.racket = buildRacket({ headArea: 100, pattern: [16, 19], showSweet: false })
    this.racket.group.position.set(0.3, 0, 0)
    this.player.elbow.add(this.racket.group)

    this.ballObj = buildBall()
    this.add(this.ballObj.group)

    this.marksGroup = new THREE.Group()
    this.add(this.marksGroup)
    this.overlay = new THREE.Group()
    this.add(this.overlay)
  }

  toWorldZ(y) {
    return -y
  }

  clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child)
      disposeTree(child)
    }
  }

  label(text, x, y, z, color, scale = 0.0042, parent = this.overlay) {
    const sprite = makeLabel(text, { color, scale, font: 40, padding: 14 })
    sprite.position.set(x, y, z)
    sprite.material.depthTest = false
    sprite.renderOrder = 3
    parent.add(sprite)
    return sprite
  }

  applyScenario(scenario, snapCamera) {
    this.scenario = scenario
    this.progress = 0
    this.drawRoutes()
    this.applyProgress(0)
    if (snapCamera) this.setCamera('top', true)
    this.report()
  }

  drawRoutes() {
    this.clearGroup(this.overlay)
    const sc = this.scenario
    const kfs = sc.keyframes
    let hitIndex = kfs.findIndex((k) => k.stepType === 'hit')
    if (hitIndex < 0) hitIndex = Math.floor(kfs.length * 0.65)

    const dash = (from, to, color) => {
      const pts = from.map((k) => new THREE.Vector3(k.x, 0.06, this.toWorldZ(k.y)))
      if (pts.length < 2) return
      const geo = new THREE.BufferGeometry().setFromPoints(pts)
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.3,
        gapSize: 0.2,
        transparent: true,
        opacity: 0.7
      })
      const line = new THREE.Line(geo, mat)
      line.computeLineDistances()
      line.frustumCulled = false
      this.overlay.add(line)
    }

    dash(kfs.slice(0, hitIndex + 1), 0x22d3ee)
    dash(kfs.slice(hitIndex), 0xfbbf24)

    // 击球点
    const hitKf = kfs[hitIndex]
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.36, 32),
      new THREE.MeshBasicMaterial({ color: 0x34d399, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(hitKf.x, 0.05, this.toWorldZ(hitKf.y))
    this.overlay.add(ring)
    this.label('击球点', hitKf.x, 0.55, this.toWorldZ(hitKf.y) + 0.5, '#6ee7b7')
  }

  /** 足印：每次进度变化都重建，数量不大。 */
  refreshMarks() {
    this.clearGroup(this.marksGroup)
    if (!this.showMarks) return
    const marks = footprintsUpTo(this.scenario, this.progress, { steps: 200 })
    for (const mark of marks) {
      const color = mark.type === 'split'
        ? 0xd8f34a
        : mark.foot === 'L'
          ? 0xf43f5e
          : 0x38bdf8
      const shoe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.26),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: mark.type === 'split' ? 0.9 : 0.78,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      )
      shoe.rotation.x = -Math.PI / 2
      shoe.rotation.z = -mark.angle
      shoe.position.set(mark.x, 0.045, this.toWorldZ(mark.y))
      shoe.renderOrder = 2
      this.marksGroup.add(shoe)
    }
  }

  /** 球的当前位置（按 2D 场景的球路插值）。 */
  ballAt(t) {
    const b = this.scenario.ball
    const tHit = hitTimeOf(this.scenario)
    const tBounce = tHit * 0.72
    let x = b.start.x
    let y = b.start.y
    let lift = 1

    if (t <= tBounce) {
      const lt = tBounce > 0 ? t / tBounce : 0
      x = b.start.x + (b.bounce.x - b.start.x) * lt
      y = b.start.y + (b.bounce.y - b.start.y) * lt
      lift = Math.sin(lt * Math.PI) * 0.9
    } else if (t <= tHit) {
      const lt = (t - tBounce) / Math.max(1e-4, tHit - tBounce)
      x = b.bounce.x + (b.hit.x - b.bounce.x) * lt
      y = b.bounce.y + (b.hit.y - b.bounce.y) * lt
      lift = Math.sin(lt * Math.PI * 0.7) * 0.75
    } else {
      const lt = (t - tHit) / Math.max(1e-4, 1 - tHit)
      x = b.hit.x + (b.target.x - b.hit.x) * lt
      y = b.hit.y + (b.target.y - b.hit.y) * lt
      lift = Math.sin(Math.min(1, lt * 1.4) * Math.PI) * 0.9
    }
    return { x, y, height: 0.15 + lift }
  }

  applyProgress(t) {
    const p = clamp(t, 0, 1)
    this.progress = p
    const s = sampleScenario(this.scenario, p)

    // 位置：文档 y > 0 是己方半场 → 世界 z 为负
    this.player.group.position.set(s.x, 0, this.toWorldZ(s.y))

    // facing：0 表示朝 +y（朝球网）。文档里 facing 是相对朝向，这里直接映射
    this.player.group.rotation.y = Math.PI + s.facing

    // 姿态：垫步时屈膝下沉，移动时低重心，击球时转髋
    const bob = s.stepType === 'split'
      ? 0.05 * Math.abs(Math.sin(p * Math.PI * 20))
      : 0.02 * Math.abs(Math.sin(p * Math.PI * 30))
    const crouch = s.stepType === 'hit' ? 0.09 : s.stepType === 'brake' ? 0.07 : 0.03
    this.player.group.position.y = bob - crouch

    const sway = Math.sin(p * Math.PI * 26) * 0.12
    this.player.torsoPivot.rotation.y = s.stepType === 'hit' ? -0.55 : -0.16 + sway * 0.3
    this.player.torsoPivot.rotation.x = 0.1
    this.player.rightShoulder.rotation.set(-0.1, -0.28, 0.2 + sway * 0.2)
    this.player.leftShoulder.rotation.y = -0.5
    this.player.leftShoulder.rotation.z = -0.3
    this.player.legs[0].rotation.x = 0.24 + bob * 2
    this.player.legs[1].rotation.x = 0.16 - bob * 2
    this.player.elbow.rotation.y = s.stepType === 'hit' ? 0.1 : 0.55
    this.racket.hoopGroup.rotation.set(0, s.stepType === 'hit' ? -0.5 : 0, 0)
    this.racket.setPocket(0)

    // 球
    const ball = this.ballAt(p)
    this.ballObj.group.position.set(ball.x, ball.height, this.toWorldZ(ball.y))

    this.refreshMarks()

    this.onProgress?.({
      progress: p,
      phase: s.label,
      footCue: s.footCue,
      stepType: s.stepType,
      stepColor: STEP_STYLE[s.stepType]?.color || '#d8f34a'
    })
  }

  setScenario(id) {
    this.applyScenario(scenarioById(id), false)
    this.playing = true
  }

  setPlaying(value) {
    this.playing = value
  }

  setSpeed(value) {
    this.speed = value
  }

  setMarks(value) {
    this.showMarks = value
    this.refreshMarks()
  }

  setProgress(value) {
    this.playing = false
    this.applyProgress(clamp(value, 0, 1))
  }

  update(dt) {
    if (!this.playing) return
    this.progress += (dt * this.speed) / this.scenario.duration
    if (this.progress >= 1) this.progress = 0
    this.applyProgress(this.progress)
  }

  report() {
    this.onData?.({
      id: this.scenario.id,
      title: this.scenario.title,
      duration: this.scenario.duration
    })
  }

  onEnter() {
    this.setCamera('top', true)
    this.report()
  }

  cameraPresets() {
    return {
      top: {
        pos: new THREE.Vector3(0.01, 17.5, -3.4),
        target: new THREE.Vector3(0, 0, -5.2)
      },
      angle: {
        pos: new THREE.Vector3(13, 6.4, 3.6),
        target: new THREE.Vector3(0.6, 0.6, -6)
      },
      behind: {
        pos: new THREE.Vector3(0.4, 2.6, -15.4),
        target: new THREE.Vector3(0.2, 1.1, -2)
      },
      side: {
        pos: new THREE.Vector3(9.6, 2.2, -9),
        target: new THREE.Vector3(0, 1, -8)
      },
      net: {
        pos: new THREE.Vector3(0.6, 2.1, 4.6),
        target: new THREE.Vector3(0, 0.9, -4)
      }
    }
  }

  defaultCamera() {
    return 'top'
  }

  dispose() {
    this.racket.dispose()
    this.player.dispose()
    this.ballObj.dispose()
    this.court.dispose()
    super.dispose()
  }

  static scenarios() {
    return SCENARIOS
  }
}
