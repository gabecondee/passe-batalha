import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface StreakSealProps {
  currentStreak: number;
  longestStreak: number;
  state: 'active' | 'cracked' | 'broken';
}

const MILESTONES = [7, 30, 90, 180, 365];

function getNextMilestone(streak: number): number | null {
  return MILESTONES.find(m => m > streak) ?? null;
}

function getMilestoneIntensity(streak: number): number {
  if (streak >= 365) return 5;
  if (streak >= 180) return 4;
  if (streak >= 90) return 3;
  if (streak >= 30) return 2;
  if (streak >= 7) return 1;
  return 0;
}

export function StreakSeal({ currentStreak, longestStreak, state }: StreakSealProps) {
  const nextMilestone = getNextMilestone(currentStreak);
  const progressToNext = nextMilestone
    ? Math.min(100, (currentStreak / nextMilestone) * 100)
    : 100;
  const intensity = state === 'active' ? getMilestoneIntensity(currentStreak) : 0;
  const isBroken = state === 'broken';
  const isCracked = state === 'cracked';

  // Ring circumference for SVG progress
  const outerRadius = 88;
  const outerCircumference = 2 * Math.PI * outerRadius;

  return (
    <div className="fantasy-card p-6 md:p-8">
      <h2 className="font-display text-xl text-center mb-8 tracking-wider">
        <span className="text-gradient-cyan">SELO DE CONSISTÊNCIA</span>
      </h2>

      <div className="flex flex-col items-center gap-8">
        {/* Main seal container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
          className="relative flex items-center justify-center"
          style={{ width: 220, height: 220 }}
        >
          {/* Ambient glow behind seal */}
          {!isBroken && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, hsl(var(--primary) / ${0.08 + intensity * 0.06}) 0%, transparent 70%)`,
                filter: `blur(${20 + intensity * 8}px)`,
              }}
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Outer rotating ring */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          >
            <svg viewBox="0 0 220 220" className="w-full h-full">
              <defs>
                <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
                  <stop offset="50%" stopColor="hsl(var(--accent) / 0.4)" />
                  <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                </linearGradient>
              </defs>
              <circle
                cx="110" cy="110" r="105"
                fill="none"
                stroke="hsl(var(--primary) / 0.08)"
                strokeWidth="1.5"
              />
              {/* Glowing arc segments */}
              {[0, 90, 180, 270].map((angle) => (
                <circle
                  key={angle}
                  cx="110" cy="110" r="105"
                  fill="none"
                  stroke={`hsl(var(--primary) / ${isBroken ? 0.05 : 0.3 + intensity * 0.1})`}
                  strokeWidth="2"
                  strokeDasharray="40 125"
                  strokeDashoffset={-angle * 1.83}
                  strokeLinecap="round"
                  style={{
                    filter: isBroken ? 'none' : `drop-shadow(0 0 ${4 + intensity * 2}px hsl(var(--primary) / 0.6))`,
                  }}
                />
              ))}
            </svg>
          </motion.div>

          {/* Middle static ring with progress */}
          <svg
            viewBox="0 0 220 220"
            className="absolute inset-0 w-full h-full"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Track */}
            <circle
              cx="110" cy="110" r={outerRadius}
              fill="none"
              stroke="hsl(var(--primary) / 0.1)"
              strokeWidth="3"
            />
            {/* Progress arc */}
            {!isBroken && (
              <motion.circle
                cx="110" cy="110" r={outerRadius}
                fill="none"
                stroke="hsl(var(--primary) / 0.6)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={outerCircumference}
                initial={{ strokeDashoffset: outerCircumference }}
                animate={{ strokeDashoffset: outerCircumference * (1 - progressToNext / 100) }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{
                  filter: `drop-shadow(0 0 ${6 + intensity * 3}px hsl(var(--primary) / 0.8))`,
                }}
              />
            )}
          </svg>

          {/* Inner circle — crystalline surface */}
          <div
            className={`
              relative w-40 h-40 md:w-44 md:h-44 rounded-full 
              flex items-center justify-center
              border-2 transition-all duration-700
              ${isBroken
                ? 'border-muted-foreground/20 bg-muted/20'
                : isCracked
                  ? 'border-orange-500/40'
                  : 'border-primary/30'
              }
            `}
            style={{
              background: isBroken
                ? 'radial-gradient(circle at 40% 35%, hsl(var(--muted) / 0.3), hsl(var(--background) / 0.9))'
                : `radial-gradient(circle at 40% 35%, hsl(var(--primary) / ${0.08 + intensity * 0.04}), hsl(var(--background) / 0.95) 70%)`,
              boxShadow: isBroken
                ? 'none'
                : `inset 0 0 40px hsl(var(--primary) / ${0.05 + intensity * 0.03}), 
                   0 0 ${15 + intensity * 10}px hsl(var(--primary) / ${0.1 + intensity * 0.08})`,
            }}
          >
            {/* Faceted highlight lines */}
            {!isBroken && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" viewBox="0 0 180 180">
                <line x1="90" y1="10" x2="50" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                <line x1="90" y1="10" x2="130" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.5" />
                <line x1="50" y1="90" x2="90" y2="170" stroke="hsl(var(--primary))" strokeWidth="0.3" />
                <line x1="130" y1="90" x2="90" y2="170" stroke="hsl(var(--primary))" strokeWidth="0.3" />
                <line x1="20" y1="60" x2="90" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.3" />
                <line x1="160" y1="60" x2="90" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.3" />
                <line x1="30" y1="130" x2="90" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.2" />
                <line x1="150" y1="130" x2="90" y2="90" stroke="hsl(var(--primary))" strokeWidth="0.2" />
              </svg>
            )}

            {/* Crack overlay for 'cracked' state */}
            {isCracked && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 180 180"
                fill="none"
              >
                <path
                  d="M80 25 L83 55 L76 72 L85 88 L78 115 L82 140"
                  stroke="hsl(var(--destructive) / 0.5)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M100 35 L96 50 L102 68 L92 82"
                  stroke="hsl(var(--destructive) / 0.35)"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            )}

            {/* Content */}
            <div className={`flex flex-col items-center z-10 ${isBroken ? 'opacity-40' : ''}`}>
              <motion.div
                animate={!isBroken ? { 
                  y: [0, -2, 0],
                  filter: [
                    `drop-shadow(0 0 ${4 + intensity * 2}px hsl(var(--primary) / 0.6))`,
                    `drop-shadow(0 0 ${8 + intensity * 3}px hsl(var(--primary) / 0.8))`,
                    `drop-shadow(0 0 ${4 + intensity * 2}px hsl(var(--primary) / 0.6))`,
                  ]
                } : {}}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className={`
                  w-7 h-7 md:w-8 md:h-8
                  ${isCracked ? 'text-orange-500' : isBroken ? 'text-muted-foreground' : 'text-primary'}
                `} />
              </motion.div>

              <motion.span
                className={`
                  font-display text-4xl md:text-5xl leading-none mt-1
                  ${isCracked ? 'text-orange-500' : isBroken ? 'text-muted-foreground' : 'text-primary'}
                `}
                style={{
                  textShadow: isBroken ? 'none' : `0 0 ${10 + intensity * 5}px hsl(var(--primary) / 0.7)`,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              >
                {currentStreak}
              </motion.span>

              <span className="text-[11px] md:text-xs text-muted-foreground uppercase tracking-[0.25em] font-display mt-1">
                {currentStreak === 1 ? 'dia' : 'dias'}
              </span>
            </div>
          </div>

          {/* Sparkle particles */}
          {!isBroken && intensity >= 1 && (
            <>
              {Array.from({ length: Math.min(intensity * 2, 8) }).map((_, i) => {
                const angle = (360 / (intensity * 2)) * i;
                const dist = 95 + Math.random() * 10;
                const x = 110 + dist * Math.cos((angle * Math.PI) / 180);
                const y = 110 + dist * Math.sin((angle * Math.PI) / 180);
                return (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full bg-primary"
                    style={{
                      left: `${(x / 220) * 100}%`,
                      top: `${(y / 220) * 100}%`,
                      boxShadow: `0 0 4px hsl(var(--primary) / 0.8)`,
                    }}
                    animate={{
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 3,
                      ease: 'easeInOut',
                    }}
                  />
                );
              })}
            </>
          )}
        </motion.div>

        {/* Status labels */}
        {isCracked && (
          <motion.p
            className="text-xs text-orange-500 font-display tracking-wider uppercase"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⚠ Selo rachado — complete algo hoje
          </motion.p>
        )}
        {isBroken && currentStreak === 0 && (
          <p className="text-xs text-muted-foreground font-display tracking-wider uppercase">
            Inicie uma nova sequência
          </p>
        )}

        {/* Progress to next milestone */}
        {nextMilestone && !isBroken && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm text-muted-foreground">Próximo marco:</span>
              <span className="text-primary font-display text-lg">{nextMilestone} dias</span>
            </div>
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressToNext}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 text-center">
              {nextMilestone - currentStreak} {nextMilestone - currentStreak === 1 ? 'dia' : 'dias'} restante{nextMilestone - currentStreak !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Personal record */}
        <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-muted/20 border border-border/50">
          <span className="text-sm text-muted-foreground">Recorde pessoal:</span>
          <span className="font-display text-base text-primary glow-text">{longestStreak} dias</span>
        </div>
      </div>
    </div>
  );
}
