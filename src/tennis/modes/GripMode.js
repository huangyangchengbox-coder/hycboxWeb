import * as THREE from 'three'
import { TennisMode, disposeTree } from '../mode.js'
import { GRIP_LIST, gripById, BEVELS } from '../gripguide.js'
import { makeLabel } from '../labels.js'

const DEG = Math.PI / 180

/** 掌心朝向说明（世界坐标按手臂自然下垂口径）。 */
const PALM_NOTES = {
  continental: '掌心朝上偏右——靠前臂内旋把拍面对准球（发球/切削的核心）',
  eastern: '掌心正对来球——与拍面同向，最直观的"握手"位置',
  semiwestern: '掌心朝下偏右——需要转前臂才能把拍面翻回正面',
  western: '掌心完全朝地——不翻转前臂，拍面就朝天',
  easternbackhand: '掌心朝上、手背对球——单反的解剖特点',
  twohand: '主手同大陆式，副手在上用东方式——双手锁柄协同发力'
}

/**
 * 握拍方式图鉴：放大八棱拍柄 + 手模型随握法绕柄轴转动。
 * 手固定拍柄、棱编号 1-8、V 字虎口落点、掌心朝向箭头（相对东方式零位），
 * 另有六握对比陈列与双手反手的副手模型。
 */
