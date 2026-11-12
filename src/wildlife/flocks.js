import * as THREE from 'three'

function mulberry32(seed) {
  let s = seed >>> 0 || 1
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 4294967296
  }
}

const BIRD = [
  [-0.16, 0, 0],
  [0.16, 0, 0],
  [-0.22, 0.72, 1],
  [0.16, 0, 0],
  [-0.14, 0, 0],
  [-0.22, -0.72, 1]
]

export function createFlock({ count = 12, seed = 0xa11ce } = {}) {
  const rnd = mulberry32(seed)
  const pos = new Float32Array(count * 6 * 3)
  const orbit = new Float32Array(count * 6 * 4)
  const par = new Float32Array(count * 6 * 4)

  for (let i = 0; i < count; i += 1) {
    const radius = 5.1 + rnd() * 1.7
    const cy = 2.35 + rnd() * 0.7
    const dir = rnd() > 0.5 ? 1 : -1
    const speed = (0.16 + rnd() * 0.12) * dir
    const phase = rnd() * Math.PI * 2
    const flap = 5 + rnd() * 2.5
    const scale = 0.42 + rnd() * 0.22
    for (let v = 0; v < 6; v += 1) {
      const [vx, vz, wing] = BIRD[v]
      const o3 = (i * 6 + v) * 3
      pos[o3] = vx * scale
      pos[o3 + 1] = 0
      pos[o3 + 2] = vz * scale
      const o4 = (i * 6 + v) * 4
      orbit[o4] = 0
      orbit[o4 + 1] = cy
      orbit[o4 + 2] = 0
      orbit[o4 + 3] = radius
      par[o4] = speed
      par[o4 + 1] = phase
      par[o4 + 2] = flap
      par[o4 + 3] = wing * scale
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aOrbit', new THREE.BufferAttribute(orbit, 4))
  geo.setAttribute('aPar', new THREE.BufferAttribute(par, 4))

  const mat = new THREE.MeshBasicMaterial({
    color: 0xd7e0e6,
    side: THREE.DoubleSide,
    fog: true
  })
  const uTime = { value: 0 }
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime
    shader.vertexShader = `
      attribute vec4 aOrbit;
      attribute vec4 aPar;
      uniform float uTime;
    ` + shader.vertexShader.replace('#include <begin_vertex>', `
      float ga = aPar.y + uTime * aPar.x;
      float gdir = sign(aPar.x);
      vec3 gfw = vec3(-sin(ga), 0.0, cos(ga)) * gdir;
      vec3 grt = vec3(gfw.z, 0.0, -gfw.x);
      vec3 bird = position;
      float glide = smoothstep(-0.2, 0.5, sin(uTime * 0.31 + aPar.y * 3.0));
      float flap = sin(uTime * aPar.z + aPar.y * 7.0) * mix(0.1, 0.32, glide) + 0.12;
      bird.y += aPar.w * flap * abs(bird.z);
      vec3 gc = aOrbit.xyz
        + vec3(cos(ga), 0.0, sin(ga)) * aOrbit.w
        + vec3(0.0, sin(ga * 0.7 + aPar.y) * 0.22 + sin(uTime * 0.23 + aPar.y) * 0.08, 0.0);
      vec3 transformed = gc + gfw * bird.x + grt * bird.z + vec3(0.0, bird.y, 0.0);
    `)
  }
  mat.customProgramCacheKey = () => 'hyc-flock'

  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  mesh.castShadow = false
  mesh.receiveShadow = false
  mesh.visible = false
  return {
    mesh,
    update(t) {
      uTime.value = t
    }
  }
}
