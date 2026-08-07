import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, ChevronRight } from 'lucide-react';
import { emit } from '@/lib/eventBus';
import { cn } from '@/lib/utils';
import { useGame } from '@/contexts/GameContext';
import { useStreakReward, type StreakOutcome } from '@/hooks/useStreakReward';
import { StreakRewardScreen } from './StreakRewardScreen';

const ENERGY_DATA: Record<number, { description: string; activities: string[] }> = {
  0: {
    description: 'Morto',
    activities: ['RIP', 'Busque ajuda na comunidade'],
  },
  1: {
    description: 'Fadiga excessiva, ansiedade e pensamentos negativos.',
    activities: [
      'Meditação por 15min controlando a respiração.',
      'Escreva o que está sentindo no diário.',
      'Caminhada ao ar livre.',
      'Evite contato social.',
      'Visite seus artefatos lendários.',
    ],
  },
  5: {
    description: 'Fadiga, cérebro lento.',
    activities: [
      'Alimente-se bem, beba bastante água.',
      'Faça uma caminhada ao ar livre.',
      'Durma cedo e evite telas.',
    ],
  },
  6: {
    description: 'Falta de sono. Início da fadiga.',
    activities: [
      'Não exagere e nem se cobre tanto.',
      'Trabalhos menos cansativos para a mente.',
      'Prefira trabalhos manuais ou tarefas domésticas.',
      'Faça afirmações, escreva no diário.',
    ],
  },
  7: {
    description: 'Normal — Objetivo, energizado, tranquilo.',
    activities: [
      'Consegue se concentrar bem.',
      'Tarefas cognitivas: estudar, pensar de forma estratégica, ler, escrever.',
    ],
  },
  8: {
    description: 'Ativo e alerta.',
    activities: [
      'Capaz de realizar mais tarefas do que o habitual.',
      'Aproveite a energia!',
    ],
  },
  10: {
    description: 'Cheio de energia e adrenalina. Tudo é possível!',
    activities: [
      'Capaz de realizar atividades físicas intensas ou longas horas de trabalho.',
    ],
  },
};

function getEnergyInfo(level: number) {
  if (level === 0) return ENERGY_DATA[0];
  if (level <= 4) return ENERGY_DATA[1];
  if (level === 5) return ENERGY_DATA[5];
  if (level === 6) return ENERGY_DATA[6];
  if (level === 7) return ENERGY_DATA[7];
  if (level <= 9) return ENERGY_DATA[8];
  return ENERGY_DATA[10];
}

function getEnergyColor(level: number): string {
  if (level <= 2) return 'hsl(0, 70%, 50%)';
  if (level <= 4) return 'hsl(15, 80%, 50%)';
  if (level <= 5) return 'hsl(40, 90%, 50%)';
  if (level <= 6) return 'hsl(50, 90%, 50%)';
  if (level <= 7) return 'hsl(80, 70%, 45%)';
  if (level <= 8) return 'hsl(120, 60%, 45%)';
  return 'hsl(140, 70%, 45%)';
}

function getTodayKey() {
  return `energy-checkin-${new Date().toISOString().slice(0, 10)}`;
}

