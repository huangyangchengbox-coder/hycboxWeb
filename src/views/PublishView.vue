<template>
  <div class="page">
    <section class="card">
      <div class="head">
        <div>
          <h2>发布物品</h2>
          <p class="sub">与小程序「发布管理」共用同一批数据。小区多选期数时，每一期各发一条。</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" :disabled="loading" @click="loadList">
          刷新
        </button>
      </div>

      <form class="form" @submit.prevent="onSubmit">
        <div class="form-group">
          <label>发布地域</label>
          <select v-model="form.scope">
            <option value="community">小区闪送</option>
            <option value="nationwide">物流中国（全国）</option>
            <option value="village">村村送</option>
          </select>
        </div>

        <template v-if="form.scope === 'community'">
          <div class="form-group">
            <label>小区</label>
            <select v-model="form.communityId">
              <option v-for="item in communities" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div v-if="phases.length" class="form-group">
            <label>面向范围</label>
            <div class="checks">
              <label v-for="phase in phases" :key="phase.id" class="check">
                <input v-model="form.phaseIds" type="checkbox" :value="phase.id" />
                <span>{{ phase.name }}</span>
              </label>
            </div>
            <p class="hint">全选时按整个小区发一条；只勾选部分时，每一期各发一条。</p>
          </div>
        </template>
        <p v-else-if="form.scope === 'nationwide'" class="hint">面向全国用户（物流中国）</p>
        <p v-else class="hint">村村送：用户地图选点，管理员可导航上门</p>

        <div class="form-group">
          <label>物品名称</label>
          <input v-model="form.title" type="text" maxlength="80" placeholder="如 新鲜苹果" />
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>计量单位</label>
            <select v-model="form.unit">
              <option v-for="unit in unitOptions" :key="unit" :value="unit">{{ unit }}</option>
            </select>
          </div>
          <div v-if="form.unit === '其他'" class="form-group">
            <label>自定义单位</label>
            <input v-model="form.customUnit" type="text" maxlength="8" placeholder="如 捆 / 盒" />
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label>数量（{{ currentUnit }}）</label>
            <input v-model="form.totalBags" type="number" min="1" step="1" placeholder="总数量" />
          </div>
          <div class="form-group">
            <label>单价（元 / {{ currentUnit }}）</label>
            <input v-model="form.unitPrice" type="number" min="0" step="0.01" placeholder="如 15.00" />
          </div>
        </div>

        <div class="form-group">
          <label>图片（最多 9 张）</label>
          <div class="thumbs">
            <div v-for="(url, index) in form.imageUrls" :key="url" class="thumb">
              <img :src="url" alt="" />
              <button type="button" class="thumb-del" @click="removeImage(index)">×</button>
            </div>
            <label v-if="form.imageUrls.length < 9" class="thumb-add">
              <input type="file" accept="image/*" multiple :disabled="uploading" @change="onPickImages" />
              {{ uploading ? '上传中…' : '+' }}
            </label>
          </div>
        </div>

        <button class="btn" type="submit" :disabled="submitting || uploading">
          {{ submitting ? '发布中…' : '发布' }}
        </button>
        <p v-if="formError" class="error-msg">{{ formError }}</p>
      </form>
    </section>

    <section class="card">
      <h2>已发布物品</h2>
      <p v-if="loading" class="muted">加载中…</p>
      <p v-else-if="listError" class="error-msg">{{ listError }}</p>
      <p v-else-if="!publications.length" class="muted">暂无发布</p>
      <ul v-else class="pub-list">
        <li v-for="item in publications" :key="item.id" class="pub-row">
          <img v-if="coverOf(item)" class="cover" :src="coverOf(item)" alt="" />
          <div class="pub-main">
            <div class="pub-title-row">
              <strong>{{ item.title }}</strong>
              <span :class="['status-tag', item.status === 'active' ? '' : 'pending']">
                {{ item.status === 'active' ? '进行中' : '已结束' }}
              </span>
            </div>
            <p class="muted">
              {{ scopeLabel(item) }}
              · 剩余 {{ item.remainBags }}/{{ item.totalBags }} {{ item.unit || '袋' }}
              · ¥{{ item.unitPrice != null ? item.unitPrice : '-' }}
            </p>
            <p class="muted">{{ item.createdAt }}</p>
          </div>
          <button
            class="btn btn-danger btn-sm"
            type="button"
            :disabled="deletingId === item.id"
            @click="onDelete(item)"
          >
            {{ deletingId === item.id ? '删除中…' : '删除' }}
          </button>
        </li>
      </ul>
      <p v-if="toast" class="toast">{{ toast }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  createPublication,
  deletePublication,
  listCommunities,
  listMyPublications,
  uploadImage
} from '../api/publications'

const unitOptions = ['袋', '箱', '个', '份', '件', '其他']

const communities = ref([])
const publications = ref([])
const loading = ref(true)
const submitting = ref(false)
const uploading = ref(false)
const deletingId = ref('')
const formError = ref('')
const listError = ref('')
const toast = ref('')
let toastTimer = 0

const form = reactive({
  scope: 'community',
  communityId: '',
  phaseIds: [],
  title: '',
  unit: '袋',
  customUnit: '',
  totalBags: '',
  unitPrice: '',
  imageUrls: []
})

const currentCommunity = computed(() =>
  communities.value.find((item) => item.id === form.communityId) || null
)
const phases = computed(() => currentCommunity.value?.phases || [])
const currentUnit = computed(() => {
  if (form.unit !== '其他') return form.unit
  return (form.customUnit || '').trim() || '其他'
})

