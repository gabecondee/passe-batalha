import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceBag } from './ResourceBag';
import { Transaction } from '@/types/finance';

const mocks = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn(), remove: vi.fn(), transactions: [] as Transaction[] }));
vi.mock('@/hooks/useFinances', () => ({ useFinances: () => ({ transactions: mocks.transactions, addTransaction: mocks.add, updateTransaction: mocks.update, removeTransaction: mocks.remove }) }));

const selectTab = (name: string) => fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false });

describe('finance overview and unified transactions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 13, 12));
    mocks.transactions = [
      { id: '1', description: 'Salário recebido', type: 'income', amount: 1000, category: 'salario', subcategory: 'salario', date: new Date(2026, 9, 1) },
      { id: '2', description: 'Mercado da semana', type: 'expense', amount: 200, category: 'alimentacao', subcategory: 'alimentacao', date: new Date(2026, 9, 12) },
      { id: '3', description: 'Reserva mensal', type: 'investment', amount: 300, category: 'reserva', subcategory: 'reserva', date: new Date(2026, 9, 10) },
      { id: '4', description: 'Conta anterior', type: 'expense', amount: 100, category: 'contas', subcategory: 'contas', date: new Date(2026, 8, 20) },
    ];
  });
  afterEach(() => vi.useRealTimers());

  it('shows all records by default and filters one list without changing the period summary', () => {
    render(<ResourceBag />);
    const summary = screen.getByRole('region', { name: 'Resumo financeiro' });
    expect(within(summary).getByText('R$ 700,00')).toBeInTheDocument();
    expect(screen.getByText('Conta anterior')).toBeInTheDocument();
    selectTab('Entradas');
    expect(screen.getByText('Salário recebido')).toBeInTheDocument();
    expect(screen.queryByText('Mercado da semana')).not.toBeInTheDocument();
    expect(within(summary).getByText('R$ 700,00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mês atual' }));
    expect(within(summary).getByText('R$ 800,00')).toBeInTheDocument();
    selectTab('Todos');
    expect(screen.getByText('Mercado da semana')).toBeInTheDocument();
    expect(screen.queryByText('Conta anterior')).not.toBeInTheDocument();
  });

  it('preselects the active tab type and allows choosing another type without clearing the description', () => {
    render(<ResourceBag />);
    selectTab('Investimentos');
    fireEvent.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Investimento' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.change(within(dialog).getByLabelText('Descrição'), { target: { value: 'Novo registro' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Entrada' }));
    expect(within(dialog).getByRole('button', { name: 'Entrada' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('Novo registro');
  });

  it('opens the touched record for editing with its original data', () => {
    render(<ResourceBag />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar saída: Mercado da semana' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Descrição')).toHaveValue('Mercado da semana');
    expect(within(dialog).getByLabelText('Valor (R$)')).toHaveValue(200);
    expect(within(dialog).getByText('12/10/2026')).toBeInTheDocument();
    expect(within(dialog).queryByText('Tipo de lançamento')).not.toBeInTheDocument();
  });

  it('groups only expenses in the chart and makes it collapsible', () => {
    render(<ResourceBag />);
    fireEvent.click(screen.getByRole('button', { name: 'Expandir gráfico financeiro' }));
    const overview = screen.getByRole('list', { name: 'Distribuição de receitas e despesas' });
    expect(within(overview).getByText('Receitas')).toBeInTheDocument();
    expect(within(overview).getByText('Despesas')).toBeInTheDocument();
    expect(within(overview).getByText('76,9%')).toBeInTheDocument();
    expect(within(overview).getByText('23,1%')).toBeInTheDocument();
    expect(within(overview).queryByText('Investimentos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Despesas por categoria' }));
    const legend = screen.getByRole('list', { name: 'Distribuição das despesas' });
    expect(within(legend).getByText('Alimentação')).toBeInTheDocument();
    expect(within(legend).getByText('66,7%')).toBeInTheDocument();
    expect(within(legend).queryByText('Salário')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mês atual' }));
    expect(within(legend).getByText('100%')).toBeInTheDocument();
    expect(within(legend).queryByText('Contas')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Recolher gráfico financeiro' }));
    expect(screen.getByRole('button', { name: 'Expandir gráfico financeiro' })).toHaveAttribute('aria-expanded', 'false');
  });
});
