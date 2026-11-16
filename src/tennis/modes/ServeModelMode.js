import * as THREE from 'three'
import { COURT } from '../catalog.js'
import { buildCourt, SURFACES } from '../court.js'
import { buildBall } from '../ball.js'
import { makeLabel, dimensionLine } from '../labels.js'
import { TennisMode, disposeTree } from '../mode.js'
import { NET_HEIGHT, SERVE_DEFAULTS, SERVICE_BOX_LEN, computeServe, trajectoryY } from '../servemath.js'

const COLOR_NEAR = 0xf5b942
const COLOR_FAR = 0x34d399
const COLOR_CUSTOM = 0x60a5fa
const COLOR_CONTACT = 0xff6b5a

/**
 * 3D 视角的发球轨迹：与「发球数学模型」文档共用同一套解析解。
 * 世界坐标里底线在 z = −11.885，球网在 z = 0，于是
 *   z = −netDist + x
 * 文档里的水平距离 x 直接映射到球场纵深。
 */
function lineOf(points, color, { dashed = false, opacity = 1 } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.22, gapSize: 0.14, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const line = new THREE.Line(geo, mat)
  if (dashed) line.computeLineDistances()
  line.frustumCulled = false
  return line
}

export class ServeModelMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'model'
    this.state = { ...SERVE_DEFAULTS }
    this.surfaceId = 'hard'
    this.time = 0
    this.playing = true
    this.build()
    this.apply(this.state)
  }

  build() {
    this.court = buildCourt({ surface: this.surfaceId })
    this.add(this.court.group)
    this.overlay = new THREE.Group()
    this.add(this.overlay)
    this.ballObj = buildBall()
    this.add(this.ballObj.group)
  }

  surface() {
    return SURFACES[this.surfaceId] || SURFACES.hard
  }

  /** 外部（文档面板）推送参数。 */
  apply(state) {
    this.state = { ...this.state, ...state }
    this.result = computeServe(this.state)
    this.time = 0
    this.draw()
    this.placeBall(0)
    this.report()
    return this.result
  }

  report() {
    const r = this.result
    if (!r) return
    this.onData?.({
      heightCm: r.heightCm,
      speedKmh: r.speedKmh,
      v: r.v,
      h0: r.h0,
      netDist: r.netDist,
      surfaceId: this.surfaceId,
      near: r.near,
      far: r.far,
      custom: r.custom,
      windowLen: r.windowLen
    })
  }

  setHeight(cm) {
    return this.apply({ heightCm: Math.min(215, Math.max(150, Math.round(cm))) })
  }

  setSpeed(ms) {
    return this.apply({ speedKmh: Math.min(230, Math.max(70, Math.round(ms * 3.6))) })
  }

  setSurface(id) {
    this.surfaceId = id
    this.court.setSurface(id)
    this.report()
  }

  setPlaying(value) {
    this.playing = value
  }

  replay() {
    this.time = 0
    this.playing = true
  }

  /** 文档 x 坐标 → 世界 z。 */
  worldZ(x) {
    return -this.result.netDist + x
  }

  clearOverlay() {
    for (const child of [...this.overlay.children]) {
      this.overlay.remove(child)
      disposeTree(child)
    }
  }

  label(text, x, y, z, color, scale = 0.0048) {
    const sprite = makeLabel(text, { color, scale, font: 40, padding: 14 })
    sprite.position.set(x, y, z)
    sprite.material.depthTest = false
    sprite.renderOrder = 3
    this.overlay.add(sprite)
    return sprite
  }

  /** 采样一条弹道到落地为止。 */
  sample(theta, steps = 110) {
    const r = this.result
    const pts = []
    const limit = r.netDist + SERVICE_BOX_LEN + 2.4
    for (let i = 0; i <= steps; i += 1) {
      const x = (limit * i) / steps
      const y = trajectoryY(x, r.h0, r.v, theta)
      if (y < 0) {
        pts.push(new THREE.Vector3(0, 0.03, this.worldZ(x)))
        break
      }
      pts.push(new THREE.Vector3(0, y, this.worldZ(x)))
    }
    return pts
  }

  draw() {
    this.clearOverlay()
    const r = this.result
    const ground = 0.04
    const xAxis = -COURT.singlesWidth / 2 - 1.3

    // 发球区高亮（球网 → 发球线）
    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.singlesWidth, SERVICE_BOX_LEN),
      new THREE.MeshBasicMaterial({
        color: 0xf5e663,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    box.rotation.x = -Math.PI / 2
    box.position.set(0, 0.03, SERVICE_BOX_LEN / 2)
    this.overlay.add(box)

    // 地面标尺：每 2.5 m 一格
    this.overlay.add(lineOf([
      new THREE.Vector3(xAxis, ground, this.worldZ(0)),
      new THREE.Vector3(xAxis, ground, this.worldZ(r.netDist + SERVICE_BOX_LEN + 2.2))
    ], 0xf2fbf2, { opacity: 0.8 }))
    for (let x = 0; x <= r.netDist + SERVICE_BOX_LEN + 2; x += 2.5) {
      const z = this.worldZ(x)
      this.overlay.add(lineOf([
        new THREE.Vector3(xAxis - 0.28, ground, z),
        new THREE.Vector3(xAxis + 0.06, ground, z)
      ], 0xf2fbf2, { opacity: 0.6 }))
      this.label(`${x.toFixed(1)}`, xAxis - 0.62, 0.02, z, '#a9c4b6', 0.004)
    }

    // 高度标尺
    for (let y = 0.5; y <= 3; y += 0.5) {
      this.overlay.add(lineOf([
        new THREE.Vector3(xAxis - 0.2, y, this.worldZ(0)),
        new THREE.Vector3(xAxis + 0.2, y, this.worldZ(0))
      ], 0xf2fbf2, { opacity: 0.5 }))
      this.label(`${y.toFixed(1)}`, xAxis - 0.66, y, this.worldZ(0), '#a9c4b6', 0.0038)
    }
    this.overlay.add(lineOf([
      new THREE.Vector3(xAxis, ground, this.worldZ(0)),
      new THREE.Vector3(xAxis, 3.05, this.worldZ(0))
    ], 0xf2fbf2, { opacity: 0.8 }))

    // 网顶 0.914 m 参考线
    this.overlay.add(lineOf([
      new THREE.Vector3(-COURT.singlesWidth / 2, NET_HEIGHT, 0),
      new THREE.Vector3(COURT.singlesWidth / 2, NET_HEIGHT, 0)
    ], 0xffd166, { dashed: true, opacity: 0.7 }))

    // 三条轨迹
    const arcs = []
    if (r.near) arcs.push({ theta: r.near.thetaRad, color: COLOR_NEAR })
    if (r.far) arcs.push({ theta: r.far.thetaRad, color: COLOR_FAR })
    arcs.push({ theta: r.custom.thetaRad, color: COLOR_CUSTOM })
    for (const arc of arcs) {
      this.overlay.add(lineOf(this.sample(arc.theta), arc.color, { opacity: 0.95 }))
    }

    // 击球点
    const contact = new THREE.Vector3(0, r.h0, this.worldZ(0))
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 12),
      new THREE.MeshBasicMaterial({ color: COLOR_CONTACT })
    )
    dot.position.copy(contact)
    this.overlay.add(dot)
    this.overlay.add(dimensionLine(
      new THREE.Vector3(xAxis, 0.02, this.worldZ(0)),
      new THREE.Vector3(xAxis, r.h0, this.worldZ(0)),
      { color: 0xff8a80, tick: 0.16, normal: new THREE.Vector3(1, 0, 0) }
    ))
    this.label(`击球点 ${r.h0.toFixed(2)} m`, 0.1, r.h0 + 0.3, this.worldZ(0) + 0.4, '#ff9f92', 0.005)

    // 贴网落点
    if (r.near) {
      const z = this.worldZ(r.near.landX)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.27, 26),
        new THREE.MeshBasicMaterial({ color: COLOR_NEAR, side: THREE.DoubleSide })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(0, 0.045, z)
      this.overlay.add(ring)
      this.label(`贴网落点 · 距网 ${r.near.distFromNet.toFixed(2)} m`, 0, 0.95, z, '#fbd38d', 0.0046)
    }

    // 最远落点 + 过网高度
    if (r.far) {
      const z = this.worldZ(r.far.landX)
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.16, 0.27, 26),
        new THREE.MeshBasicMaterial({ color: COLOR_FAR, side: THREE.DoubleSide })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(0, 0.045, z)
      this.overlay.add(ring)
      this.label('最远落点 · 压发球线', 0, 0.95, z + 0.5, '#6ee7b7', 0.0046)

      if (r.far.clearsNet) {
        this.overlay.add(lineOf([
          new THREE.Vector3(0, NET_HEIGHT, 0),
          new THREE.Vector3(0, r.far.yAtNet, 0)
        ], COLOR_FAR, { opacity: 1 }))
        const pip = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 14, 10),
          new THREE.MeshBasicMaterial({ color: COLOR_FAR })
        )
        pip.position.set(0, r.far.yAtNet, 0)
        this.overlay.add(pip)
        this.label(`过网 ${r.far.yAtNet.toFixed(2)} m`, 0, r.far.yAtNet + 0.34, 0.8, '#6ee7b7', 0.0048)
        this.label(`净空 ${(r.far.clearance * 100).toFixed(1)} cm`, 0, Math.max(NET_HEIGHT + 0.22, r.far.yAtNet * 0.6), -0.9, '#a7f3d0', 0.0044)
      }
    }

    // 网顶标注
    this.label('网顶 0.914 m', 2.7, NET_HEIGHT + 0.16, 0.15, '#ffd166', 0.0042)
  }

  placeBall(t) {
    const r = this.result
    if (!r) return
    const theta = r.custom.thetaRad
    const total = Math.max(0.001, Math.min(r.custom.landX, r.netDist + SERVICE_BOX_LEN + 2))
    const x = total * t
    const y = Math.max(0.05, trajectoryY(x, r.h0, r.v, theta))
    this.ballObj.group.position.set(0, y, this.worldZ(x))
  }

  update(dt) {
    if (!this.playing) return
    this.time += dt * 0.34
    if (this.time > 1) this.time -= 1
    this.placeBall(this.time)
  }

  onEnter() {
    this.setCamera('elevation', true)
    this.report()
  }

  cameraPresets() {
    const r = this.result || computeServe(this.state)
    const midZ = this.worldZ(r.netDist / 2 + SERVICE_BOX_LEN / 2)
    return {
      elevation: {
        pos: new THREE.Vector3(30, 7.2, midZ),
        target: new THREE.Vector3(0, 1.5, midZ)
      },
      net: {
        pos: new THREE.Vector3(8.6, 2.2, 4.4),
        target: new THREE.Vector3(0, 1.1, 0)
      },
      landing: {
        pos: new THREE.Vector3(7.5, 3.0, SERVICE_BOX_LEN + 1.5),
        target: new THREE.Vector3(0, 0.4, SERVICE_BOX_LEN * 0.6)
      },
      top: {
        pos: new THREE.Vector3(0, 23, midZ),
        target: new THREE.Vector3(0, 0, midZ)
      }
    }
  }

  defaultCamera() {
    return 'elevation'
  }

  dispose() {
    this.ballObj.dispose()
    this.court.dispose()
    super.dispose()
  }
}
