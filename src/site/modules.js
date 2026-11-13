/**
 * 站点一级导航：六个模块。
 * children 里的 route 都对应 router 里已注册的页面。
 * 新增页面时在这里挂一条，导航和游戏厅的「站内世界」都会自动同步。
 */
export const SITE_MODULES = [
  {
    id: 'home',
    name: '主页',
    en: 'HOME',
    icon: '🌍',
    route: '/home',
    hint: '经典地球',
    children: [
      { name: '经典地球', route: '/home', desc: '可拖拽的地球首页，点月球进入太空' },
      { name: '地形岛', route: '/terrain', desc: '程序化地形与岛屿生成' },
      { name: '盐线港口', route: '/saltline', desc: '港口场景与动态水面' }
    ]
  },
  {
    id: 'cosmos',
    name: '宇宙',
    en: 'COSMOS',
    icon: '🪐',
    route: '/cosmos',
    hint: '天体 · 引力 · 光',
    children: [
      { name: '宇宙探索', route: '/cosmos', desc: '程序化天体、轨道运动、镜头飞行' },
      { name: '旋转黑洞', route: '/kerr', desc: '克尔度规下的吸积盘与光线弯曲' },
      { name: '光谱', route: '/spectra', desc: '光的分解与色彩实验' },
      { name: '公式像素', route: '/formula', desc: '从公式到像素的四个数值实验' }
    ]
  },
  {
    id: 'life',
    name: '生命演化',
    en: 'LIFE',
    icon: '🧬',
    route: '/life',
    hint: '38 亿年 · 从分子到人类',
    children: [
      { name: '演化长河', route: '/life', desc: '38 亿年关键节点，3D 时间轴' },
      { name: '演化机制', route: '/life?view=mechanism', desc: '自然选择、内共生、同源器官' },
      { name: '大灭绝', route: '/life?view=extinction', desc: '五次大灭绝与复苏' },
      { name: '微观奇境', route: '/micro', desc: '原子、分子、DNA、细胞' }
    ]
  },
  {
    id: 'animal',
    name: '动物',
    en: 'WILDLIFE',
    icon: '🦌',
    route: '/wildlife',
    hint: '形态 · 行为 · 生态',
    children: [
      { name: '动物世界', route: '/wildlife', desc: '参数化生物几何、行为循环、生态标签' }
    ]
  },
  {
    id: 'sport',
    name: '运动',
    en: 'SPORTS',
    icon: '🎾',
    route: '/sports',
    hint: '场地 · 规则 · 技术 · 物理',
    children: [
      { name: '运动科学', route: '/sports', desc: '七种运动的场地尺寸、规则与技术要点' },
      { name: '网球世界', route: '/tennis', desc: '挥拍骨架、旋转对比、球场规则、装备参数' }
    ]
  },
  {
    id: 'games',
    name: '游戏大厅',
    en: 'GAMES',
    icon: '🕹️',
    route: '/games',
    hint: '24 个 3D 小游戏',
    children: []
  }
]

/** 展馆类页面（原「互动世界」），游戏厅里用作交叉入口。 */
export const SITE_WORLDS = [
  { id: 'cosmos', route: '/cosmos', name: '宇宙探索', en: 'COSMOS', icon: '🪐', desc: '程序化天体、轨道运动、镜头飞行' },
  { id: 'life', route: '/life', name: '生命演化', en: 'LIFE', icon: '🧬', desc: '38 亿年时间轴与演化机制' },
  { id: 'micro', route: '/micro', name: '微观奇境', en: 'MICRO', icon: '🔬', desc: '分子球棍、DNA 双螺旋、细胞剖面' },
  { id: 'wildlife', route: '/wildlife', name: '动物世界', en: 'WILDLIFE', icon: '🦌', desc: '参数化生物几何、行为循环、生态标签' },
  { id: 'sports', route: '/sports', name: '运动科学', en: 'SPORTS', icon: '🎾', desc: '七种运动的场地、规则与物理' },
  { id: 'saltline', route: '/saltline', name: '盐线港口', en: 'SALTLINE', icon: '⚓', desc: '港口场景与动态水面' },
  { id: 'terrain', route: '/terrain', name: '地形岛', en: 'TERRAIN', icon: '🏝️', desc: '程序化地形与岛屿生成' },
  { id: 'spectra', route: '/spectra', name: '光谱', en: 'SPECTRA', icon: '🌈', desc: '光的分解与色彩实验' },
  { id: 'formula', route: '/formula', name: '公式像素', en: 'FORMULA', icon: '🧮', desc: '从公式到像素的四个数值实验' },
  { id: 'kerr', route: '/kerr', name: '旋转黑洞', en: 'KERR', icon: '🕳️', desc: '克尔度规下的黑洞吸积与光线弯曲' }
]

/** 判断某个路由属于哪个一级模块，用于导航高亮。 */
export function moduleOfPath(path) {
  for (const mod of SITE_MODULES) {
    if (mod.route === path) return mod.id
    if (mod.children.some((child) => child.route.split('?')[0] === path)) return mod.id
  }
  return ''
}
