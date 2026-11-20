/** 二十四节气：太阳黄经每 15° 一格。日期是公历常年近似，不是逐年推算。 */
export const SOLAR_TERMS = [
  { name: '立春', lon: 315, date: '02-04', phenology: '东风解冻', custom: '咬春、迎春' },
  { name: '雨水', lon: 330, date: '02-19', phenology: '獭祭鱼，鸿雁来', custom: '接雨水' },
  { name: '惊蛰', lon: 345, date: '03-05', phenology: '桃始华，蛰虫醒', custom: '打小人、祭白虎' },
  { name: '春分', lon: 0, date: '03-20', phenology: '昼夜几乎等长', custom: '竖蛋、祭日' },
  { name: '清明', lon: 15, date: '04-04', phenology: '桐始华，虹始见', custom: '扫墓、踏青' },
  { name: '谷雨', lon: 30, date: '04-20', phenology: '萍始生，雨生百谷', custom: '品茶、祭仓颉' },
  { name: '立夏', lon: 45, date: '05-05', phenology: '蝼蝈鸣，蚯蚓出', custom: '称人、尝新' },
  { name: '小满', lon: 60, date: '05-21', phenology: '麦粒渐满', custom: '祭车神、蚕神' },
  { name: '芒种', lon: 75, date: '06-05', phenology: '螳螂生，有芒作物可种', custom: '送花神、安苗' },
  { name: '夏至', lon: 90, date: '06-21', phenology: '北半球白昼最长', custom: '祭地、吃面' },
  { name: '小暑', lon: 105, date: '07-07', phenology: '温风至', custom: '食新、晒书' },
  { name: '大暑', lon: 120, date: '07-23', phenology: '一年中最热的一段', custom: '饮伏茶、晒伏姜' },
  { name: '立秋', lon: 135, date: '08-07', phenology: '凉风至', custom: '贴秋膘、咬秋' },
  { name: '处暑', lon: 150, date: '08-23', phenology: '暑气止', custom: '开渔、祭祖' },
  { name: '白露', lon: 165, date: '09-07', phenology: '露凝而白', custom: '收清露、酿白露茶' },
  { name: '秋分', lon: 180, date: '09-23', phenology: '昼夜再次等长', custom: '祭月、竖蛋' },
  { name: '寒露', lon: 195, date: '10-08', phenology: '露气寒冷', custom: '登高、赏菊' },
  { name: '霜降', lon: 210, date: '10-23', phenology: '气肃而凝霜', custom: '赏菊、进补' },
  { name: '立冬', lon: 225, date: '11-07', phenology: '水始冰', custom: '补冬、吃饺子' },
  { name: '小雪', lon: 240, date: '11-22', phenology: '虹藏不见', custom: '腌腊肉、吃糍粑' },
  { name: '大雪', lon: 255, date: '12-07', phenology: '鹖鴠不鸣', custom: '腌肉、观赏封河' },
  { name: '冬至', lon: 270, date: '12-21', phenology: '北半球白昼最短', custom: '数九、吃汤圆或饺子' },
  { name: '小寒', lon: 285, date: '01-05', phenology: '雁北乡', custom: '吃菜饭、探梅' },
  { name: '大寒', lon: 300, date: '01-20', phenology: '鸡始乳，一年中最冷的一段', custom: '尾牙、除尘' }
]

export function termByLongitude(lon) {
  let best = SOLAR_TERMS[0]
  let bestDiff = 999
  for (const term of SOLAR_TERMS) {
    let diff = Math.abs(lon - term.lon)
    if (diff > 180) diff = 360 - diff
    if (diff < bestDiff) {
      bestDiff = diff
      best = term
    }
  }
  return { term: best, diff: bestDiff }
}
