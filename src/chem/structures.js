export const ATOM_COLOR = {
  H: '#e7eef4',
  C: '#4a4e55',
  N: '#3c57d6',
  O: '#e23b3b',
  Na: '#a84bdc',
  Cl: '#3cba55',
  Fe: '#d4844a',
  S: '#d6c84a'
}

export function atomColor(el) {
  return ATOM_COLOR[el] || '#8fb8de'
}

function unit(x, y, z) {
  const l = Math.hypot(x, y, z) || 1
  return [x / l, y / l, z / l]
}

function mul(p, s) {
  return [p[0] * s, p[1] * s, p[2] * s]
}

function tripod(angleDeg, length) {
  const beta = angleDeg * Math.PI / 180
  const s = Math.sqrt(Math.max(0, (1 - Math.cos(beta)) / 1.5))
  const c = Math.sqrt(Math.max(0, 1 - s * s))
  const y = -c
  return [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2
    return mul([s * Math.cos(a), y, s * Math.sin(a)], length)
  })
}

const tetra = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map((p) => mul(unit(...p), 1.12))

export const SHAPES = [
  {
    id: 'ch4',
    name: '甲烷',
    formula: 'CH₄',
    angle: '109.5°',
    ideal: '109.5°',
    dipole: false,
    why: '四对成键电子互相躲开，得到正四面体。没有孤对电子，键角不被压小。',
    atoms: [{ el: 'C', p: [0, 0, 0] }, ...tetra.map((p) => ({ el: 'H', p }))],
    bonds: [[0, 1], [0, 2], [0, 3], [0, 4]],
    balloons: []
  },
  {
    id: 'nh3',
    name: '氨',
    formula: 'NH₃',
    angle: '107°',
    ideal: '109.5°',
    dipole: true,
    why: '氮上有一对孤对电子。孤对比成键电子占的地方更大，把三个 N–H 键挤到大约 107°。',
    atoms: [{ el: 'N', p: [0, 0, 0] }, ...tripod(107, 1.05).map((p) => ({ el: 'H', p }))],
    bonds: [[0, 1], [0, 2], [0, 3]],
    balloons: [[0, 0.72, 0]]
  },
  {
    id: 'h2o',
    name: '水',
    formula: 'H₂O',
    angle: '104.5°',
    ideal: '109.5°',
    dipole: true,
    why: '氧有两对孤对电子，把 H–O–H 压到约 104.5°。分子弯了，正负电荷中心不重合，所以水能溶解盐。',
    atoms: [
      { el: 'O', p: [0, 0, 0] },
      { el: 'H', p: [Math.sin(0.912), -Math.cos(0.912), 0] },
      { el: 'H', p: [-Math.sin(0.912), -Math.cos(0.912), 0] }
    ],
    bonds: [[0, 1], [0, 2]],
    balloons: [[0, 0.35, 0.62], [0, 0.35, -0.62]]
  },
  {
    id: 'co2',
    name: '二氧化碳',
    formula: 'CO₂',
    angle: '180°',
    ideal: '180°',
    dipole: false,
    why: '碳两边各接一个氧，两对双键成 180°。两边拉力抵消，分子没有净偶极。',
    atoms: [
      { el: 'C', p: [0, 0, 0] },
      { el: 'O', p: [-1.16, 0, 0] },
      { el: 'O', p: [1.16, 0, 0] }
    ],
    bonds: [[0, 1], [0, 2]],
    balloons: []
  },
  {
    id: 'benzene',
    name: '苯',
    formula: 'C₆H₆',
    angle: '120°',
    ideal: '120°',
    dipole: false,
    why: '六个碳在一个平面上，键角 120°。离域的 π 键让它特别稳，不是单双键交替那么简单。',
    atoms: Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2
      return [
        { el: 'C', p: [Math.cos(a) * 1.25, 0, Math.sin(a) * 1.25] },
        { el: 'H', p: [Math.cos(a) * 2.15, 0, Math.sin(a) * 2.15] }
      ]
    }).flat(),
    bonds: Array.from({ length: 6 }, (_, i) => [[i * 2, ((i + 1) % 6) * 2], [i * 2, i * 2 + 1]]).flat(),
    balloons: []
  }
]

