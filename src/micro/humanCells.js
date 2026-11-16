import * as THREE from 'three'

/** 人体细胞总数约 37.2 万亿（Bianconi et al., 2013）。 */
export const BODY_TOTAL_TEXT = '约 37.2 万亿个细胞'

export const CELL_TYPES = [
  {
    id: 'rbc',
    name: '红细胞',
    en: 'RED BLOOD CELL',
    kind: '运输队',
    desc: '两面凹的圆盘，没有细胞核——成熟前把核挤掉了，腾出空间装约 2.7 亿个血红蛋白分子。它的一生就是绕着血液循环 12 万圈，把氧送到全身，约 120 天后在脾脏退役。',
    facts: [['数量', '约 25 万亿（占人体细胞 84%）'], ['直径', '约 7–8 μm'], ['寿命', '约 120 天'], ['更新', '每秒约 240 万个新生']],
    note: '红细胞是人体最多的细胞，但它太小了：只占身体质量的 4% 不到。'
  },
  {
    id: 'neuron',
    name: '神经元',
    en: 'NEURON',
    kind: '信号网络',
    desc: '胞体 + 树突（收天线）+ 一根长轴突（发电线）。信息以电脉冲沿轴突跳着跑——髓鞘像电线绝缘层，让信号每秒冲刺上百米。神经元几乎不分裂，也基本与人体同寿。',
    facts: [['数量', '约 860 亿'], ['最长轴突', '坐骨神经可超过 1 米'], ['寿命', '几乎终身'], ['耗能', '占基础代谢约 20%']],
    note: '大脑神经元数与银河系恒星数一个量级，所以这个比喻很流行——但也仅此而已。'
  },
  {
    id: 'muscle',
    name: '骨骼肌细胞',
    en: 'MUSCLE FIBER',
    kind: '发动机',
    desc: '一根长长的多核纤维，横纹是肌节明暗交替的排列。收缩靠肌动蛋白与肌球蛋白这对分子齿轮互相滑动。它不靠分裂变多变长，靠卫星细胞修补、靠锻炼增粗。',
    facts: [['形态', '多核，一根纤维可达数十厘米'], ['数量', '数百根组成一束肌纤维'], ['修复', '靠卫星细胞（邻居干细胞）'], ['损伤反应', '延迟性酸痛≠撕裂，微损伤会修复']],
    note: '力量训练主要让肌纤维变粗（肥大），不是变多。'
  },
  {
    id: 'osteocyte',
    name: '骨细胞',
    en: 'OSTEOCYTE',
    kind: '建筑维护队',
    desc: '把自己埋在自己分泌的骨质里，住在小室（骨陷窝）中，伸出触手连接邻居，组成感知网络。骨受力的信号经它传给成骨/破骨细胞，骨头一辈子都在拆了重建。',
    facts: [['数量', '约几十亿'], ['寿命', '骨基质可存活数十年'], ['更新', '全身骨骼约 10 年翻新一遍'], ['功能', '力学感知 + 钙代谢']],
    note: '久坐不动，骨细胞收不到力学信号，骨量就慢慢流失。'
  },
  {
    id: 'adipocyte',
    name: '脂肪细胞',
    en: 'ADIPOCYTE',
    kind: '能量仓库',
    desc: '细胞里几乎一个大油滴，核被挤到边上。吃多了不是油滴无限膨胀，而是先膨胀、再分裂出新的脂肪细胞（成年后数量基本固定，只能缩不能减数）。它还分泌瘦素等激素，是内分泌器官。',
    facts: [['数量', '约 300 亿（因人而异）'], ['直径', '可从 50 μm 涨到 150 μm'], ['寿命', '约 8–10 年缓慢更换'], ['内分泌', '分泌瘦素（leptin）']],
    note: '减肥成功后脂肪细胞变瘪但数量不减，所以容易反弹。'
  },
  {
    id: 'macrophage',
    name: '巨噬细胞',
    en: 'MACROPHAGE',
    kind: '清道夫兼哨兵',
    desc: '会变形的巡逻兵，伸出伪足爬行、包裹吞掉细菌和细胞碎片，一顿能吃上百个细菌。它还把敌情掰成碎片插在自己表面（MHC 呈递），向 T 细胞报警——免疫系统的现场直播记者。',
    facts: [['来源', '单核细胞出血管后分化'], ['变形', '可挤过 1/10 自身直径的缝隙'], ['寿命', '数月到数年（组织驻留型）'], ['身份', '先天免疫 + 抗原呈递']],
    note: '凋亡细胞的“吃我”信号（磷脂酰丝氨酸）平时就挂在表面，巨噬细胞负责安静回收。'
  },
  {
    id: 'lymphocyte',
    name: '淋巴细胞',
    en: 'LYMPHOCYTE',
    kind: '特种部队',
    desc: '表面密布受体（TCR 等），像随身带一万把钥匙去试敌人的锁。T 细胞有记忆亚群——疫苗的原理就是给它建档，二次遇到同款敌人直接克隆爆兵。',
    facts: [['数量', '约 2 万亿（含组织驻留）'], ['种类', 'T / B / NK 三大亚群'], ['克隆选择', '一个受体一个克隆'], ['记忆', '记忆细胞可存活数十年']],
    note: 'T 细胞也是端粒缩短最明显的免疫细胞——免疫衰老的一部分。'
  },
  {
    id: 'epithelial',
    name: '小肠上皮细胞',
    en: 'EPITHELIAL CELL',
    kind: '边防与吸收',
    desc: '柱状细胞顶面长满微绒毛，把吸收面积扩大 20 倍。它站在人体与外界（肠腔其实算体外）的第一线，所以磨损极快，是全身换岗最快的细胞之一，由肠隐窝干细胞源源不断补充。',
    facts: [['更新', '约 3–5 天换一代'], ['吸收面积', '微绒毛把肠表面积扩到约 250 m²'], ['屏障', '细胞间紧密连接封死缝隙'], ['更新来源', '肠隐窝干细胞']],
    note: '你此刻的肠上皮，和上周的你已经不是同一批细胞。'
  },
  {
    id: 'sperm',
    name: '精子',
    en: 'SPERM',
    kind: '遗传快递员',
    desc: '头部是压紧 23 条染色体的遗传包裹（顶体带溶解酶开门），中段装满线粒体当电池，尾巴一鞭一鞭前进。它自己几乎不带细胞质——省下的都给游动供能。',
    facts: [['产量', '每天约 1–2 亿个'], ['全长', '约 50–60 μm（头约 5 μm）'], ['速度', '约 1–4 mm/min'], ['命运', '绝大多数到不了终点']],
    note: '从发生到成熟约 64–72 天，所以“三个月前的生活方式”参与塑造今天的精子。'
  },
  {
    id: 'egg',
    name: '卵子',
    en: 'OVUM',
    kind: '最大的细胞',
    desc: '人体最大的单个细胞，直径约 0.1 mm——肉眼将将可见。外面裹着透明带和放射冠。出生时卵泡库存已建好（约 100–200 万），一路只减不增，青春期剩约 30 万，真正排卵的只有 400–500 个。',
    facts: [['直径', '约 100–120 μm'], ['库存', '出生即定，只减不增'], ['排卵', '一生约 400–500 次'], ['供能', '皮质颗粒防多精入卵']],
    note: '卵子线粒体全部来自母亲——你的线粒体 DNA 追溯回去是一条纯母系线。'
  },
  {
    id: 'stem',
    name: '干细胞',
    en: 'STEM CELL',
    kind: '备用军',
    desc: '未分化的储备细胞：既能自我复制，又能按需分化成特定工种。造血干细胞每秒产出几百万个血细胞；肠隐窝干细胞 3–5 天翻新一层肠上皮。它们的端粒酶活性高——但也不无限。',
    facts: [['分类', '胚胎 / 成体 / 诱导多能（iPS）'], ['造血', '骨髓每分钟产出约 1 亿个血细胞'], ['命运', '不对称分裂：一个替补一个上岗'], ['衰老', '干细胞也会老（耗竭）']],
    note: 'iPS 技术（山中因子）让成体细胞“时光倒流”回干细胞态——2012 年诺贝尔奖。'
  }
]

