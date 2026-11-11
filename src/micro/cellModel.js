import * as THREE from 'three'
import { getSoftTexture } from './textures.js'

function organelle(mesh, id, name, summary) {
  mesh.userData.pick = {
    id,
    name,
    nameEn: id.toUpperCase(),
    kind: '细胞器',
    summary,
    facts: [['比例', '艺术化调整，不是显微测量']]
  }
  mesh.userData.label = name
  return mesh
}

function plastic(color, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: opacity < 1 ? 0.2 : 0.35,
    roughness: 0.4,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: opacity < 1 ? THREE.DoubleSide : THREE.FrontSide
  })
}

export function createCellRig() {
  const group = new THREE.Group()
  const membrane = new THREE.Mesh(new THREE.SphereGeometry(3.15, 36, 24), plastic('#7dffe8', 0.14))
  membrane.userData.label = '细胞膜'
  membrane.userData.pick = {
    id: 'membrane',
    name: '细胞膜',
    nameEn: 'MEMBRANE',
    kind: '细胞边界',
    summary: '半透膜把细胞和外面分开。这里画成一层发光的壳。',
    facts: [['植物', '外面还会再加一层细胞壁']]
  }
  const nucleus = organelle(
    new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 20), plastic('#ff7ad9')),
    'nucleus',
    '细胞核',
    '遗传信息主要存放在这里。人类基因组拉直约 2 米，却装在直径大约 6 μm 的核里。'
  )
  nucleus.position.set(0.15, 0.2, 0)
  const nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), plastic('#ffe08a'))
  nucleolus.position.set(0.2, 0.15, 0.25)
  const mitoMat = plastic('#ff8b6a')
  const mitoA = organelle(new THREE.Mesh(new THREE.SphereGeometry(0.46, 18, 14), mitoMat), 'mito', '线粒体', '进行能量转换，常被叫做细胞的发电站。里面的褶皱是嵴的示意。')
  mitoA.scale.set(1.35, 0.72, 0.72)
  mitoA.position.set(1.55, -0.7, 0.35)
  const crista = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 6, 14), plastic('#ffd0c2'))
  crista.rotation.x = Math.PI / 2.4
  mitoA.add(crista)
  const mitoB = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), mitoMat)
  mitoB.scale.set(1.4, 0.7, 0.7)
  mitoB.position.set(-1.35, -1.15, -0.4)
  const erCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 1.15, 0.2),
    new THREE.Vector3(0.8, 1.35, 0.6),
    new THREE.Vector3(1.35, 0.7, 0.15),
    new THREE.Vector3(0.9, 0.15, -0.45)
  ])
  const er = organelle(
    new THREE.Mesh(new THREE.TubeGeometry(erCurve, 24, 0.08, 6, false), plastic('#8eb6ff')),
    'er',
    '内质网',
    '折叠的膜系统，和蛋白质、脂质的加工有关。这里只画了一小段管子。'
  )
  const golgiPick = {
    id: 'golgi',
    name: '高尔基体',
    nameEn: 'GOLGI',
    kind: '细胞器',
    summary: '一叠扁平的膜囊，负责分拣和包装。',
    facts: [['比例', '艺术化调整，不是显微测量']]
  }
  const golgi = new THREE.Group()
  for (let i = 0; i < 4; i += 1) {
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.42), plastic('#c9a6ff'))
    sheet.position.set(-1.45, 0.15 + i * 0.16, 0.35)
    sheet.rotation.z = -0.25
    sheet.userData.pick = golgiPick
    if (i === 0) sheet.userData.label = '高尔基体'
    golgi.add(sheet)
  }
  const lysosome = organelle(
    new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), plastic('#ffd15c')),
    'lysosome',
    '溶酶体',
    '里面有消化酶，用来分解细胞回收的物质。'
  )
  lysosome.position.set(-0.35, -1.35, 0.85)
  const ribosomes = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      map: getSoftTexture(),
      color: '#f4fbff',
      size: 0.08,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  )
  const ribPositions = []
  for (let i = 0; i < 40; i += 1) {
    ribPositions.push(0.4 + Math.random() * 1.1, 0.2 + Math.random() * 1.1, -0.2 + Math.random() * 0.8)
  }
  ribosomes.geometry.setAttribute('position', new THREE.Float32BufferAttribute(ribPositions, 3))
  const wall = new THREE.Mesh(new THREE.SphereGeometry(3.55, 28, 20), plastic('#d6f5a8', 0.16))
  wall.visible = false
  organelle(wall, 'wall', '细胞壁', '植物、真菌和细菌可以有细胞壁。动物细胞没有。')
  const vacuole = organelle(
    new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 18), plastic('#7af0c2', 0.18)),
    'vacuole',
    '中央液泡',
    '成熟植物细胞常常有一个很大的液泡，用来储水和维持膨压。'
  )
  vacuole.position.set(0.1, -0.25, 0)
  vacuole.visible = false
  const chloros = []
  ;[[-0.2, 1.45, 0.8], [1.1, 0.9, -0.8], [-1.2, 0.2, 1.1]].forEach((pos, index) => {
    const leaf = organelle(
      new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), plastic('#67e35a')),
      index === 0 ? 'chloro' : `chloro-${index}`,
      '叶绿体',
      '植物进行光合作用的地方。动物细胞没有叶绿体。'
    )
    leaf.scale.set(1.5, 0.7, 0.7)
    leaf.position.set(...pos)
    leaf.visible = false
    chloros.push(leaf)
  })
  const dustGeo = new THREE.BufferGeometry()
  const dustCount = 80
  const dustArr = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i += 1) {
    const radius = Math.random() * 2.7
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    dustArr[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    dustArr[i * 3 + 1] = radius * Math.cos(phi)
    dustArr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustArr, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: getSoftTexture(),
    color: '#d7c6ff',
    size: 0.07,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }))
  group.add(membrane, nucleus, nucleolus, mitoA, mitoB, er, golgi, lysosome, ribosomes, wall, vacuole, dust, ...chloros)
  const plantOnly = [wall, vacuole, ...chloros]
  const sharedMats = [nucleus.material, mitoMat, er.material, lysosome.material]

  function setPlant(on) {
    plantOnly.forEach((item) => {
      item.visible = on
    })
    sharedMats.forEach((mat) => {
      mat.emissiveIntensity = on ? 0.12 : 0.35
    })
  }

  function tick(dt, reduced) {
    if (reduced) return
    const arr = dustGeo.attributes.position.array
    for (let i = 0; i < dustCount; i += 1) {
      arr[i * 3] += (Math.random() - 0.5) * dt * 0.55
      arr[i * 3 + 1] += (Math.random() - 0.5) * dt * 0.55
      arr[i * 3 + 2] += (Math.random() - 0.5) * dt * 0.55
      const radius = Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
      if (radius > 2.85) {
        const scale = 2.7 / radius
        arr[i * 3] *= scale
        arr[i * 3 + 1] *= scale
        arr[i * 3 + 2] *= scale
      }
    }
    dustGeo.attributes.position.needsUpdate = true
  }

  function setQuality(level) {
    dustGeo.setDrawRange(0, level === 'low' ? 36 : dustCount)
  }

  function dispose() {
    group.traverse((obj) => {
      if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((mat) => {
        if (!mat.userData?.shared) mat.dispose?.()
      })
    })
  }

  return { group, setPlant, tick, setQuality, dispose }
}
