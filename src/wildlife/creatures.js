import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const materials = new Map()
const geoCache = new Map()
const furTexCache = new Map()
let eyeMat = null

function eyeMaterial() {
  if (!eyeMat) {
    eyeMat = new THREE.MeshStandardMaterial({ color: '#1a120c', roughness: 0.16, metalness: 0 })
    eyeMat.userData.sharedCoat = true
  }
  return eyeMat
}

function mulberry32(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

function cachedGeo(key, build) {
  let geo = geoCache.get(key)
  if (!geo) {
    geo = build()
    geo.userData.shared = true
    geoCache.set(key, geo)
  }
  return geo
}

function furTexture(kind) {
  const cached = furTexCache.get(kind)
  if (cached) return cached
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const ctx = c.getContext('2d')
  if (kind === 'zebra') {
    ctx.fillStyle = '#f4f4f4'
    ctx.fillRect(0, 0, 128, 128)
    ctx.strokeStyle = '#24180f'
    ctx.lineWidth = 7
    for (let i = -2; i < 12; i += 1) {
      ctx.beginPath()
      ctx.moveTo(i * 14, -10)
      ctx.quadraticCurveTo(i * 14 + 8, 64, i * 14 - 6, 138)
      ctx.stroke()
    }
  } else if (kind === 'cheetah') {
    ctx.fillStyle = '#e0b15a'
    ctx.fillRect(0, 0, 128, 128)
    ctx.fillStyle = '#3a2410'
    for (let i = 0; i < 42; i += 1) {
      const x = (i * 47) % 128
      const y = (i * 29) % 128
      ctx.beginPath()
      ctx.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (kind === 'streak') {
    const rnd = mulberry32(0x5e3a91)
    ctx.fillStyle = '#c8c8c8'
    ctx.fillRect(0, 0, 128, 128)
    for (let i = 0; i < 900; i += 1) {
      const x = rnd() * 128
      const y = rnd() * 128
      ctx.strokeStyle = i % 2 ? '#f2f2f2' : '#6a6a6a'
      ctx.globalAlpha = 0.16
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + (rnd() - 0.5) * 1.4, y + 3 + rnd() * 7)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  } else if (kind === 'giraffe') {
    ctx.fillStyle = '#d7a15a'
    ctx.fillRect(0, 0, 128, 128)
    ctx.strokeStyle = '#6a3e1c'
    ctx.lineWidth = 4
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        ctx.beginPath()
        for (let k = 0; k < 6; k += 1) {
          const a = (k / 6) * Math.PI * 2 + row
          const x = 22 + col * 42 + Math.cos(a) * 16
          const y = 22 + row * 42 + Math.sin(a) * 15
          if (k === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }
    }
  }
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  furTexCache.set(kind, tex)
  return tex
}

function coat(hex, role = 'body', furKind) {
  const key = `${role}:${hex}:${furKind || ''}`
  const cached = materials.get(key)
  if (cached) return cached
  const color = new THREE.Color(hex)
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: role === 'belly' ? 0.62 : 0.45,
    metalness: 0.04,
    emissive: color.clone().multiplyScalar(furKind ? 0.05 : 0.12)
  })
  if (furKind) mat.map = furTexture(furKind)
  mat.userData.sharedCoat = true
  materials.set(key, mat)
  return mat
}

function mesh(geo, mat) {
  const item = new THREE.Mesh(geo, mat)
  return item
}

function addEye(parent, x, y, z, scale = 1) {
  const ball = mesh(cachedGeo(`eye:${scale}`, () => new THREE.SphereGeometry(0.045 * scale, 10, 8)), eyeMaterial())
  ball.position.set(x, y, z)
  parent.add(ball)
}

function frontFlipper() {
  return cachedGeo('turtle:paddle', () => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.bezierCurveTo(0.5, 0.2, 1.8, 0.1, 2.3, -0.6)
    shape.bezierCurveTo(1.8, -0.9, 0.8, -0.7, 0, -0.3)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.03,
      bevelThickness: 0.03
    })
    geo.center()
    geo.rotateX(Math.PI / 2)
    return geo
  })
}

