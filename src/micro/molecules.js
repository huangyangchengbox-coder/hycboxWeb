import * as THREE from 'three'

export const ELEMENTS = {
  H: { name: '氢', color: '#f4f7f8', emissive: '#9bb0c4', radius: 0.32, valence: '1' },
  C: { name: '碳', color: '#4e5563', emissive: '#aeb6c6', radius: 0.5, valence: '4' },
  N: { name: '氮', color: '#3f66d4', emissive: '#8eabff', radius: 0.48, valence: '3' },
  O: { name: '氧', color: '#d43a2f', emissive: '#ff8d7a', radius: 0.46, valence: '2' },
  P: { name: '磷', color: '#e8a03c', emissive: '#ffd08a', radius: 0.55, valence: '3 或 5' },
  S: { name: '硫', color: '#e3d23c', emissive: '#fff3a0', radius: 0.55, valence: '2、4 或 6' }
}

const halfWater = (104.5 * Math.PI) / 180 / 2
const tetra = 1.05 / Math.sqrt(3)

function glucose() {
  const atoms = []
  const bonds = []
  const symbols = ['C', 'C', 'C', 'C', 'C', 'O']
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 2 - i * (Math.PI / 3)
    atoms.push({
      el: symbols[i],
      pos: [Math.cos(angle) * 1.15, Math.sin(angle) * 1.15, i % 2 ? 0.16 : -0.08]
    })
    bonds.push([i, (i + 1) % 6, 1])
  }
  for (let i = 0; i < 4; i += 1) {
    const pos = atoms[i].pos
    const len = Math.hypot(pos[0], pos[1]) || 1
    const index = atoms.length
    atoms.push({ el: 'O', pos: [pos[0] + pos[0] / len * 0.9, pos[1] + pos[1] / len * 0.9, pos[2]] })
    bonds.push([i, index, 1])
  }
  const carbon = atoms[4].pos
  const extra = atoms.length
  atoms.push({ el: 'C', pos: [carbon[0] + 0.15, carbon[1] + 0.95, carbon[2] + 0.25] })
  bonds.push([4, extra, 1])
  const oxygen = atoms.length
  atoms.push({ el: 'O', pos: [carbon[0] + 0.8, carbon[1] + 1.5, carbon[2]] })
  bonds.push([extra, oxygen, 1])
  return { atoms, bonds }
}

function benzene() {
  const atoms = []
  const bonds = []
  for (let i = 0; i < 6; i += 1) {
    const angle = i * (Math.PI / 3)
    atoms.push({ el: 'C', pos: [Math.cos(angle) * 1.05, Math.sin(angle) * 1.05, 0] })
    atoms.push({ el: 'H', pos: [Math.cos(angle) * 1.78, Math.sin(angle) * 1.78, 0] })
    bonds.push([i * 2, ((i + 1) % 6) * 2, i % 2 ? 1 : 2])
    bonds.push([i * 2, i * 2 + 1, 1])
  }
  return { atoms, bonds }
}

function caffeine() {
  const atoms = [
    { el: 'C', pos: [0, 0, 0] },
    { el: 'N', pos: [1.2, 0.55, 0] },
    { el: 'C', pos: [1.15, 1.9, 0] },
    { el: 'C', pos: [0, 2.55, 0] },
    { el: 'C', pos: [-1.2, 1.9, 0] },
    { el: 'C', pos: [-1.15, 0.55, 0] },
    { el: 'N', pos: [-2.25, 1.15, 0] },
    { el: 'C', pos: [-2.45, -0.15, 0] },
    { el: 'N', pos: [-1.35, -0.75, 0] },
    { el: 'O', pos: [2.2, 2.45, 0] },
    { el: 'O', pos: [-1.15, 3.75, 0] },
    { el: 'C', pos: [2.45, -0.15, 0] },
    { el: 'C', pos: [-3.55, 1.7, 0] },
    { el: 'C', pos: [-1.45, -2.15, 0] }
  ]
  const bonds = [
    [0, 1, 1], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1],
    [5, 6, 1], [6, 7, 1], [7, 8, 2], [8, 0, 1],
    [2, 9, 2], [4, 10, 2], [1, 11, 1], [6, 12, 1], [8, 13, 1]
  ]
  return { atoms, bonds }
}