function glowMat(color, intensity = 0.35, opacity = 1) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.45,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1
  })
}

function pick(meta) {
  return (mesh) => {
    mesh.userData.pick = meta
    mesh.userData.label = meta.name
    return mesh
  }
}

// ---------- 各细胞构建器 ----------

function buildRbc() {
  // 双凹圆盘：LatheGeometry 旋转轮廓
  const pts = []
  const R = 1.1
  const half = (u) => 0.42 * (0.32 + 0.68 * Math.pow(u, 2.4)) // 中心薄、边缘厚
  for (let i = 0; i <= 18; i += 1) {
    const u = i / 18
    pts.push(new THREE.Vector2(R * u, half(u)))
  }
  for (let i = 18; i >= 0; i -= 1) {
    const u = i / 18
    pts.push(new THREE.Vector2(R * u, -half(u)))
  }
  const disc = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), glowMat('#ff6b7d', 0.55))
  disc.rotation.x = 0.35
  const g = new THREE.Group()
  g.add(disc)
  // 三个叠一起的“血涂片”造型
  for (const [dx, dy, rz] of [[-0.9, -0.7, 0.5], [0.85, -0.85, -0.4]]) {
    const d2 = disc.clone()
    d2.position.set(dx, dy, -0.3)
    d2.rotation.z = rz
    g.add(d2)
  }
  g.userData.spin = 'tilt'
  return g
}

