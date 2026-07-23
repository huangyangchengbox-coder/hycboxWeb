<template>
  <div class="campus-map">
    <div v-if="calibrate" class="cal-bar">
      <span class="cal-tip">
        地图校准：先点选楼栋，再点击地图落点；保存后与场景 3D 共用落位
        <template v-if="pickingKey"> · 当前：{{ pickingName }}</template>
      </span>
      <div class="cal-actions">
        <button type="button" class="btn btn-secondary btn-sm" @click="exportLayout">导出落位</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="resetLayout">重置落位</button>
        <button type="button" class="btn btn-sm save-btn" @click="persistLayout">保存落位</button>
      </div>
    </div>
    <div ref="mapEl" class="map-host"></div>
    <div class="hint">{{ hintText }}</div>
    <p v-if="toast" class="toast">{{ toast }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  HENGDA_MAP_CENTER,
  buildCampusGeoJson,
  pointOverrideFromLngLat
} from '../data/hengdaMingduGeo'
import { buildingStatusTone } from '../utils/campusOrderStats'
import {
  clearCampusLayout,
  downloadCampusLayoutJson,
  loadCampusLayout,
  saveCampusLayout
} from '../utils/campusLayoutStore'

const props = defineProps({
  phases: { type: Array, default: () => [] },
  selectedKey: { type: String, default: '' },
  buildingStats: { type: Object, default: () => ({}) },
  communityId: { type: String, default: 'hengda_mingdu' },
  calibrate: { type: Boolean, default: false }
})

const emit = defineEmits(['select'])

const mapEl = ref(null)
const toast = ref('')
const overrides = ref({})
const pickingKey = ref('')
const pickingName = ref('')

const hintText = computed(() =>
  props.calibrate
    ? '卫星地图 + 楼栋挤出 · 点楼再点地图校准 · 黄待派送/绿已配送/灰无单'
    : '卫星地图 · 拖拽/缩放/倾斜 · 点击楼栋下钻 · 黄=待派送 / 绿=已配送 / 灰=无单'
)

let map = null
let toastTimer = 0
const SOURCE_ID = 'campus-buildings'
const LAYER_FILL = 'campus-extrusion'
const LAYER_LINE = 'campus-outline'
const LAYER_LABEL = 'campus-label'

const COLOR_PENDING = '#fbbf24'
const COLOR_COMPLETED = '#34d399'
const COLOR_EMPTY = '#cbd5e1'
const COLOR_SELECTED = '#f97316'

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2200)
}

function loadSaved() {
  const saved = loadCampusLayout(props.communityId)
  overrides.value = saved?.buildings || {}
}

function enrichGeoJson(fc) {
  return {
    ...fc,
    features: fc.features.map((f) => {
      const key = f.properties.key
      const tone = buildingStatusTone(props.buildingStats?.[key])
      const selected = key === props.selectedKey || key === pickingKey.value
      return {
        ...f,
        properties: {
          ...f.properties,
          tone,
          fillColor: selected
            ? COLOR_SELECTED
            : tone === 'pending'
              ? COLOR_PENDING
              : tone === 'completed'
                ? COLOR_COMPLETED
                : COLOR_EMPTY,
          label: (() => {
            const st = props.buildingStats?.[key]
            if (!st || (st.pending === 0 && st.completed === 0)) return f.properties.name
            return `${f.properties.name} 待${st.pending}/已${st.completed}`
          })()
        }
      }
    })
  }
}

function currentGeoJson() {
  return enrichGeoJson(buildCampusGeoJson(props.phases, overrides.value, HENGDA_MAP_CENTER))
}

function refreshSource() {
  if (!map || !map.getSource(SOURCE_ID)) return
  map.getSource(SOURCE_ID).setData(currentGeoJson())
}

function persistLayout() {
  saveCampusLayout(props.communityId, overrides.value)
  showToast('落位已保存到本机')
}

function resetLayout() {
  clearCampusLayout(props.communityId)
  overrides.value = {}
  pickingKey.value = ''
  pickingName.value = ''
  refreshSource()
  showToast('已恢复默认地图落位')
}

function exportLayout() {
  downloadCampusLayoutJson(props.communityId, overrides.value)
  showToast('已导出 JSON')
}

