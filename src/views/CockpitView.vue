<template>
  <div class="cockpit">
    <aside class="pub-panel card">
      <div class="panel-head">
        <h2>发布列表</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingPubs" @click="loadPubs">刷新</button>
      </div>
      <p v-if="loadingPubs" class="muted">加载中…</p>
      <div v-else-if="!communityPubs.length" class="empty-pubs">
        <p class="muted">暂无小区闪送发布</p>
        <button type="button" class="btn btn-secondary btn-sm" @click="openPreview">看楼栋示意</button>
      </div>
      <ul v-else class="pub-list">
        <li
          v-for="pub in communityPubs"
          :key="pub.id"
          :class="['pub-item', { active: selectedId === pub.id }]"
          @click="selectPub(pub)"
        >
          <div class="pub-title">{{ pub.title || pub.id }}</div>
          <div class="pub-meta">
            <span>{{ pub.communityName || '小区' }}</span>
            <span>{{ pub.status === 'active' ? '进行中' : '已结束' }}</span>
          </div>
        </li>
      </ul>
    </aside>

    <section class="map-panel card">
      <template v-if="!selectedId">
        <div class="empty-hint">请选择左侧小区闪送发布</div>
      </template>
      <template v-else>
        <div class="map-toolbar">
          <div class="map-title">
            <strong>{{ selectedPub?.title }}</strong>
            <span class="muted">
              {{ usingDemo ? '示意' : '登记' }}
              待派送 {{ summary.pending }} 户 · 已配送 {{ summary.completed }} 户
            </span>
            <span v-if="!selectedBuilding" class="muted">点一栋楼，在三维楼体里看每一户</span>
          </div>
          <div class="toolbar-right">
            <div class="legend">
              <span class="leg pending">待派送</span>
              <span class="leg completed">已配送</span>
              <span class="leg empty">无订单</span>
            </div>
            <button class="btn btn-secondary btn-sm" :disabled="loadingMap" @click="reloadMap">
              刷新状态
            </button>
            <button
              v-if="!selectedBuilding"
              type="button"
              :class="['btn', 'btn-sm', calibrateMode ? 'cal-on' : 'btn-secondary']"
              @click="calibrateMode = !calibrateMode"
            >
              {{ calibrateMode ? '退出校准' : '校准落位' }}
            </button>
          </div>
        </div>

        <p v-if="usingDemo" class="demo-note">
          当前发布还没有登记到具体门牌。黄、绿是按楼栋骨架生成的示意房间。
        </p>
        <p v-if="error" class="error-msg">{{ error }}</p>

        <BuildingRooms3D
          v-if="selectedBuilding"
          :building="selectedBuilding"
          :rooms="selectedBuildingRooms"
          :community-id="campusCommunityId"
          :unit-label="selectedPub?.unit || '份'"
          :simulated="usingDemo"
          @back="clearBuilding"
        />
        <CommunityCampus3D
          v-else
          :phases="campusPhases"
          :selected-key="selectedBuildingKey"
          :building-stats="buildingStats"
          :community-id="campusCommunityId"
          :calibrate="calibrateMode"
          @select="onCampusSelect"
        />
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getDeliveryMap, getPhases, listPublications } from '../api/cockpit'
import BuildingRooms3D from '../components/BuildingRooms3D.vue'
import CommunityCampus3D from '../components/CommunityCampus3D.vue'
import { aggregateBuildingOrderStats } from '../utils/campusOrderStats'
import { buildDemoRooms, roomsOfBuilding } from '../utils/campusFloorGrid'

const loadingPubs = ref(false)
const loadingMap = ref(false)
const error = ref('')
const pubs = ref([])
const selectedId = ref('')
const selectedPub = ref(null)
const deliveryMap = ref(null)
/** 园区 3D：整小区楼栋骨架 */
const campusPhases = ref([])
const phaseId = ref('')
const buildingId = ref('')
const calibrateMode = ref(false)
const previewMode = ref(false)

const communityPubs = computed(() =>
  (pubs.value || []).filter((p) => !p.scope || p.scope === 'community')
)

const campusCommunityId = computed(
  () => selectedPub.value?.communityId || deliveryMap.value?.communityId || 'hengda_mingdu'
)

const selectedBuildingKey = computed(() =>
  phaseId.value && buildingId.value ? `${phaseId.value}_${buildingId.value}` : ''
)

