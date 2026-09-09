export type PlateauStatus = 'ok' | 'warning' | 'critical';

export interface ExerciseSession {
  date: Date;
  workoutTitle: string;
  weightKg: number;
  workoutId: string;
}

export interface ExercisePlateau {
  exerciseTemplateId: string;
  exerciseTitle: string;
  routineTitle: string;
  currentWeightKg: number;
  stuckSessions: number;
  stuckWeeks: number;
  stuckDays: number;
  plateauStartDate: Date;
  lastSessionDate: Date;
  status: PlateauStatus;
  sessionsHistory: ExerciseSession[];
}

export interface HevySet {
  index?: number;
  type?: string;
  set_type?: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
}

export interface HevyExercise {
  index?: number;
  title: string;
  exercise_template_id: string;
  notes?: string;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  exercises: HevyExercise[];
}

export interface WorkoutStagnationSummary {
  workoutId: string;
  workoutTitle: string;
  workoutDate: Date;
  avgStagnatedSessions: number;
  maxStagnatedSessions: number;
  totalExercisesAnalyzed: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  mostStagnatedExercise?: {
    templateId: string;
    title: string;
    stuckSessions: number;
    weightKg: number;
    status: PlateauStatus;
  };
}

export interface RoutineExercise {
  templateId: string;
  title: string;
  order: number;
  lastWeightKg: number;
  maxWeightKg: number;
  lastSetsCount: number;
  lastReps: number;
  lastPerformedDate: Date | null;
  stuckSessions: number;
  plateauWeeks?: number;
  status: PlateauStatus;
  suggestion?: string;
  frequency: number;
}

export interface RoutineSplit {
  id: string;
  title: string;
  tag: string; // "A", "B", "C", "D", etc.
  totalSessions: number;
  lastPerformedDate: Date | null;
  daysSinceLast: number;
  isActiveRoutine: boolean;
  isBeginnerOrLegacy: boolean;
  isHevyOfficialRoutine?: boolean;
  avgVolumeKg: number;
  avgDurationMin: number;
  exercises: RoutineExercise[];
  totalExercises: number;
  stagnatedCount: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  stagnationRate: number; // e.g. 66.7%
  avgStuckSessions: number;
  mostStagnatedExercise?: RoutineExercise;
}
