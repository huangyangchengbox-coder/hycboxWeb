<template>
  <div class="campus3d">
    <div v-if="calibrate" class="cal-bar">
      <span class="cal-tip">校准模式：拖拽楼栋对齐总平 · 滚轮缩放 · 右键拖拽旋转视角</span>
      <div class="cal-actions">
        <label class="btn btn-secondary btn-sm file-btn">
          上传总平图
          <input type="file" accept="image/*" hidden @change="onPlanFile" />
        </label>
        <label class="btn btn-secondary btn-sm file-btn">
          导入落位
          <input type="file" accept="application/json,.json" hidden @change="onImportLayout" />
        </label>
        <button type="button" class="btn btn-secondary btn-sm" @click="exportLayout">导出落位</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="resetLayout">重置落位</button>
        <button type="button" class="btn btn-sm save-btn" @click="persistLayout">保存落位</button>
      </div>
    </div>
    <div ref="hostEl" class="canvas-host"></div>
    <div class="hint">{{ hintText }}</div>
    <p v-if="toast" class="toast">{{ toast }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { buildCampusLayout, PHASE2_PLAN_OVERLAY } from '../data/hengdaMingduLayout'
import {
  BUILDING_TONE_COLOR,
  buildingStatusTone
} from '../utils/campusOrderStats'
import {
  clearCampusLayout,
  downloadCampusLayoutJson,
  loadCampusLayout,
  mergeLayoutOverrides,
  parseCampusLayoutFile,
  saveCampusLayout
} from '../utils/campusLayoutStore'

const props = defineProps({
  phases: { type: Array, default: () => [] },
  selectedKey: { type: String, default: '' },
  buildingStats: { type: Object, default: () => ({}) },
  communityId: { type: String, default: 'hengda_mingdu' },
  /** 开启后拖拽楼栋，不触发下钻 */
  calibrate: { type: Boolean, default: false }
})

const emit = defineEmits(['select'])

const hostEl = ref(null)
const toast = ref('')
const overrides = ref({})

const hintText = computed(() =>
  props.calibrate
    ? '校准：左键拖楼栋 · 右键/中键转视角 · 黄待派送/绿已配送/灰无单'
    : '拖拽旋转 · 滚轮缩放 · 点击楼栋下钻 · 楼号和①②写在楼体上'
)

let renderer = null
let labelRenderer = null
let scene = null
let camera = null
let controls = null
let raycaster = null
let pointer = null
let animId = 0
let buildingGroup = null
let groundMesh = null
let planMesh = null
let dragMesh = null
let dragOffset = new THREE.Vector3()
let toastTimer = 0
const meshByKey = new Map()
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const intersectPoint = new THREE.Vector3()

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((m) => {
        if (m.map) m.map.dispose?.()
        m.dispose?.()
      })
    }
    if (child.element?.parentNode) {
      child.element.parentNode.removeChild(child.element)
    }
  })
}

function clearBuildings() {
  if (!buildingGroup || !scene) return
  scene.remove(buildingGroup)
  disposeObject(buildingGroup)
  buildingGroup = null
  meshByKey.clear()
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

function circledUnit(index) {
  return CIRCLED[index - 1] || String(index)
}

/** 楼号、单元号贴在楼体正面，不飘在楼顶 */
function markPlane(text, width, height, fontPx) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 128)
  ctx.fillStyle = 'rgba(15, 23, 42, 0.38)'
  ctx.fillRect(28, 16, 200, 96)
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${fontPx}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 66)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat)
  mesh.userData.mark = true
  return mesh
}

function currentItems() {
  return mergeLayoutOverrides(buildCampusLayout(props.phases), overrides.value)
}

function rebuild(fit = true) {
  if (!scene) return
  clearBuildings()
  buildingGroup = new THREE.Group()
  const items = currentItems()

  for (const item of items) {
    const stat = props.buildingStats?.[item.key]
    const tone = buildingStatusTone(stat)
    const units = Math.max(1, Number(item.units) || 1)
    const gap = units > 1 ? 0.6 : 0
    const unitW = (item.width - gap * (units - 1)) / units

    const root = new THREE.Group()
    root.position.set(item.x, 0, item.z)
    root.userData = {
      key: item.key,
      phaseId: item.phaseId,
      buildingId: item.buildingId,
      name: item.name,
      height: item.height,
      units
    }

    for (let u = 0; u < units; u++) {
      const geo = new THREE.BoxGeometry(unitW, item.height, item.depth)
      const mat = new THREE.MeshStandardMaterial({
        color: BUILDING_TONE_COLOR[tone],
        metalness: 0.05,
        roughness: 0.72,
        emissive: 0x000000,
        emissiveIntensity: 0
      })
      const mesh = new THREE.Mesh(geo, mat)
      const xOff = -item.width / 2 + unitW / 2 + u * (unitW + gap)
      mesh.position.set(xOff, item.height / 2, 0)
      mesh.castShadow = true
      mesh.receiveShadow = true
      mesh.userData = { unitIndex: u + 1, parentKey: item.key }

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
      )
      mesh.add(edge)

      const unitMark = markPlane(circledUnit(u + 1), Math.min(unitW * 0.72, 6), 2.6, 78)
      unitMark.position.set(0, 0, item.depth / 2 + 0.08)
      mesh.add(unitMark)

      root.add(mesh)
    }

    const buildingNo = markPlane(String(item.buildingId), Math.min(item.width * 0.5, 7), 3.4, 88)
    buildingNo.position.set(0, item.height * 0.78, item.depth / 2 + 0.15)
    root.add(buildingNo)

    buildingGroup.add(root)
    meshByKey.set(item.key, root)
  }

  scene.add(buildingGroup)
  applyAppearance()
  if (fit) fitCamera(items)
}

