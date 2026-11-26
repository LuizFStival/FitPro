import { useMemo, useState } from 'react'
import MuscleRadar from './MuscleRadar.jsx'
import { formatDuration } from './workoutMetrics.js'
import BodyMap from '../components/BodyMap.jsx'
import LineChart from '../components/LineChart.jsx'
import { _setLangState } from '../lib/i18n-core.js'
import { MUSCLE_NAME } from '../lib/body-map-model.js'
import { DAY, statusText } from './analysis.js'
import { dayKey, deriveInsights, MUSCLE_GROUPS, MUSCLE_LABELS, shiftDay, statisticsPeriodStart, targetBand, targetLevels, weekStart } from './insights.js'
import { metricSummary } from './metricPresentation.js'

// This build is pt-BR only. Shared rendering components use the same translation core as openGym.
_setLangState('pt-BR', { ...Object.fromEntries(Object.entries(MUSCLE_NAME).map(([slug, name]) => [name, MUSCLE_LABELS[slug] || name])),
  'No data yet': 'Sem dados ainda', Less: 'Menos', More: 'Mais', Jan: 'Jan', Feb: 'Fev', Mar: 'Mar', Apr: 'Abr', May: 'Mai', Jun: 'Jun', Jul: 'Jul', Aug: 'Ago', Sep: 'Set', Oct: 'Out', Nov: 'Nov', Dec: 'Dez' }, null, null)
const fmt = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n)
const date = n => new Date(n).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const title = r => r.title?.match(/^Treino\s+[A-Z]/i)?.[0] || r.title
const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const STAT_PERIODS = [['week', 'Semana'], ['30', '30 dias'], ['90', '90 dias']]
const PROGRESS_METRICS = {
  weight: { unit: 'kg', value: session => session.weight },
  reps: { unit: 'reps', value: session => session.reps },
  distance: { unit: 'km', value: session => session.distance / 1000 },
  duration: { unit: 'min', value: session => session.duration / 60 },
  speed: { unit: 'km/h', value: session => session.speed },
}
const tabs = (items, selected, select, label) => <div className="og-segment" role="group" aria-label={label}>{items.map(([id, name]) => <button key={id} className={selected === id ? 'selected' : ''} aria-pressed={selected === id} onClick={() => select(id)}>{name}</button>)}</div>

export function WeightCard({ insights, api }) {
  const { latestWeight, recentWeights, weightDelta } = insights
  const [range, setRange] = useState(30)
  const points = useMemo(() => insights.weights.filter(w => !range || w.t >= Date.now() - range * DAY), [insights.weights, range])
  return <section className="card og-weight"><div className="section-head"><h2>Peso corporal</h2><a className="og-link" href="https://hevy.com" target="_blank" rel="noreferrer">Ver na Hevy ↗</a></div>
    {latestWeight ? <><div className="og-weight-value"><strong>{fmt(latestWeight.y)} <small>kg</small></strong><span>{date(latestWeight.t)}</span></div>
      <div className="og-weight-delta">{weightDelta == null ? 'Uma medição no período. Sem tendência calculável.' : `${weightDelta > 0 ? '+' : ''}${fmt(weightDelta)} kg entre ${date(recentWeights[0].t)} e ${date(recentWeights.at(-1).t)}`}</div>
      <LineChart points={points} h={145} unit="kg" />{tabs([[30, '30 dias'], [90, '90 dias'], [0, 'Tudo']], range, setRange, 'Período do peso')}
    </> : <div className="og-empty"><strong>Seu peso, ao longo do tempo</strong><p>Registre o peso na Hevy. Quando a API disponibilizar medições, seu gráfico aparece aqui.</p><span>Nenhum peso estimado a partir das cargas.</span></div>}
    <p className="footnote">Medições da Hevy{api.snapshot?.measurementsAt ? ` · consultadas ${date(api.snapshot.measurementsAt)}` : ''}. Não são salvas manualmente neste aparelho.</p>
  </section>
}

