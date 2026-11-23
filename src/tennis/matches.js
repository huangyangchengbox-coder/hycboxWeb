/**
 * 经典战役录像清单。
 * 原始来源：D:/play_joy/网球/历史大赛视频地址.txt
 * url 按清单原样保留（watch 为直链，search 为 YouTube 搜索页，channel 为官方频道）。
 * bili 是国内可达的备选搜索词，避免 YouTube 打不开时无处可看。
 */
export const MATCHES = [
  {
    id: 1,
    year: 2008,
    event: '温网决赛',
    surface: 'grass',
    players: '费德勒 vs 纳达尔',
    url: 'https://www.youtube.com/watch?v=mHsg2M25PzY',
    kind: 'watch',
    note: '纳达尔五盘逆转，首夺温网；常被称作温网史上最伟大的一场决赛。'
  },
  {
    id: 2,
    year: 2009,
    event: '澳网决赛',
    surface: 'hard',
    players: '纳达尔 vs 费德勒',
    url: 'https://www.youtube.com/watch?v=VCqHiT5Do8s',
    kind: 'watch',
    note: '墨尔本高温下的五盘拉锯，纳达尔拿下关键分，首夺澳网。'
  },
  {
    id: 3,
    year: 2012,
    event: '澳网决赛',
    surface: 'hard',
    players: '德约科维奇 vs 纳达尔',
    url: 'https://www.youtube.com/results?search_query=Australian+Open+2012+Djokovic+Nadal+Full+Match',
    kind: 'search',
    note: '德约在落后时翻盘，五盘击败纳达尔，开启澳网统治期。'
  },
  {
    id: 4,
    year: 2013,
    event: '法网半决赛',
    surface: 'clay',
    players: '纳达尔 vs 德约科维奇',
    url: 'https://www.youtube.com/watch?v=sEiB2E_N3OA',
    kind: 'watch',
    note: '罗兰加洛斯的长盘大战，纳达尔在红土上又一次笑到最后。'
  },
  {
    id: 5,
    year: 2014,
    event: '温网决赛',
    surface: 'grass',
    players: '德约科维奇 vs 费德勒',
    url: 'https://www.youtube.com/results?search_query=Wimbledon+2014+Djokovic+Federer+Full+Match',
    kind: 'search',
    note: '德约五盘力克费德勒，首夺温网，全英俱乐部换了新的主人。'
  },
  {
    id: 6,
    year: 2015,
    event: '温网决赛',
    surface: 'grass',
    players: '德约科维奇 vs 费德勒',
    url: 'https://www.youtube.com/results?search_query=Wimbledon+2015+Djokovic+Federer+Full+Match',
    kind: 'search',
    note: '两人再次在中央球场相遇，德约卫冕，把交锋优势又拉开一档。'
  },
  {
    id: 7,
    year: 2017,
    event: '澳网决赛',
    surface: 'hard',
    players: '费德勒 vs 纳达尔',
    url: 'https://www.youtube.com/results?search_query=Australian+Open+2017+Federer+Nadal+Full+Match',
    kind: 'search',
    note: '费德勒五盘逆转，第 18 座大满贯，时隔多年重回世界之巅。'
  },
  {
    id: 8,
    year: 2018,
    event: '温网半决赛',
    surface: 'grass',
    players: '德约科维奇 vs 纳达尔',
    url: 'https://www.youtube.com/results?search_query=Wimbledon+2018+Djokovic+Nadal+Full+Match',
    kind: 'search',
    note: '德约直落三盘过掉纳达尔，这场常被看作那届温网的转折点。'
  },
  {
    id: 9,
    year: 2019,
    event: '温网决赛',
    surface: 'grass',
    players: '德约科维奇 vs 费德勒',
    url: 'https://www.youtube.com/results?search_query=Wimbledon+2019+Djokovic+Federer+Full+Match',
    kind: 'search',
    note: '又一场五盘大战，德约拿下第五座温网，追平费德勒的纪录脚步。'
  },
  {
    id: 10,
    year: 2019,
    event: '温网半决赛',
    surface: 'grass',
    players: '费德勒 vs 纳达尔',
    url: 'https://www.youtube.com/@Wimbledon',
    kind: 'channel',
    note: '清单末条指向温网官方频道，可从这里找官方集锦与经典全场回放。'
  }
]

export const MATCH_FILTERS = [
  { id: 'all', name: '全部' },
  { id: '温网', name: '温网' },
  { id: '澳网', name: '澳网' },
  { id: '法网', name: '法网' }
]

/** B 站搜索备选：国内网络下 YouTube 不可达时用它找同一场比赛。 */
export function biliUrl(match) {
  const words = `${match.year} ${match.event} ${match.players.replace(' vs ', ' ')}`
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(words)}`
}

export function matchKindLabel(kind) {
  if (kind === 'watch') return '观看比赛'
  if (kind === 'channel') return '官方频道'
  return 'YouTube 搜索'
}
