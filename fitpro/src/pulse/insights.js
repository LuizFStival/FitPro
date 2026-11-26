import { DAY } from './analysis.js'
import { durationMinutes } from './workoutMetrics.js'
import { dedupeWorkouts } from './workoutDedup.js'

export const dayKey = value => {
  const d = new Date(value)
  return Number.isFinite(+d) ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''
}
export function weekStart(value) {
  const d = new Date(value); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d
}
export const shiftDay = (value, offset) => { const d = new Date(value); d.setDate(d.getDate() + offset); return d }
export const statisticsPeriodStart = (now, range) => range === 'week' ? +weekStart(now) : now - Number(range) * DAY
export const MUSCLE_LABELS = { trapezius: 'Trapézio', deltoids: 'Ombros', 'rear-deltoids': 'Ombro posterior', chest: 'Peitoral', 'upper-back': 'Costas', serratus: 'Serrátil', biceps: 'Bíceps', triceps: 'Tríceps', forearm: 'Antebraços', abs: 'Abdômen', obliques: 'Oblíquos', 'lower-back': 'Lombar', gluteal: 'Glúteos', quadriceps: 'Quadríceps', hamstring: 'Posterior de coxa', adductors: 'Adutores', 'hip-flexors': 'Flexores do quadril', calves: 'Panturrilhas', tibialis: 'Tibial', 'cardiovascular system': 'Cardiovascular' }
export const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Peito', muscles: ['chest'] },
  { key: 'back', label: 'Costas', muscles: ['upper-back', 'trapezius'] },
  { key: 'shoulders', label: 'Ombros', muscles: ['deltoids', 'serratus'] },
  { key: 'rear-shoulders', label: 'Ombro posterior', muscles: ['rear-deltoids'] },
  { key: 'biceps', label: 'Bíceps', muscles: ['biceps'] },
  { key: 'triceps', label: 'Tríceps', muscles: ['triceps'] },
  { key: 'forearms', label: 'Antebraços', muscles: ['forearm'] },
  { key: 'core', label: 'Core', muscles: ['abs', 'obliques'] },
  { key: 'lower-back', label: 'Lombar', muscles: ['lower-back'] },
  { key: 'glutes', label: 'Glúteos', muscles: ['gluteal'] },
  { key: 'quadriceps', label: 'Quadríceps', muscles: ['quadriceps', 'adductors', 'hip-flexors'] },
  { key: 'hamstrings', label: 'Posterior de coxa', muscles: ['hamstring'] },
  { key: 'calves', label: 'Panturrilhas', muscles: ['calves', 'tibialis'] },
]
const MAP = { abdominals: 'abs', abs: 'abs', biceps: 'biceps', calves: 'calves', chest: 'chest', forearms: 'forearm', glutes: 'gluteal', hamstrings: 'hamstring', lats: 'upper-back', lower_back: 'lower-back', upper_back: 'upper-back', quadriceps: 'quadriceps', shoulders: 'deltoids', rear_delts: 'rear-deltoids', rear_deltoids: 'rear-deltoids', posterior_deltoid: 'rear-deltoids', triceps: 'triceps', traps: 'trapezius', trapezius: 'trapezius', serratus: 'serratus', adductors: 'adductors', abductors: 'gluteal', hip_flexors: 'hip-flexors', obliques: 'obliques', tibialis: 'tibialis', cardio: 'cardiovascular system' }
const REAR_SHOULDER = /(rear\s*delt|reverse\s*(fly|pec)|face\s*pull|crucifixo\s*inverso|voador\s*inverso|posterior\s+(de\s+)?ombro)/i
const BODY_GROUP = { trapezius: 'back', deltoids: 'shoulders', 'rear-deltoids': 'rear-shoulders', chest: 'chest', 'upper-back': 'back', serratus: 'shoulders', biceps: 'biceps', triceps: 'triceps', forearm: 'forearms', abs: 'core', obliques: 'core', 'lower-back': 'lower-back', gluteal: 'glutes', quadriceps: 'quadriceps', hamstring: 'hamstrings', adductors: 'quadriceps', 'hip-flexors': 'quadriceps', calves: 'calves', tibialis: 'calves' }
const valid = v => v != null && v !== '' && Number.isFinite(Number(v))
export const workingSets = e => (e.sets || []).filter(s => s.type !== 'warmup' && ((valid(s.reps) && s.reps > 0) || (valid(s.duration_seconds) && s.duration_seconds > 0) || (valid(s.distance_meters) && s.distance_meters > 0)))

export function effortOfSet(set) {
  if (valid(set.rpe) && Number(set.rpe) >= 6 && Number(set.rpe) <= 10) return Number(set.rpe)
  if (valid(set.rir) && Number(set.rir) >= 0 && Number(set.rir) <= 4) return 10 - Number(set.rir)
  return null
}

const mappedMuscle = (group, title = '') => {
  const slug = MAP[String(group || '').trim().toLocaleLowerCase('en-US').replace(/[ -]+/g, '_')]
  return slug === 'deltoids' && REAR_SHOULDER.test(title) ? 'rear-deltoids' : slug
}

export function muscleWeights(template, exercise = {}, mode = 'direct') {
  const load = {}
  const title = `${exercise?.title || ''} ${template?.title || ''}`
  const primary = mappedMuscle(template?.primary_muscle_group, title)
  if (primary) load[primary] = 1
  if (mode !== 'equivalent') return load
  for (const group of new Set(template?.secondary_muscle_groups || [])) {
    const slug = mappedMuscle(group, title)
    if (slug && slug !== primary) load[slug] = 0.4
  }
  return load
}