watch(phases, (list) => {
  form.phaseIds = list.map((item) => item.id)
})

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 1800)
}

function scopeLabel(item) {
  if (item.scope === 'nationwide') return '物流中国'
  if (item.scope === 'village') return '村村送'
  const place = item.communityName || '小区'
  return item.phaseName ? `${place} · ${item.phaseName}` : `${place} · 全部期`
}

function coverOf(item) {
  return item.imageUrl || (item.images && item.images[0]) || ''
}

async function loadCommunities() {
  const list = await listCommunities()
  communities.value = Array.isArray(list) ? list : []
  if (!form.communityId && communities.value.length) {
    form.communityId = communities.value[0].id
  }
}

async function loadList() {
  loading.value = true
  listError.value = ''
  try {
    const data = await listMyPublications()
    publications.value = data?.list || []
  } catch (err) {
    listError.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function removeImage(index) {
  form.imageUrls.splice(index, 1)
}

async function onPickImages(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  const remain = 9 - form.imageUrls.length
  if (!files.length || remain <= 0) return
  uploading.value = true
  formError.value = ''
  try {
    const picked = files.slice(0, remain)
    const urls = []
    for (const file of picked) {
      urls.push(await uploadImage(file))
    }
    form.imageUrls.push(...urls)
  } catch (err) {
    formError.value = err?.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

function resolveUnit() {
  if (form.unit !== '其他') return form.unit
  return (form.customUnit || '').trim()
}

function buildPayloads() {
  const unit = resolveUnit()
  const bags = Number(form.totalBags)
  const price = Number(form.unitPrice)
  if (!(form.title || '').trim()) throw new Error('请填写名称')
  if (!unit) throw new Error('请填写计量单位')
  if (!Number.isFinite(bags) || bags <= 0) throw new Error('请填写有效数量')
  if (form.unitPrice === '' || !Number.isFinite(price) || price < 0) throw new Error('请填写单价')

  const base = {
    title: form.title.trim(),
    totalBags: bags,
    unit,
    unitPrice: price,
    imageUrls: form.imageUrls.slice(),
    imageUrl: form.imageUrls[0] || '',
    scope: form.scope
  }

  if (form.scope !== 'community') return [base]

  const community = currentCommunity.value
  if (!community) throw new Error('请选择小区')
  const selected = phases.value.filter((phase) => form.phaseIds.includes(phase.id))
  if (phases.value.length && selected.length === 0) throw new Error('请至少勾选一期')
  const allSelected = !phases.value.length || selected.length === phases.value.length
  if (allSelected) {
    return [{ ...base, communityId: community.id }]
  }
  return selected.map((phase) => ({
    ...base,
    communityId: community.id,
    phaseId: phase.id
  }))
}

function resetForm() {
  form.title = ''
  form.totalBags = ''
  form.unitPrice = ''
  form.unit = '袋'
  form.customUnit = ''
  form.imageUrls = []
  form.scope = 'community'
  form.phaseIds = phases.value.map((item) => item.id)
}

async function onSubmit() {
  formError.value = ''
  let payloads
  try {
    payloads = buildPayloads()
  } catch (err) {
    formError.value = err.message
    return
  }
  submitting.value = true
  try {
    for (const payload of payloads) {
      await createPublication(payload)
    }
    resetForm()
    showToast(payloads.length > 1 ? `已发布 ${payloads.length} 期` : '发布成功')
    await loadList()
  } catch (err) {
    formError.value = err?.message || '发布失败'
    await loadList()
  } finally {
    submitting.value = false
  }
}

async function onDelete(item) {
  const title = item.title || '该物品'
  const ok = window.confirm(`确定删除「${title}」？删除后用户端不再显示。已有登记的订单仍会保留。`)
  if (!ok) return
  deletingId.value = item.id
  listError.value = ''
  try {
    await deletePublication(item.id)
    showToast('已删除')
    await loadList()
  } catch (err) {
    listError.value = err?.message || '删除失败'
  } finally {
    deletingId.value = ''
  }
}

onMounted(async () => {
  try {
    await loadCommunities()
  } catch (err) {
    formError.value = err?.message || '小区列表加载失败'
  }
  await loadList()
})
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

h2 {
  margin: 0 0 0.35rem;
  font-size: 1.15rem;
}

.sub,
.hint,
.muted {
  margin: 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.hint {
  margin-bottom: 1rem;
}

.checks {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: 0 0 auto;
  white-space: nowrap;
  color: var(--text);
}

.thumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.thumb,
.thumb-add {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 8px;
  border: 1px dashed var(--border);
  overflow: hidden;
  background: #f9fafb;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 1.25rem;
  height: 1.25rem;
  border: none;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.65);
  color: #fff;
  cursor: pointer;
}

.thumb-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 1.5rem;
  cursor: pointer;
}

.thumb-add input {
  display: none;
}

.pub-list {
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.pub-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 0;
  border-top: 1px solid var(--border);
}

.cover {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  background: #f3f4f6;
}

.pub-main {
  flex: 1;
  min-width: 0;
}

.pub-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-danger {
  background: #fff;
  color: var(--danger);
  border: 1px solid #fecaca;
  flex-shrink: 0;
}

.btn-danger:hover:not(:disabled) {
  background: #fef2f2;
}

.toast {
  margin: 0.75rem 0 0;
  color: var(--accent-dark);
  font-size: 0.875rem;
}
</style>
