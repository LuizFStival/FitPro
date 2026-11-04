import { expect, it } from 'vitest'
import { dayKey, deriveInsights, effortOfSet, muscleSummary, muscleWeights, shiftDay, weekStart } from './insights.js'
import { levelsOf } from '../lib/body-map-model.js'
const now = +new Date(2026, 10, 3, 12)
const workout = (id, days, exercises = []) => ({ id, start_time: shiftDay(now, days).toISOString(), exercises })
it('uses calendar weeks starting Monday and preserves an ongoing streak before the first workout this week', () => {
  const workouts = [workout('a', -7), workout('b', -14), workout('c', -21)]
  expect(deriveInsights({ workouts }, now).streak).toBe(3)
  expect(deriveInsights({ workouts: [...workouts, workout('d', -1)] }, now).streak).toBe(4)
  expect(deriveInsights({ workouts: workouts.slice(1) }, now).streak).toBe(0)
  expect(dayKey(weekStart(now))).toBe('2026-11-02')
})
it('does not count duplicates, invalid dates, or future sessions', () => {
  const a = workout('a', -1)
  expect(deriveInsights({ workouts: [a, a, workout('future', 3), { id: 'bad', start_time: 'invalid' }] }, now).workouts).toHaveLength(1)
})
it('counts this week separately from a rolling 30-day window', () => {
  const snapshot = { workouts: [workout('a', -1), workout('b', -5), workout('c', -31)] }
  expect(deriveInsights(snapshot, now, 'week').selected).toHaveLength(1)
  expect(deriveInsights(snapshot, now, '30').selected).toHaveLength(2)
})
it('uses primary and secondary groups without double counting collapsed aliases', () => {
  expect(muscleWeights({ primary_muscle_group: 'lats', secondary_muscle_groups: ['upper_back', 'biceps', 'biceps'] })).toEqual({ 'upper-back': 1, biceps: .4 })
  expect(muscleWeights({ primary_muscle_group: 'unknown' })).toEqual({})
})
it('excludes warmups from muscle volume and discloses unmapped sets', () => {
  const sets = [{ type: 'normal', reps: 10 }, { type: 'warmup', reps: 10 }]
  const result = muscleSummary([workout('a', -1, [{ exercise_template_id: 'press', title: 'Press', sets }, { exercise_template_id: 'unknown', sets }])], [{ id: 'press', primary_muscle_group: 'chest', secondary_muscle_groups: ['triceps'] }])
  expect(result.load).toEqual({ chest: 1, triceps: .4 }); expect(result.totalSets).toBe(2); expect(result.knownSets).toBe(1)
})
it('does not invent effort for missing/null ratings and converts real RIR zero', () => {
  expect(effortOfSet({ rpe: null })).toBeNull()
  expect(effortOfSet({})).toBeNull()
  expect(effortOfSet({ rpe: 0 })).toBeNull()
  expect(effortOfSet({ rir: 0 })).toBe(10)
})
it('requires five rated sets for an effort average and shows coverage', () => {
  const rated = { type: 'normal', reps: 10, rpe: 8 }
  const build = n => deriveInsights({ workouts: [workout('a', -1, [{ sets: [...Array(n).fill(rated), { type: 'normal', reps: 10 }] }])] }, now)
  expect(build(4).effort.average).toBeNull()
  expect(build(5).effort).toMatchObject({ total: 6, rated: 5, average: 8, nearFailure: 5 })
})
it('weights come only from valid measurements, with real dates and a bounded 30-day delta', () => {
  const result = deriveInsights({ bodyMeasurements: [
    { date: '2026-09-01', weight_kg: 100 }, { date: '2026-10-10', weight_kg: 80 }, { date: '2026-11-02', weight_kg: 79 },
    { date: '2026-11-03', weight_kg: null }, { date: '2026-11-04', weight_kg: 77 }, { date: 'invalid', weight_kg: 50 },
  ] }, now)
  expect(result.latestWeight.y).toBe(79); expect(result.weightDelta).toBe(-1); expect(result.weights).toHaveLength(3)
  expect(deriveInsights({}, now).latestWeight).toBeUndefined()
})
it('keeps the upstream body-map levels and absolute threshold semantics', () => {
  expect(levelsOf({ chest: 10, biceps: 4 })).toMatchObject({ chest: 4, biceps: 2, abs: 0 })
  expect(levelsOf({ chest: .5 }, [{ at: .5, level: 3, exclusive: true }]).chest).toBe(0)
})
