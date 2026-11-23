import * as THREE from 'three'
import { COURT, phaseAt, racketFlex, samplePose, shotById, SHOTS } from '../catalog.js'
import { buildCourt, SURFACES } from '../court.js'
import { buildPlayer } from '../player.js'
import { buildRacket } from '../racket.js'
import { buildBall, buildBlob, buildRings, buildTrail } from '../ball.js'
import { BALL, rpmToRad, simulateTrajectory } from '../physics.js'
import { BallForceRig, CONTACT_MODEL, solveContact } from '../ballforce.js'
import { TennisMode } from '../mode.js'

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class LabMode extends TennisMode {
  constructor(stage) {
    super(stage)
    this.id = 'lab'
    this.shot = shotById('forehand')
    this.progress = 0
    this.playing = true
    this.speed = 1
    this.surfaceId = 'hard'
    this.sweetWorld = new THREE.Vector3()
    this.contactWorld = new THREE.Vector3()
    this.liveSweet = new THREE.Vector3()
    this.contactNormal = new THREE.Vector3(0, 0, 1)
    this.forceOn = true
    this.forceProfile = null
    this.stringMu = CONTACT_MODEL.mu
    this._faceQuat = new THREE.Quaternion()
    this.flight = [{ x: 0, y: 1, z: 0, t: 0 }]
    this.flightTime = 1
    this.bounceEvents = []
    this.netHit = null
    this.netPass = null
    this.events = []
    this.swingPoints = []
    this.build()
    this.applyShot(this.shot, true)
  }

  build() {
    this.court = buildCourt({ surface: this.surfaceId })
    this.add(this.court.group)

    this.player = buildPlayer()
    this.add(this.player.group)

    this.racket = buildRacket({ headArea: 100, pattern: [16, 19], showSweet: false })
    this.racket.group.position.set(0.3, 0, 0)
    this.player.elbow.add(this.racket.group)

    this.ballObj = buildBall()
    this.add(this.ballObj.group)

    this.shadow = buildBlob()
    this.add(this.shadow.mesh)

    this.trail = buildTrail({ max: 420, color: 0xeaff66, opacity: 0.66 })
    this.add(this.trail.line)

    this.arc = buildTrail({ max: 60, color: 0xffffff, opacity: 0.34 })
    this.add(this.arc.line)

    this.swingTrace = buildTrail({ max: 120, color: 0xf2fbf2, opacity: 0.42 })
    this.add(this.swingTrace.line)

    this.rings = buildRings(6)
    this.rings.meshes.forEach((mesh) => this.add(mesh))

    this.flash = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.2, 28),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      })
    )
    this.flash.visible = false
    this.add(this.flash)

    this.courtMark = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.28, 40),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    this.courtMark.rotation.x = -Math.PI / 2
    this.courtMark.position.y = 0.014
    this.add(this.courtMark)

    this.forceRig = new BallForceRig()
    this.add(this.forceRig.group)
  }

  surface() {
    return SURFACES[this.surfaceId] || SURFACES.hard
  }

  setSurface(id) {
    this.surfaceId = id
    this.court.setSurface(id)
    this.applyShot(this.shot, false)
  }

  simulate(shot) {
    const result = simulateTrajectory({
      from: this.sweetWorld,
      velocity: shot.velocity,
      spin: new THREE.Vector3(rpmToRad(shot.spin || 0), 0, 0),
      surface: this.surface()
    })
    this.flight = result.points
    this.flightTime = Math.max(result.duration, 0.5)
    this.bounceEvents = result.bounces
    this.netPass = result.netY === null ? null : { y: result.netY, t: result.netT }
    const hit = result.netY !== null && result.netY < COURT.netCenterHeight + BALL.visualRadius * 0.6
    this.netHit = hit ? { x: this.flight[0].x, y: result.netY, t: result.netT } : null

    const events = [{
      t: 0,
      x: result.points[0].x,
      y: result.points[0].y,
      z: result.points[0].z,
      color: 0xffffff,
      vertical: true,
      max: 2.3
    }]
    result.bounces.forEach((b) => events.push({
      t: b.t,
      x: b.x,
      y: 0.02,
      z: b.z,
      color: 0xd9ff00,
      vertical: false,
      max: 2.1
    }))
    if (this.netHit) {
      events.push({
        t: this.netHit.t,
        x: 0,
        y: this.netHit.y,
        z: 0,
        color: 0xffaa00,
        vertical: true,
        max: 3.8
      })
    }
    this.events = events
  }

  sampleFlight(flown) {
    const points = this.flight
    let i = 1
    while (i < points.length && points[i].t < flown) i += 1
    const a = points[Math.max(0, i - 1)]
    const b = points[i] || a
    const span = Math.max(1e-4, b.t - a.t)
    const k = clamp((flown - a.t) / span, 0, 1)
    return {
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      z: a.z + (b.z - a.z) * k,
      index: Math.max(0, i - 1)
    }
  }

  applyPose(swingT) {
    const shot = this.shot
    const pose = samplePose(shot.keys, swingT)
    const flex = racketFlex(swingT, shot.contactAt, shot.flex)
    const settle = Math.sin(swingT * Math.PI * 6) * 0.014 * (1 - Math.min(1, swingT * 1.8))
    const step = (swingT - 0.26) / 0.3
    const lunge = step <= 0 ? 0 : step >= 1 ? 0.17 : (step * step * (3 - 2 * step)) * 0.17

    this.player.group.position.set(shot.place.x + pose.bodyX, settle, shot.place.z + lunge)
    this.player.torsoPivot.rotation.y = pose.torsoY
    this.player.torsoPivot.rotation.x = pose.torsoX + lunge * 0.55
    this.player.rightShoulder.rotation.set(pose.shX, pose.shY, pose.shZ)
    this.player.leftShoulder.rotation.y = pose.leftY
    this.player.leftShoulder.rotation.z = pose.leftZ
    this.player.legs[0].rotation.x = pose.legL + lunge * 1.1
    this.player.legs[1].rotation.x = pose.legR - lunge * 0.7

    this.player.elbow.rotation.y = 0.22 + flex.elbow
    this.racket.hoopGroup.rotation.y = flex.face
    this.racket.hoopGroup.rotation.x = -flex.face * 0.25
    this.racket.setPocket(flex.string)
  }

  computeSwingPath() {
    const shot = this.shot
    const saved = this.player.group.position.clone()
    const points = []
    const start = Math.max(0, shot.contactAt - 0.42)
    for (let i = 0; i <= 30; i += 1) {
      const st = start + ((1 - start) * i) / 30
      this.applyPose(st)
      this.player.group.updateMatrixWorld(true)
      const p = new THREE.Vector3()
      this.racket.sweetSpot.getWorldPosition(p)
      points.push({ t: st, x: p.x, y: p.y, z: p.z })
    }
    this.player.group.position.copy(saved)
    this.swingPoints = points
  }

  /** 击球点处的拍头速度（m/s），取拍头轨迹在触球时刻的中央差分。 */
  racketVelocity(t0) {
    const pts = this.swingPoints
    if (!pts || pts.length < 2) return new THREE.Vector3()
    let i = 0
    while (i < pts.length - 2 && pts[i + 1].t < t0) i += 1
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 2)]
    const dt = Math.max(1e-4, (b.t - a.t) * this.shot.duration)
    const v = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z).divideScalar(dt)
    return v.length() > 55 ? v.setLength(55) : v
  }

  /** 解算击球瞬间的受力分解，并把结果交给 3D 图层与右侧面板。 */
  solveForce() {
    const shot = this.shot
    const approach = shot.approach || { x: 0, y: 1.7, z: 6 }
    const dir = new THREE.Vector3(
      this.contactWorld.x - approach.x,
      this.contactWorld.y - approach.y,
      this.contactWorld.z - approach.z
    )
    if (dir.lengthSq() < 1e-6) dir.set(0, 0.2, 1)
    const inVel = dir.normalize().multiplyScalar((shot.incoming ?? 60) / 3.6)
    const racketVel = this.racketVelocity(shot.contactAt)
    const profile = solveContact({
      inVel,
      racketVel,
      normal: this.contactNormal,
      rpm: shot.spin || 0,
      mu: this.stringMu
    })
    this.forceProfile = profile
    this.forceRig.update({ origin: this.contactWorld, normal: this.contactNormal, profile })
    this.onForce?.({
      vIn: inVel.length() * 3.6,
      vRacket: racketVel.length() * 3.6,
      vOut: Math.hypot(shot.velocity.x, shot.velocity.y, shot.velocity.z) * 3.6,
      vn: profile.vn * 3.6,
      vt: profile.vt * 3.6,
      fn: profile.FN,
      fr: profile.Fr,
      f: profile.F,
      muNeed: profile.muNeed,
      muMax: this.stringMu,
      rpmOut: profile.rpmOut,
      rpmSet: Math.abs(shot.spin || 0),
      slip: profile.slip,
      spinKind: profile.spinKind,
      contactMs: profile.contactMs,
      note: shot.forceNote || ''
    })
  }

  /** 受力矢量开关：打开时直接停在触球帧，方便观察。 */
  setForce(value) {
    this.forceOn = Boolean(value)
    if (this.forceOn) {
      const contactT = this.shot.contactAt * this.shot.duration
      this.progress = contactT / this.clockSeconds()
      this.playing = false
    }
    this.applyProgress(this.progress)
    return this.forceOn
  }

  applyShot(shot, snapCamera) {
    this.shot = shot
    this.ballObj.group.scale.set(1, 1, 1)
    this.player.group.position.set(shot.place.x, 0, shot.place.z)
    this.applyPose(shot.contactAt)
    this.player.group.updateMatrixWorld(true)
    this.racket.sweetSpot.getWorldPosition(this.contactWorld)
    // 击球瞬间的拍面法线（局部 +Z），保证指向出球方向（+z 朝球网）
    this.racket.hoopGroup.getWorldQuaternion(this._faceQuat)
    this.contactNormal.set(0, 0, 1).applyQuaternion(this._faceQuat).normalize()
    if (this.contactNormal.z < 0) this.contactNormal.multiplyScalar(-1)
    const releaseT = Math.min(1, shot.contactAt + 0.09 / shot.duration)
    this.applyPose(releaseT)
    this.player.head.rotation.y = 0
    this.player.group.updateMatrixWorld(true)
    this.racket.sweetSpot.getWorldPosition(this.sweetWorld)
    this.computeSwingPath()
    this.solveForce()
    this.simulate(shot)

    const first = this.bounceEvents[0]
    if (first) {
      this.courtMark.visible = true
      this.courtMark.position.set(first.x, 0.014, first.z)
    } else {
      this.courtMark.visible = false
    }

    this.progress = 0
    this.setCamera('arena', Boolean(snapCamera))
    this.applyProgress(0)
    this.reportNetInfo()
  }

  reportNetInfo() {
    this.onNetChange?.({
      hit: Boolean(this.netHit),
      clear: this.netPass ? this.netPass.y - COURT.netCenterHeight : null,
      netY: this.netPass ? this.netPass.y : null,
      landing: this.bounceEvents[0] || null
    })
  }

  setShot(id) {
    const keepForce = this.forceOn
    this.applyShot(shotById(id), false)
    this.playing = true
    if (keepForce) {
      this.progress = (this.shot.contactAt * this.shot.duration) / this.clockSeconds()
      this.applyProgress(this.progress)
    }
  }

  /** 拍线摩擦系数：0.55 标准新线 / 0.05 湿球旧线（演示打滑）。 */
  setStringMu(mu) {
    this.stringMu = mu
    this.solveForce()
    this.applyProgress(this.progress)
  }

  setPlaying(value) {
    this.playing = value
  }

  setSpeed(value) {
    this.speed = value
  }

  setProgress(value) {
    this.progress = Math.min(1, Math.max(0, value))
    this.playing = false
    this.applyProgress(this.progress)
  }

  cameraPresets() {
    const place = this.shot?.place || { x: 0, z: -10.7 }
    return {
      arena: {
        pos: new THREE.Vector3(12.6, 7.8, 9.6),
        target: new THREE.Vector3(0.5, 1.15, -3.0)
      },
      side: {
        pos: new THREE.Vector3(place.x + 6.4, 2.5, place.z + 3.4),
        target: new THREE.Vector3(place.x - 0.2, 1.2, place.z + 3.6)
      },
      behind: {
        pos: new THREE.Vector3(place.x - 1.2, 2.6, place.z - 4.4),
        target: new THREE.Vector3(place.x - 0.7, 1.3, place.z + 10)
      },
      top: {
        pos: new THREE.Vector3(0, 22, -2),
        target: new THREE.Vector3(0, 0, -2)
      },
      racket: {
        pos: new THREE.Vector3(this.contactWorld.x + 1.3, this.contactWorld.y + 0.45, this.contactWorld.z + 1.1),
        target: this.contactWorld.clone()
      }
    }
  }

  defaultCamera() {
    return 'arena'
  }

  clockSeconds() {
    return this.shot.contactAt * this.shot.duration + this.flightTime
  }

  updateSwingTrace(swingT) {
    const visible = this.swingPoints.filter((item) => item.t <= swingT)
    this.swingTrace.fill(visible, visible.length - 1)

    const age = swingT - this.shot.contactAt
    if (age >= 0 && age < 0.22) {
      this.flash.visible = true
      this.flash.position.copy(this.contactWorld)
      this.flash.quaternion.copy(this.stage.camera.quaternion)
      const k = age / 0.22
      this.flash.scale.setScalar(1 + k * 4)
      this.flash.material.opacity = (1 - k) * 0.5
    } else {
      this.flash.visible = false
    }
  }

  updateEffects(flown) {
    let slot = 0
    this.rings.reset()
    for (const ev of this.events) {
      const age = flown - ev.t
      if (age < 0 || age > 0.5 || slot >= 6) continue
      this.rings.show(slot, {
        x: ev.x,
        y: ev.y,
        z: ev.z,
        vertical: ev.vertical,
        color: ev.color,
        p: age / 0.5,
        max: ev.max
      })
      slot += 1
    }
  }

  applyProgress(progress) {
    const shot = this.shot
    const total = this.clockSeconds()
    const seconds = progress * total
    const swingT = Math.min(1, seconds / shot.duration)
    this.applyPose(swingT)

    const contactTime = shot.contactAt * shot.duration
    const pocket = 0.09
    const meet = 0.18
    let flown = 0
    this.forceRig.setVisible(this.forceOn && Math.abs(seconds - contactTime) <= 0.15)
    this.player.group.updateMatrixWorld(true)
    this.racket.sweetSpot.getWorldPosition(this.liveSweet)

    if (seconds < contactTime - meet) {
      const k = seconds / Math.max(contactTime - meet, 0.001)
      const from = shot.approach
      const to = this.contactWorld
      this.ballObj.group.position.set(
        from.x + (to.x - from.x) * k,
        from.y + (to.y - from.y) * k,
        from.z + (to.z - from.z) * k
      )
      this.trail.clear()
      this.arc.clear()
      this.ballObj.group.scale.set(1, 1, 1)
    } else if (seconds < contactTime) {
      const u = (seconds - (contactTime - meet)) / meet
      const e = u * u * (3 - 2 * u)
      this.ballObj.group.position.lerpVectors(this.contactWorld, this.liveSweet, e)
      this.trail.clear()
      this.arc.clear()
      this.ballObj.group.scale.set(1, 1, 1)
    } else if (seconds <= contactTime + pocket) {
      this.ballObj.group.position.copy(this.liveSweet)
      const k = (seconds - contactTime) / pocket
      const squeeze = Math.sin(clamp(k, 0, 1) * Math.PI)
      this.ballObj.group.scale.set(1 - squeeze * 0.18, 1 + squeeze * 0.1, 1 - squeeze * 0.18)
      this.trail.clear()
      this.arc.clear()
    } else {
      flown = seconds - (contactTime + pocket)
      this.ballObj.group.scale.set(1, 1, 1)
      const point = this.sampleFlight(flown)
      this.ballObj.group.position.set(point.x, point.y, point.z)
      this.trail.fill(this.flight, point.index)
      this.arc.fill(this.flight.slice(point.index), 40)
    }

    this.ballObj.group.rotation.x = flown * 9
    this.ballObj.group.rotation.z = flown * 5

    const pos = this.ballObj.group.position
    this.shadow.update(pos.x, pos.y, pos.z)

    const local = this.player.group.worldToLocal(pos.clone())
    this.player.head.rotation.y = clamp(Math.atan2(-local.x, -local.z), -0.55, 0.55)

    this.court.deform(this.netHit, this.netHit ? flown - this.netHit.t : -1)
    this.updateEffects(flown)
    this.updateSwingTrace(swingT)
    this.emit()
  }

  emit() {
    const seconds = this.progress * this.clockSeconds()
    const swingT = Math.min(1, seconds / this.shot.duration)
    this.onFrame?.({
      progress: this.progress,
      playing: this.playing,
      phase: phaseAt(swingT)
    })
  }

  update(dt) {
    if (!this.playing) return
    this.progress += (dt * this.speed) / this.clockSeconds()
    if (this.progress >= 1) this.progress = 0
    this.applyProgress(this.progress)
  }

  dispose() {
    this.racket.dispose()
    this.player.dispose()
    this.ballObj.dispose()
    this.shadow.dispose()
    this.trail.dispose()
    this.arc.dispose()
    this.swingTrace.dispose()
    this.rings.dispose()
    this.forceRig.dispose()
    this.court.dispose()
    super.dispose()
  }

  static shots() {
    return SHOTS
  }
}
