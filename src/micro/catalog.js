export const MODES = [
  { id: 'atom', en: 'ATOMS', name: '原子世界', hint: '概率云，不是轨道环' },
  { id: 'molecule', en: 'MOLECULES', name: '分子工厂', hint: '球棍模型可以拖拽旋转' },
  { id: 'dna', en: 'DNA', name: '生命密码', hint: '按 B-DNA 的口径做示意' },
  { id: 'cell', en: 'CELL', name: '细胞之旅', hint: '点细胞器看档案' },
  { id: 'virus', en: 'VIRUS & PROTEIN', name: '病毒与蛋白质', hint: '只有结构，不讲致病' },
  { id: 'scale', en: 'SCALE JOURNEY', name: '尺度之旅', hint: '从 1 厘米潜入 0.1 纳米' },
  { id: 'quiz', en: 'QUIZ', name: '知识挑战', hint: '六题，答错可以重来' }
]

export const MICRO_QUIZ = [
  { q: 'A 和 T 之间通常有几条氢键？', options: ['1 条', '2 条', '3 条'], answer: 1 },
  { q: 'G 和 C 之间通常有几条氢键？', options: ['2 条', '3 条', '4 条'], answer: 1 },
  { q: '病毒有细胞结构吗？', options: ['有，只是很小', '没有，必须借助宿主细胞才能复制', '有细胞核，但没有细胞膜'], answer: 1 },
  { q: '线粒体在这里对应哪句话？', options: ['细胞里进行能量转换的细胞器', '存放全部遗传信息的唯一位置', '只有植物才有的光合器官'], answer: 0 },
  { q: '水分子 H—O—H 的键角大约是？', options: ['90°', '104.5°', '180°'], answer: 1 },
  { q: '哪一种是从大到小？', options: ['原子 > 病毒 > 细胞', '细胞 > 病毒 > 蛋白质 > 原子', '蛋白质 > 细胞 > 病毒'], answer: 1 }
]
