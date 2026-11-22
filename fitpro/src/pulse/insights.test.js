import { expect, it } from 'vitest'
import { dayKey, deriveInsights, effortOfSet, muscleSummary, muscleWeights, shiftDay, targetBand, weekStart } from './insights.js'
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
it('merges Hevy duplicates with the same title less than five minutes apart and keeps the richer record', () => {
  const start = new Date(now - 86400000).toISOString()
  const base = { id: 'a', title: 'Treino A', start_time: start, exercises: [{ sets: [{ type: 'normal', reps: 10 }] }] }
  const richer = { ...base, id: 'b', start_time: new Date(Date.parse(start) + 4 * 60000).toISOString(), exercises: [{ sets: [{ type: 'normal', reps: 10 }, { type: 'normal', reps: 10 }] }] }
  const atFive = { ...base, id: 'c', start_time: new Date(Date.parse(start) + 5 * 60000).toISOString() }
  const result = deriveInsights({ workouts: [base, richer, atFive] }, now)
  expect(result.workouts).toHaveLength(2); expect(result.workouts[0].id).toBe('b'); expect(result.duplicateCount).toBe(1)
})
it('counts this week separately from a rolling 30-day window', () => {
  const snapshot = { workouts: [workout('a', -1), workout('b', -5), workout('c', -31)] }
  expect(deriveInsights(snapshot, now, 'week').selected).toHaveLength(1)
  expect(deriveInsights(snapshot, now, '30').selected).toHaveLength(2)
})
it('uses primary and secondary groups without double counting collapsed aliases', () => {
  const template = { primary_muscle_group: 'lats', secondary_muscle_groups: ['upper_back', 'biceps', 'biceps'] }
  expect(muscleWeights(template)).toEqual({ 'upper-back': 1 })
  expect(muscleWeights(template, {}, 'equivalent')).toEqual({ 'upper-back': 1, biceps: .4 })
  expect(muscleWeights({ primary_muscle_group: 'unknown' })).toEqual({})
})
it('excludes warmups from muscle volume and discloses unmapped sets', () => {
  const sets = [{ type: 'normal', reps: 10 }, { type: 'warmup', reps: 10 }]
  const result = muscleSummary([workout('a', -1, [{ exercise_template_id: 'press', title: 'Press', sets }, { exercise_template_id: 'unknown', sets }])], [{ id: 'press', primary_muscle_group: 'chest', secondary_muscle_groups: ['triceps'] }])
  expect(result.load).toEqual({ chest: 1 }); expect(result.groups.chest).toBe(1); expect(result.groups.triceps).toBe(0); expect(result.totalSets).toBe(2); expect(result.knownSets).toBe(1)
})
it('separates requested muscle groups, keeps zeros, and detects rear-shoulder exercises', () => {
  const templates = [{ id: 'rear', title: 'Reverse Fly', primary_muscle_group: 'shoulders' }]
  const result = muscleSummary([workout('rear-workout', -1, [{ exercise_template_id: 'rear', title: 'Reverse Fly', sets: Array(4).fill({ type: 'normal', reps: 12 }) }])], templates)
  expect(result.groups).toMatchObject({ 'rear-shoulders': 4, shoulders: 0, biceps: 0, triceps: 0, glutes: 0, hamstrings: 0, 'lower-back': 0, core: 0 })
  expect(result.bodyLoad['rear-deltoids']).toBe(4)
})
it('shows weekly averages and calculates push versus pull from direct sets only', () => {
  const templates = [{ id: 'press', primary_muscle_group: 'chest', secondary_muscle_groups: ['triceps'] }, { id: 'row', primary_muscle_group: 'lats', secondary_muscle_groups: ['biceps'] }]
  const exercises = [{ exercise_template_id: 'press', sets: Array(12).fill({ type: 'normal', reps: 10 }) }, { exercise_template_id: 'row', sets: Array(6).fill({ type: 'normal', reps: 10 }) }]
  const result = muscleSummary([workout('a', -1, exercises)], templates, { mode: 'equivalent', weeks: 2 })
  expect(result.groups.chest).toBe(6); expect(result.groups.triceps).toBeCloseTo(2.4); expect(result.groups.back).toBe(3)
  expect(result.pushPull).toMatchObject({ push: 6, pull: 3, dominant: 'Empurrar', alert: true }); expect(result.pushPull.ratio).toBe(2)
  expect(targetBand(0)).toBe('below'); expect(targetBand(10)).toBe('target'); expect(targetBand(20)).toBe('target'); expect(targetBand(21)).toBe('above')
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
