/**
 * 已知黑洞示意数据（名称与类型真实，布局为示意）。
 * massSolar：约略太阳质量；distLy：距地球约略光年。
 */
export const KNOWN_BLACKHOLES = [
  { id: 'sagA', name: '人马座 A*', nameEn: 'Sagittarius A*', type: '超大质量黑洞', massSolar: '4.3×10⁶', distLy: 26000, size: 1.8 },
  { id: 'm87', name: 'M87*', nameEn: 'M87*', type: '超大质量黑洞', massSolar: '6.5×10⁹', distLy: 5.3e7, size: 2.6 },
  { id: 'cygx1', name: '天鹅座 X-1', nameEn: 'Cygnus X-1', type: '恒星级黑洞', massSolar: '21', distLy: 6070, size: 1.1 },
  { id: 'v404', name: 'V404 天鹅座', nameEn: 'V404 Cygni', type: '恒星级黑洞', massSolar: '9', distLy: 7800, size: 0.95 },
  { id: 'gw150914', name: 'GW150914', nameEn: 'GW150914', type: '并合遗迹', massSolar: '62', distLy: 1.4e9, size: 1.2 },
  { id: 'ton618', name: 'TON 618', nameEn: 'TON 618', type: '超大质量黑洞', massSolar: '6.6×10¹⁰', distLy: 1.04e10, size: 3.0 },
  { id: 'phoenix', name: '凤凰座 A', nameEn: 'Phoenix A', type: '超大质量黑洞', massSolar: '~10¹⁰', distLy: 5.7e9, size: 2.4 },
  { id: 'oj287', name: 'OJ 287', nameEn: 'OJ 287', type: '双黑洞候选', massSolar: '1.8×10¹⁰', distLy: 3.5e9, size: 2.1 },
  { id: 'holmbeg', name: 'Holmberg 15A', nameEn: 'Holmberg 15A', type: '超大质量黑洞', massSolar: '4×10¹⁰', distLy: 7e8, size: 2.2 },
  { id: 'ngc1277', name: 'NGC 1277', nameEn: 'NGC 1277', type: '超大质量黑洞', massSolar: '1.7×10¹⁰', distLy: 2.2e8, size: 1.9 },
  { id: 'hlx1', name: 'HLX-1', nameEn: 'HLX-1', type: '中等质量候选', massSolar: '~10⁴', distLy: 2.9e8, size: 1.0 },
  { id: 'groj1655', name: 'GRO J1655-40', nameEn: 'GRO J1655-40', type: '恒星级黑洞', massSolar: '7', distLy: 11000, size: 0.85 }
]

function hash01(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

function layoutRadius(distLy) {
  if (!distLy || distLy <= 0) return 10
  return 10 + Math.log10(distLy + 1) * 6.5
}

export function layoutBlackholes(list = KNOWN_BLACKHOLES) {
  return list.map((b, i) => {
    const r = layoutRadius(b.distLy)
    const a = hash01(b.id + 'a') * Math.PI * 2
    const elev = (hash01(b.id + 'e') - 0.5) * Math.PI * 0.5
    const jitter = 0.9 + hash01(b.id + 'j') * 0.25
    const rr = r * jitter
    return {
      ...b,
      x: rr * Math.cos(elev) * Math.cos(a),
      y: rr * Math.sin(elev) * 0.7,
      z: rr * Math.cos(elev) * Math.sin(a),
      spin: 0.008 + hash01(b.id + 's') * 0.02,
      orbitPhase: hash01(b.id + 'p') * Math.PI * 2 + i * 0.15
    }
  })
}

export function formatBhDist(distLy) {
  if (distLy < 1e5) return `${Math.round(distLy).toLocaleString()} 光年`
  if (distLy < 1e8) return `${(distLy / 1e6).toFixed(1)} 百万光年`
  return `${(distLy / 1e9).toFixed(1)} 十亿光年`
}
