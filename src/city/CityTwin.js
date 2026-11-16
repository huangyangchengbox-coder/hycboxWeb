import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { CITY, NETS, blockCenters, netById, seededRandom } from './catalog.js'

/**
 * Lumen City Twin：程序化 3D 智慧城市。
 * 楼宇用 InstancedMesh，窗户灯光写在自定义着色器里，
 * 管线/电缆/车流是沿折线跑的发光粒子，夜景靠 UnrealBloom。
 */

const NIGHT = { bloom: 1.05, thr: 0.09, bg: 0x05070d, fog: 0x05070d, sun: 0.35, amb: 0.42 }
const DAY = { bloom: 0.16, thr: 0.72, bg: 0x9fc4e8, fog: 0xbfd8ef, sun: 1.5, amb: 1.15 }

const STREET_STEP = CITY.block + CITY.street

function buildBuildingShader() {
  return {
    vertexShader: `
      varying vec2 vUv;
      varying float vHeight;
      varying float vSeed;
      void main() {
        vUv = uv;
        vHeight = position.y;
        vSeed = float(gl_InstanceID) * 0.0173;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uBase;
      uniform vec3 uWindow;
      uniform float uLit;      // 亮灯比例
      uniform float uNight;    // 0 = 白天, 1 = 夜晚
      uniform float uTime;
      varying vec2 vUv;
      varying float vHeight;
      varying float vSeed;

      void main() {
        // 侧面：按 uv 划出窗格
        vec2 grid = vec2(0.9, 1.5);
        vec2 cell = floor(vUv * vec2(8.0, 22.0));
        vec2 f = fract(vUv * vec2(8.0, 22.0));

        // 窗框留缝
        float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.22, f.y) * step(f.y, 0.78);

        // 每个窗口用 seed + 行列做伪随机，决定是否亮灯
        float h = fract(sin(dot(cell + vSeed * 37.0, vec2(12.9898, 78.233))) * 43758.5453);
        float lit = step(1.0 - uLit, h);

        // 缓慢闪烁：不同窗口有不同相位
        float flick = 0.82 + 0.18 * sin(uTime * 0.9 + h * 62.0);

        vec3 col = uBase;
        vec3 winCol = uWindow * lit * flick;

        // 屋顶（uv.y 接近 1 的上表面）不画窗户
        float roof = step(0.995, vUv.y);
        col = mix(col, winCol, win * uNight * (1.0 - roof));

        // 楼体边缘（靠近顶部）加一点轮廓光，暗背景下更好看
        float edge = smoothstep(0.86, 1.0, vUv.y) * 0.5 + 0.5;
        col *= edge;

        // 白天时楼体本身更亮
        col *= mix(1.0, 0.62, uNight * 0.62);

        gl_FragColor = vec4(col, 1.0);
      }
    `
  }
}

