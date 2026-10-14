import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateExercisePlateaus } from './plateauCalculator';

const workout = (day: number, id = 'machine', weight = 40) => ({
  id: `${day}-${id}`, title: 'Treino A', start_time: new Date(Date.UTC(2026, 0, day)).toISOString(),
  exercises: [{ exercise_template_id: id, title: id, sets: [{ type: 'normal', weight_kg: weight }] }],
});

test('pause return is excluded from later stagnation sequences', () => {
  const history = [1, 3, 5, 7, 9, 30].map((day) => workout(day));
  assert.equal(calculateExercisePlateaus(history)[0].status, 'pause_return');
  const after = calculateExercisePlateaus([...history, workout(32)])[0];
  assert.equal(after.stuckSessions, 1);
  assert.equal(after.status, 'ok');
});

test('threshold uses strictly greater than configured days', () => {
  assert.equal(calculateExercisePlateaus([workout(1), workout(15)], { pauseThresholdDays: 14 })[0].status, 'ok');
  assert.equal(calculateExercisePlateaus([workout(1), workout(16)], { pauseThresholdDays: 14 })[0].status, 'pause_return');
});

test('equivalence counts alternating variations without comparing incompatible loads', () => {
  const result = calculateExercisePlateaus([
    workout(1, 'machine', 40), workout(3, 'bar', 60), workout(5, 'machine', 40),
    workout(7, 'bar', 60), workout(9, 'machine', 40),
  ], { equivalenceGroups: [{ id: 'eq', routineId: 'treino_a', routineTitle: 'Treino A', title: 'Supino',
    exerciseTemplateIds: ['machine', 'bar'], exerciseTitles: ['Machine', 'Bar'], createdAt: '' }] });
  assert.equal(result.length, 1);
  assert.equal(result[0].sessionsHistory.length, 5);
  assert.equal(result[0].stuckSessions, 3);
  assert.equal(result[0].status, 'warning');
});

test('reps or volume progression resets stagnation at unchanged load', () => {
  const history = [1, 3, 5, 7].map((day, index) => {
    const session = workout(day);
    session.exercises[0].sets = [{ type: 'normal', weight_kg: 40, reps: 10 + index }] as any;
    return session;
  });
  assert.equal(calculateExercisePlateaus(history)[0].stuckSessions, 0);
  assert.equal(calculateExercisePlateaus(history)[0].status, 'ok');
});

test('same template in A and B never shares sessions', () => {
  const history = [1, 3, 5, 7].map((day) => workout(day));
  history.push({ ...workout(8, 'machine', 80), title: 'Treino B' });
  const result = calculateExercisePlateaus(history);
  assert.equal(result.length, 2);
  assert.equal(result.find((item) => item.routineTitle === 'Treino A')?.stuckSessions, 3);
  assert.equal(result.find((item) => item.routineTitle === 'Treino B')?.sessionsHistory.length, 1);
});

test('explicit empty active routine excludes archived exercises', () => {
  assert.equal(calculateExercisePlateaus([workout(1)], { activeTemplateIds: [] })[0].isActiveInCurrentRoutine, false);
  assert.equal(calculateExercisePlateaus([workout(1)], { activeTemplateIds: ['machine'] })[0].isActiveInCurrentRoutine, true);
});
