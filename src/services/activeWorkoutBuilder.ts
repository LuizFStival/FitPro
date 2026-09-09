import { RoutineSplit, ExercisePlateau } from '../types/plateau';
import { ActiveWorkoutSession, TrackerExercise, TrackerSet, ExerciseTemplateOption } from '../types/workoutTracker';

/**
 * Generates a unique ID
 */
export const generateId = (): string => {
  return 'act_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
};

/**
 * Builds an Active Workout Session from a analyzed RoutineSplit
 */
export const buildSessionFromRoutineSplit = (
  routine: RoutineSplit,
  plateaus: ExercisePlateau[] = []
): ActiveWorkoutSession => {
  const plateauMap = new Map(plateaus.map(p => [p.exerciseTemplateId, p]));
  const plateauTitleMap = new Map(plateaus.map(p => [(p.exerciseTitle || '').toLowerCase().trim(), p]));

  const exercises: TrackerExercise[] = (routine.exercises || []).map((ex, exIdx) => {
    const plateau = plateauMap.get(ex.templateId) || plateauTitleMap.get((ex.title || '').toLowerCase().trim());
    const setsCount = Math.max(ex.lastSetsCount || 3, 1);
    const initialWeight = ex.lastWeightKg > 0 ? ex.lastWeightKg : '';
    const initialReps = ex.lastReps > 0 ? ex.lastReps : 10;
    const currentWeight = plateau?.currentWeightKg || (ex.lastWeightKg > 0 ? ex.lastWeightKg : 0);
    const targetWeight = currentWeight > 0 ? currentWeight + (currentWeight >= 40 ? 2 : 1) : undefined;
    const stuckSessions = plateau?.stuckSessions ?? ex.stuckSessions ?? 0;
    
    // Exact official classification: 0-2 = ok, 3-5 = warning, 6+ = critical
    const status: PlateauStatus = plateau?.status || ex.status || (stuckSessions >= 6 ? 'critical' : stuckSessions >= 3 ? 'warning' : 'ok');

    const sets: TrackerSet[] = Array.from({ length: setsCount }, (_, sIdx) => ({
      id: generateId(),
      setNumber: sIdx + 1,
      type: 'normal',
      weightKg: initialWeight,
      reps: initialReps,
      completed: false,
      previousWeightKg: ex.lastWeightKg > 0 ? ex.lastWeightKg : null,
      previousReps: ex.lastReps > 0 ? ex.lastReps : null,
    }));

    return {
      id: generateId(),
      templateId: ex.templateId,
      title: ex.title,
      notes: '',
      sets,
      stuckSessions,
      stuckWeeks: plateau?.stuckWeeks || 0,
      currentWeightKg: currentWeight,
      targetWeightKg: targetWeight,
      plateauStrategy: stuckSessions >= 6
        ? 'Estagnação severa (6+ sessões): considere deload de 10%, variar pegada ou mudar a faixa de repetições.'
        : stuckSessions >= 3
        ? 'Atenção na progressão (3-5 sessões): tente +1 repetição na 1ª série ou adicione microcarga (+1 kg).'
        : 'Progressão normal: mantenha boa cadência e amplitude completa.',
      plateauStatus: status,
      lastSessionDate: ex.lastPerformedDate || null,
    };
  });

  return {
    id: generateId(),
    routineId: routine.id,
    routineTitle: routine.title,
    title: routine.title,
    notes: '',
    startTime: new Date().toISOString(),
    exercises,
    isMinimized: false,
  };
};

/**
 * Builds an Active Workout Session from an official Hevy routine object
 */
