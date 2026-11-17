import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TennisMode, disposeTree } from '../mode.js'
import { buildSpecBall, buildBrandStamp } from '../ballmodel.js'
import { compositeBall, ballTypeById } from '../ballspec.js'
import { makeLabel } from '../labels.js'

/**
 * 网球解剖：大号 3D 球模型 + 转台旋转 + 剖面。
 * 球被放大到 ~0.55 m 半径，便于观察接缝与壁厚。
 */
export class BallLabMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'balllab'
    this.typeId = 'pressurized'
    this.brandId = 'wilson'
    this.cutaway = false
    this.spin = true
    this.time = 0
    this.build()
    this.applyBall()
  }

  build() {
    // 干净的深色展台
    this.scene.background = new THREE.Color(0x0a1218)
    this.scene.fog = null
    const R = 0.52

    this.pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.06, 64),
      new THREE.MeshStandardMaterial({ color: 0x12261f, roughness: 0.7, metalness: 0.15 })
    )
    this.pedestal.position.y = -R - 0.08
    this.pedestal.receiveShadow = true
    this.add(this.pedestal)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.99, 1.02, 72),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -R - 0.048
    this.add(ring)

    this.ball = buildSpecBall({
      radius: R,
      felt: 0xd9ff2e,
      seamColor: 0xff3b30,
      cutaway: false
    })
    this.ball.group.position.y = 0
    this.add(this.ball.group)

    // 自建的转台光源，避免依赖场景默认灯
    const key = new THREE.DirectionalLight(0xffffff, 2.6)
    key.position.set(2.4, 3.2, 2.6)
    key.castShadow = true
    this.add(key)
    const fill = new THREE.DirectionalLight(0x9fd8ff, 0.9)
    fill.position.set(-2.6, 0.6, -1.8)
    this.add(fill)
    const rim = new THREE.DirectionalLight(0xd8f34a, 0.7)
    rim.position.set(0, -1.6, 2.4)
    this.add(rim)

    this.labelGroup = new THREE.Group()
    this.add(this.labelGroup)
  }

  applyBall() {
    const combo = compositeBall(this.typeId, this.brandId)
    const type = ballTypeById(this.typeId)
    this.ball.update({
      feltColor: combo.felt,
      seamHex: combo.accent,
      isCutaway: this.cutaway,
      wallRatio: type.core === 'solid' ? 0.35 : 0.1
    })
    this.drawLabels(combo)
    this.onData?.({
      typeId: this.typeId,
      brandId: this.brandId,
      cutaway: this.cutaway,
      typeName: type.name,
      brandName: combo.brand.name
    })
  }

  drawLabels(combo) {
    this.clearGroup(this.labelGroup)
    if (!this.cutaway) return
    const R = 0.52
    const items = [
      { text: '毡面', y: R * 0.72, color: '#d9ff2e' },
      { text: '橡胶壳', y: R * 0.28, color: '#e8f0c0' },
      { text: '内胆', y: 0, color: '#ff8a4c' }
    ]
    for (const item of items) {
      const sprite = makeLabel(item.text, { color: item.color, scale: 0.0026, font: 40, padding: 14 })
      sprite.position.set(R * 1.15, item.y, 0)
      sprite.material.depthTest = false
      this.labelGroup.add(sprite)
    }
  }

  clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child)
      disposeTree(child)
    }
  }

  setType(id) {
    this.typeId = id
    this.applyBall()
  }

  setBrand(id) {
    this.brandId = id
    this.applyBall()
  }

  setCutaway(v) {
    this.cutaway = v
    this.applyBall()
  }

  setSpin(v) {
    this.spin = v
  }

  setPlaying(v) {
    this.spin = v
  }

  update(dt) {
    if (!this.spin) return
    this.time += dt
    this.ball.group.rotation.y += dt * 0.62
    this.ball.group.rotation.x = Math.sin(this.time * 0.35) * 0.22
  }

  onEnter() {
    this.setCamera('hero', true)
    this.applyBall()
  }

  cameraPresets() {
    return {
      hero: {
        pos: new THREE.Vector3(0.9, 0.62, 1.5),
        target: new THREE.Vector3(0, 0, 0)
      },
      close: {
        pos: new THREE.Vector3(0.28, 0.2, 0.78),
        target: new THREE.Vector3(0, 0, 0)
      },
      top: {
        pos: new THREE.Vector3(0.01, 1.9, 0.01),
        target: new THREE.Vector3(0, 0, 0)
      },
      side: {
        pos: new THREE.Vector3(1.85, 0.08, 0.02),
        target: new THREE.Vector3(0, 0, 0)
      }
    }
  }

  defaultCamera() {
    return 'hero'
  }

  dispose() {
    this.ball.dispose()
    this.pedestal.geometry.dispose()
    this.pedestal.material.dispose()
    // 恢复场地天空背景，避免污染其它模式
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0072)
    super.dispose()
  }
}
