import { motion } from 'framer-motion';
import { useGame } from '@/contexts/GameContext';
import { useFinances } from '@/hooks/useFinances';
import { inventory } from '@/data/mockData';
import { Sparkles, Coins, Zap, Trophy } from 'lucide-react';
import { formatCompactNumber } from '@/lib/utils';

export function InventoryHero() {
  const { user } = useGame();
  const { summary } = useFinances();

  const totalArtifacts = inventory.reduce((acc, item) => acc + item.quantity, 0);
  const coins = Math.max(0, Math.round(summary.balance));

  const stats = [
    {
      icon: Zap,
      label: 'XP Total',
      value: formatCompactNumber(user.totalXP),
      color: 'text-primary',
      glow: 'shadow-[0_0_20px_hsl(var(--primary)/0.5)]',
    },
    {
      icon: Coins,
      label: 'Moedas',
      value: formatCompactNumber(coins),
      color: 'text-legendary',
      glow: 'shadow-[0_0_20px_hsl(var(--legendary)/0.5)]',
    },
    {
      icon: Trophy,
      label: 'Artefatos',
      value: formatCompactNumber(totalArtifacts),
      color: 'text-epic',
      glow: 'shadow-[0_0_20px_hsl(var(--epic)/0.5)]',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-card via-background to-card p-6 md:p-8"
      style={{
        boxShadow:
          '0 0 40px hsl(var(--primary) / 0.2), inset 0 0 80px hsl(var(--primary) / 0.05)',
      }}
    >
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-epic/20 blur-3xl animate-pulse-glow" />

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary"
            initial={{
              x: Math.random() * 100 + '%',
              y: '110%',
              opacity: 0,
            }}
            animate={{
              y: '-10%',
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.8,
              ease: 'linear',
            }}
            style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary)))' }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Central icon - holographic chest */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', delay: 0.2, duration: 0.8 }}
          className="relative mb-4"
        >
          <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/30 blur-2xl" />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-primary/50 bg-gradient-to-br from-primary/20 to-epic/20 md:h-24 md:w-24"
            style={{
              boxShadow:
                '0 0 30px hsl(var(--primary) / 0.6), inset 0 0 20px hsl(var(--primary) / 0.3)',
            }}
          >
            <Sparkles className="h-10 w-10 text-primary md:h-12 md:w-12 drop-shadow-[0_0_8px_hsl(var(--primary))]" />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-display text-2xl uppercase tracking-widest text-gradient-cyan md:text-3xl"
        >
          Seus Recursos
        </motion.h2>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-muted-foreground md:text-sm">
          Inventário do Caçador
        </p>

        {/* Stats grid */}
        <div className="mt-6 grid w-full grid-cols-3 gap-3 md:gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className={`relative flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 backdrop-blur-sm transition-all hover:border-primary/50 hover:${stat.glow}`}
            >
              <stat.icon className={`mb-1 h-4 w-4 md:h-5 md:w-5 ${stat.color}`} />
              <span className={`font-display text-lg font-bold md:text-2xl ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground md:text-xs">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
