import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Dumbbell, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Layers, 
  CheckCircle2, 
  AlertTriangle,
  AlertOctagon,
  Flame, 
  Info, 
  Filter, 
  Award,
  BarChart2,
  SlidersHorizontal,
  ChevronRight,
  Target,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculateExercisePlateaus } from '../services/plateauCalculator';
import { ExercisePlateau, PlateauStatus, WorkoutStagnationSummary } from '../types/plateau';

interface WorkoutsViewProps {
  workouts: any[];
  lastSyncedAt: string | null;
  syncing: boolean;
  syncProgress?: { page: number; totalPages: number; count: number } | null;
  syncError?: string | null;
  onSync: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
  initialSelectedWorkoutId?: string | null;
  plateaus?: ExercisePlateau[];
  hiddenRoutineIds?: string[];
}

export default function WorkoutsView({
  workouts,
  lastSyncedAt,
  syncing,
  syncProgress,
  syncError,
  onSync,
  onOpenSettings,
  hasApiKey,
  initialSelectedWorkoutId,
  plateaus: propPlateaus,
  hiddenRoutineIds = []
}: WorkoutsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | '30d' | '90d' | 'year'>('all');
  const [stagnationFilter, setStagnationFilter] = useState<'all' | 'critical' | 'warning' | 'ok'>('all');
  const [routineFilter, setRoutineFilter] = useState<'current_routine' | 'all' | string>('current_routine');
  const [hideBeginners, setHideBeginners] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<'stagnation_desc' | 'date_desc' | 'date_asc' | 'volume_desc' | 'duration_desc'>('date_desc');
  const [expandedWorkoutIds, setExpandedWorkoutIds] = useState<Set<string>>(
    () => new Set(initialSelectedWorkoutId ? [initialSelectedWorkoutId] : (workouts[0]?.id ? [workouts[0]?.id] : []))
  );

  // Helper to parse date safely
  const parseWorkoutDate = (w: any): Date => {
    if (!w) return new Date();
    if (w.startTime?.toDate && typeof w.startTime.toDate === 'function') {
      return w.startTime.toDate();
    }
    if (w.startTime) {
      const d = new Date(w.startTime);
      if (!isNaN(d.getTime())) return d;
    }
    if (w.start_time) {
      const d = new Date(w.start_time);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  };

  // Helper to identify if a workout is beginner or legacy
  const isWorkoutBeginnerOrLegacy = (w: any): boolean => {
    const title = (w.title || '').toLowerCase().trim();
    const beginnerKeywords = [
      'iniciante', 'beginner', 'adaptação', 'adaptacao', 'início', 'inicio', 
      'primeiro', 'teste', 'trial', 'antigo', 'legado', 'legacy'
    ];
    return beginnerKeywords.some((kw) => title.includes(kw));
  };

  // Check if workout matches hidden routines list
  const isWorkoutHidden = (w: any): boolean => {
    if (!hiddenRoutineIds || hiddenRoutineIds.length === 0) return false;
    const title = (w.title || '').toLowerCase().trim();
    return hiddenRoutineIds.some((hid) => {
      const hLower = hid.toLowerCase().trim();
      return title.includes(hLower) || hLower.includes(title);
    });
  };

  // Check if workout is part of active routine (performed in last 60 days AND not beginner/hidden)
  const isWorkoutInActiveRoutine = (w: any): boolean => {
    if (isWorkoutHidden(w)) return false;
    if (isWorkoutBeginnerOrLegacy(w)) return false;
    const workoutDate = parseWorkoutDate(w).getTime();
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    return workoutDate >= sixtyDaysAgo;
  };

  // Helper to format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '—';
    const totalMinutes = Math.floor(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
  };

  // Pre-calculate plateaus if not provided
  const allPlateaus = useMemo(() => {
    if (propPlateaus && propPlateaus.length > 0) return propPlateaus;
    return calculateExercisePlateaus(workouts);
  }, [propPlateaus, workouts]);

  // Lookup maps for fast access
  const plateauByTemplateId = useMemo(() => {
    const map = new Map<string, ExercisePlateau>();
    for (const p of allPlateaus) {
      map.set(p.exerciseTemplateId, p);
    }
    return map;
  }, [allPlateaus]);

  const plateauByTitle = useMemo(() => {
    const map = new Map<string, ExercisePlateau>();
    for (const p of allPlateaus) {
      map.set(p.exerciseTitle.toLowerCase().trim(), p);
    }
    return map;
  }, [allPlateaus]);

  const getExercisePlateau = (exercise: any): ExercisePlateau | undefined => {
    const templateId = String(exercise.exercise_template_id || exercise.id || '').trim();
    if (templateId && plateauByTemplateId.has(templateId)) {
      return plateauByTemplateId.get(templateId);
    }
    const title = String(exercise.title || '').toLowerCase().trim();
    if (title && plateauByTitle.has(title)) {
      return plateauByTitle.get(title);
    }
    return undefined;
  };

  // Calculate stagnation summary for every workout session
  const workoutStagnationMap = useMemo(() => {
    const map = new Map<string, WorkoutStagnationSummary>();

    for (const workout of workouts) {
      const workoutId = workout.id || '';
      const workoutTitle = workout.title || 'Treino Hevy';
      const workoutDate = parseWorkoutDate(workout);
      const exercises: any[] = workout.exercises || [];

      const exercisePlateauList: {
        templateId: string;
        title: string;
        stuckSessions: number;
        weightKg: number;
        status: PlateauStatus;
      }[] = [];

      for (const ex of exercises) {
        const p = getExercisePlateau(ex);
        if (p) {
          exercisePlateauList.push({
            templateId: p.exerciseTemplateId,
            title: p.exerciseTitle,
            stuckSessions: p.stuckSessions,
            weightKg: p.currentWeightKg,
            status: p.status
          });
        }
      }

      const totalAnalyzed = exercisePlateauList.length;
      let avgStagnated = 0;
      let maxStagnated = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let okCount = 0;
      let mostStagnatedEx: WorkoutStagnationSummary['mostStagnatedExercise'] | undefined = undefined;

      if (totalAnalyzed > 0) {
        const sum = exercisePlateauList.reduce((acc, item) => acc + item.stuckSessions, 0);
        avgStagnated = Math.round((sum / totalAnalyzed) * 10) / 10;
        maxStagnated = Math.max(...exercisePlateauList.map(item => item.stuckSessions));

        criticalCount = exercisePlateauList.filter(item => item.status === 'critical').length;
        warningCount = exercisePlateauList.filter(item => item.status === 'warning').length;
        okCount = exercisePlateauList.filter(item => item.status === 'ok').length;

        // Find the most stagnated exercise
        const sorted = [...exercisePlateauList].sort((a, b) => b.stuckSessions - a.stuckSessions);
        mostStagnatedEx = sorted[0];
      }

      map.set(workoutId, {
        workoutId,
        workoutTitle,
        workoutDate,
        avgStagnatedSessions: avgStagnated,
        maxStagnatedSessions: maxStagnated,
        totalExercisesAnalyzed: totalAnalyzed,
        criticalCount,
        warningCount,
        okCount,
        mostStagnatedExercise: mostStagnatedEx
      });
    }

    return map;
  }, [workouts, plateauByTemplateId, plateauByTitle]);

  // Find the workout with the highest average stagnation
  const highestStagnationWorkout = useMemo(() => {
    let topWorkout: { workout: any; summary: WorkoutStagnationSummary } | null = null;

    for (const workout of workouts) {
      const summary = workoutStagnationMap.get(workout.id);
      if (summary && summary.totalExercisesAnalyzed > 0) {
        if (!topWorkout || summary.avgStagnatedSessions > topWorkout.summary.avgStagnatedSessions) {
          topWorkout = { workout, summary };
        } else if (
          summary.avgStagnatedSessions === topWorkout.summary.avgStagnatedSessions &&
          summary.criticalCount > topWorkout.summary.criticalCount
        ) {
          topWorkout = { workout, summary };
        }
      }
    }

    return topWorkout;
  }, [workouts, workoutStagnationMap]);

  // Aggregate Routine-level stagnation (grouping by workout title)
  const routineStagnationSummary = useMemo(() => {
    const routineMap = new Map<string, { totalAvg: number; count: number; exercises: Set<string>; criticals: number }>();

    for (const workout of workouts) {
      const title = (workout.title || 'Treino').trim();
      const summary = workoutStagnationMap.get(workout.id);
      if (summary && summary.totalExercisesAnalyzed > 0) {
        const cur = routineMap.get(title) || { totalAvg: 0, count: 0, exercises: new Set(), criticals: 0 };
        cur.totalAvg += summary.avgStagnatedSessions;
        cur.count += 1;
        cur.criticals += summary.criticalCount;
        routineMap.set(title, cur);
      }
    }

    const routines = Array.from(routineMap.entries()).map(([title, val]) => ({
      title,
      avgStagnatedSessions: Math.round((val.totalAvg / val.count) * 10) / 10,
      sessionsCount: val.count,
      totalCriticals: val.criticals
    }));

    routines.sort((a, b) => b.avgStagnatedSessions - a.avgStagnatedSessions);
    return routines;
  }, [workouts, workoutStagnationMap]);

  // Distinct routines for quick filter pills
  const distinctRoutineTitles = useMemo(() => {
    const counts = new Map<string, { title: string; count: number; lastTime: number; isBeginner: boolean }>();
    for (const w of workouts) {
      const rawTitle = (w.title || 'Treino Sem Nome').trim();
      const isBeg = isWorkoutBeginnerOrLegacy(w);
      const time = parseWorkoutDate(w).getTime();
      if (!counts.has(rawTitle)) {
        counts.set(rawTitle, { title: rawTitle, count: 0, lastTime: 0, isBeginner: isBeg });
      }
      const item = counts.get(rawTitle)!;
      item.count += 1;
      if (time > item.lastTime) item.lastTime = time;
    }

    return Array.from(counts.values())
      .filter((r) => !r.isBeginner && r.count >= 1)
      .sort((a, b) => b.lastTime - a.lastTime)
      .slice(0, 6)
      .map((r) => {
        let tag = 'T';
        const m = r.title.match(/Treino\s+([A-Za-z0-9])/i) || r.title.match(/\b([A-Za-z0-9])\b/);
        if (m && m[1]) tag = m[1].toUpperCase();
        return { ...r, tag };
      });
  }, [workouts]);

  // Helper counts
  const beginnerCount = useMemo(() => {
    return workouts.filter((w) => isWorkoutBeginnerOrLegacy(w)).length;
  }, [workouts]);

  const currentRoutineWorkoutsCount = useMemo(() => {
    return workouts.filter((w) => isWorkoutInActiveRoutine(w)).length;
  }, [workouts, hiddenRoutineIds]);

  // Filter and sort workouts
  const filteredWorkouts = useMemo(() => {
    const now = new Date().getTime();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

    return workouts.filter((workout) => {
      const workoutDate = parseWorkoutDate(workout).getTime();
      const stagSummary = workoutStagnationMap.get(workout.id);
      const isBeg = isWorkoutBeginnerOrLegacy(workout);
      const isHid = isWorkoutHidden(workout);

      // Hide beginner/legacy filter
      if (hideBeginners && isBeg) {
        return false;
      }

      // Hide custom hidden routines
      if (isHid) {
        return false;
      }

      // Routine Filter: 'current_routine' | 'all' | specific routine name
      if (routineFilter === 'current_routine') {
        if (!isWorkoutInActiveRoutine(workout)) {
          return false;
        }
      } else if (routineFilter !== 'all') {
        const wTitle = (workout.title || '').toLowerCase().trim();
        const target = routineFilter.toLowerCase().trim();
        if (wTitle !== target && !wTitle.includes(target)) {
          return false;
        }
      }

      // Period filter
      if (periodFilter === '30d' && workoutDate < thirtyDaysAgo) return false;
      if (periodFilter === '90d' && workoutDate < ninetyDaysAgo) return false;
      if (periodFilter === 'year' && workoutDate < oneYearAgo) return false;

      // Stagnation filter
      if (stagnationFilter === 'critical') {
        if (!stagSummary || stagSummary.criticalCount === 0) return false;
      } else if (stagnationFilter === 'warning') {
        if (!stagSummary || (stagSummary.criticalCount === 0 && stagSummary.warningCount === 0)) return false;
      } else if (stagnationFilter === 'ok') {
        if (!stagSummary || stagSummary.criticalCount > 0 || stagSummary.warningCount > 0) return false;
      }

      // Search term (title, description, exercise names)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = (workout.title || '').toLowerCase().includes(query);
        const matchesDesc = (workout.description || '').toLowerCase().includes(query);
        const matchesExercise = (workout.exercises || []).some((ex: any) => 
          (ex.title || '').toLowerCase().includes(query)
        );
        return matchesTitle || matchesDesc || matchesExercise;
      }

      return true;
    }).sort((a, b) => {
      const stagA = workoutStagnationMap.get(a.id)?.avgStagnatedSessions || 0;
      const stagB = workoutStagnationMap.get(b.id)?.avgStagnatedSessions || 0;

      if (sortBy === 'stagnation_desc') {
        if (stagB !== stagA) return stagB - stagA;
        const critA = workoutStagnationMap.get(a.id)?.criticalCount || 0;
        const critB = workoutStagnationMap.get(b.id)?.criticalCount || 0;
        if (critB !== critA) return critB - critA;
      }

      const dateA = parseWorkoutDate(a).getTime();
      const dateB = parseWorkoutDate(b).getTime();
      const volA = Number(a.totalVolume) || 0;
      const volB = Number(b.totalVolume) || 0;
      const durA = Number(a.duration) || 0;
      const durB = Number(b.duration) || 0;

      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'volume_desc') return volB - volA;
      if (sortBy === 'duration_desc') return durB - durA;
      return dateB - dateA;
    });
  }, [workouts, searchTerm, periodFilter, stagnationFilter, sortBy, workoutStagnationMap]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalCount = workouts.length;
    const totalVolumeKg = workouts.reduce((acc, w) => acc + (Number(w.totalVolume) || 0), 0);
    const totalDurationSec = workouts.reduce((acc, w) => acc + (Number(w.duration) || 0), 0);
    const totalSets = workouts.reduce((acc, w) => acc + (Number(w.totalSets) || 0), 0);
    const avgDurationMin = totalCount > 0 ? Math.round((totalDurationSec / totalCount) / 60) : 0;
    const avgVolumeKg = totalCount > 0 ? Math.round(totalVolumeKg / totalCount) : 0;

    // Stagnation overall averages
    const allSummaries = Array.from(workoutStagnationMap.values()) as WorkoutStagnationSummary[];
    const workoutsWithStagnation = allSummaries.filter(s => s.totalExercisesAnalyzed > 0);
    const globalAvgStagnation = workoutsWithStagnation.length > 0
      ? Math.round((workoutsWithStagnation.reduce((acc: number, s) => acc + s.avgStagnatedSessions, 0) / workoutsWithStagnation.length) * 10) / 10
      : 0;

    const totalCriticalWorkouts = workoutsWithStagnation.filter(s => s.criticalCount > 0).length;

    return {
      totalCount,
      totalVolumeKg,
      totalDurationHours: (totalDurationSec / 3600).toFixed(1),
      totalSets,
      avgDurationMin,
      avgVolumeKg,
      globalAvgStagnation,
      totalCriticalWorkouts
    };
  }, [workouts, workoutStagnationMap]);

  const toggleExpand = (id: string) => {
    setExpandedWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAndFocusWorkout = (id: string) => {
    setExpandedWorkoutIds((prev) => new Set([...Array.from(prev), id]));
    // Scroll smoothly to workout
    setTimeout(() => {
      const el = document.getElementById(`workout-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const expandAll = () => {
    setExpandedWorkoutIds(new Set(filteredWorkouts.map(w => w.id)));
  };

  const collapseAll = () => {
    setExpandedWorkoutIds(new Set());
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhuma sincronização realizada';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getSetTypeBadge = (setType?: string) => {
    const type = (setType || 'normal').toLowerCase();
    if (type === 'warmup' || type === 'warm_up') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Aquecimento
        </span>
      );
    }
    if (type === 'drop_set' || type === 'dropset') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Drop Set
        </span>
      );
    }
    if (type === 'failure') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          Falha
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/50 border border-white/5">
        Normal
      </span>
    );
  };

  const getStagnationBadge = (avg: number, criticalCount: number) => {
    if (criticalCount > 0 || avg >= 6) {
      return {
        bg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        label: `Média ${avg} sessões (Crítico)`
      };
    }
    if (avg >= 3) {
      return {
        bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
        dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
        label: `Média ${avg} sessões (Atenção)`
      };
    }
    return {
      bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
      label: `Média ${avg} sessões (OK)`
    };
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-14">
      {/* Top Banner / Sync Info */}
      <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-bold tracking-tight text-white">Treinos & Análise de Estagnação</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold font-mono">
              {stats.totalCount} {stats.totalCount === 1 ? 'sessão' : 'sessões'}
            </span>
          </div>
          <p className="text-xs text-white/50">
            Última sincronização com a nuvem Hevy: <span className="text-white/80 font-mono">{formatLastSync(lastSyncedAt)}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {!hasApiKey ? (
            <button
              onClick={onOpenSettings}
              className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Info className="w-4 h-4" />
              <span>Conectar API Hevy</span>
            </button>
          ) : (
            <button
              onClick={onSync}
              disabled={syncing}
              className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 w-full md:w-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando Treinos...' : 'Sincronizar Treinos'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync in progress notification */}
      {syncing && syncProgress && (
        <div className="rounded-2xl bg-brand-primary/10 border border-brand-primary/30 p-4 flex items-center gap-3 animate-pulse">
          <RefreshCw className="w-4 h-4 text-brand-primary animate-spin shrink-0" />
          <div className="text-xs text-brand-primary font-medium">
            Carregando página {syncProgress.page} de {syncProgress.totalPages}... ({syncProgress.count} treinos carregados até agora)
          </div>
        </div>
      )}

      {/* Sync error banner */}
      {syncError && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300">
            <span className="font-bold">Aviso de sincronização:</span> {syncError}
          </div>
        </div>
      )}

      {/* SECTION: TREINO COM MAIOR ESTAGNAÇÃO (HIGHLIGHT HERO) */}
      {highestStagnationWorkout && (
        <div className="rounded-[2rem] bg-gradient-to-br from-rose-950/40 via-brand-surface to-brand-surface border border-rose-500/30 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Treino com Maior Estagnação
                </span>
                <span className="text-xs text-white/40 font-mono">
                  Sessão de {format(highestStagnationWorkout.summary.workoutDate, "dd 'de' MMMM, HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  {highestStagnationWorkout.workout.title || 'Treino Hevy'}
                </h3>
                <p className="text-xs text-rose-200/70 mt-1 max-w-2xl leading-relaxed">
                  Este treino apresentou a maior média de estagnação de carga entre todos os treinos analisados, com exercícios que deixaram de progredir carga em sessões consecutivas.
                </p>
              </div>

              {/* Sub metrics inside hero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Média do Treino</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-rose-400 font-mono">
                      {highestStagnationWorkout.summary.avgStagnatedSessions}
                    </span>
                    <span className="text-[10px] text-white/40">sessões</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Exercícios Críticos</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-rose-300 font-mono">
                      {highestStagnationWorkout.summary.criticalCount}
                    </span>
                    <span className="text-[10px] text-white/40">de {highestStagnationWorkout.summary.totalExercisesAnalyzed}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Em Atenção</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-amber-300 font-mono">
                      {highestStagnationWorkout.summary.warningCount}
                    </span>
                    <span className="text-[10px] text-white/40">exercícios</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Mais Estagnado</span>
                  <div className="text-xs font-semibold text-white truncate mt-1">
                    {highestStagnationWorkout.summary.mostStagnatedExercise?.title || '—'}
                  </div>
                  <div className="text-[10px] text-rose-300/80 font-mono">
                    {highestStagnationWorkout.summary.mostStagnatedExercise?.stuckSessions} sessões travado
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-center">
              <button
                onClick={() => expandAndFocusWorkout(highestStagnationWorkout.workout.id)}
                className="px-5 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all hover:scale-[1.02]"
              >
                <span>Consultar Este Treino</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              {routineStagnationSummary[0] && (
                <div className="text-[11px] text-white/50 text-center lg:text-right px-2">
                  Rotina mais estagnada: <strong className="text-white">{routineStagnationSummary[0].title}</strong> (média {routineStagnationSummary[0].avgStagnatedSessions} sessões)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Total de Treinos</span>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl lg:text-4xl font-light tracking-tighter text-white font-mono">
              {stats.totalCount}
            </span>
            <span className="text-xs text-white/40 uppercase">sessões</span>
          </div>
          <span className="text-[11px] text-white/40">Histórico completo</span>
        </div>

        <div className="rounded-2xl bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Média Geral de Estagnação</span>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className={`text-3xl lg:text-4xl font-light tracking-tighter font-mono ${
              stats.globalAvgStagnation >= 6 ? 'text-rose-400' : stats.globalAvgStagnation >= 3 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {stats.globalAvgStagnation}
            </span>
            <span className="text-xs text-white/40 uppercase">sessões/treino</span>
          </div>
          <span className="text-[11px] text-white/40">Média por exercício</span>
        </div>

        <div className="rounded-2xl bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Treinos com Platô Crítico</span>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl lg:text-4xl font-light tracking-tighter text-rose-400 font-mono">
              {stats.totalCriticalWorkouts}
            </span>
            <span className="text-xs text-white/40 uppercase">treinos</span>
          </div>
          <span className="text-[11px] text-white/40">Com exercícios travados há 6+ sessões</span>
        </div>

        <div className="rounded-2xl bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Volume Total Levantado</span>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="text-3xl lg:text-4xl font-light tracking-tighter text-[#4FACFE] font-mono">
              {stats.totalVolumeKg >= 10000 
                ? (stats.totalVolumeKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) 
                : stats.totalVolumeKg.toLocaleString()}
            </span>
            <span className="text-xs text-white/40 uppercase">{stats.totalVolumeKg >= 10000 ? 'toneladas' : 'kg'}</span>
          </div>
          <span className="text-[11px] text-white/40">Média: {stats.avgVolumeKg.toLocaleString()} kg/treino</span>
        </div>
      </div>

      {/* Routine and Beginner Filter Bar */}
      <div className="rounded-2xl bg-brand-surface border border-brand-border p-3.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-white/50 font-semibold flex items-center gap-1.5 mr-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            Rotina:
          </span>

          <button
            onClick={() => setRoutineFilter('current_routine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              routineFilter === 'current_routine'
                ? 'bg-brand-primary text-brand-bg shadow-sm shadow-brand-primary/20 font-bold'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/5 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Minha Rotina Atual (Ativos)</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              routineFilter === 'current_routine' ? 'bg-black/20 text-brand-bg font-bold' : 'bg-white/10 text-white/70'
            }`}>
              {currentRoutineWorkoutsCount}
            </span>
          </button>

          {distinctRoutineTitles.map((rt) => (
            <button
              key={rt.title}
              onClick={() => setRoutineFilter(rt.title)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                routineFilter === rt.title
                  ? 'bg-white/20 text-white border border-white/20 font-bold shadow-sm'
                  : 'bg-white/5 text-white/60 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
            >
              <span className="w-4 h-4 rounded bg-brand-primary/20 text-brand-primary text-[10px] font-mono font-bold flex items-center justify-center">
                {rt.tag}
              </span>
              <span>{rt.title}</span>
              <span className="text-[10px] font-mono opacity-60">({rt.count})</span>
            </button>
          ))}

          <button
            onClick={() => setRoutineFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              routineFilter === 'all'
                ? 'bg-white/20 text-white font-bold border border-white/20'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/5 hover:bg-white/10'
            }`}
          >
            Todos os Treinos ({workouts.length})
          </button>
        </div>

        {/* Quick Beginner Toggle */}
        <button
          onClick={() => setHideBeginners(!hideBeginners)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shrink-0 ${
            hideBeginners
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'
          }`}
          title={hideBeginners ? 'Clique para ver treinos iniciantes e de adaptação' : 'Clique para ocultar treinos iniciantes'}
        >
          {hideBeginners ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-white/40" />}
          <span>{hideBeginners ? 'Ocultando treinos iniciantes' : 'Exibindo iniciantes'}</span>
          {beginnerCount > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-black/30 font-bold">
              {beginnerCount} {beginnerCount === 1 ? 'ocultado' : 'ocultados'}
            </span>
          )}
        </button>
      </div>

      {/* Search, Filter and Actions Toolbar */}
      <div className="rounded-2xl bg-brand-surface border border-brand-border p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome do treino, exercício ou anotação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-brand-primary outline-none transition-colors"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Stagnation Filter Pills */}
          <div className="flex items-center rounded-xl bg-brand-bg border border-brand-border p-0.5 text-xs">
            <button
              onClick={() => setStagnationFilter('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                stagnationFilter === 'all' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStagnationFilter('critical')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                stagnationFilter === 'critical' ? 'bg-rose-500/20 text-rose-300 font-semibold' : 'text-white/40 hover:text-rose-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Críticos
            </button>
            <button
              onClick={() => setStagnationFilter('warning')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                stagnationFilter === 'warning' ? 'bg-amber-500/20 text-amber-300 font-semibold' : 'text-white/40 hover:text-amber-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Atenção
            </button>
          </div>

          {/* Period selector */}
          <div className="flex items-center rounded-xl bg-brand-bg border border-brand-border p-0.5 text-xs">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-2 py-1.5 rounded-lg transition-colors ${
                periodFilter === 'all' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              Período: Todos
            </button>
            <button
              onClick={() => setPeriodFilter('30d')}
              className={`px-2 py-1.5 rounded-lg transition-colors ${
                periodFilter === '30d' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setPeriodFilter('90d')}
              className={`px-2 py-1.5 rounded-lg transition-colors ${
                periodFilter === '90d' ? 'bg-white/10 text-white font-semibold' : 'text-white/40 hover:text-white'
              }`}
            >
              90d
            </button>
          </div>

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-brand-bg border border-brand-border rounded-xl px-3 py-2 text-xs text-white/80 focus:border-brand-primary outline-none transition-colors cursor-pointer"
          >
            <option value="stagnation_desc">🚨 Maior Estagnação Primeiro</option>
            <option value="date_desc">📅 Mais recentes primeiro</option>
            <option value="date_asc">📅 Mais antigos primeiro</option>
            <option value="volume_desc">💪 Maior volume total</option>
            <option value="duration_desc">⏱️ Maior duração</option>
          </select>

          {/* Expand/Collapse All */}
          <div className="flex items-center gap-1 border-l border-brand-border pl-2">
            <button
              onClick={expandAll}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-colors"
              title="Expandir todos os treinos"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              onClick={collapseAll}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-colors"
              title="Recolher todos os treinos"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Workouts List */}
      {filteredWorkouts.length === 0 ? (
        <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/30">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Nenhum treino encontrado</h3>
          <p className="text-xs text-white/50 max-w-md mb-6 leading-relaxed">
            {workouts.length === 0
              ? 'Você ainda não tem treinos sincronizados. Conecte sua API Key do Hevy para carregar todo o seu histórico.'
              : 'Nenhum treino corresponde aos filtros ou busca aplicados acima.'}
          </p>
          {workouts.length === 0 && (
            <div className="flex gap-3">
              <button
                onClick={onOpenSettings}
                className="btn-primary py-2.5 px-6 text-xs font-semibold"
              >
                Configurar API Key
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredWorkouts.map((workout, index) => {
            const workoutDate = parseWorkoutDate(workout);
            const isExpanded = expandedWorkoutIds.has(workout.id);
            const exercises: any[] = workout.exercises || [];
            const volumeKg = Number(workout.totalVolume) || 0;
            const setsCount = Number(workout.totalSets) || exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
            const stag = workoutStagnationMap.get(workout.id);
            const isTopStagnated = highestStagnationWorkout?.workout.id === workout.id;

            const stagBadge = stag && stag.totalExercisesAnalyzed > 0 
              ? getStagnationBadge(stag.avgStagnatedSessions, stag.criticalCount)
              : null;

            return (
              <div
                id={`workout-card-${workout.id}`}
                key={workout.id || index}
                className={`rounded-2xl bg-brand-surface border transition-all duration-200 overflow-hidden ${
                  isTopStagnated
                    ? 'border-rose-500/50 shadow-lg shadow-rose-950/20 ring-1 ring-rose-500/20'
                    : isExpanded 
                    ? 'border-brand-primary/40 shadow-lg shadow-black/20' 
                    : 'border-brand-border hover:border-white/10'
                }`}
              >
                {/* Workout Card Header */}
                <div
                  onClick={() => toggleExpand(workout.id)}
                  className="p-5 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                      isTopStagnated 
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300' 
                        : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      <span className="text-[10px] text-white/40 uppercase font-bold leading-none">
                        {format(workoutDate, 'MMM', { locale: ptBR })}
                      </span>
                      <span className="text-lg font-bold leading-none mt-1 font-mono">
                        {format(workoutDate, 'dd')}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-base font-bold text-white tracking-tight truncate">
                          {workout.title || 'Treino Hevy'}
                        </h3>

                        {/* Top stagnated badge */}
                        {isTopStagnated && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                            <Flame className="w-3 h-3 text-rose-400" />
                            Maior Estagnação Geral
                          </span>
                        )}

                        {/* Stagnation Badge for this workout */}
                        {stagBadge && (
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border font-mono ${stagBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stagBadge.dot}`}></span>
                            {stagBadge.label}
                          </span>
                        )}

                        <span className="text-xs text-white/40 font-mono">
                          {format(workoutDate, 'EEEE, HH:mm', { locale: ptBR })}
                        </span>
                      </div>

                      {/* Stagnation sub-summary line */}
                      {stag && stag.totalExercisesAnalyzed > 0 && (
                        <div className="flex items-center gap-3 mt-1.5 text-xs">
                          {stag.criticalCount > 0 && (
                            <span className="text-rose-400 font-semibold flex items-center gap-1">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              {stag.criticalCount} {stag.criticalCount === 1 ? 'exercício crítico' : 'exercícios críticos'} (6+ sessões)
                            </span>
                          )}
                          {stag.warningCount > 0 && (
                            <span className="text-amber-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {stag.warningCount} em atenção (3-5 sessões)
                            </span>
                          )}
                          {stag.criticalCount === 0 && stag.warningCount === 0 && (
                            <span className="text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Todos os exercícios progredindo carga
                            </span>
                          )}
                        </div>
                      )}

                      {workout.description && (
                        <p className="text-xs text-white/60 line-clamp-1 mt-1 italic">
                          "{workout.description}"
                        </p>
                      )}

                      {/* Exercise chips preview (when collapsed) */}
                      {!isExpanded && exercises.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                          {exercises.slice(0, 5).map((ex, exIdx) => {
                            const exPlat = getExercisePlateau(ex);
                            const dotColor = exPlat?.status === 'critical' 
                              ? 'bg-rose-500' 
                              : exPlat?.status === 'warning' 
                              ? 'bg-amber-500' 
                              : 'bg-emerald-500';

                            return (
                              <span
                                key={exIdx}
                                className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 text-white/70 border border-white/5 flex items-center gap-1.5"
                              >
                                {exPlat && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}></span>}
                                <span>{ex.title}</span>
                                {exPlat && (
                                  <span className="text-white/40 font-mono">({exPlat.stuckSessions}s)</span>
                                )}
                              </span>
                            );
                          })}
                          {exercises.length > 5 && (
                            <span className="text-[10px] text-white/40 font-medium pl-1">
                              +{exercises.length - 5} mais
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right metrics and expand button */}
                  <div className="flex items-center justify-between lg:justify-end gap-5 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-white/5">
                    <div className="flex items-center gap-4 text-left lg:text-right">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Média Estagnação</span>
                        <span className={`text-xs font-bold font-mono ${
                          stag?.avgStagnatedSessions && stag.avgStagnatedSessions >= 6 ? 'text-rose-400' :
                          stag?.avgStagnatedSessions && stag.avgStagnatedSessions >= 3 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {stag ? `${stag.avgStagnatedSessions} sessões` : '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Duração</span>
                        <span className="text-xs font-semibold text-white/90 flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-white/40" />
                          {formatDuration(workout.duration)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Volume</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">
                          {Math.round(volumeKg).toLocaleString()} kg
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isExpanded ? 'bg-brand-primary/20 text-brand-primary' : 'bg-white/5 text-white/40 hover:text-white'
                      }`}
                      aria-label={isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Workout Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-brand-border bg-brand-bg/50 p-5 space-y-6"
                    >
                      {/* Workout notes if any */}
                      {workout.description && (
                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white/70 italic">
                          <span className="font-semibold not-italic text-white/90">Anotações do Treino: </span>
                          "{workout.description}"
                        </div>
                      )}

                      {/* Diagnostic summary bar inside workout */}
                      {stag && stag.totalExercisesAnalyzed > 0 && (
                        <div className="p-4 rounded-xl bg-brand-surface border border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                              Diagnóstico de Estagnação Desta Sessão
                            </span>
                            <div className="text-xs text-white/80 mt-0.5">
                              Média de <strong className="text-white font-mono">{stag.avgStagnatedSessions}</strong> sessões estagnadas por exercício. 
                              {stag.criticalCount > 0 && (
                                <span className="text-rose-300 font-semibold ml-1">
                                  {stag.criticalCount} exercício(s) necessitam de deload ou variação de estímulo.
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                            <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              {stag.criticalCount} Críticos
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {stag.warningCount} Atenção
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              {stag.okCount} Progredindo
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Exercises breakdown */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-brand-primary" />
                            Exercícios & Análise de Estagnação Individual ({exercises.length})
                          </h4>
                          <span className="text-[11px] text-white/40 font-mono">
                            Volume Total: {Math.round(volumeKg).toLocaleString()} kg • {setsCount} séries
                          </span>
                        </div>

                        {exercises.length === 0 ? (
                          <div className="text-xs text-white/30 italic p-4 text-center">
                            Nenhum exercício detalhado disponível para esta sessão.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {exercises.map((exercise: any, exIdx: number) => {
                              const sets: any[] = exercise.sets || [];
                              const exVolume = sets.reduce(
                                (acc, s) => acc + (Number(s.weight_kg) || 0) * (Number(s.reps) || 0),
                                0
                              );
                              const maxWeight = sets.reduce(
                                (max, s) => Math.max(max, Number(s.weight_kg) || 0),
                                0
                              );

                              const plateau = getExercisePlateau(exercise);

                              return (
                                <div
                                  key={exIdx}
                                  className={`rounded-xl bg-brand-surface border p-4 space-y-3.5 ${
                                    plateau?.status === 'critical'
                                      ? 'border-rose-500/30'
                                      : plateau?.status === 'warning'
                                      ? 'border-amber-500/30'
                                      : 'border-brand-border'
                                  }`}
                                >
                                  {/* Exercise Header */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2.5">
                                      <span className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary text-xs font-bold font-mono flex items-center justify-center shrink-0">
                                        {exIdx + 1}
                                      </span>
                                      <span className="text-sm font-bold text-white">
                                        {exercise.title}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-white/50 font-mono">
                                      {maxWeight > 0 && (
                                        <span>Carga na Sessão: <strong className="text-white">{maxWeight} kg</strong></span>
                                      )}
                                      {exVolume > 0 && (
                                        <span>Volume: <strong className="text-emerald-400">{Math.round(exVolume).toLocaleString()} kg</strong></span>
                                      )}
                                      <span>{sets.length} séries</span>
                                    </div>
                                  </div>

                                  {/* EXERCISE STAGNATION DIAGNOSTIC BOX */}
                                  {plateau ? (
                                    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                      plateau.status === 'critical'
                                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                        : plateau.status === 'warning'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    }`}>
                                      <div className="flex items-start gap-2.5">
                                        {plateau.status === 'critical' ? (
                                          <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                        ) : plateau.status === 'warning' ? (
                                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        ) : (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold uppercase tracking-wider">
                                              {plateau.status === 'critical'
                                                ? 'Estagnação Crítica'
                                                : plateau.status === 'warning'
                                                ? 'Atenção na Progressão'
                                                : 'Em Progressão'}
                                            </span>
                                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/30 border border-white/10">
                                              {plateau.stuckSessions} {plateau.stuckSessions === 1 ? 'sessão parada' : 'sessões paradas'}
                                              {plateau.stuckWeeks > 0 ? ` (~${plateau.stuckWeeks} sem)` : ''}
                                            </span>
                                          </div>
                                          <p className="text-[11px] opacity-80 mt-1">
                                            {plateau.status === 'critical'
                                              ? `Carga travada em ${plateau.currentWeightKg} kg há ${plateau.stuckSessions} sessões. Recomendado alterar repetições, cadência ou aplicar deload.`
                                              : plateau.status === 'warning'
                                              ? `Mesma carga de ${plateau.currentWeightKg} kg mantida nas últimas ${plateau.stuckSessions} sessões. Fique atento na próxima semana.`
                                              : `Carga de ${plateau.currentWeightKg} kg em evolução recente.`}
                                          </p>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0 text-xs font-mono border-t sm:border-t-0 pt-2 sm:pt-0 border-white/5">
                                        <div className="text-[10px] opacity-60 uppercase">Carga Atual</div>
                                        <div className="font-bold text-sm text-white">
                                          {plateau.currentWeightKg} kg
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="p-2.5 rounded-lg bg-white/5 text-[11px] text-white/40 italic">
                                      Sem séries normais com carga registradas para calcular estagnação deste exercício.
                                    </div>
                                  )}

                                  {exercise.notes && (
                                    <p className="text-[11px] text-white/60 italic pl-1">
                                      Obs: {exercise.notes}
                                    </p>
                                  )}

                                  {/* Sets Table */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead>
                                        <tr className="text-[10px] text-white/30 uppercase tracking-wider border-b border-white/5">
                                          <th className="pb-2 font-bold w-14">Série</th>
                                          <th className="pb-2 font-bold w-24">Tipo</th>
                                          <th className="pb-2 font-bold w-24">Carga</th>
                                          <th className="pb-2 font-bold w-24">Reps</th>
                                          <th className="pb-2 font-bold w-28">Volume</th>
                                          <th className="pb-2 font-bold">RPE</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                        {sets.map((set: any, sIdx: number) => {
                                          const setWeight = Number(set.weight_kg) || 0;
                                          const setReps = Number(set.reps) || 0;
                                          const setVol = setWeight * setReps;

                                          return (
                                            <tr key={sIdx} className="hover:bg-white/[0.02] transition-colors">
                                              <td className="py-2 text-white/60 font-mono font-medium">
                                                #{sIdx + 1}
                                              </td>
                                              <td className="py-2">
                                                {getSetTypeBadge(set.type || set.set_type)}
                                              </td>
                                              <td className="py-2 font-mono font-bold text-white">
                                                {setWeight > 0 ? `${setWeight} kg` : (set.distance_meters ? `${set.distance_meters}m` : '—')}
                                              </td>
                                              <td className="py-2 font-mono font-medium text-white/80">
                                                {setReps > 0 ? `${setReps} reps` : (set.duration_seconds ? `${set.duration_seconds}s` : '—')}
                                              </td>
                                              <td className="py-2 font-mono text-emerald-400/90 font-semibold">
                                                {setVol > 0 ? `${setVol.toLocaleString()} kg` : '—'}
                                              </td>
                                              <td className="py-2 font-mono text-white/40 text-[11px]">
                                                {set.rpe ? `RPE ${set.rpe}` : '—'}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
