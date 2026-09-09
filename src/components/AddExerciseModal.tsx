import { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, X, Sparkles } from 'lucide-react';
import { ExerciseTemplateOption } from '../types/workoutTracker';

interface AddExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: { templateId: string; title: string; defaultWeight?: number; defaultReps?: number }) => void;
  availableTemplates: ExerciseTemplateOption[];
}

export default function AddExerciseModal({
  isOpen,
  onClose,
  onSelectExercise,
  availableTemplates,
}: AddExerciseModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [customTitle, setCustomTitle] = useState('');

  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableTemplates.slice(0, 30);
    }
    const term = searchTerm.toLowerCase().trim();
    return availableTemplates.filter((ex) => ex.title.toLowerCase().includes(term));
  }, [availableTemplates, searchTerm]);

  if (!isOpen) return null;

  const handleSelect = (template: ExerciseTemplateOption) => {
    onSelectExercise({
      templateId: template.templateId,
      title: template.title,
      defaultWeight: template.lastWeightKg,
      defaultReps: template.lastReps,
    });
    onClose();
  };

  const handleCreateCustom = () => {
    if (!customTitle.trim()) return;
    onSelectExercise({
      templateId: 'custom_' + Date.now().toString(36),
      title: customTitle.trim(),
      defaultWeight: 0,
      defaultReps: 10,
    });
    setCustomTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-brand-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Adicionar Exercício</h3>
              <p className="text-xs text-white/50">Selecione do histórico ou crie um novo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Buscar por nome do exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-brand-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-primary"
            autoFocus
          />
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 custom-scrollbar">
          {filteredExercises.length > 0 ? (
            filteredExercises.map((template) => (
              <button
                key={template.templateId}
                onClick={() => handleSelect(template)}
                className="w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-brand-primary/30 flex items-center justify-between transition-all text-left group"
              >
                <div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-brand-primary transition-colors">
                    {template.title}
                  </h4>
                  {typeof template.lastWeightKg === 'number' && template.lastWeightKg > 0 && (
                    <p className="text-xs text-white/40 mt-0.5">
                      Última carga registrada: <span className="text-white/70 font-mono font-bold">{template.lastWeightKg} kg</span>
                      {template.lastReps ? ` × ${template.lastReps} reps` : ''}
                    </p>
                  )}
                </div>
                <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-white/40">
              <p className="text-sm">Nenhum exercício encontrado com esse termo.</p>
            </div>
          )}
        </div>

        {/* Custom Exercise Section */}
        <div className="mt-4 pt-4 border-t border-brand-border">
          <div className="text-xs font-semibold text-white/60 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
            <span>Não encontrou? Crie um exercício personalizado:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex.: Supino Inclinado com Halteres 30º"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCustom();
              }}
              className="flex-1 bg-black/40 border border-brand-border rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-primary"
            />
            <button
              onClick={handleCreateCustom}
              disabled={!customTitle.trim()}
              className="px-4 py-2 rounded-xl bg-brand-primary text-brand-bg font-bold text-xs disabled:opacity-40 hover:brightness-110 transition-all shrink-0"
            >
              Criar e Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
