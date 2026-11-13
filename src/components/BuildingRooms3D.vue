<template>
  <div class="rooms3d">
    <div class="bar">
      <button type="button" class="btn btn-secondary btn-sm" @click="$emit('back')">返回小区总览</button>
      <button type="button" class="btn btn-secondary btn-sm" @click="showFront">正面</button>
      <button type="button" class="btn btn-secondary btn-sm" @click="resetView">重置视角</button>
      <div class="title">
        <strong>{{ building.phaseName }} · {{ building.name }}</strong>
        <span class="muted">
          {{ layoutText }}
          · 待派送 {{ counts.pending }} 户 · 已配送 {{ counts.completed }} 户
          <template v-if="simulated"> · 示意</template>
        </span>
      </div>
      <div v-if="active" class="door">
        <span :class="['pill', active.status]">{{ statusText(active.status) }}</span>
        <strong>{{ active.floor }} 层 · {{ circledUnit(active.unit) }} · {{ active.roomNo }} · {{ faceText(active.face) }}</strong>
        <span class="muted">
          <template v-if="active.status === 'empty'">这一户没有派送</template>
          <template v-else>{{ active.quantity || 0 }} {{ unitLabel }}</template>
          <template v-if="active.simulated"> · 示意</template>
        </span>
      </div>
      <span v-else class="muted">点窗户看户号</span>
    </div>
    <div ref="hostEl" class="canvas-host"></div>
    <div class="hint">拖拽旋转可看前后 · 滚轮缩放 · 点窗户看户号</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { floorsOf, homeSlots, householdsPerFloor, roomNoOf, unitOfHome } from '../utils/campusFloorGrid'

const props = defineProps({
  building: { type: Object, required: true },
  rooms: { type: Array, default: () => [] },
  communityId: { type: String, default: '' },
  unitLabel: { type: String, default: '份' },
  simulated: { type: Boolean, default: false }
})

defineEmits(['back'])

const hostEl = ref(null)
const active = ref(null)

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
const UNIT_WIDTH = 7.2
const UNIT_GAP = 0.55
const FLOOR_HEIGHT = 1.05
const DEPTH = 4.2

const counts = computed(() => {
  let pending = 0
  let completed = 0
  for (const room of props.rooms) {
    if (room.status === 'pending') pending += 1
    else if (room.status === 'completed') completed += 1
  }
  return { pending, completed }
})

const layoutText = computed(() => {
  const per = householdsPerFloor(props.building)
  const face = per >= 4 ? '正面 2 户、背面 2 户' : '正面 2 户、背面 1 户'
  return `每层 ${per} 户，${face}`
})

let renderer = null
let scene = null
let camera = null
let controls = null
let raycaster = null
let pointer = null
let animId = 0
let roomGroup = null
let resizeObserver = null
let framedKey = ''
let towerHeight = 12
let downX = 0
let downY = 0
let selectedMesh = null
let selectedClone = null
const selectable = []
const geos = new Map()
const texCache = new Map()
const sharedMats = new Set()
let wallMat = []
let glassMat = []
let trimMat = null
let darkMat = null
let balconyMat = null
let floorMat = null
let podiumMat = null
let roofMat = null

function statusText(status) {
  if (status === 'pending') return '待派送'
  if (status === 'completed') return '已配送'
  return '无订单'
}

function circledUnit(unit) {
  return CIRCLED[unit - 1] || String(unit)
}

function faceText(face) {
  return face === 'rear' ? '背面' : '正面'
}

function solidMat(color, roughness = 0.72, metalness = 0) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness })
  sharedMats.add(mat)
  return mat
}

function geo(w, h, d) {
  const key = `${w}|${h}|${d}`
  let g = geos.get(key)
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d)
    geos.set(key, g)
  }
  return g
}

function planeGeo(w, h) {
  const key = `p|${w}|${h}`
  let g = geos.get(key)
  if (!g) {
    g = new THREE.PlaneGeometry(w, h)
    geos.set(key, g)
  }
  return g
}

