import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Dumbbell, Clock, X } from 'lucide-react';

interface WorkoutResultDialogProps {
  open: boolean;
  variant: 'success' | 'early-end';
  exercisesDone: number;
  exercisesTotal: number;
  durationMin: number;
  onClose: () => void;
}

export function WorkoutResultDialog({
  open,
  variant,
  exercisesDone,
  exercisesTotal,
  durationMin,
  onClose,
}: WorkoutResultDialogProps) {
  const isSuccess = variant === 'success';
  const color = isSuccess ? 'hsl(38 95% 55%)' : 'hsl(0 85% 60%)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border bg-[#0a0a0a] p-8"
            style={{
              borderColor: color,
              boxShadow: `0 0 40px ${color}55, inset 0 0 20px ${color}22`,
            }}
          >
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-white/5"
              style={{ borderColor: `${color}66`, color }}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon + particles */}
            <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center">
              {[...Array(12)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0.5],
                    x: Math.cos((i / 12) * Math.PI * 2) * 60,
                    y: Math.sin((i / 12) * Math.PI * 2) * 60,
                  }}
                  transition={{ duration: 1.4, delay: 0.1 + i * 0.03, repeat: Infinity, repeatDelay: 1.2 }}
                  className="absolute h-1 w-1 rounded-full"
                  style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                />
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
                style={{ color, filter: `drop-shadow(0 0 12px ${color})` }}
              >
                {isSuccess ? (
                  <CheckCircle2 className="h-20 w-20" strokeWidth={2} />
                ) : (
                  <XCircle className="h-20 w-20" strokeWidth={2} />
                )}
              </motion.div>
            </div>

            <h2
              className="text-center font-display text-3xl font-black uppercase tracking-wider"
              style={{ color }}
            >
              {isSuccess ? 'Treino Concluído!' : 'Treino Encerrado'}
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-center text-sm text-muted-foreground">
              {isSuccess
                ? 'Parabéns! Você completou seu treino com sucesso. Continue assim!'
                : 'Você encerrou o treino antes de completar todos os exercícios.'}
            </p>

            {/* Stats box */}
            <div
              className="mt-6 grid grid-cols-2 rounded-2xl border"
              style={{ borderColor: `${color}55` }}
            >
              <div className="flex flex-col items-center gap-2 p-5">
                <Dumbbell className="h-6 w-6" style={{ color }} />
                <span className="font-display text-[11px] uppercase tracking-widest text-muted-foreground">
                  Exercícios
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-black" style={{ color }}>
                    {exercisesDone}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isSuccess ? 'completos' : `de ${exercisesTotal}`}
                  </span>
                </div>
              </div>
              <div
                className="flex flex-col items-center gap-2 border-l p-5"
                style={{ borderColor: `${color}33` }}
              >
                <Clock className="h-6 w-6" style={{ color }} />
                <span className="font-display text-[11px] uppercase tracking-widest text-muted-foreground">
                  Duração
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-3xl font-black" style={{ color }}>
                    {durationMin}
                  </span>
                  <span className="text-xs text-muted-foreground">min</span>
                </div>
              </div>
            </div>

            {/* Reward / Info */}
            {isSuccess ? (
              <div className="mt-6 text-center">
                <p className="font-display text-sm font-semibold" style={{ color }}>
                  Recompensa:
                </p>
                <p className="mt-1 text-sm text-foreground">+10XP Área Física</p>
              </div>
            ) : (
              <p className="mt-6 text-center text-xs text-muted-foreground">
                Finalize seus treinos para ganhar XP e evoluir ainda mais.
              </p>
            )}

            <button
              onClick={onClose}
              className="mt-6 h-12 w-full rounded-xl font-display text-sm font-bold uppercase tracking-widest transition hover:brightness-110"
              style={{
                background: color,
                color: '#0a0a0a',
                boxShadow: `0 0 20px ${color}88`,
              }}
            >
              {isSuccess ? 'Continuar' : 'Ok, entendi'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
