import * as THREE from 'three'

/**
 * 参数化滑板建模。1 场景单位 = 1 m；参数单位 cm（boards.js）。
 * 板面：侧视轮廓 Shape（含板头/板尾翘起）→ ExtrudeGeometry 沿板宽挤出。
 * 桥 + 轮：程序化几何，轮径/硬度决定配色（软轮青色 / 硬轮奶白）。
 */

function cm(v) {
  return v / 100
}

/** 侧视轮廓：从板尾到板头的上缘 + 下缘，形成闭合 Shape（xy 平面，y 向上）。 */
function deckShape(cfg) {
  const L = cm(cfg.length)
  const wb = cm(cfg.wheelbase)
  const half = L / 2
  const thick = 0.011
  const flat = wb / 2 + 0.07 // 桥间平直段半长
  const tailLift = Math.tan((cfg.kickTail * Math.PI) / 180) * Math.max(0, half - flat)
  const noseLift = Math.tan((cfg.kickNose * Math.PI) / 180) * Math.max(0, half - flat)
  const top = [
    new THREE.Vector2(-half, tailLift),
    new THREE.Vector2(-flat - 0.03, 0.004),
    new THREE.Vector2(-flat, 0),
    new THREE.Vector2(flat, 0),
    new THREE.Vector2(flat + 0.03, 0.004),
    new THREE.Vector2(half, noseLift)
  ]
  const shape = new THREE.Shape()
  shape.moveTo(top[0].x, top[0].y)
  for (let i = 1; i < top.length; i++) shape.lineTo(top[i].x, top[i].y)
  // 底缘（沿板厚往下回）
  for (let i = top.length - 1; i >= 0; i--) shape.lineTo(top[i].x, top[i].y - thick)
  return shape
}

export function buildBoard(cfg) {
  const group = new THREE.Group()
  const disposables = []
  const track = (item) => {
    disposables.push(item)
    return item
  }
  const mats = []
  const mat = (params) => {
    const m = track(new THREE.MeshStandardMaterial(params))
    mats.push(m)
    return m
  }

  // ---- 板面 ----
  const deckGeo = track(new THREE.ExtrudeGeometry(deckShape(cfg), {
    depth: cm(cfg.width),
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 8
  }))
  deckGeo.translate(0, 0, -cm(cfg.width) / 2) // 板宽居中于 z
  const deckMat = mat({ color: new THREE.Color(cfg.color), roughness: 0.45, metalness: 0.1 })
  const deck = new THREE.Mesh(deckGeo, deckMat)
  deck.castShadow = true
  group.add(deck)

  // 砂纸层（顶面深色薄片，铺桥间平直段）
  const gripGeo = track(new THREE.BoxGeometry(cm(cfg.wheelbase) + 0.16, 0.002, cm(cfg.width) * 0.92))
  const gripMat = mat({ color: 0x111418, roughness: 0.95 })
  const grip = new THREE.Mesh(gripGeo, gripMat)
  grip.position.y = 0.012
  group.add(grip)

  // ---- 桥 ----
  const truckMat = mat({ color: 0xb8c0cc, roughness: 0.35, metalness: 0.75 })
  const wheelMat = mat({
    color: cfg.wheelDurometer >= 95 ? 0xf1f0e8 : 0x2fd6e0,
    roughness: cfg.wheelDurometer >= 95 ? 0.4 : 0.7
  })
  const axleMat = mat({ color: 0x8b95a3, roughness: 0.4, metalness: 0.8 })

  const wheels = []
  const wb = cm(cfg.wheelbase)
  const rWheel = cfg.wheelDia / 2000
  const wheelGeo = track(new THREE.CylinderGeometry(rWheel, rWheel, 0.032, 20))

  for (const x of [wb / 2, -wb / 2]) {
    // 底座 + 主销
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.018, 0.045)), truckMat)
    base.position.set(x, 0.022, 0)
    group.add(base)
    const kingpin = new THREE.Mesh(track(new THREE.CylinderGeometry(0.007, 0.007, 0.05, 10)), axleMat)
    kingpin.position.set(x, 0.03, 0)
    group.add(kingpin)
    // 陆冲前桥：加弹簧圈示意
    if (cfg.id === 'surfskate' && x > 0) {
      const spring = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.02, 0.005, 8, 20)),
        mat({ color: 0xff9f4a, roughness: 0.5 })
      )
      spring.rotation.x = Math.PI / 2
      spring.position.set(x + 0.02, 0.035, 0)
      group.add(spring)
    }
    // 轮（轴沿 z 横向）
    for (const side of [1, -1]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat)
      wheel.rotation.x = Math.PI / 2 // 局部 y → 世界 z
      wheel.position.set(x, rWheel, side * 0.062)
      wheel.castShadow = true
      group.add(wheel)
      wheels.push(wheel)
    }
  }

  return {
    group,
    wheels,
    wheelRadius: rWheel,
    dispose() {
      disposables.forEach((item) => item.dispose())
      group.removeFromParent()
    }
  }
}

/** 四板并排俯视对比（boards 模式）。返回整体 group 与每块板的挂点。 */
export function buildBoardComparison(boards) {
  const root = new THREE.Group()
  const items = []
  const entries = []
  for (const cfg of boards) {
    const board = buildBoard(cfg)
    root.add(board.group)
    items.push(board)
    entries.push({ cfg, board })
  }
  return { root, items, entries, disposeAll() { items.forEach((b) => b.dispose()) } }
}
