<template>
  <div class="wild">
    <canvas ref="canvasRef" class="wild-canvas"></canvas>
    <WorldMenu>
      <button type="button" class="wm-link ghost" @click="openSection('world')">返回地球</button>
      <button type="button" class="wm-link ghost" @click="toggleRoam">{{ freeRoam ? '退出漫游' : '自由漫游' }}</button>
      <button type="button" class="wm-link ghost" @click="toggleMotion">{{ reduced ? '恢复动效' : '减少动效' }}</button>
      <router-link class="wm-link ghost" to="/home">经典地球</router-link>
    </WorldMenu>

    <header class="wild-top">
      <div>
        <div class="kicker">WILDLIFE WORLD</div>
        <h1>{{ title }}</h1>
      </div>
      <p>{{ subtitle }}</p>
      <div class="stats">
        <span>{{ habitats.length }} 个生态区</span>
        <span>{{ animals.length }} 个物种</span>
        <span>示意图，非摄影</span>
      </div>
    </header>

    <select class="section-select" :value="section" @change="openSection($event.target.value)">
      <option v-for="item in sections" :key="item.id" :value="item.id">{{ item.name }}</option>
    </select>

    <nav class="wild-nav">
      <button
        v-for="item in sections"
        :key="item.id"
        type="button"
        class="nav-item"
        :class="{ active: section === item.id }"
        @click="openSection(item.id)"
      >
        <span class="nav-en">{{ item.en }}</span>
        <span class="nav-zh">{{ item.name }}</span>
      </button>
    </nav>

    <div class="wild-labels">
      <button
        v-for="lab in labels"
        :key="lab.id"
        type="button"
        class="pin"
        :class="{ selected: lab.selected }"
        :style="{ transform: `translate(${lab.x}px, ${lab.y}px)` }"
        @click.stop="onLabel(lab)"
      >
        {{ lab.name }}
      </button>
    </div>

    <aside v-if="moduleSection" class="dossier">
      <template v-if="section === 'food'">
        <div class="en">FOOD WEB</div>
        <h2>草原食物网</h2>
        <p>点一个物种，高亮它吃什么。这是示意关系，不是完整生态调查。</p>
        <button
          v-for="node in foodLinks"
          :key="node.id"
          type="button"
          class="chain"
          :class="{ on: foodActive.has(node.id) }"
          @click="foodFocus = node.id"
        >
          <strong>{{ node.name }}</strong>
          <span>{{ node.role }}</span>
          <em v-if="node.eats.length">吃 {{ eatenNames(node) }}</em>
        </button>
      </template>
      <template v-else-if="section === 'sounds'">
        <div class="en">SOUNDS</div>
        <h2>声音示意</h2>
        <p>下面的声音由浏览器合成，用来区分高低和节奏，不是野外录音。</p>
        <button v-for="item in sounds" :key="item.id" type="button" class="chain" @click="playSound(item)">
          <strong>{{ item.name }}</strong>
          <span>{{ item.note }}</span>
        </button>
      </template>
      <template v-else-if="section === 'lifecycle'">
        <div class="en">LIFE CYCLE</div>
        <h2>绿海龟</h2>
        <p>{{ lifeStages[stage].text }}</p>
        <div class="chips">
          <button v-for="(item, index) in lifeStages" :key="item.id" type="button" class="chip-btn" :class="{ on: stage === index }" @click="stage = index">{{ item.name }}</button>
        </div>
      </template>
      <template v-else-if="section === 'conservation'">
        <div class="en">IUCN</div>
        <h2>保护专区</h2>
        <p>等级取自公开类别，以 iucnredlist.org 最新评估为准。这里只列出本站已收录、且不是无危的物种。</p>
        <button v-for="item in threatened" :key="item.id" type="button" class="chain" @click="openAnimal(item)">
          <strong>{{ item.name }}</strong>
          <span>{{ item.status }}</span>
          <em>{{ threatText(item.status) }}</em>
        </button>
      </template>
      <template v-else-if="section === 'quiz'">
        <div class="en">QUIZ</div>
        <h2>{{ quizDone ? '挑战结束' : `第 ${quizIndex + 1} / ${quiz.length} 题` }}</h2>
        <template v-if="!quizDone">
          <p>{{ quiz[quizIndex].q }}</p>
          <button
            v-for="(option, index) in quiz[quizIndex].options"
            :key="option"
            type="button"
            class="chain"
            :class="{ on: quizPick === index, bad: quizPick === index && index !== quiz[quizIndex].answer }"
            @click="answerQuiz(index)"
          >{{ option }}</button>
          <button v-if="quizPick !== null" type="button" class="solid" @click="nextQuiz">{{ quizIndex === quiz.length - 1 ? '查看徽章' : '下一题' }}</button>
        </template>
        <template v-else>
          <p>答对 {{ quizScore }} / {{ quiz.length }}。</p>
          <p v-if="quizScore + 1 >= quiz.length">徽章：地球观察员。这是站内练习，不是认证证书。</p>
          <p v-else>再看一遍北极和南极的分布，然后可以重来。</p>
          <button type="button" class="solid" @click="resetQuiz">再来一次</button>
        </template>
      </template>
      <template v-else-if="section === 'lab'">
        <div class="en">ECO LAB</div>
        <h2>森林数量示意</h2>
        <p>草、鹿、狼按简化规则互相影响。这不是预测模型。</p>
        <label>狼 {{ wolves }}<input v-model.number="wolves" type="range" min="0" max="12" step="1" /></label>
        <label>鹿 {{ deer }}<input v-model.number="deer" type="range" min="0" max="30" step="1" /></label>
        <label>草 {{ grass }}<input v-model.number="grass" type="range" min="0" max="100" step="1" /></label>
        <button type="button" class="solid" @click="stepLab">推演一步</button>
        <p>{{ labNote }}</p>
      </template>
      <template v-else-if="section === 'migration'">
        <div class="en">MIGRATION</div>
        <h2>三条路线</h2>
        <p>拖动月份，光点沿路线移动。较短的路线在地球上被放大，方便看见走向，不是精确航迹。</p>
        <button v-for="item in migrations" :key="item.id" type="button" class="chain">
          <strong>{{ item.name }}</strong>
          <span>{{ item.months }}</span>
          <em>{{ item.summary }} {{ item.risk }}</em>
        </button>
      </template>
      <template v-else-if="section === 'snakes'">
        <div class="en">SNAKES</div>
        <h2>蛇族图鉴</h2>
        <p>形态是参数化示意，不是照片，也不能当野外鉴定。本页不教如何靠近或捕捉蛇。</p>
        <div class="chips">
          <button v-for="item in snakeTabs" :key="item.id" type="button" class="chip-btn" :class="{ on: snakeTab === item.id }" @click="snakeTab = item.id">{{ item.name }}</button>
        </div>
        <template v-if="snakeTab === 'atlas'">
          <button v-for="item in snakes" :key="item.id" type="button" class="chain" :class="{ on: snakeId === item.id }" @click="pickSnake(item.id)">
            <strong>{{ item.name }}</strong>
            <span>{{ item.venom }} · {{ item.family }}</span>
            <em>{{ item.scientificName }}</em>
          </button>
          <h2>{{ currentSnake.name }}</h2>
          <div class="latin">{{ currentSnake.scientificName }}</div>
          <p>{{ currentSnake.summary }}</p>
          <dl>
            <dt>体长</dt><dd>{{ currentSnake.length }}</dd>
            <dt>毒性</dt><dd>{{ currentSnake.venom }} · {{ currentSnake.venomKind }}</dd>
            <dt>食性</dt><dd>{{ currentSnake.diet }}</dd>
            <dt>分布</dt><dd>{{ currentSnake.range }}</dd>
            <dt>易混淆</dt><dd>{{ currentSnake.lookalike }}</dd>
            <dt>保护</dt><dd>{{ currentSnake.protection }}</dd>
            <dt>IUCN</dt><dd>{{ currentSnake.iucn }}</dd>
          </dl>
          <button type="button" class="solid" @click="snakeTab = 'range'">看省级记录</button>
        </template>
        <template v-else-if="snakeTab === 'fangs'">
          <p>头是不是三角形，说明不了有没有毒。银环蛇头较圆，却是剧毒；王锦蛇头有时显得较宽，却没有毒液。</p>
          <button v-for="item in fangTypes" :key="item.id" type="button" class="chain" :class="{ on: fangId === item.id }" @click="fangId = item.id">
            <strong>{{ item.name }}</strong>
            <em>{{ item.text }}</em>
          </button>
          <h2>毒液大致分成三类</h2>
          <button v-for="item in venomKinds" :key="item.id" type="button" class="chain">
            <strong>{{ item.name }}</strong>
            <span>{{ item.sample }}</span>
            <em>{{ item.text }}</em>
          </button>
        </template>
        <template v-else-if="snakeTab === 'body'">
          <p>下面四种运动只改变示意姿态，不是力学模拟。</p>
          <button v-for="item in snakeMoves" :key="item.id" type="button" class="chain" :class="{ on: snakePose === item.id }" @click="snakePose = item.id">
            <strong>{{ item.name }}</strong>
            <em>{{ item.text }}</em>
          </button>
          <button v-if="currentSnake.hood" type="button" class="solid" @click="snakeHood = !snakeHood">{{ snakeHood ? '收起兜帽' : '展开兜帽' }}</button>
          <button v-if="currentSnake.pit" type="button" class="solid" @click="snakeThermal = !snakeThermal">{{ snakeThermal ? '关闭热感示意' : '颊窝热感示意' }}</button>
          <p v-if="snakeThermal">橙点只表示颊窝的位置。这不是热成像，也看不到真实温度。</p>
          <p>蛇没有外耳，能感到地面震动。分叉的舌把气味送进犁鼻器。蜕下的皮可以连眼上的透明鳞一起脱落。</p>
        </template>
        <template v-else-if="snakeTab === 'aid'">
          <p class="warn">本页是科普示意，不能替代医疗处置。被咬后一律尽快就医。口径依据 WHO 蛇咬伤公开建议。</p>
          <h2>应该做</h2>
          <p v-for="item in aidRight" :key="item">{{ item }}</p>
          <h2>不要做</h2>
          <p v-for="item in aidWrong" :key="item">{{ item }}</p>
          <p>神经毒性咬伤在有训练时可以做加压固定，不要勒成止血带。没有把握就不要绑，直接送医。</p>
        </template>
        <template v-else-if="snakeTab === 'protect'">
          <p>眼镜王蛇列入 2021 年版《国家重点保护野生动物名录》二级。缅甸蟒列入同一名录一级。王锦蛇、黑眉锦蛇、翠青蛇等列入 2023 年调整的“三有”名录。</p>
          <p>一条锦蛇一年能吃下不少鼠。蛇毒也是研究抗血栓药物的材料来源。这些理由都不需要把蛇抓回来。</p>
          <p>看到蛇：打草惊蛇、绕行离开、不捕捉、不买卖、不打死。</p>
          <button v-for="item in snakes" :key="item.id" type="button" class="chain" @click="pickSnake(item.id)">
            <strong>{{ item.name }}</strong>
            <span>{{ item.protection }}</span>
          </button>
        </template>
        <template v-else>
          <p>这一版不绘制中国政区图。现有中国底图没有南海诸岛和九段线，不能拿来当分布底图。下面只列省级记录，不是精确活动点。</p>
          <div class="chips">
            <button type="button" class="chip-btn" :class="{ on: rangeMode === 'china' }" @click="rangeMode = 'china'">中国记录</button>
            <button type="button" class="chip-btn" :class="{ on: rangeMode === 'world' }" @click="rangeMode = 'world'">动物地理分区</button>
          </div>
          <template v-if="rangeMode === 'china'">
            <button v-for="item in snakes.filter((snake) => snake.china)" :key="item.id" type="button" class="chip-btn" :class="{ on: snakeId === item.id }" @click="pickSnake(item.id)">{{ item.name }}</button>
            <h2>{{ currentSnake.name }}</h2>
            <p v-if="!currentSnake.china">{{ currentSnake.range }}</p>
            <p v-else-if="snakeProvinces.length">记录省份：{{ snakeProvinces.join('、') }}。名单来自公开分布描述的节选，不是完整名录。</p>
            <p v-else>本期没有收录它的中国省级记录。</p>
          </template>
          <template v-else>
            <p>分区是动物地理学的示意，不是国界，也不是行政区。</p>
            <button v-for="item in realms" :key="item.id" type="button" class="chain" :class="{ on: realmId === item.id }" @click="realmId = item.id">
              <strong>{{ item.name }}</strong>
              <span>{{ item.en }}</span>
              <em>{{ item.text }}</em>
            </button>
            <button v-for="item in realmSnakes" :key="item.id" type="button" class="chain" @click="pickSnake(item.id)">
              <strong>{{ item.name }}</strong>
              <span>{{ item.venom }} · {{ item.range }}</span>
            </button>
            <p v-if="!realmSnakes.length">该分区暂未收录精选物种。</p>
          </template>
        </template>
      </template>
    </aside>
    <aside v-else-if="panel" class="dossier">
      <template v-if="panel.type === 'animal'">
        <img :src="portrait(panel)" alt="" class="portrait" />
        <div class="en">{{ panel.nameEn }}</div>
        <h2>{{ panel.name }}</h2>
        <div class="latin">{{ panel.scientificName }}</div>
        <p>{{ panel.summary }}</p>
        <dl>
          <dt>分类</dt><dd>{{ categoryName(panel.category) }}</dd>
          <dt>栖息地</dt><dd>{{ panel.habitatName }} · {{ panel.sub }}</dd>
          <dt>分布</dt><dd>{{ panel.range }}</dd>
          <dt>食性</dt><dd>{{ dietName(panel.diet) }} · {{ panel.activity }}</dd>
          <dt>体型</dt><dd>{{ panel.size }}</dd>
          <dt>寿命</dt><dd>{{ panel.lifespan }}</dd>
          <dt>保护</dt><dd>{{ panel.status }}</dd>
          <dt>来源</dt><dd>{{ panel.source }}。{{ panel.fact }}</dd>
          <dt>图片</dt><dd>{{ panel.credit }}</dd>
        </dl>
        <button type="button" class="solid" @click="focusCurrent">聚焦</button>
      </template>
      <template v-else>
        <div class="en">{{ panel.en }}</div>
        <h2>{{ panel.name }}</h2>
        <p>{{ panel.summary || panel.text }}</p>
        <div v-if="panel.subs" class="chips">
          <span v-for="sub in panel.subs" :key="sub">{{ sub }}</span>
        </div>
        <p v-if="panel.sectionName">{{ panel.sectionName }} · 示意模型</p>
      </template>
    </aside>

    <div class="dock">
      <label>时刻 {{ hour }} 时<input v-model.number="hour" type="range" min="0" max="23" step="1" @input="onHour" /></label>
      <select v-model="weather" @change="onWeather">
        <option value="sunny">晴</option>
        <option value="rain">雨</option>
        <option value="storm">风暴</option>
        <option value="snow">雪</option>
        <option value="dust">沙尘</option>
      </select>
      <label v-if="section === 'migration'">月份 {{ month + 1 }}<input v-model.number="month" type="range" min="0" max="11" step="1" @input="onMonth" /></label>
      <router-link v-if="section === 'insect'" class="solid" to="/micro">想看细胞和原子？进入微观奇境</router-link>
      <span v-if="freeRoam">WASD 移动，QE 升降，拖拽仍可转向</span>
    </div>

    <section v-if="showGallery" class="gallery">
      <div class="filters">
        <button
          v-for="item in habitats"
          v-show="section === 'world' || section === 'habitats'"
          :key="item.id"
          type="button"
          class="chip-btn"
          :class="{ on: view === item.id }"
          @click="openHabitat(item.id)"
        >{{ item.name }}</button>
        <input v-model="keyword" type="search" placeholder="搜索中文名、英文名或学名" />
        <select v-model="category">
          <option value="">全部类别</option>
          <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
        <select v-model="diet">
          <option value="">全部食性</option>
          <option v-for="item in diets" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </div>
      <div class="cards">
        <button
          v-for="item in filtered"
          :key="item.id"
          type="button"
          class="card"
          @click="openAnimal(item)"
        >
          <img :src="portrait(item)" alt="" />
          <strong>{{ item.name }}</strong>
          <span>{{ item.nameEn }}</span>
          <em>{{ item.habitatName }} · {{ categoryName(item.category) }}</em>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import WorldMenu from '../components/WorldMenu.vue'
