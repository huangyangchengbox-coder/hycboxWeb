import * as THREE from 'three'
import { getSoftTexture } from './textures.js'

/** 2023 年《Cell》更新的十二大衰老标志（López-Otín 等），分三个层级。 */
export const AGING_HALLMARKS = [
  { id: 'genome', name: '基因组不稳定', tier: 'primary', text: 'DNA 每天被紫外线、自由基、复制错误攻击上万次。损伤累积、修复出错，突变随年龄越攒越多——这是衰老最底层的原因之一。', overlay: 'damage' },
  { id: 'telomere', name: '端粒损耗', tier: 'primary', text: '每次分裂端粒短一截，到海弗里克极限细胞就退休。皮肤、血液这些高频更新的组织最先感受到端粒变短。', overlay: 'telomere' },
  { id: 'epigenetic', name: '表观遗传改变', tier: 'primary', text: '基因本身没变，但开关（DNA 甲基化、组蛋白修饰）乱了。细胞的“身份剧本”越来越模糊，该开的不开、该关的不关。', overlay: 'epigenetic' },
  { id: 'proteostasis', name: '蛋白稳态丧失', tier: 'primary', text: '蛋白质折叠错了就要回收。年老细胞的清洗系统（泛素-蛋白酶体、自噬）效率下降，错误蛋白抱团堆积。', overlay: 'aggregate' },
  { id: 'autophagy', name: '自噬失能', tier: 'primary', text: '自噬是细胞的垃圾分类厂。年老时它罢工，破损的细胞器和垃圾蛋白没人清走，细胞越来越像塞满杂物的仓库。', overlay: 'aggregate' },
  { id: 'nutrient', name: '营养感知失调', tier: 'antagonistic', text: 'mTOR、胰岛素这些“吃饱了”的信号通路随年龄越开越大，细胞只顾生长不去维护。适度节食抗衰的原理就在这里。', overlay: 'nutrient' },
  { id: 'mitochondria', name: '线粒体功能障碍', tier: 'antagonistic', text: '发电站老化，产能下降，还漏出更多活性氧（ROS），反过来攻击 DNA 和蛋白质——一个恶性循环。', overlay: 'ros' },
  { id: 'senescence', name: '细胞衰老', tier: 'antagonistic', text: '受损到一定程度，细胞干脆停止分裂并进入衰老态。年轻时这是防癌的好机制；年老时衰老细胞越积越多，还分泌炎症因子（SASP）毒害邻居。', overlay: 'senescent' },
  { id: 'stem', name: '干细胞耗竭', tier: 'antagonistic', text: '组织里的备用军（干细胞）随年龄减少、变钝。新细胞补充不上，伤口愈合变慢、头发变白、免疫变弱。', overlay: 'stem' },
  { id: 'comm', name: '细胞间通讯改变', tier: 'integrative', text: '激素、神经、免疫信号网络乱套：该传的信号变弱，促炎的信号变强，身体各部门协调性下降。', overlay: 'comm' },
  { id: 'inflammation', name: '慢性炎症', tier: 'integrative', text: '衰老细胞持续分泌炎症因子，身体长期处于低烈度“上火”状态（inflammaging），与动脉硬化、阿尔茨海默病都相关。', overlay: 'fog' },
  { id: 'dysbiosis', name: '生态失调', tier: 'integrative', text: '肠道菌群组成随年龄漂移，益生菌减少、促炎菌增多，影响营养吸收和免疫训练——衰老不只在细胞内，也在“宏观合作”层面。', overlay: 'fog' }
]

const TIER_NAMES = { primary: '主层级 · 根因', antagonistic: '拮抗层级 · 副作用', integrative: '整合层级 · 系统失协' }

function glowMat(color, intensity = 0.35, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.5,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1
  })
}

