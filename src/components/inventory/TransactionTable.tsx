import { Transaction, getCategoryDef } from '@/types/finance';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TransactionTableProps {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
}

const styles = {
  income: { label: 'Entrada', Icon: ArrowDownLeft, color: 'text-green-400', background: 'bg-green-500/10' },
  expense: { label: 'Saída', Icon: ArrowUpRight, color: 'text-red-400', background: 'bg-red-500/10' },
  investment: { label: 'Investimento', Icon: PiggyBank, color: 'text-amber-400', background: 'bg-amber-500/10' },
};
const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export function TransactionTable({ transactions, onEdit }: TransactionTableProps) {
  if (!transactions.length) return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted-foreground">Nenhum lançamento nos filtros selecionados.</p>
      <p className="text-xs text-muted-foreground mt-1">Escolha outro período ou registre um novo lançamento.</p>
    </div>
  );
  return (
    <div className="divide-y divide-border/60">
      {transactions.map(transaction => {
        const style = styles[transaction.type];
        const Icon = style.Icon;
        const category = getCategoryDef(transaction.type, transaction.category);
        return (
          <button key={transaction.id} type="button" onClick={() => onEdit(transaction)}
            aria-label={`Editar ${style.label.toLowerCase()}: ${transaction.description}`}
            className="w-full flex items-center gap-3 py-4 px-2 text-left rounded-lg hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
            <span className={cn('w-9 h-9 rounded-xl shrink-0 flex items-center justify-center', style.background, style.color)}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{transaction.description}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {category?.label ?? transaction.category} · {format(transaction.date, 'dd/MM/yyyy')}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn('text-sm font-semibold tabular-nums', style.color)}>
                {transaction.type === 'income' ? '+ ' : transaction.type === 'expense' ? '− ' : ''}{currency(transaction.amount)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{style.label}</p>
            </div>
            <Pencil className="w-3.5 h-3.5 text-muted-foreground hidden sm:block shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