export class GripMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'grip'
    this.gripId = 'continental'
    this.compare = false
    this.spin = false
    this.time = 0
    this.build()
    this.applyGrip()
  }

  build() {
    // 深色展台（离开模式时恢复场地天空色）
    this.scene.background = new THREE.Color(0x0a1218)
    this.scene.fog = null

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.3, 1.42, 0.06, 64),
      new THREE.MeshStandardMaterial({ color: 0x12261f, roughness: 0.75, metalness: 0.12 })
    )
    pedestal.position.y = -0.62
    pedestal.receiveShadow = true
    this.add(pedestal)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.28, 1.32, 72),
      new THREE.MeshBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -0.585
    this.add(ring)

    // 主展示 rig（拍柄固定，手转）
    this.rig = new THREE.Group()
    this.rig.position.y = 0.12
    this.add(this.rig)
    this.#buildMain()

    // 对比陈列（六握并排）
    this.compareGroup = new THREE.Group()
    this.compareGroup.position.y = 0.2
    this.compareGroup.visible = false
    this.add(this.compareGroup)
    this.#buildCompare()

    // 展台自建光源
    const key = new THREE.DirectionalLight(0xffffff, 2.4)
    key.position.set(2.6, 3.4, 2.8)
    key.castShadow = true
    this.add(key)
    const fill = new THREE.DirectionalLight(0x9fd8ff, 0.9)
    fill.position.set(-2.8, 0.8, -2)
    this.add(fill)
    const rim = new THREE.DirectionalLight(0xd8f34a, 0.6)
    rim.position.set(0, -1.8, 2.6)
    this.add(rim)
  }

  /** 拍柄 + 端面棱编号 + 拍面（固定）。 */
  #buildHandleInto(parent, { r, len, bevelSprites, spriteScale, faceScale = 1 }) {
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8, 1), gripMat)
    handle.rotation.x = Math.PI / 2
    handle.position.z = -len / 2
    parent.add(handle)
    // 底盖（ butt cap）
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.25, r * 1.3, 0.05 * faceScale, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
    )
    cap.rotation.x = Math.PI / 2
    cap.position.z = 0.02
    parent.add(cap)
    // 拍颈 + 拍面（面在 y-z 平面：法线 +x，含 1/5 号棱）
    const neck = new THREE.Mesh(new THREE.BoxGeometry(r * 0.6, r * 0.6, len * 0.22), this.std(0x0f172a))
    neck.position.z = -len - len * 0.06
    parent.add(neck)
    const face = new THREE.Mesh(
      new THREE.BoxGeometry(0.02 * faceScale, 0.62 * faceScale, 0.52 * faceScale),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    )
    face.position.set(0, 0, -len - len * 0.32)
    parent.add(face)
    // 拍面法线小箭头（固定）：拍面本身的朝向
    const arrow = this.#arrow(0x4ade80, 0.34 * faceScale)
    arrow.position.set(0.22 * faceScale, 0, -len - len * 0.32)
    parent.add(arrow)
    const faceLabel = makeLabel('拍面', { color: '#4ade80', scale: spriteScale * 0.85, font: 36 })
    faceLabel.position.set(0.22 * faceScale, 0.24 * faceScale, -len - len * 0.32)
    parent.add(faceLabel)

    if (bevelSprites) {
      for (const b of BEVELS) {
        const rad = (b.n - 1) * 45 * DEG
        const sprite = makeLabel(String(b.n), { color: '#e2e8f0', scale: spriteScale, font: 40 })
        sprite.position.set(Math.sin(rad) * (r + 0.065), Math.cos(rad) * (r + 0.065), 0.08)
        parent.add(sprite)
      }
    }
    return { handle, face }
  }

  /** 主展示：放大拍柄 + 手 + V 字 + 掌心箭头 + 来球参考。 */
  #buildMain() {
    const r = 0.14
    this.#buildHandleInto(this.rig, { r, len: 1.1, bevelSprites: true, spriteScale: 0.0032, faceScale: 1 })

    // 当前棱高亮球（固定帧，直接落在目标棱外侧）
    this.bevelHighlight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), this.basic(0xfacc15))
    this.rig.add(this.bevelHighlight)

    // 手（局部帧：V 字顶点在柄顶，rotation.z = -θ 把 V 转到目标棱）
    this.hand = this.#buildHand({ r, detailed: true })
    this.rig.add(this.hand.group)

    // 掌心朝向箭头（挂手组，局部指向 +y：世界方向随握法变化）
    this.palmArrow = this.#arrow(0xf59e0b, 0.42)
    this.palmArrow.position.set(0, r + 0.34, 0.18)
    this.hand.group.add(this.palmArrow)
    this.palmLabel = makeLabel('掌心朝向', { color: '#f59e0b', scale: 0.003, font: 36 })
    this.palmLabel.position.set(0, r + 0.5, 0.18)
    this.hand.group.add(this.palmLabel)

    // 双手反手的副手（东方式在上；默认隐藏）
    this.offHand = this.#buildHand({ r: r * 0.96, detailed: false })
    this.offHand.group.position.z = -0.34
    this.offHand.group.rotation.z = -90 * DEG // 副手 V 对 3 号棱
    this.offHand.group.visible = false
    this.rig.add(this.offHand.group)

    // 来球参考（固定）：球 + 指向拍柄的箭头
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9ff2e, roughness: 0.9 })
    )
    ball.position.set(1.05, 0.16, 0)
    this.rig.add(ball)
    const seam = new THREE.Mesh(
      new THREE.TorusGeometry(0.11, 0.008, 8, 40),
      this.basic(0xffffff)
    )
    seam.position.copy(ball.position)
    seam.rotation.y = Math.PI / 2.4
    this.rig.add(seam)
    const incoming = this.#arrow(0x22d3ee, 0.4)
    incoming.rotation.z = Math.PI / 2 // 从 +y 转到 -x（飞向拍柄）
    incoming.position.set(0.72, 0.16, 0)
    this.rig.add(incoming)
    const ballLabel = makeLabel('来球方向', { color: '#22d3ee', scale: 0.003, font: 36 })
    ballLabel.position.set(1.05, 0.42, 0)
    this.rig.add(ballLabel)

    // 标题
    this.title = makeLabel('大陆式 · V 字对 2 号棱', { color: '#4ade80', scale: 0.0042, font: 46 })
    this.title.position.set(0, 0.86, -0.4)
    this.rig.add(this.title)
    const bevelNote = makeLabel('棱编号从拍面正对的端面看：顶棱 1 号，顺时针 2-8', {
      color: '#94a3b8', scale: 0.0026, font: 32
    })
    bevelNote.position.set(0, -0.42, 0.4)
    this.rig.add(bevelNote)
  }

  /** 手模型。局部帧：V 字顶点在柄顶（0, r）。 */
  #buildHand({ r, detailed }) {
    const group = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.55 })
    // 掌：贴柄左下侧（局部帧）， eastern 零位旋转后落到握手位
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.15 * (r / 0.14), 0.2 * (r / 0.14), 0.32 * (r / 0.14)), skin)
    palm.position.set(-r - 0.09, -0.03, -0.1)
    palm.rotation.z = 0.5
    group.add(palm)
    // 四指：沿柄轴的胶囊，从 -x 侧绕过柄顶排向 +x
    const fingers = detailed ? [150, 115, 80, 45] : [140, 90, 40]
    for (const deg of fingers) {
      const rad = deg * DEG
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * (r / 0.14), 0.3 * (r / 0.14), 4, 10), skin)
      finger.rotation.x = Math.PI / 2
      finger.position.set(Math.sin(rad) * (r + 0.045), Math.cos(rad) * (r + 0.045), -0.12)
      group.add(finger)
    }
    // 拇指：从掌侧斜向上，靠近 V 顶点
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.048 * (r / 0.14), 0.24 * (r / 0.14), 4, 10), skin)
    thumb.rotation.set(Math.PI / 2, 0, 2.2)
    thumb.position.set(r * 0.35, r * 0.62, -0.16)
    group.add(thumb)
    // V 字虎口：两条黄色小柱，顶点落在柄顶
    const vGroup = new THREE.Group()
    for (const sx of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * (r / 0.14), 0.018 * (r / 0.14), 0.2 * (r / 0.14), 8), this.basic(0xfacc15))
      bar.rotation.z = 0.42 * sx
      bar.position.set(0.075 * (r / 0.14) * sx, r + 0.14 * (r / 0.14), -0.16)
      vGroup.add(bar)
    }
    group.add(vGroup)
    return { group, vGroup }
  }

  /** 简易箭头（杆 + 锥头，默认指向 +y）。 */
  #arrow(color, len) {
    const group = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, len * 0.8, 10), mat)
    shaft.position.y = len * 0.4
    group.add(shaft)
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 12), mat)
    head.position.y = len * 0.86
    group.add(head)
    return group
  }

  /** 六握对比陈列。 */
  #buildCompare() {
    this.compareItems = GRIP_LIST.map((grip, i) => {
      const root = new THREE.Group()
      root.position.x = (i - (GRIP_LIST.length - 1) / 2) * 0.62
      this.compareGroup.add(root)

      this.#buildHandleInto(root, { r: 0.055, len: 0.44, bevelSprites: false, faceScale: 0.42 })
      // 迷你手（随握法旋转：局部柄顶 → 目标棱）
      const hand = this.#buildHand({ r: 0.055, detailed: false })
      hand.group.scale.setScalar(0.62)
      hand.group.rotation.z = -(grip.bevel - 1) * 45 * DEG
      root.add(hand.group)
      // 目标棱高亮点
      const rad = (grip.bevel - 1) * 45 * DEG
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), this.basic(grip.color))
      dot.position.set(Math.sin(rad) * 0.115, Math.cos(rad) * 0.115, 0.05)
      root.add(dot)

      const name = makeLabel(grip.name, { color: grip.color, scale: 0.0024, font: 40 })
      name.position.set(0, 0.4, 0)
      root.add(name)
      const note = makeLabel(`V 字对 ${grip.bevel} 号棱`, { color: '#94a3b8', scale: 0.002, font: 32 })
      note.position.set(0, 0.3, 0)
      root.add(note)

      return { grip, hand, root }
    })
    const title = makeLabel('六种握拍对比 · 手在同一支柄上的六个位置', { color: '#e2e8f0', scale: 0.0034, font: 44 })
    title.position.set(0, 0.78, 0)
    this.compareGroup.add(title)
  }

  applyGrip() {
    const grip = gripById(this.gripId)
    const rad = (grip.bevel - 1) * 45 * DEG
    // 手绕柄轴转动：局部柄顶 → 目标棱
    this.hand.group.rotation.z = -rad
    this.offHand.group.visible = Boolean(grip.twoHanded)
    // 高亮球落在目标棱外
    this.bevelHighlight.position.set(Math.sin(rad) * 0.2, Math.cos(rad) * 0.2, 0.08)
    this.bevelHighlight.material.color.set(grip.color)
    // 标题
    disposeTree(this.title)
    this.rig.remove(this.title)
    this.title = makeLabel(`${grip.name} · V 字对 ${grip.bevel} 号棱`, { color: grip.color, scale: 0.0042, font: 46 })
    this.title.position.set(0, 0.86, -0.4)
    this.rig.add(this.title)

    this.onData?.({
      gripId: grip.id,
      name: grip.name,
      en: grip.en,
      color: grip.color,
      strokes: grip.strokes,
      points: grip.points,
      pros: grip.pros,
      cons: grip.cons,
      tip: grip.tip,
      contact: grip.contact,
      bevel: grip.bevel,
      handRot: (grip.bevel - 3) * 45,
      twoHanded: Boolean(grip.twoHanded),
      palmNote: PALM_NOTES[grip.id] || '',
      compare: this.compare,
      spin: this.spin
    })
  }

  setGrip(id) {
    this.gripId = id
    this.applyGrip()
  }

  setCompare(v) {
    this.compare = v
    this.rig.visible = !v
    this.compareGroup.visible = v
    this.applyGrip()
  }

  setSpin(v) {
    this.spin = v
  }

  setPlaying(v) {
    this.spin = v
  }

  update(dt) {
    if (!this.spin) return
    this.time += dt
    this.rig.rotation.y += dt * 0.5
    this.compareGroup.rotation.y += dt * 0.22
  }

  onEnter() {
    this.setCamera('hero', true)
    this.applyGrip()
  }

  cameraPresets() {
    return {
      hero: { pos: new THREE.Vector3(1.7, 0.62, 1.9), target: new THREE.Vector3(0, 0.1, 0) },
      close: { pos: new THREE.Vector3(0.72, 0.3, 0.86), target: new THREE.Vector3(0, 0.12, -0.15) },
      butt: { pos: new THREE.Vector3(0.05, 0.4, 1.5), target: new THREE.Vector3(0, 0.12, 0.1) },
      side: { pos: new THREE.Vector3(2.4, 0.35, 0.15), target: new THREE.Vector3(0, 0.1, 0) },
      top: { pos: new THREE.Vector3(0.02, 2.3, 0.02), target: new THREE.Vector3(0, 0, 0) },
      compare: { pos: new THREE.Vector3(0, 1.35, 3.3), target: new THREE.Vector3(0, 0.2, 0) }
    }
  }

  defaultCamera() {
    return 'hero'
  }

  dispose() {
    disposeTree(this.hand.group)
    disposeTree(this.offHand.group)
    disposeTree(this.compareGroup)
    // 恢复场地天空背景，避免污染其它模式
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0072)
    super.dispose()
  }
}
