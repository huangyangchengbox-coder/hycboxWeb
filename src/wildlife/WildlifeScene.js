/**
 * 动物世界：地球入口与生态区域。地貌和动物为示意模型，不是照片或精确解剖。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { HABITATS } from './habitats.js'
import { MIGRATIONS, SPECIALS } from './features.js'

function visiblePath(path) {
  const lats = path.map((item) => item[0])
  const lons = path.map((item) => item[1])
  const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lons) - Math.min(...lons))
  if (span > 20) return path
  const lat0 = lats.reduce((sum, value) => sum + value, 0) / lats.length
  const lon0 = lons.reduce((sum, value) => sum + value, 0) / lons.length
  return path.map(([lat, lon]) => [
    Math.max(-78, Math.min(78, lat0 + (lat - lat0) * 16)),
    lon0 + (lon - lon0) * 16
  ])
}

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
    this.hour = 14
    this.weather = 'sunny'
    this.freeRoam = false
    this.nightSafari = false
    this.keys = {}
    this.month = 0
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
    this.ambient = new THREE.AmbientLight(0xcfe3d4, 0.55)
    this.sun = new THREE.DirectionalLight(0xfff4dd, 1.4)
    this.sun.position.set(4, 6, 3)
    this.scene.add(this.ambient, this.sun)
    this.scene.add(this.camera)
    this.spot = new THREE.SpotLight(0xfff1c8, 0, 16, 0.42, 0.5, 1)
    this.spot.position.set(0, 0, 0)
    this.spot.target.position.set(0, 0, -2)
    this.camera.add(this.spot, this.spot.target)
    this.#earth()
    this.#habitats()
    this.#migrations()
    this.#specials()
    this.#weather()
    this.clock = new THREE.Clock()
    this.#resize()
    this.handleResize = () => this.#resize()
    window.addEventListener('resize', this.handleResize)
    this._click = (e) => this.#pick(e, false)
    this._dbl = (e) => this.#pick(e, true)
    this._keyDown = (e) => {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      this.keys[e.key.toLowerCase()] = true
    }
    this._keyUp = (e) => { this.keys[e.key.toLowerCase()] = false }
    this.canvas.addEventListener('click', this._click)
    this.canvas.addEventListener('dblclick', this._dbl)
    window.addEventListener('keydown', this._keyDown)
    window.addEventListener('keyup', this._keyUp)
    this.showEarth(true)
    this.#loop()
  }

  showEarth(instant = false) {
    this.view = 'earth'
    this.earth.visible = true
    this.nightSafari = false
    this.spot.intensity = 0
    this.migrationGroup.visible = false
    for (const group of this.habitatGroups.values()) group.visible = false
    for (const group of this.specialGroups.values()) group.visible = false
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
    this.migrationGroup.visible = false
    for (const item of this.specialGroups.values()) item.visible = false
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

  setHour(hour) {
    this.hour = hour
    const night = hour < 5 || hour >= 19
    const dusk = (hour >= 5 && hour < 7) || (hour >= 17 && hour < 19)
    this.sun.intensity = night ? 0.12 : dusk ? 0.65 : 1.45
    this.sun.color.set(night ? '#6d86b8' : dusk ? '#ffb06a' : '#fff4dd')
    this.ambient.intensity = night ? 0.08 : 0.5
    this.spot.intensity = this.nightSafari && night ? 8 : 0
  }

  setNightSafari(on) {
    this.nightSafari = !!on
    this.setHour(on ? 22 : this.hour)
  }

  setWeather(type) {
    this.weather = type
    const colors = { sunny: 0xfff6d0, rain: 0x9ec4e8, storm: 0xd7e4ff, snow: 0xffffff, dust: 0xd2b48a }
    if (this.weatherMat) this.weatherMat.color.setHex(colors[type] || 0xffffff)
  }

  setFreeRoam(on) {
    this.freeRoam = !!on
  }

  setMonth(month) {
    this.month = month
  }

  showMigration() {
    this.view = 'migration'
    this.earth.visible = true
    this.nightSafari = false
    this.spot.intensity = 0
    this.migrationGroup.visible = true
    for (const group of this.habitatGroups.values()) group.visible = false
    for (const group of this.specialGroups.values()) group.visible = false
    this.scene.fog.color.set('#07140f')
    this.renderer.setClearColor(0x07140f, 1)
    this.selectedId = null
    this.onSelect?.({ type: 'migration', ...MIGRATIONS[0] })
    this.#fly(new THREE.Vector3(0, 2.2, 6.4), new THREE.Vector3(0, 0, 0), false)
  }

  showSpecial(id) {
    const group = this.specialGroups.get(id)
    if (!group) return
    this.view = id
    this.earth.visible = false
    this.migrationGroup.visible = false
    for (const item of this.habitatGroups.values()) item.visible = false
    for (const [key, item] of this.specialGroups) item.visible = key === id
    const spec = SPECIALS[id]
    this.scene.fog.color.set(spec.fog)
    this.renderer.setClearColor(spec.fog, 1)
    this.onSelect?.({
      type: 'zone',
      en: id.toUpperCase(),
      name: spec.name,
      summary: spec.summary,
      subs: spec.creatures.map((item) => item.name)
    })
    this.#fly(new THREE.Vector3(0, 1.8, 7), new THREE.Vector3(0, 0.4, 0), false)
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
          base: mesh.position.clone(),
          hit,
          meta: { ...animal, habitatId: habitat.id, habitatName: habitat.name }
        })
      })
      this.habitatGroups.set(habitat.id, group)
      this.scene.add(group)
    }
  }

  #migrations() {
    this.migrationGroup = new THREE.Group()
    this.migrationGroup.visible = false
    const colors = [0xf0d7a2, 0x7ec8e3, 0xf4f4f4]
    MIGRATIONS.forEach((route, index) => {
      const points = visiblePath(route.path).map(([lat, lon]) => latLon(lat, lon, 2.2))
      const curve = new THREE.CatmullRomCurve3(points, true)
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 80, 0.02, 5, true),
        new THREE.MeshBasicMaterial({ color: colors[index % colors.length] })
      )
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 8),
        new THREE.MeshBasicMaterial({ color: colors[index % colors.length] })
      )
      marker.userData = { id: route.id, kind: 'migration' }
      this.migrationGroup.add(tube, marker)
      this.bodies.push({ id: route.id, kind: 'migration', anchor: marker, hit: marker, curve, meta: route })
    })
    this.earth.add(this.migrationGroup)
  }

  #specials() {
    this.specialGroups = new Map()
    for (const [id, spec] of Object.entries(SPECIALS)) {
      const group = new THREE.Group()
      group.visible = false
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(8, 32),
        new THREE.MeshStandardMaterial({ color: spec.fog, roughness: 1 })
      )
      ground.rotation.x = -Math.PI / 2
      group.add(ground)
      spec.creatures.forEach((creature, index) => {
        const mesh = critter(creature.shape, creature.color)
        const angle = (index / spec.creatures.length) * Math.PI * 1.6 - 0.4
        mesh.position.set(Math.cos(angle) * 2.6, creature.shape === 'bird' ? 1.15 : 0.15, Math.sin(angle) * 2.6)
        const hit = new THREE.Mesh(
          new THREE.SphereGeometry(0.5, 8, 8),
          new THREE.MeshBasicMaterial({ visible: false })
        )
        hit.position.copy(mesh.position)
        hit.userData = { id: creature.id, kind: 'special' }
        group.add(mesh, hit)
        if (creature.glow) {
          const glow = new THREE.PointLight(creature.glow, 1.4, 4)
          glow.position.copy(mesh.position)
          glow.position.y += 0.7
          group.add(glow)
        }
        this.bodies.push({
          id: creature.id,
          kind: 'special',
          section: id,
          anchor: mesh,
          base: mesh.position.clone(),
          hit,
          meta: { ...creature, section: id, sectionName: spec.name }
        })
      })
      this.specialGroups.set(id, group)
      this.scene.add(group)
    }
  }

  #weather() {
    const count = 260
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 16
      positions[i * 3 + 1] = Math.random() * 8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.weatherMat = new THREE.PointsMaterial({ color: 0xfff6d0, size: 0.07, transparent: true, opacity: 0 })
    this.weatherPoints = new THREE.Points(geo, this.weatherMat)
    this.scene.add(this.weatherPoints)
  }

  #pick(event, fly) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.#visibleBodies().map((item) => item.hit)
    const found = this.raycaster.intersectObjects(hits, false)
    if (!found.length) return
    const data = found[0].object.userData
    const body = this.bodies.find((item) => item.id === data.id)
    if (!body) return
    if (body.kind === 'habitat') this.showHabitat(body.id, false)
    else if (body.kind === 'animal') {
      this.focusAnimal(body.id)
      if (!fly) {
        this.selectedId = body.id
        this.onSelect?.({ type: 'animal', ...body.meta })
      }
    } else {
      this.selectedId = body.id
      this.onSelect?.({ type: body.kind, ...body.meta })
    }
  }

  #visibleBodies() {
    if (this.view === 'earth') return this.bodies.filter((item) => item.kind === 'habitat')
    if (this.view === 'migration') return this.bodies.filter((item) => item.kind === 'migration')
    if (SPECIALS[this.view]) return this.bodies.filter((item) => item.kind === 'special' && item.section === this.view)
    return this.bodies.filter((item) => item.kind === 'animal' && item.habitatId === this.view)
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

  #roam(dt) {
    if (!this.freeRoam || this.flight) return
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    dir.y = 0
    if (dir.lengthSq() < 1e-6) return
    dir.normalize()
    const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    const move = new THREE.Vector3()
    if (this.keys.w) move.add(dir)
    if (this.keys.s) move.sub(dir)
    if (this.keys.d) move.add(right)
    if (this.keys.a) move.sub(right)
    if (this.keys.e) move.y += 1
    if (this.keys.q) move.y -= 1
    if (move.lengthSq() === 0) return
    move.normalize().multiplyScalar(4 * dt)
    this.camera.position.add(move)
    this.controls.target.add(move)
  }

  #animateLife() {
    if (this.reduced) return
    const t = this.clock.elapsedTime
    for (const body of this.bodies) {
      if ((body.kind !== 'animal' && body.kind !== 'special') || !body.base) continue
      const home = body.kind === 'animal' ? body.habitatId === this.view : body.section === this.view
      if (!home) continue
      body.anchor.position.y = body.base.y + Math.sin(t * 1.5 + body.base.x) * 0.045
      body.anchor.position.x = body.base.x + Math.sin(t * 0.4 + body.base.z) * 0.16
      body.hit.position.copy(body.anchor.position)
    }
  }

  #animateWeather(dt) {
    const habitatView = this.view !== 'earth' && this.view !== 'migration' && !SPECIALS[this.view]
    const active = this.weather !== 'sunny' && habitatView
    this.weatherMat.opacity = active ? (this.weather === 'storm' ? 0.9 : 0.55) : 0
    if (!active || this.reduced) return
    const arr = this.weatherPoints.geometry.attributes.position.array
    const fall = this.weather === 'snow' ? 0.7 : this.weather === 'dust' ? 0.35 : 3.6
    const drift = this.weather === 'dust' || this.weather === 'storm' ? 1.4 : 0.25
    for (let i = 0; i < arr.length; i += 3) {
      arr[i + 1] -= fall * dt
      arr[i] += drift * dt
      if (arr[i + 1] < 0) arr[i + 1] = 8
      if (arr[i] > 8) arr[i] = -8
    }
    this.weatherPoints.geometry.attributes.position.needsUpdate = true
  }

  #animateMigration() {
    if (this.view !== 'migration') return
    const u = ((this.month % 12) + 0.001) / 12
    for (const body of this.bodies) {
      if (body.kind !== 'migration' || !body.curve) continue
      body.anchor.position.copy(body.curve.getPointAt(u))
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
      this.#roam(dt)
      this.#animateLife()
      this.#animateWeather(dt)
      this.#animateMigration()
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
    const list = this.#visibleBodies()
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
    window.removeEventListener('keydown', this._keyDown)
    window.removeEventListener('keyup', this._keyUp)
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
