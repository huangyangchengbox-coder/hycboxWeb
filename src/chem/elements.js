const SYMBOL = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(/\s+/)

const NAME = ['氢','氦','锂','铍','硼','碳','氮','氧','氟','氖','钠','镁','铝','硅','磷','硫','氯','氩','钾','钙','钪','钛','钒','铬','锰','铁','钴','镍','铜','锌','镓','锗','砷','硒','溴','氪','铷','锶','钇','锆','铌','钼','锝','钌','铑','钯','银','镉','铟','锡','锑','碲','碘','氙','铯','钡','镧','铈','镨','钕','钷','钐','铕','钆','铽','镝','钬','铒','铥','镱','镥','铪','钽','钨','铼','锇','铱','铂','金','汞','铊','铅','铋','钋','砹','氡','钫','镭','锕','钍','镤','铀','镎','钚','镅','锔','锫','锎','锿','镄','钔','锘','铹','Rf','Db','Sg','Bh','Hs','Mt','Ds','Rg','Cn','Nh','Fl','Mc','Lv','Ts','Og']

const MASS = [
  1.008, 4.003, 6.94, 9.012, 10.81, 12.011, 14.007, 15.999, 18.998, 20.180,
  22.990, 24.305, 26.982, 28.085, 30.974, 32.06, 35.45, 39.95, 39.098, 40.078,
  44.956, 47.867, 50.942, 51.996, 54.938, 55.845, 58.933, 58.693, 63.546, 65.38,
  69.723, 72.630, 74.922, 78.971, 79.904, 83.798, 85.468, 87.62, 88.906, 91.224,
  92.906, 95.95, 98, 101.07, 102.91, 106.42, 107.87, 112.41, 114.82, 118.71,
  121.76, 127.60, 126.90, 131.29, 132.91, 137.33, 138.91, 140.12, 140.91, 144.24,
  145, 150.36, 151.96, 157.25, 158.93, 162.50, 164.93, 167.26, 168.93, 173.05,
  174.97, 178.49, 180.95, 183.84, 186.21, 190.23, 192.22, 195.08, 196.97, 200.59,
  204.38, 207.2, 208.98, 209, 210, 222, 223, 226, 227, 232.04,
  231.04, 238.03, 237, 244, 243, 247, 247, 251, 252, 257,
  258, 259, 266, 267, 268, 269, 270, 277, 278, 281,
  282, 285, 286, 289, 290, 293, 294, 294
]

const SUBSHELLS = [
  [1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10], [4, 6],
  [5, 2], [4, 10], [5, 6], [6, 2], [4, 14], [5, 10], [6, 6],
  [7, 2], [5, 14], [6, 10], [7, 6]
]

function shellsOf(z) {
  const count = [0, 0, 0, 0, 0, 0, 0, 0]
  let left = z
  for (const [n, cap] of SUBSHELLS) {
    const take = Math.min(cap, left)
    count[n] += take
    left -= take
    if (left <= 0) break
  }
  const shells = []
  for (let n = 1; n <= 7; n += 1) {
    if (count[n] || count.slice(n + 1).some(Boolean)) shells.push(count[n])
  }
  while (shells.length && shells[shells.length - 1] === 0) shells.pop()
  return shells
}

function categoryOf(z) {
  if (z >= 57 && z <= 71) return 'lanthanide'
  if (z >= 89 && z <= 103) return 'actinide'
  if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 'noble'
  if ([9, 17, 35, 53, 85, 117].includes(z)) return 'halogen'
  if ([5, 14, 32, 33, 51, 52, 84].includes(z)) return 'metalloid'
  if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return 'nonmetal'
  if ([3, 11, 19, 37, 55, 87].includes(z)) return 'alkali'
  if ([4, 12, 20, 38, 56, 88].includes(z)) return 'alkaline'
  if ([13, 31, 49, 50, 81, 82, 83, 113, 114, 115, 116].includes(z)) return 'post'
  return 'transition'
}