const realRooms = computed(() => deliveryMap.value?.rooms || [])
const usingDemo = computed(() => {
  if (previewMode.value) return true
  if (!selectedId.value || loadingMap.value) return false
  return realRooms.value.length === 0
})
const displayRooms = computed(() => {
  if (!usingDemo.value) return realRooms.value
  return buildDemoRooms(campusPhases.value, campusCommunityId.value, selectedId.value || 'preview')
})
const summary = computed(() => {
  let pending = 0
  let completed = 0
  for (const room of displayRooms.value) {
    if (room.status === 'pending') pending += 1
    else if (room.status === 'completed') completed += 1
  }
  return { pending, completed }
})

const selectedBuilding = computed(() => {
  if (!phaseId.value || !buildingId.value) return null
  for (const phase of campusPhases.value || []) {
    if (phase.id !== phaseId.value) continue
    const building = (phase.buildings || []).find((item) => String(item.id) === String(buildingId.value))
    if (!building) return null
    return {
      ...building,
      phaseId: phase.id,
      phaseName: phase.name || phase.id,
      buildingId: String(building.id),
      name: building.name || `${building.id}号楼`,
      floors: building.maxFloor
    }
  }
  return null
})

const selectedBuildingRooms = computed(() =>
  roomsOfBuilding(displayRooms.value, phaseId.value, buildingId.value)
)

/** 3D 楼栋着色：按 phaseId_buildingId 聚合待派送/已配送房间数 */
const buildingStats = computed(() => aggregateBuildingOrderStats(displayRooms.value))

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
  previewMode.value = false
  selectedId.value = pub.id
  selectedPub.value = pub
  deliveryMap.value = null
  phaseId.value = ''
  buildingId.value = ''
  calibrateMode.value = false
  await Promise.all([reloadMap(), loadPhaseSkeleton(pub)])
}

async function openPreview() {
  previewMode.value = true
  selectedId.value = 'preview'
  selectedPub.value = {
    id: 'preview',
    title: '恒大名都 · 示意',
    communityId: 'hengda_mingdu',
    communityName: '宜昌·恒大名都',
    status: 'active',
    unit: '份'
  }
  deliveryMap.value = { rooms: [], pendingCount: 0, completedCount: 0 }
  phaseId.value = ''
  buildingId.value = ''
  calibrateMode.value = false
  error.value = ''
  try {
    campusPhases.value = (await getPhases('hengda_mingdu')) || []
  } catch (e) {
    error.value = e.message || '加载楼栋失败'
  }
}

function clearBuilding() {
  phaseId.value = ''
  buildingId.value = ''
}

/** 点击 3D 楼栋：高亮选中（校准模式不触发） */
function onCampusSelect({ phaseId: pid, buildingId: bid }) {
  if (calibrateMode.value) return
  if (!pid || !bid) return
  phaseId.value = pid
  buildingId.value = bid
}

async function reloadMap() {
  if (!selectedId.value || previewMode.value) return
  loadingMap.value = true
  error.value = ''
  try {
    deliveryMap.value = await getDeliveryMap(selectedId.value)
  } catch (e) {
    error.value = e.message || '加载配送状态失败'
  } finally {
    loadingMap.value = false
  }
}

async function loadPhaseSkeleton(pub) {
  const communityId = pub.communityId || deliveryMap.value?.communityId
  if (!communityId) {
    error.value = '该发布未绑定小区'
    return
  }
  try {
    campusPhases.value = (await getPhases(communityId)) || []
  } catch (e) {
    error.value = e.message || '加载楼栋失败'
  }
}

onMounted(loadPubs)
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

.panel-head h2,
.map-title strong {
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
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
}

.pub-item:hover {
  background: #f3f5f4;
}

.pub-item.active {
  background: #ecfdf5;
  border-color: #a7f3d0;
}

.empty-pubs {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6rem;
}

.demo-note {
  margin: 0 0 0.75rem;
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  background: #fffbeb;
  color: #92400e;
  font-size: 0.8125rem;
}

.pub-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.pub-meta {
  margin-top: 0.25rem;
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.map-panel {
  display: flex;
  flex-direction: column;
  min-height: 520px;
  padding: 1rem;
}

.map-toolbar {
  display: flex;
  flex-wrap: wrap;
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

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.legend {
  display: flex;
  gap: 0.5rem;
  font-size: 0.75rem;
}

.leg {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}

.leg.pending {
  background: #fef3c7;
  color: #92400e;
}

.leg.completed {
  background: #d1fae5;
  color: #065f46;
}

.leg.empty {
  background: #f3f4f6;
  color: #6b7280;
}

.cal-on {
  background: #0d9488;
  color: #fff;
}

.empty-hint {
  margin: auto;
  color: var(--muted);
}

.error-msg {
  color: var(--danger);
  font-size: 0.875rem;
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
