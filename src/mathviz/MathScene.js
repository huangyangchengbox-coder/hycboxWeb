import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { eigen2 } from './linalg.js'

const fractalVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fractalFragment = `
  uniform vec2 uCenter;
  uniform float uScale;
  uniform float uIter;
  uniform float uAspect;
  uniform float uJulia;
  uniform vec2 uC;
  uniform float uPalette;
  varying vec2 vUv;

  vec3 palette(float t) {
    vec3 shift = uPalette < 0.5 ? vec3(0.00, 0.18, 0.42)
      : uPalette < 1.5 ? vec3(0.08, 0.55, 0.72)
      : vec3(0.33, 0.12, 0.52);
    return 0.55 + 0.45 * cos(6.28318 * (t + shift));
  }

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uAspect;
    vec2 c = uCenter + uv * uScale;
    vec2 z = uJulia > 0.5 ? c : vec2(0.0);
    vec2 cc = uJulia > 0.5 ? uC : c;
    float n = 0.0;
    float escaped = 0.0;
    for (int i = 0; i < 256; i++) {
      if (escaped < 0.5 && float(i) < uIter) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cc;
        n += 1.0;
        if (dot(z, z) > 4.0) escaped = 1.0;
      }
    }
    if (escaped < 0.5) gl_FragColor = vec4(0.015, 0.02, 0.04, 1.0);
    else {
      float smoothN = n + 1.0 - log2(log2(max(dot(z, z), 1.0001)));
      gl_FragColor = vec4(palette(smoothN * 0.045), 1.0);
    }
  }
`

function kochPoints(depth) {
  let pts = [[0, 1.55, 0], [-1.34, -0.78, 0], [1.34, -0.78, 0], [0, 1.55, 0]]
  for (let d = 0; d < depth; d += 1) {
    const next = []
    for (let i = 0; i < pts.length - 1; i += 1) {
      const a = pts[i]
      const b = pts[i + 1]
      const dx = (b[0] - a[0]) / 3
      const dy = (b[1] - a[1]) / 3
      const p1 = [a[0] + dx, a[1] + dy, 0]
      const p2 = [a[0] + 2 * dx, a[1] + 2 * dy, 0]
      const rad = Math.PI / 3
      const rx = dx * Math.cos(rad) - dy * Math.sin(rad)
      const ry = dx * Math.sin(rad) + dy * Math.cos(rad)
      next.push(a, p1, [p1[0] + rx, p1[1] + ry, 0], p2)
    }
    next.push(pts[pts.length - 1])
    pts = next
  }
  return pts
}

function sierpinskiLines(depth) {
  const base = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((p) => {
    const l = Math.hypot(...p)
    return p.map((v) => (v / l) * 1.7)
  })
  const lines = []
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]
  const walk = (v, d) => {
    if (d === 0) {
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) lines.push(v[i], v[j])
      }
      return
    }
    const m01 = mid(v[0], v[1])
    const m02 = mid(v[0], v[2])
    const m03 = mid(v[0], v[3])
    const m12 = mid(v[1], v[2])
    const m13 = mid(v[1], v[3])
    const m23 = mid(v[2], v[3])
    walk([v[0], m01, m02, m03], d - 1)
    walk([v[1], m01, m12, m13], d - 1)
    walk([v[2], m02, m12, m23], d - 1)
    walk([v[3], m03, m13, m23], d - 1)
  }
  walk(base, depth)
  return lines
}

