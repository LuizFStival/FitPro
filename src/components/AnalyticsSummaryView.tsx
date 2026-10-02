import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  RefreshCw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import WorkoutChart from './WorkoutChart';
import { ExercisePlateau, RoutineSplit } from '../types/plateau';

interface AnalyticsSummaryViewProps {
  workouts: any[];
  plateaus: ExercisePlateau[];
  routines: RoutineSplit[];
  hiddenRoutineIds: string[];
  insights: string;
  lastSyncedAt: string | null;
  syncing: boolean;
  hasApiKey: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
  onOpenRoutines: () => void;
  onOpenPlateaus: () => void;
  onOpenWorkouts: (workoutId?: string) => void;
}

const parseWorkoutDate = (workout: any): Date => {
  const raw = workout?.startTime || workout?.start_time || workout?.createdAt;
  const date = raw?.toDate ? raw.toDate() : new Date(raw || 0);
  return isNaN(date.getTime()) ? new Date(0) : date;
};

const formatVolume = (value: number) => `${Math.round(value).toLocaleString()} kg`;
const visibleInsightLines = (insights: string) =>
  insights
    .split('\n')
    .map((line) => line.replace(/^[*•-]\s*/, '').trim())
    .filter((line) => line && !/^Volume\s*&\s*Sobrecarga:/i.test(line));

