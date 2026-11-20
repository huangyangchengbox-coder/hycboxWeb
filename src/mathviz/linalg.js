function norm(v) {
  const len = Math.hypot(v[0], v[1]) || 1
  return [v[0] / len, v[1] / len]
}

export function eigen2(a, b, c, d) {
  const tr = a + d
  const det = a * d - b * c
  const disc = tr * tr - 4 * det
  if (disc < -1e-7) return { complex: true, det, tr }
  const root = Math.sqrt(Math.max(0, disc))
  const l1 = (tr + root) / 2
  const l2 = (tr - root) / 2
  const vec = (lambda) => {
    if (Math.abs(b) > 1e-6) return norm([b, lambda - a])
    if (Math.abs(c) > 1e-6) return norm([lambda - d, c])
    return Math.abs(a - lambda) <= Math.abs(d - lambda) ? [1, 0] : [0, 1]
  }
  return { complex: false, det, tr, l1, l2, v1: vec(l1), v2: vec(l2) }
}

export const MATRIX_PRESETS = [
  { id: 'rot', name: '旋转 30°', m: [0.866, -0.5, 0.5, 0.866] },
  { id: 'shear', name: '剪切', m: [1, 0.7, 0, 1] },
  { id: 'scale', name: '缩放', m: [1.6, 0, 0, 0.55] },
  { id: 'mirror', name: '镜像', m: [-1, 0, 0, 1] },
  { id: 'proj', name: '投影到 x', m: [1, 0, 0, 0] },
  { id: 'id', name: '不变', m: [1, 0, 0, 1] }
]
