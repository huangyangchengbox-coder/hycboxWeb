import * as THREE from 'three'

/** 海弗里克极限：人类正常体细胞体外培养约 40–60 次分裂（这里取 50 做示意）。 */
export const DIVISION_LIMIT = 50

export const DIVISION_PHASES = [
  { id: 'interphase', name: '间期', span: [0, 0.3], text: '细胞生长，DNA 完成复制。染色体还是松散的染色质。端粒在这一步悄悄变短——这是唯一没法修复的损耗。' },
  { id: 'prophase', name: '前期', span: [0.3, 0.45], text: '染色质浓缩成染色体。每条染色体由两条姐妹染色单体组成，在着丝粒相连，像一个 X。' },
  { id: 'metaphase', name: '中期', span: [0.45, 0.6], text: '染色体排列在赤道板上，纺锤丝从两极的中心体连向着丝粒，做最后的核对。' },
  { id: 'anaphase', name: '后期', span: [0.6, 0.75], text: '着丝粒分裂，姐妹染色单体被纺锤丝拉向两极。这是细胞里最精确的一道分装工序。' },
  { id: 'telophase', name: '末期', span: [0.75, 1], text: '两组染色体到达两极，核膜重新形成，细胞膜从中间收拢——一个细胞变成两个。' }
]

const CYCLE_SECONDS = 9

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

export function phaseAt(t) {
  return DIVISION_PHASES.find((p) => t >= p.span[0] && t < p.span[1]) || DIVISION_PHASES[4]
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}

function smooth(x) {
  return x * x * (3 - 2 * x)
}

/**
 * 细胞分裂极限 rig：
 * - 中央：一个细胞按 5 阶段循环分裂（间期→前期→中期→后期→末期）
 * - 右上：一条放大的染色体，端粒帽随分裂次数缩短
 * - 每完成一轮：divisionCount + 1，端粒 -1/DIVISION_LIMIT
 * - 端粒耗尽 → 细胞进入衰老态（停止分裂、变扁平、发 SASP 信号）
 * - 端粒酶开启：端粒被补回，可以无限分裂（癌细胞 / 干细胞的路线）
 */
