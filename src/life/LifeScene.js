import * as THREE from 'three'

/**
 * 生命演化的 3D 展台：一条时间轴，节点上立着对应的生物示意模型。
 * 时间轴用对数刻度——38 亿年跨度过大，线性刻度会把寒武纪之后全挤在末端。
 */

const MA_MIN = 0.3
const MA_MAX = 3800

/** 距今 ma 百万年 → 0（最古老）到 1（今天）的位置。 */
export function maToT(ma) {
  const clamped = Math.min(MA_MAX, Math.max(MA_MIN, ma))
  const lo = Math.log10(MA_MAX)
  const hi = Math.log10(MA_MIN)
  return 1 - (Math.log10(clamped) - hi) / (lo - hi)
}

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.62, ...opts })
}

/** 细菌：胶囊 + 鞭毛。 */
function buildBacterium(color) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 8, 16), mat(color, { roughness: 0.4 }))
  body.rotation.z = Math.PI / 2
  group.add(body)
  const flag = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.008, 0.5, 6),
    mat(0xffffff, { roughness: 0.5 })
  )
  flag.rotation.z = Math.PI / 2.4
  flag.position.set(-0.42, 0.06, 0)
  group.add(flag)
  return group
}

/** 真核细胞：球 + 细胞核 + 线粒体。 */
function buildCell(color) {
  const group = new THREE.Group()
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 18),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.34,
      roughness: 0.3,
      depthWrite: false
    })
  )
  group.add(membrane)
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), mat(0x6f8bff, { roughness: 0.35 }))
  group.add(nucleus)
  for (let i = 0; i < 4; i += 1) {
    const mito = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.09, 4, 8), mat(0xff9f4a))
    const a = (i / 4) * Math.PI * 2
    mito.position.set(Math.cos(a) * 0.23, Math.sin(a) * 0.16, Math.sin(a) * 0.19)
    mito.rotation.set(a, a * 0.6, 0)
    group.add(mito)
  }
  return group
}

/** 三叶虫：椭圆背甲 + 分节。 */
function buildTrilobite(color) {
  const group = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 14), mat(color))
  shell.scale.set(1.5, 0.42, 1)
  group.add(shell)
  for (let i = 0; i < 5; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.5), mat(0x1a2a20))
    seg.position.set(-0.24 + i * 0.13, 0.1, 0)
    group.add(seg)
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.01, 0.24, 6), mat(0x2e3d2a))
      leg.position.set(-0.16 + i * 0.12, -0.06, side * 0.2)
      leg.rotation.x = side * 0.6
      group.add(leg)
    }
  }
  return group
}

/** 植物：茎 + 叶。 */
function buildPlant(color) {
  const group = new THREE.Group()
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.8, 8), mat(0x3f6b35))
  stem.position.y = 0.4
  group.add(stem)
  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mat(color, { roughness: 0.7 }))
    leaf.scale.set(1.5, 0.14, 0.75)
    const a = (i / 5) * Math.PI * 2
    leaf.position.set(Math.cos(a) * 0.17, 0.28 + i * 0.13, Math.sin(a) * 0.17)
    leaf.rotation.set(0.2, a, 0.35)
    group.add(leaf)
  }
  return group
}

/** 恐龙：简化兽脚类剪影。 */
function buildDinosaur(color) {
  const group = new THREE.Group()
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 8, 14), mat(color))
  body.rotation.z = Math.PI / 2
  body.position.set(0, 0.72, 0)
  group.add(body)

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.11, 0.46, 10), mat(color))
  neck.position.set(0.34, 0.94, 0)
  neck.rotation.z = -0.5
  group.add(neck)

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), mat(color))
  head.scale.set(1.5, 0.9, 0.9)
  head.position.set(0.56, 1.12, 0)
  group.add(head)

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.9, 10), mat(color))
  tail.rotation.z = Math.PI / 2.1
  tail.position.set(-0.62, 0.78, 0)
  group.add(tail)

  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.28, 6, 10), mat(color))
    thigh.position.set(-0.06, 0.42, side * 0.16)
    group.add(thigh)
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 6, 10), mat(color))
    shin.position.set(-0.04, 0.16, side * 0.16)
    group.add(shin)
  }
  return group
}

/** 人类：简化双足剪影。 */
function buildHuman(color) {
  const group = new THREE.Group()
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.42, 8, 14), mat(color))
  torso.position.y = 1.22
  group.add(torso)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), mat(0xffd1b3))
  head.position.y = 1.66
  group.add(head)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 6, 10), mat(color))
    arm.position.set(side * 0.2, 1.14, 0)
    arm.rotation.z = side * 0.18
    group.add(arm)
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.52, 6, 10), mat(color))
    leg.position.set(side * 0.09, 0.55, 0)
    group.add(leg)
  }
  return group
}

