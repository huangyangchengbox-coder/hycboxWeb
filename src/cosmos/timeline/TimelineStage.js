import * as THREE from 'three'
import { TIMELINE_ERAS, eraSample } from './timelineData.js'
import { releaseGlowTexture, retainGlowTexture } from './cosmicTexture.js'

const COUNT_HIGH = 12000
const COUNT_LOW = 6000
const _cA = new THREE.Color()
const _cB = new THREE.Color()

function mulberry32(seed) {
  return function random() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function windowWeight(v, in0, in1, out0, out1) {
  if (v <= in0 || v >= out1) return 0
  if (v < in1) return (v - in0) / (in1 - in0)
  if (v > out0) return 1 - (v - out0) / (out1 - out0)
  return 1
}

const VERT = /* glsl */`
  attribute vec3 aWeb;
  attribute vec3 aGalaxy;
  attribute float aSeed;
  uniform float uWebMix;
  uniform float uGalaxyMix;
  uniform float uSize;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSeed;

  void main() {
    vec3 p = position;
    p = mix(p, aWeb, uWebMix);
    p = mix(p, aGalaxy, uGalaxyMix);
    float breathe = 1.0 + 0.018 * sin(uTime * 0.35 + aSeed * 6.2831);
    p *= breathe;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (260.0 / max(0.001, -mv.z));
    gl_Position = projectionMatrix * mv;
    vSeed = aSeed;
  }
`

const FRAG = /* glsl */`
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform float uOpacity;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d);
    vec3 color = mix(uHot, uCool, smoothstep(0.25, 0.95, vSeed));
    gl_FragColor = vec4(color, a * uOpacity);
  }
`

function buildPositions(count, rand) {
  const plasma = new Float32Array(count * 3)
  const web = new Float32Array(count * 3)
  const galaxy = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    const r = 6 + rand() ** 0.6 * 11
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    plasma[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    plasma[i * 3 + 1] = r * Math.cos(phi) * 0.72
    plasma[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    seeds[i] = rand()
  }
  const nodes = []
  for (let i = 0; i < 28; i += 1) {
    const r = 5 + rand() * 14
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    nodes.push([
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 0.55,
      r * Math.sin(phi) * Math.sin(theta)
    ])
  }
  for (let i = 0; i < count; i += 1) {
    if (i % 9 === 0) {
      const n = nodes[(rand() * nodes.length) | 0]
      web[i * 3] = n[0] + (rand() - 0.5) * 1.2
      web[i * 3 + 1] = n[1] + (rand() - 0.5) * 1.2
      web[i * 3 + 2] = n[2] + (rand() - 0.5) * 1.2
    } else {
      const a = nodes[(rand() * nodes.length) | 0]
      const b = nodes[(rand() * nodes.length) | 0]
      const t = rand()
      const bow = Math.sin(t * Math.PI) * 1.6 * (rand() - 0.5)
      web[i * 3] = a[0] + (b[0] - a[0]) * t + bow
      web[i * 3 + 1] = a[1] + (b[1] - a[1]) * t + bow * 0.6
      web[i * 3 + 2] = a[2] + (b[2] - a[2]) * t + bow
    }
    galaxy[i * 3] = web[i * 3] * 1.18
    galaxy[i * 3 + 1] = web[i * 3 + 1] * 0.42
    galaxy[i * 3 + 2] = web[i * 3 + 2] * 1.18
  }
  return { plasma, web, galaxy, seeds }
}

function shellPositions(count, rand) {
  const arr = new Float32Array(count * 3)
  for (let i = 0; i < count; i += 1) {
    const theta = rand() * Math.PI * 2
    const phi = Math.acos(2 * rand() - 1)
    arr[i * 3] = Math.sin(phi) * Math.cos(theta)
    arr[i * 3 + 1] = Math.cos(phi)
    arr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta)
  }
  return arr
}

function hereLabel() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 256, 64)
  ctx.fillStyle = 'rgba(12, 10, 6, 0.55)'
  ctx.fillRect(28, 10, 200, 44)
  ctx.fillStyle = '#ffe7a3'
  ctx.font = '28px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('你在这里', 128, 32)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function glowPoints(positions, size, color, map) {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color,
    map,
    size,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    sizeAttenuation: true
  })
  return new THREE.Points(geo, mat)
}

export class TimelineStage {
  constructor(group, options = {}) {
    this.group = group
    this.quality = options.quality === 'low' ? 'low' : 'high'
    this.progress = 0
    this.cameraPlan = { dist: 16, height: 4 }
    this.autoSpin = 0.05
    this.starOpacity = 0
    this.clearColor = new THREE.Color('#000000')
    this.glowMap = retainGlowTexture()
    this.#field()
    this.#props()
    this.setProgress(0)
    this.setQuality(this.quality)
  }