export function createDivisionRig(hooks = {}) {
  const group = new THREE.Group()

  // ---------- 主细胞 ----------
  const cellMat = glowMat('#7dffe8', 0.28, 0.24)
  const cell = new THREE.Mesh(new THREE.SphereGeometry(1.45, 40, 28), cellMat)
  cell.userData.label = '细胞'
  cell.userData.pick = {
    id: 'div-cell',
    name: '细胞',
    nameEn: 'CELL',
    kind: '分裂主体',
    summary: '这里的动画跟随其中一个子细胞代代相传。50 次左右后它会停下——这就是海弗里克极限。',
    facts: [['极限', '人类正常体细胞约 40–60 次分裂']]
  }
  const lobL = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 22), cellMat)
  const lobR = lobL.clone()
  lobL.visible = lobR.visible = false
  group.add(cell, lobL, lobR)

  // 染色质（间期）：几条松散的弯管
  const chromatin = new THREE.Group()
  const chromatinMats = []
  for (let i = 0; i < 5; i += 1) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85 + Math.random() * 0.5, -0.7 + i * 0.32, -0.4 + Math.random() * 0.8),
      new THREE.Vector3(-0.2, -0.5 + i * 0.3, 0.3),
      new THREE.Vector3(0.5, -0.2 + i * 0.28, -0.3),
      new THREE.Vector3(0.9, 0.05 + i * 0.26, 0.35)
    ])
    const mat = glowMat(i % 2 ? '#ffd15c' : '#ff8ad4', 0.4)
    chromatinMats.push(mat)
    chromatin.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.035, 5, false), mat))
  }
  group.add(chromatin)

  // ---------- 染色体 ----------
  // 每条染色体 = 2 条染色单体（胶囊交叉成 X）+ 4 个端粒帽（青色小球）
  const teloMat = glowMat('#7dffe8', 0.85)
  const chromatidMat = glowMat('#ffd15c', 0.45)
  const chromosomes = []
  const chromoGroup = new THREE.Group()
  const CHROMO_SPOTS = [
    { pos: [0, 0.62, 0], rot: 0.5 },
    { pos: [0, -0.5, 0.35], rot: -0.35 },
    { pos: [0.35, 0.05, -0.5], rot: 0.9 },
    { pos: [-0.4, -0.1, -0.25], rot: -0.7 }
  ]
  for (const spot of CHROMO_SPOTS) {
    const chromo = new THREE.Group()
    const unitA = new THREE.Group()
    const unitB = new THREE.Group()
    for (const [unit, dir] of [[unitA, -1], [unitB, 1]]) {
      const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.72, 4, 10), chromatidMat)
      rod.rotation.z = dir * 0.42
      unit.add(rod)
      // 两个端粒帽在染色单体两端
      for (const sign of [1, -1]) {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), teloMat)
        cap.position.set(0, sign * 0.46, 0)
        unit.add(cap)
      }
      chromo.add(unit)
    }
    chromo.position.set(...spot.pos)
    chromo.rotation.y = spot.rot
    chromo.traverse((obj) => {
      if (!obj.isMesh) return
      obj.userData.pick = {
        id: 'div-chromosome',
        name: '染色体',
        nameEn: 'CHROMOSOME',
        kind: '遗传信息的包裹',
        summary: '一条染色体 = 两条姐妹染色单体（后期才分开）。末端的青色小球是端粒——注意看它们随分裂次数变小。',
        facts: [['人类', '46 条（23 对）'], ['这里', '只画了 4 条做示意']]
      }
    })
    chromoGroup.add(chromo)
    chromosomes.push({ group: chromo, unitA, unitB })
  }
  group.add(chromoGroup)

  // 纺锤丝：两极 → 染色体
  const spindleGeo = new THREE.BufferGeometry()
  const spindleMat = new THREE.LineBasicMaterial({ color: '#8eb6ff', transparent: true, opacity: 0 })
  const spindle = new THREE.LineSegments(spindleGeo, spindleMat)
  group.add(spindle)
  const poles = [new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat('#8eb6ff', 0.7)), null]
  poles[1] = poles[0].clone()
  poles[0].position.set(-2.0, 0, 0)
  poles[1].position.set(2.0, 0, 0)
  group.add(poles[0], poles[1])

  // ---------- 放大教学染色体（带端粒标签） ----------
  const bigChromo = new THREE.Group()
  const bigMat = glowMat('#ffd15c', 0.5)
  const bigTeloMat = glowMat('#7dffe8', 1.0)
  const bigUnits = []
  for (const dir of [-1, 1]) {
    const unit = new THREE.Group()
    const rod = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 1.5, 6, 14), bigMat)
    rod.rotation.z = dir * 0.4
    unit.add(rod)
    unit.userData.caps = []
    for (const sign of [1, -1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), bigTeloMat)
      cap.position.set(0, sign * 0.92, 0)
      unit.add(cap)
      unit.userData.caps.push(cap)
    }
    bigChromo.add(unit)
    bigUnits.push(unit)
  }
  bigChromo.position.set(3.4, 1.9, 0)
  bigChromo.rotation.z = 0.18
  bigChromo.userData.label = '染色体 · 端粒'
  const telomerePick = {
    id: 'div-telomere',
    name: '端粒',
    nameEn: 'TELOMERE',
    kind: '染色体末端的帽子',
    summary: '端粒是染色体末端的重复序列（TTAGGG × 几千次），像鞋带头上的塑料套，保护染色体不被磨秃、不互相粘连。DNA 复制没法复制到最末端，所以每分裂一次，端粒就短一截。',
    facts: [['长度', '人类新生儿约 8–15 kb'], ['分裂损耗', '每次分裂约丢 25–200 个碱基']]
  }
  bigChromo.traverse((obj) => {
    if (obj.isMesh) obj.userData.pick = telomerePick
  })
  group.add(bigChromo)

  // 衰老信号颗粒（SASP）
  const saspGeo = new THREE.BufferGeometry()
  const saspCount = 90
  const saspArr = new Float32Array(saspCount * 3)
  const saspVel = []
  for (let i = 0; i < saspCount; i += 1) {
    saspArr[i * 3] = (Math.random() - 0.5) * 2.4
    saspArr[i * 3 + 1] = (Math.random() - 0.5) * 1.4
    saspArr[i * 3 + 2] = (Math.random() - 0.5) * 2.4
    saspVel.push(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3))
  }
  saspGeo.setAttribute('position', new THREE.BufferAttribute(saspArr, 3))
  const saspMat = new THREE.PointsMaterial({ color: '#ff5d86', size: 0.075, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const sasp = new THREE.Points(saspGeo, saspMat)
  group.add(sasp)

  // ---------- 状态 ----------
  const state = {
    t: 0,
    playing: false,
    speed: 1,
    divisionCount: 0,
    telomere: 1,
    senescent: false,
    telomerase: false,
    phase: 'interphase'
  }
  let lastEmit = 0

  function emit(force) {
    const now = performance.now()
    if (!force && now - lastEmit < 90) return
    lastEmit = now
    hooks.onState?.({
      phase: state.phase,
      phaseIdx: DIVISION_PHASES.findIndex((p) => p.id === state.phase),
      progress: state.t,
      divisionCount: state.divisionCount,
      telomerePct: Math.round(state.telomere * 100),
      senescent: state.senescent,
      telomerase: state.telomerase,
      playing: state.playing
    })
  }

  function updateSpindle(visible, alpha) {
    spindleMat.opacity = alpha
    poles[0].visible = poles[1].visible = visible
    if (alpha <= 0.01) return
    const pts = []
    for (const c of chromosomes) {
      for (const pole of [[-2.0, 0, 0], [2.0, 0, 0]]) {
        pts.push(pole[0], pole[1], pole[2], c.group.position.x, c.group.position.y, c.group.position.z)
      }
    }
    spindleGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  }

  function layout(t) {
    const ph = phaseAt(t).id
    state.phase = ph
    // 主体显示：末期用两个子细胞，其它阶段用单细胞
    const inCytokinesis = t >= 0.75
    cell.visible = !inCytokinesis
    lobL.visible = lobR.visible = inCytokinesis
    if (state.senescent) {
      cell.visible = true
      lobL.visible = lobR.visible = false
      cell.scale.set(1.25, 0.5, 1.25) // 衰老细胞变扁平
      cellMat.color.set('#c9b28a')
      cellMat.emissive.set('#c9b28a')
      cellMat.emissiveIntensity = 0.2
      cellMat.opacity = 0.32
      chromatin.visible = true
      chromoGroup.visible = false
      updateSpindle(false, 0)
      bigChromo.visible = true
      saspMat.opacity = 0.85
      return
    }
    saspMat.opacity = 0
    cellMat.color.set('#7dffe8')
    cellMat.emissive.set('#7dffe8')
    cellMat.emissiveIntensity = 0.28
    cellMat.opacity = 0.24
    cell.scale.setScalar(1)
    if (inCytokinesis) {
      const k = smooth((t - 0.75) / 0.25)
      const spread = 0.45 + k * 0.85
      const grow = 0.62 + k * 0.4
      lobL.scale.setScalar(grow)
      lobR.scale.setScalar(grow)
      lobL.position.x = -spread
      lobR.position.x = spread
    }
    // 染色质 → 染色体
    const condense = clamp01((t - 0.3) / 0.12)
    chromatin.visible = condense < 0.98
    chromatin.scale.setScalar(1)
    chromoGroup.visible = true
    for (const mat of chromatinMats) mat.opacity = 1 - condense
    for (const { group: chromo, unitA, unitB } of chromosomes) {
      chromo.scale.setScalar(0.25 + 0.75 * condense)
      if (ph === 'interphase' || ph === 'prophase') {
        // 间期/前期：回到各自的原始位置
        const spot = CHROMO_SPOTS[chromosomes.findIndex((c) => c.group === chromo)].pos
        chromo.position.set(spot[0], spot[1], spot[2])
        unitA.position.x = 0
        unitB.position.x = 0
        unitA.rotation.z = 0
        unitB.rotation.z = 0
      } else if (ph === 'metaphase') {
        // 中期：全部挪到赤道板（x=0），分散在 yz 平面
        const idx = chromosomes.findIndex((c) => c.group === chromo)
        chromo.position.x = 0
        chromo.position.y = Math.sin(idx * 2.1) * 0.62
        chromo.position.z = Math.cos(idx * 2.1) * 0.62
        unitA.position.x = 0
        unitB.position.x = 0
      } else if (ph === 'anaphase') {
        // 后期：姐妹染色单体分开（保持赤道板上的分布）
        const idx = chromosomes.findIndex((c) => c.group === chromo)
        chromo.position.set(0, Math.sin(idx * 2.1) * 0.62, Math.cos(idx * 2.1) * 0.62)
        const k = smooth((t - 0.6) / 0.15)
        unitA.position.x = -k * 1.15
        unitB.position.x = k * 1.15
      } else {
        // 末期：各自聚到两极
        unitA.position.x = -1.3
        unitB.position.x = 1.3
        const idx = chromosomes.findIndex((c) => c.group === chromo)
        chromo.position.x = 0
        chromo.position.y = Math.sin(idx * 2.1) * 0.4
        chromo.position.z = Math.cos(idx * 2.1) * 0.4
      }
    }
    // 纺锤丝
    if (ph === 'metaphase') updateSpindle(true, 0.55)
    else if (ph === 'anaphase') updateSpindle(true, 0.75)
    else if (ph === 'telophase') updateSpindle(true, Math.max(0, 0.4 - (t - 0.75) * 1.6))
    else updateSpindle(false, 0)
    // 教学染色体的端粒帽按剩余比例缩放
    const capScale = 0.35 + 0.65 * state.telomere
    for (const unit of bigUnits) {
      for (const cap of unit.userData.caps) cap.scale.setScalar(capScale)
    }
    // 端粒帽颜色：剩余越少越红
    const alert = state.telomere < 0.3
    bigTeloMat.color.set(alert ? '#ff5d86' : '#7dffe8')
    bigTeloMat.emissive.set(alert ? '#ff5d86' : '#7dffe8')
    teloMat.color.set(alert ? '#ff5d86' : '#7dffe8')
    teloMat.emissive.set(alert ? '#ff5d86' : '#7dffe8')
  }

  function finishDivision() {
    state.divisionCount += 1
    if (state.telomerase) {
      // 端粒酶把端粒补回去：可以一直分下去（干细胞的例行操作、癌细胞的逃逸路线）
      state.telomere = 1
    } else {
      state.telomere = Math.max(0, state.telomere - 1 / DIVISION_LIMIT)
      if (state.telomere <= 0) {
        state.senescent = true
        state.playing = false
      }
    }
    emit(true)
  }

  function tick(dt) {
    if (state.playing && !state.senescent) {
      state.t += (dt * state.speed) / CYCLE_SECONDS
      if (state.t >= 1) {
        state.t = 0
        finishDivision()
      }
      emit()
    }
    layout(state.t)
    // SASP 颗粒漂移
    if (saspMat.opacity > 0.01) {
      const arr = saspGeo.attributes.position.array
      for (let i = 0; i < saspCount; i += 1) {
        const v = saspVel[i]
        arr[i * 3] += v.x * dt
        arr[i * 3 + 1] += v.y * dt
        arr[i * 3 + 2] += v.z * dt
        const r = Math.hypot(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
        if (r > 2.2) {
          const s = 0.4 / r
          arr[i * 3] *= s
          arr[i * 3 + 1] *= s
          arr[i * 3 + 2] *= s
        }
      }
      saspGeo.attributes.position.needsUpdate = true
    }
    bigChromo.rotation.y += dt * 0.25
    chromoGroup.rotation.y += dt * 0.12
  }

  function setPlaying(on) {
    state.playing = !!on && !state.senescent
    emit(true)
  }

  function setSpeed(v) {
    state.speed = v
  }

  function setTelomerase(on) {
    state.telomerase = !!on
    if (on) state.senescent = false
    emit(true)
  }

  function scrubTo(t) {
    state.t = Math.min(0.999, Math.max(0, t))
    state.playing = false
    layout(state.t)
    emit(true)
  }

  function reset() {
    state.t = 0
    state.divisionCount = 0
    state.telomere = 1
    state.senescent = false
    state.playing = false
    layout(0)
    emit(true)
  }

  layout(0)
  emit(true)

  function dispose() {
    group.traverse((obj) => {
      obj.geometry?.dispose?.()
      const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []
      mats.forEach((m) => m.dispose?.())
    })
  }

  return { group, tick, setPlaying, setSpeed, setTelomerase, scrubTo, reset, dispose }
}
