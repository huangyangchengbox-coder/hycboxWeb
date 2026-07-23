/**
 * 太空星系示意场景（WebGL）：星场 + 已知星系光晕运动 + HUD 标签。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { layoutGalaxies } from './galaxies.js'

function makeGalaxyTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(200,220,255,0.85)')
  g.addColorStop(0.55, 'rgba(120,160,255,0.25)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeStarTexture() {
  const size = 64
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

export class SpaceScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onLabelsUpdate?: (labels: any[]) => void }} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.onLabelsUpdate = options.onLabelsUpdate || null
    this.isDisposed = false
    this.animationId = 0
    this.t = 0
    this.galaxies = layoutGalaxies()
    this.galaxySprites = []
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x02040a, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000)
    this.camera.position.set(0, 18, 52)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.35
    this.controls.minDistance = 12
    this.controls.maxDistance = 160
    this.controls.target.set(0, 0, 0)

    this.galaxyTex = makeGalaxyTexture()
    this.starTex = makeStarTexture()
    this.#buildStarfield()
    this.#buildGalaxies()
    this.#buildDust()

    this.handleResize = () => {
      if (!this.canvas.parentElement || !this.renderer) return
      const w = this.canvas.parentElement.clientWidth
      const h = this.canvas.parentElement.clientHeight
      this.camera.aspect = w / Math.max(1, h)
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(w, h, false)
    }
    this.handleResize()
    window.addEventListener('resize', this.handleResize)
    this.#animate()
  }

  #buildStarfield() {
    const count = 4000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const c1 = new THREE.Color('#9db6ff')
    const c2 = new THREE.Color('#ffd9b0')
    const c3 = new THREE.Color('#ffffff')
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 400
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
      const mix = Math.random()
      const col = mix < 0.45 ? c1 : mix < 0.75 ? c2 : c3
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.9,
      map: this.starTex,
      transparent: true,
      depthWrite: false,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
    this.stars = new THREE.Points(geo, mat)
    this.scene.add(this.stars)
  }

  #buildDust() {
    const count = 800
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 70
      const a = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 12
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0x6688cc,
        size: 0.35,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    )
    this.scene.add(this.dust)
  }

  #buildGalaxies() {
    const group = new THREE.Group()
    this.galaxyGroup = group
    this.scene.add(group)

    for (const g of this.galaxies) {
      const mat = new THREE.SpriteMaterial({
        map: this.galaxyTex,
        color: new THREE.Color(g.color),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: g.id === 'mw' ? 0.95 : 0.82
      })
      const sprite = new THREE.Sprite(mat)
      const s = g.size * (g.id === 'mw' ? 6.5 : 3.2)
      sprite.scale.set(s, s * 0.72, 1)
      sprite.position.set(g.x, g.y, g.z)
      sprite.userData = { id: g.id, base: { x: g.x, y: g.y, z: g.z }, meta: g }
      group.add(sprite)
      this.galaxySprites.push(sprite)

      // 核心亮点
      const core = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.starTex,
          color: 0xffffff,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.9
        })
      )
      core.scale.set(s * 0.18, s * 0.18, 1)
      sprite.add(core)
    }
  }

  #animate() {
    const tick = () => {
      if (this.isDisposed) return
      this.animationId = requestAnimationFrame(tick)
      this.t += 1
      this.controls.update()

      // 星系缓慢公转/起伏
      for (const sprite of this.galaxySprites) {
        const g = sprite.userData.meta
        const base = sprite.userData.base
        if (g.id === 'mw') {
          sprite.rotation.z = this.t * 0.0004
          continue
        }
        const phase = g.orbitPhase + this.t * g.orbitSpeed
        const wobble = Math.sin(this.t * 0.002 + g.orbitPhase) * 0.35
        const spin = 1 + Math.sin(phase) * 0.04
        sprite.position.set(
          base.x * Math.cos(phase * 0.15) - base.z * Math.sin(phase * 0.15),
          base.y + wobble,
          base.x * Math.sin(phase * 0.15) + base.z * Math.cos(phase * 0.15)
        )
        sprite.scale.x = g.size * 3.2 * spin
        sprite.scale.y = g.size * 3.2 * 0.72 * spin
      }

      if (this.stars) this.stars.rotation.y += 0.00008
      if (this.dust) this.dust.rotation.y += 0.00025

      this.#projectLabels()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  #projectLabels() {
    if (!this.onLabelsUpdate) return
    const width = this.canvas.parentElement
      ? this.canvas.parentElement.clientWidth
      : window.innerWidth
    const height = this.canvas.parentElement
      ? this.canvas.parentElement.clientHeight
      : window.innerHeight
    const camDir = this.camera.getWorldDirection(new THREE.Vector3())
    const tmp = new THREE.Vector3()
    const out = []
    for (const sprite of this.galaxySprites) {
      sprite.getWorldPosition(tmp)
      const toObj = tmp.clone().sub(this.camera.position).normalize()
      const facing = toObj.dot(camDir)
      if (facing < 0.15) continue
      const dist = this.camera.position.distanceTo(tmp)
      tmp.project(this.camera)
      if (tmp.z > 1) continue
      const x = (tmp.x * 0.5 + 0.5) * width
      const y = (-tmp.y * 0.5 + 0.5) * height
      if (x < -40 || y < -40 || x > width + 40 || y > height + 40) continue
      const g = sprite.userData.meta
      const opacity = Math.min(1, Math.max(0.15, (facing - 0.15) / 0.5))
      out.push({
        id: g.id,
        name: g.name,
        nameEn: g.nameEn,
        type: g.type,
        distMly: g.distMly,
        x,
        y,
        opacity,
        distanceToCamera: dist
      })
    }
    this.onLabelsUpdate(out)
  }

  dispose() {
    this.isDisposed = true
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.controls?.dispose()
    this.galaxyTex?.dispose()
    this.starTex?.dispose()
    this.scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose?.())
      }
    })
    this.renderer?.dispose()
  }
}