function burn() {
  const atoms = ['H', 'H', 'H', 'H', 'O', 'O']
  const before = [[-2.3, 0.45, 0], [-1.55, 0.45, 0], [-2.3, -0.45, 0], [-1.55, -0.45, 0], [1.45, 0, 0], [2.25, 0, 0]]
  const mid = [[-1.2, 0.8, 0.4], [-0.7, 0.2, -0.5], [0.2, 0.7, 0.3], [0.6, -0.2, -0.4], [-0.2, -0.6, 0.5], [0.9, 0.4, 0.2]]
  const after = [[-1.55, 0.42, 0], [-1.15, -0.28, 0.35], [1.15, 0.42, 0], [1.55, -0.28, 0.35], [-1.05, 0.05, -0.15], [1.05, 0.05, -0.15]]
  return {
    id: 'burn',
    name: '氢气燃烧',
    equation: '2H₂ + O₂ → 2H₂O',
    note: '放热。旧的 H–H、O=O 断开，组成新的 O–H。原子仍是 4 个氢和 2 个氧。',
    counts: [['H', 4], ['O', 2]],
    atoms,
    frames: [
      { name: '反应前', pos: before, bonds: [[0, 1], [2, 3], [4, 5]] },
      { name: '断键', pos: mid, bonds: [] },
      { name: '生成水', pos: after, bonds: [[4, 0], [4, 1], [5, 2], [5, 3]] }
    ]
  }
}

function neutralize() {
  const atoms = ['H', 'Cl', 'Na', 'O', 'H']
  const before = [[-2.15, 0.25, 0], [-1.25, 0.25, 0], [0.95, 0.35, 0], [1.75, 0.05, 0], [2.25, 0.55, 0]]
  const mid = [[-0.4, 0.6, 0.3], [-0.9, -0.2, -0.2], [0.2, 0.2, 0.5], [0.7, -0.4, 0], [1.1, 0.45, -0.3]]
  const after = [[1.45, 0.42, 0], [-0.35, 0, 0], [-1.25, 0, 0], [0.85, 0, 0], [1.25, -0.38, 0.15]]
  return {
    id: 'neutral',
    name: '中和',
    equation: 'HCl + NaOH → NaCl + H₂O',
    note: '酸里的 H⁺ 和碱里的 OH⁻ 组成水，剩下钠离子和氯离子。拖到后半段时，把 pH 想成从酸性走到接近 7。',
    counts: [['H', 2], ['Cl', 1], ['Na', 1], ['O', 1]],
    atoms,
    frames: [
      { name: '酸碱分开', pos: before, bonds: [[0, 1], [2, 3], [3, 4]] },
      { name: '相遇', pos: mid, bonds: [] },
      { name: '盐和水', pos: after, bonds: [[2, 1], [3, 0], [3, 4]] }
    ]
  }
}

function rust() {
  const atoms = []
  const before = []
  const after = []
  for (let i = 0; i < 4; i += 1) {
    atoms.push('Fe')
    before.push([-2.2 + (i % 2) * 0.7, i < 2 ? 0.45 : -0.45, 0])
    const a = (i / 4) * Math.PI * 2
    after.push([Math.cos(a) * 0.85, Math.sin(a) * 0.55, 0.2])
  }
  for (let i = 0; i < 6; i += 1) {
    atoms.push('O')
    before.push([1.3 + (i % 3) * 0.7, i < 3 ? 0.35 : -0.35, 0])
    after.push([Math.cos(i) * 1.45, Math.sin(i * 1.3) * 0.9, (i % 2) * 0.35])
  }
  const bonds0 = [[4, 5], [6, 7], [8, 9]]
  const bonds2 = [[0, 4], [0, 5], [1, 5], [1, 6], [2, 6], [2, 7], [3, 7], [3, 8], [0, 9], [2, 4]]
  const mid = before.map((p, i) => [(p[0] + after[i][0]) / 2, (p[1] + after[i][1]) / 2, (p[2] + after[i][2]) / 2])
  return {
    id: 'rust',
    name: '铁生锈',
    equation: '4Fe + 3O₂ → 2Fe₂O₃',
    note: '慢反应。画面把时间加快了很多。铁和氧都还在，只是从单质变成了氧化物。',
    counts: [['Fe', 4], ['O', 6]],
    atoms,
    frames: [
      { name: '铁和氧气', pos: before, bonds: bonds0 },
      { name: '表面开始反应', pos: mid, bonds: [] },
      { name: '氧化铁', pos: after, bonds: bonds2 }
    ]
  }
}

