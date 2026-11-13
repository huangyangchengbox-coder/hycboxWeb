const POINTS = ['0', '15', '30', '40']

/** 一盘内的下一分。state = { points:{a,b}, games:{a,b}, advantage, tiebreak, log } */
export function nextScore(state, winner) {
  const next = {
    ...state,
    points: { ...state.points },
    games: { ...state.games },
    log: [...(state.log || [])]
  }
  const loser = winner === 'a' ? 'b' : 'a'
  const tag = winner === 'a' ? 'A' : 'B'

  if (next.tiebreak) {
    next.points[winner] += 1
    const w = next.points[winner]
    const l = next.points[loser]
    if (w >= 7 && w - l >= 2) {
      next.games[winner] += 1
      next.log.push(`抢七 ${w}-${l}，${tag} 拿下这一盘`)
      return { ...next, points: { a: 0, b: 0 }, tiebreak: false, setOver: true }
    }
    next.log.push(`抢七 ${w}-${l}`)
    return next
  }

  // 占先者再得分就拿下这一局；被追平则回到 deuce
  if (next.advantage === winner) {
    return winGame(next, winner, '占先后得分')
  }
  if (next.advantage === loser) {
    next.advantage = null
    next.log.push(`${loser === 'a' ? 'A' : 'B'} 追平，回到平分 deuce`)
    return next
  }

  const won = next.points[winner] + 1
  const other = next.points[loser]

  if (won >= 4 && won - other >= 2) {
    return winGame(next, winner, '净胜两分')
  }

  if (other >= 3 && won - other === 1) {
    next.advantage = winner
    next.log.push(`${tag} 占先 advantage`)
    return next
  }

  next.points[winner] = won
  // 日志统一按 A - B 的顺序显示，避免看到 15-40 这种反序
  const aPts = next.points.a
  const bPts = next.points.b
  if (aPts >= 3 && bPts >= 3 && aPts === bPts) {
    next.log.push('平分 deuce，需要净胜两分')
  } else {
    next.log.push(`${label(aPts)} - ${label(bPts)}`)
  }
  return next
}

function label(index) {
  return POINTS[Math.min(index, 3)] || '40'
}

function winGame(state, winner, note) {
  const next = { ...state }
  const tag = winner === 'a' ? 'A' : 'B'
  next.points = { a: 0, b: 0 }
  next.advantage = null
  next.games = { ...state.games, [winner]: state.games[winner] + 1 }
  next.log = [...state.log, `${tag} 拿下这一局（${note}）`]

  const a = next.games.a
  const b = next.games.b
  if ((a >= 6 || b >= 6) && Math.abs(a - b) >= 2) {
    next.log = [...next.log, `一盘结束：${a}-${b}`]
    return { ...next, setOver: true }
  }
  if (a === 6 && b === 6) {
    next.tiebreak = true
    next.log = [...next.log, '6-6，进入抢七（先到 7 分且净胜 2 分）']
  }
  return next
}

export function emptyScore() {
  return {
    points: { a: 0, b: 0 },
    games: { a: 0, b: 0 },
    advantage: null,
    tiebreak: false,
    setOver: false,
    log: ['比赛开始，A 先发球。每分两次发球机会。']
  }
}

/** 一局内的发球站位顺序：右半区 → 左半区交替，每 6 分换边。 */
export function serveSequence(count = 8) {
  const out = []
  for (let i = 0; i < count; i += 1) {
    const deuce = i % 2 === 0
    out.push({
      index: i + 1,
      side: deuce ? 'deuce' : 'ad',
      label: deuce ? '右半区（平分侧）' : '左半区（占先侧）',
      x: deuce ? 1.6 : -1.6,
      changeEnds: i > 0 && i % 6 === 0
    })
  }
  return out
}

export const RULES = [
  { q: '计分', a: '0 / 15 / 30 / 40，40-40 为 deuce（平分），需要净胜两分。' },
  { q: '一盘', a: '先到 6 局且净胜 2 局；6-6 进入抢七，先到 7 分且净胜 2 分。' },
  { q: '大满贯决胜盘', a: '2022 年起四大满贯统一：决胜盘 6-6 后打 10 分抢七。此前各赛事不同，讲历史要说明当时规则。' },
  { q: '发球', a: '每分两次机会；球擦网后落入正确发球区算 let，重发且不消耗次数。' },
  { q: '发球站位', a: '底线后、中点与边线延长线之间，左右半区交替发球。' },
  { q: '换边', a: '每盘第 1、3、5… 局后换边；抢七每 6 分换边。' },
  { q: '脚误', a: '击球瞬间双脚不得触及底线或场内，也不得离地跳起后落地进线。' }
]
