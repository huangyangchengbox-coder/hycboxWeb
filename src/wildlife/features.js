export const SECTIONS = [
  { id: 'world', en: 'WORLD', name: '地球探索' },
  { id: 'habitats', en: 'HABITATS', name: '生态区域' },
  { id: 'animals', en: 'ANIMALS', name: '动物百科' },
  { id: 'deep', en: 'DEEP OCEAN', name: '深海探索' },
  { id: 'migration', en: 'MIGRATION', name: '迁徙路线' },
  { id: 'food', en: 'FOOD WEB', name: '食物网' },
  { id: 'night', en: 'NIGHT SAFARI', name: '夜间观察' },
  { id: 'sounds', en: 'SOUNDS', name: '声音示意' },
  { id: 'lifecycle', en: 'LIFE CYCLE', name: '生命周期' },
  { id: 'conservation', en: 'IUCN', name: '保护专区' },
  { id: 'quiz', en: 'QUIZ', name: '知识挑战' },
  { id: 'prehistoric', en: 'PREHISTORIC', name: '史前世界' },
  { id: 'micro', en: 'MICRO', name: '微观世界' },
  { id: 'lab', en: 'ECO LAB', name: '生态实验室' },
  { id: 'snakes', en: 'SNAKES', name: '蛇族图鉴' }
]

export const MIGRATIONS = [
  {
    id: 'wildebeest',
    name: '角马大迁徙',
    summary: '东非塞伦盖蒂到马萨伊马拉的季节性移动，途中要过河。',
    months: '约 7–10 月北上，随后返回',
    risk: '渡河时有鳄鱼和急流',
    path: [[-3.2, 34.5], [-2.2, 34.8], [-1.5, 35.1], [-1.2, 35.4], [-1.6, 35.0], [-2.8, 34.6]]
  },
  {
    id: 'gray-whale',
    name: '灰鲸南北迁徙',
    summary: '东太平洋灰鲸在繁殖泻湖和北极索饵场之间往返。',
    months: '冬季南下繁殖，夏季北上觅食',
    risk: '航运、缠网和沿岸干扰',
    path: [[60, -165], [45, -140], [30, -120], [20, -110], [27, -114]]
  },
  {
    id: 'reindeer-mig',
    name: '驯鹿迁徙',
    summary: '环北极驯鹿在苔原产仔地和林线越冬地之间移动。',
    months: '春季北上，秋季南下',
    risk: '冰雪封路和栖息地破碎',
    path: [[66, 20], [70, 24], [74, 28], [71, 22], [67, 18]]
  }
]

export const FOOD_LINKS = [
  { id: 'grass', name: '草', role: '生产者', eats: [] },
  { id: 'zebra', name: '平原斑马', role: '初级消费者', eats: ['grass'] },
  { id: 'wildebeest-food', name: '角马', role: '初级消费者', eats: ['grass'] },
  { id: 'lion', name: '非洲狮', role: '顶级捕食者', eats: ['zebra', 'wildebeest-food'] },
  { id: 'hyena', name: '斑鬣狗', role: '捕食者 / 食腐', eats: ['zebra'] }
]

export const LIFE_STAGES = [
  { id: 'egg', name: '卵', text: '雌性绿海龟在出生的沙滩挖坑产卵，卵在沙中孵化。' },
  { id: 'hatch', name: '破壳', text: '幼龟在夜间爬向海面，这一小段路捕食者很多。' },
  { id: 'juvenile', name: '幼体', text: '幼龟在远海漂流，以浮游生物和小动物为食。' },
  { id: 'adult', name: '成体', text: '成体回到近岸海草床，转为以海草和藻类为主，再回到出生海滩繁殖。' }
]

