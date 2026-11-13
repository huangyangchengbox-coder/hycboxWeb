import * as THREE from 'three'
import { buildCourt, SURFACES } from '../court.js'
import { buildBall, buildBlob, buildTrail } from '../ball.js'
import { makeLabel } from '../labels.js'
import { rpmToRad, simulateTrajectory } from '../physics.js'
import { TennisMode } from '../mode.js'

const START = { x: 0, y: 1.35, z: -9.4 }
const TYPES = [
  { id: 'top', name: '上旋', color: 0xff8a4c, hex: '#ff8a4c', sign: 1, note: '马格努斯力向下压，落点更深' },
  { id: 'flat', name: '平击', color: 0xf2fbf2, hex: '#f2fbf2', sign: 0, note: '几乎不带旋转，弧线最平' },
  { id: 'slice', name: '下旋', color: 0x5ec8ff, hex: '#5ec8ff', sign: -1, note: '升力向上托，球发飘、落地后停' }
]

const LANE = 2.4

export class SpinMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'spin'
    this.rpm = 2500
    this.surfaceId = 'hard'
    this.showForces = true
    this.time = 0
    this.playing = true
    this.speed = 0.55
    this.lanes = []
    this.build()
    this.rebuild()
  }

  build() {
    this.court = buildCourt({ surface: this.surfaceId })
    this.add(this.court.group)

    TYPES.forEach((type, index) => {
      const lane = {
        type,
        x: (index - 1) * LANE,
        ball: buildBall(),
        blob: buildBlob(),
        trail: buildTrail({ max: 400, color: type.color, opacity: 0.78 }),
        arrows: {
          gravity: this.buildArrow(0xff6b5a),
          drag: this.buildArrow(0xffd166),
          magnus: this.buildArrow(0x7cf2b0)
        }
      }
      this.add(lane.ball.group)
      this.add(lane.blob.mesh)
      this.add(lane.trail.line)
      lane.label = makeLabel(type.name, { color: type.hex, scale: 0.0072 })
      lane.label.position.set(lane.x, 2.35, -8.2)
      this.add(lane.label)
      this.lanes.push(lane)
    })

    this.axisHelper = new THREE.Group()
    const axisGeo = new THREE.TorusGeometry(0.2, 0.012, 6, 28, Math.PI * 1.6)
    const axisMat = new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.9 })
    this.axis = new THREE.Mesh(axisGeo, axisMat)
    this.axisHelper.add(this.axis)
    this.add(this.axisHelper)
  }

  buildArrow(color) {
    const group = new THREE.Group()
    const shaftGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1, 0)
    ])
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
    const shaft = new THREE.Line(shaftGeo, mat)
    const headGeo = new THREE.ConeGeometry(0.035, 0.1, 8)
    const headMat = new THREE.MeshBasicMaterial({ color })
    const head = new THREE.Mesh(headGeo, headMat)
    head.position.y = 1
    group.add(shaft)
    group.add(head)
    group.visible = false
    this.add(group)
    return { group, shaft, head, mat, headMat, headGeo, shaftGeo }
  }

  setArrow(arrow, origin, direction, length) {
    if (!direction || direction.lengthSq() < 1e-7 || length < 0.01) {
      arrow.group.visible = false
      return
    }
    arrow.group.visible = this.showForces
    arrow.group.position.copy(origin)
    const dir = direction.clone().normalize()
    arrow.group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    arrow.head.position.y = length
    arrow.head.scale.setScalar(Math.min(1.4, 0.7 + length * 0.5))
    arrow.shaft.scale.y = length
  }

  surface() {
    return SURFACES[this.surfaceId] || SURFACES.hard
  }

  setSurface(id) {
    this.surfaceId = id
    this.court.setSurface(id)
    this.rebuild()
  }

  setRpm(value) {
    this.rpm = value
    this.rebuild()
  }

  toggleForces() {
    this.showForces = !this.showForces
    return this.showForces
  }

  rebuild() {
    // 三条弹道同一起点、同一初速，只有旋转不同——这样对比才有说服力
    const base = { x: 0, y: 5.5, z: 14.5 }
    for (const lane of this.lanes) {
      const omega = rpmToRad(this.rpm) * lane.type.sign
      const spin = new THREE.Vector3(omega, 0, 0)
      const result = simulateTrajectory({
        from: { x: lane.x + START.x, y: START.y, z: START.z },
        velocity: base,
        spin,
        surface: this.surface()
      })
      lane.spin = spin
      lane.flight = result.points
      lane.bounces = result.bounces
      lane.netY = result.netY
      lane.duration = result.duration
      lane.bouncePeak = result.points.reduce((max, p) => (p.t > (result.bounces[0]?.t ?? 1e9) ? Math.max(max, p.y) : max), 0)
      lane.trail.fill(result.points, result.points.length - 1)
      const first = result.bounces[0]
      if (first) {
        lane.blob.update(first.x, 0, first.z)
        lane.blob.mesh.visible = true
      }
    }
    this.totalTime = Math.max(...this.lanes.map((lane) => lane.duration), 0.6)
    this.report()
  }

  sample(lane, t) {
    const points = lane.flight
    let i = 1
    while (i < points.length && points[i].t < t) i += 1
    const a = points[Math.max(0, i - 1)]
    const b = points[i] || a
    const span = Math.max(1e-4, b.t - a.t)
    const k = Math.max(0, Math.min(1, (t - a.t) / span))
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
      vx: (b.x - a.x) / span,
      vy: (b.y - a.y) / span,
      vz: (b.z - a.z) / span
    }
  }

  report() {
    this.onData?.({
      rpm: this.rpm,
      surf: this.surface(),
      surfaceId: this.surfaceId,
      showForces: this.showForces,
      lanes: this.lanes.map((lane) => {
        const b = lane.bounces[0]
        return {
          id: lane.type.id,
          name: lane.type.name,
          color: lane.type.hex,
          note: lane.type.note,
          netHeight: lane.netY,
          landX: b ? b.x : null,
          landZ: b ? b.z : null,
          bounceHeight: lane.bouncePeak ?? null,
          apex: Math.max(...lane.flight.map((p) => p.y))
        }
      })
    })
  }

  onEnter() {
    this.setCamera('compare', true)
    this.report()
  }

  cameraPresets() {
    return {
      compare: {
        pos: new THREE.Vector3(11.5, 8.4, 8.2),
        target: new THREE.Vector3(0, 1.1, 0.5)
      },
      side: {
        pos: new THREE.Vector3(0.2, 3.0, 7.0),
        target: new THREE.Vector3(0.2, 1.2, -4.0)
      },
      top: {
        pos: new THREE.Vector3(0, 21, -1),
        target: new THREE.Vector3(0, 0, -1)
      }
    }
  }

  defaultCamera() {
    return 'compare'
  }

  update(dt) {
    if (!this.playing) return
    this.time += dt * this.speed
    if (this.time > this.totalTime) this.time = 0
    this.project(this.time)
  }

  project(t) {
    for (const lane of this.lanes) {
      const point = this.sample(lane, Math.min(t, lane.duration))
      lane.ball.group.position.set(point.x, point.y, point.z)
      lane.ball.group.rotation.y += 0.02 * (lane.type.sign || 1)
      if (this.showForces) {
        const vel = new THREE.Vector3(point.vx, point.vy, point.vz)
        const origin = new THREE.Vector3(point.x, point.y, point.z)
        const speed = Math.max(vel.length(), 1)
        const gravity = new THREE.Vector3(0, -9.81, 0).multiplyScalar(0.16)
        const drag = vel.clone().normalize().multiplyScalar(-0.55 * speed * 0.16)
        const cross = new THREE.Vector3().crossVectors(lane.spin, vel)
        const magnus = cross.lengthSq() > 1e-8
          ? cross.normalize().multiplyScalar(0.5 * speed * 0.16)
          : new THREE.Vector3()
        this.setArrow(lane.arrows.gravity, origin.clone(), gravity, gravity.length())
        this.setArrow(lane.arrows.drag, origin.clone(), drag, drag.length())
        this.setArrow(lane.arrows.magnus, origin.clone(), magnus, magnus.length())
      } else {
        Object.values(lane.arrows).forEach((arrow) => { arrow.group.visible = false })
      }
    }
    const middle = this.lanes[1]
    const point = this.sample(middle, Math.min(t, middle.duration))
    this.axisHelper.position.set(point.x, point.y, point.z)
    this.axisHelper.visible = this.showForces
    this.axis.rotation.set(Math.PI / 2, 0, t * 6)
    this.emit({ time: t, total: this.totalTime, playing: this.playing })
  }

  emit(payload) {
    this.onFrame?.(payload)
  }

  setPlaying(value) {
    this.playing = value
  }

  setSpeed(value) {
    this.speed = value
  }

  setProgress(value) {
    this.playing = false
    this.time = Math.max(0, Math.min(1, value)) * this.totalTime
    this.project(this.time)
  }

  dispose() {
    this.lanes.forEach((lane) => {
      lane.ball.dispose()
      lane.blob.dispose()
      lane.trail.dispose()
      Object.values(lane.arrows).forEach((arrow) => {
        arrow.shaftGeo.dispose()
        arrow.mat.dispose()
        arrow.headGeo.dispose()
        arrow.headMat.dispose()
      })
      lane.label.material.map.dispose()
      lane.label.material.dispose()
    })
    this.axis.geometry.dispose()
    this.axis.material.dispose()
    this.court.dispose()
    super.dispose()
  }
}
