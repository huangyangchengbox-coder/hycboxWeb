import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  bodies,
  orbitRadius,
  earthAngle,
  sunLongitude,
  OBLIQUITY_DEG,
  MOON_INCL_DEG,
  EARTH_R,
  MOON_R,
  MOON_DIST,
  SUN_R,
  SOLAR_TERMS
} from './astro.js'

const OBL = OBLIQUITY_DEG * Math.PI / 180
const INC = MOON_INCL_DEG * Math.PI / 180

const earthVertex = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const earthFragment = `
  uniform sampler2D uMap;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 s = normalize(-vWorld);
    float lit = smoothstep(-0.04, 0.16, dot(n, s));
    vec3 albedo = texture2D(uMap, vUv).rgb;
    gl_FragColor = vec4(albedo * (0.045 + 0.955 * lit), 1.0);
  }
`

const moonFragment = `
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 s = normalize(-vWorld);
    float lit = smoothstep(-0.03, 0.14, dot(n, s));
    float n1 = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(vUv * 7.0, vec2(39.3, 11.2))) * 24634.6345);
    float crater = smoothstep(0.86, 0.98, n1);
    vec3 albedo = vec3(0.58, 0.58, 0.61) - crater * 0.22 + (n2 - 0.5) * 0.06;
    gl_FragColor = vec4(albedo * (0.03 + 0.97 * lit), 1.0);
  }
`

function paintEarth() {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 320
  const g = canvas.getContext('2d')
  g.fillStyle = '#1a4e86'
  g.fillRect(0, 0, 640, 320)
  g.fillStyle = '#2f8a4e'
  const blobs = [
    [168, 168, 38, 62],
    [214, 118, 78, 42],
    [250, 78, 34, 24],
    [118, 96, 30, 38],
    [92, 150, 26, 34],
    [448, 196, 34, 20],
    [300, 86, 28, 16],
    [500, 150, 46, 28],
    [360, 70, 22, 16]
  ]
  for (const [x, y, rx, ry] of blobs) {
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#e7f2ff'
  g.fillRect(0, 0, 640, 14)
  g.fillRect(0, 306, 640, 14)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  return tex
}

function latRing(latDeg, radius, color) {
  const phi = latDeg * Math.PI / 180
  const y = Math.sin(phi) * radius
  const r = Math.cos(phi) * radius
  const geo = new THREE.TorusGeometry(Math.max(0.02, r), 0.008, 6, 80)
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }))
  mesh.position.y = y
  mesh.rotation.x = Math.PI / 2
  return mesh
}

function ellipseLine() {
  const pts = []
  for (let i = 0; i <= 160; i += 1) {
    const angle = (i / 160) * Math.PI * 2
    const r = orbitRadius(angle)
    pts.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r))
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts)
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x6f8494, transparent: true, opacity: 0.55 }))
}

export class SkyScene {
  constructor(canvas) {
    this.canvas = canvas
    this.mode = 'moon'
    this.day = 0
    this.align = null
    this.lat = 40
    this.followUntil = 0
    this._desired = new THREE.Vector3(14, 8, 14)
    this._look = new THREE.Vector3()
    this._sunLocal = new THREE.Vector3()
    this._inv = new THREE.Matrix4()
    this.init()
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color('#02040c')
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.02, 80)
    this.camera.position.copy(this._desired)
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.addEventListener('start', () => {
      this.followUntil = performance.now() + 5000
    })

