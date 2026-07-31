export type TransactionType = 'income' | 'expense' | 'investment';

// Legacy source values kept for backward compatibility of existing records
export type LegacySource =
  | 'clientes' | 'clt' | 'freelance' | 'investimentos' | 'outros'
  | 'cartao' | 'dinheiro' | 'pix' | 'debito';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  category: string;
  /** @deprecated kept for compatibility — mirrors category in new records */
  subcategory: string;
  amount: number;
  date: Date;
  /** @deprecated kept for compatibility with existing data */
  source?: LegacySource | string;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  totalInvestments: number;
  savingsRate: number;
}

export interface CategoryDef {
  value: string;
  label: string;
  subcategories: { value: string; label: string }[];
  colorClass: string; // badge styling
}

// ---- Simplified categories (single-level) ----

export const INCOME_CATEGORIES: CategoryDef[] = [
  {
    value: 'salario',
    label: 'CLT',
    colorClass: 'bg-green-500/15 text-green-400 border-green-500/30',
    subcategories: [{ value: 'salario', label: 'Salário' }],
  },
  {
    value: 'pro-labore',
    label: 'Pró-labore',
    colorClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    subcategories: [{ value: 'pro-labore', label: 'Pró-labore' }],
  },
  {
    value: 'outros',
    label: 'Outros',
    colorClass: 'bg-muted text-muted-foreground border-border',
    subcategories: [{ value: 'outros', label: 'Outros' }],
  },
];

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  { value: 'moradia', label: 'Moradia', colorClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30', subcategories: [{ value: 'moradia', label: 'Moradia' }] },
  { value: 'alimentacao', label: 'Alimentação', colorClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30', subcategories: [{ value: 'alimentacao', label: 'Alimentação' }] },
  { value: 'transporte', label: 'Transporte', colorClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', subcategories: [{ value: 'transporte', label: 'Transporte' }] },
  { value: 'saude', label: 'Saúde', colorClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', subcategories: [{ value: 'saude', label: 'Saúde' }] },
  { value: 'educacao', label: 'Educação', colorClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30', subcategories: [{ value: 'educacao', label: 'Educação' }] },
  { value: 'lazer', label: 'Lazer', colorClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30', subcategories: [{ value: 'lazer', label: 'Lazer' }] },
  { value: 'contas', label: 'Contas', colorClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', subcategories: [{ value: 'contas', label: 'Contas' }] },
  { value: 'compras', label: 'Compras', colorClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30', subcategories: [{ value: 'compras', label: 'Compras' }] },
  { value: 'investimentos', label: 'Investimentos', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', subcategories: [{ value: 'investimentos', label: 'Investimentos' }] },
  { value: 'outros', label: 'Outros', colorClass: 'bg-muted text-muted-foreground border-border', subcategories: [{ value: 'outros', label: 'Outros' }] },
];

export const INVESTMENT_CATEGORIES: CategoryDef[] = [
  { value: 'reserva', label: 'Reserva de Emergência', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'reserva', label: 'Reserva de Emergência' }] },
  { value: 'renda-fixa', label: 'Renda Fixa', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'renda-fixa', label: 'Renda Fixa' }] },
  { value: 'renda-variavel', label: 'Renda Variável', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'renda-variavel', label: 'Renda Variável' }] },
  { value: 'patrimonio', label: 'Patrimônio', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'patrimonio', label: 'Patrimônio' }] },
  { value: 'cripto', label: 'Criptomoedas', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'cripto', label: 'Criptomoedas' }] },
  { value: 'empreendimento', label: 'Empreendimento', colorClass: 'bg-amber-500/15 text-amber-400 border-amber-500/40', subcategories: [{ value: 'empreendimento', label: 'Empreendimento' }] },
];

export function getCategoryDef(type: TransactionType, category: string): CategoryDef | undefined {
  const list =
    type === 'income'
      ? INCOME_CATEGORIES
      : type === 'expense'
        ? EXPENSE_CATEGORIES
        : INVESTMENT_CATEGORIES;
  return list.find((c) => c.value === category);
}
