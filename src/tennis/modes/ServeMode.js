import * as THREE from 'three'
import { COURT } from '../catalog.js'
import { buildCourt, netCordHeight, SURFACES } from '../court.js'
import { buildBall, buildBlob } from '../ball.js'
import { makeLabel, dimensionLine } from '../labels.js'
import { BALL, rpmToRad, simulateTrajectory } from '../physics.js'
import { TennisMode, disposeTree } from '../mode.js'

const BASELINE_Z = -COURT.length / 2
const BOX_HALF_X = COURT.singlesWidth / 2

/**
 * 平分区站在中线右侧（+x），发向对角发球区（x < 0，z 在 0 到 6.40 之间）。
 * 初速是按当前阻力 / 马格努斯模型调过的教学值，保证三种弧线都能进区，并且高度差能看出来。
 */
const SERVES = [
  {
    id: 'flat',
    en: 'FLAT',
    name: '平击发球',
    color: 0xf4f1d0,
    hex: '#f4f1d0',
    contact: { x: 0.42, y: 2.85, z: -11.48 },
    velocity: { x: -5.6, y: -6.2, z: 50 },
    spinRpm: { x: 80, y: -80, z: 0 },
    desc: '击球点最高，拍面几乎正对发球区，球以小俯角飞出。弧线最平，过网净空最小，落点靠近发球线。',
    points: [
      '击球点尽量高，出射是向下的小俯角，不是往上挑。',
      '净空只有大约一个球，所以落点可以压深。',
      '转速低，落地后的弹起比上旋发球更平。'
    ]
  },
  {
    id: 'slice',
    en: 'SLICE',
    name: '侧旋发球',
    color: 0x5ec8ff,
    hex: '#5ec8ff',
    contact: { x: 0.72, y: 2.62, z: -11.55 },
    velocity: { x: -8.5, y: -4.2, z: 48 },
    spinRpm: { x: 200, y: -2800, z: 0 },
    desc: '拍面从球的侧面切过，侧旋让飞行路线往外弯。落点靠近单打边线，俯视能看到瞄准线和实际落点岔开。',
    points: [
      '站位仍在底线后，击球点比平击略低、更靠外侧。',
      '侧旋轴接近竖直，球在过网后继续向外弯。',
      '俯视看侧向偏离，落点要留在边线里面。'
    ]
  },
  {
    id: 'kick',
    en: 'KICK',
    name: '上旋发球',
    color: 0xff8a4c,
    hex: '#ff8a4c',
    contact: { x: 0.28, y: 2.48, z: -11.62 },
    velocity: { x: -1.2, y: 3.5, z: 24 },
    spinRpm: { x: 3600, y: -1100, z: 0 },
    desc: '由下向上刷球，先以仰角过网，上旋再把球压进发球区。过网最高、落点最短，落地后明显向上弹。',
    points: [
      '出射是仰角，弦倾角却是向下的：两个角不在水平线的同一侧。',
      '过网净空大，所以容错比平击高。',
      '落点更靠近球网，弹起高度明显高于平击。'
    ]
  }
]

function serveById(id) {
  return SERVES.find((item) => item.id === id) || SERVES[0]
}

function mirror(spec, side) {
  if (side !== 'ad') return spec
  return {
    ...spec,
    contact: { x: -spec.contact.x, y: spec.contact.y, z: spec.contact.z },
    velocity: { x: -spec.velocity.x, y: spec.velocity.y, z: spec.velocity.z },
    spinRpm: { x: spec.spinRpm.x, y: -spec.spinRpm.y, z: spec.spinRpm.z }
  }
}

function meters(value) {
  return `${value.toFixed(2)} m`
}

function signedAngle(deg) {
  const abs = Math.abs(deg).toFixed(1)
  if (deg >= 0.35) return `仰角 ${abs}°`
  if (deg <= -0.35) return `俯角 ${abs}°`
  return `水平 ${abs}°`
}

