/**
 * WebGL 兼容地球（无 WebGPU / HTTP 非安全上下文时使用）。
 * 使用标准材质，避免 wgslFn / NodeMaterial 在 WebGL 下着色器编译失败。
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CONSTANTS, CINEMATIC_LOCATIONS } from './constants.js'
import { createMoon, updateMoon } from './createMoon.js'

export async function createEarthClassic(loader, maxAnisotropy = 1) {
  const group = new THREE.Group()
  const segs = Math.min(96, CONSTANTS.SEGMENTS)
  const [albedo, specular, clouds, night] = await Promise.all([
    loader.loadAsync(CONSTANTS.TEXTURES.ALBEDO),
    loader.loadAsync(CONSTANTS.TEXTURES.SPECULAR),
    loader.loadAsync(CONSTANTS.TEXTURES.CLOUDS),
    loader.loadAsync(CONSTANTS.TEXTURES.NIGHT)
  ])
  ;[albedo, clouds, night].forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = maxAnisotropy
  })
  specular.anisotropy = maxAnisotropy

  const earthMat = new THREE.MeshStandardMaterial({
    map: albedo,
    roughnessMap: specular,
    roughness: 0.85,
    metalness: 0.05,
    emissiveMap: night,
    emissive: new THREE.Color(0xffffff),
    emissiveIntensity: CONSTANTS.GUI.ENVIRONMENT.CITY_LIGHTS * 0.35
  })
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(CONSTANTS.EARTH_RADIUS, segs, segs),
    earthMat
  )

  const cloudsMat = new THREE.MeshStandardMaterial({
    map: clouds,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    roughness: 1,
    metalness: 0
  })
  const cloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(CONSTANTS.EARTH_RADIUS + 0.06, segs, segs),
    cloudsMat
  )
  cloudMesh.name = 'clouds'

  const atmosMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(CONSTANTS.GUI.ATMOSPHERE.RAYLEIGH_COLOR),
    transparent: true,
    opacity: 0.18,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const atmos = new THREE.Mesh(
    new THREE.SphereGeometry(CONSTANTS.ATMOSPHERE_RADIUS, 48, 48),
    atmosMat
  )

  // GUI 兼容占位，避免 buildGui 访问 userData 崩溃（经典模式不挂 GUI）
  group.userData = {
    shadowDist: { value: 1 },
    shadowIntensity: { value: 0.8 },
    shadowColor: { value: new THREE.Color(0x333333) },
    waterRoughness: { value: 0.4 },
    waterMetalness: { value: 0.05 },
    twilightColor: { value: new THREE.Color(0xff5500) },
    darkSideBrightness: { value: 0.05 },
    cityLights: { value: 2 },
    terrainShadowIntensity: { value: 1 },
    terrainShadowOffset: { value: 0.002 },
    bumpScale: { value: new THREE.Vector2(5, 5) },
    rayleighColor: { value: new THREE.Color(0x3377ff) },
    rayleighIntensity: { value: 1 },
    mieColor: { value: new THREE.Color(0x0d3a0a) },
    airglowColor: { value: new THREE.Color(0x450055) },
    atmosMode: { value: 0 },
    atmosDensity: { value: 20 }
  }

  group.add(earth, cloudMesh, atmos)
  return group
}

/** 检测是否可用真实 WebGPU（HTTP IP 通常不可用，需 HTTPS/localhost） */
export function canUseWebGPU() {
  return typeof navigator !== 'undefined' && !!navigator.gpu
}

export class EngineClassic {
  constructor(canvas) {
    this.canvas = canvas
    this.animationId = 0
    this.isDisposed = false
    this.onLocationsUpdate = null
    this.locationAnchors = new Map()
    this.focusTargetAnchorId = null
    this.renderPipeline = null
  }

