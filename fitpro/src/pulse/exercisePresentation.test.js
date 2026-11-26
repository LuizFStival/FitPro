import { expect, it } from 'vitest'
import { analyze } from './analysis.js'
import { EXECUTION_GUIDES, executionGuide, exerciseDisplayName, portugueseExerciseName as name } from './exercisePresentation.js'

it('translates exact variants without dropping equipment or grip', () => {
  expect(name(' Seated Calf Raise ')).toBe('Panturrilha Sentado (Máquina)')
  expect(name('Crunch (Machine)')).toBe('Abdominal (Máquina)')
  expect(name('Incline Bench Press (Dumbbell)')).toBe('Supino Inclinado (Halter)')
  expect(name('Bench Press - Wide Grip (Barbell)')).toBe('Supino Aberto (Barra)')
  expect(name('Leg Press Horizontal (Machine)')).toBe('Leg Press Horizontal (Máquina)')
  expect(name('Lying Leg Curl (Machine)')).not.toBe(name('Seated Leg Curl (Machine)'))
  expect(name('Supino da academia')).toBe('Supino da academia')
  expect(name('Lateral Raise (Unknown Machine)')).toBe('Lateral Raise (Unknown Machine)')
})

it('matches the Hevy pt-BR labels shown in routines A, B and C', () => {
  const labels = {
    'Bench Press - Wide Grip (Barbell)': 'Supino Aberto (Barra)',
    'Incline Bench Press (Dumbbell)': 'Supino Inclinado (Halter)',
    'Chest Fly (Machine)': 'Crucifixo (Máquina)',
    'Seated Shoulder Press (Machine)': 'Desenvolvimento de Ombros Sentado (Máquina)',
    'Lateral Raise (Machine)': 'Elevação Lateral (Máquina)',
    'Triceps Rope Pushdown': 'Tríceps na Polia com Corda',
    'Seated Dip Machine': 'Mergulho Sentado (Máquina)',
    'Crunch (Machine)': 'Abdominal (Máquina)',
    'Leg Press (Machine)': 'Leg Press 45° (Máquina)',
    'Bulgarian Split Squat (Dumbbell)': 'Agachamento Búlgaro (Halter)',
    'Hip Thrust (Machine)': 'Elevação Pélvica (Máquina)',
    'Leg Extension (Machine)': 'Cadeira Extensora (Máquina)',
    'Lying Leg Curl (Machine)': 'Mesa Flexora (Máquina)',
    'Standing Calf Raise (Machine)': 'Panturrilha em Pé (Máquina)',
    'Seated Calf Raise': 'Panturrilha Sentado (Máquina)',
    'Back Extension (Weighted Hyperextension)': 'Extensão Lombar (Hiperextensão com Peso)',
    Treadmill: 'Esteira',
    'Iso-Lateral High Row (Machine)': 'Remada Alta Iso-Lateral (Máquina)',
    'Dumbbell Row': 'Remada Serrote (Halter)',
    'Lat Pulldown - Close Grip (Cable)': 'Puxada Alta - Pegada Fechada (Cabo)',
    'Rear Delt Reverse Fly (Machine)': 'Crucifixo Invertido (Máquina)',
    'EZ Bar Biceps Curl': 'Rosca Direta (Barra W)',
    'Seated Incline Curl (Dumbbell)': 'Rosca Inclinada Sentado (Halter)',
  }
  for (const [apiTitle, expected] of Object.entries(labels)) {
    expect(name(apiTitle), apiTitle).toBe(expected)
    expect(name(expected)).toBe(expected)
  }
  expect(name('Lat Pulldown (Cable)')).toBe('Puxada Alta (Cabo)')
  expect(exerciseDisplayName(null, { title: 'Dumbbell Row' })).toBe('Remada Serrote (Halter)')
  expect(exerciseDisplayName('Dumbbell Row', { is_custom: true })).toBe('Dumbbell Row')
  expect(exerciseDisplayName('Dumbbell Row', {}, 'Meu serrote')).toBe('Meu serrote')
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
