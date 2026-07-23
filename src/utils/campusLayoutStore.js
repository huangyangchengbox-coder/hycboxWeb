/**
 * 园区楼栋落位本地存储（浏览器）。
 * 结构：{ version, communityId, buildings: { [key]: { x, z } }, updatedAt }
 * 总平底图体积大，默认仅会话内使用；可另存导出 JSON。
 */

const VERSION = 1

function storageKey(communityId) {
  return `hycbox.campusLayout.${communityId || 'default'}`
}

/**
 * @returns {{ version:number, communityId:string, buildings:Record<string,{x:number,z:number}>, updatedAt?:string } | null}
 */
export function loadCampusLayout(communityId) {
  try {
    const raw = localStorage.getItem(storageKey(communityId))
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data || typeof data !== 'object') return null
    if (!data.buildings || typeof data.buildings !== 'object') {
      data.buildings = {}
    }
    return data
  } catch (e) {
    console.warn('[campusLayout] load failed', e)
    return null
  }
}

/**
 * @param {string} communityId
 * @param {Record<string,{x:number,z:number}>} buildings
 */
export function saveCampusLayout(communityId, buildings) {
  const payload = {
    version: VERSION,
    communityId: communityId || 'default',
    buildings: buildings || {},
    updatedAt: new Date().toISOString()
  }
  localStorage.setItem(storageKey(communityId), JSON.stringify(payload))
  return payload
}

export function clearCampusLayout(communityId) {
  localStorage.removeItem(storageKey(communityId))
}

/** 下载落位 JSON，便于备份/提交代码 */
export function downloadCampusLayoutJson(communityId, buildings) {
  const payload = {
    version: VERSION,
    communityId: communityId || 'default',
    buildings: buildings || {},
    updatedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `campus-layout-${communityId || 'default'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * @param {File} file
 * @returns {Promise<Record<string,{x:number,z:number}>>}
 */
export function parseCampusLayoutFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || '{}'))
        const buildings = data.buildings && typeof data.buildings === 'object' ? data.buildings : {}
        resolve(buildings)
      } catch (e) {
        reject(new Error('布局文件格式无效'))
      }
    }
    reader.onerror = () => reject(new Error('读取布局文件失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * 将覆盖坐标合并到布局列表（不改原数组）。
 * @param {Array<{key:string,x:number,z:number}>} items
 * @param {Record<string,{x?:number,z?:number}>|null} overrides
 */
export function mergeLayoutOverrides(items, overrides) {
  if (!overrides || !Object.keys(overrides).length) {
    return items.slice()
  }
  return items.map((it) => {
    const o = overrides[it.key]
    if (!o) return { ...it }
    return {
      ...it,
      x: o.x != null ? Number(o.x) : it.x,
      z: o.z != null ? Number(o.z) : it.z
    }
  })
}
