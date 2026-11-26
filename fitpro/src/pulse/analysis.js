// Read-only Hevy analysis. Identity is routine + template, never a translated name.
import { portugueseExerciseName, executionGuide } from './exercisePresentation.js'
import { dedupeWorkouts } from './workoutDedup.js'
import { equivalentIdsFor } from './equivalence.js'
export const DAY = 86400000
export const normalizeTitle = value => String(value || '').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ')
const finite = value => value !== null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
const positive = value => finite(value) && Number(value) > 0
export const isAlert = item => item.status === 'warning' || item.status === 'critical'
export const defaultActive = routine => !/\(iniciante\)/i.test(routine.title || '')
export const ordered = items => (items || []).map((item, position) => ({ ...item, position })).sort((a, b) => (a.index ?? a.position) - (b.index ?? b.position))

export function routineFor(workout, routines) {
  if (workout.routine_id) return routines.find(r => r.id === workout.routine_id) || null
  const matches = routines.filter(r => normalizeTitle(r.title) === normalizeTitle(workout.title))
  return matches.length === 1 ? matches[0] : null
}

export function setMetrics(sets) {
  const normal = (sets || []).filter(s => s.type === 'normal')
  const strength = normal.filter(s => finite(s.weight_kg) && positive(s.reps))
  if (strength.length) {
    const weight = Math.max(...strength.map(s => Number(s.weight_kg)))
    return { kind: 'strength', weight, reps: strength.reduce((n, s) => n + Number(s.reps), 0),
      volume: strength.reduce((n, s) => n + Number(s.weight_kg) * Number(s.reps), 0),
      bestReps: Math.max(...strength.filter(s => Number(s.weight_kg) === weight).map(s => Number(s.reps))), sets: strength.length,
      setDetails: strength.map(s => ({ weight: Number(s.weight_kg), reps: Number(s.reps) })) }
  }
  const cardio = normal.filter(s => positive(s.duration_seconds) || positive(s.distance_meters))
  if (!cardio.length) return null
  const duration = cardio.reduce((n, s) => n + (positive(s.duration_seconds) ? Number(s.duration_seconds) : 0), 0)
  const distance = cardio.reduce((n, s) => n + (positive(s.distance_meters) ? Number(s.distance_meters) : 0), 0)
  return { kind: 'cardio', duration, distance, speed: duration && distance ? distance / duration * 3.6 : null, sets: cardio.length,
    setDetails: cardio.map(s => ({ duration: positive(s.duration_seconds) ? Number(s.duration_seconds) : 0, distance: positive(s.distance_meters) ? Number(s.distance_meters) : 0 })) }
}

export function progressReasons(current, previous) {
  if (!previous) return []
  if (current.kind === 'cardio' && previous.kind === 'cardio') return [
    current.distance > previous.distance + 1 && 'distância',
    current.speed != null && previous.speed != null && current.speed > previous.speed + 0.05 && 'ritmo',
    !current.distance && !previous.distance && current.duration > previous.duration + 1 && 'tempo',
  ].filter(Boolean)
  if (current.kind !== 'strength' || previous.kind !== 'strength') return []
  return [current.weight > previous.weight + 0.001 && 'carga',
    current.weight === previous.weight && (current.reps > previous.reps || current.bestReps > previous.bestReps) && 'repetições',
    current.volume > previous.volume + 0.001 && 'volume'].filter(Boolean)
}

function regressed(current, previous) {
  if (current.kind === 'cardio' && previous.kind === 'cardio') {
    if (current.distance || previous.distance) return current.distance < previous.distance - 1 || (Math.abs(current.distance - previous.distance) <= 1 && current.speed != null && previous.speed != null && current.speed < previous.speed - 0.05)
    return current.duration < previous.duration - 1
  }
  return current.kind === 'strength' && previous.kind === 'strength' && (current.volume < previous.volume || current.weight < previous.weight)
}

function exerciseHistory(mappedWorkouts) {
  const history = new Map()
  for (const { workout, routine } of mappedWorkouts) {
    const setsByTemplate = new Map()
    for (const exercise of ordered(workout.exercises)) {
      const id = exercise.exercise_template_id
      if (!id) continue
      if (!setsByTemplate.has(id)) setsByTemplate.set(id, [])
      setsByTemplate.get(id).push(...ordered(exercise.sets))
    }
    for (const [id, sets] of setsByTemplate) {
      const metrics = setMetrics(sets)
      if (!metrics) continue
      if (!history.has(id)) history.set(id, [])
      history.get(id).push({ ...metrics, id: workout.id, at: Date.parse(workout.start_time),
        sourceRoutineId: routine?.id, sourceTitle: workout.title || routine?.title || 'Treino Hevy' })
    }
  }
  return history
}

