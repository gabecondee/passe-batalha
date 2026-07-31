import { motion } from 'framer-motion';

interface StepIndicatorProps {
  current: number; // 1-based
  total: number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center pt-6 pb-2 select-none">
      {/* Dots row */}
      <div className="relative flex items-center justify-between w-full px-2">
        {/* connector line */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-amber-500/30" />
        {/* active connector segment: from step 1 to current step */}
        <div
          className="absolute left-3 top-1/2 -translate-y-1/2 h-px bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.65)]"
          style={{
            width: current <= 1 ? '0%' : `calc(${(current - 1) / (total - 1) * 100}% - 6px)`,
          }}
        />
        {Array.from({ length: total }).map((_, i) => {
          const step = i + 1;
          const active = step === current;
          const done = step < current;
          return (
            <div key={i} className="relative z-10 flex items-center justify-center">
              {active ? (
                <motion.span
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="block w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.85)] ring-2 ring-amber-500/30"
                />
              ) : done ? (
                <span className="block w-3 h-3 rounded-full border border-amber-500/80 bg-amber-500/30" />
              ) : (
                <span className="block w-3 h-3 rounded-full border border-amber-500/25 bg-transparent" />
              )}
            </div>
          );
        })}
      </div>

      {/* Etapa label */}
      <div className="mt-8 flex flex-col items-center">
        <span
          className="text-[11px] tracking-[0.35em] text-amber-500 font-medium uppercase"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          Etapa {current} de {total}
        </span>
        <div className="mt-2 flex items-center gap-2">
          <span className="block w-24 h-px bg-amber-500/40" />
          <svg width="10" height="8" viewBox="0 0 10 8" className="text-amber-500/80">
            <path d="M1 1 L5 7 L9 1 Z" fill="currentColor" />
          </svg>
          <span className="block w-24 h-px bg-amber-500/40" />
        </div>
      </div>
    </div>
  );
}
