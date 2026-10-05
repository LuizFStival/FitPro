import { ExerciseEquivalenceGroup, ExercisePlateau, ExerciseSession, PlateauStatus } from '../types/plateau';

export interface WorkoutInput {
  id?: string;
  title?: string;
  startTime?: any;
  start_time?: any;
  exercises?: any[];
}

export interface PlateauCalculationOptions {
  equivalenceGroups?: ExerciseEquivalenceGroup[];
  pauseThresholdDays?: number;
  activeTemplateIds?: string[];
}

const VARIATION_COLORS = ['#4FACFE', '#F59E0B', '#A78BFA', '#34D399', '#FB7185', '#F472B6'];

function getDaysBetween(previous: Date, current: Date) {
  return Math.max(0, Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Calculates exercise load stagnation (plateau) according to exact specifications:
 * 1. Considers only sets with type == "normal" (ignores warmup, dropset, failure).
 * 2. Takes the highest weight_kg used in that session for that exercise = "carga do dia".
 * 3. Sorts sessions chronologically, oldest to most recent.
 * 4. From the most recent session, walks backwards: while session load equals last session load,
 *    counts as "sessão parada". Stops at the first session with a different load.
 * 5. Calculates time: most recent session date minus plateau start date = days/weeks stuck.
 * 6. Classification:
 *    - 0-2 sessions without increasing = OK (green)
 *    - 3-5 sessions without increasing = ATENÇÃO (yellow)
 *    - 6+ sessions without increasing = CRÍTICO (red)
 * 7. Grouped by exercise_template_id, or by a user-defined equivalence group when configured.
 */
export function calculateExercisePlateaus(
  workouts: WorkoutInput[],
  options: PlateauCalculationOptions = {}
): ExercisePlateau[] {
  const pauseThresholdDays = Math.max(1, Number(options.pauseThresholdDays) || 14);
  const activeTemplateSet = new Set((options.activeTemplateIds || []).map((id) => String(id).trim()).filter(Boolean));
  const equivalentByTemplateId = new Map<string, ExerciseEquivalenceGroup>();

  for (const group of options.equivalenceGroups || []) {
    for (const templateId of group.exerciseTemplateIds || []) {
      const cleanId = String(templateId || '').trim();
      if (cleanId) {
        equivalentByTemplateId.set(cleanId, group);
      }
    }
  }

  // Map by exercise_template_id or equivalence group -> { templateId, title, sessions: ExerciseSession[] }
  const exerciseMap = new Map<string, {
    templateId: string;
    title: string;
    equivalentTemplateIds: string[];
    variationTitles: string[];
    isEquivalentGroup: boolean;
    sessions: ExerciseSession[];
  }>();

  for (const workout of workouts) {
    const rawDate = workout.startTime || workout.start_time;
    if (!rawDate) continue;
    const sessionDate = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
    if (isNaN(sessionDate.getTime())) continue;

    const workoutId = workout.id || `${sessionDate.getTime()}`;
    const workoutTitle = (workout.title || '').trim() || 'Treino Geral';

    const exercises = workout.exercises || [];
    for (const ex of exercises) {
      const templateId = String(ex.exercise_template_id || ex.id || '').trim();
      if (!templateId) continue; // Must have exercise_template_id

      const exTitle = String(ex.title || '').trim() || 'Exercício';
      const equivalenceGroup = equivalentByTemplateId.get(templateId);
      const groupKey = equivalenceGroup?.id || templateId;
      const groupTitle = equivalenceGroup?.title || exTitle;
      const equivalentTemplateIds = equivalenceGroup?.exerciseTemplateIds || [templateId];
      const variationTitles = equivalenceGroup?.exerciseTitles || [exTitle];

      // 1. Em cada sessão, considerar apenas sets com type == "normal" (ignorar warmup, dropset, failure).
      const normalSets = (ex.sets || []).filter((s: any) => {
        const type = String(s.type || s.set_type || '').trim().toLowerCase();
        return type === 'normal';
      });

      // Filter sets with valid numerical weight
      const validWeights = normalSets
        .map((s: any) => {
          const w = s.weight_kg !== undefined && s.weight_kg !== null ? Number(s.weight_kg) : NaN;
          return w;
        })
        .filter((w: number) => !isNaN(w) && w >= 0);

      if (validWeights.length === 0) {
        // No normal sets with weight in this session, skip
        continue;
      }

      // 2. Pegar o maior weight_kg usado naquela sessão para aquele exercício = "carga do dia".
      const sessionMaxWeight = Math.max(...validWeights);

      let group = exerciseMap.get(groupKey);
      if (!group) {
        group = {
          templateId: groupKey,
          title: groupTitle,
          equivalentTemplateIds,
          variationTitles,
          isEquivalentGroup: Boolean(equivalenceGroup),
          sessions: [],
        };
        exerciseMap.set(groupKey, group);
      } else {
        if (equivalenceGroup) {
          group.title = equivalenceGroup.title;
          group.equivalentTemplateIds = equivalenceGroup.exerciseTemplateIds;
          group.variationTitles = equivalenceGroup.exerciseTitles;
        } else if (exTitle && exTitle !== 'Exercício') {
          // Update display title if current one has better name
          group.title = exTitle;
        }
      }

      // Check if this workout already recorded a session for this exercise (avoid double counting if exercise appears twice)
      const existingSessionIndex = group.sessions.findIndex(s => s.workoutId === workoutId);
      if (existingSessionIndex >= 0) {
        group.sessions[existingSessionIndex].weightKg = Math.max(
          group.sessions[existingSessionIndex].weightKg,
          sessionMaxWeight
        );
      } else {
        const variationIndex = Math.max(0, group.equivalentTemplateIds.indexOf(templateId));
        group.sessions.push({
          date: sessionDate,
          workoutTitle,
          weightKg: sessionMaxWeight,
          workoutId,
          exerciseTemplateId: templateId,
          exerciseTitle: exTitle,
          daysSincePrevious: null,
          variationColor: VARIATION_COLORS[variationIndex % VARIATION_COLORS.length],
        });
      }
    }
  }

  const plateaus: ExercisePlateau[] = [];

  for (const group of exerciseMap.values()) {
    if (group.sessions.length === 0) continue;

    // 3. Ordenar as sessões daquele exercício por data, mais recente por último.
    group.sessions.sort((a, b) => a.date.getTime() - b.date.getTime());

    const sessions = group.sessions;
    for (let i = 0; i < sessions.length; i++) {
      sessions[i].daysSincePrevious = i > 0 ? getDaysBetween(sessions[i - 1].date, sessions[i].date) : null;
    }

    const lastSession = sessions[sessions.length - 1];
    const currentWeight = lastSession.weightKg;
    const lastGapDays = lastSession.daysSincePrevious || 0;
    const isPauseReturn = sessions.length > 1 && lastGapDays >= pauseThresholdDays;

    // 4. A partir da sessão mais recente, andar pra trás: enquanto a carga do dia for igual à carga da última sessão,
    // conta como "sessão parada". Parar de contar na primeira sessão com carga diferente.
    let stuckSessions = 0;
    let plateauStartIndex = sessions.length - 1;

    if (isPauseReturn) {
      stuckSessions = 0;
      plateauStartIndex = sessions.length - 1;
    } else {
      for (let i = sessions.length - 1; i >= 0; i--) {
        if (sessions[i].weightKg === currentWeight) {
          stuckSessions++;
          plateauStartIndex = i;
        } else {
          break;
        }
      }
    }

    // 5. Calcular também: data da sessão mais recente menos data de início do platô = "dias/semanas parado".
    const plateauStartDate = sessions[plateauStartIndex].date;
    const lastSessionDate = lastSession.date;
    const diffMs = Math.max(0, lastSessionDate.getTime() - plateauStartDate.getTime());
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);

    // CLASSIFICAÇÃO (cor do alerta):
    // - 0-2 sessões sem subir peso = OK (verde)
    // - 3-5 sessões sem subir peso = ATENÇÃO (amarelo)
    // - 6+ sessões sem subir peso = CRÍTICO (vermelho)
    let status: PlateauStatus = 'ok';
    if (isPauseReturn) {
      status = 'pause_return';
    } else if (stuckSessions >= 6) {
      status = 'critical';
    } else if (stuckSessions >= 3) {
      status = 'warning';
    } else {
      status = 'ok';
    }

    const isActiveInCurrentRoutine = activeTemplateSet.size === 0
      ? true
      : group.equivalentTemplateIds.some((templateId) => activeTemplateSet.has(templateId));

    plateaus.push({
      exerciseTemplateId: group.templateId,
      exerciseTitle: group.title,
      routineTitle: lastSession.workoutTitle || 'Geral',
      equivalentTemplateIds: group.equivalentTemplateIds,
      variationTitles: group.variationTitles,
      isEquivalentGroup: group.isEquivalentGroup,
      isActiveInCurrentRoutine,
      currentWeightKg: currentWeight,
      stuckSessions,
      stuckWeeks: diffWeeks,
      stuckDays: diffDays,
      plateauStartDate,
      lastSessionDate,
      status,
      pauseReturnDays: isPauseReturn ? lastGapDays : undefined,
      pauseThresholdDays,
      sessionsHistory: sessions,
    });
  }

  // VIEW A EXIBIR: Tabela ordenada do mais travado para o mais recente
  plateaus.sort((a, b) => {
    // Primary: descending stuckSessions (most stuck first)
    if (b.stuckSessions !== a.stuckSessions) {
      return b.stuckSessions - a.stuckSessions;
    }
    // Secondary: descending stuckWeeks
    if (b.stuckWeeks !== a.stuckWeeks) {
      return b.stuckWeeks - a.stuckWeeks;
    }
    // Tertiary: most recent session date
    return b.lastSessionDate.getTime() - a.lastSessionDate.getTime();
  });

  return plateaus;
}