function turtle(color) {
  const group = new THREE.Group()
  const shell = coat('#2d6a4f')
  const belly = coat('#e7c98a', 'belly')
  const scute = coat('#1d4a34', 'scute')

  const shellGeo = cachedGeo('turtle:shell', () => {
    const carapace = new THREE.SphereGeometry(1.5, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)
    carapace.scale(1, 0.45, 1.3)
    const rim = new THREE.TorusGeometry(1.48, 0.08, 6, 14)
    rim.scale(1, 0.35, 1.3)
    rim.rotateX(Math.PI / 2)
    rim.translate(0, -0.1, 0)
    const merged = mergeGeometries([carapace, rim]) || carapace
    if (merged !== carapace) carapace.dispose()
    if (merged !== rim) rim.dispose()
    return merged
  })
  group.add(mesh(shellGeo, shell))

  const scuteGeo = cachedGeo('turtle:scutes', () => {
    const parts = [[0, 0.5, 0.15], [-0.45, 0.4, 0.45], [0.45, 0.4, 0.45], [-0.38, 0.36, -0.35], [0.38, 0.36, -0.35]].map(([x, y, z]) => {
      const plate = new THREE.SphereGeometry(0.3, 6, 5, 0, Math.PI * 2, 0, Math.PI * 0.5)
      plate.scale(1.15, 0.48, 1.3)
      plate.translate(x, y, z)
      return plate
    })
    const merged = mergeGeometries(parts)
    if (!merged) return parts[0]
    parts.forEach((part) => part.dispose())
    return merged
  })
  group.add(mesh(scuteGeo, scute))

  const plastronGeo = cachedGeo('turtle:plastron', () => {
    const geo = new THREE.SphereGeometry(1.35, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.45)
    geo.scale(0.9, 0.25, 1.2)
    geo.rotateX(Math.PI)
    geo.translate(0, -0.15, 0)
    return geo
  })
  group.add(mesh(plastronGeo, belly))

  const head = new THREE.Group()
  head.position.set(0, 0.1, 1.5)
  const neckGeo = cachedGeo('turtle:neck', () => {
    const geo = new THREE.CylinderGeometry(0.32, 0.42, 0.55, 8)
    geo.rotateX(Math.PI / 3)
    return geo
  })
  const neck = mesh(neckGeo, shell)
  neck.position.z = 0.15
  head.add(neck)
  const headGeo = cachedGeo('turtle:head', () => {
    const geo = new THREE.SphereGeometry(0.42, 10, 8)
    geo.scale(0.85, 0.72, 1.15)
    return geo
  })
  const skull = mesh(headGeo, shell)
  skull.position.set(0, 0.18, 0.58)
  head.add(skull)
  const snoutGeo = cachedGeo('turtle:snout', () => {
    const geo = new THREE.ConeGeometry(0.28, 0.46, 6)
    geo.rotateX(Math.PI * 0.62)
    geo.scale(0.8, 0.55, 0.75)
    return geo
  })
  const snout = mesh(snoutGeo, shell)
  snout.position.set(0, 0.08, 0.95)
  head.add(snout)
  addEye(head, 0.26, 0.28, 0.72, 1.3)
  addEye(head, -0.26, 0.28, 0.72, 1.3)
  group.add(head)

  const paddle = frontFlipper()
  const left = new THREE.Group()
  left.add(mesh(paddle, shell))
  left.position.set(1.05, -0.08, 0.85)
  left.rotation.z = -Math.PI * 0.15
  const right = new THREE.Group()
  right.add(mesh(cachedGeo('turtle:paddle-mirror', () => {
    const geo = paddle.clone()
    geo.scale(-1, 1, 1)
    geo.computeVertexNormals()
    return geo
  }), shell))
  right.position.set(-1.05, -0.08, 0.85)
  right.rotation.z = Math.PI * 0.15
  group.add(left, right)

  const rear = (side) => {
    const geo = cachedGeo('turtle:rear', () => {
      const fin = new THREE.SphereGeometry(0.22, 10, 8)
      fin.scale(0.55, 0.16, 1.35)
      return fin
    })
    const fin = mesh(geo, shell)
    fin.position.set(side * 0.85, -0.12, -1.15)
    fin.rotation.y = side * -0.45
    return fin
  }
  const rearL = rear(1)
  const rearR = rear(-1)
  group.add(rearL, rearR)

  const tailGeo = cachedGeo('turtle:tail', () => {
    const geo = new THREE.ConeGeometry(0.16, 0.5, 6)
    geo.rotateX(-Math.PI * 0.5)
    return geo
  })
  const tail = mesh(tailGeo, shell)
  tail.position.set(0, -0.12, -1.55)
  group.add(tail)

  group.scale.setScalar(0.48)
  group.position.y = 0.2
  group.userData.animate = (t, seed = 0) => {
    const s = t * 2.4 + seed
    const stroke = Math.sin(s) * 0.5
    const twist = Math.cos(s) * 0.22
    left.rotation.x = stroke * 0.35
    left.rotation.y = stroke
    left.rotation.z = -Math.PI * 0.15 + twist
    right.rotation.x = stroke * 0.35
    right.rotation.y = -stroke
    right.rotation.z = Math.PI * 0.15 - twist
    rearL.rotation.x = Math.sin(s + 1) * 0.25
    rearR.rotation.x = Math.sin(s + 1) * 0.25
    head.rotation.y = Math.sin(s * 0.45) * 0.1
    head.rotation.x = Math.cos(s * 0.45) * 0.05
    group.rotation.z = Math.sin(t * 0.8 + seed) * 0.04
    group.rotation.x = Math.sin(s) * 0.05
  }
  return group
}

