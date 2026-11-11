// Synthetic UI verification only; the production build excludes this DEV-only import.
import { dayKey, shiftDay, weekStart } from './insights.js'
export function makePreview() {
  const now = Date.now()
  const names = [['Chest Press (Machine)', 'Incline Bench Press (Dumbbell)', 'Triceps Rope Pushdown', 'Crunch (Machine)'],
    ['Leg Press (Machine)', 'Squat (Smith Machine)', 'Lying Leg Curl (Machine)', 'Seated Calf Raise', 'Crunch (Machine)'],
    ['Lat Pulldown (Cable)', 'Seated Cable Row - V Grip (Cable)', 'EZ Bar Biceps Curl', 'Crunch (Machine)']]
  const groups = [['chest', 'chest', 'triceps', 'abdominals'], ['quadriceps', 'quadriceps', 'hamstrings', 'calves', 'abdominals'], ['lats', 'upper_back', 'biceps', 'abdominals']]
  const secondary = [['shoulders', 'triceps'], ['glutes', 'hamstrings'], ['biceps', 'forearms']]
  const routines = names.map((list, r) => ({ id: 'demo-' + r, title: 'Treino ' + 'ABC'[r] + ' · Demonstração', exercises: list.map((title, index) => ({ index, title, exercise_template_id: title === 'Crunch (Machine)' ? 'demo-abs' : 'demo-' + r + '-' + index })) }))
  const templates = [...new Map(routines.flatMap((r, ri) => r.exercises.map((e, ei) => ({ id: e.exercise_template_id, title: e.title, primary_muscle_group: groups[ri][ei], secondary_muscle_groups: ei === 0 ? secondary[ri] : [] }))).map(t => [t.id, t])).values()]
  const workouts = routines.flatMap((r, i) => Array.from({ length: 12 }, (_, n) => {
    const start = shiftDay(weekStart(now), (n - 11) * 7 + i * 2); start.setHours(7, 0, 0, 0)
    return { id: r.id + '-' + n, routine_id: r.id, title: r.title, start_time: start.toISOString(), end_time: new Date(+start + 55 * 60000).toISOString(),
      exercises: r.exercises.map((e, index) => ({ ...e, sets: Array.from({ length: 3 }, (_, s) => ({ type: 'normal', weight_kg: index === 0 ? 50 + Math.floor(Math.min(n, 7) / 4) * 5 : 20, reps: index === 0 && i === 1 ? 10 : 8 + n, rpe: Math.min(10, 7 + (n % 3) * 0.5 + s * 0.5) })) })) }
  })).filter(w => Date.parse(w.end_time) <= now)
  const bodyMeasurements = Array.from({ length: 13 }, (_, n) => ({ date: dayKey(shiftDay(new Date(now), (n - 12) * 4)), weight_kg: Math.round((80.5 - n * 0.18 + (n % 3) * 0.1) * 10) / 10 }))
  return { routines, workouts, templates, bodyMeasurements, syncedAt: now, templatesAt: now, measurementsAt: now,
    previewPreferences: { weekPlan: { 1: { routineId: 'demo-0', time: '07:00' }, 3: { routineId: 'demo-1', time: '07:00' }, 5: { routineId: 'demo-2', time: '07:00' } } } }
}