export class CityTwin {
  constructor(canvas) {
    this.canvas = canvas
    this.disposed = false
    this.night = true
    this.nightTarget = 1
    this.xray = false
    this.showLabels = true
    this.focusId = 'overview'
    this.speed = 1
    this.paused = false
    this.elapsed = 0
    this.accident = null // { net, t }
    this.layers = {}
    this.hits = []
    this.particles = []
    this.flowLines = []
    this.buildingMats = []
    this.labels = []
    this.hoverCb = null
    this.frameCb = null

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(NIGHT.bg)
    this.scene.fog = new THREE.FogExp2(NIGHT.fog, 0.028)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
    this.camera.position.set(9.5, 8.2, 11.5)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 3.2
    this.controls.maxDistance = 26
    this.controls.maxPolarAngle = Math.PI * 0.485
    this.controls.target.set(0, 0.4, 0)

    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      NIGHT.bloom,
      0.5,
      NIGHT.thr
    )
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())

    this.camGoal = new THREE.Vector3()
    this.targetGoal = new THREE.Vector3()
    this.flying = false
    this.flyK = 0

    this.clock = new THREE.Clock()
    this.ray = new THREE.Raycaster()
    this.mouse = new THREE.Vector2(-10, -10)

    this.buildLights()
    this.buildGround()
    this.buildBuildings()
    this.buildNets()

    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.resize()

    this.onPointerMove = (e) => this.pointerMove(e)
    this.onPointerLeave = () => {
      this.mouse.set(-10, -10)
      this.hoverCb?.(null)
    }
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerleave', this.onPointerLeave)

    this.lastPickAt = 0
    this.loop = () => {
      if (this.disposed) return
      this.raf = requestAnimationFrame(this.loop)
      this.frame()
    }
    this.raf = requestAnimationFrame(this.loop)
  }

  buildLights() {
    this.ambient = new THREE.AmbientLight(0x9fc6ff, NIGHT.amb)
    this.scene.add(this.ambient)
    this.hemi = new THREE.HemisphereLight(0x9ec8ff, 0x0a1520, 0.5)
    this.scene.add(this.hemi)

    this.sun = new THREE.DirectionalLight(0xfff0d0, NIGHT.sun)
    this.sun.position.set(9, 14, 7)
    this.scene.add(this.sun)

    // 城市自发光的地面反光（夜间氛围）
    this.glow = new THREE.PointLight(0x3fa0ff, 26, 22, 2)
    this.glow.position.set(0, 1.2, 0)
    this.scene.add(this.glow)
  }

  buildGround() {
    const half = (CITY.grid * STREET_STEP) / 2 + 0.5

    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(half * 2, 0.16, half * 2),
      new THREE.MeshStandardMaterial({ color: 0x0b1621, roughness: 0.92, metalness: 0.1 })
    )
    ground.position.y = -0.08
    this.ground = ground
    this.scene.add(ground)

    // 街道网格线（发光），用 LineSegments 一次画完
    const pts = []
    for (let i = 0; i <= CITY.grid; i += 1) {
      const t = -((CITY.grid - 1) * STREET_STEP) / 2 - STREET_STEP / 2 + i * STREET_STEP
      pts.push(t, 0.012, -half + 0.4, t, 0.012, half - 0.4)
      pts.push(-half + 0.4, 0.012, t, half - 0.4, 0.012, t)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    this.streetMat = new THREE.LineBasicMaterial({
      color: 0x2b5f8a,
      transparent: true,
      opacity: 0.5
    })
    this.streets = new THREE.LineSegments(geo, this.streetMat)
    this.scene.add(this.streets)
  }

  buildBuildings() {
    const rnd = seededRandom(CITY.seed)
    const centers = blockCenters()
    const cells = []

    // 每个街区切成 2×2 栋楼，8×8 街区 = 256 栋
    for (const c of centers) {
      const isCore = Math.abs(c.x) < 1.2 && Math.abs(c.z) < 1.2
      for (let a = 0; a < 2; a += 1) {
        for (let b = 0; b < 2; b += 1) {
          const off = CITY.block / 4
          const x = c.x + (a - 0.5) * off * 2
          const z = c.z + (b - 0.5) * off * 2
          // 越靠中心越高
          const dist = Math.hypot(c.x, c.z)
          const coreBoost = Math.max(0, 1 - dist / 3.2)
          const h = 0.28 + rnd() * 0.5 + coreBoost * coreBoost * 2.6
          const w = CITY.block * (0.34 + rnd() * 0.14)
          const d = CITY.block * (0.34 + rnd() * 0.14)
          cells.push({ x, z, h, w, d, lit: 0.22 + rnd() * 0.34 + coreBoost * 0.2, seed: rnd() })
        }
      }
    }

    const geo = new THREE.BoxGeometry(1, 1, 1)
    // 把 uv.y 映射到建筑高度方向，便于在着色器里区分屋顶
    const baseColors = [0x1a3448, 0x1d3d55, 0x16293a, 0x22415c]
    const groups = baseColors.map((col, i) => {
      const shader = buildBuildingShader()
      const mat = new THREE.ShaderMaterial({
        ...shader,
        uniforms: {
          uBase: { value: new THREE.Color(col) },
          uWindow: { value: new THREE.Color(i % 2 === 0 ? 0xffd98a : 0x9fe0ff) },
          uLit: { value: 0.4 },
          uNight: { value: 1 },
          uTime: { value: 0 }
        }
      })
      this.buildingMats.push(mat)
      return { mat, list: [] }
    })

    cells.forEach((cell, i) => {
      const g = groups[i % groups.length]
      g.list.push(cell)
    })

    this.buildingMeshes = []
    groups.forEach((g) => {
      if (!g.list.length) return
      const mesh = new THREE.InstancedMesh(geo, g.mat, g.list.length)
      const m = new THREE.Matrix4()
      g.list.forEach((cell, idx) => {
        m.makeScale(cell.w, cell.h, cell.d)
        m.setPosition(cell.x, cell.h / 2, cell.z)
        mesh.setMatrixAt(idx, m)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
      this.scene.add(mesh)
      this.buildingMeshes.push(mesh)
    })

    this.cells = cells
    // 每栋楼亮灯比例不同：这里统一取一个中间值，靠 seed 在着色器里再分散
    this.buildingMats.forEach((mat) => {
      mat.uniforms.uLit.value = 0.46
    })
  }

  /** 造一条发光流线：折线 + 沿折线跑的粒子。 */
  buildFlow(points, color, { count = 40, speed = 0.22, width = 1, radius = 0.014, y = 0.06, dash = false } = {}) {
    const group = new THREE.Group()

    const vecs = points.map((p) => new THREE.Vector3(p[0], p[1] ?? y, p[2]))
    const curve = new THREE.CatmullRomCurve3(vecs, false)

    if (dash) {
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120))
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.1,
        gapSize: 0.07,
        transparent: true,
        opacity: 0.55
      })
      const line = new THREE.Line(geo, mat)
      line.computeLineDistances()
      group.add(line)
      this.flowLines.push({ mat, baseOpacity: 0.55 })
    } else {
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 90, radius * width, 5, false),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42 })
      )
      group.add(tube)
      this.flowLines.push({ mat: tube.material, baseOpacity: 0.42 })
    }

    // 粒子
    if (count > 0) {
      const pGeo = new THREE.BufferGeometry()
      const arr = new Float32Array(count * 3)
      pGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      const pMat = new THREE.PointsMaterial({
        color,
        size: 0.055 * width,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        depthWrite: false
      })
      const pts = new THREE.Points(pGeo, pMat)
      pts.frustumCulled = false
      group.add(pts)
      this.particles.push({ curve, geo: pGeo, count, speed, offset: Math.random(), arr })
    }

    return group
  }

  /** 一个设施标记（发光环 + 圆柱），同时登记到拾取表。 */
  buildMarker({ x, z, y = 0.05, color, net, name, kind, radius = 0.1, height = 0.5 }) {
    const group = new THREE.Group()
    group.position.set(x, y, z)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 0.72, radius, 28),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    )
    ring.rotation.x = -Math.PI / 2
    group.add(ring)

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.16, radius * 0.16, height, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
    )
    beam.position.y = height / 2
    group.add(beam)

    const pip = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.24, 12, 10),
      new THREE.MeshBasicMaterial({ color })
    )
    pip.position.y = height
    group.add(pip)

    // 不可见包围盒，用于射线拾取
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.5, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false })
    )
    hit.position.y = height * 0.5
    group.add(hit)

    this.hits.push({ m: hit, net, name, kind, x, z })
    return group
  }

  buildNets() {
    const step = STREET_STEP
    const edge = ((CITY.grid - 1) * step) / 2 + step / 2

    for (const net of NETS) {
      const layer = new THREE.Group()
      layer.visible = false
      this.scene.add(layer)
      this.layers[net.id] = { group: layer, net, alpha: 0 }

      const c = net.hex

      if (net.id === 'water') {
        // 地下干管：沿两条主干道 + 一条环网，画在地下
        const y = -0.55
        layer.add(this.buildFlow([[-edge, y, 0.2], [-1.2, y, 0.2], [1.2, y, 0.2], [edge, y, 0.2]], c, { count: 46, speed: 0.18, radius: 0.03, width: 1.4 }))
        layer.add(this.buildFlow([[0.2, y, -edge], [0.2, y, -1.2], [0.2, y, 1.2], [0.2, y, edge]], c, { count: 46, speed: 0.16, radius: 0.03, width: 1.4 }))
        // 环网
        const ringPts = []
        for (let i = 0; i <= 24; i += 1) {
          const a = (i / 24) * Math.PI * 2
          ringPts.push([Math.cos(a) * 2.1, y, Math.sin(a) * 2.1])
        }
        layer.add(this.buildFlow(ringPts, c, { count: 30, speed: 0.1, radius: 0.022, width: 1.2 }))
      }

      if (net.id === 'power') {
        // 高压走廊：从变电站放射出去的电缆
        const y = 0.62
        const arms = [
          [[2.6, 0.1, 0.6], [2.6, y, 0.6], [3.4, y, -1.6], [3.4, y, -edge]],
          [[2.6, 0.1, 0.6], [2.6, y, 0.6], [1.2, y, 2.2], [1.2, y, edge]],
          [[2.6, 0.1, 0.6], [2.6, y, 0.6], [-0.6, y, 1.0], [-edge, y, 1.0]],
          [[2.6, 0.1, 0.6], [2.6, y, 0.6], [0.8, y, -1.4], [0.8, y, -edge]]
        ]
        for (const arm of arms) {
          layer.add(this.buildFlow(arm, c, { count: 26, speed: 0.3, radius: 0.012, width: 1 }))
        }
      }

      if (net.id === 'compute') {
        // 光链路：数据中心 → 边缘节点 → 城市另一端（代表西部枢纽）
        layer.add(this.buildFlow([[2.8, 0.3, -2.2], [1.6, 0.9, -2.0], [0.8, 0.7, -2.6]], c, { count: 18, speed: 0.4, radius: 0.012, width: 1 }))
        layer.add(this.buildFlow([[2.8, 0.3, -2.2], [2.2, 1.4, -1.2], [1.0, 1.9, 0.4], [-1.4, 2.2, 1.6], [-edge, 2.4, 2.4]], c, { count: 34, speed: 0.26, radius: 0.01, width: 1, dash: true }))
      }

      if (net.id === 'comms') {
        // 宏站之间的毫米波回传
        const y = 1.5
        layer.add(this.buildFlow([[-1.6, y, -1.8], [-0.6, y + 0.2, -2.0], [0.4, y, -2.2]], c, { count: 20, speed: 0.5, radius: 0.008, width: 1 }))
        layer.add(this.buildFlow([[-1.6, y, -1.8], [-2.2, y + 0.4, -2.4], [-2.8, y + 0.2, -2.8]], c, { count: 16, speed: 0.45, radius: 0.008, width: 1 }))
        // 卫星链路：地面站向上
        layer.add(this.buildFlow([[-2.8, 0.4, -2.8], [-2.8, 3.2, -2.8], [-2.8, 6.0, -2.8]], c, { count: 14, speed: 0.7, radius: 0.007, width: 1, dash: true }))
      }

      if (net.id === 'underground') {
        // 管廊：地下的多舱通道
        const y = -0.75
        layer.add(this.buildFlow([[-edge, y, 1.4], [-0.6, y, 1.4], [0.6, y, 1.4], [edge, y, 1.4]], c, { count: 40, speed: 0.2, radius: 0.05, width: 1.6 }))
        layer.add(this.buildFlow([[-1.4, y, 1.4], [-1.4, y, 0.0], [-1.4, y, -1.4]], c, { count: 20, speed: 0.18, radius: 0.04, width: 1.3 }))
        layer.add(this.buildFlow([[1.4, y, 1.4], [1.4, y, 0.0], [1.4, y, -1.4]], c, { count: 20, speed: 0.18, radius: 0.04, width: 1.3 }))
      }

      if (net.id === 'logistics') {
        // 无人车路线：沿街道跑
        const y = 0.045
        const r = 2.1
        layer.add(this.buildFlow([[-edge, y, -r], [edge, y, -r]], c, { count: 26, speed: 0.22, radius: 0.011, width: 1.1 }))
        layer.add(this.buildFlow([[r, y, -edge], [r, y, edge]], c, { count: 26, speed: 0.2, radius: 0.011, width: 1.1 }))
        layer.add(this.buildFlow([[-r, y, edge], [-r, y, -edge]], c, { count: 26, speed: 0.2, radius: 0.011, width: 1.1 }))
        // 无人机航线
        layer.add(this.buildFlow([[-1.2, 1.4, -1.8], [-0.6, 2.0, -0.6], [0.6, 2.2, 0.6], [1.2, 1.8, 1.8]], c, { count: 18, speed: 0.34, radius: 0.008, width: 1, dash: true }))
      }

      // 设施标记 + 标签
      for (const f of net.facilities) {
        const y = net.underground ? -0.5 : 0.05
        layer.add(this.buildMarker({
          x: f.x,
          z: f.z,
          y,
          color: c,
          net: net.id,
          name: f.name,
          kind: f.kind,
          radius: net.underground ? 0.13 : 0.1,
          height: net.underground ? 0.34 : 0.46
        }))
      }
    }
  }

  /** 镜头飞到某个网（或回到总览）。 */
  focus(id) {
    this.focusId = id
    for (const net of NETS) {
      const layer = this.layers[net.id]
      if (!layer) continue
      const isFocus = id === 'overview' || id === net.id
      layer.group.visible = isFocus
      layer.target = isFocus ? 1 : 0
    }

    if (id === 'overview') {
      this.camGoal.set(9.5, 8.2, 11.5)
      this.targetGoal.set(0, 0.4, 0)
    } else {
      const net = netById(id)
      const [cx, cy, cz] = net.cam.pos
      const [tx, ty, tz] = net.cam.target
      this.camGoal.set(cx, cy, cz)
      this.targetGoal.set(tx, ty, tz)
      // 地下网自动开透视
      if (net.underground) this.setXray(true)
      else this.setXray(false)
    }
    this.flying = true
    this.flyK = 0
    this.onFocus?.(id)
  }

  setXray(v) {
    this.xray = v
    const op = v ? 0.24 : 1
    if (this.ground) {
      this.ground.material.transparent = v
      this.ground.material.opacity = v ? 0.16 : 1
      this.ground.material.needsUpdate = true
    }
    this.buildingMats.forEach((mat) => {
      mat.uniforms.uNight.value = this.night ? 1 : 0
      mat.opacity = op
      mat.transparent = v
      mat.uniforms.uDim = { value: v ? 0.35 : 1 }
    })
    this.onXray?.(v)
  }

  setNight(v) {
    this.night = v
    this.nightTarget = v ? 1 : 0
  }

  setSpeed(v) {
    this.speed = v
  }

  setPaused(v) {
    this.paused = v
  }

  setLabels(v) {
    this.showLabels = v
    this.onLabels?.(v)
  }

  /** 播放某张网的事故剧本。 */
  triggerAccident(netId) {
    this.accident = { net: netId, t: 0, netRef: netById(netId) }
    this.accidentPulse = this.buildPulse(netId)
    this.onAccident?.(netId)
  }
  stopAccident() {
    this.accident = null
    if (this.accidentPulse) {
      this.scene.remove(this.accidentPulse)
      this.accidentPulse.traverse((o) => {
        o.geometry?.dispose()
        o.material?.dispose()
      })
      this.accidentPulse = null
    }
  }

  /** 事故告警脉冲：在网的核心设施位置扩散红环。 */
  buildPulse(netId) {
    const net = netById(netId)
    const f = net.facilities[0]
    const group = new THREE.Group()
    const y = net.underground ? -0.42 : 0.08
    for (let i = 0; i < 3; i += 1) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.2, 32),
        new THREE.MeshBasicMaterial({
          color: 0xff5a4d,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide
        })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(f.x, y, f.z)
      ring.userData.phase = i / 3
      group.add(ring)
    }
    this.scene.add(group)
    return group
  }

  pointerMove(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    if (event.clientX !== undefined) {
      this.hoverClient = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
  }

  pick() {
    if (this.mouse.x < -5) return null
    this.ray.setFromCamera(this.mouse, this.camera)
    const live = this.hits.filter((h) => {
      const layer = this.layers[h.net]
      return layer && layer.group.visible
    })
    const hits = this.ray.intersectObjects(live.map((h) => h.m), false)
    if (!hits.length) return null
    return live.find((h) => h.m === hits[0].object) || null
  }

  frame() {
    if (this.disposed) return
    try {
      this.step()
    } catch (err) {
      if (!this.frameError) {
        this.frameError = err
        console.error('[CityTwin] frame error', err)
      }
    }
  }

  step() {
    const dt = Math.min(0.05, this.clock.getDelta())
    if (!this.paused) this.elapsed += dt

    // 昼夜过渡
    if (this.nightTarget !== undefined) {
      const cur = this.bloom.strength
      const goal = this.nightTarget ? NIGHT.bloom : DAY.bloom
      const k = 0.06
      this.bloom.strength += (goal - cur) * k
      this.bloom.threshold += ((this.nightTarget ? NIGHT.thr : DAY.thr) - this.bloom.threshold) * k
      this.ambient.intensity += ((this.nightTarget ? NIGHT.amb : DAY.amb) - this.ambient.intensity) * k
      this.sun.intensity += ((this.nightTarget ? NIGHT.sun : DAY.sun) - this.sun.intensity) * k
      this.glow.intensity += ((this.nightTarget ? 26 : 0) - this.glow.intensity) * k
      this.scene.background.lerp(
        new THREE.Color(this.nightTarget ? NIGHT.bg : DAY.bg),
        k
      )
      this.scene.fog.color.lerp(
        new THREE.Color(this.nightTarget ? NIGHT.fog : DAY.fog),
        k
      )
      this.buildingMats.forEach((mat) => {
        mat.uniforms.uNight.value += ((this.nightTarget ? 1 : 0) - mat.uniforms.uNight.value) * k
        mat.uniforms.uTime.value = this.elapsed
      })
      this.streetMat.opacity += ((this.nightTarget ? 0.5 : 0.22) - this.streetMat.opacity) * k
    }

    // 图层淡入淡出
    for (const net of NETS) {
      const layer = this.layers[net.id]
      if (!layer) continue
      const goal = layer.target ?? (layer.group.visible ? 1 : 0)
      layer.alpha += (goal - layer.alpha) * 0.12
      if (layer.alpha < 0.02 && goal === 0) layer.group.visible = false
      if (goal > 0) layer.group.visible = true
      layer.group.traverse((o) => {
        if (o.material && o.material.opacity !== undefined && o.userData.baseOpacity === undefined) {
          if (!o.userData.isFlow) {
            o.userData.baseOpacity = o.material.opacity
            o.userData.isFlow = true
          }
        }
        if (o.material && o.material.opacity !== undefined) {
          const base = o.userData.baseOpacity ?? 0.8
          if (o.material.type === 'PointsMaterial' || o.material.type === 'MeshBasicMaterial' || o.material.type === 'LineDashedMaterial' || o.material.type === 'LineBasicMaterial') {
            o.material.opacity = base * layer.alpha
          }
        }
      })
    }

    // 粒子沿曲线流动
    for (const p of this.particles) {
      const arr = p.arr
      for (let i = 0; i < p.count; i += 1) {
        const u = (this.elapsed * p.speed * this.speed + p.offset + i / p.count) % 1
        const v = p.curve.getPointAt(u)
        arr[i * 3] = v.x
        arr[i * 3 + 1] = v.y
        arr[i * 3 + 2] = v.z
      }
      p.geo.attributes.position.needsUpdate = true
    }

    // 事故脉冲
    if (this.accidentPulse) {
      if (this.accident && !this.paused) {
        this.accident.t = (this.accident.t ?? 0) + dt * this.speed
      }
      this.accidentPulse.children.forEach((ring) => {
        const phase = (this.elapsed * 0.55 + ring.userData.phase) % 1
        ring.scale.setScalar(1 + phase * 6)
        ring.material.opacity = (1 - phase) * 0.75
      })
    }

    // 镜头飞行：缓入缓出
    if (this.flying) {
      this.flyK = Math.min(1, this.flyK + dt * 1.1)
      const e = this.flyK < 0.5 ? 2 * this.flyK * this.flyK : 1 - ((-2 * this.flyK + 2) ** 2) / 2
      this.camera.position.lerp(this.camGoal, e * 0.22)
      this.controls.target.lerp(this.targetGoal, e * 0.22)
      if (this.flyK >= 1) this.flying = false
    }

    this.controls.update()

    // 拾取（限流）
    if (this.elapsed - this.lastPickAt > 0.08) {
      this.lastPickAt = this.elapsed
      const hit = this.pick()
      this.hoverCb?.(hit ? { ...hit, client: this.hoverClient } : null)
    }

    this.onFrame?.({ elapsed: this.elapsed, accident: this.accident })
    this.composer.render()
  }

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w, h)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave)
    this.controls.dispose()
    this.scene.traverse((o) => {
      o.geometry?.dispose()
      if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose())
      else o.material?.dispose()
    })
    this.composer.dispose?.()
    this.renderer.dispose()
  }
}