function box(parent, w, h, d, material, x, y, z, cast = false) {
  const mesh = new THREE.Mesh(geo(w, h, d), material)
  mesh.position.set(x, y, z)
  mesh.castShadow = cast
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function labelTexture(text, color, bg) {
  const key = `${text}|${color}|${bg}`
  const cached = texCache.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = color
  ctx.font = 'bold 120px "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(text), 256, 136)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  texCache.set(key, tex)
  return tex
}

function textPlate(parent, text, x, y, z, w, h, bg, fg, rotY = 0) {
  const material = new THREE.MeshBasicMaterial({ map: labelTexture(text, fg, bg) })
  const mesh = new THREE.Mesh(planeGeo(w, h), material)
  mesh.position.set(x, y, z)
  mesh.rotation.y = rotY
  parent.add(mesh)
  return mesh
}

function clearSelection() {
  if (selectedMesh?.userData?.baseMaterial) {
    selectedMesh.material = selectedMesh.userData.baseMaterial
  }
  selectedClone?.dispose()
  selectedClone = null
  selectedMesh = null
}

function disposeGroup(group) {
  const seen = new Set()
  group.traverse((child) => {
    if (!child.isMesh) return
    const mats = Array.isArray(child.material) ? child.material : [child.material]
    mats.forEach((mat) => {
      if (!mat || sharedMats.has(mat) || seen.has(mat)) return
      seen.add(mat)
      mat.dispose()
    })
  })
}

function unitOrigin(unitIndex, units) {
  const total = units * UNIT_WIDTH + Math.max(0, units - 1) * UNIT_GAP
  const start = -total / 2 + unitIndex * (UNIT_WIDTH + UNIT_GAP)
  return { start, center: start + UNIT_WIDTH / 2, total }
}

function frameCamera(mode) {
  if (!camera || !controls) return
  const targetY = towerHeight * 0.42
  controls.target.set(0, targetY, 0)
  if (mode === 'front') {
    camera.position.set(0, towerHeight * 0.46, Math.max(28, towerHeight * 1.15))
  } else {
    camera.position.set(towerHeight * 0.42, towerHeight * 0.55, towerHeight * 0.85)
  }
  controls.minDistance = Math.max(16, towerHeight * 0.4)
  controls.maxDistance = Math.max(70, towerHeight * 2.2)
  controls.update()
}

function showFront() {
  frameCamera('front')
}

function resetView() {
  frameCamera('angle')
}

function rebuild() {
  if (!scene || !props.building) return
  active.value = null
  clearSelection()
  selectable.length = 0
  if (roomGroup) {
    scene.remove(roomGroup)
    disposeGroup(roomGroup)
    roomGroup = null
  }
  texCache.forEach((tex) => tex.dispose())
  texCache.clear()

  const units = Math.max(1, Number(props.building.units) || 1)
  const floors = floorsOf(props.building.maxFloor, props.communityId).slice().sort((a, b) => a - b)
  const slots = homeSlots(householdsPerFloor(props.building))
  const byKey = new Map()
  for (const room of props.rooms || []) {
    byKey.set(`${room.unit}_${room.roomNo}`, room)
  }

  towerHeight = Math.max(floors.length, 1) * FLOOR_HEIGHT
  const span = unitOrigin(units - 1, units)
  const totalWidth = span.total

  roomGroup = new THREE.Group()
  box(roomGroup, totalWidth + 1.1, 0.55, DEPTH + 1.2, podiumMat, 0, -0.28, 0)

  for (let unitIndex = 0; unitIndex < units; unitIndex += 1) {
    const unit = unitIndex + 1
    const place = unitOrigin(unitIndex, units)
    const wall = wallMat[unitIndex % wallMat.length]
    box(roomGroup, UNIT_WIDTH, towerHeight, DEPTH, wall, place.center, towerHeight / 2, 0, true)

    floors.forEach((floor, floorIndex) => {
      const y = (floorIndex + 0.5) * FLOOR_HEIGHT
      box(
        roomGroup,
        UNIT_WIDTH + 0.06,
        0.055,
        DEPTH + 0.08,
        floorMat,
        place.center,
        (floorIndex + 1) * FLOOR_HEIGHT - 0.025,
        0
      )

      const onOuterLeft = unitIndex === 0
      const onOuterRight = unitIndex === units - 1
      if (onOuterLeft) {
        textPlate(roomGroup, String(floor), place.start - 0.025, y, 0, 0.32, 0.3, '#f7fafc', '#40576b', -Math.PI / 2)
      }
      if (onOuterRight && units > 1) {
        textPlate(
          roomGroup,
          String(floor),
          place.start + UNIT_WIDTH + 0.025,
          y,
          0,
          0.32,
          0.3,
          '#f7fafc',
          '#40576b',
          Math.PI / 2
        )
      }
    })

    const symbol = circledUnit(unit)
    const roofBg = unitIndex % 2 === 0 ? '#d8efff' : '#ffebd5'
    const roofFg = unitIndex % 2 === 0 ? '#173a58' : '#7a4b20'
    textPlate(roomGroup, symbol, place.center, towerHeight + 0.34, DEPTH / 2 + 0.13, 1.45, 0.72, roofBg, roofFg)
    box(roomGroup, 1.5, 1.8, 0.18, podiumMat, place.center, 0.9, DEPTH / 2 + 0.12)
    box(roomGroup, 0.72, 1.45, 0.08, darkMat, place.center, 0.78, DEPTH / 2 + 0.23)
  }

  if (units > 1) {
    for (let gapIndex = 0; gapIndex < units - 1; gapIndex += 1) {
      const left = unitOrigin(gapIndex, units)
      const jointX = left.start + UNIT_WIDTH + UNIT_GAP / 2
      box(roomGroup, 0.48, towerHeight + 0.1, DEPTH + 0.12, trimMat, jointX, towerHeight / 2, 0, true)
    }
  }

  box(roomGroup, totalWidth + 0.45, 0.38, DEPTH + 0.5, roofMat, 0, towerHeight + 0.12, 0, true)
  box(roomGroup, totalWidth + 0.12, 0.14, DEPTH + 0.22, trimMat, 0, towerHeight + 0.38, 0)
  textPlate(
    roomGroup,
    String(props.building.buildingId || ''),
    0,
    towerHeight + 0.92,
    DEPTH / 2 + 0.2,
    2.5,
    1.05,
    '#ffffff',
    '#173a58'
  )

  const buildingStart = -totalWidth / 2
  floors.forEach((floor, floorIndex) => {
    const y = (floorIndex + 0.5) * FLOOR_HEIGHT
    for (const home of slots) {
      const isFront = home.face === 'front'
      const zSign = isFront ? 1 : -1
      const unit = unitOfHome(home, units)
      const x = buildingStart + totalWidth * home.t
      const roomNo = roomNoOf(floor, home.apartment)
      const hit = byKey.get(`${unit}_${roomNo}`)
      const tone = hit?.status === 'pending' || hit?.status === 'completed' ? hit.status : 'empty'
      const glass = glassMat[(unit - 1) % glassMat.length][tone]

      box(roomGroup, 1.72, 0.76, 0.13, trimMat, x, y + 0.02, zSign * (DEPTH / 2 + 0.075))
      const windowMesh = box(roomGroup, 1.35, 0.49, 0.07, glass, x, y + 0.04, zSign * (DEPTH / 2 + 0.16))
      windowMesh.userData = {
        key: `${unit}_${roomNo}`,
        unit,
        floor,
        roomNo,
        face: home.face,
        status: tone,
        quantity: hit?.quantity || 0,
        simulated: !!hit?.simulated,
        baseMaterial: glass
      }
      selectable.push(windowMesh)

      box(roomGroup, 1.52, 0.07, 0.34, balconyMat, x, y - 0.31, zSign * (DEPTH / 2 + 0.29))
      box(roomGroup, 1.52, 0.055, 0.045, darkMat, x, y - 0.08, zSign * (DEPTH / 2 + 0.46))
      for (const dx of [-0.72, 0, 0.72]) {
        box(roomGroup, 0.035, 0.24, 0.035, balconyMat, x + dx, y - 0.2, zSign * (DEPTH / 2 + 0.46))
      }

      const plateBg = tone === 'pending' ? '#fff7e6' : tone === 'completed' ? '#ecfdf5' : '#ffffff'
      const plateFg = tone === 'pending' ? '#92400e' : tone === 'completed' ? '#065f46' : '#20364d'
      textPlate(
        roomGroup,
        roomNo,
        x,
        y - 0.4,
        zSign * (DEPTH / 2 + 0.19),
        0.95,
        0.2,
        plateBg,
        plateFg,
        isFront ? 0 : Math.PI
      )
    }
  })

  scene.add(roomGroup)
  const key = `${props.building.phaseId || ''}_${props.building.buildingId || ''}`
  if (framedKey !== key) {
    framedKey = key
    frameCamera('angle')
  }
}

function paintSelected(mesh) {
  clearSelection()
  if (!mesh?.userData?.baseMaterial) return
  const clone = mesh.userData.baseMaterial.clone()
  clone.emissive = new THREE.Color(0x0f766e)
  clone.emissiveIntensity = 0.45
  mesh.material = clone
  selectedMesh = mesh
  selectedClone = clone
}

function pickAt(event) {
  if (!hostEl.value || !camera) return null
  const rect = hostEl.value.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObjects(selectable, false)[0]?.object || null
}

function onPointerDown(event) {
  downX = event.clientX
  downY = event.clientY
}

function onPointerUp(event) {
  if (event.button !== 0) return
  if (Math.hypot(event.clientX - downX, event.clientY - downY) > 5) return
  const mesh = pickAt(event)
  if (!mesh?.userData?.roomNo) return
  active.value = { ...mesh.userData }
  paintSelected(mesh)
}

function resize() {
  if (!hostEl.value || !renderer || !camera) return
  const width = hostEl.value.clientWidth || 1
  const height = hostEl.value.clientHeight || 1
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
}

function boot() {
  const host = hostEl.value
  if (!host) return
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeef3f8)
  scene.fog = new THREE.Fog(0xeef3f8, 80, 180)
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300)
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  host.appendChild(renderer.domElement)

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b9aaa, 2.0))
  const sun = new THREE.DirectionalLight(0xffffff, 2.3)
  sun.position.set(-18, 38, 28)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -40
  sun.shadow.camera.right = 40
  sun.shadow.camera.top = 50
  sun.shadow.camera.bottom = -12
  scene.add(sun)

  wallMat = [solidMat(0xdce8ef), solidMat(0xe9e3d9)]
  glassMat = [0, 1].map((unitIndex) => ({
    empty: solidMat(unitIndex === 0 ? 0x78b7dc : 0xe6ad70, unitIndex === 0 ? 0.22 : 0.28, unitIndex === 0 ? 0.18 : 0.12),
    pending: solidMat(0xf5c16c, 0.24, 0.12),
    completed: solidMat(0x3ecf8e, 0.24, 0.12)
  }))
  trimMat = solidMat(0xf8fafb)
  darkMat = solidMat(0x344b60, 0.6)
  balconyMat = solidMat(0xf4f7f8)
  floorMat = solidMat(0xb6c5d1)
  podiumMat = solidMat(0x9eacb7)
  roofMat = solidMat(0x657d90, 0.64)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.49
  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(host)
  resize()
  rebuild()
  animate()
}

