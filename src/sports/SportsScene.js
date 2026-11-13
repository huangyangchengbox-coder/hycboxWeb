import * as THREE from 'three'

/**
 * 运动场地对比场景。
 * 所有场地按同一比例绘制（1 单位 = 1 米），并排平铺，
 * 这样足球场和乒乓球台的尺寸差异是肉眼可见的真实差异。
 */

const GROUND_Y = 0

function roundedRectShape(w, h) {
  return new THREE.Shape([
    new THREE.Vector2(-w / 2, -h / 2),
    new THREE.Vector2(w / 2, -h / 2),
    new THREE.Vector2(w / 2, h / 2),
    new THREE.Vector2(-w / 2, h / 2)
  ])
}

export class SportsScene {
  constructor(canvas, sports) {
    this.canvas = canvas
    this.sports = sports
    this.disposed = false
    this.selected = 0
    this.t = 0

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b1a14)
    this.scene.fog = new THREE.Fog(0x0b1a14, 60, 190)

    this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 420)
    this.camera.position.set(0, 62, 96)
    this.camera.lookAt(0, 0, 0)

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.shadowMap.enabled = true

    this.scene.add(new THREE.HemisphereLight(0xd8f5ff, 0x1a2f22, 1.4))
    const key = new THREE.DirectionalLight(0xfff4e0, 1.8)
    key.position.set(60, 110, 70)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -120
    key.shadow.camera.right = 120
    key.shadow.camera.top = 120
    key.shadow.camera.bottom = -120
    this.scene.add(key)

    this.buildGround()
    this.buildVenues()

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
    this.frameId = requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) window.__sportsScene = this
  }

  buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(420, 420),
      new THREE.MeshStandardMaterial({ color: 0x0e2018, roughness: 0.95 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = GROUND_Y - 0.05
    ground.receiveShadow = true
    this.scene.add(ground)

    const grid = new THREE.GridHelper(400, 40, 0x1e3a2c, 0x142a20)
    grid.position.y = GROUND_Y - 0.02
    this.scene.add(grid)
  }

  /** 每个项目一块场地，按面积从大到小排布成网格。 */
  buildVenues() {
    this.venues = []
    const colCount = 4
    const gapX = 62
    const gapZ = 58

    this.sports.forEach((sport, index) => {
      const col = index % colCount
      const row = Math.floor(index / colCount)
      const cx = (col - (colCount - 1) / 2) * gapX
      const cz = (row - 0.5) * gapZ
      const venue = this.buildVenue(sport, cx, cz, index)
      this.venues.push(venue)
    })
  }

  buildVenue(sport, cx, cz, index) {
    const group = new THREE.Group()
    group.position.set(cx, GROUND_Y, cz)
    this.scene.add(group)

    const v = sport.venue
    const color = new THREE.Color(sport.color)

    // 场地本体：按真实长宽，比例统一
    const length = v.length
    const width = v.width
    // 足球场太大，缩小一点避免场景过宽；其余按真实比例
    const scale = length > 60 ? 0.42 : length > 20 ? 0.62 : 1
    const w = width * scale
    const l = length * scale

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, l),
      new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.35), roughness: 0.85 })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = 0.01
    floor.receiveShadow = true
    group.add(floor)

    // 边线
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4fff6, transparent: true, opacity: 0.85 })
    const addLine = (x, z, lw, ll) => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(lw, ll), lineMat)
      line.rotation.x = -Math.PI / 2
      line.position.set(x, 0.02, z)
      group.add(line)
    }
    const t = 0.14
    addLine(0, -l / 2, w, t)
    addLine(0, l / 2, w, t)
    addLine(-w / 2, 0, t, l)
    addLine(w / 2, 0, t, l)
    addLine(0, 0, w, t)

    // 网 / 篮架 / 球门：只做示意
    if (v.netHeight) {
      const net = new THREE.Mesh(
        new THREE.PlaneGeometry(w, v.netHeight * 1.2 * scale),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      )
      net.position.set(0, (v.netHeight * 1.2 * scale) / 2, 0)
      group.add(net)
    }
    if (v.rimHeight) {
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.23 * scale, 0.03 * scale, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0xff8a4c, roughness: 0.4 })
      )
      rim.rotation.x = -Math.PI / 2
      rim.position.set(0, v.rimHeight * scale, -l / 2 + 1.6 * scale)
      group.add(rim)
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(1.8 * scale, 1.05 * scale),
        new THREE.MeshStandardMaterial({ color: 0xf0f4f8, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      )
      board.position.set(0, v.rimHeight * scale + 0.35 * scale, -l / 2 + 1.75 * scale)
      group.add(board)
    }
    if (v.goalHeight) {
      const goalMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 })
      const post = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, v.goalHeight * scale, 8)
      for (const side of [-1, 1]) {
        const p = new THREE.Mesh(post, goalMat)
        p.position.set(side * 3.66 * scale, (v.goalHeight * scale) / 2, -l / 2)
        group.add(p)
        const leg = new THREE.Mesh(post, goalMat)
        leg.position.set(side * 3.66 * scale, (v.goalHeight * scale) / 2, l / 2)
        group.add(leg)
      }
      const cross = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 7.32 * scale, 8),
        goalMat
      )
      cross.rotation.z = Math.PI / 2
      cross.position.set(0, v.goalHeight * scale, -l / 2)
      group.add(cross)
    }
    if (v.lanes) {
      for (let i = 1; i < v.lanes; i += 1) {
        const line = new THREE.Mesh(
          new THREE.PlaneGeometry(0.06, l),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
        )
        line.rotation.x = -Math.PI / 2
        line.position.set(-w / 2 + (w / v.lanes) * i, 0.02, 0)
        group.add(line)
      }
    }

    // 选中高亮环
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(w, l) * 0.72, Math.max(w, l) * 0.78, 44),
      new THREE.MeshBasicMaterial({
        color: sport.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.03
    group.add(ring)

    return { sport, group, ring, cx, cz, index, scale }
  }

  select(index) {
    this.selected = Math.max(0, Math.min(this.venues.length - 1, index))
    const venue = this.venues[this.selected]
    this.onSelect?.({ index: this.selected, sport: venue.sport, total: this.venues.length })
    this.camGoal = new THREE.Vector3(venue.cx * 0.9 + 6, 26, venue.cz + 40)
    this.lookGoal = new THREE.Vector3(venue.cx, 1.5, venue.cz)
  }

  resize() {
    const width = this.canvas.clientWidth || 1
    const height = this.canvas.clientHeight || 1
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  animate(now) {
    if (this.disposed || document.hidden) return
    this.frameId = requestAnimationFrame(this.frame)
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    this.t += dt

    if (this.camGoal && this.lookGoal) {
      this.camera.position.lerp(this.camGoal, 0.06)
      this.camera.lookAt(this.lookGoal)
    }

    this.venues.forEach((venue, index) => {
      const target = index === this.selected ? 0.75 : 0
      venue.ring.material.opacity += (target - venue.ring.material.opacity) * Math.min(1, dt * 5)
      const pulse = index === this.selected ? 1 + Math.sin(this.t * 2.2) * 0.012 : 1
      venue.ring.scale.setScalar(pulse)
    })

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('visibilitychange', this.onVisible)
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach((m) => m.dispose())
      }
    })
    this.renderer.dispose()
  }
}