function buildNeuron() {
  const g = new THREE.Group()
  const somaMat = glowMat('#c9a6ff', 0.45)
  const soma = new THREE.Mesh(new THREE.SphereGeometry(0.85, 26, 18), somaMat)
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), glowMat('#ff7ad9', 0.6))
  g.add(soma, nucleus)
  // 树突（收天线）
  const dendMat = glowMat('#8eb6ff', 0.4)
  for (let i = 0; i < 7; i += 1) {
    const a = (i / 7) * Math.PI * 0.9 + Math.PI * 0.05
    const dend = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 1.1, 4, 8), dendMat)
    dend.position.set(Math.cos(a) * -1.0, Math.sin(a) * 1.15, (i % 3 - 1) * 0.35)
    dend.rotation.z = a - Math.PI / 2
    dend.position.x -= 0.55
    g.add(dend)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), dendMat)
    tip.position.copy(dend.position).add(new THREE.Vector3(Math.cos(a) * -0.85, Math.sin(a) * 0.6, 0))
    g.add(tip)
  }
  // 轴突 + 髓鞘
  const axonMat = glowMat('#ffe08a', 0.4)
  const axon = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.2, 10), axonMat)
  axon.rotation.z = Math.PI / 2
  axon.position.x = 2.3
  g.add(axon)
  const myelinMat = glowMat('#7dffe8', 0.3, 0.5)
  for (let i = 0; i < 6; i += 1) {
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.42, 4, 10), myelinMat)
    seg.rotation.z = Math.PI / 2
    seg.position.x = 1.15 + i * 0.78
    g.add(seg)
  }
  // 末梢分支
  for (const dy of [-0.3, 0.25]) {
    const term = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), axonMat)
    term.position.set(4.45, dy, dy * 0.6)
    g.add(term)
  }
  g.position.x = -0.7
  // 动作电位：沿轴突跑的光点
  const pulseMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), pulseMat)
  g.add(pulse)
  g.userData.tick = (dt, time) => {
    const p = (time * 0.7) % 1
    pulse.position.set(0.2 + p * 4.3, 0, 0.12)
    pulse.scale.setScalar(0.6 + 0.6 * Math.sin(p * Math.PI))
    soma.scale.setScalar(1 + Math.sin(time * 2) * 0.02)
  }
  return g
}

function buildMuscle() {
  const g = new THREE.Group()
  const fiberMat = glowMat('#ff8b6a', 0.32)
  const fiber = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 3.6, 8, 20), fiberMat)
  fiber.rotation.z = Math.PI / 2
  g.add(fiber)
  // 横纹
  const stripeMat = glowMat('#ffd0c2', 0.25, 0.7)
  for (let i = 0; i < 14; i += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.022, 6, 30), stripeMat)
    ring.rotation.y = Math.PI / 2
    ring.position.x = -2.05 + i * 0.3
    g.add(ring)
  }
  // 多个核（紫色，贴表面）
  const nucMat = glowMat('#ff7ad9', 0.6)
  for (let i = 0; i < 6; i += 1) {
    const a = i * 1.1
    const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), nucMat)
    nuc.position.set(-1.7 + i * 0.7, Math.cos(a) * 0.64, Math.sin(a) * 0.64)
    g.add(nuc)
  }
  g.userData.tick = (dt, time) => {
    // 收缩：长度轻微缩短
    const k = 1 - Math.max(0, Math.sin(time * 1.6)) * 0.06
    g.scale.set(k, 1 / k ** 0.5, 1 / k ** 0.5)
  }
  return g
}

