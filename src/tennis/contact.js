import * as THREE from 'three'

const _origin = new THREE.Vector3()
const _shifted = new THREE.Vector3()

/** 击球窗口权重：hit 处为 1，向前 reach、向后 release 平滑收到 0。t 与 hit 同一单位。 */
export function strikeWeight(t, hit, reach, release) {
  const start = hit - reach
  const end = hit + release
  if (t <= start || t >= end) return 0
  if (t < hit) {
    const u = (t - start) / Math.max(reach, 1e-4)
    return u * u * (3 - 2 * u)
  }
  const u = (t - hit) / Math.max(release, 1e-4)
  const s = u * u * (3 - 2 * u)
  return 1 - s
}

/**
 * 平移 root，使已经采样好的 pointWorld 朝 targetWorld 移动。
 * 姿态先写好 rest 位置，再调用本函数；权重 0 时保持原位。
 */
export function shiftRootOnto(root, pointWorld, targetWorld, weight) {
  if (weight <= 0) return
  root.getWorldPosition(_origin)
  _shifted.copy(targetWorld).sub(pointWorld).multiplyScalar(weight).add(_origin)
  if (root.parent) root.parent.worldToLocal(_shifted)
  root.position.copy(_shifted)
}