const BUILDERS = {
  origin: () => buildBacterium(0x7cf2b0),
  photosynthesis: () => buildBacterium(0x8fe36a),
  eukaryote: () => buildCell(0x9fd6ff),
  multicell: () => buildPlant(0x6fbf73),
  cambrian: () => buildTrilobite(0xd8a25a),
  land: () => buildPlant(0x8fd47a),
  amniote: () => buildTrilobite(0xc9b47a),
  permian: () => buildCell(0x9a8fbf),
  dinosaur: () => buildDinosaur(0x8fbf6a),
  kpg: () => buildDinosaur(0xb7a07a),
  bipedal: () => buildHuman(0xc9a06a),
  human: () => buildHuman(0x6ea8ff)
}

export class LifeScene {
  constructor(canvas, milestones) {
    this.canvas = canvas
    this.milestones = milestones
    this.disposed = false
    this.selected = 0
    this.t = 0

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x08131a)
    this.scene.fog = new THREE.Fog(0x08131a, 26, 62)

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 160)
    this.camera.position.set(0, 9.5, 20)
    this.camera.lookAt(0, 1.4, 0)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x14261c, 1.5))
    const key = new THREE.DirectionalLight(0xfff2d8, 2.1)
    key.position.set(8, 16, 10)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -24
    key.shadow.camera.right = 24
    key.shadow.camera.top = 20
    key.shadow.camera.bottom = -20
    this.scene.add(key)

    this.buildStage()
    this.buildTimeline()
    this.buildNodes()

    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.onVisible = () => {
      if (this.disposed || document.hidden) return
      this.last = performance.now()
      this.frameId = requestAnimationFrame(this.frame)
    }
    document.addEventListener('visibilitychange', this.onVisible)

    this.resize()
    this.last = performance.now()
    this.frame = (now) => this.animate(now)
    this.frameId = requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) window.__lifeScene = this
  }

  buildStage() {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({ color: 0x0d1f27, roughness: 0.95 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.02
    ground.receiveShadow = true
    this.scene.add(ground)

    const grid = new THREE.GridHelper(56, 40, 0x1d3a44, 0x122a33)
    grid.position.y = 0
    this.scene.add(grid)
  }

  /** 时间轴：一条主梁 + 每个节点一个基座。 */
  buildTimeline() {
    const total = 40
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(total, 0.16, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x21404b, roughness: 0.7, metalness: 0.25 })
    )
    beam.position.set(0, 0.08, 0)
    this.scene.add(beam)

    this.nodePositions = this.milestones.map((item, index) => {
      const x = -total / 2 + 1.6 + (index / (this.milestones.length - 1)) * (total - 3.2)
      return { x, item, index }
    })

    for (const node of this.nodePositions) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.1, 0.5, 10),
        new THREE.MeshStandardMaterial({ color: 0x2b5460, roughness: 0.6 })
      )
      post.position.set(node.x, 0.33, 0)
      this.scene.add(post)

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.68, 0.08, 28),
        new THREE.MeshStandardMaterial({ color: 0x18343d, roughness: 0.8 })
      )
      pad.position.set(node.x, 0.04, 0)
      pad.receiveShadow = true
      this.scene.add(pad)
    }
  }

  buildNodes() {
    this.nodes = this.nodePositions.map((node) => {
      const builder = BUILDERS[node.item.id]
      const model = builder ? builder() : buildCell(0x9fd6ff)
      model.position.set(node.x, 0.6, 0)
      model.scale.setScalar(0.92)
      model.traverse((obj) => {
        if (obj.isMesh) {
          obj.castShadow = true
          obj.userData.baseY = obj.position.y
        }
      })
      this.scene.add(model)

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.7, 0.8, 40),
        new THREE.MeshBasicMaterial({
          color: 0xd8f34a,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(node.x, 0.02, 0)
      this.scene.add(ring)

      return { ...node, model, ring }
    })

    this.select(this.selected, true)
  }

  select(index, immediate = false) {
    this.selected = Math.max(0, Math.min(this.nodes.length - 1, index))
    this.onSelect?.({
      index: this.selected,
      item: this.nodes[this.selected].item,
      total: this.nodes.length
    })
    if (immediate) this.focus()
  }

  /** 相机平滑移动到选中节点。 */
  focus() {
    const node = this.nodes[this.selected]
    if (!node) return
    this.camGoal = new THREE.Vector3(node.x * 0.82, 5.4, 11.5)
    this.lookGoal = new THREE.Vector3(node.x, 1.5, 0)
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
    this.t += dt

    if (this.camGoal && this.lookGoal) {
      this.camera.position.lerp(this.camGoal, 0.08)
      this.camera.lookAt(this.lookGoal)
    }

    this.nodes.forEach((node, index) => {
      const active = index === this.selected
      const bob = Math.sin(this.t * 1.1 + index * 0.7) * 0.05
      node.model.position.y = 0.6 + bob
      node.model.rotation.y += dt * (active ? 0.55 : 0.12)
      const target = active ? 0.85 : 0
      node.ring.material.opacity += (target - node.ring.material.opacity) * Math.min(1, dt * 6)
      const scale = active ? 1.08 : 0.92
      node.model.scale.lerp(new THREE.Vector3(scale, scale, scale), Math.min(1, dt * 5))
    })

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisible)
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    this.renderer.dispose()
  }
}
