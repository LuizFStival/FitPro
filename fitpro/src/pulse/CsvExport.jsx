import { useMemo, useState } from 'react'
import { downloadCsv, exportRows, periodRange } from './csvExport.js'

const today = now => {
  const date = new Date(now), pad = value => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export default function CsvExport({ snapshot, data, preferences, now }) {
  const [period, setPeriod] = useState('week')
  const [custom, setCustom] = useState(() => ({ from: periodRange('month', now).fromDay, to: today(now) }))
  const range = useMemo(() => periodRange(period, now, custom), [period, now, custom])
  const rows = useMemo(() => exportRows(snapshot, data, preferences, range, now), [snapshot, data, preferences, range, now])
  const workouts = new Set(rows.map(row => row.treino_id)).size
  return <section className="card csv-export"><div className="section-head"><h2>Exportar dados</h2><span>CSV para análise</span></div>
    <p>Baixe o histórico detalhado para abrir no Excel ou enviar a outra IA. Cada linha representa uma série, sem incluir sua chave da Hevy.</p>
    <div className="og-segment" aria-label="Período da exportação">{[['week', 'Esta semana'], ['month', 'Este mês'], ['custom', 'Personalizado']].map(([id, label]) => <button type="button" key={id} className={period === id ? 'selected' : ''} aria-pressed={period === id} onClick={() => setPeriod(id)}>{label}</button>)}</div>
    {period === 'custom' && <div className="csv-dates"><label>De<input type="date" value={custom.from} max={custom.to || today(now)} onChange={event => setCustom(value => ({ ...value, from: event.target.value }))} /></label><label>Até<input type="date" value={custom.to} min={custom.from} max={today(now)} onChange={event => setCustom(value => ({ ...value, to: event.target.value }))} /></label></div>}
    <div className="csv-summary"><strong>{workouts} treino{workouts === 1 ? '' : 's'}</strong><span>{range.valid ? `${range.fromDay} a ${range.toDay}` : 'Revise o intervalo selecionado'}</span><small>{rows.length} série{rows.length === 1 ? '' : 's'} para exportar</small></div>
    <button className="primary" disabled={!rows.length || !range.valid} onClick={() => downloadCsv(rows, range)}>Baixar CSV</button>
    <p className="footnote">Inclui nomes em português e originais da Hevy, carga, repetições, volume, RPE, tempo, distância, velocidade, tendência e sequência sem progresso.</p>
  </section>
}
