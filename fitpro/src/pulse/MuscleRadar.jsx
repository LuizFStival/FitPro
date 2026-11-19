const GROUPS = [
  ['Peito', ['chest']], ['Costas', ['upper-back', 'lower-back', 'trapezius']],
  ['Ombros', ['deltoids', 'serratus']], ['Braços', ['biceps', 'triceps', 'forearm']],
  ['Core', ['abs', 'obliques']], ['Pernas', ['quadriceps', 'adductors', 'hip-flexors']],
  ['Posterior', ['hamstring', 'gluteal']], ['Panturrilhas', ['calves', 'tibialis']],
]
export const radarValues = load => GROUPS.map(([label, muscles]) => ({ label, muscles, value: muscles.reduce((n, m) => n + (load[m] || 0), 0) }))
const fmt = n => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const point = (index, radius) => {
  const angle = index * Math.PI / 4 - Math.PI / 2
  return [180 + Math.cos(angle) * radius, 165 + Math.sin(angle) * radius]
}
export default function MuscleRadar({ load }) {
  const values = radarValues(load), max = Math.max(1, ...values.map(v => v.value))
  if (!values.some(v => v.value)) return <p className="muted">Sem séries com grupo muscular identificado neste período.</p>
  return <figure className="muscle-radar"><svg viewBox="0 0 360 330" role="img" aria-label={`Distribuição muscular em séries equivalentes: ${values.map(v => `${v.label}: ${fmt(v.value)}`).join('; ')}`}>
    {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={values.map((_, i) => point(i, 100 * scale).join(',')).join(' ')} fill="none" stroke="#3b4a40" />)}
    {values.map((v, i) => { const [x, y] = point(i, 100), [tx, ty] = point(i, 132); return <g key={v.label}><line x1="180" y1="165" x2={x} y2={y} stroke="#3b4a40" /><text x={tx} y={ty - 5} textAnchor="middle" fill="#c8d3cc" fontSize="11">{v.label}<tspan x={tx} dy="16" fill="#66e59c">{fmt(v.value)}</tspan></text></g> })}
    <polygon points={values.map((v, i) => point(i, 100 * v.value / max).join(',')).join(' ')} fill="#32d67533" stroke="#50dc87" strokeWidth="2" />
    {values.map((v, i) => { const [x, y] = point(i, 100 * v.value / max); return <circle key={v.label} cx={x} cy={y} r="3" fill="#70ec9f" /> })}
  </svg><figcaption>Escala de 0 a {fmt(max)} séries equivalentes. Distribuição do período, sem meta de simetria.</figcaption>
    <details><summary>Como os grupos são somados</summary><p>Costas inclui lombar e trapézio; braços inclui bíceps, tríceps e antebraços; core inclui abdômen e oblíquos; pernas inclui quadríceps, adutores e flexores do quadril; posterior inclui glúteos. Ombros inclui serrátil; panturrilhas inclui tibial.</p></details>
  </figure>
}