import { CATEGORIES, DIETS, HABITATS, allAnimals } from '../wildlife/habitats.js'
import { FOOD_LINKS, LIFE_STAGES, MIGRATIONS, QUIZ, SECTIONS, SOUNDS, SPECIALS, THREATS } from '../wildlife/features.js'
import { AID_RIGHT, AID_WRONG, FANG_TYPES, MOVES, SNAKE_TABS, SNAKES, VENOM_KINDS, snakeById } from '../wildlife/snakes.js'
import { REALMS, provincesForSpecies, speciesInRealm } from '../wildlife/snakeMapData.js'
import { WildlifeScene } from '../wildlife/WildlifeScene.js'

const habitats = HABITATS
const animals = allAnimals()
const categories = CATEGORIES
const diets = DIETS
const sections = SECTIONS
const foodLinks = FOOD_LINKS
const lifeStages = LIFE_STAGES
const migrations = MIGRATIONS
const quiz = QUIZ
const sounds = SOUNDS
const canvasRef = ref(null)
const labels = ref([])
const view = ref('earth')
const section = ref('world')
const panel = ref(null)
const keyword = ref('')
const category = ref('')
const diet = ref('')
const reduced = ref(false)
const hour = ref(14)
const weather = ref('sunny')
const month = ref(6)
const freeRoam = ref(false)
const stage = ref(0)
const foodFocus = ref('lion')
const quizIndex = ref(0)
const quizScore = ref(0)
const quizDone = ref(false)
const quizPick = ref(null)
const snakeTab = ref('atlas')
const snakeId = ref(SNAKES[0].id)
const snakePose = ref(SNAKES[0].pose)
const snakeHood = ref(false)
const snakeThermal = ref(false)
const fangId = ref('front')
const rangeMode = ref('china')
const realmId = ref('indomalayan')
const snakeTabs = SNAKE_TABS
const snakes = SNAKES
const fangTypes = FANG_TYPES
const venomKinds = VENOM_KINDS
const snakeMoves = MOVES
const aidRight = AID_RIGHT
const aidWrong = AID_WRONG
const realms = REALMS
const wolves = ref(3)
const deer = ref(10)
const grass = ref(70)
const labNote = ref('草长出来，鹿吃草，狼吃鹿。数量到 0 就表示这条链断了。')
const portraits = new Map()
const habitatIds = new Set(HABITATS.map((item) => item.id))
const moduleIds = ['food', 'sounds', 'lifecycle', 'conservation', 'quiz', 'lab', 'migration', 'snakes']

