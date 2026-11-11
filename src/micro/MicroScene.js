import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createAtomRig } from './atoms.js'
import { MOLECULES, createMoleculeKit } from './molecules.js'
import { createDnaRig } from './dna.js'
import { createCellRig } from './cellModel.js'
import { createVirusRig } from './virusModel.js'
import { trapWeight } from './scaleJourney.js'
import { disposeSoftTexture, getSoftTexture } from './textures.js'

const CAMERAS = {
  atom: { pos: [0, 1.1, 6.4], target: [0, 0, 0] },
  molecule: { pos: [0, 1.3, 5.6], target: [0, 0, 0] },
  dna: { pos: [1.6, 2.2, 8.4], target: [0, 0, 0] },
  cell: { pos: [0.4, 1.4, 8.6], target: [0, 0.2, 0] },
  virus: { pos: [0.2, 0.8, 4.6], target: [0, 0, 0] },
  scale: { pos: [2.2, 2.4, 14], target: [0, 0, 0] },
  quiz: { pos: [0.4, 1.4, 8.6], target: [0, 0.2, 0] }
}

function fadeMaterial(mat, opacity) {
  mat.transparent = true
  mat.depthWrite = opacity > 0.85
  mat.opacity = opacity
}

export class MicroScene {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.hooks = hooks
    this.reduced = !!hooks.reducedMotion
    this.quality = 'high'
    this.mode = 'atom'
    this.follow = true
    this.followUntil = 0
    this.scaleP = 0
    this.scalePlaying = false
    this.scaleSpeed = 1
    this.atomSpec = null
    this.selectedId = null
    this.flying = false
    this.flyT = 0
    this.lastLabel = 0
    this.lastEmit = 0
    this.pointer = { x: 0, y: 0 }
    this._wp = new THREE.Vector3()
    this._ndc = new THREE.Vector2()
    this._desired = new THREE.Vector3()
    this._look = new THREE.Vector3()
    this._offset = new THREE.Vector3(0.7, 0.45, 1.8)
    this.flyFrom = new THREE.Vector3()
    this.flyTo = new THREE.Vector3()
    this.targetFrom = new THREE.Vector3()
    this.targetTo = new THREE.Vector3()
    this.raycaster = new THREE.Raycaster()
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#05020a')
    this.scene.fog = new THREE.Fog('#120818', 12, 32)
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.05, 80)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.addEventListener('start', () => {
      this.followUntil = performance.now() + 3000
    })
    this.scene.add(new THREE.AmbientLight('#efe7ff', 0.55))
    const key = new THREE.DirectionalLight('#f7fbff', 1.45)
    key.position.set(4, 6, 5)
    this.scene.add(key)
    const fill = new THREE.PointLight('#ff4fa3', 6, 24)
    fill.position.set(-4, 1.2, 3)
    this.scene.add(fill)

    this.atom = createAtomRig()
    this.moleculeKit = createMoleculeKit()
    this.moleculeRoot = new THREE.Group()
    this.moleculeModels = new Map()
    MOLECULES.forEach((def) => {
      const model = this.moleculeKit.build(def)
      model.visible = false
      this.moleculeRoot.add(model)
      this.moleculeModels.set(def.id, model)
    })
    this.waterNet = this.moleculeKit.buildWaterNetwork()
    this.waterNet.visible = false
    this.moleculeRoot.add(this.waterNet)
    this.dna = createDnaRig()
    this.cell = createCellRig()
    this.virus = createVirusRig()
    this.scaleGroup = this.#buildScale()
    this.scene.add(
      this.atom.group,
      this.moleculeRoot,
      this.dna.group,
      this.cell.group,
      this.virus.group,
      this.scaleGroup
    )
    this.groups = {
      atom: this.atom.group,
      molecule: this.moleculeRoot,
      dna: this.dna.group,
      cell: this.cell.group,
      virus: this.virus.group,
      scale: this.scaleGroup
    }
    this.scene.traverse((obj) => {
      if (obj.isPoints) obj.raycast = () => {}
    })
    this.#resize()
    this._onResize = () => this.#resize()
    this._down = (event) => {
      this.pointer.x = event.clientX
      this.pointer.y = event.clientY
    }
    this._up = (event) => this.#pick(event, false)
    this._dbl = (event) => this.#pick(event, true)
    window.addEventListener('resize', this._onResize)
    this.canvas.addEventListener('pointerdown', this._down)
    this.canvas.addEventListener('pointerup', this._up)
    this.canvas.addEventListener('dblclick', this._dbl)
    this.setMode('atom')
    this.clock = new THREE.Clock()
    this.#loop()
  }

  setMode(id) {
    this.mode = id
    const key = id === 'quiz' ? 'cell' : id
    Object.entries(this.groups).forEach(([name, group]) => {
      group.visible = name === key
    })
    this.selectedId = null
    this.hooks.onLabels?.([])
    this.#flyTo(CAMERAS[id] || CAMERAS.atom)
    if (id === 'scale') this.setScaleProgress(this.scaleP)
  }

  setAtom(spec) {
    this.atomSpec = spec
    this.atom.setSpec(spec, this.quality)
  }

  showMolecule(id, hydrogen) {
    const network = hydrogen && id === 'water'
    this.moleculeModels.forEach((model, key) => {
      model.visible = key === id && !network
    })
    this.waterNet.visible = network
  }

  setDnaAction(action) {
    this.dna.setAction(action)
  }

  setDnaPlaying(playing) {
    this.dna.setPlaying(playing && !this.reduced)
  }

  setDnaOpen(value) {
    this.dna.setOpen(value)
  }

  setPlant(on) {
    this.cell.setPlant(on)
  }

  setVirusView(id) {
    this.virus.setView(id)
  }

  setVirusPlaying(playing) {
    this.virus.setPlaying(playing && !this.reduced)
  }

  setVirusAmount(value) {
    this.virus.setAmount(value)
  }

  setScaleProgress(progress) {
    this.scaleP = Math.min(1, Math.max(0, progress))
    this.#applyScale(this.scaleP)
  }

  setScalePlaying(playing) {
    this.scalePlaying = playing && !this.reduced
  }

  setScaleSpeed(speed) {
    this.scaleSpeed = speed
  }

  setFollow(on) {
    this.follow = !!on
  }

  setQuality(level) {
    this.quality = level
    this.renderer.setPixelRatio(level === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75))
    if (this.atomSpec) this.atom.setQuality(level, this.atomSpec)
    this.cell.setQuality(level)
  }

  focusSelected() {
    if (!this.selectedId) return
    this.selectById(this.selectedId, true)
  }

  selectById(id, focus) {
    const root = this.groups[this.mode === 'quiz' ? 'cell' : this.mode]
    if (!root) return
    let found = null
    root.traverse((obj) => {
      if (!found && obj.userData?.pick?.id === id) found = obj
    })
    if (!found) return
    this.selectedId = id
    this.hooks.onSelect?.(found.userData.pick)
    if (focus) this.#focusObject(found)
  }

  #buildScale() {
    const group = new THREE.Group()
    this.scalePieces = []
    const remember = (mesh, start, end, base = 0.9) => {
      mesh.traverse((obj) => {
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
        mats.forEach((mat) => {
          mat.transparent = true
          mat.opacity = 0
          mat.depthWrite = false
          mat.userData.baseOpacity = base
        })
      })
      this.scalePieces.push({ mesh, start, end })
      group.add(mesh)
    }
    const skinGeo = new THREE.BufferGeometry()
    const skinPos = []
    for (let i = 0; i < 180; i += 1) {
      skinPos.push((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 3.2)
    }
    skinGeo.setAttribute('position', new THREE.Float32BufferAttribute(skinPos, 3))
    const skin = new THREE.Points(skinGeo, new THREE.PointsMaterial({
      map: getSoftTexture(),
      color: '#ffb7c8',
      size: 0.28,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }))
    remember(skin, 0, 0.1, 0.85)

    const cell = new THREE.Group()
    cell.add(new THREE.Mesh(new THREE.SphereGeometry(1.7, 28, 18), new THREE.MeshStandardMaterial({
      color: '#7dffe8', emissive: '#7dffe8', emissiveIntensity: 0.25, transparent: true
    })))
    const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), new THREE.MeshStandardMaterial({
      color: '#ff7ad9', emissive: '#ff7ad9', emissiveIntensity: 0.35
    }))
    cell.add(nucleus)
    remember(cell, 0.08, 0.28)

    const organs = new THREE.Group()
    const organNucleus = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 14), new THREE.MeshStandardMaterial({
      color: '#ff7ad9', emissive: '#ff7ad9', emissiveIntensity: 0.35
    }))
    const organMito = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), new THREE.MeshStandardMaterial({
      color: '#ff8b6a', emissive: '#ff8b6a', emissiveIntensity: 0.3
    }))
    organMito.position.set(1.15, -0.35, 0.2)
    organMito.scale.set(1.4, 0.7, 0.7)
    organs.add(organNucleus, organMito)
    remember(organs, 0.26, 0.5)

    const bacteria = new THREE.Group()
    const rod = new THREE.Mesh(new THREE.SphereGeometry(0.7, 18, 12), new THREE.MeshStandardMaterial({
      color: '#b6ff7a', emissive: '#b6ff7a', emissiveIntensity: 0.28
    }))
    rod.scale.set(2.1, 0.72, 0.72)
    const neighbor = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshStandardMaterial({
      color: '#ff8b6a', emissive: '#ff8b6a', emissiveIntensity: 0.3
    }))
    neighbor.position.set(2.1, 0.15, 0)
    neighbor.scale.set(1.3, 0.7, 0.7)
    bacteria.add(rod, neighbor)
    remember(bacteria, 0.42, 0.66)

    const virus = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 0), new THREE.MeshStandardMaterial({
      color: '#ff4fa3', emissive: '#ff4fa3', emissiveIntensity: 0.4
    }))
    remember(virus, 0.6, 0.82)

    const helix = new THREE.Group()
    for (let i = 0; i < 16; i += 1) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshStandardMaterial({
        color: i % 2 ? '#ffb15a' : '#7dffe8',
        emissive: i % 2 ? '#ffb15a' : '#7dffe8',
        emissiveIntensity: 0.4
      }))
      const angle = i * 0.7
      bead.position.set(Math.cos(angle) * 0.45, i * 0.16 - 1.2, Math.sin(angle) * 0.45)
      helix.add(bead)
    }
    remember(helix, 0.74, 0.94)

    const atom = new THREE.Group()
    atom.add(new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), new THREE.MeshStandardMaterial({
      color: '#ff5d86', emissive: '#ff5d86', emissiveIntensity: 0.4
    })))
    const cloudGeo = new THREE.BufferGeometry()
    const cloudPos = []
    for (let i = 0; i < 80; i += 1) {
      const radius = 0.7 + Math.random() * 0.55
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      cloudPos.push(radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
    }
    cloudGeo.setAttribute('position', new THREE.Float32BufferAttribute(cloudPos, 3))
    atom.add(new THREE.Points(cloudGeo, new THREE.PointsMaterial({
      map: getSoftTexture(),
      color: '#8cffdf',
      size: 0.12,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })))
    remember(atom, 0.88, 1.05, 0.95)
    return group
  }

  #applyScale(progress) {
    this.scalePieces.forEach((piece) => {
      const weight = trapWeight(progress, piece.start, piece.end)
      piece.mesh.visible = weight > 0.03
      piece.mesh.traverse((obj) => {
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
        mats.forEach((mat) => fadeMaterial(mat, weight * (mat.userData.baseOpacity ?? 0.9)))
      })
    })
  }

  #flyTo(cam) {
    this.flyFrom.copy(this.camera.position)
    this.flyTo.set(cam.pos[0], cam.pos[1], cam.pos[2])
    this.targetFrom.copy(this.controls.target)
    this.targetTo.set(cam.target[0], cam.target[1], cam.target[2])
    if (this.flyFrom.lengthSq() < 0.001) {
      this.camera.position.copy(this.flyTo)
      this.controls.target.copy(this.targetTo)
      this.flying = false
      return
    }
    this.flyT = 0
    this.flying = true
  }

  #focusObject(object) {
    object.getWorldPosition(this.targetTo)
    this.flyFrom.copy(this.camera.position)
    this.targetFrom.copy(this.controls.target)
    this.flyTo.copy(this.targetTo).add(this._offset)
    this.flyT = 0
    this.flying = true
  }

  #pick(event, focus) {
    const rect = this.canvas.getBoundingClientRect()
    if (!focus && Math.hypot(event.clientX - this.pointer.x, event.clientY - this.pointer.y) > 6) return
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this._ndc, this.camera)
    const root = this.groups[this.mode === 'quiz' ? 'cell' : this.mode]
    if (!root?.visible) return
    const hits = this.raycaster.intersectObject(root, true)
    const hit = hits.find((item) => item.object.userData?.pick)
    if (!hit) return
    this.selectedId = hit.object.userData.pick.id
    this.hooks.onSelect?.(hit.object.userData.pick)
    if (focus) this.#focusObject(hit.object)
  }

  #labels() {
    const now = performance.now()
    if (now - this.lastLabel < 80) return
    this.lastLabel = now
    const root = this.groups[this.mode === 'quiz' ? 'cell' : this.mode]
    if (!root?.visible || this.mode === 'scale') {
      this.hooks.onLabels?.([])
      return
    }
    const width = this.canvas.clientWidth || 1
    const height = this.canvas.clientHeight || 1
    const list = []
    root.traverse((obj) => {
      if (!obj.userData?.label || list.length >= 14) return
      obj.getWorldPosition(this._wp)
      this._wp.project(this.camera)
      if (this._wp.z > 1) return
      const x = (this._wp.x * 0.5 + 0.5) * width
      const y = (-this._wp.y * 0.5 + 0.5) * height
      if (x < 190 || y < 108 || x > width - 24) return
      list.push({
        id: obj.userData.pick?.id || obj.uuid,
        name: obj.userData.label,
        x,
        y,
        selected: obj.userData.pick?.id === this.selectedId
      })
    })
    this.hooks.onLabels?.(list)
  }

  #resize() {
    const parent = this.canvas.parentElement
    const width = parent?.clientWidth || window.innerWidth
    const height = parent?.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  #loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.elapsedTime
    if (this.mode === 'atom') this.atom.tick(time, this.reduced)
    if (this.mode === 'molecule' && !this.reduced) {
      const spinning = this.waterNet.visible
        ? this.waterNet
        : [...this.moleculeModels.values()].find((model) => model.visible)
      if (spinning) spinning.rotation.y += dt * 0.22
      const link = this.waterNet.userData.links?.[0]
      if (this.waterNet.visible && link) link.material.opacity = 0.25 + 0.4 * (0.5 + 0.5 * Math.sin(time * 2.2))
    }
    if (this.mode === 'dna') this.dna.tick(dt, this.reduced)
    if (this.mode === 'cell' || this.mode === 'quiz') this.cell.tick(dt, this.reduced)
    if (this.mode === 'virus') this.virus.tick(dt, this.reduced)
    if (this.mode === 'scale' && this.scalePlaying) {
      this.scaleP = Math.min(1, this.scaleP + (dt * this.scaleSpeed) / 28)
      this.#applyScale(this.scaleP)
      if (performance.now() - this.lastEmit > 50) {
        this.lastEmit = performance.now()
        this.hooks.onScaleProgress?.(this.scaleP)
      }
      if (this.scaleP >= 1) {
        this.scalePlaying = false
        this.hooks.onScaleProgress?.(1)
        this.hooks.onScaleEnd?.()
      }
    }
    if (this.flying) {
      this.flyT = Math.min(1, this.flyT + dt / 0.85)
      const eased = this.flyT * this.flyT * (3 - 2 * this.flyT)
      this.camera.position.lerpVectors(this.flyFrom, this.flyTo, eased)
      this.controls.target.lerpVectors(this.targetFrom, this.targetTo, eased)
      if (this.flyT >= 1) this.flying = false
    } else if (this.mode === 'scale' && this.follow && performance.now() > this.followUntil) {
      const dist = 14 - this.scaleP * 9.2
      this._desired.set(dist * 0.16, dist * 0.2, dist)
      const blend = 1 - Math.pow(0.04, dt)
      this.camera.position.lerp(this._desired, blend)
      this.controls.target.lerp(this._look, blend)
    }
    this.controls.update()
    this.#labels()
    this.renderer.render(this.scene, this.camera)
    this.frame = requestAnimationFrame(() => this.#loop())
  }

  dispose() {
    cancelAnimationFrame(this.frame)
    window.removeEventListener('resize', this._onResize)
    this.canvas.removeEventListener('pointerdown', this._down)
    this.canvas.removeEventListener('pointerup', this._up)
    this.canvas.removeEventListener('dblclick', this._dbl)
    this.atom.dispose()
    this.moleculeKit.dispose()
    this.dna.dispose()
    this.cell.dispose()
    this.virus.dispose()
    this.scaleGroup.traverse((obj) => {
      if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((mat) => {
        if (!mat.userData?.sharedCoat) mat.dispose?.()
      })
    })
    disposeSoftTexture()
    this.controls.dispose()
    this.renderer.dispose()
  }
}