export const buildSessionFromHevyRoutine = (
  hevyRoutine: any,
  plateaus: ExercisePlateau[] = []
): ActiveWorkoutSession => {
  const plateauMap = new Map(plateaus.map(p => [p.exerciseTemplateId, p]));
  const plateauTitleMap = new Map(plateaus.map(p => [(p.exerciseTitle || '').toLowerCase().trim(), p]));

  const exercises: TrackerExercise[] = (hevyRoutine.exercises || []).map((ex: any) => {
    const templateId = ex.exercise_template_id || ex.template_id || ex.id || generateId();
    const plateau = plateauMap.get(templateId) || plateauTitleMap.get((ex.title || '').toLowerCase().trim());
    const routineSets = Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets : [{ weight_kg: 0, reps: 10 }];
    const firstSetWeight = typeof routineSets[0]?.weight_kg === 'number' ? routineSets[0].weight_kg : 0;
    const currentWeight = plateau?.currentWeightKg || firstSetWeight;
    const targetWeight = currentWeight > 0 ? currentWeight + (currentWeight >= 40 ? 2 : 1) : undefined;
    const stuckSessions = plateau?.stuckSessions || 0;
    const status: PlateauStatus = plateau?.status || (stuckSessions >= 6 ? 'critical' : stuckSessions >= 3 ? 'warning' : 'ok');

    const sets: TrackerSet[] = routineSets.map((s: any, sIdx: number) => ({
      id: generateId(),
      setNumber: sIdx + 1,
      type: (s.type || s.set_type || 'normal') as any,
      weightKg: typeof s.weight_kg === 'number' && s.weight_kg > 0 ? s.weight_kg : '',
      reps: typeof s.reps === 'number' && s.reps > 0 ? s.reps : 10,
      rpe: typeof s.rpe === 'number' ? s.rpe : '',
      completed: false,
      previousWeightKg: typeof s.weight_kg === 'number' ? s.weight_kg : null,
      previousReps: typeof s.reps === 'number' ? s.reps : null,
    }));

    return {
      id: generateId(),
      templateId,
      title: ex.title || 'Exercício',
      notes: ex.notes || '',
      sets,
      stuckSessions,
      stuckWeeks: plateau?.stuckWeeks || 0,
      currentWeightKg: currentWeight,
      targetWeightKg: targetWeight,
      plateauStrategy: stuckSessions >= 6
        ? 'Estagnação severa (6+ sessões): considere deload de 10%, variar pegada ou mudar a faixa de repetições.'
        : stuckSessions >= 3
        ? 'Atenção na progressão (3-5 sessões): tente +1 repetição na 1ª série ou adicionar microcarga (+1 kg).'
        : 'Progressão normal: busque manter a boa forma e executar repetições completas.',
      plateauStatus: status,
      lastSessionDate: null,
    };
  });

  return {
    id: generateId(),
    routineId: String(hevyRoutine.id || ''),
    routineTitle: hevyRoutine.title || 'Rotina Hevy',
    title: hevyRoutine.title || 'Treino Hevy',
    notes: '',
    startTime: new Date().toISOString(),
    exercises,
    isMinimized: false,
  };
};

/**
 * Builds an empty active workout session for custom workouts
 */
export const buildEmptySession = (title: string = 'Treino Livre'): ActiveWorkoutSession => {
  return {
    id: generateId(),
    routineTitle: title,
    title,
    notes: '',
    startTime: new Date().toISOString(),
    exercises: [],
    isMinimized: false,
  };
};

/**
 * Extracts all unique exercise templates from workouts history
 */
export const extractExerciseTemplatesFromWorkouts = (workouts: any[]): ExerciseTemplateOption[] => {
  const map = new Map<string, ExerciseTemplateOption>();

  // Iterate chronologically backwards so newest weights are captured
  for (const w of workouts) {
    if (!Array.isArray(w.exercises)) continue;
    for (const ex of w.exercises) {
      const templateId = ex.exercise_template_id || ex.template_id;
      const title = (ex.title || '').trim();
      if (!title) continue;

      const key = templateId || title.toLowerCase();
      if (!map.has(key)) {
        let lastWeightKg: number | undefined = undefined;
        let lastReps: number | undefined = undefined;

        if (Array.isArray(ex.sets) && ex.sets.length > 0) {
          const validSet = ex.sets.find((s: any) => typeof s.weight_kg === 'number' && s.weight_kg > 0);
          if (validSet) {
            lastWeightKg = validSet.weight_kg;
            lastReps = validSet.reps;
          }
        }

        map.set(key, {
          templateId: templateId || key,
          title,
          lastWeightKg,
          lastReps,
        });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
};

/**
 * Synthesizes a gym rest timer chime using native Web Audio API
 */
export const playRestChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;

    // First tone (pleasant high frequency)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second tone (higher chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.15); // A5
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.warn('Could not play audio chime:', e);
  }
};
