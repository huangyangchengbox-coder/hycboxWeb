<template>
  <div class="cockpit">
    <aside class="pub-panel card">
      <div class="panel-head">
        <h2>物流发布</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingPubs" @click="loadPubs">刷新</button>
      </div>
      <p v-if="loadingPubs" class="muted">加载中…</p>
      <p v-else-if="!nationPubs.length" class="muted">暂无全国物流发布</p>
      <ul v-else class="pub-list">
        <li
          v-for="pub in nationPubs"
          :key="pub.id"
          :class="['pub-item', { active: selectedId === pub.id }]"
          @click="selectPub(pub)"
        >
          <div class="pub-title">{{ pub.title || pub.id }}</div>
          <div class="pub-meta">
            <span>物流中国</span>
            <span>{{ pub.status === 'active' ? '进行中' : '已结束' }}</span>
          </div>
        </li>
      </ul>
    </aside>

    <section class="map-panel card">
      <template v-if="!selectedId">
        <div class="empty-hint">请选择左侧全国物流发布</div>
      </template>
      <template v-else>
        <div class="map-toolbar">
          <div class="map-title">
            <strong>{{ selectedPub?.title }}</strong>
            <span class="muted">
              订单 {{ nationMap?.totalOrders ?? 0 }} · 件数 {{ nationMap?.totalQuantity ?? 0 }}
            </span>
          </div>
          <button class="btn btn-secondary btn-sm" :disabled="loadingMap" @click="reloadMap">刷新</button>
        </div>
        <p v-if="error" class="error-msg">{{ error }}</p>
        <div class="map-stage">
          <div ref="chartEl" class="china-map"></div>
          <aside class="top5-panel">
            <h3>订单 Top5 省份</h3>
            <ol v-if="top5.length" class="top5-list">
              <li v-for="(item, idx) in top5" :key="item.province">
                <span class="rank">{{ idx + 1 }}</span>
                <span class="name">{{ item.province }}</span>
                <span class="count">{{ item.orderCount }} 单</span>
              </li>
            </ol>
            <p v-else class="muted">暂无省份数据</p>
          </aside>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { MapChart, EffectScatterChart } from 'echarts/charts'
import {
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { getNationMap, listPublications } from '../api/cockpit'

echarts.use([
  MapChart,
  EffectScatterChart,
  GeoComponent,
  TooltipComponent,
  VisualMapComponent,
  TitleComponent,
  CanvasRenderer
])

const GEO_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json'

const loadingPubs = ref(false)
const loadingMap = ref(false)
const error = ref('')
const pubs = ref([])
const selectedId = ref('')
const selectedPub = ref(null)
const nationMap = ref(null)
const chartEl = ref(null)
const mapReady = ref(false)

let chart = null
let chinaGeo = null

const nationPubs = computed(() =>
  (pubs.value || []).filter((p) => p.scope === 'nationwide')
)

const top5 = computed(() => nationMap.value?.top5 || [])

async function ensureChinaMap() {
  if (mapReady.value) return
  const res = await fetch(GEO_URL)
  if (!res.ok) {
    throw new Error('中国地图加载失败')
  }
  chinaGeo = await res.json()
  echarts.registerMap('china', chinaGeo)
  mapReady.value = true
}

function provinceCenters() {
  const centers = {}
  const features = chinaGeo?.features || []
  for (const f of features) {
    const name = f?.properties?.name
    const center = f?.properties?.center || f?.properties?.centroid
    if (name && Array.isArray(center) && center.length >= 2) {
      centers[name] = center
    }
  }
  return centers
}

function renderChart() {
  if (!chartEl.value || !mapReady.value) return
  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  const provinces = (nationMap.value?.provinces || []).filter((p) => p.mapName && p.mapName !== '未填省份')
  const mapData = provinces.map((p) => ({
    name: p.mapName,
    value: p.orderCount,
    quantity: p.totalQuantity,
    province: p.province
  }))
  const maxVal = Math.max(1, ...mapData.map((d) => d.value))
  const centers = provinceCenters()
  const scatter = provinces
    .filter((p) => centers[p.mapName])
    .map((p) => ({
      name: p.mapName,
      value: [...centers[p.mapName], p.orderCount],
      orderCount: p.orderCount
    }))

  chart.setOption({
    tooltip: {
      trigger: 'item',
      formatter(params) {
        if (params.seriesType === 'effectScatter') {
          return `${params.name}<br/>订单 ${params.data.orderCount || params.value[2] || 0}`
        }
        const d = params.data || {}
        if (!d.value) return `${params.name}<br/>暂无订单`
        return `${params.name}<br/>订单 ${d.value}<br/>件数 ${d.quantity || 0}`
      }
    },
    visualMap: {
      min: 0,
      max: maxVal,
      left: 16,
      bottom: 16,
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#e0f2fe', '#38bdf8', '#0284c7', '#0f766e']
      },
      textStyle: { color: '#6b7280' }
    },
    geo: {
      map: 'china',
      roam: true,
      scaleLimit: { min: 0.8, max: 8 },
      itemStyle: {
        areaColor: '#f3f4f6',
        borderColor: '#cbd5e1'
      },
      emphasis: {
        itemStyle: { areaColor: '#99f6e4' }
      }
    },
    series: [
      {
        name: '订单',
        type: 'map',
        geoIndex: 0,
        data: mapData
      },
      {
        name: '亮点',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        data: scatter,
        symbolSize(val) {
          const n = val[2] || 1
          return Math.min(28, 8 + Math.sqrt(n) * 4)
        },
        showEffectOn: 'render',
        rippleEffect: { scale: 3, brushType: 'stroke' },
        itemStyle: {
          color: '#f59e0b',
          shadowBlur: 8,
          shadowColor: 'rgba(245, 158, 11, 0.45)'
        },
        zlevel: 2
      }
    ]
  }, true)
}

