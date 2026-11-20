export function logChoose(n, k) {
  let sum = 0
  const m = Math.min(k, n - k)
  for (let i = 1; i <= m; i += 1) sum += Math.log(n - m + i) - Math.log(i)
  return sum
}

export function binomPmf(n, k) {
  return Math.exp(logChoose(n, k) - n * Math.LN2)
}

export function normalPdf(x, mu, sigma) {
  const z = (x - mu) / sigma
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI))
}

export function createGalton(rows = 12) {
  const bins = Array(rows + 1).fill(0)
  const balls = []
  let total = 0
  return {
    rows,
    bins,
    balls,
    get total() { return total },
    reset() {
      bins.fill(0)
      balls.length = 0
      total = 0
    },
    drop(count) {
      const animate = Math.min(count, 36)
      for (let i = 0; i < count; i += 1) {
        let col = 0
        for (let row = 0; row < rows; row += 1) if (Math.random() < 0.5) col += 1
        bins[col] += 1
        total += 1
        if (i < animate) balls.push({ y: -Math.random() * 2, col, step: 0, alive: true })
      }
    },
    tick() {
      for (const ball of balls) {
        if (!ball.alive) continue
        ball.y += 0.18
        ball.step = Math.min(this.rows, Math.max(0, Math.floor(ball.y)))
        if (ball.y > this.rows + 0.4) ball.alive = false
      }
      if (balls.length > 70) {
        const kept = balls.filter((ball) => ball.alive)
        balls.length = 0
        balls.push(...kept.slice(-50))
      }
    }
  }
}

export function createPiSampler() {
  let inside = 0
  let total = 0
  const dots = []
  return {
    dots,
    get inside() { return inside },
    get total() { return total },
    get estimate() { return total ? (4 * inside) / total : 0 },
    reset() {
      inside = 0
      total = 0
      dots.length = 0
    },
    add(count) {
      const room = Math.max(0, 2400 - dots.length / 3)
      for (let i = 0; i < count; i += 1) {
        const x = Math.random()
        const y = Math.random()
        const hit = x * x + y * y <= 1
        if (hit) inside += 1
        total += 1
        if (i < room) dots.push(x, y, hit ? 1 : 0)
      }
    }
  }
}
