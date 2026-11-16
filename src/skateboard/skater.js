import * as THREE from 'three'

/**
 * 滑手骨架 —— "两点骨"方案：大腿 / 小腿是髋-膝、膝-踝两点间的连线圆柱，
 * 姿态由少量标量（crouch 蹲深 / bodyPitch 前后倾 / bodyRoll 左右倾 / armSpread 张臂）
 * 程序化摆放，不依赖关节欧拉角关键帧（滑板动作的视觉重点是"重心在哪"，两点骨足够表意且稳定）。
 *
 * 滑手根节点挂在滑板 group 之外的世界系（板倾斜时滑手只部分跟随），
 * 双踝锚定在板面上（随板俯仰/压板转动），髋部位置由蹲深决定。
 */

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

/** 在 a、b 两点间摆一根圆柱（半径 r），返回引用以便每帧更新。 */
function makeBone(mat, r) {
  const geo = new THREE.CapsuleGeometry(r, 1, 6, 12)
  const mesh = new THREE.Mesh(geo, mat)
  mesh.castShadow = true
  return mesh
}

function setBone(mesh, a, b, r) {
  const dir = V().subVectors(b, a)
  const len = Math.max(0.02, dir.length())
  mesh.position.copy(a).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(V(0, 1, 0), dir.clone().normalize())
  mesh.scale.set(1, len, 1)
  void r
}

export function buildSkater({ shirt = 0x1f3a5f, pants = 0x2b3444, skin = 0xe8b48f } = {}) {
  const group = new THREE.Group()
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }
  const shirtMat = track(new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.55 }))
  const pantsMat = track(new THREE.MeshStandardMaterial({ color: pants, roughness: 0.7 }))
  const skinMat = track(new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 }))

  const bones = {
    thighF: makeBone(pantsMat, 0.055),
    shinF: makeBone(skinMat, 0.042),
    thighR: makeBone(pantsMat, 0.055),
    shinR: makeBone(skinMat, 0.042),
    torso: makeBone(shirtMat, 0.09),
    armF: makeBone(shirtMat, 0.035),
    armR: makeBone(shirtMat, 0.035)
  }
  for (const key of Object.keys(bones)) group.add(bones[key])

  const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.095, 18, 14)), skinMat)
  head.castShadow = true
  group.add(head)

  // 重心质点（CoM）—— 本模块的主角
  const com = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.045, 16, 12)),
    track(new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.75, roughness: 0.3 }))
  )
  group.add(com)

  // 重心垂线（CoM → 地面）
  const dropGeo = track(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 1, 0)]))
  const dropMat = track(new THREE.LineDashedMaterial({ color: 0xfacc15, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.85 }))
  const dropLine = new THREE.Line(dropGeo, dropMat)
  dropLine.computeLineDistances()
  group.add(dropLine)

  return { group, bones, head, com, dropLine, dispose() { disposables.forEach((d) => d.dispose()); group.removeFromParent() } }
}

/**
 * 每帧摆放滑手。输入全部为世界坐标：
 *   boardX     板中心世界 x（演示台上板固定在原点附近）
 *   ankleF/R   前/后脚踝世界坐标（踩在板面上，随板俯仰转动）
 *   comX       重心世界 x（滑块驱动）
 *   pose       { crouch, bodyPitch, bodyRoll, armSpread }（trick 播放时来自关键帧）
 */
export function poseSkater(sk, { ankleF, ankleR, comX, pose }) {
  const crouch = pose.crouch
  const lean = pose.bodyRoll
  const pitch = pose.bodyPitch

  // 髋部：高度随蹲深，水平位置随重心（滑手整体随重心前后移动）
  const hipY = 0.92 - crouch * 0.34
  const hipX = comX
  const hipZ = 0
  const hip = V(hipX, hipY, hipZ)

  // 膝盖：髋踝中点向前（+x）偏移，蹲得越深前顶越多（模拟屈膝）
  const kneeBias = 0.1 + crouch * 0.16
  const kneeF = V().addVectors(hip, ankleF).multiplyScalar(0.5).add(V(kneeBias, -0.02, 0.03))
  const kneeR = V().addVectors(hip, ankleR).multiplyScalar(0.5).add(V(kneeBias, -0.02, -0.03))

  setBone(sk.bones.thighF, hip.clone().add(V(0, 0, 0.05)), kneeF, 0.055)
  setBone(sk.bones.shinF, kneeF, ankleF, 0.042)
  setBone(sk.bones.thighR, hip.clone().add(V(0, 0, -0.05)), kneeR, 0.055)
  setBone(sk.bones.shinR, kneeR, ankleR, 0.042)

  // 躯干：从髋向上，带前后倾与左右倾
  const torsoLen = 0.52
  const up = V(
    Math.sin(pitch) * 0.8 + Math.sin(lean) * 0.5,
    Math.cos(lean * 0.8),
    Math.sin(lean) * 0.8
  ).normalize()
  const chest = hip.clone().addScaledVector(up, torsoLen)
  setBone(sk.bones.torso, hip, chest, 0.09)

  // 头：躯干顶端再往上
  sk.head.position.copy(chest).addScaledVector(up, 0.14)

  // 双臂：从肩（躯干 80% 处）向两侧展开，张臂越大越平
  const shoulder = hip.clone().addScaledVector(up, torsoLen * 0.8)
  const spread = pose.armSpread
  const armLen = 0.42
  const armF = shoulder.clone().add(
    V(pitch * 0.15, Math.sin((1 - spread) * 1.1) * armLen * 0.8, armLen * (0.45 + spread * 0.55))
  )
  const armR = shoulder.clone().add(
    V(pitch * 0.15, Math.sin((1 - spread) * 1.1) * armLen * 0.8, -armLen * (0.45 + spread * 0.55))
  )
  setBone(sk.bones.armF, shoulder, armF, 0.035)
  setBone(sk.bones.armR, shoulder, armR, 0.035)

  // 重心质点与垂线
  const comY = hipY * 0.94 + 0.06
  sk.com.position.set(comX, comY, hipZ)
  const dropPos = sk.dropLine.geometry.attributes.position
  dropPos.setXYZ(0, comX, 0, hipZ)
  dropPos.setXYZ(1, comX, comY, hipZ)
  dropPos.needsUpdate = true
  sk.dropLine.computeLineDistances()
}
