import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, Users, Globe, Crown, Medal, Award, User as UserIcon } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useGame } from '@/contexts/GameContext';
import { getLevelInfo } from '@/lib/leveling';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type Period = '7d' | '30d' | 'all';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: 'Últimos 7 dias' },
  { key: '30d', label: 'Últimos 30 dias' },
  { key: 'all', label: 'Geral' },
];

export default function Ranking() {
  const { user } = useGame();
  const [period, setPeriod] = useState<Period>('all');
  const [rawRanking, setRawRanking] = useState<any[]>([]);

  useEffect(() => {
    async function fetchRanking() {
      // Buscar profiles com seus respectivos XP's
      const { data } = await supabase.from('profiles').select('id, name, avatar, created_at, xp_physical, xp_mental, xp_spiritual, xp_professional, xp_financial');
      
      // Buscar streaks separadamente
      const { data: streaksData } = await supabase.from('streaks').select('user_id, streak_days');
      const streakMap = new Map((streaksData || []).map(s => [s.user_id, s.streak_days]));

      if (data) {
        const ranking = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          created_at: p.created_at,
          total_xp: (p.xp_physical || 0) + (p.xp_mental || 0) + (p.xp_spiritual || 0) + (p.xp_professional || 0) + (p.xp_financial || 0),
          streak: streakMap.get(p.id) || 0
        }));
        setRawRanking(ranking);
      }
    }
    fetchRanking();
  }, []);

  const fullRanking = useMemo(() => {
    const base = rawRanking.some((u) => u.id === user.id)
      ? rawRanking
      : [
          ...rawRanking,
          {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            created_at: new Date().toISOString(),
            total_xp: user.earnedTotalXP || 0,
            streak: 0,
          },
        ];

    return base
      .map((u) => ({ ...u, level: getLevelInfo(u.total_xp || 0).level }))
      .sort((a, b) => {
        // Regra inegociável 1: Algoritmo de ordenação (XP -> Streak -> CreatedAt)
        const xpA = a.total_xp || 0;
        const xpB = b.total_xp || 0;
        if (xpB !== xpA) return xpB - xpA;
        
        const streakA = a.streak || 0;
        const streakB = b.streak || 0;
        if (streakB !== streakA) return streakB - streakA;
        
        return (a.created_at || '').localeCompare(b.created_at || '');
      })
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [rawRanking, user]);

  const userRank = fullRanking.find((u) => u.id === user.id)?.rank ?? 0;

  const getRankBadge = (rank: number) => {
    if (rank === 1)
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-300/20 to-yellow-600/10 shadow-[0_0_12px_hsl(45_100%_55%/0.4)]">
          <Crown className="h-6 w-6 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" />
        </div>
      );
    if (rank === 2)
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200/20 to-slate-500/10">
          <Medal className="h-6 w-6 text-slate-300 drop-shadow-[0_0_6px_rgba(203,213,225,0.6)]" />
        </div>
      );
    if (rank === 3)
      return (
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-800/10">
          <Award className="h-6 w-6 text-amber-600 drop-shadow-[0_0_6px_rgba(217,119,6,0.6)]" />
        </div>
      );
    return (
      <div className="flex h-9 w-9 items-center justify-center">
        <span className="font-display text-lg font-semibold text-muted-foreground">{rank}</span>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center pt-2"
        >
          <div className="flex items-center justify-center gap-3">
            <Trophy
              className="h-7 w-7"
              style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }}
            />
            <h1
              className="font-display text-3xl md:text-4xl tracking-[0.18em] font-bold"
              style={{
                background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              RANKING
            </h1>
          </div>
          <p className="mt-2 text-xs md:text-sm text-muted-foreground">
            Compare seu progresso com outros guerreiros
          </p>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5 md:gap-4">
          <SummaryCard
            delay={0.05}
            icon={<Trophy className="h-6 w-6 md:h-7 md:w-7" />}
            value={`#${userRank}`}
            label="Sua Posição"
            accent="primary"
            highlight
          />
          <SummaryCard
            delay={0.1}
            icon={<TrendingUp className="h-6 w-6 md:h-7 md:w-7" />}
            value={(user.totalXP || 0).toLocaleString('pt-BR')}
            label="Seu XP Total"
            accent="blue"
          />
          <SummaryCard
            delay={0.15}
            icon={<Users className="h-6 w-6 md:h-7 md:w-7" />}
            value={fullRanking.length.toString()}
            label="Guerreiros Ativos"
            accent="blue"
          />
        </div>

        {/* Period filter */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/40 bg-card/40 p-1.5"
        >
          <div className="grid grid-cols-3 gap-1">
            {PERIODS.map((p) => {
              const active = p.key === period;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={cn(
                    'relative rounded-xl px-2 py-2.5 font-display text-[10px] md:text-xs uppercase tracking-[0.15em] transition-all',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="rank-period-pill"
                      className="absolute inset-0 rounded-xl border border-primary/60 bg-primary/10 shadow-[0_0_15px_hsl(var(--primary)/0.35)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative">{p.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Ranking List */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-border/40 bg-card/40 p-4 md:p-5"
        >
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-base md:text-lg font-bold uppercase tracking-widest text-foreground">
                Ranking Global
              </h2>
              <p className="text-xs text-muted-foreground">Os guerreiros mais poderosos</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={period}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {fullRanking.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum guerreiro encontrado.
                </div>
              ) : (
                fullRanking.map((u, i) => {
                  const isCurrent = u.id === user.id;
                  return (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      whileHover={{ scale: 1.005 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl border p-2.5 md:p-3 transition-all',
                        isCurrent
                          ? 'border-primary/60 bg-primary/10 shadow-[0_0_18px_hsl(var(--primary)/0.3)]'
                          : 'border-border/30 bg-background/40 hover:border-border/60',
                      )}
                    >
                      {/* Rank */}
                      <div className="w-10 shrink-0 flex justify-center">{getRankBadge(u.rank)}</div>

                      {/* Avatar */}
                      <div
                        className={cn(
                          'h-11 w-11 md:h-12 md:w-12 shrink-0 overflow-hidden rounded-full border-2',
                          u.rank === 1 && 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]',
                          u.rank === 2 && 'border-slate-300',
                          u.rank === 3 && 'border-amber-600',
                          u.rank > 3 && 'border-primary/40',
                        )}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-secondary/60">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'truncate font-display text-sm md:text-base font-semibold',
                              isCurrent ? 'text-primary' : 'text-foreground',
                            )}
                          >
                            {u.name}
                          </span>
                          {isCurrent && (
                            <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">Nível {u.level}</span>
                      </div>

                      {/* XP */}
                      <div
                        className={cn(
                          'shrink-0 rounded-xl border px-2.5 py-1.5 md:px-3.5 md:py-2 text-right',
                          u.rank <= 3
                            ? 'border-primary/50 bg-primary/10 shadow-[0_0_10px_hsl(var(--primary)/0.3)]'
                            : 'border-border/40 bg-background/60',
                        )}
                      >
                        <span
                          className={cn(
                            'font-display text-xs md:text-sm font-bold whitespace-nowrap',
                            u.rank <= 3 ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {Number(u.total_xp || 0).toLocaleString('pt-BR')} XP
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </motion.section>
      </div>
    </MainLayout>
  );
}

interface SummaryCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  accent: 'primary' | 'blue';
  highlight?: boolean;
  delay?: number;
}

function SummaryCard({ icon, value, label, accent, highlight, delay = 0 }: SummaryCardProps) {
  const iconColor = accent === 'primary' ? 'text-primary' : 'text-sky-400';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-3 md:p-4 text-center',
        highlight
          ? 'border-primary/60 bg-primary/5 shadow-[0_0_18px_hsl(var(--primary)/0.25)]'
          : accent === 'blue'
            ? 'border-sky-500/40 bg-sky-500/5 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
            : 'border-border/40 bg-card/40',
      )}
    >
      <span className={iconColor}>{icon}</span>
      <span className="font-display text-xl md:text-3xl font-bold text-foreground leading-none">
        {value}
      </span>
      <span className="font-display text-[9px] md:text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
    </motion.div>
  );
}