function cetacean(color, kind) {
  const group = new THREE.Group()
  const skin = coat(color)
  const belly = coat('#d5dde3', 'belly')
  const whale = kind === 'whale'
  const bodyGeo = cachedGeo(`cetacean:${kind}:body`, () => {
    const geo = new THREE.SphereGeometry(whale ? 0.48 : 0.28, 22, 16)
    geo.scale(0.72, 0.78, whale ? 2.15 : 2.05)
    return geo
  })
  group.add(mesh(bodyGeo, skin))
  const bellyGeo = cachedGeo(`cetacean:${kind}:belly`, () => {
    const geo = new THREE.SphereGeometry(whale ? 0.3 : 0.16, 16, 12)
    geo.scale(0.7, 0.45, 1.7)
    return geo
  })
  const under = mesh(bellyGeo, belly)
  under.position.y = whale ? -0.16 : -0.08
  group.add(under)

  const beakGeo = cachedGeo(`cetacean:${kind}:beak`, () => {
    const geo = new THREE.SphereGeometry(whale ? 0.16 : 0.09, 12, 10)
    geo.scale(0.7, 0.65, 1.8)
    return geo
  })
  const beak = mesh(beakGeo, skin)
  beak.position.z = whale ? 0.95 : 0.55
  group.add(beak)

  const finGeo = cachedGeo(`cetacean:${kind}:dorsal`, () => new THREE.ConeGeometry(whale ? 0.1 : 0.05, whale ? 0.28 : 0.16, 5))
  const dorsal = mesh(finGeo, skin)
  dorsal.position.set(0, whale ? 0.38 : 0.22, -0.05)
  group.add(dorsal)

  const pec = (side) => {
    const geo = cachedGeo(`cetacean:${kind}:pec`, () => {
      const fin = new THREE.SphereGeometry(whale ? 0.12 : 0.07, 10, 8)
      fin.scale(0.35, 1.1, 2.2)
      return fin
    })
    const fin = mesh(geo, skin)
    fin.position.set(side * (whale ? 0.28 : 0.16), -0.05, 0.15)
    fin.rotation.z = side * 0.9
    return fin
  }
  const pecL = pec(1)
  const pecR = pec(-1)
  group.add(pecL, pecR)

  const tail = new THREE.Group()
  tail.position.z = whale ? -0.95 : -0.52
  const stock = mesh(cachedGeo(`cetacean:${kind}:stock`, () => new THREE.CylinderGeometry(whale ? 0.08 : 0.045, whale ? 0.14 : 0.07, whale ? 0.35 : 0.22, 8)), skin)
  stock.rotation.x = Math.PI / 2
  const flukeGeo = cachedGeo(`cetacean:${kind}:fluke`, () => {
    const geo = new THREE.SphereGeometry(whale ? 0.22 : 0.12, 12, 8)
    geo.scale(2.4, 0.18, 0.7)
    return geo
  })
  const fluke = mesh(flukeGeo, skin)
  fluke.position.z = whale ? -0.2 : -0.12
  tail.add(stock, fluke)
  group.add(tail)
  addEye(group, 0.18, 0.08, whale ? 0.72 : 0.38, whale ? 1.1 : 0.7)
  addEye(group, -0.18, 0.08, whale ? 0.72 : 0.38, whale ? 1.1 : 0.7)
  group.position.y = whale ? 0.55 : 0.38
  group.userData.animate = (t, seed = 0) => {
    const s = t * 2.2 + seed
    tail.rotation.x = Math.sin(s) * 0.35
    pecL.rotation.z = 0.9 + Math.sin(s) * 0.15
    pecR.rotation.z = -0.9 - Math.sin(s) * 0.15
    group.rotation.z = Math.sin(s * 0.5) * 0.05
  }
  return group
}

