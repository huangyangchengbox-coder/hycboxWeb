export const TIMELINE = [
  { year: 1873, text: '温菲尔德少校发表《草地网球》规则，现代网球雏形', racket: 'wood' },
  { year: 1877, text: '首届温布尔登锦标赛，草地，仅设男子单打', racket: 'wood' },
  { year: 1881, text: '美国草地网球协会举办首届全美锦标赛', racket: 'wood' },
  { year: 1891, text: '法国锦标赛创办（1925 年起对国际球员开放）', racket: 'wood' },
  { year: 1905, text: '澳大拉西亚锦标赛创办，澳网前身', racket: 'wood' },
  { year: 1913, text: '国际草地网球联合会成立，统一规则', racket: 'wood' },
  { year: 1968, text: '公开赛年代开启，职业球员首次获准参赛', racket: 'wood' },
  { year: 1978, text: '美网迁至法拉盛草地公园，改用硬地', racket: 'metal' },
  { year: 1988, text: '网球重返奥运会（汉城），此前 1924 年后长期退出', racket: 'metal' },
  { year: 2006, text: '美网率先全面引入鹰眼回放', racket: 'carbon' },
  { year: 2022, text: '四大满贯决胜盘统一为 10 分抢七', racket: 'carbon' },
  { year: 2024, text: '郑钦文夺得巴黎奥运会女单金牌', racket: 'carbon' }
]

export const CHINA = [
  { year: 2004, text: '雅典奥运会，李婷 / 孙甜甜夺得女双金牌' },
  { year: 2011, text: '法网，李娜成为亚洲首位大满贯单打冠军' },
  { year: 2014, text: '澳网，李娜拿下第二座大满贯单打冠军' },
  { year: 2024, text: '巴黎奥运会，郑钦文女单金牌，中国首枚奥运网球单打金牌' }
]

export const RACKETS = {
  wood: {
    id: 'wood',
    name: '木拍',
    era: '1920s',
    headArea: 68,
    pattern: [14, 17],
    frameColor: 0x8a6134,
    accent: 0xb8874a,
    thickness: 0.03,
    length: 0.7,
    weight: 375,
    line: '拍面约 65 平方英寸，重 350–400 g，甜区小、靠手感'
  },
  metal: {
    id: 'metal',
    name: '金属拍',
    era: '1970s',
    headArea: 90,
    pattern: [16, 19],
    frameColor: 0x9aa7b4,
    accent: 0xdfe6ee,
    thickness: 0.02,
    length: 0.685,
    weight: 340,
    line: '细管钢或铝拍框，拍面 85–95 平方英寸，更轻更快'
  },
  carbon: {
    id: 'carbon',
    name: '碳纤维拍',
    era: '2000s',
    headArea: 100,
    pattern: [16, 19],
    frameColor: 0x16232f,
    accent: 0xd8f34a,
    thickness: 0.026,
    length: 0.685,
    weight: 300,
    line: '厚框 100 平方英寸、约 300 g，甜区大、容错高'
  }
}
