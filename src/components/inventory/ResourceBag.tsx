import { useMemo, useState } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { TransactionTable } from './TransactionTable';
import { AddTransactionDialog } from './AddTransactionDialog';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, Calendar as CalendarIcon } from 'lucide-react';
import { Transaction, TransactionType, INCOME_CATEGORIES, EXPENSE_CATEGORIES, INVESTMENT_CATEGORIES } from '@/types/finance';
import { cn, formatCompactCurrency } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { isInFinancePeriod } from '@/lib/financeDates';

type PeriodKey = 'all' | 'current' | 'custom';
type FinanceTab = 'all' | TransactionType;
const tabs: { value: FinanceTab; label: string }[] = [
  { value: 'all', label: 'Todos' }, { value: 'income', label: 'Entradas' },
  { value: 'expense', label: 'Saídas' }, { value: 'investment', label: 'Investimentos' },
];
const categoryLists = { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES, investment: INVESTMENT_CATEGORIES };
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const panel = 'rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm';

export function ResourceBag() {
  const { transactions, addTransaction, removeTransaction, updateTransaction } = useFinances();
  const [tab, setTab] = useState<FinanceTab>('all');
  const [category, setCategory] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeOpen, setRangeOpen] = useState(false);
  const filtered = useMemo(() => transactions.filter(transaction => isInFinancePeriod(transaction.date, period, range)), [transactions, period, range]);
  const sum = (type: TransactionType) => filtered.filter(transaction => transaction.type === type).reduce((total, transaction) => total + transaction.amount, 0);
  const totalIncome = sum('income');
  const totalExpenses = sum('expense');
  const totalInvestments = sum('investment');
  const balance = totalIncome - totalExpenses;
  // Include type in the category key: legacy categories can share names across types.
  const categories = (['income', 'expense', 'investment'] as const)
    .filter(type => tab === 'all' || tab === type)
    .flatMap(type => categoryLists[type].map(item => ({ ...item, key: `${type}:${item.value}`, type })));
  const visible = filtered.filter(transaction => (tab === 'all' || transaction.type === tab) && (category === 'all' || `${transaction.type}:${transaction.category}` === category))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const rangeLabel = range?.from ? `${format(range.from, 'dd/MM/yy')}${range.to ? ` – ${format(range.to, 'dd/MM/yy')}` : ' em diante'}` : 'Personalizado';
  const periodLabel = period === 'all' ? 'Todo o período' : period === 'current' ? 'Mês atual' : rangeLabel;
  const cards = [
    { label: 'Entradas', value: totalIncome, Icon: TrendingUp, color: 'text-green-400' },
    { label: 'Saídas', value: totalExpenses, Icon: TrendingDown, color: 'text-red-400' },
    { label: 'Investimentos', value: totalInvestments, Icon: PiggyBank, color: 'text-amber-400' },
  ];
  const periodClass = (active: boolean) => cn('flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-xs sm:text-sm transition-colors min-w-0', active ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border/60 bg-card/40 text-muted-foreground hover:text-foreground');

  return (
    <div className="space-y-5">
      <section aria-label="Resumo financeiro" className={cn(panel, 'p-4 sm:p-6 bg-gradient-to-br from-primary/10 to-card/60')}>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Saldo do período</p>
            <p className={cn('font-display text-3xl sm:text-4xl mt-2 break-words', balance < 0 ? 'text-red-400' : 'text-foreground')} title={currency(balance)}>{currency(balance)}</p>
            <p className="text-xs text-muted-foreground mt-2">{periodLabel} · Entradas menos saídas</p>
          </div>
          <span className="p-3 rounded-xl bg-primary/10 text-primary shrink-0"><Wallet className="w-5 h-5" /></span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5">
          {cards.map(card => {
            const Icon = card.Icon;
            return (
              <div key={card.label} className="min-w-0 rounded-xl border border-border/50 bg-background/30 p-2.5 sm:p-3">
                <Icon className={cn('w-4 h-4 mb-2', card.color)} />
                <p className="text-[10px] sm:text-xs text-muted-foreground">{card.label}</p>
                <p className={cn('text-sm sm:text-lg font-semibold mt-1 tabular-nums', card.color)} title={currency(card.value)}>{formatCompactCurrency(card.value)}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div role="group" aria-label="Período dos lançamentos" className="grid grid-cols-3 gap-2">
        <button onClick={() => setPeriod('all')} aria-pressed={period === 'all'} className={periodClass(period === 'all')}>Todo o período</button>
        <button onClick={() => setPeriod('current')} aria-pressed={period === 'current'} className={periodClass(period === 'current')}>Mês atual</button>
        <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
          <PopoverTrigger asChild>
            <button aria-pressed={period === 'custom'} className={periodClass(period === 'custom')}>
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{period === 'custom' ? rangeLabel : 'Personalizado'}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" captionLayout="dropdown-buttons" fromYear={2020} toYear={new Date().getFullYear() + 1}
              selected={range} onSelect={selected => { setRange(selected); if (selected?.from) setPeriod('custom'); }} numberOfMonths={1} initialFocus />
          </PopoverContent>
        </Popover>
      </div>

      <section className={cn(panel, 'p-4 sm:p-5')} aria-label="Lançamentos">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div><h2 className="font-display text-sm uppercase tracking-wider">Lançamentos</h2><p className="text-xs text-muted-foreground mt-1">{periodLabel}</p></div>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Novo lançamento</Button>
        </div>
        <Tabs value={tab} onValueChange={value => { setTab(value as FinanceTab); setCategory('all'); }}>
          <TabsList aria-label="Tipos de lançamento" className="grid grid-cols-4 w-full h-11 rounded-xl">
            {tabs.map(item => <TabsTrigger key={item.value} value={item.value} className="text-[10px] sm:text-sm px-1 rounded-lg">{item.label}</TabsTrigger>)}
          </TabsList>
          <div className="flex items-center justify-between gap-3 mt-4 mb-1">
            <p className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'lançamento' : 'lançamentos'}</p>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filtrar por categoria" className="w-44 sm:w-52 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(item => <SelectItem key={item.key} value={item.key}>{item.label}{tab === 'all' ? ` · ${item.type === 'income' ? 'Entrada' : item.type === 'expense' ? 'Saída' : 'Investimento'}` : ''}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {tabs.map(item => (
            <TabsContent key={item.value} value={item.value}>
              <TransactionTable transactions={visible} onEdit={setEditing} />
              {tab !== 'all' && <div className="pt-4 border-t border-border/60 flex justify-between text-sm gap-2"><span className="text-muted-foreground">Total dos lançamentos exibidos</span><span className="font-semibold tabular-nums">{currency(visible.reduce((total, transaction) => total + transaction.amount, 0))}</span></div>}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <ExpenseBreakdown transactions={filtered} periodLabel={periodLabel} />
      <AddTransactionDialog type={tab === 'all' ? 'expense' : tab} open={createOpen} onOpenChange={setCreateOpen} onAdd={addTransaction} />
      {editing && <AddTransactionDialog type={editing.type} open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }} initial={editing} onUpdate={updateTransaction} onDelete={removeTransaction} />}
    </div>
  );
}