function rand(seed) {
  // 简单可复现伪随机
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/**
 * 衰老时钟 rig：一团组织 + 年龄滑块（20→80 岁）。
 * 年龄越大：衰老细胞越多、垃圾蛋白越厚、ROS 越密、干细胞越少、信号线越暗。
 * 选中某个衰老标志时，对应的视觉效果会被强调。
 */
export function createAgingRig(hooks = {}) {
  const group = new THREE.Group()

  // ---------- 组织：六边形密堆的细胞 ----------
  const ROWS = 5
  const COLS = 9
  const cells = []
  const cellGeo = new THREE.SphereGeometry(0.46, 20, 14)
  const tissue = new THREE.Group()
  let seed = 1
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const mat = glowMat('#7dffe8', 0.3)
      const cell = new THREE.Mesh(cellGeo, mat)
      cell.position.set(
        (col - (COLS - 1) / 2) * 1.08 + (row % 2) * 0.54,
        (row - (ROWS - 1) / 2) * 0.94,
        (rand(seed) - 0.5) * 0.4
      )
      seed += 1
      cell.scale.setScalar(0.88 + rand(seed) * 0.2)
      tissue.add(cell)
      cells.push({ mesh: cell, mat, r: rand(seed * 3), born: false })
    }
  }
  tissue.position.z = -0.2
  group.add(tissue)
  cells[Math.floor(ROWS * COLS / 2)].mesh.userData.label = '组织细胞'
  cells[4].mesh.userData.pick = {
    id: 'aging-cell',
    name: '组织细胞',
    nameEn: 'TISSUE CELL',
    kind: '衰老的现场',
    summary: '拖动年龄滑块：细胞会慢慢变黄、变扁，垃圾蛋白（黄点）越堆越多，活性氧（橙点）越来越密。',
    facts: [['模型', '示意，不是实测']]
  }

  // ---------- 各类覆盖效果 ----------
  // 1. 衰老细胞（扁、暗、琥珀色）+ SASP 红点
  const senescent = cells.map((c, i) => ({ cell: c, idx: i, on: false }))
  // 2. 垃圾蛋白团块（黄色小球挂在细胞里）
  const aggregateGroup = new THREE.Group()
  const aggregateMat = glowMat('#ffd15c', 0.6)
  const aggregates = []
  for (let i = 0; i < cells.length; i += 1) {
    for (let j = 0; j < 3; j += 1) {
      const clump = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rand(i * 7 + j) * 0.05, 8, 6), aggregateMat)
      clump.visible = false
      aggregateGroup.add(clump)
      aggregates.push({ mesh: clump, cellIdx: i, r: rand(i * 13 + j) })
    }
  }
  group.add(aggregateGroup)
  // 3. 活性氧 ROS（橙色粒子云）
  const rosGeo = new THREE.BufferGeometry()
  const rosCount = 160
  const rosArr = new Float32Array(rosCount * 3)
  for (let i = 0; i < rosCount; i += 1) {
    rosArr[i * 3] = (rand(i) - 0.5) * 10
    rosArr[i * 3 + 1] = (rand(i + 99) - 0.5) * 4.6
    rosArr[i * 3 + 2] = 0.3 + rand(i + 7) * 1.6
  }
  rosGeo.setAttribute('position', new THREE.BufferAttribute(rosArr, 3))
  const rosMat = new THREE.PointsMaterial({ map: getSoftTexture(), color: '#ff9f4a', size: 0.14, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const ros = new THREE.Points(rosGeo, rosMat)
  group.add(ros)
  // 4. DNA 损伤红点
  const dmgGeo = new THREE.BufferGeometry()
  const dmgCount = 90
  const dmgArr = new Float32Array(dmgCount * 3)
  for (let i = 0; i < dmgCount; i += 1) {
    const c = cells[Math.floor(rand(i * 5) * cells.length)]
    dmgArr[i * 3] = c.mesh.position.x + (rand(i) - 0.5) * 0.5
    dmgArr[i * 3 + 1] = c.mesh.position.y + (rand(i + 3) - 0.5) * 0.5
    dmgArr[i * 3 + 2] = 0.55
  }
  dmgGeo.setAttribute('position', new THREE.BufferAttribute(dmgArr, 3))
  const dmgMat = new THREE.PointsMaterial({ map: getSoftTexture(), color: '#ff5d86', size: 0.16, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const dmg = new THREE.Points(dmgGeo, dmgMat)
  group.add(dmg)
  // 5. 炎症红雾
  const fogGeo = new THREE.BufferGeometry()
  const fogCount = 220
  const fogArr = new Float32Array(fogCount * 3)
  for (let i = 0; i < fogCount; i += 1) {
    fogArr[i * 3] = (rand(i * 2) - 0.5) * 11
    fogArr[i * 3 + 1] = (rand(i * 2 + 1) - 0.5) * 5.2
    fogArr[i * 3 + 2] = 1.2 + rand(i * 2 + 2) * 2.2
  }
  fogGeo.setAttribute('position', new THREE.BufferAttribute(fogArr, 3))
  const fogMat = new THREE.PointsMaterial({ map: getSoftTexture(), color: '#ff4fa3', size: 0.22, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const fog = new THREE.Points(fogGeo, fogMat)
  group.add(fog)
  // 6. 细胞间信号线（蓝）
  const commGeo = new THREE.BufferGeometry()
  const commPts = []
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS - 1; col += 1) {
      const a = cells[row * COLS + col].mesh.position
      const b = cells[row * COLS + col + 1].mesh.position
      commPts.push(a.x, a.y, 0.5, b.x, b.y, 0.5)
    }
  }
  commGeo.setAttribute('position', new THREE.Float32BufferAttribute(commPts, 3))
  const commMat = new THREE.LineBasicMaterial({ color: '#8eb6ff', transparent: true, opacity: 0.3 })
  group.add(new THREE.LineSegments(commGeo, commMat))
  // 7. 干细胞（边缘的亮小球，随年龄消失）
  const stemGroup = new THREE.Group()
  const stemMat = glowMat('#ffe08a', 0.9)
  const stems = []
  const stemSpots = [[-5.6, 2.2], [5.6, 2.2], [-5.6, -2.2], [5.6, -2.2], [0, 2.8], [0, -2.8]]
  stemSpots.forEach((spot, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), stemMat)
    s.position.set(spot[0], spot[1], 0.2)
    s.userData.label = i === 0 ? '干细胞' : undefined
    stemGroup.add(s)
    stems.push(s)
  })
  group.add(stemGroup)
  // 8. mTOR 光环（营养感知）
  const haloMat = glowMat('#c9a6ff', 0.5, 0.16)
  const halos = []
  for (let i = 0; i < 6; i += 1) {
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 12), haloMat)
    const c = cells[Math.floor(rand(i * 31) * cells.length)]
    h.position.copy(c.mesh.position)
    h.position.z = 0.1
    group.add(h)
    halos.push(h)
  }
  // 9. 端粒缩帽（染色体小结浮在上方）
  const teloGroup = new THREE.Group()
  const teloChromo = new THREE.Group()
  const teloBigMat = glowMat('#ffd15c', 0.5)
  const teloCapMat = glowMat('#7dffe8', 0.9)
  const teloCaps = []
  for (const dir of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.62, 4, 10), teloBigMat)
    rod.rotation.z = dir * 0.4
    teloChromo.add(rod)
  }
  for (const sign of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), teloCapMat)
    cap.position.set(0, sign * 0.42, 0)
    teloChromo.add(cap)
    teloCaps.push(cap)
  }
  teloChromo.position.set(0, 3.1, 0)
  teloChromo.userData.label = '端粒'
  teloGroup.add(teloChromo)
  group.add(teloGroup)

  // ---------- 状态 ----------
  const state = { age: 0.18, hallmark: null }
  const AGE_MIN = 20
  const AGE_MAX = 80
  let lastEmit = 0

  function apply() {
    const a = state.age // 0(年轻) → 1(年老)
    const h = state.hallmark
    const hall = h ? AGING_HALLMARKS.find((x) => x.id === h) : null
    const focus = (id) => hall?.overlay === id

    // 细胞本体：健康青 → 衰老琥珀
    const senescentFraction = 0.06 + a * 0.34 + (focus('senescent') ? 0.12 : 0)
    senescent.forEach((s, i) => {
      const on = s.r < senescentFraction
      if (on) {
        s.cell.mat.color.set('#c9a28a')
        s.cell.mat.emissive.set('#c9a28a')
        s.cell.mat.emissiveIntensity = 0.16
        s.cell.mesh.scale.set(1.06, 0.5, 1.06) // 变扁
        if (i === 0) s.cell.mesh.userData.label = '衰老细胞'
      } else {
        const jitter = focus('epigenetic') ? (rand(i * 17) - 0.5) * 0.5 : 0
        const hue = clamp01(a * 0.5 + jitter)
        s.cell.mat.color.setRGB(lerp(0.49, 0.78, hue), lerp(1.0, 0.64, hue), lerp(0.91, 0.42, hue))
        s.cell.mat.emissive.copy(s.cell.mat.color)
        s.cell.mat.emissiveIntensity = 0.3 - a * 0.12
        s.cell.mesh.scale.setScalar(0.88 + s.r * 0.2)
        if (i === 0) s.cell.mesh.userData.label = '组织细胞'
      }
    })
    // 垃圾蛋白
    const aggDensity = a * 0.85 + (focus('aggregate') ? 0.15 : 0)
    aggregates.forEach((ag) => {
      ag.mesh.visible = ag.r < aggDensity
      if (ag.mesh.visible) {
        const c = cells[ag.cellIdx].mesh.position
        ag.mesh.position.set(c.x + (ag.r - 0.5) * 0.55, c.y + (rand(ag.r * 99) - 0.5) * 0.55, 0.55)
      }
    })
    // ROS / DNA 损伤 / 炎症雾
    rosMat.opacity = clamp01(a * 0.55 + (focus('ros') ? 0.45 : 0))
    rosGeo.setDrawRange(0, Math.round(rosCount * clamp01(a * 0.9 + (focus('ros') ? 0.3 : 0))))
    dmgMat.opacity = focus('damage') ? 0.85 : a * 0.25
    dmgGeo.setDrawRange(0, focus('damage') ? dmgCount : Math.round(dmgCount * a * 0.5))
    fogMat.opacity = clamp01(a * 0.35 + (focus('fog') ? 0.4 : 0))
    // 信号线
    commMat.opacity = Math.max(0.04, 0.34 - a * 0.3) * (focus('comm') ? 2.2 : 1)
    // 干细胞：随年龄减少
    const stemKeep = clamp01(1 - a * 1.1) * (focus('stem') ? 1.25 : 1)
    stems.forEach((s, i) => {
      s.visible = i < Math.round(stems.length * stemKeep)
    })
    // mTOR 光环
    halos.forEach((hl) => {
      hl.visible = focus('nutrient') || a > 0.55
      hl.scale.setScalar(focus('nutrient') ? 1.5 + Math.sin(performance.now() * 0.002) * 0.1 : 1)
    })
    // 端粒帽
    const capScale = 0.4 + 0.6 * (1 - a) - (focus('telomere') ? 0.15 : 0)
    teloCaps.forEach((cap) => cap.scale.setScalar(Math.max(0.3, capScale)))
    teloCapMat.color.set(capScale < 0.55 ? '#ff5d86' : '#7dffe8')
    teloCapMat.emissive.copy(teloCapMat.color)
    teloGroup.visible = true

    const now = performance.now()
    if (now - lastEmit > 120) {
      lastEmit = now
      hooks.onState?.({
        ageYears: Math.round(AGE_MIN + state.age * (AGE_MAX - AGE_MIN)),
        senescentPct: Math.round(senescentFraction * 100),
        hallmark: state.hallmark,
        hallmarkTier: hall ? TIER_NAMES[hall.tier] : ''
      })
    }
  }

  function lerp(a, b, t) {
    return a + (b - a) * t
  }
  function clamp01(v) {
    return Math.min(1, Math.max(0, v))
  }

  function tick(dt, time) {
    // ROS 上升漂移
    if (rosMat.opacity > 0.02) {
      const arr = rosGeo.attributes.position.array
      for (let i = 0; i < rosCount; i += 1) {
        arr[i * 3 + 1] += dt * 0.22
        if (arr[i * 3 + 1] > 2.6) arr[i * 3 + 1] = -2.6
      }
      rosGeo.attributes.position.needsUpdate = true
    }
    // 炎症雾缓慢对流
    if (fogMat.opacity > 0.02) {
      const arr = fogGeo.attributes.position.array
      for (let i = 0; i < fogCount; i += 1) {
        arr[i * 3] += Math.sin(time * 0.4 + i) * dt * 0.06
      }
      fogGeo.attributes.position.needsUpdate = true
    }
    // 呼吸：整体轻微起伏
    tissue.scale.y = 1 + Math.sin(time * 0.9) * 0.012
    // 干细胞脉动
    stems.forEach((s, i) => {
      s.scale.setScalar(1 + Math.sin(time * 2.4 + i * 1.3) * 0.08)
    })
    teloChromo.rotation.y += dt * 0.4
    apply()
  }

  function setAge(norm) {
    state.age = clamp01(norm)
    apply()
  }

  function setHallmark(id) {
    state.hallmark = id
    apply()
  }

  apply()

  function dispose() {
    group.traverse((obj) => {
      if (obj.geometry !== cellGeo) obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => m.dispose?.())
    })
    cellGeo.dispose()
  }

  return { group, tick, setAge, setHallmark, dispose }
}