function buildOsteocyte() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 22, 16), glowMat('#ffe08a', 0.45))
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), glowMat('#ff7ad9', 0.6))
  g.add(body, nuc)
  const spikeMat = glowMat('#ffd15c', 0.4)
  for (let i = 0; i < 12; i += 1) {
    const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(2 * ((i * 0.618) % 1) - 1), i * 2.399)
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.9 + (i % 3) * 0.25, 6), spikeMat)
    spike.position.copy(dir).multiplyScalar(0.62 + spike.geometry.parameters.height / 2 - 0.45 + 0.45)
    spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    g.add(spike)
  }
  // 骨基质框架（若隐若现的壳）
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1.55, 20, 14), glowMat('#d8d4c8', 0.12, 0.1))
  g.add(shell)
  g.userData.tick = (dt, time) => {
    spikeMat.emissiveIntensity = 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(time * 1.8))
  }
  return g
}

function buildAdipocyte() {
  const g = new THREE.Group()
  const membrane = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 20), glowMat('#ffb7c8', 0.18, 0.3))
  const droplet = new THREE.Mesh(new THREE.SphereGeometry(0.8, 22, 16), glowMat('#ffd75c', 0.55))
  droplet.position.y = -0.05
  const nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat('#ff7ad9', 0.7))
  nucleus.position.set(0.55, 0.72, 0.5)
  g.add(membrane, droplet, nucleus)
  g.userData.tick = (dt, time) => {
    droplet.scale.setScalar(1 + Math.sin(time * 1.2) * 0.03)
  }
  return g
}

function buildMacrophage() {
  const g = new THREE.Group()
  // 不规则团块：顶点扰动
  const geo = new THREE.IcosahedronGeometry(0.95, 3)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i)
    const n = 1 + (Math.sin(v.x * 7) + Math.cos(v.y * 6) + Math.sin(v.z * 5)) * 0.07
    v.multiplyScalar(n)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  const body = new THREE.Mesh(geo, glowMat('#8eb6ff', 0.42))
  g.add(body)
  // 伪足
  const pseudoMat = glowMat('#8eb6ff', 0.35, 0.85)
  const pseudos = []
  for (let i = 0; i < 5; i += 1) {
    const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(2 * (i / 5) - 1), i * 2.4)
    const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.7, 4, 10), pseudoMat)
    p.position.copy(dir).multiplyScalar(1.1)
    p.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    g.add(p)
    pseudos.push({ mesh: p, phase: i * 1.3 })
  }
  // 正在吞噬的“细菌”
  const snack = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat('#b6ff7a', 0.7))
  snack.position.set(1.05, 0.5, 0.6)
  g.add(snack)
  // 溶酶体颗粒
  for (let i = 0; i < 6; i += 1) {
    const ly = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glowMat('#ffd15c', 0.7))
    const dir = new THREE.Vector3().setFromSphericalCoords(0.6, Math.acos(2 * ((i * 0.37) % 1) - 1), i * 1.9)
    ly.position.copy(dir)
    g.add(ly)
  }
  g.userData.tick = (dt, time) => {
    pseudos.forEach((p) => {
      p.mesh.scale.setScalar(1 + Math.sin(time * 2.2 + p.phase) * 0.18)
    })
    body.rotation.y += dt * 0.15
  }
  return g
}

function buildLymphocyte() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 20), glowMat('#7af0c2', 0.4))
  g.add(body)
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), glowMat('#ff7ad9', 0.35, 0.55))
  g.add(nuc)
  // 表面受体
  const recMat = glowMat('#ffe08a', 0.6)
  const recs = []
  for (let i = 0; i < 34; i += 1) {
    const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(2 * ((i * 0.618) % 1) - 1), i * 2.399)
    const rec = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.2, 3, 6), recMat)
    rec.position.copy(dir).multiplyScalar(1.0)
    rec.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    g.add(rec)
    recs.push({ mesh: rec, phase: i })
  }
  // TCR 分子式样的一簇更长受体
  const tcr = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), glowMat('#ff5d86', 0.8))
  tcr.position.set(1.0, 0.2, 0)
  tcr.rotation.z = -Math.PI / 2.4
  g.add(tcr)
  g.userData.tick = (dt, time) => {
    recs.forEach((r) => {
      r.mesh.scale.setScalar(1 + Math.sin(time * 3 + r.phase) * 0.15)
    })
  }
  return g
}