function teardown() {
  cancelAnimationFrame(animId)
  resizeObserver?.disconnect()
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
  renderer?.domElement?.removeEventListener('pointerup', onPointerUp)
  controls?.dispose()
  clearSelection()
  if (roomGroup) disposeGroup(roomGroup)
  texCache.forEach((tex) => tex.dispose())
  texCache.clear()
  geos.forEach((g) => g.dispose())
  geos.clear()
  sharedMats.forEach((mat) => mat.dispose())
  sharedMats.clear()
  renderer?.dispose()
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
  renderer = null
  scene = null
  camera = null
  controls = null
}

watch(() => [props.building?.buildingId, props.building?.phaseId, props.rooms], rebuild)

onMounted(boot)
onUnmounted(teardown)

defineExpose({ showFront, resetView })
</script>

<style scoped>
.rooms3d {
  position: relative;
  flex: 1;
  min-height: 480px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #eef3f8;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.7rem;
  background: #fff;
  border-bottom: 1px solid var(--border);
  z-index: 2;
}

.title {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.title strong {
  font-size: 0.95rem;
}

.muted {
  color: var(--muted);
  font-size: 0.8125rem;
}

.door {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: auto;
}

.pill {
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.75rem;
  background: #f3f4f6;
  color: #6b7280;
}

.pill.pending {
  background: #fef3c7;
  color: #92400e;
}

.pill.completed {
  background: #d1fae5;
  color: #065f46;
}

.canvas-host {
  flex: 1;
  min-height: 440px;
}

.hint {
  position: absolute;
  left: 12px;
  bottom: 10px;
  z-index: 2;
  font-size: 0.75rem;
  color: #64748b;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  pointer-events: none;
}
</style>
