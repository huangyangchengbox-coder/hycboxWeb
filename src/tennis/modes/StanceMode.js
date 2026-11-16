import * as THREE from 'three'
import { buildCourt } from '../court.js'
import { buildPlayer } from '../player.js'
import { buildRacket } from '../racket.js'
import { buildBall } from '../ball.js'
import { makeLabel } from '../labels.js'
import { TennisMode, disposeTree } from '../mode.js'
import { STANCES, footPositions, stanceAngle, stanceById, weightArrow } from '../stance.js'

/**
 * 站位 3D 演示：脚部的实际摆位、髋部转动与体重转移方向。
 * 文档坐标 (x, advance) 映射到世界坐标 (x, z = −advance)，击球点放在底线内侧。
 */
const CONTACT_Z = -10.4

function lineOf(points, color, { dashed = false, opacity = 1, dashSize = 0.18, gapSize = 0.12 } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize, gapSize, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const line = new THREE.Line(geo, mat)
  if (dashed) line.computeLineDistances()
  line.frustumCulled = false
  return line
}

export class StanceMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'stance'
    this.stanceId = 'open'
    this.time = 0
    this.playing = true
    this.build()
    this.applyStance('open', true)
  }

  build() {
    this.court = buildCourt({ surface: 'hard' })
    this.add(this.court.group)

    this.player = buildPlayer()
    this.add(this.player.group)

    this.racket = buildRacket({ headArea: 100, pattern: [16, 19], showSweet: false })
    this.racket.group.position.set(0.3, 0, 0)
    this.player.elbow.add(this.racket.group)

    this.ballObj = buildBall()
    this.add(this.ballObj.group)

    this.overlay = new THREE.Group()
    this.add(this.overlay)
  }

  clearOverlay() {
    for (const child of [...this.overlay.children]) {
      this.overlay.remove(child)
      disposeTree(child)
    }
  }

  label(text, x, y, z, color, scale = 0.0044) {
    const sprite = makeLabel(text, { color, scale, font: 40, padding: 14 })
    sprite.position.set(x, y, z)
    sprite.material.depthTest = false
    sprite.renderOrder = 3
    this.overlay.add(sprite)
    return sprite
  }

  applyStance(id, snapCamera) {
    this.stanceId = id
    const stance = stanceById(id)
    this.stance = stance
    this.draw(stance)
    this.applyPose(0)
    if (snapCamera) this.setCamera('top', true)
    this.report()
  }

  /** 文档局部坐标 → 世界坐标。 */
  worldOf(x, advance) {
    return new THREE.Vector3(x, 0, CONTACT_Z - advance)
  }

  draw(stance) {
    this.clearOverlay()
    const color = stance.color
    const f = footPositions(stance)
    const stanceDeg = stanceAngle(stance)

    // 双脚连线（延伸参考轴）
    const left = new THREE.Vector3(f.left.x, 0.07, CONTACT_Z - stance.feet.left.advance)
    const right = new THREE.Vector3(f.right.x, 0.07, CONTACT_Z - stance.feet.right.advance)
    this.overlay.add(lineOf([left, right], color, { dashed: true, opacity: 0.75, dashSize: 0.12, gapSize: 0.08 }))

    // 两只脚的朝向标记（胶囊形）
    for (const [key, foot, footColor] of [
      ['left', f.left, 0xccff00],
      ['right', f.right, 0x00f0ff]
    ]) {
      const pos = new THREE.Vector3(foot.x, 0.05, CONTACT_Z - stance.feet[key].advance)
      const shoe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.13, 0.27),
        new THREE.MeshBasicMaterial({
          color: footColor,
          transparent: true,
          opacity: 0.92,
          side: THREE.DoubleSide,
          depthWrite: false
        })
      )
      shoe.rotation.x = -Math.PI / 2
      shoe.rotation.z = (foot.yaw * Math.PI) / 180
      shoe.position.copy(pos)
      shoe.renderOrder = 2
      this.overlay.add(shoe)
      this.label(key === 'left' ? '左脚 L' : '右脚 R', pos.x, 0.42, pos.z + 0.3, key === 'left' ? '#eaff8a' : '#9fe4ff', 0.0038)
    }

    // 体重转移箭头
    const shift = weightArrow(stance)
    const from = this.worldOf(shift.from.x, -shift.from.z).setY(0.06)
    const to = this.worldOf(shift.to.x, -shift.to.z).setY(0.06)
    this.overlay.add(lineOf([from, to], 0xffb800, { opacity: 0.95 }))
    const dir = new THREE.Vector3().subVectors(to, from)
    if (dir.lengthSq() > 1e-5) {
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.16, 10),
        new THREE.MeshBasicMaterial({ color: 0xffb800 })
      )
      head.position.copy(to)
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
      // cone 默认朝 +y，改成指向移动方向需要绕一次
      head.rotateX(Math.PI / 2)
      this.overlay.add(head)
    }
    this.label(`${stance.weightShift >= 0.7 ? '体重前移' : '体重留后'} ${Math.round(stance.weightShift * 100)}%`, to.x, 0.4, to.z - 0.35, '#ffcf8a', 0.0036)

    // 站位角弧线（相对底线）
    const arcRadius = 0.92
    const arcPts = []
    const baseAngle = Math.atan2(f.right.z - f.left.z, f.right.x - f.left.x)
    for (let i = 0; i <= 24; i += 1) {
      const a = (baseAngle * i) / 24
      arcPts.push(new THREE.Vector3(
        left.x + Math.cos(a) * arcRadius,
        0.06,
        left.z + Math.sin(a) * arcRadius
      ))
    }
    if (arcPts.length > 1) {
      this.overlay.add(lineOf(arcPts, 0xffffff, { opacity: 0.55 }))
    }
    this.overlay.add(lineOf([
      new THREE.Vector3(left.x, 0.06, left.z),
      new THREE.Vector3(left.x + arcRadius, 0.06, left.z)
    ], 0xffffff, { opacity: 0.35, dashed: true, dashSize: 0.1, gapSize: 0.07 }))
    this.label(`站位角 ${stanceDeg.toFixed(0)}°`, left.x + arcRadius * 0.55, 0.35, left.z - 0.3, '#f2fbf2', 0.0038)

    // 击球点
    const cx = (f.left.x + f.right.x) / 2
    const cz = CONTACT_Z - (stance.feet.left.advance + stance.feet.right.advance) / 2
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.2, 0.28, 30),
      new THREE.MeshBasicMaterial({ color: 0xff3366, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(cx, 0.055, cz)
    this.overlay.add(ring)
    this.label('击球点 / 重心', cx, 0.5, cz + 0.55, '#ff9f92', 0.004)

    // 来球方向
    this.overlay.add(lineOf([
      new THREE.Vector3(cx - 0.9, 0.06, CONTACT_Z + 2.6),
      new THREE.Vector3(cx - 0.9, 0.06, CONTACT_Z + 1.1)
    ], 0x00f0ff, { opacity: 0.7, dashed: true, dashSize: 0.14, gapSize: 0.1 }))
    this.label('来球方向', cx - 0.9, 0.4, CONTACT_Z + 2.9, '#9fe4ff', 0.0038)

    // 底线标注
    this.label('底线', 0, 0.3, -11.885 + 0.35, '#a9c4b6', 0.004)
  }

  applyPose(t) {
    const stance = this.stance
    if (!stance) return
    const f = footPositions(stance)
    const cx = (f.left.x + f.right.x) / 2
    const cz = CONTACT_Z - (stance.feet.left.advance + stance.feet.right.advance) / 2

    // 呼吸/蓄力的小幅律动
    const breathe = Math.sin(t * Math.PI * 2) * 0.012
    this.player.group.position.set(cx, breathe, cz)

    // 双脚开合：用 root 的缩放近似表现站距
    this.player.group.rotation.y = Math.PI + stance.hipTurn * 0.35

    const kneeBend = 0.2 + stance.weightShift * 0.12
    this.player.legs[0].rotation.x = kneeBend
    this.player.legs[1].rotation.x = kneeBend * 0.85

    this.player.torsoPivot.rotation.y = stance.hipTurn
    this.player.torsoPivot.rotation.x = 0.1
    this.player.rightShoulder.rotation.set(-0.12, -0.3, 0.22)
    this.player.leftShoulder.rotation.y = -0.5
    this.player.leftShoulder.rotation.z = -0.3
    this.player.elbow.rotation.y = 0.5
    this.racket.hoopGroup.rotation.set(0, 0, 0)
    this.racket.setPocket(0)

    // 球停在击球点前上方
    const c = this.worldOf(cx, -cz + CONTACT_Z)
    this.ballObj.group.position.set(c.x + 0.28, 1.05, c.z + 0.5)
  }

  setStance(id) {
    this.applyStance(id, false)
    this.playing = true
  }

  setPlaying(value) {
    this.playing = value
  }

  update(dt) {
    if (!this.playing) return
    this.time += dt
    this.applyPose(this.time * 0.35)
  }

  report() {
    const s = this.stance
    this.onData?.({
      id: s.id,
      name: s.name,
      en: s.en,
      angle: stanceAngle(s)
    })
  }

  onEnter() {
    this.setCamera('top', true)
    this.report()
  }

  cameraPresets() {
    return {
      top: {
        pos: new THREE.Vector3(0.01, 7.4, CONTACT_Z - 1.5),
        target: new THREE.Vector3(0, 0, CONTACT_Z - 0.2)
      },
      angle: {
        pos: new THREE.Vector3(3.6, 2.6, CONTACT_Z + 2.4),
        target: new THREE.Vector3(0, 0.7, CONTACT_Z)
      },
      side: {
        pos: new THREE.Vector3(5.2, 1.5, CONTACT_Z),
        target: new THREE.Vector3(0, 0.9, CONTACT_Z)
      },
      behind: {
        pos: new THREE.Vector3(0, 1.9, CONTACT_Z - 4.2),
        target: new THREE.Vector3(0, 1, CONTACT_Z)
      },
      front: {
        pos: new THREE.Vector3(0, 1.7, CONTACT_Z + 4.2),
        target: new THREE.Vector3(0, 0.95, CONTACT_Z)
      }
    }
  }

  defaultCamera() {
    return 'top'
  }

  dispose() {
    this.racket.dispose()
    this.player.dispose()
    this.ballObj.dispose()
    this.court.dispose()
    super.dispose()
  }

  static stances() {
    return STANCES
  }
}