const moduleSection = computed(() => moduleIds.includes(section.value))
const showGallery = computed(() => !moduleSection.value && section.value !== 'prehistoric' && section.value !== 'insect')
const sectionMeta = computed(() => sections.find((item) => item.id === section.value))
const title = computed(() => sectionMeta.value?.name || '探索地球 · 发现生命')
const subtitle = computed(() => {
  if (section.value === 'world') return '从地球进入海洋、草原、雨林、极地等区域。时刻滑杆可以切到黄昏和夜晚。'
  if (section.value === 'night') return '夜间观察打开手电。北极熊在北极，帝企鹅在南极，两个区域不要混在一起。'
  if (section.value === 'deep') return SPECIALS.deep.summary
  if (section.value === 'prehistoric') return SPECIALS.prehistoric.summary
  if (section.value === 'insect') return SPECIALS.insect.summary
  if (section.value === 'snakes') return '辨认不可靠，靠近和捕捉都不要做。被咬后尽快就医。模型和分布都是示意。'
  if (SPECIALS[section.value]) return SPECIALS[section.value].summary
  return '单击动物打开百科。体型和距离是艺术化示意。保护等级以 iucnredlist.org 最新评估为准。'
})
const foodActive = computed(() => {
  const seen = new Set()
  const walk = (id) => {
    if (!id || seen.has(id)) return
    seen.add(id)
    const node = foodLinks.find((item) => item.id === id)
    node?.eats.forEach(walk)
  }
  walk(foodFocus.value)
  return seen
})
const threatened = computed(() => animals.filter((item) => ['CR', 'EN', 'VU', 'NT'].includes(rankOf(item.status))))
const currentSnake = computed(() => snakeById(snakeId.value))
const snakeProvinces = computed(() => provincesForSpecies(snakeId.value))
const realmSnakes = computed(() => speciesInRealm(realmId.value))

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return animals.filter((item) => {
    if (section.value !== 'animals' && habitatIds.has(view.value) && item.habitatId !== view.value) return false
    if (category.value && item.category !== category.value) return false
    if (diet.value && item.diet !== diet.value) return false
    if (!q) return true
    return [item.name, item.nameEn, item.scientificName].join(' ').toLowerCase().includes(q)
  })
})

