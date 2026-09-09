import { useState, useEffect } from 'react';
import { Dumbbell, Clock, Maximize2, Check, Flame } from 'lucide-react';
import { ActiveWorkoutSession } from '../types/workoutTracker';

interface ActiveWorkoutBarProps {
  session: ActiveWorkoutSession;
  onExpand: () => void;
  onFinishQuick: () => void;
}

export default function ActiveWorkoutBar({
  session,
  onExpand,
  onFinishQuick,
}: ActiveWorkoutBarProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const startMs = new Date(session.startTime).getTime();

    const updateTimer = () => {
      const nowMs = Date.now();
      const diffSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      setElapsedSeconds(diffSecs);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.startTime]);

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  let completedSets = 0;
  let totalSets = 0;
  let volume = 0;

  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      totalSets++;
      if (s.completed) {
        completedSets++;
        volume += (Number(s.weightKg) || 0) * (Number(s.reps) || 0);
      }
    }
  }

  return (
    <div className="fixed mobile-fixed-bottom left-3 right-3 lg:left-72 lg:right-8 z-40 animate-slideUp">
      <div className="rounded-2xl bg-brand-surface/95 backdrop-blur-md border border-brand-primary/40 p-3 shadow-2xl shadow-black/80 flex items-center justify-between gap-3">
        {/* Left: Info */}
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onExpand}>
          <div className="w-10 h-10 rounded-xl bg-brand-primary/15 border border-brand-primary/30 text-brand-primary flex items-center justify-center relative shrink-0">
            <Dumbbell className="w-5 h-5 animate-pulse" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-brand-surface" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Treino em Andamento
              </span>
              <span className="text-[11px] text-white/40 font-mono hidden sm:inline">
                • {completedSets}/{totalSets} séries
              </span>
            </div>
            <h4 className="text-sm font-bold text-white truncate">{session.title}</h4>
          </div>
        </div>

        {/* Center: Live Timer & Volume */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 font-mono">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
            <span className="text-sm font-black text-white">{formatTime(elapsedSeconds)}</span>
          </div>

          {volume > 0 && (
            <div className="hidden lg:flex items-center gap-1 text-xs font-mono text-white/70">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{volume.toLocaleString('pt-BR')} kg</span>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onExpand}
            className="px-3.5 py-1.5 rounded-xl bg-brand-primary text-brand-bg font-bold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-sm transition-all cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retornar ao Treino</span>
            <span className="sm:hidden">Voltar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
