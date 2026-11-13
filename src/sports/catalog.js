/**
 * 运动科学数据。
 * 场地尺寸取自各项目国际联合会（ITF / FIBA / FIFA / FIVB / BWF / ITTF）公开规格；
 * 物理参数（球速、旋转、弹跳）为教学示意口径，界面会标注。
 */

export const SPORTS = [
  {
    id: 'tennis',
    name: '网球',
    en: 'TENNIS',
    icon: '🎾',
    route: '/tennis',
    tag: '拍类 · 隔网',
    venue: { length: 23.77, width: 10.97, netHeight: 0.914, unit: 'm' },
    venueText: '23.77 × 10.97 m（双打），网中央高 0.914 m',
    ball: { speed: '职业发球 200+ km/h', spin: '上旋 2500–3500 rpm', weight: '56.0–59.4 g' },
    rules: [
      '计分 0 / 15 / 30 / 40，40-40 后需净胜两分',
      '一盘先到 6 局且净胜 2 局，6-6 进抢七',
      '每分两次发球，擦网进区重发不扣次数'
    ],
    physics: '上旋靠马格努斯力下压，弧线更高也能压住落点；落地后旋转抓住地面，球向前上方跳。',
    skills: ['转肩引拍，拍头留在手后面', '击球点在身体前侧 30–50 cm', '重心从后脚转到前脚'],
    color: '#d8f34a'
  },
  {
    id: 'basketball',
    name: '篮球',
    en: 'BASKETBALL',
    icon: '🏀',
    route: '/sports?game=basketball',
    tag: '投掷 · 对抗',
    venue: { length: 28, width: 15, rimHeight: 3.05, unit: 'm' },
    venueText: '28 × 15 m，篮圈高 3.05 m，三分线 6.75 m（底角 6.60 m）',
    ball: { speed: '传球可达 20 m/s', spin: '跳投后旋约 2–3 转/秒', weight: '567–650 g' },
    rules: [
      '进攻方 24 秒内必须出手且触及篮圈',
      '持球移动超过两步算走步',
      '单节全队犯规满 5 次后对方罚球'
    ],
    physics: '后旋让球在碰板与碰圈时向下“咬”，提高入筐概率；出手角度约 45–52° 时入筐窗口最大。',
    skills: ['屈膝蓄力，力量从脚到手依次传递', '出手点高于额头，手腕下压形成后旋', '落地先脚掌后脚跟，保护膝踝'],
    color: '#ff9f4a'
  },
  {
    id: 'football',
    name: '足球',
    en: 'FOOTBALL',
    icon: '⚽',
    route: '/sports?game=football',
    tag: '脚部 · 团队',
    venue: { length: 105, width: 68, goalHeight: 2.44, unit: 'm' },
    venueText: '105 × 68 m（国际比赛推荐），球门 7.32 × 2.44 m',
    ball: { speed: '职业射门 100–130 km/h', spin: '弧线球 8–10 转/秒', weight: '410–450 g' },
    rules: [
      '每队 11 人，越位按接球瞬间位置判定',
      '禁区内的可判犯规导致点球',
      '两黄变一红，红牌立即离场'
    ],
    physics: '脚背内侧搓球产生侧旋，马格努斯力让球在空中画弧；这就是“香蕉球”的来源。',
    skills: ['支撑脚在球侧 10–15 cm，脚尖指向目标', '触球点在球的中下部偏侧', '摆腿加速后立刻收力，控制出球高度'],
    color: '#5ec8ff'
  },
  {
    id: 'badminton',
    name: '羽毛球',
    en: 'BADMINTON',
    icon: '🏸',
    route: '/sports?game=badminton',
    tag: '拍类 · 隔网',
    venue: { length: 13.4, width: 6.1, netHeight: 1.55, unit: 'm' },
    venueText: '13.4 × 6.1 m（双打），网中央高 1.524 m，边线处 1.55 m',
    ball: { speed: '顶级杀球 490+ km/h', spin: '几乎不靠旋转', weight: '4.74–5.50 g' },
    rules: [
      '每球得分制，21 分一局，20-20 后需净胜 2 分',
      '发球必须低于 1.15 m 且向后场起',
      '三局两胜，局间交换场区'
    ],
    physics: '羽毛球是阻力主导的运动：球头重、羽毛产生极大阻力，速度衰减比网球快得多，所以轨迹是陡降而非抛物线。',
    skills: ['握拍放松，击球瞬间收紧', '高远球击球点在头顶前上方', '杀球靠手腕闪动而不是抡手臂'],
    color: '#7cf2b0'
  },
  {
    id: 'tabletennis',
    name: '乒乓球',
    en: 'TABLE TENNIS',
    icon: '🏓',
    route: '/sports?game=tabletennis',
    tag: '拍类 · 隔网',
    venue: { length: 2.74, width: 1.525, netHeight: 0.1525, unit: 'm' },
    venueText: '2.74 × 1.525 m，台高 0.76 m，网高 15.25 cm',
    ball: { speed: '扣杀 100+ km/h', spin: '顶级上旋 9000+ rpm', weight: '2.7 g（40+ 球）' },
    rules: [
      '每局 11 分，10-10 后需净胜 2 分',
      '每 2 分换发球，10-10 后每 1 分换发',
      '发球须抛球 16 cm 以上，且不可遮挡'
    ],
    physics: '乒乓球是旋转占比最高的球类，马格努斯力足以让球在过网后突然下坠，这就是“弧圈球”的威胁。',
    skills: ['重心压低，引拍在腰侧', '触球瞬间手腕加速摩擦球的中上部', '还原比击球更重要'],
    color: '#ffd166'
  },
  {
    id: 'swimming',
    name: '游泳',
    en: 'SWIMMING',
    icon: '🏊',
    route: '/sports?game=swimming',
    tag: '水上 · 竞速',
    venue: { length: 50, width: 25, lane: 2.5, unit: 'm' },
    venueText: '50 × 25 m（奥运池 10 泳道），每条泳道宽 2.5 m，水深 ≥ 2 m',
    ball: null,
    rules: [
      '出发后 15 m 内必须露出水面',
      '自由泳转身必须触壁，可翻滚',
      '蝶泳、蛙泳双手必须同时触壁'
    ],
    physics: '水的密度是空气的约 800 倍，阻力随速度平方增长。所以游泳成绩的进步，一半来自减少阻力而非增加力量。',
    skills: ['身体保持流线型，头位低', '抱水后向后推水，不是向下压水', '呼吸与划水节奏绑定，不要抬头'],
    color: '#4ad3ff'
  },
  {
    id: 'athletics',
    name: '田径',
    en: 'ATHLETICS',
    icon: '🏃',
    route: '/sports?game=athletics',
    tag: '跑跳投',
    venue: { length: 400, lanes: 8, lane: 1.22, unit: 'm' },
    venueText: '标准跑道一圈 400 m，8 条道，道宽 1.22 m',
    ball: null,
    rules: [
      '起跑抢跑一次即取消资格',
      '分道跑项目不得踩内侧分道线',
      '竞走要求始终有一脚着地，支撑腿伸直'
    ],
    physics: '短跑的关键是水平方向发力效率：起跑阶段身体前倾约 45°，随速度提升逐渐直立，减少无效的垂直分力。',
    skills: ['起跑器蹬伸，前 10 步不要急于抬头', '摆臂前后而不是左右', '途中跑脚掌落在重心正下方'],
    color: '#ff8a4c'
  }
]

export function sportById(id) {
  return SPORTS.find((item) => item.id === id) || SPORTS[0]
}