export class MathScene {
  constructor(canvas, hooks = {}) {
    this.canvas = canvas
    this.hooks = hooks
    this.mode = 'fractal'
    this.fractalKind = 'mandel'
    this.center = new THREE.Vector2(-0.65, 0)
    this.scale = 2.8
    this.iter = (navigator.hardwareConcurrency || 8) <= 4 ? 128 : 220
    this.juliaOn = false
    this.juliaC = new THREE.Vector2(-0.7, 0.27)
    this.palette = 0
    this.dragging = false
    this.last = { x: 0, y: 0 }
    this.matrix = [1, 0.6, 0, 1]
    this.cubeOn = false
    this.cubeAngle = 30
    this.init()
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#070910')
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.05, 40)
    this.camera.position.set(4.2, 3.4, 5.2)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.scene.add(new THREE.AmbientLight('#f3f7ff', 0.65))
    const key = new THREE.DirectionalLight('#ffffff', 1.2)
    key.position.set(3, 6, 4)
    this.scene.add(key)

    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: fractalVertex,
        fragmentShader: fractalFragment,
        depthTest: false,
        uniforms: {
          uCenter: { value: this.center },
          uScale: { value: this.scale },
          uIter: { value: this.iter },
          uAspect: { value: 1 },
          uJulia: { value: 0 },
          uC: { value: this.juliaC },
          uPalette: { value: 0 }
        }
      })
    )
    this.quad.frustumCulled = false
    this.scene.add(this.quad)

    this.classic = new THREE.Group()
    this.scene.add(this.classic)
    this.surfaceGroup = new THREE.Group()
    this.scene.add(this.surfaceGroup)
    this.linearGroup = new THREE.Group()
    this.scene.add(this.linearGroup)
    this.buildLinear()

    this.onPointerDown = (event) => this.pointerDown(event)
    this.onPointerMove = (event) => this.pointerMove(event)
    this.onPointerUp = (event) => this.pointerUp(event)
    this.onWheel = (event) => this.wheel(event)
    this.canvas.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('pointerup', this.onPointerUp)
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false })

    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(this.canvas)
    this.resize()
    this.setMode('fractal')
    this.renderer.setAnimationLoop(() => this.frame())
  }

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.quad.material.uniforms.uAspect.value = w / h
  }

  setMode(mode) {
    this.mode = mode
    const fractal = mode === 'fractal'
    this.quad.visible = fractal && (this.fractalKind === 'mandel' || this.fractalKind === 'julia')
    this.classic.visible = fractal && !this.quad.visible
    this.surfaceGroup.visible = mode === 'surface'
    this.linearGroup.visible = mode === 'linear'
    this.controls.enabled = !this.quad.visible
    if (mode === 'surface') this.camera.position.set(8.2, 6.4, 8.6)
    if (mode === 'linear') this.camera.position.set(this.cubeOn ? 2.4 : 2.6, this.cubeOn ? 2.2 : 3.1, 3.6)
    if (this.classic.visible) {
      const koch = this.fractalKind === 'koch'
      this.camera.position.set(koch ? 0 : 1.6, koch ? 0.55 : 1.5, koch ? 3.85 : 3.3)
      this.controls.target.set(0, koch ? 0.15 : 0, 0)
    } else {
      this.controls.target.set(0, mode === 'surface' ? 0.4 : 0, 0)
    }
    this.controls.update()
  }

  setFractalKind(kind) {
    this.fractalKind = kind
    if (kind === 'julia') this.juliaOn = true
    if (kind === 'mandel') this.juliaOn = false
    if (kind === 'koch' || kind === 'sierpinski') this.buildClassic(kind)
    this.syncFractal()
    this.setMode(this.mode)
  }

  setPalette(index) {
    this.palette = index
    this.syncFractal()
  }

  setIter(iter) {
    this.iter = iter
    this.syncFractal()
  }

  setJuliaC(re, im) {
    this.juliaC.set(re, im)
    this.syncFractal()
  }

  syncFractal() {
    const uniforms = this.quad.material.uniforms
    uniforms.uScale.value = this.scale
    uniforms.uIter.value = this.iter
    uniforms.uJulia.value = this.juliaOn ? 1 : 0
    uniforms.uPalette.value = this.palette
    const limit = this.scale < 2.8e-5
    this.hooks.onFractal?.({
      scale: this.scale,
      iter: this.iter,
      re: this.juliaC.x,
      im: this.juliaC.y,
      limit
    })
  }

  pointerDown(event) {
    if (this.mode !== 'fractal' || !this.quad.visible) return
    this.dragging = true
    this.last.x = event.clientX
    this.last.y = event.clientY
    this.down = { x: event.clientX, y: event.clientY }
  }

  pointerMove(event) {
    if (!this.dragging) return
    const rect = this.canvas.getBoundingClientRect()
    const dx = (event.clientX - this.last.x) / rect.width
    const dy = (event.clientY - this.last.y) / rect.height
    const aspect = rect.width / rect.height
    this.center.x -= dx * this.scale * aspect
    this.center.y += dy * this.scale
    this.last.x = event.clientX
    this.last.y = event.clientY
  }

  pointerUp(event) {
    if (!this.dragging) return
    this.dragging = false
    const moved = Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y)
    if (moved < 5 && !this.juliaOn) {
      const c = this.eventToComplex(event)
      this.juliaC.copy(c)
      this.hooks.onPick?.({ re: c.x, im: c.y })
      this.syncFractal()
    }
  }

  eventToComplex(event) {
    const rect = this.canvas.getBoundingClientRect()
    const u = (event.clientX - rect.left) / rect.width - 0.5
    const v = 0.5 - (event.clientY - rect.top) / rect.height
    const aspect = rect.width / rect.height
    return new THREE.Vector2(this.center.x + u * this.scale * aspect, this.center.y + v * this.scale)
  }

  wheel(event) {
    if (this.mode !== 'fractal' || !this.quad.visible) return
    event.preventDefault()
    const before = this.eventToComplex(event)
    const factor = event.deltaY > 0 ? 1.12 : 0.88
    this.scale = Math.max(2.2e-5, Math.min(8, this.scale * factor))
    const after = this.eventToComplex(event)
    this.center.x += before.x - after.x
    this.center.y += before.y - after.y
    this.syncFractal()
  }

  buildClassic(kind) {
    this.classic.rotation.set(0, 0, 0)
    while (this.classic.children.length) {
      const child = this.classic.children.pop()
      child.geometry?.dispose()
      this.classic.remove(child)
    }
    const pts = kind === 'koch' ? kochPoints(4) : sierpinskiLines(4).flat()
    const positions = kind === 'koch'
      ? new Float32Array(pts.length * 3)
      : new Float32Array(sierpinskiLines(4).length * 3)
    if (kind === 'koch') {
      pts.forEach((p, i) => {
        positions[i * 3] = p[0]
        positions[i * 3 + 1] = p[1]
        positions[i * 3 + 2] = p[2]
      })
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      this.classic.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xd7f4ff })))
    } else {
      const lines = sierpinskiLines(4)
      const raw = []
      for (const p of lines) raw.push(p[0], p[1], p[2])
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(raw, 3))
      this.classic.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffe08a })))
    }
  }

  setSurface(fn, sliceX) {
    this.heightFn = fn
    this.sliceX = sliceX
    const n = 72
    const range = 4
    const positions = []
    const colors = []
    const heights = []
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) {
        const x = (i / n - 0.5) * range * 2
        const z = (j / n - 0.5) * range * 2
        let y = fn(x, z)
        if (!Number.isFinite(y)) y = 0
        y = Math.max(-3.2, Math.min(3.2, y))
        heights.push(y)
        positions.push(x, y, z)
      }
    }
    let min = Infinity
    let max = -Infinity
    for (const y of heights) {
      min = Math.min(min, y)
      max = Math.max(max, y)
    }
    const span = max - min || 1
    for (const y of heights) {
      const t = (y - min) / span
      colors.push(0.15 + t * 0.2, 0.35 + t * 0.45, 0.85 - t * 0.2)
    }
    const index = []
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const a = j * (n + 1) + i
        index.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1)
      }
    }
    this.disposeGroup(this.surfaceGroup)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(index)
    geo.computeVertexNormals()
    this.surfaceGroup.add(new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.02, side: THREE.DoubleSide })
    ))
    const floor = positions.slice()
    for (let i = 1; i < floor.length; i += 3) floor[i] = -3.25
    const floorGeo = new THREE.BufferGeometry()
    floorGeo.setAttribute('position', new THREE.Float32BufferAttribute(floor, 3))
    floorGeo.setIndex(index)
    this.surfaceGroup.add(new THREE.Mesh(
      floorGeo,
      new THREE.MeshBasicMaterial({ color: 0x1a2433, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
    ))
    const contour = []
    const level = (min + max) / 2
    const hAt = (i, j) => heights[j * (n + 1) + i]
    const xz = (i, j) => [(i / n - 0.5) * range * 2, (j / n - 0.5) * range * 2]
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        const h00 = hAt(i, j)
        const h10 = hAt(i + 1, j)
        const h01 = hAt(i, j + 1)
        const edges = []
        const mix = (p, q, hp, hq) => {
          const t = (level - hp) / (hq - hp || 1e-6)
          return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]
        }
        if ((h00 - level) * (h10 - level) < 0) edges.push(mix(xz(i, j), xz(i + 1, j), h00, h10))
        if ((h00 - level) * (h01 - level) < 0) edges.push(mix(xz(i, j), xz(i, j + 1), h00, h01))
        if (edges.length === 2) contour.push(edges[0][0], level, edges[0][1], edges[1][0], level, edges[1][1])
      }
    }
    if (contour.length) {
      const lineGeo = new THREE.BufferGeometry()
      lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(contour, 3))
      this.surfaceGroup.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0xffe08a })))
    }
    const slice = []
    for (let j = 0; j <= n; j += 1) {
      const z = (j / n - 0.5) * range * 2
      let y = fn(sliceX, z)
      if (!Number.isFinite(y)) y = 0
      slice.push(sliceX, Math.max(-3.2, Math.min(3.2, y)), z)
    }
    const sliceGeo = new THREE.BufferGeometry()
    sliceGeo.setAttribute('position', new THREE.Float32BufferAttribute(slice, 3))
    this.surfaceGroup.add(new THREE.Line(sliceGeo, new THREE.LineBasicMaterial({ color: 0xff7ad9 })))
  }

  disposeGroup(group) {
    while (group.children.length) {
      const child = group.children[0]
      group.remove(child)
      child.geometry?.dispose?.()
      if (child.material && child.material !== this.lineMat) child.material.dispose?.()
    }
  }

  buildLinear() {
    this.lineMat = new THREE.LineBasicMaterial({ color: 0xd5e6f5 })
    this.grid = new THREE.LineSegments(new THREE.BufferGeometry(), this.lineMat)
    this.linearGroup.add(this.grid)
    this.square = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({ color: 0x7dffe8, transparent: true, opacity: 0.42, side: THREE.DoubleSide })
    )
    this.linearGroup.add(this.square)
    this.eigenLines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffe08a })
    )
    this.linearGroup.add(this.eigenLines)
    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x89b4ff, transparent: true, opacity: 0.45 })
    )
    this.cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(this.cube.geometry), new THREE.LineBasicMaterial({ color: 0xffffff })))
    this.linearGroup.add(this.cube)
    this.setMatrix(...this.matrix)
  }

  setMatrix(a, b, c, d) {
    this.matrix = [a, b, c, d]
    const apply = (x, y) => [a * x + b * y, c * x + d * y]
    const positions = []
    for (let i = -4; i <= 4; i += 1) {
      for (const horizontal of [true, false]) {
        const p = horizontal ? apply(-2, i * 0.5) : apply(i * 0.5, -2)
        const q = horizontal ? apply(2, i * 0.5) : apply(i * 0.5, 2)
        positions.push(p[0], 0.02, p[1], q[0], 0.02, q[1])
      }
    }
    this.grid.geometry.dispose()
    this.grid.geometry = new THREE.BufferGeometry()
    this.grid.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    const p00 = [0, 0]
    const p10 = apply(1, 0)
    const p11 = apply(1, 1)
    const p01 = apply(0, 1)
    const squarePos = new Float32Array([
      p00[0], 0.03, p00[1],
      p10[0], 0.03, p10[1],
      p11[0], 0.03, p11[1],
      p01[0], 0.03, p01[1]
    ])
    this.square.geometry.dispose()
    this.square.geometry = new THREE.BufferGeometry()
    this.square.geometry.setAttribute('position', new THREE.BufferAttribute(squarePos, 3))
    this.square.geometry.setIndex([0, 1, 2, 0, 2, 3])
    const info = eigen2(a, b, c, d)
    const eigenPos = []
    if (!info.complex) {
      for (const [lambda, vec] of [[info.l1, info.v1], [info.l2, info.v2]]) {
        if (Math.abs(lambda) < 1e-3) continue
        eigenPos.push(0, 0.08, 0, vec[0] * lambda, 0.08, vec[1] * lambda)
      }
    }
    this.eigenLines.geometry.dispose()
    this.eigenLines.geometry = new THREE.BufferGeometry()
    this.eigenLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(eigenPos, 3))
    this.cube.visible = this.cubeOn
    this.cube.rotation.y = this.cubeAngle * Math.PI / 180
  }

  setCube(on, angle) {
    this.cubeOn = on
    this.cubeAngle = angle
    if (this.cube) {
      this.cube.visible = on
      this.cube.rotation.y = angle * Math.PI / 180
    }
  }

  frame() {
    if (this.classic.visible && this.fractalKind === 'sierpinski') this.classic.rotation.y += 0.004
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObs.disconnect()
    this.canvas.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointermove', this.onPointerMove)
    window.removeEventListener('pointerup', this.onPointerUp)
    this.canvas.removeEventListener('wheel', this.onWheel)
    this.controls.dispose()
    this.renderer.dispose()
  }
}
