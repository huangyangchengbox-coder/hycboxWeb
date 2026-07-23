<template>
  <div class="cockpit">
    <aside class="pub-panel card">
      <div class="panel-head">
        <h2>发布列表</h2>
        <button class="btn btn-secondary btn-sm" :disabled="loadingPubs" @click="loadPubs">刷新</button>
      </div>
      <p v-if="loadingPubs" class="muted">加载中…</p>
      <p v-else-if="!communityPubs.length" class="muted">暂无小区闪送发布</p>
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
              待派送 {{ deliveryMap?.pendingCount ?? 0 }} · 已配送 {{ deliveryMap?.completedCount ?? 0 }}
            </span>
          </div>
          <div class="toolbar-right">
            <div class="view-tabs">
              <button
                type="button"
                :class="['tab-btn', { active: viewMode === 'campus' }]"
                @click="viewMode = 'campus'"
              >
                园区 3D
              </button>
              <button
                type="button"
                :class="['tab-btn', { active: viewMode === 'floor' }]"
                @click="viewMode = 'floor'"
              >
                楼层 2D
              </button>
            </div>
            <div class="legend">
              <span class="leg pending">待派送</span>
              <span class="leg completed">已配送</span>
              <span class="leg empty">无订单</span>
            </div>
            <button
              v-if="viewMode === 'campus'"
              class="btn btn-secondary btn-sm"
              :disabled="loadingMap"
              @click="reloadMap"
            >
              刷新状态
            </button>
            <button
              v-if="viewMode === 'campus'"
              type="button"
              :class="['btn', 'btn-sm', calibrateMode ? 'cal-on' : 'btn-secondary']"
              @click="calibrateMode = !calibrateMode"
            >
              {{ calibrateMode ? '退出校准' : '校准落位' }}
            </button>
          </div>
        </div>

        <div v-if="viewMode === 'floor'" class="selectors">
          <label>
            期数
            <select v-model="phaseId" @change="onPhaseChange">
              <option v-for="p in phases" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </label>
          <label>
            楼栋
            <select v-model="buildingId" @change="onBuildingChange">
              <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </label>
          <label>
            单元
            <select v-model.number="unit" @change="loadRooms">
              <option v-for="u in unitOptions" :key="u" :value="u">{{ u }} 单元</option>
            </select>
          </label>
          <button class="btn btn-secondary btn-sm" :disabled="loadingMap" @click="reloadMap">刷新状态</button>
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-else-if="viewMode === 'floor' && (loadingMap || loadingRooms)" class="muted">加载楼栋中…</p>

        <CommunityCampus3D
          v-else-if="viewMode === 'campus'"
          :phases="campusPhases"
          :selected-key="selectedBuildingKey"
          :building-stats="buildingStats"
          :community-id="campusCommunityId"
          :calibrate="calibrateMode"
          @select="onCampusSelect"
        />

        <div v-else class="floor-board">
          <div v-for="floor in floorsDesc" :key="floor" class="floor-row">
            <div class="floor-label">{{ floor }}F</div>
            <div class="room-row">
              <button
                v-for="room in roomsByFloor[floor] || []"
                :key="room.id"
                type="button"
                :class="['room-cell', roomStatus(room.id)]"
                :title="roomTip(room)"
              >
                {{ room.roomNo }}
              </button>
            </div>
          </div>
          <p v-if="!floorsDesc.length" class="muted">该单元暂无房间数据</p>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { getDeliveryMap, getPhases, getRooms, listPublications } from '../api/cockpit'
import CommunityCampus3D from '../components/CommunityCampus3D.vue'
import { aggregateBuildingOrderStats } from '../utils/campusOrderStats'

const loadingPubs = ref(false)
const loadingMap = ref(false)
const loadingRooms = ref(false)
const error = ref('')
const pubs = ref([])
const selectedId = ref('')
const selectedPub = ref(null)
const deliveryMap = ref(null)
/** 楼层 2D 用（可能按发布期数过滤） */
const phases = ref([])
/** 园区 3D 用：整小区楼栋骨架 */
const campusPhases = ref([])
const phaseId = ref('')
const buildingId = ref('')
const unit = ref(1)
const rooms = ref([])
const statusByRoom = ref({})
/** campus | floor：第一步默认园区 3D */
const viewMode = ref('campus')
/** 总平校准：拖拽楼栋落位 */
const calibrateMode = ref(false)

const communityPubs = computed(() =>
  (pubs.value || []).filter((p) => !p.scope || p.scope === 'community')
)

const campusCommunityId = computed(
  () => selectedPub.value?.communityId || deliveryMap.value?.communityId || 'hengda_mingdu'
)

const buildings = computed(() => {
  const phase = phases.value.find((p) => p.id === phaseId.value)
  return phase?.buildings || []
})

const currentBuilding = computed(() => buildings.value.find((b) => b.id === buildingId.value))

const selectedBuildingKey = computed(() =>
  phaseId.value && buildingId.value ? `${phaseId.value}_${buildingId.value}` : ''
)

/** 3D 楼栋着色：按 phaseId_buildingId 聚合待派送/已配送房间数 */
const buildingStats = computed(() =>
  aggregateBuildingOrderStats(deliveryMap.value?.rooms || [])
)