function applyAppearance() {
  meshByKey.forEach((root, key) => {
    const stat = props.buildingStats?.[key]
    const tone = buildingStatusTone(stat)
    const selected = key === props.selectedKey
    const color = selected ? 0xf97316 : BUILDING_TONE_COLOR[tone]
    const emissive = selected ? 0x7c2d12 : 0x000000
    const emissiveIntensity = selected ? 0.25 : 0
    root.traverse((child) => {
      if (!child.isMesh || child.userData?.mark) return
      if (child.material && child.material.color && child.material.emissive) {
        child.material.color.setHex(color)
        child.material.emissive.setHex(emissive)
        child.material.emissiveIntensity = emissiveIntensity
      }
    })
  })
}

function fitCamera(items) {
  if (!camera || !controls || !items.length) return
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let maxH = 0
  for (const it of items) {
    minX = Math.min(minX, it.x - it.width)
    maxX = Math.max(maxX, it.x + it.width)
    minZ = Math.min(minZ, it.z - it.depth)
    maxZ = Math.max(maxZ, it.z + it.depth)
    maxH = Math.max(maxH, it.height)
  }
  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  const span = Math.max(maxX - minX, maxZ - minZ, 80)
  controls.target.set(cx, maxH * 0.2, cz)
  camera.position.set(cx + span * 0.55, maxH * 1.1 + 40, cz + span * 0.75)
  controls.update()
}

function syncOverridesFromMeshes() {
  const next = { ...overrides.value }
  meshByKey.forEach((mesh, key) => {
    next[key] = {
      x: Number(mesh.position.x.toFixed(2)),
      z: Number(mesh.position.z.toFixed(2))
    }
  })
  overrides.value = next
  return next
}

function persistLayout() {
  const buildings = syncOverridesFromMeshes()
  saveCampusLayout(props.communityId, buildings)
  showToast('落位已保存到本机')
}

function resetLayout() {
  clearCampusLayout(props.communityId)
  overrides.value = {}
  rebuild(true)
  showToast('已恢复默认网格落位')
}

function exportLayout() {
  const buildings = syncOverridesFromMeshes()
  downloadCampusLayoutJson(props.communityId, buildings)
  showToast('已导出 JSON')
}

async function onImportLayout(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const buildings = await parseCampusLayoutFile(file)
    overrides.value = buildings
    saveCampusLayout(props.communityId, buildings)
    rebuild(true)
    showToast('落位已导入并保存')
  } catch (e) {
    showToast(e.message || '导入失败')
  }
}

function clearPlanMesh() {
  if (!planMesh || !scene) return
  scene.remove(planMesh)
  disposeObject(planMesh)
  planMesh = null
}

function onPlanFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !scene) return
  const url = URL.createObjectURL(file)
  const loader = new THREE.TextureLoader()
  loader.load(
    url,
    (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      clearPlanMesh()
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false
      })
      planMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(PHASE2_PLAN_OVERLAY.widthM, PHASE2_PLAN_OVERLAY.heightM),
        mat
      )
      planMesh.rotation.x = -Math.PI / 2
      planMesh.position.set(PHASE2_PLAN_OVERLAY.centerX, 0.08, PHASE2_PLAN_OVERLAY.centerZ)
      scene.add(planMesh)
      if (groundMesh) groundMesh.visible = false
      showToast('总平图已铺到地面（仅本次会话）')
      URL.revokeObjectURL(url)
    },
    undefined,
    () => {
      URL.revokeObjectURL(url)
      showToast('总平图加载失败')
    }
  )
}

function pickBuilding(event) {
  if (!hostEl.value || !camera || !buildingGroup) return null
  const rect = hostEl.value.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(buildingGroup.children, true)
  for (const hit of hits) {
    let obj = hit.object
    while (obj && !obj.userData?.key) obj = obj.parent
    if (obj?.userData?.key) return obj
  }
  return null
}

function groundHit(event) {
  if (!hostEl.value || !camera) return null
  const rect = hostEl.value.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  if (!raycaster.ray.intersectPlane(groundPlane, intersectPoint)) return null
  return intersectPoint.clone()
}