async function loadPubs() {
  loadingPubs.value = true
  error.value = ''
  try {
    const data = await listPublications(1, 50)
    pubs.value = data?.list || []
  } catch (e) {
    error.value = e.message || '加载发布失败'
  } finally {
    loadingPubs.value = false
  }
}

async function selectPub(pub) {
  selectedId.value = pub.id
  selectedPub.value = pub
  nationMap.value = null
  await reloadMap()
}

async function reloadMap() {
  if (!selectedId.value) return
  loadingMap.value = true
  error.value = ''
  try {
    await ensureChinaMap()
    nationMap.value = await getNationMap(selectedId.value)
    await nextTick()
    renderChart()
  } catch (e) {
    error.value = e.message || '加载地图数据失败'
  } finally {
    loadingMap.value = false
  }
}

function onResize() {
  chart?.resize()
}

watch(top5, async () => {
  await nextTick()
  renderChart()
})

onMounted(async () => {
  window.addEventListener('resize', onResize)
  await loadPubs()
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.cockpit {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  min-height: calc(100vh - 120px);
}

@media (max-width: 900px) {
  .cockpit {
    grid-template-columns: 1fr;
  }
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.panel-head h2 {
  margin: 0;
  font-size: 1rem;
}

.pub-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: calc(100vh - 180px);
  overflow: auto;
}

.pub-item {
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  background: #fafafa;
}

.pub-item:hover,
.pub-item.active {
  border-color: var(--accent);
  background: #ecfdf5;
}

.pub-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.pub-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.map-panel {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  position: relative;
}

.empty-hint {
  margin: auto;
  color: var(--muted);
}

.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.map-title {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.map-title strong {
  font-size: 1rem;
}

.map-stage {
  position: relative;
  flex: 1;
  min-height: 480px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  overflow: hidden;
}

.china-map {
  width: 100%;
  height: 100%;
  min-height: 480px;
}

.top5-panel {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 220px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: var(--shadow);
  padding: 0.75rem 0.85rem;
  z-index: 3;
}

.top5-panel h3 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
}

.top5-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.top5-list li {
  display: grid;
  grid-template-columns: 1.4rem 1fr auto;
  gap: 0.4rem;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px dashed var(--border);
  font-size: 0.8rem;
}

.top5-list li:last-child {
  border-bottom: none;
}

.rank {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: #ecfdf5;
  color: var(--accent-dark);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.7rem;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.count {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.muted {
  color: var(--muted);
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}
</style>
