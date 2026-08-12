import { useEffect, useState } from 'react';
import {
  Transaction,
  TransactionType,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  INVESTMENT_CATEGORIES,
} from '@/types/finance';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TrendingUp, TrendingDown, PiggyBank, Trash2, CalendarIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AddTransactionDialogProps {
  type: TransactionType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd?: (transaction: Omit<Transaction, 'id' | 'date'> & { date?: Date }) => void;
  initial?: Transaction;
  onUpdate?: (id: string, updates: Partial<Transaction>) => void;
  onDelete?: (id: string) => void;
}

const INVEST_COLOR = '#eca634';

export function AddTransactionDialog({
  type,
  open,
  onOpenChange,
  onAdd,
  initial,
  onUpdate,
  onDelete,
}: AddTransactionDialogProps) {
  const isEdit = !!initial;
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [dateOpen, setDateOpen] = useState(false);

  const isIncome = type === 'income';
  const isInvestment = type === 'investment';
  const categories = isIncome
    ? INCOME_CATEGORIES
    : isInvestment
      ? INVESTMENT_CATEGORIES
      : EXPENSE_CATEGORIES;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setDescription(initial.description);
      const exists = categories.some((c) => c.value === initial.category);
      setCategory(exists ? initial.category : '');
      setAmount(String(initial.amount));
      setDate(new Date(initial.date));
    } else {
      setDescription('');
      setCategory('');
      setAmount('');
      setDate(new Date());
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!description.trim()) {
      toast({ title: 'Descrição obrigatória', variant: 'destructive' });
      return;
    }
    if (!category) {
      toast({ title: 'Selecione a categoria', variant: 'destructive' });
      return;
    }
    if (!date) {
      toast({ title: 'Selecione a data', variant: 'destructive' });
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: 'Informe um valor maior que zero', variant: 'destructive' });
      return;
    }

    if (isEdit && initial && onUpdate) {
      onUpdate(initial.id, {
        description: description.trim(),
        category,
        subcategory: category,
        amount: parsedAmount,
        date,
      });
      toast({ title: '✏️ Registro atualizado' });
    } else if (onAdd) {
      onAdd({
        type,
        description: description.trim(),
        category,
        subcategory: category,
        amount: parsedAmount,
        date,
      });
    }

    onOpenChange(false);
  };

  const handleDelete = () => {
    if (initial && onDelete) {
      onDelete(initial.id);
      onOpenChange(false);
    }
  };

  const titleLabel = isEdit
    ? (isIncome ? 'Editar Entrada' : isInvestment ? 'Editar Investimento' : 'Editar Saída')
    : (isIncome ? 'Nova Entrada' : isInvestment ? 'Novo Investimento' : 'Nova Saída');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 uppercase tracking-wider">
            {isIncome ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : isInvestment ? (
              <PiggyBank className="w-5 h-5" style={{ color: INVEST_COLOR }} />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            <span>{titleLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder={
                isIncome
                  ? 'Ex: Salário, Freelance...'
                  : isInvestment
                    ? 'Ex: Tesouro Selic, Bitcoin...'
                    : 'Ex: Academia, Internet...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    'w-full justify-between font-normal',
                    !date && 'text-muted-foreground',
                  )}
                >
                  {date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : 'Selecione a data'}
                  <CalendarIcon className="w-4 h-4 opacity-70" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={new Date().getFullYear() + 1}
                  selected={date}
                  onSelect={(d) => { if(d) setDate(d); setDateOpen(false); }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {isEdit ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className={
                      isIncome
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : isInvestment
                          ? 'text-white hover:opacity-90'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                    }
                    style={isInvestment ? { backgroundColor: INVEST_COLOR } : undefined}
                  >
                    Salvar
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDelete}
                  className="w-full text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="submit"
                  className={cn(
                    'w-full',
                    isIncome
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : isInvestment
                        ? 'text-white hover:opacity-90'
                        : 'bg-red-600 hover:bg-red-700 text-white',
                  )}
                  style={isInvestment ? { backgroundColor: INVEST_COLOR } : undefined}
                >
                  Adicionar
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
