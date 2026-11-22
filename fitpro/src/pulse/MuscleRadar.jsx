import { MUSCLE_GROUPS, targetBand } from './insights.js'

export const radarValues = groups => MUSCLE_GROUPS.map(group => ({ ...group, value: Number(groups?.[group.key] || 0) }))
const fmt = number => number.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const color = value => ({ below: '#f0b84b', target: '#45d986', above: '#f16d74' })[targetBand(value)]
const labelLines = label => label.length > 13 ? label.split(' ') : [label]

export default function MuscleRadar({ groups, mode = 'direct' }) {
  const values = radarValues(groups)
  const max = Math.max(20, Math.ceil(Math.max(...values.map(row => row.value)) / 5) * 5)
  const point = (index, radius) => {
    const angle = index * Math.PI * 2 / values.length - Math.PI / 2
    return [210 + Math.cos(angle) * radius, 190 + Math.sin(angle) * radius]
  }
  const polygon = radius => values.map((_, index) => point(index, radius).join(',')).join(' ')
  const targetInner = 112 * Math.min(1, 10 / max)
  const targetOuter = 112 * Math.min(1, 20 / max)
  return <figure className="muscle-radar"><svg viewBox="0 0 420 390" role="img" aria-label={`Média semanal de séries ${mode === 'direct' ? 'diretas' : 'equivalentes'}: ${values.map(row => `${row.label}: ${fmt(row.value)}`).join('; ')}`}>
    <polygon points={polygon(targetOuter)} fill="#45d98626" stroke="#45d98680" strokeWidth="1.5" />
    <polygon points={polygon(targetInner)} fill="#191919" stroke="#45d98680" strokeWidth="1.5" />
    {[5, 10, 20, max].filter((value, index, all) => value <= max && all.indexOf(value) === index).map(value => <polygon key={value} points={polygon(112 * value / max)} fill="none" stroke={value === 10 || value === 20 ? '#45d98688' : '#3b403d'} strokeDasharray={value === 10 || value === 20 ? '4 3' : undefined} />)}
    {values.map((row, index) => { const [x, y] = point(index, 112), [tx, ty] = point(index, 157); const lines = labelLines(row.label); return <g key={row.key}><line x1="210" y1="190" x2={x} y2={y} stroke="#3b403d" />
      <text x={tx} y={ty - (lines.length - 1) * 5} textAnchor="middle" fill="#c8d3cc" fontSize="9.5">{lines.map((line, lineIndex) => <tspan key={line} x={tx} dy={lineIndex ? 11 : 0}>{line}</tspan>)}<tspan x={tx} dy="12" fill={color(row.value)} fontWeight="700">{fmt(row.value)}</tspan></text></g> })}
    <polygon points={values.map((row, index) => point(index, 112 * Math.min(row.value, max) / max).join(',')).join(' ')} fill="#b9c2bd24" stroke="#c7d0cb" strokeWidth="2" />
    {values.map((row, index) => { const [x, y] = point(index, 112 * Math.min(row.value, max) / max); return <circle key={row.key} cx={x} cy={y} r="4" fill={color(row.value)} stroke="#151515" strokeWidth="1.5" /> })}
    <text x="214" y={190 - targetInner - 4} fill="#70df9b" fontSize="8">10</text><text x="214" y={190 - targetOuter - 4} fill="#70df9b" fontSize="8">20</text>
  </svg><figcaption>Média por semana · escala fixa de 0 a {fmt(max)}. A faixa verde marca 10–20 séries/semana.</figcaption>
    <div className="muscle-radar-list">{values.map(row => <div key={row.key} className={targetBand(row.value)}><span>{row.label}</span><b>{fmt(row.value)}</b><small>{targetBand(row.value) === 'below' ? 'abaixo' : targetBand(row.value) === 'target' ? 'na faixa' : 'acima'}</small></div>)}</div>
  </figure>
}
