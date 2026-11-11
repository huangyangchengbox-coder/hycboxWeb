import * as THREE from 'three'
import { getSoftTexture } from './textures.js'

export const ATOMS = [
  { id: 'H', name: '氢', z: 1, mass: 1, shells: [1], text: '最轻的元素。太阳发光，靠的是氢的聚变。' },
  { id: 'C', name: '碳', z: 6, mass: 12, shells: [2, 4], text: '有机分子的骨架。你身体里的碳，来自更早恒星的爆发。' },
  { id: 'N', name: '氮', z: 7, mass: 14, shells: [2, 5], text: '蛋白质和核酸里都有氮。空气里大部分是氮气。' },
  { id: 'O', name: '氧', z: 8, mass: 16, shells: [2, 6], text: '水和氧气里都有它。细胞呼吸会用到氧。' },
  { id: 'Na', name: '钠', z: 11, mass: 23, shells: [2, 8, 1], text: '钠原子容易失去最外层那 1 个电子，变成 Na⁺。食盐就是钠离子和氯离子组成的。' },
  { id: 'Mg', name: '镁', z: 12, mass: 24, shells: [2, 8, 2], text: '叶绿素里有镁。这里只作为生命元素出现。' },
  { id: 'P', name: '磷', z: 15, mass: 31, shells: [2, 8, 5], text: 'DNA 的磷酸骨架、以及 ATP 里都有磷。' },
  { id: 'S', name: '硫', z: 16, mass: 32, shells: [2, 8, 6], text: '部分氨基酸含硫，蛋白质的立体形状会用到它。' },
  { id: 'Cl', name: '氯', z: 17, mass: 35, shells: [2, 8, 7], text: '氯原子倾向于再得到 1 个电子。食盐里的氯以离子形式存在。' },
  { id: 'Ca', name: '钙', z: 20, mass: 40, shells: [2, 8, 8, 2], text: '骨骼和牙齿里有大量钙盐，细胞信号也会用到钙离子。' }
]

const CARBON_ISOTOPES = {
  12: 'C-12 最常见，6 个质子配 6 个中子。',
  13: 'C-13 稳定，只是多了 1 个中子。',
  14: 'C-14 会衰变。考古用它估计曾经活过的样本大约有多久，这里只保留这一句。'
}

export function isotopeNote(id, mass) {
  if (id !== 'C') return ''
  return CARBON_ISOTOPES[mass] || ''
}

export function createAtomRig() {
  const protonGeo = new THREE.SphereGeometry(0.11, 12, 10)
  const neutronGeo = new THREE.SphereGeometry(0.11, 12, 10)
  protonGeo.userData.shared = true
  neutronGeo.userData.shared = true
  const protonMat = new THREE.MeshStandardMaterial({
    color: '#ff5d86',
    emissive: '#ff5d86',
    emissiveIntensity: 0.35,
    roughness: 0.45
  })
  const neutronMat = new THREE.MeshStandardMaterial({
    color: '#d9d6ee',
    emissive: '#9d99c4',
    emissiveIntensity: 0.18,
    roughness: 0.5
  })
  const cloudMat = new THREE.PointsMaterial({
    map: getSoftTexture(),
    color: '#8cffdf',
    size: 0.22,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  })
  const root = new THREE.Group()
  const nucleus = new THREE.Group()
  const glowMat = new THREE.SpriteMaterial({
    map: getSoftTexture(),
    color: '#ff7aa2',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.35
  })
  const glow = new THREE.Sprite(glowMat)
  glow.scale.setScalar(1.3)
  nucleus.add(glow)
  root.add(nucleus)
  let cloud = null
  let base = null
  let phases = null
  let drawCount = 0

  function clearNucleus() {
    for (let i = nucleus.children.length - 1; i >= 0; i -= 1) {
      const child = nucleus.children[i]
      if (child === glow) continue
      nucleus.remove(child)
    }
  }

  function placeNucleons(protons, neutrons) {
    clearNucleus()
    const total = Math.max(1, protons + neutrons)
    const radius = 0.16 + Math.sqrt(total) * 0.045
    let index = 0
    let protonsLeft = protons
    let neutronsLeft = neutrons
    for (let i = 0; i < protons + neutrons; i += 1) {
      const proton = protonsLeft >= neutronsLeft && protonsLeft > 0
      if (proton) protonsLeft -= 1
      else neutronsLeft -= 1
      const mesh = new THREE.Mesh(proton ? protonGeo : neutronGeo, proton ? protonMat : neutronMat)
      if (total === 1) mesh.position.set(0, 0, 0)
      else {
        const y = 1 - (index / (total - 1)) * 2
        const ring = Math.sqrt(Math.max(0, 1 - y * y))
        const theta = index * 2.399963
        mesh.position.set(Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius)
      }
      index += 1
      nucleus.add(mesh)
    }
  }

  function buildCloud(shells, quality) {
    if (cloud) {
      root.remove(cloud)
      cloud.geometry.dispose()
    }
    const budget = quality === 'low' ? 70 : 160
    const electrons = shells.reduce((sum, value) => sum + value, 0) || 1
    const positions = []
    const phase = []
    shells.forEach((count, shell) => {
      const samples = Math.max(6, Math.round(budget * count / electrons))
      const radius = 0.9 + shell * 0.78
      for (let i = 0; i < samples; i += 1) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const spread = radius * (0.78 + Math.random() * 0.4)
        positions.push(
          spread * Math.sin(phi) * Math.cos(theta),
          spread * Math.cos(phi),
          spread * Math.sin(phi) * Math.sin(theta)
        )
        phase.push(Math.random() * Math.PI * 2)
      }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    cloud = new THREE.Points(geo, cloudMat)
    base = geo.attributes.position.array.slice()
    phases = phase
    drawCount = positions.length / 3
    root.add(cloud)
  }

  function setSpec(spec, quality = 'high') {
    placeNucleons(spec.z, Math.max(0, spec.neutrons))
    buildCloud(spec.shells, quality)
    nucleus.userData.pick = {
      id: `atom-${spec.id}`,
      name: spec.charge === '+1' ? `${spec.name}离子` : spec.name,
      nameEn: spec.id,
      kind: '原子核',
      summary: '中心是质子和中子。周围的雾是电子概率云，不是行星轨道。',
      facts: [
        ['质子', String(spec.z)],
        ['中子', String(Math.max(0, spec.neutrons))],
        ['电子排布', spec.shells.join('-')],
        ['电荷', spec.charge || '0']
      ]
    }
    nucleus.userData.label = spec.id
  }

  function setQuality(quality, spec) {
    if (spec) buildCloud(spec.shells, quality)
    glow.visible = quality !== 'low'
  }

  function tick(time, reduced) {
    if (!cloud || reduced) return
    const arr = cloud.geometry.attributes.position.array
    const amp = 0.045
    for (let i = 0; i < drawCount; i += 1) {
      const phase = phases[i]
      arr[i * 3] = base[i * 3] + Math.sin(time * 0.65 + phase) * amp
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.cos(time * 0.5 + phase) * amp
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.sin(time * 0.4 + phase * 1.3) * amp
    }
    cloud.geometry.attributes.position.needsUpdate = true
  }

  function dispose() {
    cloud?.geometry.dispose()
    protonGeo.dispose()
    neutronGeo.dispose()
    protonMat.dispose()
    neutronMat.dispose()
    cloudMat.dispose()
    glowMat.dispose()
  }

  return { group: root, setSpec, setQuality, tick, dispose }
}
