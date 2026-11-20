const FUNCS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  exp: Math.exp,
  sqrt: Math.sqrt,
  abs: Math.abs,
  log: Math.log
}

/** 白名单表达式。只允许 x、y、pi、e 和少量函数，不用 eval。 */
export function compileExpr(source) {
  const s = String(source || '').replace(/\s+/g, '')
  if (!s) throw new Error('请输入表达式')
  if (s.length > 80) throw new Error('表达式太长')
  let i = 0
  const peek = () => s[i]
  const eat = (ch) => {
    if (s[i] !== ch) throw new Error('这里缺了 ' + ch)
    i += 1
  }

  function primary() {
    if (peek() === '(') {
      eat('(')
      const inner = expr()
      eat(')')
      return inner
    }
    const num = /^(\d+(\.\d+)?)/.exec(s.slice(i))
    if (num) {
      i += num[0].length
      const value = Number(num[0])
      return () => value
    }
    const id = /^[a-z]+/.exec(s.slice(i))
    if (!id) throw new Error('无法识别的符号')
    i += id[0].length
    if (id[0] === 'x') return (x) => x
    if (id[0] === 'y') return (_x, y) => y
    if (id[0] === 'pi') return () => Math.PI
    if (id[0] === 'e') return () => Math.E
    const fn = FUNCS[id[0]]
    if (!fn) throw new Error('不允许使用 ' + id[0])
    eat('(')
    const arg = expr()
    eat(')')
    return (x, y) => fn(arg(x, y))
  }

  function unary() {
    if (peek() === '+') {
      i += 1
      return unary()
    }
    if (peek() === '-') {
      i += 1
      const value = unary()
      return (x, y) => -value(x, y)
    }
    return primary()
  }

  function power() {
    const left = unary()
    if (peek() !== '^') return left
    i += 1
    const right = unary()
    return (x, y) => Math.pow(left(x, y), right(x, y))
  }

  function term() {
    let left = power()
    while (peek() === '*' || peek() === '/') {
      const op = peek()
      i += 1
      const right = power()
      const prev = left
      left = op === '*'
        ? (x, y) => prev(x, y) * right(x, y)
        : (x, y) => prev(x, y) / right(x, y)
    }
    return left
  }

  function expr() {
    let left = term()
    while (peek() === '+' || peek() === '-') {
      const op = peek()
      i += 1
      const right = term()
      const prev = left
      left = op === '+'
        ? (x, y) => prev(x, y) + right(x, y)
        : (x, y) => prev(x, y) - right(x, y)
    }
    return left
  }

  const fn = expr()
  if (i !== s.length) throw new Error('末尾还有识别不了的部分')
  return (x, y) => {
    const value = fn(x, y)
    return Number.isFinite(value) ? value : 0
  }
}
