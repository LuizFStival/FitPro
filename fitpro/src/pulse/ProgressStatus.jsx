import { explanation, statusText } from './analysis.js'

const format = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const date = value => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const delta = value => `${value > 0 ? '+' : ''}${format(value)}`

export default function ProgressStatus({ item }) {
  const previous = item.sessions.at(-2)
  const latest = item.latest
  const comparable = !['empty', 'new', 'stale', 'return'].includes(item.status)
  const uniform = latest?.setDetails.length && latest.setDetails.every(s => s.weight === latest.setDetails[0].weight && s.reps === latest.setDetails[0].reps)
  const recommendation = !comparable ? explanation(item)
    : item.status === 'critical' ? 'Revise execução, descanso e progressão com seu instrutor.'
    : item.status === 'up' ? 'Use esta execução como referência para a próxima sessão.'
    : 'Busque mais repetições com a mesma carga, dentro da faixa do seu plano.'
  return <section className={`progress-status compact-progress ${item.status}`} aria-label="Sua progressão neste treino">
    {latest && <div className="last-performance">
      <div className="performance-label"><span>Última execução · {date(latest.at)}</span><span>Próxima #{item.nextSession}</span></div>
      {uniform ? <p className="performance-value"><strong>{latest.sets} × {latest.setDetails[0].reps}</strong><span>reps · <b>{format(latest.weight)} kg</b></span></p>
        : <ol className="compact-sets" aria-label="Carga e repetições de cada série">{latest.setDetails.map((s, i) => <li key={i}><small>S{i + 1}</small><b>{format(s.weight)} kg</b><span>× {s.reps}</span></li>)}</ol>}
      <small className="performance-total">{latest.reps} reps totais · {latest.sets} séries</small>
    </div>}
    {comparable && previous && <p className="progress-change"><span>vs. {date(previous.at)}</span><strong>{latest.weight === previous.weight ? 'Mesma carga' : `${delta(latest.weight - previous.weight)} kg máx.`} · {latest.reps === previous.reps ? 'mesmas reps' : `${delta(latest.reps - previous.reps)} reps`}</strong>
      {latest.volume !== previous.volume && <small className={latest.volume < previous.volume ? 'mixed-progress' : ''}>Volume {delta(latest.volume - previous.volume)} kg{latest.volume < previous.volume ? ` (${format(previous.volume)} para ${format(latest.volume)} kg)` : ''}</small>}
    </p>}
    {comparable && <div className="stagnation-meter" role="img" aria-label={`${item.streak} sessões seguidas sem progresso. Atenção em 3, persistente em 6.`}>
      <div className="stagnation-meter-head"><strong>{statusText(item)}</strong><span><b>{item.streak}</b> sem progresso</span></div>
      <div className="stagnation-meter-bars" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} className={index < item.streak ? 'filled' : ''} />)}</div>
      <div className="stagnation-meter-scale" aria-hidden="true"><span>0 · evoluiu</span><span>3 · atenção</span><span>6 · persistente</span></div>
    </div>}
    <div className="progress-advice"><small>FOCO PARA HOJE</small><p>{recommendation}</p></div>
  </section>
}
