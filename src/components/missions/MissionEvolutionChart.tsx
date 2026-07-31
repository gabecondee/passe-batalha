import { useState, useMemo } from 'react';
import { Mission } from '@/types/game';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

interface MissionEvolutionChartProps {
  missions: Mission[];
}

type PeriodFilter = '7d' | '14d' | '30d';

const periodLabels: Record<PeriodFilter, string> = {
  '7d': '7 dias',
  '14d': '14 dias',
  '30d': '30 dias',
};

export function MissionEvolutionChart({ missions }: MissionEvolutionChartProps) {
  const [period, setPeriod] = useState<PeriodFilter>('7d');

  const chartData = useMemo(() => {
    const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
    const data = [];
    const today = new Date();

    // Simulate completion data based on completed missions count
    const completedCount = missions.filter(m => m.status === 'completed').length;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayLabel = `${date.getDate()}/${date.getMonth() + 1}`;

      // Distribute completed missions across days with some variance
      const base = Math.floor(completedCount / days);
      const variance = Math.floor(Math.random() * 3);
      const completed = Math.max(0, base + variance - 1);

      data.push({
        day: dayLabel,
        concluídas: completed,
      });
    }

    return data;
  }, [period, missions]);

  const totalCompleted = missions.filter(m => m.status === 'completed').length;

  return (
    <div className="fantasy-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display text-lg">Evolução de Missões</h2>
            <p className="text-xs text-muted-foreground">
              {totalCompleted} missões concluídas no total
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {(Object.keys(periodLabels) as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMissions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))',
                fontSize: '12px',
              }}
            />
            <Area
              type="monotone"
              dataKey="concluídas"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorMissions)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
