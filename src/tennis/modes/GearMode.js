import * as THREE from 'three'
import { buildRacket, sweetSpotFactor } from '../racket.js'
import { buildBall } from '../ball.js'
import { makeLabel } from '../labels.js'
import { TennisMode } from '../mode.js'

export const GEAR_DEFAULTS = {
  headArea: 100,
  weight: 300,
  balance: 33,
  pattern: [16, 19],
  tension: 53
}

const BALANCE_NOTE = (value) => {
  if (value <= 31) return '头轻：灵活、网前手感好，力量略小'
  if (value >= 35) return '头重：出球力量大、底线稳，但挥速慢'
  return '平衡：攻守折中'
}

export class GearMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'gear'
    this.gear = { ...GEAR_DEFAULTS }
    this.offset = 0
    this.build()
    this.rebuild()
  }

  build() {
    this.pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.7, 0.08, 40),
      new THREE.MeshStandardMaterial({ color: 0x11202a, roughness: 0.7 })
    )
    this.pedestal.position.y = 0.04
    this.add(this.pedestal)

    this.holder = new THREE.Group()
    this.holder.position.y = 1.28
    this.holder.rotation.set(0.05, -0.5, 0.16)
    this.add(this.holder)

    this.racket = null
    this.ballObj = buildBall({ radius: 0.11 })
    this.ballObj.group.position.set(0.62, 1.1, 0.1)
    this.add(this.ballObj.group)

    this.sweetLabel = makeLabel('甜区', { scale: 0.0036, color: '#d8f34a' })
    this.sweetLabel.position.set(0.62, 1.32, 0.1)
    this.add(this.sweetLabel)
    this.sweetLabel.visible = false

    this.hitLabel = makeLabel('击球点偏移', { scale: 0.0034, color: '#ff6b5a' })
    this.hitLabel.position.set(-0.42, 1.62, 0.1)
    this.add(this.hitLabel)
    this.hitLabel.visible = false

    this.hitMark = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xff6b5a, emissive: 0x431008 })
    )
    this.hitMark.visible = false
    this.add(this.hitMark)
  }

  setGear(patch) {
    this.gear = { ...this.gear, ...patch }
    this.rebuild()
  }

  setPattern(pattern) {
    this.gear = { ...this.gear, pattern }
    this.rebuild()
  }

  setOffset(value) {
    this.offset = Math.max(0, Math.min(0.14, value))
    this.applyOffset()
  }

  applyOffset() {
    const rx = this.racket ? this.racket.head.rx : 0.11
    const ry = this.racket ? this.racket.head.ry : 0.14
    const k = Math.min(1, this.offset / (rx * 1.05))
    const x = rx * 0.9 * k
    const y = ry * 0.86 * k * 0.5
    this.hitMark.position.copy(this.racket.group.localToWorld(new THREE.Vector3(
      this.racket.hoopCenter + x,
      this.racket.head.ry * 0.06 + y,
      0
    )))
    this.hitMark.visible = this.offset > 0.005
    this.hitLabel.visible = this.offset > 0.005
    this.hitLabel.position.copy(this.hitMark.position).add(new THREE.Vector3(0, 0.22, 0))
    this.sweetLabel.visible = true
    if (this.racket) {
      const spot = this.racket.group.localToWorld(new THREE.Vector3(
        this.racket.hoopCenter,
        this.racket.head.ry * 0.06,
        0
      ))
      this.sweetLabel.position.copy(spot).add(new THREE.Vector3(-0.44, 0.06, 0))
    }
    this.onData?.({
      gear: this.gear,
      offset: this.offset,
      factor: sweetSpotFactor(this.offset, rx),
      balanceNote: BALANCE_NOTE(this.gear.balance)
    })
  }

  rebuild() {
    if (this.racket) {
      this.racket.dispose()
    }
    const frameColor = this.gear.balance >= 35 ? 0x3a2a18 : this.gear.balance <= 31 ? 0x14212e : 0x1b2b3a
    this.racket = buildRacket({
      headArea: this.gear.headArea,
      pattern: this.gear.pattern,
      frameColor,
      accent: 0xd8f34a,
      thickness: 0.02 + (this.gear.headArea - 95) * 0.0009,
      length: 0.685,
      showSweet: true
    })
    const offset = new THREE.Vector3(-0.685 / 2, 0, 0)
    this.racket.group.position.copy(offset)
    this.holder.add(this.racket.group)
    this.holder.updateMatrixWorld(true)
    this.applyOffset()
  }

  cameraPresets() {
    return {
      overview: {
        pos: new THREE.Vector3(1.35, 1.62, 1.5),
        target: new THREE.Vector3(0, 1.26, 0)
      },
      face: {
        pos: new THREE.Vector3(0.02, 1.34, 1.35),
        target: new THREE.Vector3(0.02, 1.28, 0)
      },
      side: {
        pos: new THREE.Vector3(1.9, 1.45, 0.55),
        target: new THREE.Vector3(0, 1.26, 0)
      },
      top: {
        pos: new THREE.Vector3(0, 3.2, 0.5),
        target: new THREE.Vector3(0, 1.2, 0)
      }
    }
  }

  defaultCamera() {
    return 'overview'
  }

  onEnter() {
    this.setCamera('overview', true)
    this.applyOffset()
  }

  update(dt) {
    this.ballObj.group.rotation.y += dt * 0.6
  }

  dispose() {
    this.racket?.dispose()
    this.ballObj.dispose()
    this.sweetLabel.material.map.dispose()
    this.sweetLabel.material.dispose()
    this.hitLabel.material.map.dispose()
    this.hitLabel.material.dispose()
    super.dispose()
  }
}