function shark(color) {
  const group = new THREE.Group()
  const skin = coat(color)
  const pale = coat('#c5c9ce', 'belly')
  const bodyGeo = cachedGeo('shark:body', () => {
    const geo = new THREE.SphereGeometry(0.32, 18, 14)
    geo.scale(0.62, 0.58, 2.25)
    return geo
  })
  group.add(mesh(bodyGeo, skin))
  const bellyGeo = cachedGeo('shark:belly', () => {
    const geo = new THREE.SphereGeometry(0.2, 12, 10)
    geo.scale(0.55, 0.4, 1.8)
    return geo
  })
  const belly = mesh(bellyGeo, pale)
  belly.position.y = -0.08
  group.add(belly)
  const noseGeo = cachedGeo('shark:nose', () => {
    const geo = new THREE.ConeGeometry(0.16, 0.42, 7)
    geo.rotateX(Math.PI / 2)
    return geo
  })
  const nose = mesh(noseGeo, skin)
  nose.position.z = 0.78
  group.add(nose)
  const dorsalGeo = cachedGeo('shark:dorsal', () => new THREE.ConeGeometry(0.11, 0.38, 4))
  const dorsal = mesh(dorsalGeo, skin)
  dorsal.position.set(0, 0.32, 0.05)
  dorsal.rotation.x = 0.2
  group.add(dorsal)
  const pec = (side) => {
    const geo = cachedGeo('shark:pec', () => new THREE.BoxGeometry(0.28, 0.035, 0.16))
    const fin = mesh(geo, skin)
    fin.position.set(side * 0.28, -0.08, 0.2)
    fin.rotation.z = side * -0.4
    fin.rotation.y = side * 0.5
    return fin
  }
  group.add(pec(1), pec(-1))
  const tail = new THREE.Group()
  tail.position.set(0, 0.02, -0.68)
  const upper = mesh(cachedGeo('shark:tail-upper', () => new THREE.ConeGeometry(0.07, 0.48, 5)), skin)
  upper.rotation.x = -0.7
  upper.position.set(0, 0.12, -0.12)
  const lower = mesh(cachedGeo('shark:tail-lower', () => new THREE.ConeGeometry(0.045, 0.24, 5)), skin)
  lower.rotation.x = 0.8
  lower.position.set(0, -0.06, -0.08)
  tail.add(upper, lower)
  group.add(tail)
  addEye(group, 0.12, 0.06, 0.48, 0.7)
  addEye(group, -0.12, 0.06, 0.48, 0.7)
  group.position.y = 0.42
  group.userData.animate = (t, seed = 0) => {
    tail.rotation.y = Math.sin(t * 3 + seed) * 0.28
    group.rotation.z = Math.sin(t * 1.4 + seed) * 0.04
  }
  return group
}

function bird(color) {
  const group = new THREE.Group()
  const feather = coat(color)
  const dark = coat('#2a2118', 'dark')
  const bodyGeo = cachedGeo('bird:body', () => {
    const geo = new THREE.SphereGeometry(0.22, 16, 12)
    geo.scale(0.8, 0.72, 1.25)
    return geo
  })
  const body = mesh(bodyGeo, feather)
  body.position.y = 0.08
  group.add(body)
  const wing = (side) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.12, 0.12, 0)
    const geo = cachedGeo('bird:wing', () => {
      const wing = new THREE.SphereGeometry(0.16, 12, 8)
      wing.scale(0.22, 0.12, 1.5)
      return wing
    })
    const sail = mesh(geo, feather)
    sail.position.set(side * 0.28, 0, 0.02)
    const tip = mesh(cachedGeo('bird:tip', () => new THREE.ConeGeometry(0.05, 0.22, 5)), dark)
    tip.rotation.z = side * -Math.PI / 2
    tip.position.set(side * 0.52, 0, 0.05)
    pivot.add(sail, tip)
    return pivot
  }
  const left = wing(1)
  const right = wing(-1)
  group.add(left, right)
  const beak = mesh(cachedGeo('bird:beak', () => new THREE.ConeGeometry(0.045, 0.22, 6)), dark)
  beak.rotation.x = Math.PI / 2
  beak.position.set(0, 0.1, 0.32)
  group.add(beak)
  const tail = mesh(cachedGeo('bird:tail', () => new THREE.ConeGeometry(0.06, 0.28, 5)), feather)
  tail.rotation.x = Math.PI / 2.4
  tail.position.set(0, 0.08, -0.28)
  group.add(tail)
  addEye(group, 0.07, 0.16, 0.2, 0.55)
  addEye(group, -0.07, 0.16, 0.2, 0.55)
  group.userData.animate = (t, seed = 0) => {
    const flap = Math.sin(t * 5 + seed) * 0.55
    left.rotation.z = -0.3 + flap
    right.rotation.z = 0.3 - flap
    tail.rotation.y = Math.sin(t * 2 + seed) * 0.15
  }
  return group
}

function limb(mat, dark, x, z, length) {
  const pivot = new THREE.Group()
  pivot.position.set(x, length, z)
  const upper = mesh(
    cachedGeo(`limb:${length}:upper`, () => new THREE.CylinderGeometry(0.064, 0.042, length * 0.46, 7, 1)),
    mat
  )
  upper.position.y = -length * 0.28
  const lower = mesh(
    cachedGeo(`limb:${length}:lower`, () => new THREE.CylinderGeometry(0.04, 0.028, length * 0.42, 7, 1)),
    dark
  )
  lower.position.y = -length * 0.72
  const foot = mesh(cachedGeo('limb:foot', () => new THREE.SphereGeometry(0.055, 8, 6)), dark)
  foot.scale.set(1.2, 0.45, 1.5)
  foot.position.y = -length * 0.98
  pivot.add(upper, lower, foot)
  return pivot
}

