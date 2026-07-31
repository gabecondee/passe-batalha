import { Trophy } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useGame } from '@/contexts/GameContext';
import { useAgenda } from '@/hooks/useAgenda';
import { useJournal } from '@/hooks/useJournal';
import { useFinances } from '@/hooks/useFinances';
import { useAchievementsData } from '@/hooks/useAchievementsData';
import { useBoss } from '@/contexts/BossContext';
import { useStreakReward } from '@/hooks/useStreakReward';
import { ranking } from '@/data/mockData';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-display">{label}</p>
      <p className="font-display text-lg text-primary">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fantasy-card p-5 space-y-3">
      <h3 className="font-display uppercase tracking-wider text-sm text-primary">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );
}

export default function StatisticsSettings() {
  const { user, attributes, missions } = useGame();
  const { events } = useAgenda();
  const { entries } = useJournal();
  const { summary: finance, transactions } = useFinances();
  const { summary: achSummary, byRarity, achievements } = useAchievementsData();
  const { battles, bosses } = useBoss();
  const { state: streak } = useStreakReward();

  const now = new Date();
  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const activeMissions = missions.filter(m => m.status === 'active' || m.status === 'in_progress').length;
  const total = missions.length;
  const conclusion = total > 0 ? Math.round((completedMissions / total) * 100) : 0;

  const eventsDone = events.filter(e => e.completed).length;
  const eventsLate = events.filter(e => !e.completed && new Date(e.date) < now).length;

  const words = entries.reduce((s, e) => s + e.wordCount, 0);

  const investments = transactions
    .filter(t => t.category === 'investimentos' && t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);

  const userInRank = ranking.find(u => u.id === user.id)?.rank ?? '—';
  const achXp = achievements.filter(a => a.unlocked).reduce((s, a) => s + (a.xp || 0), 0);
  const mostRarity = Object.entries(byRarity).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  const bossWins = bosses.filter(b => b.defeated).length;
  const bossLosses = Object.values(battles).reduce((s, b) => s + (b.losses || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-5 max-w-4xl mx-auto pb-8">
        <SettingsHeader icon={Trophy} title="Estatísticas" backTo="/settings" />

        <Section title="Evolução">
          <Stat label="XP Total" value={user.totalXP} />
          <Stat label="Nível atual" value={user.level} />
          <Stat label="Dias consecutivos" value={streak.streak_days} />
          <Stat label="Maior sequência" value={streak.best_streak} />
          {attributes.map(a => (
            <Stat key={a.type} label={`XP ${a.name}`} value={a.xp} />
          ))}
        </Section>

        <Section title="Missões">
          <Stat label="Criadas" value={total} />
          <Stat label="Concluídas" value={completedMissions} />
          <Stat label="Ativas" value={activeMissions} />
          <Stat label="Taxa de conclusão" value={`${conclusion}%`} />
        </Section>

        <Section title="Agenda">
          <Stat label="Eventos criados" value={events.length} />
          <Stat label="Concluídos" value={eventsDone} />
          <Stat label="Atrasados" value={eventsLate} />
        </Section>

        <Section title="Diário">
          <Stat label="Registros" value={entries.length} />
          <Stat label="Palavras" value={words} />
          <Stat label="Categorias" value={new Set(entries.map(e => e.category)).size} />
        </Section>

        <Section title="Treinos & Dieta">
          <Stat label="Treinos realizados" value={Number(localStorage.getItem('trainings_completed') || 0)} />
          <Stat label="Dias treinados" value={Number(localStorage.getItem('training_days') || 0)} />
          <Stat label="Dias dieta" value={Number(localStorage.getItem('diet_days_followed') || 0)} />
          <Stat label="Calorias registradas" value={Number(localStorage.getItem('diet_kcal_total') || 0)} />
        </Section>

        <Section title="Finanças">
          <Stat label="Entradas" value={`R$ ${finance.totalIncome.toLocaleString('pt-BR')}`} />
          <Stat label="Saídas" value={`R$ ${finance.totalExpenses.toLocaleString('pt-BR')}`} />
          <Stat label="Saldo" value={`R$ ${finance.balance.toLocaleString('pt-BR')}`} />
          <Stat label="Investido" value={`R$ ${investments.toLocaleString('pt-BR')}`} />
        </Section>

        <Section title="Conquistas">
          <Stat label="Desbloqueadas" value={achSummary.unlocked} />
          <Stat label="Restantes" value={achSummary.locked} />
          <Stat label="Raridade top" value={String(mostRarity)} />
          <Stat label="XP conquistado" value={achXp} />
        </Section>

        <Section title="Ranking & Bosses">
          <Stat label="Posição global" value={String(userInRank)} />
          <Stat label="Bosses derrotados" value={bossWins} />
          <Stat label="Derrotas" value={bossLosses} />
          <Stat label="Fragmentos" value={streak.total_fragments} />
        </Section>
      </div>
    </MainLayout>
  );
}
