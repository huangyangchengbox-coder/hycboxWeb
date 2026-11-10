/** 保护等级取 IUCN 公开类别，实施与展示时以官网最新评估为准。图片为站内示意图，不是摄影作品。 */

export const CATEGORIES = [
  { id: 'mammal', name: '哺乳类' },
  { id: 'bird', name: '鸟类' },
  { id: 'reptile', name: '爬行类' },
  { id: 'amphibian', name: '两栖类' },
  { id: 'fish', name: '鱼类' },
  { id: 'invertebrate', name: '无脊椎' }
]

export const DIETS = [
  { id: 'carnivore', name: '肉食' },
  { id: 'herbivore', name: '草食' },
  { id: 'omnivore', name: '杂食' }
]

const note = '保护等级来自 IUCN 公开类别，请以 iucnredlist.org 最新评估为准。'

function animal(partial) {
  return {
    credit: '站内示意图，非摄影作品',
    source: 'IUCN Red List',
    ...partial
  }
}

export const HABITATS = [
  {
    id: 'ocean',
    en: 'OCEAN',
    name: '海洋',
    summary: '从珊瑚礁、开阔海域到深海。代表动物按真实海洋生态选取。',
    subs: ['珊瑚礁', '开阔海域', '深海'],
    color: '#0c3d66',
    fog: '#071826',
    ground: '#0a3048',
    lat: 8,
    lon: -150,
    animals: [
      animal({ id: 'blue-whale', name: '蓝鲸', nameEn: 'Blue Whale', scientificName: 'Balaenoptera musculus', category: 'mammal', diet: 'carnivore', activity: '远洋、结群或独行', sub: '开阔海域', range: '除北极冰区外的各大洋', size: '体长可达约 30 m', lifespan: '约 70–90 年', status: 'EN 濒危', shape: 'whale', color: '#6f8fa8', summary: '已知最大的动物，以磷虾为食。', fact: '喷出的水柱是呼吸时带起的水汽。' }),
      animal({ id: 'dolphin', name: '宽吻海豚', nameEn: 'Common Bottlenose Dolphin', scientificName: 'Tursiops truncatus', category: 'mammal', diet: 'carnivore', activity: '群居、昼行', sub: '开阔海域', range: '温带和热带近海', size: '体长约 2–4 m', lifespan: '约 40–50 年', status: 'LC 无危', shape: 'dolphin', color: '#9eb4c4', summary: '聪明的群居鲸类，用回声定位捕食。', fact: '每个个体的背鳍边缘形状不同。' }),
      animal({ id: 'great-white', name: '大白鲨', nameEn: 'Great White Shark', scientificName: 'Carcharodon carcharias', category: 'fish', diet: 'carnivore', activity: '独行、远洋', sub: '开阔海域', range: '温带近海', size: '体长通常 3.5–5 m', lifespan: '约 70 年', status: 'VU 易危', shape: 'shark', color: '#8d97a1', summary: '大型掠食鲨，主要捕食海豹和鱼类。', fact: '牙齿会不断替换。' }),
      animal({ id: 'green-turtle', name: '绿海龟', nameEn: 'Green Sea Turtle', scientificName: 'Chelonia mydas', category: 'reptile', diet: 'herbivore', activity: '洄游', sub: '珊瑚礁', range: '热带和亚热带海域', size: '甲长约 0.8–1.2 m', lifespan: '可超过 70 年', status: 'EN 濒危', shape: 'turtle', color: '#6f8f62', summary: '成体主要以海草和藻类为食。', fact: '雌龟常回到出生海滩产卵。' }),
      animal({ id: 'octopus', name: '普通章鱼', nameEn: 'Common Octopus', scientificName: 'Octopus vulgaris', category: 'invertebrate', diet: 'carnivore', activity: '独居、夜行', sub: '珊瑚礁', range: '热带和温带浅海', size: '臂展约 1 m', lifespan: '约 1–2 年', status: 'LC 无危', shape: 'round', color: '#c46a4a', summary: '软体动物，能改变体色并挤压进狭缝。', fact: '血液呈蓝色，因为含血蓝蛋白。' }),
      animal({ id: 'jellyfish', name: '海月水母', nameEn: 'Moon Jelly', scientificName: 'Aurelia aurita', category: 'invertebrate', diet: 'carnivore', activity: '随流漂浮', sub: '开阔海域', range: '近岸海域', size: '伞径通常 10–40 cm', lifespan: '数月到约 1 年', status: 'NE 未评估', shape: 'round', color: '#d7e7f2', summary: '常见水母，伞缘有短触手，捕食浮游生物。', fact: note })
    ]
  },
  {
    id: 'savanna',
    en: 'SAVANNA',
    name: '草原',
    summary: '非洲稀树草原、草地和水源地。动物分布以非洲草原为准。',
    subs: ['稀树草原', '草地', '水源地'],
    color: '#c4a15a',
    fog: '#3a2a14',
    ground: '#8a6a32',
    lat: -2,
    lon: 34,
    animals: [
      animal({ id: 'lion', name: '非洲狮', nameEn: 'African Lion', scientificName: 'Panthera leo', category: 'mammal', diet: 'carnivore', activity: '群居、多在清晨和夜间活动', sub: '稀树草原', range: '撒哈拉以南非洲的零散种群', size: '雄狮体重约 150–250 kg', lifespan: '野生约 10–14 年', status: 'VU 易危', shape: 'quad', color: '#c48a3a', summary: '草原上的群居猫科动物，雌狮承担主要捕猎。', fact: '狮群通常由有亲缘关系的雌狮组成。' }),
      animal({ id: 'elephant', name: '非洲象', nameEn: 'African Savanna Elephant', scientificName: 'Loxodonta africana', category: 'mammal', diet: 'herbivore', activity: '群居、昼行', sub: '水源地', range: '非洲东部和南部草原', size: '肩高约 3–4 m', lifespan: '约 60–70 年', status: 'EN 濒危', shape: 'quad', color: '#8d8a84', summary: '现存最大的陆生动物，家族群由雌象带领。', fact: '象鼻有数万块肌肉，可取食和喝水。' }),
      animal({ id: 'giraffe', name: '长颈鹿', nameEn: 'Giraffe', scientificName: 'Giraffa camelopardalis', category: 'mammal', diet: 'herbivore', activity: '群居、昼行', sub: '稀树草原', range: '非洲稀树草原', size: '身高约 4.3–5.7 m', lifespan: '野生约 25 年', status: 'VU 易危', shape: 'tall', color: '#d7a15a', summary: '最高的陆生动物，以树冠叶片为食。', fact: '颈部和人类一样是七节颈椎，只是每节很长。' }),
      animal({ id: 'zebra', name: '平原斑马', nameEn: 'Plains Zebra', scientificName: 'Equus quagga', category: 'mammal', diet: 'herbivore', activity: '群居、昼行', sub: '草地', range: '非洲东部和南部', size: '肩高约 1.2–1.4 m', lifespan: '约 20–25 年', status: 'NT 近危', shape: 'quad', color: '#f2f2f2', summary: '条纹可能帮助混淆捕食者视线和调节体温。', fact: '每匹斑马的条纹图案都不相同。' }),
      animal({ id: 'cheetah', name: '猎豹', nameEn: 'Cheetah', scientificName: 'Acinonyx jubatus', category: 'mammal', diet: 'carnivore', activity: '昼行、多独居', sub: '草地', range: '非洲东部和南部', size: '体长约 1.1–1.5 m', lifespan: '野生约 10–12 年', status: 'VU 易危', shape: 'quad', color: '#e0b15a', summary: '陆地上短距离冲刺最快的动物。', fact: '爪子更像跑鞋，不能完全缩回。' }),
      animal({ id: 'hyena', name: '斑鬣狗', nameEn: 'Spotted Hyena', scientificName: 'Crocuta crocuta', category: 'mammal', diet: 'carnivore', activity: '群居、夜行', sub: '稀树草原', range: '撒哈拉以南非洲', size: '肩高约 70–90 cm', lifespan: '野生约 12–25 年', status: 'LC 无危', shape: 'quad', color: '#a89068', summary: '既捕猎也食腐，氏族由雌性主导。', fact: '咬合力很强，能咬碎骨头。' })
    ]
  },
  {
    id: 'rainforest',
    en: 'RAINFOREST',
    name: '热带雨林',
    summary: '林冠、林下和林间河流。代表动物以新热带雨林为主。',
    subs: ['林冠层', '林下层', '河流'],
    color: '#1c6b3a',
    fog: '#062214',
    ground: '#14361f',
    lat: -3,
    lon: -62,
    animals: [
      animal({ id: 'jaguar', name: '美洲豹', nameEn: 'Jaguar', scientificName: 'Panthera onca', category: 'mammal', diet: 'carnivore', activity: '独居、晨昏', sub: '河流', range: '中美洲到亚马孙', size: '体长约 1.1–1.8 m', lifespan: '野生约 12–15 年', status: 'NT 近危', shape: 'quad', color: '#e0b04a', summary: '美洲最大的猫科动物，喜在水边伏击。', fact: '咬合力足以咬穿龟甲。' }),
      animal({ id: 'sloth', name: '褐喉树懒', nameEn: 'Brown-throated Sloth', scientificName: 'Bradypus variegatus', category: 'mammal', diet: 'herbivore', activity: '独居、树栖', sub: '林冠层', range: '中美洲和南美洲北部', size: '体长约 40–70 cm', lifespan: '约 20–30 年', status: 'LC 无危', shape: 'round', color: '#8a7a55', summary: '动作极慢，以树叶为食。', fact: '毛发上常有绿藻，有助于隐蔽。' }),
      animal({ id: 'squirrel-monkey', name: '松鼠猴', nameEn: 'Common Squirrel Monkey', scientificName: 'Saimiri sciureus', category: 'mammal', diet: 'omnivore', activity: '群居、昼行', sub: '林冠层', range: '亚马孙雨林', size: '体长约 25–35 cm', lifespan: '约 15–20 年', status: 'LC 无危', shape: 'quad', color: '#e6c36a', summary: '小型灵长类，在林冠中成群觅食果实和昆虫。', fact: '尾巴不能卷握，主要用来平衡。' }),
      animal({ id: 'toucan', name: '巨嘴鸟', nameEn: 'Toco Toucan', scientificName: 'Ramphastos toco', category: 'bird', diet: 'omnivore', activity: '昼行、树栖', sub: '林冠层', range: '南美洲中部和东部林地', size: '体长约 55–65 cm', lifespan: '约 15–20 年', status: 'LC 无危', shape: 'bird', color: '#f2a01e', summary: '大嘴用于取食果实和调节体温。', fact: '喙虽大，但是中空的，并不沉重。' }),
      animal({ id: 'tree-frog', name: '红眼树蛙', nameEn: 'Red-eyed Tree Frog', scientificName: 'Agalychnis callidryas', category: 'amphibian', diet: 'carnivore', activity: '夜行、树栖', sub: '林下层', range: '中美洲雨林', size: '体长约 5–7 cm', lifespan: '约 5 年', status: 'LC 无危', shape: 'round', color: '#3aaa4a', summary: '夜间活动的树蛙，以昆虫为食。', fact: '突然睁开红眼可以吓退捕食者。' })
    ]
  },
  {
    id: 'polar',
    en: 'POLAR',
    name: '极地',
    summary: '北极与南极分开标注。北极熊在北极，企鹅主要在南半球，二者不是同一栖息地。',
    subs: ['北极冰原', '南极冰川', '极地海域'],
    color: '#d5e7f2',
    fog: '#0e1c28',
    ground: '#c5d5e0',
    lat: 78,
    lon: 20,
    animals: [
      animal({ id: 'polar-bear', name: '北极熊', nameEn: 'Polar Bear', scientificName: 'Ursus maritimus', category: 'mammal', diet: 'carnivore', activity: '独行、依赖海冰', sub: '北极冰原', range: '环北极海冰区', size: '雄性体重约 350–700 kg', lifespan: '约 20–30 年', status: 'VU 易危', shape: 'quad', color: '#f4f7fb', summary: '只生活在北极，以海豹为主要食物。', fact: '不分布在南极。' }),
      animal({ id: 'arctic-fox', name: '北极狐', nameEn: 'Arctic Fox', scientificName: 'Vulpes lagopus', category: 'mammal', diet: 'omnivore', activity: '独居或家族', sub: '北极冰原', range: '北极苔原', size: '体长约 50–75 cm', lifespan: '约 3–6 年', status: 'LC 无危', shape: 'quad', color: '#f7f7f7', summary: '冬季毛色变白，能在严寒中生活。', fact: '尾巴比身体更有助于保暖。' }),
      animal({ id: 'reindeer', name: '驯鹿', nameEn: 'Reindeer', scientificName: 'Rangifer tarandus', category: 'mammal', diet: 'herbivore', activity: '群居、迁徙', sub: '北极冰原', range: '环北极苔原和泰加林', size: '肩高约 0.8–1.5 m', lifespan: '约 12–15 年', status: 'VU 易危', shape: 'quad', color: '#8a7358', summary: '会进行长距离季节迁徙。', fact: '雌雄都长角。' }),
      animal({ id: 'emperor', name: '帝企鹅', nameEn: 'Emperor Penguin', scientificName: 'Aptenodytes forsteri', category: 'bird', diet: 'carnivore', activity: '群居、海中捕食', sub: '南极冰川', range: '南极沿岸', size: '身高约 1.1–1.3 m', lifespan: '约 20 年', status: 'NT 近危', shape: 'bird', color: '#1d1d1d', summary: '最高的企鹅，在南极冰上繁殖。', fact: '不生活在北极。' }),
      animal({ id: 'weddell', name: '韦德尔海豹', nameEn: 'Weddell Seal', scientificName: 'Leptonychotes weddellii', category: 'mammal', diet: 'carnivore', activity: '在冰下潜水', sub: '南极冰川', range: '南极近岸冰区', size: '体长约 2.5–3.5 m', lifespan: '约 20 年', status: 'LC 无危', shape: 'whale', color: '#6a625c', summary: '能在南极冰层下长时间潜水。', fact: '用牙齿维持冰上的呼吸孔。' }),
      animal({ id: 'walrus', name: '海象', nameEn: 'Walrus', scientificName: 'Odobenus rosmarus', category: 'mammal', diet: 'carnivore', activity: '群居', sub: '极地海域', range: '北极浅海', size: '雄性体长约 3 m', lifespan: '约 30–40 年', status: 'VU 易危', shape: 'quad', color: '#b08968', summary: '用长牙支撑身体和翻找海底贝类。', fact: '属于北极，不在南极。' })
    ]
  },
  {
    id: 'forest',
    en: 'FOREST',
    name: '森林',
    summary: '针叶林、温带森林和落叶林。代表动物以欧亚温带森林为主。',
    subs: ['针叶林', '温带森林', '落叶林'],
    color: '#2f6a38',
    fog: '#101c12',
    ground: '#2a4a28',
    lat: 52,
    lon: 28,
    animals: [
      animal({ id: 'brown-bear', name: '棕熊', nameEn: 'Brown Bear', scientificName: 'Ursus arctos', category: 'mammal', diet: 'omnivore', activity: '独居、季节性冬眠', sub: '针叶林', range: '欧亚大陆和北美洲北部', size: '体重约 80–600 kg', lifespan: '野生约 20–30 年', status: 'LC 无危', shape: 'quad', color: '#7a5230', summary: '杂食，既吃浆果也捕食。', fact: '冬季会在洞穴中休眠。' }),
      animal({ id: 'wolf', name: '灰狼', nameEn: 'Gray Wolf', scientificName: 'Canis lupus', category: 'mammal', diet: 'carnivore', activity: '群居', sub: '针叶林', range: '北半球森林和苔原', size: '体长约 1–1.6 m', lifespan: '野生约 6–8 年', status: 'LC 无危', shape: 'quad', color: '#8a8e92', summary: '以家庭群协作捕猎有蹄类。', fact: '嚎叫用来联络和宣示领地。' }),
      animal({ id: 'red-fox', name: '赤狐', nameEn: 'Red Fox', scientificName: 'Vulpes vulpes', category: 'mammal', diet: 'omnivore', activity: '多夜行、独居', sub: '落叶林', range: '欧亚大陆、北非和北美', size: '体长约 45–90 cm', lifespan: '野生约 3–5 年', status: 'LC 无危', shape: 'quad', color: '#d06a2a', summary: '适应力很强的中型犬科动物。', fact: '尾巴帮助平衡和保暖。' }),
      animal({ id: 'red-deer', name: '马鹿', nameEn: 'Red Deer', scientificName: 'Cervus elaphus', category: 'mammal', diet: 'herbivore', activity: '群居、晨昏', sub: '温带森林', range: '欧洲、西亚和中亚', size: '肩高约 1.1–1.5 m', lifespan: '约 10–15 年', status: 'LC 无危', shape: 'quad', color: '#8a5a32', summary: '雄鹿在繁殖季会鸣叫并角斗。', fact: '角每年脱落并重新生长。' }),
      animal({ id: 'boar', name: '野猪', nameEn: 'Wild Boar', scientificName: 'Sus scrofa', category: 'mammal', diet: 'omnivore', activity: '群居、夜行', sub: '落叶林', range: '欧亚大陆和北非', size: '体长约 0.9–2 m', lifespan: '约 10–14 年', status: 'LC 无危', shape: 'quad', color: '#5c4636', summary: '用吻部拱土寻找根茎和昆虫。', fact: '是家猪的野生祖先。' }),
      animal({ id: 'eagle-owl', name: '雕鸮', nameEn: 'Eurasian Eagle-Owl', scientificName: 'Bubo bubo', category: 'bird', diet: 'carnivore', activity: '夜行', sub: '针叶林', range: '欧洲和亚洲山地与森林', size: '体长约 60–75 cm', lifespan: '野生约 20 年', status: 'LC 无危', shape: 'bird', color: '#6a5344', summary: '大型猫头鹰，捕食鼠类、鸟类和小型兽类。', fact: '耳羽是羽毛，不是耳朵。' })
    ]
  },
  {
    id: 'desert',
    en: 'DESERT',
    name: '沙漠',
    summary: '沙丘、岩石荒漠和绿洲。动物按干旱区真实分布选取。',
    subs: ['沙丘', '岩石荒漠', '绿洲'],
    color: '#d2a15a',
    fog: '#3a2a16',
    ground: '#c4924a',
    lat: 24,
    lon: 12,
    animals: [
      animal({ id: 'wild-camel', name: '野骆驼', nameEn: 'Wild Bactrian Camel', scientificName: 'Camelus ferus', category: 'mammal', diet: 'herbivore', activity: '群居', sub: '岩石荒漠', range: '中国西北和蒙古的荒漠', size: '肩高约 1.8–2.3 m', lifespan: '约 30–40 年', status: 'CR 极危', shape: 'tall', color: '#c4a06a', summary: '能耐受极度干旱，与家养双峰驼不是同一物种。', fact: '可以喝盐度较高的水。' }),
      animal({ id: 'fennec', name: '耳廓狐', nameEn: 'Fennec Fox', scientificName: 'Vulpes zerda', category: 'mammal', diet: 'omnivore', activity: '夜行', sub: '沙丘', range: '撒哈拉沙漠', size: '体长约 24–41 cm', lifespan: '约 10 年', status: 'LC 无危', shape: 'quad', color: '#e6c98a', summary: '大耳朵帮助散热和听地下猎物。', fact: '是体型最小的犬科动物之一。' }),
      animal({ id: 'sidewinder', name: '角响尾蛇', nameEn: 'Sidewinder', scientificName: 'Crotalus cerastes', category: 'reptile', diet: 'carnivore', activity: '夜行', sub: '沙丘', range: '北美西南部沙漠', size: '体长约 40–80 cm', lifespan: '约 10–20 年', status: 'LC 无危', shape: 'snake', color: '#c4a36a', summary: '侧向爬行，减少与灼热沙面的接触。', fact: '尾部角质环振动时发出响声。' }),
      animal({ id: 'meerkat', name: '狐獴', nameEn: 'Meerkat', scientificName: 'Suricata suricatta', category: 'mammal', diet: 'omnivore', activity: '群居、昼行', sub: '绿洲', range: '非洲西南部干旱草原', size: '体长约 25–35 cm', lifespan: '约 8–12 年', status: 'LC 无危', shape: 'quad', color: '#c4a06a', summary: '家族轮流站岗，主要吃昆虫。', fact: '眼睛周围的深色毛发能减少眩光。' })
    ]
  },
  {
    id: 'wetland',
    en: 'WETLAND',
    name: '湿地',
    summary: '沼泽、湖泊、河流和红树林。物种来自不同湿地，不混为同一地点。',
    subs: ['沼泽', '湖泊', '红树林'],
    color: '#3d7a62',
    fog: '#0c241c',
    ground: '#1d4a3c',
    lat: -16,
    lon: -57,
    animals: [
      animal({ id: 'nile-croc', name: '尼罗鳄', nameEn: 'Nile Crocodile', scientificName: 'Crocodylus niloticus', category: 'reptile', diet: 'carnivore', activity: '伏击', sub: '河流', range: '非洲河流与湖泊', size: '体长通常 3.5–5 m', lifespan: '约 70–100 年', status: 'LC 无危', shape: 'snake', color: '#5c6a3a', summary: '大型鳄类，在水边伏击猎物。', fact: '可以长时间潜伏，只露出眼睛和鼻孔。' }),
      animal({ id: 'flamingo', name: '大火烈鸟', nameEn: 'Greater Flamingo', scientificName: 'Phoenicopterus roseus', category: 'bird', diet: 'omnivore', activity: '群居', sub: '湖泊', range: '非洲、南欧和南亚的咸水湖', size: '身高约 1.1–1.5 m', lifespan: '约 30–40 年', status: 'LC 无危', shape: 'bird', color: '#f08aa0', summary: '用滤食喙取食藻类和小甲壳动物。', fact: '粉色来自食物中的类胡萝卜素。' }),
      animal({ id: 'otter', name: '欧亚水獭', nameEn: 'Eurasian Otter', scientificName: 'Lutra lutra', category: 'mammal', diet: 'carnivore', activity: '多夜行', sub: '河流', range: '欧洲和亚洲的清洁河流', size: '体长约 60–90 cm', lifespan: '约 8–12 年', status: 'NT 近危', shape: 'quad', color: '#6a5344', summary: '依赖清洁水体，以鱼类为主食。', fact: '皮毛密实，能在冷水中保温。' }),
      animal({ id: 'egret', name: '大白鹭', nameEn: 'Great Egret', scientificName: 'Ardea alba', category: 'bird', diet: 'carnivore', activity: '昼行', sub: '沼泽', range: '除南极外的各大洲湿地', size: '体长约 80–104 cm', lifespan: '约 15 年', status: 'LC 无危', shape: 'bird', color: '#f7f7f7', summary: '在浅水中缓慢行走，啄食鱼和两栖类。', fact: '繁殖期会长出细长饰羽。' }),
      animal({ id: 'capybara', name: '水豚', nameEn: 'Capybara', scientificName: 'Hydrochoerus hydrochaeris', category: 'mammal', diet: 'herbivore', activity: '群居、半水生', sub: '沼泽', range: '南美洲湿地', size: '体长约 1–1.3 m', lifespan: '约 8–10 年', status: 'LC 无危', shape: 'quad', color: '#a07848', summary: '最大的啮齿动物，喜欢待在水边。', fact: '脚趾有蹼，便于游泳。' })
    ]
  },
  {
    id: 'mountain',
    en: 'MOUNTAIN',
    name: '山地',
    summary: '高山、雪山、山谷和岩壁。代表动物以中亚高山为主。',
    subs: ['高山', '雪山', '岩壁'],
    color: '#8aa0b0',
    fog: '#121820',
    ground: '#5c6a74',
    lat: 32,
    lon: 82,
    animals: [
      animal({ id: 'snow-leopard', name: '雪豹', nameEn: 'Snow Leopard', scientificName: 'Panthera uncia', category: 'mammal', diet: 'carnivore', activity: '独居、晨昏', sub: '岩壁', range: '中亚高山', size: '体长约 1–1.3 m', lifespan: '野生约 10–12 年', status: 'VU 易危', shape: 'quad', color: '#d5d8de', summary: '生活在高海拔岩壁，捕食岩羊等有蹄类。', fact: '长尾帮助在陡坡上平衡。' }),
      animal({ id: 'ibex', name: '北山羊', nameEn: 'Siberian Ibex', scientificName: 'Capra sibirica', category: 'mammal', diet: 'herbivore', activity: '群居', sub: '岩壁', range: '中亚山地', size: '肩高约 80–100 cm', lifespan: '约 12–16 年', status: 'NT 近危', shape: 'quad', color: '#a89878', summary: '善于在近乎垂直的岩壁上行走。', fact: '雄性的角可向后弯曲很长。' }),
      animal({ id: 'yak', name: '野牦牛', nameEn: 'Wild Yak', scientificName: 'Bos mutus', category: 'mammal', diet: 'herbivore', activity: '群居', sub: '雪山', range: '青藏高原', size: '肩高约 1.6–2 m', lifespan: '约 20 年', status: 'VU 易危', shape: 'quad', color: '#2a2a2a', summary: '适应高海拔缺氧和严寒。', fact: '与家牦牛是不同的野生种群。' }),
      animal({ id: 'golden-eagle', name: '金雕', nameEn: 'Golden Eagle', scientificName: 'Aquila chrysaetos', category: 'bird', diet: 'carnivore', activity: '昼行、独居或成对', sub: '山谷', range: '北半球山地', size: '翼展约 1.8–2.3 m', lifespan: '野生约 20–30 年', status: 'LC 无危', shape: 'bird', color: '#8a6230', summary: '大型猛禽，在山地上升气流中滑翔。', fact: '巢可以连续使用很多年。' })
    ]
  }
]

export function allAnimals() {
  return HABITATS.flatMap((habitat) => habitat.animals.map((item) => ({ ...item, habitatId: habitat.id, habitatName: habitat.name })))
}

export function findAnimal(id) {
  return allAnimals().find((item) => item.id === id) || null
}

export function findHabitat(id) {
  return HABITATS.find((item) => item.id === id) || null
}
