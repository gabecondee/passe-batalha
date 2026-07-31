import { useMemo, useState } from 'react';
import { useFinances } from '@/hooks/useFinances';
import { TransactionTable } from './TransactionTable';
import { AddTransactionDialog } from './AddTransactionDialog';
import { Button } from '@/components/ui/button';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react';
import {
  Transaction,
  TransactionType,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
  CategoryDef,
} from '@/types/finance';
import { cn, formatCompactCurrency } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const INVEST_COLOR = '#eca634';

type PeriodKey = 'current' | 'custom';

interface SectionProps {
  title: string;
  colorClass: string;
  borderStyle?: React.CSSProperties;
  headerColorStyle?: React.CSSProperties;
  buttonClass: string;
  buttonStyle?: React.CSSProperties;
  Icon?: typeof PiggyBank;
  transactions: Transaction[];
  categories: CategoryDef[];
  type: TransactionType;
  total: number;
  formatCurrency: (v: number) => string;
  onNew: () => void;
  onEdit: (t: Transaction) => void;
  filter: string;
  setFilter: (v: string) => void;
}

function Section({
  title,
  colorClass,
  borderStyle,
  headerColorStyle,
  buttonClass,
  buttonStyle,
  Icon,
  transactions,
  categories,
  type,
  total,
  formatCurrency,
  onNew,
  onEdit,
  filter,
  setFilter,
}: SectionProps) {
  const visible = filter === 'all' ? transactions : transactions.filter((t) => t.category === filter);
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <section
      className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-6"
      style={borderStyle}
    >
      <div className="flex items-center justify-between mb-4">
        <h3
          className={cn('font-display uppercase tracking-[0.2em] text-sm md:text-base flex items-center gap-2', colorClass)}
          style={headerColorStyle}
        >
          {Icon && <Icon className="w-4 h-4" style={headerColorStyle} />}
          {title}
        </h3>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', colorClass)}
              style={headerColorStyle}
              aria-label="Filtrar por categoria"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1">
            <div className="max-h-64 overflow-y-auto">
              <button
                onClick={() => { setFilter('all'); setFilterOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent',
                  filter === 'all' && 'bg-accent',
                )}
              >
                Todos
              </button>
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setFilter(c.value); setFilterOpen(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent',
                    filter === c.value && 'bg-accent',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <TransactionTable transactions={visible} type={type} onEdit={onEdit} />

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-2">
        <Button
          size="sm"
          onClick={onNew}
          className={cn('text-white', buttonClass)}
          style={buttonStyle}
        >
          <Plus className="w-4 h-4 mr-1" />
          {type === 'investment' ? 'Novo' : 'Nova'}
        </Button>
        <div className="text-muted-foreground text-sm">
          SOMA:
          <span
            className={cn('font-display ml-2', colorClass)}
            style={headerColorStyle}
          >
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </section>
  );
}

