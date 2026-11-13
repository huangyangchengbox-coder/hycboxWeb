/** 网页里「游戏厅」的清单。新增小游戏或互动世界只要在这里加一条。 */
export const WORLDS = [
  { id: 'cosmos', route: '/cosmos', name: '宇宙探索', en: 'COSMOS', icon: '🪐', desc: '程序化天体、轨道运动、镜头飞行' },
  { id: 'wildlife', route: '/wildlife', name: '动物世界', en: 'WILDLIFE', icon: '🦌', desc: '参数化生物几何、行为循环、生态标签' },
  { id: 'micro', route: '/micro', name: '微观奇境', en: 'MICRO', icon: '🔬', desc: '分子球棍、DNA 双螺旋、细胞剖面' },
  { id: 'tennis', route: '/tennis', name: '网球世界', en: 'TENNIS', icon: '🎾', desc: '骨架挥拍、旋转对比、球场规则、装备参数' },
  { id: 'saltline', route: '/saltline', name: '盐线港口', en: 'SALTLINE', icon: '⚓', desc: '港口场景与动态水面' },
  { id: 'terrain', route: '/terrain', name: '地形岛', en: 'TERRAIN', icon: '🏝️', desc: '程序化地形与岛屿生成' },
  { id: 'spectra', route: '/spectra', name: '光谱', en: 'SPECTRA', icon: '🌈', desc: '光的分解与色彩实验' },
  { id: 'formula', route: '/formula', name: '公式像素', en: 'FORMULA', icon: '🧮', desc: '从公式到像素的四个数值实验' },
  { id: 'kerr', route: '/kerr', name: '旋转黑洞', en: 'KERR', icon: '🕳️', desc: '克尔度规下的黑洞吸积与光线弯曲' }
]

export const GAMES = [
  {
    id: 'pelican-bike',
    file: 'minigames/pelican-bike/index.html',
    name: '鹈鹕骑自行车',
    en: 'PELICAN BIKE',
    icon: '🚲',
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
    tag: '竞速漂移',
    desc: '还原 QQ 飞车的键位与漂移玩法，四张按官方地图风格设计的赛道：十一城、情迷爱琴海、法老金字塔、雪地大冒险。',
    keys: ['Shift 漂移', 'Ctrl 氮气', '小喷 / 双喷', '复位键'],
    points: ['赛道形状先脚本生成俯视图核对弯道与交叉点', '4 张地图，含发卡弯、跳台与 8 字形立交'],
    source: 'claude-opus-5-5-demo · qq-speed'
  }
]

export function gameById(id) {
  return GAMES.find((item) => item.id === id) || GAMES[0]
}