function buildEpithelial() {
  const g = new THREE.Group()
  const cytoMat = glowMat('#7dffe8', 0.32)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 1.7, 22), cytoMat)
  body.position.y = -0.2
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), cytoMat)
  cap.position.y = 0.65
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), glowMat('#ff7ad9', 0.5))
  nuc.position.set(-0.15, -0.15, 0.42)
  g.add(body, cap, nuc)
  // 微绒毛（刷状缘）
  const microMat = glowMat('#c9a6ff', 0.5)
  for (let i = 0; i < 40; i += 1) {
    const a = (i / 40) * Math.PI * 2
    const rr = 0.55 * Math.sqrt((i * 0.618) % 1)
    const mv = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 5), microMat)
    mv.position.set(Math.cos(a) * rr, 1.0, Math.sin(a) * rr)
    g.add(mv)
  }
  // 基底面连接
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.06, 22), glowMat('#8eb6ff', 0.3, 0.5))
  base.position.y = -1.08
  g.add(base)
  g.userData.tick = (dt, time) => {
    microMat.emissiveIntensity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(time * 2.6))
  }
  return g
}

function buildSperm() {
  const g = new THREE.Group()
  const headMat = glowMat('#8eb6ff', 0.5)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), headMat)
  head.scale.set(1, 1.25, 0.62)
  head.rotation.z = Math.PI / 2
  g.add(head)
  // 顶体
  const acro = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14, 0, Math.PI), glowMat('#7dffe8', 0.4, 0.55))
  acro.scale.set(1, 1.2, 0.6)
  acro.rotation.z = -Math.PI / 2
  acro.position.x = 0.16
  g.add(acro)
  // 中段：线粒体螺旋
  const mitoMat = glowMat('#ff9f4a', 0.6)
  for (let i = 0; i < 7; i += 1) {
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.05, 6, 16), mitoMat)
    coil.position.x = -0.55 - i * 0.13
    coil.rotation.y = Math.PI / 2
    g.add(coil)
  }
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.95, 12), glowMat('#8eb6ff', 0.25, 0.35))
  mid.rotation.z = Math.PI / 2
  mid.position.x = -0.95
  g.add(mid)
  // 尾巴：链条球
  const tailMat = glowMat('#c9a6ff', 0.5)
  const tail = []
  for (let i = 0; i < 18; i += 1) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.06 + (1 - i / 18) * 0.03, 8, 6), tailMat)
    g.add(seg)
    tail.push(seg)
  }
  g.position.x = 1.4
  g.userData.tick = (dt, time) => {
    tail.forEach((seg, i) => {
      const p = i / 18
      seg.position.set(-1.45 - p * 2.6, Math.sin(time * 7 - p * 5) * 0.32 * p, 0)
    })
    mitoMat.emissiveIntensity = 0.45 + 0.3 * (0.5 + 0.5 * Math.sin(time * 4))
  }
  return g
}

function buildEgg() {
  const g = new THREE.Group()
  const cytoMat = glowMat('#ffd1ec', 0.3, 0.55)
  const ova = new THREE.Mesh(new THREE.SphereGeometry(1.0, 30, 22), cytoMat)
  const nuc = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), glowMat('#ff7ad9', 0.5))
  nuc.position.set(0.15, 0.1, 0.35)
  // 皮质颗粒
  const cortMat = glowMat('#ffe08a', 0.6)
  for (let i = 0; i < 20; i += 1) {
    const dir = new THREE.Vector3().setFromSphericalCoords(1, Math.acos(2 * ((i * 0.618) % 1) - 1), i * 2.399)
    const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), cortMat)
    c.position.copy(dir).multiplyScalar(0.86)
    g.add(c)
  }
  // 透明带
  const zona = new THREE.Mesh(new THREE.SphereGeometry(1.28, 28, 20), glowMat('#7dffe8', 0.15, 0.16))
  // 放射冠
  const coronaMat = glowMat('#8eb6ff', 0.5, 0.7)
  const corona = new THREE.Group()
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2
    const cell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), coronaMat)
    const rr = 1.62
    cell.position.set(Math.cos(a) * rr, Math.sin(a) * rr * 0.9, (i % 3 - 1) * 0.12)
    corona.add(cell)
  }
  g.add(ova, nuc, zona, corona)
  // 一个正在穿透明带的精子（剪影）
  const spermMini = new THREE.Group()
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat('#8eb6ff', 0.5))
  sh.scale.set(1, 1.3, 0.8)
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.6, 6), glowMat('#c9a6ff', 0.4))
  st.position.y = -0.42
  spermMini.add(sh, st)
  spermMini.position.set(1.55, 0.75, 0)
  g.add(spermMini)
  g.userData.tick = (dt, time) => {
    corona.rotation.z += dt * 0.1
    const p = 0.5 + 0.5 * Math.sin(time * 0.6)
    spermMini.position.set(1.75 - p * 0.75, 0.75 - p * 0.35, 0)
  }
  return g
}

