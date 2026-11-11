import * as THREE from 'three'

function patternTexture(pattern, color, accent) {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 64
  const ctx = c.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 128, 64)
  ctx.fillStyle = accent
  if (pattern === 'bands' || pattern === 'hood') {
    for (let x = 0; x < 128; x += 16) {
      ctx.fillRect(x, 0, 8, 64)
    }
  } else if (pattern === 'diamonds') {
    for (let x = 8; x < 128; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, 32)
      ctx.lineTo(x + 10, 14)
      ctx.lineTo(x + 20, 32)
      ctx.lineTo(x + 10, 50)
      ctx.closePath()
      ctx.fill()
    }
  } else if (pattern === 'blotch') {
    for (let i = 0; i < 8; i += 1) {
      ctx.beginPath()
      ctx.ellipse(10 + i * 16, 32, 5, 14, 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

function posePoints(pose, length) {
  const pts = []
  if (pose === 'coil') {
    for (let i = 0; i < 12; i += 1) {
      const t = i / 11
      const a = t * Math.PI * 4.2
      const r = 0.28 + t * 0.95
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.14 + Math.sin(t * Math.PI) * 0.08, Math.sin(a) * r))
    }
    return pts
  }
  const count = 8
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1)
    let x = (t - 0.15) * length
    let y = 0.16
    let z = 0
    if (pose === 'sidewind') {
      z = Math.sin(t * Math.PI * 3) * 0.85
      y += Math.abs(Math.cos(t * Math.PI * 3)) * 0.08
    } else if (pose === 'climb') {
      x *= 0.28
      y = 0.2 + t * 1.35
      z = Math.sin(t * Math.PI * 3) * 0.28
    } else if (pose === 'line') {
      z = Math.sin(t * Math.PI * 2) * 0.08
    } else {
      z = Math.sin(t * Math.PI * 2.4) * 0.62
    }
    pts.push(new THREE.Vector3(x, y, z))
  }
  return pts
}

export function buildAtlasSnake(spec) {
  const pose = spec.pose || 'slither'
  const length = spec.visualLength || 3
  const curve = new THREE.CatmullRomCurve3(posePoints(pose, length))
  const geo = new THREE.TubeGeometry(curve, 56, spec.radius || 0.09, 8, false)
  const map = patternTexture(spec.pattern, spec.color, spec.accent)
  const color = new THREE.Color(spec.color)
  const mat = new THREE.MeshStandardMaterial({
    color,
    map,
    roughness: 0.62,
    metalness: 0.04,
    emissive: color.clone().multiplyScalar(0.08)
  })
  const body = new THREE.Mesh(geo, mat)
  const group = new THREE.Group()
  group.add(body)

  const headPoint = curve.getPointAt(1)
  const headTangent = curve.getTangentAt(1).normalize()
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius * 1.35, 12, 10),
    mat
  )
  head.scale.set(0.85, 0.72, 1.25)
  head.position.copy(headPoint).add(headTangent.clone().multiplyScalar(spec.radius * 0.8))
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), headTangent)
  group.add(head)

  const eyeGeo = new THREE.SphereGeometry(spec.radius * 0.18, 8, 6)
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#140c08', roughness: 0.3 })
  const side = new THREE.Vector3().crossVectors(headTangent, new THREE.Vector3(0, 1, 0))
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
  side.normalize()
  ;[1, -1].forEach((sign) => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.copy(head.position).add(side.clone().multiplyScalar(spec.radius * 0.55 * sign)).add(headTangent.clone().multiplyScalar(spec.radius * 0.35))
    eye.position.y += spec.radius * 0.25
    group.add(eye)
  })

  let hood = null
  if (spec.hood) {
    hood = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius * 1.8, 12, 8),
      mat
    )
    hood.scale.set(spec.hoodOpen ? 1.7 : 0.35, 0.18, 1.15)
    hood.position.copy(head.position).add(headTangent.clone().multiplyScalar(-spec.radius * 1.1))
    group.add(hood)
  }

  const pits = []
  if (spec.pit) {
    const pitMat = new THREE.MeshStandardMaterial({ color: '#ffb070', emissive: '#ff7a3a', emissiveIntensity: 0.8 })
    ;[1, -1].forEach((sign) => {
      const pit = new THREE.Mesh(new THREE.SphereGeometry(spec.radius * 0.16, 8, 6), pitMat)
      pit.position.copy(head.position).add(side.clone().multiplyScalar(spec.radius * 0.7 * sign)).add(headTangent.clone().multiplyScalar(spec.radius * 0.55))
      pit.visible = false
      group.add(pit)
      pits.push(pit)
    })
  }

  if (spec.tail === 'paddle') {
    const tail = curve.getPointAt(0)
    const paddle = new THREE.Mesh(
      new THREE.SphereGeometry(spec.radius * 1.4, 10, 8),
      mat
    )
    paddle.scale.set(0.35, 1.5, 0.7)
    paddle.position.copy(tail)
    group.add(paddle)
  }

  if (spec.fang && spec.fang !== 'none') {
    const fangMat = new THREE.MeshStandardMaterial({ color: '#f7f1e4', roughness: 0.4 })
    const length = spec.fang === 'tube' ? spec.radius * 1.35 : spec.radius * 0.62
    const fangGeo = new THREE.ConeGeometry(spec.radius * 0.08, length, 5)
    ;[1, -1].forEach((sign) => {
      const fang = new THREE.Mesh(fangGeo, fangMat)
      const along = spec.fang === 'rear' ? -0.15 : 0.95
      fang.position.copy(head.position)
        .add(headTangent.clone().multiplyScalar(spec.radius * along))
        .add(side.clone().multiplyScalar(spec.radius * 0.18 * sign))
      fang.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), headTangent)
      group.add(fang)
    })
  }

  const base = geo.attributes.position.array.slice()
  group.userData.animate = (time) => {
    const attr = geo.attributes.position
    const amp = pose === 'line' || pose === 'coil' ? 0.03 : 0.1
    for (let i = 0; i < attr.count; i += 1) {
      const x = base[i * 3]
      attr.setZ(i, base[i * 3 + 2] + Math.sin(x * 2.1 + time * 2.6) * amp)
    }
    attr.needsUpdate = true
    if (hood && spec.hoodOpen) {
      const open = 1.35 + Math.sin(time * 1.4) * 0.12
      hood.scale.x = open
    }
  }
  group.userData.setThermal = (on) => {
    pits.forEach((pit) => {
      pit.visible = !!on
    })
  }
  group.userData.setThermal(!!spec.thermal)
  return group
}
