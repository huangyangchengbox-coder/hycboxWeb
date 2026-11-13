/**
 * 游戏大厅清单：只放「能玩」的内容。
 *
 * 两类：
 *   type: 'page' —— 站内可交互的 3D 页面（地形岛、盐线港口、光谱、公式像素、旋转黑洞），
 *                  用 router 跳转，不是静态 iframe。
 *   type: 'iframe' —— 仓库 games/ 下打包出来的独立小游戏，用 iframe 内嵌。
 *
 * 知识型展馆（宇宙探索、微观奇境、生命演化、动物世界、运动科学）不放在这里，
 * 它们是一级导航模块。
 */

export const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'terrain', name: '地形与场景' },
  { id: 'science', name: '科学模拟' },
  { id: 'racing', name: '竞速驾驶' },
  { id: 'action', name: '动作射击' }
]

export const GAMES = [
  {
    id: 'terrain',
    type: 'page',
    route: '/terrain',
    name: '地形岛',
    en: 'TERRAIN ISLAND',
    icon: '🏝️',
    cat: 'terrain',
    tag: '程序化地形',
    desc: '程序化生成的海岛地形，噪声塑造山脉与海岸线，可以拖着绕岛环视。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['高度场由噪声叠加生成，无外部地形文件', '海水与陆地的材质分层处理']
  },
  {
    id: 'saltline',
    type: 'page',
    route: '/saltline',
    name: '盐线港口',
    en: 'SALTLINE HARBOUR',
    icon: '⚓',
    cat: 'terrain',
    tag: '港口场景',
    desc: '港口场景与动态水面，吊机、集装箱与海面波纹一起构成可探索的码头。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['水面使用顶点波动画', '场景元素全部程序化搭建']
  },
  {
    id: 'spectra',
    type: 'page',
    route: '/spectra',
    name: '光谱',
    en: 'SPECTRA',
    icon: '🌈',
    cat: 'science',
    tag: '光学实验',
    desc: '光的分解与色彩实验，把白光拆成连续光谱，再混合回去。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['可见光波段的连续映射', '加色混合与减色混合对比']
  },
  {
    id: 'formula',
    type: 'page',
    route: '/formula',
    name: '公式像素',
    en: 'FORMULA PIXEL',
    icon: '🧮',
    cat: 'science',
    tag: '数值实验',
    desc: '一个 HTML 里的四个数值实验：每条公式都实时算成像素，改参数就能看到图形变化。',
    keys: ['拖动 调整', '改参数即时生效'],
    points: ['四个独立实验并排对比', '纯 Canvas 实时计算，无预渲染图']
  },
  {
    id: 'kerr',
    type: 'page',
    route: '/kerr',
    name: '旋转黑洞',
    en: 'KERR BLACK HOLE',
    icon: '🕳️',
    cat: 'science',
    tag: '相对论模拟',
    desc: '克尔度规下的黑洞：吸积盘发光、光线被引力弯曲，可以看到黑洞阴影与多普勒增亮。',
    keys: ['拖动 旋转', '滚轮 缩放'],
    points: ['按克尔度规的光线追踪', '吸积盘一侧因多普勒效应更亮']
  },
  {
    id: 'pelican-bike',
    type: 'iframe',
    file: 'minigames/pelican-bike/index.html',
    name: '鹈鹕骑自行车',
    en: 'PELICAN BIKE',
    icon: '🚲',
    cat: 'racing',
    tag: '休闲骑行',
    desc: '戴头盔墨镜、系红围巾的鹈鹕在海岸公路骑车抓鱼。围巾是布料模拟，昼夜从黄昏走到星空，海面有波浪与碎浪。',
    keys: ['W / S 加减速', 'A / D 变道抓鱼', '空格 跳跃', 'T 展翅抬前轮'],
    points: ['14 个成就，5 种镜头（含电影运镜与鹈鹕视角）', '音效与音乐由浏览器实时合成，节奏跟随踏频', '触屏按钮，按帧率自适应画质']
  },
  {
    id: 'cf-transport-ship',
    type: 'iframe',
    file: 'minigames/cf-transport-ship/index.html',
    name: '穿越火线 · 运输船',
    en: 'CROSSFIRE · TRANSPORT',
    icon: '🔫',
    cat: 'action',
    tag: 'FPS 枪战',
    desc: '还原运输船长条形甲板：两端船舱出生点、中部 V 形斜放集装箱、两侧单向管道。完整 FPS 玩法，含枪械弹道与后坐力。',
    keys: ['WASD 移动', '鼠标左键 开火', '右键 狙击开镜', 'Esc 暂停'],
    points: ['bots AI 对战、命中反馈与击杀播报', '枪声与音效全部程序化合成', '支持触屏操作']
  },
  {
    id: 'qq-speed',
    type: 'iframe',
    file: 'minigames/qq-speed/index.html',
    name: 'QQ 飞车',
    en: 'QQ SPEED',
    icon: '🏎️',
    cat: 'racing',
    tag: '竞速漂移',
    desc: '还原 QQ 飞车的键位与漂移玩法，四张按官方地图风格设计的赛道：十一城、情迷爱琴海、法老金字塔、雪地大冒险。',
    keys: ['Shift 漂移', 'Ctrl 氮气', '小喷 / 双喷', '复位键'],
    points: ['赛道形状先脚本生成俯视图核对弯道与交叉点', '4 张地图，含发卡弯、跳台与 8 字形立交']
  }
]

export function gameById(id) {
  return GAMES.find((item) => item.id === id) || GAMES[0]
}
