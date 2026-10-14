import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareExerciseSession, evaluateExercise } from './trainingEvaluation';
import { calculateExercisePlateaus } from './plateauCalculator';
const session = (day: number, reps: number) => ({ date: new Date(Date.UTC(2026, 9, day)), workoutTitle: 'A', workoutId: `${day}`, exerciseTemplateId: 'x', exerciseTitle: 'x', weightKg: 40, totalReps: reps, volumeKg: 40 * reps });
test('evaluation recognizes reps improvement and distinguishes decrease', () => {
  assert.equal(compareExerciseSession(session(3, 12), session(1, 10)), 'up');
  assert.equal(compareExerciseSession(session(3, 8), session(1, 10)), 'down');
  assert.equal(compareExerciseSession(session(20, 8), session(1, 10)), 'return');
});
test('old sessions cannot become current evaluation alerts', () => {
  const plateaus = calculateExercisePlateaus([{ id: 'old', title: 'A', start_time: '2026-07-29', exercises: [{ exercise_template_id: 'x', title: 'x', sets: [{ type: 'normal', weight_kg: 40, reps: 10 }] }] }]);
  assert.equal(evaluateExercise(plateaus[0], new Date('2026-09-14').getTime()).latest, undefined);
});
