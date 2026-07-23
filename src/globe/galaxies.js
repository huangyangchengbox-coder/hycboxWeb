/**
 * 已知星系示意数据（V1：名称与类型真实，空间布局为对数压缩示意，非精确天文坐标）。
 * distMly：距银河系大致百万光年；0 表示本星系。
 */
export const KNOWN_GALAXIES = [
  { id: 'mw', name: '银河系', nameEn: 'Milky Way', type: '棒旋星系', distMly: 0, size: 2.4, color: '#9ec9ff' },
  { id: 'lmc', name: '大麦哲伦云', nameEn: 'LMC', type: '不规则星系', distMly: 0.16, size: 0.9, color: '#ffd6a5' },
  { id: 'smc', name: '小麦哲伦云', nameEn: 'SMC', type: '不规则星系', distMly: 0.2, size: 0.55, color: '#ffc4a8' },
  { id: 'm31', name: '仙女座星系', nameEn: 'Andromeda M31', type: '螺旋星系', distMly: 2.5, size: 2.8, color: '#b8d4ff' },
  { id: 'm33', name: '三角座星系', nameEn: 'Triangulum M33', type: '螺旋星系', distMly: 2.7, size: 1.2, color: '#a8c8ff' },
  { id: 'm81', name: '波德星系', nameEn: "Bode's M81", type: '螺旋星系', distMly: 12, size: 1.4, color: '#c9ddff' },
  { id: 'm82', name: '雪茄星系', nameEn: 'Cigar M82', type: '不规则/星暴', distMly: 12, size: 0.85, color: '#ffb38a' },
  { id: 'cenA', name: '半人马座 A', nameEn: 'Centaurus A', type: '椭圆/活动星系', distMly: 12, size: 1.1, color: '#e8d5ff' },
  { id: 'm83', name: '南风车星系', nameEn: 'Southern Pinwheel', type: '螺旋星系', distMly: 15, size: 1.0, color: '#aed4ff' },
  { id: 'ngc253', name: '雕塑家星系', nameEn: 'Sculptor NGC 253', type: '螺旋星系', distMly: 11, size: 1.15, color: '#d4b896' },
  { id: 'm51', name: '涡状星系', nameEn: 'Whirlpool M51', type: '螺旋星系', distMly: 23, size: 1.3, color: '#9fd0ff' },
  { id: 'm64', name: '黑眼星系', nameEn: 'Black Eye M64', type: '螺旋星系', distMly: 17, size: 0.95, color: '#c4b0a0' },
  { id: 'm101', name: '风车星系', nameEn: 'Pinwheel M101', type: '螺旋星系', distMly: 21, size: 1.5, color: '#a8cfff' },
  { id: 'm104', name: '草帽星系', nameEn: 'Sombrero M104', type: '螺旋星系', distMly: 31, size: 1.2, color: '#e8e0d0' },
  { id: 'antennae', name: '触须星系', nameEn: 'Antennae', type: '相互作用星系', distMly: 45, size: 1.35, color: '#ffc9a8' },
  { id: 'cartwheel', name: '车轮星系', nameEn: 'Cartwheel', type: '环状星系', distMly: 500, size: 1.6, color: '#8fd3ff' },
  { id: 'tadpole', name: '蝌蚪星系', nameEn: 'Tadpole', type: '受扰螺旋', distMly: 420, size: 1.1, color: '#b5e0ff' },
  { id: 'hoag', name: '霍格天体', nameEn: "Hoag's Object", type: '环状星系', distMly: 600, size: 1.0, color: '#d2c4ff' },
  { id: 'm87', name: '室女座 A', nameEn: 'Messier 87', type: '巨椭圆星系', distMly: 53, size: 2.0, color: '#f0e8ff' },
  { id: 'ic1101', name: 'IC 1101', nameEn: 'IC 1101', type: '超巨椭圆星系', distMly: 1040, size: 3.2, color: '#ffe8c8' }
]

/**
 * 将距离映射到示意半径（对数压缩，便于同屏看见近邻与遥远天体）。
 */
export function galaxyLayoutRadius(distMly) {
  if (!distMly || distMly <= 0) return 0
  return 8 + Math.log10(distMly + 1) * 22
}

/** 稳定伪随机，保证每次布局一致 */
function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

/** 为每个星系生成固定示意三维坐标 */
export function layoutGalaxies(list = KNOWN_GALAXIES) {
  return list.map((g, i) => {
    const r = galaxyLayoutRadius(g.distMly)
    if (r === 0) {
      return { ...g, x: 0, y: 0, z: 0 }
    }
    const a = hash01(g.id + 'a') * Math.PI * 2
    const b = (hash01(g.id + 'b') - 0.5) * Math.PI * 0.55
    const jitter = 0.85 + hash01(g.id + 'j') * 0.3
    const rr = r * jitter
    return {
      ...g,
      x: rr * Math.cos(b) * Math.cos(a),
      y: rr * Math.sin(b) * 0.65,
      z: rr * Math.cos(b) * Math.sin(a),
      orbitSpeed: 0.00015 + hash01(g.id + 's') * 0.00035,
      orbitPhase: hash01(g.id + 'p') * Math.PI * 2 + i * 0.2
    }
  })
}
