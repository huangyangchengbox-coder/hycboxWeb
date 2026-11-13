import * as THREE from 'three'

export function disposeTree(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
    mats.forEach((mat) => {
      Object.keys(mat).forEach((key) => {
        const value = mat[key]
        if (value && value.isTexture) value.dispose()
      })
      mat.dispose()
    })
  })
}

export class TennisMode {
  constructor(stage) {
    this.stage = stage
    this.group = new THREE.Group()
    this.id = ''
  }

  get scene() {
    return this.stage.scene
  }

  get camera() {
    return this.stage.camera
  }

  add(obj) {
    this.group.add(obj)
    return obj
  }

  std(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.72, ...opts })
  }

  basic(color, opts = {}) {
    return new THREE.MeshBasicMaterial({ color, ...opts })
  }

  cameraPresets() {
    return {}
  }

  defaultCamera() {
    return 'arena'
  }

  setCamera(name, immediate = false) {
    this.stage.applyCamera(this.cameraPresets(), name, immediate)
  }

  onEnter() {
    this.setCamera(this.defaultCamera(), true)
  }

  update() {}

  dispose() {
    disposeTree(this.group)
    this.group.removeFromParent()
  }
}
