import { DAY } from './analysis.js'

export const dayKey = value => {
  const d = new Date(value)
  return Number.isFinite(+d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''
}
export function weekStart(value) {
  const d = new Date(value); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d
}
export const shiftDay = (value, offset) => { const d = new Date(value); d.setDate(d.getDate() + offset); return d }
export const MUSCLE_LABELS = { trapezius: 'Trapézio', deltoids: 'Ombros', chest: 'Peitoral', 'upper-back': 'Costas', serratus: 'Serrátil', biceps: 'Bíceps', triceps: 'Tríceps', forearm: 'Antebraços', abs: 'Abdômen', obliques: 'Oblíquos', 'lower-back': 'Lombar', gluteal: 'Glúteos', quadriceps: 'Quadríceps', hamstring: 'Posteriores', adductors: 'Adutores', 'hip-flexors': 'Flexores do quadril', calves: 'Panturrilhas', tibialis: 'Tibial' }
const MAP = { abdominals: 'abs', abs: 'abs', biceps: 'biceps', calves: 'calves', chest: 'chest', forearms: 'forearm', glutes: 'gluteal', hamstrings: 'hamstring', lats: 'upper-back', lower_back: 'lower-back', upper_back: 'upper-back', quadriceps: 'quadriceps', shoulders: 'deltoids', triceps: 'triceps', traps: 'trapezius', adductors: 'adductors', abductors: 'gluteal', obliques: 'obliques' }
const valid = v => v != null && v !== '' && Number.isFinite(Number(v))
export const workingSets = e => (e.sets || []).filter(s => s.type !== 'warmup' && ((valid(s.reps) && s.reps > 0) || (valid(s.duration_seconds) && s.duration_seconds > 0)))

export function effortOfSet(set) {
  if (valid(set.rpe) && Number(set.rpe) >= 6 && Number(set.rpe) <= 10) return Number(set.rpe)
  if (valid(set.rir) && Number(set.rir) >= 0 && Number(set.rir) <= 4) return 10 - Number(set.rir)
  return null
}

export function muscleWeights(template) {
  const load = {}
  const primary = MAP[template?.primary_muscle_group]
  if (primary) load[primary] = 1
  for (const group of new Set(template?.secondary_muscle_groups || [])) {
    const slug = MAP[group]
    if (slug && slug !== primary) load[slug] = 0.4
  }
  return load
}

export function muscleSummary(workouts, templates) {
  const byId = new Map((templates || []).map(t => [t.id, t]))
  const load = {}, contributors = {}
  let knownSets = 0, totalSets = 0
  for (const w of workouts) for (const e of w.exercises || []) {
    const sets = workingSets(e).length
    totalSets += sets
    const muscles = muscleWeights(byId.get(e.exercise_template_id))
    if (Object.keys(muscles).length) knownSets += sets
    for (const [slug, weight] of Object.entries(muscles)) {
      load[slug] = (load[slug] || 0) + sets * weight
      if (sets) {
        contributors[slug] ||= new Map()
        const id = `${w.routine_id || w.title}::${e.exercise_template_id}`
        const old = contributors[slug].get(id)
        contributors[slug].set(id, { id, title: e.title, routine: w.title, sets: (old?.sets || 0) + sets * weight })
      }
    }
  }
  return { load, totalSets, knownSets, contributors: Object.fromEntries(Object.entries(contributors).map(([k, v]) => [k, [...v.values()]])) }
}

export function routineMuscles(routine, templates) {
  return muscleSummary([{ title: routine.title, exercises: (routine.exercises || []).map(e => ({ ...e, sets: [{ type: 'normal', reps: 1 }] })) }], templates).load
}

export function deriveInsights(snapshot, now = Date.now(), range = 'week') {
  const workouts = [...new Map((snapshot?.workouts || []).filter(w => w.id && Number.isFinite(Date.parse(w.start_time)) && Date.parse(w.start_time) <= now).map(w => [w.id, w])).values()].sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time))
  const start = weekStart(now)
  const from = range === 'week' ? +start : now - Number(range) * DAY
  const selected = workouts.filter(w => Date.parse(w.start_time) >= from)
  const weekWorkouts = workouts.filter(w => Date.parse(w.start_time) >= +start)
  const weeks = new Set(workouts.map(w => dayKey(weekStart(w.start_time))))
  let cursor = start, streak = 0
  if (!weeks.has(dayKey(cursor))) cursor = shiftDay(cursor, -7)
  while (weeks.has(dayKey(cursor))) { streak++; cursor = shiftDay(cursor, -7) }
  const effort = { total: 0, rated: 0, average: null, nearFailure: 0, distribution: [0, 0, 0, 0, 0], points: [] }
  let effortSum = 0, minutes = 0
  for (const w of selected) {
    const duration = Date.parse(w.end_time) - Date.parse(w.start_time)
    if (Number.isFinite(duration) && duration > 0) minutes += duration / 60000
    const rates = []
    for (const e of w.exercises || []) for (const s of workingSets(e)) {
      effort.total++
      const rpe = effortOfSet(s)
      if (rpe == null) continue
      effort.rated++; effortSum += rpe; rates.push(rpe)
      effort.distribution[Math.min(4, Math.floor(rpe - 6))]++
      if (rpe >= 7) effort.nearFailure++
    }
    if (rates.length) effort.points.push({ t: Date.parse(w.start_time), y: rates.reduce((a, b) => a + b, 0) / rates.length, d: dayKey(w.start_time), note: `${rates.length} séries avaliadas` })
  }
  if (effort.rated >= 5) effort.average = effortSum / effort.rated
  const weights = [...new Map((snapshot?.bodyMeasurements || []).filter(m => valid(m.weight_kg) && Number(m.weight_kg) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(m.date) && Number.isFinite(Date.parse(m.date)) && m.date <= dayKey(now)).map(m => [m.date, { t: +new Date(m.date + 'T12:00:00'), y: Number(m.weight_kg), d: m.date }])).values()].sort((a, b) => a.t - b.t)
  const latestWeight = weights.at(-1)
  const recentWeights = weights.filter(p => p.t >= now - 30 * DAY)
  const weightDelta = recentWeights.length >= 2 ? recentWeights.at(-1).y - recentWeights[0].y : null
  return { workouts, selected, weekWorkouts, weekStart: start, streak, minutes, effort, weights, latestWeight, recentWeights, weightDelta,
    monthCount: workouts.filter(w => dayKey(w.start_time).slice(0, 7) === dayKey(now).slice(0, 7)).length,
    muscles: muscleSummary(selected, snapshot?.templates || []) }
}
