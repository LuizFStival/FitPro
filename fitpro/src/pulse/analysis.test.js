import { describe, expect, it } from 'vitest'
import { analyze, DAY, routineFor, setMetrics } from './analysis.js'
const now = Date.UTC(2026, 10, 2, 12)
const exercise = (id = 'abs', weight = 40, reps = 10) => ({ exercise_template_id: id, title: 'Abdominal (Máquina)', sets: [{ type: 'normal', weight_kg: weight, reps }] })
const routine = (id = 'a', title = 'Treino A') => ({ id, title, exercises: [exercise()] })
const workout = (id, ago, weight = 40, reps = 10, routine_id = 'a') => ({ id, routine_id, title: 'Treino A', start_time: new Date(now - ago * DAY).toISOString(), exercises: [exercise('abs', weight, reps)] })
const run = (workouts, prefs = {}, routines = [routine()]) => analyze({ routines, workouts }, prefs, now)
const current = workouts => run(workouts).active[0].exercises[0]

describe('per-routine plateau', () => {
  it('sorts routines A/B/C without mutating the snapshot or changing exercise order', () => {
    const routines = [routine('b', 'Treino B'), routine('c', 'Treino C'), routine('a', 'Treino A')]
    routines[2].exercises = [{ ...exercise('second'), index: 1 }, { ...exercise('first'), index: 0 }]
    const result = run([], {}, routines)
    expect(result.active.map(r => r.id)).toEqual(['a', 'b', 'c'])
    expect(result.active[0].exercises.map(e => e.id)).toEqual(['first', 'second'])
    expect(routines.map(r => r.id)).toEqual(['b', 'c', 'a'])
  })
  it('recognizes higher weight even with fewer reps', () => {
    expect(current([workout('1', 7), workout('2', 1, 45, 8)]).status).toBe('up')
  })
  it('recognizes more repetitions and restarts the count', () => {
    const item = current([workout('1', 12), workout('2', 9), workout('3', 6), workout('4', 3), workout('5', 1, 40, 12)])
    expect(item.status).toBe('up'); expect(item.streak).toBe(0); expect(item.latest.reasons).toContain('repetições')
  })
  it('recognizes total volume even when maximum weight decreases', () => {
    expect(current([workout('1', 7), workout('2', 1, 35, 15)]).latest.reasons).toEqual(['volume'])
  })
  it('counts comparisons, not the baseline session; warning starts at three', () => {
    const series = Array.from({ length: 7 }, (_, i) => workout(String(i), 14 - i * 2))
    expect(current(series.slice(0, 3)).streak).toBe(2)
    expect(current(series.slice(0, 3)).status).toBe('ok')
    expect(current(series.slice(0, 4)).status).toBe('warning')
    expect(current(series).status).toBe('critical')
    expect(current(series).nextSession).toBe(8)
  })
  it('never mixes identical template IDs across A and B', () => {
    const data = run([workout('1', 10), workout('2', 6), workout('3', 3), workout('4', 1), workout('b1', 1, 90, 20, 'b')], {}, [routine(), routine('b', 'Treino B')])
    expect(data.routines[0].exercises[0].status).toBe('warning')
    expect(data.routines[1].exercises[0].status).toBe('new')
    expect(data.routines[0].exercises[0].latest.weight).toBe(40)
  })
  it('neutralizes the return and compares the next session to the new baseline', () => {
    const series = [workout('1', 40, 50), workout('2', 33, 50), workout('3', 1, 30)]
    expect(current(series).status).toBe('return')
    expect(current(series).streak).toBe(0)
    expect(current([...series, workout('4', 0, 35)]).status).toBe('up')
  })
  it('honors the configured pause threshold strictly above the threshold', () => {
    const series = [workout('1', 15), workout('2', 1)]
    expect(current(series).status).toBe('ok')
    expect(run(series, { pauseDays: 10 }).active[0].exercises[0].status).toBe('return')
  })
  it('does not report old sessions or inactive routines as current alerts', () => {
    const old = [50, 45, 40, 35].map((d, i) => workout(String(i), d))
    expect(current(old).status).toBe('stale'); expect(run(old).alerts).toHaveLength(0)
    const recent = [10, 7, 4, 1].map((d, i) => workout(String(i), d))
    expect(run(recent, { active: { a: false } }).alerts).toHaveLength(0)
    expect(run(recent).alerts).toHaveLength(1)
  })
  it('ignores warmup, dropsets, failure and invalid measurements', () => {
    expect(setMetrics([{ type: 'warmup', weight_kg: 100, reps: 10 }, { type: 'normal', weight_kg: null, reps: 10 }, { type: 'normal', weight_kg: Infinity, reps: 10 }, { type: 'failure', weight_kg: 50, reps: 10 }])).toBeNull()
    expect(setMetrics(exercise('body', 0, 15).sets).reps).toBe(15)
  })
  it('deduplicates workouts but aggregates repeated exercise blocks once per session', () => {
    const w = workout('1', 1); w.exercises.push(exercise())
    const item = current([w, w])
    expect(item.sessions).toHaveLength(1); expect(item.latest.reps).toBe(20)
  })
  it('matches titles only when unambiguous, never by letter or exercise overlap', () => {
    expect(routineFor({ title: ' treino A ' }, [routine()]).id).toBe('a')
    expect(routineFor({ title: 'Treino A antigo' }, [routine()])).toBeNull()
    expect(routineFor({ title: 'Treino A' }, [routine(), routine('other')])).toBeNull()
    expect(routineFor({ title: 'Treino A', routine_id: 'deleted' }, [routine()])).toBeNull()
    expect(run([{ ...workout('1', 1), routine_id: null, title: 'Sem rotina' }]).unmatched).toBe(1)
  })
  it('keeps API order and exact API names; alias does not change identity', () => {
    const r = routine(); r.exercises = [{ ...exercise('second'), index: 1 }, { ...exercise('first'), index: 0, title: 'Nome API' }]
    const items = run([], { names: { first: 'Meu nome' } }, [r]).active[0].exercises
    expect(items.map(e => e.id)).toEqual(['first', 'second']); expect(items[0].title).toBe('Meu nome'); expect(items[0].apiTitle).toBe('Nome API')
  })
  it('does not include exercises removed from the current routine', () => {
    const w = workout('1', 1); w.exercises.push(exercise('removed'))
    expect(run([w]).active[0].exercises.map(e => e.id)).toEqual(['abs'])
  })
  it('defaults beginner routines off but allows reactivation by ID', () => {
    const r = routine('old', 'Treino A (Iniciante)')
    expect(run([], {}, [r]).active).toHaveLength(0)
    expect(run([], { active: { old: true } }, [r]).active).toHaveLength(1)
  })
  it('uses the same 30-day frequency metric and excludes future/invalid dates', () => {
    const result = run([workout('1', 1), workout('2', 29), workout('3', 31), workout('4', -1), { ...workout('5', 1), start_time: 'invalid' }])
    expect(result.recentCount).toBe(2); expect(result.frequency).toBe(14 / 30)
  })
})
