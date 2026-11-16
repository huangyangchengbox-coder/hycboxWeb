/**
 * 3D 智慧城市数字孪生 —— 数据层。
 *
 * 一座城、64 个街区（8×8）、六张基础设施网叠在同一张街道网格上。
 * 所有读数都是本地模拟：用固定种子 + 时间的正弦扰动，让数字"活"起来，
 * 不对应任何真实城市。
 *
 * 坐标：城市铺在 XZ 平面，每格一个街区，街区之间是街道。
 *   世界单位 1 = 1 个街区间距。city 半径约 4 格。
 */

export const CITY = {
  grid: 8,
  block: 1, // 街区边长
  street: 0.34, // 街道宽
  seed: 20261011
}

/** 固定种子伪随机，保证每次打开是同一座城。 */
export function seededRandom(seed = CITY.seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** 街区中心坐标（8×8）。 */
export function blockCenters() {
  const n = CITY.grid
  const step = CITY.block + CITY.street
  const half = ((n - 1) * step) / 2
  const out = []
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      out.push({ i, j, x: i * step - half, z: j * step - half })
    }
  }
  return out
}

/** 六张网。cam 是聚焦时的镜头机位，radius 是飞过去后的观察半径。 */
export const NETS = [
  {
    id: 'water',
    key: 'water',
    name: '供水网',
    en: 'Water',
    icon: '💧',
    color: '#4ea8ff',
    hex: 0x4ea8ff,
    tag: '取水 → 水厂 → 干管 → 计量环网 → 水塔',
    desc: '水库取水经水厂处理后，由 DN1200 输水干管送进城，分到 8 个计量环网，末端有高位水塔稳压。路口布满压力传感器。',
    cam: { pos: [-3.2, 2.4, 3.0], target: [-1.4, 0.5, 1.2] },
    underground: true,
    kpis: [
      { label: '出厂流量', unit: 'm³/h', base: 4260, jitter: 130 },
      { label: '管网压力', unit: 'MPa', base: 0.42, jitter: 0.02, digits: 2 },
      { label: '漏损率', unit: '%', base: 8.4, jitter: 0.5, digits: 1 },
      { label: '在线传感器', unit: '个', base: 1268, jitter: 3, digits: 0 }
    ],
    facilities: [
      { name: '西山水库取水口', kind: 'intake', x: -3.0, z: 2.6 },
      { name: '城北水厂', kind: 'plant', x: -1.6, z: 1.4 },
      { name: 'DN1200 输水干管', kind: 'main', x: -0.4, z: 1.0 },
      { name: '高位水塔 3#', kind: 'tower', x: 1.5, z: 2.2 },
      { name: '计量环网 · 东区', kind: 'ring', x: 2.4, z: -0.6 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: 'DN1200 干管 K3+200 处压力骤降至 0.11 MPa，疑似爆管' },
      { t: 1.6, lvl: 'warn', msg: '分区阀门联动：关闭 K3 段上下游闸阀，隔离故障管段' },
      { t: 3.8, lvl: 'info', msg: '调度中心提升城北水厂出厂压力 0.05 MPa，经环网反向补供' },
      { t: 6.4, lvl: 'info', msg: '抢修车 W-07 抵达现场，开挖点已定位（误差 0.8 m）' },
      { t: 11, lvl: 'good', msg: 'K3 段修复完成，阀门逐步开启，压力回到 0.42 MPa' }
    ]
  },
  {
    id: 'power',
    key: 'power',
    name: '电网',
    en: 'Power',
    icon: '⚡',
    color: '#ffd166',
    hex: 0xffd166,
    tag: '风光储 + 220 kV 变电站 + 自愈配网',
    desc: '风电场、光伏、氢能就绪的燃气电厂接入 220 kV 变电站，配网是自愈环网，另有电池储能和屋顶光伏反送电。',
    cam: { pos: [3.4, 2.8, 3.2], target: [1.5, 0.7, 0.8] },
    underground: false,
    kpis: [
      { label: '电网负荷', unit: 'MW', base: 486, jitter: 22, digits: 0 },
      { label: '新能源占比', unit: '%', base: 41.2, jitter: 2.1, digits: 1 },
      { label: '储能 SOC', unit: '%', base: 68, jitter: 1.2, digits: 0 },
      { label: '馈线可用率', unit: '%', base: 99.98, jitter: 0.01, digits: 2 }
    ],
    facilities: [
      { name: '220 kV 城东变电站', kind: 'substation', x: 2.6, z: 0.6 },
      { name: '北部风电场', kind: 'wind', x: 3.2, z: -2.4 },
      { name: '屋顶光伏群', kind: 'solar', x: 1.2, z: -1.6 },
      { name: '电池储能站 120 MW', kind: 'battery', x: 0.6, z: 2.4 },
      { name: '燃气调峰电厂', kind: 'gas', x: 3.4, z: 2.2 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: 'D-2 分区变电站主变跳闸，馈线 F3/F4 失电' },
      { t: 1.2, lvl: 'warn', msg: '自愈：联络开关 0.3 s 内合闸，负荷转移至南侧馈线' },
      { t: 4.2, lvl: 'info', msg: '储能放电 120 MW 顶住晚高峰，频率回到 50.01 Hz' },
      { t: 8.5, lvl: 'info', msg: '抢修班组抵达 D-2，主变油温 62℃，未发现本体故障' },
      { t: 12, lvl: 'good', msg: 'D-2 恢复送电，馈线回到正常运行方式' }
    ]
  },
  {
    id: 'compute',
    key: 'compute',
    name: '算力网',
    en: 'Compute',
    icon: '🖥️',
    color: '#7cf2b0',
    hex: 0x7cf2b0,
    tag: '数据中心园区 + 边缘节点 + 东数西算',
    desc: '东区一座数据中心园区，算力调度到楼顶的边缘节点，并通过长距离光链路把批处理任务卸载到「西部算力枢纽」。',
    cam: { pos: [3.2, 3.0, -1.6], target: [1.6, 0.6, -2.4] },
    underground: false,
    kpis: [
      { label: '总算力', unit: 'PFLOPS', base: 186, jitter: 6, digits: 0 },
      { label: 'GPU 利用率', unit: '%', base: 76.4, jitter: 3.4, digits: 1 },
      { label: '园区 PUE', unit: '', base: 1.24, jitter: 0.02, digits: 2 },
      { label: '在线节点', unit: '个', base: 342, jitter: 4, digits: 0 }
    ],
    facilities: [
      { name: '城东数据中心园区', kind: 'datacenter', x: 2.8, z: -2.2 },
      { name: '楼顶边缘节点 E-12', kind: 'edge', x: 0.8, z: -2.6 },
      { name: '西部算力枢纽光链路', kind: 'link', x: 3.4, z: -0.8 },
      { name: '液冷机房 A', kind: 'cooling', x: 2.2, z: -2.8 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: '边缘节点 E-12 队列积压，GPU 利用率 99%，请求超时率升至 6.4%' },
      { t: 1.4, lvl: 'warn', msg: '调度器把 38 个推理任务迁移到园区 A 区空闲卡' },
      { t: 3.6, lvl: 'info', msg: '批处理任务经光链路卸载至西部算力枢纽（时延 18 ms）' },
      { t: 7.2, lvl: 'info', msg: '液冷机房提高流量，进液温度稳定在 32℃' },
      { t: 10, lvl: 'good', msg: 'E-12 队列恢复正常，超时率回到 0.02%' }
    ]
  },
  {
    id: 'comms',
    key: 'comms',
    name: '通信网',
    en: 'Comms',
    icon: '📡',
    color: '#c5a3ff',
    hex: 0xc5a3ff,
    tag: '6G 宏站 · 毫米波回传 · 低轨卫星备份',
    desc: '6G 宏站之间用毫米波回传组网，楼顶小基站补容量，低轨卫星通过地面站给地面网络做备份。',
    cam: { pos: [-3.0, 3.2, -2.6], target: [-1.2, 0.8, -1.6] },
    underground: false,
    kpis: [
      { label: '下行峰值', unit: 'Gbps', base: 24.6, jitter: 1.8, digits: 1 },
      { label: '在线终端', unit: '万', base: 42.8, jitter: 0.6, digits: 1 },
      { label: '回传时延', unit: 'ms', base: 3.2, jitter: 0.4, digits: 1 },
      { label: '宏站可用率', unit: '%', base: 99.95, jitter: 0.01, digits: 2 }
    ],
    facilities: [
      { name: '6G 宏站 M-01', kind: 'macro', x: -1.6, z: -1.8 },
      { name: '6G 宏站 M-02', kind: 'macro', x: 0.4, z: -2.2 },
      { name: '毫米波回传链路', kind: 'backhaul', x: -0.6, z: -2.0 },
      { name: '低轨卫星地面站', kind: 'groundstation', x: -2.8, z: -2.8 },
      { name: '楼顶小基站群', kind: 'smallcell', x: 1.4, z: 0.4 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: 'M-01 与 M-02 毫米波回传受强降雨衰减，链路余量降至 3 dB' },
      { t: 1.8, lvl: 'warn', msg: '回传自动切换到 M-01 → M-03 备用路由，时延增加 1.1 ms' },
      { t: 4.0, lvl: 'info', msg: '楼顶小基站提升功率 2 dB，边缘用户速率回升' },
      { t: 7.6, lvl: 'info', msg: '低轨卫星过境，地面站建立备份链路（8.2 Gbps）' },
      { t: 11, lvl: 'good', msg: '降雨减弱，主回传链路恢复，各项指标回到基线' }
    ]
  },
  {
    id: 'underground',
    key: 'underground',
    name: '地下管廊',
    en: 'Underground',
    icon: '🚇',
    color: '#ff9f6b',
    hex: 0xff9f6b,
    tag: '多舱综合管廊 · 巡检机器人',
    desc: '主干道下方是多舱管廊，电力、给水、燃气、热力、光纤分舱敷设，轨道巡检机器人在里面巡逻。',
    cam: { pos: [0.2, -0.4, 3.4], target: [0.2, -0.9, 0.6] },
    underground: true,
    kpis: [
      { label: '管廊里程', unit: 'km', base: 18.6, jitter: 0, digits: 1 },
      { label: '舱室数', unit: '个', base: 5, jitter: 0, digits: 0 },
      { label: '机器人在线', unit: '台', base: 6, jitter: 0, digits: 0 },
      { label: '告警点', unit: '处', base: 0, jitter: 0, digits: 0 }
    ],
    facilities: [
      { name: '管廊主环 · 北段', kind: 'gallery', x: 0.0, z: 2.6 },
      { name: '电力舱', kind: 'bay-power', x: -0.6, z: 1.6 },
      { name: '燃气舱', kind: 'bay-gas', x: 0.6, z: 1.6 },
      { name: '巡检机器人 R-01', kind: 'robot', x: 0.0, z: 1.0 },
      { name: '通风井 V-3', kind: 'vent', x: 1.0, z: 2.4 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: '燃气舱 G2 甲烷浓度 1.8% LEL，超过一级报警阈值' },
      { t: 1.4, lvl: 'warn', msg: '通风井 V-3 风机全速运转，舱内换气 12 次/小时' },
      { t: 3.2, lvl: 'info', msg: '巡检机器人 R-01 抵达 G2，红外成像定位到法兰泄漏点' },
      { t: 6.0, lvl: 'info', msg: '关闭上游阀门 VG-14，泄漏段泄压完成' },
      { t: 10, lvl: 'good', msg: '甲烷浓度回落至 0.05% LEL，管廊恢复常态巡检' }
    ]
  },
  {
    id: 'logistics',
    key: 'logistics',
    name: '物流网',
    en: 'Logistics',
    icon: '🚚',
    color: '#5ec8ff',
    hex: 0x5ec8ff,
    tag: '自动分拣 · 无人货车 · 无人机投递',
    desc: '物流枢纽自动分拣，无人货车在路网上跑，无人机负责楼顶投递，路线会根据封路实时改道。',
    cam: { pos: [-3.4, 2.6, -0.6], target: [-1.6, 0.4, 0.6] },
    underground: false,
    kpis: [
      { label: '日均单量', unit: '万单', base: 26.4, jitter: 1.2, digits: 1 },
      { label: '无人车在线', unit: '台', base: 48, jitter: 2, digits: 0 },
      { label: '无人机架次', unit: '架次/h', base: 126, jitter: 6, digits: 0 },
      { label: '准时率', unit: '%', base: 97.2, jitter: 0.6, digits: 1 }
    ],
    facilities: [
      { name: '城西物流枢纽', kind: 'hub', x: -2.6, z: 0.4 },
      { name: '自动分拣线 4#', kind: 'sorter', x: -1.8, z: 0.8 },
      { name: '无人车充电场', kind: 'depot', x: -3.0, z: -1.4 },
      { name: '无人机起降坪', kind: 'droneport', x: -1.2, z: -1.8 },
      { name: '干线接驳口', kind: 'gateway', x: -2.2, z: 2.0 }
    ],
    script: [
      { t: 0, lvl: 'crit', msg: '主干道 C4 段因施工封闭，3 条无人车路线受阻' },
      { t: 1.6, lvl: 'warn', msg: '路径规划重算：42 台无人车改道，平均绕行 0.8 km' },
      { t: 4.4, lvl: 'info', msg: '无人机队增加 18 架次，承接时效件投递' },
      { t: 8.0, lvl: 'info', msg: '分拣线 4# 切换至东侧出库口，避免车辆排队' },
      { t: 12, lvl: 'good', msg: 'C4 段恢复通行，路线回到最优解，准时率回升至 97.2%' }
    ]
  }
]