function quadruped(color, furKind, id = '') {
  const group = new THREE.Group()
  const fur = coat(color, 'body', furKind)
  const dark = coat('#24180f', 'dark')
  const body = mesh(cachedGeo('quad:body', () => {
    const geo = new THREE.SphereGeometry(0.34, 16, 12)
    geo.scale(0.78, 0.72, 1.35)
    return geo
  }), fur)
  body.position.y = 0.62
  group.add(body)
  const chest = mesh(cachedGeo('quad:chest', () => new THREE.SphereGeometry(0.2, 12, 10)), fur)
  chest.position.set(0, 0.58, 0.28)
  group.add(chest)
  const neck = mesh(cachedGeo('quad:neck', () => new THREE.CapsuleGeometry(0.09, 0.22, 3, 7)), fur)
  neck.position.set(0, 0.72, 0.48)
  neck.rotation.x = 0.5
  group.add(neck)
  const head = new THREE.Group()
  head.position.set(0, 0.78, 0.68)
  head.add(mesh(cachedGeo('quad:head', () => new THREE.SphereGeometry(0.16, 12, 10)), fur))
  const muzzle = mesh(cachedGeo('quad:muzzle', () => new THREE.SphereGeometry(0.09, 10, 8)), fur)
  muzzle.scale.set(0.8, 0.7, 1.3)
  muzzle.position.z = 0.14
  head.add(muzzle)
  const earL = mesh(cachedGeo('quad:ear', () => new THREE.ConeGeometry(0.04, 0.1, 5)), dark)
  earL.position.set(0.08, 0.14, -0.02)
  const earR = mesh(cachedGeo('quad:ear', () => new THREE.ConeGeometry(0.04, 0.1, 5)), dark)
  earR.position.set(-0.08, 0.14, -0.02)
  head.add(earL, earR)
  if (id === 'elephant') {
    const trunk = mesh(cachedGeo('elephant:trunk', () => new THREE.CapsuleGeometry(0.045, 0.42, 3, 6)), fur)
    trunk.position.set(0, -0.08, 0.22)
    trunk.rotation.x = 1.15
    head.add(trunk)
    const earGeo = cachedGeo('elephant:ear', () => {
      const geo = new THREE.SphereGeometry(0.16, 10, 8)
      geo.scale(0.28, 1, 0.7)
      return geo
    })
    const bigL = mesh(earGeo, fur)
    bigL.position.set(0.16, 0.02, -0.02)
    const bigR = mesh(earGeo, fur)
    bigR.position.set(-0.16, 0.02, -0.02)
    head.add(bigL, bigR)
  }
  if (id === 'lion') {
    const mane = mesh(cachedGeo('lion:mane', () => new THREE.SphereGeometry(0.22, 12, 10)), coat('#8a5a22', 'mane'))
    mane.position.set(0, 0.02, -0.08)
    mane.scale.set(1.2, 1.05, 0.72)
    head.add(mane)
  }
  addEye(head, 0.07, 0.04, 0.12, 0.55)
  addEye(head, -0.07, 0.04, 0.12, 0.55)
  group.add(head)
  const legs = [
    limb(fur, dark, 0.16, 0.28, 0.62),
    limb(fur, dark, -0.16, 0.28, 0.62),
    limb(fur, dark, 0.16, -0.32, 0.62),
    limb(fur, dark, -0.16, -0.32, 0.62)
  ]
  legs.forEach((leg) => group.add(leg))
  const tail = mesh(cachedGeo('quad:tail', () => new THREE.CapsuleGeometry(0.035, 0.28, 3, 6)), dark)
  tail.position.set(0, 0.66, -0.5)
  tail.rotation.x = 1.1
  group.add(tail)
  group.userData.animate = (t, seed = 0) => {
    legs.forEach((leg, index) => {
      const phase = index % 2 === 0 ? 0 : Math.PI
      leg.rotation.x = Math.sin(t * 3.2 + seed + phase) * 0.35
    })
    head.rotation.y = Math.sin(t * 0.8 + seed) * 0.12
    tail.rotation.y = Math.sin(t * 2.4 + seed) * 0.25
  }
  return group
}

