import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dumbbell,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  Flame,
  ArrowRight,
  Filter,
  BarChart3,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Target,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Sliders,
  CheckSquare,
  Square,
  X,
  Award,
  Archive,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExercisePlateau, RoutineExercise, RoutineSplit } from '../types/plateau';
import { analyzeRoutineSplits } from '../services/routineAnalyzer';

interface RoutinesViewProps {
  workouts: any[];
  plateaus: ExercisePlateau[];
  hevyRoutines?: any[];
  hiddenRoutineIds?: string[];
  onToggleHideRoutine?: (routineId: string) => void;
  onSetHiddenRoutines?: (routineIds: string[]) => void;
  onOpenSettings?: () => void;
  onSync?: () => void;
  syncing?: boolean;
  onStartWorkout?: (routine: RoutineSplit) => void;
  onStartEmptyWorkout?: () => void;
}

export default function RoutinesView({
  workouts,
  plateaus,
  hevyRoutines = [],
  hiddenRoutineIds = [],
  onToggleHideRoutine,
  onSetHiddenRoutines,
  onOpenSettings,
  onSync,
  syncing = false,
  onStartWorkout,
  onStartEmptyWorkout
}: RoutinesViewProps) {
  // Analyze routines (Treino A, Treino B, Treino C, etc.)
  const allRoutines: RoutineSplit[] = useMemo(() => {
    return analyzeRoutineSplits(workouts, plateaus, hevyRoutines);
  }, [workouts, plateaus, hevyRoutines]);

  // View Filter: 'current' (Minha Rotina Atual - default) | 'all' | 'hidden'
  const [viewFilter, setViewFilter] = useState<'current' | 'all' | 'hidden'>('current');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // Filter routines according to current view mode
  const displayedRoutines = useMemo(() => {
    if (allRoutines.length === 0) return [];

    if (viewFilter === 'hidden') {
      return allRoutines.filter((r) => hiddenRoutineIds.includes(r.id));
    }

    if (viewFilter === 'current') {
      const active = allRoutines.filter((r) => {
        // Exclude explicitly hidden
        if (hiddenRoutineIds.includes(r.id)) return false;
        // Routine is active if performed recently and not classified as beginner/legacy
        return r.isActiveRoutine;
      });

      // If filter leaves zero (e.g. all workouts are old), fallback to non-hidden routines
      if (active.length === 0) {
        return allRoutines.filter((r) => !hiddenRoutineIds.includes(r.id));
      }
      return active;
    }

    // 'all': Show all routines
    return allRoutines;
  }, [allRoutines, viewFilter, hiddenRoutineIds]);

  // Selected routine state
  const [selectedRoutineId, setSelectedRoutineId] = useState<string>(() => {
    return displayedRoutines[0]?.id || allRoutines[0]?.id || '';
  });

  // Keep selected routine valid if filtered routines change
  const activeRoutine = useMemo(() => {
    if (displayedRoutines.length === 0) return null;
    const found = displayedRoutines.find((r) => r.id === selectedRoutineId);
    return found || displayedRoutines[0];
  }, [displayedRoutines, selectedRoutineId]);

  // Filter exercises inside active routine
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'stagnated' | 'critical' | 'ok'>('all');
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Overall statistics for all active routines combined
  const overallStats = useMemo(() => {
    const listToAnalyze = displayedRoutines.length > 0 ? displayedRoutines : allRoutines;
    if (listToAnalyze.length === 0) {
      return {
        totalRoutines: 0,
        totalExercises: 0,
        totalStagnated: 0,
        totalCritical: 0,
        totalWarning: 0,
        mostStagnatedRoutine: null as RoutineSplit | null,
        leastStagnatedRoutine: null as RoutineSplit | null
      };
    }

    const totalRoutines = listToAnalyze.length;
    let totalExercises = 0;
    let totalStagnated = 0;
    let totalCritical = 0;
    let totalWarning = 0;

    for (const r of listToAnalyze) {
      totalExercises += r.totalExercises;
      totalStagnated += r.stagnatedCount;
      totalCritical += r.criticalCount;
      totalWarning += r.warningCount;
    }

    // Sort by stagnation rate
    const sortedByStagnation = [...listToAnalyze].sort((a, b) => {
      if (b.stagnationRate !== a.stagnationRate) {
        return b.stagnationRate - a.stagnationRate;
      }
      return b.criticalCount - a.criticalCount;
    });

    const mostStagnatedRoutine = sortedByStagnation[0];
    const leastStagnatedRoutine = sortedByStagnation[sortedByStagnation.length - 1];

    return {
      totalRoutines,
      totalExercises,
      totalStagnated,
      totalCritical,
      totalWarning,
      mostStagnatedRoutine,
      leastStagnatedRoutine
    };
  }, [displayedRoutines, allRoutines]);

  // Filter exercises of current routine
  const filteredExercises = useMemo(() => {
    if (!activeRoutine) return [];

    return activeRoutine.exercises.filter((ex) => {
      if (exerciseFilter === 'stagnated') {
        return ex.status === 'critical' || ex.status === 'warning';
      }
      if (exerciseFilter === 'critical') {
        return ex.status === 'critical';
      }
      if (exerciseFilter === 'ok') {
        return ex.status === 'ok';
      }
      return true;
    });
  }, [activeRoutine, exerciseFilter]);

  // Helper counts
  const currentCount = useMemo(() => {
    return allRoutines.filter((r) => !hiddenRoutineIds.includes(r.id) && r.isActiveRoutine).length;
  }, [allRoutines, hiddenRoutineIds]);

  const hiddenCount = hiddenRoutineIds.length;
  const legacyOrBeginnerCount = useMemo(() => {
    return allRoutines.filter((r) => r.isBeginnerOrLegacy).length;
  }, [allRoutines]);

  // Quick action to hide all beginner / legacy routines
  const handleHideAllBeginners = () => {
    if (!onSetHiddenRoutines) return;
    const toHide = new Set(hiddenRoutineIds);
    allRoutines.forEach((r) => {
      if (r.isBeginnerOrLegacy || r.daysSinceLast > 60) {
        toHide.add(r.id);
      }
    });
    onSetHiddenRoutines(Array.from(toHide));
  };

  // Quick action to restore all
  const handleRestoreAll = () => {
    if (onSetHiddenRoutines) {
      onSetHiddenRoutines([]);
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white/30">
          <Dumbbell className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Nenhum treino encontrado</h3>
        <p className="text-xs text-white/50 max-w-md mb-6 leading-relaxed">
          Conecte sua API Key do Hevy para carregar suas rotinas (Treino A, B, C...) e analisar detalhadamente a estagnação de cada exercício.
        </p>
        {onOpenSettings && (
          <button onClick={onOpenSettings} className="btn-primary py-2.5 px-6 text-xs font-semibold">
            Configurar API Hevy
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-16">
      {/* Top Banner & Title */}
      <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Meus Treinos (A, B, C) & Estagnação
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold font-mono">
              {displayedRoutines.length} {displayedRoutines.length === 1 ? 'rotina na visualização' : 'rotinas na visualização'}
            </span>
          </div>
          <p className="text-xs text-white/50 max-w-2xl leading-relaxed">
            Consulte a composição de cada um dos seus treinos atuais (Treino A, B, C...), veja todos os exercícios cadastrados e identifique quantos e quais exercícios estão com carga estagnada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
          {onStartEmptyWorkout && (
            <button
              onClick={onStartEmptyWorkout}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-brand-primary text-brand-bg shadow-md shadow-brand-primary/20 hover:brightness-110 transition-all cursor-pointer"
              title="Iniciar um treino livre em branco"
            >
              <Play className="w-3.5 h-3.5 fill-brand-bg" />
              <span>Novo Treino Livre</span>
            </button>
          )}

          {/* Button to Manage/Filter Routines */}
          <button
            onClick={() => setIsManageModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 transition-all hover:border-brand-primary/40"
            title="Gerenciar quais treinos exibir na sua rotina atual"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-primary" />
            <span>Gerenciar Treinos</span>
            {hiddenCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {hiddenCount} ocultos
              </span>
            )}
          </button>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              showComparison 
                ? 'bg-brand-primary text-brand-bg border-brand-primary font-bold' 
                : 'bg-white/5 hover:bg-white/10 text-white/80 border-white/10'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{showComparison ? 'Ocultar Comparativo' : 'Comparativo A vs B vs C'}</span>
          </button>

          {onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 text-xs transition-colors disabled:opacity-50"
              title="Atualizar dados da API Hevy"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-brand-primary' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Routine View Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-brand-surface/80 border border-brand-border">
        {/* Pills for Current vs All vs Hidden */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 text-xs">
          <button
            onClick={() => setViewFilter('current')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              viewFilter === 'current'
                ? 'bg-brand-primary text-brand-bg font-bold shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Minha Rotina Atual</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              viewFilter === 'current' ? 'bg-black/20 text-brand-bg font-bold' : 'bg-white/10 text-white/70'
            }`}>
              {currentCount}
            </span>
          </button>

          <button
            onClick={() => setViewFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
              viewFilter === 'all'
                ? 'bg-white/15 text-white font-bold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>Todos os Treinos</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white/70">
              {allRoutines.length}
            </span>
          </button>

          {hiddenCount > 0 && (
            <button
              onClick={() => setViewFilter('hidden')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 font-medium ${
                viewFilter === 'hidden'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-white/50 hover:text-amber-300'
              }`}
            >
              <EyeOff className="w-3 h-3" />
              <span>Ocultados</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                {hiddenCount}
              </span>
            </button>
          )}
        </div>

        {/* Quick Helper Badge */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          {viewFilter === 'current' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Exibindo apenas treinos ativos da sua divisão atual
              {legacyOrBeginnerCount > 0 && (
                <span className="text-white/40">({legacyOrBeginnerCount} iniciantes/antigos filtrados)</span>
              )}
            </span>
          )}
          {viewFilter === 'all' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-white/60">
              <Info className="w-3.5 h-3.5 text-white/40" />
              Mostrando histórico completo de divisões registradas
            </span>
          )}
          {viewFilter === 'hidden' && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300">
              <EyeOff className="w-3.5 h-3.5 text-amber-400" />
              Treinos que você optou por ocultar da rotina ativa
            </span>
          )}
        </div>
      </div>

      {/* Routine Cards Grid (A, B, C, ...) */}
      {displayedRoutines.length === 0 ? (
        <div className="p-8 rounded-2xl bg-brand-surface border border-brand-border text-center">
          <Info className="w-8 h-8 text-white/30 mx-auto mb-2" />
          <p className="text-sm text-white/70 font-semibold">Nenhum treino nesta categoria</p>
          <p className="text-xs text-white/40 mt-1">
            {viewFilter === 'hidden' 
              ? 'Você não tem nenhum treino ocultado no momento.' 
              : 'Clique em "Todos os Treinos" para visualizar todo o seu histórico.'}
          </p>
          <button
            onClick={() => setViewFilter('all')}
            className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-xs text-white font-medium hover:bg-white/15 transition-colors"
          >
            Ver Todos os Treinos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayedRoutines.map((routine) => {
            const isSelected = activeRoutine?.id === routine.id;
            const hasCritical = routine.criticalCount > 0;
            const isHidden = hiddenRoutineIds.includes(routine.id);

            return (
              <div
                key={routine.id}
                onClick={() => {
                  setSelectedRoutineId(routine.id);
                  setShowComparison(false);
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 text-left relative overflow-hidden group select-none ${
                  isSelected
                    ? 'bg-gradient-to-br from-brand-surface to-brand-surface/90 border-brand-primary shadow-lg shadow-brand-primary/10 ring-1 ring-brand-primary/30'
                    : 'bg-brand-surface border-brand-border hover:border-white/20 hover:bg-white/5'
                }`}
              >
                {/* Routine Tag (e.g. A, B, C) badge & Hide Action */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                      isSelected
                        ? 'bg-brand-primary text-brand-bg'
                        : 'bg-white/10 text-white group-hover:bg-white/15'
                    }`}>
                      {routine.tag || 'T'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-white truncate group-hover:text-brand-primary transition-colors">
                          {routine.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/40 font-mono mt-0.5">
                        <span>{routine.totalSessions} {routine.totalSessions === 1 ? 'sessão' : 'sessões'}</span>
                        {routine.daysSinceLast < 999 && (
                          <>
                            <span>•</span>
                            <span className={routine.daysSinceLast <= 15 ? 'text-emerald-400' : routine.daysSinceLast <= 45 ? 'text-white/60' : 'text-amber-400'}>
                              há {routine.daysSinceLast}d
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Hide/Restore Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHideRoutine?.(routine.id);
                    }}
                    className={`p-1.5 rounded-lg border transition-all shrink-0 ${
                      isHidden
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                        : 'bg-white/5 text-white/40 border-white/5 hover:text-rose-300 hover:bg-rose-500/15 hover:border-rose-500/30'
                    }`}
                    title={isHidden ? 'Restaurar para a rotina atual' : 'Ocultar este treino da rotina atual'}
                  >
                    {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Badges row: Official Hevy / Beginner / Status */}
                <div className="flex items-center gap-1.5 my-2 flex-wrap">
                  {routine.isHevyOfficialRoutine && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      Oficial Hevy
                    </span>
                  )}
                  {routine.isBeginnerOrLegacy && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Iniciante / Legado
                    </span>
                  )}
                  {routine.isActiveRoutine && !routine.isHevyOfficialRoutine && (
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Rotina Ativa
                    </span>
                  )}
                </div>

                {/* Stagnation Badge */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                  <span className="text-[10px] text-white/50 font-mono">
                    {routine.totalExercises} exercícios
                  </span>

                  {routine.stagnatedCount > 0 ? (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold ${
                      hasCritical
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {routine.stagnatedCount} {routine.stagnatedCount === 1 ? 'estagnado' : 'estagnados'} ({routine.stagnationRate}%)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                      100% Evoluindo
                    </span>
                  )}
                </div>

                {/* Progress bar of stagnation */}
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex mt-2">
                  {routine.criticalCount > 0 && (
                    <div
                      style={{ width: `${(routine.criticalCount / Math.max(routine.totalExercises, 1)) * 100}%` }}
                      className="bg-rose-500 h-full"
                      title={`${routine.criticalCount} exercícios críticos`}
                    />
                  )}
                  {routine.warningCount > 0 && (
                    <div
                      style={{ width: `${(routine.warningCount / Math.max(routine.totalExercises, 1)) * 100}%` }}
                      className="bg-amber-500 h-full"
                      title={`${routine.warningCount} exercícios em atenção`}
                    />
                  )}
                  {routine.okCount > 0 && (
                    <div
                      style={{ width: `${(routine.okCount / Math.max(routine.totalExercises, 1)) * 100}%` }}
                      className="bg-emerald-500/60 h-full"
                      title={`${routine.okCount} exercícios progredindo`}
                    />
                  )}
                </div>

                {/* Quick Start Workout Button */}
                {onStartWorkout && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartWorkout(routine);
                    }}
                    className="w-full mt-3 py-2 rounded-xl bg-brand-primary text-brand-bg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-primary/20 hover:brightness-110 transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-brand-bg" />
                    <span>Iniciar Este Treino</span>
                  </button>
                )}

                {/* Active selection underline */}
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* COMPARATIVE PANEL (A vs B vs C) */}
      {showComparison && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] bg-brand-surface border border-brand-primary/30 p-6 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-brand-primary" />
              <div>
                <h3 className="text-base font-bold text-white">Comparativo de Estagnação entre Rotinas</h3>
                <p className="text-xs text-white/50">
                  Veja qual dos seus treinos (A, B, C...) está sofrendo mais com travamento de cargas.
                </p>
              </div>
            </div>
            <span className="text-xs text-white/40 font-mono">
              Total: {overallStats.totalStagnated} de {overallStats.totalExercises} exercícios estagnados no geral
            </span>
          </div>

          {/* Ranking & Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overallStats.mostStagnatedRoutine && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Treino com Maior Estagnação
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1">
                    {overallStats.mostStagnatedRoutine.title}
                  </h4>
                  <p className="text-xs text-rose-200/70 mt-1 leading-relaxed">
                    {overallStats.mostStagnatedRoutine.stagnatedCount} de {overallStats.mostStagnatedRoutine.totalExercises} exercícios estagnados ({overallStats.mostStagnatedRoutine.stagnationRate}% da rotina).
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-rose-500/20 text-xs font-mono text-rose-300 flex justify-between">
                  <span>Exercício mais travado:</span>
                  <strong className="text-white truncate max-w-[130px]">
                    {overallStats.mostStagnatedRoutine.mostStagnatedExercise?.title || '—'}
                  </strong>
                </div>
              </div>
            )}

            {overallStats.leastStagnatedRoutine && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Treino Mais Saudável / Evoluindo
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1">
                    {overallStats.leastStagnatedRoutine.title}
                  </h4>
                  <p className="text-xs text-emerald-200/70 mt-1 leading-relaxed">
                    {overallStats.leastStagnatedRoutine.okCount} de {overallStats.leastStagnatedRoutine.totalExercises} exercícios progredindo com sucesso.
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-500/20 text-xs font-mono text-emerald-300 flex justify-between">
                  <span>Taxa de evolução:</span>
                  <strong className="text-white">
                    {100 - overallStats.leastStagnatedRoutine.stagnationRate}% ativo
                  </strong>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-brand-primary" />
                  Panorama Geral de Divisões
                </span>
                <div className="mt-2 space-y-1.5 text-xs">
                  <div className="flex justify-between text-white/70">
                    <span>Total de Exercícios Mapeados:</span>
                    <strong className="text-white font-mono">{overallStats.totalExercises}</strong>
                  </div>
                  <div className="flex justify-between text-rose-300">
                    <span>Em Platô Crítico (6+ sessões):</span>
                    <strong className="font-mono">{overallStats.totalCritical}</strong>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Em Atenção (3-5 sessões):</span>
                    <strong className="font-mono">{overallStats.totalWarning}</strong>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 text-[11px] text-white/40 italic">
                Dica: Se um treino concentra mais de 50% dos exercícios parados, considere um deload programado nessa musculatura.
              </div>
            </div>
          </div>

          {/* Comparative Table of All Routines */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40 font-mono">
                  <th className="py-2.5 px-3">Treino</th>
                  <th className="py-2.5 px-3">Exercícios</th>
                  <th className="py-2.5 px-3">Estagnados</th>
                  <th className="py-2.5 px-3">Taxa de Platô</th>
                  <th className="py-2.5 px-3">Média de Sessões Travadas</th>
                  <th className="py-2.5 px-3">Volume Médio</th>
                  <th className="py-2.5 px-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {displayedRoutines.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-semibold text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-bold font-mono flex items-center justify-center">
                        {r.tag}
                      </span>
                      <span>{r.title}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">{r.totalExercises}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 font-mono font-bold ${
                        r.criticalCount > 0 ? 'text-rose-400' : r.warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {r.stagnatedCount > 0 ? `${r.stagnatedCount} (${r.criticalCount} críticos)` : 'Nenhum'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className={r.stagnationRate >= 50 ? 'text-rose-400 font-bold' : r.stagnationRate >= 25 ? 'text-amber-400' : 'text-emerald-400'}>
                        {r.stagnationRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">{r.avgStuckSessions} sessões</td>
                    <td className="py-3 px-3 font-mono text-emerald-400">{r.avgVolumeKg.toLocaleString()} kg</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedRoutineId(r.id);
                          setShowComparison(false);
                        }}
                        className="text-[11px] text-brand-primary hover:underline font-semibold"
                      >
                        Ver Exercícios →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* SELECTED ROUTINE DETAIL VIEW */}
      {activeRoutine && (
        <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-6 space-y-6">
          {/* Header of Active Routine */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-white/5 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="w-9 h-9 rounded-xl bg-brand-primary text-brand-bg font-black text-base flex items-center justify-center font-mono shadow-md shadow-brand-primary/20">
                  {activeRoutine.tag}
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {activeRoutine.title}
                    </h3>
                    <button
                      onClick={() => onToggleHideRoutine?.(activeRoutine.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 ${
                        hiddenRoutineIds.includes(activeRoutine.id)
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-white/5 text-white/40 hover:text-rose-300 hover:bg-rose-500/10 border-white/5'
                      }`}
                      title="Ocultar este treino da rotina atual"
                    >
                      {hiddenRoutineIds.includes(activeRoutine.id) ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Ocultado (Restaurar)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Ocultar Treino</span>
                        </>
                      )}
                    </button>

                    {onStartWorkout && (
                      <button
                        onClick={() => onStartWorkout(activeRoutine)}
                        className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-brand-bg font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-brand-primary/20 hover:brightness-110 transition-all cursor-pointer shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-brand-bg" />
                        <span>Iniciar Este Treino Agora</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-1">
                    <span>Executado {activeRoutine.totalSessions} vezes</span>
                    {activeRoutine.lastPerformedDate && (
                      <>
                        <span>•</span>
                        <span>Última vez: {format(activeRoutine.lastPerformedDate, "dd 'de' MMMM", { locale: ptBR })} (há {activeRoutine.daysSinceLast} dias)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Box for Active Routine */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-4 py-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Total de Exercícios</span>
                <span className="text-lg font-bold text-white font-mono">{activeRoutine.totalExercises}</span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Estagnados</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-lg font-bold font-mono ${
                    activeRoutine.criticalCount > 0 ? 'text-rose-400' : activeRoutine.warningCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {activeRoutine.stagnatedCount}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">({activeRoutine.stagnationRate}%)</span>
                </div>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Críticos (6+ sessões)</span>
                <span className="text-lg font-bold text-rose-400 font-mono">{activeRoutine.criticalCount}</span>
              </div>

              <div className="px-4 py-2.5 rounded-xl bg-black/30 border border-white/5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Volume Médio</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  {activeRoutine.avgVolumeKg.toLocaleString()} kg
                </span>
              </div>
            </div>
          </div>

          {/* Stagnation Overview Alert Banner for this Routine */}
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            activeRoutine.criticalCount > 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : activeRoutine.warningCount > 0
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-start gap-3">
              {activeRoutine.criticalCount > 0 ? (
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              ) : activeRoutine.warningCount > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="text-sm font-bold text-white">
                  {activeRoutine.criticalCount > 0
                    ? `Atenção: ${activeRoutine.criticalCount} exercícios com carga travada há 6 ou mais treinos`
                    : activeRoutine.warningCount > 0
                    ? `Alerta: ${activeRoutine.warningCount} exercícios em estágio inicial de platô (3 a 5 treinos)`
                    : 'Excelente! Todos os exercícios desta rotina estão progredindo sem platô crítico'}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  {activeRoutine.stagnatedCount > 0
                    ? `A média de estagnação neste treino é de ${activeRoutine.avgStuckSessions} sessões sem aumento de carga. Consulte abaixo as sugestões de ajuste.`
                    : 'Cargas mantendo consistência de sobrecarga progressiva em relação aos treinos anteriores.'}
                </p>
              </div>
            </div>

            {/* Filter pills for exercises */}
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setExerciseFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  exerciseFilter === 'all'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Todos ({activeRoutine.totalExercises})
              </button>
              <button
                onClick={() => setExerciseFilter('stagnated')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  exerciseFilter === 'stagnated'
                    ? 'bg-rose-500/30 text-rose-200 font-bold'
                    : 'text-white/50 hover:text-rose-300'
                }`}
              >
                Estagnados ({activeRoutine.stagnatedCount})
              </button>
              <button
                onClick={() => setExerciseFilter('critical')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  exerciseFilter === 'critical'
                    ? 'bg-rose-500/40 text-rose-200 font-bold'
                    : 'text-white/50 hover:text-rose-400'
                }`}
              >
                Críticos ({activeRoutine.criticalCount})
              </button>
              <button
                onClick={() => setExerciseFilter('ok')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  exerciseFilter === 'ok'
                    ? 'bg-emerald-500/30 text-emerald-200 font-bold'
                    : 'text-white/50 hover:text-emerald-300'
                }`}
              >
                Evoluindo ({activeRoutine.okCount})
              </button>
            </div>
          </div>

          {/* EXERCISE LIST */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-white/50 px-2 font-mono">
              <span>Exercícios do {activeRoutine.title} ({filteredExercises.length})</span>
              <span>Carga Atual / Recorde / Séries</span>
            </div>

            {filteredExercises.length === 0 ? (
              <div className="p-8 text-center text-xs text-white/40 bg-black/20 rounded-2xl border border-white/5">
                Nenhum exercício encontrado para o filtro selecionado ({exerciseFilter}).
              </div>
            ) : (
              filteredExercises.map((ex, idx) => {
                const isCritical = ex.status === 'critical';
                const isWarning = ex.status === 'warning';

                return (
                  <div
                    key={`${ex.templateId}_${idx}`}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCritical
                        ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/50'
                        : isWarning
                        ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                        : 'bg-black/20 border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Exercise Name, Order and Stagnation Badge */}
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-white/5 text-white/50 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {ex.order || idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="text-sm font-bold text-white">
                              {ex.title}
                            </h5>
                            {isCritical ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                                <AlertOctagon className="w-3 h-3 text-rose-400" />
                                Platô Crítico ({ex.stuckSessions} sessões)
                              </span>
                            ) : isWarning ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                Em Atenção ({ex.stuckSessions} sessões)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Evoluindo
                              </span>
                            )}
                          </div>

                          {/* Actionable Plateau Tip */}
                          {ex.suggestion && (
                            <p className="text-[11px] text-white/60 mt-1 max-w-xl leading-relaxed">
                              💡 <span className="text-white/80 font-medium">Estratégia:</span> {ex.suggestion}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Load metrics and volume */}
                      <div className="flex items-center gap-5 shrink-0 self-end md:self-center">
                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Carga Atual</span>
                          <span className="text-base font-bold text-white font-mono">
                            {ex.lastWeightKg > 0 ? `${ex.lastWeightKg} kg` : 'Corporal'}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Recorde (PR)</span>
                          <span className="text-base font-bold text-brand-primary font-mono">
                            {ex.maxWeightKg > 0 ? `${ex.maxWeightKg} kg` : '—'}
                          </span>
                        </div>

                        <div className="text-right pl-3 border-l border-white/5">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 block font-bold">Volume Habitual</span>
                          <span className="text-xs text-white/70 font-mono">
                            {ex.lastSetsCount} × {ex.lastReps} reps
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MANAGE ROUTINES MODAL */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-brand-border rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Gerenciar Treinos da Minha Rotina</h3>
                    <p className="text-xs text-white/50">
                      Marque quais treinos fazem parte da sua rotina atual e oculte treinos iniciantes ou antigos.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2 mb-4 p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <button
                  onClick={handleHideAllBeginners}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Ocultar Iniciantes e Antigos (&gt;60 dias)</span>
                </button>

                <button
                  onClick={handleRestoreAll}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Exibir Todos os Treinos</span>
                </button>
              </div>

              {/* Routines Checklist */}
              <div className="overflow-y-auto space-y-2 pr-1 custom-scrollbar flex-1">
                {allRoutines.map((r) => {
                  const isHidden = hiddenRoutineIds.includes(r.id);
                  const isIncludedInCurrent = !isHidden;

                  return (
                    <div
                      key={r.id}
                      onClick={() => onToggleHideRoutine?.(r.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isIncludedInCurrent
                          ? 'bg-brand-primary/10 border-brand-primary/30 text-white'
                          : 'bg-black/20 border-white/5 text-white/40 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isIncludedInCurrent
                            ? 'bg-brand-primary text-brand-bg border-brand-primary'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {isIncludedInCurrent && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        <span className="w-6 h-6 rounded-lg bg-white/10 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {r.tag}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold truncate text-white">{r.title}</span>
                            {r.isHevyOfficialRoutine && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Oficial Hevy
                              </span>
                            )}
                            {r.isBeginnerOrLegacy && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Iniciante / Antigo
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/40 font-mono block mt-0.5">
                            {r.totalSessions} sessões • última {r.daysSinceLast < 999 ? `há ${r.daysSinceLast} dias` : '—'} • {r.totalExercises} exercícios
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isIncludedInCurrent
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}>
                          {isIncludedInCurrent ? 'Ativo na Rotina' : 'Ocultado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="border-t border-white/10 pt-4 mt-4 flex justify-between items-center">
                <span className="text-xs text-white/40">
                  {allRoutines.length - hiddenCount} de {allRoutines.length} treinos ativos na rotina
                </span>
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  Concluído
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