export function EnergyCheckin() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [step, setStep] = useState<'select' | 'result' | 'streak'>('select');
  const [streakOutcome, setStreakOutcome] = useState<StreakOutcome | null>(null);
  const { setEnergy } = useGame();
  const { state: streakState, checkIn, isLoading } = useStreakReward();

  useEffect(() => {
    emit({ type: 'ui:checkin-toggled', isOpen: open });
  }, [open]);

  useEffect(() => {
    if (isLoading) return;
    
    const today = new Date().toISOString().slice(0, 10);
    if (streakState.last_checkin_date !== today) {
      const timer = setTimeout(() => setOpen(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, streakState.last_checkin_date]);

  const handleConfirm = () => {
    if (selected === null) return;
    setStep('result');
    // Map 0-10 to energy (e.g. 0-100)
    setEnergy(selected * 10);
  };

  const handleGoToStreak = () => {
    const outcome = checkIn();
    setStreakOutcome(outcome);
    setStep('streak');
  };

  const handleClose = () => {
    setOpen(false);
    // Reset for potential reopen (not expected in same day, but safe)
    setTimeout(() => {
      setStep('select');
      setSelected(null);
      setStreakOutcome(null);
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={undefined}
          />

          {/* Dialog */}
          <motion.div
            className="relative w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card shadow-2xl"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Glow accent */}
            <div
              className="sticky top-0 left-0 right-0 h-1 z-10"
              style={{
                background: selected !== null
                  ? `linear-gradient(90deg, transparent, ${getEnergyColor(selected)}, transparent)`
                  : 'linear-gradient(90deg, transparent, hsl(var(--primary)), transparent)',
              }}
            />

            <div className="p-5 sm:p-6">
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-primary/30 bg-primary/10">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-display text-base tracking-wider text-foreground">
                          CHECK-IN DIÁRIO
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Qual o seu nível de energia hoje?
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between px-1">
                        {Array.from({ length: 11 }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelected(i)}
                            className={cn(
                              'w-8 h-8 rounded-lg text-xs font-display transition-all duration-200 border',
                              selected === i
                                ? 'scale-110 shadow-lg'
                                : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/50'
                            )}
                            style={
                              selected === i
                                ? {
                                    backgroundColor: getEnergyColor(i),
                                    color: i >= 6 ? 'hsl(220, 20%, 4%)' : 'white',
                                    borderColor: getEnergyColor(i),
                                    boxShadow: `0 0 16px ${getEnergyColor(i)}80`,
                                  }
                                : undefined
                            }
                          >
                            {i}
                          </button>
                        ))}
                      </div>

                      <div className="h-2 rounded-full overflow-hidden bg-muted">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: selected !== null ? `${(selected / 10) * 100}%` : '0%',
                            background:
                              selected !== null
                                ? `linear-gradient(90deg, hsl(0, 70%, 50%), hsl(40, 90%, 50%), hsl(140, 70%, 45%))`
                                : undefined,
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider px-1">
                        <span>Baixa</span>
                        <span>Média</span>
                        <span>Alta</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {selected !== null && (
                        <motion.p
                          className="text-sm text-muted-foreground text-center mt-4"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          {getEnergyInfo(selected).description}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <button
                      disabled={selected === null}
                      onClick={handleConfirm}
                      className={cn(
                        'w-full mt-6 py-3 rounded-xl font-display text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-200 border',
                        selected !== null
                          ? 'bg-primary/10 border-primary/40 text-primary hover:bg-primary/20'
                          : 'bg-muted/20 border-border/30 text-muted-foreground cursor-not-allowed'
                      )}
                    >
                      CONFIRMAR
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {step === 'result' && (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-center mb-5">
                      <motion.div
                        className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border mb-3"
                        style={{
                          backgroundColor: `${getEnergyColor(selected!)}20`,
                          borderColor: `${getEnergyColor(selected!)}40`,
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                      >
                        <span className="font-display text-2xl" style={{ color: getEnergyColor(selected!) }}>
                          {selected}
                        </span>
                      </motion.div>
                      <h2 className="font-display text-base tracking-wider text-foreground">
                        ENERGIA REGISTRADA
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getEnergyInfo(selected!).description}
                      </p>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-display">
                        Recomendações
                      </p>
                      {getEnergyInfo(selected!).activities.map((activity, i) => (
                        <motion.div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/50"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + i * 0.07 }}
                        >
                          <div
                            className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                            style={{ backgroundColor: getEnergyColor(selected!) }}
                          />
                          <p className="text-sm text-foreground/80">{activity}</p>
                        </motion.div>
                      ))}
                    </div>

                    <button
                      onClick={handleGoToStreak}
                      className="w-full py-3 rounded-xl font-display text-sm tracking-wider bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      CONTINUAR
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}

                {step === 'streak' && streakOutcome && (
                  <motion.div
                    key="streak"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <StreakRewardScreen outcome={streakOutcome} onContinue={handleClose} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
