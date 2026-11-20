import { SOLAR_TERMS, termByLongitude } from './solarTerms.js'

/** 科普口径的地日月模型。日期从 2000-01-01 起算，精度大约 ±1 天。 */
export const YEAR = 365.25636
export const OBLIQUITY_DEG = 23.44
export const MOON_INCL_DEG = 5.14
export const SYNODIC = 29.530588
export const SIDEREAL_MONTH = 27.321661
export const EPOCH = Date.UTC(2000, 0, 1)
export const EQUINOX_DAY = 79
export const ORBIT = 9
export const ECC = 0.16
export const EARTH_R = 0.62
export const MOON_R = 0.17
export const MOON_DIST = 1.75
export const SUN_R = 1.05

const OBL = OBLIQUITY_DEG * Math.PI / 180
const INC = MOON_INCL_DEG * Math.PI / 180
const NEW_MOON_DAY = 5.76

export function dayOfDate(y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000)
}

export function dateOfDay(day) {
  const dt = new Date(EPOCH + Math.round(day) * 86400000)
  const y = dt.getUTCFullYear()
  const m = dt.getUTCMonth() + 1
  const d = dt.getUTCDate()
  const text = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { y, m, d, text }
}

export function sunLongitude(day) {
  const lon = ((day - EQUINOX_DAY) / YEAR) * 360
  return ((lon % 360) + 360) % 360
}

export function declinationRad(day) {
  const lam = sunLongitude(day) * Math.PI / 180
  return Math.asin(Math.sin(OBL) * Math.sin(lam))
}

export function earthAngle(day) {
  return sunLongitude(day) * Math.PI / 180 + Math.PI
}

const PERI_ANGLE = earthAngle(3)
const MOON_PHASE0 = earthAngle(NEW_MOON_DAY) + Math.PI - (NEW_MOON_DAY / SIDEREAL_MONTH) * Math.PI * 2

export function orbitRadius(angle) {
  const th = angle - PERI_ANGLE
  return ORBIT * (1 - ECC * ECC) / (1 + ECC * Math.cos(th))
}

export function moonAngle(day) {
  return (day / SIDEREAL_MONTH) * Math.PI * 2 + MOON_PHASE0
}

export function daylightHours(latDeg, day) {
  const phi = latDeg * Math.PI / 180
  const dec = declinationRad(day)
  const x = -Math.tan(phi) * Math.tan(dec)
  if (x <= -1) return 24
  if (x >= 1) return 0
  return (24 / Math.PI) * Math.acos(x)
}

export function noonSun(latDeg, day) {
  const dec = declinationRad(day) * 180 / Math.PI
  let alt = 90 - latDeg + dec
  let facing = '南'
  if (alt > 90) {
    alt = 180 - alt
    facing = '北'
  }
  if (alt <= 0) facing = '地平线下'
  const shadow = alt <= 1 ? null : 1 / Math.tan(alt * Math.PI / 180)
  return { dec, alt, facing, shadow }
}

function hypot3(v) {
  return Math.hypot(v.x, v.y, v.z)
}

function angleBetween(a, b) {
  const na = hypot3(a) || 1
  const nb = hypot3(b) || 1
  const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / (na * nb)
  return Math.acos(Math.max(-1, Math.min(1, dot)))
}

export function bodies(day, align = null) {
  const angle = earthAngle(day)
  const radius = orbitRadius(angle)
  const earth = { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius }
  let moon
  if (align === 'solar') {
    const len = Math.hypot(earth.x, earth.z) || 1
    const k = (len - MOON_DIST) / len
    moon = { x: earth.x * k, y: 0, z: earth.z * k }
  } else if (align === 'lunar') {
    const len = Math.hypot(earth.x, earth.z) || 1
    moon = {
      x: earth.x + (earth.x / len) * MOON_DIST,
      y: 0,
      z: earth.z + (earth.z / len) * MOON_DIST
    }
  } else {
    const ang = moonAngle(day)
    const x = Math.cos(ang) * MOON_DIST
    const z0 = Math.sin(ang) * MOON_DIST
    moon = {
      x: earth.x + x,
      y: z0 * Math.sin(INC),
      z: earth.z + z0 * Math.cos(INC)
    }
  }
  const toSun = { x: -earth.x, y: 0, z: -earth.z }
  const toMoon = { x: moon.x - earth.x, y: moon.y - earth.y, z: moon.z - earth.z }
  const elong = angleBetween(toSun, toMoon)
  const illum = (1 - Math.cos(elong)) / 2
  const moonLen = hypot3(toMoon) || 1
  const moonLat = Math.asin(Math.max(-1, Math.min(1, toMoon.y / moonLen)))
  const cross = toSun.z * toMoon.x - toSun.x * toMoon.z
  const waxing = cross > 0
  return { earth, moon, angle, elong, illum, moonLat, waxing }
}

