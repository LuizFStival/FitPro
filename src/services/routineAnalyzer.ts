import { ExercisePlateau, PlateauStatus, RoutineExercise, RoutineSplit } from '../types/plateau';
import { calculateExercisePlateaus } from './plateauCalculator';
import { getRoutineStorageId, normalizeRoutineTitle } from './routineIdentity';

/**
 * Extracts a clean tag from routine title, like "A", "B", "C", "D", "E", or "PPL"
 */
function extractRoutineTag(title: string): string {
  const normalized = title.trim();
  const matchTreino = normalized.match(/treino\s*([a-z0-9]+)/i);
  if (matchTreino) {
    return matchTreino[1].toUpperCase();
  }

  const matchInitial = normalized.match(/^([a-z0-9])\s*[-–:]/i);
  if (matchInitial) {
    return matchInitial[1].toUpperCase();
  }

  const matchLetter = normalized.match(/\b([a-e])\b/i);
  if (matchLetter) {
    return matchLetter[1].toUpperCase();
  }

  if (/push/i.test(normalized)) return 'PUSH';
  if (/pull/i.test(normalized)) return 'PULL';
  if (/legs|pernas/i.test(normalized)) return 'LEGS';
  if (/superior|upper/i.test(normalized)) return 'SUP';
  if (/inferior|lower/i.test(normalized)) return 'INF';

  return normalized.slice(0, 3).toUpperCase();
}

/**
 * Generates an actionable plateau-breaking suggestion tailored to the exercise
 */
function getPlateauSuggestion(title: string, stuckSessions: number, status: PlateauStatus): string {
  const lower = title.toLowerCase();

  if (status === 'critical') {
    if (lower.includes('supino') || lower.includes('bench press')) {
      return `Travado há ${stuckSessions} sessões. Experimente trocar a pegada (fechada/halteres), periodizar para 4-6 reps pesadas ou introduzir pausa no peito (spoto press) por 2 semanas.`;
    }
    if (lower.includes('agachamento') || lower.includes('squat')) {
      return `Travado há ${stuckSessions} sessões. Recomenda-se realizar 1 semana de deload com 70% da carga ou alternar para agachamento frontal/pausado para quebrar o platô neuromuscular.`;
    }
    if (lower.includes('terra') || lower.includes('deadlift')) {
      return `Travado há ${stuckSessions} sessões. Alto desgaste do SNC. Reduza o volume total de séries pesadas e foque em déficit deadlift ou hip thrust como auxiliar.`;
    }
    if (lower.includes('desenvolvimento') || lower.includes('overhead') || lower.includes('militar')) {
      return `Travado há ${stuckSessions} sessões. Utilize microcargas (+0.5kg a 1kg por lado) ou mude para desenvolvimento sentado com halteres para corrigir assimetrias.`;
    }
    if (lower.includes('bíceps') || lower.includes('tríceps') || lower.includes('rosca') || lower.includes('corda')) {
      return `Músculo menor em estagnação (${stuckSessions} sessões). Aumente o tempo sob tensão (cadência 3-1-1) ou adicione técnica de drop-set na última série para forçar hipertrofia.`;
    }
    return `Estagnação crítica (${stuckSessions} sessões). Alterne a faixa de repetições (ex: de 8-10 para 5-6), adicione pausa isométrica ou faça um mini-deload de 1 semana.`;
  }

  if (status === 'warning') {
    return `Início de platô (${stuckSessions} sessões). Tente progredir repetições antes da carga (se fez 8 reps, busque 9-10 antes de subir o peso) ou use micro-loading.`;
  }

  return 'Progressão saudável de carga. Mantenha a sobrecarga progressiva gradual a cada 1-2 semanas.';
}

/**
 * Checks if a workout title indicates a beginner, adaptation or legacy routine
 */
