import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 一个渲染器 + 一台相机 + 一套轨道控制，各板块只往 scene 里挂自己的 group。
 * 这样切换板块不会重建 WebGL 上下文。
 */
export class TennisStage {
  constructor(canvas) {
    this.canvas = canvas
    this.disposed = false
    this.mode = null
    this.onFrame = null

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0072)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 220)
    this.camera.position.set(12.6, 7.8, 9.6)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.buildLights()

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.485
    this.controls.minDistance = 2.2
    this.controls.maxDistance = 62
    this.controls.target.set(0.4, 1.1, -3)

    this.camGoal = new THREE.Vector3()
    this.targetGoal = new THREE.Vector3()
    this.camBlend = 0

    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.onVisible = () => {
      if (this.disposed || document.hidden) return
      cancelAnimationFrame(this.frameId)
      this.last = performance.now()
      this.frameId = requestAnimationFrame(this.frame)
    }
    document.addEventListener('visibilitychange', this.onVisible)

    this.resize()
    this.last = performance.now()
    this.frame = (now) => this.animate(now)
    this.frameId = requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) window.__tennisStage = this
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x3b5e2b, 1.3))

    const sun = new THREE.DirectionalLight(0xfff8e7, 2.3)
    sun.position.set(11, 22, 9)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -16
    sun.shadow.camera.right = 16
    sun.shadow.camera.top = 18
    sun.shadow.camera.bottom = -18
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 60
    sun.shadow.bias = -0.0006
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0xbfe6ff, 0.42)
    fill.position.set(-12, 8, -10)
    this.scene.add(fill)
  }

  load(mode) {
    if (this.mode) {
      this.mode.group.removeFromParent()
      this.mode.dispose()
    }
    this.mode = mode
    if (mode) {
      this.scene.add(mode.group)
      mode.onEnter()
    }
    return mode
  }

  applyCamera(presets, name, immediate = false) {
    const keys = Object.keys(presets)
    if (!keys.length) return
    const preset = presets[name] || presets[keys[0]]
    this.camGoal.copy(preset.pos)
    this.targetGoal.copy(preset.target)
    if (immediate) {
      this.camera.position.copy(this.camGoal)
      this.controls.target.copy(this.targetGoal)
      this.camBlend = 0
      this.controls.update()
      return
    }
    this.camBlend = 1
  }

  emit(payload) {
    this.onFrame?.(payload)
  }

  resize() {
    const width = this.canvas.clientWidth || 1
    const height = this.canvas.clientHeight || 1
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  animate(now) {
    if (this.disposed || document.hidden) return
    this.frameId = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now

    this.mode?.update(dt)

    if (this.camBlend > 0) {
      this.camera.position.lerp(this.camGoal, 0.12)
      this.controls.target.lerp(this.targetGoal, 0.12)
      this.camBlend *= 0.9
      if (this.camBlend < 0.02) this.camBlend = 0
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('resize', this.onResize)
    this.mode?.dispose()
    this.mode = null
    this.controls.dispose()
    this.renderer.dispose()
  }
}
