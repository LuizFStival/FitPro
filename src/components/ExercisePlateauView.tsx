import React, { useState, useMemo } from 'react';
import { ExercisePlateau, PlateauStatus } from '../types/plateau';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AlertTriangle, 
  CheckCircle2, 
  AlertOctagon, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Dumbbell, 
  Layers, 
  Calendar,
  Sparkles,
  Info
} from 'lucide-react';

interface ExercisePlateauViewProps {
  plateaus: ExercisePlateau[];
  lastSyncedAt: string | null;
  syncing: boolean;
  syncProgress?: { page: number; totalPages: number; count: number } | null;
  syncError?: string | null;
  onSync: () => void;
  onOpenSettings: () => void;
  hasApiKey: boolean;
}

export default function ExercisePlateauView({
  plateaus,
  lastSyncedAt,
  syncing,
  syncProgress,
  syncError,
  onSync,
  onOpenSettings,
  hasApiKey,
}: ExercisePlateauViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PlateauStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtered plateaus
  const filteredPlateaus = useMemo(() => {
    return plateaus.filter((item) => {
      const matchesSearch =
        item.exerciseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.routineTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.exerciseTemplateId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [plateaus, searchTerm, statusFilter]);

  // Summary counts
  const criticalCount = useMemo(() => plateaus.filter(p => p.status === 'critical').length, [plateaus]);
  const warningCount = useMemo(() => plateaus.filter(p => p.status === 'warning').length, [plateaus]);
  const okCount = useMemo(() => plateaus.filter(p => p.status === 'ok').length, [plateaus]);

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Nenhuma sincronização realizada com a API do Hevy';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return format(date, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: PlateauStatus, stuckSessions: number) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            CRÍTICO
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            ATENÇÃO
          </span>
        );
      case 'ok':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            OK
          </span>
        );
    }
  };

  const formatWeeks = (weeks: number, days: number) => {
    if (weeks === 0) {
      return days === 0 ? '< 1 sem (0d)' : `< 1 sem (${days}d)`;
    }
    if (weeks === 1) {
      return `1 sem (${days}d)`;
    }
    return `${weeks} sem (${days}d)`;
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Top Header Card */}
      <div className="rounded-[2rem] bg-brand-surface border border-brand-border p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Estagnação de Carga por Exercício
            </h1>
          </div>
          <p className="text-sm text-white/50 max-w-2xl leading-relaxed">
            Monitoramento analítico de platôs agrupados por <code className="text-brand-primary/80 font-mono text-xs">exercise_template_id</code>.
            Avalia exclusivamente séries <span className="text-white/80 font-medium">normais</span>, identificando a carga máxima de cada sessão e regressando até a primeira variação de peso.
          </p>

          {/* Real sync timestamp */}
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/40">
            <Clock className="w-3.5 h-3.5 text-brand-primary" />
            <span>Última sincronização bem-sucedida:</span>
            <span className="font-mono text-white/80 font-medium bg-white/5 px-2.5 py-0.5 rounded-md border border-white/10">
              {formatLastSync(lastSyncedAt)}
            </span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-400 font-medium">Hevy API v1 Oficial</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          {!hasApiKey ? (
            <button
              onClick={onOpenSettings}
              className="btn-primary flex items-center justify-center gap-2 text-sm px-5 py-2.5"
            >
              Configurar Chave Hevy
            </button>
          ) : (
            <button
              onClick={onSync}
              disabled={syncing}
              className="flex items-center justify-center gap-2 text-sm font-semibold bg-white/10 hover:bg-white/15 active:scale-95 text-white px-5 py-2.5 rounded-xl border border-white/10 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-brand-primary ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando Histórico...' : 'Sincronizar API'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Progress Banner */}
      {syncing && syncProgress && (
        <div className="rounded-2xl bg-brand-primary/10 border border-brand-primary/20 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-brand-primary animate-spin" />
            <div>
              <div className="text-sm font-medium text-white">
                Sincronizando todas as páginas do Hevy...
              </div>
              <div className="text-xs text-white/50">
                Página {syncProgress.page} de {syncProgress.totalPages} • {syncProgress.count} treinos carregados
              </div>
            </div>
          </div>
          <div className="text-xs font-mono text-brand-primary font-bold">
            {Math.round((syncProgress.page / Math.max(1, syncProgress.totalPages)) * 100)}%
          </div>
        </div>
      )}

      {/* Explicit Sync Error Banner */}
      {syncError && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-5 flex items-start gap-4">
          <AlertOctagon className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-300">Falha ao sincronizar com a API do Hevy</h4>
            <p className="text-xs text-rose-200/80 mt-1 leading-relaxed">{syncError}</p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={onSync}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors"
              >
                Tentar novamente
              </button>
              <button
                onClick={onOpenSettings}
                className="text-xs font-medium text-white/60 hover:text-white transition-colors"
              >
                Verificar Chave de API
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tracked */}
        <div className="rounded-[1.5rem] bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold">
            Exercícios Rastreados
          </span>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-light text-white font-mono">
              {plateaus.length}
            </span>
            <span className="text-xs text-white/30">templates únicos</span>
          </div>
          <span className="text-[11px] text-white/40 flex items-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-brand-primary" /> Séries normais de peso
          </span>
        </div>

        {/* Critical */}
        <div className="rounded-[1.5rem] bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-rose-400 font-bold">
              Platô Crítico (6+ sessões)
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-light text-rose-400 font-mono">
              {criticalCount}
            </span>
            <span className="text-xs text-rose-400/50">exercícios</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full"
              style={{ width: `${plateaus.length ? (criticalCount / plateaus.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-[1.5rem] bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">
              Atenção (3-5 sessões)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-light text-amber-400 font-mono">
              {warningCount}
            </span>
            <span className="text-xs text-amber-400/50">exercícios</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${plateaus.length ? (warningCount / plateaus.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* OK */}
        <div className="rounded-[1.5rem] bg-brand-surface border border-brand-border p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Progressão OK (0-2 sessões)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-light text-emerald-400 font-mono">
              {okCount}
            </span>
            <span className="text-xs text-emerald-400/50">evoluindo</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${plateaus.length ? (okCount / plateaus.length) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-[1.5rem] bg-brand-surface border border-brand-border p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por exercício, rotina ou ID..."
            className="w-full bg-brand-bg border border-brand-border rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-white/30 focus:border-brand-primary outline-none transition-colors font-sans"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-white/10 text-white font-semibold shadow-sm'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            Todos ({plateaus.length})
          </button>
          <button
            onClick={() => setStatusFilter('critical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'critical'
                ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                : 'text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            Crítico ({criticalCount})
          </button>
          <button
            onClick={() => setStatusFilter('warning')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'warning'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                : 'text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            Atenção ({warningCount})
          </button>
          <button
            onClick={() => setStatusFilter('ok')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'ok'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            OK ({okCount})
          </button>
        </div>
      </div>

      {/* Table of Exercises */}
      <div className="rounded-[2rem] bg-brand-surface border border-brand-border overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-white">Classificação de Estagnação</h3>
            <p className="text-xs text-white/40">
              Ordenado do mais travado (maior número de sessões em platô) para o mais recente.
            </p>
          </div>
          <span className="text-xs font-mono text-white/40">
            {filteredPlateaus.length} de {plateaus.length} exercícios
          </span>
        </div>

        {filteredPlateaus.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            {plateaus.length === 0 ? (
              <>
                <Dumbbell className="w-12 h-12 text-white/10 mb-3 animate-pulse" />
                <h4 className="text-base font-semibold text-white/70">Nenhum dado de treino carregado</h4>
                <p className="text-xs text-white/40 max-w-md mt-1 mb-5">
                  Conecte sua chave de API do Hevy e realize a sincronização completa para visualizar a análise de platô de carga.
                </p>
                <button
                  onClick={onSync}
                  className="btn-primary text-xs px-4 py-2"
                >
                  Sincronizar com Hevy API
                </button>
              </>
            ) : (
              <>
                <Search className="w-8 h-8 text-white/20 mb-2" />
                <h4 className="text-sm font-semibold text-white/60">Nenhum exercício encontrado com o filtro atual</h4>
                <p className="text-xs text-white/30 mt-1">Limpe o termo de busca ou altere o filtro de status.</p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-white/40 font-bold bg-white/[0.02]">
                  <th className="py-3.5 px-6">Nome do Exercício</th>
                  <th className="py-3.5 px-6">Rotina / Treino</th>
                  <th className="py-3.5 px-6 text-right">Carga Atual (kg)</th>
                  <th className="py-3.5 px-6 text-center">Nº Sessões Travado</th>
                  <th className="py-3.5 px-6 text-center">Semanas Travado</th>
                  <th className="py-3.5 px-6 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {filteredPlateaus.map((item) => {
                  const isExpanded = expandedId === item.exerciseTemplateId;

                  return (
                    <React.Fragment key={item.exerciseTemplateId}>
                      <tr 
                        onClick={() => setExpandedId(isExpanded ? null : item.exerciseTemplateId)}
                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer group ${
                          isExpanded ? 'bg-white/[0.03]' : ''
                        }`}
                      >
                        {/* Nome do exercício */}
                        <td className="py-4 px-6">
                          <div className="font-semibold text-white group-hover:text-brand-primary transition-colors">
                            {item.exerciseTitle}
                          </div>
                          <div className="text-[10px] font-mono text-white/30 tracking-tight flex items-center gap-1.5 mt-0.5">
                            <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                              ID: {item.exerciseTemplateId}
                            </span>
                            <span>• {item.sessionsHistory.length} sessões registradas</span>
                          </div>
                        </td>

                        {/* Rotina / Treino a que pertence */}
                        <td className="py-4 px-6 text-white/70">
                          <div className="text-xs font-medium max-w-[200px] text-wrap-safe">
                            {item.routineTitle}
                          </div>
                          <div className="text-[10px] text-white/30 mt-0.5">
                            Última: {format(item.lastSessionDate, 'dd/MM/yyyy')}
                          </div>
                        </td>

                        {/* Carga Atual (kg) */}
                        <td className="py-4 px-6 text-right">
                          <span className="font-mono text-base font-bold text-white tracking-tight">
                            {item.currentWeightKg}
                          </span>
                          <span className="text-xs text-white/40 ml-1 uppercase">kg</span>
                        </td>

                        {/* Nº de sessões travado */}
                        <td className="py-4 px-6 text-center">
                          <span
                            className={`font-mono text-sm font-semibold ${
                              item.status === 'critical'
                                ? 'text-rose-400 font-bold'
                                : item.status === 'warning'
                                ? 'text-amber-400 font-bold'
                                : 'text-emerald-400'
                            }`}
                          >
                            {item.stuckSessions} {item.stuckSessions === 1 ? 'sessão' : 'sessões'}
                          </span>
                        </td>

                        {/* Semanas travado */}
                        <td className="py-4 px-6 text-center">
                          <span className="font-mono text-xs text-white/80">
                            {formatWeeks(item.stuckWeeks, item.stuckDays)}
                          </span>
                          <div className="text-[9px] text-white/30">
                            Desde {format(item.plateauStartDate, 'dd/MM/yy')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6 text-center">
                          {getStatusBadge(item.status, item.stuckSessions)}
                        </td>

                        {/* Expand toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 group-hover:text-white transition-colors"
                            aria-label="Expandir detalhes"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-brand-primary" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-black/40 border-b border-white/10">
                          <td colSpan={7} className="p-6">
                            <div className="rounded-xl bg-[#0e0e0e] border border-white/5 p-5 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Info className="w-4 h-4 text-brand-primary" />
                                  <h5 className="text-xs uppercase font-bold tracking-wider text-white/70">
                                    Histórico de Cargas do Exercício (Séries Normais)
                                  </h5>
                                </div>
                                <span className="text-[11px] text-white/40">
                                  Platô detectado em: <strong className="text-white">{item.currentWeightKg} kg</strong> por{' '}
                                  <strong className="text-brand-primary">{item.stuckSessions} sessões consecutivas</strong>
                                </span>
                              </div>

                              {/* Timeline of sessions */}
                              <div className="flex items-center gap-2 overflow-x-auto py-2 pr-4 custom-scrollbar">
                                {item.sessionsHistory.map((sess, sIdx) => {
                                  const isPartOfPlateau =
                                    sess.weightKg === item.currentWeightKg &&
                                    sIdx >= item.sessionsHistory.length - item.stuckSessions;

                                  return (
                                    <div
                                      key={sIdx}
                                      className={`shrink-0 p-3 rounded-xl border flex flex-col items-center text-center min-w-[110px] transition-all ${
                                        isPartOfPlateau
                                          ? item.status === 'critical'
                                            ? 'bg-rose-500/10 border-rose-500/30'
                                            : item.status === 'warning'
                                            ? 'bg-amber-500/10 border-amber-500/30'
                                            : 'bg-emerald-500/10 border-emerald-500/30'
                                          : 'bg-white/5 border-white/5 opacity-60'
                                      }`}
                                    >
                                      <span className="text-[10px] text-white/40">
                                        {format(sess.date, 'dd/MM/yy')}
                                      </span>
                                      <span className="font-mono text-base font-bold text-white mt-1">
                                        {sess.weightKg} kg
                                      </span>
                                      <span className="text-[9px] text-white/50 text-wrap-safe max-w-[95px] mt-1">
                                        {sess.workoutTitle}
                                      </span>
                                      {isPartOfPlateau && (
                                        <span className="mt-1 text-[8px] uppercase tracking-wider font-bold text-brand-primary">
                                          Platô #{item.sessionsHistory.length - sIdx}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="text-[11px] text-white/40 leading-relaxed border-t border-white/5 pt-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  Template ID oficial: <code className="font-mono text-white/60">{item.exerciseTemplateId}</code>
                                </div>
                                <div className="text-white/50">
                                  Duração do platô: {item.stuckDays} dias corridos ({format(item.plateauStartDate, 'dd/MM/yyyy')} até {format(item.lastSessionDate, 'dd/MM/yyyy')})
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