export function ResourceBag() {
  const { transactions, addTransaction, removeTransaction, updateTransaction } = useFinances();

  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [investDialogOpen, setInvestDialogOpen] = useState(false);

  const [editing, setEditing] = useState<Transaction | null>(null);

  const [period, setPeriod] = useState<PeriodKey>('current');
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeOpen, setRangeOpen] = useState(false);

  const [incomeFilter, setIncomeFilter] = useState('all');
  const [expenseFilter, setExpenseFilter] = useState('all');
  const [investFilter, setInvestFilter] = useState('all');

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (period === 'current') {
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (period === 'custom') {
        if (range?.from && d < new Date(range.from.setHours(0, 0, 0, 0))) return false;
        if (range?.to && d > new Date(new Date(range.to).setHours(23, 59, 59, 999))) return false;
        return true;
      }
      return true;
    });
  }, [transactions, period, range]);

  const incomes = filtered.filter((t) => t.type === 'income');
  const expenses = filtered.filter((t) => t.type === 'expense');
  const investments = filtered.filter((t) => t.type === 'investment');

  const totalIncome = incomes.reduce((a, t) => a + t.amount, 0);
  const totalExpenses = expenses.reduce((a, t) => a + t.amount, 0);
  const totalInvestments = investments.reduce((a, t) => a + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const summaryCards = [
    { key: 'income', label: 'Entradas', value: formatCompactCurrency(totalIncome), Icon: TrendingUp, color: 'text-green-500', border: 'border-green-500/40' },
    { key: 'expense', label: 'Saídas', value: formatCompactCurrency(totalExpenses), Icon: TrendingDown, color: 'text-red-500', border: 'border-red-500/40' },
    { key: 'balance', label: 'Saldo', value: formatCompactCurrency(balance), Icon: Wallet, color: balance >= 0 ? 'text-foreground' : 'text-destructive', border: 'border-border' },
    { key: 'investments', label: 'Investimentos', value: formatCompactCurrency(totalInvestments), Icon: PiggyBank, color: 'text-amber-400', border: 'border-amber-400/40' },
  ];

  const editingType: TransactionType | null = editing?.type ?? null;

  const rangeLabel = range?.from
    ? range.to
      ? `${format(range.from, 'dd/MM/yy', { locale: ptBR })} - ${format(range.to, 'dd/MM/yy', { locale: ptBR })}`
      : format(range.from, 'dd/MM/yy', { locale: ptBR })
    : 'Personalizado';

  return (
    <div className="space-y-6">
      {/* Resumo Geral */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-6 border-l-4 border-l-primary">
        <h3 className="font-display uppercase tracking-[0.2em] text-primary text-sm mb-4">
          Resumo Geral
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {summaryCards.map((c) => {
            const Icon = c.Icon;
            return (
              <div key={c.key} className="flex flex-col items-center text-center gap-2">
                <div className={cn('w-12 h-12 rounded-full border flex items-center justify-center', c.border)}>
                  <Icon className={cn('w-5 h-5', c.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{c.label}</span>
                <span className={cn('font-display text-base md:text-lg truncate max-w-full', c.color)}>
                  {c.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period selector: Mês Atual + Personalizado */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setPeriod('current')}
          className={cn(
            'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors',
            period === 'current'
              ? 'border-primary/60 bg-primary/10 text-primary'
              : 'border-border/60 bg-card/40 text-muted-foreground hover:text-foreground',
          )}
        >
          <CalendarIcon className="w-4 h-4" />
          Mês Atual
        </button>

        <Popover
          open={rangeOpen}
          onOpenChange={(o) => {
            setRangeOpen(o);
            if (o) setPeriod('custom');
          }}
        >
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm transition-colors',
                period === 'custom'
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-border/60 bg-card/40 text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarIcon className="w-4 h-4" />
              <span className="truncate">{period === 'custom' ? rangeLabel : 'Personalizado'}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={1}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Entradas */}
      <Section
        title="Entradas"
        colorClass="text-green-500"
        buttonClass="bg-green-600 hover:bg-green-700"
        transactions={incomes}
        categories={INCOME_CATEGORIES}
        type="income"
        total={totalIncome}
        formatCurrency={formatCurrency}
        onNew={() => setIncomeDialogOpen(true)}
        onEdit={setEditing}
        filter={incomeFilter}
        setFilter={setIncomeFilter}
      />

      {/* Saídas */}
      <Section
        title="Saídas"
        colorClass="text-red-500"
        buttonClass="bg-red-600 hover:bg-red-700"
        transactions={expenses}
        categories={EXPENSE_CATEGORIES}
        type="expense"
        total={totalExpenses}
        formatCurrency={formatCurrency}
        onNew={() => setExpenseDialogOpen(true)}
        onEdit={setEditing}
        filter={expenseFilter}
        setFilter={setExpenseFilter}
      />

      {/* Investimentos */}
      <Section
        title="Investimentos"
        colorClass=""
        headerColorStyle={{ color: INVEST_COLOR }}
        borderStyle={{ borderColor: `${INVEST_COLOR}66` }}
        buttonClass="hover:opacity-90"
        buttonStyle={{ backgroundColor: INVEST_COLOR }}
        Icon={PiggyBank}
        transactions={investments}
        categories={INVESTMENT_CATEGORIES}
        type="investment"
        total={totalInvestments}
        formatCurrency={formatCurrency}
        onNew={() => setInvestDialogOpen(true)}
        onEdit={setEditing}
        filter={investFilter}
        setFilter={setInvestFilter}
      />

      {/* Create dialogs */}
      <AddTransactionDialog type="income" open={incomeDialogOpen} onOpenChange={setIncomeDialogOpen} onAdd={addTransaction} />
      <AddTransactionDialog type="expense" open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} onAdd={addTransaction} />
      <AddTransactionDialog type="investment" open={investDialogOpen} onOpenChange={setInvestDialogOpen} onAdd={addTransaction} />

      {/* Edit dialog */}
      {editingType && (
        <AddTransactionDialog
          type={editingType}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          initial={editing ?? undefined}
          onUpdate={updateTransaction}
          onDelete={removeTransaction}
        />
      )}
    </div>
  );
}
