<template>
  <div class="campus3d">
    <div ref="hostEl" class="canvas-host"></div>
    <div class="hint">拖拽旋转 · 滚轮缩放 · 点击楼栋下钻 · 黄=待派送 / 绿=已配送 / 灰=无单</div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { buildCampusLayout } from '../data/hengdaMingduLayout'
import {
  BUILDING_TONE_COLOR,
  buildingStatusTone
} from '../utils/campusOrderStats'

const props = defineProps({
  /** 小区期数楼栋骨架（与 /community/phases 一致） */
  phases: { type: Array, default: () => [] },
  /** 选中楼栋 key：phaseId_buildingId */
  selectedKey: { type: String, default: '' },
  /**
   * 楼栋订单聚合：{ [key]: { pending, completed, quantity } }
   * 有待派送→黄，仅已配送→绿，无单→灰
   */
  buildingStats: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['select'])

const hostEl = ref(null)

let renderer = null
let labelRenderer = null
let scene = null
let camera = null
let controls = null
let raycaster = null
let pointer = null
let animId = 0
let buildingGroup = null
const meshByKey = new Map()

function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      mats.forEach((m) => m.dispose?.())
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

function labelText(item, stat) {
  if (!stat || (stat.pending === 0 && stat.completed === 0)) {
    return item.name
  }
  return `${item.name} 待${stat.pending}/已${stat.completed}`
}

function rebuild() {
  if (!scene) return
  clearBuildings()
  buildingGroup = new THREE.Group()
  const items = buildCampusLayout(props.phases)

  for (const item of items) {
    const stat = props.buildingStats?.[item.key]
    const tone = buildingStatusTone(stat)
    const geo = new THREE.BoxGeometry(item.width, item.height, item.depth)
    const mat = new THREE.MeshStandardMaterial({
      color: BUILDING_TONE_COLOR[tone],
      metalness: 0.05,
      roughness: 0.72,
      emissive: 0x000000,
      emissiveIntensity: 0
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(item.x, item.height / 2, item.z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.userData = {
      key: item.key,
      phaseId: item.phaseId,
      buildingId: item.buildingId,
      name: item.name
    }

    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    )
    mesh.add(edge)

    const labelEl = document.createElement('div')
    labelEl.className = 'campus-label'
    labelEl.textContent = labelText(item, stat)
    const label = new CSS2DObject(labelEl)
    label.position.set(0, item.height / 2 + 2, 0)
    mesh.userData.labelEl = labelEl
    mesh.add(label)

    buildingGroup.add(mesh)
    meshByKey.set(item.key, mesh)
  }

  scene.add(buildingGroup)
  applyAppearance()
  fitCamera(items)
}

/** 着色 + 选中高亮 + 标签刷新（不重建几何） */
function applyAppearance() {
  meshByKey.forEach((mesh, key) => {
    const stat = props.buildingStats?.[key]
    const tone = buildingStatusTone(stat)
    const selected = key === props.selectedKey
    mesh.material.color.setHex(selected ? 0xf97316 : BUILDING_TONE_COLOR[tone])
    mesh.material.emissive.setHex(selected ? 0x7c2d12 : 0x000000)
    mesh.material.emissiveIntensity = selected ? 0.25 : 0
    if (mesh.userData.labelEl) {
      mesh.userData.labelEl.textContent = labelText(
        { name: mesh.userData.name },
        stat
      )
    }
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

function onPointerDown(event) {
  if (!hostEl.value || !camera || !buildingGroup) return
  const rect = hostEl.value.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects(buildingGroup.children, false)
  const hit = hits.find((h) => h.object?.userData?.key)
  if (!hit) return
  const { phaseId, buildingId, name, key } = hit.object.userData
  emit('select', { phaseId, buildingId, name, key })
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

function init() {
  const host = hostEl.value
  if (!host) return

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

  const hemi = new THREE.HemisphereLight(0xffffff, 0xb8c4d4, 0.95)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(80, 160, 60)
  dir.castShadow = true
  scene.add(dir)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0xd9e2ec, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(500, 50, 0xcbd5e1, 0xe2e8f0)
  grid.position.y = 0.05
  scene.add(grid)

  raycaster = new THREE.Raycaster()
  pointer = new THREE.Vector2()

  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('resize', onResize)

  rebuild()
  animate()
}

function teardown() {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  renderer?.domElement?.removeEventListener('pointerdown', onPointerDown)
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
}

watch(() => props.phases, rebuild, { deep: true })
watch(() => props.selectedKey, applyAppearance)
watch(() => props.buildingStats, applyAppearance, { deep: true })

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
}

.canvas-host {
  width: 100%;
  height: 100%;
  min-height: 480px;
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
</style>
