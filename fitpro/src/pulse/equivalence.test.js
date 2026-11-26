import { describe, expect, it } from 'vitest'
import { equivalenceCandidates } from './ExerciseEquivalences.jsx'
import { equivalentIdsFor, setEquivalenceGroup } from './equivalence.js'

describe('exercise equivalence configuration', () => {
  it('keeps groups isolated by routine and removes overlapping memberships', () => {
    const current = [
      { routineId: 'a', exerciseIds: ['machine', 'barbell'] },
      { routineId: 'a', exerciseIds: ['dumbbell', 'cable'] },
      { routineId: 'b', exerciseIds: ['machine', 'barbell'] },
    ]
    const next = setEquivalenceGroup(current, 'a', 'machine', ['dumbbell'])
    expect(next).toContainEqual({ routineId: 'a', exerciseIds: ['dumbbell', 'machine'] })
    expect(next).not.toContainEqual(expect.objectContaining({ routineId: 'a', exerciseIds: expect.arrayContaining(['barbell']) }))
    expect(equivalentIdsFor({ equivalenceGroups: next }, 'b', 'machine')).toEqual(new Set(['barbell', 'machine']))
  })

  it('offers only historical alternatives from the same slot and primary muscle', () => {
    const machine = { index: 0, exercise_template_id: 'machine', title: 'Chest Press' }
    const snapshot = {
      routines: [{ id: 'a', title: 'Treino A', exercises: [machine] }, { id: 'b', title: 'Treino B', exercises: [machine] }],
      templates: [
        { id: 'machine', title: 'Chest Press', primary_muscle_group: 'chest' },
        { id: 'barbell', title: 'Bench Press', primary_muscle_group: 'chest' },
        { id: 'row', title: 'Row', primary_muscle_group: 'back' },
        { id: 'incline', title: 'Incline Press', primary_muscle_group: 'chest' },
      ],
      workouts: [
        { id: 'a1', routine_id: 'a', exercises: [{ index: 0, exercise_template_id: 'barbell', title: 'Bench Press' }, { index: 1, exercise_template_id: 'incline', title: 'Incline Press' }, { index: 0, exercise_template_id: 'row', title: 'Row' }] },
        { id: 'b1', routine_id: 'b', exercises: [{ index: 0, exercise_template_id: 'incline', title: 'Incline Press' }] },
      ],
    }
    const routine = { id: 'a', title: 'Treino A' }
    const item = { id: 'machine', order: 0, title: 'Supino Sentado' }
    expect(equivalenceCandidates(snapshot, routine, item).map(candidate => candidate.id)).toEqual(['barbell'])
  })
})