function checkIsBeginnerOrLegacy(title: string, daysSinceLast: number, hasMoreRecentWorkouts: boolean): boolean {
  const lower = title.toLowerCase().trim();
  const beginnerKeywords = [
    'iniciante', 'iniciantes', 'beginner', 'beginners', 
    'adaptação', 'adaptacao', 'início', 'inicio', 
    'primeiro', 'primeiros', 'introdução', 'introducao',
    'teste', 'teste de força', 'antigo', 'antiga'
  ];

  if (beginnerKeywords.some(keyword => lower.includes(keyword))) {
    return true;
  }

  if (/\(iniciante\)\s*$/.test(lower)) {
    return true;
  }

  // If this workout hasn't been performed in over 60 days and the user has actively been doing other workouts
  if (daysSinceLast > 60 && hasMoreRecentWorkouts) {
    return true;
  }

  return false;
}

/**
 * Analyzes all workouts and structures them into distinct Routines (Treino A, Treino B, Treino C, etc.),
 * compiling all exercises that belong to each routine and calculating exact stagnation metrics.
 */
export function analyzeRoutineSplits(
  workouts: any[],
  precalculatedPlateaus?: ExercisePlateau[],
  hevyRoutines?: any[]
): RoutineSplit[] {
  if ((!workouts || workouts.length === 0) && (!hevyRoutines || hevyRoutines.length === 0)) {
    return [];
  }

  const workoutList = Array.isArray(workouts) ? workouts : [];

  // 1. Get global plateau map
  const plateaus = precalculatedPlateaus && precalculatedPlateaus.length > 0
    ? precalculatedPlateaus
    : calculateExercisePlateaus(workoutList);

  const plateauByTemplateId = new Map<string, ExercisePlateau>();
  const plateauByTitle = new Map<string, ExercisePlateau>();

  for (const p of plateaus) {
    if (p.exerciseTemplateId) {
      plateauByTemplateId.set(p.exerciseTemplateId, p);
    }
    if (p.exerciseTitle) {
      plateauByTitle.set(p.exerciseTitle.toLowerCase().trim(), p);
    }
  }

  const getExercisePlateau = (templateId: string, title: string): ExercisePlateau | undefined => {
    const tid = String(templateId || '').trim();
    if (tid && plateauByTemplateId.has(tid)) {
      return plateauByTemplateId.get(tid);
    }
    const t = String(title || '').toLowerCase().trim();
    if (t && plateauByTitle.has(t)) {
      return plateauByTitle.get(t);
    }
    return undefined;
  };

  // 2. Parse and group workouts by routine title
  // Normalize titles: e.g. "Treino A - Peito", "Treino A", "Treino B"
  interface RoutineGroup {
    rawTitle: string;
    normalizedKey: string;
    tag: string;
    workouts: any[];
  }

  const groupMap = new Map<string, RoutineGroup>();

  for (const w of workoutList) {
    const rawTitle = (w.title || 'Treino Geral').trim();
    // Normalize to group variations if user names them slightly differently
    const normalizedKey = normalizeRoutineTitle(rawTitle);

    let group = groupMap.get(normalizedKey);
    if (!group) {
      group = {
        rawTitle,
        normalizedKey,
        tag: extractRoutineTag(rawTitle),
        workouts: []
      };
      groupMap.set(normalizedKey, group);
    }
    group.workouts.push(w);
  }

  const routineSplits: RoutineSplit[] = [];

  for (const group of groupMap.values()) {
    // Sort workouts in this routine chronologically (newest first)
    const sortedWorkouts = [...group.workouts].sort((a, b) => {
      const dateA = a.startTime?.toDate ? a.startTime.toDate() : new Date(a.startTime || a.start_time || 0);
      const dateB = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || b.start_time || 0);
      return dateB.getTime() - dateA.getTime();
    });

    const totalSessions = sortedWorkouts.length;
    const latestWorkout = sortedWorkouts[0];
    const rawLastDate = latestWorkout?.startTime || latestWorkout?.start_time;
    const lastPerformedDate = rawLastDate
      ? (rawLastDate.toDate ? rawLastDate.toDate() : new Date(rawLastDate))
      : null;

    // Calculate average volume and duration for this routine
    const totalVolume = sortedWorkouts.reduce((acc, w) => acc + (Number(w.totalVolume) || 0), 0);
    const avgVolumeKg = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0;

    const totalDurationSec = sortedWorkouts.reduce((acc, w) => acc + (Number(w.duration) || 0), 0);
    const avgDurationMin = totalSessions > 0 ? Math.round((totalDurationSec / totalSessions) / 60) : 0;

    // 3. Compile canonical exercises for this routine:
    // Take exercises from the most recent session, or aggregate across recent sessions
    // preserving typical workout order
    const exerciseOrderMap = new Map<string, {
      templateId: string;
      title: string;
      order: number;
      frequency: number;
      lastWeightKg: number;
      maxWeightKg: number;
      lastSetsCount: number;
      lastReps: number;
      lastDate: Date | null;
    }>();

    let runningOrder = 1;

    // Walk through sessions (newest to oldest) to gather exercises
    for (let sessionIdx = 0; sessionIdx < sortedWorkouts.length; sessionIdx++) {
      const sw = sortedWorkouts[sessionIdx];
      const sessionDate = sw.startTime?.toDate ? sw.startTime.toDate() : new Date(sw.startTime || sw.start_time || 0);
      const exercises = sw.exercises || [];

      exercises.forEach((ex: any, exIdx: number) => {
        const templateId = String(ex.exercise_template_id || ex.id || ex.title || '').trim();
        const title = String(ex.title || 'Exercício').trim();
        if (!title && !templateId) return;

        const key = templateId || title.toLowerCase();

        // Calculate load in this session
        const normalSets = (ex.sets || []).filter((s: any) => {
          const t = String(s.type || s.set_type || '').toLowerCase().trim();
          return t === 'normal' || !t;
        });
        const weights = (normalSets.length > 0 ? normalSets : (ex.sets || []))
          .map((s: any) => Number(s.weight_kg) || 0)
          .filter((w: number) => w > 0);
        const maxSessionWeight = weights.length > 0 ? Math.max(...weights) : 0;
        const totalReps = (ex.sets || []).reduce((acc: number, s: any) => acc + (Number(s.reps) || 0), 0);
        const avgReps = (ex.sets || []).length > 0 ? Math.round(totalReps / ex.sets.length) : 0;

        const existing = exerciseOrderMap.get(key);
        if (!existing) {
          exerciseOrderMap.set(key, {
            templateId,
            title,
            order: sessionIdx === 0 ? exIdx + 1 : runningOrder++,
            frequency: 1,
            lastWeightKg: maxSessionWeight,
            maxWeightKg: maxSessionWeight,
            lastSetsCount: ex.sets?.length || 0,
            lastReps: avgReps,
            lastDate: sessionDate
          });
        } else {
          existing.frequency += 1;
          if (maxSessionWeight > existing.maxWeightKg) {
            existing.maxWeightKg = maxSessionWeight;
          }
          // If this is a newer date than existing.lastDate, update latest stats
          if (sessionIdx === 0) {
            existing.lastWeightKg = maxSessionWeight || existing.lastWeightKg;
            existing.lastSetsCount = ex.sets?.length || existing.lastSetsCount;
            existing.lastReps = avgReps || existing.lastReps;
          }
        }
      });
    }

    // Convert map to RoutineExercise array
    const routineExercises: RoutineExercise[] = Array.from(exerciseOrderMap.values()).map((item) => {
      const plateau = getExercisePlateau(item.templateId, item.title);
      const stuckSessions = plateau ? plateau.stuckSessions : 0;
      const status: PlateauStatus = plateau ? plateau.status : 'ok';
      const plateauWeeks = plateau ? plateau.stuckWeeks : 0;
      const plateauMaxWeight = plateau?.sessionsHistory && plateau.sessionsHistory.length > 0
        ? Math.max(...plateau.sessionsHistory.map((s) => s.weightKg), 0)
        : 0;
      const effectiveWeight = item.lastWeightKg > 0
        ? item.lastWeightKg
        : (plateau ? plateau.currentWeightKg : item.maxWeightKg);

      return {
        templateId: item.templateId,
        title: item.title,
        order: item.order,
        lastWeightKg: effectiveWeight,
        maxWeightKg: Math.max(item.maxWeightKg, plateauMaxWeight, effectiveWeight),
        lastSetsCount: item.lastSetsCount || 3,
        lastReps: item.lastReps || 10,
        lastPerformedDate: item.lastDate,
        stuckSessions,
        plateauWeeks,
        status,
        suggestion: getPlateauSuggestion(item.title, stuckSessions, status),
        frequency: item.frequency
      };
    });

    // Sort exercises by original order
    routineExercises.sort((a, b) => a.order - b.order);

    // Stagnation metrics for this routine
    const totalExercises = routineExercises.length;
    const criticalCount = routineExercises.filter((e) => e.status === 'critical').length;
    const warningCount = routineExercises.filter((e) => e.status === 'warning').length;
    const okCount = routineExercises.filter((e) => e.status === 'ok').length;
    const stagnatedCount = criticalCount + warningCount;

    const stagnationRate = totalExercises > 0
      ? Math.round((stagnatedCount / totalExercises) * 1000) / 10
      : 0;

    const avgStuck = totalExercises > 0
      ? Math.round((routineExercises.reduce((acc, e) => acc + e.stuckSessions, 0) / totalExercises) * 10) / 10
      : 0;

    // Find most stagnated exercise in this routine
    const sortedByStuck = [...routineExercises].sort((a, b) => b.stuckSessions - a.stuckSessions);
    const mostStagnated = sortedByStuck[0]?.stuckSessions > 0 ? sortedByStuck[0] : undefined;

    // Calculate freshness and routine activity
    const now = Date.now();
    const daysSinceLast = lastPerformedDate
      ? Math.max(0, Math.floor((now - lastPerformedDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 999;

    // Check if matches an official Hevy routine
    const isHevyOfficial = Array.isArray(hevyRoutines) && hevyRoutines.some((hr: any) => {
      const hTitle = String(hr.title || '').toLowerCase().trim();
      const gTitle = group.rawTitle.toLowerCase().trim();
      return hTitle === gTitle || hTitle.includes(gTitle) || gTitle.includes(hTitle);
    });

    const isBeginnerOrLegacy = checkIsBeginnerOrLegacy(
      group.rawTitle,
      daysSinceLast,
      workoutList.length > 5
    );

    const isActiveRoutine = !isBeginnerOrLegacy && (isHevyOfficial || daysSinceLast <= 60);

    routineSplits.push({
      id: getRoutineStorageId(group.rawTitle),
      title: group.rawTitle,
      tag: group.tag,
      totalSessions,
      lastPerformedDate,
      daysSinceLast,
      isActiveRoutine,
      isBeginnerOrLegacy,
      isHevyOfficialRoutine: isHevyOfficial,
      avgVolumeKg,
      avgDurationMin,
      exercises: routineExercises,
      totalExercises,
      stagnatedCount,
      criticalCount,
      warningCount,
      okCount,
      stagnationRate,
      avgStuckSessions: avgStuck,
      mostStagnatedExercise: mostStagnated
    });
  }

  const existingRoutineTitles = new Set(routineSplits.map((routine) => normalizeRoutineTitle(routine.title)));
  if (Array.isArray(hevyRoutines)) {
    for (const hevyRoutine of hevyRoutines) {
      const title = String(hevyRoutine?.title || hevyRoutine?.name || '').trim();
      if (!title) continue;

      const normalizedTitle = normalizeRoutineTitle(title);
      const alreadyRepresented = Array.from(existingRoutineTitles).some((existing) => {
        return existing === normalizedTitle || existing.includes(normalizedTitle) || normalizedTitle.includes(existing);
      });
      if (alreadyRepresented) continue;

      const routineExercises: RoutineExercise[] = (hevyRoutine.exercises || []).map((ex: any, index: number) => {
        const templateId = String(ex.exercise_template_id || ex.template_id || ex.id || ex.title || '').trim();
        const title = String(ex.title || ex.name || 'Exercício').trim();
        const plateau = getExercisePlateau(templateId, title);
        const routineSets = Array.isArray(ex.sets) && ex.sets.length > 0 ? ex.sets : [];
        const normalSets = routineSets.filter((s: any) => {
          const type = String(s.type || s.set_type || '').toLowerCase().trim();
          return type === 'normal' || !type;
        });
        const setSource = normalSets.length > 0 ? normalSets : routineSets;
        const weights = setSource.map((s: any) => Number(s.weight_kg) || 0).filter((weight: number) => weight > 0);
        const reps = setSource.map((s: any) => Number(s.reps) || 0).filter((rep: number) => rep > 0);
        const lastWeightKg = plateau?.currentWeightKg || (weights.length > 0 ? weights[0] : 0);
        const maxWeightKg = Math.max(lastWeightKg, ...weights, 0);
        const lastReps = reps.length > 0 ? Math.round(reps.reduce((acc: number, rep: number) => acc + rep, 0) / reps.length) : 10;
        const stuckSessions = plateau?.stuckSessions || 0;
        const status: PlateauStatus = plateau?.status || (stuckSessions >= 6 ? 'critical' : stuckSessions >= 3 ? 'warning' : 'ok');

        return {
          templateId,
          title,
          order: index + 1,
          lastWeightKg,
          maxWeightKg,
          lastSetsCount: routineSets.length || 3,
          lastReps,
          lastPerformedDate: plateau?.lastSessionDate || null,
          stuckSessions,
          plateauWeeks: plateau?.stuckWeeks || 0,
          status,
          suggestion: getPlateauSuggestion(title, stuckSessions, status),
          frequency: 0,
        };
      });

      const totalExercises = routineExercises.length;
      const criticalCount = routineExercises.filter((exercise) => exercise.status === 'critical').length;
      const warningCount = routineExercises.filter((exercise) => exercise.status === 'warning').length;
      const okCount = routineExercises.filter((exercise) => exercise.status === 'ok').length;
      const stagnatedCount = criticalCount + warningCount;
      const mostStagnatedExercise = [...routineExercises].sort((a, b) => b.stuckSessions - a.stuckSessions)[0];
      const isBeginnerOrLegacy = checkIsBeginnerOrLegacy(title, 0, false);

      routineSplits.push({
        id: getRoutineStorageId(title),
        title,
        tag: extractRoutineTag(title),
        totalSessions: 0,
        lastPerformedDate: null,
        daysSinceLast: 999,
        isActiveRoutine: !isBeginnerOrLegacy,
        isBeginnerOrLegacy,
        isHevyOfficialRoutine: true,
        avgVolumeKg: 0,
        avgDurationMin: 0,
        exercises: routineExercises,
        totalExercises,
        stagnatedCount,
        criticalCount,
        warningCount,
        okCount,
        stagnationRate: totalExercises > 0 ? Math.round((stagnatedCount / totalExercises) * 1000) / 10 : 0,
        avgStuckSessions: totalExercises > 0
          ? Math.round((routineExercises.reduce((acc, exercise) => acc + exercise.stuckSessions, 0) / totalExercises) * 10) / 10
          : 0,
        mostStagnatedExercise: mostStagnatedExercise?.stuckSessions > 0 ? mostStagnatedExercise : undefined,
      });
      existingRoutineTitles.add(normalizedTitle);
    }
  }

  // Sort routines intuitively:
  // 1. Active routines first, legacy/beginner routines last
  // 2. Then Treino A, Treino B, Treino C, etc., or by highest frequency
  routineSplits.sort((a, b) => {
    // Put active routines first
    if (a.isActiveRoutine && !b.isActiveRoutine) return -1;
    if (!a.isActiveRoutine && b.isActiveRoutine) return 1;

    // Check if both have clean single letter tags like A, B, C
    const tagOrder: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, PUSH: 10, PULL: 11, LEGS: 12 };
    const orderA = tagOrder[a.tag] || 99;
    const orderB = tagOrder[b.tag] || 99;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Otherwise by total sessions descending
    return b.totalSessions - a.totalSessions;
  });

  return routineSplits;
}