  async init(onProgress) {
    if (onProgress) onProgress('Initializing WebGPU Renderer')
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05

    if (onProgress) onProgress('Setting up Scene & Camera')
    this.camera = new THREE.PerspectiveCamera(CONSTANTS.GUI.CAMERA.FOV, 1, 0.1, 1000)
    this.camera.position.set(
      CONSTANTS.GUI.CAMERA.POSITION.x,
      CONSTANTS.GUI.CAMERA.POSITION.y,
      CONSTANTS.GUI.CAMERA.POSITION.z
    )
    this.scene = new THREE.Scene()
    this.root = new THREE.Group()
    this.scene.add(this.root)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.enablePan = true
    this.controls.minDistance = CONSTANTS.EARTH_RADIUS * 1.2
    this.controls.maxDistance = CONSTANTS.EARTH_RADIUS * 10
    this.controls.autoRotate = CONSTANTS.GUI.CAMERA.AUTO_ROTATE
    this.controls.autoRotateSpeed = CONSTANTS.GUI.CAMERA.AUTO_ROTATE_SPEED
    this.controls.target.set(
      CONSTANTS.GUI.CAMERA.TARGET.x,
      CONSTANTS.GUI.CAMERA.TARGET.y,
      CONSTANTS.GUI.CAMERA.TARGET.z
    )
    this.controls.update()
    this.controls.saveState()
    this.controls.addEventListener('start', () => {
      this.focusTargetAnchorId = null
    })

    this.textureLoader = new THREE.TextureLoader()
    this.handleResize = () => {
      if (!this.canvas.parentElement || !this.renderer) return
      const width = this.canvas.parentElement.clientWidth
      const height = this.canvas.parentElement.clientHeight
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      const scale = CONSTANTS.GUI.DEBUG.RESOLUTION_SCALE || 1
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * scale)
      this.renderer.setSize(width, height, false)
    }