function photosynthesis() {
  const atoms = []
  const before = []
  const after = []
  const bonds0 = []
  const bonds2 = []
  for (let i = 0; i < 6; i += 1) {
    const x = -2.5 + (i % 3) * 1.15
    const y = i < 3 ? 1.15 : 0.05
    const c = atoms.length
    atoms.push('C', 'O', 'O')
    before.push([x, y, -0.6], [x - 0.32, y, -1.05], [x + 0.32, y, -1.05])
    bonds0.push([c, c + 1], [c, c + 2])
    const ang = (i / 6) * Math.PI * 2
    after.push(
      [Math.cos(ang) * 0.95, Math.sin(ang) * 0.95, 0.8],
      [Math.cos(ang) * 1.55, Math.sin(ang) * 1.55, 0.8],
      [2.4 + (i % 3) * 0.55, i < 3 ? 1.2 : 0.55, -0.2]
    )
    bonds2.push([c, (i === 5 ? 0 : c + 3)], [c, c + 1])
  }
  for (let i = 0; i < 6; i += 1) {
    const x = -2.5 + (i % 3) * 1.15
    const y = i < 3 ? -1.05 : -2.15
    const o = atoms.length
    atoms.push('O', 'H', 'H')
    before.push([x, y, -0.6], [x - 0.28, y + 0.26, -0.6], [x + 0.28, y + 0.26, -0.6])
    bonds0.push([o, o + 1], [o, o + 2])
    const ang = (i / 6) * Math.PI * 2 + 0.35
    after.push(
      [2.15 + (i % 3) * 0.55, i < 3 ? 1.45 : 0.8, 0.15],
      [Math.cos(ang) * 0.95 + 0.28, Math.sin(ang) * 0.95, 1.15],
      [Math.cos(ang) * 1.55, Math.sin(ang) * 1.55, 1.2]
    )
    bonds2.push([o, 3 * i + 2], [3 * i, o + 1], [3 * i + 1, o + 2])
  }
  const mid = before.map((p, i) => p.map((v, k) => (v + after[i][k]) / 2))
  return {
    id: 'photo',
    name: '光合作用',
    equation: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
    note: '叶绿体里发生的原子重组。葡萄糖的立体结构这里做了简化，原子种类和数目与方程式一致：6 碳、12 氢、18 氧。',
    counts: [['C', 6], ['H', 12], ['O', 18]],
    atoms,
    frames: [
      { name: '二氧化碳和水', pos: before, bonds: bonds0 },
      { name: '重组', pos: mid, bonds: [] },
      { name: '糖和氧气', pos: after, bonds: bonds2 }
    ]
  }
}

export const REACTIONS = [burn(), neutralize(), rust(), photosynthesis()]

export function reactionFrame(reaction, t) {
  const frames = reaction.frames
  const x = Math.max(0, Math.min(1, t)) * (frames.length - 1)
  const i = Math.min(frames.length - 2, Math.floor(x))
  const u = x - i
  const pos = frames[i].pos.map((p, k) => p.map((v, axis) => v + (frames[i + 1].pos[k][axis] - v) * u))
  const bonds = u < 0.5 ? frames[i].bonds : frames[i + 1].bonds
  const name = u < 0.5 ? frames[i].name : frames[i + 1].name
  return { pos, bonds, name }
}

function center(atoms) {
  const n = atoms.length || 1
  const c = atoms.reduce((s, a) => [s[0] + a.x, s[1] + a.y, s[2] + a.z], [0, 0, 0]).map((v) => v / n)
  return atoms.map((a) => ({ ...a, x: a.x - c[0], y: a.y - c[1], z: a.z - c[2] }))
}

function bondsNear(atoms, min, max) {
  const bonds = []
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      const d = Math.hypot(atoms[i].x - atoms[j].x, atoms[i].y - atoms[j].y, atoms[i].z - atoms[j].z)
      if (d >= min && d <= max) bonds.push([i, j])
    }
  }
  return bonds
}

