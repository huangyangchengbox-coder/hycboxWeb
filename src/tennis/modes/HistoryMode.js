import * as THREE from 'three'
import { buildCourt } from '../court.js'
import { buildRacket } from '../racket.js'
import { buildBall } from '../ball.js'
import { makeLabel } from '../labels.js'
import { TIMELINE } from '../history.js'
import { TennisMode } from '../mode.js'

const RACK = [
  { headArea: 68, pattern: [14, 17], frameColor: 0x8a6134, accent: 0xb8874a, thickness: 0.03, length: 0.7, name: '木拍 · 1920s' },
  { headArea: 90, pattern: [16, 19], frameColor: 0x9aa7b4, accent: 0xdfe6ee, thickness: 0.02, length: 0.685, name: '金属拍 · 1970s' },
  { headArea: 100, pattern: [16, 19], frameColor: 0x16232f, accent: 0xd8f34a, thickness: 0.026, length: 0.685, name: '碳纤维拍 · 2000s' }
]
const SLOT = { wood: 0, metal: 1, carbon: 2 }
const POSITIONS = [-2.5, 0, 2.5]

export class HistoryMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'history'
    this.index = 6
    this.racks = []
    this.build()
  }

  build() {
    this.court = buildCourt({ surface: 'hard', net: false })
    this.add(this.court.group)

    RACK.forEach((item, index) => {
      const racket = buildRacket(item)
      racket.group.position.set(POSITIONS[index] - item.length / 2, 0.5, -5.2)
      racket.group.rotation.z = 0.28
      this.add(racket.group)
      const label = makeLabel(item.name, { scale: 0.005 })
      label.position.set(POSITIONS[index], 1.42, -5.2)
      this.add(label)
      this.racks.push({ racket, label })
    })

    this.ballOld = buildBall({ color: 0xf3efe4, seam: 0xdad3c3 })
    this.ballOld.group.scale.setScalar(2.1)
    this.ballOld.group.position.set(-1.0, 1.0, -1.9)
    this.add(this.ballOld.group)

    this.ballNew = buildBall({ color: 0xd9ff00, seam: 0xf7ffe6 })
    this.ballNew.group.scale.setScalar(2.1)
    this.ballNew.group.position.set(1.0, 1.0, -1.9)
    this.add(this.ballNew.group)

    const oldLabel = makeLabel('白色 · 1870s–1970s', { scale: 0.0042, color: '#f3efe4' })
    oldLabel.position.set(-1.0, 1.88, -1.9)
    this.add(oldLabel)
    const newLabel = makeLabel('荧光黄 · 1970s 起', { scale: 0.0042, color: '#d9ff00' })
    newLabel.position.set(1.0, 1.88, -1.9)
    this.add(newLabel)

    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.34, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    )
    this.marker.rotation.x = -Math.PI / 2
    this.marker.position.set(POSITIONS[0], 0.02, -5.2)
    this.add(this.marker)
  }

  select(index) {
    this.index = Math.max(0, Math.min(TIMELINE.length - 1, index))
    const item = TIMELINE[this.index]
    const slot = SLOT[item.racket] ?? 2
    this.racks.forEach((entry, i) => {
      const on = i === slot
      entry.racket.group.scale.setScalar(on ? 1.16 : 1)
      entry.label.material.opacity = on ? 1 : 0.42
      entry.racket.strings.material.opacity = on ? 0.9 : 0.35
    })
    this.marker.position.set(POSITIONS[slot], 0.02, -5.2)
    this.onData?.({
      index: this.index,
      item,
      total: TIMELINE.length,
      racketName: RACK[slot].name
    })
  }

  cameraPresets() {
    return {
      overview: {
        pos: new THREE.Vector3(3.2, 3.6, 2.4),
        target: new THREE.Vector3(0, 1.0, -4.2)
      },
      close: {
        pos: new THREE.Vector3(1.1, 1.8, 0.2),
        target: new THREE.Vector3(0, 0.95, -5.2)
      },
      side: {
        pos: new THREE.Vector3(6.4, 2.0, -3.0),
        target: new THREE.Vector3(0, 1.0, -4.6)
      },
      top: {
        pos: new THREE.Vector3(0, 11, 0.6),
        target: new THREE.Vector3(0, 0.6, -4.4)
      }
    }
  }

  defaultCamera() {
    return 'overview'
  }

  update(dt) {
    this.marker.rotation.z += dt * 0.4
  }

  onEnter() {
    this.setCamera('overview', true)
    this.select(this.index)
  }

  dispose() {
    this.racks.forEach((entry) => {
      entry.racket.dispose()
      entry.label.material.map.dispose()
      entry.label.material.dispose()
    })
    this.ballOld.dispose()
    this.ballNew.dispose()
    this.court.dispose()
    super.dispose()
  }
}
