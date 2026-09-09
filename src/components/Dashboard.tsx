import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Activity, Zap, Settings, RefreshCw, TrendingUp, Info, Layers, AlertOctagon, ClipboardList, Play, CheckCircle2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchAllHevyWorkouts, fetchHevyRoutines, postHevyWorkout, fetchExerciseTemplates } from '../services/hevyService';
import { generateWorkoutInsights } from '../services/aiService';
import { calculateExercisePlateaus } from '../services/plateauCalculator';
import { analyzeRoutineSplits } from '../services/routineAnalyzer';
import {
  buildSessionFromRoutineSplit,
  buildEmptySession,
  extractExerciseTemplatesFromWorkouts,
} from '../services/activeWorkoutBuilder';
import { ActiveWorkoutSession, ExerciseTemplateOption } from '../types/workoutTracker';
import WorkoutChart from './WorkoutChart';
import ExercisePlateauView from './ExercisePlateauView';
import WorkoutsView from './WorkoutsView';
import RoutinesView from './RoutinesView';
import ActiveWorkoutTracker from './ActiveWorkoutTracker';
import ActiveWorkoutBar from './ActiveWorkoutBar';
import WorkoutLauncherModal from './WorkoutLauncherModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface DashboardUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getUserStorageKey(userId: string, name: string) {
  return `hevy_${name}_${userId}`;
}

interface DashboardProps {
  user: DashboardUser;
}