function tall(color, furKind) {
  const group = new THREE.Group()
  const hide = coat(color, 'body', furKind)
  const dark = coat('#4a3018', 'dark')
  const body = mesh(cachedGeo('tall:body', () => new THREE.SphereGeometry(0.28, 14, 12)), hide)
  body.scale.set(0.7, 0.6, 1.15)
  body.position.y = 0.72
  group.add(body)
  const neck = mesh(cachedGeo('tall:neck', () => new THREE.CapsuleGeometry(0.055, 0.85, 4, 8)), hide)
  neck.position.set(0, 1.25, 0.18)
  group.add(neck)
  const head = new THREE.Group()
  head.position.set(0, 1.72, 0.28)
  head.add(mesh(cachedGeo('tall:head', () => new THREE.SphereGeometry(0.12, 12, 10)), hide))
  const snout = mesh(cachedGeo('tall:snout', () => new THREE.BoxGeometry(0.1, 0.08, 0.16)), hide)
  snout.position.z = 0.12
  head.add(snout)
  const hornL = mesh(cachedGeo('tall:horn', () => new THREE.CylinderGeometry(0.012, 0.018, 0.08, 6)), dark)
  hornL.position.set(0.04, 0.12, 0)
  const hornR = mesh(cachedGeo('tall:horn', () => new THREE.CylinderGeometry(0.012, 0.018, 0.08, 6)), dark)
  hornR.position.set(-0.04, 0.12, 0)
  head.add(hornL, hornR)
  addEye(head, 0.06, 0.02, 0.08, 0.5)
  addEye(head, -0.06, 0.02, 0.08, 0.5)
  group.add(head)
  const legs = [
    limb(hide, dark, 0.12, 0.18, 0.72),
    limb(hide, dark, -0.12, 0.18, 0.72),
    limb(hide, dark, 0.12, -0.22, 0.72),
    limb(hide, dark, -0.12, -0.22, 0.72)
  ]
  legs.forEach((leg) => group.add(leg))
  group.userData.animate = (t, seed = 0) => {
    legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(t * 2.2 + seed + (index % 2) * Math.PI) * 0.22
    })
    neck.rotation.z = Math.sin(t * 0.7 + seed) * 0.04
    head.rotation.y = Math.sin(t * 0.6 + seed) * 0.15
  }
  return group
}

function snake(color) {
  const group = new THREE.Group()
  const skin = coat(color)
  const segments = []
  for (let i = 0; i < 9; i += 1) {
    const part = mesh(cachedGeo('snake:seg', () => new THREE.SphereGeometry(0.09, 10, 8)), skin)
    const s = (0.09 - i * 0.004) / 0.09
    part.scale.set(0.85 * s, 0.75 * s, 1.15 * s)
    group.add(part)
    segments.push(part)
  }
  addEye(group, 0.04, 0.04, 0.08, 0.4)
  addEye(group, -0.04, 0.04, 0.08, 0.4)
  group.position.y = 0.1
  group.userData.animate = (t, seed = 0) => {
    segments.forEach((part, index) => {
      const wave = Math.sin(t * 3 + seed - index * 0.55)
      part.position.set(wave * 0.16, Math.abs(wave) * 0.02, 0.42 - index * 0.12)
    })
  }
  return group
}

function round(color) {
  const group = new THREE.Group()
  const skin = coat(color)
  const body = mesh(cachedGeo('round:body', () => new THREE.SphereGeometry(0.28, 18, 14)), skin)
  body.scale.set(1, 0.82, 1.05)
  body.position.y = 0.3
  group.add(body)
  const arms = []
  for (let i = 0; i < 6; i += 1) {
    const arm = mesh(cachedGeo('round:arm', () => new THREE.CapsuleGeometry(0.03, 0.34, 3, 6)), skin)
    const angle = (i / 6) * Math.PI * 2
    arm.position.set(Math.cos(angle) * 0.16, 0.12, Math.sin(angle) * 0.16)
    arm.rotation.z = Math.cos(angle) * 0.8
    arm.rotation.x = Math.sin(angle) * 0.8
    group.add(arm)
    arms.push(arm)
  }
  addEye(group, 0.08, 0.38, 0.2, 0.7)
  addEye(group, -0.08, 0.38, 0.2, 0.7)
  group.userData.animate = (t, seed = 0) => {
    arms.forEach((arm, index) => {
      const angle = (index / 6) * Math.PI * 2
      arm.rotation.z = Math.cos(angle) * 0.8 + Math.sin(t * 2 + seed + index) * 0.25
    })
    body.scale.y = 0.82 + Math.sin(t * 1.6 + seed) * 0.05
  }
  return group
}