export function phaseLabel(info, align) {
  if (align === 'solar') return '新月 · 已对齐日食'
  if (align === 'lunar') return '满月 · 已对齐月食'
  const { elong, illum, waxing } = info
  if (elong < 0.18) return '新月'
  if (elong > Math.PI - 0.18) return '满月'
  if (Math.abs(elong - Math.PI / 2) < 0.16) return waxing ? '上弦' : '下弦'
  if (waxing) return illum < 0.5 ? '峨眉月' : '盈凸月'
  return illum < 0.5 ? '残月' : '亏凸月'
}

export function eclipseChance(info) {
  const nearNode = Math.abs(info.moonLat) < 0.045
  const solar = info.elong < 0.16 && nearNode
  const lunar = Math.abs(info.elong - Math.PI) < 0.16 && nearNode
  return { solar, lunar, nearNode }
}

export const ECLIPSES = [
  {
    id: '2009',
    name: '2009-07-22 长江日全食',
    day: dayOfDate(2009, 7, 22),
    align: 'solar',
    note: '21 世纪持续时间很长的一次日全食，全食带经过长江流域。'
  },
  {
    id: '2020',
    name: '2020-06-21 日环食',
    day: dayOfDate(2020, 6, 21),
    align: 'solar',
    note: '环食带经过西藏、四川、重庆、湖北、安徽到浙江。'
  },
  {
    id: '2022',
    name: '2022-11-08 月全食',
    day: dayOfDate(2022, 11, 8),
    align: 'lunar',
    note: '望日，地球本影罩住月球。我国大部分地区可见。'
  },
  {
    id: '2024',
    name: '2024-04-08 北美日全食',
    day: dayOfDate(2024, 4, 8),
    align: 'solar',
    note: '全食带穿过墨西哥、美国和加拿大。'
  }
]

export const CLOCKS = [
  { name: '北京', tz: 8 },
  { name: '东京', tz: 9 },
  { name: '伦敦', tz: 0 },
  { name: '纽约', tz: -5 },
  { name: '洛杉矶', tz: -8 }
]

export function clocksAtBeijingNoon() {
  return CLOCKS.map((city) => {
    let h = 12 - 8 + city.tz
    let shift = 0
    while (h < 0) {
      h += 24
      shift -= 1
    }
    while (h >= 24) {
      h -= 24
      shift += 1
    }
    const hh = String(h).padStart(2, '0')
    const when = shift < 0 ? '前一天 ' : shift > 0 ? '后一天 ' : ''
    return { ...city, text: `${when}${hh}:00` }
  })
}

export function describe(day, latDeg, align = null) {
  const date = dateOfDay(day)
  const lon = sunLongitude(day)
  const term = termByLongitude(lon)
  const body = bodies(day, align)
  const eclipse = eclipseChance(body)
  const noon = noonSun(latDeg, day)
  return {
    date,
    lon,
    dec: declinationRad(day) * 180 / Math.PI,
    term: term.term,
    termDiff: term.diff,
    phase: phaseLabel(body, align),
    illum: body.illum,
    elong: body.elong,
    daylight: daylightHours(latDeg, day),
    noon,
    eclipse,
    body
  }
}

export function daylightSeries(latDeg) {
  const xs = []
  const ys = []
  for (let d = 0; d <= 365; d += 2) {
    xs.push(d)
    ys.push(daylightHours(latDeg, EQUINOX_DAY + d))
  }
  return { xs, ys }
}

export { SOLAR_TERMS }
