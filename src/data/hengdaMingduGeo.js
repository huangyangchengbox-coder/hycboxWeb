/**
 * 宜昌·恒大名都：地图经纬度落位。
 * 本地坐标：+x 东，+z 南（与二期总平北上一致）。
 * 地图中心取东城大道与东方大道交汇处以北（二期御峰一侧）。
 */
import { buildCampusLayout, PHASE2_PLAN_OVERLAY } from './hengdaMingduLayout'
import { mergeLayoutOverrides } from '../utils/campusLayoutStore'

/** 园区中心（WGS84）≈ 二期水景附近，可再校准 */
export const HENGDA_MAP_CENTER = {
  lng: 111.3292,
  lat: 30.7730
}

const METERS_PER_DEG_LAT = 111320

/** 本地米制 → WGS84；+z 为南，故 lat 取减 */
export function metersToLngLat(dx, dz, center = HENGDA_MAP_CENTER) {
  const latRad = (center.lat * Math.PI) / 180
  const lat = center.lat - dz / METERS_PER_DEG_LAT
  const lng = center.lng + dx / (METERS_PER_DEG_LAT * Math.cos(latRad))
  return { lng, lat }
}

function rectRing(lng, lat, widthM, depthM) {
  const latRad = (lat * Math.PI) / 180
  const dLat = depthM / 2 / METERS_PER_DEG_LAT
  const dLng = widthM / 2 / (METERS_PER_DEG_LAT * Math.cos(latRad))
  return [
    [lng - dLng, lat - dLat],
    [lng + dLng, lat - dLat],
    [lng + dLng, lat + dLat],
    [lng - dLng, lat + dLat],
    [lng - dLng, lat - dLat]
  ]
}

/**
 * 二期总平图四角（MapLibre image source 顺序：左上、右上、右下、左下）
 */
export function phase2PlanCoordinates(center = HENGDA_MAP_CENTER) {
  const { centerX, centerZ, widthM, heightM } = PHASE2_PLAN_OVERLAY
  const halfW = widthM / 2
  const halfH = heightM / 2
  const nw = metersToLngLat(centerX - halfW, centerZ - halfH, center)
  const ne = metersToLngLat(centerX + halfW, centerZ - halfH, center)
  const se = metersToLngLat(centerX + halfW, centerZ + halfH, center)
  const sw = metersToLngLat(centerX - halfW, centerZ + halfH, center)
  return [
    [nw.lng, nw.lat],
    [ne.lng, ne.lat],
    [se.lng, se.lat],
    [sw.lng, sw.lat]
  ]
}

/**
 * @param {Array} phases
 * @param {Record<string,{x?:number,z?:number,lng?:number,lat?:number}>|null} overrides
 * @param {{lng:number,lat:number}} center
 */
export function buildCampusGeoJson(phases, overrides = null, center = HENGDA_MAP_CENTER) {
  const items = mergeLayoutOverrides(buildCampusLayout(phases), overrides)
  const features = items.map((item) => {
    const o = overrides?.[item.key]
    let lng
    let lat
    if (o && o.lng != null && o.lat != null) {
      lng = Number(o.lng)
      lat = Number(o.lat)
    } else {
      const p = metersToLngLat(item.x, item.z, center)
      lng = p.lng
      lat = p.lat
    }
    return {
      type: 'Feature',
      id: item.key,
      properties: {
        key: item.key,
        phaseId: item.phaseId,
        buildingId: item.buildingId,
        name: item.name,
        height: item.height,
        floors: item.floors
      },
      geometry: {
        type: 'Polygon',
        coordinates: [rectRing(lng, lat, item.width, item.depth)]
      }
    }
  })
  return { type: 'FeatureCollection', features }
}

/** 地图点击处写入 lng/lat 覆盖（同时换算本地米制，兼容场景 3D） */
export function pointOverrideFromLngLat(lng, lat, center = HENGDA_MAP_CENTER) {
  const latRad = (center.lat * Math.PI) / 180
  const z = (center.lat - lat) * METERS_PER_DEG_LAT
  const x = (lng - center.lng) * METERS_PER_DEG_LAT * Math.cos(latRad)
  return {
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2))
  }
}