    const stars = new Float32Array(900 * 3)
    for (let i = 0; i < stars.length; i += 3) {
      const r = 28 + Math.random() * 16
      const t = Math.random() * Math.PI * 2
      const p = Math.acos(2 * Math.random() - 1)
      stars[i] = r * Math.sin(p) * Math.cos(t)
      stars[i + 1] = r * Math.cos(p)
      stars[i + 2] = r * Math.sin(p) * Math.sin(t)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3))
    this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd5e4ff, size: 0.045, sizeAttenuation: true })))

    this.sun = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_R, 36, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd27a })
    )
    this.scene.add(this.sun)
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(SUN_R * 1.35, 28, 18),
      new THREE.MeshBasicMaterial({ color: 0xffb14a, transparent: true, opacity: 0.18, depthWrite: false })
    )
    this.sun.add(glow)
    this.scene.add(ellipseLine())

    this.earthTilt = new THREE.Group()
    this.earthTilt.rotation.x = OBL
    this.scene.add(this.earthTilt)
    const earthMat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: paintEarth() } },
      vertexShader: earthVertex,
      fragmentShader: earthFragment
    })
    this.earthMesh = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R, 48, 32), earthMat)
    this.earthTilt.add(this.earthMesh)
    this.tropics = new THREE.Group()
    this.tropics.add(latRing(23.44, EARTH_R + 0.012, 0xffb45a))
    this.tropics.add(latRing(-23.44, EARTH_R + 0.012, 0xffb45a))
    this.tropics.add(latRing(66.56, EARTH_R + 0.012, 0x9fd0ff))
    this.tropics.add(latRing(-66.56, EARTH_R + 0.012, 0x9fd0ff))
    this.tropics.add(latRing(0, EARTH_R + 0.01, 0xffffff))
    this.earthTilt.add(this.tropics)

    this.gnomon = new THREE.Group()
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe08a })
    )
    pole.position.y = 0.17
    this.gnomon.add(pole)
    this.shadow = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.012, 1),
      new THREE.MeshBasicMaterial({ color: 0x101820 })
    )
    this.gnomon.add(this.shadow)
    this.subsolar = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffe36a })
    )
    this.earthTilt.add(this.gnomon)
    this.earthTilt.add(this.subsolar)

    this.moon = new THREE.Mesh(
      new THREE.SphereGeometry(MOON_R, 32, 24),
      new THREE.ShaderMaterial({ vertexShader: earthVertex, fragmentShader: moonFragment })
    )
    this.scene.add(this.moon)
    this.moonOrbit = new THREE.Group()
    const moonPts = []
    for (let i = 0; i <= 80; i += 1) {
      const a = (i / 80) * Math.PI * 2
      const z0 = Math.sin(a) * MOON_DIST
      moonPts.push(new THREE.Vector3(Math.cos(a) * MOON_DIST, z0 * Math.sin(INC), z0 * Math.cos(INC)))
    }
    this.moonOrbit.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(moonPts),
      new THREE.LineBasicMaterial({ color: 0xb9c6d4, transparent: true, opacity: 0.45 })
    ))
    this.scene.add(this.moonOrbit)

    this.termGroup = new THREE.Group()
    this.termMeshes = SOLAR_TERMS.map((term) => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x89a })
      )
      const angle = term.lon * Math.PI / 180 + Math.PI
      const r = orbitRadius(angle)
      mesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
      mesh.userData.lon = term.lon
      this.termGroup.add(mesh)
      return mesh
    })
    this.scene.add(this.termGroup)

    const coneGeo = new THREE.CylinderGeometry(0.02, 0.42, 1, 28, 1, true)
    coneGeo.translate(0, 0.5, 0)
    this.solarCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0xffc46b, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false
    }))
    this.lunarCone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
      color: 0x8eb6ff, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false
    }))
    this.scene.add(this.solarCone)
    this.scene.add(this.lunarCone)

    this.peri = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff7a4a }))
    this.aphe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0x7eb6ff }))
    const periA = earthAngle(3)
    const apheA = earthAngle(185)
    this.peri.position.set(Math.cos(periA) * orbitRadius(periA), 0, Math.sin(periA) * orbitRadius(periA))
    this.aphe.position.set(Math.cos(apheA) * orbitRadius(apheA), 0, Math.sin(apheA) * orbitRadius(apheA))
    this.scene.add(this.peri)
    this.scene.add(this.aphe)

    this.clock = new THREE.Clock()
    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(this.canvas)
    this.resize()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  resize() {
    const w = this.canvas.clientWidth || 1
    const h = this.canvas.clientHeight || 1
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  setDay(day) {
    this.day = day
  }

  setMode(mode) {
    this.mode = mode
    this.followUntil = 0
  }

  setAlign(align) {
    this.align = align
  }

  setLatitude(lat) {
    this.lat = lat
  }

  placeCone(mesh, origin, dir, length, opacity) {
    mesh.visible = opacity > 0.02
    mesh.material.opacity = opacity
    mesh.position.copy(origin)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
    mesh.scale.set(1, length, 1)
  }

  layout() {
    const pack = bodies(this.day, this.align)
    this.earthTilt.position.set(pack.earth.x, pack.earth.y, pack.earth.z)
    this.earthMesh.rotation.y = this.day * Math.PI * 2
    this.earthTilt.updateMatrixWorld(true)
    this.moon.position.set(pack.moon.x, pack.moon.y, pack.moon.z)
    this.moonOrbit.position.copy(this.earthTilt.position)

    const toSun = new THREE.Vector3(-pack.earth.x, 0, -pack.earth.z).normalize()
    this._inv.copy(this.earthTilt.matrixWorld).invert()
    this._sunLocal.copy(toSun).transformDirection(this._inv)
    const lon = Math.atan2(this._sunLocal.x, this._sunLocal.z)
    const subLat = Math.asin(Math.max(-1, Math.min(1, this._sunLocal.y)))
    const place = (lat, extra = 0) => {
      const cl = Math.cos(lat)
      return new THREE.Vector3(cl * Math.sin(lon), Math.sin(lat), cl * Math.cos(lon)).multiplyScalar(EARTH_R + extra)
    }
    this.subsolar.position.copy(place(subLat, 0.03))
    const latRad = this.lat * Math.PI / 180
    this.gnomon.position.copy(place(latRad, 0.02))
    const outward = this.gnomon.position.clone().normalize()
    this.gnomon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward)
    const sunPole = this._sunLocal.clone().applyQuaternion(this.gnomon.quaternion.clone().invert())
    const horiz = new THREE.Vector3(sunPole.x, 0, sunPole.z)
    if (sunPole.y > 0.08 && horiz.lengthSq() > 1e-5) {
      const len = Math.min(1.25, (0.34 * horiz.length()) / sunPole.y)
      horiz.normalize()
      this.shadow.visible = true
      this.shadow.position.set(-horiz.x * len * 0.5, 0.03, -horiz.z * len * 0.5)
      this.shadow.scale.set(1, 1, len)
      this.shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-horiz.x, 0, -horiz.z))
    } else {
      this.shadow.visible = false
    }

    const away = new THREE.Vector3(pack.moon.x, pack.moon.y, pack.moon.z).normalize()
    const showCone = this.mode === 'eclipse'
    const aligned = !!this.align || pack.elong < 0.2 || Math.abs(pack.elong - Math.PI) < 0.2
    this.placeCone(this.solarCone, this.moon.position, away, 3.2, showCone ? (aligned ? 0.28 : 0.1) : 0)
    this.placeCone(this.lunarCone, this.earthTilt.position, toSun.clone().negate(), 3.4, showCone ? (this.align === 'lunar' ? 0.3 : 0.12) : 0)

    const sunLon = sunLongitude(this.day)
    for (const mesh of this.termMeshes) {
      let diff = Math.abs(sunLon - mesh.userData.lon)
      if (diff > 180) diff = 360 - diff
      const on = this.mode === 'terms' && diff < 8
      mesh.material.color.set(on ? 0xffe08a : 0x6e7c8a)
      mesh.scale.setScalar(on ? 1.8 : 1)
    }
    this.termGroup.visible = this.mode === 'terms'
    this.peri.visible = this.mode === 'season'
    this.aphe.visible = this.mode === 'season'
    this.tropics.visible = this.mode === 'season' || this.mode === 'clock'
    this.gnomon.visible = this.mode === 'season' || this.mode === 'clock'
    this.subsolar.visible = this.mode === 'season' || this.mode === 'clock'

    this.aim(pack, toSun)
  }

  aim(pack, toSun) {
    const earth = this.earthTilt.position
    const moon = this.moon.position
    const toMoon = moon.clone().sub(earth).normalize()
    if (this.mode === 'moon') {
      this._desired.copy(moon).add(toMoon.clone().multiplyScalar(-0.85)).add(new THREE.Vector3(0, 0.12, 0))
      this._look.copy(moon)
    } else if (this.mode === 'eclipse' && this.align === 'solar') {
      this._desired.copy(moon).add(toSun.clone().multiplyScalar(-0.55))
      this._look.set(0, 0, 0)
    } else if (this.mode === 'eclipse') {
      this._desired.copy(earth).add(toSun.clone().multiplyScalar(1.35)).add(new THREE.Vector3(0, 0.35, 0))
      this._look.copy(earth).add(toSun.clone().multiplyScalar(6))
    } else if (this.mode === 'clock') {
      this._desired.copy(earth).add(new THREE.Vector3(2.4, 1.3, 2.4))
      this._look.copy(earth)
    } else {
      this._desired.set(11, 13, 13)
      this._look.set(0, 0, 0)
    }
    if (performance.now() > this.followUntil) {
      this.camera.position.lerp(this._desired, 0.08)
      this.controls.target.lerp(this._look, 0.08)
    }
  }

  frame() {
    this.earthTilt.updateMatrixWorld()
    this.layout()
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.renderer.setAnimationLoop(null)
    this.resizeObs.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.scene.traverse((obj) => {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
      else obj.material?.dispose?.()
    })
  }
}
