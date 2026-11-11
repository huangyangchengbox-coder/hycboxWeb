/**
 * COSMOS 3D：分区场景。尺度为示意，镜头可飞向统一注册的天体。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { COSMIC_OBJECTS, MODES } from './catalog.js'
import { paintNebulaCanvas } from '../globe/nebulae.js'
import { TimelineStage } from './timeline/TimelineStage.js'

const OVERVIEW = {
  planets: { pos: [0, 28, 72], target: [0, 0, 0] },
  nebulae: { pos: [0, 10, 32], target: [0, 0, 0] },
  deep: { pos: [0, 8, 28], target: [0, 0, 0] },
  events: { pos: [0, 8, 22], target: [0, 0, 0] },
  explore: { pos: [0, 6, 18], target: [0, 0, 0] },
  exo: { pos: [0, 5, 18], target: [0, 0, 0] },
  timeline: { pos: [0, 4, 16], target: [0, 0, 0] }
}

function canvasTex(draw, size = 256) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function paintEarth(ctx, s) {
  ctx.fillStyle = '#1d4e89'
  ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#2f8f4e'
  const blobs = [[0.2, 0.4, 0.18], [0.45, 0.35, 0.12], [0.7, 0.5, 0.16], [0.3, 0.7, 0.1], [0.8, 0.75, 0.08]]
  for (const [x, y, r] of blobs) {
    ctx.beginPath()
    ctx.ellipse(x * s, y * s, r * s, r * s * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(0, s * 0.18, s, s * 0.06)
  ctx.fillRect(0, s * 0.72, s, s * 0.05)
}

function paintBands(ctx, s, colors) {
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i]
    ctx.fillRect(0, (i / colors.length) * s, s, s / colors.length + 1)
  }
}

function paintIce(ctx, s) {
  ctx.fillStyle = '#e7f7ff'
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = 'rgba(90,140,170,0.45)'
  ctx.lineWidth = 2
  for (let i = 0; i < 8; i++) {
    ctx.beginPath()
    ctx.moveTo((i / 8) * s, 0)
    ctx.lineTo((i / 8) * s + 20, s)
    ctx.stroke()
  }
}

function paintOcean(ctx, s) {
  ctx.fillStyle = '#0c3a52'
  ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = 'rgba(190,230,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(s * 0.4, s * 0.45, s * 0.22, s * 0.08, 0.4, 0, Math.PI * 2)
  ctx.fill()
}

function paintMoon(ctx, s) {
  ctx.fillStyle = '#c8c6c0'
  ctx.fillRect(0, 0, s, s)
  ctx.fillStyle = '#9a978f'
  for (let i = 0; i < 18; i++) {
    ctx.beginPath()
    ctx.arc(((i * 47) % 100) / 100 * s, ((i * 29) % 100) / 100 * s, 3 + (i % 4), 0, Math.PI * 2)
    ctx.fill()
  }
}

const TEXTURES = {
  earth: (s) => canvasTex((ctx) => paintEarth(ctx, s), s),
  moon: (s) => canvasTex((ctx) => paintMoon(ctx, s), s),
  mars: (s) => canvasTex((ctx) => paintBands(ctx, s, ['#8c3418', '#c4552a', '#e07a45', '#a34322', '#6e2914']), s),
  jupiter: (s) => canvasTex((ctx) => paintBands(ctx, s, ['#c4a27a', '#efe0c4', '#b8876a', '#f3e6cf', '#a86b4f', '#e7d3b0', '#8d4d32', '#d7c09a']), s),
  saturn: (s) => canvasTex((ctx) => paintBands(ctx, s, ['#f0e2c0', '#d9c49a', '#f7edd4', '#c9b184', '#efe4c8']), s),
  ice: (s) => canvasTex((ctx) => paintIce(ctx, s), s),
  ocean: (s) => canvasTex((ctx) => paintOcean(ctx, s), s)
}

function smooth(t) {
  return t * t * (3 - 2 * t)
}

export class CosmosScene {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.onSelect = hooks.onSelect || null
    this.onLabels = hooks.onLabels || null
    this.mode = 'planets'
    this.paused = false
    this.speed = 1
    this.sim = 0
    this.selectedId = null
    this.flight = null
    this.bodies = new Map()
    this.groups = {}
    this.quality = 'high'
    this.disposed = false
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.supernovaT = -1
    this.reducedMotion = !!hooks.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.timelineProgress = 0
    this.timelinePlaying = false
    this.timelineSpeed = 1
    this.scrubbing = false
    this.followCamera = true
    this.timelineAngle = 0.4
    this.orbitHold = 0
    this.onTimelineProgress = hooks.onTimelineProgress || null
    this.onTimelineEnd = hooks.onTimelineEnd || null
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setClearColor(0x000106, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 800)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.minDistance = 1.2
    this.controls.maxDistance = 140
    this.scene.add(new THREE.AmbientLight(0x8aa0c8, 0.35))
    this.fill = new THREE.DirectionalLight(0xfff4e0, 1.35)
    this.fill.position.set(12, 8, 6)
    this.scene.add(this.fill)

    this.#stars()
    for (const mode of MODES) {
      const group = new THREE.Group()
      group.name = mode.id
      group.visible = mode.id === this.mode
      this.groups[mode.id] = group
      this.scene.add(group)
    }
    for (const meta of COSMIC_OBJECTS) this.#addBody(meta)
    this.timelineStage = new TimelineStage(this.groups.timeline, { quality: this.quality })
    this.timelineStage.setProgress(0)

    this.clock = new THREE.Clock()
    this.#resize()
    this.handleResize = () => this.#resize()
    window.addEventListener('resize', this.handleResize)
    this._click = (e) => this.#pick(e, false)
    this._dbl = (e) => this.#pick(e, true)
    this.canvas.addEventListener('click', this._click)
    this.canvas.addEventListener('dblclick', this._dbl)
    this.controls.addEventListener('start', () => {
      this.orbitHold = performance.now() + 3000
    })
    this.overview(true)
    this.#loop()
  }

  setMode(mode) {
    if (!this.groups[mode] || this.mode === mode) return
    const leavingTimeline = this.mode === 'timeline'
    this.mode = mode
    for (const key of Object.keys(this.groups)) this.groups[key].visible = key === mode
    this.selectedId = null
    this.onSelect?.(null)
    if (mode === 'timeline') {
      this.onLabels?.([])
      this.timelineStage?.setProgress(this.timelineProgress)
    } else if (leavingTimeline) {
      this.renderer.setClearColor(0x000106, 1)
      this.#restoreStars()
    }
    this.overview(false)
  }

  selectById(id, fly = false) {
    const body = this.bodies.get(id)
    if (!body || body.meta.mode !== this.mode) return
    this.selectedId = id
    this.onSelect?.(body.meta)
    if (fly) this.focusSelected()
  }

  focusSelected() {
    const body = this.bodies.get(this.selectedId)
    if (!body) return
    const world = new THREE.Vector3()
    body.anchor.getWorldPosition(world)
    const dist = Math.max(2.4, (body.meta.radius || 1) * 4.2)
    const offset = this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(dist)
    if (offset.lengthSq() < 0.01) offset.set(0, dist * 0.35, dist)
    this.#fly(world.clone().add(offset), world)
  }

  overview(instant = false) {
    const view = OVERVIEW[this.mode]
    const pos = new THREE.Vector3(...view.pos)
    const target = new THREE.Vector3(...view.target)
    if (instant) {
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      this.controls.update()
      this.flight = null
      return
    }
    this.#fly(pos, target)
  }

  setPaused(value) {
    this.paused = !!value
  }

  setSpeed(value) {
    this.speed = value
  }

  setQuality(level) {
    this.quality = level === 'low' ? 'low' : 'high'
    const ratio = this.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)
    this.renderer.setPixelRatio(ratio)
    this.timelineStage?.setQuality(this.quality)
    if (this.mode === 'timeline') this.#applyTimelineStars()
    else this.#restoreStars()
    this.#resize()
  }

  setTimelineProgress(p) {
    this.timelineProgress = Math.min(1, Math.max(0, p))
    const era = this.timelineStage?.setProgress(this.timelineProgress)
    const now = performance.now()
    const eraChanged = !!(era && era.id !== this._timelineEra)
    if (eraChanged) this._timelineEra = era.id
    if (eraChanged || now - (this._tlEmitAt || 0) > 50) {
      this._tlEmitAt = now
      this.onTimelineProgress?.(this.timelineProgress)
    }
  }

  setTimelinePlaying(playing) {
    if (this.reducedMotion) playing = false
    this.timelinePlaying = !!playing
  }

  setTimelineSpeed(speed) {
    this.timelineSpeed = speed
  }

  setScrubbing(flag) {
    this.scrubbing = !!flag
    if (this.scrubbing) this.timelinePlaying = false
  }

  setFollowCamera(flag) {
    this.followCamera = !!flag
  }

  focusTimeline() {
    if (!this.timelineStage) return
    const plan = this.timelineStage.cameraPlan
    const ang = this.timelineAngle || 0
    this.#fly(
      new THREE.Vector3(Math.sin(ang) * plan.dist, plan.height, Math.cos(ang) * plan.dist),
      new THREE.Vector3(0, 0, 0)
    )
  }

  playSupernova() {
    this.supernovaT = 0
    this.selectById('supernova', true)
  }

  #fly(pos, target) {
    this.flight = {
      from: this.camera.position.clone(),
      to: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      t: 0
    }
  }

  #addBody(meta) {
    const group = this.groups[meta.mode]
    let root
    if (meta.parent && this.bodies.get(meta.parent)) {
      root = this.bodies.get(meta.parent).pivot
    } else {
      root = group
    }
    const pivot = new THREE.Group()
    root.add(pivot)
    if (meta.position) pivot.position.set(meta.position[0], meta.position[1], meta.position[2])

    let visual
    if (meta.nebula) visual = this.#nebula(meta)
    else if (meta.blackhole) visual = this.#blackhole(meta)
    else if (meta.galaxy) visual = this.#galaxy(meta)
    else if (meta.craft) visual = this.#craft(meta)
    else if (meta.meteors) visual = this.#meteors()
    else visual = this.#sphere(meta)

    pivot.add(visual)
    if (meta.comet) {
      const tail = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 2.4, 10),
        new THREE.MeshBasicMaterial({ color: 0xd7e6ff, transparent: true, opacity: 0.38, depthWrite: false })
      )
      tail.rotation.z = Math.PI / 2
      tail.position.x = -1.3
      pivot.add(tail)
    }
    if (meta.ring) pivot.add(this.#ring(meta.radius))
    if (meta.atmosphere) pivot.add(this.#atmosphere(meta))
    if (meta.glow) pivot.add(this.#glow(meta))
    if (meta.light) {
      const light = new THREE.PointLight(0xfff1d0, meta.light, 80, 1.4)
      pivot.add(light)
    }
    if (meta.orbit && !meta.parent) {
      group.add(this.#orbitLine(meta.orbit))
    }

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(Math.max(meta.radius || 0.4, 0.45) * (meta.nebula || meta.galaxy ? 1.3 : 1.15), 12, 10),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    hit.userData.id = meta.id
    pivot.add(hit)

    this.bodies.set(meta.id, {
      meta,
      pivot,
      anchor: visual,
      hit,
      angle: meta.phase || 0
    })
  }

  #sphere(meta) {
    const tex = meta.texture && TEXTURES[meta.texture] ? TEXTURES[meta.texture](256) : null
    const mat = meta.id === 'sun' || meta.emissiveIntensity > 0.8
      ? new THREE.MeshBasicMaterial({ color: meta.color, map: tex })
      : new THREE.MeshStandardMaterial({
        color: meta.color,
        map: tex,
        roughness: 0.82,
        metalness: 0.04,
        emissive: new THREE.Color(meta.emissive || '#000000'),
        emissiveIntensity: meta.emissiveIntensity || 0
      })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(meta.radius, meta.radius > 1.2 ? 64 : 32, 24), mat)
    if (meta.tilt) mesh.rotation.z = meta.tilt
    mesh.userData.spin = meta.spin || 0.2
    return mesh
  }

  #nebula(meta) {
    const tex = new THREE.CanvasTexture(paintNebulaCanvas(meta.nebula))
    tex.colorSpace = THREE.SRGBColorSpace
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    }))
    const h = meta.radius * 2.4
    sprite.scale.set(h * (meta.aspect || 1), h, 1)
    return sprite
  }

  #blackhole(meta) {
    const g = new THREE.Group()
    const hole = new THREE.Mesh(
      new THREE.SphereGeometry(meta.radius, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    )
    const disk = new THREE.Mesh(
      new THREE.RingGeometry(meta.radius * 1.35, meta.radius * 3.4, 96),
      new THREE.MeshBasicMaterial({
        map: canvasTex((ctx, s) => {
          const grd = ctx.createLinearGradient(0, 0, s, 0)
          grd.addColorStop(0, '#2a0808')
          grd.addColorStop(0.35, '#ffb15a')
          grd.addColorStop(0.7, '#ff5a2a')
          grd.addColorStop(1, '#1a0420')
          ctx.fillStyle = grd
          ctx.fillRect(0, 0, s, s)
        }, 128),
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
      })
    )
    disk.rotation.x = Math.PI / 2.3
    disk.userData.spinDisk = 0.35
    g.add(hole, disk, this.#glow({ color: '#ff8844', glow: 3.2, radius: 1 }))
    return g
  }

  #galaxy(meta) {
    const count = meta.galaxy === 'mw' ? 5000 : 2800
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const core = new THREE.Color(meta.galaxy === 'mw' ? '#fff0d0' : '#d5e2ff')
    const arm = new THREE.Color(meta.color || '#9eb6ff')
    for (let i = 0; i < count; i++) {
      const branch = i % 4
      const t = Math.random() * Math.PI * 5.2
      const r = 0.35 + t * (meta.radius * 0.22) + (Math.random() - 0.5) * 0.35
      const a = t + branch * (Math.PI / 2)
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.18
      positions[i * 3 + 2] = Math.sin(a) * r
      const col = r < meta.radius * 0.25 ? core : arm
      colors[i * 3] = col.r
      colors[i * 3 + 1] = col.g
      colors[i * 3 + 2] = col.b
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true
    }))
    points.userData.spin = meta.galaxy === 'mw' ? 0.05 : 0.03
    return points
  }

  #craft(meta) {
    const g = new THREE.Group()
    if (meta.craft === 'iss') {
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: '#d5dde8', metalness: 0.4, roughness: 0.35 })
      )
      const mod = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 0.12),
        new THREE.MeshStandardMaterial({ color: '#f4f7fb' })
      )
      const panelL = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.02, 0.42),
        new THREE.MeshStandardMaterial({ color: '#1d3f73', emissive: '#16386a', emissiveIntensity: 0.4 })
      )
      panelL.position.x = -0.4
      const panelR = panelL.clone()
      panelR.position.x = 0.4
      g.add(truss, mod, panelL, panelR)
    } else if (meta.craft === 'rover') {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.12, 0.24),
        new THREE.MeshStandardMaterial({ color: '#f2f2f2' })
      )
      body.position.y = 0.12
      g.add(body)
    } else {
      const bus = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: '#e8edf4', metalness: 0.5, roughness: 0.3 })
      )
      const dish = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: '#c5d0de' })
      )
      dish.rotation.x = Math.PI / 2
      dish.position.z = 0.16
      g.add(bus, dish)
    }
    return g
  }

  #meteors() {
    const count = 80
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xfff4d2,
      size: 0.06,
      transparent: true,
      depthWrite: false
    }))
  }

  #ring(radius) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.45, radius * 2.35, 80),
      new THREE.MeshBasicMaterial({
        color: 0xe7d7b0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.78,
        depthWrite: false
      })
    )
    ring.rotation.x = Math.PI / 2.15
    return ring
  }

  #atmosphere(meta) {
    const mat = new THREE.MeshBasicMaterial({
      color: meta.atmosphere,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      depthWrite: false
    })
    return new THREE.Mesh(new THREE.SphereGeometry(meta.radius * 1.08, 32, 24), mat)
  }

  #glow(meta) {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    const ctx = c.getContext('2d')
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, meta.color || '#fff')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    const tex = new THREE.CanvasTexture(c)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }))
    const s = (meta.glow || 1) * 2
    sprite.scale.set(s, s, 1)
    return sprite
  }

  #orbitLine(radius) {
    const points = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      points.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    return new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0x8ea4c8,
      transparent: true,
      opacity: 0.28
    }))
  }

  #stars() {
    const count = 2500
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 160
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(b) * Math.cos(a)
      positions[i * 3 + 1] = r * Math.cos(b)
      positions[i * 3 + 2] = r * Math.sin(b) * Math.sin(a)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.starMat = new THREE.PointsMaterial({
      color: 0xdde7ff,
      size: 0.45,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    })
    this.starField = new THREE.Points(geo, this.starMat)
    this.scene.add(this.starField)
  }

  #pick(event, fly) {
    if (!this.camera) return
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = []
    for (const body of this.bodies.values()) {
      if (body.meta.mode === this.mode) hits.push(body.hit)
    }
    const found = this.raycaster.intersectObjects(hits, false)
    if (!found.length) return
    this.selectById(found[0].object.userData.id, fly)
  }

  #resize() {
    const parent = this.canvas.parentElement
    if (!parent || !this.renderer) return
    const w = parent.clientWidth
    const h = parent.clientHeight
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  #loop() {
    const tick = () => {
      if (this.disposed) return
      this.frame = requestAnimationFrame(tick)
      const dt = Math.min(0.05, this.clock.getDelta())
      if (!this.paused) this.sim += dt * this.speed
      this.#animate(dt)
      if (this.mode === 'timeline' && this.timelineStage) {
        this.#advanceTimeline(dt)
        this.timelineStage.update(dt)
        this.renderer.setClearColor(this.timelineStage.clearColor, 1)
        this.#applyTimelineStars()
      }
      if (this.flight) {
        this.flight.t = Math.min(1, this.flight.t + dt * 0.7)
        const k = smooth(this.flight.t)
        this.camera.position.lerpVectors(this.flight.from, this.flight.to, k)
        this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, k)
        if (this.flight.t >= 1) this.flight = null
      }
      this.controls.update()
      if (this.mode === 'timeline') this.#timelineCamera(dt)
      else this.#labels()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  #animate(dt) {
    for (const body of this.bodies.values()) {
      if (body.meta.mode !== this.mode) continue
      const meta = body.meta
      if (meta.orbit) {
        const angle = (meta.phase || 0) + this.sim * (meta.orbitSpeed || 0.1)
        body.pivot.position.set(Math.cos(angle) * meta.orbit, 0, Math.sin(angle) * meta.orbit)
      }
      if (meta.drift) {
        body.pivot.position.z = 10 + Math.sin(this.sim * 0.15) * 2
        body.pivot.position.x = Math.cos(this.sim * 0.1) * 3
      }
      body.anchor.traverse((obj) => {
        if (obj.userData.spin) obj.rotation.y += dt * obj.userData.spin * (this.paused ? 0 : this.speed)
        if (obj.userData.spinDisk) obj.rotation.z += dt * obj.userData.spinDisk * (this.paused ? 0.2 : this.speed)
      })
    }
    const sn = this.bodies.get('supernova')
    if (sn && this.mode === 'events') {
      if (this.supernovaT >= 0 && !this.paused) this.supernovaT += dt * this.speed
      const t = this.supernovaT < 0 ? 0 : Math.min(1, this.supernovaT / 6)
      const shell = sn.anchor
      shell.scale.setScalar(1 + t * 4)
      if (t >= 1) {
        this.supernovaT = -1
        shell.scale.setScalar(1)
      }
    }
    const meteors = this.bodies.get('meteors')
    if (meteors && this.mode === 'events' && !this.paused) {
      const pos = meteors.anchor.geometry?.attributes?.position
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i) - dt * this.speed * 1.4
          if (x < -5) x = 5
          pos.setX(i, x)
        }
        pos.needsUpdate = true
      }
    }
  }

  #advanceTimeline(dt) {
    if (!this.timelinePlaying || this.scrubbing || document.hidden || this.reducedMotion) return
    const next = this.timelineProgress + (dt * this.timelineSpeed) / 90
    if (next >= 1) {
      this.setTimelineProgress(1)
      this.timelinePlaying = false
      this.onTimelineEnd?.()
      return
    }
    this.setTimelineProgress(next)
  }

  #timelineCamera(dt) {
    if (!this.followCamera || this.reducedMotion || this.flight) return
    if (performance.now() < this.orbitHold) return
    if (!this.timelinePlaying && !this.scrubbing) return
    const plan = this.timelineStage.cameraPlan
    if (this.timelinePlaying) this.timelineAngle += dt * (this.timelineStage.autoSpin || 0)
    const ang = this.timelineAngle || 0
    this.camera.position.set(Math.sin(ang) * plan.dist, plan.height, Math.cos(ang) * plan.dist)
    this.controls.target.set(0, 0, 0)
    this.controls.update()
  }

  #restoreStars() {
    if (!this.starMat) return
    this.starMat.opacity = this.quality === 'low' ? 0.45 : 0.8
  }

  #applyTimelineStars() {
    if (!this.starMat || !this.timelineStage) return
    const base = this.quality === 'low' ? 0.45 : 0.8
    this.starMat.opacity = base * this.timelineStage.starOpacity
  }

  #labels() {
    if (!this.onLabels) return
    const parent = this.canvas.parentElement
    const width = parent ? parent.clientWidth : window.innerWidth
    const height = parent ? parent.clientHeight : window.innerHeight
    const out = []
    const world = new THREE.Vector3()
    for (const body of this.bodies.values()) {
      if (body.meta.mode !== this.mode) continue
      body.anchor.getWorldPosition(world)
      const projected = world.clone().project(this.camera)
      if (projected.z > 1) continue
      const x = (projected.x * 0.5 + 0.5) * width
      const y = (-projected.y * 0.5 + 0.5) * height
      if (x < -20 || y < -20 || x > width + 20 || y > height + 20) continue
      out.push({
        id: body.meta.id,
        name: body.meta.name,
        x,
        y,
        selected: body.meta.id === this.selectedId
      })
    }
    this.onLabels(out)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this.handleResize)
    this.canvas.removeEventListener('click', this._click)
    this.canvas.removeEventListener('dblclick', this._dbl)
    this.controls?.dispose()
    this.timelineStage?.dispose()
    this.timelineStage = null
    this.scene?.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => {
        if (m.map && !m.map.userData?.shared) m.map.dispose?.()
        m.dispose?.()
      })
    })
    this.renderer?.dispose()
  }
}
