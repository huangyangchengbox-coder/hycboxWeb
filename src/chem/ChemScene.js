import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { atomColor, bondStory } from './structures.js'

export class ChemScene {
  constructor(canvas) {
    this.canvas = canvas
    this.mode = 'table'
    this.shells = [1]
    this.delta = 1.2
    this.clock = new THREE.Clock()
    this.electrons = []
    this.init()
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#10141c')
    this.camera = new THREE.PerspectiveCamera(46, 1, 0.05, 80)
    this.camera.position.set(0, 1.4, 6.2)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.scene.add(new THREE.AmbientLight('#f4f7ff', 0.55))
    const key = new THREE.DirectionalLight('#ffffff', 1.35)
    key.position.set(3, 5, 4)
    this.scene.add(key)
    this.sphere = new THREE.SphereGeometry(1, 28, 18)
    this.small = new THREE.SphereGeometry(1, 16, 12)
    this.tube = new THREE.CylinderGeometry(1, 1, 1, 10)
    this.materials = new Map()
    this.bondMat = new THREE.MeshStandardMaterial({ color: '#d5dde6', roughness: 0.4, metalness: 0.05 })
    this.balloonMat = new THREE.MeshStandardMaterial({
      color: '#9ecbff', transparent: true, opacity: 0.28, roughness: 0.2, depthWrite: false
    })
    this.root = new THREE.Group()
    this.scene.add(this.root)
    this.bondRoot = new THREE.Group()
    this.scene.add(this.bondRoot)
    this.buildBond()
    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(this.canvas)
    this.resize()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  mat(color) {
    const key = color
    if (!this.materials.has(key)) {
      this.materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.04 }))
    }
    return this.materials.get(key)
  }

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / Math.max(1, h)
    this.camera.updateProjectionMatrix()
  }

  clear(group) {
    const shared = new Set([this.sphere, this.small, this.tube])
    group.traverse((child) => {
      if (child.geometry && !shared.has(child.geometry)) child.geometry.dispose()
    })
    group.clear()
  }

  addAtom(group, el, x, y, z, radius) {
    const mesh = new THREE.Mesh(this.sphere, this.mat(atomColor(el)))
    mesh.scale.setScalar(radius)
    mesh.position.set(x, y, z)
    group.add(mesh)
    return mesh
  }

  addBond(group, a, b, radius = 0.06) {
    const start = new THREE.Vector3(a[0], a[1], a[2])
    const end = new THREE.Vector3(b[0], b[1], b[2])
    const dir = end.clone().sub(start)
    const len = dir.length()
    if (len < 1e-4) return
    const mesh = new THREE.Mesh(this.tube, this.bondMat)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh.scale.set(radius, len, radius)
    group.add(mesh)
  }

  setMode(mode) {
    this.mode = mode
    this.root.visible = mode !== 'bond'
    this.bondRoot.visible = mode === 'bond'
    if (mode === 'table') this.camera.position.set(0, 0.8, 5.4)
    else this.camera.position.set(2.2, 1.6, 5.6)
    this.controls.target.set(0, 0, 0)
  }

  setElement(shells) {
    this.shells = shells
    if (this.mode !== 'table' && this.mode !== 'quiz') return
    this.clear(this.root)
    this.electrons = []
    this.addAtom(this.root, 'C', 0, 0, 0, 0.28).material = this.mat('#ffd27a')
    shells.forEach((count, index) => {
      const radius = 0.55 + index * 0.42
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.008, 6, 64),
        new THREE.MeshBasicMaterial({ color: '#9ecbff', transparent: true, opacity: 0.45 })
      )
      ring.rotation.x = Math.PI / 2
      this.root.add(ring)
      const shown = Math.min(count, 16)
      for (let i = 0; i < shown; i += 1) {
        const electron = new THREE.Mesh(this.small, this.mat('#d7f6ff'))
        electron.scale.setScalar(0.045)
        electron.userData.shell = radius
        electron.userData.base = (i / shown) * Math.PI * 2
        electron.userData.speed = 0.7 + index * 0.25
        this.root.add(electron)
        this.electrons.push(electron)
      }
    })
  }

  buildBond() {
    this.clear(this.bondRoot)
    const left = this.addAtom(this.bondRoot, 'Na', -0.8, 0, 0, 0.42)
    const right = this.addAtom(this.bondRoot, 'Cl', 0.8, 0, 0, 0.46)
    const electron = new THREE.Mesh(this.small, this.mat('#fff4c2'))
    electron.scale.setScalar(0.08)
    this.bondRoot.add(electron)
    this.bondPair = { left, right, electron }
    this.setBond(this.delta)
  }

  setBond(delta) {
    this.delta = delta
    if (!this.bondPair) return
    const gap = 1.35 + delta * 0.22
    this.bondPair.left.position.x = -gap / 2
    this.bondPair.right.position.x = gap / 2
    const t = Math.max(0, Math.min(1, (delta - 0.2) / 2.2))
    this.bondPair.electron.position.set(THREE.MathUtils.lerp(0, gap / 2 - 0.2, t), 0.05, 0)
    const story = bondStory(delta)
    this.bondPair.left.material = this.mat(story.name === '离子键' ? '#a84bdc' : '#8fb8de')
    this.bondPair.right.material = this.mat(story.name === '非极性共价' ? '#8fb8de' : '#3cba55')
  }

  showStructure(structure, spin = true) {
    this.clear(this.root)
    this.electrons = []
    this.spin = spin
    structure.atoms.forEach((atom) => {
      const p = atom.p || [atom.x, atom.y, atom.z]
      this.addAtom(this.root, atom.el, p[0], p[1], p[2], atom.r || (atom.el === 'H' ? 0.16 : 0.28))
    })
    for (const [i, j] of structure.bonds || []) {
      const a = structure.atoms[i]
      const b = structure.atoms[j]
      const pa = a.p || [a.x, a.y, a.z]
      const pb = b.p || [b.x, b.y, b.z]
      this.addBond(this.root, pa, pb, 0.045)
    }
    for (const balloon of structure.balloons || []) {
      const mesh = new THREE.Mesh(this.sphere, this.balloonMat)
      mesh.scale.setScalar(0.42)
      mesh.position.set(balloon[0], balloon[1], balloon[2])
      this.root.add(mesh)
    }
    if (structure.dipole) {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -0.2, 0), 1.4, 0xffe08a, 0.18, 0.1)
      this.root.add(arrow)
    }
  }

  showReaction(pack) {
    this.clear(this.root)
    this.electrons = []
    this.spin = false
    this.reactMeshes = pack.atoms.map((el) => this.addAtom(this.root, el, 0, 0, 0, el === 'H' ? 0.12 : el === 'C' ? 0.16 : 0.18))
    this.reactBondGroup = new THREE.Group()
    this.root.add(this.reactBondGroup)
    this.reactAtoms = pack.atoms
  }

  setReactionPose(pose) {
    if (!this.reactMeshes) return
    pose.pos.forEach((p, i) => {
      this.reactMeshes[i].position.set(p[0], p[1], p[2])
    })
    this.clear(this.reactBondGroup)
    for (const [i, j] of pose.bonds) {
      const a = pose.pos[i]
      const b = pose.pos[j]
      this.addBond(this.reactBondGroup, a, b, 0.035)
    }
  }

  frame() {
    const t = this.clock.getElapsedTime()
    for (const electron of this.electrons) {
      const a = electron.userData.base + t * electron.userData.speed
      const r = electron.userData.shell
      electron.position.set(Math.cos(a) * r, Math.sin(t * 0.6) * 0.05, Math.sin(a) * r)
    }
    if (this.spin && this.mode !== 'bond') this.root.rotation.y = t * 0.25
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObs.disconnect()
    this.controls.dispose()
    this.sphere.dispose()
    this.small.dispose()
    this.tube.dispose()
    this.bondMat.dispose()
    this.balloonMat.dispose()
    for (const material of this.materials.values()) material.dispose()
    this.renderer.dispose()
  }
}
