export type SetType = 'normal' | 'warmup' | 'failure' | 'drop_set';

export interface TrackerSet {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number | '';
  reps: number | '';
  rpe?: number | '';
  completed: boolean;
  previousWeightKg?: number | null;
  previousReps?: number | null;
}

export interface TrackerExercise {
  id: string;
  templateId: string;
  title: string;
  notes?: string;
  sets: TrackerSet[];
  stuckSessions?: number;
  stuckWeeks?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  plateauStrategy?: string;
  plateauStatus?: 'ok' | 'warning' | 'critical';
  lastSessionDate?: Date | null;
}

export interface ActiveWorkoutSession {
  id: string;
  routineId?: string;
  routineTitle: string;
  title: string;
  notes: string;
  startTime: string; // ISO string
  endTime?: string;
  exercises: TrackerExercise[];
  isMinimized?: boolean;
}

export interface ExerciseTemplateOption {
  templateId: string;
  title: string;
  muscleGroup?: string;
  lastWeightKg?: number;
  lastReps?: number;
}
