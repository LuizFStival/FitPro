import { X, Play, Plus, Dumbbell, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { RoutineSplit } from '../types/plateau';

interface WorkoutLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  routines: RoutineSplit[];
  onSelectRoutine: (routine: RoutineSplit) => void;
  onStartEmpty: () => void;
  hasActiveSession?: boolean;
  onResumeActive?: () => void;
}

export default function WorkoutLauncherModal({
  isOpen,
  onClose,
  routines,
  onSelectRoutine,
  onStartEmpty,
  hasActiveSession = false,
  onResumeActive,
}: WorkoutLauncherModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-brand-surface border border-brand-border rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center">
              <Play className="w-5 h-5 fill-brand-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Iniciar Novo Treino</h3>
              <p className="text-xs text-white/50">Escolha uma rotina cadastrada ou inicie um treino livre</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-xl hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If Active Session Alert */}
        {hasActiveSession && onResumeActive && (
          <div className="my-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
              <div>
                <span className="text-xs font-bold text-emerald-400 block">Treino já em andamento!</span>
                <span className="text-[11px] text-emerald-300/70">Você tem uma sessão ativa no momento.</span>
              </div>
            </div>
            <button
              onClick={() => {
                onResumeActive();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition-all cursor-pointer shadow-md"
            >
              Continuar Treino
            </button>
          </div>
        )}

        {/* Routines List */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2.5 pr-1 custom-scrollbar">
          <div className="flex items-center justify-between text-xs font-semibold text-white/60 mb-1">
            <span>Rotinas Disponíveis:</span>
            <span className="font-mono text-brand-primary">{routines.length} rotinas</span>
          </div>

          {routines.map((routine) => (
            <div
              key={routine.id}
              className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary font-black text-sm flex items-center justify-center font-mono group-hover:bg-brand-primary group-hover:text-brand-bg transition-colors shrink-0">
                  {routine.tag}
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-white group-hover:text-brand-primary transition-colors">
                      {routine.title}
                    </h4>
                    {routine.isHevyOfficialRoutine && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Hevy Oficial
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40 mt-0.5">
                    <span>{routine.totalExercises} exercícios</span>
                    <span>•</span>
                    <span>Feito {routine.totalSessions}x</span>
                    {routine.stagnatedCount > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {routine.stagnatedCount} em platô
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectRoutine(routine);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-brand-primary text-brand-bg font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-brand-primary/20 hover:brightness-110 transition-all cursor-pointer shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-brand-bg" />
                <span>Iniciar Este Treino</span>
              </button>
            </div>
          ))}
        </div>

        {/* Empty / Blank Workout Button */}
        <div className="pt-4 border-t border-brand-border">
          <button
            onClick={() => {
              onStartEmpty();
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-brand-primary text-white text-xs font-bold flex items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-4 h-4 text-brand-primary group-hover:scale-110 transition-transform" />
            <span>Iniciar Treino Livre (Em Branco)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
