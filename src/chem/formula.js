const SUB = '₀₁₂₃₄₅₆₇₈₉'
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'

export function formulaParts(input) {
  const parts = []
  const push = (kind, text) => {
    const last = parts[parts.length - 1]
    if (last && last.kind === kind) last.text += text
    else parts.push({ kind, text })
  }
  for (const ch of String(input || '')) {
    const sub = SUB.indexOf(ch)
    if (sub >= 0) {
      push('sub', String(sub))
      continue
    }
    const sup = SUP.indexOf(ch)
    if (sup >= 0) {
      push('sup', String(sup))
      continue
    }
    if (ch === '⁺' || ch === '⁻') {
      push('sup', ch === '⁺' ? '+' : '−')
      continue
    }
    push('text', ch)
  }
  return parts
}

export const COMMON_FORMULAS = {
  1: ['H₂', 'H₂O'],
  6: ['CO₂', 'CH₄'],
  7: ['N₂', 'NH₃'],
  8: ['O₂', 'H₂O', 'CO₂'],
  11: ['NaCl'],
  12: ['MgO'],
  13: ['Al₂O₃'],
  14: ['SiO₂'],
  16: ['SO₂'],
  17: ['HCl', 'NaCl'],
  19: ['KCl'],
  20: ['CaCO₃'],
  26: ['Fe₂O₃'],
  29: ['CuO'],
  30: ['ZnO'],
  53: ['I₂']
}
