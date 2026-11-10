// Read-only Hevy analysis. Identity is routine + template, never a translated name.
import { portugueseExerciseName, executionGuide } from './exercisePresentation.js'
export const DAY = 86400000
export const normalizeTitle = value => String(value || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
export const isAlert = item => item.status === 'warning' || item.status === 'critical'
export const defaultActive = routine => !/\(iniciante\)/i.test(routine.title || '')
export const ordered = items => (items || []).map((item, position) => ({ ...item, position })).sort((a, b) => (a.index ?? a.position) - (b.index ?? b.position))

export function routineFor(workout, routines) {
  if (workout.routine_id) return routines.find(r => r.id === workout.routine_id) || null
  const matches = routines.filter(r => normalizeTitle(r.title) === normalizeTitle(workout.title))
  return matches.length === 1 ? matches[0] : null
}

export function setMetrics(sets) {
  const valid = (sets || []).filter(s => s.type === 'normal' && finite(s.weight_kg) && finite(s.reps) && Number(s.reps) > 0)
  if (!valid.length) return null
  const weight = Math.max(...valid.map(s => Number(s.weight_kg)))
  return { weight, reps: valid.reduce((n, s) => n + Number(s.reps), 0),
    volume: valid.reduce((n, s) => n + Number(s.weight_kg) * Number(s.reps), 0),
    bestReps: Math.max(...valid.filter(s => Number(s.weight_kg) === weight).map(s => Number(s.reps))), sets: valid.length }
}

export function progressReasons(current, previous) {
  if (!previous) return []
  return [current.weight > previous.weight + 0.001 && 'carga',
    current.weight === previous.weight && (current.reps > previous.reps || current.bestReps > previous.bestReps) && 'repetições',
    current.volume > previous.volume + 0.001 && 'volume'].filter(Boolean)
}

export function analyze(snapshot, preferences = {}, now = Date.now()) {
  const routines = snapshot?.routines || []
  const templates = new Map((snapshot?.templates || []).map(template => [template.id, template]))
  const pauseDays = Math.min(30, Math.max(10, Number(preferences.pauseDays) || 14))
  const workouts = [...new Map((snapshot?.workouts || []).filter(w => w.id && w.start_time && Number.isFinite(Date.parse(w.start_time)) && Date.parse(w.start_time) <= now).map(w => [w.id, w])).values()]
    .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))
  const mapped = workouts.map(workout => ({ workout, routine: routineFor(workout, routines) }))
  const result = routines.map(routine => {
    const matches = mapped.filter(m => m.routine?.id === routine.id).map(m => m.workout)
    const exercises = ordered(routine.exercises).map(exercise => {
      const id = exercise.exercise_template_id
      const template = templates.get(id)
      const key = `${routine.id}::${id}`
      const sessions = []
      let streak = 0
      for (const workout of matches) {
        const metrics = setMetrics((workout.exercises || []).filter(e => e.exercise_template_id === id).flatMap(e => e.sets || []))
        if (!metrics) continue
        const previous = sessions.at(-1)
        const at = Date.parse(workout.start_time)
        const gap = previous ? Math.floor((at - previous.at) / DAY) : 0
        const returning = !!previous && gap > pauseDays
        const reasons = returning ? [] : progressReasons(metrics, previous)
        streak = !previous || returning || reasons.length ? 0 : streak + 1
        sessions.push({ ...metrics, id: workout.id, at, gap, reasons, streak,
          trend: returning ? 'return' : !previous ? 'new' : reasons.length ? 'up' : metrics.volume < previous.volume || metrics.weight < previous.weight ? 'down' : 'same' })
      }
      const latest = sessions.at(-1)
      const age = latest ? Math.floor((now - latest.at) / DAY) : null
      const status = !latest ? 'empty' : age > 30 ? 'stale' : latest.trend === 'return' ? 'return' : sessions.length < 2 ? 'new' : streak >= 6 ? 'critical' : streak >= 3 ? 'warning' : latest.trend === 'up' ? 'up' : 'ok'
      const apiTitle = exercise.title || template?.title
      const displayTitle = preferences.names?.[id] || apiTitle
      return { key, id, title: template?.is_custom ? displayTitle || 'Exercício sem nome' : portugueseExerciseName(displayTitle), apiTitle,
        guide: executionGuide(apiTitle, template?.title, template?.is_custom === true),
        order: exercise.index ?? exercise.position, routineId: routine.id, routineTitle: routine.title, sessions, latest, streak, status, age,
        nextSession: sessions.length + 1 }
    })
    return { ...routine, active: preferences.active?.[routine.id] ?? defaultActive(routine), exercises,
      sessions: matches.length, nextSession: matches.length + 1, lastAt: matches.length ? Date.parse(matches.at(-1).start_time) : null,
      alerts: exercises.filter(isAlert).length, evolved: exercises.filter(e => e.status === 'up').length }
  })
  const active = result.filter(r => r.active)
  const recent = workouts.filter(w => now - Date.parse(w.start_time) < 30 * DAY)
  return { routines: result, active, workouts: [...workouts].reverse(), unmatched: mapped.filter(m => !m.routine).length,
    recentCount: recent.length, frequency: recent.length * 7 / 30,
    alerts: active.flatMap(r => r.exercises.filter(isAlert)), evolved: active.reduce((n, r) => n + r.evolved, 0) }
}

export function statusText(item) {
  return { empty: 'Sem séries comparáveis', new: 'Primeira referência', stale: 'Sem sessão recente', return: 'Retorno de pausa',
    critical: 'Estagnação persistente', warning: 'Atenção à evolução', up: 'Evoluiu', ok: 'Em acompanhamento' }[item.status]
}

export function explanation(item) {
  if (!item.latest) return 'Ainda não há séries normais com carga e repetições neste exercício e treino.'
  if (item.status === 'stale') return `Última sessão há ${item.age} dias. Fora dos alertas atuais.`
  if (item.status === 'return') return `Voltou após ${item.latest.gap} dias. Nova referência, sem alerta de estagnação.`
  if (item.status === 'new') return 'A próxima sessão permitirá a primeira comparação.'
  if (item.status === 'up') return `Aumentou ${item.latest.reasons.join(' e ')} em relação à sessão anterior deste treino.`
  return `${item.streak} sessão(ões) seguida(s) sem aumento de carga, repetições ou volume. Atenção a partir de 3; persistente a partir de 6.`
}
