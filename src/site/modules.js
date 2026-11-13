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
    // 主页就是经典地球本身，不再挂二级菜单；地形岛、盐线港口在「游戏大厅 · 站内展馆」里
    children: []
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
    route: '/micro',
    hint: '微观世界 · 38 亿年演化',
    children: [
      { name: '微观奇境', route: '/micro', desc: '原子、分子、DNA、细胞、病毒' },
      { name: '演化长河', route: '/life', desc: '38 亿年 12 个关键节点，3D 时间轴' },
      { name: '演化机制', route: '/life?view=mechanism', desc: '自然选择、遗传漂变、内共生、同源与趋同' },
      { name: '大灭绝', route: '/life?view=extinction', desc: '五次大灭绝与复苏，含常见误区' }
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
    route: '/tennis',
    hint: '网球 · 七大项目对比',
    children: [
      { name: '网球世界', route: '/tennis', desc: '挥拍骨架、旋转对比、球场规则、装备参数' },
      { name: '运动科学', route: '/sports', desc: '网球、篮球、足球、羽毛球、乒乓球、游泳、田径的场地与物理' }
    ]
  },
  {
    id: 'games',
    name: '游戏大厅',
    en: 'GAMES',
    icon: '🕹️',
    route: '/games',
    hint: '站内 3D 场景 + 小游戏',
    children: []
  }
]

/**
 * 游戏大厅里收录的站内可玩页面。
 * 这些路由不在任何一级模块的 children 里，但访问时导航应高亮「游戏大厅」。
 */
const LOBBY_PAGES = ['/terrain', '/saltline', '/spectra', '/formula', '/kerr']

/** 判断某个路由属于哪个一级模块，用于导航高亮。 */
export function moduleOfPath(path) {
  for (const mod of SITE_MODULES) {
    if (mod.route === path) return mod.id
    if (mod.children.some((child) => child.route.split('?')[0] === path)) return mod.id
  }
  // 光谱、公式像素归在「宇宙」下，所以先走上面的 children 判断；
  // 地形岛、盐线港口只在游戏大厅出现，这里兜底
  if (LOBBY_PAGES.includes(path)) return 'games'
  return ''
}
