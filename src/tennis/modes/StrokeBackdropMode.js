import * as THREE from 'three'
import { buildCourt } from '../court.js'
import { TennisMode } from '../mode.js'

/**
 * 致命正手 / 弹道反手用的背景场景：只有球场，镜头缓慢环绕。
 * 前景是可交互的 2D 画布实验室（StrokeLab 组件），这里只负责给页面一个球场底。
 */
export class StrokeBackdropMode extends TennisMode {
  constructor(stage, id = 'forehand') {
    super(stage)
    this.id = id
    this.time = 0
    this.build()
  }

  build() {
    this.court = buildCourt({ surface: 'hard' })
    this.add(this.court.group)
  }

  update(dt) {
    this.time += dt
  }

  cameraPresets() {
    return {
      backdrop: {
        pos: new THREE.Vector3(17.5, 12.5, 14.5),
        target: new THREE.Vector3(0.4, 0.6, -2.2)
      }
    }
  }

  defaultCamera() {
    return 'backdrop'
  }

  dispose() {
    this.court.dispose()
    super.dispose()
  }
}
