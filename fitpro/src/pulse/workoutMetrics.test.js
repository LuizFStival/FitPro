import { expect, it } from 'vitest'
import { durationMinutes, formatDuration } from './workoutMetrics.js'
import { deriveInsights } from './insights.js'
import { radarValues } from './MuscleRadar.jsx'

it('uses elapsed time including rest, rejects missing, reversed and future end times', () => {
  const now = Date.parse('2026-11-18T20:00:00Z')
  const workout = { id: 'one', start_time: '2026-11-18T18:00:00Z', end_time: '2026-11-18T19:15:00Z' }
  expect(durationMinutes(workout, now)).toBe(75)
  expect(formatDuration(75)).toBe('1h 15 min')
  expect(formatDuration(null)).toBe('Tempo não informado')
  for (const end_time of [null, '', 'bad', '2026-11-18T17:00:00Z', '2026-11-18T21:00:00Z']) expect(durationMinutes({ ...workout, end_time }, now)).toBeNull()
  const info = deriveInsights({ workouts: [workout, { ...workout, id: 'no-time', end_time: null }] }, now)
  expect(info.minutes).toBe(75)
  expect(info.timedCount).toBe(1)
  expect(info.averageMinutes).toBe(75)
})

it('keeps radar axes fixed and sums the same muscular load, without inventing data', () => {
  const rows = radarValues({ chest: 4, biceps: 3, triceps: 2, forearm: .4, hamstring: 5, gluteal: 2 })
  expect(rows).toHaveLength(8)
  expect(rows.find(r => r.label === 'Braços').value).toBe(5.4)
  expect(rows.find(r => r.label === 'Posterior').value).toBe(7)
  expect(rows.find(r => r.label === 'Costas').value).toBe(0)
  expect(radarValues({}).every(r => r.value === 0)).toBe(true)
})
