import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star, TrendingUp } from 'lucide-react';
import hakimMascot from '@/assets/hakim-mascot.png';

interface LevelUpOverlayProps {
  level: number;
  show: boolean;
  onComplete: () => void;
}

const Particle = ({ index }: { index: number }) => {
  const angle = (index / 16) * 360;
  const distance = 120 + Math.random() * 80;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const size = Math.random() * 6 + 3;
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(50 100% 60%)',
    'hsl(var(--primary) / 0.7)',
  ];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        background: color,
        boxShadow: `0 0 ${size * 2}px ${color}`,
        top: '50%',
        left: '50%',
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y,
        opacity: 0,
        scale: 0,
      }}
      transition={{
        duration: 1.2 + Math.random() * 0.6,
        ease: 'easeOut',
        delay: 0.1 + Math.random() * 0.3,
      }}
    />
  );
};

const RingPulse = ({ delay, scale }: { delay: number; scale: number }) => (
  <motion.div
    className="absolute rounded-full border-2 border-primary/60"
    style={{
      top: '50%',
      left: '50%',
      width: 120,
      height: 120,
      marginTop: -60,
      marginLeft: -60,
    }}
    initial={{ scale: 0.5, opacity: 0.8 }}
    animate={{ scale: scale, opacity: 0 }}
    transition={{ duration: 1.5, delay, ease: 'easeOut' }}
  />
);

export function LevelUpOverlay({ level, show, onComplete }: LevelUpOverlayProps) {
  const [particles] = useState(() => Array.from({ length: 24 }, (_, i) => i));

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Radial glow burst */}
          <motion.div
            className="absolute rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.5) 0%, hsl(var(--primary) / 0.1) 40%, transparent 70%)',
              width: 600,
              height: 600,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1.2], opacity: [0, 1, 0.6] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />

          {/* Expanding rings */}
          <RingPulse delay={0} scale={4} />
          <RingPulse delay={0.2} scale={5.5} />
          <RingPulse delay={0.4} scale={7} />

          {/* Central content */}
          <motion.div
            className="relative flex flex-col items-center gap-4"
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          >
            {/* Particles */}
            {particles.map((i) => (
              <Particle key={i} index={i} />
            ))}

            {/* Level Up label */}
            <motion.div
              className="flex items-center gap-2 px-6 py-2 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-md"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="font-display text-sm tracking-[0.3em] text-primary uppercase">Level Up!</span>
              <Star className="w-4 h-4 text-primary fill-primary" />
            </motion.div>

            {/* Big level number */}
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
            >
              {/* Glow behind number */}
              <div
                className="absolute inset-0 blur-2xl rounded-full scale-150"
                style={{ background: 'hsl(var(--primary) / 0.4)' }}
              />
              <span
                className="relative font-display text-8xl md:text-9xl"
                style={{
                  color: 'hsl(var(--primary))',
                  textShadow:
                    '0 0 20px hsl(var(--primary) / 1), 0 0 60px hsl(var(--primary) / 0.8), 0 0 120px hsl(var(--primary) / 0.5)',
                  WebkitTextStroke: '1px hsl(var(--primary) / 0.5)',
                }}
              >
                {level}
              </span>
            </motion.div>

            {/* Subtitle */}
            <motion.div
              className="flex items-center gap-2"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="font-display text-sm text-muted-foreground tracking-widest uppercase">
                Você alcançou o Nível {level}
              </span>
              <Zap className="w-4 h-4 text-yellow-400" />
            </motion.div>

            {/* Hakim message */}
            <motion.div
              className="mt-4 flex items-start gap-3 max-w-sm p-4 rounded-2xl border border-primary/30 bg-card/80 backdrop-blur-md"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
            >
              <img
                src={hakimMascot}
                alt="Hakim"
                className="w-14 h-14 rounded-full border-2 border-primary/50 object-cover shrink-0"
              />
              <p className="text-sm text-foreground/90 leading-snug text-left">
                <span className="font-display text-primary">Hakim:</span> "Seu poder continua crescendo.
                Continue concluindo missões para desbloquear desafios ainda maiores."
              </p>
            </motion.div>

            {/* Continue button */}
            <motion.button
              type="button"
              onClick={onComplete}
              className="mt-2 px-8 py-3 rounded-xl font-display tracking-widest uppercase text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition shadow-[0_0_30px_hsl(var(--primary)/0.6)]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              Continuar Jornada
            </motion.button>

            {/* Electric border box */}
            <motion.div
              className="absolute -inset-12 rounded-2xl border border-primary/20 pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 0.6, 0.2, 0.6, 0],
                scale: 1.1,
              }}
              transition={{ duration: 2, delay: 0.3, ease: 'easeInOut' }}
            />
          </motion.div>


          {/* Lightning streaks */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                top: `${[15, 70, 30, 85, 45, 60][i]}%`,
                left: `${[10, 20, 75, 85, 50, 40][i]}%`,
                width: 1,
                height: `${[50, 80, 60, 90, 70, 55][i]}px`,
                background: 'linear-gradient(180deg, transparent, hsl(var(--primary) / 0.8), transparent)',
                transform: `rotate(${[-15, 10, -25, 20, -5, 30][i]}deg)`,
              }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: [0, 1, 0], scaleY: [0, 1, 0] }}
              transition={{
                duration: 0.3,
                delay: 0.2 + i * 0.1,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
