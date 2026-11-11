/**
 * 太空场景：星系示意 / 黑洞示意；点击黑洞镜头滑入视界。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { layoutNebulae, paintNebulaCanvas, formatNebulaDist, hash01 } from './nebulae.js'
import { layoutBlackholes, formatBhDist } from './blackholes.js'

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

/** 吸积盘 + 暗核贴图 */
function makeBlackholeTexture() {
  const size = 256
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  const cx = size / 2
  const cy = size / 2
  // 外晕
  let g = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.5)
  g.addColorStop(0, 'rgba(0,0,0,1)')
  g.addColorStop(0.22, 'rgba(0,0,0,1)')
  g.addColorStop(0.32, 'rgba(255,180,80,0.95)')
  g.addColorStop(0.45, 'rgba(255,90,40,0.55)')
  g.addColorStop(0.7, 'rgba(80,40,120,0.2)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // 光子环亮边
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.26, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,220,160,0.85)'
  ctx.lineWidth = 3
  ctx.stroke()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export class SpaceScene {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{
   *   onLabelsUpdate?: (labels: any[]) => void,
   *   onModeChange?: (mode: string) => void,
   *   onDiveChange?: (diving: boolean, bh?: any) => void
   * }} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.onLabelsUpdate = options.onLabelsUpdate || null
    this.onModeChange = options.onModeChange || null
    this.onDiveChange = options.onDiveChange || null
    this.isDisposed = false
    this.animationId = 0
    this.t = 0
    this.mode = 'galaxies'
    this.galaxies = layoutNebulae()
    this.nebulaTex = new Map()
    this.blackholes = layoutBlackholes()
    this.galaxySprites = []
    this.bhMeshes = []
    this.dive = null
    this.insideKind = null // null | 'galaxy' | 'blackhole'
    this.savedCam = null
    this.pointer = new THREE.Vector2()
    this.raycaster = new THREE.Raycaster()
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
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 2000)
    this.camera.position.set(0, 18, 52)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.35
    this.controls.minDistance = 8
    this.controls.maxDistance = 160
    this.controls.target.set(0, 0, 0)

    this.galaxyTex = makeGalaxyTexture()
    this.starTex = makeStarTexture()
    this.bhTex = makeBlackholeTexture()
    for (const g of this.galaxies) {
      const tex = new THREE.CanvasTexture(paintNebulaCanvas(g.id))
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      this.nebulaTex.set(g.id, tex)
    }
    this.#buildStarfield()
    this.#buildGalaxies()
    this.#buildBlackholes()
    this.#buildDust()
    this.#buildInsideFx()
    this.#buildGalaxyInsideFx()

    this.bhGroup.visible = false

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
    this._onClick = (e) => this.#onPointerClick(e)
    this.canvas.addEventListener('click', this._onClick)
    this.#animate()
  }

  setMode(mode) {
    if (mode !== 'galaxies' && mode !== 'blackholes') return
    if (this.insideKind) this.exitInside(true)
    this.mode = mode
    this.galaxyGroup.visible = mode === 'galaxies'
    this.dust.visible = mode === 'galaxies'
    this.bhGroup.visible = mode === 'blackholes'
    if (this.galaxyInsideFx) this.galaxyInsideFx.visible = false
    if (this.insideFx) this.insideFx.visible = false
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = mode === 'blackholes' ? 0.22 : 0.35
    if (mode === 'blackholes') {
      this.camera.position.set(0, 22, 68)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
    } else {
      this.camera.position.set(0, 18, 52)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
    }
    this.onModeChange?.(mode)
  }

  /** HUD / 程序进入某个黑洞 */
  enterBlackholeById(id) {
    const mesh = this.bhMeshes.find((m) => m.userData.id === id)
    if (mesh) this.#startDive(mesh, 'blackhole')
  }

  /** HUD / 程序进入某个星系 */
  enterGalaxyById(id) {
    const sprite = this.galaxySprites.find((m) => m.userData.id === id)
    if (sprite) this.#startDive(sprite, 'galaxy')
  }

  /** 离开当前坠入的星系或黑洞 */
  exitInside(instant = false) {
    this.dive = null
    this.insideKind = null
    if (this.insideFx) this.insideFx.visible = false
    if (this.galaxyInsideFx) this.galaxyInsideFx.visible = false
    this.galaxyGroup.visible = this.mode === 'galaxies'
    this.dust.visible = this.mode === 'galaxies'
    this.bhGroup.visible = this.mode === 'blackholes'
    this.controls.enabled = true
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = this.mode === 'blackholes' ? 0.22 : 0.35
    this.controls.minDistance = 8
    this.controls.maxDistance = 160
    if (this.savedCam) {
      if (instant) {
        this.camera.position.copy(this.savedCam.pos)
        this.controls.target.copy(this.savedCam.target)
        this.controls.update()
      } else {
        this.dive = {
          kind: 'exit',
          fromPos: this.camera.position.clone(),
          toPos: this.savedCam.pos.clone(),
          fromTarget: this.controls.target.clone(),
          toTarget: this.savedCam.target.clone(),
          progress: 0
        }
        this.controls.enabled = false
      }
    }
    this.onDiveChange?.(false, null, 'exit', null)
  }

  /** @deprecated 兼容旧调用 */
  exitBlackhole(instant = false) {
    this.exitInside(instant)
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
      const aspect = g.aspect || 1
      const mat = new THREE.SpriteMaterial({
        map: this.nebulaTex.get(g.id) || this.galaxyTex,
        color: 0xffffff,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
        opacity: 1
      })
      const sprite = new THREE.Sprite(mat)
      const s = g.size * 5.2
      sprite.scale.set(s * aspect, s, 1)
      sprite.position.set(g.x, g.y, g.z)
      sprite.userData = {
        id: g.id,
        kind: 'galaxy',
        base: { x: g.x, y: g.y, z: g.z },
        meta: g,
        aspect,
        spin: (hash01(g.id + 'r') - 0.5) * 0.35
      }
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.starTex,
        color: new THREE.Color(g.color || '#ffffff'),
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
      }))
      const glowSize = s * 0.28
      glow.scale.set(glowSize, glowSize, 1)
      glow.position.z = -0.35
      sprite.add(glow)
      group.add(sprite)
      this.galaxySprites.push(sprite)

      // 可点击碰撞球（跟随精灵）
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(1.2, s * 0.35), 12, 12),
        new THREE.MeshBasicMaterial({ visible: false })
      )
      hit.userData = sprite.userData
      sprite.add(hit)
      sprite.userData.hit = hit
    }
  }

  #buildBlackholes() {
    const group = new THREE.Group()
    this.bhGroup = group
    this.scene.add(group)

    for (const b of this.blackholes) {
      const root = new THREE.Group()
      root.position.set(b.x, b.y, b.z)
      root.userData = {
        id: b.id,
        kind: 'blackhole',
        base: { x: b.x, y: b.y, z: b.z },
        meta: b
      }

      const disk = new THREE.Mesh(
        new THREE.RingGeometry(b.size * 0.55, b.size * 1.55, 64),
        new THREE.MeshBasicMaterial({
          map: this.bhTex,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      )
      disk.rotation.x = Math.PI / 2.4

      const eventHorizon = new THREE.Mesh(
        new THREE.SphereGeometry(b.size * 0.42, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
      )

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.bhTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          opacity: 0.85
        })
      )
      glow.scale.set(b.size * 3.2, b.size * 3.2, 1)

      // 可点击碰撞球（不可见）
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(b.size * 1.2, 16, 16),
        new THREE.MeshBasicMaterial({ visible: false })
      )
      hit.userData = root.userData

      root.add(disk, eventHorizon, glow, hit)
      group.add(root)
      this.bhMeshes.push(root)
      root.userData.disk = disk
      root.userData.hit = hit
    }
  }

  /** 坠入视界后的内部特效（拉伸光弧） */
  #buildInsideFx() {
    const group = new THREE.Group()
    group.visible = false
    this.insideFx = group
    this.scene.add(group)

    const count = 600
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 2 + Math.random() * 28
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.insideStreaks = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xff8844,
        size: 0.25,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    )
    group.add(this.insideStreaks)

    const veil = new THREE.Mesh(
      new THREE.SphereGeometry(40, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x050208,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.92
      })
    )
    group.add(veil)
  }

  /** 进入星系后：盘面星群示意 */
  #buildGalaxyInsideFx() {
    const group = new THREE.Group()
    group.visible = false
    this.galaxyInsideFx = group
    this.scene.add(group)

    const count = 1200
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const cCore = new THREE.Color('#ffe8c0')
    const cArm = new THREE.Color('#9ec9ff')
    for (let i = 0; i < count; i++) {
      const arm = Math.floor(Math.random() * 3)
      const t = Math.random() * Math.PI * 2
      const spiral = t + arm * ((Math.PI * 2) / 3)
      const r = 1.5 + Math.random() * 22
      positions[i * 3] = Math.cos(spiral) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * (1.2 + r * 0.04)
      positions[i * 3 + 2] = Math.sin(spiral) * r
      const col = r < 6 ? cCore : cArm
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.galaxyInsideStars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.28,
        map: this.starTex,
        transparent: true,
        depthWrite: false,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    )
    group.add(this.galaxyInsideStars)

    const haze = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.galaxyTex,
        color: 0xffffff,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.NormalBlending
      })
    )
    haze.scale.set(36, 36, 1)
    this.galaxyInsideHaze = haze
    group.add(haze)
  }

  #applyInsideNebula(meta) {
    const canvas = meta && paintNebulaCanvas(meta.id, 1024)
    const haze = this.galaxyInsideHaze
    if (!haze || !canvas) return
    if (!this.insideTex || this.insideTex.image !== canvas) {
      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      this.insideTex?.dispose()
      this.insideTex = tex
    }
    haze.material.map = this.insideTex
    haze.material.color.set(0xffffff)
    haze.material.opacity = 0.96
    haze.material.needsUpdate = true
    const aspect = meta.aspect || 1
    const h = 32
    haze.scale.set(h * aspect, h, 1)
  }

  #onPointerClick(e) {
    if (this.dive || this.insideKind) return
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)

    if (this.mode === 'blackholes') {
      const hits = this.bhMeshes.map((m) => m.userData.hit).filter(Boolean)
      const intersects = this.raycaster.intersectObjects(hits, false)
      if (intersects.length) {
        const hit = intersects[0].object
        const root = this.bhMeshes.find((m) => m.userData.id === hit.userData.id)
        if (root) this.#startDive(root, 'blackhole')
      }
      return
    }

    if (this.mode === 'galaxies') {
      const hits = this.galaxySprites.map((m) => m.userData.hit).filter(Boolean)
      const intersects = this.raycaster.intersectObjects(hits, false)
      if (intersects.length) {
        const hit = intersects[0].object
        const sprite = this.galaxySprites.find((m) => m.userData.id === hit.userData.id)
        if (sprite) this.#startDive(sprite, 'galaxy')
      }
    }
  }

  #startDive(root, diveKind) {
    if (this.dive || this.insideKind) return
    const meta = root.userData.meta
    const world = new THREE.Vector3()
    root.getWorldPosition(world)
    this.savedCam = {
      pos: this.camera.position.clone(),
      target: this.controls.target.clone()
    }
    this.controls.enabled = false
    this.controls.autoRotate = false
    const toCam = this.camera.position.clone().sub(world).normalize()
    const stopDist =
      diveKind === 'galaxy' ? Math.max(2.8, (meta.size || 1) * 1.35) : 0.2
    const toPos = world.clone().add(toCam.multiplyScalar(stopDist))
    this.dive = {
      kind: 'enter',
      diveKind,
      fromPos: this.camera.position.clone(),
      toPos,
      fromTarget: this.controls.target.clone(),
      toTarget: world.clone(),
      progress: 0,
      meta,
      root
    }
    this.onDiveChange?.(true, meta, 'start', diveKind)
  }

  #animate() {
    const tick = () => {
      if (this.isDisposed) return
      this.animationId = requestAnimationFrame(tick)
      this.t += 1

      if (this.dive) {
        this.dive.progress = Math.min(1, this.dive.progress + 0.012)
        const p = this.dive.progress
        // ease-in：越接近越快，像被吸入
        const e = p * p * (this.dive.kind === 'enter' ? 1.15 : 1)
        const t = Math.min(1, e)
        this.camera.position.lerpVectors(this.dive.fromPos, this.dive.toPos, t)
        this.controls.target.lerpVectors(this.dive.fromTarget, this.dive.toTarget, t)
        this.camera.lookAt(this.controls.target)
        if (this.dive.kind === 'enter' && this.dive.root) {
          const disk = this.dive.root.userData.disk
          if (disk) disk.rotation.z += 0.08
        }
        if (p >= 1) {
          if (this.dive.kind === 'enter') {
            const diveKind = this.dive.diveKind || 'blackhole'
            this.insideKind = diveKind
            this.controls.target.copy(this.dive.toTarget)
            if (diveKind === 'blackhole') {
              this.insideFx.visible = true
              this.insideFx.position.copy(this.dive.toTarget)
              this.camera.position.copy(this.dive.toTarget).add(new THREE.Vector3(0, 0.2, 0.8))
            } else {
              this.galaxyGroup.visible = false
              this.dust.visible = false
              this.galaxyInsideFx.visible = true
              this.galaxyInsideFx.position.copy(this.dive.toTarget)
              this.#applyInsideNebula(this.dive.meta)
              this.camera.position.copy(this.dive.toPos)
              // 进入后允许缓慢环视星系内部
              this.controls.enabled = true
              this.controls.autoRotate = true
              this.controls.autoRotateSpeed = 0.45
              this.controls.minDistance = 1.2
              this.controls.maxDistance = 18
            }
            this.onDiveChange?.(true, this.dive.meta, 'inside', diveKind)
          } else {
            this.controls.enabled = true
            this.controls.autoRotate = true
            this.controls.minDistance = 8
            this.controls.maxDistance = 160
            this.onDiveChange?.(false, null, 'exit', null)
          }
          this.dive = null
        }
      } else if (!this.insideKind || this.insideKind === 'galaxy') {
        this.controls.update()
      }

      if (this.mode === 'galaxies' && this.galaxyGroup.visible && !this.insideKind) {
        for (const sprite of this.galaxySprites) {
          const g = sprite.userData.meta
          const base = sprite.userData.base
          const phase = g.orbitPhase + this.t * g.orbitSpeed
          const wobble = Math.sin(this.t * 0.002 + g.orbitPhase) * 0.28
          const spin = 1 + Math.sin(phase) * 0.03
          const aspect = sprite.userData.aspect || g.aspect || 1
          sprite.position.set(
            base.x * Math.cos(phase * 0.12) - base.z * Math.sin(phase * 0.12),
            base.y + wobble,
            base.x * Math.sin(phase * 0.12) + base.z * Math.cos(phase * 0.12)
          )
          const s = g.size * 5.2 * spin
          sprite.scale.x = s * aspect
          sprite.scale.y = s
        }
      }

      if (this.mode === 'blackholes' && this.bhGroup.visible && !this.insideKind) {
        for (const root of this.bhMeshes) {
          const b = root.userData.meta
          const base = root.userData.base
          const phase = b.orbitPhase + this.t * 0.0004
          root.position.set(
            base.x * Math.cos(phase) - base.z * Math.sin(phase),
            base.y + Math.sin(this.t * 0.003 + b.orbitPhase) * 0.4,
            base.x * Math.sin(phase) + base.z * Math.cos(phase)
          )
          if (root.userData.disk) root.userData.disk.rotation.z += b.spin
        }
      }

      if (this.insideKind === 'blackhole' && this.insideStreaks) {
        this.insideStreaks.rotation.y += 0.01
        this.insideStreaks.rotation.x += 0.004
        const pos = this.insideStreaks.geometry.attributes.position
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 0.35
          if (y < -22) y = 22
          pos.setY(i, y)
        }
        pos.needsUpdate = true
      }

      if (this.insideKind === 'galaxy' && this.galaxyInsideStars) {
        this.galaxyInsideStars.rotation.y += 0.0015
      }

      if (this.stars) this.stars.rotation.y += 0.00008
      if (this.dust && this.dust.visible && !this.insideKind) this.dust.rotation.y += 0.00025
      if (!this.spinClock) this.spinClock = new THREE.Clock()
      const spinDt = Math.min(0.05, this.spinClock.getDelta())
      for (const sprite of this.galaxySprites) {
        if (sprite.userData.spin) sprite.material.rotation += sprite.userData.spin * spinDt
      }

      this.#projectLabels()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  #projectLabels() {
    if (!this.onLabelsUpdate) return
    if (this.insideKind || this.dive?.kind === 'enter') {
      this.onLabelsUpdate([])
      return
    }
    const width = this.canvas.parentElement
      ? this.canvas.parentElement.clientWidth
      : window.innerWidth
    const height = this.canvas.parentElement
      ? this.canvas.parentElement.clientHeight
      : window.innerHeight
    const camDir = this.camera.getWorldDirection(new THREE.Vector3())
    const tmp = new THREE.Vector3()
    const out = []

    if (this.mode === 'galaxies') {
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
        out.push({
          kind: 'galaxy',
          id: g.id,
          name: g.name,
          sub: `${g.type} · ${g.nameEn || ''}`,
          distText: formatNebulaDist(g.distLy),
          x,
          y,
          opacity: Math.min(1, Math.max(0.15, (facing - 0.15) / 0.5)),
          distanceToCamera: dist,
          clickable: true
        })
      }
    } else {
      for (const root of this.bhMeshes) {
        root.getWorldPosition(tmp)
        const toObj = tmp.clone().sub(this.camera.position).normalize()
        const facing = toObj.dot(camDir)
        if (facing < 0.12) continue
        const dist = this.camera.position.distanceTo(tmp)
        tmp.project(this.camera)
        if (tmp.z > 1) continue
        const x = (tmp.x * 0.5 + 0.5) * width
        const y = (-tmp.y * 0.5 + 0.5) * height
        if (x < -40 || y < -40 || x > width + 40 || y > height + 40) continue
        const b = root.userData.meta
        out.push({
          kind: 'blackhole',
          id: b.id,
          name: b.name,
          sub: `${b.type} · ${b.massSolar} M☉`,
          distText: formatBhDist(b.distLy),
          x,
          y,
          opacity: Math.min(1, Math.max(0.2, (facing - 0.12) / 0.5)),
          distanceToCamera: dist,
          clickable: true
        })
      }
    }
    this.onLabelsUpdate(out)
  }

  dispose() {
    this.isDisposed = true
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('click', this._onClick)
    this.controls?.dispose()
    const sharedMaps = new Set([this.galaxyTex, this.starTex, this.bhTex])
    if (this.insideTex) sharedMaps.add(this.insideTex)
    this.scene?.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => {
          if (m.map && !sharedMaps.has(m.map)) m.map.dispose?.()
          m.dispose?.()
        })
      }
    })
    for (const tex of sharedMaps) tex?.dispose?.()
    this.nebulaTex?.clear()
    this.renderer?.dispose()
  }
}