  #field() {
    const count = COUNT_HIGH
    const data = buildPositions(count, mulberry32(202611))
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(data.plasma, 3))
    geo.setAttribute('aWeb', new THREE.BufferAttribute(data.web, 3))
    geo.setAttribute('aGalaxy', new THREE.BufferAttribute(data.galaxy, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(data.seeds, 1))
    this.uniforms = {
      uWebMix: { value: 0 },
      uGalaxyMix: { value: 0 },
      uSize: { value: 1.45 },
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
      uHot: { value: new THREE.Color('#fff4e0') },
      uCool: { value: new THREE.Color('#ffd9a0') },
      uOpacity: { value: 1 }
    }
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    })
    this.field = new THREE.Points(geo, mat)
    this.field.frustumCulled = false
    this.group.add(this.field)
  }

  #props() {
    this.coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowMap,
      color: '#fff1d2',
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false
    }))
    this.group.add(this.coreGlow)

    const shellCount = 2600
    this.shell = glowPoints(shellPositions(shellCount, mulberry32(7)), 0.22, '#ffe6c8', this.glowMap)
    this.shell.scale.setScalar(2)
    this.group.add(this.shell)

    const starPos = new Float32Array([
      -4, 2, 1, 3, 1, -2, 1, 3, 4, -2, -1, 5, 5, 0, -3, 0, 2, -6
    ])
    this.firstStars = glowPoints(starPos, 1.6, '#fff6d8', this.glowMap)
    this.group.add(this.firstStars)

    const galaxyPos = new Float32Array(18 * 3)
    const rand = mulberry32(42)
    for (let i = 0; i < 18; i += 1) {
      const r = 8 + rand() * 12
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      galaxyPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      galaxyPos[i * 3 + 1] = r * Math.cos(phi) * 0.45
      galaxyPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    this.galaxies = glowPoints(galaxyPos, 0.85, '#d5e4ff', this.glowMap)
    this.group.add(this.galaxies)

    this.milky = new THREE.Group()
    const disc = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 4.4, 64),
      new THREE.MeshBasicMaterial({
        color: '#c9d7ff',
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false
      })
    )
    disc.rotation.x = Math.PI / 2.4
    const here = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshBasicMaterial({ color: '#ffe08a', toneMapped: false })
    )
    here.position.set(2.5, 0.15, 0.4)
    this.hereTex = hereLabel()
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.hereTex,
      transparent: true,
      depthWrite: false,
      toneMapped: false
    }))
    tag.position.set(2.5, 0.85, 0.4)
    tag.scale.set(3.1, 0.78, 1)
    this.milkyDisc = disc
    this.milkyTag = tag
    this.milky.add(disc, here, tag)
    this.milky.visible = false
    this.group.add(this.milky)

    this.veil = new THREE.Sprite(new THREE.SpriteMaterial({
      map: this.glowMap,
      color: '#4a1424',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      toneMapped: false
    }))
    this.veil.scale.set(70, 70, 1)
    this.veil.renderOrder = 5
    this.group.add(this.veil)
  }

  setQuality(level) {
    this.quality = level === 'low' ? 'low' : 'high'
    const count = this.quality === 'low' ? COUNT_LOW : COUNT_HIGH
    this.field.geometry.setDrawRange(0, count)
    this.shell.geometry.setDrawRange(0, this.quality === 'low' ? 1200 : 2600)
    this.uniforms.uPixelRatio.value = this.quality === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)
  }

  setProgress(p) {
    this.progress = Math.min(1, Math.max(0, p))
    const { a, b, t } = eraSample(this.progress)
    const pa = a.palette
    const pb = b.palette
    const num = (key) => pa[key] + (pb[key] - pa[key]) * t
    const colorInto = (key, target) => {
      _cA.set(pa[key])
      _cB.set(pb[key])
      target.copy(_cA).lerp(_cB, t)
    }
    const u = this.uniforms
    u.uWebMix.value = num('webMix')
    u.uGalaxyMix.value = num('galaxyMix')
    u.uOpacity.value = num('fieldOpacity')
    colorInto('hot', u.uHot.value)
    colorInto('cool', u.uCool.value)
    colorInto('bg', this.clearColor)
    this.coreGlow.material.opacity = Math.min(1, num('coreGlow') * 0.42)
    this.coreGlow.scale.setScalar(5 + num('coreGlow') * 5)
    this.starOpacity = num('starOpacity')
    this.cameraPlan.dist = num('camDist')
    this.cameraPlan.height = num('camHeight')
    this.autoSpin = num('autoSpin')

    const shell = windowWeight(this.progress, 0.14, 0.2, 0.3, 0.36)
    this.shell.material.opacity = shell * 0.85
    this.shell.scale.setScalar(2 + shell * 24)
    this.firstBase = windowWeight(this.progress, 0.32, 0.38, 0.55, 0.66)
    this.firstStars.material.opacity = this.firstBase
    this.galaxies.material.opacity = windowWeight(this.progress, 0.44, 0.52, 0.9, 1)
    const milky = windowWeight(this.progress, 0.56, 0.64, 0.9, 0.98)
    this.milky.visible = milky > 0.02
    this.milkyDisc.material.opacity = 0.42 * milky
    this.milkyTag.material.opacity = milky
    this.veil.material.opacity = this.quality === 'low' ? 0 : windowWeight(this.progress, 0.88, 0.96, 1, 1.01) * 0.55
    return a
  }

  update(dt) {
    if (!this.group.visible) return
    this.uniforms.uTime.value += dt
    const pulse = 0.82 + Math.sin(this.uniforms.uTime.value * 2.2) * 0.18
    this.firstStars.material.opacity = (this.firstBase || 0) * pulse
  }

  dispose() {
    this.group.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((mat) => {
        if (mat.map && mat.map !== this.glowMap) mat.map.dispose?.()
        mat.map = null
        mat.dispose?.()
      })
    })
    this.group.clear()
    this.hereTex?.dispose?.()
    releaseGlowTexture()
    this.glowMap = null
  }
}
