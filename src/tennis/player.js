import * as THREE from 'three'

/** 关节层级：根 → 腿 / 躯干枢轴 → 头 / 两肩 → 肘 → 球拍。 */
export function buildPlayer({
  shirt = 0x2563eb,
  shorts = 0xf8fafc,
  skin = 0xffd1b3,
  shoe = 0x1e293b,
  facingNet = true
} = {}) {
  const group = new THREE.Group()
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }

  const shirtMat = track(new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.5 }))
  const shortsMat = track(new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.62 }))
  const skinMat = track(new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }))
  const shoeMat = track(new THREE.MeshStandardMaterial({ color: shoe, roughness: 0.5 }))

  if (facingNet) group.rotation.y = Math.PI

  const legs = [-0.15, 0.15].map((x) => {
    const hip = new THREE.Group()
    hip.position.set(x, 0.76, 0)
    const thigh = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.11, 0.26, 12)), shortsMat)
    thigh.position.y = -0.12
    thigh.castShadow = true
    hip.add(thigh)
    const calf = new THREE.Mesh(track(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 12)), skinMat)
    calf.position.y = -0.44
    calf.castShadow = true
    hip.add(calf)
    const foot = new THREE.Mesh(track(new THREE.BoxGeometry(0.16, 0.11, 0.28)), shoeMat)
    foot.position.set(0, -0.7, -0.05)
    foot.castShadow = true
    hip.add(foot)
    group.add(hip)
    return hip
  })

  const torsoPivot = new THREE.Group()
  torsoPivot.position.set(0, 0.76, 0)
  group.add(torsoPivot)
  const torso = new THREE.Mesh(track(new THREE.BoxGeometry(0.52, 0.66, 0.28)), shirtMat)
  torso.position.y = 0.33
  torso.castShadow = true
  torsoPivot.add(torso)

  const head = new THREE.Group()
  head.position.set(0, 0.86, 0)
  const skull = new THREE.Mesh(track(new THREE.SphereGeometry(0.2, 20, 16)), skinMat)
  skull.castShadow = true
  head.add(skull)
  const cap = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.206, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
    shirtMat
  )
  cap.rotation.x = -0.15
  head.add(cap)
  const visor = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.03, 0.22)), shirtMat)
  visor.position.set(0, 0.05, -0.18)
  visor.rotation.x = 0.15
  head.add(visor)
  torsoPivot.add(head)

  const leftShoulder = new THREE.Group()
  leftShoulder.position.set(-0.34, 0.58, 0)
  const leftArm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.075, 0.065, 0.54, 12)), skinMat)
  leftArm.rotation.z = Math.PI / 2
  leftArm.position.set(-0.27, 0, -0.06)
  leftArm.castShadow = true
  leftShoulder.add(leftArm)
  torsoPivot.add(leftShoulder)

  const rightShoulder = new THREE.Group()
  rightShoulder.position.set(0.34, 0.58, 0)
  torsoPivot.add(rightShoulder)
  const upper = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 12)), skinMat)
  upper.rotation.z = -Math.PI / 2
  upper.position.set(0.16, 0, 0)
  upper.castShadow = true
  rightShoulder.add(upper)

  const elbow = new THREE.Group()
  elbow.position.set(0.3, 0, 0)
  elbow.rotation.y = 0.22
  rightShoulder.add(elbow)
  const forearm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 12)), skinMat)
  forearm.rotation.z = -Math.PI / 2
  forearm.position.set(0.15, 0, 0)
  forearm.castShadow = true
  elbow.add(forearm)

  return {
    group,
    legs,
    torsoPivot,
    head,
    leftShoulder,
    rightShoulder,
    elbow,
    dispose() {
      disposables.forEach((item) => item.dispose())
      group.removeFromParent()
    }
  }
}
