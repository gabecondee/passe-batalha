import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Check, Gem, Sparkles, HeartCrack, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StreakOutcome } from '@/hooks/useStreakReward';

interface StreakRewardScreenProps {
  outcome: StreakOutcome;
  onContinue: () => void;
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Flame tier evolves with streak
function flameTier(streak: number) {
  if (streak >= 100)
    return { label: 'Mítica', color: 'hsl(280, 90%, 65%)', glow: 'hsl(280, 100%, 70%)', size: 1.5, particles: 18 };
  if (streak >= 60)
    return { label: 'Lendária', color: 'hsl(0, 90%, 60%)', glow: 'hsl(15, 100%, 60%)', size: 1.4, particles: 14 };
  if (streak >= 30)
    return { label: 'Épica', color: 'hsl(20, 95%, 58%)', glow: 'hsl(35, 100%, 60%)', size: 1.3, particles: 10 };
  if (streak >= 14)
    return { label: 'Maior', color: 'hsl(30, 95%, 58%)', glow: 'hsl(45, 100%, 60%)', size: 1.2, particles: 7 };
  if (streak >= 7)
    return { label: 'Brilhante', color: 'hsl(40, 95%, 60%)', glow: 'hsl(50, 100%, 65%)', size: 1.1, particles: 5 };
  return { label: 'Inicial', color: 'hsl(35, 90%, 60%)', glow: 'hsl(45, 100%, 65%)', size: 1, particles: 3 };
}

function Counter({ from, to, duration = 1.1 }: { from: number; to: number; duration?: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    if (from === to) {
      setValue(to);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, duration]);
  return <>{value}</>;
}

export function StreakRewardScreen({ outcome, onContinue }: StreakRewardScreenProps) {
  const { state, previousStreak, isBroken, dailyReward, bonusReward, bonusMilestone, totalReward, alreadyCheckedToday } =
    outcome;

  const streak = state.streak_days;
  const tier = useMemo(() => flameTier(streak), [streak]);

  const today = new Date();
  const todayIdx = today.getDay(); // 0 Sun

  // Build last 7 days view (offset so that current week shows; we mark each day done if streak covers it)
  // Simple: starting from Sunday of current week, a day is "done" if its index <= todayIdx and (todayIdx - i) < streak
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const isPast = i < todayIdx;
      const isToday = i === todayIdx;
      const daysBack = todayIdx - i;
      const done = (isPast || isToday) && daysBack < streak;
      return { label: DAY_LABELS[i], isToday, done };
    });
  }, [todayIdx, streak]);

  if (isBroken && previousStreak > 0) {
    return (
      <div className="text-center">
        <motion.div
          className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center border border-destructive/40 bg-destructive/10 mb-4"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
        >
          <HeartCrack className="w-10 h-10 text-destructive" />
        </motion.div>
        <h2 className="font-display text-lg tracking-wider text-destructive mb-2">
          OFENSIVA QUEBRADA
        </h2>
        <p className="text-sm text-foreground/80 mb-1">
          Você manteve uma sequência de <span className="font-display text-primary">{previousStreak}</span>{' '}
          {previousStreak === 1 ? 'dia' : 'dias'}.
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Todo herói recomeça quantas vezes forem necessárias.
        </p>

        {/* Show new streak start */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Flame className="w-5 h-5 text-primary" />
          <span className="font-display text-2xl text-primary glow-text">{streak}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider">novo início</span>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl font-display text-sm tracking-wider bg-destructive/10 border border-destructive/40 text-destructive hover:bg-destructive/20 transition-all flex items-center justify-center gap-2"
        >
          <Swords className="w-4 h-4" />
          RECOMEÇAR JORNADA
        </button>
      </div>
    );
  }

  return (
    <div className="text-center relative overflow-hidden">
      {/* Background glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${tier.glow}30 0%, transparent 60%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      />

      {/* Flame */}
      <div className="relative h-32 flex items-center justify-center mb-2">
        {/* Particles */}
        {Array.from({ length: tier.particles }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: tier.glow,
              boxShadow: `0 0 6px ${tier.glow}`,
              left: `${50 + (Math.random() - 0.5) * 60}%`,
              top: `${50 + (Math.random() - 0.5) * 30}%`,
            }}
            animate={{
              y: [-10, -50 - Math.random() * 30],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: 1.8 + Math.random() * 1.5,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: 'easeOut',
            }}
          />
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: tier.size, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 120 }}
          style={{
            filter: `drop-shadow(0 0 20px ${tier.glow}) drop-shadow(0 0 40px ${tier.glow}80)`,
          }}
        >
          <Flame
            className="w-20 h-20"
            style={{ color: tier.color, fill: tier.color }}
            strokeWidth={1.5}
          />
        </motion.div>
      </div>

      {/* Counter */}
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className="font-display text-6xl md:text-7xl text-primary glow-text leading-none">
          <Counter from={previousStreak} to={streak} />
        </p>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mt-2">
          {streak === 1 ? 'DIA DE OFENSIVA' : 'DIAS DE OFENSIVA'}
        </p>
        <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: tier.color }}>
          Chama {tier.label}
        </p>
      </motion.div>

      {/* Week calendar */}
      <motion.div
        className="grid grid-cols-7 gap-1.5 mt-6 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {weekDays.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                'text-[10px] uppercase tracking-wider',
                d.isToday ? 'text-primary font-display' : 'text-muted-foreground'
              )}
            >
              {d.label}
            </span>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05, type: 'spring' }}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all',
                d.done
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border/50 bg-muted/20 text-muted-foreground/40',
                d.isToday && 'ring-2 ring-primary/60 ring-offset-2 ring-offset-card'
              )}
              style={
                d.done
                  ? {
                      boxShadow: `0 0 12px hsl(var(--primary) / 0.5)`,
                    }
                  : undefined
              }
            >
              {d.done ? (
                <Check className="w-4 h-4" strokeWidth={3} />
              ) : (
                <span className="text-[10px]" />
              )}
            </motion.div>
          </div>
        ))}
      </motion.div>

      {/* Rewards */}
      {!alreadyCheckedToday ? (
        <motion.div
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6 relative overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Gem className="w-4 h-4 text-accent" />
            <h3 className="font-display text-xs tracking-wider text-accent uppercase">
              Recompensas Recebidas
            </h3>
          </div>

          <div className="space-y-2">
            <RewardRow
              label="Check diário"
              amount={dailyReward}
              delay={1.0}
            />
            <AnimatePresence>
              {bonusReward > 0 && (
                <RewardRow
                  label={`Bônus de ${bonusMilestone} dias`}
                  amount={bonusReward}
                  delay={1.2}
                  highlight
                />
              )}
            </AnimatePresence>

            <div className="border-t border-border/50 pt-2 mt-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <div className="flex items-center gap-1.5">
                <Gem className="w-4 h-4 text-accent" />
                <span className="font-display text-lg text-accent glow-text">
                  +<Counter from={0} to={totalReward} duration={1.2} />
                </span>
              </div>
            </div>
          </div>

          {/* Floating gems */}
          {bonusReward > 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{ left: `${20 + i * 12}%`, bottom: 0 }}
                initial={{ y: 0, opacity: 0 }}
                animate={{ y: -80, opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, delay: 1.3 + i * 0.1, ease: 'easeOut' }}
              >
                <Sparkles className="w-3 h-3 text-accent" />
              </motion.div>
            ))}
        </motion.div>
      ) : (
        <motion.p
          className="text-xs text-muted-foreground mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Check-in já registrado hoje. Volte amanhã para mais fragmentos.
        </motion.p>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
        <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-center">
          <p className="text-muted-foreground">Recorde</p>
          <p className="font-display text-base text-primary">{state.best_streak} dias</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/20 p-2 text-center">
          <p className="text-muted-foreground">Fragmentos</p>
          <p className="font-display text-base text-accent flex items-center justify-center gap-1">
            <Gem className="w-3 h-3" /> {state.total_fragments.toLocaleString()}
          </p>
        </div>
      </div>


      <motion.button
        onClick={onContinue}
        className="w-full py-3 rounded-xl font-display text-sm tracking-wider bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition-all"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        CONTINUAR
      </motion.button>
    </div>
  );
}

function RewardRow({
  label,
  amount,
  delay,
  highlight,
}: {
  label: string;
  amount: number;
  delay: number;
  highlight?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2',
        highlight ? 'bg-accent/10 border border-accent/30' : 'bg-muted/30'
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
    >
      <span className="text-xs text-foreground/80">{label}</span>
      <div className="flex items-center gap-1.5">
        <Gem className={cn('w-3.5 h-3.5', highlight ? 'text-accent' : 'text-primary')} />
        <span
          className={cn(
            'font-display text-sm',
            highlight ? 'text-accent glow-text' : 'text-primary'
          )}
        >
          +{amount}
        </span>
      </div>
    </motion.div>
  );
}
