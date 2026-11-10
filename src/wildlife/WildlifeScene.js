/**
 * 动物世界：地球入口与生态区域。地貌和动物为示意模型，不是照片或精确解剖。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { HABITATS } from './habitats.js'

function latLon(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

function earthTexture() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#1a5f8a'
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = '#2f7a45'
  const lands = [[80, 70, 50, 36], [150, 90, 70, 50], [230, 60, 40, 28], [300, 110, 80, 40], [390, 80, 46, 34], [120, 160, 60, 24]]
  for (const [x, y, w, h] of lands) {
    ctx.beginPath()
    ctx.ellipse(x, y, w, h, 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(0, 0, 512, 18)
  ctx.fillRect(0, 238, 512, 18)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function smooth(t) {
  return t * t * (3 - 2 * t)
}

function critter(shape, color) {
  const g = new THREE.Group()
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.6 })
  if (shape === 'whale' || shape === 'dolphin') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(shape === 'whale' ? 0.7 : 0.38, 24, 16), mat)
    body.scale.set(2.2, 0.7, 0.7)
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 8), mat)
    tail.rotation.z = Math.PI / 2
    tail.position.x = shape === 'whale' ? -1.5 : -0.8
    g.add(body, tail)
  } else if (shape === 'shark') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 12), mat)
    body.scale.set(2.1, 0.55, 0.5)
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 4), dark)
    fin.position.y = 0.28
    g.add(body, fin)
  } else if (shape === 'turtle') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 12), mat)
    shell.scale.y = 0.55
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), dark)
    head.position.x = 0.42
    g.add(shell, head)
  } else if (shape === 'bird') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat)
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.22), mat)
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), dark)
    beak.rotation.z = -Math.PI / 2
    beak.position.x = 0.32
    g.add(body, wing, beak)
  } else if (shape === 'tall') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.28), mat)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.1, 8), mat)
    neck.position.y = 0.7
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat)
    head.position.set(0.08, 1.25, 0)
    g.add(body, neck, head)
  } else if (shape === 'snake') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.9, 4, 8), mat)
    body.rotation.z = Math.PI / 2
    g.add(body)
  } else if (shape === 'round') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 14), mat))
  } else {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.32, 0.28), mat)
    body.position.y = 0.28
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mat)
    head.position.set(0.4, 0.42, 0)
    g.add(body, head)
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.1, 0.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6), dark)
        leg.position.set(x, 0.12, z)
        g.add(leg)
      }
    }
  }
  return g
}

export class WildlifeScene {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.onSelect = hooks.onSelect || null
    this.onLabels = hooks.onLabels || null
    this.view = 'earth'
    this.reduced = false
    this.flight = null
    this.disposed = false
    this.bodies = []
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.selectedId = null
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.renderer.setClearColor(0x07140f, 1)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0x07140f, 12, 28)
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.05, 80)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.minDistance = 1.4
    this.controls.maxDistance = 12
    this.scene.add(new THREE.AmbientLight(0xcfe3d4, 0.55))
    const sun = new THREE.DirectionalLight(0xfff4dd, 1.4)
    sun.position.set(4, 6, 3)
    this.scene.add(sun)
    this.#earth()
    this.#habitats()
    this.clock = new THREE.Clock()
    this.#resize()
    this.handleResize = () => this.#resize()
    window.addEventListener('resize', this.handleResize)
    this._click = (e) => this.#pick(e, false)
    this._dbl = (e) => this.#pick(e, true)
    this.canvas.addEventListener('click', this._click)
    this.canvas.addEventListener('dblclick', this._dbl)
    this.showEarth(true)
    this.#loop()
  }

  showEarth(instant = false) {
    this.view = 'earth'
    this.earth.visible = true
    for (const group of this.habitatGroups.values()) group.visible = false
    this.scene.fog.color.set('#07140f')
    this.renderer.setClearColor(0x07140f, 1)
    this.selectedId = null
    this.onSelect?.(null)
    this.#fly(new THREE.Vector3(0, 1.1, 6.2), new THREE.Vector3(0, 0, 0), instant)
  }

  showHabitat(id, instant = false) {
    const group = this.habitatGroups.get(id)
    if (!group) return
    this.view = id
    this.earth.visible = false
    for (const [key, item] of this.habitatGroups) item.visible = key === id
    const habitat = HABITATS.find((item) => item.id === id)
    this.scene.fog.color.set(habitat.fog)
    this.renderer.setClearColor(habitat.fog, 1)
    this.selectedId = null
    this.onSelect?.({ type: 'habitat', ...habitat })
    this.#fly(new THREE.Vector3(0, 2.4, 8), new THREE.Vector3(0, 0.4, 0), instant)
  }

  focusAnimal(id) {
    const body = this.bodies.find((item) => item.id === id && item.kind === 'animal')
    if (!body) return
    if (this.view !== body.habitatId) this.showHabitat(body.habitatId, true)
    this.selectedId = id
    this.onSelect?.({ type: 'animal', ...body.meta })
    const world = new THREE.Vector3()
    body.anchor.getWorldPosition(world)
    this.#fly(world.clone().add(new THREE.Vector3(0.2, 0.8, 2.4)), world, false)
  }

  setReduced(value) {
    this.reduced = !!value
  }

  setQuality(level) {
    this.renderer.setPixelRatio(level === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75))
    this.#resize()
  }

  #earth() {
    this.earth = new THREE.Group()
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(2, 48, 32),
      new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.85 })
    )
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry(2.04, 32, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false })
    )
    this.clouds = cloud
    this.earth.add(mesh, cloud)
    for (const habitat of HABITATS) {
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf0d7a2 })
      )
      pin.position.copy(latLon(habitat.lat, habitat.lon, 2.08))
      pin.userData = { id: habitat.id, kind: 'habitat' }
      this.earth.add(pin)
      this.bodies.push({ id: habitat.id, kind: 'habitat', anchor: pin, hit: pin, meta: habitat })
    }
    this.scene.add(this.earth)
  }

  #habitats() {
    this.habitatGroups = new Map()
    for (const habitat of HABITATS) {
      const group = new THREE.Group()
      group.visible = false
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(8, 40),
        new THREE.MeshStandardMaterial({ color: habitat.ground, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      group.add(ground)
      habitat.animals.forEach((animal, index) => {
        const mesh = critter(animal.shape, animal.color)
        const angle = (index / habitat.animals.length) * Math.PI * 1.4 - 0.4
        const radius = 2.2 + (index % 2) * 0.8
        mesh.position.set(Math.cos(angle) * radius, animal.shape === 'bird' ? 1.1 : 0, Math.sin(angle) * radius)
        mesh.lookAt(0, mesh.position.y, 0)
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false })
        )
        hit.position.copy(mesh.position)
        hit.userData = { id: animal.id, kind: 'animal' }
        group.add(mesh, hit)
        this.bodies.push({
          id: animal.id,
          kind: 'animal',
          habitatId: habitat.id,
          anchor: mesh,
          hit,
          meta: { ...animal, habitatId: habitat.id, habitatName: habitat.name }
        })
      })
      this.habitatGroups.set(habitat.id, group)
      this.scene.add(group)
    }
  }

  #pick(event, fly) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.bodies
      .filter((item) => (this.view === 'earth' ? item.kind === 'habitat' : item.kind === 'animal' && item.habitatId === this.view))
      .map((item) => item.hit)
    const found = this.raycaster.intersectObjects(hits, false)
    if (!found.length) return
    const data = found[0].object.userData
    if (data.kind === 'habitat') this.showHabitat(data.id, false)
    else this.focusAnimal(data.id)
    if (!fly && data.kind === 'animal') {
      const body = this.bodies.find((item) => item.id === data.id)
      this.selectedId = data.id
      this.onSelect?.({ type: 'animal', ...body.meta })
    }
  }

  #fly(pos, target, instant) {
    if (instant) {
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      this.controls.update()
      this.flight = null
      return
    }
    this.flight = {
      from: this.camera.position.clone(),
      to: pos,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      t: 0
    }
  }

  #resize() {
    const parent = this.canvas.parentElement
    if (!parent) return
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
      if (!this.reduced && this.view === 'earth') {
        this.earth.rotation.y += dt * 0.08
        this.clouds.rotation.y += dt * 0.12
      }
      if (this.flight) {
        this.flight.t = Math.min(1, this.flight.t + dt * 0.75)
        const k = smooth(this.flight.t)
        this.camera.position.lerpVectors(this.flight.from, this.flight.to, k)
        this.controls.target.lerpVectors(this.flight.fromTarget, this.flight.toTarget, k)
        if (this.flight.t >= 1) this.flight = null
      }
      this.controls.update()
      this.#labels()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  #labels() {
    if (!this.onLabels) return
    const parent = this.canvas.parentElement
    const width = parent ? parent.clientWidth : window.innerWidth
    const height = parent ? parent.clientHeight : window.innerHeight
    const out = []
    const world = new THREE.Vector3()
    const list = this.view === 'earth'
      ? this.bodies.filter((item) => item.kind === 'habitat')
      : this.bodies.filter((item) => item.kind === 'animal' && item.habitatId === this.view)
    for (const body of list) {
      body.anchor.getWorldPosition(world)
      const projected = world.clone().project(this.camera)
      if (projected.z > 1) continue
      out.push({
        id: body.id,
        name: body.meta.name,
        kind: body.kind,
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        selected: body.id === this.selectedId
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
    this.scene?.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => {
        m.map?.dispose?.()
        m.dispose?.()
      })
    })
    this.renderer?.dispose()
  }
}
