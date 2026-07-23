/**
 * 宜昌·恒大名都：地图经纬度落位。
 * 中心点为东城大道与东方大道交汇处附近近似坐标，可在地图校准中微调。
 */
import { buildCampusLayout } from './hengdaMingduLayout'
import { mergeLayoutOverrides } from '../utils/campusLayoutStore'

/** 园区中心（WGS84），后续可用地图校准覆盖 */
export const HENGDA_MAP_CENTER = {
  lng: 111.3286,
  lat: 30.7712
}

const METERS_PER_DEG_LAT = 111320

function metersToLngLat(dx, dz, center = HENGDA_MAP_CENTER) {
  const latRad = (center.lat * Math.PI) / 180
  const lat = center.lat + dz / METERS_PER_DEG_LAT
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
 * @param {Array} phases
 * @param {Record<string,{x?:number,z?:number,lng?:number,lat?:number}>|null} overrides
 * @param {{lng:number,lat:number}} center
 * @returns {GeoJSON.FeatureCollection}
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
  const z = (lat - center.lat) * METERS_PER_DEG_LAT
  const x = (lng - center.lng) * METERS_PER_DEG_LAT * Math.cos(latRad)
  return {
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
    x: Number(x.toFixed(2)),
    z: Number(z.toFixed(2))
  }
}
