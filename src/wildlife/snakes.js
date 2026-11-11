/** 蛇族图鉴。形态为参数化示意。毒性与分布取公开近似，不能用来野外鉴定。 */

export const SNAKE_TABS = [
  { id: 'atlas', name: '图鉴' },
  { id: 'fangs', name: '毒与误解' },
  { id: 'body', name: '身体' },
  { id: 'aid', name: '急救' },
  { id: 'protect', name: '保护' },
  { id: 'range', name: '分布' }
]

export const FANG_TYPES = [
  { id: 'none', name: '无沟牙', text: '多数游蛇没有注射毒液的沟牙，靠牙齿咬住猎物再吞下。没有沟牙不等于可以手抓。' },
  { id: 'rear', name: '后沟牙', text: '毒牙长在口腔后部。有些后沟牙蛇要咀嚼一阵才把毒液送进去，仍然不能靠近。' },
  { id: 'front', name: '前沟牙', text: '眼镜蛇科常见。毒牙在前方，咬合时毒液沿牙上的沟进入伤口。' },
  { id: 'tube', name: '管牙', text: '蝮、蝰一类的长牙可以折叠，咬下时像针管一样立起。头是否呈三角形，不能用来判断是不是这一类。' }
]

export const VENOM_KINDS = [
  { id: 'neuro', name: '神经毒', sample: '银环蛇、部分海蛇', text: '可能先出现眼皮下垂、说话和呼吸费力。现场能做的是离开、制动并尽快送医，不要按“土方”处理。' },
  { id: 'hemo', name: '血液毒', sample: '部分蝰科', text: '可能出现流血不止、肿胀。勒紧肢体并不能代替抗蛇毒血清。' },
  { id: 'cyto', name: '细胞毒', sample: '部分眼镜蛇、尖吻蝮', text: '伤口周围会肿、痛，甚至组织坏死。切开创口或用嘴吸，会把损伤做得更大。' }
]

export const MOVES = [
  { id: 'slither', name: '蜿蜒', text: '身体向两侧形成连续的波，借地面的反作用力前进。这是最常见的示意姿态。' },
  { id: 'line', name: '直线', text: '腹鳞像履带一样交替顶住地面，身体大体保持一条直线。模型只表现“波幅变小”。' },
  { id: 'sidewind', name: '侧绕', text: '身体分段着地，斜向移动。沙漠里的响尾蛇常用这种方式。模型是示意，不是力学复原。' },
  { id: 'climb', name: '攀爬', text: '身体交替抱住支撑物向上。树栖蛇的盘绕和抬头，都只是姿态示意。' }
]

export const AID_RIGHT = [
  '立刻离开蛇，不要追，也不要试图抓它或打死它。',
  '取下戒指、手表、手镯等会在肿胀后勒住肢体的物品。',
  '让被咬的人尽量少动，伤肢放在低于心脏的位置，尽快送到能处理蛇咬伤的医院。',
  '记住蛇的大致外形，或在安全距离外拍照。不要把活蛇带到医院。',
  '如果出现呕吐，采用侧卧，并留意呼吸。'
]

export const AID_WRONG = [
  '用嘴吸、拔火罐或让别人吸出毒液。',
  '用绳、布或止血带把肢体勒死。细胞毒咬伤这样做，可能加重局部坏死。',
  '切开伤口、放血、冰敷、火烧或电击。',
  '喝酒，或依赖来源不明的草药、偏方。',
  '追逐、捕捉、买卖蛇，或带活蛇就医。'
]

