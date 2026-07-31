import { Transaction, TransactionType, getCategoryDef } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionTableProps {
  transactions: Transaction[];
  type: TransactionType;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionTable({ transactions, type, onEdit }: TransactionTableProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const valueColor =
    type === 'income'
      ? 'text-green-500'
      : type === 'investment'
        ? 'text-amber-400'
        : 'text-red-500';

  const gridCols = 'grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 items-center';

  return (
    <div className="w-full">
      {/* Header */}
      <div className={cn(gridCols, 'px-1 pb-2 text-sm text-muted-foreground border-b border-border')}>
        <span />
        <span>Descrição</span>
        <span className="text-right">Valor</span>
      </div>

      {/* Rows */}
      {transactions.length === 0 ? (
        <div className="py-6" />
      ) : (
        <div className="divide-y divide-border">
          {transactions.map((t) => {
            const def = getCategoryDef(type, t.category);
            return (
              <div key={t.id} className={cn(gridCols, 'py-3 px-1')} title={def?.label ?? t.category}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-7 w-7 shrink-0', valueColor)}
                  onClick={() => onEdit(t)}
                  aria-label="Editar registro"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <span className="truncate text-sm">{t.description}</span>
                <span className={cn('font-display text-sm text-right whitespace-nowrap', valueColor)}>
                  {formatCurrency(t.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