export const MOLECULES = [
  {
    id: 'water',
    name: '水',
    formula: 'H₂O',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/962',
    text: '键角大约 104.5°，所以分子两端带电不均匀。这种极性让水分子之间形成氢键。',
    atoms: [
      { el: 'O', pos: [0, 0, 0] },
      { el: 'H', pos: [Math.sin(halfWater), -Math.cos(halfWater), 0] },
      { el: 'H', pos: [-Math.sin(halfWater), -Math.cos(halfWater), 0] }
    ],
    bonds: [[0, 1, 1], [0, 2, 1]]
  },
  {
    id: 'co2',
    name: '二氧化碳',
    formula: 'CO₂',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/280',
    text: '三个原子排成一条直线。呼出的气里有它，也是碳循环里的一环。',
    atoms: [
      { el: 'O', pos: [-1.16, 0, 0] },
      { el: 'C', pos: [0, 0, 0] },
      { el: 'O', pos: [1.16, 0, 0] }
    ],
    bonds: [[0, 1, 2], [1, 2, 2]]
  },
  {
    id: 'oxygen',
    name: '氧气',
    formula: 'O₂',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/977',
    text: '两个氧原子以双键相连。细胞呼吸会使用氧气。',
    atoms: [
      { el: 'O', pos: [-0.6, 0, 0] },
      { el: 'O', pos: [0.6, 0, 0] }
    ],
    bonds: [[0, 1, 2]]
  },
  {
    id: 'methane',
    name: '甲烷',
    formula: 'CH₄',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/297',
    text: '碳位于正四面体中心。它是最简单的有机分子之一。',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'H', pos: [tetra, tetra, tetra] },
      { el: 'H', pos: [tetra, -tetra, -tetra] },
      { el: 'H', pos: [-tetra, tetra, -tetra] },
      { el: 'H', pos: [-tetra, -tetra, tetra] }
    ],
    bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]]
  },
  {
    id: 'ethanol',
    name: '乙醇',
    formula: 'C₂H₆O',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/702',
    text: '日常酒精的分子。两个碳、一个羟基，键角做了简化。',
    atoms: [
      { el: 'C', pos: [0, 0, 0] },
      { el: 'C', pos: [1.28, 0, 0] },
      { el: 'O', pos: [1.95, 0.96, 0] },
      { el: 'H', pos: [-0.38, 0.9, 0.32] },
      { el: 'H', pos: [-0.38, -0.52, 0.78] },
      { el: 'H', pos: [-0.38, -0.38, -0.84] },
      { el: 'H', pos: [1.58, 0.2, -1.02] },
      { el: 'H', pos: [1.58, -0.92, 0.42] },
      { el: 'H', pos: [2.72, 0.62, 0.42] }
    ],
    bonds: [[0, 1, 1], [1, 2, 1], [0, 3, 1], [0, 4, 1], [0, 5, 1], [1, 6, 1], [1, 7, 1], [2, 8, 1]]
  },
  {
    id: 'glucose',
    name: '葡萄糖',
    formula: 'C₆H₁₂O₆',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/5793',
    text: '细胞常用的能量来源。这里是环状简化，氢原子没有画出来。',
    simplified: true,
    ...glucose()
  },
  {
    id: 'caffeine',
    name: '咖啡因',
    formula: 'C₈H₁₀N₄O₂',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/2519',
    text: '咖啡和茶里常见的分子。双环做了简化，氢原子没有画出来。',
    simplified: true,
    ...caffeine()
  },
  {
    id: 'benzene',
    name: '苯',
    formula: 'C₆H₆',
    href: 'https://pubchem.ncbi.nlm.nih.gov/compound/241',
    text: '六个碳围成环。单双键交替是凯库勒式画法，真实的芳香性是电子离域，不是固定的单双键。',
    ...benzene()
  }
]