export const SNAKES = [
  {
    id: 'king-cobra', name: '眼镜王蛇', nameEn: 'King cobra', scientificName: 'Ophiophagus hannah',
    family: '眼镜蛇科', length: '常见约 3–4 米', venom: '剧毒', venomKind: '神经毒为主',
    diet: '主要吃其他蛇', range: '中国南方，以及南亚、东南亚',
    lookalike: '舟山眼镜蛇。王蛇更大，兜帽上常有浅色倒 V 纹。花纹和头型都不能单独证明有没有毒。',
    protection: '国家二级重点保护野生动物（2021 年版名录）', iucn: 'VU 易危，以 iucnredlist.org 最新评估为准',
    pattern: 'hood', color: '#6d5a34', accent: '#e6d7a8', hood: true, pit: false, tail: 'round',
    pose: 'slither', radius: 0.11, visualLength: 4.2, china: true,
    provinces: ['云南', '广西', '广东', '海南', '福建', '贵州', '西藏', '湖南', '江西', '浙江'],
    realms: ['indomalayan'],
    summary: '体型很大的毒蛇，受惊时会展开兜帽。兜帽不是“有毒”的通用标志，无毒蛇不会因此变成安全。'
  },
  {
    id: 'naja-atra', name: '舟山眼镜蛇', nameEn: 'Chinese cobra', scientificName: 'Naja atra',
    family: '眼镜蛇科', length: '常见约 1–1.5 米', venom: '有毒', venomKind: '细胞毒为主，也可影响神经',
    diet: '鼠、蛙、其他小型动物', range: '中国南方和东南',
    lookalike: '眼镜王蛇。舟山眼镜蛇较小，颈背常有眼镜状斑。仍然不能靠这个花纹做野外判断。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'hood', color: '#4a3b2a', accent: '#f0e2c4', hood: true, pit: false, tail: 'round',
    pose: 'slither', radius: 0.09, visualLength: 3.1, china: true,
    provinces: ['浙江', '福建', '江西', '安徽', '湖北', '湖南', '广东', '广西', '海南', '贵州', '云南'],
    realms: ['indomalayan'],
    summary: '中国南方常见的眼镜蛇。兜帽可以张开，毒液对组织的破坏很明显。'
  },
  {
    id: 'banded-krait', name: '银环蛇', nameEn: 'Many-banded krait', scientificName: 'Bungarus multicinctus',
    family: '眼镜蛇科', length: '常见约 1–1.5 米', venom: '剧毒', venomKind: '神经毒',
    diet: '主要吃其他蛇和小型脊椎动物', range: '中国南方',
    lookalike: '一些黑白相间的无毒蛇。银环蛇的头相对较圆，却是剧毒。圆头不能说明无毒。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'bands', color: '#1b1b1b', accent: '#f4f4f4', hood: false, pit: false, tail: 'round',
    pose: 'slither', radius: 0.07, visualLength: 2.8, china: true,
    provinces: ['云南', '广西', '广东', '海南', '福建', '江西', '湖南', '贵州', '浙江', '安徽'],
    realms: ['indomalayan'],
    summary: '黑白环相间。咬伤初期疼痛可能不明显，随后出现神经毒症状，必须尽快就医。'
  },
  {
    id: 'golden-krait', name: '金环蛇', nameEn: 'Banded krait', scientificName: 'Bungarus fasciatus',
    family: '眼镜蛇科', length: '常见约 1.5–2 米', venom: '剧毒', venomKind: '神经毒',
    diet: '主要吃其他蛇', range: '中国西南和华南，以及东南亚',
    lookalike: '黄黑相间的无毒蛇。环纹整齐也不能当成鉴定依据。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'bands', color: '#1a1a1a', accent: '#e2b23a', hood: false, pit: false, tail: 'round',
    pose: 'slither', radius: 0.08, visualLength: 3.2, china: true,
    provinces: ['云南', '广西', '广东', '海南'],
    realms: ['indomalayan'],
    summary: '黄黑相间的环纹很醒目。醒目不等于“警告色一定有毒”，也不等于“不醒目就安全”。'
  },
  {
    id: 'acutus', name: '尖吻蝮', nameEn: 'Chinese moccasin', scientificName: 'Deinagkistrodon acutus',
    family: '蝰科', length: '常见约 1–1.5 米', venom: '剧毒', venomKind: '血液毒和细胞毒',
    diet: '鼠、鸟、蛙', range: '中国南方山区',
    lookalike: '俗称“五步蛇”。这个名字是夸张说法，不是毒发时间。吻端上翘，有颊窝。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'diamonds', color: '#8a6a45', accent: '#3a2a18', hood: false, pit: true, tail: 'round',
    pose: 'coil', radius: 0.1, visualLength: 2.6, china: true,
    provinces: ['浙江', '福建', '江西', '安徽', '湖北', '湖南', '广东', '广西', '贵州', '重庆'],
    realms: ['indomalayan'],
    summary: '头部偏三角、吻尖上翘。三角头在无毒蛇里也会出现，不能当成有毒的证据。'
  },
  {
    id: 'brevicaudus', name: '短尾蝮', nameEn: 'Short-tailed pit viper', scientificName: 'Gloydius brevicaudus',
    family: '蝰科', length: '常见约 40–70 厘米', venom: '有毒', venomKind: '血液毒和细胞毒',
    diet: '鼠、蛙、蜥蜴', range: '中国东部和中部',
    lookalike: '王锦蛇。短尾蝮有颊窝、尾较短；王锦蛇无毒，但头有时也显得较宽。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'blotch', color: '#7d6848', accent: '#2c2418', hood: false, pit: true, tail: 'round',
    pose: 'coil', radius: 0.08, visualLength: 2.1, china: true,
    provinces: ['辽宁', '河北', '山东', '河南', '陕西', '山西', '江苏', '安徽', '浙江', '湖北', '湖南', '江西', '福建', '四川'],
    realms: ['palearctic', 'indomalayan'],
    summary: '分布很广的小型蝮蛇。体色偏土褐，容易和地面混在一起。'
  },
  {
    id: 'bamboo', name: '竹叶青', nameEn: 'Bamboo pit viper', scientificName: 'Trimeresurus stejnegeri',
    family: '蝰科', length: '常见约 50–90 厘米', venom: '有毒', venomKind: '血液毒和细胞毒',
    diet: '蛙、蜥蜴、小型鸟和鼠', range: '中国南方，常在灌丛和竹林',
    lookalike: '翠青蛇。两者都可以是绿色。竹叶青有颊窝，尾末端常偏红褐色；翠青蛇无毒。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'solid', color: '#3f8f4a', accent: '#d7efe0', hood: false, pit: true, tail: 'round',
    pose: 'climb', radius: 0.07, visualLength: 2.3, china: true,
    provinces: ['浙江', '福建', '江西', '安徽', '湖北', '湖南', '广东', '广西', '海南', '贵州', '云南', '四川', '重庆', '甘肃'],
    realms: ['indomalayan'],
    summary: '绿色树栖毒蛇。看见绿色的蛇，不能据此判断有没有毒。'
  },
  {
    id: 'python', name: '缅甸蟒', nameEn: 'Burmese python', scientificName: 'Python bivittatus',
    family: '蟒科', length: '大型，可达数米', venom: '无毒', venomKind: '无毒液，以缠绕制服猎物',
    diet: '鸟和哺乳动物', range: '中国南方，以及东南亚',
    lookalike: '体型大、花纹复杂。无毒不等于可以接触，缠绕和撕咬都会伤人。',
    protection: '国家一级重点保护野生动物（2021 年版名录）', iucn: 'VU 易危，以 iucnredlist.org 最新评估为准',
    pattern: 'blotch', color: '#c4a36a', accent: '#5c3b22', hood: false, pit: false, tail: 'round',
    pose: 'coil', radius: 0.16, visualLength: 4.4, china: true,
    provinces: ['云南', '广西', '广东', '海南', '福建', '贵州'],
    realms: ['indomalayan'],
    summary: '大型无毒蟒。唇窝能感知热。受法律保护，禁止捕捉和买卖。'
  },
  {
    id: 'king-rat', name: '王锦蛇', nameEn: 'King ratsnake', scientificName: 'Elaphe carinata',
    family: '游蛇科', length: '常见约 1.5–2 米', venom: '无毒', venomKind: '无毒液',
    diet: '鼠、鸟、蛙，也会吃其他蛇', range: '中国中部和南部',
    lookalike: '短尾蝮。王锦蛇头有时显得较宽，却没有毒牙和颊窝。头宽不能证明有毒。',
    protection: '列入“三有”名录（2023 年调整版）', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'blotch', color: '#6e6248', accent: '#efe6c8', hood: false, pit: false, tail: 'round',
    pose: 'slither', radius: 0.09, visualLength: 3.4, china: true,
    provinces: ['河北', '山西', '陕西', '河南', '山东', '江苏', '安徽', '浙江', '湖北', '湖南', '江西', '福建', '广东', '广西', '贵州', '四川', '云南'],
    realms: ['palearctic', 'indomalayan'],
    summary: '常见的无毒大蛇，一年能吃不少鼠。无毒也会咬人，看到就绕开。'
  },
  {
    id: 'beauty-rat', name: '黑眉锦蛇', nameEn: 'Beauty ratsnake', scientificName: 'Elaphe taeniura',
    family: '游蛇科', length: '常见约 1.5–2 米', venom: '无毒', venomKind: '无毒液',
    diet: '鼠、鸟', range: '中国大部分地区，也进入居民区',
    lookalike: '眼后有一条黑纹，像眉毛。花纹漂亮不等于有毒。',
    protection: '列入“三有”名录（2023 年调整版）', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'blotch', color: '#d7c39a', accent: '#2a241c', hood: false, pit: false, tail: 'round',
    pose: 'climb', radius: 0.08, visualLength: 3.3, china: true,
    provinces: ['北京', '河北', '山西', '陕西', '甘肃', '河南', '山东', '江苏', '安徽', '浙江', '湖北', '湖南', '江西', '福建', '广东', '广西', '贵州', '四川', '云南', '重庆'],
    realms: ['palearctic', 'indomalayan'],
    summary: '眼后的黑纹很显眼。经常出现在房屋和田边，仍然不要抓。'
  },
  {
    id: 'green-snake', name: '翠青蛇', nameEn: 'Green bush snake', scientificName: 'Ptyas major',
    family: '游蛇科', length: '常见约 70–110 厘米', venom: '无毒', venomKind: '无毒液',
    diet: '蚯蚓、昆虫', range: '中国南方',
    lookalike: '竹叶青。翠青蛇通体青绿、没有颊窝；竹叶青有毒。绿色本身说明不了毒性。',
    protection: '列入“三有”名录（2023 年调整版）', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'solid', color: '#2f9d62', accent: '#e7fff2', hood: false, pit: false, tail: 'round',
    pose: 'climb', radius: 0.055, visualLength: 2.4, china: true,
    provinces: ['浙江', '福建', '江西', '安徽', '湖北', '湖南', '广东', '广西', '海南', '贵州', '云南', '四川'],
    realms: ['indomalayan'],
    summary: '细长的绿色无毒蛇。和竹叶青最容易被放在一起比较。'
  },
  {
    id: 'sea-krait', name: '青环海蛇', nameEn: 'Annulated sea snake', scientificName: 'Hydrophis cyanocinctus',
    family: '眼镜蛇科', length: '常见约 1.5–2 米', venom: '剧毒', venomKind: '神经毒',
    diet: '鱼', range: '中国近海，尤其是南海一带',
    lookalike: '尾侧扁，像桨。陆地上的环纹蛇没有这种尾。不要从海里捞起来辨认。',
    protection: '未列入国家重点保护名录，仍受野生动物保护法约束', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'bands', color: '#1c3d42', accent: '#d5efe8', hood: false, pit: false, tail: 'paddle',
    pose: 'slither', radius: 0.08, visualLength: 3, china: true,
    provinces: ['海南', '广东', '广西', '福建', '台湾', '浙江'],
    realms: ['indomalayan', 'australasian'],
    summary: '生活在海里的毒蛇。尾是侧扁的桨。海边看到不要捡。'
  },
  {
    id: 'black-mamba', name: '黑曼巴', nameEn: 'Black mamba', scientificName: 'Dendroaspis polylepis',
    family: '眼镜蛇科', length: '常见约 2–3 米', venom: '剧毒', venomKind: '神经毒',
    diet: '鸟和小型哺乳动物', range: '非洲撒哈拉以南，中国没有野生种群',
    lookalike: '身体是灰色或橄榄色，口腔内部发黑。“黑色”指的是口腔，不是可靠的野外特征。',
    protection: '中国无野生种群', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'solid', color: '#6d7268', accent: '#111111', hood: false, pit: false, tail: 'round',
    pose: 'slither', radius: 0.08, visualLength: 3.6, china: false,
    provinces: [],
    realms: ['afrotropical'],
    summary: '非洲的剧毒蛇，用来说明东洋界以外的类群。不要把它当成中国的蛇。'
  },
  {
    id: 'tree-boa', name: '翡翠树蚺', nameEn: 'Emerald tree boa', scientificName: 'Corallus caninus',
    family: '蚺科', length: '常见约 1.5–2 米', venom: '无毒', venomKind: '无毒液，以缠绕制服猎物',
    diet: '鸟和小型哺乳动物', range: '南美热带雨林，中国没有野生种群',
    lookalike: '绿色、白斑，常盘在树上。无毒，嘴唇有感热的窝。',
    protection: '中国无野生种群', iucn: '以 iucnredlist.org 最新评估为准',
    pattern: 'blotch', color: '#1f8a45', accent: '#f4fff8', hood: false, pit: false, tail: 'round',
    pose: 'coil', radius: 0.1, visualLength: 2.8, china: false,
    provinces: [],
    realms: ['neotropical'],
    summary: '新热带界的树栖蚺。模型只表现盘绕和绿色，不是照片。'
  }
]

export function snakeById(id) {
  return SNAKES.find((item) => item.id === id) || SNAKES[0]
}
