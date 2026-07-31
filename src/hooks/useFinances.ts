import { useCallback, useEffect, useState } from 'react';
import { Transaction, FinanceSummary } from '@/types/finance';
import { toast } from '@/hooks/use-toast';
import { emit } from '@/lib/eventBus';

const STORAGE_KEY = 'passe_finances_v1';
const SYNC_EVENT = 'finances:sync';

const initialTransactions: Transaction[] = [];

function load(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialTransactions;
    const parsed = JSON.parse(raw) as Transaction[];
    return parsed.map((t) => ({ ...t, date: new Date(t.date) }));
  } catch {
    return initialTransactions;
  }
}

function save(list: Transaction[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    /* ignore */
  }
}

export function useFinances() {
  const [transactions, setTransactions] = useState<Transaction[]>(load);

  useEffect(() => {
    const sync = () => setTransactions(load());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');
  const investmentsList = transactions.filter((t) => t.type === 'investment');

  const totalIncome = incomes.reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, t) => acc + t.amount, 0);
  const balance = totalIncome - totalExpenses;
  const totalInvestments = investmentsList.reduce((acc, t) => acc + t.amount, 0);

  const summary: FinanceSummary = {
    totalIncome,
    totalExpenses,
    balance,
    totalInvestments,
    savingsRate: totalIncome > 0 ? (balance / totalIncome) * 100 : 0,
  };

  const persist = (next: Transaction[]) => {
    setTransactions(next);
    save(next);
    const newBalance =
      next.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0) -
      next.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    emit({ type: 'finance:changed', balance: newBalance });
  };

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'date'> & { date?: Date }) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `t${Date.now()}`,
      date: transaction.date ?? new Date(),
    };
    persist([...load(), newTransaction]);
    const title =
      transaction.type === 'income'
        ? '💰 Entrada registrada!'
        : transaction.type === 'investment'
          ? '📊 Investimento registrado!'
          : '📤 Saída registrada!';
    toast({
      title,
      description: `${transaction.description}: R$ ${transaction.amount.toFixed(2)}`,
    });
  }, []);

  const removeTransaction = useCallback((id: string) => {
    persist(load().filter((t) => t.id !== id));
    toast({
      title: '🗑️ Transação removida',
      description: 'O registro foi excluído com sucesso.',
    });
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    persist(load().map((t) => (t.id === id ? { ...t, ...updates } : t)));
  }, []);

  return {
    transactions,
    incomes,
    expenses,
    investments: investmentsList,
    summary,
    addTransaction,
    removeTransaction,
    updateTransaction,
  };
}
