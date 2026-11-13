import * as THREE from 'three'
import { buildCourt } from '../court.js'
import { buildBall } from '../ball.js'
import { TennisMode } from '../mode.js'

export class TrainMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'train'
    this.build()
  }

  build() {
    this.court = buildCourt({ surface: 'hard', net: false })
    this.add(this.court.group)

    this.ballObj = buildBall({ radius: 0.16 })
    this.ballObj.group.position.set(0, 1.1, -2.4)
    this.add(this.ballObj.group)

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.62, 0.02, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.6 })
    )
    this.ring.position.set(0, 1.1, -2.4)
    this.ring.rotation.x = Math.PI / 2.2
    this.add(this.ring)
  }

  cameraPresets() {
    return {
      overview: {
        pos: new THREE.Vector3(2.6, 2.2, 2.2),
        target: new THREE.Vector3(0, 1.0, -2.4)
      },
      side: {
        pos: new THREE.Vector3(3.6, 1.5, 0.2),
        target: new THREE.Vector3(0, 1.05, -2.4)
      },
      top: {
        pos: new THREE.Vector3(0, 8, -1),
        target: new THREE.Vector3(0, 0.6, -2.2)
      }
    }
  }

  defaultCamera() {
    return 'overview'
  }

  update(dt) {
    this.ballObj.group.rotation.y += dt * 0.7
    this.ring.rotation.z += dt * 0.5
  }

  dispose() {
    this.ballObj.dispose()
    this.ring.geometry.dispose()
    this.ring.material.dispose()
    this.court.dispose()
    super.dispose()
  }
}
