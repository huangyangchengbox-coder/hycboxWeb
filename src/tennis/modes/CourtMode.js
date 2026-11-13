import * as THREE from 'three'
import { COURT } from '../catalog.js'
import { buildCourt, SURFACES } from '../court.js'
import { buildBall } from '../ball.js'
import { makeLabel, dimensionLine } from '../labels.js'
import { solveVelocity } from '../physics.js'
import { TennisMode } from '../mode.js'

const DIMS = [
  { text: '23.77 m · 底线到底线', y: 1.15 },
  { text: '10.97 m · 双打宽', x: 6.9 },
  { text: '8.23 m · 单打宽', x: -6.4 },
  { text: '6.40 m · 发球线到网', x: 5.6 },
  { text: '0.914 m · 网中央', x: 0.4 },
  { text: '1.07 m · 网柱' }
]

const SERVE = {
  deuce: { x: 1.6, box: { x: 2.06, z: 4.5 } },
  ad: { x: -1.6, box: { x: -2.06, z: 4.5 } }
}

export class CourtMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'court'
    this.surfaceId = 'hard'
    this.singles = false
    this.serveIndex = 0
    this.time = 0
    this.playing = true
    this.build()
  }

  build() {
    this.court = buildCourt({ surface: this.surfaceId })
    this.add(this.court.group)

    this.labels = new THREE.Group()
    this.add(this.labels)

    this.ballObj = buildBall()
    this.add(this.ballObj.group)

    this.serveMark = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 28),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    )
    this.serveMark.rotation.x = -Math.PI / 2
    this.serveMark.position.y = 0.02
    this.add(this.serveMark)

    this.boxMark = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.serviceBoxWidth * 2, COURT.serviceLineFromNet),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
    )
    this.boxMark.rotation.x = -Math.PI / 2
    this.add(this.boxMark)

    this.faultLine = new THREE.Mesh(
      new THREE.PlaneGeometry(COURT.doublesWidth, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xff6b5a, transparent: true, opacity: 0 })
    )
    this.faultLine.rotation.x = -Math.PI / 2
    this.faultLine.position.set(0, 0.03, -COURT.length / 2)
    this.add(this.faultLine)

    this.reference = this.buildReference()
    this.add(this.reference)

    this.buildDimensions()
    this.serveSequence = this.buildServeSequence()
    this.project()
  }

  buildReference() {
    const group = new THREE.Group()
    const geo = new THREE.CylinderGeometry(0.02, 0.02, 1.8, 8)
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2fbf2, transparent: true, opacity: 0.8 })
    const pole = new THREE.Mesh(geo, mat)
    pole.position.y = 0.9
    group.add(pole)
    const label = makeLabel('1.8 m 参照', { scale: 0.0042 })
    label.position.set(0, 2.05, 0)
    group.add(label)
    group.position.set(COURT.singlesWidth / 2 + 1.1, 0, -COURT.length / 2)
    return group
  }

  buildDimensions() {
    const halfL = COURT.length / 2
    const halfD = COURT.doublesWidth / 2
    const halfS = COURT.singlesWidth / 2
    const y = 0.06

    this.labels.clear()
    const add = (text, x, z, dy = 0.5) => {
      const label = makeLabel(text, { scale: 0.0056, font: 40 })
      label.position.set(x, dy, z)
      this.labels.add(label)
    }

    const lengthLine = dimensionLine(
      new THREE.Vector3(-halfD - 1.0, y, -halfL),
      new THREE.Vector3(-halfD - 1.0, y, halfL)
    )
    this.labels.add(lengthLine)
    add('23.77 m', -halfD - 1.0, 0, 0.55)

    const widthLine = dimensionLine(
      new THREE.Vector3(-halfS, y, -halfL - 1.1),
      new THREE.Vector3(halfS, y, -halfL - 1.1)
    )
    this.labels.add(widthLine)
    add('8.23 m 单打', 0, -halfL - 1.1, 0.55)

    const doublesLine = dimensionLine(
      new THREE.Vector3(-halfD, y, -halfL - 1.9),
      new THREE.Vector3(halfD, y, -halfL - 1.9)
    )
    this.labels.add(doublesLine)
    add('10.97 m 双打', 0, -halfL - 1.9, 0.55)

    const serviceLine = dimensionLine(
      new THREE.Vector3(halfD + 0.8, y, 0),
      new THREE.Vector3(halfD + 0.8, y, COURT.serviceLineFromNet)
    )
    this.labels.add(serviceLine)
    add('6.40 m 发球区深度', halfD + 0.8, COURT.serviceLineFromNet / 2, 0.6)

    add('网中央 0.914 m', 0, 0.1, 1.28)
    add('网柱 1.07 m', halfD + 0.5, 0, 1.35)
  }

  buildServeSequence() {
    const marks = []
    for (let i = 0; i < 4; i += 1) {
      const side = i % 2 === 0 ? 'deuce' : 'ad'
      const mark = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.26, 24),
        new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      )
      mark.rotation.x = -Math.PI / 2
      mark.position.set(SERVE[side].x, 0.025, -COURT.length / 2 - 0.45)
      mark.visible = false
      this.add(mark)
      marks.push({ side, mark })
    }
    return marks
  }

  setSurface(id) {
    this.surfaceId = id
    this.court.setSurface(id)
    this.report()
  }

  setSingles(on) {
    this.singles = on
    this.report()
  }

  setServe(index) {
    this.serveIndex = index
    this.time = 0
    this.project()
  }

  project() {
    const shot = this.serveSequence[this.serveIndex % this.serveSequence.length]
    this.serveSequence.forEach((item, i) => {
      item.mark.visible = i === this.serveIndex % this.serveSequence.length
    })
    const target = SERVE[shot.side]
    this.serveMark.position.set(target.box.x, 0.022, target.box.z)
    this.boxMark.position.set(target.box.x, 0.02, target.box.z)

    const from = { x: shot.mark.position.x, y: 1.05, z: -COURT.length / 2 + 0.4 }
    const velocity = solveVelocity(from, target.box.x, target.box.z, 0.78)
    this.ballObj.group.position.set(from.x, from.y, from.z)
    this.ballStart = from
    this.ballVelocity = velocity
    this.onServe?.({ side: shot.side, index: this.serveIndex, from, to: target.box })
  }

  update(dt) {
    if (!this.playing) return
    this.time += dt
    if (this.time > 1.6) this.time = 0
    const t = this.time / 1.6
    if (t < 0.55) {
      const k = t / 0.55
      const from = this.ballStart
      const target = this.serveMark.position
      this.ballObj.group.position.set(
        from.x + (target.x - from.x) * k,
        from.y + (1.15 * Math.sin(k * Math.PI)) + (0.2 - from.y) * k,
        from.z + (target.z - from.z) * k
      )
    } else {
      this.ballObj.group.position.copy(this.serveMark.position).setY(0.14)
    }
    this.boxMark.material.opacity = 0.1 + 0.1 * Math.sin(this.time * 4)
    this.emit({ time: this.time, playing: this.playing })
  }

  emit(payload) {
    this.onFrame?.(payload)
  }

  report() {
    this.onData?.({
      surfaceId: this.surfaceId,
      surface: SURFACES[this.surfaceId],
      singles: this.singles,
      serveIndex: this.serveIndex
    })
  }

  onEnter() {
    this.setCamera('overview', true)
    this.report()
    this.project()
  }

  cameraPresets() {
    return {
      overview: {
        pos: new THREE.Vector3(16.5, 13.5, 15.5),
        target: new THREE.Vector3(0, 0.6, -1)
      },
      net: {
        pos: new THREE.Vector3(3.2, 1.4, 4.2),
        target: new THREE.Vector3(0, 0.85, 0)
      },
      side: {
        pos: new THREE.Vector3(22, 3.4, 0.5),
        target: new THREE.Vector3(0, 1.2, 0.5)
      },
      top: {
        pos: new THREE.Vector3(0, 26, 0.5),
        target: new THREE.Vector3(0, 0, 0.5)
      }
    }
  }

  defaultCamera() {
    return 'overview'
  }

  setPlaying(value) {
    this.playing = value
  }

  dispose() {
    this.ballObj.dispose()
    this.court.dispose()
    super.dispose()
  }
}

export { DIMS }
