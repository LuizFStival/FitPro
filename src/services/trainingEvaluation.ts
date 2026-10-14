import { ExercisePlateau, ExerciseSession } from '../types/plateau';

export type PerformanceChange = 'up' | 'down' | 'stable' | 'return' | 'unknown';
export const changeLabels: Record<PerformanceChange, string> = {
  up: 'Evoluiu', down: 'Abaixo da anterior', stable: 'Manteve', return: 'Retorno', unknown: 'Sem comparação',
};

export function compareExerciseSession(current: ExerciseSession, previous?: ExerciseSession, pauseDays = 14): PerformanceChange {
  if (!previous) return 'unknown';
  if ((current.date.getTime() - previous.date.getTime()) / 86400000 > pauseDays) return 'return';
  if (current.weightKg > previous.weightKg ||
    (current.weightKg === previous.weightKg && (current.totalReps || 0) > (previous.totalReps || 0)) ||
    (current.volumeKg || 0) > (previous.volumeKg || 0)) return 'up';
  if (current.weightKg < previous.weightKg || (current.volumeKg || 0) < (previous.volumeKg || 0) ||
    (current.totalReps || 0) < (previous.totalReps || 0)) return 'down';
  return 'stable';
}

export function evaluateExercise(plateau: ExercisePlateau, cutoff: number) {
  const previousByVariation = new Map<string, ExerciseSession>();
  const history = plateau.sessionsHistory.map((session) => {
    const previous = previousByVariation.get(session.exerciseTemplateId);
    const change = compareExerciseSession(session, previous, plateau.pauseThresholdDays);
    previousByVariation.set(session.exerciseTemplateId, session);
    return { session, previous, change };
  });
  const recent = history.filter((item) => item.session.date.getTime() >= cutoff);
  const latest = recent.at(-1);
  return { plateau, recent, latest };
}
