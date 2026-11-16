/**
 * 运动数学 · 2D 平面图（Canvas 2D）。
 * 每个函数接收 ctx 与参数，按设备像素比重绘。
 */

const FONT = '11px "Segoe UI", "PingFang SC", sans-serif'
const AXIS = 'rgba(232, 255, 242, 0.4)'
const TEXT = '#cde4d9'
const ACCENT = '#d8f34a'
const DIM = 'rgba(232, 255, 242, 0.16)'

function setup(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = canvas.clientWidth || 320
  const h = canvas.clientHeight || 160
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  ctx.font = FONT
  return { ctx, w, h }
}

function axes(ctx, x0, y0, w, h, xLabel, yLabel) {
  ctx.strokeStyle = AXIS
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + w, y0)
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0, y0 - h)
  ctx.stroke()
  ctx.fillStyle = 'rgba(205, 228, 217, 0.55)'
  ctx.fillText(xLabel, x0 + w - ctx.measureText(xLabel).width, y0 + 12)
  ctx.fillText(yLabel, x0 + 4, y0 - h + 10)
}

/**
 * 投篮：距离-高度平面上的轨迹族。
 * 当前参数加粗高亮，筐口画一小段竖线，命中的角度区间用绿色着色。
 */
export function drawShotFamily(canvas, { v0, angle, h0, windowRows, best }) {
  const { ctx, w, h } = setup(canvas)
  const pad = 26
  const xMax = 7.2
  const yMax = 5.0
  const X = (d) => pad + (d / xMax) * (w - pad - 8)
  const Y = (y) => h - pad - (y / yMax) * (h - pad - 10)
  // 轨迹族：同一速度，角度 30–70 每 5°
  for (let a = 30; a <= 70; a += 5) {
    const g = 9.81
    const th = (a * Math.PI) / 180
    ctx.strokeStyle = Math.abs(a - angle) < 2.5 ? ACCENT : DIM
    ctx.lineWidth = Math.abs(a - angle) < 2.5 ? 2 : 1
    ctx.beginPath()
    for (let t = 0; t < 2.5; t += 0.02) {
      const x = v0 * Math.cos(th) * t
      const y = h0 + v0 * Math.sin(th) * t - 0.5 * g * t * t
      if (x > xMax || y < -0.3) break
      if (t === 0) ctx.moveTo(X(x), Y(y))
      else ctx.lineTo(X(x), Y(y))
    }
    ctx.stroke()
  }
  // 筐口
  ctx.strokeStyle = '#ff7a3c'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(X(4.225) - 5, Y(3.05))
  ctx.lineTo(X(4.225) + 5, Y(3.05))
  ctx.stroke()
  // 命中窗口：best 角度的 [lo, hi] 速度都不行——平面图上画角度区间：
  // 在窗口行里把 lo/hi 的角画绿点（此速度可命中的角度集合）
  if (windowRows) {
    for (const row of windowRows) {
      if (row.lo === null) continue
      const inRange = v0 >= row.lo && v0 <= row.hi
      ctx.fillStyle = inRange ? '#7dffe8' : 'rgba(125, 255, 232, 0.25)'
      const px = X((row.angle / 100) * xMax * 1.35)
      // 画在顶部一行：角度轴（示意）
      const py = 8
      ctx.beginPath()
      ctx.arc(pad + (row.angle - 30) / 40 * (w - pad - 12), py + 6, inRange ? 2.6 : 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(125, 255, 232, 0.6)'
    ctx.fillText('↑ 当前速度可命中的角度（顶行绿点）', pad, 10)
  }
  axes(ctx, pad, h - pad, w - pad - 8, h - pad - 10, '距离 m', '高度 m')
  // 当前落点标记
  if (best) {
    ctx.fillStyle = ACCENT
    ctx.fillText(`最宽窗口 ${best.width.toFixed(2)} m/s @ ${best.angle}°`, pad, h - 6)
  }
}

/**
 * 香蕉球：俯视平面图——横向偏移 vs 前进距离。
 * 多条转速曲线 + 人墙线 + 门框线。
 */
export function drawCurveTop(canvas, results, wallDist, goalDist, goalWidth) {
  const { ctx, w, h } = setup(canvas)
  const pad = 26
  const xMax = goalDist + 2
  const X = (d) => pad + (d / xMax) * (w - pad - 8)
  const Y = (z) => h / 2 - (z / 4.5) * (h / 2 - 14)
  // 中线
  ctx.strokeStyle = DIM
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(pad, h / 2)
  ctx.lineTo(w - 8, h / 2)
  ctx.stroke()
  ctx.setLineDash([])
  // 人墙
  ctx.strokeStyle = '#ff5d86'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(X(wallDist), Y(-0.55))
  ctx.lineTo(X(wallDist), Y(0.55))
  ctx.stroke()
  // 门框
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(X(goalDist), Y(-goalWidth / 2))
  ctx.lineTo(X(goalDist), Y(goalWidth / 2))
  ctx.stroke()
  ctx.fillStyle = 'rgba(205,228,217,0.55)'
  ctx.fillText('人墙', X(wallDist) - 12, Y(0.75))
  ctx.fillText('球门', X(goalDist) - 12, Y(0.75))
  // 轨迹族
  let i = 0
  for (const { spin, points, goal } of results) {
    const hot = i === results.length - 1
    ctx.strokeStyle = goal ? '#7dffe8' : hot ? ACCENT : 'rgba(216, 243, 74, 0.28)'
    ctx.lineWidth = hot ? 2 : 1
    ctx.beginPath()
    points.forEach(([x, y, z], k) => {
      if (k === 0) ctx.moveTo(X(x), Y(z))
      else ctx.lineTo(X(x), Y(z))
    })
    ctx.stroke()
    i += 1
  }
  axes(ctx, pad, h - 6, w - pad - 8, h / 2 - 12, '前进 m', '侧偏 m')
}

/**
 * 短跑：速度-时间曲线（阶梯积分后的平滑近似）。
 */
export function drawSprintVT(canvas, profile, currentT) {
  const { ctx, w, h } = setup(canvas)
  const pad = 26
  const tMax = profile.totalTime + 0.3
  const vMax = 13
  const X = (t) => pad + (t / tMax) * (w - pad - 8)
  const Y = (v) => h - pad - (v / vMax) * (h - pad - 10)
  // 分段阶梯
  ctx.strokeStyle = ACCENT
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(X(0), Y(0))
  ctx.lineTo(X(0.146), Y(0))
  for (const m of profile.marks) {
    const y = Y(m.v)
    ctx.lineTo(X(m.tStart), y)
    ctx.lineTo(X(m.tEnd), y)
  }
  ctx.stroke()
  // 平均速度虚线
  const avg = 100 / profile.totalTime
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  ctx.setLineDash([5, 4])
  ctx.beginPath()
  ctx.moveTo(X(0), Y(avg))
  ctx.lineTo(X(tMax), Y(avg))
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(`平均 ${avg.toFixed(2)} m/s`, pad + 4, Y(avg) - 5)
  // 最高点
  const peak = Math.max(...profile.marks.map((m) => m.v))
  ctx.fillStyle = '#7dffe8'
  ctx.fillText(`峰值 ${peak.toFixed(1)} m/s`, X(tMax) - 92, Y(peak) - 6)
  // 当前时刻竖线
  if (currentT > 0 && currentT < tMax) {
    ctx.strokeStyle = '#ff9f4a'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(X(currentT), h - pad)
    ctx.lineTo(X(currentT), pad)
    ctx.stroke()
  }
  axes(ctx, pad, h - pad, w - pad - 8, h - pad - 10, '时间 s', '速度 m/s')
}

/**
 * 心率：五个训练区间的水平条形图。
 */
export function drawHeartZones(canvas, hrMax, rhr, zones, targets) {
  const { ctx, w, h } = setup(canvas)
  const pad = 30
  const barH = Math.min(16, (h - 24) / zones.length - 6)
  const labelW = 64
  const rangeW = w - pad - labelW - 52
  const lo = rhr
  const hi = hrMax + 4
  const scale = (bpm) => labelW + pad + ((bpm - lo) / (hi - lo)) * rangeW
  zones.forEach((z, i) => {
    const y = 12 + i * (barH + 6)
    ctx.fillStyle = 'rgba(205, 228, 217, 0.85)'
    ctx.fillText(z.name, pad, y + barH * 0.75)
    const [tLo, tHi] = targets[i]
    ctx.fillStyle = z.color
    ctx.globalAlpha = 0.85
    ctx.fillRect(scale(tLo), y, Math.max(4, scale(tHi) - scale(tLo)), barH)
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(232,255,242,0.75)'
    ctx.fillText(`${tLo}–${tHi}`, scale(tHi) + 6, y + barH * 0.75)
  })
  // 底部刻度
  ctx.strokeStyle = AXIS
  ctx.beginPath()
  ctx.moveTo(pad + labelW, h - 6)
  ctx.lineTo(w - 48, h - 6)
  ctx.stroke()
  ctx.fillStyle = 'rgba(205,228,217,0.5)'
  ctx.fillText(`${lo}`, pad + labelW - 6, h - 12)
  ctx.fillText(`${hi - 4}`, w - 54, h - 12)
  ctx.fillText('bpm', w - 30, h - 12)
}

/** 清空。 */
export function clearChart(canvas) {
  const { ctx, w, h } = setup(canvas)
  ctx.clearRect(0, 0, w, h)
}