let scene = null

function categoryName(id) {
  return categories.find((item) => item.id === id)?.name || id
}

function dietName(id) {
  return diets.find((item) => item.id === id)?.name || id
}

function portrait(item) {
  if (portraits.has(item.id)) return portraits.get(item.id)
  const c = document.createElement('canvas')
  c.width = 240
  c.height = 150
  const ctx = c.getContext('2d')
  const grd = ctx.createLinearGradient(0, 0, 0, 150)
  grd.addColorStop(0, '#163226')
  grd.addColorStop(1, '#07140f')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 240, 150)
  ctx.fillStyle = item.color || '#d4b483'
  ctx.beginPath()
  if (item.shape === 'tall') ctx.ellipse(120, 90, 28, 48, 0, 0, Math.PI * 2)
  else if (item.shape === 'bird') ctx.ellipse(120, 78, 46, 22, -0.3, 0, Math.PI * 2)
  else if (item.shape === 'whale' || item.shape === 'shark' || item.shape === 'snake') ctx.ellipse(120, 78, 70, 24, 0, 0, Math.PI * 2)
  else ctx.ellipse(120, 82, 48, 30, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '12px sans-serif'
  ctx.fillText('示意图', 16, 24)
  const url = c.toDataURL('image/png')
  portraits.set(item.id, url)
  return url
}