export function createMoleculeKit() {
  const geos = new Map()
  const mats = new Map()
  const bondGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 8, 1)
  bondGeo.userData.shared = true
  const bondMat = new THREE.MeshStandardMaterial({
    color: '#d7deea',
    emissive: '#8d98ad',
    emissiveIntensity: 0.12,
    roughness: 0.4
  })
  const hydrogenMat = new THREE.MeshStandardMaterial({
    color: '#9ff6ff',
    emissive: '#9ff6ff',
    emissiveIntensity: 0.4,
    transparent: true,
    opacity: 0.45,
    roughness: 0.3
  })
  const up = new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const mid = new THREE.Vector3()

  function geometryFor(el) {
    const radius = ELEMENTS[el].radius
    const key = radius.toFixed(2)
    if (!geos.has(key)) {
      const geo = new THREE.SphereGeometry(radius, 20, 14)
      geo.userData.shared = true
      geos.set(key, geo)
    }
    return geos.get(key)
  }

  function materialFor(el) {
    if (!mats.has(el)) {
      const spec = ELEMENTS[el]
      mats.set(el, new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.emissive,
        emissiveIntensity: 0.28,
        roughness: 0.42
      }))
    }
    return mats.get(el)
  }

  function addBond(group, a, b, order) {
    dir.subVectors(b, a)
    const length = dir.length()
    if (length < 0.05) return
    dir.multiplyScalar(1 / length)
    mid.copy(a).add(b).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir)
    side.set(1, 0, 0).applyQuaternion(quat)
    if (Math.abs(side.dot(dir)) > 0.9) side.set(0, 0, 1).applyQuaternion(quat)
    const offsets = order > 1 ? [-0.09, 0.09] : [0]
    offsets.forEach((offset) => {
      const mesh = new THREE.Mesh(bondGeo, bondMat)
      mesh.position.copy(mid).addScaledVector(side, offset)
      mesh.quaternion.copy(quat)
      mesh.scale.y = Math.max(0.15, length - 0.25)
      group.add(mesh)
    })
  }

  function build(def) {
    const group = new THREE.Group()
    group.name = def.id
    const points = def.atoms.map((atom) => new THREE.Vector3(...atom.pos))
    def.atoms.forEach((atom, index) => {
      const mesh = new THREE.Mesh(geometryFor(atom.el), materialFor(atom.el))
      mesh.position.copy(points[index])
      const element = ELEMENTS[atom.el]
      mesh.userData.pick = {
        id: `${def.id}-${index}`,
        name: element.name,
        nameEn: atom.el,
        kind: def.name,
        summary: `${def.formula} 里的${element.name}。常见共价数是 ${element.valence}。配色是 CPK 惯例，不是真实颜色。`,
        facts: [
          ['分子', def.name],
          ['分子式', def.formula],
          ['元素', atom.el],
          ['常见共价数', element.valence]
        ]
      }
      mesh.userData.label = atom.el
      group.add(mesh)
    })
    def.bonds.forEach(([left, right, order]) => {
      addBond(group, points[left], points[right], order)
    })
    return group
  }

  function buildWaterNetwork() {
    const spots = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1.7, 1.15, 0.2),
      new THREE.Vector3(-1.45, 1.05, 0.55),
      new THREE.Vector3(0.25, -0.35, 1.75)
    ]
    const group = new THREE.Group()
    group.name = 'water-net'
    const waters = spots.map((spot) => {
      const water = build(MOLECULES[0])
      water.position.copy(spot)
      if (spot.lengthSq() > 0.04) water.lookAt(0, 0, 0)
      group.add(water)
      return water
    })
    const links = []
    for (let i = 0; i < spots.length; i += 1) {
      for (let j = i + 1; j < spots.length; j += 1) {
        if (spots[i].distanceTo(spots[j]) > 2.4) continue
        const mesh = new THREE.Mesh(bondGeo, hydrogenMat)
        dir.subVectors(spots[j], spots[i])
        const length = dir.length()
        dir.multiplyScalar(1 / length)
        mesh.position.copy(spots[i]).add(spots[j]).multiplyScalar(0.5)
        mesh.quaternion.setFromUnitVectors(up, dir)
        mesh.scale.set(0.45, length, 0.45)
        group.add(mesh)
        links.push(mesh)
      }
    }
    group.userData.waters = waters
    group.userData.links = links
    return group
  }

  function dispose() {
    bondGeo.dispose()
    bondMat.dispose()
    hydrogenMat.dispose()
    geos.forEach((geo) => geo.dispose())
    mats.forEach((mat) => mat.dispose())
  }

  return { build, buildWaterNetwork, dispose }
}