function buildStem() {
  const g = new THREE.Group()
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.85, 28, 20), glowMat('#ffe08a', 0.55, 0.9))
  const halo = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), glowMat('#ffe08a', 0.25, 0.14))
  g.add(core, halo)
  // 三个分化方向的小箭头：血细胞 / 肌肉 / 神经
  const dirDefs = [
    ['#ff6b7d', [1.6, 0.5, 0]], // 血
    ['#ff8b6a', [0.2, 1.6, 0]], // 肌
    ['#c9a6ff', [-1.5, -0.4, 0.6]] // 神经
  ]
  for (const [color, pos] of dirDefs) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 8), glowMat(color, 0.7))
    arrow.position.set(...pos)
    arrow.lookAt(0, 0, 0)
    arrow.rotateX(Math.PI / 2)
    g.add(arrow)
    const mini = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), glowMat(color, 0.6))
    mini.position.set(pos[0] * 1.25, pos[1] * 1.25, pos[2] * 1.25)
    g.add(mini)
  }
  g.userData.tick = (dt, time) => {
    halo.scale.setScalar(1 + Math.sin(time * 1.6) * 0.05)
    core.rotation.y += dt * 0.2
  }
  return g
}

const BUILDERS = {
  rbc: buildRbc,
  neuron: buildNeuron,
  muscle: buildMuscle,
  osteocyte: buildOsteocyte,
  adipocyte: buildAdipocyte,
  macrophage: buildMacrophage,
  lymphocyte: buildLymphocyte,
  epithelial: buildEpithelial,
  sperm: buildSperm,
  egg: buildEgg,
  stem: buildStem
}

/**
 * 人体细胞图鉴 rig：一次展示一种细胞，点击面板切换。
 */
export function createHumanCellRig() {
  const group = new THREE.Group()
  let current = null
  let currentId = null
  let fadeT = 1 // 0 → 1 淡入
  let targetId = null

  function show(id) {
    if (!BUILDERS[id]) return
    targetId = id
    fadeT = 0
  }

  function mount(id) {
    if (current) {
      group.remove(current)
      current.traverse((obj) => {
        obj.geometry?.dispose?.()
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
        mats.forEach((m) => m.dispose?.())
      })
    }
    const def = CELL_TYPES.find((t) => t.id === id)
    current = BUILDERS[id]()
    const root = new THREE.Group()
    root.add(current)
    const meta = {
      id: `cell-${id}`,
      name: def.name,
      nameEn: def.en,
      kind: def.kind,
      summary: def.desc,
      facts: def.facts
    }
    let first = true
    root.traverse((obj) => {
      if (!obj.isMesh) return
      obj.userData.pick = meta
      if (first) {
        obj.userData.label = def.name
        first = false
      }
    })
    group.add(root)
    current = root
    currentId = id
  }

  function tick(dt, time) {
    // 淡入切换
    if (targetId && targetId !== currentId) {
      fadeT += dt * 2.4
      if (fadeT >= 0.5 && currentId !== targetId) {
        mount(targetId)
      }
      if (fadeT >= 1) fadeT = 1
    }
    if (current) {
      current.traverse((obj) => {
        obj.userData?.tick?.(dt, time)
      })
      // 淡入透明度对 emissive 调制太麻烦，改用整体缩放弹出
      const k = 0.6 + 0.4 * Math.min(1, fadeT)
      current.scale.setScalar(k)
      current.rotation.y += dt * 0.1
    }
  }

  mount('rbc')

  function dispose() {
    group.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => m.dispose?.())
    })
  }

  return { group, tick, show, dispose }
}