function rankOf(status) {
  return String(status).slice(0, 2)
}

function threatText(status) {
  return THREATS[rankOf(status)] || '对照 IUCN 红色名录查看最新说明。'
}

function eatenNames(node) {
  return node.eats.map((id) => foodLinks.find((item) => item.id === id)?.name || id).join('、')
}

function openSection(id) {
  section.value = id
  panel.value = null
  scene?.setNightSafari(false)
  if (id === 'migration') {
    view.value = 'migration'
    scene?.showMigration()
    scene?.setMonth(month.value)
    return
  }
  if (id === 'deep' || id === 'prehistoric' || id === 'insect') {
    view.value = id
    scene?.showSpecial(id)
    return
  }
  if (id === 'food' || id === 'night' || id === 'lab') {
    const habitat = id === 'lab' ? 'forest' : 'savanna'
    view.value = habitat
    scene?.showHabitat(habitat, false)
    if (id === 'night') {
      hour.value = 22
      scene?.setNightSafari(true)
    }
    return
  }
  if (id === 'snakes') {
    view.value = 'snakes'
    scene?.showSnakes()
    syncSnake()
    return
  }
  view.value = 'earth'
  scene?.showEarth(false)
}

function openHabitat(id) {
  section.value = 'habitats'
  view.value = id
  scene?.setNightSafari(false)
  scene?.showHabitat(id, false)
}