function lineOf(points, color, { dashed = false, opacity = 1 } = {}) {
  const geo = new THREE.BufferGeometry().setFromPoints(points)
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.22, gapSize: 0.12, transparent: true, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity })
  const line = new THREE.Line(geo, mat)
  if (dashed) line.computeLineDistances()
  line.frustumCulled = false
  return line
}

function arcBetween(origin, fromDir, toDir, radius, color) {
  const a = fromDir.clone().normalize()
  const b = toDir.clone().normalize()
  const angle = a.angleTo(b)
  if (angle < 0.012) return null
  const axis = new THREE.Vector3().crossVectors(a, b)
  if (axis.lengthSq() < 1e-8) return null
  axis.normalize()
  const steps = Math.max(10, Math.ceil(angle / 0.07))
  const pts = []
  for (let i = 0; i <= steps; i += 1) {
    const q = new THREE.Quaternion().setFromAxisAngle(axis, (angle * i) / steps)
    pts.push(a.clone().applyQuaternion(q).multiplyScalar(radius).add(origin))
  }
  return lineOf(pts, color)
}

function rightAngle(corner, dirA, dirB, size, color) {
  const a = dirA.clone().normalize().multiplyScalar(size)
  const b = dirB.clone().normalize().multiplyScalar(size)
  return lineOf([
    corner.clone().add(a),
    corner.clone().add(a).add(b),
    corner.clone().add(b)
  ], color)
}

function sampleAt(points, t) {
  let i = 1
  while (i < points.length && points[i].t < t) i += 1
  const a = points[Math.max(0, i - 1)]
  const b = points[i] || a
  const span = Math.max(1e-4, b.t - a.t)
  const k = Math.max(0, Math.min(1, (t - a.t) / span))
  return {
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    z: a.z + (b.z - a.z) * k
  }
}

function crossing(points) {
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    if (a.z < 0 && b.z >= 0) {
      const k = (0 - a.z) / (b.z - a.z)
      return {
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        z: 0,
        t: a.t + (b.t - a.t) * k
      }
    }
  }
  return null
}