function jellyfish(color) {
  const group = new THREE.Group()
  const skin = coat(color)
  const bell = mesh(cachedGeo('jelly:bell', () => {
    const geo = new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55)
    geo.scale(1, 0.55, 1)
    return geo
  }), skin)
  bell.position.y = 0.38
  group.add(bell)
  const tentacles = []
  for (let i = 0; i < 7; i += 1) {
    const tent = mesh(cachedGeo('jelly:tent', () => new THREE.CapsuleGeometry(0.012, 0.55, 2, 5)), skin)
    const angle = (i / 7) * Math.PI * 2
    tent.position.set(Math.cos(angle) * 0.1, 0.02, Math.sin(angle) * 0.1)
    group.add(tent)
    tentacles.push({ tent, angle })
  }
  addEye(group, 0.07, 0.42, 0.12, 0.45)
  addEye(group, -0.07, 0.42, 0.12, 0.45)
  group.userData.animate = (t, seed = 0) => {
    bell.scale.y = 1 + Math.sin(t * 1.4 + seed) * 0.08
    tentacles.forEach(({ tent, angle }, index) => {
      tent.rotation.x = Math.sin(angle) * 0.15 + Math.sin(t * 2 + seed + index) * 0.2
      tent.rotation.z = Math.cos(angle) * 0.15
    })
  }
  return group
}

const FOX_PORTRAIT = {
  'red-fox': { body: '#d06a2a', belly: '#f3e2c4', ear: '#c46a52', dark: '#24160f', earScale: 1, earSpread: 0.16 },
  fennec: { body: '#e6c98a', belly: '#f7f1e4', ear: '#e8b8a0', dark: '#3a2a1c', earScale: 1.65, earSpread: 0.22 },
  'arctic-fox': { body: '#f3f1ec', belly: '#fffaf4', ear: '#e4cfc4', dark: '#2c241c', earScale: 0.72, earSpread: 0.12 }
}

let highlightMat = null

function highlightMaterial() {
  if (!highlightMat) {
    highlightMat = new THREE.MeshBasicMaterial({ color: '#fffaf4' })
    highlightMat.userData.sharedCoat = true
  }
  return highlightMat
}

function placed(parent, geo, mat, pos, scale, rot) {
  const item = mesh(geo, mat)
  item.position.set(pos[0], pos[1], pos[2])
  if (scale) item.scale.set(scale[0], scale[1], scale[2])
  if (rot) item.rotation.set(rot[0], rot[1], rot[2])
  parent.add(item)
  return item
}

function foxPortrait(spec) {
  const group = new THREE.Group()
  const fur = coat(spec.body, 'portrait', 'streak')
  const belly = coat(spec.belly, 'portrait-belly', 'streak')
  const earMat = coat(spec.ear, 'portrait-ear')
  const dark = coat(spec.dark, 'portrait-dark')
  const ball = cachedGeo('portrait:ball', () => new THREE.SphereGeometry(1, 16, 12))
  const earGeo = cachedGeo('portrait:ear', () => new THREE.ConeGeometry(0.07, 0.28, 8))
  const tuftGeo = cachedGeo('portrait:tuft', () => new THREE.ConeGeometry(0.035, 0.14, 6))
  const legGeo = cachedGeo('portrait:leg', () => new THREE.CylinderGeometry(0.045, 0.085, 0.46, 8))
  const pawGeo = cachedGeo('portrait:paw', () => {
    const geo = new THREE.SphereGeometry(0.07, 8, 6)
    geo.scale(1.15, 0.42, 1.4)
    return geo
  })
  placed(group, ball, fur, [0, 0.72, 0.05], [0.4, 0.34, 0.7])
  placed(group, ball, belly, [0, 0.58, 0.12], [0.3, 0.2, 0.48])
  placed(group, ball, fur, [0, 0.78, -0.42], [0.34, 0.3, 0.32])
  placed(group, ball, fur, [0, 0.96, 0.42], [0.2, 0.24, 0.22])
  const head = new THREE.Group()
  head.position.set(0, 1.08, 0.62)
  group.add(head)
  placed(head, ball, fur, [0, 0, 0], [0.24, 0.22, 0.26])
  placed(head, ball, belly, [0, -0.08, 0.22], [0.15, 0.1, 0.2])
  placed(head, ball, dark, [0, -0.04, 0.38], [0.055, 0.04, 0.05])
  ;[-1, 1].forEach((side) => {
    const lean = side * -0.18
    placed(head, earGeo, fur, [side * spec.earSpread, 0.2, -0.02], [1, spec.earScale, 1], [ -0.12, 0, lean])
    placed(head, earGeo, earMat, [side * spec.earSpread, 0.18, 0.03], [0.55, spec.earScale * 0.72, 0.7], [-0.12, 0, lean])
    placed(head, ball, dark, [side * 0.1, 0.02, 0.18], [0.055, 0.05, 0.04])
    placed(head, ball, eyeMaterial(), [side * 0.11, 0.02, 0.21], [0.032, 0.036, 0.026])
    placed(head, ball, highlightMaterial(), [side * 0.12, 0.034, 0.23], [0.012, 0.012, 0.008])
    for (let i = 0; i < 3; i += 1) {
      placed(
        head,
        tuftGeo,
        belly,
        [side * (0.12 + i * 0.03), -0.02 - i * 0.02, 0.16],
        [1, 1, 1],
        [0.4, 0, side * (0.8 + i * 0.15)]
      )
    }
  })
  const legs = [-1, 1].flatMap((side) => [-0.34, 0.42].map((z) => {
    const pivot = new THREE.Group()
    pivot.position.set(side * 0.18, 0.58, z)
    const leg = mesh(legGeo, fur)
    leg.position.y = -0.2
    const paw = mesh(pawGeo, dark)
    paw.position.set(0, -0.44, 0.03)
    pivot.add(leg, paw)
    group.add(pivot)
    return pivot
  }))
  const tail = new THREE.Group()
  ;[
    [0, 0.7, -0.72, 0.22, 0.2, 0.28, -0.3],
    [0, 0.62, -0.98, 0.24, 0.2, 0.26, -0.45],
    [0, 0.56, -1.2, 0.18, 0.16, 0.22, -0.6]
  ].forEach(([x, y, z, sx, sy, sz, rx]) => {
    const part = placed(tail, ball, fur, [x, y, z], [sx, sy, sz])
    part.rotation.x = rx
  })
  const tip = placed(tail, ball, belly, [0, 0.5, -1.38], [0.14, 0.13, 0.16])
  tip.rotation.x = -0.7
  group.add(tail)
  group.userData.animate = (t, seed = 0) => {
    legs.forEach((leg, index) => {
      leg.rotation.x = Math.sin(t * 3.2 + seed + (index % 2) * Math.PI) * 0.28
    })
    head.rotation.y = Math.sin(t * 0.8 + seed) * 0.1
    tail.rotation.y = Math.sin(t * 1.6 + seed) * 0.18
    tail.rotation.x = Math.sin(t * 1.3 + seed) * 0.06
  }
  return group
}

