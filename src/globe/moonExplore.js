/**
 * 地球页点击月球：飞入月球近景环视（示意）。
 * 供 Engine / EngineClassic 共用。
 */
import * as THREE from 'three'

export const MOON_RADIUS = 2.73

export const MOON_META = {
  id: 'moon',
  name: '月球',
  nameEn: 'Moon',
  type: '地球天然卫星',
  note: '直径约 3474 km · 平均距地约 38 万 km'
}

/**
 * @returns {{ dive: any, inside: boolean, savedCam: any, raycaster: THREE.Raycaster, pointer: THREE.Vector2 }}
 */
export function createMoonExploreState() {
  return {
    dive: null,
    inside: false,
    savedCam: null,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2()
  }
}

export function pickMoon(state, canvas, camera, moonMesh, clientX, clientY) {
  if (!moonMesh || state.dive || state.inside) return false
  const rect = canvas.getBoundingClientRect()
  state.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
  state.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  state.raycaster.setFromCamera(state.pointer, camera)
  const hits = state.raycaster.intersectObject(moonMesh, true)
  return hits.length > 0
}

export function startMoonDive(state, camera, controls, moonMesh, onChange) {
  if (!moonMesh || state.dive || state.inside) return
  const world = new THREE.Vector3()
  moonMesh.getWorldPosition(world)
  state.savedCam = {
    pos: camera.position.clone(),
    target: controls.target.clone(),
    minDistance: controls.minDistance,
    maxDistance: controls.maxDistance,
    autoRotate: controls.autoRotate,
    autoRotateSpeed: controls.autoRotateSpeed
  }
  controls.enabled = false
  controls.autoRotate = false
  const toCam = camera.position.clone().sub(world).normalize()
  const stopDist = MOON_RADIUS * 2.4
  const toPos = world.clone().add(toCam.multiplyScalar(stopDist))
  state.dive = {
    kind: 'enter',
    fromPos: camera.position.clone(),
    toPos,
    fromTarget: controls.target.clone(),
    toTarget: world.clone(),
    progress: 0
  }
  onChange?.('start', MOON_META)
}

export function exitMoonDive(state, camera, controls, onChange, instant = false) {
  state.dive = null
  state.inside = false
  controls.enabled = true
  if (state.savedCam) {
    controls.minDistance = state.savedCam.minDistance
    controls.maxDistance = state.savedCam.maxDistance
    controls.autoRotate = state.savedCam.autoRotate
    controls.autoRotateSpeed = state.savedCam.autoRotateSpeed
    if (instant) {
      camera.position.copy(state.savedCam.pos)
      controls.target.copy(state.savedCam.target)
      controls.update()
      onChange?.('exit', null)
    } else {
      state.dive = {
        kind: 'exit',
        fromPos: camera.position.clone(),
        toPos: state.savedCam.pos.clone(),
        fromTarget: controls.target.clone(),
        toTarget: state.savedCam.target.clone(),
        progress: 0
      }
      controls.enabled = false
      onChange?.('exit', null)
    }
  } else {
    onChange?.('exit', null)
  }
}

/** 每帧更新坠入动画；返回 true 表示本帧已处理相机、可跳过部分默认逻辑 */
export function updateMoonDive(state, camera, controls, moonMesh, onChange) {
  if (!state.dive) {
    // 在月球模式跟随月球位置（月球仍在轨道运动时）
    if (state.inside && moonMesh) {
      const world = new THREE.Vector3()
      moonMesh.getWorldPosition(world)
      controls.target.lerp(world, 0.08)
    }
    return state.inside
  }

  state.dive.progress = Math.min(1, state.dive.progress + 0.014)
  const p = state.dive.progress
  const e = p * p * (state.dive.kind === 'enter' ? 1.1 : 1)
  const t = Math.min(1, e)
  camera.position.lerpVectors(state.dive.fromPos, state.dive.toPos, t)
  controls.target.lerpVectors(state.dive.fromTarget, state.dive.toTarget, t)
  camera.lookAt(controls.target)

  if (p >= 1) {
    if (state.dive.kind === 'enter') {
      state.inside = true
      const world = new THREE.Vector3()
      moonMesh.getWorldPosition(world)
      controls.target.copy(world)
      camera.position.copy(state.dive.toPos)
      controls.enabled = true
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.55
      controls.minDistance = MOON_RADIUS * 1.15
      controls.maxDistance = MOON_RADIUS * 8
      onChange?.('inside', MOON_META)
    } else {
      controls.enabled = true
      onChange?.('exit', null)
    }
    state.dive = null
  }
  return true
}

/** 投影月球屏幕坐标，供 HUD「点击进入」 */
export function projectMoonLabel(canvas, camera, moonMesh) {
  if (!moonMesh || !canvas) return null
  const width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth
  const height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight
  const tmp = new THREE.Vector3()
  moonMesh.getWorldPosition(tmp)
  const camDir = camera.getWorldDirection(new THREE.Vector3())
  const toObj = tmp.clone().sub(camera.position).normalize()
  const facing = toObj.dot(camDir)
  if (facing < 0.05) return null
  tmp.project(camera)
  if (tmp.z > 1) return null
  const x = (tmp.x * 0.5 + 0.5) * width
  const y = (-tmp.y * 0.5 + 0.5) * height
  if (x < -20 || y < -20 || x > width + 20 || y > height + 20) return null
  return {
    kind: 'moon',
    id: 'moon',
    name: MOON_META.name,
    sub: MOON_META.type,
    distText: MOON_META.note,
    x,
    y,
    opacity: Math.min(1, Math.max(0.25, facing)),
    clickable: true
  }
}