export function analyze(snapshot, preferences = {}, now = Date.now()) {
  const routines = [...(snapshot?.routines || [])].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))
  const templates = new Map((snapshot?.templates || []).map(template => [template.id, template]))
  const pauseDays = Math.min(30, Math.max(10, Number(preferences.pauseDays) || 14))
  const workouts = dedupeWorkouts(snapshot?.workouts, now)
  const mapped = workouts.map(workout => ({ workout, routine: routineFor(workout, routines) }))
  const history = exerciseHistory(mapped)
  const result = routines.map(routine => {
    const matches = mapped.filter(m => m.routine?.id === routine.id).map(m => m.workout)
    const exercises = ordered(routine.exercises).map(exercise => {
      const id = exercise.exercise_template_id
      const equivalentIds = equivalentIdsFor(preferences, routine.id, id)
      const template = templates.get(id)
      const key = `${routine.id}::${id}`
      const sessions = []
      let streak = 0
      for (const workout of matches) {
        const metrics = setMetrics(ordered(workout.exercises).filter(e => equivalentIds.has(e.exercise_template_id)).flatMap(e => ordered(e.sets)))
        if (!metrics) continue
        const previous = sessions.at(-1)
        const at = Date.parse(workout.start_time)
        const gap = previous ? Math.floor((at - previous.at) / DAY) : 0
        const returning = !!previous && gap > pauseDays
        const reasons = returning ? [] : progressReasons(metrics, previous)
        streak = !previous || returning || reasons.length ? 0 : streak + 1
        sessions.push({ ...metrics, id: workout.id, at, gap, reasons, streak,
          trend: returning ? 'return' : !previous ? 'new' : reasons.length ? 'up' : regressed(metrics, previous) ? 'down' : 'same' })
      }
      const latest = sessions.at(-1)
      const firstSessionAt = sessions[0]?.at ?? Infinity
      const referenceSessions = (history.get(id) || []).filter(session =>
        session.sourceRoutineId !== routine.id && session.at < firstSessionAt)
      const age = latest ? Math.floor((now - latest.at) / DAY) : null
      const status = !latest ? 'empty' : age > 30 ? 'stale' : latest.trend === 'return' ? 'return' : sessions.length < 2 ? 'new' : streak >= 6 ? 'critical' : streak >= 3 ? 'warning' : latest.trend === 'up' ? 'up' : 'ok'
      const apiTitle = exercise.title || template?.title
      const displayTitle = preferences.names?.[id] || apiTitle
      const equivalentTitles = [...equivalentIds].filter(otherId => otherId !== id).map(otherId => {
        const otherTemplate = templates.get(otherId)
        const otherTitle = preferences.names?.[otherId] || otherTemplate?.title || otherId
        return otherTemplate?.is_custom ? otherTitle : portugueseExerciseName(otherTitle)
      })
      return { key, id, title: template?.is_custom ? displayTitle || 'Exercício sem nome' : portugueseExerciseName(displayTitle), apiTitle,
        guide: executionGuide(apiTitle, template?.title, template?.is_custom === true),
        order: exercise.index ?? exercise.position, routineId: routine.id, routineTitle: routine.title, sessions, latest, streak, status, age, equivalentIds: [...equivalentIds], equivalentTitles,
        referenceSessions, reference: referenceSessions.at(-1),
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
  if (item.status === 'empty' && item.reference) return 'Referência de outro treino'
  return { empty: 'Sem séries comparáveis', new: 'Primeira referência', stale: 'Sem sessão recente', return: 'Retorno de pausa',
    critical: 'Estagnação persistente', warning: 'Atenção à evolução', up: 'Evoluiu', ok: 'Em acompanhamento' }[item.status]
}

export function explanation(item) {
  if (!item.latest && item.reference) return 'Use a execução anterior como referência. A evolução nesta rotina começa com a primeira sessão registrada aqui.'
  if (!item.latest) return 'Ainda não há uma execução comparável registrada neste exercício e treino.'
  if (item.status === 'stale') return `Última sessão há ${item.age} dias. Fora dos alertas atuais.`
  if (item.status === 'return') return `Voltou após ${item.latest.gap} dias. Nova referência, sem alerta de estagnação.`
  if (item.status === 'new') return 'A próxima sessão permitirá a primeira comparação.'
  if (item.status === 'up') return `Aumentou ${item.latest.reasons.join(' e ')} em relação à sessão anterior deste treino.`
  if (item.latest.kind === 'cardio') return `${item.streak} sessão(ões) seguida(s) sem aumento de distância, tempo ou ritmo. Atenção a partir de 3; persistente a partir de 6.`
  return `${item.streak} sessão(ões) seguida(s) sem aumento de carga, repetições ou volume. Atenção a partir de 3; persistente a partir de 6.`
}
