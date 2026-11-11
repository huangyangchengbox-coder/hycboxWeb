import { SNAKES } from './snakes.js'

/** 省级有无记录，不是坐标。名称用省级简称，避免画成点位。 */
export const SNAKE_RANGES_CN = SNAKES.filter((item) => item.china).map((item) => ({
  speciesId: item.id,
  provinces: item.provinces
}))

export const REALMS = [
  { id: 'palearctic', name: '古北界', en: 'Palearctic', text: '欧洲和亚洲温带。蛇向高纬度延伸的区域。' },
  { id: 'indomalayan', name: '东洋界', en: 'Indomalayan', text: '南亚、东南亚和中国南方。这一带的蛇类多样性很高。' },
  { id: 'afrotropical', name: '埃塞俄比亚界', en: 'Afrotropical', text: '非洲撒哈拉以南。' },
  { id: 'nearctic', name: '新北界', en: 'Nearctic', text: '北美。响尾蛇主要在这里辐射。本期图鉴未单列北美种。' },
  { id: 'neotropical', name: '新热带界', en: 'Neotropical', text: '中美和南美。蚺和多种蝮的大本营。' },
  { id: 'australasian', name: '澳新界', en: 'Australasian', text: '澳大利亚、新几内亚一带。陆栖蛇里毒蛇比例很高。海蛇也进入印太海域。' }
]

export function speciesInProvince(province) {
  return SNAKE_RANGES_CN
    .filter((item) => item.provinces.includes(province))
    .map((item) => SNAKES.find((snake) => snake.id === item.speciesId))
    .filter(Boolean)
}

export function speciesInRealm(realmId) {
  return SNAKES.filter((item) => item.realms.includes(realmId))
}

export function provincesForSpecies(speciesId) {
  return SNAKE_RANGES_CN.find((item) => item.speciesId === speciesId)?.provinces || []
}

export function listedProvinces() {
  const names = new Set()
  SNAKE_RANGES_CN.forEach((item) => item.provinces.forEach((name) => names.add(name)))
  return [...names]
}
