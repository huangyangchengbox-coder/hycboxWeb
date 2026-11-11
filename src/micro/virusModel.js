import * as THREE from 'three'

function glowMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.38
  })
}

function capsule(length, color) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, length, 8, 1), glowMaterial(color))
  return mesh
}

export function createVirusRig() {
  const root = new THREE.Group()
  const capsidGroup = new THREE.Group()
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), glowMaterial('#ff4fa3'))
  shell.userData.pick = {
    id: 'capsid',
    name: '衣壳',
    nameEn: 'CAPSID',
    kind: '病毒结构',
    summary: '这是正二十面体衣壳的示意。病毒没有细胞结构，必须进入宿主细胞才能复制。',
    facts: [
      ['细胞', '没有'],
      ['内容', '蛋白质外壳加核酸'],
      ['范围', '不讲致病、传播或疫苗']
    ]
  }
  shell.userData.label = '衣壳'
  const positions = shell.geometry.attributes.position
  const seen = new Set()
  const outward = new THREE.Vector3()
  for (let i = 0; i < positions.count; i += 1) {
    outward.fromBufferAttribute(positions, i)
    const key = `${outward.x.toFixed(3)},${outward.y.toFixed(3)},${outward.z.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 6), glowMaterial('#ffe08a'))
    const dir = outward.clone().normalize()
    spike.position.copy(dir).multiplyScalar(1.12)
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    capsidGroup.add(spike)
  }
  const corePoints = []
  for (let i = 0; i < 16; i += 1) {
    const angle = i * 0.7
    corePoints.push(new THREE.Vector3(Math.cos(angle) * 0.28, i * 0.06 - 0.45, Math.sin(angle) * 0.28))
  }
  const core = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(corePoints), 40, 0.035, 5, false),
    glowMaterial('#8cffdf')
  )
  capsidGroup.add(shell, core)

  const fold = new THREE.Group()
  const extended = []
  const compact = []
  const beads = []
  for (let i = 0; i < 12; i += 1) {
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), glowMaterial(i % 2 ? '#7dffe8' : '#d56bff'))
    const angle = i * 2.4
    const radius = 0.28 + (i / 11) * 0.85
    extended.push(new THREE.Vector3(-2.4 + i * 0.42, 0, 0))
    compact.push(new THREE.Vector3(Math.cos(angle) * radius, (i / 11 - 0.5) * 1.5, Math.sin(angle) * radius))
    bead.position.copy(extended[i])
    beads.push(bead)
    fold.add(bead)
  }
  const lineGeo = new THREE.BufferGeometry()
  const lineArr = new Float32Array(12 * 3)
  lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArr, 3))
  const chain = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.7 }))
  fold.add(chain)
  fold.userData.pick = {
    id: 'fold',
    name: '蛋白质折叠',
    nameEn: 'FOLD',
    kind: '示意过程',
    summary: '一条链从展开收到一团。这不是真实的折叠路径，真实机制更复杂。',
    facts: [['口径', '过程示意']]
  }

  const antibody = new THREE.Group()
  const stem = capsule(1.1, '#8eb6ff')
  stem.position.y = -0.35
  const left = capsule(0.95, '#ffd15c')
  left.position.set(-0.42, 0.55, 0)
  left.rotation.z = Math.PI / 3.4
  const right = capsule(0.95, '#ffd15c')
  right.position.set(0.42, 0.55, 0)
  right.rotation.z = -Math.PI / 3.4
  antibody.add(stem, left, right)
  antibody.userData.pick = {
    id: 'antibody',
    name: '抗体',
    nameEn: 'ANTIBODY',
    kind: 'Y 形示意',
    summary: '抗体常画成 Y 形。两臂上的结合面像锁和钥匙，只认特定的形状。',
    facts: [['形状', '三段式示意']]
  }
  stem.userData.label = '抗体'

  const binding = new THREE.Group()
  const receptor = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 14), glowMaterial('#7dffe8'))
  receptor.scale.set(1.4, 0.7, 0.9)
  receptor.position.set(-0.2, -0.2, 0)
  const surface = new THREE.Mesh(new THREE.CircleGeometry(1.8, 24), new THREE.MeshStandardMaterial({
    color: '#1a1030',
    emissive: '#3a2460',
    emissiveIntensity: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.8
  }))
  surface.position.y = -0.7
  surface.rotation.x = -Math.PI / 2.4
  const dock = new THREE.Group()
  const binder = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), glowMaterial('#ff4fa3'))
  const binderSpike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 6), glowMaterial('#ffe08a'))
  binderSpike.position.y = 0.62
  dock.add(binder, binderSpike)
  dock.position.set(2.2, 0.4, 0)
  binding.add(surface, receptor, dock)
  receptor.userData.label = '受体'
  receptor.userData.pick = {
    id: 'receptor',
    name: '受体结合',
    nameEn: 'DOCKING',
    kind: '结构示意',
    summary: '刺突靠近细胞表面的受体。这只说明形状可以契合，不涉及感染步骤。',
    facts: [['范围', '不展开病理']]
  }

  root.add(capsidGroup, fold, antibody, binding)
  let view = 'capsid'
  let foldT = 0
  let bindT = 0
  let playing = false
  const shown = { capsid: capsidGroup, fold, antibody, binding }

  function applyFold() {
    const eased = foldT * foldT * (3 - 2 * foldT)
    for (let i = 0; i < beads.length; i += 1) {
      beads[i].position.lerpVectors(extended[i], compact[i], eased)
      lineArr[i * 3] = beads[i].position.x
      lineArr[i * 3 + 1] = beads[i].position.y
      lineArr[i * 3 + 2] = beads[i].position.z
    }
    lineGeo.attributes.position.needsUpdate = true
  }

  function setView(next) {
    view = next
    foldT = 0
    bindT = 0
    applyFold()
    dock.position.x = 2.2
    Object.entries(shown).forEach(([key, item]) => {
      item.visible = key === next
    })
  }

  function setAmount(value) {
    const next = Math.min(1, Math.max(0, value))
    if (view === 'fold') {
      foldT = next
      applyFold()
    } else if (view === 'binding') {
      bindT = next
      dock.position.x = 2.2 - bindT * 1.45
    }
  }

  function setPlaying(value) {
    playing = value
  }

  function tick(dt, reduced) {
    if (reduced) return
    if (view === 'capsid') capsidGroup.rotation.y += dt * 0.25
    if (!playing) return
    if (view === 'fold') {
      foldT = Math.min(1, foldT + dt / 6)
      applyFold()
    } else if (view === 'binding') {
      bindT = Math.min(1, bindT + dt / 5)
      dock.position.x = 2.2 - bindT * 1.45
    }
  }

  function dispose() {
    root.traverse((obj) => {
      if (obj.geometry && !obj.geometry.userData?.shared) obj.geometry.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((mat) => {
        if (!mat.userData?.shared) mat.dispose?.()
      })
    })
  }

  setView('capsid')
  return { group: root, setView, setPlaying, setAmount, tick, dispose }
}