export default function AnalyticsSummaryView({
  workouts,
  plateaus,
  routines,
  hiddenRoutineIds,
  insights,
  lastSyncedAt,
  syncing,
  hasApiKey,
  onSync,
  onOpenSettings,
  onOpenRoutines,
  onOpenPlateaus,
  onOpenWorkouts,
}: AnalyticsSummaryViewProps) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const sortedWorkouts = [...workouts].sort((a, b) => parseWorkoutDate(b).getTime() - parseWorkoutDate(a).getTime());
  const weekWorkouts = sortedWorkouts.filter((workout) => parseWorkoutDate(workout).getTime() >= sevenDaysAgo);
  const monthWorkouts = sortedWorkouts.filter((workout) => parseWorkoutDate(workout).getTime() >= thirtyDaysAgo);
  const weekVolume = weekWorkouts.reduce((acc, workout) => acc + (Number(workout.totalVolume) || 0), 0);
  const monthVolume = monthWorkouts.reduce((acc, workout) => acc + (Number(workout.totalVolume) || 0), 0);
  const weekSets = weekWorkouts.reduce((acc, workout) => acc + (Number(workout.totalSets) || 0), 0);
  const monthAverageVolume = monthWorkouts.length > 0 ? Math.round(monthVolume / monthWorkouts.length) : 0;

  const criticalPlateaus = plateaus.filter((plateau) => plateau.status === 'critical');
  const warningPlateaus = plateaus.filter((plateau) => plateau.status === 'warning');
  const stuckExercises = [...criticalPlateaus, ...warningPlateaus]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'critical' ? -1 : 1;
      return b.stuckSessions - a.stuckSessions;
    })
    .slice(0, 5);

  const bestProgressions = plateaus
    .map((plateau) => {
      const history = plateau.sessionsHistory || [];
      if (history.length < 2) return null;
      const current = history[history.length - 1];
      const previous = history[history.length - 2];
      const gain = current.weightKg - previous.weightKg;
      if (gain <= 0) return null;
      return { plateau, gain, previousWeight: previous.weightKg, currentWeight: current.weightKg };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.gain - a.gain)
    .slice(0, 4) as { plateau: ExercisePlateau; gain: number; previousWeight: number; currentWeight: number }[];

  const visibleRoutines = routines.filter((routine) => !hiddenRoutineIds.includes(routine.id) && routine.isActiveRoutine);
  const nextRoutine = [...visibleRoutines].sort((a, b) => {
    const aDays = a.daysSinceLast >= 999 ? -1 : a.daysSinceLast;
    const bDays = b.daysSinceLast >= 999 ? -1 : b.daysSinceLast;
    return bDays - aDays;
  })[0] || visibleRoutines[0] || routines.find((routine) => !hiddenRoutineIds.includes(routine.id));

  const nextRoutineAlerts = nextRoutine
    ? nextRoutine.exercises
        .filter((exercise) => exercise.status === 'critical' || exercise.status === 'warning')
        .sort((a, b) => b.stuckSessions - a.stuckSessions)
        .slice(0, 4)
    : [];

  const lastWorkout = sortedWorkouts[0];
  const lastSyncLabel = lastSyncedAt
    ? format(new Date(lastSyncedAt), "dd/MM 'às' HH:mm", { locale: ptBR })
    : 'ainda não sincronizado';
  const readableInsights = visibleInsightLines(insights);

  const headlineCards = [
    {
      label: 'Frequência semanal',
      value: weekWorkouts.length,
      unit: weekWorkouts.length === 1 ? 'treino' : 'treinos',
      detail: `${monthWorkouts.length} nos últimos 30 dias`,
      icon: CalendarDays,
      tone: 'text-brand-primary',
    },
    {
      label: 'Volume da semana',
      value: formatVolume(weekVolume),
      unit: '',
      detail: `${weekSets} séries registradas no Hevy`,
      icon: TrendingUp,
      tone: 'text-emerald-300',
    },
    {
      label: 'Exercícios travados',
      value: criticalPlateaus.length + warningPlateaus.length,
      unit: criticalPlateaus.length > 0 ? `${criticalPlateaus.length} críticos` : 'em atenção',
      detail: `${plateaus.length} exercícios analisados`,
      icon: AlertTriangle,
      tone: criticalPlateaus.length > 0 ? 'text-rose-300' : 'text-amber-300',
    },
    {
      label: 'Média mensal',
      value: formatVolume(monthAverageVolume),
      unit: 'por treino',
      detail: `${formatVolume(monthVolume)} no mês`,
      icon: Activity,
      tone: 'text-white',
    },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-6 w-full pb-12">
      <section className="rounded-2xl sm:rounded-[2rem] bg-brand-surface border border-brand-border p-4 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em]">
              Analytics Hevy
            </span>
            <span className="text-[11px] text-white/35 font-mono">Sync: {lastSyncLabel}</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white">Resumo da Semana/Mês</h2>
            <p className="hidden sm:block text-sm text-white/45 mt-1 max-w-3xl leading-relaxed">
              Use antes da academia para decidir o foco do treino e depois do Hevy para acompanhar evolução, volume e alertas de estagnação.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2.5 shrink-0">
          <button
            type="button"
            onClick={hasApiKey ? onSync : onOpenSettings}
            disabled={syncing}
            className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-brand-primary text-brand-bg font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:brightness-110 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Sync...' : hasApiKey ? 'Sync Hevy' : 'Conectar'}
          </button>
          <button
            type="button"
            onClick={onOpenRoutines}
            className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white/85 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-brand-primary" />
            Treino do dia
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {headlineCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-2xl bg-brand-surface border border-brand-border p-3 sm:p-5 min-h-[6.5rem] sm:min-h-[8.5rem] flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.18em] text-white/35 font-bold">{card.label}</span>
                <Icon className={`w-4 h-4 ${card.tone}`} />
              </div>
              <div>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className={`text-xl sm:text-4xl font-light tracking-tight ${card.tone}`}>{card.value}</span>
                  {card.unit && <span className="text-[10px] sm:text-xs text-white/35 font-semibold">{card.unit}</span>}
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/40 mt-1 leading-tight">{card.detail}</p>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-6">
        <div className="order-2 xl:order-1 xl:col-span-7 rounded-2xl sm:rounded-[2rem] bg-brand-surface border border-brand-border p-4 sm:p-6 min-h-[17rem] sm:min-h-[22rem] flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Evolução de volume</h3>
              <p className="text-xs text-white/40">Últimas 10 sessões sincronizadas pelo Hevy</p>
            </div>
            {lastWorkout && (
              <button
                type="button"
                onClick={() => onOpenWorkouts(lastWorkout.id)}
                className="text-xs font-bold text-brand-primary hover:underline self-start sm:self-auto"
              >
                Último: {format(parseWorkoutDate(lastWorkout), 'dd/MM', { locale: ptBR })}
              </button>
            )}
          </div>
          <div className="flex-1 min-h-[12rem] sm:min-h-[16rem]">
            <WorkoutChart data={workouts} />
          </div>
        </div>

        <div className="order-1 xl:order-2 xl:col-span-5 rounded-2xl sm:rounded-[2rem] bg-brand-surface border border-brand-primary/25 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-lg shadow-brand-primary/5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Antes do próximo treino</h3>
              <p className="text-xs text-white/40">Abra isso antes de começar no Hevy.</p>
            </div>
            <Target className="w-5 h-5 text-brand-primary shrink-0 mt-1" />
          </div>

          {nextRoutine ? (
            <div className="rounded-2xl bg-black/25 border border-white/5 p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-brand-primary uppercase tracking-[0.16em] font-black">Treino sugerido hoje</span>
                  <h4 className="text-sm sm:text-base font-extrabold text-white text-wrap-safe mt-0.5">{nextRoutine.title}</h4>
                </div>
                <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand-primary text-brand-bg font-black flex items-center justify-center shrink-0">
                  {nextRoutine.tag || 'T'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white/5 p-2">
                  <div className="text-base font-mono font-bold text-white">{nextRoutine.totalExercises}</div>
                  <div className="text-[9px] text-white/35 uppercase">exercícios</div>
                </div>
                <div className="rounded-xl bg-white/5 p-2">
                  <div className="text-base font-mono font-bold text-amber-300">{nextRoutine.warningCount}</div>
                  <div className="text-[9px] text-white/35 uppercase">atenção</div>
                </div>
                <div className="rounded-xl bg-white/5 p-2">
                  <div className="text-base font-mono font-bold text-rose-300">{nextRoutine.criticalCount}</div>
                  <div className="text-[9px] text-white/35 uppercase">críticos</div>
                </div>
              </div>

              <div className="space-y-2">
                {(nextRoutineAlerts.length > 0 ? nextRoutineAlerts : nextRoutine.exercises.slice(0, 4)).map((exercise) => (
                  <div key={`${exercise.templateId}-${exercise.title}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] border border-white/5 p-2.5 sm:p-3">
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white text-wrap-safe">{exercise.title}</div>
                      <div className="text-[10px] text-white/35">
                        {exercise.lastWeightKg > 0 ? `${exercise.lastWeightKg} kg` : 'carga corporal'} · {exercise.lastSetsCount} séries
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-lg border ${
                      exercise.status === 'critical'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : exercise.status === 'warning'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}>
                      {exercise.status === 'critical' ? `${exercise.stuckSessions} parado` : exercise.status === 'warning' ? 'atenção' : 'ok'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenRoutines}
                className="w-full rounded-xl bg-white/5 border border-white/10 py-2.5 text-xs font-bold text-white/80 hover:bg-white/10 transition-colors"
              >
                Abrir roteiro completo
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-black/25 border border-white/5 p-6 text-center">
              <Dumbbell className="w-8 h-8 text-white/25 mx-auto mb-3" />
              <p className="text-sm font-bold text-white/75">Sincronize o Hevy para sugerir o próximo treino.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6">
        <div className="rounded-2xl sm:rounded-[2rem] bg-brand-surface border border-brand-border p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-white">Exercícios travados</h3>
              <p className="text-xs text-white/40">Prioridade de ajuste de carga, reps ou volume.</p>
            </div>
            <button type="button" onClick={onOpenPlateaus} className="text-xs font-bold text-brand-primary hover:underline">Ver todos</button>
          </div>
          <div className="space-y-2">
            {stuckExercises.length > 0 ? stuckExercises.map((plateau) => (
              <button
                key={plateau.exerciseTemplateId}
                type="button"
                onClick={onOpenPlateaus}
                className="w-full rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 p-3 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white text-wrap-safe">{plateau.exerciseTitle}</div>
                    <div className="text-[10px] text-white/35">{plateau.routineTitle}</div>
                  </div>
                  {plateau.status === 'critical' ? (
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </div>
                <div className="mt-2 text-[11px] text-white/55">
                  {plateau.currentWeightKg} kg há {plateau.stuckSessions} sessões
                </div>
              </button>
            )) : (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-200 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                Nenhum alerta forte de estagnação no histórico atual.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] bg-brand-surface border border-brand-border p-4 sm:p-6">
          <div className="mb-4">
            <h3 className="text-base font-bold text-white">Melhores evoluções</h3>
            <p className="text-xs text-white/40">Aumentos de carga mais recentes detectados.</p>
          </div>
          <div className="space-y-2">
            {bestProgressions.length > 0 ? bestProgressions.map((item) => (
              <div key={item.plateau.exerciseTemplateId} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white text-wrap-safe">{item.plateau.exerciseTitle}</div>
                    <div className="text-[10px] text-white/40">{item.plateau.routineTitle}</div>
                  </div>
                  <span className="text-sm font-black text-emerald-300 shrink-0">+{item.gain} kg</span>
                </div>
                <div className="mt-2 text-[11px] text-emerald-100/70">
                  {item.previousWeight} kg → {item.currentWeight} kg
                </div>
              </div>
            )) : (
              <div className="rounded-xl bg-white/5 border border-white/5 p-4 text-sm text-white/45">
                Ainda não há aumento de carga entre as últimas sessões analisadas.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl sm:rounded-[2rem] bg-gradient-to-br from-brand-surface to-brand-bg border border-white/10 p-4 sm:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
            <h3 className="text-base font-bold text-white">Leitura rápida</h3>
          </div>
          <div className="flex-1 overflow-y-auto text-sm text-white/75 leading-relaxed pr-1 custom-scrollbar">
            {readableInsights.length > 0 ? (
              <div className="space-y-3">
                {readableInsights.slice(0, 5).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-white/40 italic">Sincronize o histórico para gerar uma leitura automática de evolução e atenção.</p>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {['#SEMANA', '#MÊS', '#PLATÔ', '#PRÓXIMO_TREINO'].map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-[9px] border border-white/5 text-white/50">{tag}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