export function portraitAnimal(animal) {
  const spec = FOX_PORTRAIT[animal.id]
  const model = spec ? foxPortrait(spec) : critter(animal.shape, animal.color, animal.id)
  if (spec) {
    model.scale.setScalar(1.15)
    model.rotation.y = 0.4
  } else model.rotation.y = -0.65
  return model
}

const builders = { turtle, whale: (color) => cetacean(color, 'whale'), dolphin: (color) => cetacean(color, 'dolphin'), shark, bird, snake, round }

export function critter(shape, color, id = '') {
  const furKind = id === 'zebra' ? 'zebra' : id === 'cheetah' ? 'cheetah' : id === 'giraffe' ? 'giraffe' : ''
  const root = new THREE.Group()
  let model
  if (id === 'jellyfish') model = jellyfish(color)
  else if (shape === 'tall') model = tall(color, furKind)
  else if (builders[shape]) model = builders[shape](color)
  else model = quadruped(color, furKind, id)
  model.rotation.y = Math.PI / 2
  root.add(model)
  const swim = ['turtle', 'whale', 'dolphin', 'shark', 'bird', 'round'].includes(shape) || id === 'jellyfish'
  root.userData.motion = swim ? 'swim' : 'walk'
  root.userData.animate = (t, seed = 0) => model.userData.animate?.(t, seed)
  if (shape !== 'turtle') root.scale.setScalar(shape === 'bird' ? 1.25 : 1.35)
  return root
}

export function clearCreatureCaches() {
  for (const mat of materials.values()) mat.dispose()
  materials.clear()
  eyeMat?.dispose()
  eyeMat = null
  highlightMat?.dispose()
  highlightMat = null
  for (const tex of furTexCache.values()) tex.dispose()
  furTexCache.clear()
  for (const geo of geoCache.values()) geo.dispose()
  geoCache.clear()
}

export function bubbleField() {
  const count = 80
  const positions = new Float32Array(count * 3)
  const speeds = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * 10
    positions[i * 3 + 1] = Math.random() * 4
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10
    speeds[i] = 0.15 + Math.random() * 0.35
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,0.9)')
  grad.addColorStop(0.45, 'rgba(120,210,210,0.45)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(16, 16, 16, 0, Math.PI * 2)
  ctx.fill()
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.16,
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }))
  points.userData.speeds = speeds
  points.userData.animate = (t, dt) => {
    const arr = geo.attributes.position.array
    for (let i = 0; i < count; i += 1) {
      arr[i * 3 + 1] += speeds[i] * dt
      arr[i * 3] += Math.sin(t + i) * 0.002
      if (arr[i * 3 + 1] > 4.5) arr[i * 3 + 1] = 0
    }
    geo.attributes.position.needsUpdate = true
  }
  return points
}
