import { explanation, statusText } from './analysis.js'
import { cardioComparison, formatDistance, formatSeconds, formatSpeed } from './metricPresentation.js'

const format = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const date = value => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const delta = value => `${value > 0 ? '+' : ''}${format(value)}`

export default function ProgressStatus({ item }) {
  const previous = item.sessions.at(-2)
  const latest = item.latest
  const performance = latest ?? item.reference
  const comparable = !['empty', 'new', 'stale', 'return'].includes(item.status)
  const awaitingComparison = item.status === 'empty' || item.status === 'new'
  const meterLabel = awaitingComparison ? 'Aguardando a primeira comparação nesta rotina' : `${item.streak} sessões seguidas sem progresso`
  const cardio = performance?.kind === 'cardio'
  const uniform = !cardio && performance?.setDetails.length && performance.setDetails.every(s => s.weight === performance.setDetails[0].weight && s.reps === performance.setDetails[0].reps)
  const cardioChange = latest?.kind === 'cardio' && previous?.kind === 'cardio' ? cardioComparison(latest, previous) : null
  const recommendation = !comparable ? explanation(item)
    : item.status === 'critical' ? 'Revise execução, descanso e progressão com seu instrutor.'
    : item.status === 'up' ? 'Use esta execução como referência para a próxima sessão.'
    : cardio ? 'Use tempo, distância e ritmo como referência para buscar a próxima evolução.'
    : 'Busque mais repetições com a mesma carga, dentro da faixa do seu plano.'
  return <section className={`progress-status compact-progress ${item.status}`} aria-label="Sua progressão neste treino">
    {performance && <div className="last-performance">
      <div className="performance-label"><span>{latest ? 'Última execução' : 'Referência anterior'} · {date(performance.at)}</span><span>Próxima #{item.nextSession}</span></div>
      {!latest && <small>{performance.sourceTitle}</small>}
      {cardio ? <p className="performance-value cardio-value"><strong>{performance.distance ? formatDistance(performance.distance) : formatSeconds(performance.duration)}</strong><span>{performance.distance && performance.duration ? `em ${formatSeconds(performance.duration)}` : `${performance.sets} registro${performance.sets === 1 ? '' : 's'}`}</span></p>
        : uniform ? <p className="performance-value"><strong>{performance.sets} × {performance.setDetails[0].reps}</strong><span>reps · <b>{format(performance.weight)} kg</b></span></p>
        : <ol className="compact-sets" aria-label="Carga e repetições de cada série">{performance.setDetails.map((s, i) => <li key={i}><small>S{i + 1}</small><b>{format(s.weight)} kg</b><span>× {s.reps}</span></li>)}</ol>}
      {cardio ? performance.speed ? <small className="performance-total">Velocidade média · {formatSpeed(performance.speed)}</small> : null : <small className="performance-total">{performance.reps} reps totais · {performance.sets} séries</small>}
    </div>}
    {comparable && previous && <p className="progress-change"><span>vs. {date(previous.at)}</span><strong>{cardioChange ? cardioChange.primary : <>{latest.weight === previous.weight ? 'Mesma carga' : `${delta(latest.weight - previous.weight)} kg máx.`} · {latest.reps === previous.reps ? 'mesmas reps' : `${delta(latest.reps - previous.reps)} reps`}</>}</strong>
      {cardioChange?.secondary && <small>{cardioChange.secondary}</small>}
      {!cardio && latest.volume !== previous.volume && <small className={latest.volume < previous.volume ? 'mixed-progress' : ''}>Volume {delta(latest.volume - previous.volume)} kg{latest.volume < previous.volume ? ` (${format(previous.volume)} para ${format(latest.volume)} kg)` : ''}</small>}
    </p>}
    {(comparable || awaitingComparison) && <div className="stagnation-meter" role="img" aria-label={`${meterLabel}. Atenção em 3, persistente em 6.`}>
      <div className="stagnation-meter-head">
        <strong>{awaitingComparison ? 'Aguardando comparação' : statusText(item)}</strong>
        <span>{awaitingComparison ? <><b>0</b> comparações</> : <><b>{item.streak}</b> sem progresso</>}</span>
      </div>
      <div className="stagnation-meter-bars" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} className={comparable && index < item.streak ? 'filled' : ''} />)}</div>
      <div className="stagnation-meter-scale" aria-hidden="true"><span>0 · {awaitingComparison ? 'início' : 'evoluiu'}</span><span>3 · atenção</span><span>6 · persistente</span></div>
    </div>}
    <div className="progress-advice"><small>FOCO PARA HOJE</small><p>{recommendation}</p></div>
  </section>
}
