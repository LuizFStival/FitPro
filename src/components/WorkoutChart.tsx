import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';

interface WorkoutChartProps {
  data: any[];
}

export default function WorkoutChart({ data }: WorkoutChartProps) {
  // Prep data for chart: group by week or show last 10 workouts
  const chartData = [...data].reverse().map(w => ({
    date: format(w.startTime?.toDate ? w.startTime.toDate() : new Date(w.startTime), 'dd/MM'),
    volume: Math.round(w.totalVolume),
    sets: w.totalSets
  })).slice(-10);

  if (chartData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 text-sm italic">
        Aguardando dados de sincronização...
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4FACFE" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#4FACFE" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
        <XAxis 
          dataKey="date" 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#666', fontSize: 10 }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#666', fontSize: 10 }}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
          itemStyle={{ color: '#4FACFE' }}
          cursor={{ stroke: '#4FACFE', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area 
          type="monotone" 
          dataKey="volume" 
          stroke="#4FACFE" 
          strokeWidth={3}
          fillOpacity={1} 
          fill="url(#colorVolume)" 
          animationDuration={1500}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