function WeekCard({ insights, now, go }) {
  const [offset, setOffset] = useState(0)
  const [selectedDay, setSelectedDay] = useState(dayKey(now))
  const start = shiftDay(weekStart(now), offset * 7)
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i))
  const logged = insights.workouts.filter(w => dayKey(w.start_time) === selectedDay)
  const move = n => { const next = offset + n; setOffset(next); setSelectedDay(dayKey(shiftDay(weekStart(now), next * 7))) }
  return <section className="card og-week-card"><div className="month-nav"><button aria-label="Semana anterior" onClick={() => move(-1)}>‹</button><strong>{offset === 0 ? 'Esta semana' : `${date(start)} a ${date(shiftDay(start, 6))}`}</strong><button aria-label="Próxima semana" onClick={() => move(1)}>›</button></div>
    <div className="og-week">{days.map((d, i) => { const key = dayKey(d); const done = insights.workouts.some(w => dayKey(w.start_time) === key); return <button key={key} className={key === selectedDay ? 'selected' : ''} aria-pressed={key === selectedDay} aria-label={`${DAYS[i]}, ${date(d)}${done ? ', treino realizado' : ''}`} onClick={() => setSelectedDay(key)}><small>{DAYS[i]}</small><b>{d.getDate()}</b><i className={done ? 'done' : ''} /></button> })}</div>
    <div className="og-day-result"><span className="og-day-icon">{logged.length ? '✓' : '▦'}</span><div><small>{selectedDay === dayKey(now) ? 'HOJE' : date(selectedDay + 'T12:00:00')}</small><strong>{logged.length ? logged.map(w => w.title).join(' + ') : 'Dia sem treino registrado'}</strong><span>{logged.length ? 'Registrado na Hevy' : 'Escolha uma rotina em Treinos'}</span></div></div>
    <button className="og-choice" onClick={() => go('workout')}>Escolher um treino →</button>
  </section>
}

export function OpenGymHome({ api, data, now, openRoutine, go }) {
  const insights = useMemo(() => deriveInsights(api.snapshot, now), [api.snapshot, now])
  return <div className="og-home-grid"><div className="og-column"><WeekCard {...{ insights, now, go }} /><WeightCard {...{ insights, api }} /></div>
    <div className="og-column"><section className="card og-streak"><div className="section-head"><h2>Sua constância</h2><span>↗</span></div><div className="og-streak-head"><b>{insights.streak}</b><div><strong>semanas seguidas</strong><span>com pelo menos um treino</span></div></div><div className="og-streak-meta"><span><b>{insights.weekWorkouts.length}</b> esta semana</span><span><b>{insights.monthCount}</b> neste mês</span><span><b>{fmt(data.frequency)}</b>/sem · 30 dias</span></div><button className="og-choice" onClick={() => go('stats')}>Explorar estatísticas →</button></section>
      <section className="card"><div className="section-head"><h2>Equilíbrio da semana</h2><button className="text" onClick={() => go('stats')}>Detalhes</button></div><BodyMap load={insights.muscles.bodyLoad} levels={targetLevels(insights.muscles.bodyLoad)} className="og-home-body target-map" /><p className="muted">{insights.muscles.totalSets ? `${insights.muscles.knownSets} de ${insights.muscles.totalSets} séries diretas com grupo muscular identificado.` : 'Sem séries registradas nesta semana. Veja outros períodos nas estatísticas.'}</p></section>
      <section className="card"><div className="section-head"><h2>Antes de treinar</h2><span className="pill">{data.alerts.length} em atenção</span></div>{data.alerts.length ? data.alerts.slice(0, 2).map(e => <button className="alert-link" key={e.key} onClick={() => openRoutine(e.routineId)}><strong>{e.title}</strong><span>{e.routineTitle} · {e.streak} sessões sem progresso →</span></button>) : <p className="muted">Sem estagnação recente nos exercícios ativos. Abra sua rotina para acompanhar a evolução.</p>}<button className="og-choice" onClick={() => go('alerts')}>Ver estagnação por treino →</button></section>
    </div></div>
}