export const CATEGORY_LABEL = {
  alkali: '碱金属',
  alkaline: '碱土金属',
  transition: '过渡金属',
  post: '贫金属',
  metalloid: '类金属',
  nonmetal: '非金属',
  halogen: '卤素',
  noble: '稀有气体',
  lanthanide: '镧系',
  actinide: '锕系'
}

export const CATEGORY_COLOR = {
  alkali: '#e25b5b',
  alkaline: '#e39b4a',
  transition: '#e2c14a',
  post: '#8dce6a',
  metalloid: '#3cb8a0',
  nonmetal: '#3aa0e0',
  halogen: '#5b7cff',
  noble: '#b07cff',
  lanthanide: '#e27ab0',
  actinide: '#d06ad0'
}

const GAS = new Set([1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86])
const LIQUID = new Set([35, 80])

const NOTES = {
  1: '宇宙里最多的元素，恒星靠它聚变。',
  2: '最难参与反应的元素之一，气球和低温都用得到它。',
  6: '有机分子的骨架。金刚石和石墨都是碳，差别在原子怎么连。',
  7: '空气的主要成分，蛋白质和 DNA 里也少不了。',
  8: '呼吸和燃烧都在消耗它，水分子里占一个位置。',
  11: '遇水剧烈反应。食盐里的钠是已经交出电子的钠离子。',
  17: '黄绿色气体。和钠形成典型的离子化合物氯化钠。',
  26: '地核和血红蛋白里都有它。潮湿空气里会慢慢变成锈。',
  29: '导电导热都很好，也是少数有颜色的金属。',
  47: '导电性最好的金属之一，摄影史上的卤化银也靠它。',
  79: '很难被氧化，所以能长期保持光泽。',
  80: '常温下少见的液态金属，蒸气有毒。',
  82: '密度大、较软，曾经广泛用于水管和油漆。',
  92: '核裂变燃料。地壳里的铀几乎都是铀-238。'
}

function cellOf(z) {
  if (z === 1) return { row: 1, col: 1 }
  if (z === 2) return { row: 1, col: 18 }
  if (z <= 4) return { row: 2, col: z - 2 }
  if (z <= 10) return { row: 2, col: z + 8 }
  if (z <= 12) return { row: 3, col: z - 10 }
  if (z <= 18) return { row: 3, col: z }
  if (z <= 36) return { row: 4, col: z - 18 }
  if (z <= 54) return { row: 5, col: z - 36 }
  if (z <= 56) return { row: 6, col: z - 54 }
  if (z <= 71) return { row: 9, col: z - 54 }
  if (z <= 86) return { row: 6, col: z - 68 }
  if (z <= 88) return { row: 7, col: z - 86 }
  if (z <= 103) return { row: 10, col: z - 86 }
  return { row: 7, col: z - 100 }
}

function build() {
  return SYMBOL.map((symbol, index) => {
    const z = index + 1
    const category = categoryOf(z)
    const shells = shellsOf(z)
    const state = GAS.has(z) ? '气' : LIQUID.has(z) ? '液' : '固'
    return {
      z,
      symbol,
      name: NAME[index] || symbol,
      mass: MASS[index],
      category,
      categoryLabel: CATEGORY_LABEL[category],
      color: CATEGORY_COLOR[category],
      shells,
      shellText: shells.join(' · '),
      state,
      metal: ['alkali', 'alkaline', 'transition', 'post', 'lanthanide', 'actinide'].includes(category),
      radioactive: z >= 84 || z === 43 || z === 61,
      note: NOTES[z] || `${CATEGORY_LABEL[category]}。壳层按构造原理排布，过渡金属有例外。`,
      ...cellOf(z)
    }
  })
}

export const ELEMENTS = build()

export function elementByZ(z) {
  return ELEMENTS[z - 1]
}