export const QUIZ = [
  { q: '北极熊生活在哪里？', options: ['南极冰盖', '北极海冰区', '非洲草原'], answer: 1 },
  { q: '帝企鹅主要分布在？', options: ['北极', '南极沿岸', '亚马孙雨林'], answer: 1 },
  { q: '非洲象在 IUCN 公开类别中通常被标为？', options: ['无危 LC', '濒危 EN', '已灭绝 EX'], answer: 1 },
  { q: '绿海龟成体主要以什么为食？', options: ['海草和藻类', '只吃海豹', '树叶'], answer: 0 },
  { q: '野骆驼 Camelus ferus 的保护处境是？', options: ['极危 CR', '无危 LC', '家养牲畜'], answer: 0 },
  { q: '看到蛇，头有点三角，就能判断有毒吗？', options: ['能，三角头一定有毒', '不能，头型不可靠', '圆头就一定无毒'], answer: 1 },
  { q: '被蛇咬后，首先应该怎么做？', options: ['用嘴把毒吸出来', '离开现场并尽快就医', '把蛇抓住带到医院'], answer: 1 },
  { q: '银环蛇的头相对较圆，它的毒性是？', options: ['无毒', '剧毒，以神经毒为主', '只有被反复咀嚼才有事'], answer: 1 },
  { q: '翠青蛇和竹叶青都可能是绿色，区别在于？', options: ['绿色越亮越有毒', '不能靠颜色判断，竹叶青有颊窝且有毒', '细的都无毒'], answer: 1 }
]

export const SOUNDS = [
  { id: 'lion', name: '狮吼', note: '合成示意，不是野外录音', freq: 140, type: 'sawtooth' },
  { id: 'elephant', name: '象的低频', note: '合成示意，不是野外录音', freq: 55, type: 'sine' },
  { id: 'whale', name: '鲸歌示意', note: '合成示意，不是野外录音', freq: 220, type: 'sine' },
  { id: 'dolphin', name: '海豚咔嗒', note: '合成示意，不是超声波录音', freq: 880, type: 'square' },
  { id: 'owl', name: '夜间鸟鸣', note: '合成示意，不是野外录音', freq: 440, type: 'triangle' }
]

export const THREATS = {
  CR: '种群极小，盗猎、栖息地丧失或干旱都可能造成不可逆下降。',
  EN: '数量明显下降，常见压力包括盗猎、航运和栖息地破碎。',
  VU: '面临海冰减少、猎物下降或栖息地退缩等压力。',
  NT: '目前未达易危，但气候变化和人类活动正在接近阈值。'
}

export const SPECIALS = {
  deep: {
    name: '深海',
    summary: '无光层示意。发光是艺术化荧光，不是实测影像。',
    fog: '#02040a',
    creatures: [
      { id: 'angler', name: '鮟鱇鱼', shape: 'fish', color: '#203040', glow: '#b7ff6a', text: '头顶诱饵发出光，引诱猎物。' },
      { id: 'glow-jelly', name: '发光水母', shape: 'round', color: '#7af0ff', glow: '#7af0ff', text: '深海中的生物发光示意。' },
      { id: 'squid', name: '巨型乌贼', shape: 'round', color: '#c45a4a', glow: '#88aaff', text: '深海头足类，体型巨大，这里是缩小示意。' },
      { id: 'vent', name: '热泉管虫', shape: 'tall', color: '#e07040', glow: '#ffb060', text: '深海热泉附近靠化学能生存的群落示意。' }
    ]
  },
  prehistoric: {
    name: '史前',
    summary: '不同地质时代不能当成同一片草原。这里只作并置示意，并标明时代。',
    fog: '#2a2218',
    creatures: [
      { id: 'trex', name: '暴龙', shape: 'tall', color: '#8a5a3a', text: '白垩纪晚期的大型兽脚类，不是和猛犸象同时代。' },
      { id: 'mammoth', name: '真猛犸象', shape: 'quad', color: '#6a5344', text: '更新世冰河时期的长鼻类。' },
      { id: 'saber', name: '剑齿虎', shape: 'quad', color: '#c4a06a', text: '更新世的猫科动物，以长犬齿著称。' },
      { id: 'meg', name: '巨齿鲨', shape: 'shark', color: '#7a8794', text: '中新世到上新世的巨型鲨鱼，早已灭绝。' }
    ]
  },
  micro: {
    name: '微观',
    summary: '把昆虫放大到可观察的尺度，不是显微镜实拍。',
    fog: '#102018',
    creatures: [
      { id: 'ant', name: '蚂蚁', shape: 'quad', color: '#3a2418', text: '社会性昆虫，分工包括觅食和育幼。' },
      { id: 'bee', name: '蜜蜂', shape: 'bird', color: '#e6b422', text: '采集花蜜并为植物传粉。' },
      { id: 'spider', name: '蜘蛛', shape: 'round', color: '#4a4038', text: '用丝结网捕食昆虫。' }
    ]
  }
}
