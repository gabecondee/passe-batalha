import { Gem, ShoppingBag, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useStreakReward } from '@/hooks/useStreakReward';

export default function FragmentsSettings() {
  const { state } = useStreakReward();
  const navigate = useNavigate();

  const gained = state.fragment_history.reduce((s, h) => s + h.amount, 0);
  const spent = state.shop_purchases.reduce((s, p) => s + p.cost, 0);

  const timeline = [
    ...state.fragment_history.map(h => ({ date: h.date, amount: h.amount, reason: h.reason, type: 'in' as const })),
    ...state.shop_purchases.map(p => ({ date: p.date, amount: -p.cost, reason: `Compra: ${p.itemName}`, type: 'out' as const })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <MainLayout>
      <div className="space-y-6 max-w-3xl mx-auto pb-8">
        <SettingsHeader icon={Gem} title="Fragmentos" backTo="/settings" />

        <div className="fantasy-card p-6 text-center relative overflow-hidden">
          <Gem className="absolute right-4 bottom-4 w-24 h-24 text-primary/10" />
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-display">Saldo atual</p>
          <p className="font-display text-5xl text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)] mt-2">
            {state.total_fragments.toLocaleString('pt-BR')}
          </p>
          <button onClick={() => navigate('/shop')} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/50 text-primary text-sm font-display tracking-wider hover:bg-primary/10 transition-colors">
            <ShoppingBag className="w-4 h-4" /> IR PARA A LOJA
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="fantasy-card p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <p className="text-xs uppercase font-display">Entradas</p>
            </div>
            <p className="font-display text-2xl mt-1">{gained.toLocaleString('pt-BR')}</p>
          </div>
          <div className="fantasy-card p-4">
            <div className="flex items-center gap-2 text-rose-400">
              <TrendingDown className="w-4 h-4" />
              <p className="text-xs uppercase font-display">Gastos</p>
            </div>
            <p className="font-display text-2xl mt-1">{spent.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="fantasy-card p-5">
          <h3 className="font-display uppercase tracking-wider text-sm text-primary mb-3">Histórico</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma movimentação ainda.</p>
          ) : (
            <ul className="divide-y divide-border/50 max-h-96 overflow-y-auto">
              {timeline.map((t, i) => (
                <li key={i} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm">{t.reason}</p>
                    <p className="text-[11px] text-muted-foreground">{t.date}</p>
                  </div>
                  <p className={`font-display ${t.type === 'in' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
