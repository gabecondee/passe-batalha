import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield,
  Gem,
  Wallet,
  Banknote,
  Calendar,
  Medal,
  Dumbbell,
  Apple,
  BookOpen,
  Backpack,
  LucideIcon,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageTransition } from '@/components/layout/PageTransition';
import { useGame } from '@/contexts/GameContext';
import { useFinances } from '@/hooks/useFinances';
import { useStreakReward } from '@/hooks/useStreakReward';
import { cn, formatCompactNumber } from '@/lib/utils';
import mochilaAsset from '@/assets/mochila.png.asset.json';

interface ShortcutCard {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
  color: string;
  glow: string;
}

const shortcuts: ShortcutCard[] = [
  { id: 'finances', label: 'Finanças', icon: Banknote, route: '/resources', color: 'text-emerald-400', glow: 'hover:shadow-[0_0_20px_hsl(142_70%_45%/0.35)] hover:border-emerald-400/60' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, route: '/agenda', color: 'text-sky-400', glow: 'hover:shadow-[0_0_20px_hsl(200_90%_55%/0.35)] hover:border-sky-400/60' },
  { id: 'achievements', label: 'Conquistas', icon: Medal, route: '/achievements', color: 'text-amber-400', glow: 'hover:shadow-[0_0_20px_hsl(45_90%_55%/0.35)] hover:border-amber-400/60' },
  { id: 'training', label: 'Treino', icon: Dumbbell, route: '/training', color: 'text-red-400', glow: 'hover:shadow-[0_0_20px_hsl(0_80%_60%/0.35)] hover:border-red-400/60' },
  { id: 'diet', label: 'Dieta', icon: Apple, route: '/diet', color: 'text-green-400', glow: 'hover:shadow-[0_0_20px_hsl(140_70%_50%/0.35)] hover:border-green-400/60' },
  { id: 'journal', label: 'Diário de Bordo', icon: BookOpen, route: '/journal', color: 'text-purple-400', glow: 'hover:shadow-[0_0_20px_hsl(280_80%_65%/0.35)] hover:border-purple-400/60' },
];

export default function Inventory() {
  const navigate = useNavigate();
  const { user } = useGame();
  const { summary } = useFinances();
  const { state: streakState } = useStreakReward();

  const investDisplay =
    'R$ ' +
    summary.totalInvestments.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const resources = [
    { id: 'shields', label: 'Bloqueadores', value: formatCompactNumber(streakState.streak_shields), icon: Shield, color: 'text-[#38bdf8]', border: 'border-[#38bdf8]/40' },
    { id: 'fragments', label: 'Fragmentos', value: formatCompactNumber(streakState.total_fragments), icon: Gem, color: 'text-sky-400', border: 'border-sky-400/40' },
    { id: 'investments', label: 'Investimentos', value: formatCompactNumber(summary.totalInvestments), icon: Wallet, color: 'text-emerald-400', border: 'border-emerald-400/40' },
  ];

  return (
    <MainLayout>
      <PageTransition>
        <div className="min-h-screen p-4 pb-24 max-w-2xl mx-auto">
          {/* Title + description (centered) */}
          <div className="pt-2 text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <Backpack
                className="w-8 h-8"
                style={{ color: '#f59e0b', filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.55))' }}
              />
              <h1
                className="font-display text-3xl md:text-4xl tracking-[0.2em] uppercase"
                style={{
                  background: 'linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Inventário
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Gerencie seus recursos e itens.
            </p>
          </div>

          {/* Backpack image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex justify-center my-6"
          >
            <motion.img
              src={mochilaAsset.url}
              alt="Mochila do caçador"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="w-56 h-56 md:w-72 md:h-72 object-contain drop-shadow-[0_0_35px_hsl(280_90%_60%/0.55)]"
            />
          </motion.div>

          {/* Resource cards — icon, label, value all centered */}
          <div className="grid grid-cols-3 gap-3">
            {resources.map((r, i) => {
              const Icon = r.icon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className={cn(
                    'rounded-2xl border bg-card/60 backdrop-blur-sm p-4 flex flex-col items-center text-center gap-2',
                    r.border,
                  )}
                >
                  <Icon className={cn('w-7 h-7', r.color)} strokeWidth={1.75} />
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  <span className={cn('font-display text-lg md:text-xl font-bold', r.color)}>
                    {r.value}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 py-4">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="w-2 h-2 rotate-45 bg-primary/60 shadow-[0_0_10px_hsl(var(--primary)/0.6)]" />
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          </div>

          {/* Shortcuts grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {shortcuts.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  onClick={() => navigate(s.route)}
                  className={cn(
                    'group rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 md:p-5 flex flex-col items-center justify-center gap-3 aspect-square transition-all active:scale-95',
                    s.glow,
                  )}
                >
                  <Icon
                    className={cn('w-10 h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110', s.color)}
                    strokeWidth={1.75}
                  />
                  <span className="font-display text-[11px] md:text-xs uppercase tracking-[0.2em] text-foreground text-center">
                    {s.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </PageTransition>
    </MainLayout>
  );
}