function onPointerDown(event) {
  if (event.button !== 0) return
  const mesh = pickBuilding(event)
  if (!mesh) return

  if (props.calibrate) {
    const hit = groundHit(event)
    if (!hit) return
    dragMesh = mesh
    dragOffset.set(mesh.position.x - hit.x, 0, mesh.position.z - hit.z)
    if (controls) controls.enabled = false
    return
  }

  const { phaseId, buildingId, name, key } = mesh.userData
  emit('select', { phaseId, buildingId, name, key })
}

function onPointerMove(event) {
  if (!dragMesh || !props.calibrate) return
  const hit = groundHit(event)
  if (!hit) return
  dragMesh.position.x = hit.x + dragOffset.x
  dragMesh.position.z = hit.z + dragOffset.z
}

function onPointerUp() {
  if (!dragMesh) return
  dragMesh = null
  if (controls) controls.enabled = true
  syncOverridesFromMeshes()
}

function onResize() {
  if (!hostEl.value || !renderer || !camera || !labelRenderer) return
  const w = hostEl.value.clientWidth
  const h = hostEl.value.clientHeight
  camera.aspect = w / Math.max(h, 1)
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  labelRenderer.setSize(w, h)
}

function animate() {
  animId = requestAnimationFrame(animate)
  controls?.update()
  renderer?.render(scene, camera)
  labelRenderer?.render(scene, camera)
}

function loadSavedOverrides() {
  const saved = loadCampusLayout(props.communityId)
  overrides.value = saved?.buildings || {}
}

function init() {
  const host = hostEl.value
  if (!host) return

  loadSavedOverrides()

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xeef2f7)
  scene.fog = new THREE.Fog(0xeef2f7, 220, 520)

  const w = host.clientWidth || 800
  const h = host.clientHeight || 480
  camera = new THREE.PerspectiveCamera(50, w / h, 1, 2000)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h)
  renderer.shadowMap.enabled = true
  host.appendChild(renderer.domElement)

  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(w, h)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.inset = '0'
  labelRenderer.domElement.style.pointerEvents = 'none'
  host.appendChild(labelRenderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.maxPolarAngle = Math.PI * 0.48
  controls.minDistance = 40
  controls.maxDistance = 420
  // 校准模式：左键留给拖楼栋，右键/中键转视角
  controls.mouseButtons = {
    LEFT: props.calibrate ? -1 : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c4d4, 0.95)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(80, 160, 60)
  dir.castShadow = true
  scene.add(dir)

  groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0xd9e2ec, roughness: 1 })
  )
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  const grid = new THREE.GridHelper(500, 50, 0xcbd5e1, 0xe2e8f0)
  grid.position.y = 0.05
  scene.add(grid)

  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', onResize)

  rebuild(true)
  animate()
}

function teardown() {
  cancelAnimationFrame(animId)
  clearTimeout(toastTimer)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('resize', onResize)
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
  clearPlanMesh()
  clearBuildings()
  controls?.dispose()
  renderer?.dispose()
  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement)
  }
  if (labelRenderer?.domElement?.parentNode) {
    labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
  }
  renderer = null
  labelRenderer = null
  scene = null
  camera = null
  controls = null
  groundMesh = null
}

function applyCalibrateControls() {
  if (!controls) return
  controls.mouseButtons = {
    LEFT: props.calibrate ? -1 : THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE
  }
}

watch(() => props.phases, () => rebuild(true), { deep: true })
watch(() => props.selectedKey, applyAppearance)
watch(() => props.buildingStats, applyAppearance, { deep: true })
watch(() => props.communityId, () => {
  loadSavedOverrides()
  rebuild(true)
})
watch(() => props.calibrate, applyCalibrateControls)

onMounted(init)
onUnmounted(teardown)
</script>

<style scoped>
.campus3d {
  position: relative;
  flex: 1;
  min-height: 480px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #eef2f7;
  display: flex;
  flex-direction: column;
}

.cal-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  background: #fff7ed;
  border-bottom: 1px solid #fdba74;
  z-index: 3;
}

.cal-tip {
  font-size: 0.75rem;
  color: #9a3412;
}

.cal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.file-btn {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}

.save-btn {
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.canvas-host {
  width: 100%;
  flex: 1;
  min-height: 440px;
  position: relative;
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

.toast {
  position: absolute;
  right: 12px;
  bottom: 10px;
  z-index: 4;
  margin: 0;
  font-size: 0.8rem;
  background: rgba(15, 23, 42, 0.88);
  color: #fff;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  pointer-events: none;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}
</style>

<style>
.campus-label {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 11px;
  white-space: nowrap;
  transform: translateY(-4px);
  user-select: none;
}

.campus-unit-label {
  padding: 1px 4px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  font-size: 9px;
  white-space: nowrap;
  user-select: none;
}
</style>
