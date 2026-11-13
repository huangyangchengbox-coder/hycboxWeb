import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { COURT, phaseAt, racketFlex, samplePose, shotById } from './catalog.js'

const BALL_R = 0.11
const GRAVITY = -9.81
const FIXED_DT = 1 / 120

const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export class TennisScene {
  constructor(canvas) {
    this.canvas = canvas
    this.shot = shotById('forehand')
    this.progress = 0
    this.playing = true
    this.speed = 1
    this.flight = [{ x: 0, y: 1, z: 0, t: 0 }]
    this.flightTime = 1
    this.bounceEvents = []
    this.netHit = null
    this.events = []
    this.disposed = false
    this.sweetWorld = new THREE.Vector3()
    this.camGoal = new THREE.Vector3()
    this.targetGoal = new THREE.Vector3()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.009)
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 160)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.buildLights()

    this.materials = []
    this.geometries = []
    this.buildCourt()
    this.buildPlayer()
    this.buildBall()
    this.buildEffects()

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = 4
    this.controls.maxDistance = 46
    this.camBlend = 0
    this.applyShot(this.shot, true)

    this.onResize = () => this.resize()
    window.addEventListener('resize', this.onResize)
    this.onVisible = () => {
      if (this.disposed || document.hidden) return
      this.last = performance.now()
      this.frameId = requestAnimationFrame(this.frame)
    }
    document.addEventListener('visibilitychange', this.onVisible)
    this.resize()
    this.last = performance.now()
    this.frame = (now) => this.animate(now)
    requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) window.__tennis = this
  }

  trackGeo(geo) {
    this.geometries.push(geo)
    return geo
  }

  trackMat(mat) {
    this.materials.push(mat)
    return mat
  }

  mat(color, roughness = 0.7, opts = {}) {
    return this.trackMat(new THREE.MeshStandardMaterial({ color, roughness, ...opts }))
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3b5e2b, 1.35)
    this.scene.add(hemi)

    const sun = new THREE.DirectionalLight(0xfff8e7, 2.35)
    sun.position.set(11, 22, 9)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -16
    sun.shadow.camera.right = 16
    sun.shadow.camera.top = 18
    sun.shadow.camera.bottom = -18
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 60
    sun.shadow.bias = -0.0006
    this.scene.add(sun)

    const fill = new THREE.DirectionalLight(0xbfe6ff, 0.45)
    fill.position.set(-12, 8, -10)
    this.scene.add(fill)
  }

  buildCourt() {
    const halfL = COURT.length / 2
    const halfD = COURT.doublesWidth / 2
    const halfS = COURT.singlesWidth / 2
    const service = COURT.serviceLineFromNet

    const outer = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(64, 76)),
      this.mat(0x2b6cb0, 0.92)
    )
    outer.rotation.x = -Math.PI / 2
    outer.position.y = -0.05
    outer.receiveShadow = true
    this.scene.add(outer)

    const apron = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(COURT.doublesWidth + 6.4, COURT.length + 7.6)),
      this.mat(0x1c5c48, 0.88)
    )
    apron.rotation.x = -Math.PI / 2
    apron.position.y = -0.03
    apron.receiveShadow = true
    this.scene.add(apron)

    const court = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(COURT.doublesWidth + 1.4, COURT.length + 1.6)),
      this.mat(0x2e7d32, 0.8)
    )
    court.rotation.x = -Math.PI / 2
    court.position.y = -0.012
    court.receiveShadow = true
    this.scene.add(court)

    const white = this.mat(0xf4fff6, 0.5)
    const addLine = (x, z, w, d) => {
      const mesh = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(w, 0.02, d)), white)
      mesh.position.set(x, 0.004, z)
      this.scene.add(mesh)
    }
    addLine(0, halfL, COURT.doublesWidth, COURT.lineWidth)
    addLine(0, -halfL, COURT.doublesWidth, COURT.lineWidth)
    addLine(-halfD, 0, COURT.lineWidth, COURT.length)
    addLine(halfD, 0, COURT.lineWidth, COURT.length)
    addLine(-halfS, 0, COURT.lineWidth * 0.8, COURT.length)
    addLine(halfS, 0, COURT.lineWidth * 0.8, COURT.length)
    addLine(0, service, COURT.singlesWidth, COURT.lineWidth)
    addLine(0, -service, COURT.singlesWidth, COURT.lineWidth)
    addLine(0, 0, COURT.lineWidth, service * 2)

    this.buildNet()

    const postMat = this.mat(0x1e293b, 0.45, { metalness: 0.5 })
    const postX = halfD + COURT.postOutset
    for (const x of [-postX, postX]) {
      const post = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.07, 0.07, COURT.netPostHeight + 0.08, 14)),
        postMat
      )
      post.position.set(x, (COURT.netPostHeight + 0.08) / 2, 0)
      post.castShadow = true
      this.scene.add(post)
    }
  }

  buildNet() {
    const postX = COURT.doublesWidth / 2 + COURT.postOutset
    const netW = postX * 2
    const h = COURT.netPostHeight
    const sag = (nx) => (COURT.netPostHeight - COURT.netCenterHeight) * (1 - nx * nx)

    this.netGeo = this.trackGeo(new THREE.PlaneGeometry(netW, h, 48, 12))
    const pos = this.netGeo.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const nx = pos.getX(i) / postX
      const y = pos.getY(i) + h / 2
      const top = h - sag(nx)
      pos.setY(i, -h / 2 + (y / h) * top)
    }
    this.netGeo.computeVertexNormals()

    const netMat = this.trackMat(new THREE.MeshStandardMaterial({
      map: this.netTexture(),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      roughness: 0.65,
      depthWrite: false
    }))
    this.netMesh = new THREE.Mesh(this.netGeo, netMat)
    this.netMesh.position.y = h / 2
    this.netMesh.castShadow = true
    this.scene.add(this.netMesh)

    this.tapeGeo = this.trackGeo(new THREE.BoxGeometry(netW, 0.055, 0.035, 48, 1, 1))
    const tape = this.tapeGeo.attributes.position
    for (let i = 0; i < tape.count; i += 1) {
      const nx = tape.getX(i) / postX
      tape.setY(i, tape.getY(i) + h - sag(nx))
    }
    this.tapeMat = this.mat(0xffffff, 0.45)
    this.tapeMesh = new THREE.Mesh(this.tapeGeo, this.tapeMat)
    this.scene.add(this.tapeMesh)

    this.netBase = Float32Array.from(this.netGeo.attributes.position.array)
    this.tapeBase = Float32Array.from(this.tapeGeo.attributes.position.array)
    this.netHalf = h / 2
    this.netHeight = h
  }

  netTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 64, 64)
    ctx.strokeStyle = 'rgba(246, 250, 246, 0.95)'
    ctx.lineWidth = 5
    ctx.strokeRect(0, 0, 64, 64)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(58, 7)
    this.materials.push({ dispose: () => tex.dispose() })
    return tex
  }

  buildPlayer() {
    const shirt = this.mat(0x2563eb, 0.5)
    const shorts = this.mat(0xf8fafc, 0.62)
    const skin = this.mat(0xffd1b3, 0.6)
    const shoe = this.mat(0x1e293b, 0.5)
    const frame = this.mat(0x0f172a, 0.32, { metalness: 0.42 })
    const accent = this.mat(0xd8f34a, 0.34)

    this.player = new THREE.Group()
    this.player.rotation.y = Math.PI
    this.scene.add(this.player)

    this.legs = [-0.15, 0.15].map((x) => {
      const hip = new THREE.Group()
      hip.position.set(x, 0.76, 0)
      const thigh = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.12, 0.11, 0.26, 12)), shorts)
      thigh.position.y = -0.12
      thigh.castShadow = true
      hip.add(thigh)
      const calf = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 12)), skin)
      calf.position.y = -0.44
      calf.castShadow = true
      hip.add(calf)
      const foot = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.16, 0.11, 0.28)), shoe)
      foot.position.set(0, -0.7, -0.05)
      foot.castShadow = true
      hip.add(foot)
      this.player.add(hip)
      return hip
    })

    this.torsoPivot = new THREE.Group()
    this.torsoPivot.position.set(0, 0.76, 0)
    this.player.add(this.torsoPivot)
    const torso = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.52, 0.66, 0.28)), shirt)
    torso.position.y = 0.33
    torso.castShadow = true
    this.torsoPivot.add(torso)

    this.head = new THREE.Group()
    this.head.position.set(0, 0.86, 0)
    const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.2, 20, 16)), skin)
    skull.castShadow = true
    this.head.add(skull)
    const cap = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.206, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      shirt
    )
    cap.rotation.x = -0.15
    this.head.add(cap)
    const visor = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.28, 0.03, 0.22)), shirt)
    visor.position.set(0, 0.05, -0.18)
    visor.rotation.x = 0.15
    this.head.add(visor)
    this.torsoPivot.add(this.head)

    this.leftShoulder = new THREE.Group()
    this.leftShoulder.position.set(-0.34, 0.58, 0)
    const leftArm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.54, 12)), skin)
    leftArm.rotation.z = Math.PI / 2
    leftArm.position.set(-0.27, 0, -0.06)
    leftArm.castShadow = true
    this.leftShoulder.add(leftArm)
    this.torsoPivot.add(this.leftShoulder)

    this.rightShoulder = new THREE.Group()
    this.rightShoulder.position.set(0.34, 0.58, 0)
    this.torsoPivot.add(this.rightShoulder)
    const upper = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 12)), skin)
    upper.rotation.z = -Math.PI / 2
    upper.position.set(0.16, 0, 0)
    upper.castShadow = true
    this.rightShoulder.add(upper)

    this.elbow = new THREE.Group()
    this.elbow.position.set(0.3, 0, 0)
    this.elbow.rotation.y = 0.22
    this.rightShoulder.add(this.elbow)
    const forearm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 12)), skin)
    forearm.rotation.z = -Math.PI / 2
    forearm.position.set(0.15, 0, 0)
    forearm.castShadow = true
    this.elbow.add(forearm)

    this.racket = new THREE.Group()
    this.racket.position.set(0.3, 0, 0)
    this.elbow.add(this.racket)
    const grip = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.028, 0.03, 0.24, 10)), frame)
    grip.rotation.z = -Math.PI / 2
    grip.position.set(0.1, 0, 0)
    grip.castShadow = true
    this.racket.add(grip)
    const neck = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8)), accent)
    neck.rotation.z = -Math.PI / 2
    neck.position.set(0.28, 0, 0)
    this.racket.add(neck)

    this.hoop = new THREE.Group()
    this.hoop.position.set(0.56, 0, 0)
    this.hoop.scale.set(1.2, 0.92, 1)
    this.racket.add(this.hoop)
    const hoop = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.2, 0.022, 10, 28)), accent)
    hoop.castShadow = true
    this.hoop.add(hoop)

    this.strings = new THREE.LineSegments(
      this.trackGeo(this.stringBedGeometry()),
      this.trackMat(new THREE.LineBasicMaterial({ color: 0xf2fbf2, transparent: true, opacity: 0.8 }))
    )
    this.hoop.add(this.strings)

    this.sweetSpot = new THREE.Object3D()
    this.hoop.add(this.sweetSpot)

    this.arcGeo = this.trackGeo(new THREE.BufferGeometry())
    this.arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(41 * 3), 3))
    this.arcLine = new THREE.Line(
      this.arcGeo,
      this.trackMat(new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      }))
    )
    this.arcLine.frustumCulled = false
    this.scene.add(this.arcLine)
    this.arcTimes = []

    this.swingGeo = this.trackGeo(new THREE.BufferGeometry())
    this.swingGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(120 * 3), 3))
    this.swingLine = new THREE.Line(
      this.swingGeo,
      this.trackMat(new THREE.LineBasicMaterial({
        color: 0xf2fbf2,
        transparent: true,
        opacity: 0.5,
        depthWrite: false
      }))
    )
    this.swingLine.frustumCulled = false
    this.scene.add(this.swingLine)
    this.swingPoints = []

    this.flash = new THREE.Mesh(
      this.trackGeo(new THREE.RingGeometry(0.1, 0.2, 28)),
      this.trackMat(new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      }))
    )
    this.flash.visible = false
    this.scene.add(this.flash)
  }

  stringBedGeometry() {
    const pts = []
    const R = 0.185
    for (let i = -3; i <= 3; i += 1) {
      const x = (i / 3) * R * 0.82
      const h = Math.sqrt(Math.max(0, R * R - x * x)) * 0.94
      pts.push(x, -h, 0, x, h, 0)
      const y = (i / 3) * R * 0.82
      const w = Math.sqrt(Math.max(0, R * R - y * y)) * 0.94
      pts.push(-w, y, 0, w, y, 0)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return geo
  }

  buildBall() {
    this.ball = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(BALL_R, 20, 16)),
      this.mat(0xd9ff00, 0.35, { emissive: 0x3a4d00 })
    )
    this.ball.castShadow = true
    this.scene.add(this.ball)

    const seam = new THREE.Mesh(
      this.trackGeo(new THREE.TorusGeometry(BALL_R * 0.995, BALL_R * 0.045, 6, 24)),
      this.trackMat(new THREE.MeshBasicMaterial({ color: 0xf7ffe6 }))
    )
    seam.rotation.y = Math.PI / 2.6
    this.ball.add(seam)

    this.shadow = new THREE.Mesh(
      this.trackGeo(new THREE.CircleGeometry(BALL_R * 1.15, 20)),
      this.trackMat(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 }))
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.012
    this.scene.add(this.shadow)

    const maxPoints = 420
    this.trailGeo = this.trackGeo(new THREE.BufferGeometry())
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3))
    this.trailLine = new THREE.Line(
      this.trailGeo,
      this.trackMat(new THREE.LineBasicMaterial({ color: 0xeaff66, transparent: true, opacity: 0.7 }))
    )
    this.scene.add(this.trailLine)

    this.puffs = []
    for (let i = 0; i < 12; i += 1) {
      const ratio = 1 - i / 12
      const mesh = new THREE.Mesh(
        this.trackGeo(new THREE.SphereGeometry(BALL_R * ratio * 0.8, 8, 8)),
        this.trackMat(new THREE.MeshBasicMaterial({ color: 0xeaff66, transparent: true, opacity: ratio * 0.32 }))
      )
      mesh.visible = false
      this.scene.add(mesh)
      this.puffs.push(mesh)
    }
  }

  buildEffects() {
    this.ringPool = []
    for (let i = 0; i < 5; i += 1) {
      const mesh = new THREE.Mesh(
        this.trackGeo(new THREE.RingGeometry(0.08, 0.16, 32)),
        this.trackMat(new THREE.MeshBasicMaterial({
          color: 0xffffff,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9
        }))
      )
      mesh.visible = false
      this.scene.add(mesh)
      this.ringPool.push(mesh)
    }

    this.courtMark = new THREE.Mesh(
      this.trackGeo(new THREE.RingGeometry(0.22, 0.28, 40)),
      this.trackMat(new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false
      }))
    )
    this.courtMark.rotation.x = -Math.PI / 2
    this.courtMark.position.y = 0.014
    this.scene.add(this.courtMark)
  }

  simulate(shot) {
    const pos = this.sweetWorld.clone()
    const vel = new THREE.Vector3(shot.velocity.x, shot.velocity.y, shot.velocity.z)
    const points = [{ x: pos.x, y: pos.y, z: pos.z, t: 0 }]
    const bounces = []
    let netHit = null
    this.netPass = null
    let t = 0
    for (let i = 0; i < 520 && points.length < 420; i += 1) {
      const prevZ = pos.z
      vel.y += GRAVITY * FIXED_DT
      vel.multiplyScalar(0.999)
      pos.addScaledVector(vel, FIXED_DT)
      t += FIXED_DT

      if (!netHit && prevZ < 0 && pos.z >= 0 && Math.abs(pos.x) < COURT.doublesWidth / 2 + 1.2) {
        const k = prevZ / (prevZ - pos.z)
        const crossY = pos.y - vel.y * FIXED_DT * (1 - k)
        this.netPass = { x: pos.x, y: crossY, t }
        if (crossY < COURT.netCenterHeight + BALL_R * 0.6) {
          netHit = { x: pos.x, y: Math.max(crossY, 0.35), t }
          pos.z = -0.16
          vel.z = -Math.abs(vel.z) * 0.24
          vel.y = Math.max(vel.y * 0.2, 1.15)
          vel.x *= 0.6
        }
      }

      if (pos.y < BALL_R && vel.y < 0) {
        pos.y = BALL_R
        vel.y = -vel.y * shot.bounce
        vel.x *= 0.72
        vel.z *= 0.72
        bounces.push({ x: pos.x, z: pos.z, t })
      }

      points.push({ x: pos.x, y: pos.y, z: pos.z, t })
      if (bounces.length >= 3) break
      if (bounces.length >= 2 && t - bounces[1].t > 0.4) break
    }

    this.flight = points
    this.flightTime = Math.max(points[points.length - 1].t, 0.5)
    this.bounceEvents = bounces
    this.netHit = netHit

    const events = [{
      t: 0,
      x: points[0].x,
      y: points[0].y,
      z: points[0].z,
      color: 0xffffff,
      vertical: true,
      max: 2.3
    }]
    bounces.forEach((b) => events.push({
      t: b.t,
      x: b.x,
      y: 0.02,
      z: b.z,
      color: 0xd9ff00,
      vertical: false,
      max: 2.1
    }))
    if (netHit) {
      events.push({
        t: netHit.t,
        x: netHit.x,
        y: netHit.y,
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
    this.player.position.x = shot.place.x + pose.bodyX
    this.player.position.y = settle
    this.player.position.z = shot.place.z + lunge
    this.torsoPivot.rotation.y = pose.torsoY
    this.torsoPivot.rotation.x = pose.torsoX + lunge * 0.55
    this.rightShoulder.rotation.set(pose.shX, pose.shY, pose.shZ)
    this.leftShoulder.rotation.y = pose.leftY
    this.leftShoulder.rotation.z = pose.leftZ
    this.legs[0].rotation.x = pose.legL + lunge * 1.1
    this.legs[1].rotation.x = pose.legR - lunge * 0.7

    this.elbow.rotation.y = 0.22 + flex.elbow
    this.hoop.rotation.y = flex.face
    this.hoop.rotation.x = -flex.face * 0.25
    const pocket = flex.string
    this.strings.position.z = pocket
    const stretch = 1 + Math.abs(pocket) * 1.8
    this.strings.scale.set(stretch, stretch, 1)
  }

  applyShot(shot, snapCamera) {
    this.shot = shot
    this.ball.scale.set(1, 1, 1)
    this.player.position.set(shot.place.x, 0, shot.place.z)
    const releaseT = Math.min(1, shot.contactAt + 0.09 / shot.duration)
    this.applyPose(releaseT)
    this.head.rotation.y = 0
    this.player.updateMatrixWorld(true)
    this.sweetSpot.getWorldPosition(this.sweetWorld)
    this.computeSwingPath()
    this.simulate(shot)
    const firstBounce = this.bounceEvents[0]
    if (firstBounce) {
      this.courtMark.visible = true
      this.courtMark.position.set(firstBounce.x, 0.014, firstBounce.z)
    } else {
      this.courtMark.visible = false
    }
    this.progress = 0
    if (snapCamera) this.setCamera('arena', true)
    else this.setCamera('arena', false)
    this.applyProgress(0)
    this.onNetChange?.({
      hit: Boolean(this.netHit),
      clear: this.netPass ? this.netPass.y - COURT.netCenterHeight : null,
      netY: this.netPass ? this.netPass.y : null
    })
  }

  setShot(id) {
    this.applyShot(shotById(id), false)
    this.playing = true
  }

  reportNetInfo() {
    this.onNetChange?.({
      hit: Boolean(this.netHit),
      clear: this.netPass ? this.netPass.y - COURT.netCenterHeight : null,
      netY: this.netPass ? this.netPass.y : null
    })
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
      }
    }
  }

  setCamera(name, immediate = false) {
    const presets = this.cameraPresets()
    const preset = presets[name] || presets.arena
    this.cameraName = presets[name] ? name : 'arena'
    this.camGoal.copy(preset.pos)
    this.targetGoal.copy(preset.target)
    if (immediate) {
      this.camera.position.copy(this.camGoal)
      this.controls.target.copy(this.targetGoal)
      this.camBlend = 0
      this.controls.update()
      return
    }
    this.camBlend = 1
  }

  clockSeconds() {
    return this.shot.contactAt * this.shot.duration + this.flightTime
  }

  updateNet(flown) {
    const netAttr = this.netGeo.attributes.position
    const tapeAttr = this.tapeGeo.attributes.position
    netAttr.array.set(this.netBase)
    tapeAttr.array.set(this.tapeBase)

    const hit = this.netHit
    const since = hit ? flown - hit.t : -1
    if (hit && since >= 0 && since < 0.9) {
      const wave = Math.sin(since * 26) * Math.exp(-since * 5.1)
      const netArr = netAttr.array
      for (let i = 0; i < netAttr.count; i += 1) {
        const bx = this.netBase[i * 3]
        const by = this.netBase[i * 3 + 1] + this.netHalf
        const bz = this.netBase[i * 3 + 2]
        const d2 = (bx - hit.x) ** 2 + (by - hit.y) ** 2
        const influence = Math.exp(-d2 * 1.15)
        netArr[i * 3 + 2] = bz + 0.46 * influence * wave
      }
      const tapeArr = tapeAttr.array
      for (let i = 0; i < tapeAttr.count; i += 1) {
        const bx = this.tapeBase[i * 3]
        const bz = this.tapeBase[i * 3 + 2]
        const influence = Math.exp(-((bx - hit.x) ** 2) * 0.85) * 0.5
        tapeArr[i * 3 + 2] = bz + 0.3 * influence * wave
      }
      const glow = Math.max(0, 1 - since * 3.4)
      this.tapeMat.emissive.setRGB(glow * 0.8, glow * 0.5, 0)
    } else if (hit) {
      this.tapeMat.emissive.setRGB(0, 0, 0)
    } else {
      this.tapeMat.emissive.setRGB(0, 0, 0)
    }
    netAttr.needsUpdate = true
    tapeAttr.needsUpdate = true
  }

  updateEffects(flown) {
    let slot = 0
    this.ringPool.forEach((ring) => { ring.visible = false })
    for (const ev of this.events) {
      const age = flown - ev.t
      if (age < 0 || age > 0.5 || slot >= this.ringPool.length) continue
      const ring = this.ringPool[slot]
      slot += 1
      const p = age / 0.5
      ring.visible = true
      ring.position.set(ev.x, ev.vertical ? ev.y : ev.y, ev.z)
      ring.rotation.set(ev.vertical ? 0 : -Math.PI / 2, 0, 0)
      ring.scale.setScalar(1 + p * ev.max)
      ring.material.color.setHex(ev.color)
      ring.material.opacity = (1 - p) * 0.8
    }
  }

  updatePuffs(index) {
    const points = this.flight
    this.puffs.forEach((puff, i) => {
      const at = index - (i + 1) * 3
      if (at < 1) {
        puff.visible = false
        return
      }
      const pt = points[at]
      puff.visible = true
      puff.position.set(pt.x, pt.y, pt.z)
    })
  }

  computeSwingPath() {
    const shot = this.shot
    const saved = this.player.position.clone()
    const points = []
    const start = Math.max(0, shot.contactAt - 0.4)
    const steps = 30
    for (let i = 0; i <= steps; i += 1) {
      const st = start + ((1 - start) * i) / steps
      this.applyPose(st)
      this.player.updateMatrixWorld(true)
      const p = new THREE.Vector3()
      this.sweetSpot.getWorldPosition(p)
      points.push({ t: st, p })
    }
    this.player.position.copy(saved)
    this.swingPoints = points
  }

  updateSwingTrace(swingT) {
    const attr = this.swingGeo.attributes.position
    const visible = this.swingPoints.filter((item) => item.t <= swingT)
    if (visible.length < 2) {
      this.swingGeo.setDrawRange(0, 0)
    } else {
      const total = visible.length
      const from = Math.max(0, total - 120)
      let count = 0
      for (let i = from; i < total; i += 1) {
        attr.setXYZ(count, visible[i].p.x, visible[i].p.y, visible[i].p.z)
        count += 1
      }
      attr.needsUpdate = true
      this.swingGeo.setDrawRange(0, count)
    }

    // 击球闪光钉在触球点，不跟球飞，避免光环飘到网对面
    const age = (swingT - this.shot.contactAt) * 1
    if (age >= 0 && age < 0.22) {
      this.flash.visible = true
      this.flash.position.copy(this.sweetWorld)
      this.flash.quaternion.copy(this.camera.quaternion)
      const k = age / 0.22
      this.flash.scale.setScalar(1 + k * 4)
      this.flash.material.opacity = (1 - k) * 0.5
    } else {
      this.flash.visible = false
    }
  }

  updateArc(index, flown) {
    const attr = this.arcGeo.attributes.position
    if (index <= 0 || this.flight.length < 4) {
      this.arcGeo.setDrawRange(0, 0)
      return
    }
    const horizon = 0.55
    let count = 0
    for (let i = index; i < this.flight.length && i < index + 41; i += 1) {
      const pt = this.flight[i]
      if (pt.t - flown > horizon) break
      attr.setXYZ(count, pt.x, pt.y, pt.z)
      count += 1
    }
    attr.needsUpdate = true
    this.arcGeo.setDrawRange(0, count > 1 ? count : 0)
  }

  applyProgress(progress) {
    const shot = this.shot
    const total = this.clockSeconds()
    const seconds = progress * total
    const swingT = Math.min(1, seconds / shot.duration)
    this.applyPose(swingT)

    const contactTime = shot.contactAt * shot.duration
    const pocket = 0.09
    let flown = 0

    if (seconds < contactTime - 0.12) {
      const k = seconds / Math.max(contactTime - 0.12, 0.001)
      const from = shot.approach
      this.ball.position.set(
        from.x + (this.sweetWorld.x - from.x) * k,
        from.y + (this.sweetWorld.y - from.y) * k,
        from.z + (this.sweetWorld.z - from.z) * k
      )
      this.trailGeo.setDrawRange(0, 0)
      this.puffs.forEach((puff) => { puff.visible = false })
      this.arcGeo.setDrawRange(0, 0)
      flown = 0
    } else if (seconds <= contactTime + pocket) {
      this.player.updateMatrixWorld(true)
      this.sweetSpot.getWorldPosition(this.ball.position)
      this.trailGeo.setDrawRange(0, 0)
      this.puffs.forEach((puff) => { puff.visible = false })
      this.arcGeo.setDrawRange(0, 0)
      const k = (seconds - (contactTime - pocket * 0.4)) / (pocket * 1.4)
      const squeeze = Math.sin(clamp(k, 0, 1) * Math.PI)
      this.ball.scale.set(1 - squeeze * 0.18, 1 + squeeze * 0.1, 1 - squeeze * 0.18)
      flown = 0
    } else {
      flown = seconds - (contactTime + pocket)
      this.ball.scale.set(1, 1, 1)
      const point = this.sampleFlight(flown)
      this.ball.position.set(point.x, point.y, point.z)
      const attr = this.trailGeo.attributes.position
      let count = 0
      for (let i = 0; i <= point.index && i < 420; i += 1) {
        const pt = this.flight[Math.min(i, this.flight.length - 1)]
        attr.setXYZ(i, pt.x, pt.y, pt.z)
        count = i + 1
      }
      attr.needsUpdate = true
      this.trailGeo.setDrawRange(0, count)
      this.updatePuffs(point.index)
      this.updateArc(point.index, flown)
    }

    this.ball.rotation.x = flown * 9
    this.ball.rotation.z = flown * 5
    this.updateSwingTrace(swingT)

    this.shadow.position.set(this.ball.position.x, 0.012, this.ball.position.z)
    this.shadow.scale.setScalar(clamp(1.25 - this.ball.position.y * 0.16, 0.4, 1.25))

    const local = this.player.worldToLocal(this.ball.position.clone())
    this.head.rotation.y = clamp(Math.atan2(-local.x, -local.z), -0.55, 0.55)

    this.updateNet(flown)
    this.updateEffects(flown)
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

  resize() {
    const width = this.canvas.clientWidth || 1
    const height = this.canvas.clientHeight || 1
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  animate(now) {
    if (this.disposed) return
    if (document.hidden) return
    this.frameId = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    if (this.camBlend > 0) {
      this.camera.position.lerp(this.camGoal, 0.12)
      this.controls.target.lerp(this.targetGoal, 0.12)
      this.camBlend *= 0.9
      if (this.camBlend < 0.02) this.camBlend = 0
    }
    if (this.playing) {
      this.progress += dt * this.speed / this.clockSeconds()
      if (this.progress >= 1) this.progress = 0
      this.applyProgress(this.progress)
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    document.removeEventListener('visibilitychange', this.onVisible)
    window.removeEventListener('resize', this.onResize)
    this.controls.dispose()
    this.geometries.forEach((geo) => geo.dispose())
    this.materials.forEach((mat) => mat.dispose())
    this.renderer.dispose()
  }
}
