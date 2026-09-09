import { useState, FormEvent } from 'react';
import { CheckCircle2, Clock, Dumbbell, Flame, X, AlertCircle, Loader2, Sparkles, Send } from 'lucide-react';
import { ActiveWorkoutSession } from '../types/workoutTracker';

interface WorkoutSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ActiveWorkoutSession;
  elapsedSeconds: number;
  totalVolumeKg: number;
  completedSetsCount: number;
  totalSetsCount: number;
  onConfirmSendToHevy: (customNotes?: string, isPrivate?: boolean) => Promise<void>;
  isSending: boolean;
  sendError: string | null;
}

export default function WorkoutSummaryModal({
  isOpen,
  onClose,
  session,
  elapsedSeconds,
  totalVolumeKg,
  completedSetsCount,
  totalSetsCount,
  onConfirmSendToHevy,
  isSending,
  sendError,
}: WorkoutSummaryModalProps) {
  const [notes, setNotes] = useState(session.notes || '');
  const [isPrivate, setIsPrivate] = useState(false);

  if (!isOpen) return null;

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onConfirmSendToHevy(notes, isPrivate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Top Celebration Icon */}
        <div className="flex items-start justify-between pb-4 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Treino Finalizado</span>
              <h2 className="text-xl font-bold text-white tracking-tight">{session.title}</h2>
            </div>
          </div>
          {!isSending && (
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-1 rounded-xl hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 my-5">
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center">
            <Clock className="w-4 h-4 text-brand-primary mb-1 opacity-80" />
            <span className="text-[10px] text-white/50 uppercase font-semibold">Duração</span>
            <span className="text-base font-bold text-white font-mono mt-0.5">{formatDuration(elapsedSeconds)}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center">
            <Flame className="w-4 h-4 text-amber-400 mb-1 opacity-80" />
            <span className="text-[10px] text-white/50 uppercase font-semibold">Volume Total</span>
            <span className="text-base font-bold text-white font-mono mt-0.5">{totalVolumeKg.toLocaleString('pt-BR')} kg</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center text-center">
            <Dumbbell className="w-4 h-4 text-emerald-400 mb-1 opacity-80" />
            <span className="text-[10px] text-white/50 uppercase font-semibold">Séries</span>
            <span className="text-base font-bold text-white font-mono mt-0.5">
              {completedSetsCount} / {totalSetsCount}
            </span>
          </div>
        </div>

        {/* Exercises Done List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar mb-4">
          <span className="text-xs font-semibold text-white/60">Resumo dos Exercícios Realizados:</span>
          {session.exercises.map((ex, idx) => {
            const completedSets = ex.sets.filter((s) => s.completed);
            const totalKg = completedSets.reduce((acc, s) => acc + (Number(s.weightKg) || 0) * (Number(s.reps) || 0), 0);

            return (
              <div
                key={ex.id || idx}
                className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-white">{ex.title}</span>
                  <div className="text-white/40 text-[11px] mt-0.5">
                    {completedSets.length} {completedSets.length === 1 ? 'série concluída' : 'séries concluídas'}
                    {totalKg > 0 && ` • ${totalKg.toLocaleString('pt-BR')} kg levantados`}
                  </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-mono font-bold">
                  {completedSets.length} / {ex.sets.length}
                </div>
              </div>
            );
          })}
        </div>

        {/* Workout Notes */}
        <div className="mb-4">
          <label className="text-xs text-white/60 font-semibold block mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            Anotações do Treino (Salvas no Hevy):
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Como foi a intensidade, fadiga ou observações..."
            rows={2}
            className="w-full bg-black/40 border border-brand-border rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-brand-primary resize-none"
            disabled={isSending}
          />
        </div>

        {/* Error Callout if any */}
        {sendError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Erro ao enviar para a API do Hevy:</span>
              <span className="opacity-90">{sendError}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Voltar ao Treino
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSending || completedSetsCount === 0}
            className="px-6 py-2.5 rounded-xl bg-brand-primary text-brand-bg font-bold text-xs flex items-center gap-2 hover:brightness-110 shadow-lg shadow-brand-primary/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando para Hevy...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Confirmar e Enviar ao Hevy</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