export default function Dashboard({ user }: DashboardProps) {
  const [hevyApiKey, setHevyApiKey] = useState('');
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [insights, setInsights] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ page: number; totalPages: number; count: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'routines' | 'workouts' | 'plateau' | 'performance' | 'tracker'>('routines');
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [hevyRoutines, setHevyRoutines] = useState<any[]>([]);
  const [hiddenRoutineIds, setHiddenRoutineIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`hevy_hidden_routines_${user.uid}`) || '[]');
    } catch {
      return [];
    }
  });

  // Active Workout Tracking State
  const [activeSession, setActiveSession] = useState<ActiveWorkoutSession | null>(() => {
    try {
      const stored = localStorage.getItem(`hevy_active_workout_${user.uid}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isTrackerSending, setIsTrackerSending] = useState(false);
  const [trackerSendError, setTrackerSendError] = useState<string | null>(null);
  const [trackerSuccessMsg, setTrackerSuccessMsg] = useState<string | null>(null);
  const [apiTemplates, setApiTemplates] = useState<ExerciseTemplateOption[]>([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const plateaus = useMemo(() => calculateExercisePlateaus(workouts), [workouts]);
  const criticalCount = useMemo(() => plateaus.filter(p => p.status === 'critical').length, [plateaus]);
  const routines = useMemo(() => analyzeRoutineSplits(workouts, plateaus, hevyRoutines), [workouts, plateaus, hevyRoutines]);

  const availableTemplates = useMemo(() => {
    const fromWorkouts = extractExerciseTemplatesFromWorkouts(workouts);
    if (apiTemplates.length === 0) return fromWorkouts;
    const map = new Map<string, ExerciseTemplateOption>();
    for (const t of apiTemplates) {
      map.set(t.templateId, t);
    }
    for (const t of fromWorkouts) {
      map.set(t.templateId, t);
    }
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [workouts, apiTemplates]);

  // Workout Session Management Handlers
  const handleStartWorkoutFromRoutine = (routine: any) => {
    const session = buildSessionFromRoutineSplit(routine, plateaus);
    setActiveSession(session);
    try {
      localStorage.setItem(`hevy_active_workout_${user.uid}`, JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    setActiveTab('tracker');
  };

  const handleStartEmptyWorkout = () => {
    const session = buildEmptySession('Treino Livre');
    setActiveSession(session);
    try {
      localStorage.setItem(`hevy_active_workout_${user.uid}`, JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
    setActiveTab('tracker');
  };

  const handleUpdateActiveSession = (updated: ActiveWorkoutSession) => {
    setActiveSession(updated);
    try {
      localStorage.setItem(`hevy_active_workout_${user.uid}`, JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMinimizeTracker = () => {
    setActiveTab('routines');
  };

  const handleDiscardActiveWorkout = () => {
    setActiveSession(null);
    try {
      localStorage.removeItem(`hevy_active_workout_${user.uid}`);
    } catch (e) {
      console.error(e);
    }
    setActiveTab('routines');
  };

  const handleFinishAndSendToHevy = async (
    session: ActiveWorkoutSession,
    customNotes?: string,
    isPrivate?: boolean
  ) => {
    setIsTrackerSending(true);
    setTrackerSendError(null);
    try {
      const validExercises = session.exercises
        .map((ex) => {
          const completedSets = ex.sets.filter((s) => s.completed);
          if (completedSets.length === 0) return null;
          return {
            exercise_template_id: ex.templateId,
            notes: ex.notes || '',
            sets: completedSets.map((s) => ({
              type: s.type || 'normal',
              weight_kg: typeof s.weightKg === 'number' && s.weightKg > 0 ? s.weightKg : null,
              reps: typeof s.reps === 'number' && s.reps > 0 ? s.reps : null,
              rpe: typeof s.rpe === 'number' ? s.rpe : null,
            })),
          };
        })
        .filter(Boolean) as any[];

      if (validExercises.length === 0) {
        throw new Error('Nenhuma série foi marcada como concluída. Marque ao menos uma série antes de finalizar o treino.');
      }

      const payload = {
        title: session.title,
        description: customNotes || session.notes || 'Registrado pelo HevyPulse',
        start_time: session.startTime,
        end_time: new Date().toISOString(),
        is_private: Boolean(isPrivate),
        exercises: validExercises,
      };

      let hevyResult: any = null;
      let hevySyncSuccess = false;
      let syncNotice = '';

      if (hevyApiKey && hevyApiKey.trim()) {
        try {
          hevyResult = await postHevyWorkout(hevyApiKey, payload);
          hevySyncSuccess = true;
        } catch (apiErr: any) {
          console.warn('Aviso: falha na sincronização direta com a API do Hevy:', apiErr?.message || apiErr);
          syncNotice = apiErr.message || 'Falha ao sincronizar com a API do Hevy';
        }
      } else {
        syncNotice = 'Chave de API do Hevy não configurada';
      }

      let totalVolume = 0;
      let totalSets = 0;
      for (const ex of validExercises) {
        for (const s of ex.sets) {
          totalSets++;
          totalVolume += (Number(s.weight_kg) || 0) * (Number(s.reps) || 0);
        }
      }

      const workoutId = hevyResult?.id || hevyResult?.workout?.id || `local_${Date.now()}`;
      const localWorkout = {
        id: String(workoutId),
        hevyId: String(workoutId),
        userId: user.uid,
        title: session.title || 'Treino Concluído',
        description: payload.description || '',
        startTime: session.startTime || new Date().toISOString(),
        endTime: payload.end_time || new Date().toISOString(),
        totalVolume: totalVolume || 0,
        totalSets: totalSets || 0,
        totalExercises: validExercises.length,
        exercises: session.exercises.map((ex) => ({
          exercise_template_id: ex.templateId || '',
          title: ex.title || 'Exercício',
          notes: ex.notes || '',
          sets: ex.sets
            .filter((s) => s.completed)
            .map((s) => ({
              type: s.type || 'normal',
              weight_kg: typeof s.weightKg === 'number' ? s.weightKg : (Number(s.weightKg) || 0),
              reps: typeof s.reps === 'number' ? s.reps : (Number(s.reps) || 0),
              rpe: typeof s.rpe === 'number' && !isNaN(s.rpe) ? s.rpe : null,
            })),
        })),
        createdAt: new Date().toISOString(),
      };

      const nextWorkouts = [localWorkout, ...workouts.filter((w) => String(w.id) !== String(workoutId))];
      setWorkouts(nextWorkouts);
      writeLocalJson(getUserStorageKey(user.uid, 'workouts'), nextWorkouts);

      setActiveSession(null);
      localStorage.removeItem(`hevy_active_workout_${user.uid}`);

      if (hevySyncSuccess) {
        setTrackerSuccessMsg(`Treino "${session.title}" salvo com sucesso e enviado para o Hevy!`);
      } else {
        setTrackerSuccessMsg(`Treino "${session.title}" salvo com sucesso no histórico local! (${syncNotice})`);
      }
      setActiveTab('workouts');
      setTimeout(() => setTrackerSuccessMsg(null), 8000);
    } catch (error: any) {
      console.error('Erro ao enviar treino:', error);
      setTrackerSendError(error.message || 'Erro ao registrar treino no Hevy');
      throw error;
    } finally {
      setIsTrackerSending(false);
    }
  };

  const handleToggleHideRoutine = async (routineId: string) => {
    setHiddenRoutineIds((prev) => {
      const next = prev.includes(routineId)
        ? prev.filter((id) => id !== routineId)
        : [...prev, routineId];
      try {
        localStorage.setItem(`hevy_hidden_routines_${user.uid}`, JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleSetHiddenRoutines = async (routineIds: string[]) => {
    setHiddenRoutineIds(routineIds);
    try {
      localStorage.setItem(`hevy_hidden_routines_${user.uid}`, JSON.stringify(routineIds));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const currentApiKey = localStorage.getItem(getUserStorageKey(user.uid, 'api_key')) || '';
      setHevyApiKey(currentApiKey);

      const savedHiddenRoutineIds = readLocalJson<string[]>(getUserStorageKey(user.uid, 'hidden_routines'), []);
      if (savedHiddenRoutineIds.length > 0) {
        setHiddenRoutineIds(savedHiddenRoutineIds);
      }

      const realSyncTime = localStorage.getItem(`hevy_last_synced_${user.uid}`) || null;
      setLastSyncedAt(realSyncTime);

      const workoutsData = readLocalJson<any[]>(getUserStorageKey(user.uid, 'workouts'), []);
      setWorkouts(workoutsData);

      if (workoutsData.length > 0) {
        generateInsights(workoutsData);
      } else if (currentApiKey) {
        setTimeout(() => {
          handleSync(currentApiKey);
        }, 100);
      }

      if (currentApiKey) {
        fetchHevyRoutines(currentApiKey)
          .then((r) => {
            if (Array.isArray(r) && r.length > 0) {
              setHevyRoutines(r);
            }
          })
          .catch(() => {});

        fetchExerciseTemplates(currentApiKey)
          .then((t) => {
            if (Array.isArray(t) && t.length > 0) {
              setApiTemplates(
                t.map((item: any) => ({
                  templateId: item.id || item.exercise_template_id,
                  title: item.title || item.name || 'Exercício',
                  muscleGroup: item.muscle_group || item.primary_muscle_group,
                }))
              );
            }
          })
          .catch(() => {});
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (keyOverride?: string) => {
    const keyToUse = (keyOverride || hevyApiKey || '').trim();
    if (!keyToUse) {
      setIsSettingsOpen(true);
      return;
    }

    setSyncing(true);
    setSyncError(null);
    setSyncProgress({ page: 1, totalPages: 1, count: 0 });

    try {
      // Also fetch routines
      fetchHevyRoutines(keyToUse)
        .then((r) => {
          if (Array.isArray(r) && r.length > 0) {
            setHevyRoutines(r);
          }
        })
        .catch(() => {});

      const result = await fetchAllHevyWorkouts(keyToUse, (page, totalPages, count) => {
        setSyncProgress({ page, totalPages, count });
      });

      if (result.workouts.length === 0) {
        setSyncError('Nenhum treino retornado pela API do Hevy (histórico vazio ou sem treinos registrados).');
      }

      const workoutsData = result.workouts.map((workout) => {
        let volume = 0;
        let sets = 0;
        (workout.exercises || []).forEach((ex: any) => {
          (ex.sets || []).forEach((set: any) => {
            volume += (Number(set.weight_kg) || 0) * (Number(set.reps) || 0);
            sets++;
          });
        });

        return {
          userId: user.uid,
          id: workout.id || '',
          title: workout.title || 'Treino Hevy',
          description: workout.description || '',
          startTime: workout.start_time || new Date().toISOString(),
          endTime: workout.end_time || new Date().toISOString(),
          duration: Number((workout as any).duration) || 0,
          totalVolume: volume,
          totalSets: sets,
          exercises: workout.exercises || [],
          createdAt: new Date().toISOString(),
        };
      });

      setWorkouts(workoutsData);
      writeLocalJson(getUserStorageKey(user.uid, 'workouts'), workoutsData);
      setLastSyncedAt(result.syncedAt);
      localStorage.setItem(`hevy_last_synced_${user.uid}`, result.syncedAt);

      if (workoutsData.length > 0) {
        generateInsights(workoutsData);
      }
    } catch (error: any) {
      console.error("Sync Error:", error);
      const errMsg = error.message || 'Falha ao sincronizar com a API do Hevy';
      setSyncError(errMsg);
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem(getUserStorageKey(user.uid, 'api_key'), hevyApiKey.trim());
      setIsSettingsOpen(false);
      handleSync(hevyApiKey.trim());
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setSyncError("Falha ao salvar configurações: " + (error.message || ''));
    }
  };

  const generateInsights = async (data: any[]) => {
    try {
      const aiInsight = await generateWorkoutInsights(data);
      setInsights(aiInsight || '');
    } catch (e) {
      console.error("Failed to generate AI insights:", e);
    }
  };

  const stats = [
    { 
      label: 'Score de Consistência', 
      value: '94.8', 
      icon: Zap, 
      color: 'text-[#4FACFE]', 
      sub: '92% da meta atingida', 
      unit: '%' 
    },
    { 
      label: 'Volume Recente', 
      value: `${Math.round(workouts.slice(0, 7).reduce((acc, w) => acc + (w.totalVolume || 0), 0)).toLocaleString()}`, 
      icon: TrendingUp, 
      color: 'text-white', 
      sub: 'últimas 7 sessões', 
      unit: 'kg' 
    },
    { 
      label: 'Frequência Média', 
      value: Math.round((workouts.length / Math.max(1, Math.min(12, workouts.length / 3))) * 10) / 10, 
      icon: Activity, 
      color: 'text-white', 
      sub: 'sessões / semana', 
      unit: '' 
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-bg text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
          <span className="text-sm font-medium text-white/60">Carregando dados do HevyPulse...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col lg:flex-row h-screen bg-brand-bg text-[#F5F5F7] overflow-hidden ${activeTab === 'tracker' ? 'p-2 sm:p-4 lg:p-6 gap-2 lg:gap-6' : 'p-4 lg:p-6 gap-6'}`}>
      {/* Left Sidebar: Navigation, Identity & API */}
      <aside className={`w-full lg:w-64 flex flex-col gap-6 lg:h-full shrink-0 ${activeTab === 'tracker' ? 'hidden lg:flex' : ''}`}>
        <div className="p-5 lg:p-6 rounded-[2rem] bg-brand-surface border border-brand-border flex flex-row lg:flex-col items-center text-left lg:text-center gap-4 lg:gap-0">
          <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-gradient-to-tr from-brand-accent to-brand-primary p-1 lg:mb-4 shrink-0">
            <div className="w-full h-full rounded-full bg-brand-bg flex items-center justify-center overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl lg:text-2xl font-light tracking-tighter">
                  {user.displayName?.split(' ').map(n => n[0]).join('')}
                </span>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg lg:text-xl font-semibold tracking-tight">{user.displayName || 'Atleta'}</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Perfil • Ativo</p>
          </div>
        </div>

        <div className="flex-1 rounded-[2rem] bg-brand-surface border border-brand-border p-5 lg:p-6 flex flex-col gap-5 overflow-hidden">
          {/* System & API Status */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Status da API</div>
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${hevyApiKey ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]'}`}></div>
              <span className="text-xs font-medium truncate">
                {hevyApiKey ? 'Hevy API Conectada' : 'Chave não informada'}
              </span>
            </div>
            {lastSyncedAt && (
              <div className="text-[10px] text-white/30 truncate">
                Sync: {format(new Date(lastSyncedAt), 'dd/MM HH:mm', { locale: ptBR })}
              </div>
            )}
          </div>
          
          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {/* Dedicated Start Workout CTA */}
            <button
              onClick={() => setIsLauncherOpen(true)}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-brand-primary text-brand-bg font-black text-sm shadow-lg shadow-brand-primary/25 hover:brightness-110 transition-all cursor-pointer mb-1"
            >
              <Play className="w-4 h-4 fill-brand-bg" />
              <span>Iniciar Novo Treino</span>
            </button>

            {/* Active Workout Session Link if Running */}
            {activeSession && (
              <button
                onClick={() => setActiveTab('tracker')}
                className={`flex items-center justify-between p-3 rounded-2xl transition-all text-left mb-1 ${
                  activeTab === 'tracker'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <Dumbbell className="w-4 h-4 text-emerald-400" />
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  </div>
                  <span className="text-xs font-bold">Treino em Andamento</span>
                </div>
                <span className="text-[9px] uppercase font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ao Vivo
                </span>
              </button>
            )}

            <button 
              onClick={() => setActiveTab('routines')}
              className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                activeTab === 'routines' 
                  ? 'bg-white/10 text-white font-semibold border border-white/10' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className={`w-4 h-4 ${activeTab === 'routines' ? 'text-brand-primary' : 'text-white/40'}`} />
                <span className="text-sm">Treinos A, B, C</span>
              </div>
              {routines.length > 0 ? (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-semibold">
                  {routines.length} {routines.length === 1 ? 'rotina' : 'rotinas'}
                </span>
              ) : null}
            </button>

            <button 
              onClick={() => setActiveTab('workouts')}
              className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                activeTab === 'workouts' 
                  ? 'bg-white/10 text-white font-semibold border border-white/10' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Dumbbell className={`w-4 h-4 ${activeTab === 'workouts' ? 'text-brand-primary' : 'text-white/40'}`} />
                <span className="text-sm">Histórico de Treinos</span>
              </div>
              {workouts.length > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/10 font-semibold">
                  {workouts.length}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('plateau')}
              className={`flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                activeTab === 'plateau' 
                  ? 'bg-white/10 text-white font-semibold border border-white/10' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Layers className={`w-4 h-4 ${activeTab === 'plateau' ? 'text-brand-primary' : 'text-white/40'}`} />
                <span className="text-sm">Estagnação de Carga</span>
              </div>
              {criticalCount > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
                  {criticalCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                activeTab === 'performance' 
                  ? 'bg-white/10 text-white font-semibold border border-white/10' 
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className={`w-4 h-4 ${activeTab === 'performance' ? 'text-brand-primary' : 'text-white/40'}`} />
              <span className="text-sm">Performance Hub</span>
            </button>

            <button 
              onClick={() => handleSync()}
              disabled={syncing}
              className="flex items-center gap-3 p-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-left disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-brand-primary' : ''}`} />
              <span className="text-sm">{syncing ? 'Sincronizando...' : 'Sincronizar API'}</span>
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-3 p-3 rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all text-left"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Configurações API</span>
            </button>
          </nav>

          {/* Quick AI Quote */}
          <div className="mt-auto hidden lg:block">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
              <p className="text-[11px] text-white/40 leading-relaxed italic">
                "{insights ? insights.split('\n')[0].replace(/^[*-]\s*/, '').slice(0, 75) + '...' : 'Monitore seus treinos para análises profundas de adaptação e força.'}"
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto pr-1 lg:pr-2 custom-scrollbar min-w-0">
        {/* Success Banner if Workout Sent */}
        {trackerSuccessMsg && (
          <div className="mb-4 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between gap-3 shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">{trackerSuccessMsg}</span>
            </div>
            <button
              onClick={() => setTrackerSuccessMsg(null)}
              className="text-white/40 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'tracker' && activeSession ? (
          <ActiveWorkoutTracker
            session={activeSession}
            onUpdateSession={handleUpdateActiveSession}
            onMinimize={handleMinimizeTracker}
            onDiscard={handleDiscardActiveWorkout}
            onFinishAndSend={handleFinishAndSendToHevy}
            isSending={isTrackerSending}
            sendError={trackerSendError}
            availableTemplates={availableTemplates}
            plateaus={plateaus}
          />
        ) : activeTab === 'routines' ? (
          <RoutinesView
            workouts={workouts}
            plateaus={plateaus}
            hevyRoutines={hevyRoutines}
            hiddenRoutineIds={hiddenRoutineIds}
            onToggleHideRoutine={handleToggleHideRoutine}
            onSetHiddenRoutines={handleSetHiddenRoutines}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onSync={() => handleSync()}
            syncing={syncing}
            onStartWorkout={handleStartWorkoutFromRoutine}
            onStartEmptyWorkout={handleStartEmptyWorkout}
          />
        ) : activeTab === 'workouts' ? (
          <WorkoutsView
            workouts={workouts}
            plateaus={plateaus}
            hiddenRoutineIds={hiddenRoutineIds}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
            syncProgress={syncProgress}
            syncError={syncError}
            onSync={() => handleSync()}
            onOpenSettings={() => setIsSettingsOpen(true)}
            hasApiKey={Boolean(hevyApiKey)}
            initialSelectedWorkoutId={selectedWorkoutId}
          />
        ) : activeTab === 'plateau' ? (
          <ExercisePlateauView
            plateaus={plateaus}
            lastSyncedAt={lastSyncedAt}
            syncing={syncing}
            syncProgress={syncProgress}
            syncError={syncError}
            onSync={() => handleSync()}
            onOpenSettings={() => setIsSettingsOpen(true)}
            hasApiKey={Boolean(hevyApiKey)}
          />
        ) : (
          <div className="flex flex-col gap-6 w-full pb-10">
            {/* Critical Alert Callout if plateaus detected */}
            {criticalCount > 0 && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <h5 className="text-sm font-semibold text-rose-300">
                      {criticalCount} exercício(s) em Platô Crítico (6+ sessões sem aumento de carga)
                    </h5>
                    <p className="text-xs text-rose-200/60 mt-0.5">
                      Sua taxa de progressão estagnou nestes exercícios. Considere deload ou ajuste de volume.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('plateau')}
                  className="shrink-0 px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold border border-rose-500/40 transition-colors"
                >
                  Ver Estagnação
                </button>
              </div>
            )}

            {/* Top Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-40 shrink-0">
              {stats.map((stat, idx) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="rounded-[2rem] bg-brand-surface border border-brand-border p-6 flex flex-col justify-between"
                >
                  <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{stat.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-4xl lg:text-5xl font-light leading-none tracking-tighter ${stat.color}`}>
                      {stat.value}
                    </span>
                    <span className="text-lg text-white/20 uppercase">{stat.unit}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[11px] text-white/40 flex items-center gap-1">
                      {stat.sub}
                    </div>
                    {stat.label === 'Score de Consistência' && (
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-primary h-full rounded-full shadow-[0_0_15px_rgba(79,172,254,0.4)]" 
                          style={{ width: `${stat.value}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Central Chart Area */}
            <div className="flex-1 min-h-[400px] rounded-[2rem] bg-brand-surface border border-brand-border p-8 flex flex-col">
              <div className="flex justify-between items-center mb-8 shrink-0">
                <div>
                  <h3 className="text-lg font-medium tracking-tight">Análise de Progressão de Carga</h3>
                  <p className="text-sm text-white/40">Volume Total • Janela das 10 Últimas Sessões</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-primary"></div>
                    <span className="text-xs text-white/60">Volume Total (kg)</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full min-h-0">
                <WorkoutChart data={workouts} />
              </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-auto lg:h-56 shrink-0 mb-4">
              <div className="lg:col-span-2 rounded-[2rem] bg-brand-surface border border-brand-border p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-bold">Sessões Recentes</h4>
                  <button
                    onClick={() => setActiveTab('workouts')}
                    className="text-[11px] text-brand-primary hover:underline font-semibold"
                  >
                    Ver todas ({workouts.length})
                  </button>
                </div>
                <div className="space-y-2 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {workouts.slice(0, 4).map((w, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setSelectedWorkoutId(w.id);
                        setActiveTab('workouts');
                      }}
                      className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 hover:bg-white/10 px-2 rounded-lg transition-colors cursor-pointer group"
                      title="Clique para abrir detalhes do treino"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm text-white/80 group-hover:text-white font-medium truncate max-w-[140px]">{w.title}</span>
                        <span className="text-[9px] text-white/30 uppercase">
                          {format(w.startTime?.toDate ? w.startTime.toDate() : new Date(w.startTime), 'dd MMM', { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-emerald-400 font-mono">{Math.round(w.totalVolume).toLocaleString()} kg</span>
                        <span className="text-xs text-white/20 group-hover:text-brand-primary">›</span>
                      </div>
                    </div>
                  ))}
                  {workouts.length === 0 && (
                    <div className="text-xs text-white/20 italic p-4 text-center">Nenhum dado de treino sincronizado</div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-3 rounded-[2rem] bg-gradient-to-br from-brand-surface to-brand-bg border border-white/10 p-6 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
                  <h4 className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">Insights com IA</h4>
                </div>
                <div className="flex-1 overflow-y-auto text-sm text-white/80 leading-relaxed pr-2 custom-scrollbar">
                  {insights ? (
                    <div className="space-y-3">
                      {insights.split('\n').filter(l => l.trim()).map((line, idx) => (
                        <p key={idx}>{line.replace(/^[*-]\s*/, '')}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/40 italic">Processando histórico para gerar diagnósticos de força e hipertrofia...</p>
                  )}
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['#PERFORMANCE', '#VOLUME', '#ADAPTAÇÃO'].map(tag => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-white/5 text-[9px] border border-white/5 whitespace-nowrap">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Persistent Floating Bottom Bar for Active Workout when Minimized */}
      {activeSession && activeTab !== 'tracker' && (
        <ActiveWorkoutBar
          session={activeSession}
          onExpand={() => setActiveTab('tracker')}
          onFinishQuick={() => setActiveTab('tracker')}
        />
      )}

      {/* Workout Launcher Modal */}
      <WorkoutLauncherModal
        isOpen={isLauncherOpen}
        onClose={() => setIsLauncherOpen(false)}
        routines={routines}
        onSelectRoutine={handleStartWorkoutFromRoutine}
        onStartEmpty={handleStartEmptyWorkout}
        hasActiveSession={Boolean(activeSession)}
        onResumeActive={() => setActiveTab('tracker')}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-md bg-brand-surface shadow-2xl rounded-3xl border border-white/10"
          >
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <div>
                <h3 className="font-bold text-xl text-white">Configuração da API Hevy</h3>
                <p className="text-xs text-white/40 mt-0.5">Conecte sua conta para sincronização direta</p>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Hevy API Key
                </label>
                <input 
                  type="password"
                  value={hevyApiKey}
                  onChange={(e) => setHevyApiKey(e.target.value)}
                  placeholder="hvy_..."
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-brand-primary outline-none transition-colors font-mono"
                />
                <p className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5 leading-relaxed">
                  <Info className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                  Obtenha sua chave em <strong>Perfil &gt; Configurações &gt; API</strong> no aplicativo Hevy Pro.
                </p>
              </div>

              {lastSyncedAt && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60">
                  Última sincronização bem-sucedida: <strong className="text-white font-mono">{format(new Date(lastSyncedAt), 'dd/MM/yyyy HH:mm:ss')}</strong>
                </div>
              )}

              <div className="pt-2">
                <button 
                  onClick={saveSettings}
                  disabled={syncing}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Sincronizando...' : 'Salvar e Sincronizar Histórico Completo'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
