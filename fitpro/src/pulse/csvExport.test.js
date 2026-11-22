import { describe, expect, it } from 'vitest'
import { exportRows, periodRange, rowsToCsv } from './csvExport.js'

const now = new Date(2026, 10, 22, 12).getTime()
const routine = { id: 'a', title: 'Treino A', exercises: [{ exercise_template_id: 'spin', title: 'Spinning' }] }

describe('CSV export', () => {
  it('uses the current Monday-to-today week and current calendar month', () => {
    expect(periodRange('week', now)).toMatchObject({ fromDay: '2026-11-16', toDay: '2026-11-22', valid: true })
    expect(periodRange('month', now)).toMatchObject({ fromDay: '2026-11-01', toDay: '2026-11-22', valid: true })
    expect(periodRange('custom', now, { from: '2026-11-10', to: '2026-11-09' }).valid).toBe(false)
  })

  it('exports strength and cardio set fields with the app progression context', () => {
    const workouts = [{ id: 'w1', routine_id: 'a', title: 'Treino A', start_time: '2026-11-20T10:00:00-03:00', end_time: '2026-11-20T11:00:00-03:00', exercises: [
      { index: 0, exercise_template_id: 'spin', title: 'Cycling', notes: 'leve', sets: [{ index: 0, type: 'normal', duration_seconds: 1800, distance_meters: 9000, rpe: 7 }] },
      { index: 1, exercise_template_id: 'leg', title: 'Leg Press (Machine)', sets: [{ type: 'normal', weight_kg: 100, reps: 12 }] },
    ] }]
    const snapshot = { routines: [routine], workouts, templates: [{ id: 'spin', primary_muscle_group: 'cardio' }, { id: 'leg', primary_muscle_group: 'quadriceps' }] }
    const data = { routines: [{ id: 'a', exercises: [{ id: 'spin', sessions: [{ id: 'w1', trend: 'up', streak: 0, reasons: ['distância'] }] }, { id: 'leg', sessions: [{ id: 'w1', trend: 'new', streak: 0, reasons: [] }] }] }] }
    const rows = exportRows(snapshot, data, {}, periodRange('month', now), now)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ rotina_nome: 'Treino A', exercicio_nome: 'Ciclismo', distancia_metros: 9000, duracao_segundos: 1800, velocidade_kmh: 18, tendencia: 'up', motivos_evolucao: 'distância', rpe: 7 })
    expect(rows[1]).toMatchObject({ exercicio_nome: 'Leg Press 45° (Máquina)', peso_kg: 100, repeticoes: 12, volume_kg: 1200 })
  })

  it('creates UTF-8 semicolon CSV and neutralizes spreadsheet formulas', () => {
    const csv = rowsToCsv([{ data_inicio: '=IMPORTXML("x")', exercicio_nome: 'Rosca; direta' }])
    expect(csv.startsWith('\uFEFF"data_inicio";')).toBe(true)
    expect(csv).toContain('"\'=IMPORTXML(""x"")"')
    expect(csv).toContain('"Rosca; direta"')
  })
})