function openAnimal(item) {
  section.value = 'animals'
  view.value = item.habitatId
  scene?.setNightSafari(false)
  scene?.focusAnimal(item.id)
}

function onLabel(lab) {
  if (lab.kind === 'habitat') openHabitat(lab.id)
  else if (lab.kind === 'animal') {
    const item = animals.find((animal) => animal.id === lab.id)
    if (item) openAnimal(item)
  } else if (lab.kind === 'migration') {
    const route = migrations.find((item) => item.id === lab.id)
    if (route) panel.value = { type: 'migration', ...route }
  } else if (lab.kind === 'special') {
    const spec = SPECIALS[view.value]
    const creature = spec?.creatures.find((item) => item.id === lab.id)
    if (creature) panel.value = { type: 'special', ...creature, sectionName: spec.name }
  }
}

function pickSnake(id) {
  const item = snakeById(id)
  snakeId.value = item.id
  snakePose.value = item.pose
  snakeHood.value = false
  snakeThermal.value = false
  if (section.value !== 'snakes') openSection('snakes')
}

function syncSnake() {
  const item = currentSnake.value
  scene?.setSnakeExhibit({
    ...item,
    pose: snakePose.value,
    hoodOpen: snakeHood.value && item.hood,
    thermal: snakeThermal.value && item.pit,
    fang: snakeTab.value === 'fangs' ? fangId.value : ''
  })
}

