import { explanation, statusText } from './analysis.js'

const format = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const date = value => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

export default function ProgressStatus({ item }) {
  const previous = item.sessions.at(-2)
  const comparable = !['empty', 'new', 'stale', 'return'].includes(item.status)
  const recommendation = !comparable ? explanation(item)
    : item.status === 'critical' ? 'Revise execução, descanso e progressão com seu instrutor antes de aumentar a carga.'
    : item.status === 'up' ? 'Use a última sessão como referência. Preserve a execução ao buscar a próxima evolução.'
    : 'Busque progredir nas repetições com a mesma carga, dentro da faixa do seu plano e mantendo a execução.'
  return <section className={`progress-status ${item.status}`} aria-label="Sua progressão neste treino">
    <div className="progress-status-head"><strong>{statusText(item)}</strong>{comparable && <span><b>{item.streak}</b> sem progresso</span>}</div>
    {comparable && <><div className="progress-steps" role="img" aria-label={`${item.streak} sessões seguidas sem progresso. Atenção em 3, persistente em 6.`}>{Array.from({ length: 6 }, (_, i) => <i key={i} className={i < item.streak ? 'filled' : ''} />)}</div><div className="progress-scale"><span>0 · evoluiu</span><span>3 · atenção</span><span>6 · persistente</span></div></>}
    {item.latest && <div className="progress-comparison"><div><small>Anterior{previous ? ` · ${date(previous.at)}` : ''}</small><strong>{previous ? `${format(previous.weight)} kg` : '—'}</strong><span>{previous ? `${previous.reps} reps · ${previous.sets} séries` : 'Sem comparação'}</span></div><span aria-hidden="true">→</span><div><small>Última · {date(item.latest.at)}</small><strong>{format(item.latest.weight)} kg</strong><span>{item.latest.reps} reps · {item.latest.sets} séries</span></div></div>}
    {comparable && <p className="progress-change">{item.status === 'up' ? explanation(item) : `${item.streak} sessão(ões) seguida(s) sem aumento de carga, repetições ou volume.`}</p>}
    <div className="progress-advice"><small>PARA A PRÓXIMA SESSÃO</small><p>{recommendation}</p></div>
    {comparable && <small className="progress-rule">Aumentar carga, reps na mesma carga ou volume reinicia a contagem. Compare também o número de séries.</small>}
  </section>
}