const groupedLoad = raw => Object.fromEntries(MUSCLE_GROUPS.map(group => [group.key, group.muscles.reduce((sum, muscle) => sum + (raw[muscle] || 0), 0)]))
const bodyLoad = groups => Object.fromEntries(Object.entries(BODY_GROUP).map(([muscle, group]) => [muscle, groups[group] || 0]))
export const targetBand = value => value < 10 ? 'below' : value <= 20 ? 'target' : 'above'
export const targetLevels = load => Object.fromEntries(Object.keys(BODY_GROUP).map(muscle => [muscle, targetBand(load[muscle] || 0) === 'below' ? 1 : targetBand(load[muscle]) === 'target' ? 2 : 3]))

export function muscleSummary(workouts, templates, { mode = 'direct', weeks = 1 } = {}) {
  const byId = new Map((templates || []).map(t => [t.id, t]))
  const load = {}, directLoad = {}, contributors = {}
  let knownSets = 0, totalSets = 0
  for (const w of workouts) for (const e of w.exercises || []) {
    const sets = workingSets(e).length
    totalSets += sets
    const template = byId.get(e.exercise_template_id)
    const muscles = muscleWeights(template, e, mode)
    const direct = muscleWeights(template, e, 'direct')
    if (Object.keys(muscles).length) knownSets += sets
    for (const [slug, weight] of Object.entries(direct)) directLoad[slug] = (directLoad[slug] || 0) + sets * weight
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
  const divisor = Math.max(Number(weeks) || 1, 1 / 7)
  const weeklyLoad = Object.fromEntries(Object.entries(load).map(([key, value]) => [key, value / divisor]))
  const weeklyDirect = Object.fromEntries(Object.entries(directLoad).map(([key, value]) => [key, value / divisor]))
  const groups = groupedLoad(weeklyLoad)
  const directGroups = groupedLoad(weeklyDirect)
  const groupedContributors = {}
  for (const group of MUSCLE_GROUPS) {
    const merged = new Map()
    for (const muscle of group.muscles) for (const contributor of contributors[muscle]?.values() || []) {
      const previous = merged.get(contributor.id)
      merged.set(contributor.id, { ...contributor, sets: (previous?.sets || 0) + contributor.sets })
    }
    groupedContributors[group.key] = [...merged.values()].map(contributor => ({ ...contributor, sets: contributor.sets / divisor })).sort((a, b) => b.sets - a.sets)
  }
  const mapLoad = bodyLoad(groups)
  for (const [muscle, group] of Object.entries(BODY_GROUP)) groupedContributors[muscle] = groupedContributors[group]
  const push = directGroups.chest + directGroups.shoulders + directGroups.triceps
  const pull = directGroups.back + directGroups.biceps + directGroups['rear-shoulders']
  const ratio = !push && !pull ? null : !push || !pull ? Infinity : Math.max(push, pull) / Math.min(push, pull)
  const dominant = push === pull ? 'Equilibrado' : push > pull ? 'Empurrar' : 'Puxar'
  return { load: weeklyLoad, groups, bodyLoad: mapLoad, totalSets, knownSets, contributors: groupedContributors, weeks: divisor,
    pushPull: { push, pull, ratio, dominant, alert: ratio != null && ratio > 1.4 } }
}

export function routineMuscles(routine, templates) {
  return muscleSummary([{ title: routine.title, exercises: (routine.exercises || []).map(e => ({ ...e, sets: [{ type: 'normal', reps: 1 }] })) }], templates, { mode: 'equivalent' }).bodyLoad
}

export function deriveInsights(snapshot, now = Date.now(), range = 'week', options = {}) {
  const eligible = (snapshot?.workouts || []).filter(w => w?.id && Number.isFinite(Date.parse(w.start_time)) && Date.parse(w.start_time) <= now)
  const workouts = dedupeWorkouts(snapshot?.workouts, now)
  const start = weekStart(now)
  const from = statisticsPeriodStart(now, range)
  const selected = workouts.filter(w => Date.parse(w.start_time) >= from)
  const weekWorkouts = workouts.filter(w => Date.parse(w.start_time) >= +start)
  const weeks = new Set(workouts.map(w => dayKey(weekStart(w.start_time))))
  let cursor = start, streak = 0
  if (!weeks.has(dayKey(cursor))) cursor = shiftDay(cursor, -7)
  while (weeks.has(dayKey(cursor))) { streak++; cursor = shiftDay(cursor, -7) }
  const effort = { total: 0, rated: 0, average: null, nearFailure: 0, distribution: [0, 0, 0, 0, 0], points: [] }
  let effortSum = 0, minutes = 0, timedCount = 0
  for (const w of selected) {
    const duration = durationMinutes(w, now)
    if (duration != null) { minutes += duration; timedCount++ }
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
  const periodWeeks = range === 'week' ? 1 : Number(range) / 7
  return { workouts, selected, weekWorkouts, weekStart: start, streak, minutes, timedCount, averageMinutes: timedCount ? minutes / timedCount : null, effort, weights, latestWeight, recentWeights, weightDelta, duplicateCount: Math.max(0, eligible.length - workouts.length),
    monthCount: workouts.filter(w => dayKey(w.start_time).slice(0, 7) === dayKey(now).slice(0, 7)).length,
    muscles: muscleSummary(selected, snapshot?.templates || [], { mode: options.muscleMode || 'direct', weeks: periodWeeks }) }
}