watch([snakeId, snakePose, snakeHood, snakeThermal, snakeTab, fangId], () => {
  if (section.value === 'snakes') syncSnake()
})

function onHour() {
  scene?.setHour(Number(hour.value))
}

function onWeather() {
  scene?.setWeather(weather.value)
}

function onMonth() {
  scene?.setMonth(Number(month.value))
}

function toggleRoam() {
  freeRoam.value = !freeRoam.value
  scene?.setFreeRoam(freeRoam.value)
}

function playSound(item) {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return
  if (!playSound.ctx) playSound.ctx = new Ctx()
  const ctx = playSound.ctx
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = item.type
  osc.frequency.value = item.freq
  gain.gain.setValueAtTime(0.0001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.7)
}

function answerQuiz(index) {
  if (quizPick.value !== null) return
  quizPick.value = index
  if (index === quiz[quizIndex.value].answer) quizScore.value += 1
}

function nextQuiz() {
  if (quizIndex.value >= quiz.length - 1) quizDone.value = true
  else {
    quizIndex.value += 1
    quizPick.value = null
  }
}

function resetQuiz() {
  quizIndex.value = 0
  quizScore.value = 0
  quizDone.value = false
  quizPick.value = null
}

function stepLab() {
  const nextGrass = Math.max(0, Math.min(100, grass.value + 8 - deer.value * 1.2))
  const nextDeer = Math.max(0, Math.min(40, deer.value + deer.value * 0.12 - wolves.value * 0.85))
  const nextWolves = Math.max(0, Math.min(16, wolves.value + (deer.value > wolves.value * 2 ? 0.25 : -0.4)))
  grass.value = Math.round(nextGrass)
  deer.value = Math.round(nextDeer)
  wolves.value = Math.round(nextWolves)
  if (grass.value === 0) labNote.value = '草被吃光，鹿接下来会下降。'
  else if (deer.value === 0) labNote.value = '鹿没有了，狼会跟着减少。'
  else labNote.value = `草 ${grass.value}，鹿 ${deer.value}，狼 ${wolves.value}。`
}

function focusCurrent() {
  if (panel.value?.type === 'animal') scene?.focusAnimal(panel.value.id)
}

function toggleMotion() {
  reduced.value = !reduced.value
  scene?.setReduced(reduced.value)
}

onMounted(() => {
  scene = new WildlifeScene(canvasRef.value, {
    onSelect: (meta) => {
      if (moduleIds.includes(section.value) && meta?.type === 'habitat') return
      panel.value = meta
      if (meta?.type === 'habitat') {
        view.value = meta.id
        if (section.value === 'world' || section.value === 'animals') section.value = 'habitats'
      }
      if (meta?.type === 'animal') view.value = meta.habitatId
      if (!meta && section.value === 'world') view.value = 'earth'
    },
    onLabels: (list) => {
      labels.value = list
    }
  })
  scene.init()
})

onUnmounted(() => {
  scene?.dispose()
  scene = null
})
</script>

<style scoped>
.wild {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #07140f;
  color: #e7f2ea;
  font-family: "Segoe UI", "PingFang SC", sans-serif;
}

.wild-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.wild-top,
.wild-nav,
.dossier,
.gallery,
.pin {
  position: absolute;
  z-index: 2;
}

.wild-top {
  top: 56px;
  left: 196px;
  right: 340px;
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  pointer-events: none;
}

.kicker {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: #d4b483;
}

.wild-top h1 {
  margin: 0;
  font-size: 26px;
  font-weight: 560;
}

.wild-top p {
  margin: 0 0 0.2rem;
  color: rgba(231, 242, 234, 0.7);
  font-size: 13px;
}

.stats {
  margin-left: auto;
  display: flex;
  gap: 0.7rem;
  font-size: 12px;
  color: #d4b483;
}

.section-select {
  display: none;
}

.wild-nav {
  top: 48px;
  bottom: 210px;
  left: 0;
  width: 180px;
  overflow: auto;
  padding: 0.7rem;
  background: linear-gradient(90deg, rgba(7, 20, 15, 0.86), rgba(7, 20, 15, 0.2));
}

.nav-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  color: inherit;
  border: 0;
  border-left: 2px solid transparent;
  padding: 0.45rem 0.6rem;
  cursor: pointer;
}