    if (onProgress) onProgress('Loading Celestial Objects')
    this.ambient = new THREE.AmbientLight(0x334455, 0.35)
    this.scene.add(this.ambient)
    this.directionalLight = new THREE.DirectionalLight(
      CONSTANTS.GUI.SUN.COLOR,
      CONSTANTS.GUI.SUN.INTENSITY
    )
    this.scene.add(this.directionalLight)
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(6, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff2cc })
    )
    this.scene.add(this.sunMesh)
    this.sunSettings = {
      autoRotate: CONSTANTS.GUI.SUN.AUTO_ROTATE,
      speed: CONSTANTS.GUI.SUN.SPEED,
      inclination: CONSTANTS.GUI.SUN.INCLINATION,
      intensity: CONSTANTS.GUI.SUN.INTENSITY,
      angle: 0.8
    }
    this.moonSettings = {
      enabled: CONSTANTS.GUI.MOON.ENABLED,
      speed: CONSTANTS.GUI.MOON.SPEED,
      distance: CONSTANTS.GUI.MOON.DISTANCE,
      inclination: CONSTANTS.GUI.MOON.INCLINATION,
      displacementScale: 0,
      illumination: CONSTANTS.GUI.MOON.ILLUMINATION,
      angle: Math.PI
    }
    this.earthSettings = {
      trueInclination: false,
      rotationSpeed: CONSTANTS.GUI.EARTH.ROTATION_SPEED || 1e-4
    }
    this.citiesSettings = { enabled: CONSTANTS.GUI.CITIES?.ENABLED !== false }

    const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy()
    this.moonMesh = await createMoon(this.textureLoader, maxAnisotropy)
    if (this.isDisposed) return
    this.scene.add(this.moonMesh)

    if (onProgress) onProgress('Loading Environment Map (PNG)')
    const stars = await this.textureLoader.loadAsync(CONSTANTS.TEXTURES.STARS)
    if (this.isDisposed) return
    stars.mapping = THREE.EquirectangularReflectionMapping
    stars.colorSpace = THREE.SRGBColorSpace
    this.scene.background = stars
    this.scene.backgroundIntensity = CONSTANTS.GUI.ENVIRONMENT.SKYBOX_INTENSITY

    if (onProgress) onProgress('Loading Earth Textures (8K)')
    const earth = await createEarthClassic(this.textureLoader, maxAnisotropy)
    if (this.isDisposed) return
    this.root.add(earth)
    this.earthGroup = earth
    this.initLocations()

    if (onProgress) onProgress('Building Render Pipeline')
    // 占位，避免 animate 里访问 flare uniforms 报错
    this.flarePosUniform = { value: new THREE.Vector2(-99, -99) }
    this.flareIntensityUniform = { value: 0 }
    this.anamorphicIntensityUniform = { value: 0 }
    this.anamorphicSizeUniform = { value: 0.2 }
    this.anamorphicThicknessUniform = { value: 2 }
    this.anamorphicColorUniform = { value: new THREE.Color(0xffffff) }
    this.flareSettings = { enabled: false, intensity: 0 }
    this.anamorphicSettings = {
      enabled: false,
      intensity: 0,
      thickness: 2,
      size: 0.2,
      color: 0xffffff,
      innerFade: 0.08,
      outerFade: 0.08
    }

    this.handleResize()
    window.addEventListener('resize', this.handleResize)
    if (onProgress) onProgress('Compiling Shaders (Warmup)')
    this.start()
  }

  start() {
    const tick = () => {
      this.animationId = requestAnimationFrame(tick)
      if (this.focusTargetAnchorId) {
        const anchor = this.locationAnchors.get(this.focusTargetAnchorId)
        if (anchor) {
          const tempV = new THREE.Vector3()
          anchor.getWorldPosition(tempV)
          const dir = tempV.clone().normalize()
          const dist = Math.max(
            CONSTANTS.EARTH_RADIUS * 1.5,
            Math.min(this.camera.position.length(), CONSTANTS.EARTH_RADIUS * 2.5)
          )
          const target = dir.multiplyScalar(dist)
          this.camera.position.lerp(target, 0.08)
          if (this.camera.position.distanceTo(target) < 0.05) {
            this.camera.position.copy(target)
            this.focusTargetAnchorId = null
          }
        }
      }
      this.controls.update()
      if (this.sunSettings.autoRotate) {
        this.sunSettings.angle += 0.01 * this.sunSettings.speed
      }
      const sunDist = 200
      const sa = this.sunSettings.angle
      const si = this.sunSettings.inclination
      this.directionalLight.position.set(
        Math.cos(sa) * sunDist,
        Math.sin(si) * sunDist,
        Math.sin(sa) * sunDist
      )
      this.sunMesh.position.copy(this.directionalLight.position)
      this.root.rotation.y += this.earthSettings.rotationSpeed
      this.root.traverse((child) => {
        if (child.name === 'clouds') {
          child.rotation.y += this.earthSettings.rotationSpeed * 0.2
        }
      })
      if (this.moonSettings.enabled && this.moonMesh) {
        this.moonSettings.angle += this.moonSettings.speed
        updateMoon(this.moonMesh, this.sunMesh, this.camera, this.moonSettings)
      }
      this.updateProjectedLocations()
      this.renderer.render(this.scene, this.camera)
    }
    tick()
  }

  dispose() {
    this.isDisposed = true
    cancelAnimationFrame(this.animationId)
    window.removeEventListener('resize', this.handleResize)
    this.controls?.dispose()
    this.renderer?.dispose()
  }

  initLocations() {
    if (!this.earthGroup) return
    const radius = CONSTANTS.EARTH_RADIUS + 0.1
    for (const loc of CINEMATIC_LOCATIONS) {
      const phi = ((90 - loc.lat) * Math.PI) / 180
      const theta = ((loc.lng + 180) * Math.PI) / 180
      const x = -radius * Math.cos(theta) * Math.sin(phi)
      const y = radius * Math.cos(phi)
      const z = radius * Math.sin(theta) * Math.sin(phi)
      const anchor = new THREE.Object3D()
      anchor.position.set(x, y, z)
      this.earthGroup.add(anchor)
      this.locationAnchors.set(loc.id, anchor)
    }
  }

  updateProjectedLocations() {
    if (!this.onLocationsUpdate || this.locationAnchors.size === 0) return
    if (this.citiesSettings && !this.citiesSettings.enabled) {
      this.onLocationsUpdate([])
      return
    }
    const projected = []
    const tempV = new THREE.Vector3()
    const earthCenter = new THREE.Vector3(0, 0, 0)
    const width = this.canvas.parentElement
      ? this.canvas.parentElement.clientWidth
      : window.innerWidth
    const height = this.canvas.parentElement
      ? this.canvas.parentElement.clientHeight
      : window.innerHeight
    const dirToCamera = this.camera.position.clone().sub(earthCenter).normalize()
    for (const [id, anchor] of this.locationAnchors.entries()) {
      anchor.getWorldPosition(tempV)
      const distanceToCamera = this.camera.position.distanceTo(tempV)
      const dirToAnchor = tempV.clone().sub(earthCenter).normalize()
      const d = dirToAnchor.dot(dirToCamera)
      const visible = d > -0.05
      let opacity = 0
      if (d > 0) opacity = Math.min(1, d / 0.2)
      tempV.project(this.camera)
      const x = (tempV.x * 0.5 + 0.5) * width
      const y = (tempV.y * -0.5 + 0.5) * height
      const info = CINEMATIC_LOCATIONS.find((l) => l.id === id)
      if (info) {
        projected.push({
          id,
          name: info.name,
          lat: info.lat,
          lng: info.lng,
          x,
          y,
          visible,
          opacity,
          distanceToCamera
        })
      }
    }
    this.onLocationsUpdate(projected)
  }

  focusOnLocation(id) {
    this.focusTargetAnchorId = id
  }
}
