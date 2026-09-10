import { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Check,
  Plus,
  Trash2,
  Minimize2,
  Clock,
  Dumbbell,
  Flame,
  AlertTriangle,
  Volume2,
  VolumeX,
  XCircle,
  Smartphone,
  Monitor,
  Target,
  Zap,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronsUpDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { ActiveWorkoutSession, TrackerExercise, TrackerSet, SetType, ExerciseTemplateOption } from '../types/workoutTracker';
import { ExercisePlateau } from '../types/plateau';
import { generateId, playRestChime } from '../services/activeWorkoutBuilder';
import AddExerciseModal from './AddExerciseModal';
import WorkoutSummaryModal from './WorkoutSummaryModal';

interface ActiveWorkoutTrackerProps {
  session: ActiveWorkoutSession;
  onUpdateSession: (updatedSession: ActiveWorkoutSession) => void;
  onMinimize: () => void;
  onDiscard: () => void;
  onFinishAndSend: (session: ActiveWorkoutSession, customNotes?: string, isPrivate?: boolean) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
  availableTemplates: ExerciseTemplateOption[];
  plateaus?: ExercisePlateau[];
}

export default function ActiveWorkoutTracker({
  session,
  onUpdateSession,
  onMinimize,
  onDiscard,
  onFinishAndSend,
  isSending,
  sendError,
  availableTemplates,
  plateaus = [],
}: ActiveWorkoutTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  // Exercise card collapse state: exerciseId -> boolean (true = collapsed)
  const [collapsedExercises, setCollapsedExercises] = useState<Record<string, boolean>>({});

  // Mobile Focus HUD toggle (defaults to true for maximum gym ease)
  const [isMobileHUDMode, setIsMobileHUDMode] = useState(true);

  // Rest Timer State
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const [restInitialSeconds, setRestInitialSeconds] = useState<number>(90);
  const [autoStartRest, setAutoStartRest] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Mobile Haptic Feedback Helper
  const triggerHaptic = (duration: number | number[] = 45) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(duration);
      } catch {
        // Safe ignore if unsupported by browser
      }
    }
  };

  // Toggle single exercise collapse
  const toggleExerciseCollapse = (exerciseId: string) => {
    setCollapsedExercises((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
    triggerHaptic(15);
  };

  // Check if all exercises are currently collapsed
  const areAllCollapsed = useMemo(() => {
    if (session.exercises.length === 0) return false;
    return session.exercises.every((ex) => Boolean(collapsedExercises[ex.id]));
  }, [session.exercises, collapsedExercises]);

  // Toggle collapse all / expand all
  const toggleCollapseAll = () => {
    if (areAllCollapsed) {
      setCollapsedExercises({});
    } else {
      const next: Record<string, boolean> = {};
      session.exercises.forEach((ex) => {
        next[ex.id] = true;
      });
      setCollapsedExercises(next);
    }
    triggerHaptic(20);
  };

  // Collapse completed exercises
  const collapseCompletedExercises = () => {
    const next = { ...collapsedExercises };
    session.exercises.forEach((ex) => {
      const allDone = ex.sets.length > 0 && ex.sets.every((s) => s.completed);
      if (allDone) {
        next[ex.id] = true;
      }
    });
    setCollapsedExercises(next);
    triggerHaptic(20);
  };

  // Calculate elapsed time from session.startTime
  useEffect(() => {
    const startMs = new Date(session.startTime).getTime();

    const updateTimer = () => {
      if (!isPaused) {
        const nowMs = Date.now();
        const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
        setElapsedSeconds(diffSecs);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.startTime, isPaused]);

  // Rest timer countdown
  useEffect(() => {
    if (restSecondsLeft === null) return;
    if (restSecondsLeft <= 0) {
      if (soundEnabled) {
        playRestChime();
      }
      triggerHaptic([60, 40, 80]);
      setRestSecondsLeft(null);
      return;
    }

    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (soundEnabled) {
            playRestChime();
          }
          triggerHaptic([60, 40, 80]);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [restSecondsLeft, soundEnabled]);

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Live Workout Stats
  const { totalVolume, completedSets, totalSets } = useMemo(() => {
    let volume = 0;
    let completed = 0;
    let total = 0;

    for (const ex of session.exercises) {
      for (const s of ex.sets) {
        total++;
        if (s.completed) {
          completed++;
          volume += (Number(s.weightKg) || 0) * (Number(s.reps) || 0);
        }
      }
    }
    return { totalVolume: volume, completedSets: completed, totalSets: total };
  }, [session.exercises]);

  // Completed exercises count (where all sets are completed)
  const completedExercisesCount = useMemo(() => {
    return session.exercises.filter(
      (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed)
    ).length;
  }, [session.exercises]);

  // Real-time lookup map for plateau metrics
  const plateauMap = useMemo(() => {
    const byId = new Map<string, ExercisePlateau>();
    const byTitle = new Map<string, ExercisePlateau>();
    if (plateaus && Array.isArray(plateaus)) {
      for (const p of plateaus) {
        if (p.exerciseTemplateId) byId.set(p.exerciseTemplateId, p);
        if (p.exerciseTitle) byTitle.set((p.exerciseTitle || '').toLowerCase().trim(), p);
      }
    }
    return { byId, byTitle };
  }, [plateaus]);

  // Helper to determine exact plateau status adhering strictly to official rules:
  // 0-2 sessões sem subir carga = OK (progredindo normalmente)
  // 3-5 sessões sem subir carga = ATENÇÃO (alerta de início de platô)
  // 6+ sessões sem subir carga = CRÍTICO (estagnação severa)
  const getExercisePlateauInfo = (exercise: TrackerExercise) => {
    const p = plateauMap.byId.get(exercise.templateId) || plateauMap.byTitle.get((exercise.title || '').toLowerCase().trim());
    const stuck = p ? p.stuckSessions : (typeof exercise.stuckSessions === 'number' ? exercise.stuckSessions : 0);
    const rawStatus = p ? p.status : (exercise.plateauStatus || 'ok');

    let finalStatus: 'critical' | 'warning' | 'ok' = 'ok';
    if (rawStatus === 'critical' || stuck >= 6) {
      finalStatus = 'critical';
    } else if (rawStatus === 'warning' || (stuck >= 3 && stuck < 6)) {
      finalStatus = 'warning';
    } else {
      finalStatus = 'ok';
    }

    const currentLoad = p?.currentWeightKg || exercise.currentWeightKg || Number(exercise.sets[0]?.previousWeightKg) || 0;
    const targetLoad = exercise.targetWeightKg || (currentLoad > 0 ? currentLoad + (currentLoad >= 40 ? 2 : 1) : 0);

    return {
      stuckSessions: stuck,
      status: finalStatus,
      isCritical: finalStatus === 'critical',
      isWarning: finalStatus === 'warning',
      isOk: finalStatus === 'ok',
      currentLoad,
      targetLoad,
      strategy: exercise.plateauStrategy || (
        finalStatus === 'critical'
          ? 'Estagnação severa (6+ sessões): considere deload de 10%, variar pegada ou alterar faixa de repetições.'
          : finalStatus === 'warning'
          ? 'Em Atenção (3-5 sessões): busque +1 repetição na 1ª série ou adicione microcarga (+0.5kg a 1kg).'
          : 'Progressão normal: mantenha boa cadência e amplitude completa.'
      ),
    };
  };

  // Plateau and Stagnation Diagnosis for this Active Session
  const plateauSummary = useMemo(() => {
    let criticalCount = 0;
    let warningCount = 0;
    let okCount = 0;
    const criticalList: { exercise: TrackerExercise; stuck: number }[] = [];
    const warningList: { exercise: TrackerExercise; stuck: number }[] = [];

    for (const ex of session.exercises) {
      const diag = getExercisePlateauInfo(ex);
      if (diag.isCritical) {
        criticalCount++;
        criticalList.push({ exercise: ex, stuck: diag.stuckSessions });
      } else if (diag.isWarning) {
        warningCount++;
        warningList.push({ exercise: ex, stuck: diag.stuckSessions });
      } else {
        okCount++;
      }
    }

    return {
      criticalCount,
      warningCount,
      okCount,
      totalStagnated: criticalCount + warningCount,
      criticalList,
      warningList,
    };
  }, [session.exercises, plateauMap]);

  // Set updates
  const handleUpdateSet = (exerciseId: string, setId: string, updates: Partial<TrackerSet>) => {
    const updatedExercises = session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const updatedSets = ex.sets.map((s) => {
        if (s.id !== setId) return s;
        return { ...s, ...updates };
      });
      return { ...ex, sets: updatedSets };
    });

    onUpdateSession({ ...session, exercises: updatedExercises });
  };

  // Toggle set completion, trigger haptic and rest timer
  const handleToggleSetCompletion = (exerciseId: string, setId: string) => {
    let newlyCompleted = false;

    const updatedExercises = session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const updatedSets = ex.sets.map((s) => {
        if (s.id !== setId) return s;
        newlyCompleted = !s.completed;
        return { ...s, completed: newlyCompleted };
      });
      return { ...ex, sets: updatedSets };
    });

    onUpdateSession({ ...session, exercises: updatedExercises });

    if (newlyCompleted) {
      triggerHaptic(50);
      if (autoStartRest) {
        setRestSecondsLeft(restInitialSeconds);
      }
    }
  };

  // Add set to exercise
  const handleAddSet = (exerciseId: string) => {
    const updatedExercises = session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: TrackerSet = {
        id: generateId(),
        setNumber: ex.sets.length + 1,
        type: lastSet ? lastSet.type : 'normal',
        weightKg: lastSet ? lastSet.weightKg : '',
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
        previousWeightKg: lastSet?.previousWeightKg,
        previousReps: lastSet?.previousReps,
      };
      return { ...ex, sets: [...ex.sets, newSet] };
    });

    onUpdateSession({ ...session, exercises: updatedExercises });
  };

  // Remove set
  const handleRemoveSet = (exerciseId: string, setId: string) => {
    const updatedExercises = session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      const filtered = ex.sets.filter((s) => s.id !== setId);
      const reindexed = filtered.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      return { ...ex, sets: reindexed };
    });

    onUpdateSession({ ...session, exercises: updatedExercises });
  };

  // Add exercise from modal
  const handleAddExercise = (selected: { templateId: string; title: string; defaultWeight?: number; defaultReps?: number }) => {
    const newEx: TrackerExercise = {
      id: generateId(),
      templateId: selected.templateId,
      title: selected.title,
      notes: '',
      sets: [
        {
          id: generateId(),
          setNumber: 1,
          type: 'normal',
          weightKg: selected.defaultWeight || '',
          reps: selected.defaultReps || 10,
          completed: false,
          previousWeightKg: selected.defaultWeight || null,
          previousReps: selected.defaultReps || null,
        },
        {
          id: generateId(),
          setNumber: 2,
          type: 'normal',
          weightKg: selected.defaultWeight || '',
          reps: selected.defaultReps || 10,
          completed: false,
          previousWeightKg: selected.defaultWeight || null,
          previousReps: selected.defaultReps || null,
        },
        {
          id: generateId(),
          setNumber: 3,
          type: 'normal',
          weightKg: selected.defaultWeight || '',
          reps: selected.defaultReps || 10,
          completed: false,
          previousWeightKg: selected.defaultWeight || null,
          previousReps: selected.defaultReps || null,
        },
      ],
      stuckSessions: 0,
      plateauStatus: 'ok',
    };

    onUpdateSession({
      ...session,
      exercises: [...session.exercises, newEx],
    });
  };

  // Remove exercise
  const handleRemoveExercise = (exerciseId: string) => {
    onUpdateSession({
      ...session,
      exercises: session.exercises.filter((ex) => ex.id !== exerciseId),
    });
  };

  // Update exercise notes
  const handleUpdateExerciseNotes = (exerciseId: string, notes: string) => {
    const updatedExercises = session.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;
      return { ...ex, notes };
    });
    onUpdateSession({ ...session, exercises: updatedExercises });
  };

  // Rest Timer adjustments
  const startRestTimer = (seconds: number) => {
    setRestInitialSeconds(seconds);
    setRestSecondsLeft(seconds);
    triggerHaptic(30);
  };

  const adjustRestTime = (deltaSeconds: number) => {
    setRestSecondsLeft((prev) => {
      if (prev === null) return Math.max(10, deltaSeconds);
      return Math.max(0, prev + deltaSeconds);
    });
    triggerHaptic(20);
  };

  return (
    <div className={`flex flex-col w-full pb-36 animate-fadeIn ${isMobileHUDMode ? 'max-w-2xl lg:max-w-none mx-auto' : 'w-full'}`}>
      
      {/* ─────────────────────────────────────────────────────────────
          STICKY TOP HUD (Mobile Gym Dashboard Header)
          Permanently docked on top so the timer, status and rest counter
          are always visible without scrolling up!
          ───────────────────────────────────────────────────────────── */}
      <header className="sticky mobile-sticky-top z-30 px-4 py-3 rounded-2xl md:rounded-3xl bg-brand-surface/95 backdrop-blur-xl border border-brand-border shadow-2xl mb-4 transition-all">
        
        {/* Top Mini Bar: Status, Live Timer, Controls */}
        <div className="flex items-center justify-between gap-2.5 flex-wrap">
          {/* Workout Live & Timer Badge */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider">AO VIVO</span>
            </div>

            {/* Live Stopwatch with Pause/Resume */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/10 font-mono text-white">
              <Clock className="w-3.5 h-3.5 text-brand-primary" />
              <span className="text-sm md:text-base font-black tracking-wide">
                {formatTime(elapsedSeconds)}
              </span>
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="text-white/40 hover:text-white p-0.5 transition-colors"
                title={isPaused ? 'Retomar cronômetro' : 'Pausar cronômetro'}
              >
                {isPaused ? (
                  <Play className="w-3.5 h-3.5 text-brand-primary fill-brand-primary" />
                ) : (
                  <Pause className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            {/* View Mode Switcher: Mobile HUD vs Expanded */}
            <button
              type="button"
              onClick={() => setIsMobileHUDMode(!isMobileHUDMode)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              title={isMobileHUDMode ? 'Alternar para visão expandida de desktop' : 'Alternar para Painel Mobile de Treino'}
            >
              {isMobileHUDMode ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5 text-brand-primary" />}
            </button>

            {/* Minimize to bottom pill */}
            <button
              type="button"
              onClick={onMinimize}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/60 hover:text-white text-xs font-semibold flex items-center gap-1 transition-all"
              title="Minimizar treino para barra flutuante e consultar histórico"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minimizar</span>
            </button>

            {/* Discard Workout */}
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/30 text-white/40 hover:text-rose-400 transition-colors"
              title="Cancelar sessão"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Quick Finish CTA in Top Bar */}
            <button
              type="button"
              onClick={() => setShowSummaryModal(true)}
              disabled={completedSets === 0}
              className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-brand-bg font-black text-xs flex items-center gap-1.5 shadow-md shadow-brand-primary/20 hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Concluir</span>
            </button>
          </div>
        </div>

        {/* Workout Title & Progress Bar */}
        <div className="mt-2 pt-2 border-t border-white/5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={session.title}
              onChange={(e) => onUpdateSession({ ...session, title: e.target.value })}
              className="text-base md:text-lg font-black text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-brand-primary focus:outline-none py-0.5 flex-1 min-w-0"
              placeholder="Título do Treino"
            />
            <div className="flex items-center justify-end gap-2 shrink-0 text-xs font-mono flex-wrap">
              <span className="text-white/40">Progresso:</span>
              <span className="font-bold text-emerald-400">{completedSets}</span>
              <span className="text-white/40">/ {totalSets} séries</span>
            </div>
          </div>

          {/* Progress Indicator Line */}
          {totalSets > 0 && (
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-brand-primary to-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (completedSets / totalSets) * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Integrated Rest Timer Banner inside Header (Shows when timer is running) */}
        {restSecondsLeft !== null && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-brand-primary/15 border border-brand-primary/40 flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary text-brand-bg flex items-center justify-center font-bold animate-pulse shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-brand-primary tracking-wider">
                  Descanso Entre Séries
                </div>
                <div className="text-xl font-black font-mono text-white leading-none">
                  {formatTime(restSecondsLeft)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustRestTime(-15)}
                className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 text-xs font-mono font-bold"
              >
                -15s
              </button>
              <button
                type="button"
                onClick={() => adjustRestTime(30)}
                className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white/80 text-xs font-mono font-bold"
              >
                +30s
              </button>
              <button
                type="button"
                onClick={() => setRestSecondsLeft(null)}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold hover:bg-rose-500/30 transition-colors"
              >
                Pular
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          DIAGNÓSTICO DE ESTAGNAÇÃO DA SESSÃO ATUAL
          Classificação oficial e estrita (idêntica ao painel):
          - Crítico: 6+ sessões na mesma carga
          - Atenção: 3 a 5 sessões na mesma carga
          - Normal/OK: 0 a 2 sessões
          ───────────────────────────────────────────────────────────── */}
      {plateauSummary.totalStagnated > 0 ? (
        <div className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-amber-500/10 via-brand-surface to-brand-surface border border-amber-500/30 p-4 mb-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              plateauSummary.criticalCount > 0
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  Diagnóstico de Estagnação • Foco do Treino
                </span>
                {plateauSummary.criticalCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    {plateauSummary.criticalCount} Crítico(s) (6+ sessões)
                  </span>
                )}
                {plateauSummary.warningCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                    {plateauSummary.warningCount} Em Atenção (3-5 sessões)
                  </span>
                )}
                {plateauSummary.okCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                    {plateauSummary.okCount} Progredindo
                  </span>
                )}
              </div>

              <p className="text-xs text-white/80 mt-1 leading-relaxed">
                {plateauSummary.criticalCount > 0 ? (
                  <>
                    Identificamos <strong>{plateauSummary.criticalCount} exercício(s) com estagnação severa</strong> (6+ sessões sem alteração de peso) e {plateauSummary.warningCount} em atenção (3 a 5 sessões). Foque na sobrecarga recomendada ou busque +1 repetição!
                  </>
                ) : (
                  <>
                    Sem estagnações severas! <strong>{plateauSummary.warningCount} exercício(s)</strong> estão na faixa de atenção inicial (3 a 5 sessões na mesma carga).
                  </>
                )}
              </p>

              {/* Quick Pills of Stagnated Exercises */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {plateauSummary.criticalList.map(({ exercise, stuck }) => (
                  <span
                    key={exercise.id}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-200 font-medium flex items-center gap-1.5"
                  >
                    <Target className="w-3 h-3 text-rose-400" />
                    <span>{exercise.title}:</span>
                    <strong className="text-white font-mono">{stuck}x parado (Crítico)</strong>
                  </span>
                ))}
                {plateauSummary.warningList.map(({ exercise, stuck }) => (
                  <span
                    key={exercise.id}
                    className="px-2.5 py-1 rounded-xl bg-black/40 border border-amber-500/30 text-[11px] text-amber-200 font-medium flex items-center gap-1.5"
                  >
                    <Target className="w-3 h-3 text-amber-400" />
                    <span>{exercise.title}:</span>
                    <strong className="text-white font-mono">{stuck}x parado (Atenção)</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-brand-surface border border-brand-border/60 p-3.5 mb-4 flex items-center justify-between gap-3 text-xs text-white/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span>Rotina sem estagnações! Todos os exercícios estão progredindo normalmente.</span>
          </div>
        </div>
      )}

      {/* Rest Timer Preset Selector (When idle) */}
      {restSecondsLeft === null && (
        <div className="rounded-2xl bg-brand-surface border border-brand-border p-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Clock className="w-4 h-4 text-brand-primary" />
            <span>Descanso automático:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[45, 60, 90, 120, 180].map((secs) => (
              <button
                key={secs}
                type="button"
                onClick={() => {
                  setRestInitialSeconds(secs);
                  triggerHaptic(20);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all ${
                  restInitialSeconds === secs
                    ? 'bg-brand-primary text-brand-bg shadow-sm'
                    : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5'
                }`}
              >
                {secs >= 60 ? `${secs / 60}m` : `${secs}s`}
              </button>
            ))}

            <button
              type="button"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                triggerHaptic(20);
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-1"
              title={soundEnabled ? 'Som ativado' : 'Silencioso'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-primary" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BARRA DE CONTROLE DE EXIBIÇÃO DOS EXERCÍCIOS (Recolher / Expandir)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 py-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-white/60 font-semibold uppercase tracking-wider text-[11px]">
            Exercícios do Treino ({session.exercises.length})
          </span>
          {completedExercisesCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-bold">
              {completedExercisesCount}/{session.exercises.length} concluídos
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {completedExercisesCount > 0 && (
            <button
              type="button"
              onClick={collapseCompletedExercises}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Recolher exercícios com todas as séries concluídas"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recolher Concluídos</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleCollapseAll}
            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 text-[11px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
            title={areAllCollapsed ? 'Expandir todos os exercícios' : 'Recolher todos os exercícios'}
          >
            <ChevronsUpDown className="w-3.5 h-3.5 text-brand-primary" />
            <span>{areAllCollapsed ? 'Expandir Todos' : 'Recolher Todos'}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LISTA DE EXERCÍCIOS DA SESSÃO (Cards Touch-First Mobile)
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {session.exercises.map((exercise, exIndex) => {
          const diag = getExercisePlateauInfo(exercise);
          const isCriticalPlateau = diag.isCritical;
          const isWarningPlateau = diag.isWarning;
          const currentLoad = diag.currentLoad;
          const targetLoad = diag.targetLoad;
          const isCollapsed = Boolean(collapsedExercises[exercise.id]);
          const completedSetsCount = exercise.sets.filter((s) => s.completed).length;
          const allSetsDone = exercise.sets.length > 0 && completedSetsCount === exercise.sets.length;

          return (
            <div
              key={exercise.id}
              className={`rounded-2xl md:rounded-3xl bg-brand-surface border transition-all overflow-hidden shadow-lg ${
                isCriticalPlateau
                  ? 'border-rose-500/40 shadow-rose-500/5'
                  : isWarningPlateau
                  ? 'border-amber-500/40 shadow-amber-500/5'
                  : 'border-brand-border'
              }`}
            >
              {/* Exercise Card Header (Clicável para recolher/expandir) */}
              <div className="p-4 border-b border-brand-border/60">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExerciseCollapse(exercise.id)}
                    className="flex-1 flex items-start gap-2.5 text-left group cursor-pointer select-none min-w-0"
                  >
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-6 h-6 rounded-xl text-xs font-mono font-bold flex items-center justify-center shrink-0 border ${
                        allSetsDone
                          ? 'bg-emerald-500 text-black border-emerald-400'
                          : 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary'
                      }`}>
                        {allSetsDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : exIndex + 1}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-white/40 group-hover:text-white transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </div>
                    <div className="min-w-0 flex-1 text-wrap-safe">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base md:text-lg font-bold text-white tracking-tight text-wrap-safe group-hover:text-brand-primary transition-colors">
                          {exercise.title}
                        </h3>
                        {/* Status Badges */}
                        {isCriticalPlateau && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                            Crítico ({diag.stuckSessions}x)
                          </span>
                        )}
                        {isWarningPlateau && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                            Atenção ({diag.stuckSessions}x)
                          </span>
                        )}
                        {allSetsDone && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                            Feito ✓
                          </span>
                        )}
                      </div>

                      {/* Resumo quando recolhido */}
                      {isCollapsed ? (
                        <div className="mt-1 flex items-center gap-2 text-xs text-white/60 flex-wrap">
                          <span className="font-mono text-white/80">
                            {completedSetsCount} de {exercise.sets.length} séries concluídas
                          </span>
                          {currentLoad > 0 && (
                            <>
                              <span>•</span>
                              <span className="font-mono">{currentLoad} kg</span>
                            </>
                          )}
                          <span className="text-[10px] text-brand-primary font-medium ml-1">
                            (Toque para expandir)
                          </span>
                        </div>
                      ) : (
                        exercise.lastSessionDate && (
                          <span className="text-[10px] text-white/40">
                            Última sessão registrada no histórico
                          </span>
                        )
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Toggle Collapse Button */}
                    <button
                      type="button"
                      onClick={() => toggleExerciseCollapse(exercise.id)}
                      className="text-white/40 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors"
                      title={isCollapsed ? 'Expandir exercício' : 'Recolher exercício'}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isCollapsed ? '-rotate-90' : 'rotate-0'
                        }`}
                      />
                    </button>

                    {/* Remove Exercise Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="text-white/20 hover:text-rose-400 p-1.5 rounded-xl hover:bg-rose-500/10 transition-colors"
                      title="Remover exercício da sessão"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ─── BANNER DE ESTAGNAÇÃO DO EXERCÍCIO (Destaque Proeminente) ─── */}
                {!isCollapsed && isCriticalPlateau ? (
                  <div className="mt-3 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="text-xs flex-1 min-w-0 text-wrap-safe">
                        <div className="font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                          <span>Estagnação Crítica</span>
                          <span className="font-mono font-bold text-white bg-rose-500/30 px-2 py-0.5 rounded-full text-[10px]">
                            {diag.stuckSessions} sessões travadas (6+)
                          </span>
                        </div>
                        <div className="mt-1 text-white leading-relaxed">
                          🎯 <strong>Meta de Quebra Hoje:</strong> {targetLoad > 0 ? (
                            <>Tente subir para <strong className="text-emerald-300 font-mono font-bold">{targetLoad} kg</strong> (+1~2 kg)</>
                          ) : (
                            'Adicione +1 kg'
                          )} OU realize <strong>+1 repetição</strong> na primeira série!
                        </div>
                        {diag.strategy && (
                          <div className="mt-1 text-white/70 text-[11px] italic">
                            💡 Dica: {diag.strategy}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : !isCollapsed && isWarningPlateau ? (
                  <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 animate-fadeIn">
                    <div className="flex items-center gap-2 text-xs text-wrap-safe">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>
                        <strong>Atenção ({diag.stuckSessions} sessões):</strong> Carga idêntica nas últimas 3-5 sessões. Tente +1 repetição na 1ª série ou microcarga (+1 kg).
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Exercise Notes Input (Oculta quando recolhido) */}
                {!isCollapsed && (
                  <input
                    type="text"
                    placeholder="Anotação (ex: banco 30°, pegada neutra, amplitude máxima)..."
                    value={exercise.notes || ''}
                    onChange={(e) => handleUpdateExerciseNotes(exercise.id, e.target.value)}
                    className="w-full text-xs text-white/60 placeholder:text-white/20 bg-black/20 border border-white/5 rounded-xl px-3 py-1.5 focus:outline-none focus:border-brand-primary mt-2.5 transition-colors"
                  />
                )}
              </div>

              {/* ─── SÉRIES (Layout Mobile Touch-First) - Exibido apenas se expandido ─── */}
              {!isCollapsed && (
                <div className="p-3 md:p-4 space-y-2.5">
                {exercise.sets.map((set) => (
                  <div
                    key={set.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      set.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                        : 'bg-black/20 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Left: Set number, Type, and Previous History */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-xl font-mono font-bold text-xs flex items-center justify-center shrink-0 ${
                          set.completed ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white'
                        }`}>
                          #{set.setNumber}
                        </span>

                        <select
                          value={set.type}
                          onChange={(e) =>
                            handleUpdateSet(exercise.id, set.id, { type: e.target.value as SetType })
                          }
                          className="bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-brand-primary"
                        >
                          <option value="normal">Normal</option>
                          <option value="warmup">Aquecimento</option>
                          <option value="failure">Até a Falha</option>
                          <option value="drop_set">Drop Set</option>
                        </select>
                      </div>

                      {/* Historical previous marker */}
                      <div className="text-[11px] font-mono text-white/50 bg-white/5 px-2 py-1 rounded-lg text-wrap-safe">
                        {set.previousWeightKg !== null && set.previousWeightKg !== undefined ? (
                          <span>
                            Anterior: <strong className="text-white/80">{set.previousWeightKg} kg</strong> × {set.previousReps || 10}
                          </span>
                        ) : (
                          <span className="text-white/30">Sem histórico</span>
                        )}
                      </div>
                    </div>

                    {/* Center: Large Touch Load & Reps Adjusters */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
                      
                      {/* Weight Control */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const curr = Number(set.weightKg) || 0;
                            handleUpdateSet(exercise.id, set.id, { weightKg: Math.max(0, curr - 2.5) });
                            triggerHaptic(20);
                          }}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 font-mono font-bold text-sm flex items-center justify-center border border-white/5"
                        >
                          -
                        </button>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.5"
                            value={set.weightKg}
                            onChange={(e) =>
                              handleUpdateSet(exercise.id, set.id, {
                                weightKg: e.target.value === '' ? '' : parseFloat(e.target.value),
                              })
                            }
                            placeholder="0"
                            className="w-16 bg-black/50 border border-white/10 rounded-xl py-1.5 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-brand-primary"
                          />
                          <span className="absolute -bottom-3 left-0 right-0 text-center text-[9px] text-white/30 font-bold">
                            KG
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = Number(set.weightKg) || 0;
                            handleUpdateSet(exercise.id, set.id, { weightKg: curr + 2.5 });
                            triggerHaptic(20);
                          }}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 font-mono font-bold text-sm flex items-center justify-center border border-white/5"
                        >
                          +
                        </button>
                      </div>

                      {/* Reps Control */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const curr = Number(set.reps) || 0;
                            handleUpdateSet(exercise.id, set.id, { reps: Math.max(0, curr - 1) });
                            triggerHaptic(20);
                          }}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 font-mono font-bold text-sm flex items-center justify-center border border-white/5"
                        >
                          -
                        </button>
                        <div className="relative">
                          <input
                            type="number"
                            value={set.reps}
                            onChange={(e) =>
                              handleUpdateSet(exercise.id, set.id, {
                                reps: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                              })
                            }
                            placeholder="10"
                            className="w-14 bg-black/50 border border-white/10 rounded-xl py-1.5 text-center font-mono font-bold text-sm text-white focus:outline-none focus:border-brand-primary"
                          />
                          <span className="absolute -bottom-3 left-0 right-0 text-center text-[9px] text-white/30 font-bold">
                            REPS
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const curr = Number(set.reps) || 0;
                            handleUpdateSet(exercise.id, set.id, { reps: curr + 1 });
                            triggerHaptic(20);
                          }}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/20 text-white/80 font-mono font-bold text-sm flex items-center justify-center border border-white/5"
                        >
                          +
                        </button>
                      </div>

                      {/* Large Checkmark Completion Button (Min 44px for easy thumb tapping) */}
                      <button
                        type="button"
                        onClick={() => handleToggleSetCompletion(exercise.id, set.id)}
                        className={`h-10 min-w-[50px] px-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                          set.completed
                            ? 'bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/25 scale-102'
                            : 'bg-white/10 text-white/50 hover:bg-white/15 hover:text-white border border-white/10 active:scale-95'
                        }`}
                        title={set.completed ? 'Desmarcar série' : 'Concluir série e iniciar descanso'}
                      >
                        <Check className={`w-4 h-4 ${set.completed ? 'stroke-[3]' : ''}`} />
                        <span className="text-xs font-bold font-mono">
                          {set.completed ? 'FEITO' : 'OK'}
                        </span>
                      </button>

                      {/* Delete Set */}
                      <button
                        type="button"
                        onClick={() => handleRemoveSet(exercise.id, set.id)}
                        className="text-white/20 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Remover série"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Set to Exercise */}
                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => handleAddSet(exercise.id)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-brand-primary" />
                    <span>Adicionar Série</span>
                  </button>

                  <span className="text-xs text-white/40 font-mono">
                    {exercise.sets.filter((s) => s.completed).length} de {exercise.sets.length} feitas
                  </span>
                </div>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add New Exercise CTA */}
      <div className="mt-6 flex items-center justify-center">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full max-w-md py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-primary/40 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xl cursor-pointer"
        >
          <div className="w-7 h-7 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span>Adicionar Exercício ao Treino</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          STICKY BOTTOM FINISH BAR (Fixed Thumb Area)
          Always anchored within thumb reach on mobile
          ───────────────────────────────────────────────────────────── */}
      <footer className="fixed mobile-fixed-bottom mobile-floating-panel z-40 animate-slideUp">
        <div className="rounded-2xl md:rounded-3xl bg-brand-surface/95 backdrop-blur-xl border border-brand-primary/40 p-3.5 shadow-2xl shadow-black/90 flex items-center justify-between gap-3">
          {/* Summary Metric */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Volume Total • {completedSets}/{totalSets} Séries
              </div>
              <div className="text-base font-black font-mono text-white flex items-baseline gap-1">
                <span>{totalVolume.toLocaleString('pt-BR')}</span>
                <span className="text-xs text-brand-primary">kg</span>
              </div>
            </div>
          </div>

          {/* Large Finish & Send Button */}
          <button
            type="button"
            onClick={() => setShowSummaryModal(true)}
            disabled={completedSets === 0}
            className="px-5 py-3 rounded-xl md:rounded-2xl bg-brand-primary text-brand-bg font-black text-sm flex items-center gap-2 shadow-lg shadow-brand-primary/25 hover:brightness-110 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Finalizar no Hevy</span>
          </button>
        </div>
      </footer>

      {/* Add Exercise Modal */}
      <AddExerciseModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSelectExercise={handleAddExercise}
        availableTemplates={availableTemplates}
      />

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
        session={session}
        elapsedSeconds={elapsedSeconds}
        totalVolumeKg={totalVolume}
        completedSetsCount={completedSets}
        totalSetsCount={totalSets}
        onConfirmSendToHevy={async (notes, isPrivate) => {
          await onFinishAndSend(session, notes, isPrivate);
          setShowSummaryModal(false);
        }}
        isSending={isSending}
        sendError={sendError}
      />

      {/* Discard Confirmation Modal */}
      {confirmDiscard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
              <XCircle className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Descartar treino em andamento?</h4>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              Todas as séries e anotações desta sessão serão descartadas e não serão enviadas para o Hevy.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onDiscard();
                }}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors"
              >
                Sim, Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
