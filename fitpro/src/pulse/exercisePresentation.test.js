import { expect, it } from 'vitest'
import { analyze } from './analysis.js'
import { EXECUTION_GUIDES, executionGuide, portugueseExerciseName as name } from './exercisePresentation.js'

it('translates exact variants without dropping equipment or grip', () => {
  expect(name(' Seated Calf Raise ')).toBe('Panturrilha Sentado (Máquina)')
  expect(name('Crunch (Machine)')).toBe('Abdominal (Máquina)')
  expect(name('Incline Bench Press (Dumbbell)')).toBe('Supino Inclinado (Halter)')
  expect(name('Bench Press - Wide Grip (Barbell)')).toBe('Supino com Pegada Aberta (Barra)')
  expect(name('Leg Press Horizontal (Machine)')).toBe('Leg Press Horizontal (Máquina)')
  expect(name('Lying Leg Curl (Machine)')).not.toBe(name('Seated Leg Curl (Machine)'))
  expect(name('Supino da academia')).toBe('Supino da academia')
  expect(name('Lateral Raise (Unknown Machine)')).toBe('Lateral Raise (Unknown Machine)')
})

it('uses one translated name for every view while retaining original IDs and separate routines', () => {
  const exercises = [{ title: 'Crunch (Machine)', exercise_template_id: 'abs', index: 2 }]
  const snapshot = { routines: [{ id: 'a', exercises }, { id: 'b', exercises }], workouts: [] }
  const result = analyze(snapshot)
  expect(result.active.map(r => r.exercises[0].title)).toEqual(['Abdominal (Máquina)', 'Abdominal (Máquina)'])
  expect(result.active.map(r => r.exercises[0].key)).toEqual(['a::abs', 'b::abs'])
  expect(result.active[0].exercises[0].apiTitle).toBe('Crunch (Machine)')
  const custom = analyze(snapshot, { names: { abs: 'Meu abdominal' } }).active[0].exercises[0]
  expect(custom.title).toBe('Meu abdominal')
  expect(custom.guide.video).toBe(result.active[0].exercises[0].guide.video)
  expect(analyze(snapshot, { names: { abs: 'Crunch (Machine)' } }).active[0].exercises[0].title).toBe('Abdominal (Máquina)')
})

it('does not attach a similar exercise video or translate by a custom alias', () => {
  expect(executionGuide('Crunch (Machine)').video).toBe('5uTPwcdt4gQ')
  expect(executionGuide('Crunch')).toBeNull()
  expect(executionGuide('Seated Calf Raise (Dumbbell)')).toBeNull()
  expect(executionGuide('My custom exercise', 'Crunch (Machine)')).toBeNull()
  expect(executionGuide('Crunch (Machine)', null, true)).toBeNull()
  expect(executionGuide('Lying Leg Curl (Machine)').video).not.toBe(executionGuide('Seated Leg Curl (Machine)').video)
  for (const guide of EXECUTION_GUIDES) {
    expect(guide.video).toMatch(/^[\w-]{11}$/)
    expect(new URL(guide.source).protocol).toBe('https:')
  }
})