const unitOptions = computed(() => {
  const n = Number(currentBuilding.value?.units) || 1
  return Array.from({ length: n }, (_, i) => i + 1)
})

const roomsByFloor = computed(() => {
  const map = {}
  for (const room of rooms.value) {
    const floor = parseFloor(room.roomNo)
    if (floor == null) continue
    if (!map[floor]) map[floor] = []
    map[floor].push(room)
  }
  Object.keys(map).forEach((f) => {
    map[f].sort((a, b) => String(a.roomNo).localeCompare(String(b.roomNo)))
  })
  return map
})

const floorsDesc = computed(() =>
  Object.keys(roomsByFloor.value)
    .map(Number)
    .sort((a, b) => b - a)
)

function parseFloor(roomNo) {
  const digits = String(roomNo || '').replace(/\D/g, '')
  if (digits.length < 3) return null
  return Math.floor(Number(digits) / 100)
}

function roomStatus(roomId) {
  return statusByRoom.value[roomId] || 'empty'
}

function roomTip(room) {
  const st = statusByRoom.value[room.id]
  const label = st === 'pending' ? '待派送' : st === 'completed' ? '已配送' : '无订单'
  return `${room.label || room.roomNo} · ${label}`
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
  deliveryMap.value = null
  rooms.value = []
  statusByRoom.value = {}
  phaseId.value = ''
  buildingId.value = ''
  unit.value = 1
  viewMode.value = 'campus'
  calibrateMode.value = false
  await Promise.all([reloadMap(), loadPhaseSkeleton(pub)])
}

/** 点击 3D 楼栋 → 切到楼层 2D（校准模式不触发） */
function onCampusSelect({ phaseId: pid, buildingId: bid }) {
  if (calibrateMode.value) return
  if (!pid || !bid) return
  // 若发布限定期数且点了其他期，仍允许用整区骨架切换（phases 可能被过滤）
  if (!phases.value.find((p) => p.id === pid)) {
    const full = campusPhases.value.find((p) => p.id === pid)
    if (full) {
      phases.value = [...phases.value, full]
    }
  }
  phaseId.value = pid
  buildingId.value = bid
  unit.value = 1
  viewMode.value = 'floor'
  loadRooms()
}

async function reloadMap() {
  if (!selectedId.value) return
  loadingMap.value = true
  error.value = ''
  try {
    const data = await getDeliveryMap(selectedId.value)
    deliveryMap.value = data
    const map = {}
    for (const r of data?.rooms || []) {
      if (r.roomId) map[r.roomId] = r.status
    }
    statusByRoom.value = map
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
    const list = await getPhases(communityId)
    const all = list || []
    campusPhases.value = all
    let next = all
    if (pub.phaseId) {
      next = all.filter((p) => p.id === pub.phaseId)
    }
    phases.value = next.length ? next : all
    phaseId.value = phases.value[0]?.id || ''
    onPhaseChange()
  } catch (e) {
    error.value = e.message || '加载楼栋失败'
  }
}

function onPhaseChange() {
  const list = buildings.value
  buildingId.value = list[0]?.id || ''
  onBuildingChange()
}

function onBuildingChange() {
  unit.value = 1
  loadRooms()
}

async function loadRooms() {
  const pub = selectedPub.value
  const communityId = pub?.communityId || deliveryMap.value?.communityId
  if (!communityId || !phaseId.value || !buildingId.value) {
    rooms.value = []
    return
  }
  loadingRooms.value = true
  try {
    rooms.value = (await getRooms(communityId, phaseId.value, buildingId.value, unit.value)) || []
  } catch (e) {
    error.value = e.message || '加载房间失败'
    rooms.value = []
  } finally {
    loadingRooms.value = false
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
  min-height: 480px;
}

.empty-hint {
  margin: auto;
  color: var(--muted);
}

.map-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
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
  gap: 0.75rem;
  align-items: center;
}

.view-tabs {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.tab-btn {
  border: 0;
  background: #fff;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
  color: var(--muted);
}

.tab-btn.active {
  background: #ecfdf5;
  color: var(--accent-dark);
  font-weight: 600;
}

.legend {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.leg {
  font-size: 0.75rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.leg.pending {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

.leg.completed {
  background: #d1fae5;
  color: #065f46;
  border-color: #10b981;
}

.leg.empty {
  background: #f3f4f6;
  color: #6b7280;
}

.selectors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 1rem;
}

.selectors label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--muted);
}

.selectors select {
  min-width: 120px;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}

.floor-board {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  background: #f8faf9;
  max-height: calc(100vh - 260px);
}

.floor-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.floor-label {
  width: 2.5rem;
  flex-shrink: 0;
  text-align: right;
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 600;
}

.room-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.room-cell {
  min-width: 3.2rem;
  padding: 0.35rem 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 0.75rem;
  cursor: default;
  background: #e5e7eb;
  color: #4b5563;
}

.room-cell.pending {
  background: #fbbf24;
  border-color: #d97706;
  color: #78350f;
  font-weight: 600;
}

.room-cell.completed {
  background: #34d399;
  border-color: #059669;
  color: #064e3b;
  font-weight: 600;
}

.muted {
  color: var(--muted);
  font-size: 0.875rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
}

.cal-on {
  background: #ea580c;
  color: #fff;
  border: 0;
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
}
</style>