export class ServeMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'serve'
    this.viewName = 'side'
    this.serveId = 'flat'
    this.side = 'deuce'
    this.surfaceId = 'hard'
    this.time = 0
    this.playing = true
    this.points = []
    this.playUntil = 1
    this.metrics = null
    this.build()
    this.rebuild()
  }

  build() {
    this.court = buildCourt({ surface: this.surfaceId })
    this.add(this.court.group)

    this.overlay = new THREE.Group()
    this.add(this.overlay)

    this.ballObj = buildBall()
    this.add(this.ballObj.group)
    this.blob = buildBlob()
    this.add(this.blob.mesh)
  }

  surface() {
    return SURFACES[this.surfaceId] || SURFACES.hard
  }

  spec() {
    return mirror(serveById(this.serveId), this.side)
  }

  setServe(id) {
    this.serveId = id
    this.time = 0
    this.rebuild()
  }

  setSide(side) {
    this.side = side === 'ad' ? 'ad' : 'deuce'
    this.time = 0
    this.rebuild()
  }

  setSurface(id) {
    this.surfaceId = id
    this.court.setSurface(id)
    this.time = 0
    this.rebuild()
  }

  setPlaying(value) {
    this.playing = value
  }

  replay() {
    this.time = 0
    this.playing = true
  }

  rebuild() {
    const raw = serveById(this.serveId)
    const spec = this.spec()
    const spin = new THREE.Vector3(
      rpmToRad(spec.spinRpm.x),
      rpmToRad(spec.spinRpm.y),
      rpmToRad(spec.spinRpm.z)
    )
    const result = simulateTrajectory({
      from: spec.contact,
      velocity: spec.velocity,
      spin,
      surface: this.surface(),
      netHeight: COURT.netCenterHeight
    })
    this.points = result.points
    this.playUntil = result.duration
    this.ballObj.setColor(raw.color)
    this.metrics = this.measure(spec, raw, result, spin)
    this.draw(raw)
    this.placeBall(0)
    this.report()
  }

  measure(spec, raw, result, spin) {
    const contact = spec.contact
    const land = result.bounces[0]
    const net = crossing(result.points)
    const cord = net ? netCordHeight(net.x) : COURT.netCenterHeight
    const clearCenter = net ? net.y - cord : null
    const clearGap = clearCenter === null ? null : clearCenter - BALL.radius
    const launchDeg = Math.atan2(spec.velocity.y, Math.hypot(spec.velocity.x, spec.velocity.z)) * 180 / Math.PI
    const speed = Math.hypot(spec.velocity.x, spec.velocity.y, spec.velocity.z)

    let horiz = null
    let drop = null
    let chordDeg = null
    let descentDeg = null
    let curve = 0
    let inBox = false
    let centerDist = null
    let serviceDist = null
    let sideDist = null
    let netDist = null
    let bounceH = 0
    let peak = null

    if (land) {
      const landY = BALL.visualRadius
      horiz = Math.hypot(land.x - contact.x, land.z - contact.z)
      drop = contact.y - landY
      chordDeg = Math.atan2(-drop, horiz) * 180 / Math.PI
      const incoming = land.incoming || { x: spec.velocity.x, y: -1, z: spec.velocity.z }
      descentDeg = Math.atan2(-incoming.y, Math.hypot(incoming.x, incoming.z)) * 180 / Math.PI

      const aim = new THREE.Vector2(spec.velocity.x, spec.velocity.z)
      if (aim.lengthSq() > 1e-6) {
        aim.normalize()
        const delta = new THREE.Vector2(land.x - contact.x, land.z - contact.z)
        const along = delta.dot(aim)
        curve = delta.x - aim.x * along
      }

      const sideLine = this.side === 'deuce' ? -BOX_HALF_X : BOX_HALF_X
      const xOk = this.side === 'deuce'
        ? land.x <= 0.03 && land.x >= -BOX_HALF_X - 0.03
        : land.x >= -0.03 && land.x <= BOX_HALF_X + 0.03
      const zOk = land.z >= -0.03 && land.z <= COURT.serviceLineFromNet + 0.03
      inBox = xOk && zOk && (clearGap === null || clearGap > 0)
      centerDist = Math.abs(land.x)
      serviceDist = COURT.serviceLineFromNet - land.z
      sideDist = Math.abs(sideLine - land.x)
      netDist = land.z

      for (const point of result.points) {
        if (point.t > land.t && point.y > bounceH) {
          bounceH = point.y
          peak = point
        }
      }
    }

    const rpm = Math.round(Math.hypot(spec.spinRpm.x, spec.spinRpm.y, spec.spinRpm.z))
    const sideName = this.side === 'deuce' ? '平分区' : '占先区'
    const rows = [
      { k: '击球高度', v: meters(contact.y) },
      { k: '出射角', v: signedAngle(launchDeg) },
      { k: '弦倾角', v: chordDeg === null ? '—' : signedAngle(chordDeg) },
      { k: '水平距离', v: horiz === null ? '—' : meters(horiz) },
      { k: '高度落差', v: drop === null ? '—' : meters(drop) },
      { k: '过网高度', v: net ? meters(net.y) : '—' },
      { k: '网带高度', v: net ? meters(cord) : '—' },
      { k: '过网净空', v: clearGap === null ? '—' : meters(clearGap) },
      { k: '落点倾角', v: descentDeg === null ? '—' : `${descentDeg.toFixed(1)}°` },
      { k: '距中线', v: centerDist === null ? '—' : meters(centerDist) },
      { k: '距发球线', v: serviceDist === null ? '—' : meters(serviceDist) },
      { k: '距单打边线', v: sideDist === null ? '—' : meters(sideDist) },
      { k: '距球网', v: netDist === null ? '—' : meters(netDist) },
      { k: '侧向偏离', v: land ? `${curve >= 0 ? '+' : ''}${curve.toFixed(2)} m` : '—' },
      { k: '弹起高度', v: peak ? meters(bounceH) : '—' },
      { k: '出球速度', v: `${Math.round(speed * 3.6)} km/h` },
      { k: '转速', v: `${rpm} rpm` }
    ]

    return {
      contact,
      velocity: spec.velocity,
      spin,
      land,
      net,
      cord,
      clearGap,
      launchDeg,
      chordDeg,
      horiz,
      drop,
      descentDeg,
      curve,
      inBox,
      peak,
      bounceH,
      rows,
      summary: `${raw.name} · ${sideName} · ${inBox ? '落点在发球区内' : '这条弹道没有进区'}`
    }
  }

  clearOverlay() {
    const children = [...this.overlay.children]
    for (const child of children) {
      this.overlay.remove(child)
      disposeTree(child)
    }
  }

  addLabel(text, x, y, z, color, parent = this.overlay) {
    const sprite = makeLabel(text, { color, scale: 0.0055, font: 40, padding: 14 })
    sprite.position.set(x, y, z)
    sprite.material.depthTest = false
    sprite.renderOrder = 3
    parent.add(sprite)
    return sprite
  }

  draw(raw) {
    this.clearOverlay()
    this.marginGroup = new THREE.Group()
    this.overlay.add(this.marginGroup)
    const m = this.metrics
    const { contact, land, net } = m
    const sign = this.side === 'deuce' ? -1 : 1

    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(BOX_HALF_X, COURT.serviceLineFromNet),
      new THREE.MeshBasicMaterial({
        color: raw.color,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    box.rotation.x = -Math.PI / 2
    box.position.set(sign * BOX_HALF_X / 2, 0.03, COURT.serviceLineFromNet / 2)
    this.overlay.add(box)

    const stanceX = this.side === 'deuce' ? 1.15 : -1.15
    const stanceZ = BASELINE_Z - 0.42
    const stance = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.34, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2fbf2, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
    )
    stance.rotation.x = -Math.PI / 2
    stance.position.set(stanceX, 0.035, stanceZ)
    this.overlay.add(stance)
    this.addLabel('站位 · 底线后', stanceX, 0.42, stanceZ - 0.15, '#f2fbf2')

    const air = this.points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    this.overlay.add(lineOf(air, raw.color, { opacity: 0.95 }))
    const ground = this.points.map((p) => new THREE.Vector3(p.x, 0.045, p.z))
    this.overlay.add(lineOf(ground, raw.color, { opacity: 0.45 }))

    const origin = new THREE.Vector3(contact.x, contact.y, contact.z)
    this.overlay.add(dimensionLine(
      new THREE.Vector3(contact.x, 0.02, contact.z),
      origin,
      { color: 0xf2fbf2, tick: 0.16, normal: new THREE.Vector3(1, 0, 0) }
    ))
    this.addLabel(`击球高度 ${meters(contact.y)}`, contact.x, contact.y + 0.34, contact.z, '#f4f1d0')

    const mark = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshBasicMaterial({ color: raw.color })
    )
    mark.position.copy(origin)
    this.overlay.add(mark)

    const velDir = new THREE.Vector3(m.velocity.x, m.velocity.y, m.velocity.z).normalize()
    const aimDir = new THREE.Vector3(m.velocity.x, 0, m.velocity.z).normalize()
    this.overlay.add(lineOf([origin, origin.clone().addScaledVector(aimDir, 2.7)], 0xd8f34a))
    this.overlay.add(lineOf([origin, origin.clone().addScaledVector(velDir, 1.6)], 0xd8f34a))
    const launchArc = arcBetween(origin, aimDir, velDir, 1.28, 0xd8f34a)
    if (launchArc) this.overlay.add(launchArc)
    const launchLabel = origin.clone().addScaledVector(aimDir, 1.7)
    launchLabel.y += m.launchDeg >= 0 ? 0.42 : -0.48
    this.addLabel(signedAngle(m.launchDeg), launchLabel.x, launchLabel.y, launchLabel.z, '#d8f34a')

    const spinRpm = m.spin.length() * 60 / (Math.PI * 2)
    if (spinRpm > 400) {
      const axis = m.spin.clone().normalize()
      this.overlay.add(lineOf([
        origin.clone().addScaledVector(axis, -0.62),
        origin.clone().addScaledVector(axis, 0.62)
      ], 0xff8ad4))
      const tip = origin.clone().addScaledVector(axis, 0.78)
      this.addLabel(spinRpm > 2000 && Math.abs(m.spin.y) > Math.abs(m.spin.x) ? '侧旋轴' : '上旋轴', tip.x, tip.y + 0.16, tip.z, '#ff8ad4')
    }

    if (land && m.horiz) {
      const high = new THREE.Vector3(land.x, contact.y, land.z)
      const low = new THREE.Vector3(land.x, BALL.visualRadius, land.z)
      this.overlay.add(lineOf([origin, high], 0xc5d4ea, { dashed: true, opacity: 0.8 }))
      this.overlay.add(lineOf([high, low], 0xc5d4ea, { dashed: true, opacity: 0.85 }))
      const chordDir = new THREE.Vector3().subVectors(low, origin).normalize()
      const chordHoriz = new THREE.Vector3(land.x - contact.x, 0, land.z - contact.z).normalize()
      const chordArc = arcBetween(origin, chordHoriz, chordDir, 2.15, 0x9eb6d8)
      if (chordArc) this.overlay.add(chordArc)
      const square = rightAngle(high, chordHoriz.clone().multiplyScalar(-1), new THREE.Vector3(0, -1, 0), 0.28, 0xc5d4ea)
      this.overlay.add(square)

      const midH = origin.clone().lerp(high, 0.5)
      this.addLabel(`水平 ${meters(m.horiz)}`, midH.x, midH.y + 0.32, midH.z, '#c5d4ea')
      this.addLabel(`落差 ${meters(m.drop)}`, land.x, contact.y * 0.62, land.z - 0.9, '#c5d4ea')
      const chordLabel = origin.clone().addScaledVector(chordHoriz, 2.35)
      chordLabel.y -= 0.2
      this.addLabel(`弦倾角 ${signedAngle(m.chordDeg)}`, chordLabel.x, chordLabel.y, chordLabel.z, '#9eb6d8')

      const aimFlat = new THREE.Vector2(m.velocity.x, m.velocity.z).normalize()
      const along = (land.x - contact.x) * aimFlat.x + (land.z - contact.z) * aimFlat.y
      const aimEnd = new THREE.Vector3(
        contact.x + aimFlat.x * along,
        0.05,
        contact.z + aimFlat.y * along
      )
      this.overlay.add(lineOf([
        new THREE.Vector3(contact.x, 0.05, contact.z),
        aimEnd
      ], 0xd8f34a, { dashed: true, opacity: 0.75 }))

      const sideLine = sign * BOX_HALF_X
      const plan = this.marginGroup
      plan.add(dimensionLine(
        new THREE.Vector3(land.x, 0.05, land.z),
        new THREE.Vector3(0, 0.05, land.z),
        { color: 0x7cf2b0, tick: 0.14, normal: new THREE.Vector3(0, 1, 0) }
      ))
      plan.add(dimensionLine(
        new THREE.Vector3(land.x, 0.05, land.z),
        new THREE.Vector3(land.x, 0.05, COURT.serviceLineFromNet),
        { color: 0x7cf2b0, tick: 0.14, normal: new THREE.Vector3(0, 1, 0) }
      ))
      plan.add(dimensionLine(
        new THREE.Vector3(land.x, 0.05, land.z),
        new THREE.Vector3(sideLine, 0.05, land.z),
        { color: 0x7cf2b0, tick: 0.14, normal: new THREE.Vector3(0, 1, 0) }
      ))
      this.addLabel(`距中线 ${meters(Math.abs(land.x))}`, land.x / 2, 0.55, land.z, '#7cf2b0', plan)
      this.addLabel(
        `距发球线 ${meters(COURT.serviceLineFromNet - land.z)}`,
        land.x,
        0.55,
        (land.z + COURT.serviceLineFromNet) / 2,
        '#7cf2b0',
        plan
      )
      this.addLabel(
        `距边线 ${meters(Math.abs(sideLine - land.x))}`,
        (land.x + sideLine) / 2,
        0.9,
        land.z + 0.45,
        '#7cf2b0',
        plan
      )

      const ringColor = m.inBox ? 0x7cf2b0 : 0xff6b5a
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.3, 28),
        new THREE.MeshBasicMaterial({ color: ringColor, side: THREE.DoubleSide })
      )
      ring.rotation.x = -Math.PI / 2
      ring.position.set(land.x, 0.04, land.z)
      this.overlay.add(ring)
      this.overlay.add(lineOf([
        new THREE.Vector3(land.x - 0.42, 0.05, land.z),
        new THREE.Vector3(land.x + 0.42, 0.05, land.z)
      ], ringColor))
      this.overlay.add(lineOf([
        new THREE.Vector3(land.x, 0.05, land.z - 0.42),
        new THREE.Vector3(land.x, 0.05, land.z + 0.42)
      ], ringColor))
      this.addLabel(m.inBox ? '落点 · 进区' : '落点 · 出界', land.x, 1.45, land.z + 0.35, m.inBox ? '#b8f5c8' : '#ffb4a8')

      if (land.incoming) {
        const incoming = new THREE.Vector3(land.incoming.x, land.incoming.y, land.incoming.z).normalize()
        const flatIn = new THREE.Vector3(land.incoming.x, 0, land.incoming.z).normalize()
        const fromPath = incoming.clone().multiplyScalar(-1)
        const horizBack = flatIn.clone().multiplyScalar(-1)
        const at = new THREE.Vector3(land.x, BALL.visualRadius + 0.02, land.z)
        this.overlay.add(lineOf([at, at.clone().addScaledVector(horizBack, 1.25)], 0xffd166))
        this.overlay.add(lineOf([at, at.clone().addScaledVector(fromPath, 1.25)], 0xffd166))
        const fallArc = arcBetween(at, horizBack, fromPath, 0.82, 0xffd166)
        if (fallArc) this.overlay.add(fallArc)
        const fallLabel = at.clone().addScaledVector(horizBack, 1.15)
        this.addLabel(`落点倾角 ${m.descentDeg.toFixed(1)}°`, fallLabel.x, 0.72, fallLabel.z, '#ffd166')
      }

      if (Math.abs(m.curve) >= 0.12) {
        this.addLabel(`侧向偏离 ${m.curve >= 0 ? '+' : ''}${m.curve.toFixed(2)} m`, aimEnd.x, 0.55, aimEnd.z, '#d8f34a')
      }
    }

    if (net) {
      this.overlay.add(dimensionLine(
        new THREE.Vector3(net.x, 0.02, 0),
        new THREE.Vector3(net.x, net.y, 0),
        { color: 0xf2fbf2, tick: 0.14, normal: new THREE.Vector3(0, 0, 1) }
      ))
      this.overlay.add(lineOf([
        new THREE.Vector3(net.x, m.cord, 0),
        new THREE.Vector3(net.x, net.y, 0)
      ], 0xffd166))
      const tape = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.04, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      )
      tape.position.set(net.x, m.cord, 0)
      this.overlay.add(tape)
      const pip = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd166 })
      )
      pip.position.set(net.x, net.y, 0)
      this.overlay.add(pip)
      this.addLabel(`过网 ${meters(net.y)}`, net.x, net.y + 0.42, 0.85, '#f2fbf2')
      this.addLabel(`净空 ${meters(m.clearGap)}`, net.x, Math.max(m.cord + 0.2, (net.y + m.cord) / 2), -0.95, '#ffd166')
    }

    if (m.peak && m.peak.y > 0.45) {
      this.overlay.add(dimensionLine(
        new THREE.Vector3(m.peak.x, 0.02, m.peak.z),
        new THREE.Vector3(m.peak.x, m.peak.y, m.peak.z),
        { color: raw.color, tick: 0.12, normal: new THREE.Vector3(1, 0, 0) }
      ))
      this.addLabel(`弹起 ${meters(m.bounceH)}`, m.peak.x, m.peak.y + 0.32, m.peak.z, raw.hex)
    }
    this.applyView()
  }

  applyView() {
    if (this.marginGroup) {
      this.marginGroup.visible = this.viewName === 'top' || this.viewName === 'box'
    }
  }

  setCamera(name, immediate = false) {
    this.viewName = name
    this.applyView()
    super.setCamera(name, immediate)
  }

  placeBall(t) {
    if (!this.points.length) return
    const p = sampleAt(this.points, t)
    this.ballObj.group.position.set(p.x, p.y, p.z)
    this.blob.update(p.x, p.y, p.z)
  }

  update(dt) {
    if (!this.playing || !this.points.length) return
    this.time += dt * 0.42
    const cycle = this.playUntil + 0.85
    if (this.time > cycle) this.time = 0
    this.placeBall(Math.min(this.time, this.playUntil))
  }

  report() {
    const raw = serveById(this.serveId)
    const m = this.metrics
    this.onData?.({
      id: this.serveId,
      side: this.side,
      surfaceId: this.surfaceId,
      name: raw.name,
      en: raw.en,
      desc: raw.desc,
      points: raw.points,
      inBox: m.inBox,
      summary: m.summary,
      rows: m.rows
    })
  }

  onEnter() {
    this.setCamera('side', true)
    this.report()
  }

  cameraPresets() {
    const m = this.metrics
    const contact = m?.contact || { x: 0.4, y: 2.7, z: -11.5 }
    const land = m?.land || { x: -1.6, z: 5 }
    const net = m?.net || { x: -0.6, y: 1.15 }
    const midZ = (contact.z + land.z) / 2
    const midX = (contact.x + land.x) / 2
    return {
      side: {
        pos: new THREE.Vector3(34, 8.5, midZ),
        target: new THREE.Vector3(0, 1.55, midZ)
      },
      behind: {
        pos: new THREE.Vector3(contact.x + (this.side === 'deuce' ? 0.4 : -0.4), 3.2, contact.z - 4.6),
        target: new THREE.Vector3(land.x * 0.35, 1.2, 2)
      },
      top: {
        pos: new THREE.Vector3(midX, 26, midZ + 0.2),
        target: new THREE.Vector3(midX, 0, midZ)
      },
      net: {
        pos: new THREE.Vector3(net.x + 3.6, 1.85, 2.8),
        target: new THREE.Vector3(net.x, net.y, 0)
      },
      box: {
        pos: new THREE.Vector3(land.x, 8.2, land.z + 6.2),
        target: new THREE.Vector3(land.x, 0.15, land.z)
      },
      receive: {
        pos: new THREE.Vector3(land.x * 0.25, 1.65, 9.4),
        target: new THREE.Vector3(contact.x, 1.7, -4)
      }
    }
  }

  defaultCamera() {
    return 'side'
  }

  dispose() {
    this.ballObj.dispose()
    this.blob.dispose()
    this.court.dispose()
    super.dispose()
  }
}

export { SERVES }