.nav-item.active {
  border-left-color: #d4b483;
  background: rgba(212, 180, 131, 0.1);
}

.nav-en {
  display: block;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: #d4b483;
}

.nav-zh {
  font-size: 14px;
}

.pin {
  margin-left: 8px;
  background: rgba(7, 20, 15, 0.55);
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 0.12rem 0.45rem;
  font-size: 11px;
  cursor: pointer;
}

.pin.selected {
  background: rgba(212, 180, 131, 0.45);
}

.dossier {
  top: 108px;
  right: 0.8rem;
  width: min(340px, calc(100% - 1.6rem));
  max-height: calc(100% - 250px);
  overflow: auto;
  padding: 0.9rem;
  background: rgba(8, 22, 16, 0.82);
  border: 1px solid rgba(212, 180, 131, 0.28);
  border-radius: 14px;
}

.portrait {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 8px;
}

.en,
.latin {
  color: #d4b483;
  font-size: 12px;
  letter-spacing: 0.08em;
}

.dossier h2 {
  margin: 0.15rem 0;
  font-size: 24px;
}

.dossier p {
  line-height: 1.5;
}

.dossier p.warn {
  color: #f0c9a0;
}

.dossier dl {
  display: grid;
  grid-template-columns: 3.2rem 1fr;
  gap: 0.35rem 0.5rem;
  font-size: 13px;
}

.dossier dt {
  color: rgba(231, 242, 234, 0.5);
}

.dossier dd {
  margin: 0;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chips span,
.chip-btn,
.chain {
  border: 1px solid rgba(212, 180, 131, 0.4);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  font-size: 12px;
}

.chip-btn,
.chain {
  display: block;
  width: 100%;
  margin: 0 0 0.4rem;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.chip-btn {
  width: auto;
  border-radius: 999px;
}

.chain.on {
  background: rgba(212, 180, 131, 0.22);
}

.chain.bad {
  border-color: #d07070;
}

.chain strong,
.chain span,
.chain em {
  display: block;
}

.chain span,
.chain em {
  font-style: normal;
  color: rgba(231, 242, 234, 0.68);
}

.dossier label {
  display: block;
  margin: 0.4rem 0;
  font-size: 13px;
}

.dock {
  position: absolute;
  z-index: 2;
  left: 196px;
  right: 360px;
  bottom: 176px;
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
  font-size: 12px;
  color: #d4b483;
}

.dock select,
.dock input[type="range"] {
  margin-left: 0.35rem;
}

.solid,
.ghost {
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.16);
}

.solid {
  background: rgba(212, 180, 131, 0.22);
  border-color: rgba(212, 180, 131, 0.5);
}

.gallery {
  left: 180px;
  right: 0;
  bottom: 0;
  height: 168px;
  padding: 0.45rem 0.7rem 0.6rem;
  background: linear-gradient(180deg, transparent, rgba(7, 20, 15, 0.92) 28%);
}

.filters {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.filters input,
.filters select {
  background: rgba(0, 0, 0, 0.35);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
}

.cards {
  display: flex;
  gap: 0.5rem;
  overflow: auto;
}

.card {
  flex: 0 0 140px;
  text-align: left;
  background: rgba(8, 22, 16, 0.8);
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.35rem;
  cursor: pointer;
}

.card img {
  width: 100%;
  height: 62px;
  object-fit: cover;
  border-radius: 6px;
}

.card strong,
.card span,
.card em {
  display: block;
}

.card span,
.card em {
  font-style: normal;
  font-size: 11px;
  color: rgba(231, 242, 234, 0.62);
}

:deep(.world-menu) {
  background: rgba(7, 20, 15, 0.72);
}

@media (max-width: 800px) {
  .wild-top,
  .gallery,
  .dock {
    left: 0;
    right: 0;
  }

  .wild-nav {
    display: none;
  }

  .section-select {
    display: block;
    position: absolute;
    z-index: 3;
    top: 52px;
    left: 0.6rem;
    max-width: 46vw;
    background: rgba(7, 20, 15, 0.9);
    color: white;
    border: 1px solid rgba(212, 180, 131, 0.4);
    border-radius: 999px;
    padding: 0.3rem 0.6rem;
  }

  .stats,
  .wild-top p {
    display: none;
  }
}
</style>
