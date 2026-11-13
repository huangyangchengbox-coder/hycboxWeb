import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { COURT, phaseAt, racketFlex, samplePose, shotById } from './catalog.js'

const BALL_R = 0.055
const GRAVITY = -9.81

function lineBox(w, h, d) {
  return new THREE.BoxGeometry(w, h, d)
}

export class TennisScene {
  constructor(canvas) {
    this.canvas = canvas
    this.shot = shotById('forehand')
    this.progress = 0
    this.playing = true
    this.speed = 1
    this.flight = []
    this.flightTime = 1
    this.disposed = false
    this.sweetWorld = new THREE.Vector3()
    this.camGoal = new THREE.Vector3()
    this.targetGoal = new THREE.Vector3()

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x071719)
    this.scene.fog = new THREE.Fog(0x071719, 28, 62)
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true

    this.scene.add(new THREE.HemisphereLight(0xcaffee, 0x17382e, 1.7))
    const sun = new THREE.DirectionalLight(0xffffff, 2.4)
    sun.position.set(-8, 14, 6)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    this.scene.add(sun)
    const rim = new THREE.PointLight(0x70d9ae, 18, 24)
    rim.position.set(6, 5, -8)
    this.scene.add(rim)

    this.materials = []
    this.geometries = []
    this.buildCourt()
    this.buildPlayer()
    this.buildBall()

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI * 0.49
    this.controls.minDistance = 3
    this.controls.maxDistance = 40
    this.camBlend = 0
    this.setCamera('side', true)
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
  }

  trackGeo(geo) {
    this.geometries.push(geo)
    return geo
  }

  trackMat(mat) {
    this.materials.push(mat)
    return mat
  }

  mat(color, roughness = 0.7) {
    return this.trackMat(new THREE.MeshStandardMaterial({ color, roughness }))
  }

  buildCourt() {
    const halfL = COURT.length / 2
    const halfD = COURT.doublesWidth / 2
    const halfS = COURT.singlesWidth / 2
    const service = COURT.serviceLineFromNet
    const ground = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(40, 48)),
      this.mat(0x0c3d32, 0.9)
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.04
    ground.receiveShadow = true
    this.scene.add(ground)

    const court = new THREE.Mesh(
      this.trackGeo(new THREE.PlaneGeometry(COURT.doublesWidth + 1.2, COURT.length + 2.4)),
      this.mat(0x176e55, 0.82)
    )
    court.rotation.x = -Math.PI / 2
    court.receiveShadow = true
    this.scene.add(court)

    const white = this.mat(0xeaffed, 0.45)
    const addLine = (x, z, w, d) => {
      const mesh = new THREE.Mesh(this.trackGeo(lineBox(w, 0.02, d)), white)
      mesh.position.set(x, 0.01, z)
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

    const posts = this.mat(0xd7e7dc, 0.4)
    const postX = halfD + COURT.postOutset
    for (const x of [-postX, postX]) {
      const post = new THREE.Mesh(
        this.trackGeo(new THREE.CylinderGeometry(0.04, 0.04, COURT.netPostHeight, 10)),
        posts
      )
      post.position.set(x, COURT.netPostHeight / 2, 0)
      this.scene.add(post)
    }

    const netGeo = this.trackGeo(new THREE.PlaneGeometry(postX * 2, COURT.netPostHeight, 20, 1))
    const pos = netGeo.attributes.position
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      if (y > 0.2) {
        const nx = x / postX
        const sag = (COURT.netPostHeight - COURT.netCenterHeight) * (1 - nx * nx)
        pos.setY(i, y - sag * 0.5)
      }
    }
    netGeo.computeVertexNormals()
    const netMap = this.netTexture()
    const netMat = this.trackMat(new THREE.MeshBasicMaterial({
      map: netMap,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    }))
    const net = new THREE.Mesh(netGeo, netMat)
    net.position.y = COURT.netPostHeight / 2
    this.scene.add(net)
    const tape = new THREE.Mesh(
      this.trackGeo(new THREE.BoxGeometry(postX * 2, 0.04, 0.03)),
      white
    )
    tape.position.y = COURT.netCenterHeight
    this.scene.add(tape)
  }

  netTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, 256, 64)
    ctx.strokeStyle = 'rgba(226, 238, 226, 0.9)'
    ctx.lineWidth = 1
    for (let x = 0; x <= 256; x += 8) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, 64)
      ctx.stroke()
    }
    for (let y = 0; y <= 64; y += 8) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(256, y)
      ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    this.materials.push({ dispose: () => tex.dispose() })
    return tex
  }

  buildPlayer() {
    const shirt = this.mat(0xd7f1dc, 0.5)
    const shorts = this.mat(0xf4f7f2, 0.6)
    const skin = this.mat(0xffd1b3, 0.6)
    const shoe = this.mat(0x1e293b, 0.5)
    const frame = this.mat(0x0f172a, 0.35)
    frame.metalness = 0.35
    const accent = this.mat(0xd7f68a, 0.35)
    this.player = new THREE.Group()
    this.player.rotation.y = Math.PI
    this.scene.add(this.player)

    this.legs = [-0.15, 0.15].map((x) => {
      const hip = new THREE.Group()
      hip.position.set(x, 0.76, 0)
      const thigh = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.12, 0.1, 0.28, 12)), shorts)
      thigh.position.y = -0.14
      thigh.castShadow = true
      hip.add(thigh)
      const calf = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.08, 0.065, 0.4, 12)), skin)
      calf.position.y = -0.46
      calf.castShadow = true
      hip.add(calf)
      const foot = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.16, 0.1, 0.28)), shoe)
      foot.position.set(0, -0.7, -0.04)
      foot.castShadow = true
      hip.add(foot)
      this.player.add(hip)
      return hip
    })

    this.torsoPivot = new THREE.Group()
    this.torsoPivot.position.set(0, 0.76, 0)
    this.player.add(this.torsoPivot)
    const torso = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.5, 0.64, 0.26)), shirt)
    torso.position.y = 0.32
    torso.castShadow = true
    this.torsoPivot.add(torso)

    this.head = new THREE.Group()
    this.head.position.set(0, 0.82, 0)
    const skull = new THREE.Mesh(this.trackGeo(new THREE.SphereGeometry(0.18, 18, 14)), skin)
    skull.castShadow = true
    this.head.add(skull)
    const cap = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(0.19, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)),
      shirt
    )
    this.head.add(cap)
    const visor = new THREE.Mesh(this.trackGeo(new THREE.BoxGeometry(0.26, 0.025, 0.18)), shirt)
    visor.position.set(0, 0.04, -0.16)
    this.head.add(visor)
    this.torsoPivot.add(this.head)

    this.leftShoulder = new THREE.Group()
    this.leftShoulder.position.set(-0.32, 0.54, 0)
    const leftArm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.07, 0.06, 0.5, 10)), skin)
    leftArm.rotation.z = Math.PI / 2
    leftArm.position.set(-0.24, 0, -0.04)
    leftArm.castShadow = true
    this.leftShoulder.add(leftArm)
    this.torsoPivot.add(this.leftShoulder)

    this.rightShoulder = new THREE.Group()
    this.rightShoulder.position.set(0.32, 0.54, 0)
    this.torsoPivot.add(this.rightShoulder)
    const upper = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.075, 0.065, 0.3, 10)), skin)
    upper.rotation.z = -Math.PI / 2
    upper.position.set(0.15, 0, 0)
    upper.castShadow = true
    this.rightShoulder.add(upper)

    this.elbow = new THREE.Group()
    this.elbow.position.set(0.28, 0, 0)
    this.elbow.rotation.y = 0.22
    this.rightShoulder.add(this.elbow)
    const forearm = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 10)), skin)
    forearm.rotation.z = -Math.PI / 2
    forearm.position.set(0.14, 0, 0)
    forearm.castShadow = true
    this.elbow.add(forearm)

    this.racket = new THREE.Group()
    this.racket.position.set(0.28, 0, 0)
    this.elbow.add(this.racket)
    const grip = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.026, 0.028, 0.22, 8)), frame)
    grip.rotation.z = -Math.PI / 2
    grip.position.set(0.1, 0, 0)
    this.racket.add(grip)
    const neck = new THREE.Mesh(this.trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8)), accent)
    neck.rotation.z = -Math.PI / 2
    neck.position.set(0.26, 0, 0)
    this.racket.add(neck)

    this.hoop = new THREE.Group()
    this.hoop.position.set(0.52, 0, 0)
    this.hoop.scale.set(1.15, 0.9, 1)
    this.racket.add(this.hoop)
    const hoop = new THREE.Mesh(this.trackGeo(new THREE.TorusGeometry(0.2, 0.02, 8, 24)), accent)
    hoop.castShadow = true
    this.hoop.add(hoop)
    this.strings = new THREE.Mesh(
      this.trackGeo(new THREE.CircleGeometry(0.185, 12)),
      this.trackMat(new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.72
      }))
    )
    this.hoop.add(this.strings)
    this.sweetSpot = new THREE.Object3D()
    this.hoop.add(this.sweetSpot)
  }

  buildBall() {
    this.ball = new THREE.Mesh(
      this.trackGeo(new THREE.SphereGeometry(BALL_R, 20, 16)),
      this.mat(0xd8f35e, 0.35)
    )
    this.ball.castShadow = true
    this.scene.add(this.ball)
    this.shadow = new THREE.Mesh(
      this.trackGeo(new THREE.CircleGeometry(0.16, 20)),
      this.trackMat(new THREE.MeshBasicMaterial({ color: 0x00150d, transparent: true, opacity: 0.35 }))
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.position.y = 0.02
    this.scene.add(this.shadow)

    const positions = new Float32Array(180 * 3)
    this.trailGeo = this.trackGeo(new THREE.BufferGeometry())
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.trail = new THREE.Line(
      this.trailGeo,
      this.trackMat(new THREE.LineBasicMaterial({ color: 0xd8f34a, transparent: true, opacity: 0.9 }))
    )
    this.scene.add(this.trail)
  }

  simulate(shot) {
    const points = []
    const pos = this.sweetWorld.clone()
    const vel = new THREE.Vector3(shot.velocity.x, shot.velocity.y, shot.velocity.z)
    const dt = 1 / 120
    let time = 0
    let bounces = 0
    for (let i = 0; i < 360 && bounces < 2; i += 1) {
      points.push(pos.clone())
      vel.y += GRAVITY * dt
      vel.multiplyScalar(0.998)
      pos.addScaledVector(vel, dt)
      time += dt
      if (pos.y < BALL_R && vel.y < 0) {
        pos.y = BALL_R
        vel.y = -vel.y * shot.bounce
        vel.x *= 0.72
        vel.z *= 0.72
        bounces += 1
      }
    }
    this.flight = points
    this.flightTime = Math.max(time, 0.4)
    const attr = this.trailGeo.attributes.position
    points.forEach((point, index) => {
      if (index < 180) attr.setXYZ(index, point.x, point.y, point.z)
    })
    attr.needsUpdate = true
    this.trailGeo.setDrawRange(0, 0)
  }

  applyPose(swingT) {
    const shot = this.shot
    const pose = samplePose(shot.keys, swingT)
    const flex = racketFlex(swingT, shot.contactAt, shot.flex)
    this.player.position.x = shot.place.x + pose.bodyX
    this.torsoPivot.rotation.y = pose.torsoY
    this.torsoPivot.rotation.x = pose.torsoX
    this.rightShoulder.rotation.set(pose.shX, pose.shY, pose.shZ)
    this.leftShoulder.rotation.y = pose.leftY
    this.leftShoulder.rotation.z = pose.leftZ
    this.legs[0].rotation.x = pose.legL
    this.legs[1].rotation.x = pose.legR
    this.elbow.rotation.y = 0.22 + flex.elbow
    this.hoop.rotation.y = flex.face
    this.strings.position.z = flex.string
    const stretch = 1 + Math.abs(flex.string) * 1.6
    this.strings.scale.set(stretch, stretch, 1)
    this.head.rotation.y = -pose.torsoY * 0.2
  }

  applyShot(shot, snapCamera) {
    this.shot = shot
    this.player.position.set(shot.place.x, 0, shot.place.z)
    const releaseT = Math.min(1, shot.contactAt + 0.09 / shot.duration)
    this.applyPose(releaseT)
    this.player.updateMatrixWorld(true)
    this.sweetSpot.getWorldPosition(this.sweetWorld)
    this.simulate(shot)
    this.progress = 0
    if (snapCamera) this.setCamera('side', true)
    this.applyProgress(0)
  }

  setShot(id) {
    this.applyShot(shotById(id), false)
    this.playing = true
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

  setCamera(name, immediate = false) {
    const place = this.shot?.place || { x: 0, z: -10 }
    const look = new THREE.Vector3(place.x, 1.3, place.z + 1.2)
    const presets = {
      side: new THREE.Vector3(place.x + 7.5, 3.6, place.z - 2.5),
      behind: new THREE.Vector3(place.x, 2.4, place.z - 6.5),
      top: new THREE.Vector3(place.x, 16, place.z + 0.2),
      free: this.camera.position.clone()
    }
    this.camGoal.copy(presets[name] || presets.side)
    this.targetGoal.copy(name === 'top' ? new THREE.Vector3(0, 0, 0) : look)
    if (immediate || name === 'free') {
      if (name !== 'free') {
        this.camera.position.copy(this.camGoal)
        this.controls.target.copy(this.targetGoal)
      }
      this.camBlend = 0
      this.controls.update()
      return
    }
    this.camBlend = 1
  }

  clockSeconds() {
    const swing = this.shot.duration
    const contact = this.shot.contactAt * swing
    return contact + this.flightTime
  }

  applyProgress(progress) {
    const shot = this.shot
    const total = this.clockSeconds()
    const seconds = progress * total
    const swingT = Math.min(1, seconds / shot.duration)
    this.applyPose(swingT)

    const contactTime = shot.contactAt * shot.duration
    const pocket = 0.09
    if (seconds < contactTime - 0.12) {
      const k = seconds / Math.max(contactTime - 0.12, 0.001)
      const from = shot.approach
      this.ball.position.set(
        from.x + (this.sweetWorld.x - from.x) * k,
        from.y + (this.sweetWorld.y - from.y) * k,
        from.z + (this.sweetWorld.z - from.z) * k
      )
      this.trailGeo.setDrawRange(0, 0)
    } else if (seconds <= contactTime + pocket) {
      this.player.updateMatrixWorld(true)
      this.sweetSpot.getWorldPosition(this.ball.position)
      this.trailGeo.setDrawRange(0, 0)
    } else {
      const flown = seconds - (contactTime + pocket)
      const index = Math.min(this.flight.length - 1, Math.floor((flown / this.flightTime) * (this.flight.length - 1)))
      const point = this.flight[index] || this.sweetWorld
      this.ball.position.copy(point)
      this.trailGeo.setDrawRange(0, Math.min(index + 1, 180))
    }
    this.ball.rotation.x += 0.08
    this.ball.rotation.z += 0.05
    this.shadow.position.x = this.ball.position.x
    this.shadow.position.z = this.ball.position.z
    this.shadow.scale.setScalar(1 - Math.min(this.ball.position.y / 6, 0.65))
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
      this.camera.position.lerp(this.camGoal, 0.14)
      this.controls.target.lerp(this.targetGoal, 0.14)
      this.camBlend *= 0.86
      if (this.camBlend < 0.02) this.camBlend = 0
    }
    if (this.playing) {
      const step = dt * this.speed / this.clockSeconds()
      this.progress += step
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
