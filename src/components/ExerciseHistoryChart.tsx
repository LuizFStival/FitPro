import { format } from 'date-fns';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExerciseSession } from '../types/plateau';

export default function ExerciseHistoryChart({ sessions }: { sessions: ExerciseSession[] }) {
  const variations = [...new Map(sessions.map((session) => [session.exerciseTemplateId, session])).values()];
  const data = sessions.map((session) => ({
    date: format(session.date, 'dd/MM'),
    [session.exerciseTemplateId]: session.weightKg,
  }));
  return (
    <div className="mt-3 min-w-0">
      <div className="h-40 w-full" role="img" aria-label="Evolução de carga por variação do exercício">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#999' }} />
            <YAxis tick={{ fontSize: 10, fill: '#999' }} />
            <Tooltip contentStyle={{ background: '#121212', borderColor: '#444', fontSize: 12 }} />
            {variations.map((variation) => (
              <Line key={variation.exerciseTemplateId} dataKey={variation.exerciseTemplateId}
                name={`${variation.exerciseTitle} (kg)`} stroke={variation.variationColor || '#4FACFE'}
                connectNulls dot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/60">
        {variations.map((variation) => (
          <span key={variation.exerciseTemplateId} className="inline-flex items-center gap-1.5 min-w-0 break-words">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: variation.variationColor || '#4FACFE' }} />
            {variation.exerciseTitle}
          </span>
        ))}
      </div>
    </div>
  );
}
