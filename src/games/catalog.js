/** 游戏厅清单。新增小游戏只要在这里加一条。 */

/** 游戏厅里的「站内世界」交叉入口，与一级导航共用同一份数据。 */
export { SITE_WORLDS as WORLDS } from '../site/modules.js'

/** 游戏厅的分类。 */
export const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'action', name: '动作射击' },
  { id: 'racing', name: '竞速驾驶' },
  { id: 'animal', name: '动物建模' },
  { id: 'city', name: '城市与空间' },
  { id: 'toy', name: '小玩意' }
]

export const GAMES = [
  {
    id: 'pelican-bike',
    file: 'minigames/pelican-bike/index.html',
    name: '鹈鹕骑自行车',
    en: 'PELICAN BIKE',
    icon: '🚲',
    cat: 'racing',
    tag: '休闲骑行',
    desc: '戴头盔墨镜、系红围巾的鹈鹕在海岸公路骑车抓鱼。围巾是布料模拟，昼夜从黄昏走到星空，海面有波浪与碎浪。',
    keys: ['W / S 加减速', 'A / D 变道抓鱼', '空格 跳跃', 'T 展翅抬前轮'],
    points: ['14 个成就，5 种镜头（含电影运镜与鹈鹕视角）', '音效与音乐由浏览器实时合成，节奏跟随踏频', '触屏按钮，按帧率自适应画质'],
    source: 'claude-opus-5-5-demo · pelican-bike'
  },
  {
    id: 'cf-transport-ship',
    file: 'minigames/cf-transport-ship/index.html',
    name: '穿越火线 · 运输船',
    en: 'CROSSFIRE · TRANSPORT',
    icon: '🔫',
    cat: 'action',
    tag: 'FPS 枪战',
    desc: '还原运输船长条形甲板：两端船舱出生点、中部 V 形斜放集装箱、两侧单向管道。完整 FPS 玩法，含枪械弹道与后坐力。',
    keys: ['WASD 移动', '鼠标左键 开火', '右键 狙击开镜', 'Esc 暂停'],
    points: ['bots AI 对战、命中反馈与击杀播报', '枪声与音效全部程序化合成', '支持触屏操作'],
    source: 'claude-opus-5-5-demo · cf-transport-ship'
  },
  {
    id: 'qq-speed',
    file: 'minigames/qq-speed/index.html',
    name: 'QQ 飞车',
    en: 'QQ SPEED',
    icon: '🏎️',
    cat: 'racing',
    tag: '竞速漂移',
    desc: '还原 QQ 飞车的键位与漂移玩法，四张按官方地图风格设计的赛道：十一城、情迷爱琴海、法老金字塔、雪地大冒险。',
    keys: ['Shift 漂移', 'Ctrl 氮气', '小喷 / 双喷', '复位键'],
    points: ['赛道形状先脚本生成俯视图核对弯道与交叉点', '4 张地图，含发卡弯、跳台与 8 字形立交'],
    source: 'claude-opus-5-5-demo · qq-speed'
  },
  {
    id: 'sublevel-07',
    file: 'minigames/sublevel-07/index.html',
    name: 'SUBLEVEL 07',
    en: 'SUBLEVEL 07',
    icon: '🎯',
    cat: 'action',
    tag: 'FPS 技术演示',
    desc: 'fable 5.2 的 FPS 复现：几何缓冲 + GTAO 环境光遮蔽 + Bloom 泛光，实弹打靶与弹道反馈。',
    keys: ['WASD 移动', '鼠标 视角', '左键 射击', 'Shift 疾跑'],
    points: ['GTAO、Bloom、OutputPass 串成后处理链', '贴图与几何全部程序化生成'],
    source: 'fable52-fps-repro · demos/04-fps'
  },
  {
    id: 'osaka-city',
    file: 'minigames/osaka-city/index.html',
    name: 'OSAKA CITY',
    en: 'OSAKA OPEN WORLD',
    icon: '🌆',
    cat: 'city',
    tag: '开放世界',
    desc: '以大阪通天阁·新世界到天王寺·阿倍野为舞台的开放世界沙盒。道路与建筑轮廓来自 OpenStreetMap，地面用国土地理院航空照片，高低差用 5m 高程数据。',
    keys: ['WASD 移动 / 驾驶', 'E 上下车', '1-4 换武器', 'T 时间 / Y 天气'],
    points: ['约 1.6 km × 1.4 km 真实街区，日本左侧通行', '车、直升机、客机、列车都能开', '★1–5 手配度与警察追捕系统'],
    source: 'fable52-gta6 · osaka-city'
  },
  {
    id: 'city-twin',
    file: 'minigames/city-twin/index.html',
    name: '智城孪生',
    en: 'SMART CITY TWIN',
    icon: '🏙️',
    cat: 'city',
    tag: '城市指挥中心',
    desc: '城市运行指挥中心可视化大屏：楼群、路网、扫描光带与数据面板，带辉光后处理。',
    keys: ['拖动 旋转', '滚轮 缩放', '右键 平移'],
    points: ['程序化楼群 + 扫描动画', 'UnrealBloom 泛光'],
    source: 'play_joy/3d_html/city.html'
  },
  {
    id: 'animal-building',
    file: 'minigames/animal-building/index.html',
    name: '程序化建筑',
    en: 'PROCEDURAL PAVILION',
    icon: '🏛️',
    cat: 'city',
    tag: '真实感展亭',
    desc: '程序化生成的现代建筑展亭，玻璃、混凝土与水面的材质搭配，带泛光与阴影。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['零外部贴图，全部程序化材质'],
    source: 'animal_3d_html · 3d-building'
  },
  {
    id: 'animal-lab',
    file: 'minigames/animal-lab/index.html',
    name: 'Animal Lab',
    en: 'SALTLINE ANIMAL LAB',
    icon: '🦓',
    cat: 'animal',
    tag: '低多边形动物',
    desc: '低多边形风格动物实验台，可按空格切换动作。',
    keys: ['拖动 旋转', '滚轮 缩放', '空格 切换动作'],
    points: ['低多边形 + 程序化着色'],
    source: 'animal_3d_html · Animal-v0'
  },
  {
    id: 'animal-engine',
    file: 'minigames/animal-engine/index.html',
    name: 'Animal Lab · 零依赖',
    en: 'ZERO-CDN ENGINE',
    icon: '🧊',
    cat: 'animal',
    tag: '自研渲染',
    desc: '不依赖 Three.js 的自研 3D 小引擎版本，纯手写光栅化与着色。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['无 Three.js、无外部文件'],
    source: 'animal_3d_html · Animal-v1'
  },
  {
    id: 'animal-deer',
    file: 'minigames/animal-deer/index.html',
    name: '程序化梅花鹿',
    en: 'DEER',
    icon: '🦌',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的梅花鹿，毛皮纹理用 Canvas 实时绘制，PBR 材质加实时阴影。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['毛皮纹理程序化生成', 'PBR 材质 + ACES 色调映射'],
    source: 'animal_3d_html · deer'
  },
  {
    id: 'animal-elephant',
    file: 'minigames/animal-elephant/index.html',
    name: '程序化亚洲象',
    en: 'ELEPHANT',
    icon: '🐘',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的亚洲象，褶皱皮肤与象牙材质分别处理。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['皮肤纹理程序化生成'],
    source: 'animal_3d_html · elephant'
  },
  {
    id: 'animal-giraffe',
    file: 'minigames/animal-giraffe/index.html',
    name: '程序化长颈鹿',
    en: 'GIRAFFE',
    icon: '🦒',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的长颈鹿，斑纹按身体部位分别排布。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['斑纹贴图程序化生成'],
    source: 'animal_3d_html · giraffe'
  },
  {
    id: 'animal-lion',
    file: 'minigames/animal-lion/index.html',
    name: '程序化雄狮',
    en: 'LION',
    icon: '🦁',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的雄狮，鬃毛与身体毛色分层处理。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['鬃毛程序化生成'],
    source: 'animal_3d_html · lion'
  },
  {
    id: 'animal-panda',
    file: 'minigames/animal-panda/index.html',
    name: '程序化大熊猫',
    en: 'PANDA',
    icon: '🐼',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的大熊猫，黑白毛色与眼圈分布按真实比例。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['黑白毛色分区程序化生成'],
    source: 'animal_3d_html · panda'
  },
  {
    id: 'animal-fox',
    file: 'minigames/animal-fox/index.html',
    name: '程序化赤狐',
    en: 'RED FOX',
    icon: '🦊',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的赤狐，尾巴蓬松度与毛色渐变单独处理。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['尾巴与毛色渐变程序化生成'],
    source: 'animal_3d_html · fox'
  },
  {
    id: 'animal-tiger',
    file: 'minigames/animal-tiger/index.html',
    name: '程序化孟加拉虎',
    en: 'BENGAL TIGER',
    icon: '🐯',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的孟加拉虎，条纹按躯干走向排布。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['条纹贴图程序化生成'],
    source: 'animal_3d_html · tiger'
  },
  {
    id: 'animal-wolf',
    file: 'minigames/animal-wolf/index.html',
    name: '程序化灰狼',
    en: 'GREY WOLF',
    icon: '🐺',
    cat: 'animal',
    tag: 'PBR 材质',
    desc: '程序化生成的灰狼，毛色从背部到腹部渐变。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['毛色渐变程序化生成'],
    source: 'animal_3d_html · wolf'
  },
  {
    id: 'fur-viewer',
    file: 'minigames/fur-viewer/index.html',
    name: '毛发与解剖查看器',
    en: 'SHELL FUR & PBR',
    icon: '🪶',
    cat: 'animal',
    tag: '毛发渲染',
    desc: '壳层毛发（shell fur）与 PBR 解剖查看器，可切换毛发层数、长度与解剖视图。',
    keys: ['拖动 旋转', '滚轮 缩放', '面板调参数'],
    points: ['壳层毛发多层叠加', 'PBR 材质与解剖分层'],
    source: 'animal_3d_html · realistic viewer'
  },
  {
    id: 'material-lab',
    file: 'minigames/material-lab/index.html',
    name: '材质实验室',
    en: 'MATERIAL LAB',
    icon: '🧱',
    cat: 'toy',
    tag: '材质研究',
    desc: 'fable 5.2 的材质实验：金属、粗糙度、清漆与各向异性在同一批几何上的对比。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['同一几何多材质并排对比', '程序化环境光照'],
    source: 'fable52-fps-repro · demos/02-materials'
  },
  {
    id: 'model-lab',
    file: 'minigames/model-lab/index.html',
    name: '模型实验室',
    en: 'MODEL LAB',
    icon: '🗿',
    cat: 'toy',
    tag: '程序化模型',
    desc: 'fable 5.2 的模型实验：程序化生成的道具与武器模型，多角度观察细节。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['程序化几何，无外部模型文件'],
    source: 'fable52-fps-repro · demos/03-models'
  },
  {
    id: 'audio-lab',
    file: 'minigames/audio-lab/index.html',
    name: '音效台',
    en: 'SALTLINE AUDIO',
    icon: '🎛️',
    cat: 'toy',
    tag: '程序化音效',
    desc: 'fable 5.2 的程序化音频实验台：用 WebAudio 合成各种音色与音效。',
    keys: ['点击 播放', '面板调参数'],
    points: ['零音频文件，全部实时合成'],
    source: 'fable52-fps-repro · demos/01-audio'
  },
  {
    id: 'audio-lab-1h',
    file: 'minigames/audio-lab-1h/index.html',
    name: '音效台 · 长循环',
    en: 'AUDIO 1H LOOP',
    icon: '🎚️',
    cat: 'toy',
    tag: '程序化音效',
    desc: '音效台的长时间循环版本，用来验证长时间播放下的稳定性。',
    keys: ['点击 播放', '面板调参数'],
    points: ['一小时级别的循环', '零音频文件'],
    source: 'fable52-fps-repro · demos/01-audio-1h'
  },
  {
    id: 'deepseek-slider',
    file: 'minigames/deepseek-slider/index.html',
    name: '滑动变祖器',
    en: 'DEEPSEEK SLIDER',
    icon: '🎚️',
    cat: 'toy',
    tag: '梗图小工具',
    desc: '一个把头像沿「小难梁 → 牢梁 → 梁子 → 梁圣 → 梁神 → 梁祖」滑动的恶搞小工具。',
    keys: ['拖动 滑块'],
    points: ['六段头像无缝过渡'],
    source: 'play_joy/deepseek-slider'
  },
  {
    id: 'liang-slider',
    file: 'minigames/liang-slider/index.html',
    name: '掌门修炼器',
    en: 'MASTER SLIDER',
    icon: '🥋',
    cat: 'toy',
    tag: '梗图小工具',
    desc: '冲梁子 → 梁圣的 DeepSeek 掌门修炼器，同一个梗的另一个版本。',
    keys: ['拖动 滑块'],
    points: ['带背景图与等级文案'],
    source: 'network/liang-slider'
  }
]

export function gameById(id) {
  return GAMES.find((item) => item.id === id) || GAMES[0]
}

export function gamesByCategory(cat) {
  return cat === 'all' ? GAMES : GAMES.filter((item) => item.cat === cat)
}