export function buildCrystal(id, param) {
  if (id === 'nacl') {
    const n = Math.max(2, Math.min(4, Math.round(param)))
    const atoms = []
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        for (let k = 0; k < n; k += 1) {
          atoms.push({ el: (i + j + k) % 2 ? 'Cl' : 'Na', x: i, y: j, z: k, r: (i + j + k) % 2 ? 0.28 : 0.2 })
        }
      }
    }
    return { atoms: center(atoms), bonds: bondsNear(atoms, 0.9, 1.05) }
  }
  if (id === 'diamond') {
    const n = param > 1.5 ? 2 : 1
    const fcc = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]]
    const basis = [[0, 0, 0], [0.25, 0.25, 0.25]]
    const raw = []
    for (let ix = 0; ix < n; ix += 1) {
      for (let iy = 0; iy < n; iy += 1) {
        for (let iz = 0; iz < n; iz += 1) {
          for (const f of fcc) {
            for (const b of basis) raw.push({ el: 'C', x: ix + f[0] + b[0], y: iy + f[1] + b[1], z: iz + f[2] + b[2], r: 0.16 })
          }
        }
      }
    }
    const atoms = center(raw)
    return { atoms, bonds: bondsNear(atoms, 0.38, 0.48) }
  }
  if (id === 'graphite') {
    const gap = 0.7 + param * 0.55
    const raw = []
    for (let layer = 0; layer < 3; layer += 1) {
      const y = (layer - 1) * gap
      for (let q = -2; q <= 2; q += 1) {
        for (let r = -2; r <= 2; r += 1) {
          if (Math.abs(q + r) > 2) continue
          raw.push({
            el: 'C',
            x: (q + r / 2) * 0.72,
            y,
            z: r * 0.62,
            r: 0.14,
            layer
          })
        }
      }
    }
    const atoms = center(raw)
    const bonds = []
    for (let i = 0; i < atoms.length; i += 1) {
      for (let j = i + 1; j < atoms.length; j += 1) {
        if (Math.abs(atoms[i].y - atoms[j].y) > 0.2) continue
        const d = Math.hypot(atoms[i].x - atoms[j].x, atoms[i].z - atoms[j].z)
        if (d > 0.55 && d < 0.78) bonds.push([i, j])
      }
    }
    return { atoms, bonds }
  }
  const gap = 0.85 + param * 0.7
  const raw = []
  for (let layer = 0; layer < 2; layer += 1) {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + layer * 0.45
      raw.push({ el: 'O', x: Math.cos(a) * 1.05, y: (layer - 0.5) * gap, z: Math.sin(a) * 1.05, r: 0.26 })
    }
  }
  const atoms = center(raw)
  const bonds = []
  for (let layer = 0; layer < 2; layer += 1) {
    for (let i = 0; i < 6; i += 1) bonds.push([layer * 6 + i, layer * 6 + ((i + 1) % 6)])
    if (layer === 0) bonds.push([iSafe(0), iSafe(6)], [2, 8], [4, 10])
  }
  return { atoms, bonds }
}

function iSafe(i) {
  return i
}

export const CRYSTALS = [
  { id: 'nacl', name: '氯化钠', text: '钠和氯交替排列。滑块让晶胞向外长，离子键没有方向，所以它长成块。' },
  { id: 'diamond', name: '金刚石', text: '每个碳连四个碳，键角约 109.5°，整块是一个刚性的网，所以很硬。' },
  { id: 'graphite', name: '石墨', text: '层内是牢固的六边形，层与层之间只有很弱的力。滑块把层拉开：铅笔能写字，靠的就是层滑开。' },
  { id: 'ice', name: '冰', text: '水分子靠氢键搭成有空洞的架子。空洞让冰的密度小于液态水，所以冰会浮。这是骨架示意，不是完整晶胞。' }
]

export function bondStory(delta) {
  if (delta < 0.4) return { name: '非极性共价', text: '两边拉电子的能力差不多，共用的电子待在中间。' }
  if (delta < 1.7) return { name: '极性共价', text: '电子更靠近电负性大的一边，键有了正负两端。水就是这样。' }
  return { name: '离子键', text: '电子几乎完全到了电负性大的原子上，两边变成离子，靠静电吸在一起。' }
}
