import * as THREE from 'three'

const SEQUENCE = 'ATGCTTAGGCCTAAGGTCCATGCAAGCTGA'
const COMPLEMENT = { A: 'T', T: 'A', G: 'C', C: 'G' }
const BASE_COLOR = { A: '#ffb15a', T: '#ffe08a', G: '#3ee0c2', C: '#7aa7ff' }
const BONDS = { A: 2, T: 2, G: 3, C: 3 }

function helixPoint(index, phase, count) {
  const angle = (index / 10) * Math.PI * 2 + phase
  const y = index * 0.34 - (count * 0.34) / 2
  return new THREE.Vector3(Math.cos(angle), y, Math.sin(angle))
}

function backbone(points, color) {
  const curve = new THREE.CatmullRomCurve3(points)
  const geo = new THREE.TubeGeometry(curve, points.length * 3, 0.07, 6, false)
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.35
  })
  return new THREE.Mesh(geo, mat)
}

function baseMesh(points, letters) {
  const geo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6, 1)
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.4,
    vertexColors: false
  })
  const mesh = new THREE.InstancedMesh(geo, mat, points.length)
  const color = new THREE.Color()
  const dummy = new THREE.Object3D()
  const up = new THREE.Vector3(0, 1, 0)
  points.forEach((point, index) => {
    const end = point.center
    dummy.position.copy(point.start).add(end).multiplyScalar(0.5)
    dummy.quaternion.setFromUnitVectors(up, point.dir)
    dummy.scale.set(1, point.length, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
    color.set(BASE_COLOR[letters[index]])
    mesh.setColorAt(index, color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}

function bondMesh(items) {
  const geo = new THREE.SphereGeometry(0.045, 8, 6)
  const mat = new THREE.MeshStandardMaterial({
    color: '#f4fbff',
    emissive: '#f4fbff',
    emissiveIntensity: 0.25,
    roughness: 0.3
  })
  const mesh = new THREE.InstancedMesh(geo, mat, items.length)
  const dummy = new THREE.Object3D()
  items.forEach((item, index) => {
    dummy.position.copy(item)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export function createDnaRig() {
  const count = SEQUENCE.length
  const strandA = new THREE.Group()
  const strandB = new THREE.Group()
  const root = new THREE.Group()
  const pointsA = []
  const pointsB = []
  const lettersA = []
  const lettersB = []
  const bonds = []
  const curveA = []
  const curveB = []
  for (let i = 0; i < count; i += 1) {
    const a = helixPoint(i, 0, count)
    const b = helixPoint(i, Math.PI, count)
    const mid = a.clone().add(b).multiplyScalar(0.5)
    const dirA = mid.clone().sub(a)
    const length = dirA.length()
    dirA.multiplyScalar(1 / length)
    pointsA.push({ start: a, center: mid, dir: dirA.clone(), length })
    const dirB = mid.clone().sub(b)
    const lengthB = dirB.length()
    dirB.multiplyScalar(1 / lengthB)
    pointsB.push({ start: b, center: mid, dir: dirB.clone(), length: lengthB })
    lettersA.push(SEQUENCE[i])
    lettersB.push(COMPLEMENT[SEQUENCE[i]])
    curveA.push(a)
    curveB.push(b)
    const bondCount = BONDS[SEQUENCE[i]]
    for (let n = 0; n < bondCount; n += 1) {
      const t = bondCount === 2 ? (n === 0 ? 0.42 : 0.58) : 0.38 + n * 0.12
      bonds.push(a.clone().lerp(b, t))
    }
  }
  strandA.add(backbone(curveA, '#ff4fa3'))
  strandB.add(backbone(curveB, '#67e7ff'))
  const basesA = baseMesh(pointsA, lettersA)
  const basesB = baseMesh(pointsB, lettersB)
  const copyA = baseMesh(pointsB.map((point) => ({
    start: point.start.clone().lerp(point.center, 0.15),
    center: point.center,
    dir: point.dir,
    length: point.length * 0.85
  })), lettersB)
  const copyB = baseMesh(pointsA.map((point) => ({
    start: point.start.clone().lerp(point.center, 0.15),
    center: point.center,
    dir: point.dir,
    length: point.length * 0.85
  })), lettersA)
  ;[copyA, copyB].forEach((mesh) => {
    mesh.material = mesh.material.clone()
    mesh.material.transparent = true
    mesh.material.opacity = 0
    mesh.material.depthWrite = false
  })
  strandA.add(basesA, copyA)
  strandB.add(basesB, copyB)
  const hbonds = bondMesh(bonds)
  root.add(strandA, strandB, hbonds)
  const mrnaPoints = []
  for (let i = 8; i < 20; i += 1) {
    const point = helixPoint(i, 0.4, count)
    point.z += 0.8
    mrnaPoints.push(point)
  }
  const mrna = backbone(mrnaPoints, '#d56bff')
  mrna.material = mrna.material.clone()
  mrna.material.transparent = true
  mrna.material.opacity = 0
  mrna.visible = false
  root.add(mrna)
  root.userData.pick = {
    id: 'dna',
    name: 'B-DNA 片段',
    nameEn: 'B-DNA',
    kind: '双螺旋',
    summary: '右手双螺旋示意。每圈大约 10 个碱基对，螺距按 3.4 nm 的比例来排。A-T 两条氢键，G-C 三条。',
    facts: [
      ['碱基对', '30，教学片段'],
      ['每圈', '约 10 对'],
      ['直径', '真实约 2 nm'],
      ['基因组', '人类约 30 亿对，拉直约 2 米']
    ]
  }

  let open = 0
  let action = 'rest'
  let playing = false

  function apply() {
    strandB.position.x = open * 1.8
    copyA.material.opacity = open
    copyB.material.opacity = open
    copyA.visible = open > 0.04
    copyB.visible = open > 0.04
    hbonds.material.opacity = 1 - open
    hbonds.material.transparent = true
    hbonds.visible = open < 0.96
    const showRna = action === 'transcribe'
    mrna.visible = showRna
    mrna.material.opacity = showRna ? Math.min(1, open * 1.6) : 0
  }

  function setAction(next) {
    action = next
    if (next === 'rest') open = 0
    apply()
  }

  function setOpen(value) {
    open = Math.min(1, Math.max(0, value))
    apply()
  }

  function setPlaying(value) {
    playing = value
  }

  function tick(dt, reduced) {
    if (!playing || reduced) return
    open += dt / 8
    if (action === 'transcribe') open = Math.min(open, 0.55)
    else if (open > 1) open = 0
    apply()
  }

  function dispose() {
    root.traverse((obj) => {
      if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.()
      if (obj.material && !obj.material.userData?.shared) obj.material.dispose?.()
    })
  }

  apply()
  return { group: root, setAction, setOpen, setPlaying, tick, dispose }
}
