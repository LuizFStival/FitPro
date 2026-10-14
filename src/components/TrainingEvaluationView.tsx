import { ComponentProps, FormEvent, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Activity, ArrowDownRight, ArrowUpRight, ClipboardList, RefreshCw, Plus, X } from 'lucide-react';
import AnalyticsSummaryView from './AnalyticsSummaryView';
import { evaluateExercise, changeLabels, PerformanceChange } from '../services/trainingEvaluation';
import { getRoutineStorageId } from '../services/routineIdentity';

type Props = ComponentProps<typeof AnalyticsSummaryView> & { userId: string };
type Measurement = { date: string; weight?: number; waist?: number; hill?: number };
const tones: Record<PerformanceChange, string> = {
  up: 'bg-emerald-400 text-black', down: 'bg-rose-400 text-black', stable: 'bg-amber-300 text-black',
  return: 'bg-sky-300 text-black', unknown: 'bg-white/10 text-white/40',
};
const symbols: Record<PerformanceChange, string> = { up: '+', down: '-', stable: '=', return: 'R', unknown: '?' };

export default function TrainingEvaluationView(props: Props) {
  const [period, setPeriod] = useState(30);
  const [routineFilter, setRoutineFilter] = useState('all');
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const storageKey = `hevy_assessments_${props.userId}`;
  const [measurements, setMeasurements] = useState<Measurement[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [measureError, setMeasureError] = useState('');
  const cutoff = Date.now() - period * 86400000;
  const routines = props.routines.filter((routine) => routine.isActiveRoutine && !props.hiddenRoutineIds.includes(routine.id));
  const routineIds = new Set(routines.map((routine) => routine.id));
  const evaluations = useMemo(() => props.plateaus
    .filter((plateau) => plateau.isActiveInCurrentRoutine !== false && !props.hiddenRoutineIds.includes(plateau.routineId || ''))
    .filter((plateau) => routineFilter === 'all' || plateau.routineId === routineFilter)
    .map((plateau) => evaluateExercise(plateau, cutoff))
    .filter((evaluation) => evaluation.latest), [props.plateaus, props.hiddenRoutineIds, routineFilter, period]);
  const workouts = props.workouts.filter((workout) => {
    const date = new Date(workout.startTime || workout.start_time).getTime();
    const id = getRoutineStorageId(workout.title);
    return date >= cutoff && routineIds.has(id) && (routineFilter === 'all' || routineFilter === id);
  }).sort((a, b) => new Date(b.startTime || b.start_time).getTime() - new Date(a.startTime || a.start_time).getTime());
  const counts = (change: PerformanceChange) => evaluations.filter((evaluation) => evaluation.latest?.change === change).length;
  const alerts = evaluations.filter(({ plateau }) => plateau.status === 'warning' || plateau.status === 'critical');
  const recentMeasures = measurements.filter((measurement) => new Date(`${measurement.date}T12:00:00`).getTime() >= cutoff);
  const measurementDelta = (key: 'weight' | 'waist' | 'hill') => {
    const measured = recentMeasures.filter((measurement) => measurement[key] !== undefined);
    if (!measured.length) return { value: 'Sem registro', delta: 'Registrar avaliação' };
    const last = measured.at(-1)!;
    const delta = (last[key] || 0) - (measured[0][key] || 0);
    return { value: String(last[key]), delta: measured.length < 2 ? `1 registro · ${last.date.split('-').reverse().join('/')}` : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} no período · ${measured.length} registros` };
  };
  const saveMeasurement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const date = String(data.get('date'));
    const measurement: Measurement = { date };
    for (const key of ['weight', 'waist', 'hill'] as const) {
      const raw = String(data.get(key) || '').trim();
      if (raw) measurement[key] = Number(raw);
    }
    if (!measurement.weight && !measurement.waist && !measurement.hill) { setMeasureError('Preencha ao menos uma medida.'); return; }
    const next = [...measurements.filter((item) => item.date !== date), measurement].sort((a, b) => a.date.localeCompare(b.date));
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setMeasurements(next); setShowMeasure(false); setMeasureError(''); }
    catch { setMeasureError('Não foi possível salvar neste navegador.'); }
  };

  return <div className="w-full min-w-0 pb-12 text-white space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
      <div><h2 className="text-xl sm:text-2xl font-bold">Sua evolução</h2>
        <p className="text-xs text-white/50 mt-1">Treino, consistência e objetivos · últimos {period} dias</p>
        <p className="text-[10px] text-white/35 mt-1">Hevy: {props.lastSyncedAt ? format(new Date(props.lastSyncedAt), 'dd/MM HH:mm') : 'sem sincronização'}</p></div>
      <button onClick={props.hasApiKey ? props.onSync : props.onOpenSettings} disabled={props.syncing} className="p-2 rounded-lg bg-white/5 border border-white/10" aria-label="Atualizar Hevy" title="Atualizar Hevy"><RefreshCw className={`h-4 w-4 ${props.syncing ? 'animate-spin' : ''}`} /></button>
    </header>
    <div className="flex flex-wrap justify-between gap-3">
      <div className="flex gap-1" role="group" aria-label="Período">{[30, 90].map((days) => <button key={days} aria-pressed={period === days} onClick={() => setPeriod(days)} className={`px-3 py-2 text-xs rounded-lg ${period === days ? 'bg-brand-primary text-black' : 'bg-white/5 text-white/60'}`}>{days} dias</button>)}</div>
      <select value={routineFilter} onChange={(event) => setRoutineFilter(event.target.value)} aria-label="Treino" className="bg-brand-surface border border-white/10 rounded-lg p-2 text-xs max-w-full"><option value="all">Todos os treinos ativos</option>{routines.map((routine) => <option key={routine.id} value={routine.id}>{routine.title}</option>)}</select>
    </div>
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Resumo do período">
      {[
        ['Consistência', `${(workouts.length / (period / 7)).toFixed(1)}/sem`, `${workouts.length} treinos em ${period} dias`],
        ['Evoluíram', counts('up'), 'Carga, reps ou volume na última sessão'],
        ['Merecem atenção', alerts.length, 'Exercícios ativos com platô recente'],
        ['Abaixo da anterior', counts('down'), 'Queda pontual; não confirma regressão'],
      ].map(([label, value, detail]) => <div key={label} className="border-l-2 border-brand-primary/50 px-3 py-2 min-w-0"><p className="text-xs text-white/50">{label}</p><p className="text-2xl font-bold my-1">{value}</p><p className="text-[10px] text-white/40">{detail}</p></div>)}
    </section>
    <section className="border-y border-white/10 py-4 space-y-3">
      <h3 className="text-sm font-bold">Leitura dos treinos A / B / C</h3>
      <div className="grid sm:grid-cols-3 gap-3">{routines.filter((routine) => routineFilter === 'all' || routine.id === routineFilter).map((routine) => {
        const items = evaluations.filter((item) => item.plateau.routineId === routine.id);
        const up = items.filter((item) => item.latest?.change === 'up').length;
        const stuck = items.filter((item) => ['warning', 'critical'].includes(item.plateau.status)).length;
        return <button key={routine.id} onClick={() => setRoutineFilter(routine.id)} className="text-left bg-brand-surface border border-white/10 rounded-lg p-3 min-w-0">
          <div className="flex justify-between gap-2"><span className="font-bold">Treino {routine.tag}</span><span className="text-[10px] text-white/40">{items.length} analisados</span></div>
          <p className="text-xs text-white/65 mt-2">{!items.length ? 'Sem sessões recentes para avaliar' : `${up} evoluíram · ${stuck} em atenção`}</p>
          <div className="flex gap-1 mt-3 h-2" aria-hidden="true">{items.map((item) => <span key={item.plateau.exerciseTemplateId} className={`flex-1 rounded-sm ${tones[item.latest!.change]}`} />)}</div>
        </button>;
      })}</div>
    </section>
    <section className="space-y-3">
      <div><h3 className="text-sm font-bold">Mapa de evolução</h3><p className="text-[11px] text-white/40 mt-1">Últimas 8 sessões de cada exercício no período, da mais antiga à mais recente</p></div>
      <div className="flex flex-wrap gap-3 text-[10px] text-white/60">{Object.entries(changeLabels).map(([key, label]) => <span key={key} className="inline-flex items-center gap-1"><span className={`h-4 w-4 rounded-sm text-center ${tones[key as PerformanceChange]}`}>{symbols[key as PerformanceChange]}</span>{label}</span>)}</div>
      {!evaluations.length && <p className="py-6 text-sm text-white/45">Nenhum exercício ativo com sessões neste período.</p>}
      <div className="divide-y divide-white/5">{(showAllExercises ? evaluations : evaluations.slice(0, 4)).map(({ plateau, recent, latest }) => <div key={`${plateau.routineId}::${plateau.exerciseTemplateId}`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] py-2 min-w-0">
        <div className="min-w-0"><p className="text-xs font-semibold break-words">{plateau.exerciseTitle}</p><p className="text-[10px] text-white/40 mt-1 break-words">{plateau.routineTitle} · {format(plateau.lastSessionDate, 'dd/MM')} · {plateau.stuckSessions} sessões sem progresso</p>
          <p className="text-[11px] text-white/65 mt-1">{latest!.session.weightKg} kg · {latest!.session.totalReps || 0} reps totais {latest?.previous ? `· antes: ${latest.previous.weightKg} kg / ${latest.previous.totalReps || 0} reps` : ''}</p></div>
        <div className="flex gap-1 items-center">{recent.slice(-8).map(({ session, change }) => <span key={`${session.workoutId}:${session.exerciseTemplateId}`} tabIndex={0} title={`${format(session.date, 'dd/MM')}: ${changeLabels[change]} · ${session.exerciseTitle} · ${session.weightKg} kg · ${session.totalReps || 0} reps`} className={`h-7 w-7 flex items-center justify-center text-xs font-bold rounded-sm ${tones[change]}`}>{symbols[change]}</span>)}</div>
      </div>)}</div>
      {evaluations.length > 4 && <button type="button" aria-expanded={showAllExercises} onClick={() => setShowAllExercises((value) => !value)} className="text-xs font-semibold text-brand-primary py-2">{showAllExercises ? 'Recolher exercícios' : `Ver todos os ${evaluations.length} exercícios`}</button>}
    </section>
    <section className="border-t border-white/10 pt-4 space-y-3">
      <h3 className="text-sm font-bold">Antes do próximo treino</h3>
      {alerts.length ? alerts.slice(0, 4).map(({ plateau }) => <button onClick={props.onOpenPlateaus} key={`${plateau.routineId}:${plateau.exerciseTemplateId}`} className="w-full text-left border-l-2 border-amber-400 bg-amber-400/5 p-3"><p className="text-xs font-semibold">{plateau.exerciseTitle}</p><p className="text-[11px] text-white/50 mt-1">{plateau.routineTitle} · {plateau.stuckSessions} sessões sem progresso · última em {format(plateau.lastSessionDate, 'dd/MM')}</p></button>) : <p className="text-xs text-white/50">Sem platôs recentes entre os exercícios ativos analisados.</p>}
      <button onClick={props.onOpenRoutines} className="inline-flex items-center gap-2 text-xs font-bold text-brand-primary"><ClipboardList className="h-4 w-4" />Abrir treino do dia</button>
    </section>
    <section className="border-t border-white/10 pt-4 space-y-3">
      <div className="flex justify-between gap-3 items-center"><h3 className="text-sm font-bold">Corpo e subida</h3><button onClick={() => setShowMeasure(true)} className="inline-flex gap-1 items-center text-xs text-brand-primary"><Plus className="h-4 w-4" />Registrar</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{([['weight', 'Peso', 'kg'], ['waist', 'Cintura', 'cm'], ['hill', 'Subida de referência', 'min']] as const).map(([key, label, unit]) => { const result = measurementDelta(key); return <div key={key} className="border-l border-white/15 pl-3"><p className="text-xs text-white/50">{label}</p><p className="text-lg font-semibold mt-1">{result.value} {result.value !== 'Sem registro' && unit}</p><p className="text-[10px] text-white/40">{result.delta}</p></div>; })}</div>
      <p className="text-[11px] text-white/45">Mais carga ou reps indica evolução no exercício, não mede ganho muscular. Peso e cintura precisam de medições; a subida precisa ser comparada no mesmo percurso e condições.</p>
    </section>
    <section className="border-t border-white/10 pt-4 space-y-3"><h3 className="text-sm font-bold">Últimos treinos no período</h3>{workouts.slice(0, 3).map((workout) => <button onClick={() => props.onOpenWorkouts(workout.id)} key={workout.id} className="flex w-full justify-between gap-3 text-left text-xs py-2 border-b border-white/5"><span className="break-words min-w-0">{workout.title}</span><span className="shrink-0 text-white/40">{format(new Date(workout.startTime || workout.start_time), 'dd/MM')}</span></button>)}</section>
    {showMeasure && <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center"><form onSubmit={saveMeasurement} className="bg-brand-surface rounded-lg border border-white/15 p-5 w-full max-w-sm space-y-3"><div className="flex justify-between"><h3 className="font-bold">Avaliação</h3><button type="button" aria-label="Fechar" onClick={() => setShowMeasure(false)}><X className="h-4 w-4" /></button></div><label className="block text-xs">Data<input required name="date" type="date" max={format(new Date(), 'yyyy-MM-dd')} defaultValue={format(new Date(), 'yyyy-MM-dd')} className="block mt-1 bg-black/30 border border-white/15 rounded p-2 w-full" /></label>{([['weight', 'Peso (kg)'], ['waist', 'Cintura (cm)'], ['hill', 'Tempo na mesma subida (min)']] as const).map(([key, label]) => <label key={key} className="block text-xs">{label}<input name={key} type="number" min="0.1" step="0.1" className="block mt-1 bg-black/30 border border-white/15 rounded p-2 w-full" /></label>)}<p className="text-[10px] text-white/40">Salvo neste navegador. Um registro por data; salvar novamente substitui essa data.</p>{measureError && <p role="alert" className="text-xs text-rose-300">{measureError}</p>}<button className="bg-brand-primary text-black w-full p-2 rounded font-bold text-sm">Salvar avaliação</button></form></div>}
  </div>;
}
