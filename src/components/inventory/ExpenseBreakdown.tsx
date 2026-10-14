import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';
import { ChevronDown, ChartPie } from 'lucide-react';
import { Transaction, getCategoryDef } from '@/types/finance';
import { cn, formatCompactCurrency } from '@/lib/utils';

const colors = ['#fb923c', '#60a5fa', '#facc15', '#34d399', '#818cf8', '#f472b6', '#22d3ee', '#fb7185', '#c084fc', '#94a3b8'];
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function ExpenseBreakdown({ transactions, periodLabel }: { transactions: Transaction[]; periodLabel: string }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'overview' | 'categories'>('overview');
  const data = useMemo(() => {
    if (mode === 'overview') return [
      { category: 'income', name: 'Receitas', color: '#4ade80', value: transactions.filter(item => item.type === 'income').reduce((sum, item) => sum + item.amount, 0) },
      { category: 'expense', name: 'Despesas', color: '#f87171', value: transactions.filter(item => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0) },
    ].filter(item => item.value > 0);
    const grouped = new Map<string, number>();
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') grouped.set(transaction.category, (grouped.get(transaction.category) ?? 0) + transaction.amount);
    });
    return Array.from(grouped, ([category, value]) => ({ category, value, name: getCategoryDef('expense', category)?.label ?? category }))
      .filter(item => item.value > 0).sort((a, b) => b.value - a.value)
      .map((item, index) => ({ ...item, color: colors[index % colors.length] }));
  }, [transactions, mode]);
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <section className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <ChartPie className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm uppercase tracking-wider flex-1">Visão financeira</h2>
        <button type="button" className="md:hidden p-2 rounded-lg hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={open ? 'Recolher gráfico financeiro' : 'Expandir gráfico financeiro'} aria-expanded={open} aria-controls="expense-breakdown-content" onClick={() => setOpen(!open)}>
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{periodLabel} · Todas as categorias</p>
      <div id="expense-breakdown-content" className={cn('mt-4', open ? 'block' : 'hidden md:block')}>
        <div role="group" aria-label="Visualização do gráfico" className="flex flex-wrap gap-2 mb-4">
          <button type="button" aria-pressed={mode === 'overview'} onClick={() => setMode('overview')} className={cn('rounded-lg px-3 py-2 text-xs border', mode === 'overview' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>Receitas e despesas</button>
          <button type="button" aria-pressed={mode === 'categories'} onClick={() => setMode('categories')} className={cn('rounded-lg px-3 py-2 text-xs border', mode === 'categories' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground')}>Despesas por categoria</button>
        </div>
        {mode === 'overview' && <p className="text-xs text-muted-foreground mb-4">Participação nas entradas e saídas do período.</p>}
        {!data.length ? <p className="text-sm text-muted-foreground py-8 text-center">{mode === 'overview' ? 'Nenhuma receita ou despesa registrada neste período.' : 'Nenhuma despesa registrada neste período.'}</p> : (
          <div className="grid md:grid-cols-[220px_minmax(0,1fr)] items-center gap-5">
            <div className="relative w-[220px] mx-auto" aria-hidden="true">
              <PieChart width={220} height={220}>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={74} outerRadius={98} paddingAngle={data.length > 1 ? 3 : 0} stroke="none" isAnimationActive={false}>
                  {data.map(item => <Cell key={item.category} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => currency(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} itemStyle={{ color: 'hsl(var(--foreground))' }} />
              </PieChart>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">{mode === 'overview' ? 'Movimentação' : 'Total de saídas'}</span>
                <span className="text-lg font-semibold mt-1">{formatCompactCurrency(total)}</span>
              </div>
            </div>
            <ul aria-label={mode === 'overview' ? 'Distribuição de receitas e despesas' : 'Distribuição das despesas'} className="space-y-3">
              {data.map(item => (
                <li key={item.category} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} /><span className="truncate">{item.name}</span></div>
                  <div className="text-right shrink-0"><span className="font-medium tabular-nums">{currency(item.value)}</span><span className="text-xs text-muted-foreground ml-2">{new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(item.value / total * 100)}%</span></div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