export function ActivityCard({ workouts, now }) {
  const [range, setRange] = useState('month')
  const [offset, setOffset] = useState(0)
  const today = new Date(now), first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const byDay = new Map(); workouts.forEach(w => byDay.set(dayKey(w.start_time), (byDay.get(dayKey(w.start_time)) || 0) + 1))
  const start = shiftDay(weekStart(now), -52 * 7)
  return <section className="card"><div className="section-head"><h2>Atividade</h2><span>{workouts.length} treinos no histórico</span></div>{tabs([['month', 'Mês'], ['year', '12 meses']], range, setRange, 'Período da atividade')}
    {range === 'month' ? <><div className="month-nav"><button aria-label="Mês anterior" onClick={() => setOffset(n => n - 1)}>‹</button><strong>{first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong><button aria-label="Próximo mês" disabled={!offset} onClick={() => setOffset(n => n + 1)}>›</button></div><div className="calendar">{DAYS.map(d => <small key={d}>{d}</small>)}{Array.from({ length: (first.getDay() + 6) % 7 }, (_, i) => <span key={`blank${i}`} />)}{Array.from({ length: count }, (_, i) => { const key = dayKey(new Date(first.getFullYear(), first.getMonth(), i + 1)); return <span key={key} className={byDay.has(key) ? 'trained' : ''} title={`${key}: ${byDay.get(key) || 0} treinos`}>{i + 1}</span> })}</div><p className="muted">{workouts.filter(w => dayKey(w.start_time).slice(0, 7) === dayKey(first).slice(0, 7)).length} treinos neste mês</p></> : <><div className="og-year" tabIndex="0" role="region" aria-label="Atividade dos últimos 12 meses, com rolagem horizontal">{Array.from({ length: 53 }, (_, week) => <div key={week}>{Array.from({ length: 7 }, (_, day) => { const d = shiftDay(start, week * 7 + day), key = dayKey(d); return <i key={key} className={byDay.has(key) ? 'trained' : ''} title={`${date(d)}: ${byDay.get(key) || 0} treinos`} /> })}</div>)}</div><p className="muted">{date(start)} a {date(now)} · cada quadrado é um dia</p></>}
  </section>
}

function BalanceCard({ api, now }) {
  const [view, setView] = useState('radar')
  const [range, setRange] = useState('week'), [offset, setOffset] = useState(0), [selected, setSelected] = useState(null), [mode, setMode] = useState('direct')
  const end = offset && range === 'week' ? +shiftDay(weekStart(now), (offset + 1) * 7) - 1 : now
  const info = useMemo(() => deriveInsights(api.snapshot, end, range, { muscleMode: mode }), [api.snapshot, end, range, mode])
  const rows = MUSCLE_GROUPS.map(group => [group.key, info.muscles.groups[group.key], group.label])
  const contributors = info.muscles.contributors[selected] || []
  const pushPull = info.muscles.pushPull
  return <section className="card og-balance"><div className="section-head"><h2>Equilíbrio muscular</h2><span>Média semanal</span></div>{tabs(STAT_PERIODS, range, v => { setRange(v); setSelected(null) }, 'Período do equilíbrio muscular')}
    {range === 'week' && <div className="month-nav"><button aria-label="Semana muscular anterior" onClick={() => setOffset(n => n - 1)}>‹</button><strong>{offset ? `${date(info.weekStart)} a ${date(end)}` : 'Esta semana'}</strong><button aria-label="Próxima semana muscular" disabled={!offset} onClick={() => setOffset(n => n + 1)}>›</button></div>}
    {tabs([['direct', 'Séries diretas'], ['equivalent', 'Séries equivalentes']], mode, value => { setMode(value); setSelected(null) }, 'Regra de crédito muscular')}
    <p className="og-mode-help">{mode === 'direct' ? 'Somente o músculo primário recebe 1 série.' : 'Músculo primário recebe 1; cada secundário recebe 0,4.'}</p>
    {tabs([['radar', 'Teia muscular'], ['body', 'Mapa corporal']], view, setView, 'Visualização muscular')}
    {view === 'radar' ? <MuscleRadar groups={info.muscles.groups} mode={mode} /> : <><BodyMap load={info.muscles.bodyLoad} levels={targetLevels(info.muscles.bodyLoad)} onMuscle={m => setSelected(s => s === m ? null : m)} selected={selected} className="tappable target-map" />
    <div className="og-map-legend target-legend"><span><i className="below" />Abaixo de 10</span><span><i className="target" />Entre 10 e 20</span><span><i className="above" />Acima de 20</span></div>
    <p className="muted">Toque no músculo para ver quais exercícios o trabalharam.</p>
    {selected ? <div className="og-muscle-detail"><h3>{MUSCLE_LABELS[selected]} · {fmt(info.muscles.bodyLoad[selected] || 0)} séries/semana</h3>{contributors.length ? contributors.map(e => <div className="history-row" key={e.id}><div><strong>{e.title}</strong><small>{e.routine}</small></div><span>{fmt(e.sets)}/sem</span></div>) : <p className="zero-muscle">0 séries/semana neste grupo.</p>}<button className="text" onClick={() => setSelected(null)}>Ver todos os músculos</button></div> : <div className="og-muscle-bars">{rows.map(([key, value, label]) => <div key={key} className={`${targetBand(value)}${!value ? ' zero' : ''}`}><span>{label}</span><meter min={0} max={Math.max(20, ...rows.map(row => row[1]))} value={value} /><b>{fmt(value)}</b></div>)}</div>}
    </>}
    <div className={`push-pull ${pushPull.alert ? 'alert' : ''}`}><div><strong>Empurrar × Puxar</strong><small>Séries diretas por semana</small></div><div className="push-pull-values"><span><b>{fmt(pushPull.push)}</b> empurrar</span><span><b>{fmt(pushPull.pull)}</b> puxar</span></div><p>{pushPull.ratio == null ? 'Sem séries diretas para calcular a razão.' : pushPull.alert ? `${pushPull.dominant} está ${Number.isFinite(pushPull.ratio) ? fmt(pushPull.ratio) + '×' : 'sem contraparte'} acima do lado oposto. Alerta acima de 1,4×.` : `Razão ${fmt(pushPull.ratio)}× · dentro do limite de 1,4×.`}</p></div>
    <p className="footnote">{info.muscles.knownSets}/{info.muscles.totalSets} séries válidas com músculo identificado; aquecimentos ignorados. Média calculada em {fmt(info.muscles.weeks)} semana(s). A cor mostra somente a distância da faixa de 10–20, não hipertrofia nem recuperação.{info.duplicateCount ? ` ${info.duplicateCount} sessão(ões) duplicada(s) da Hevy ignorada(s).` : ''}</p>
  </section>
}

function ProgressCard({ data, now }) {
  const [routineId, setRoutineId] = useState(''), [exerciseId, setExerciseId] = useState(''), [metric, setMetric] = useState('weight')
  const [range, setRange] = useState('30')
  const routine = data.active.find(r => r.id === routineId) || data.active[0]
  const exercise = routine?.exercises.find(e => e.id === exerciseId) || routine?.exercises[0]
  const cardio = exercise?.latest?.kind === 'cardio'
  const options = cardio
    ? [[exercise.sessions.some(s => s.distance > 0) && 'distance', 'Distância'], [exercise.sessions.some(s => s.duration > 0) && 'duration', 'Tempo'], [exercise.sessions.some(s => s.speed > 0) && 'speed', 'Velocidade']].filter(([id]) => id)
    : [['weight', 'Carga'], ['reps', 'Repetições']]
  const selectedMetric = options.some(([id]) => id === metric) ? metric : options[0]?.[0]
  const config = PROGRESS_METRICS[selectedMetric]
  const periodStart = statisticsPeriodStart(now, range)
  const points = useMemo(() => {
    if (!config) return []
    return (exercise?.sessions || []).flatMap(session => {
      if (session.at < periodStart || session.at > now) return []
      const value = config.value(session)
      if (!Number.isFinite(value) || value <= 0) return []
      return [{ t: session.at, d: dayKey(session.at), y: value, note: metricSummary(session) }]
    })
  }, [exercise, config, periodStart, now])
  return <section className="card og-progress"><h2>Evolução por exercício</h2>
    {tabs(STAT_PERIODS, range, setRange, 'Período da evolução')}
    {tabs(data.active.map(r => [r.id, title(r)]), routine?.id, id => { setRoutineId(id); setExerciseId('') }, 'Rotina da evolução')}
    <div className="og-progress-select"><label>Exercício<select value={exercise?.id || ''} onChange={e => setExerciseId(e.target.value)}>{routine?.exercises.map((e, i) => <option key={`${e.key}-${i}`} value={e.id}>{i + 1}. {e.title}</option>)}</select></label></div>
    {exercise && <h3 className="og-chart-title">{exercise.title}</h3>}
    {options.length > 0 && tabs(options, selectedMetric, setMetric, 'Métrica de evolução')}
    {points.length ? <><div className="og-chart-summary"><strong>{fmt(points.at(-1).y)} <small>{config.unit}</small></strong><span>Última sessão no período · {date(points.at(-1).t)}</span></div><LineChart points={points} unit={config.unit} h={190} /><p className="footnote">{date(periodStart)} a {date(now)} · {points.length} {points.length === 1 ? 'sessão' : 'sessões'} · toque no gráfico para detalhes</p></> : <p className="muted">Sem dados para este exercício e métrica no período selecionado.</p>}
    {exercise && <p className={`status ${exercise.status}`}>Status atual · {statusText(exercise)}{!['empty', 'new', 'stale', 'return'].includes(exercise.status) ? ` · ${exercise.streak} sessões sem progresso` : ''}</p>}<p className="footnote">Somente este exercício neste treino. {cardio ? 'Tempo e distância somados; velocidade média calculada a partir deles.' : 'Carga máxima por sessão; repetições somadas das séries normais.'}</p>
  </section>
}

function TrainingTime({ api, now }) {
  const [range, setRange] = useState('week')
  const info = useMemo(() => deriveInsights(api.snapshot, now, range), [api.snapshot, now, range])
  return <section className="card training-time"><h2>Tempo de treino</h2>{tabs(STAT_PERIODS, range, setRange, 'Período do tempo de treino')}<div className="time-metrics"><div><small>Total</small><strong>{info.timedCount ? formatDuration(info.minutes) : '—'}</strong></div><div><small>Média por sessão</small><strong>{formatDuration(info.averageMinutes)}</strong></div></div><p className="footnote">{info.timedCount} de {info.selected.length} sessões com duração. Tempo entre início e fim registrados na Hevy, incluindo descansos.</p></section>
}

export function OpenGymStats({ api, data, now, go, openRoutine }) {
  const insights = useMemo(() => deriveInsights(api.snapshot, now), [api.snapshot, now])
  return <><section className="og-stat-grid"><div><small>Treinos</small><strong>{insights.workouts.length}</strong><span>Todo o histórico</span></div><div><small>Neste mês</small><strong>{insights.monthCount}</strong><span>{new Date(now).toLocaleDateString('pt-BR', { month: 'long' })}</span></div><div><small>Sequência semanal</small><strong>{insights.streak}</strong><span>Semanas com treino</span></div><div><small>Peso · 30 dias</small><strong>{insights.weightDelta == null ? '—' : `${insights.weightDelta > 0 ? '+' : ''}${fmt(insights.weightDelta)} kg`}</strong><span>{insights.weightDelta == null ? 'Sem medições suficientes' : 'Entre primeira e última medição'}</span></div></section>
    <div className="og-stats-grid"><div className="og-column"><ActivityCard workouts={insights.workouts} now={now} /><BalanceCard api={api} now={now} /></div><div className="og-column"><TrainingTime api={api} now={now} /><ProgressCard data={data} now={now} /><section className="card og-plateaus"><div className="section-head"><h2>Estagnação por treino</h2><span>{data.alerts.length} em atenção</span></div>{data.active.map(r => <button className="og-plateau-row" key={r.id} onClick={() => openRoutine(r.id)}><strong>{title(r)}</strong><span className={r.alerts ? 'amber' : 'muted'}>{r.alerts ? `${r.alerts} em atenção` : 'Sem alertas recentes'}</span><span aria-hidden="true">→</span></button>)}<p className="footnote">Rotinas ativas · sessões nos últimos 30 dias.</p><button className="og-choice" onClick={() => go('alerts')}>Ver todos os alertas →</button></section></div></div>
  </>
}