function onMapClick(e) {
  if (props.calibrate) {
    if (pickingKey.value) {
      const { lng, lat } = e.lngLat
      const next = {
        ...overrides.value,
        [pickingKey.value]: pointOverrideFromLngLat(lng, lat, HENGDA_MAP_CENTER)
      }
      overrides.value = next
      refreshSource()
      showToast(`${pickingName.value || '楼栋'} 已落到地图点`)
      return
    }
    const feats = map.queryRenderedFeatures(e.point, { layers: [LAYER_FILL] })
    const f = feats[0]
    if (!f?.properties?.key) {
      showToast('请先点击一栋楼，再点地图落点')
      return
    }
    pickingKey.value = f.properties.key
    pickingName.value = f.properties.name || f.properties.key
    refreshSource()
    showToast(`已选 ${pickingName.value}，再点击地图空白处落点`)
    return
  }

  const feats = map.queryRenderedFeatures(e.point, { layers: [LAYER_FILL] })
  const f = feats[0]
  if (!f?.properties?.key) return
  emit('select', {
    phaseId: f.properties.phaseId,
    buildingId: f.properties.buildingId,
    name: f.properties.name,
    key: f.properties.key
  })
}

function initMap() {
  if (!mapEl.value) return
  loadSaved()

  map = new maplibregl.Map({
    container: mapEl.value,
    style: {
      version: 8,
      sources: {
        esri: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Tiles © Esri'
        }
      },
      layers: [
        {
          id: 'esri-satellite',
          type: 'raster',
          source: 'esri',
          minzoom: 0,
          maxzoom: 22
        }
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
    },
    center: [HENGDA_MAP_CENTER.lng, HENGDA_MAP_CENTER.lat],
    zoom: 16.2,
    pitch: 55,
    bearing: -20,
    maxPitch: 70
  })

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right')
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left')

  map.on('load', () => {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: currentGeoJson()
    })

    map.addLayer({
      id: LAYER_FILL,
      type: 'fill-extrusion',
      source: SOURCE_ID,
      paint: {
        'fill-extrusion-color': ['get', 'fillColor'],
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.88
      }
    })

    map.addLayer({
      id: LAYER_LINE,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.2,
        'line-opacity': 0.55
      }
    })

    map.addLayer({
      id: LAYER_LABEL,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['get', 'label'],
        'text-size': 11,
        'text-offset': [0, 0.2],
        'text-anchor': 'center',
        'text-allow-overlap': false
      },
      paint: {
        'text-color': '#0f172a',
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.2
      }
    })

    map.on('click', onMapClick)
    map.on('mouseenter', LAYER_FILL, () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', LAYER_FILL, () => {
      map.getCanvas().style.cursor = ''
    })
  })
}

function teardown() {
  clearTimeout(toastTimer)
  if (map) {
    map.remove()
    map = null
  }
}

watch(() => props.phases, refreshSource, { deep: true })
watch(() => props.buildingStats, refreshSource, { deep: true })
watch(() => props.selectedKey, refreshSource)
watch(() => props.communityId, () => {
  loadSaved()
  refreshSource()
})
watch(() => props.calibrate, (on) => {
  if (!on) {
    pickingKey.value = ''
    pickingName.value = ''
    refreshSource()
  }
})

onMounted(initMap)
onUnmounted(teardown)
</script>

<style scoped>
.campus-map {
  position: relative;
  flex: 1;
  min-height: 480px;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: #0f172a;
  display: flex;
  flex-direction: column;
}

.cal-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.65rem;
  background: #fff7ed;
  border-bottom: 1px solid #fdba74;
  z-index: 3;
}

.cal-tip {
  font-size: 0.75rem;
  color: #9a3412;
}

.cal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.save-btn {
  background: var(--accent);
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}

.map-host {
  width: 100%;
  flex: 1;
  min-height: 440px;
}

.hint {
  position: absolute;
  left: 12px;
  bottom: 28px;
  z-index: 2;
  font-size: 0.75rem;
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.72);
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  pointer-events: none;
}

.toast {
  position: absolute;
  right: 12px;
  bottom: 28px;
  z-index: 4;
  margin: 0;
  font-size: 0.8rem;
  background: rgba(15, 23, 42, 0.9);
  color: #fff;
  border-radius: 8px;
  padding: 0.4rem 0.7rem;
  pointer-events: none;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}
</style>
