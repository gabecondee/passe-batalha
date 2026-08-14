import { useCallback, useEffect, useState } from 'react';
import { Transaction, FinanceSummary } from '@/types/finance';
import { toast } from '@/hooks/use-toast';
import { emit, useBusEvent } from '@/lib/eventBus';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFinances() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Erro ao buscar transações:", error);
      return;
    }
    
    if (data) {
      const mapped: Transaction[] = data.map(d => ({
        id: d.id,
        description: d.description,
        category: d.category,
        type: d.type as 'income' | 'expense' | 'investment',
        date: new Date(d.date),
        amount: Number(d.amount)
      }));
      setTransactions(mapped);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useBusEvent(useCallback((e) => {
    if (e.type === 'finance:changed') {
      fetchTransactions();
    }
  }, [fetchTransactions]));

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

  const dispatchEvents = (next: Transaction[]) => {
    window.dispatchEvent(new CustomEvent('finances:sync'));
    const newBalance =
      next.filter((t) => t.type === 'income').reduce((a, t) => a + t.amount, 0) -
      next.filter((t) => t.type === 'expense').reduce((a, t) => a + t.amount, 0);
    emit({ type: 'finance:changed', balance: newBalance });
  };

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'date'> & { date?: Date }) => {
    if (!user) return;
    
    const txDate = transaction.date ?? new Date();
    // Extrai o formato YYYY-MM-DD
    const isoDate = txDate.toISOString().split('T')[0];
    
    const { data: insertedData, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: transaction.description,
        category: transaction.category,
        type: transaction.type,
        date: isoDate,
        amount: transaction.amount
      })
      .select()
      .single();
      
    if (error) {
      console.error("Erro ao adicionar transação:", error);
      toast({ title: 'Erro', description: 'Não foi possível salvar a transação.' });
      return;
    }
    
    const newTransaction: Transaction = {
      id: insertedData.id,
      description: insertedData.description,
      category: insertedData.category,
      type: insertedData.type as any,
      date: new Date(insertedData.date + 'T12:00:00'), // garante que o fuso horário não jogue pro dia anterior
      amount: Number(insertedData.amount)
    };

    setTransactions(prev => {
      const next = [...prev, newTransaction].sort((a, b) => b.date.getTime() - a.date.getTime());
      dispatchEvents(next);
      return next;
    });

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
  }, [user]);

  const removeTransaction = useCallback(async (id: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error("Erro ao remover transação:", error);
      toast({ title: 'Erro', description: 'Não foi possível remover a transação.' });
      return;
    }
    
    setTransactions(prev => {
      const next = prev.filter((t) => t.id !== id);
      dispatchEvents(next);
      return next;
    });

    toast({
      title: '🗑️ Transação removida',
      description: 'O registro foi excluído com sucesso.',
    });
  }, [user]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!user) return;
    
    const payload: any = {};
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.amount !== undefined) payload.amount = updates.amount;
    if (updates.date !== undefined) payload.date = updates.date.toISOString().split('T')[0];

    const { error } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error("Erro ao atualizar transação:", error);
      return;
    }
    
    setTransactions(prev => {
      const next = prev.map((t) => (t.id === id ? { ...t, ...updates } : t)).sort((a, b) => b.date.getTime() - a.date.getTime());
      dispatchEvents(next);
      return next;
    });
  }, [user]);

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
