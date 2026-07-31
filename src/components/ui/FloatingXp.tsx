import { motion, AnimatePresence } from 'framer-motion';

interface FloatingXpProps {
  xp: number;
  show: boolean;
  type?: 'add' | 'remove';
}

export function FloatingXp({ xp, show, type = 'add' }: FloatingXpProps) {
  const isAdd = type === 'add';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        >
          <span
            className={`font-display text-lg font-bold tracking-wide drop-shadow-lg whitespace-nowrap ${
              isAdd
                ? 'text-primary'
                : 'text-destructive'
            }`}
            style={{
              textShadow: isAdd
                ? '0 0 12px hsl(var(--primary) / 0.6)'
                : '0 0 12px hsl(var(--destructive) / 0.6)',
            }}
          >
            {isAdd ? '+' : '-'}{xp} XP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