export function netById(id) {
  return NETS.find((item) => item.id === id) || NETS[0]
}

/** 按时间算出一组 KPI 读数（带正弦扰动，看起来在跳）。 */
export function kpisAt(net, seconds) {
  const seed = net.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return net.kpis.map((kpi, i) => {
    const phase = seconds * (0.4 + i * 0.13) + seed * 0.37 + i * 1.7
    const wobble = Math.sin(phase) * 0.6 + Math.sin(phase * 2.3) * 0.4
    const value = kpi.base + wobble * kpi.jitter
    const digits = kpi.digits ?? 1
    return {
      label: kpi.label,
      unit: kpi.unit,
      value: digits === 0 ? Math.round(value) : value.toFixed(digits),
      raw: value
    }
  })
}

/** 90 秒趋势：用正弦叠加造一条有起伏的曲线。 */
export function trendAt(net, seconds, points = 48) {
  const seed = net.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const base = net.kpis[0].base
  const out = []
  for (let i = 0; i < points; i += 1) {
    const t = seconds - (points - 1 - i) * 1.9
    const v =
      base *
      (1 +
        0.05 * Math.sin(t * 0.06 + seed) +
        0.028 * Math.sin(t * 0.21 + seed * 1.7) +
        0.014 * Math.sin(t * 0.53 + seed * 0.3))
    out.push(v)
  }
  return out
}

/** 事故剧本播放：返回当前已发生的步骤与进度。 */
export function scriptState(net, elapsed) {
  const steps = net.script
  const done = []
  let active = null
  for (let i = 0; i < steps.length; i += 1) {
    if (elapsed >= steps[i].t) {
      done.push(steps[i])
      active = steps[i]
    }
  }
  const last = steps[steps.length - 1]
  const finished = elapsed >= last.t + 1.2
  return { done, active, finished, total: last.t }
}

export const LEVEL_COLORS = {
  crit: '#ff5a4d',
  warn: '#ffb800',
  info: '#5ec8ff',
  good: '#4ade80'
}

export const LEVEL_NAMES = {
  crit: '告警',
  warn: '处置',
  info: '联动',
  good: '恢复'
}
