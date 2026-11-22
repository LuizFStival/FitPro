import { useEffect, useMemo, useState } from 'react'
import { analyze, statusText, routineFor } from './analysis.js'
import useHevy from './useHevy.js'
import './pulse.css'
import './opengym.css'
import './training.css'
import RoutinePicker from './RoutinePicker.jsx'
import { OpenGymHome, OpenGymPlan, OpenGymStats } from './OpenGymViews.jsx'
import ExecutionVideo from './ExecutionVideo.jsx'
import ProgressStatus from './ProgressStatus.jsx'
import ExerciseNames from './ExerciseNames.jsx'
import WorkoutHistory from './WorkoutHistory.jsx'
import { durationMinutes, formatDuration } from './workoutMetrics.js'
import { formatDistance, formatSeconds, formatSpeed } from './metricPresentation.js'

const number = value => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
const date = value => value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Sem sessão'
const shortTitle = title => title?.split('—')[0].trim() || 'Treino'
const symbols = { up: '↗', down: '↘', same: '=', return: 'R', new: '·' }
const trendNames = { up: 'Evoluiu', down: 'Abaixo da anterior', same: 'Manteve', return: 'Retorno de pausa', new: 'Primeira referência' }

function Glyph({ name }) {
  const paths = { home: 'M3 10 12 3l9 7v11h-6v-7H9v7H3z', workout: 'M8 3h8v4H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5',
    alerts: 'm12 3 10 18H2zM12 9v5M12 17v1', settings: 'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',
    plan: 'M3 5h18v16H3zM7 2v6M17 2v6M3 10h18M7 14h2M15 14h2', stats: 'M4 21V12M10 21V4M16 21V8M22 21V15' }
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function Exercise({ item, expanded, setExpanded }) {
  const open = expanded === item.key
  return <details className={`exercise exercise-${item.status}`} open={open} onToggle={event => { if (event.target === event.currentTarget) { const isOpen = event.currentTarget.open; setExpanded(current => isOpen ? item.key : current === item.key ? null : current) } }}>
    <summary><span className="order">{item.order + 1}</span><div className="exercise-main"><strong>{item.title}</strong><span className={`status ${item.status}`}>{statusText(item)}{item.streak > 0 && !['stale', 'return'].includes(item.status) ? <span className="summary-streak"> · {item.streak} sem progresso</span> : null}</span>
      {!open && (item.latest ? <span className="exercise-last"><span>Última · {date(item.latest.at)}</span>{item.latest.kind === 'cardio'
        ? <span><b>{item.latest.distance ? formatDistance(item.latest.distance) : formatSeconds(item.latest.duration)}</b>{item.latest.distance && item.latest.duration ? ` · ${formatSeconds(item.latest.duration)}` : ''}{item.latest.speed ? ` · ${formatSpeed(item.latest.speed)}` : ''}</span>
        : <span><b>{number(item.latest.weight)} kg</b> máx. · <b>{item.latest.reps} reps</b> totais</span>}</span> : <small>Sem dados comparáveis registrados</small>)}
      </div><span className="chevron">⌄</span></summary>
    <div className="exercise-body">
      <ProgressStatus item={item} />
      {open && <ExecutionVideo compact key={item.guide?.video || item.id} guide={item.guide} title={item.title} />}
      {item.latest && <details className="exercise-extra"><summary>Histórico e detalhes · {item.sessions.length} sessões</summary>
        <div className="timeline" aria-label="Evolução nas últimas oito sessões">{item.sessions.slice(-8).map(s => <span key={s.id} className={s.trend} title={`${date(s.at)}: ${trendNames[s.trend]}`}><b>{symbols[s.trend]}</b><small>{date(s.at)}</small></span>)}</div>
        <p className="progress-rule">Somente este exercício neste treino. {item.latest.kind === 'cardio' ? 'Comparamos tempo, distância e velocidade das séries normais.' : 'Comparamos carga máxima, repetições e volume das séries normais.'} Aquecimentos e drop sets ficam fora. Atenção em 3 sessões sem progresso; persistente em 6. Retornos de pausa criam uma nova referência.</p><div className="table-wrap"><table><caption>Últimas sessões deste exercício neste treino</caption><thead>{item.latest.kind === 'cardio' ? <tr><th>Data</th><th>Distância</th><th>Tempo</th><th>Velocidade</th><th>Evolução</th></tr> : <tr><th>Data</th><th>Kg máx.</th><th>Séries</th><th>Reps totais</th><th>Evolução</th></tr>}</thead><tbody>{item.sessions.slice(-6).reverse().map(s => s.kind === 'cardio' ? <tr key={s.id}><td>{date(s.at)}</td><td>{formatDistance(s.distance)}</td><td>{formatSeconds(s.duration)}</td><td>{formatSpeed(s.speed)}</td><td>{trendNames[s.trend]}</td></tr> : <tr key={s.id}><td>{date(s.at)}</td><td>{number(s.weight)}</td><td>{s.sets}</td><td>{s.reps}</td><td>{trendNames[s.trend]}</td></tr>)}</tbody></table></div></details>}
    </div>
  </details>
}

function Connection({ api, demo = false }) {
  const [key, setKey] = useState('')
  const [remember, setRemember] = useState(false)
  if (demo) return <section className="card"><h2>Conectar sua conta Hevy</h2><p>Esta é uma demonstração com dados fictícios. Para consultar seus treinos, abra a versão real e insira sua chave lá.</p><a href="./#settings">Sair da demonstração e conectar Hevy →</a></section>
  return <section className="card"><h2>{api.connected ? 'Conexão Hevy' : 'Conecte seus treinos'}</h2><p>Você treina e finaliza na Hevy. O FitPro consulta seu histórico e mostra onde evoluiu e o que merece atenção.</p>
    <form onSubmit={e => { e.preventDefault(); if (!key.trim()) return; api.connect(key.trim(), remember); setKey('') }}>
      <label>Chave da API Hevy<input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder="Cole a chave neste aparelho" required minLength={8} maxLength={256} /></label>
      <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Lembrar chave neste aparelho</label>
      <p className="muted">Se marcado, a chave fica no armazenamento deste navegador. Use apenas no seu aparelho. Cache, nomes e preferências também são locais; configure cada dispositivo.</p>
      <button className="primary" disabled={api.busy}>{api.busy ? 'Consultando…' : 'Conectar e atualizar'}</button>
    </form><a href="https://hevy.com/settings?developer" target="_blank" rel="noreferrer">Abrir configurações da API Hevy ↗</a>
    {(api.connected || api.snapshot) && <button className="danger quiet" onClick={api.disconnect}>Desconectar e limpar dados deste aparelho</button>}
  </section>
}

export default function Pulse({ previewSnapshot = null }) {
  const api = useHevy(previewSnapshot)
  const readTab = () => ['home', 'plan', 'stats', 'workout', 'alerts', 'settings'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home'
  const [tab, setTab] = useState(readTab)
  useEffect(() => { const onHash = () => setTab(readTab()); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash) }, [])
  const [routineId, setRoutineId] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(id) }, [])
  const data = useMemo(() => analyze(api.snapshot, api.preferences, now), [api.snapshot, api.preferences, now])
  const routine = data.active.find(r => r.id === routineId) || data.active[0]
  const rename = (id, name) => api.setPreferences(p => ({ ...p, names: { ...p.names, [id]: name } }))
  const go = next => { setExpanded(null); location.hash = next; setTab(next); window.scrollTo(0, 0); api.refresh() }
  const routineWorkouts = data.workouts.filter(w => routineFor(w, data.routines)?.id === routine?.id)
  const openRoutine = id => { setRoutineId(id); go('workout') }
  const stale = !previewSnapshot && api.snapshot && now - api.snapshot.syncedAt > 15 * 60000
  return <div className="pulse"><header><div><span className="eyebrow">FITPRO <span>× OPENGYM</span></span><h1>{({ home: 'Seu ritmo, sua evolução', plan: 'Seu plano', stats: 'Estatísticas', workout: 'Antes do treino', alerts: 'Pontos de atenção', settings: 'Configurações' })[tab]}</h1></div><button className="refresh" aria-label="Atualizar Hevy" disabled={api.busy || !api.connected} onClick={() => api.refresh(true)}>↻</button></header>
    <div className="sync-line" role="status"><span className={api.busy ? 'dot busy' : api.error || stale || !api.connected ? 'dot neutral' : 'dot'} />{api.busy ? api.progress : api.snapshot ? `Consultado ${new Date(api.snapshot.syncedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${!api.connected ? ' · chave não salva' : ''}` : 'Conecte a Hevy para começar'}</div>
    {api.error && <p className="notice" role="alert">{api.error}</p>}{api.storageError && <p className="notice" role="alert">{api.storageError}</p>}
    {!!api.snapshot?.warnings?.length && <details className="og-data-warning"><summary>Dados complementares: {api.snapshot.warnings.length} aviso(s)</summary>{api.snapshot.warnings.map(warning => <p key={warning}>{warning}</p>)}</details>}
    {stale && <p className="notice">Exibindo a última consulta salva. Atualize antes de usar os alertas no treino.</p>}
    {previewSnapshot && <p className="notice">Demonstração local · dados fictícios. Nenhuma alteração é salva ou enviada à Hevy.</p>}
    <main>
      {!api.snapshot && tab !== 'settings' ? <Connection api={api} /> : tab === 'home' ? <OpenGymHome {...{ api, data, now, openRoutine, go }} />
        : tab === 'plan' ? <OpenGymPlan {...{ api, data, openRoutine }} />
        : tab === 'stats' ? <OpenGymStats {...{ api, data, now, go, openRoutine }} /> : tab === 'workout' ? <>
        <RoutinePicker routines={data.active} selected={routine?.id} snapshot={api.snapshot} onSelect={id => { setExpanded(null); setRoutineId(id) }} />
        {routine ? <><div className="workout-heading"><div><h2>{shortTitle(routine.title)}</h2><p>Próxima sessão #{routine.nextSession} · {routine.exercises.length} exercícios</p></div><span className="pill">{routine.alerts} em atenção</span></div><p className="workout-hint">Na ordem da Hevy · toque no exercício que está fazendo.</p>{routine.exercises.map((e, i) => <Exercise key={`${e.key}-${i}`} item={e} expanded={expanded} setExpanded={setExpanded} />)}<details key={routine.id} className="routine-history"><summary>Treinos passados <span>{routineWorkouts.length} sessões · última duração {formatDuration(durationMinutes(routineWorkouts[0], now))}</span></summary><WorkoutHistory routine={routine} workouts={routineWorkouts} now={now} names={api.preferences.names} /></details><p className="footnote">Registre as séries na Hevy. Depois de finalizar, volte aqui para atualizar sua evolução.</p></> : <p className="empty">Nenhuma rotina ativa. Escolha as atuais em Configurações.</p>}
      </> : tab === 'alerts' ? <>
        <div className="card"><h2>Estagnação por treino</h2><p>3 a 5 sessões sem progresso: atenção. 6 ou mais: estagnação persistente. Aumento de carga, repetições na mesma carga ou volume reinicia a contagem.</p><p className="muted">Somente exercícios das rotinas ativas com sessão nos últimos 30 dias. Retornos após pausa ficam neutros.</p></div>
        {data.alerts.length ? data.alerts.map(e => <section key={e.key}><h3>{e.routineTitle}</h3><Exercise item={e} expanded={expanded} setExpanded={setExpanded} /></section>) : <div className="empty"><span className="green">✓</span><h2>Sem alertas recentes</h2><p>Consulte cada treino para ver o histórico e exercícios sem dados suficientes.</p></div>}
      </> : <>
        <Connection api={api} demo={!!previewSnapshot} />
        <ExerciseNames routines={data.routines} rename={rename} />
        <section className="card"><h2>Rotinas visíveis</h2><p className="muted">Ative apenas os treinos atuais. Desativar não apaga o histórico na Hevy.</p>{data.routines.map(r => <label className="routine-toggle" key={r.id}><span>{r.title}</span><input type="checkbox" checked={r.active} onChange={e => api.setPreferences(p => ({ ...p, active: { ...p.active, [r.id]: e.target.checked } }))} /></label>)}</section>
        <section className="card"><h2>Regras da análise</h2><label>Identificar retorno após pausa de<select value={api.preferences.pauseDays || 14} onChange={e => api.setPreferences(p => ({ ...p, pauseDays: Number(e.target.value) }))}>{[10, 14, 21, 30].map(n => <option key={n} value={n}>Mais de {n} dias</option>)}</select></label><p className="muted">Uma volta após pausa cria uma nova referência e não entra na sequência de estagnação.</p><p className="muted">{data.unmatched} sessão(ões) sem vínculo inequívoco com uma rotina atual. Permanecem na frequência e no histórico, sem misturar os alertas.</p><p className="muted">Os exercícios reconhecidos aparecem em português em todas as telas. Você pode personalizar o nome em “Nomes dos exercícios”, nesta tela; ali também ficam o original e o ID. Nomes personalizados são locais. Equivalências da versão anterior ainda não são importadas.</p></section>
        <section className="card"><h2>Sobre esta versão</h2><p>FitPro · modo de análise da Hevy, baseado no openGym. Sem gravação de treinos ou banco próprio. Atualização ao abrir, retomar o app e a cada 5 minutos visível.</p><p className="muted">Para instalar no iPhone: Safari → Compartilhar → Adicionar à Tela de Início.</p><a href="/fitpro/source.tar.gz">Código-fonte desta versão (AGPL)</a> · <a href="https://github.com/DuarteSantos8/openGym" target="_blank" rel="noreferrer">openGym</a></section>
      </>}
    </main><nav aria-label="Navegação principal">{[['home', 'Início'], ['plan', 'Plano'], ['workout', 'Treino'], ['stats', 'Estatísticas'], ['settings', 'Config']].map(([id, label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} className={tab === id ? 'active' : ''} onClick={() => go(id)}><Glyph name={id} /><span>{label}</span></button>)}</nav>
  </div>
}
